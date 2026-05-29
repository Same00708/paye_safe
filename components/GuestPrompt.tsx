'use client';

import Link from "next/link";
import "./GuestPrompt.css";

interface GuestPromptProps {
  title?: string;
  description?: string;
}

export function GuestPrompt({
  title = "Compte requis",
  description = "Créez un compte PaySafe pour accéder aux transactions, au chat sécurisé et aux paiements Mobile Money.",
}: GuestPromptProps) {
  return (
    <div className="guest-prompt card">
      <div className="guest-prompt-icon">🔐</div>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="guest-prompt-steps">
        <span>1. Inscription</span>
        <span>→</span>
        <span>2. Transaction</span>
        <span>→</span>
        <span>3. Chat & Paiement</span>
      </div>
      <div className="guest-prompt-actions">
        <Link href="/inscription" className="btn btn-primary">
          Créer mon compte
        </Link>
        <Link href="/connexion" className="btn btn-outline">
          J&apos;ai déjà un compte
        </Link>
      </div>
    </div>
  );
}
