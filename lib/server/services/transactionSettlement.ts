import { fedapayService } from "./fedapay";

type UserPhone = { phoneNumber: string };

type TxSettlement = {
  transactionId: number;
  amount: number;
  fees: number;
  feesWaived: boolean;
  title: string;
  fedapayTransactionId?: string | null;
};

/**
 * Clôture réussie : versement vendeur + remboursement frais si litige (0 % commission).
 */
export async function settleSuccessfulTransaction(
  transaction: TxSettlement,
  seller: UserPhone,
  _buyer: UserPhone,
) {
  const payout = await fedapayService.createPayout({
    amount: transaction.amount,
    description: `PaySafe versement — ${transaction.title}`,
    phoneNumber: seller.phoneNumber,
    transactionId: transaction.transactionId,
  });

  let feeRefund = null;
  if (transaction.feesWaived && transaction.fees > 0) {
    feeRefund = await fedapayService.createRefund({
      fedapayTransactionId: transaction.fedapayTransactionId ?? "",
      amount: transaction.fees,
      transactionId: transaction.transactionId,
    });
  }

  return { payout, feeRefund, platformFeeKept: transaction.feesWaived ? 0 : transaction.fees };
}

/** Remboursement intégral acheteur (montant + frais) */
export async function refundBuyerFull(transaction: TxSettlement, _buyer: UserPhone) {
  const total = transaction.amount + transaction.fees;
  return fedapayService.createRefund({
    fedapayTransactionId: transaction.fedapayTransactionId ?? "",
    amount: total,
    transactionId: transaction.transactionId,
  });
}
