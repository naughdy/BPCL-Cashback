import pino from 'pino';
import { env } from '../config/env';

// PART 32: never log passwords, OTP plaintext, or auth tokens.
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.body.password',
  'req.body.otp',
  'req.body.otpCode',
  'res.body.token',
];

export const logger = pino({
  level: env.nodeEnv === 'production' ? 'info' : 'debug',
  redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
});
