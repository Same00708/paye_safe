'use client';

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const { user } = useAuth();

  if (user) {
    return (
      <section>
        <div className="hero hero-compact">
          <h1>Bonjour, {user.fullName.split(" ")[0]} 👋</h1>
          <p>Votre espace PaySafe est prêt. Créez une transaction ou consultez vos échanges.</p>
          <div className="hero-actions">
            <Link href="/transactions/nouvelle" className="btn btn-primary">
              + Nouvelle transaction
            </Link>
            <Link href="/transactions" className="btn btn-outline">
              Mes transactions
            </Link>
          </div>
        </div>
        <div className="features">
          <article className="feature card">
            <h3>💬 Chat intégré</h3>
            <p>Chaque transaction a sa discussion privée avec l&apos;autre partie.</p>
          </article>
          <article className="feature card">
            <h3>🛡 Paiement sécurisé</h3>
            <p>L&apos;argent reste bloqué jusqu&apos;à validation ou retour.</p>
          </article>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="hero">
        <span className="hero-badge">Tiers de confiance · Mobile Money</span>
        <h1>Achetez et vendez en toute sécurité</h1>
        <p>
          PaySafe protège acheteurs et vendeurs. L&apos;argent est bloqué jusqu&apos;à réception
          de l&apos;article — avec chat intégré et paiement FedaPay.
        </p>
        <div className="hero-actions">
          <Link href="/inscription" className="btn btn-primary btn-lg">
            Créer un compte gratuit
          </Link>
          <Link href="/connexion" className="btn btn-outline btn-lg">
            Se connecter
          </Link>
        </div>
      </div>

      <div className="how-it-works card">
        <h2>Comment ça marche</h2>
        <ol className="steps-list">
          <li>
            <strong>1. Créez votre compte</strong>
            <span>Nom, @username et numéro de téléphone</span>
          </li>
          <li>
            <strong>2. Commandez chez un vendeur</strong>
            <span>L&apos;acheteur choisit un vendeur inscrit — celui-ci est notifié</span>
          </li>
          <li>
            <strong>3. Discutez dans le chat</strong>
            <span>Photos, suivi colis, preuves horodatées</span>
          </li>
          <li>
            <strong>4. Payez & validez</strong>
            <span>Mobile Money via FedaPay, fonds bloqués puis libérés</span>
          </li>
        </ol>
        <p className="how-cta">
          <Link href="/inscription" className="btn btn-primary">
            Commencer maintenant
          </Link>
        </p>
      </div>

      <div className="features">
        <article className="feature card">
          <h3>🛡 Argent bloqué</h3>
          <p>Fonds séquestrés chez PaySafe jusqu&apos;à validation ou retour validé.</p>
        </article>
        <article className="feature card">
          <h3>💬 Chat par transaction</h3>
          <p>Parlez directement avec l&apos;autre partie — historique conservé.</p>
        </article>
        <article className="feature card">
          <h3>📱 Mobile Money</h3>
          <p>Flooz, MTN, Orange, Wave via FedaPay.</p>
        </article>
      </div>
    </section>
  );
}
