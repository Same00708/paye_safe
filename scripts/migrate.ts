import { loadPaySafeEnv } from "../lib/server/config/loadEnv";

loadPaySafeEnv();

import { runMigrations } from "../lib/server/db/migrateCore";

runMigrations({ closePool: true }).catch((err) => {
  console.error(err);
  process.exit(1);
});
