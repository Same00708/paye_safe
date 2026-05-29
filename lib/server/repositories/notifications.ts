import type { NotificationType } from "../types/transaction";
import { query } from "../db/pool";

const TABLE = "notifications";

export interface NotificationRow {
  notification_id: number;
  user_id: number;
  transaction_id: number | null;
  type: NotificationType;
  title: string;
  content: string;
  is_seen: boolean;
  created_at: Date;
}

function mapNotification(row: NotificationRow) {
  return {
    notificationId: row.notification_id,
    userId: row.user_id,
    transactionId: row.transaction_id,
    type: row.type,
    title: row.title,
    content: row.content,
    isSeen: row.is_seen,
    createdAt: row.created_at.toISOString(),
  };
}

export async function findByUser(userId: number) {
  const { rows } = await query<NotificationRow>(
    `SELECT * FROM ${TABLE} WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [userId],
  );
  const data = rows.map(mapNotification);
  const unreadCount = data.filter((n) => !n.isSeen).length;
  return { data, unreadCount };
}

export async function markSeen(notificationId: number, userId: number) {
  const { rows } = await query<NotificationRow>(
    `UPDATE ${TABLE} SET is_seen = true
     WHERE notification_id = $1 AND user_id = $2
     RETURNING *`,
    [notificationId, userId],
  );
  return rows[0] ? mapNotification(rows[0]) : null;
}

export async function markAllSeen(userId: number) {
  await query(
    `UPDATE ${TABLE} SET is_seen = true WHERE user_id = $1 AND is_seen = false`,
    [userId],
  );
}

export async function createNotification(params: {
  userId: number;
  transactionId?: number;
  type: NotificationType;
  title: string;
  content: string;
}) {
  const { rows } = await query<NotificationRow>(
    `INSERT INTO ${TABLE} (user_id, transaction_id, type, title, content)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      params.userId,
      params.transactionId ?? null,
      params.type,
      params.title,
      params.content,
    ],
  );
  return mapNotification(rows[0]!);
}
