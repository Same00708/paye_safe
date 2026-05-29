export type TransactionStatus =
  | "PENDING_PAYMENT"
  | "FUNDS_ESCROWED"
  | "DELIVERED_TO_BUYER"
  | "COMPLETED"
  | "RETURN_INITIATED"
  | "RETURNED_TO_SELLER"
  | "DISPUTE";

export type NotificationType =
  | "NEW_MESSAGE"
  | "STATUS_CHANGED"
  | "PAYMENT_RECEIVED"
  | "SYSTEM";

export interface JwtPayload {
  userId: number;
  phone: string;
}
