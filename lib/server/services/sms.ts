import { env } from "../config/env";

export type SmsProvider = "twilio" | "termii" | "console";

export interface SmsResult {
  sent: boolean;
  provider: SmsProvider;
  messageId?: string;
  error?: string;
}

function otpMessage(code: string): string {
  return `PaySafe : votre code de verification est ${code}. Valide 10 minutes. Ne le partagez avec personne.`;
}

async function sendViaTwilio(phone: string, text: string): Promise<SmsResult> {
  const { accountSid, authToken, fromNumber } = env.sms.twilio;
  if (!accountSid || !authToken || !fromNumber) {
    return { sent: false, provider: "twilio", error: "Twilio non configuré" };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const body = new URLSearchParams({
    To: phone,
    From: fromNumber,
    Body: text,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const data = (await res.json()) as { sid?: string; message?: string };
  if (!res.ok) {
    return { sent: false, provider: "twilio", error: data.message ?? `HTTP ${res.status}` };
  }
  return { sent: true, provider: "twilio", messageId: data.sid };
}

async function sendViaTermii(phone: string, text: string): Promise<SmsResult> {
  const { apiKey, senderId } = env.sms.termii;
  if (!apiKey) {
    return { sent: false, provider: "termii", error: "Termii non configuré" };
  }

  const res = await fetch("https://api.ng.termii.com/api/sms/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      to: phone,
      from: senderId,
      sms: text,
      type: "plain",
      channel: "generic",
    }),
  });

  const data = (await res.json()) as { message_id?: string; message?: string; code?: string };
  if (!res.ok) {
    return {
      sent: false,
      provider: "termii",
      error: data.message ?? `HTTP ${res.status}`,
    };
  }
  return { sent: true, provider: "termii", messageId: data.message_id };
}

async function sendViaConsole(phone: string, text: string): Promise<SmsResult> {
  console.info(`[PaySafe SMS] → ${phone}`);
  console.info(`[PaySafe SMS] ${text}`);
  return { sent: true, provider: "console", messageId: `console_${Date.now()}` };
}

export const smsService = {
  isConfigured(): boolean {
    const p = env.sms.provider;
    if (p === "twilio") {
      return Boolean(env.sms.twilio.accountSid && env.sms.twilio.authToken);
    }
    if (p === "termii") {
      return Boolean(env.sms.termii.apiKey);
    }
    return false;
  },

  async sendOtp(phone: string, code: string): Promise<SmsResult> {
    const text = otpMessage(code);
    const provider = env.sms.provider;

    if (provider === "twilio") {
      const result = await sendViaTwilio(phone, text);
      if (result.sent) return result;
      console.warn("[PaySafe SMS] Twilio échec:", result.error);
    }

    if (provider === "termii" || provider === "twilio") {
      const termii = await sendViaTermii(phone, text);
      if (termii.sent) return termii;
      if (provider === "termii") {
        console.warn("[PaySafe SMS] Termii échec:", termii.error);
      }
    }

    if (env.nodeEnv === "development" || env.sms.fallbackConsole) {
      return sendViaConsole(phone, text);
    }

    return {
      sent: false,
      provider,
      error: "Service SMS indisponible. Configurez TWILIO ou TERMII.",
    };
  },
};
