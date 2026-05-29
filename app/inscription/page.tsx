'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const { login, user } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) router.replace("/transactions");
  }, [user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.register({ phoneNumber: phone, fullName, username });
      login(res.token, res.user);
      router.push("/transactions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <h1 className="page-title">Créer un compte</h1>
      <div className="card login-form">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="fullName">Nom complet *</label>
            <input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="username">Nom d&apos;utilisateur *</label>
            <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="votre_pseudo" required />
          </div>
          <div className="form-group">
            <label htmlFor="phone">Numéro Mobile Money *</label>
            <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="90XXXXXX" required />
            <p className="form-hint">8 chiffres Togo (90–93 ou 96–99), sans +228</p>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
            {loading ? "Création…" : "Créer mon compte"}
          </button>
        </form>
        {error && <p className="chat-error" style={{ marginTop: "1rem" }}>{error}</p>}
      </div>
      <p style={{ textAlign: "center", marginTop: "1rem" }}>
        Déjà inscrit ? <Link href="/connexion">Se connecter</Link>
      </p>
    </section>
  );
}
