'use client';
import Link from "next/link";

import type { Transaction } from "@/types/transaction";
import { StatusBadge } from "./StatusBadge";
import { useAuth } from "@/context/AuthContext";

function formatFcfa(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
}

export function TransactionCard({ transaction }: { transaction: Transaction }) {
  const { user } = useAuth();
  const total = transaction.amount + transaction.fees;
  const role =
    user?.userId === transaction.sellerId
      ? "Vendeur"
      : user?.userId === transaction.buyerId
        ? "Acheteur"
        : null;

  return (
    <Link href={`/transactions/${transaction.transactionId}`} className="tx-card card">
      <div className="tx-card-top">
        <h3>{transaction.title}</h3>
        <StatusBadge status={transaction.status} />
      </div>
      <p className="tx-amount">{formatFcfa(total)}</p>
      <div className="tx-card-meta">
        {role && <span className="tx-role-badge">{role}</span>}
        {role === "Vendeur" && transaction.status === "PENDING_PAYMENT" && (
          <span className="tx-await-pay">En attente paiement</span>
        )}
        <span>#{transaction.transactionId}</span>
        <span>💬 Chat</span>
      </div>
    </Link>
  );
}
