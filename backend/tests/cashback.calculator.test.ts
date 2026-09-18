import { calculateCustomerTotals, calculateAvailableCashback, estimateTransactionCashback } from '../src/services/cashback.calculator';

const PETROL_RULE = { redemptionThresholdLitres: '50', cashbackRatePerLitre: '0.50' };
const DIESEL_RULE = { redemptionThresholdLitres: '100', cashbackRatePerLitre: '0.50' };

describe('calculateCustomerTotals — Petrol eligibility', () => {
  it('49L is NOT eligible', () => {
    const result = calculateCustomerTotals([{ litres: '49' }], PETROL_RULE);
    expect(result.eligible).toBe(false);
    expect(result.cashbackGenerated).toBe('0.00');
  });

  it('50L IS eligible, cashback = 25', () => {
    const result = calculateCustomerTotals([{ litres: '50' }], PETROL_RULE);
    expect(result.eligible).toBe(true);
    expect(result.cashbackGenerated).toBe('25.00');
  });

  it('60L -> 30 cashback, 100L -> 50 cashback', () => {
    expect(calculateCustomerTotals([{ litres: '60' }], PETROL_RULE).cashbackGenerated).toBe('30.00');
    expect(calculateCustomerTotals([{ litres: '100' }], PETROL_RULE).cashbackGenerated).toBe('50.00');
  });

  it('spec example: 20 + 15 + 20 = 55L -> eligible, cashback 27.50', () => {
    const result = calculateCustomerTotals([{ litres: '20' }, { litres: '15' }, { litres: '20' }], PETROL_RULE);
    expect(result.totalLitres).toBe('55.00');
    expect(result.eligible).toBe(true);
    expect(result.cashbackGenerated).toBe('27.50');
  });
});

describe('calculateCustomerTotals — Diesel eligibility', () => {
  it('99L is NOT eligible', () => {
    expect(calculateCustomerTotals([{ litres: '99' }], DIESEL_RULE).eligible).toBe(false);
  });

  it('100L IS eligible, cashback = 50', () => {
    const result = calculateCustomerTotals([{ litres: '100' }], DIESEL_RULE);
    expect(result.eligible).toBe(true);
    expect(result.cashbackGenerated).toBe('50.00');
  });

  it('150L -> 75 cashback, 200L -> 100 cashback', () => {
    expect(calculateCustomerTotals([{ litres: '150' }], DIESEL_RULE).cashbackGenerated).toBe('75.00');
    expect(calculateCustomerTotals([{ litres: '200' }], DIESEL_RULE).cashbackGenerated).toBe('100.00');
  });
});

describe('calculateAvailableCashback', () => {
  it('available = generated - redeemed', () => {
    const totals = calculateCustomerTotals([{ litres: '55' }], PETROL_RULE);
    const summary = calculateAvailableCashback(totals, '0');
    expect(summary.availableCashback).toBe('27.50');
  });

  it('after full redemption, available becomes 0 but history/totals stay intact', () => {
    const totals = calculateCustomerTotals([{ litres: '55' }], PETROL_RULE);
    const summary = calculateAvailableCashback(totals, '27.50');
    expect(summary.availableCashback).toBe('0.00');
    expect(summary.totalLitres).toBe('55.00');
    expect(summary.cashbackGenerated).toBe('27.50');
  });

  it('never goes negative even if redeemed somehow exceeds generated', () => {
    const totals = calculateCustomerTotals([{ litres: '55' }], PETROL_RULE);
    const summary = calculateAvailableCashback(totals, '100');
    expect(summary.availableCashback).toBe('0.00');
  });
});

describe('estimateTransactionCashback', () => {
  it('computes rate * litres precisely with decimals', () => {
    expect(estimateTransactionCashback('33.33', PETROL_RULE)).toBe('16.67');
  });
});
