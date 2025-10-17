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

const DATA_DIR = path.join(process.cwd(), "data");

/**
 * Initialize SQLite database with required tables
 */
export async function initializeSqliteDatabase() {
  console.log('[SQLite Init] Initializing vessel mode database...');

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const dbPath = path.join(DATA_DIR, "vessel-local.db");
  
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

    // Create vessels table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS vessels (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        name TEXT NOT NULL,
        imo TEXT,
        flag TEXT,
        vessel_type TEXT,
        vessel_class TEXT,
        condition TEXT DEFAULT 'good',
        online_status TEXT DEFAULT 'unknown',
        last_heartbeat INTEGER,
        dwt INTEGER,
        year_built INTEGER,
        active INTEGER DEFAULT 1,
        notes TEXT,
        day_rate_sgd REAL,
        downtime_days REAL DEFAULT 0,
        downtime_reset_at INTEGER,
        operation_days REAL DEFAULT 0,
        operation_reset_at INTEGER,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Create equipment table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS equipment (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        vessel_id TEXT,
        vessel_name TEXT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        manufacturer TEXT,
        model TEXT,
        serial_number TEXT,
        location TEXT,
        is_active INTEGER DEFAULT 1,
        specifications TEXT,
        operating_parameters TEXT,
        maintenance_schedule TEXT,
        emergency_labor_multiplier REAL,
        emergency_parts_multiplier REAL,
        emergency_downtime_multiplier REAL,
        created_at INTEGER,
        updated_at INTEGER,
        version INTEGER DEFAULT 1,
        last_modified_by TEXT,
        last_modified_device TEXT
      )
    `);

    // Create devices table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        equipment_id TEXT,
        label TEXT,
        vessel TEXT,
        buses TEXT,
        sensors TEXT,
        config TEXT,
        hmac_key TEXT,
        device_type TEXT DEFAULT 'generic',
        j1939_config TEXT,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Create equipment_telemetry table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS equipment_telemetry (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        ts INTEGER NOT NULL,
        equipment_id TEXT NOT NULL,
        sensor_type TEXT NOT NULL,
        value REAL NOT NULL,
        unit TEXT NOT NULL,
        threshold REAL,
        status TEXT NOT NULL DEFAULT 'normal'
      )
    `);

    // Create downtime_events table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS downtime_events (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        work_order_id TEXT,
        equipment_id TEXT,
        vessel_id TEXT,
        downtime_type TEXT NOT NULL,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        duration_hours REAL,
        reason TEXT,
        impact_level TEXT DEFAULT 'medium',
        revenue_impact REAL,
        opportunity_cost REAL,
        root_cause TEXT,
        preventable INTEGER,
        notes TEXT,
        created_at INTEGER,
        updated_at INTEGER
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

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_vessels_org 
      ON vessels(org_id)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_equipment_org 
      ON equipment(org_id)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_equipment_vessel 
      ON equipment(vessel_id)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_devices_org 
      ON devices(org_id)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_devices_equipment 
      ON devices(equipment_id)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_telemetry_org 
      ON equipment_telemetry(org_id)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_telemetry_equipment_ts 
      ON equipment_telemetry(equipment_id, ts)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_telemetry_sensor_ts 
      ON equipment_telemetry(sensor_type, ts)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_telemetry_status 
      ON equipment_telemetry(status)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_downtime_org 
      ON downtime_events(org_id)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_downtime_work_order 
      ON downtime_events(work_order_id)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_downtime_equipment 
      ON downtime_events(equipment_id)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_downtime_vessel 
      ON downtime_events(vessel_id)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_downtime_time 
      ON downtime_events(start_time)
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
  const dbPath = path.join(DATA_DIR, "vessel-local.db");
  
  if (!fs.existsSync(dbPath)) {
    return false;
  }

  try {
    const client = createClient({
      url: `file:${dbPath}`,
    });

    const db = drizzle(client);

    // Check if core tables exist (4 sync tables + 5 vessel operation tables = 9 total)
    const result = await db.get<{ count: number }>(sql`
      SELECT COUNT(*) as count 
      FROM sqlite_master 
      WHERE type='table' AND name IN (
        'organizations', 'users', 'sync_journal', 'sync_outbox',
        'vessels', 'equipment', 'devices', 'equipment_telemetry', 'downtime_events'
      )
    `);

    return result?.count === 9;
  } catch {
    return false;
  }
}
