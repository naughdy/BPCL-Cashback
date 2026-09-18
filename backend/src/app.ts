import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './lib/logger';
import { authRouter } from './routes/auth.routes';
import { customerRouter } from './routes/customer.routes';
import { transactionRouter } from './routes/transaction.routes';
import { otpRouter } from './routes/otp.routes';
import { redemptionRouter } from './routes/redemption.routes';
import { dashboardRouter } from './routes/dashboard.routes';
import { auditRouter } from './routes/audit.routes';
import { exportRouter } from './routes/export.routes';
import { settingsRouter } from './routes/settings.routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json({ limit: '1mb' }));
  app.use(pinoHttp({ logger }));

  app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

  app.use('/api/auth', authRouter);
  app.use('/api/customers', customerRouter);
  app.use('/api/transactions', transactionRouter);
  app.use('/api/otp', otpRouter);
  app.use('/api/redemptions', redemptionRouter);
  app.use('/api/admin', dashboardRouter);
  app.use('/api/admin', auditRouter);
  app.use('/api/admin', exportRouter);
  app.use('/api/admin', settingsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
