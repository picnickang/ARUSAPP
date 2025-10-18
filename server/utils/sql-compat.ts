/**
 * SQL Compatibility Layer
 * Provides database-agnostic query helpers for PostgreSQL and SQLite
 */

import { sql } from 'drizzle-orm';
import { isLocalMode } from '../db-config';

/**
 * Check if running in SQLite mode (vessel deployment)
 */
export function isSQLiteMode(): boolean {
  return isLocalMode();
}

/**
 * Get JSON extract expression for database type
 * PostgreSQL uses -> or ->> operators, SQLite uses json_extract()
 */
export function jsonExtract(column: string, path: string): any {
  if (isSQLiteMode()) {
    // SQLite: json_extract(column, '$.path')
    return sql`json_extract(${sql.raw(column)}, ${path})`;
  } else {
    // PostgreSQL: column->>'key' (key must be quoted)
    const key = path.replace('$.', '');
    return sql`${sql.raw(column)}->>${sql.literal(key)}`;
  }
}

/**
 * Get JSON array aggregate for database type
 * PostgreSQL uses jsonb_agg(), SQLite uses json_group_array()
 */
export function jsonArrayAgg(column: string): any {
  if (isSQLiteMode()) {
    return sql`json_group_array(${sql.raw(column)})`;
  } else {
    return sql`jsonb_agg(${sql.raw(column)})`;
  }
}

/**
 * Get JSON object aggregate for database type
 * PostgreSQL uses jsonb_build_object(), SQLite uses json_object()
 */
export function jsonBuildObject(pairs: Record<string, any>): any {
  const entries = Object.entries(pairs);
  
  if (isSQLiteMode()) {
    const args = entries.flatMap(([k, v]) => [sql.literal(k), v]);
    return sql`json_object(${sql.join(args, sql`, `)})`;
  } else {
    // PostgreSQL: keys must be SQL string literals
    const args = entries.flatMap(([k, v]) => [sql.literal(k), v]);
    return sql`jsonb_build_object(${sql.join(args, sql`, `)})`;
  }
}

/**
 * Convert JSONB column type for database
 * PostgreSQL uses jsonb, SQLite uses text with JSON validation
 */
export function getJSONColumnType(): 'jsonb' | 'text' {
  return isSQLiteMode() ? 'text' : 'jsonb';
}

/**
 * Get timestamp column type for database
 * PostgreSQL uses timestamp, SQLite uses integer (Unix epoch)
 */
export function getTimestampColumnType(): 'timestamp' | 'integer' {
  return isSQLiteMode() ? 'integer' : 'timestamp';
}

/**
 * CTE (Common Table Expression) compatibility check
 * SQLite has limited CTE support in older versions
 */
export function supportsCTE(): boolean {
  // Both PostgreSQL and modern SQLite support CTEs
  return true;
}

/**
 * Convert timestamp for database storage
 */
export function convertTimestamp(date: Date): number | Date {
  if (isSQLiteMode()) {
    return date.getTime(); // Unix timestamp for SQLite
  }
  return date; // Native timestamp for PostgreSQL
}

/**
 * Parse timestamp from database
 */
export function parseTimestamp(value: number | Date | string): Date {
  if (typeof value === 'number') {
    return new Date(value); // SQLite Unix timestamp
  }
  if (value instanceof Date) {
    return value; // PostgreSQL Date object
  }
  return new Date(value); // String ISO date
}
