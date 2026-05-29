'use client';

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { useAuth } from "@/context/AuthContext";

interface NotificationItem {
  notificationId: number;
  transactionId: number | null;
  title: string;
  content: string;
  isSeen: boolean;
  type: string;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!user) return Promise.resolve();
    return api
      .getMyNotifications()
      .then((res) => {
        setItems(res.data);
        setUnread(res.unreadCount);
      })
      .catch((err: Error) => setError(err.message));
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    load().finally(() => setLoading(false));
  }, [user, load]);

  async function markSeen(n: NotificationItem) {
    if (n.isSeen) return;
    try {
      await api.markNotificationSeen(n.notificationId);
      setItems((prev) =>
        prev.map((x) =>
          x.notificationId === n.notificationId ? { ...x, isSeen: true } : x,
        ),
      );
      setUnread((c) => Math.max(0, c - 1));
    } catch {
      /* ignore */
    }
  }

  async function markAllRead() {
    try {
      await api.markAllNotificationsSeen();
      setItems((prev) => prev.map((x) => ({ ...x, isSeen: true })));
      setUnread(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  if (!user) {
    return (
      <section>
        <h1 className="page-title">Notifications</h1>
        <div className="card">
          <p>
            <Link href="/connexion">Connectez-vous</Link> pour voir vos notifications.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="page-header-row">
        <h1 className="page-title">Notifications {unread > 0 && `(${unread})`}</h1>
        {unread > 0 && (
          <button type="button" className="btn btn-outline btn-sm" onClick={markAllRead}>
            Tout marquer lu
          </button>
        )}
      </div>

      {loading && <p className="loading">Chargement…</p>}
      {error && <div className="error-msg">{error}</div>}

      {!loading && !error && (
        <div className="card">
          {items.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)" }}>
              Aucune notification. Vous serez alerté lors d&apos;une nouvelle commande, d&apos;un
              paiement ou d&apos;un message sur une transaction.
            </p>
          ) : (
            items.map((n) => (
              <article
                key={n.notificationId}
                className={`notif-item ${n.isSeen ? "" : "unread"}`}
              >
                <strong>{n.title}</strong>
                <p style={{ margin: "0.25rem 0 0", fontWeight: "normal" }}>{n.content}</p>
                {n.transactionId != null && (
                  <Link
                    href={`/transactions/${n.transactionId}`}
                    className="notif-link"
                    onClick={() => markSeen(n)}
                  >
                    Voir la transaction →
                  </Link>
                )}
                {!n.isSeen && n.transactionId == null && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm notif-mark-btn"
                    onClick={() => markSeen(n)}
                  >
                    Marquer lu
                  </button>
                )}
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}
