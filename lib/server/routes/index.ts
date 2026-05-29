import { Router } from "express";
import { healthRouter } from "./health";
import { authRouter } from "./auth";
import { transactionsRouter } from "./transactions";
import { usersRouter } from "./users";
import { messagesRouter } from "./messages";
import { notificationsRouter } from "./notifications";
import { adminRouter } from "./admin";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/transactions", transactionsRouter);
apiRouter.use("/transactions/:transactionId/messages", messagesRouter);
apiRouter.use("/notifications", notificationsRouter);
apiRouter.use("/admin", adminRouter);
