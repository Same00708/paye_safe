import { query } from "../db/pool";
import { PAYSAFE_USERS_TABLE } from "../db/paysafeSchema";

interface MessageRow {
  message_id: number;
  transaction_id: number;
  sender_id: number;
  message_text: string;
  attachment_url: string | null;
  is_read: boolean;
  created_at: Date;
  sender_username: string;
  sender_full_name: string;
}

function mapMessage(row: MessageRow) {
  return {
    messageId: row.message_id,
    transactionId: row.transaction_id,
    senderId: row.sender_id,
    senderUsername: row.sender_username,
    senderFullName: row.sender_full_name,
    messageText: row.message_text,
    attachmentUrl: row.attachment_url,
    isRead: row.is_read,
    createdAt: row.created_at.toISOString(),
    isSystem:
      row.message_text.startsWith("🔒") ||
      row.message_text.startsWith("📦") ||
      row.message_text.startsWith("↩️") ||
      row.message_text.startsWith("⚠️"),
  };
}

export async function findMessagesByTransaction(transactionId: number) {
  const { rows } = await query<MessageRow>(
    `SELECT m.*, u.username AS sender_username, u.full_name AS sender_full_name
     FROM Messages m
     JOIN ${PAYSAFE_USERS_TABLE} u ON u.user_id = m.sender_id
     WHERE m.transaction_id = $1
     ORDER BY m.created_at ASC`,
    [transactionId],
  );
  return rows.map(mapMessage);
}

export async function createMessage(params: {
  transactionId: number;
  senderId: number;
  messageText: string;
  attachmentUrl?: string;
}) {
  const { rows } = await query<MessageRow>(
    `INSERT INTO Messages (transaction_id, sender_id, message_text, attachment_url)
     VALUES ($1, $2, $3, $4)
     RETURNING message_id, transaction_id, sender_id, message_text, attachment_url, is_read, created_at,
       (SELECT username FROM ${PAYSAFE_USERS_TABLE} WHERE user_id = $2) AS sender_username,
       (SELECT full_name FROM ${PAYSAFE_USERS_TABLE} WHERE user_id = $2) AS sender_full_name`,
    [
      params.transactionId,
      params.senderId,
      params.messageText,
      params.attachmentUrl ?? null,
    ],
  );
  return mapMessage(rows[0]!);
}

export async function markMessagesRead(transactionId: number, readerId: number) {
  await query(
    `UPDATE Messages SET is_read = true
     WHERE transaction_id = $1 AND sender_id != $2 AND is_read = false`,
    [transactionId, readerId],
  );
}

export async function countUnread(transactionId: number, readerId: number) {
  const { rows } = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM Messages
     WHERE transaction_id = $1 AND sender_id != $2 AND is_read = false`,
    [transactionId, readerId],
  );
  return Number(rows[0]?.count ?? 0);
}
