"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useNotificationBadge } from "@/hooks/useNotificationBadge";
import "@/components/Layout.css";

function navClass(pathname: string, href: string, base = "") {
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));
  return `${base} ${active ? "active" : ""}`.trim();
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname() ?? "";
  const unreadNotifs = useNotificationBadge(Boolean(user));

  return (
    <div className="layout">
      <header className="header">
        <Link href="/" className="logo">
          <span className="logo-icon">🛡</span>
          PaySafe
        </Link>
        <nav className="nav">
          {user ? (
            <>
              <Link href="/transactions" className={navClass(pathname, "/transactions")}>
                Transactions
              </Link>
              <Link
                href="/transactions/nouvelle"
                className={navClass(pathname, "/transactions/nouvelle")}
              >
                + Créer
              </Link>
              <Link href="/notifications" className={navClass(pathname, "/notifications")}>
                Notifications
                {unreadNotifs > 0 && (
                  <span className="nav-badge" aria-label={`${unreadNotifs} non lues`}>
                    {unreadNotifs > 99 ? "99+" : unreadNotifs}
                  </span>
                )}
              </Link>
              {user.role === "admin" && (
                <Link href="/admin" className={navClass(pathname, "/admin")}>
                  Tableau de bord
                </Link>
              )}
              <div className="nav-profile">
                <span className="nav-avatar">{user.fullName.slice(0, 1)}</span>
                <span className="nav-user">{user.username}</span>
              </div>
              <button type="button" className="nav-logout" onClick={logout}>
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link href="/connexion">Connexion</Link>
              <Link href="/inscription" className="nav-cta">
                Créer un compte
              </Link>
            </>
          )}
        </nav>
      </header>
      <main className="main">{children}</main>
      <footer className="footer">
        <p>PaySafe — Compte requis · Chat sécurisé · FedaPay</p>
      </footer>
    </div>
  );
}
