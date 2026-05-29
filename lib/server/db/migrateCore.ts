import { readFile } from "node:fs/promises";
import path from "node:path";
import { hasPaySafeUsersTable, resetPaySafeSchemaCache } from "./paysafeSchema";
import { pool } from "./pool";
import { resolveSchemaDir } from "./schemaDir";

let schemaDir: string | null = null;

function getSchemaDir(): string {
  if (!schemaDir) schemaDir = resolveSchemaDir();
  return schemaDir;
}

async function runSqlFile(file: string) {
  const sqlPath = path.join(getSchemaDir(), file);
  const sql = await readFile(sqlPath, "utf-8");
  console.info(`[db:migrate] Exécution ${file}…`);
  await pool.query(sql);
}

export async function runMigrations(options?: { closePool?: boolean }) {
  console.info("[db:migrate] Connexion…");
  console.info("[db:migrate] Schéma :", getSchemaDir());
  await pool.query("SELECT 1");
  console.info("[db:migrate] Connexion OK");

  await runSqlFile("paysafe-users.sql");
  resetPaySafeSchemaCache();

  let paysafeReady = await hasPaySafeUsersTable();

  if (!paysafeReady) {
    await runSqlFile("bootstrap-minimal.sql");
    resetPaySafeSchemaCache();
    paysafeReady = await hasPaySafeUsersTable();
  }

  const { rows: txRows } = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'transactions'
         AND EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_name = 'transactions' AND column_name = 'buyer_id'
         )
     ) AS exists`,
  );
  const hasPaySafeTransactions = Boolean(txRows[0]?.exists);

  if (!hasPaySafeTransactions) {
    try {
      await runSqlFile("schema.sql");
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code !== "42710" && code !== "42P07") {
        console.warn("[db:migrate] schema.sql partiel:", (err as Error).message);
      }
    }
  } else {
    console.info("[db:migrate] Schéma transactions PaySafe déjà présent");
  }

  try {
    await runSqlFile("notifications-bootstrap.sql");
  } catch (err) {
    console.warn("[db:migrate] notifications-bootstrap:", (err as Error).message);
  }

  try {
    await runSqlFile("notifications-fk-paysafe.sql");
  } catch (err) {
    console.warn("[db:migrate] notifications-fk-paysafe:", (err as Error).message);
  }

  try {
    await runSqlFile("messages-fk-paysafe.sql");
  } catch (err) {
    console.warn("[db:migrate] messages-fk-paysafe:", (err as Error).message);
  }

  for (const file of [
    "schema-extensions.sql",
    "migrate-auth.sql",
    "fees-waived.sql",
    "admin-role.sql",
  ]) {
    try {
      await runSqlFile(file);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "42710" || code === "42P07") {
        console.info(`[db:migrate] ${file} — déjà appliqué`);
        continue;
      }
      console.warn(`[db:migrate] ${file} ignoré:`, (err as Error).message);
    }
  }

  resetPaySafeSchemaCache();
  if (!(await hasPaySafeUsersTable())) {
    throw new Error("Table paysafe_users absente après migration.");
  }

  console.info("[db:migrate] Terminé — paysafe_users prête.");

  if (options?.closePool !== false) {
    await pool.end();
  }
}
