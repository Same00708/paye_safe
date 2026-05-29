import { pool } from "./pool";

export const PAYSAFE_USERS_TABLE = "paysafe_users";

let cachedReady: boolean | null = null;

/** Vérifie que la table PaySafe (paysafe_users) existe avec les bonnes colonnes */
export async function hasPaySafeUsersTable(): Promise<boolean> {
  if (cachedReady === true) return true;

  const { rows } = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = $1
         AND column_name = 'phone_number'
     ) AS exists`,
    [PAYSAFE_USERS_TABLE],
  );

  cachedReady = Boolean(rows[0]?.exists);
  return cachedReady;
}

export function resetPaySafeSchemaCache() {
  cachedReady = null;
}
