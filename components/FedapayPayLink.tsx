'use client';

import { useState } from "react";
import { api } from "@/lib/api-client";
import "./FedapayPayLink.css";

interface FedapayPayLinkProps {
  transactionId: number;
  buyerPhone?: string;
  amountLabel?: string;
  onRedirect?: () => void;
}

/** Redirige l'acheteur vers le site FedaPay pour payer */
export function FedapayPayLink({
  transactionId,
  buyerPhone,
  amountLabel,
  onRedirect,
}: FedapayPayLinkProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function goToFedapay() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.payTransaction(transactionId, {
        mode: "moov",
        phone: buyerPhone,
      });
      onRedirect?.();
      window.location.href = res.data.paymentUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'ouvrir FedaPay");
      setLoading(false);
    }
  }

  return (
    <div className="fedapay-pay-block">
      {amountLabel && (
        <p className="fedapay-pay-amount">
          Montant à régler sur FedaPay : <strong>{amountLabel}</strong>
        </p>
      )}
      <button
        type="button"
        className="btn btn-primary fedapay-pay-btn"
        disabled={loading}
        onClick={goToFedapay}
      >
        {loading ? "Ouverture de FedaPay…" : "Payer sur le site FedaPay ↗"}
      </button>
      <p className="fedapay-pay-hint">
        Vous serez redirigé vers la page sécurisée{" "}
        <a href="https://fedapay.com" target="_blank" rel="noopener noreferrer">
          FedaPay
        </a>{" "}
        pour valider le Mobile Money (Moov / Togocel), puis renvoyé ici.
      </p>
      {error && <p className="chat-error">{error}</p>}
    </div>
  );
}
