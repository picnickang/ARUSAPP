/**
 * Shared utility functions for storage operations
 */
import { sql } from 'drizzle-orm';

export function generateUUID(): string {
  return crypto.randomUUID();
}

export function buildOrderBy(orderBy?: string, direction: 'asc' | 'desc' = 'desc') {
  if (!orderBy) return undefined;
  return direction === 'asc' ? sql`${orderBy} ASC` : sql`${orderBy} DESC`;
}

export function applyPagination(limit?: number, offset?: number) {
  return {
    limit: limit || 100,
    offset: offset || 0,
  };
}
