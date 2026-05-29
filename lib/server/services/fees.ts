/** Commission PaySafe sur transaction réussie (sans litige) */
export const PLATFORM_FEE_RATE = 0.05;

export function computePlatformFee(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * PLATFORM_FEE_RATE);
}

export function formatFcfa(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
}
