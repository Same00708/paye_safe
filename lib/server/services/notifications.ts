import type { NotificationType } from "../types/transaction";
import * as notificationsRepo from "../repositories/notifications";

export async function notifyUser(params: {
  userId: number;
  transactionId?: number;
  type: NotificationType;
  title: string;
  content: string;
}) {
  return notificationsRepo.createNotification(params);
}

export async function notifyTransactionParties(params: {
  buyerId: number;
  sellerId: number;
  transactionId: number;
  type: NotificationType;
  title: string;
  content: string;
  excludeUserId?: number;
}) {
  const targets = [params.buyerId, params.sellerId].filter(
    (id) => id !== params.excludeUserId,
  );
  await Promise.all(
    targets.map((userId) =>
      notificationsRepo.createNotification({
        userId,
        transactionId: params.transactionId,
        type: params.type,
        title: params.title,
        content: params.content,
      }),
    ),
  );
}
