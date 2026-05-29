'use client';

import { useState } from "react";
import "./PaymentModal.css";

/** Opérateurs Mobile Money Togo (mappés vers moov_tg / togocel côté FedaPay) */
const MODES = [
  { id: "moov", label: "Moov Money" },
  { id: "togocel", label: "Togocel / Yas" },
  { id: "mix_yas", label: "Mix by Yas" },
];

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onPay: (mode: string, phone: string) => Promise<void>;
  defaultPhone?: string;
}

export function PaymentModal({ open, onClose, onPay, defaultPhone }: PaymentModalProps) {
  const [mode, setMode] = useState("moov");
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onPay(mode, phone);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Paiement impossible");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="modal card" onClick={(e) => e.stopPropagation()}>
        <h2>Paiement sur FedaPay</h2>
        <p className="modal-sub">
          Vous allez être redirigé vers le site sécurisé FedaPay pour payer en Mobile Money. L&apos;argent
          sera ensuite bloqué chez PaySafe jusqu&apos;à validation.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Opérateur</label>
            <div className="mode-grid">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`mode-btn ${mode === m.id ? "active" : ""}`}
                  onClick={() => setMode(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="pay-phone">Numéro Mobile Money (8 chiffres)</label>
            <input
              id="pay-phone"
              type="tel"
              inputMode="numeric"
              placeholder="90123456"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <p className="form-hint">Sans +228 — ex. 90123456 ou 93123456</p>
          </div>

          {error && <p className="chat-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Redirection…" : "Continuer sur FedaPay ↗"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
