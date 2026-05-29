import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Répertoire des fichiers SQL (dev, Docker, variable d'environnement) */
export function resolveSchemaDir(): string {
  const candidates = [
    path.join(process.cwd(), "database"),
    process.env.DATABASE_SCHEMA_DIR?.trim(),
    path.resolve(__dirname, "../../../database"),
    path.resolve(
      __dirname,
      "../../../../01_Documentation/04_Architecture_technique/database",
    ),
    "/app/database",
  ].filter((x): x is string => Boolean(x));

  for (const dir of candidates) {
    if (existsSync(path.join(dir, "paysafe-users.sql"))) {
      return dir;
    }
  }

  throw new Error(
    `Schéma SQL introuvable. Définissez DATABASE_SCHEMA_DIR ou copiez les .sql dans 03_Code/database. Testé : ${candidates.join(" | ")}`,
  );
}
