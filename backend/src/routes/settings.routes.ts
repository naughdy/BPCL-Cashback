import { Router } from 'express';
import { z } from 'zod';
import { getAllFuelRules, updateFuelRule } from '../services/fuelRules.service';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { asyncHandler } from '../middleware/error.middleware';

export const settingsRouter = Router();

settingsRouter.get(
  '/settings/fuel-rules',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const rules = await getAllFuelRules();
    res.json(rules);
  })
);

const updateSchema = z.object({
  redemptionThresholdLitres: z.string().min(1),
  cashbackRatePerLitre: z.string().min(1),
});

// PART 28: only authorized (SUPER_ADMIN) users may change business rules.
settingsRouter.put(
  '/settings/fuel-rules/:fuelType',
  requireAuth,
  requireRole('SUPER_ADMIN'),
  validateBody(updateSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const fuelType = req.params.fuelType.toUpperCase() as 'PETROL' | 'DIESEL';
    if (fuelType !== 'PETROL' && fuelType !== 'DIESEL') {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'fuelType must be PETROL or DIESEL' } });
    }
    const rule = await updateFuelRule(fuelType, req.body, req.user!.id);
    res.json(rule);
  })
);
