/** Migrations au démarrage Docker / production (ne ferme pas le pool) */
import { runMigrations } from "./migrateCore";

runMigrations({ closePool: false }).catch((err) => {
  console.error("[db:migrate] Erreur au démarrage:", err);
  process.exit(1);
});
