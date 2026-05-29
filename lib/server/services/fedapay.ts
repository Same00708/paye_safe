import { env } from "../config/env";
import { logPaymentEvent } from "../repositories/paymentEvents";
import { formatPhoneForFedapay } from "../utils/fedapayPhone";

const SANDBOX_BASE = "https://sandbox-api.fedapay.com/v1";
const LIVE_BASE = "https://api.fedapay.com/v1";

/** Méthodes FedaPay valides pour le Togo (XOF) */
const TOGO_PAYMENT_MODES: Record<string, string> = {
  moov: "moov_tg",
  moov_tg: "moov_tg",
  togocel: "togocel",
  yas: "togocel",
  mix_yas: "togocel",
  flooz: "togocel",
  mtn: "togocel",
  orange: "togocel",
  wave: "moov_tg",
};

function apiBase(): string {
  return env.fedapay.environment === "live" ? LIVE_BASE : SANDBOX_BASE;
}

function parseApiError(data: unknown, status: number): string {
  const root = data as Record<string, unknown>;
  const errors = root.errors as Array<{ message?: string }> | undefined;
  if (Array.isArray(errors) && errors[0]?.message) {
    return errors.map((e) => e.message).filter(Boolean).join(" — ");
  }
  if (typeof root.message === "string") return root.message;
  return `FedaPay HTTP ${status}`;
}

async function fedapayRequest<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.fedapay.secretKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await res.json().catch(() => ({}))) as T & Record<string, unknown>;

  if (!res.ok) {
    throw new Error(parseApiError(data, res.status));
  }

  return data;
}

function unwrapEntity<T>(data: unknown, key: string): T | null {
  const root = data as Record<string, unknown>;
  return (root[key] as T) ?? (root[`v1/${key}`] as T) ?? null;
}

function parseTransactionId(data: unknown): number | null {
  const tx = unwrapEntity<{ id?: number }>(data, "transaction");
  return tx?.id ?? null;
}

function parseTokenUrl(data: unknown): string | null {
  const token = unwrapEntity<{ url?: string }>(data, "token");
  return token?.url ?? null;
}

function parsePayoutId(data: unknown): string | null {
  const payout = unwrapEntity<{ id?: number | string }>(data, "payout");
  return payout?.id != null ? String(payout.id) : null;
}

export const fedapayService = {
  isConfigured(): boolean {
    return Boolean(env.fedapay.secretKey && !env.fedapay.secretKey.includes("xxxxx"));
  },

  resolveMode(mode?: string): string {
    if (!mode) return "moov_tg";
    const key = mode.toLowerCase();
    return TOGO_PAYMENT_MODES[key] ?? key;
  },

  /** Vérifie que les clés API répondent (sans créer de paiement) */
  async testConnection(): Promise<{
    ok: boolean;
    environment: string;
    message: string;
  }> {
    if (!this.isConfigured()) {
      return {
        ok: false,
        environment: env.fedapay.environment,
        message: "FEDAPAY_SECRET_KEY manquante ou placeholder (xxxxx)",
      };
    }

    try {
      await fedapayRequest<unknown>("GET", "/transactions?per_page=1");
      return {
        ok: true,
        environment: env.fedapay.environment,
        message: `API FedaPay accessible (${apiBase()})`,
      };
    } catch (err) {
      return {
        ok: false,
        environment: env.fedapay.environment,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  },

  async createPayment(params: {
    amount: number;
    description: string;
    callbackUrl: string;
    customer: {
      firstname: string;
      lastname: string;
      email?: string;
      phoneNumber: string;
      country?: string;
    };
    mode?: string;
    transactionId?: number;
  }): Promise<{ fedapayTransactionId: number; paymentUrl: string; reference: string }> {
    if (!this.isConfigured()) {
      return {
        fedapayTransactionId: 0,
        paymentUrl: `${env.appBaseUrl}/transactions/${params.transactionId ?? ""}?payment=stub`,
        reference: `stub_${Date.now()}`,
      };
    }

    const phone = formatPhoneForFedapay(params.customer.phoneNumber);
    const paymentMode = this.resolveMode(params.mode);

    const createBody: Record<string, unknown> = {
      description: params.description,
      amount: Math.round(params.amount),
      currency: { iso: "XOF" },
      callback_url: params.callbackUrl,
      mode: paymentMode,
      custom_metadata: {
        paysafe_transaction_id: params.transactionId,
        source: "paysafe",
      },
      customer: {
        firstname: params.customer.firstname,
        lastname: params.customer.lastname,
        email: params.customer.email ?? `${phone.number}@paysafe.local`,
        phone_number: {
          number: phone.number,
          country: phone.country,
        },
      },
    };

    const created = await fedapayRequest<unknown>("POST", "/transactions", createBody);
    const fedapayId = parseTransactionId(created);
    if (!fedapayId) {
      throw new Error("Réponse FedaPay invalide (id transaction manquant)");
    }

    const tokenRes = await fedapayRequest<unknown>(
      "POST",
      `/transactions/${fedapayId}/token`,
      { mode: paymentMode },
    );
    const paymentUrl = parseTokenUrl(tokenRes);
    if (!paymentUrl) {
      throw new Error("Réponse FedaPay invalide (URL de paiement manquante)");
    }

    const tx = unwrapEntity<{ reference?: string }>(created, "transaction");
    const ref = tx?.reference ?? String(fedapayId);

    return { fedapayTransactionId: fedapayId, paymentUrl, reference: ref };
  },

  async createPayout(params: {
    amount: number;
    description: string;
    phoneNumber: string;
    country?: string;
    transactionId: number;
    customerName?: { firstname: string; lastname: string };
    mode?: string;
  }): Promise<{ payoutId: string; stub: boolean }> {
    if (!this.isConfigured()) {
      const stubId = `stub_payout_${Date.now()}`;
      await logPaymentEvent({
        transactionId: params.transactionId,
        eventType: "payout.stub",
        payload: { amount: params.amount, stubId },
      });
      return { payoutId: stubId, stub: true };
    }

    const phone = formatPhoneForFedapay(params.phoneNumber);
    const names = params.customerName ?? { firstname: "Vendeur", lastname: "PaySafe" };

    try {
      const body = {
        amount: Math.round(params.amount),
        currency: { iso: "XOF" },
        description: params.description,
        mode: this.resolveMode(params.mode ?? "moov_tg"),
        custom_metadata: { paysafe_transaction_id: params.transactionId },
        customer: {
          firstname: names.firstname,
          lastname: names.lastname,
          email: `${phone.number}@paysafe.local`,
          phone_number: {
            number: phone.number,
            country: phone.country,
          },
        },
      };
      const res = await fedapayRequest<unknown>("POST", "/payouts", body);
      const payoutId = parsePayoutId(res) ?? `payout_${Date.now()}`;
      await logPaymentEvent({
        transactionId: params.transactionId,
        fedapayEventId: payoutId,
        eventType: "payout.created",
        payload: res,
      });
      return { payoutId, stub: false };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[FedaPay] Payout:", msg);
      await logPaymentEvent({
        transactionId: params.transactionId,
        eventType: "payout.error",
        payload: { error: msg, amount: params.amount },
      });
      throw new Error(`Versement FedaPay impossible : ${msg}`);
    }
  },

  async createRefund(params: {
    fedapayTransactionId: string;
    amount: number;
    transactionId: number;
  }): Promise<{ refundId: string; stub: boolean }> {
    if (!this.isConfigured() || !params.fedapayTransactionId) {
      const stubId = `stub_refund_${Date.now()}`;
      await logPaymentEvent({
        transactionId: params.transactionId,
        eventType: "refund.stub",
        payload: { amount: params.amount, stubId },
      });
      return { refundId: stubId, stub: true };
    }

    try {
      const res = await fedapayRequest<unknown>(
        "POST",
        `/transactions/${params.fedapayTransactionId}/refund`,
        { amount: Math.round(params.amount) },
      );
      const refundId =
        unwrapEntity<{ id?: number }>(res, "transaction")?.id?.toString() ??
        `refund_${Date.now()}`;
      await logPaymentEvent({
        transactionId: params.transactionId,
        fedapayEventId: refundId,
        eventType: "refund.created",
        payload: res,
      });
      return { refundId, stub: false };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[FedaPay] Refund:", msg);
      await logPaymentEvent({
        transactionId: params.transactionId,
        eventType: "refund.error",
        payload: { error: msg, amount: params.amount },
      });
      throw new Error(`Remboursement FedaPay impossible : ${msg}`);
    }
  },
};
