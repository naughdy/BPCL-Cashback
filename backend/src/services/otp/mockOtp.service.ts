import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { AppError } from '../../lib/errors';
import type { IOtpService, SendOtpResult, VerifyOtpResult } from './otp.types';

/**
 * Development/testing OTP provider. Generates a RANDOM 6-digit code each
 * time (never hardcoded), hashes it before storing, and "delivers" it by
 * logging at debug level only — never returned in the API response.
 * Swap this out for a real SMS/WhatsApp provider (env.OTP_PROVIDER) in
 * production; the interface (IOtpService) stays the same.
 */
export class MockOtpService implements IOtpService {
  async sendOtp(
    mobileNumber: string,
    purpose: 'CUSTOMER_VERIFICATION' | 'REDEMPTION',
    customerId?: string
  ): Promise<SendOtpResult> {
    // Rate limit: don't allow resend within the cooldown window.
    const recent = await prisma.otpVerification.findFirst({
      where: { mobileNumber, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) {
      const cooldownEndsAt = new Date(
        recent.createdAt.getTime() + env.otpResendCooldownSeconds * 1000
      );
      if (cooldownEndsAt > new Date()) {
        throw new AppError(
          'OTP_RESEND_TOO_SOON',
          `Please wait before requesting another OTP`,
          { retryAt: cooldownEndsAt }
        );
      }
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + env.otpExpiryMinutes * 60 * 1000);

    const record = await prisma.otpVerification.create({
      data: {
        customerId: customerId ?? null,
        mobileNumber,
        purpose,
        otpHash,
        expiresAt,
        maxAttempts: env.otpMaxAttempts,
      },
    });

    // Mock "delivery": log only, never expose in API response/UI.
    logger.debug({ mobileNumber, otpId: record.id, code }, '[MockOtpService] OTP generated (dev only)');

    return {
      otpId: record.id,
      expiresAt,
      resendAvailableAt: new Date(Date.now() + env.otpResendCooldownSeconds * 1000),
    };
  }

  async verifyOtp(otpId: string, code: string): Promise<VerifyOtpResult> {
    const record = await prisma.otpVerification.findUnique({ where: { id: otpId } });
    if (!record) {
      throw new AppError('OTP_INVALID', 'OTP request not found');
    }
    if (record.consumedAt) {
      throw new AppError('OTP_INVALID', 'This OTP has already been used');
    }
    if (record.expiresAt < new Date()) {
      throw new AppError('OTP_EXPIRED', 'OTP has expired, please request a new one');
    }
    if (record.attempts >= record.maxAttempts) {
      throw new AppError('OTP_ATTEMPTS_EXCEEDED', 'Maximum OTP attempts exceeded');
    }

    const matches = await bcrypt.compare(code, record.otpHash);

    if (!matches) {
      const updated = await prisma.otpVerification.update({
        where: { id: otpId },
        data: { attempts: { increment: 1 } },
      });
      const attemptsRemaining = Math.max(updated.maxAttempts - updated.attempts, 0);
      if (attemptsRemaining <= 0) {
        throw new AppError('OTP_ATTEMPTS_EXCEEDED', 'Maximum OTP attempts exceeded');
      }
      throw new AppError('OTP_INVALID', 'Incorrect OTP', { attemptsRemaining });
    }

    await prisma.otpVerification.update({
      where: { id: otpId },
      data: { verifiedAt: new Date(), consumedAt: new Date() },
    });

    return { verified: true, attemptsRemaining: record.maxAttempts - record.attempts };
  }
}

export const otpService: IOtpService = new MockOtpService();
