import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { AppError } from '../lib/errors';
import { auditLog } from './audit.service';

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: string;
}

export async function login(email: string, password: string): Promise<{ token: string; user: { id: string; name: string; email: string; role: string } }> {
  const user = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.isActive) {
    throw new AppError('UNAUTHORIZED', 'Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError('UNAUTHORIZED', 'Invalid email or password');
  }

  const payload: AuthTokenPayload = { sub: user.id, email: user.email, role: user.role };
  const token = jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as any });

  await auditLog({ adminUserId: user.id, entityType: 'ADMIN_USER', entityId: user.id, action: 'LOGIN' });

  return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function verifyToken(token: string): AuthTokenPayload {
  try {
    return jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
  } catch {
    throw new AppError('UNAUTHORIZED', 'Invalid or expired session');
  }
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.adminUser.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) throw new AppError('UNAUTHORIZED', 'Session invalid');
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
