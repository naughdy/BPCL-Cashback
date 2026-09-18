import { Router } from 'express';
import { exportCustomersToExcel, exportTransactionsToExcel, exportRedemptionsToExcel } from '../services/export.service';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { auditLog } from '../services/audit.service';

export const exportRouter = Router();

function sendXlsx(res: import('express').Response, buffer: Buffer, filename: string) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}

exportRouter.get(
  '/export/customers',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const buffer = await exportCustomersToExcel({
      vehicleNumber: req.query.vehicleNumber as string | undefined,
      mobileNumber: req.query.mobileNumber as string | undefined,
      fuelType: req.query.fuelType as any,
    });
    await auditLog({ adminUserId: req.user!.id, entityType: 'CUSTOMER', entityId: 'ALL', action: 'EXPORT' });
    sendXlsx(res, buffer, `customers-${Date.now()}.xlsx`);
  })
);

exportRouter.get(
  '/export/transactions',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const buffer = await exportTransactionsToExcel({ customerId: req.query.customerId as string | undefined });
    await auditLog({ adminUserId: req.user!.id, entityType: 'FUEL_TRANSACTION', entityId: 'ALL', action: 'EXPORT' });
    sendXlsx(res, buffer, `transactions-${Date.now()}.xlsx`);
  })
);

exportRouter.get(
  '/export/redemptions',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const buffer = await exportRedemptionsToExcel({ customerId: req.query.customerId as string | undefined });
    await auditLog({ adminUserId: req.user!.id, entityType: 'REDEMPTION', entityId: 'ALL', action: 'EXPORT' });
    sendXlsx(res, buffer, `redemptions-${Date.now()}.xlsx`);
  })
);
