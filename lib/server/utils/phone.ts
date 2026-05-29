import { AppError } from "../middleware/errorHandler";
import { TOGO_MOBILE_PREFIXES } from "../constants/togoDemoAccounts";

const TOGO_E164_REGEX = /^\+228(90|91|92|93|96|97|98|99)[0-9]{6}$/;

/** Vérifie un mobile togolais (+228 + 8 chiffres, préfixe opérateur valide) */
export function isValidTogoleseMobile(e164: string): boolean {
  return TOGO_E164_REGEX.test(e164);
}

function assertTogoleseMobile(e164: string): void {
  if (!e164.startsWith("+228")) return;

  if (!isValidTogoleseMobile(e164)) {
    throw new AppError(
      400,
      `Numéro mobile Togo invalide. Utilisez 8 chiffres commençant par ${TOGO_MOBILE_PREFIXES.join(", ")} (ex. 90123456 ou +22890123456).`,
    );
  }
}

/** Normalise au format international (+228…) et valide la convention togolaise */
export function normalizePhone(raw: string): string {
  let cleaned = raw.replace(/[\s-]/g, "");

  if (cleaned.startsWith("00")) {
    cleaned = `+${cleaned.slice(2)}`;
  }

  if (!cleaned.startsWith("+")) {
    if (/^[0-9]{8}$/.test(cleaned)) {
      cleaned = `+228${cleaned}`;
    } else if (/^[0-9]{11}$/.test(cleaned) && cleaned.startsWith("228")) {
      cleaned = `+${cleaned}`;
    } else if (/^[0-9]{9,15}$/.test(cleaned)) {
      cleaned = `+${cleaned}`;
    } else {
      throw new AppError(
        400,
        "Numéro invalide. Exemple : 90123456 ou +22890123456 (8 chiffres, Togo)",
      );
    }
  }

  if (!/^\+[0-9]{8,15}$/.test(cleaned)) {
    throw new AppError(400, "Format international requis (ex. +22890123456)");
  }

  assertTogoleseMobile(cleaned);
  return cleaned;
}

export function normalizeUsername(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new AppError(400, "Nom d'utilisateur requis");
  }
  const username = trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
  if (!/^@[a-zA-Z0-9_]{3,30}$/.test(username)) {
    throw new AppError(
      400,
      "Username : 3–30 caractères (lettres, chiffres, _), ex. @junior",
    );
  }
  return username.toLowerCase();
}
