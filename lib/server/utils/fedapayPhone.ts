/** Numéro au format attendu par FedaPay (sans indicatif dans number) */
export function formatPhoneForFedapay(phoneE164: string): { number: string; country: string } {
  const digits = phoneE164.replace(/\D/g, "");

  if (digits.startsWith("228") && digits.length >= 11) {
    return { country: "tg", number: digits.slice(3) };
  }

  if (digits.length === 8) {
    return { country: "tg", number: digits };
  }

  return { country: "tg", number: digits.slice(-8) };
}
