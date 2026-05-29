import { env } from "../config/env";
import { AppError } from "../middleware/errorHandler";
import { smsService } from "./sms";

export function generateOtpCode(): string {
  if (env.useFixedOtp && env.otpDevCode) {
    return env.otpDevCode;
  }
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function deliverOtp(phone: string, code: string) {
  const sms = await smsService.sendOtp(phone, code);

  const response: Record<string, unknown> = {
    message: sms.sent
      ? `Code envoyé par SMS au ${phone}.`
      : "Impossible d'envoyer le SMS. Réessayez ou contactez le support.",
    expiresInMinutes: 10,
    phoneNumber: phone,
    smsSent: sms.sent,
    smsProvider: sms.provider,
  };

  if (!sms.sent && env.nodeEnv === "production") {
    throw new AppError(503, response.message as string);
  }

  if (!sms.sent && env.exposeOtpInResponse) {
    response.devCode = code;
    response.message =
      "SMS non configuré — utilisez le code affiché ci-dessous (mode développement).";
  } else if (env.exposeOtpInResponse && env.nodeEnv !== "production") {
    response.devCode = code;
  }

  return response;
}
