import { db } from '@db';
import { errorLogs } from '@shared/schema';
import { sql, and, lt } from 'drizzle-orm';

interface ErrorContext {
  userId?: string;
  url?: string;
  userAgent?: string;
  requestId?: string;
  method?: string;
  headers?: Record<string, string>;
  payload?: any;
  [key: string]: any;
}

interface LogErrorParams {
  orgId: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'frontend' | 'backend' | 'api' | 'database' | 'security' | 'performance';
  message: string;
  stackTrace?: string;
  context?: ErrorContext;
  errorCode?: string;
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_ERRORS_PER_MINUTE = 100;
const RATE_LIMIT_WINDOW = 60000; // 1 minute

const SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'x-api-key',
  'x-auth-token',
  'x-csrf-token',
];

const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'accessToken',
  'refreshToken',
  'sessionId',
];

function sanitizeContext(context?: ErrorContext): ErrorContext | undefined {
  if (!context) return undefined;

  const sanitized = { ...context };

  if (sanitized.headers) {
    sanitized.headers = { ...sanitized.headers };
    SENSITIVE_HEADERS.forEach(header => {
      if (sanitized.headers?.[header]) {
        sanitized.headers[header] = '[REDACTED]';
      }
      if (sanitized.headers?.[header.toLowerCase()]) {
        sanitized.headers[header.toLowerCase()] = '[REDACTED]';
      }
    });
  }

  if (sanitized.payload && typeof sanitized.payload === 'object') {
    sanitized.payload = sanitizeObject(sanitized.payload);
  }

  return sanitized;
}

function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function checkRateLimit(orgId: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(orgId);

  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(orgId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (limit.count >= MAX_ERRORS_PER_MINUTE) {
    return false;
  }

  limit.count++;
  return true;
}

export async function logError(params: LogErrorParams): Promise<void> {
  try {
    if (!checkRateLimit(params.orgId)) {
      console.warn(`Error logging rate limit exceeded for org ${params.orgId}`);
      return;
    }

    const sanitizedContext = sanitizeContext(params.context);

    await db.insert(errorLogs).values({
      orgId: params.orgId,
      severity: params.severity,
      category: params.category,
      message: params.message,
      stackTrace: params.stackTrace,
      context: sanitizedContext,
      errorCode: params.errorCode,
    });
  } catch (error) {
    console.error('Failed to log error:', error);
  }
}

export async function cleanupOldLogs(retentionDays: number = 30): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await db
      .delete(errorLogs)
      .where(lt(errorLogs.timestamp, cutoffDate));

    return result.rowCount || 0;
  } catch (error) {
    console.error('Failed to cleanup old logs:', error);
    throw error;
  }
}

export async function autoResolveOldErrors(daysOld: number = 7): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await db
      .update(errorLogs)
      .set({
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: 'auto-resolved',
      })
      .where(
        and(
          lt(errorLogs.timestamp, cutoffDate),
          sql`${errorLogs.resolved} = false`
        )
      );

    return result.rowCount || 0;
  } catch (error) {
    console.error('Failed to auto-resolve old errors:', error);
    throw error;
  }
}
