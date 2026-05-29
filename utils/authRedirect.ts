import type { AuthUser } from "@/context/AuthContext";

/** Où envoyer l'utilisateur après connexion */
export function getPostLoginPath(user: AuthUser, from?: string): string {
  const returnTo =
    from && from !== "/connexion" && from !== "/" ? from : undefined;

  if (user.role === "admin") {
    if (!returnTo || returnTo === "/transactions") {
      return "/admin";
    }
    return returnTo;
  }

  if (returnTo === "/admin") {
    return "/transactions";
  }

  return returnTo ?? "/transactions";
}
