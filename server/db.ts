import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for Neon serverless (required for transaction support)
neonConfig.webSocketConstructor = ws;

// Validate DATABASE_URL exists
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

// Configure Neon Pool for transaction support and better performance
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Configure drizzle with transaction support and query logging for development
export const db = drizzle(pool, { 
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