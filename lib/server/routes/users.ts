import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { AppError } from "../middleware/errorHandler";
import { authenticate } from "../middleware/auth";
import * as usersRepo from "../repositories/users";

export const usersRouter = Router();

usersRouter.get(
  "/search",
  authenticate,
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? "").trim().toLowerCase();
    const all = await usersRepo.findAllUsers();
    const data = q
      ? all.filter(
          (u) =>
            u.userId !== req.auth!.userId &&
            (u.username.toLowerCase().includes(q) ||
              u.fullName.toLowerCase().includes(q) ||
              u.phoneNumber.includes(q)),
        )
      : all.filter((u) => u.userId !== req.auth!.userId);
    res.json({ data: data.slice(0, 20) });
  }),
);

usersRouter.get(
  "/",
  authenticate,
  asyncHandler(async (_req, res) => {
    const data = await usersRepo.findAllUsers();
    res.json({ data });
  }),
);

usersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const user = await usersRepo.findUserById(id);
    if (!user) {
      throw new AppError(404, "Utilisateur introuvable");
    }
    res.json({ data: user });
  }),
);
