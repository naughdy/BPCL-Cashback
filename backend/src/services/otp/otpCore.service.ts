import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { AppError } from '../../lib/errors';
import type { IOtpService, SendOtpResult, VerifyOtpResult } from './otp.types';
import type { ISmsTransport } from './smsTransport.types';

/**
 * Generation, hashing, expiry, resend cooldown, and attempt-limiting all
 * live here and are identical regardless of which SMS transport is
 * plugged in — swapping providers (mock/MSG91/anything else) never
 * touches this security-critical logic, only how the message gets sent.
 */
export class OtpCoreService implements IOtpService {
  constructor(private readonly transport: ISmsTransport) {}

  async sendOtp(
    mobileNumber: string,
    purpose: 'CUSTOMER_VERIFICATION' | 'REDEMPTION',
    customerId?: string
  ): Promise<SendOtpResult> {
    const recent = await prisma.otpVerification.findFirst({
      where: { mobileNumber, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) {
      const cooldownEndsAt = new Date(recent.createdAt.getTime() + env.otpResendCooldownSeconds * 1000);
      if (cooldownEndsAt > new Date()) {
        throw new AppError('OTP_RESEND_TOO_SOON', 'Please wait before requesting another OTP', {
          retryAt: cooldownEndsAt,
        });
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

    const message = `Your OTP for BPCL Cashback is ${code}. Valid for ${env.otpExpiryMinutes} minutes. Do not share this code with anyone.`;
    const result = await this.transport.send(mobileNumber, message);

    if (!result.delivered) {
      // The OTP record still exists (so a retry with the same otpId isn't
      // possible), but we surface the failure rather than pretending it
      // was sent — never lie about delivery.
      throw new AppError('INTERNAL_ERROR', 'Could not send OTP. Please try again.', { reason: result.error });
    }

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
