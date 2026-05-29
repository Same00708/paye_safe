import { Router } from "express";
import { AppError } from "../middleware/errorHandler";
import { asyncHandler } from "../middleware/asyncHandler";
import { authenticate } from "../middleware/auth";
import * as transactionsRepo from "../repositories/transactions";
import * as usersRepo from "../repositories/users";
import * as messagesRepo from "../repositories/messages";
import { fedapayService } from "../services/fedapay";
import { env } from "../config/env";
import { computePlatformFee } from "../services/fees";
import { notifyTransactionParties, notifyUser } from "../services/notifications";
import { assertTransition } from "../services/transactionFlow";
import {
  notifyBuyerOrderCreated,
  notifyDisputeOpened,
  notifySellerNewOrder,
  notifySellerPaymentReceived,
} from "../services/transactionNotify";
import {
  refundBuyerFull,
  settleSuccessfulTransaction,
} from "../services/transactionSettlement";

export const transactionsRouter = Router();

async function getTxOr404(id: number) {
  const tx = await transactionsRepo.findTransactionById(id);
  if (!tx) throw new AppError(404, "Transaction introuvable");
  return tx;
}

async function assertAccess(id: number, userId: number) {
  const ok = await transactionsRepo.userCanAccessTransaction(id, userId);
  if (!ok) throw new AppError(403, "Accès refusé");
}

transactionsRouter.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const data = await transactionsRepo.findAllTransactions(req.auth!.userId);
    res.json({ data });
  }),
);

transactionsRouter.get(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const transaction = await getTxOr404(id);
    await assertAccess(id, req.auth!.userId);

    const [buyer, seller, unreadMessages] = await Promise.all([
      usersRepo.findUserById(transaction.buyerId),
      usersRepo.findUserById(transaction.sellerId),
      import("../repositories/messages").then((m) =>
        m.countUnread(id, req.auth!.userId),
      ),
    ]);

    res.json({
      data: {
        ...transaction,
        buyer,
        seller,
        unreadMessages,
      },
    });
  }),
);

transactionsRouter.post(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const { title, description, amount, sellerId } = req.body as {
      title?: string;
      description?: string;
      amount?: number;
      sellerId?: number;
    };

    if (!title?.trim() || amount == null || !sellerId) {
      throw new AppError(400, "Champs requis : titre, montant, vendeur");
    }

    if (amount < 100) {
      throw new AppError(400, "Montant minimum : 100 FCFA");
    }

    const buyerId = req.auth!.userId;
    if (sellerId === buyerId) {
      throw new AppError(400, "Vous ne pouvez pas commander chez vous-même");
    }

    const seller = await usersRepo.findUserById(sellerId);
    if (!seller) {
      throw new AppError(404, "Vendeur introuvable — choisissez un compte inscrit sur PaySafe");
    }

    const buyer = await usersRepo.findUserById(buyerId);
    if (!buyer) throw new AppError(404, "Acheteur introuvable");

    const fees = computePlatformFee(amount);

    const created = await transactionsRepo.createTransaction({
      title: title.trim(),
      description,
      amount,
      fees,
      buyerId,
      sellerId,
    });

    await messagesRepo.createMessage({
      transactionId: created.transactionId,
      senderId: buyerId,
      messageText:
        "🔒 Commande PaySafe ouverte. Échangez ici avec le vendeur. Ne payez jamais en dehors de l'application.",
    });

    await notifySellerNewOrder({
      sellerId,
      buyer: { fullName: buyer.fullName, username: buyer.username },
      transactionId: created.transactionId,
      title: created.title,
      amount: created.amount,
      fees: created.fees,
    });

    await notifyBuyerOrderCreated({
      buyerId,
      seller: { fullName: seller.fullName, username: seller.username },
      transactionId: created.transactionId,
      title: created.title,
      total: created.amount + created.fees,
    });

    res.status(201).json({ data: created });
  }),
);

transactionsRouter.post(
  "/:id/pay",
  authenticate,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { mode, phone } = req.body as { mode?: string; phone?: string };
    const transaction = await getTxOr404(id);

    if (transaction.buyerId !== req.auth!.userId) {
      throw new AppError(403, "Seul l'acheteur peut payer");
    }
    if (transaction.status !== "PENDING_PAYMENT") {
      throw new AppError(400, "Cette transaction n'attend plus de paiement");
    }

    const buyer = await usersRepo.findUserById(transaction.buyerId);
    if (!buyer) throw new AppError(404, "Acheteur introuvable");

    const total = transaction.amount + transaction.fees;
    const names = buyer.fullName.split(" ");
    let payment;
    try {
      payment = await fedapayService.createPayment({
        amount: total,
        description: `PaySafe — ${transaction.title}`,
        callbackUrl: `${env.appBaseUrl}/transactions/${id}?payment=return`,
        transactionId: id,
        customer: {
          firstname: names[0] ?? "Client",
          lastname: names.slice(1).join(" ") || "PaySafe",
          phoneNumber: phone ?? buyer.phoneNumber,
          country: "tg",
        },
        mode,
      });
    } catch (err) {
      if (fedapayService.isConfigured()) {
        throw new AppError(
          502,
          err instanceof Error ? err.message : "FedaPay indisponible",
        );
      }
      throw err;
    }

    if (payment.fedapayTransactionId > 0) {
      await transactionsRepo.setFedapayTransactionId(id, String(payment.fedapayTransactionId));
    }

    res.json({
      data: {
        transactionId: id,
        paymentUrl: payment.paymentUrl,
        reference: payment.reference,
        amount: total,
        stub: !fedapayService.isConfigured(),
        fedapayPortalUrl: env.fedapay.portalUrl,
      },
    });
  }),
);

/** Lien de paiement FedaPay (redirection vers leur site) */
transactionsRouter.get(
  "/:id/payment-link",
  authenticate,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { mode, phone } = req.query as { mode?: string; phone?: string };
    const transaction = await getTxOr404(id);

    if (transaction.buyerId !== req.auth!.userId) {
      throw new AppError(403, "Seul l'acheteur peut payer");
    }
    if (transaction.status !== "PENDING_PAYMENT") {
      throw new AppError(400, "Cette transaction n'attend plus de paiement");
    }

    const buyer = await usersRepo.findUserById(transaction.buyerId);
    if (!buyer) throw new AppError(404, "Acheteur introuvable");

    const total = transaction.amount + transaction.fees;
    const names = buyer.fullName.split(" ");
    let payment;
    try {
      payment = await fedapayService.createPayment({
        amount: total,
        description: `PaySafe — ${transaction.title}`,
        callbackUrl: `${env.appBaseUrl}/transactions/${id}?payment=return`,
        transactionId: id,
        customer: {
          firstname: names[0] ?? "Client",
          lastname: names.slice(1).join(" ") || "PaySafe",
          phoneNumber: (phone as string) ?? buyer.phoneNumber,
          country: "tg",
        },
        mode: mode as string | undefined,
      });
    } catch (err) {
      if (fedapayService.isConfigured()) {
        throw new AppError(
          502,
          err instanceof Error ? err.message : "FedaPay indisponible",
        );
      }
      throw err;
    }

    if (payment.fedapayTransactionId > 0) {
      await transactionsRepo.setFedapayTransactionId(id, String(payment.fedapayTransactionId));
    }

    res.json({
      data: {
        paymentUrl: payment.paymentUrl,
        reference: payment.reference,
        stub: !fedapayService.isConfigured(),
        fedapayPortalUrl: env.fedapay.portalUrl,
      },
    });
  }),
);

/** Dev / démo : simuler paiement reçu sans FedaPay */
transactionsRouter.post(
  "/:id/simulate-payment",
  authenticate,
  asyncHandler(async (req, res) => {
    if (env.nodeEnv === "production" && !env.allowSimulatePayment) {
      throw new AppError(403, "Non disponible en production");
    }
    const id = Number(req.params.id);
    const transaction = await getTxOr404(id);
    if (transaction.buyerId !== req.auth!.userId) {
      throw new AppError(403, "Réservé à l'acheteur");
    }
    assertTransition(transaction.status, "FUNDS_ESCROWED");
    const updated = await transactionsRepo.updateTransactionStatus(id, "FUNDS_ESCROWED");
    const buyer = await usersRepo.findUserById(transaction.buyerId);
    if (buyer) {
      await notifySellerPaymentReceived({
        sellerId: transaction.sellerId,
        buyer: { fullName: buyer.fullName, username: buyer.username },
        transactionId: id,
        title: transaction.title,
        total: transaction.amount + transaction.fees,
      });
    }
    res.json({ data: updated });
  }),
);

transactionsRouter.post(
  "/:id/mark-shipped",
  authenticate,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const transaction = await getTxOr404(id);
    if (transaction.sellerId !== req.auth!.userId) {
      throw new AppError(403, "Réservé au vendeur");
    }
    if (transaction.status !== "FUNDS_ESCROWED") {
      throw new AppError(400, "Statut invalide pour marquer comme expédié");
    }

    const note =
      (req.body as { note?: string }).note ?? "Le vendeur a expédié l'article.";
    await messagesRepo.createMessage({
      transactionId: id,
      senderId: req.auth!.userId,
      messageText: `📦 ${note}`,
    });

    await notifyUser({
      userId: transaction.buyerId,
      transactionId: id,
      type: "STATUS_CHANGED",
      title: "Article expédié",
      content: transaction.title,
    });

    res.json({ data: transaction, message: "Expédition enregistrée" });
  }),
);

transactionsRouter.post(
  "/:id/confirm-received",
  authenticate,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const transaction = await getTxOr404(id);
    if (transaction.buyerId !== req.auth!.userId) {
      throw new AppError(403, "Réservé à l'acheteur");
    }
    assertTransition(transaction.status, "DELIVERED_TO_BUYER");
    const updated = await transactionsRepo.updateTransactionStatus(id, "DELIVERED_TO_BUYER");
    await notifyTransactionParties({
      buyerId: transaction.buyerId,
      sellerId: transaction.sellerId,
      transactionId: id,
      type: "STATUS_CHANGED",
      title: "Colis reçu",
      content: `${transaction.title} — validez pour libérer le paiement`,
      excludeUserId: req.auth!.userId,
    });
    res.json({ data: updated });
  }),
);

transactionsRouter.post(
  "/:id/release-payment",
  authenticate,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const transaction = await getTxOr404(id);
    if (transaction.buyerId !== req.auth!.userId) {
      throw new AppError(403, "Réservé à l'acheteur");
    }
    assertTransition(transaction.status, "COMPLETED");

    const seller = await usersRepo.findUserById(transaction.sellerId);
    if (!seller) throw new AppError(404, "Vendeur introuvable");
    const buyer = await usersRepo.findUserById(transaction.buyerId);
    if (!buyer) throw new AppError(404, "Acheteur introuvable");

    const settlement = await settleSuccessfulTransaction(transaction, seller, buyer);

    const updated = await transactionsRepo.updateTransactionStatus(id, "COMPLETED");
    const feeNote = transaction.feesWaived
      ? "Aucun frais PaySafe (litige)."
      : `Frais PaySafe ${transaction.fees} FCFA prélevés.`;
    await notifyTransactionParties({
      buyerId: transaction.buyerId,
      sellerId: transaction.sellerId,
      transactionId: id,
      type: "STATUS_CHANGED",
      title: "Transaction terminée",
      content: `${transaction.title} — ${feeNote}`,
    });

    res.json({ data: updated, settlement });
  }),
);

/** Alias : confirme réception + libère le paiement en une étape (MVP) */
transactionsRouter.post(
  "/:id/confirm-delivery",
  authenticate,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    let transaction = await getTxOr404(id);
    if (transaction.buyerId !== req.auth!.userId) {
      throw new AppError(403, "Réservé à l'acheteur");
    }
    if (transaction.status === "FUNDS_ESCROWED") {
      assertTransition(transaction.status, "DELIVERED_TO_BUYER");
      await transactionsRepo.updateTransactionStatus(id, "DELIVERED_TO_BUYER");
      transaction = (await getTxOr404(id))!;
    }
    if (transaction.status !== "DELIVERED_TO_BUYER") {
      throw new AppError(400, "Étape invalide pour libérer le paiement");
    }
    const seller = await usersRepo.findUserById(transaction.sellerId);
    if (!seller) throw new AppError(404, "Vendeur introuvable");
    const buyer = await usersRepo.findUserById(transaction.buyerId);
    if (!buyer) throw new AppError(404, "Acheteur introuvable");
    const settlement = await settleSuccessfulTransaction(transaction, seller, buyer);
    assertTransition(transaction.status, "COMPLETED");
    const updated = await transactionsRepo.updateTransactionStatus(id, "COMPLETED");
    await notifyTransactionParties({
      buyerId: transaction.buyerId,
      sellerId: transaction.sellerId,
      transactionId: id,
      type: "STATUS_CHANGED",
      title: "Transaction terminée",
      content: transaction.title,
    });
    res.json({ data: updated, settlement });
  }),
);

transactionsRouter.post(
  "/:id/initiate-return",
  authenticate,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { reason } = req.body as { reason?: string };
    const transaction = await getTxOr404(id);
    if (transaction.buyerId !== req.auth!.userId) {
      throw new AppError(403, "Réservé à l'acheteur");
    }
    assertTransition(transaction.status, "RETURN_INITIATED");

    const updated = await transactionsRepo.updateTransactionStatus(id, "RETURN_INITIATED");
    await messagesRepo.createMessage({
      transactionId: id,
      senderId: req.auth!.userId,
      messageText: `↩️ Retour initié${reason ? ` : ${reason}` : ""}`,
    });
    await notifyUser({
      userId: transaction.sellerId,
      transactionId: id,
      type: "STATUS_CHANGED",
      title: "Demande de retour",
      content: transaction.title,
    });
    res.json({ data: updated });
  }),
);

transactionsRouter.post(
  "/:id/confirm-return",
  authenticate,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const transaction = await getTxOr404(id);
    if (transaction.sellerId !== req.auth!.userId) {
      throw new AppError(403, "Réservé au vendeur");
    }
    assertTransition(transaction.status, "RETURNED_TO_SELLER");

    const buyer = await usersRepo.findUserById(transaction.buyerId);
    if (!buyer) throw new AppError(404, "Acheteur introuvable");

    const refund = await refundBuyerFull(transaction, buyer);

    const updated = await transactionsRepo.updateTransactionStatus(id, "RETURNED_TO_SELLER");
    const total = transaction.amount + transaction.fees;
    await notifyUser({
      userId: transaction.buyerId,
      transactionId: id,
      type: "PAYMENT_RECEIVED",
      title: "Remboursement",
      content: `${total} FCFA — ${transaction.title}${refund.stub ? " (stub)" : ""}`,
    });
    res.json({ data: updated, refund });
  }),
);

transactionsRouter.post(
  "/:id/open-dispute",
  authenticate,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { reason } = req.body as { reason?: string };
    const transaction = await getTxOr404(id);
    await assertAccess(id, req.auth!.userId);

    if (["COMPLETED", "RETURNED_TO_SELLER"].includes(transaction.status)) {
      throw new AppError(400, "Transaction déjà clôturée");
    }

    await transactionsRepo.setFeesWaived(id, true);
    const updated = await transactionsRepo.updateTransactionStatus(id, "DISPUTE");
    await messagesRepo.createMessage({
      transactionId: id,
      senderId: req.auth!.userId,
      messageText: `⚠️ Litige ouvert${reason ? ` : ${reason}` : ""}. Aucun frais PaySafe ne sera prélevé.`,
    });
    await notifyDisputeOpened({
      buyerId: transaction.buyerId,
      sellerId: transaction.sellerId,
      transactionId: id,
      title: transaction.title,
      openedByUserId: req.auth!.userId,
    });
    res.json({ data: updated, message: "Litige ouvert — frais PaySafe annulés" });
  }),
);
