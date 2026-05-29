import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { authenticate } from "../middleware/auth";
import { assertAdmin } from "../middleware/requireAdmin";
import * as usersRepo from "../repositories/users";
import * as transactionsRepo from "../repositories/transactions";
import { STATUS_LABELS } from "../services/transactionFlow";
import { computePlatformFee, PLATFORM_FEE_RATE } from "../services/fees";

export const adminRouter = Router();

adminRouter.use(authenticate);
adminRouter.use(asyncHandler(assertAdmin));

adminRouter.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const users = await usersRepo.countUsers();
    const transactions = await transactionsRepo.findAllTransactions();

    const byStatus: Record<string, number> = {};
    let volume = 0;
    let feesCollected = 0;

    for (const tx of transactions) {
      byStatus[tx.status] = (byStatus[tx.status] ?? 0) + 1;
      if (tx.status === "COMPLETED" && !tx.feesWaived) {
        volume += tx.amount;
        feesCollected += tx.fees;
      }
    }

    res.json({
      data: {
        users: users.total,
        admins: users.admins,
        transactions: transactions.length,
        byStatus,
        volumeCompleted: volume,
        feesCollected,
        feeRatePercent: PLATFORM_FEE_RATE * 100,
        statusLabels: STATUS_LABELS,
      },
    });
  }),
);

adminRouter.get(
  "/users",
  asyncHandler(async (_req, res) => {
    const data = await usersRepo.findAllUsers();
    res.json({ data });
  }),
);

adminRouter.get(
  "/transactions",
  asyncHandler(async (_req, res) => {
    const transactions = await transactionsRepo.findAllTransactions();
    const enriched = await Promise.all(
      transactions.map(async (tx) => {
        const [buyer, seller] = await Promise.all([
          usersRepo.findUserById(tx.buyerId),
          usersRepo.findUserById(tx.sellerId),
        ]);
        return {
          ...tx,
          buyer,
          seller,
          total: tx.amount + tx.fees,
          expectedFee: computePlatformFee(tx.amount),
        };
      }),
    );
    res.json({ data: enriched });
  }),
);
