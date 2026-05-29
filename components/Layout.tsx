'use client';

import Link from "next/link";
import { usePathname, useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useNotificationBadge } from "@/hooks/useNotificationBadge";
import "./Layout.css";
import "../styles/components.css";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
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
              <Link href="/transactions" className="nav-link">
                Transactions
              </Link>
              <Link href="/transactions/nouvelle" className="nav-link">
                + Créer
              </Link>
              <Link href="/notifications" className="nav-link">
                Notifications
                {unreadNotifs > 0 && (
                  <span className="nav-badge" aria-label={`${unreadNotifs} non lues`}>
                    {unreadNotifs > 99 ? "99+" : unreadNotifs}
                  </span>
                )}
              </Link>
              {user.role === "admin" && (
                <Link href="/admin" className="nav-link">
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
      <main className="main">
        {children}
      </main>
      <footer className="footer">
        <p>PaySafe — Compte requis · Chat sécurisé · FedaPay</p>
      </footer>
    </div>
  );
}
