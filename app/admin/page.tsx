'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { StatusBadge } from "@/components/StatusBadge";
import type { TransactionStatus } from "@/types/transaction";

type Stats = {
  users: number;
  admins: number;
  transactions: number;
  byStatus: Record<string, number>;
  volumeCompleted: number;
  feesCollected: number;
  feeRatePercent: number;
};

type AdminUser = {
  userId: number;
  username: string;
  fullName: string;
  phoneNumber: string;
  role: string;
  createdAt: string;
};

type AdminTx = {
  transactionId: number;
  title: string;
  amount: number;
  fees: number;
  feesWaived?: boolean;
  status: TransactionStatus;
    buyer?: { fullName: string; username: string };
  seller?: { fullName: string; username: string };
};

function formatFcfa(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
}

type Tab = "stats" | "users" | "transactions";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("stats");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [transactions, setTransactions] = useState<AdminTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const load =
      tab === "stats"
        ? api.adminStats().then((r) => setStats(r.data))
        : tab === "users"
          ? api.adminUsers().then((r) => setUsers(r.data))
          : api.adminTransactions().then((r) => setTransactions(r.data));

    load.catch((err: Error) => setError(err.message)).finally(() => setLoading(false));
  }, [tab]);

  return (
    <section className="admin-page">
      <header className="admin-header">
        <div>
          <h1 className="page-title">Administration PaySafe</h1>
          <p className="page-lead">Vue globale utilisateurs, transactions et commissions.</p>
        </div>
        <Link href="/transactions" className="btn btn-outline">
          ← Espace utilisateur
        </Link>
      </header>

      <div className="admin-tabs">
        {(["stats", "users", "transactions"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`admin-tab ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "stats" ? "Tableau de bord" : t === "users" ? "Utilisateurs" : "Transactions"}
          </button>
        ))}
      </div>

      {loading && <p className="loading">Chargement…</p>}
      {error && <p className="chat-error">{error}</p>}

      {!loading && !error && tab === "stats" && stats && (
        <div className="admin-stats-grid">
          <div className="card admin-stat">
            <span className="admin-stat-label">Utilisateurs</span>
            <strong className="admin-stat-value">{stats.users}</strong>
          </div>
          <div className="card admin-stat">
            <span className="admin-stat-label">Transactions</span>
            <strong className="admin-stat-value">{stats.transactions}</strong>
          </div>
          <div className="card admin-stat">
            <span className="admin-stat-label">Volume terminé</span>
            <strong className="admin-stat-value">{formatFcfa(stats.volumeCompleted)}</strong>
          </div>
          <div className="card admin-stat">
            <span className="admin-stat-label">Commissions ({stats.feeRatePercent} %)</span>
            <strong className="admin-stat-value">{formatFcfa(stats.feesCollected)}</strong>
          </div>
          <div className="card admin-stat-wide">
            <h3>Par statut</h3>
            <ul className="admin-status-list">
              {Object.entries(stats.byStatus).map(([status, count]) => (
                <li key={status}>
                  <StatusBadge status={status as TransactionStatus} /> — {count}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {!loading && !error && tab === "users" && (
        <div className="card admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nom</th>
                <th>@username</th>
                <th>Téléphone</th>
                <th>Rôle</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.userId}>
                  <td>{u.userId}</td>
                  <td>{u.fullName}</td>
                  <td>{u.username}</td>
                  <td>{u.phoneNumber}</td>
                  <td>{u.role === "admin" ? "Admin" : "Utilisateur"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && tab === "transactions" && (
        <div className="card admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Titre</th>
                <th>Acheteur</th>
                <th>Vendeur</th>
                <th>Montant</th>
                <th>Frais</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.transactionId}>
                  <td>
                    <Link href={`/transactions/${tx.transactionId}`}>{tx.transactionId}</Link>
                  </td>
                  <td>{tx.title}</td>
                  <td>{tx.buyer?.fullName ?? tx.buyer?.username ?? "—"}</td>
                  <td>{tx.seller?.fullName ?? tx.seller?.username ?? "—"}</td>
                  <td>{formatFcfa(tx.amount)}</td>
                  <td>
                    {tx.feesWaived ? (
                      <span className="fee-waived">0 (litige)</span>
                    ) : (
                      formatFcfa(tx.fees)
                    )}
                  </td>
                  <td>
                    <StatusBadge status={tx.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
