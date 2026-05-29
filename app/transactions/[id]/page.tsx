'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api-client";
import { ChatPanel } from "@/components/ChatPanel";
import { FedapayPayLink } from "@/components/FedapayPayLink";
import { PaymentModal } from "@/components/PaymentModal";
import { UserChip } from "@/components/UserChip";
import { useAuth } from "@/context/AuthContext";
import type { Transaction } from "@/types/transaction";
import { StatusBadge } from "@/components/StatusBadge";
import { STATUS_LABELS, type TransactionStatus } from "@/types/transaction";

function formatFcfa(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
}

type Tab = "details" | "chat";

export default function TransactionDetailPage() {
  const { id } = useParams() as any;
  const { user } = useAuth();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("details");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = (usePathname() ?? "");
  const setSearchParams = (p: any) => { const sp = new URLSearchParams(searchParams?.toString() ?? ""); Object.entries(p).forEach(([k, v]) => v === undefined || v === null ? sp.delete(k) : sp.set(k, v as string)); router.push(`${pathname}?${sp.toString()}`); };
  const paymentReturn = searchParams?.get("payment");

  const numId = Number(id);

  const reload = () => {
    if (!numId) return;
    api
      .getTransaction(numId)
      .then((res) => setTransaction(res.data))
      .catch((err: Error) => setError(err.message));
  };

  useEffect(() => {
    if (paymentReturn === "return" && numId) {
      reload();
    }
  }, [paymentReturn, numId]);

  useEffect(() => {
    if (!numId) return;
    setLoading(true);
    api
      .getTransaction(numId)
      .then((res) => setTransaction(res.data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [numId]);

  async function runAction(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="loading">Chargement…</p>;
  if (error || !transaction || !transaction.buyer || !transaction.seller) {
    return (
      <div className="error-msg">
        {error ?? "Transaction introuvable"}
        <br />
        <Link href="/transactions">← Retour</Link>
      </div>
    );
  }

  const total = transaction.amount + transaction.fees;
  const isBuyer = user?.userId === transaction.buyerId;
  const isSeller = user?.userId === transaction.sellerId;
  const chatClosed = ["COMPLETED", "RETURNED_TO_SELLER"].includes(transaction.status);
  const unread = transaction.unreadMessages ?? 0;

  return (
    <section className="tx-detail">
      <Link href="/transactions" className="back-link">← Mes transactions</Link>

      <header className="tx-detail-header">
        <div>
          <h1>{transaction.title}</h1>
          <StatusBadge status={transaction.status} />
        </div>
        <p className="tx-detail-id">#{transaction.transactionId}</p>
      </header>

      {paymentReturn === "return" && (
        <div className="card" style={{ marginBottom: "1rem", background: "var(--color-primary-light)" }}>
          <strong>Paiement FedaPay</strong>
          <p style={{ margin: "0.35rem 0 0" }}>
            Merci — si le paiement est confirmé, le statut sera mis à jour automatiquement.
            Sinon attendez quelques instants ou rafraîchissez la page.
          </p>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            style={{ marginTop: "0.5rem" }}
            onClick={() => setSearchParams({})}
          >
            Fermer
          </button>
        </div>
      )}

      {transaction.status === "FUNDS_ESCROWED" && (
        <div className="escrow-banner">
          <strong>🛡 Argent bloqué chez PaySafe</strong>
          <p>{formatFcfa(transaction.amount)} séquestrés en toute sécurité.</p>
        </div>
      )}

      <div className="participants-grid">
        <UserChip
          user={transaction.buyer}
          role="Acheteur"
          highlight={isBuyer}
        />
        <UserChip
          user={transaction.seller}
          role="Vendeur"
          highlight={isSeller}
        />
      </div>

      <div className="tx-tabs">
        <button
          type="button"
          className={`tx-tab ${tab === "details" ? "active" : ""}`}
          onClick={() => setTab("details")}
        >
          Détails & actions
        </button>
        <button
          type="button"
          className={`tx-tab ${tab === "chat" ? "active" : ""}`}
          onClick={() => setTab("chat")}
        >
          💬 Chat
          {unread > 0 && <span className="tx-tab-badge">{unread}</span>}
        </button>
      </div>

      {tab === "details" && (
        <>
          <div className="card tx-summary">
            <p><strong>Montant article :</strong> {formatFcfa(transaction.amount)}</p>
            <p>
              <strong>Frais PaySafe (5 %) :</strong>{" "}
              {transaction.feesWaived ? (
                <span className="fee-waived">Annulés (litige)</span>
              ) : (
                formatFcfa(transaction.fees)
              )}
            </p>
            <p><strong>Total payé par l&apos;acheteur :</strong> {formatFcfa(total)}</p>
            <p><strong>Statut :</strong> {STATUS_LABELS[transaction.status]}</p>
            {isSeller && transaction.status === "PENDING_PAYMENT" && (
              <p className="seller-wait-hint">
                En attente du paiement de {transaction.buyer?.fullName ?? "l'acheteur"}.
                Vous serez notifié dès que les fonds seront bloqués.
              </p>
            )}
          </div>

          {transaction.status === "PENDING_PAYMENT" && isBuyer && (
            <FedapayPayLink
              transactionId={numId}
              buyerPhone={user?.phoneNumber}
              amountLabel={formatFcfa(total)}
            />
          )}

          <div className="action-bar">
            {transaction.status === "PENDING_PAYMENT" && isBuyer && (
              <>
                <button type="button" className="btn btn-outline" onClick={() => setPayOpen(true)}>
                  Choisir l&apos;opérateur (Moov / Togocel)
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={busy}
                  onClick={() => runAction(() => api.simulatePayment(numId))}
                >
                  Simuler paiement (démo)
                </button>
              </>
            )}
            {transaction.status === "FUNDS_ESCROWED" && isSeller && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => {
                  runAction(() => api.markShipped(numId, "Colis expédié."));
                  setTab("chat");
                }}
              >
                Marquer expédié
              </button>
            )}
            {transaction.status === "FUNDS_ESCROWED" && isBuyer && (
              <>
                <button type="button" className="btn btn-primary" disabled={busy} onClick={() => runAction(() => api.confirmReceived(numId))}>
                  J&apos;ai reçu l&apos;article
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={busy}
                  onClick={() => {
                    const reason = prompt("Motif du retour ?");
                    if (reason !== null) runAction(() => api.initiateReturn(numId, reason));
                  }}
                >
                  Initier un retour
                </button>
              </>
            )}
            {transaction.status === "DELIVERED_TO_BUYER" && isBuyer && (
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => runAction(() => api.releasePayment(numId))}>
                Libérer le paiement
              </button>
            )}
            {transaction.status === "RETURN_INITIATED" && isSeller && (
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => runAction(() => api.confirmReturn(numId))}>
                Retour reçu — rembourser
              </button>
            )}
            {!chatClosed && (
              <button type="button" className="btn btn-outline" onClick={() => setTab("chat")}>
                Ouvrir le chat
              </button>
            )}
          </div>
        </>
      )}

      {tab === "chat" && (
        <ChatPanel
          transactionId={transaction.transactionId}
          buyer={{
            userId: transaction.buyer.userId,
            fullName: transaction.buyer.fullName,
            username: transaction.buyer.username,
          }}
          seller={{
            userId: transaction.seller.userId,
            fullName: transaction.seller.fullName,
            username: transaction.seller.username,
          }}
          disabled={chatClosed}
        />
      )}

      <PaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        onPay={async (mode, phone) => {
          const res = await api.payTransaction(numId, { mode, phone });
          window.location.href = res.data.paymentUrl;
        }}
        defaultPhone={user?.phoneNumber}
      />
    </section>
  );
}
