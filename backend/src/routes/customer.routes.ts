import { Router } from 'express';
import { z } from 'zod';
import {
  findCustomerByVehicleNumber,
  createCustomer,
  listCustomers,
  getCustomerById,
  updateCustomer,
  softDeleteCustomer,
} from '../services/customer.service';
import { listTransactions } from '../services/transaction.service';
import { validateBody } from '../middleware/validate.middleware';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

export const customerRouter = Router();

const searchSchema = z.object({ vehicleNumber: z.string().min(1) });

// Used by the mobile app at the vehicle-entry screen — no admin auth
// required, this is the operator-facing flow (secured separately via an
// operator/device token in production; omitted here for brevity per spec
// scope, see README "Operator auth" note).
customerRouter.post(
  '/search',
  validateBody(searchSchema),
  asyncHandler(async (req, res) => {
    const customer = await findCustomerByVehicleNumber(req.body.vehicleNumber);
    if (!customer) {
      return res.json({ found: false });
    }
    res.json({ found: true, customer });
  })
);

const createSchema = z.object({
  vehicleNumber: z.string().min(1),
  mobileNumber: z.string().min(1),
  fuelType: z.enum(['PETROL', 'DIESEL']),
  otpId: z.string().min(1),
  otpCode: z.string().min(1),
});

customerRouter.post(
  '/',
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    const { otpService } = await import('../services/otp');
    await otpService.verifyOtp(req.body.otpId, req.body.otpCode);

    const customer = await createCustomer({
      vehicleNumber: req.body.vehicleNumber,
      mobileNumber: req.body.mobileNumber,
      fuelType: req.body.fuelType,
    });
    res.status(201).json(customer);
  })
);

// Admin-only listing / detail / edit / delete below.
customerRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { vehicleNumber, mobileNumber, fuelType, eligibleOnly, page, pageSize } = req.query;
    const result = await listCustomers({
      vehicleNumber: vehicleNumber as string | undefined,
      mobileNumber: mobileNumber as string | undefined,
      fuelType: fuelType as any,
      eligibleOnly: eligibleOnly === 'true',
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    res.json(result);
  })
);

customerRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const customer = await getCustomerById(req.params.id);
    res.json(customer);
  })
);

customerRouter.get(
  '/:id/transactions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await listTransactions({ customerId: req.params.id, page: Number(req.query.page) || 1 });
    res.json(result);
  })
);

const updateSchema = z.object({
  vehicleNumber: z.string().min(1).optional(),
  mobileNumber: z.string().min(1).optional(),
  fuelType: z.enum(['PETROL', 'DIESEL']).optional(),
  reason: z.string().optional(),
});

customerRouter.put(
  '/:id',
  requireAuth,
  validateBody(updateSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { reason, ...input } = req.body;
    const customer = await updateCustomer(req.params.id, input, req.user!.id, reason);
    res.json(customer);
  })
);

customerRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await softDeleteCustomer(req.params.id, req.user!.id, req.body?.reason);
    res.status(204).send();
  })
);
