import * as notificationsRepo from "../repositories/notifications";
import type { NotificationType } from "../types/transaction";

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
  const tasks = [];
  if (params.excludeUserId !== params.buyerId) {
    tasks.push(
      notifyUser({
        userId: params.buyerId,
        transactionId: params.transactionId,
        type: params.type,
        title: params.title,
        content: params.content,
      }),
    );
  }
  if (params.excludeUserId !== params.sellerId) {
    tasks.push(
      notifyUser({
        userId: params.sellerId,
        transactionId: params.transactionId,
        type: params.type,
        title: params.title,
        content: params.content,
      }),
    );
  }
  await Promise.all(tasks);
}
