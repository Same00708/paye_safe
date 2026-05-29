'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { useAuth } from "@/context/AuthContext";
import type { AuthUser } from "@/context/AuthContext";

const FEE_RATE_PERCENT = 5;

export default function CreateTransactionPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountNum = Number(amount) || 0;
  const fees = Math.round(amountNum * (FEE_RATE_PERCENT / 100));
  const total = amountNum + fees;

  useEffect(() => {
    if (!user) return;
    const q = search.trim();
    api
      .getUsersSearch(q)
      .then((r) => setUsers(r.data.filter((u) => u.userId !== user.userId)))
      .catch(() =>
        api.getUsers().then((r) => setUsers(r.data.filter((u) => u.userId !== user.userId))),
      );
  }, [user, search]);

  if (!user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || amountNum < 100 || !sellerId) {
      setError("Remplissez le titre, un montant ≥ 100 FCFA et choisissez un vendeur inscrit.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.createTransaction({
        title: title.trim(),
        description: description.trim() || undefined,
        amount: amountNum,
        sellerId: Number(sellerId),
      });
      router.push(`/transactions/${res.data.transactionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <h1 className="page-title">Nouvelle commande</h1>
      <p className="page-lead">
        En tant qu&apos;acheteur, commandez chez n&apos;importe quel vendeur inscrit sur PaySafe.
        Le vendeur recevra une notification et pourra suivre la commande après votre paiement.
      </p>
      <form className="card login-form" style={{ maxWidth: 520 }} onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Titre de la commande *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="iPhone 13, robe…" required />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            style={{ width: "100%" }}
            placeholder="Détails pour le vendeur"
          />
        </div>
        <div className="form-group">
          <label>Montant article (FCFA) *</label>
          <input type="number" min={100} value={amount} onChange={(e) => setAmount(e.target.value)} required />
          {amountNum > 0 && (
            <small className="fee-breakdown">
              Frais PaySafe ({FEE_RATE_PERCENT} %) : {fees.toLocaleString("fr-FR")} FCFA
              <br />
              Total à payer : <strong>{total.toLocaleString("fr-FR")} FCFA</strong>
              <br />
              <span className="fee-note">Frais prélevés uniquement si la transaction réussit sans litige.</span>
            </small>
          )}
        </div>
        <div className="form-group">
          <label>Rechercher un vendeur inscrit</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="@marie ou nom…" />
        </div>
        <div className="form-group">
          <label>Vendeur *</label>
          <select
            value={sellerId}
            onChange={(e) => setSellerId(e.target.value)}
            required
            style={{ width: "100%", padding: "0.75rem" }}
          >
            <option value="">Choisir un vendeur…</option>
            {users.map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.fullName} ({u.username})
              </option>
            ))}
          </select>
        </div>
        {error && <p className="chat-error">{error}</p>}
        <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
          {loading ? "Envoi au vendeur…" : "Créer la commande"}
        </button>
      </form>
      <p style={{ marginTop: "1rem" }}>
        <Link href="/transactions">← Retour</Link>
      </p>
    </section>
  );
}
