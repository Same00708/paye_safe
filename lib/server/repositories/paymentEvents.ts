import { query } from "../db/pool";

export async function logPaymentEvent(params: {
  transactionId?: number;
  fedapayEventId?: string;
  eventType: string;
  payload: unknown;
}) {
  await query(
    `INSERT INTO payment_events (transaction_id, fedapay_event_id, event_type, payload)
     VALUES ($1, $2, $3, $4)`,
    [
      params.transactionId ?? null,
      params.fedapayEventId ?? null,
      params.eventType,
      JSON.stringify(params.payload),
    ],
  );
}
