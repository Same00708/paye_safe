import type { AuthUser } from "@/context/AuthContext";

export type TransactionStatus =
  | "PENDING_PAYMENT"
  | "FUNDS_ESCROWED"
  | "DELIVERED_TO_BUYER"
  | "COMPLETED"
  | "RETURN_INITIATED"
  | "RETURNED_TO_SELLER"
  | "DISPUTE";

export interface Transaction {
  transactionId: number;
  buyerId: number;
  sellerId: number;
  title: string;
  description?: string | null;
  amount: number;
  fees: number;
  feesWaived?: boolean;
  status: TransactionStatus;
  fedapayTransactionId?: string | null;
  createdAt: string;
  updatedAt?: string;
  buyer?: AuthUser;
  seller?: AuthUser;
  unreadMessages?: number;
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
