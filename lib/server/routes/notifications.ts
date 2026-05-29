import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { AppError } from "../middleware/errorHandler";
import { authenticate } from "../middleware/auth";
import * as notificationsRepo from "../repositories/notifications";

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

notificationsRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const result = await notificationsRepo.findByUser(req.auth!.userId);
    res.json(result);
  }),
);

notificationsRouter.get(
  "/user/:userId",
  asyncHandler(async (req, res) => {
    const userId = Number(req.params.userId);
    if (userId !== req.auth!.userId) {
      throw new AppError(403, "Accès refusé");
    }
    const result = await notificationsRepo.findByUser(userId);
    res.json(result);
  }),
);

notificationsRouter.patch(
  "/:id/seen",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const data = await notificationsRepo.markSeen(id, req.auth!.userId);
    res.json({ data });
  }),
);

notificationsRouter.post(
  "/me/seen-all",
  asyncHandler(async (req, res) => {
    await notificationsRepo.markAllSeen(req.auth!.userId);
    res.json({ ok: true });
  }),
);
