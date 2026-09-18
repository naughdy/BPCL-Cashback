import { Customer, FuelType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { normalizeVehicleNumber, normalizeMobileNumber } from '../lib/normalize';
import { calculateCustomerTotals, calculateAvailableCashback, CashbackSummary } from './cashback.calculator';
import { getFuelRule } from './fuelRules.service';
import { auditLog } from './audit.service';

export interface CustomerWithSummary {
  id: string;
  vehicleNumber: string;
  mobileNumber: string;
  fuelType: FuelType;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  summary: CashbackSummary;
}

/** Recomputes and PERSISTS a customer's derived totals from their active
 * transactions and redemptions. This is the only function allowed to write
 * totalLitres/cashbackGenerated/cashbackRedeemed/availableCashback. */
export async function recalculateCustomer(customerId: string): Promise<CustomerWithSummary> {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer || customer.deletedAt) {
    throw new AppError('CUSTOMER_NOT_FOUND', 'Customer not found');
  }

  const [activeTransactions, rule, redemptions] = await Promise.all([
    prisma.fuelTransaction.findMany({
      where: { customerId, status: { not: 'DELETED' }, deletedAt: null },
    }),
    getFuelRule(customer.fuelType),
    prisma.redemption.findMany({
      where: { customerId, status: 'SUCCESS', deletedAt: null },
    }),
  ]);

  const totals = calculateCustomerTotals(
    activeTransactions.map((t) => ({ litres: t.litres.toString() })),
    rule
  );
  const totalRedeemed = redemptions.reduce((sum, r) => sum + Number(r.amount), 0);
  const summary = calculateAvailableCashback(totals, totalRedeemed.toFixed(2));

  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: {
      totalLitres: summary.totalLitres,
      cashbackGenerated: summary.cashbackGenerated,
      cashbackRedeemed: summary.cashbackRedeemed,
      availableCashback: summary.availableCashback,
    },
  });

  return toCustomerWithSummary(updated, summary);
}

function toCustomerWithSummary(customer: Customer, summary: CashbackSummary): CustomerWithSummary {
  return {
    id: customer.id,
    vehicleNumber: customer.vehicleNumber,
    mobileNumber: customer.mobileNumber,
    fuelType: customer.fuelType,
    isVerified: customer.isVerified,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
    summary,
  };
}

/** Looks up a customer by vehicle number. Returns null if not found — the
 * caller (route) decides whether that means "show New Customer flow". */
export async function findCustomerByVehicleNumber(rawVehicleNumber: string): Promise<CustomerWithSummary | null> {
  const vehicleNumber = normalizeVehicleNumber(rawVehicleNumber);
  const customer = await prisma.customer.findFirst({ where: { vehicleNumber, deletedAt: null } });
  if (!customer) return null;
  return recalculateCustomer(customer.id);
}

export interface CreateCustomerInput {
  vehicleNumber: string;
  mobileNumber: string;
  fuelType: FuelType;
}

/** Creates a new, OTP-verified customer. Must only be called after OTP
 * verification has succeeded (enforced by the route layer). */
export async function createCustomer(input: CreateCustomerInput): Promise<CustomerWithSummary> {
  const vehicleNumber = normalizeVehicleNumber(input.vehicleNumber);
  const mobileNumber = normalizeMobileNumber(input.mobileNumber);

  const existing = await prisma.customer.findFirst({ where: { vehicleNumber, deletedAt: null } });
  if (existing) {
    throw new AppError('DUPLICATE_CUSTOMER', 'A customer already exists for this vehicle number');
  }

  const customer = await prisma.customer.create({
    data: { vehicleNumber, mobileNumber, fuelType: input.fuelType, isVerified: true },
  });

  await auditLog({
    entityType: 'CUSTOMER',
    entityId: customer.id,
    action: 'CREATE',
    newValue: { vehicleNumber, mobileNumber, fuelType: input.fuelType },
  });

  const rule = await getFuelRule(input.fuelType);
  const totals = calculateCustomerTotals([], rule);
  const summary = calculateAvailableCashback(totals, '0');
  return toCustomerWithSummary(customer, summary);
}

export interface CustomerListFilters {
  vehicleNumber?: string;
  mobileNumber?: string;
  fuelType?: FuelType;
  eligibleOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export async function listCustomers(filters: CustomerListFilters) {
  const page = filters.page ?? 1;
  const pageSize = Math.min(filters.pageSize ?? 20, 100);

  const where: any = { deletedAt: null };
  if (filters.vehicleNumber) where.vehicleNumber = { contains: normalizeVehicleNumber(filters.vehicleNumber) };
  if (filters.mobileNumber) where.mobileNumber = { contains: filters.mobileNumber.replace(/\D/g, '') };
  if (filters.fuelType) where.fuelType = filters.fuelType;
  if (filters.eligibleOnly) where.availableCashback = { gt: 0 };

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    total,
    page,
    pageSize,
    customers: customers.map((c) =>
      toCustomerWithSummary(c, {
        totalLitres: c.totalLitres.toString(),
        cashbackGenerated: c.cashbackGenerated.toString(),
        eligible: Number(c.totalLitres) > 0,
        cashbackRedeemed: c.cashbackRedeemed.toString(),
        availableCashback: c.availableCashback.toString(),
      })
    ),
  };
}

export async function getCustomerById(id: string): Promise<CustomerWithSummary> {
  return recalculateCustomer(id);
}

export interface UpdateCustomerInput {
  vehicleNumber?: string;
  mobileNumber?: string;
  fuelType?: FuelType;
}

export async function updateCustomer(
  id: string,
  input: UpdateCustomerInput,
  adminUserId: string,
  reason?: string
): Promise<CustomerWithSummary> {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new AppError('CUSTOMER_NOT_FOUND', 'Customer not found');

  const data: any = {};
  if (input.vehicleNumber) data.vehicleNumber = normalizeVehicleNumber(input.vehicleNumber);
  if (input.mobileNumber) data.mobileNumber = normalizeMobileNumber(input.mobileNumber);
  if (input.fuelType) data.fuelType = input.fuelType;

  const updated = await prisma.customer.update({ where: { id }, data });

  await auditLog({
    adminUserId,
    entityType: 'CUSTOMER',
    entityId: id,
    action: 'UPDATE',
    oldValue: { vehicleNumber: existing.vehicleNumber, mobileNumber: existing.mobileNumber, fuelType: existing.fuelType },
    newValue: data,
    reason,
  });

  // Fuel type change affects which rule/threshold applies — recalculate.
  return recalculateCustomer(updated.id);
}

export async function softDeleteCustomer(id: string, adminUserId: string, reason?: string): Promise<void> {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new AppError('CUSTOMER_NOT_FOUND', 'Customer not found');

  await prisma.customer.update({
    where: { id },
    data: { deletedAt: new Date(), deletedBy: adminUserId },
  });

  await auditLog({
    adminUserId,
    entityType: 'CUSTOMER',
    entityId: id,
    action: 'DELETE',
    oldValue: { vehicleNumber: existing.vehicleNumber },
    reason,
  });
}
