import { Router } from "express";
import { env } from "../config/env";
import { checkDbConnection, getLastConnectionError, hasUsersTable, query } from "../db/pool";
import { fedapayService } from "../services/fedapay";
import { smsService } from "../services/sms";

export const healthRouter = Router();

async function hasNotificationsTable(): Promise<boolean> {
  const { rows } = await query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'notifications'
     ) AS exists`,
  );
  return Boolean(rows[0]?.exists);
}

healthRouter.get("/", async (_req, res) => {
  const db = await checkDbConnection();
  const usersTable = db ? await hasUsersTable() : false;
  const notificationsTable = db ? await hasNotificationsTable() : false;

  res.json({
    service: "PaySafe API",
    version: "1.0.0",
    status: db && usersTable ? "ok" : "degraded",
    environment: env.nodeEnv,
    database: db ? "connected" : "disconnected",
    databaseError:
      !db && env.nodeEnv !== "production" ? getLastConnectionError() : undefined,
    usersTable: usersTable ? "ready (paysafe_users)" : "missing — npm run db:migrate && npm run db:seed",
    notificationsTable: notificationsTable ? "ready" : "missing — npm run db:migrate",
    fedapay: fedapayService.isConfigured() ? "configured" : "stub (clés placeholder)",
    sms: {
      provider: env.sms.provider,
      configured: smsService.isConfigured(),
    },
    timestamp: new Date().toISOString(),
  });
});

/** Diagnostic avant déploiement : BDD notifications + ping FedaPay */
healthRouter.get("/integrations", async (_req, res) => {
  const db = await checkDbConnection();
  const notificationsTable = db ? await hasNotificationsTable() : false;
  const fedapay = await fedapayService.testConnection();

  let notificationsProbe: { ok: boolean; message: string } = {
    ok: false,
    message: "Base déconnectée",
  };

  if (db && notificationsTable) {
    try {
      const { rows } = await query<{ c: string }>("SELECT COUNT(*)::text AS c FROM notifications");
      notificationsProbe = {
        ok: true,
        message: `Table notifications OK (${rows[0]?.c ?? 0} entrées)`,
      };
    } catch (err) {
      notificationsProbe = {
        ok: false,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  } else if (db) {
    notificationsProbe = {
      ok: false,
      message: "Table notifications absente — npm run db:migrate",
    };
  }

  const ready =
    db &&
    notificationsTable &&
    notificationsProbe.ok &&
    (fedapay.ok || !fedapayService.isConfigured());

  res.json({
    readyForDeploy: ready,
    database: db,
    notifications: notificationsProbe,
    fedapay,
    hint: !fedapayService.isConfigured()
      ? "Ajoutez FEDAPAY_SECRET_KEY réelle (sandbox) dans .env pour activer les paiements réels"
      : !fedapay.ok
        ? "Vérifiez FEDAPAY_SECRET_KEY et FEDAPAY_ENVIRONMENT"
        : undefined,
    timestamp: new Date().toISOString(),
  });
});
