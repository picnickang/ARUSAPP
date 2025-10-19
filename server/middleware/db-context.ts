/**
 * Database Context Middleware for Row-Level Security
 * Sets the current organization ID in the database session
 * This enables PostgreSQL Row-Level Security policies to enforce multi-tenant isolation
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';

export interface DbContextRequest extends Request {
  orgId?: string;
  user?: {
    id: string;
    orgId: string;
    email: string;
    role: string;
    name?: string;
    isActive: boolean;
  };
}

/**
 * Sets the organization context in the database session for RLS enforcement
 * Must be applied AFTER authentication middleware that sets req.user
 */
export async function setDatabaseContext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = (req as DbContextRequest).user;
    const orgId = (req as DbContextRequest).orgId || user?.orgId;

    if (orgId) {
      // Set the organization ID in the PostgreSQL session
      // This enables Row-Level Security policies to filter by org
      // Note: SET commands don't support parameterized queries, so we use sql.raw
      // orgId is validated by auth middleware, so this is safe
      await db.execute(sql.raw(`SET LOCAL app.current_org_id = '${orgId}'`));
      
      // Log for debugging (remove in production)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DB_CONTEXT] Set org context: ${orgId} for ${req.path}`);
      }
    }

    next();
  } catch (error) {
    console.error('[DB_CONTEXT] Error setting database context:', error);
    // Don't block the request, but log the error
    next();
  }
}

/**
 * Resets the database context after request completion
 * This ensures isolation between requests in connection pooling scenarios
 */
export async function resetDatabaseContext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Reset the session variable
    await db.execute(sql.raw(`RESET app.current_org_id`));
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DB_CONTEXT] Reset org context for ${req.path}`);
    }
  } catch (error) {
    console.error('[DB_CONTEXT] Error resetting database context:', error);
  }
  
  next();
}

/**
 * Combined middleware that ensures database context is set and cleaned up
 */
export function withDatabaseContext(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Set context before request
  setDatabaseContext(req, res, () => {
    // Clean up after response
    res.on('finish', async () => {
      try {
        await db.execute(sql.raw(`RESET app.current_org_id`));
      } catch (error) {
        console.error('[DB_CONTEXT] Error in cleanup:', error);
      }
    });
    next();
  });
}
