import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PAYSAFE_USERS_TABLE } from "./paysafeSchema";
import { pool, query } from "./pool";
import { ensureDemoUsers } from "../repositories/users";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaDir = path.resolve(
  __dirname,
  "../../../../01_Documentation/04_Architecture_technique/database",
);

async function safeDelete(table: string) {
  const { rows } = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS exists`,
    [table],
  );
  if (!rows[0]?.exists) return;
  await query(`DELETE FROM ${table}`);
}

async function seed() {
  console.info("[db:seed] Préparation comptes démo PaySafe…");

  const paysafeSql = await readFile(path.join(schemaDir, "paysafe-users.sql"), "utf-8");
  await pool.query(paysafeSql);

  for (const table of ["messages", "notifications", "transactions"]) {
    await safeDelete(table);
  }
  await query(`DELETE FROM ${PAYSAFE_USERS_TABLE}`);

  await query(
    `INSERT INTO ${PAYSAFE_USERS_TABLE} (username, phone_number, full_name)
     VALUES
       ('@marie', '+22890123456', 'Marie K.'),
       ('@junior', '+22890765432', 'Junior A.')`,
  );

  const { rows: txCheck } = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_name = 'transactions' AND column_name = 'buyer_id'
     ) AS exists`,
  );

  if (txCheck[0]?.exists) {
    const sellerId = 1;
    const buyerId = 2;

    await query(
      `INSERT INTO transactions (buyer_id, seller_id, title, description, amount, fees, status)
       VALUES
         ($1, $2, 'iPhone 13', 'Smartphone en excellent état', 150000, 1500, 'PENDING_PAYMENT'),
         ($1, $2, 'MacBook Pro', 'Ordinateur portable 2022', 320000, 3200, 'FUNDS_ESCROWED')`,
      [buyerId, sellerId],
    );

    await query(
      `INSERT INTO messages (transaction_id, sender_id, message_text)
       VALUES (2, $1, 'Bonjour, voici la photo du colis. Je l''ai expédié ce matin.')`,
      [sellerId],
    );

    await query(
      `INSERT INTO notifications (user_id, transaction_id, type, title, content)
       VALUES
         ($1, 1, 'STATUS_CHANGED', 'Nouvelle transaction', 'Marie vous demande 151 500 FCFA pour iPhone 13'),
         ($1, 2, 'NEW_MESSAGE', 'Nouveau message', 'Marie : Voici la photo du colis…'),
         ($1, 2, 'PAYMENT_RECEIVED', 'Paiement reçu', '151 500 FCFA bloqués pour MacBook Pro')`,
      [buyerId],
    );
  }

  console.info("[db:seed] Comptes démo :");
  console.info("  Marie — 90123456");
  console.info("  Junior — 90765432");
  console.info("[db:seed] Terminé.");
  await pool.end();
}

seed().catch(async (err) => {
  console.error("[db:seed] Erreur:", err.message ?? err);
  try {
    const paysafeSql = await readFile(path.join(schemaDir, "paysafe-users.sql"), "utf-8");
    await pool.query(paysafeSql);
    await ensureDemoUsers();
    console.info("[db:seed] Comptes démo créés (mode secours).");
  } catch (e2) {
    console.error("[db:seed] Échec:", e2);
    process.exit(1);
  } finally {
    await pool.end();
  }
});
