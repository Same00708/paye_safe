'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { useAuth } from "@/context/AuthContext";
import { getPostLoginPath } from "@/utils/postLoginPath";

export default function LoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();
  const location = (usePathname() ?? "");
  const from = undefined;

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      router.replace(getPostLoginPath(user, from));
    }
  }, [user, router, from]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(phone);
      login(res.token, res.user);
      router.replace(getPostLoginPath(res.user, from));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <h1 className="page-title">Connexion</h1>
      <div className="card login-form">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="phone">Numéro de téléphone</label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="90123456"
              required
            />
            <p className="form-hint">
              Mobile Togo : 8 chiffres (90–93 Yas, 96–99 Moov), ex. 90123456
            </p>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
        {error && <p className="chat-error" style={{ marginTop: "1rem" }}>{error}</p>}
      </div>
      <p style={{ textAlign: "center", marginTop: "1rem" }}>
        Pas de compte ? <Link href="/inscription">Créer un compte</Link>
      </p>

      <div className="card demo-prof-box" style={{ marginTop: "1.5rem" }}>
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>Comptes de démonstration</h3>
        <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--color-text-muted)" }}>
          Connexion : entrez le numéro (8 chiffres, sans +228)
        </p>
        <ul className="demo-prof-list">
          <li>
            <strong>Marie</strong> (acheteuse) — <code>90123456</code>
          </li>
          <li>
            <strong>Junior</strong> (vendeur) — <code>90765432</code>
          </li>
          <li>
            <strong>Admin</strong> — <code>93224301</code>
          </li>
        </ul>
        <p style={{ margin: "0.75rem 0 0", fontSize: "0.85rem" }}>
          Créez une commande avec Marie, connectez-vous en Junior pour la voir. Paiement : mode
          simulation disponible.
        </p>
      </div>
    </section>
  );
}
