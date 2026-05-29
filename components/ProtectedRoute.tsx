'use client';

import { usePathname, useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = (usePathname() ?? "");

  if (loading) {
    return <p className="loading">Chargement…</p>;
  }

  if (!user) {
    return null; // Redirect to "/connexion" should be handled in useEffect;
  }

  return children;
}
