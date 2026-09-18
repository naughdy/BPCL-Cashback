import { Router } from 'express';
import { z } from 'zod';
import {
  initiateRedemption,
  sendRedemptionOtp,
  verifyRedemptionOtp,
  processRedemptionWhatsApp,
  processRedemptionReader,
  cancelRedemption,
  listRedemptions,
  getRedemptionById,
} from '../services/redemption.service';
import { validateBody } from '../middleware/validate.middleware';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

export const redemptionRouter = Router();

const initiateSchema = z.object({
  customerId: z.string().uuid(),
  amount: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

redemptionRouter.post(
  '/',
  validateBody(initiateSchema),
  asyncHandler(async (req, res) => {
    const redemption = await initiateRedemption(req.body);
    res.status(201).json(redemption);
  })
);

redemptionRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await listRedemptions({
      customerId: req.query.customerId as string | undefined,
      status: req.query.status as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
    });
    res.json(result);
  })
);

redemptionRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const redemption = await getRedemptionById(req.params.id);
    res.json(redemption);
  })
);

// Step-by-step flow, each a separate call so the mobile UI can show
// progress (OTP screen -> WhatsApp screen -> Reader screen).
redemptionRouter.post(
  '/:id/otp/send',
  asyncHandler(async (req, res) => {
    const result = await sendRedemptionOtp(req.params.id);
    res.json({ otpId: result.otpId, expiresAt: result.expiresAt, resendAvailableAt: result.resendAvailableAt });
  })
);

const verifyOtpSchema = z.object({ otpId: z.string().min(1), code: z.string().length(6) });
redemptionRouter.post(
  '/:id/otp/verify',
  validateBody(verifyOtpSchema),
  asyncHandler(async (req, res) => {
    const redemption = await verifyRedemptionOtp(req.params.id, req.body.otpId, req.body.code);
    res.json(redemption);
  })
);

redemptionRouter.post(
  '/:id/whatsapp',
  asyncHandler(async (req, res) => {
    const redemption = await processRedemptionWhatsApp(req.params.id);
    res.json(redemption);
  })
);

redemptionRouter.post(
  '/:id/reader',
  asyncHandler(async (req, res) => {
    const result = await processRedemptionReader(req.params.id);
    res.json(result);
  })
);

redemptionRouter.post(
  '/:id/cancel',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const redemption = await cancelRedemption(req.params.id, req.user?.id, req.body?.reason);
    res.json(redemption);
  })
);
