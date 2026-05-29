import type { NextFunction, Request, Response } from "express";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

function pgErrorMessage(err: { code?: string; message?: string }): string | null {
  switch (err.code) {
    case "42P01":
      return "Base de données non initialisée. Dans le dossier backend : npm run db:migrate";
    case "42703":
      return "Schéma base de données incomplet. Lancez : npm run db:migrate";
    case "23505":
      return "Ce numéro ou ce nom d'utilisateur est déjà utilisé.";
    case "23503":
      return "Référence invalide (utilisateur ou transaction introuvable).";
    case "ENOTFOUND":
    case "ECONNREFUSED":
    case "ETIMEDOUT":
      return "Impossible de joindre la base de données. Vérifiez DATABASE_URL et votre connexion internet.";
    default:
      return null;
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  const pgErr = err as { code?: string; message?: string };
  const pgMsg = pgErrorMessage(pgErr);
  if (pgMsg) {
    const status = pgErr.code === "23505" ? 409 : pgErr.code === "42P01" || pgErr.code === "42703" ? 503 : 503;
    res.status(status).json({ error: pgMsg });
    return;
  }

  if (pgErr.message?.includes("SSL") || pgErr.message?.includes("ssl")) {
    res.status(503).json({
      error:
        "Connexion SSL à la base requise. Ajoutez ?sslmode=require à DATABASE_URL ou mettez à jour le backend.",
    });
    return;
  }

  console.error("[PaySafe] Erreur:", err);
  res.status(500).json({ error: "Erreur interne du serveur" });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: "Route introuvable" });
}
