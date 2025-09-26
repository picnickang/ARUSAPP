import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@shared/schema";

// Validate DATABASE_URL exists
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

// Configure Neon with optimized settings for production
const sql = neon(process.env.DATABASE_URL, {
  // Neon HTTP client optimization settings
  fetchConnectionCache: true, // Cache connections for better performance
  queryTimeout: 30000, // 30 second query timeout
});

// Configure drizzle with query logging for development
export const db = drizzle(sql, { 
  schema,
  logger: process.env.NODE_ENV === 'development' ? {
    logQuery: (query, params) => {
      const start = Date.now();
      return () => {
        const duration = Date.now() - start;
        if (duration > 1000) {
          console.warn(`[DB] Slow query (${duration}ms):`, query.slice(0, 100));
        }
      };
    }
  } : false
});