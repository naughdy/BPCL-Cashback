import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { otpService } from '../services/otp';
import { validateBody } from '../middleware/validate.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { normalizeMobileNumber } from '../lib/normalize';

export const otpRouter = Router();

const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many OTP requests, slow down' } },
});

const sendSchema = z.object({
  mobileNumber: z.string().min(1),
  purpose: z.enum(['CUSTOMER_VERIFICATION', 'REDEMPTION']),
  customerId: z.string().uuid().optional(),
});

otpRouter.post(
  '/send',
  otpLimiter,
  validateBody(sendSchema),
  asyncHandler(async (req, res) => {
    const mobile = normalizeMobileNumber(req.body.mobileNumber);
    const result = await otpService.sendOtp(mobile, req.body.purpose, req.body.customerId);
    // Never return the OTP code itself in the response.
    res.json({ otpId: result.otpId, expiresAt: result.expiresAt, resendAvailableAt: result.resendAvailableAt });
  })
);

const verifySchema = z.object({
  otpId: z.string().min(1),
  code: z.string().length(6),
});

otpRouter.post(
  '/verify',
  otpLimiter,
  validateBody(verifySchema),
  asyncHandler(async (req, res) => {
    const result = await otpService.verifyOtp(req.body.otpId, req.body.code);
    res.json(result);
  })
);
