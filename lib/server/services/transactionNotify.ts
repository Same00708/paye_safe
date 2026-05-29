import { formatFcfa } from "./fees";
import { notifyUser } from "./notifications";

type UserLite = { fullName: string; username: string };

/** Vendeur : nouvelle commande initiée par un acheteur */
export async function notifySellerNewOrder(params: {
  sellerId: number;
  buyer: UserLite;
  transactionId: number;
  title: string;
  amount: number;
  fees: number;
}) {
  const total = params.amount + params.fees;
  await notifyUser({
    userId: params.sellerId,
    transactionId: params.transactionId,
    type: "STATUS_CHANGED",
    title: "Nouvelle commande",
    content: `${params.buyer.fullName} (${params.buyer.username}) souhaite payer une commande chez vous : « ${params.title} ». Article : ${formatFcfa(params.amount)} + frais PaySafe ${formatFcfa(params.fees)} (total ${formatFcfa(total)}). En attente du paiement de l'acheteur.`,
  });
}

/** Vendeur : l'acheteur a payé */
export async function notifySellerPaymentReceived(params: {
  sellerId: number;
  buyer: UserLite;
  transactionId: number;
  title: string;
  total: number;
}) {
  await notifyUser({
    userId: params.sellerId,
    transactionId: params.transactionId,
    type: "PAYMENT_RECEIVED",
    title: "Paiement reçu",
    content: `${params.buyer.fullName} (${params.buyer.username}) a payé la commande « ${params.title} ». ${formatFcfa(params.total)} sont bloqués chez PaySafe — vous pouvez expédier l'article.`,
  });
}

/** Acheteur : commande créée */
export async function notifyBuyerOrderCreated(params: {
  buyerId: number;
  seller: UserLite;
  transactionId: number;
  title: string;
  total: number;
}) {
  await notifyUser({
    userId: params.buyerId,
    transactionId: params.transactionId,
    type: "STATUS_CHANGED",
    title: "Commande créée",
    content: `Commande « ${params.title} » chez ${params.seller.fullName}. Payez ${formatFcfa(params.total)} pour bloquer les fonds en sécurité.`,
  });
}

export async function notifyDisputeOpened(params: {
  buyerId: number;
  sellerId: number;
  transactionId: number;
  title: string;
  openedByUserId: number;
}) {
  const msg = `Litige ouvert sur « ${params.title} ». Aucun frais PaySafe ne sera prélevé.`;
  const targets =
    params.openedByUserId === params.buyerId
      ? [params.sellerId]
      : [params.buyerId];
  await Promise.all(
    targets.map((userId) =>
      notifyUser({
        userId,
        transactionId: params.transactionId,
        type: "SYSTEM",
        title: "Litige PaySafe",
        content: msg,
      }),
    ),
  );
}
