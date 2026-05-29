import { env } from "../config/env";
import { normalizePhone } from "./phone";
import type { UserRole } from "../repositories/users";

export function isAdminPhone(phone: string): boolean {
  if (!env.adminPhones.length) return false;
  try {
    const normalized = normalizePhone(phone);
    return env.adminPhones.some((p) => {
      try {
        return normalizePhone(p) === normalized;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

export function resolveUserRole(
  dbRole: UserRole,
  phone: string,
): UserRole {
  if (dbRole === "admin" || isAdminPhone(phone)) return "admin";
  return "user";
}
