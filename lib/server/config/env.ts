import dotenv from "dotenv";
import { resolveDatabaseUrl } from "./databaseUrl";

dotenv.config();

function corsOrigins(): string | string[] {
  const raw =
    process.env.CORS_ORIGIN ??
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  if (raw.includes(",")) return raw.split(",").map((s) => s.trim());
  return raw;
}

function smsProvider(): "twilio" | "termii" | "console" {
  const p = (process.env.SMS_PROVIDER ?? "console").toLowerCase();
  if (p === "twilio" || p === "termii") return p;
  return "console";
}

const isProd = (process.env.NODE_ENV ?? "development") === "production";
const smsConfigured =
  Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) ||
  Boolean(process.env.TERMII_API_KEY);

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: corsOrigins(),
  allowSimulatePayment: process.env.ALLOW_SIMULATE_PAYMENT === "true",
  /** Crée les comptes démo au démarrage si la BDD est vide (prod Render) */
  seedDemoOnStart:
    isProd && process.env.SEED_DEMO_ON_START !== "false",
  databaseUrl: resolveDatabaseUrl(),
  jwtSecret: process.env.JWT_SECRET ?? "paysafe-dev-secret-change-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  otpDevCode: process.env.OTP_DEV_CODE ?? "",
  useFixedOtp:
    !isProd &&
    process.env.USE_FIXED_OTP === "true" &&
    Boolean(process.env.OTP_DEV_CODE),
  exposeOtpInResponse:
    !isProd &&
    process.env.EXPOSE_OTP_IN_RESPONSE === "true" &&
    !smsConfigured,
  appBaseUrl:
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_BASE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
  /** Numéros autorisés admin (secours), ex. +22890999999 */
  adminPhones: (process.env.ADMIN_PHONES ?? "+22893224301")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  sms: {
    provider: smsProvider(),
    fallbackConsole: process.env.SMS_FALLBACK_CONSOLE !== "false",
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
      authToken: process.env.TWILIO_AUTH_TOKEN ?? "",
      fromNumber: process.env.TWILIO_PHONE_NUMBER ?? "",
    },
    termii: {
      apiKey: process.env.TERMII_API_KEY ?? "",
      senderId: process.env.TERMII_SENDER_ID ?? "PaySafe",
    },
  },
  fedapay: {
    environment: (process.env.FEDAPAY_ENVIRONMENT ?? "sandbox") as "sandbox" | "live",
    publicKey: process.env.FEDAPAY_PUBLIC_KEY ?? "",
    secretKey: process.env.FEDAPAY_SECRET_KEY ?? "",
    webhookSecret: process.env.FEDAPAY_WEBHOOK_SECRET ?? "",
    callbackUrl:
      process.env.FEDAPAY_CALLBACK_URL ??
      "http://localhost:5173/transactions",
    /** Site public FedaPay (lien informatif + secours) */
    portalUrl:
      process.env.FEDAPAY_PORTAL_URL ??
      ((process.env.FEDAPAY_ENVIRONMENT ?? "sandbox") === "live"
        ? "https://pay.fedapay.com"
        : "https://sandbox.fedapay.com"),
  },
} as const;

export function assertProductionSecrets(): void {
  if (!isProd) return;

  if (env.jwtSecret.includes("dev") || env.jwtSecret.length < 32) {
    console.warn("[PaySafe] JWT_SECRET faible pour la production");
  }
  if (!smsConfigured && env.sms.provider !== "console") {
    console.warn("[PaySafe] SMS non configuré — OTP ne partira pas par SMS");
  }
  if (!env.fedapay.secretKey || env.fedapay.secretKey.includes("xxxxx")) {
    console.warn("[PaySafe] FEDAPAY_SECRET_KEY manquante");
  }
}

export function assertFedapayConfigured(): void {
  if (!env.fedapay.secretKey || env.fedapay.secretKey.includes("xxxxx")) {
    console.warn("[PaySafe] FEDAPAY_SECRET_KEY absente — mode stub paiement");
  }
}
