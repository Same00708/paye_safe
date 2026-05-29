import { readFile } from "node:fs/promises";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEMO_ACCOUNTS,
  ADMIN_LOCAL_PHONE,
  toTogoE164,
  TOGO_MOBILE_PREFIXES,
} from "../constants/togoDemoAccounts";
import { PAYSAFE_USERS_TABLE } from "./paysafeSchema";
import { pool, query } from "./pool";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaDir = path.resolve(
  __dirname,
  "../../../../01_Documentation/04_Architecture_technique/database",
);

async function seedUsers() {
  console.info("[db:seed-users] Préparation (numéros Togo +228)…");

  const paysafeSql = await readFile(path.join(schemaDir, "paysafe-users.sql"), "utf-8");
  await pool.query(paysafeSql);
  const roleSql = await readFile(path.join(schemaDir, "admin-role.sql"), "utf-8");
  await pool.query(roleSql);

  let created = 0;
  let updated = 0;

  for (const u of DEMO_ACCOUNTS) {
    const phone = toTogoE164(u.local);
    const role = "role" in u && u.role === "admin" ? "admin" : "user";

    const existing = await query<{ user_id: number }>(
      `SELECT user_id FROM ${PAYSAFE_USERS_TABLE} WHERE phone_number = $1 OR LOWER(username) = LOWER($2)`,
      [phone, u.username],
    );

    if (existing.rows[0]) {
      await query(
        `UPDATE ${PAYSAFE_USERS_TABLE}
         SET username = $2, phone_number = $3, full_name = $4, role = $5
         WHERE user_id = $1`,
        [existing.rows[0].user_id, u.username, phone, u.fullName, role],
      );
      updated++;
    } else {
      await query(
        `INSERT INTO ${PAYSAFE_USERS_TABLE} (username, phone_number, full_name, role)
         VALUES ($1, $2, $3, $4)`,
        [u.username, phone, u.fullName, role],
      );
      created++;
    }
  }

  const lines: string[] = [
    "# Comptes PaySafe — démo (Togo +228)",
    "",
    "## Convention numéros togolais",
    "",
    "- **8 chiffres** en local (sans indicatif), ex. `90123456`",
    "- **International** : `+228` + 8 chiffres, ex. `+22890123456`",
    `- **Préfixes mobile** : ${TOGO_MOBILE_PREFIXES.join(", ")}`,
    "  - `90`–`93` : Yas (ex-Togocel)",
    "  - `96`–`99` : Moov",
    "",
    "Connexion : http://localhost:5173/connexion — saisir les **8 chiffres**.",
    "",
    "## Administrateur",
    "",
    "| Nom | @username | Connexion | Réseau |",
    "|-----|-----------|-----------|--------|",
  ];

  const admin = DEMO_ACCOUNTS.find((a) => "role" in a && a.role === "admin")!;
  lines.push(
    `| ${admin.fullName} | ${admin.username} | **${admin.local}** | ${admin.network} |`,
  );

  lines.push(
    "",
    "**Admin :** http://localhost:5173/admin",
    "",
    "## 20 comptes utilisateurs",
    "",
    "| # | Nom | @username | Connexion | Réseau |",
    "|---|-----|-----------|-----------|--------|",
  );

  DEMO_ACCOUNTS.filter((a) => !("role" in a && a.role === "admin")).forEach((u, i) => {
    lines.push(`| ${i + 1} | ${u.fullName} | ${u.username} | ${u.local} | ${u.network} |`);
  });

  lines.push(
    "",
    "```powershell",
    "cd 03_Code/backend",
    "npm run db:seed:users",
    "```",
    "",
  );

  const docPath = path.resolve(__dirname, "../../../COMPTES_DEMO.md");
  writeFileSync(docPath, lines.join("\n"), "utf-8");

  console.info(`[db:seed-users] ${created} créés, ${updated} mis à jour.`);
  console.info(`[db:seed-users] Liste : ${docPath}`);
  console.info(`[db:seed-users] Admin : ${ADMIN_LOCAL_PHONE} (@admin)`);
  await pool.end();
}

seedUsers().catch((err) => {
  console.error("[db:seed-users] Erreur:", err);
  process.exit(1);
});
