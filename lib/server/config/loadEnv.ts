import dotenv from "dotenv";
import fs from "fs";
import path from "path";

/** Chemins possibles selon le cwd (paysafe, racine repo, scripts). */
function envCandidates(): string[] {
  const cwd = process.cwd();
  const here = path.resolve(__dirname, "../../..");

  const roots = [...new Set([cwd, here, path.resolve(cwd, ".."), path.resolve(here, "..")])];

  const files: string[] = [];
  for (const root of roots) {
    files.push(
      path.join(root, ".env.local"),
      path.join(root, ".env"),
      path.join(root, "backend", ".env"),
      path.join(root, "..", "backend", ".env"),
      path.join(root, "03_Code", "backend", ".env"),
      path.join(root, "03_Code", "paysafe", ".env.local"),
    );
  }

  return [...new Set(files)].filter((f) => fs.existsSync(f));
}

/**
 * Charge la config BDD (priorité croissante) :
 * backend/.env (ancienne base) → paysafe/.env → paysafe/.env.local
 */
export function loadPaySafeEnv(): void {
  const files = envCandidates();
  if (files.length === 0) {
    dotenv.config();
    return;
  }

  for (const file of files) {
    dotenv.config({ path: file, override: true });
  }

  if (process.env.NODE_ENV !== "production" && process.env.PAYSAFE_LOG_ENV === "true") {
    const src = files[files.length - 1];
    console.info(`[PaySafe] Variables chargées depuis ${src}`);
  }
}
