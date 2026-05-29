import pg from "pg";
import { env } from "../config/env";

const { Pool } = pg;

function isCloudDatabase(url: string): boolean {
  return (
    url.includes("supabase.co") ||
    url.includes("supabase.com") ||
    url.includes("pooler.supabase.com") ||
    url.includes("render.com") ||
    url.includes("neon.tech")
  );
}

/** Ajoute uselibpqcompat pour éviter verify-full (souvent bloqué sur Windows + Supabase) */
function normalizeConnectionString(url: string): string {
  if (!isCloudDatabase(url)) return url;

  let out = url;
  if (!/uselibpqcompat=/i.test(out)) {
    out += out.includes("?") ? "&uselibpqcompat=true" : "?uselibpqcompat=true";
  }
  if (!/sslmode=/i.test(out)) {
    out += out.includes("?") ? "&sslmode=require" : "?sslmode=require";
  }
  return out;
}

function buildPoolConfig(): pg.PoolConfig {
  const connectionString = normalizeConnectionString(env.databaseUrl);
  const cloud = isCloudDatabase(env.databaseUrl);

  const config: pg.PoolConfig = {
    connectionString,
    max: 10,
    // Supabase / réseaux lents : 45s pour éviter faux négatifs sur les scripts CLI
    connectionTimeoutMillis: cloud ? 45_000 : 15_000,
    idleTimeoutMillis: 30_000,
  };

  // Toujours pour Supabase : même si sslmode est dans l'URL (sinon verify-full → échec)
  if (cloud) {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
}

export const pool = new Pool(buildPoolConfig());

export async function query<T extends pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}

let lastConnectionError: string | null = null;

export function getLastConnectionError(): string | null {
  return lastConnectionError;
}

export async function checkDbConnection(): Promise<boolean> {
  try {
    await pool.query("SELECT 1");
    lastConnectionError = null;
    return true;
  } catch (err) {
    lastConnectionError = err instanceof Error ? err.message : String(err);
    return false;
  }
}

export async function hasUsersTable(): Promise<boolean> {
  const { hasPaySafeUsersTable } = await import("./paysafeSchema");
  return hasPaySafeUsersTable();
}
