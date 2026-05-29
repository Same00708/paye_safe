/**
 * Résout l'URL PostgreSQL : pooler IPv4 (recommandé) ou directe.
 * db.PROJECT.supabase.co est souvent IPv6-only → ENOTFOUND sur Windows sans IPv6.
 */
export function resolveDatabaseUrl(): string {
  const pooler = process.env.DATABASE_POOLER_URL?.trim();
  if (pooler) return pooler;

  const direct = process.env.DATABASE_URL?.trim();
  if (!direct) {
    return "postgresql://paysafe:paysafe_dev@localhost:5432/paysafe";
  }

  return direct;
}

export function extractSupabaseProjectRef(connectionString: string): string | null {
  try {
    const host = new URL(connectionString).hostname;
    const m = host.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

export function extractPostgresPassword(connectionString: string): string | null {
  try {
    const u = new URL(connectionString);
    return u.password ? decodeURIComponent(u.password) : null;
  } catch {
    return null;
  }
}

/** Chaîne Session pooler Supavisor (IPv4) — région depuis le dashboard */
export function buildSessionPoolerUrl(
  projectRef: string,
  password: string,
  region: string,
  cluster: "0" | "1" = "1",
): string {
  const user = `postgres.${projectRef}`;
  const host = `aws-${cluster}-${region}.pooler.supabase.com`;
  const encoded = encodeURIComponent(password);
  return `postgresql://${user}:${encoded}@${host}:5432/postgres?uselibpqcompat=true&sslmode=require`;
}

/** Régions courantes Supabase (essai auto si direct ENOTFOUND) */
export const SUPABASE_POOLER_REGIONS = [
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "eu-central-1",
  "eu-central-2",
  "eu-north-1",
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "ca-central-1",
  "ap-southeast-1",
  "ap-south-1",
  "ap-northeast-1",
  "sa-east-1",
  "af-south-1",
] as const;
