import Decimal from 'decimal.js';
import { FuelType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { auditLog } from './audit.service';

export interface FuelRuleDTO {
  fuelType: FuelType;
  redemptionThresholdLitres: string;
  cashbackRatePerLitre: string;
}

const DEFAULT_RULES: Record<FuelType, { threshold: string; rate: string }> = {
  PETROL: { threshold: '50', rate: '0.50' },
  DIESEL: { threshold: '100', rate: '0.50' },
};

/** Ensures both fuel rules exist in the DB (idempotent), seeded from defaults. */
export async function ensureFuelRulesSeeded(): Promise<void> {
  for (const fuelType of Object.keys(DEFAULT_RULES) as FuelType[]) {
    const existing = await prisma.fuelRule.findUnique({ where: { fuelType } });
    if (!existing) {
      await prisma.fuelRule.create({
        data: {
          fuelType,
          redemptionThresholdLitres: DEFAULT_RULES[fuelType].threshold,
          cashbackRatePerLitre: DEFAULT_RULES[fuelType].rate,
        },
      });
    }
  }
}

export async function getFuelRule(fuelType: FuelType): Promise<FuelRuleDTO> {
  const rule = await prisma.fuelRule.findUnique({ where: { fuelType } });
  if (!rule) {
    // Fall back to hardcoded defaults if DB hasn't been seeded yet — the
    // backend is still the single source of truth, this is just a safety net.
    const d = DEFAULT_RULES[fuelType];
    return { fuelType, redemptionThresholdLitres: d.threshold, cashbackRatePerLitre: d.rate };
  }
  return {
    fuelType: rule.fuelType,
    redemptionThresholdLitres: rule.redemptionThresholdLitres.toString(),
    cashbackRatePerLitre: rule.cashbackRatePerLitre.toString(),
  };
}

export async function getAllFuelRules(): Promise<FuelRuleDTO[]> {
  return Promise.all([getFuelRule('PETROL'), getFuelRule('DIESEL')]);
}

export async function updateFuelRule(
  fuelType: FuelType,
  input: { redemptionThresholdLitres: string; cashbackRatePerLitre: string },
  adminUserId: string
): Promise<FuelRuleDTO> {
  const threshold = new Decimal(input.redemptionThresholdLitres);
  const rate = new Decimal(input.cashbackRatePerLitre);
  if (threshold.lte(0) || rate.lte(0)) {
    throw new Error('Threshold and rate must be positive');
  }

  const before = await getFuelRule(fuelType);

  const updated = await prisma.fuelRule.upsert({
    where: { fuelType },
    update: {
      redemptionThresholdLitres: threshold.toFixed(2),
      cashbackRatePerLitre: rate.toFixed(4),
      updatedBy: adminUserId,
    },
    create: {
      fuelType,
      redemptionThresholdLitres: threshold.toFixed(2),
      cashbackRatePerLitre: rate.toFixed(4),
      updatedBy: adminUserId,
    },
  });

  await auditLog({
    adminUserId,
    entityType: 'FUEL_RULE',
    entityId: updated.id,
    action: 'UPDATE',
    oldValue: before,
    newValue: { redemptionThresholdLitres: input.redemptionThresholdLitres, cashbackRatePerLitre: input.cashbackRatePerLitre },
  });

  return {
    fuelType: updated.fuelType,
    redemptionThresholdLitres: updated.redemptionThresholdLitres.toString(),
    cashbackRatePerLitre: updated.cashbackRatePerLitre.toString(),
  };
}
