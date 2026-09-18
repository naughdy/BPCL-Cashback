import ExcelJS from 'exceljs';
import { prisma } from '../lib/prisma';
import { CustomerListFilters } from './customer.service';
import { normalizeVehicleNumber } from '../lib/normalize';

async function workbookToBuffer(workbook: ExcelJS.Workbook): Promise<Buffer> {
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export async function exportCustomersToExcel(filters: CustomerListFilters): Promise<Buffer> {
  const where: any = { deletedAt: null };
  if (filters.vehicleNumber) where.vehicleNumber = { contains: normalizeVehicleNumber(filters.vehicleNumber) };
  if (filters.mobileNumber) where.mobileNumber = { contains: filters.mobileNumber.replace(/\D/g, '') };
  if (filters.fuelType) where.fuelType = filters.fuelType;

  const customers = await prisma.customer.findMany({ where, orderBy: { createdAt: 'desc' } });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BPCL Fuel Cashback System';
  const sheet = workbook.addWorksheet('Customers');

  sheet.columns = [
    { header: 'Customer ID', key: 'id', width: 38 },
    { header: 'Vehicle Number', key: 'vehicleNumber', width: 18 },
    { header: 'Mobile Number', key: 'mobileNumber', width: 16 },
    { header: 'Fuel Type', key: 'fuelType', width: 12 },
    { header: 'Total Litres', key: 'totalLitres', width: 14 },
    { header: 'Cashback Generated', key: 'cashbackGenerated', width: 18 },
    { header: 'Cashback Redeemed', key: 'cashbackRedeemed', width: 18 },
    { header: 'Available Cashback', key: 'availableCashback', width: 18 },
    { header: 'Created Date', key: 'createdAt', width: 22 },
    { header: 'Updated Date', key: 'updatedAt', width: 22 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const c of customers) {
    sheet.addRow({
      id: c.id,
      vehicleNumber: c.vehicleNumber,
      mobileNumber: c.mobileNumber,
      fuelType: c.fuelType,
      totalLitres: c.totalLitres.toString(),
      cashbackGenerated: c.cashbackGenerated.toString(),
      cashbackRedeemed: c.cashbackRedeemed.toString(),
      availableCashback: c.availableCashback.toString(),
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    });
  }

  return workbookToBuffer(workbook);
}

export async function exportTransactionsToExcel(filters: { customerId?: string }): Promise<Buffer> {
  const where: any = { deletedAt: null };
  if (filters.customerId) where.customerId = filters.customerId;

  const transactions = await prisma.fuelTransaction.findMany({
    where,
    orderBy: { transactionDate: 'desc' },
    include: { customer: true },
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Transactions');
  sheet.columns = [
    { header: 'Transaction ID', key: 'id', width: 38 },
    { header: 'Customer ID', key: 'customerId', width: 38 },
    { header: 'Vehicle Number', key: 'vehicleNumber', width: 18 },
    { header: 'Mobile Number', key: 'mobileNumber', width: 16 },
    { header: 'Fuel Type', key: 'fuelType', width: 12 },
    { header: 'Litres', key: 'litres', width: 12 },
    { header: 'Cashback Generated', key: 'cashbackGenerated', width: 18 },
    { header: 'Transaction Date', key: 'transactionDate', width: 22 },
    { header: 'Created Date', key: 'createdAt', width: 22 },
    { header: 'Status', key: 'status', width: 12 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const t of transactions) {
    sheet.addRow({
      id: t.id,
      customerId: t.customerId,
      vehicleNumber: t.vehicleNumberSnapshot,
      mobileNumber: t.customer.mobileNumber,
      fuelType: t.fuelTypeSnapshot,
      litres: t.litres.toString(),
      cashbackGenerated: t.cashbackGenerated.toString(),
      transactionDate: t.transactionDate.toISOString(),
      createdAt: t.createdAt.toISOString(),
      status: t.status,
    });
  }

  return workbookToBuffer(workbook);
}

export async function exportRedemptionsToExcel(filters: { customerId?: string }): Promise<Buffer> {
  const where: any = { deletedAt: null };
  if (filters.customerId) where.customerId = filters.customerId;

  const redemptions = await prisma.redemption.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { customer: true },
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Redemptions');
  sheet.columns = [
    { header: 'Redemption ID', key: 'id', width: 38 },
    { header: 'Customer ID', key: 'customerId', width: 38 },
    { header: 'Vehicle Number', key: 'vehicleNumber', width: 18 },
    { header: 'Mobile Number', key: 'mobileNumber', width: 16 },
    { header: 'Amount', key: 'amount', width: 12 },
    { header: 'Status', key: 'status', width: 16 },
    { header: 'Reference Number', key: 'referenceNumber', width: 24 },
    { header: 'Created Date', key: 'createdAt', width: 22 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const r of redemptions) {
    sheet.addRow({
      id: r.id,
      customerId: r.customerId,
      vehicleNumber: r.customer.vehicleNumber,
      mobileNumber: r.customer.mobileNumber,
      amount: r.amount.toString(),
      status: r.status,
      referenceNumber: r.referenceNumber,
      createdAt: r.createdAt.toISOString(),
    });
  }

  return workbookToBuffer(workbook);
}
