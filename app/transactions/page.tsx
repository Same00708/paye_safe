'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { useAuth } from "@/context/AuthContext";
import type { Transaction } from "@/types/transaction";
import { TransactionCard } from "@/components/TransactionCard";

export default function TransactionsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getTransactions()
      .then((res) => setTransactions(res.data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mes transactions</h1>
          {user && (
            <p className="page-subtitle">
              Bonjour {user.fullName} — achetez et vendez en confiance.
            </p>
          )}
        </div>
        <Link href="/transactions/nouvelle" className="btn btn-primary">
          + Nouvelle transaction
        </Link>
      </div>

      {loading && <p className="loading">Chargement…</p>}
      {error && <div className="error-msg">{error}</div>}

      {!loading && !error && transactions.length === 0 && (
        <div className="empty-state card">
          <p>Aucune transaction pour le moment.</p>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
            Créez une vente ou un achat, puis discutez avec votre partenaire dans le chat intégré.
          </p>
          <Link href="/transactions/nouvelle" className="btn btn-primary">
            Créer ma première transaction
          </Link>
        </div>
      )}

      {!loading && !error && transactions.length > 0 && (
        <div className="tx-list">
          {transactions.map((t) => (
            <TransactionCard key={t.transactionId} transaction={t} />
          ))}
        </div>
      )}
    </section>
  );
}
