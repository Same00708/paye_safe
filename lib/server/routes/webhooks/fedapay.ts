import { createHmac, timingSafeEqual } from "node:crypto";
import express, { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import { env } from "../../config/env";
import * as transactionsRepo from "../../repositories/transactions";
import * as usersRepo from "../../repositories/users";
import { logPaymentEvent } from "../../repositories/paymentEvents";
import { notifySellerPaymentReceived } from "../../services/transactionNotify";

export const fedapayWebhookRouter = Router();

fedapayWebhookRouter.post(
  "/",
  express.raw({ type: "application/json" }),
  asyncHandler(async (req, res) => {
    const rawBody = req.body as Buffer;
    const payload = JSON.parse(rawBody.toString("utf8")) as {
      name?: string;
      entity?: { id?: number | string; status?: string };
    };

    if (env.fedapay.webhookSecret && !env.fedapay.webhookSecret.includes("xxxxx")) {
      const signature = req.headers["x-fedapay-signature"] as string | undefined;
      if (!signature || !verifySignature(rawBody, signature, env.fedapay.webhookSecret)) {
        res.status(401).json({ error: "Signature webhook invalide" });
        return;
      }
    }

    const eventName = payload.name ?? "unknown";
    const entityId = payload.entity?.id != null ? String(payload.entity.id) : null;

    let transaction = entityId
      ? await transactionsRepo.findByFedapayId(entityId)
      : null;

    await logPaymentEvent({
      transactionId: transaction?.transactionId,
      fedapayEventId: entityId ?? undefined,
      eventType: eventName,
      payload,
    });

    if (transaction && eventName === "transaction.approved") {
      const updated = await transactionsRepo.updateTransactionStatus(
        transaction.transactionId,
        "FUNDS_ESCROWED",
      );
      if (updated) {
        transaction = updated;
        const buyer = await usersRepo.findUserById(transaction.buyerId);
        if (buyer) {
          await notifySellerPaymentReceived({
            sellerId: transaction.sellerId,
            buyer: { fullName: buyer.fullName, username: buyer.username },
            transactionId: transaction.transactionId,
            title: transaction.title,
            total: transaction.amount + transaction.fees,
          });
        }
      }
    }

    if (transaction && eventName === "transaction.canceled") {
      await transactionsRepo.updateTransactionStatus(
        transaction.transactionId,
        "PENDING_PAYMENT",
      );
    }

    res.status(200).json({ received: true });
  }),
);

function verifySignature(body: Buffer, signature: string, secret: string): boolean {
  try {
    const expected = createHmac("sha256", secret).update(body).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(signature.replace(/^sha256=/, ""));
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
