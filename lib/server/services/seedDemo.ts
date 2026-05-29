import { DEMO_ACCOUNTS, toTogoE164 } from "../constants/togoDemoAccounts";
import * as usersRepo from "../repositories/users";

/** Crée les comptes démo si la base est vide (déploiement / démo prof) */
export async function seedDemoAccountsIfNeeded(): Promise<number> {
  const { total } = await usersRepo.countUsers();
  if (total >= 3) {
    return 0;
  }

  let added = 0;
  for (const u of DEMO_ACCOUNTS) {
    const phone = toTogoE164(u.local);
    const role = "role" in u && u.role === "admin" ? "admin" : "user";
    const existing = await usersRepo.findUserByPhone(phone);
    if (!existing) {
      await usersRepo.createUser({
        username: u.username,
        phoneNumber: phone,
        fullName: u.fullName,
        role,
      });
      added++;
    }
  }

  if (added > 0) {
    console.info(`[PaySafe] Comptes démo créés : ${added}`);
  }
  return added;
}
