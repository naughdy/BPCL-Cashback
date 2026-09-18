import { Router } from 'express';
import { z } from 'zod';
import { addFuelTransaction, listTransactions, getTransactionById, updateTransaction, softDeleteTransaction } from '../services/transaction.service';
import { validateBody } from '../middleware/validate.middleware';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

export const transactionRouter = Router();

const addSchema = z.object({
  customerId: z.string().uuid(),
  litres: z.string().min(1),
  idempotencyKey: z.string().optional(),
});

// Operator-facing (mobile ADD button).
transactionRouter.post(
  '/',
  validateBody(addSchema),
  asyncHandler(async (req, res) => {
    const result = await addFuelTransaction(req.body);
    res.status(201).json(result);
  })
);

transactionRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await listTransactions({
      customerId: req.query.customerId as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    });
    res.json(result);
  })
);

transactionRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const txn = await getTransactionById(req.params.id);
    res.json(txn);
  })
);

const updateSchema = z.object({
  litres: z.string().min(1).optional(),
  transactionDate: z.string().optional(),
  reason: z.string().optional(),
});

transactionRouter.put(
  '/:id',
  requireAuth,
  validateBody(updateSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { reason, ...input } = req.body;
    const customer = await updateTransaction(req.params.id, input, req.user!.id, reason);
    res.json(customer);
  })
);

transactionRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const customer = await softDeleteTransaction(req.params.id, req.user!.id, req.body?.reason);
    res.json(customer);
  })
);
