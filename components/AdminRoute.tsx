'use client';

import Link from "next/link";
import { useRouter, usePathname, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="loading">Chargement…</p>;
  }

  if (!user) {
    return null; // Redirect to "/connexion" should be handled in useEffect;
  }

  if (user.role !== "admin") {
    return (
      <section>
        <h1 className="page-title">Page introuvable</h1>
        <p>Cette adresse n&apos;existe pas ou vous n&apos;y avez pas accès.</p>
        <p>
          <Link href="/transactions">Retour à l&apos;accueil</Link>
        </p>
      </section>
    );
  }

  return <>{children}</>;
}
