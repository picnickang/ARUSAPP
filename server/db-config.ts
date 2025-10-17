import { drizzle as drizzlePg } from "drizzle-orm/neon-serverless";
import { drizzle as drizzleSqlite } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "@shared/schema";
import * as schemaSqliteSync from "@shared/schema-sqlite-sync";
import path from "path";
import fs from "fs";

/**
 * Database Configuration for Dual-Mode Deployment
 * 
 * ARCHITECTURE NOTES:
 * - Cloud Mode (LOCAL_MODE=false): Uses PostgreSQL via Neon with full schema support
 * - Vessel Mode (LOCAL_MODE=true): Uses SQLite via libSQL/Turso for offline-first operation
 * 
 * IMPORTANT SCHEMA COMPATIBILITY:
 * The current schema (shared/schema.ts) uses PostgreSQL-specific types that are NOT
 * compatible with SQLite:
 * - jsonb columns → SQLite needs TEXT to store JSON
 * - serial auto-increment → SQLite needs INTEGER PRIMARY KEY AUTOINCREMENT  
 * - .array() columns → SQLite needs TEXT to store JSON arrays
 * 
 * For vessel mode to work, the schema must be refactored to use SQLite-compatible types,
 * or a separate SQLite schema must be maintained alongside the PostgreSQL schema.
 * 
 * Current Status:
 * ✅ Cloud Mode: Fully operational with PostgreSQL
 * ⚠️  Vessel Mode: Infrastructure ready, schema migration required
 */

// Configure WebSocket for Neon serverless (required for transaction support)
neonConfig.webSocketConstructor = ws;

// Deployment mode configuration
export const isLocalMode = process.env.LOCAL_MODE === 'true';
export const deploymentMode = isLocalMode ? 'VESSEL (Offline-First)' : 'CLOUD (Online)';

console.log(`\n=== Database Configuration ===`);
console.log(`Deployment Mode: ${deploymentMode}`);

// Cloud PostgreSQL Database (Shore office / always-online deployments)
let pgPool: Pool | null = null;
let cloudDatabase: ReturnType<typeof drizzlePg> | null = null;

if (!isLocalMode) {
  // Validate DATABASE_URL exists for cloud mode
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is required for cloud mode');
    process.exit(1);
  }

  // Configure Neon Pool for transaction support and better performance
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,                      // Increased from default 10 (DB supports 450 max)
    idleTimeoutMillis: 60000,     // 60s idle timeout (increased from 30s default)
    connectionTimeoutMillis: 5000 // 5s connection timeout (prevent hanging)
  });

  // Configure drizzle with transaction support and query logging for development
  cloudDatabase = drizzlePg(pgPool, {
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

  console.log('✓ Cloud PostgreSQL: Connected');
}

// Local SQLite Database with Cloud Sync (Vessel / offline deployments)
let localClient: ReturnType<typeof createClient> | null = null;
let localDatabase: ReturnType<typeof drizzleSqlite> | null = null;

if (isLocalMode) {
  // Create data directory if it doesn't exist
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('✓ Created data directory:', dataDir);
  }

  const localDbPath = path.join(dataDir, 'vessel-local.db');

  // Validate Turso configuration for sync
  const hasSyncUrl = !!process.env.TURSO_SYNC_URL;
  const hasAuthToken = !!process.env.TURSO_AUTH_TOKEN;

  if (hasSyncUrl && hasAuthToken) {
    console.log('✓ Turso Sync: Enabled');
    
    // Create libSQL client with cloud sync
    localClient = createClient({
      url: `file:${localDbPath}`,
      syncUrl: process.env.TURSO_SYNC_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
      syncInterval: 60,  // Auto-sync every 60 seconds when online
      encryptionKey: process.env.LOCAL_DB_KEY, // Optional encryption at rest
    });
  } else {
    console.warn('⚠ Turso Sync: Disabled (credentials not configured)');
    console.warn('  Running in offline-only mode without cloud sync');
    console.warn('  Set TURSO_SYNC_URL and TURSO_AUTH_TOKEN to enable sync');
    
    // Create local-only libSQL client (no sync)
    localClient = createClient({
      url: `file:${localDbPath}`,
    });
  }

  // Configure drizzle for SQLite with SQLite-compatible schema
  // NOTE: Currently using SQLite sync schema for critical sync tables only
  // Full vessel mode requires complete SQLite schema migration (185+ tables)
  localDatabase = drizzleSqlite(localClient, { schema: schemaSqliteSync });
  console.log(`✓ Local SQLite: ${localDbPath}`);
  
  // Initialize SQLite database with required tables if needed
  const { initializeSqliteDatabase, isSqliteDatabaseInitialized } = await import('./sqlite-init');
  const isInitialized = await isSqliteDatabaseInitialized();
  
  if (!isInitialized) {
    console.log('→ Initializing SQLite database tables...');
    await initializeSqliteDatabase();
    console.log('✓ SQLite tables initialized');
  } else {
    console.log('✓ SQLite tables verified');
  }
  
  // Perform initial sync if sync is enabled
  if (hasSyncUrl && hasAuthToken) {
    try {
      await localClient.sync();
      console.log('✓ Initial sync completed');
    } catch (error) {
      console.warn('⚠ Initial sync failed (will retry):', error instanceof Error ? error.message : 'Unknown error');
      console.warn('  Application will continue with local data');
    }
  }
}

console.log('==============================\n');

// Export the appropriate database instance based on mode
export const db = (isLocalMode ? localDatabase : cloudDatabase)!;
export const pool = pgPool;
export const libsqlClient = localClient;

// Type-safe database instance
export type Database = typeof db;
