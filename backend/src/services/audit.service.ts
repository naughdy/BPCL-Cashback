import { AuditAction, AuditEntityType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

export interface AuditLogInput {
  adminUserId?: string | null;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
}

/** Records an audit entry. Never throws — auditing must never block the
 * primary business operation, but a failure is logged loudly. */
export async function auditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        adminUserId: input.adminUserId ?? null,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        oldValue: input.oldValue === undefined ? undefined : (input.oldValue as any),
        newValue: input.newValue === undefined ? undefined : (input.newValue as any),
        reason: input.reason,
      },
    });
  } catch (err) {
    logger.error({ err, input }, 'Failed to write audit log');
  }
}
