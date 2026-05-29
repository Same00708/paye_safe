import {
  extractSupabaseProjectRef,
  resolveDatabaseUrl,
} from "../config/databaseUrl";
import { getLastConnectionError } from "./pool";

/** URL masquée pour les logs */
export function maskDatabaseUrl(url: string): string {
  return url.replace(/:([^:@/]+)@/, ":****@");
}

export function describeActiveDatabaseUrl(): {
  url: string;
  masked: string;
  usesPooler: boolean;
  host: string;
} {
  const url = resolveDatabaseUrl();
  let host = "?";
  try {
    host = new URL(url).hostname;
  } catch {
    /* ignore */
  }
  return {
    url,
    masked: maskDatabaseUrl(url),
    usesPooler: url.includes("pooler.supabase.com"),
    host,
  };
}

export function printDatabaseConnectionHelp(): void {
  const err = getLastConnectionError() ?? "erreur inconnue";
  const { masked, usesPooler, host } = describeActiveDatabaseUrl();
  const directRef = extractSupabaseProjectRef(process.env.DATABASE_URL ?? "");

  console.error("\n--- Connexion base de données ---");
  console.error("URL active :", masked);
  console.error("Erreur     :", err);

  const isTimeout =
    /timeout|terminated|ETIMEDOUT|ECONNREFUSED/i.test(err);
  const isEnoent = /ENOTFOUND|getaddrinfo/i.test(err);

  if (!usesPooler && directRef) {
    console.error(`
→ Cause probable : l'hôte direct db.${directRef}.supabase.co est lent ou inaccessible
  (IPv6 / pare-feu / projet Supabase en pause).

→ Solution (recommandée) — pooler IPv4 Session :
    npm run db:discover-pooler

  Ou manuellement : Supabase Dashboard → Project Settings → Connect
  → "Session pooler" → copier l'URI dans .env :
    DATABASE_POOLER_URL=postgresql://postgres.${directRef}:MOT_DE_PASSE@aws-XX-REGION.pooler.supabase.com:5432/postgres
`);
  } else if (usesPooler && isTimeout) {
    console.error(`
→ Le pooler ne répond pas à temps. Vérifiez :
  • Projet Supabase non en pause (dashboard)
  • Mot de passe correct dans DATABASE_POOLER_URL
  • Région du pooler = celle affichée dans le dashboard (aws-0- ou aws-1-…)
  • Réseau / VPN / pare-feu n'bloque pas le port 5432

→ Réessayez après correction :
    npm run db:test-connection
    npm run check:integrations
`);
  } else if (isEnoent) {
    console.error(`
→ Hôte introuvable (${host}). Lancez : npm run db:discover-pooler
`);
  } else if (isTimeout) {
    console.error(`
→ Délai dépassé. Si vous utilisez Supabase, configurez DATABASE_POOLER_URL
  (npm run db:discover-pooler).
`);
  } else {
    console.error(`
→ Vérifiez DATABASE_URL / DATABASE_POOLER_URL et relancez npm run db:test-connection
`);
  }
}
