import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.resolve(
  __dirname,
  "../../../../01_Documentation/04_Architecture_technique/database/migrate-auth.sql",
);

const sql = await readFile(sqlPath, "utf-8");
console.info("[db:migrate-auth] Mise à jour table otp_sessions…");
await pool.query(sql);
console.info("[db:migrate-auth] OK");
await pool.end();
