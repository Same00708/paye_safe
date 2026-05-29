import type { TransactionStatus } from "../types/transaction";
import { query } from "../db/pool";

export interface TransactionRow {
  transaction_id: number;
  buyer_id: number;
  seller_id: number;
  title: string;
  description: string | null;
  amount: string;
  fees: string;
  status: TransactionStatus;
  fedapay_transaction_id: string | null;
  fees_waived: boolean;
  created_at: Date;
  updated_at: Date;
}

export function mapTransaction(row: TransactionRow) {
  return {
    transactionId: row.transaction_id,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    title: row.title,
    description: row.description,
    amount: Number(row.amount),
    fees: Number(row.fees),
    status: row.status,
    fedapayTransactionId: row.fedapay_transaction_id,
    feesWaived: row.fees_waived ?? false,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function findAllTransactions(userId?: number) {
  const sql = userId
    ? `SELECT * FROM Transactions
       WHERE buyer_id = $1 OR seller_id = $1
       ORDER BY created_at DESC`
    : `SELECT * FROM Transactions ORDER BY created_at DESC`;
  const { rows } = await query<TransactionRow>(sql, userId ? [userId] : []);
  return rows.map(mapTransaction);
}

export async function findTransactionById(id: number) {
  const { rows } = await query<TransactionRow>(
    "SELECT * FROM Transactions WHERE transaction_id = $1",
    [id],
  );
  return rows[0] ? mapTransaction(rows[0]) : null;
}

export async function findByFedapayId(fedapayId: string) {
  const { rows } = await query<TransactionRow>(
    "SELECT * FROM Transactions WHERE fedapay_transaction_id = $1",
    [fedapayId],
  );
  return rows[0] ? mapTransaction(rows[0]) : null;
}

export async function createTransaction(params: {
  title: string;
  description?: string;
  amount: number;
  fees: number;
  buyerId: number;
  sellerId: number;
}) {
  const { rows } = await query<TransactionRow>(
    `INSERT INTO Transactions (buyer_id, seller_id, title, description, amount, fees)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      params.buyerId,
      params.sellerId,
      params.title,
      params.description ?? null,
      params.amount,
      params.fees,
    ],
  );
  return mapTransaction(rows[0]!);
}

export async function updateTransactionStatus(id: number, status: TransactionStatus) {
  const { rows } = await query<TransactionRow>(
    `UPDATE Transactions SET status = $2, updated_at = CURRENT_TIMESTAMP
     WHERE transaction_id = $1
     RETURNING *`,
    [id, status],
  );
  return rows[0] ? mapTransaction(rows[0]) : null;
}

export async function setFeesWaived(id: number, waived = true) {
  const { rows } = await query<TransactionRow>(
    `UPDATE transactions SET fees_waived = $2, updated_at = CURRENT_TIMESTAMP
     WHERE transaction_id = $1
     RETURNING *`,
    [id, waived],
  );
  return rows[0] ? mapTransaction(rows[0]) : null;
}

export async function setFedapayTransactionId(id: number, fedapayId: string) {
  const { rows } = await query<TransactionRow>(
    `UPDATE Transactions SET fedapay_transaction_id = $2, updated_at = CURRENT_TIMESTAMP
     WHERE transaction_id = $1
     RETURNING *`,
    [id, fedapayId],
  );
  return rows[0] ? mapTransaction(rows[0]) : null;
}

export async function userCanAccessTransaction(
  transactionId: number,
  userId: number,
): Promise<boolean> {
  const { rows } = await query<{ ok: number }>(
    `SELECT 1 AS ok FROM Transactions
     WHERE transaction_id = $1 AND (buyer_id = $2 OR seller_id = $2)`,
    [transactionId, userId],
  );
  return rows.length > 0;
}
