import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { login, getCurrentUser } from '../services/auth.service';
import { validateBody } from '../middleware/validate.middleware';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many login attempts, try again later' } },
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  '/login',
  loginLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await login(email, password);
    res.json(result);
  })
);

authRouter.post('/logout', requireAuth, (_req, res) => {
  // Stateless JWT — logout is a client-side token discard. Endpoint kept for
  // API symmetry / future token-blacklist support.
  res.status(204).send();
});

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const user = await getCurrentUser(req.user!.id);
    res.json(user);
  })
);
