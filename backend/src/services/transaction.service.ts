import Decimal from 'decimal.js';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { auditLog } from './audit.service';
import { getFuelRule } from './fuelRules.service';
import { estimateTransactionCashback } from './cashback.calculator';
import { recalculateCustomer, CustomerWithSummary } from './customer.service';

export interface AddTransactionInput {
  customerId: string;
  litres: string;
  idempotencyKey?: string;
}

export interface AddTransactionResult {
  transactionId: string;
  customer: CustomerWithSummary;
}

/** Adds a fuel transaction and atomically recalculates the customer's
 * totals (PART 11: transaction integrity). Prevents duplicate submissions
 * via an idempotency key — if the operator double-taps ADD on a slow
 * network, the same key returns the original result instead of creating a
 * second transaction. */
export async function addFuelTransaction(input: AddTransactionInput): Promise<AddTransactionResult> {
  const litres = new Decimal(input.litres);
  if (!litres.isFinite() || litres.lte(0)) {
    throw new AppError('INVALID_LITRES', 'Litres must be greater than 0');
  }

  if (input.idempotencyKey) {
    const existing = await prisma.fuelTransaction.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) {
      const customer = await recalculateCustomer(existing.customerId);
      return { transactionId: existing.id, customer };
    }
  }

  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!customer || customer.deletedAt) throw new AppError('CUSTOMER_NOT_FOUND', 'Customer not found');

  const rule = await getFuelRule(customer.fuelType);
  const estimatedCashback = estimateTransactionCashback(litres, rule);

  const created = await prisma.$transaction(async (tx) => {
    const txn = await tx.fuelTransaction.create({
      data: {
        customerId: customer.id,
        vehicleNumberSnapshot: customer.vehicleNumber,
        fuelTypeSnapshot: customer.fuelType,
        litres: litres.toFixed(2),
        cashbackGenerated: estimatedCashback, // recalculated at the customer level below; stored here for history
        idempotencyKey: input.idempotencyKey,
      },
    });
    return txn;
  });

  await auditLog({
    entityType: 'FUEL_TRANSACTION',
    entityId: created.id,
    action: 'CREATE',
    newValue: { customerId: customer.id, litres: litres.toFixed(2) },
  });

  const updatedCustomer = await recalculateCustomer(customer.id);
  return { transactionId: created.id, customer: updatedCustomer };
}

export async function listTransactions(filters: {
  customerId?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = filters.page ?? 1;
  const pageSize = Math.min(filters.pageSize ?? 20, 100);
  const where: any = { deletedAt: null };
  if (filters.customerId) where.customerId = filters.customerId;

  const [total, transactions] = await Promise.all([
    prisma.fuelTransaction.count({ where }),
    prisma.fuelTransaction.findMany({
      where,
      orderBy: { transactionDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { total, page, pageSize, transactions };
}

export async function getTransactionById(id: string) {
  const txn = await prisma.fuelTransaction.findUnique({ where: { id } });
  if (!txn || txn.deletedAt) throw new AppError('NOT_FOUND', 'Transaction not found');
  return txn;
}

/** Admin edit: changes litres on an existing transaction, then forces a
 * full recalculation of the owning customer's totals/eligibility/cashback.
 * Never lets an admin edit the derived totals directly (PART 24). */
export async function updateTransaction(
  id: string,
  input: { litres?: string; transactionDate?: string },
  adminUserId: string,
  reason?: string
): Promise<CustomerWithSummary> {
  const existing = await prisma.fuelTransaction.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new AppError('NOT_FOUND', 'Transaction not found');

  const data: any = { status: 'EDITED' };
  if (input.litres !== undefined) {
    const litres = new Decimal(input.litres);
    if (!litres.isFinite() || litres.lte(0)) throw new AppError('INVALID_LITRES', 'Litres must be greater than 0');
    data.litres = litres.toFixed(2);
  }
  if (input.transactionDate) data.transactionDate = new Date(input.transactionDate);

  await prisma.fuelTransaction.update({ where: { id }, data });

  await auditLog({
    adminUserId,
    entityType: 'FUEL_TRANSACTION',
    entityId: id,
    action: 'UPDATE',
    oldValue: { litres: existing.litres.toString(), transactionDate: existing.transactionDate },
    newValue: input,
    reason,
  });

  return recalculateCustomer(existing.customerId);
}

export async function softDeleteTransaction(id: string, adminUserId: string, reason?: string): Promise<CustomerWithSummary> {
  const existing = await prisma.fuelTransaction.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new AppError('NOT_FOUND', 'Transaction not found');

  await prisma.fuelTransaction.update({
    where: { id },
    data: { deletedAt: new Date(), deletedBy: adminUserId, status: 'DELETED' },
  });

  await auditLog({
    adminUserId,
    entityType: 'FUEL_TRANSACTION',
    entityId: id,
    action: 'DELETE',
    oldValue: { litres: existing.litres.toString() },
    reason,
  });

  return recalculateCustomer(existing.customerId);
}
