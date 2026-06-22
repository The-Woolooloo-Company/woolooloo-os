import crypto from 'crypto';

// Audit log entries (use database in production)
interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  ipAddress: string;
  createdAt: string;
}

const auditLogs: AuditEntry[] = [];

/**
 * Create an audit log entry.
 */
export function createAuditLog(
  userId: string,
  action: string,
  resource: string,
  details: Record<string, any> = {},
  ipAddress: string = 'unknown'
): void {
  auditLogs.push({
    id: crypto.randomUUID(),
    userId,
    action,
    resource,
    details,
    ipAddress,
    createdAt: new Date().toISOString(),
  });

  // In production: write to database
  console.log(`[Audit] ${userId} ${action} ${resource}`);
}

/**
 * Get audit logs (paginated).
 */
export function getAuditLogs(limit: number = 100, offset: number = 0): AuditEntry[] {
  return auditLogs.slice(offset, offset + limit);
}
