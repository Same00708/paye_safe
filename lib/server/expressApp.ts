import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env, assertProductionSecrets } from "./config/env";
import { apiRouter } from "./routes/index";
import { fedapayWebhookRouter } from "./routes/webhooks/fedapay";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

assertProductionSecrets();

/** API Express (sans static — Next.js sert le frontend) */
export function createApiApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: env.nodeEnv === "production",
    }),
  );

  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    }),
  );

  app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));
  app.use("/api/webhooks/fedapay", fedapayWebhookRouter);
  app.use(express.json());
  app.use("/api", apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
