/**
 * Shared audit logging utilities
 * Provides consistent audit trail across all domains
 */

import { recordAndPublish } from '../sync-events';

export interface AuditContext {
  userId?: string;
  orgId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Record an audit event with sync
 * Centralizes audit logging and event publishing
 */
export async function auditAction(
  entityType: string,
  entityId: string,
  action: 'create' | 'update' | 'delete',
  data: any,
  context?: AuditContext
): Promise<void> {
  await recordAndPublish(entityType, entityId, action, data, context?.userId);
}

/**
 * Extract audit context from Express request
 */
export function getAuditContext(req: any): AuditContext {
  return {
    userId: req.user?.id,
    orgId: req.headers['x-org-id'] as string,
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('user-agent')
  };
}
