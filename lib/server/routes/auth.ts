import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { AppError } from "../middleware/errorHandler";
import { authenticate, signToken } from "../middleware/auth";
import { hasPaySafeUsersTable } from "../db/paysafeSchema";
import * as usersRepo from "../repositories/users";
import { isAdminPhone, resolveUserRole } from "../utils/adminAccess";
import { normalizePhone, normalizeUsername } from "../utils/phone";

export const authRouter = Router();

async function assertDatabaseReady() {
  const ready = await hasPaySafeUsersTable();
  if (!ready) {
    throw new AppError(
      503,
      "Table PaySafe absente. Dans le dossier backend : npm run db:migrate puis npm run db:seed",
    );
  }
}

/** Inscription directe — sans OTP */
authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    await assertDatabaseReady();

    const { phoneNumber, fullName, username } = req.body as {
      phoneNumber?: string;
      fullName?: string;
      username?: string;
    };

    if (!phoneNumber || !fullName?.trim() || !username?.trim()) {
      throw new AppError(400, "Nom, nom d'utilisateur et téléphone sont requis");
    }

    const phone = normalizePhone(phoneNumber);
    const uname = normalizeUsername(username);

    if (await usersRepo.findUserByPhone(phone)) {
      throw new AppError(409, "Ce numéro est déjà inscrit. Utilisez Connexion.");
    }
    if (await usersRepo.findUserByUsername(uname)) {
      throw new AppError(409, "Ce nom d'utilisateur est déjà pris");
    }

    const created = await usersRepo.createUser({
      username: uname,
      phoneNumber: phone,
      fullName: fullName.trim(),
    });

    const user = { ...created, role: resolveUserRole(created.role, created.phoneNumber) };
    const token = signToken({ userId: user.userId, phone: user.phoneNumber });
    res.status(201).json({ token, user, message: "Compte créé avec succès" });
  }),
);

/** Connexion — numéro de téléphone */
authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    await assertDatabaseReady();

    const { phoneNumber } = req.body as { phoneNumber?: string };
    if (!phoneNumber) throw new AppError(400, "Numéro de téléphone requis");

    const phone = normalizePhone(phoneNumber);
    let found = await usersRepo.findUserByPhone(phone);
    if (!found && isAdminPhone(phone)) {
      found = await usersRepo.createUser({
        username: "@admin",
        phoneNumber: phone,
        fullName: "PaySafe Administrateur",
        role: "admin",
      });
    }
    if (!found) {
      throw new AppError(404, "Aucun compte avec ce numéro. Créez un compte d'abord.");
    }

    const role = resolveUserRole(found.role, found.phoneNumber);
    if (role === "admin" && found.role !== "admin") {
      const updated = await usersRepo.setUserRole(found.userId, "admin");
      found = updated ?? { ...found, role: "admin" };
    }

    const user = { ...found, role: resolveUserRole(found.role, found.phoneNumber) };
    res.json({ token: signToken({ userId: user.userId, phone: user.phoneNumber }), user });
  }),
);

authRouter.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const found = await usersRepo.findUserById(req.auth!.userId);
    if (!found) throw new AppError(404, "Utilisateur introuvable");
    const user = { ...found, role: resolveUserRole(found.role, found.phoneNumber) };
    res.json({ data: user });
  }),
);
