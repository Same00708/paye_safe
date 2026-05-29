import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env";
import { apiRouter } from "./routes/index";
import { fedapayWebhookRouter } from "./routes/webhooks/fedapay";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: env.nodeEnv === "production" ? undefined : false,
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

  if (env.nodeEnv === "production") {
    const webDist = path.resolve(__dirname, "../../web/dist");
    app.use(express.static(webDist));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(webDist, "index.html"), (err) => {
        if (err) next();
      });
    });
  } else {
    app.get("/", (_req, res) => {
      res.json({
        name: "PaySafe API",
        docs: "/api/health",
        web: env.appBaseUrl,
      });
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
