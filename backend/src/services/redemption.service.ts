import { v4 as uuid } from 'uuid';
import Decimal from 'decimal.js';
import type { Redemption } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { auditLog } from './audit.service';
import { recalculateCustomer, CustomerWithSummary } from './customer.service';
import { otpService } from './otp';
import { whatsAppService } from './whatsapp/whatsapp.service';
import { readerService } from './reader/reader.service';

function generateReferenceNumber(): string {
  return `RDM-${Date.now().toString(36).toUpperCase()}-${uuid().slice(0, 6).toUpperCase()}`;
}

/**
 * PART 17: REDEEM -> Confirm amount -> OTP -> WhatsApp -> Reader -> SUCCESS.
 * Every step is a separate, resumable API call so the mobile app can show
 * progress and recover from a dropped connection at any stage.
 */

export interface InitiateRedemptionInput {
  customerId: string;
  amount?: string; // optional — defaults to full available balance
  idempotencyKey?: string;
}

export async function initiateRedemption(input: InitiateRedemptionInput) {
  if (input.idempotencyKey) {
    const existing = await prisma.redemption.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) return existing;
  }

  const customer = await recalculateCustomer(input.customerId);
  const available = new Decimal(customer.summary.availableCashback);

  if (!customer.summary.eligible) {
    throw new AppError('NOT_ELIGIBLE_FOR_REDEMPTION', 'Customer has not reached the redemption threshold yet');
  }
  if (available.lte(0)) {
    throw new AppError('INSUFFICIENT_CASHBACK', 'No available cashback to redeem');
  }

  const amount = input.amount ? new Decimal(input.amount) : available;
  if (amount.lte(0) || amount.gt(available)) {
    throw new AppError('INSUFFICIENT_CASHBACK', 'Redemption amount exceeds available cashback');
  }

  // PART 11 / 17: prevent duplicate/concurrent redemptions for the same customer.
  const inFlight = await prisma.redemption.findFirst({
    where: {
      customerId: input.customerId,
      status: { in: ['PENDING', 'OTP_VERIFIED', 'WHATSAPP_PENDING', 'WHATSAPP_VERIFIED', 'READER_PENDING'] },
      deletedAt: null,
    },
  });
  if (inFlight) {
    throw new AppError('DUPLICATE_REDEMPTION', 'A redemption is already in progress for this customer', {
      redemptionId: inFlight.id,
    });
  }

  const redemption = await prisma.redemption.create({
    data: {
      customerId: input.customerId,
      amount: amount.toFixed(2),
      status: 'PENDING',
      referenceNumber: generateReferenceNumber(),
      idempotencyKey: input.idempotencyKey,
    },
  });

  await auditLog({
    entityType: 'REDEMPTION',
    entityId: redemption.id,
    action: 'CREATE',
    newValue: { customerId: input.customerId, amount: amount.toFixed(2) },
  });

  return redemption;
}

async function getRedemptionOrThrow(id: string) {
  const redemption = await prisma.redemption.findUnique({ where: { id }, include: { customer: true } });
  if (!redemption || redemption.deletedAt) throw new AppError('REDEMPTION_NOT_FOUND', 'Redemption not found');
  return redemption;
}

/** Step 2: send OTP for the redemption to the customer's mobile number. */
export async function sendRedemptionOtp(redemptionId: string) {
  const redemption = await getRedemptionOrThrow(redemptionId);
  if (redemption.status !== 'PENDING') {
    throw new AppError('INVALID_REDEMPTION_STATE', `Cannot send OTP from state ${redemption.status}`);
  }
  return otpService.sendOtp(redemption.customer.mobileNumber, 'REDEMPTION', redemption.customerId);
}

/** Step 3: verify the OTP, advancing PENDING -> OTP_VERIFIED. */
export async function verifyRedemptionOtp(redemptionId: string, otpId: string, code: string) {
  const redemption = await getRedemptionOrThrow(redemptionId);
  if (redemption.status !== 'PENDING') {
    throw new AppError('INVALID_REDEMPTION_STATE', `Cannot verify OTP from state ${redemption.status}`);
  }
  await otpService.verifyOtp(otpId, code); // throws on invalid/expired/exceeded

  const updated = await prisma.redemption.update({
    where: { id: redemptionId },
    data: { status: 'OTP_VERIFIED', otpVerified: true },
  });
  await auditLog({ entityType: 'REDEMPTION', entityId: redemptionId, action: 'UPDATE', newValue: { status: 'OTP_VERIFIED' } });
  return updated;
}

/** Step 4: send WhatsApp notification, advancing OTP_VERIFIED -> WHATSAPP_PENDING -> WHATSAPP_VERIFIED. */
export async function processRedemptionWhatsApp(redemptionId: string) {
  const redemption = await getRedemptionOrThrow(redemptionId);
  if (redemption.status !== 'OTP_VERIFIED') {
    throw new AppError('INVALID_REDEMPTION_STATE', `Cannot process WhatsApp from state ${redemption.status}`);
  }

  await prisma.redemption.update({ where: { id: redemptionId }, data: { status: 'WHATSAPP_PENDING', whatsappStatus: 'PENDING' } });

  const sendResult = await whatsAppService.sendRedemptionNotification(
    redemption.customer.mobileNumber,
    redemption.amount.toString(),
    redemption.referenceNumber
  );

  if (sendResult.status === 'FAILED') {
    const failed = await prisma.redemption.update({
      where: { id: redemptionId },
      data: { status: 'FAILED', whatsappStatus: 'FAILED', failureReason: 'WhatsApp notification failed' },
    });
    await auditLog({ entityType: 'REDEMPTION', entityId: redemptionId, action: 'UPDATE', newValue: { status: 'FAILED', reason: 'whatsapp_failed' } });
    throw new AppError('WHATSAPP_FAILED', 'Failed to send WhatsApp notification', { redemption: failed });
  }

  const verifyResult = await whatsAppService.verifyWhatsAppTransaction(redemption.referenceNumber);
  const nextStatus = verifyResult.status === 'VERIFIED' ? 'WHATSAPP_VERIFIED' : 'FAILED';

  const updated = await prisma.redemption.update({
    where: { id: redemptionId },
    data: {
      status: nextStatus,
      whatsappStatus: verifyResult.status,
      failureReason: nextStatus === 'FAILED' ? 'WhatsApp verification failed' : null,
    },
  });

  await auditLog({ entityType: 'REDEMPTION', entityId: redemptionId, action: 'UPDATE', newValue: { status: nextStatus } });

  if (nextStatus === 'FAILED') {
    throw new AppError('WHATSAPP_FAILED', 'WhatsApp verification failed', { redemption: updated });
  }
  return updated;
}

/** Step 5: run the reader transaction, advancing WHATSAPP_VERIFIED -> READER_PENDING -> SUCCESS/FAILED. */
export async function processRedemptionReader(redemptionId: string): Promise<{
  redemption: Redemption;
  customer: CustomerWithSummary;
}> {
  const redemption = await getRedemptionOrThrow(redemptionId);
  if (redemption.status !== 'WHATSAPP_VERIFIED') {
    throw new AppError('INVALID_REDEMPTION_STATE', `Cannot process reader step from state ${redemption.status}`);
  }

  await prisma.redemption.update({ where: { id: redemptionId }, data: { status: 'READER_PENDING', readerStatus: 'PENDING' } });
  await readerService.initialize();
  const { readerTransactionId } = await readerService.createRedemption(redemption.referenceNumber, redemption.amount.toString());
  const readerStatus = await readerService.checkStatus(readerTransactionId);

  if (readerStatus !== 'SUCCESS') {
    const failed = await prisma.redemption.update({
      where: { id: redemptionId },
      data: {
        status: 'FAILED',
        readerStatus,
        failureReason: readerStatus === 'TIMEOUT' ? 'Reader timed out' : 'Reader transaction failed',
      },
    });
    await auditLog({ entityType: 'REDEMPTION', entityId: redemptionId, action: 'UPDATE', newValue: { status: 'FAILED', readerStatus } });
    const customer = await recalculateCustomer(redemption.customerId);
    throw new AppError(readerStatus === 'TIMEOUT' ? 'READER_TIMEOUT' : 'READER_FAILED', 'Reader transaction did not succeed', {
      redemption: failed,
      customer,
    });
  }

  const succeeded = await prisma.redemption.update({
    where: { id: redemptionId },
    data: { status: 'SUCCESS', readerStatus: 'SUCCESS' },
  });

  await auditLog({ entityType: 'REDEMPTION', entityId: redemptionId, action: 'REDEEM', newValue: { status: 'SUCCESS', amount: redemption.amount.toString() } });

  // Available cashback only drops now that redemption has genuinely succeeded.
  const customer = await recalculateCustomer(redemption.customerId);
  return { redemption: succeeded, customer };
}

export async function cancelRedemption(redemptionId: string, adminUserId?: string, reason?: string) {
  const redemption = await getRedemptionOrThrow(redemptionId);
  if (['SUCCESS', 'FAILED', 'CANCELLED'].includes(redemption.status)) {
    throw new AppError('INVALID_REDEMPTION_STATE', `Cannot cancel a redemption in state ${redemption.status}`);
  }
  const updated = await prisma.redemption.update({ where: { id: redemptionId }, data: { status: 'CANCELLED' } });
  await auditLog({ adminUserId, entityType: 'REDEMPTION', entityId: redemptionId, action: 'UPDATE', newValue: { status: 'CANCELLED' }, reason });
  return updated;
}

export async function listRedemptions(filters: { customerId?: string; status?: string; page?: number; pageSize?: number }) {
  const page = filters.page ?? 1;
  const pageSize = Math.min(filters.pageSize ?? 20, 100);
  const where: any = { deletedAt: null };
  if (filters.customerId) where.customerId = filters.customerId;
  if (filters.status) where.status = filters.status;

  const [total, redemptions] = await Promise.all([
    prisma.redemption.count({ where }),
    prisma.redemption.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
  ]);
  return { total, page, pageSize, redemptions };
}

export async function getRedemptionById(id: string) {
  return getRedemptionOrThrow(id);
}
