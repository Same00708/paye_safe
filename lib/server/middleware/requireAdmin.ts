import type { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler";
import * as usersRepo from "../repositories/users";
import { isAdminPhone, resolveUserRole } from "../utils/adminAccess";

export async function assertAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.auth) {
    next(new AppError(401, "Authentification requise"));
    return;
  }

  const found = await usersRepo.findUserById(req.auth.userId);
  const isAdmin =
    (found && resolveUserRole(found.role, found.phoneNumber) === "admin") ||
    isAdminPhone(req.auth.phone);

  if (!isAdmin) {
    next(new AppError(403, "Accès réservé aux administrateurs PaySafe"));
    return;
  }

  next();
}
