import type { TransactionStatus } from "../types/transaction";
import { AppError } from "../middleware/errorHandler";

const ALLOWED_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  PENDING_PAYMENT: ["FUNDS_ESCROWED", "DISPUTE"],
  FUNDS_ESCROWED: ["DELIVERED_TO_BUYER", "RETURN_INITIATED", "DISPUTE"],
  DELIVERED_TO_BUYER: ["COMPLETED", "RETURN_INITIATED", "DISPUTE"],
  COMPLETED: [],
  RETURN_INITIATED: ["RETURNED_TO_SELLER", "DISPUTE"],
  RETURNED_TO_SELLER: [],
  DISPUTE: ["FUNDS_ESCROWED", "COMPLETED", "RETURNED_TO_SELLER"],
};

export function assertTransition(
  from: TransactionStatus,
  to: TransactionStatus,
): void {
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new AppError(
      400,
      `Transition interdite : ${from} → ${to}`,
    );
  }
}

export const STATUS_LABELS: Record<TransactionStatus, string> = {
  PENDING_PAYMENT: "En attente de paiement",
  FUNDS_ESCROWED: "Argent bloqué",
  DELIVERED_TO_BUYER: "Livré — à valider",
  COMPLETED: "Terminée",
  RETURN_INITIATED: "Retour en cours",
  RETURNED_TO_SELLER: "Remboursé",
  DISPUTE: "Litige",
};
