import Decimal from 'decimal.js';

export interface FuelRuleInput {
  redemptionThresholdLitres: string | Decimal;
  cashbackRatePerLitre: string | Decimal;
}

export interface TransactionInput {
  litres: string | Decimal;
}

export interface CustomerTotals {
  totalLitres: string;
  cashbackGenerated: string;
  eligible: boolean;
}

export interface CashbackSummary extends CustomerTotals {
  cashbackRedeemed: string;
  availableCashback: string;
}

/**
 * Given a customer's ACTIVE (non-deleted) fuel transactions and the current
 * fuel rule, recompute total litres, total cashback generated, and
 * eligibility from scratch. This is the ONLY place these numbers are ever
 * derived — never accumulate them incrementally on the customer row, and
 * never trust a client-supplied total.
 */
export function calculateCustomerTotals(
  transactions: TransactionInput[],
  rule: FuelRuleInput
): CustomerTotals {
  const totalLitres = transactions.reduce(
    (sum, t) => sum.plus(new Decimal(t.litres)),
    new Decimal(0)
  );
  const rate = new Decimal(rule.cashbackRatePerLitre);
  const threshold = new Decimal(rule.redemptionThresholdLitres);

  const eligible = totalLitres.gte(threshold);
  // Cashback accrues on all purchased litres once the threshold is met.
  // (Spec example: 55L @ Petrol threshold 50L -> 55 * 0.50 = 27.50.)
  const cashbackGenerated = eligible ? totalLitres.times(rate) : new Decimal(0);

  return {
    totalLitres: totalLitres.toFixed(2),
    cashbackGenerated: cashbackGenerated.toFixed(2),
    eligible,
  };
}

/**
 * Combines totals with redemption history to produce the final available
 * balance shown to operators and admins.
 */
export function calculateAvailableCashback(
  totals: CustomerTotals,
  totalRedeemed: string | Decimal
): CashbackSummary {
  const generated = new Decimal(totals.cashbackGenerated);
  const redeemed = new Decimal(totalRedeemed);
  const available = Decimal.max(generated.minus(redeemed), 0);

  return {
    ...totals,
    cashbackRedeemed: redeemed.toFixed(2),
    availableCashback: available.toFixed(2),
  };
}

/** Cashback for a single new transaction, computed the same way it will be
 * reflected once merged into the recalculated total (used for the
 * "estimated cashback" preview shown on the New Customer screen only —
 * the backend recalculation on save is authoritative). */
export function estimateTransactionCashback(litres: string | Decimal, rule: FuelRuleInput): string {
  return new Decimal(litres).times(new Decimal(rule.cashbackRatePerLitre)).toFixed(2);
}
