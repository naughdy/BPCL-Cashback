import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { AppError } from '../lib/errors';

export const dashboardRouter = Router();

const DAY_MS = 24 * 60 * 60 * 1000;

function parseRange(fromRaw: unknown, toRaw: unknown): { from: Date; to: Date } {
  // Default window: last 30 days (inclusive of today) if the client didn't
  // specify one — keeps the endpoint usable without query params too.
  const now = new Date();
  let to = toRaw ? new Date(String(toRaw)) : now;
  let from = fromRaw ? new Date(String(fromRaw)) : new Date(to.getTime() - 29 * DAY_MS);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new AppError('VALIDATION_ERROR', 'Invalid from/to date');
  }
  if (from > to) {
    throw new AppError('VALIDATION_ERROR', 'from date must be before to date');
  }

  // Normalize to whole-day boundaries so "today" and "yesterday" presets
  // behave intuitively regardless of the time-of-day the request is made.
  from = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0, 0);
  to = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999);

  return { from, to };
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

dashboardRouter.get(
  '/dashboard',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { from, to } = parseRange(req.query.from, req.query.to);

    const [
      totalCustomersOverall,
      newCustomersInRange,
      availableCashbackAgg,
      transactionsInRange,
      successfulRedemptionsInRange,
      recentTransactions,
      recentRedemptions,
    ] = await Promise.all([
      prisma.customer.count({ where: { deletedAt: null } }),
      prisma.customer.count({ where: { deletedAt: null, createdAt: { gte: from, lte: to } } }),
      prisma.customer.aggregate({ _sum: { availableCashback: true }, where: { deletedAt: null } }),
      prisma.fuelTransaction.findMany({
        where: { deletedAt: null, transactionDate: { gte: from, lte: to } },
        orderBy: { transactionDate: 'desc' },
      }),
      prisma.redemption.findMany({
        where: { deletedAt: null, status: 'SUCCESS', updatedAt: { gte: from, lte: to } },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.fuelTransaction.findMany({
        where: { deletedAt: null, transactionDate: { gte: from, lte: to } },
        orderBy: { transactionDate: 'desc' },
        take: 10,
      }),
      prisma.redemption.findMany({
        where: { deletedAt: null, createdAt: { gte: from, lte: to } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const totalLitresInRange = transactionsInRange.reduce((sum, t) => sum + Number(t.litres), 0);
    const totalCashbackGeneratedInRange = transactionsInRange.reduce((sum, t) => sum + Number(t.cashbackGenerated), 0);
    const totalCashbackRedeemedInRange = successfulRedemptionsInRange.reduce((sum, r) => sum + Number(r.amount), 0);

    // Day-wise breakdown for the chart — every day in the range appears,
    // even with zero activity, so the chart doesn't have gaps.
    const byDay = new Map<string, { litres: number; cashbackGenerated: number; transactionsCount: number; cashbackRedeemed: number; redemptionsCount: number }>();
    for (let cursor = new Date(from); cursor <= to; cursor = new Date(cursor.getTime() + DAY_MS)) {
      byDay.set(dateKey(cursor), { litres: 0, cashbackGenerated: 0, transactionsCount: 0, cashbackRedeemed: 0, redemptionsCount: 0 });
    }
    for (const t of transactionsInRange) {
      const key = dateKey(t.transactionDate);
      const bucket = byDay.get(key);
      if (bucket) {
        bucket.litres += Number(t.litres);
        bucket.cashbackGenerated += Number(t.cashbackGenerated);
        bucket.transactionsCount += 1;
      }
    }
    for (const r of successfulRedemptionsInRange) {
      const key = dateKey(r.updatedAt);
      const bucket = byDay.get(key);
      if (bucket) {
        bucket.cashbackRedeemed += Number(r.amount);
        bucket.redemptionsCount += 1;
      }
    }

    const dailyBreakdown = Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        litres: v.litres.toFixed(2),
        cashbackGenerated: v.cashbackGenerated.toFixed(2),
        transactionsCount: v.transactionsCount,
        cashbackRedeemed: v.cashbackRedeemed.toFixed(2),
        redemptionsCount: v.redemptionsCount,
      }));

    res.json({
      range: { from: from.toISOString(), to: to.toISOString() },
      totalCustomers: totalCustomersOverall,
      newCustomersInRange,
      totalTransactions: transactionsInRange.length,
      totalRedemptions: successfulRedemptionsInRange.length,
      totalLitres: totalLitresInRange.toFixed(2),
      totalCashbackGenerated: totalCashbackGeneratedInRange.toFixed(2),
      totalCashbackRedeemed: totalCashbackRedeemedInRange.toFixed(2),
      // Available cashback is a current, point-in-time balance — it isn't
      // meaningful to scope to a date range, so it's always the live total.
      totalAvailableCashback: Number(availableCashbackAgg._sum.availableCashback ?? 0).toFixed(2),
      dailyBreakdown,
      recentTransactions,
      recentRedemptions,
    });
  })
);
