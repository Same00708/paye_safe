'use client';

import { STATUS_LABELS, type TransactionStatus } from "@/types/transaction";

const BADGE_CLASS: Partial<Record<TransactionStatus, string>> = {
  PENDING_PAYMENT: "badge-pending",
  FUNDS_ESCROWED: "badge-escrow",
  COMPLETED: "badge-done",
  RETURNED_TO_SELLER: "badge-done",
  DISPUTE: "badge-dispute",
  RETURN_INITIATED: "badge-pending",
};

export function StatusBadge({ status }: { status: TransactionStatus }) {
  const className = `badge ${BADGE_CLASS[status] ?? "badge-escrow"}`;
  return <span className={className}>{STATUS_LABELS[status]}</span>;
}
