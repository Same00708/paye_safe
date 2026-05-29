/** Flags UI — jamais de comptes démo / admin visibles en build production. */
export const isProductionBuild = process.env.NODE_ENV === "production";

/** Indices démo (connexion, simulation paiement) : développement local uniquement. */
export const showDemoUi = !isProductionBuild;
