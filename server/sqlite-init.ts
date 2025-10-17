/**
 * SQLite Database Initialization for Vessel Mode
 * 
 * This script initializes the local SQLite database with the necessary
 * tables and structure for offline vessel deployments.
 */

import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { sql } from "drizzle-orm";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "vessel-data");

/**
 * Initialize SQLite database with required tables
 */
export async function initializeSqliteDatabase() {
  console.log('[SQLite Init] Initializing vessel mode database...');

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const dbPath = path.join(DATA_DIR, "arus-vessel.db");
  
  const client = createClient({
    url: `file:${dbPath}`,
  });

  const db = drizzle(client);

  try {
    // Create organizations table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        domain TEXT,
        billing_email TEXT,
        max_users INTEGER DEFAULT 50,
        max_equipment INTEGER DEFAULT 1000,
        subscription_tier TEXT NOT NULL DEFAULT 'basic',
        is_active INTEGER DEFAULT 1,
        emergency_labor_multiplier INTEGER DEFAULT 3,
        emergency_parts_multiplier REAL DEFAULT 1.5,
        emergency_downtime_multiplier INTEGER DEFAULT 3,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Create users table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        email TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'viewer',
        is_active INTEGER DEFAULT 1,
        last_login_at INTEGER,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Create sync_journal table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS sync_journal (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload TEXT,
        user_id TEXT,
        sync_status TEXT DEFAULT 'pending',
        created_at INTEGER
      )
    `);

    // Create sync_outbox table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS sync_outbox (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        payload TEXT,
        processed INTEGER DEFAULT 0,
        processing_attempts INTEGER DEFAULT 0,
        created_at INTEGER,
        processed_at INTEGER
      )
    `);

    // Create indexes for better performance
    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_sync_journal_entity 
      ON sync_journal(entity_type, entity_id)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_sync_journal_status 
      ON sync_journal(sync_status)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_sync_outbox_processed 
      ON sync_outbox(processed)
    `);

    console.log('[SQLite Init] Database initialized successfully at:', dbPath);
    return true;

  } catch (error) {
    console.error('[SQLite Init] Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Check if SQLite database is initialized
 */
export async function isSqliteDatabaseInitialized(): Promise<boolean> {
  const dbPath = path.join(DATA_DIR, "arus-vessel.db");
  
  if (!fs.existsSync(dbPath)) {
    return false;
  }

  try {
    const client = createClient({
      url: `file:${dbPath}`,
    });

    const db = drizzle(client);

    // Check if core tables exist
    const result = await db.get(sql`
      SELECT COUNT(*) as count 
      FROM sqlite_master 
      WHERE type='table' AND name IN ('organizations', 'users', 'sync_journal', 'sync_outbox')
    `);

    return result?.count === 4;
  } catch {
    return false;
  }
}
