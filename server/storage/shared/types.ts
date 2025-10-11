/**
 * Shared types for storage layer domain repositories
 */

export interface BaseRepository {
  orgId: string;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface QueryFilter {
  [key: string]: any;
}
