import { db } from "./db";
import { sql } from "drizzle-orm";

/**
 * Database Indexing and Optimization Management
 * 
 * This module manages database indexes for production performance optimization.
 * Indexes are created using raw SQL for precise control over performance characteristics.
 */

// Index creation utility with error handling
async function createIndexSafely(indexSql: string, indexName: string): Promise<void> {
  try {
    await db.execute(sql.raw(indexSql));
    console.log(`✅ Index created: ${indexName}`);
  } catch (error: any) {
    if (error.message?.includes('already exists') || error.message?.includes('relation') && error.message?.includes('already exists')) {
      console.log(`ℹ️  Index already exists: ${indexName}`);
    } else {
      console.error(`❌ Failed to create index ${indexName}:`, error.message);
      // Don't throw to allow application to continue if index creation fails
      console.warn(`⚠️  Continuing without index ${indexName}`);
    }
  }
}

/**
 * Validate that a table exists in the database schema
 */
async function validateTableExists(tableName: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      ) as exists
    `);
    
    return result.rows[0]?.exists === true;
  } catch (error) {
    console.error(`Failed to validate table ${tableName}:`, error);
    return false;
  }
}

/**
 * Create all performance-critical database indexes
 * Focuses on the most commonly queried columns based on API usage patterns
 */
export async function createDatabaseIndexes(): Promise<void> {
  console.log('🔧 Creating database indexes for production performance...');

  // Define allowed tables for security (whitelist approach)
  const allowedTables = [
    'equipment_telemetry', 'edge_heartbeats', 'devices', 'alert_notifications',
    'alert_configurations', 'work_orders', 'maintenance_schedules', 'pdm_score_logs',
    'sensor_configurations', 'sensor_states', 'crew_assignments', 'crew_leave',
    'crew_rest_sheet', 'crew_rest_day'
  ];

  const indexes = [
    // Telemetry indexes - Critical for real-time monitoring
    {
      name: 'idx_equipment_telemetry_equipment_sensor_ts',
      sql: `CREATE INDEX IF NOT EXISTS idx_equipment_telemetry_equipment_sensor_ts 
            ON equipment_telemetry (equipment_id, sensor_type, ts DESC)`
    },
    {
      name: 'idx_equipment_telemetry_ts',
      sql: `CREATE INDEX IF NOT EXISTS idx_equipment_telemetry_ts 
            ON equipment_telemetry (ts DESC)`
    },
    {
      name: 'idx_equipment_telemetry_equipment_id',
      sql: `CREATE INDEX IF NOT EXISTS idx_equipment_telemetry_equipment_id 
            ON equipment_telemetry (equipment_id)`
    },

    // Device and heartbeat indexes
    {
      name: 'idx_edge_heartbeats_equipment_id_ts',
      sql: `CREATE INDEX IF NOT EXISTS idx_edge_heartbeats_equipment_id_ts 
            ON edge_heartbeats (equipment_id, ts DESC)`
    },
    {
      name: 'idx_devices_org_id',
      sql: `CREATE INDEX IF NOT EXISTS idx_devices_org_id 
            ON devices (org_id)`
    },

    // Alert indexes - Critical for alert management
    {
      name: 'idx_alert_notifications_equipment_acknowledged',
      sql: `CREATE INDEX IF NOT EXISTS idx_alert_notifications_equipment_acknowledged 
            ON alert_notifications (equipment_id, acknowledged, created_at DESC)`
    },
    {
      name: 'idx_alert_notifications_created_at',
      sql: `CREATE INDEX IF NOT EXISTS idx_alert_notifications_created_at 
            ON alert_notifications (created_at DESC)`
    },
    {
      name: 'idx_alert_configurations_equipment_enabled',
      sql: `CREATE INDEX IF NOT EXISTS idx_alert_configurations_equipment_enabled 
            ON alert_configurations (equipment_id, enabled)`
    },

    // Work order indexes
    {
      name: 'idx_work_orders_equipment_status',
      sql: `CREATE INDEX IF NOT EXISTS idx_work_orders_equipment_status 
            ON work_orders (equipment_id, status)`
    },
    {
      name: 'idx_work_orders_created_at',
      sql: `CREATE INDEX IF NOT EXISTS idx_work_orders_created_at 
            ON work_orders (created_at DESC)`
    },

    // Maintenance schedule indexes
    {
      name: 'idx_maintenance_schedules_equipment_due_date',
      sql: `CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_equipment_due_date 
            ON maintenance_schedules (equipment_id, due_date ASC)`
    },
    {
      name: 'idx_maintenance_schedules_due_date',
      sql: `CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_due_date 
            ON maintenance_schedules (due_date ASC)`
    },

    // Health and performance indexes
    {
      name: 'idx_pdm_score_logs_equipment_ts',
      sql: `CREATE INDEX IF NOT EXISTS idx_pdm_score_logs_equipment_ts 
            ON pdm_score_logs (equipment_id, ts DESC)`
    },

    // Sensor configuration indexes
    {
      name: 'idx_sensor_configurations_equipment_sensor',
      sql: `CREATE INDEX IF NOT EXISTS idx_sensor_configurations_equipment_sensor 
            ON sensor_configurations (equipment_id, sensor_type)`
    },
    {
      name: 'idx_sensor_states_equipment_sensor',
      sql: `CREATE INDEX IF NOT EXISTS idx_sensor_states_equipment_sensor 
            ON sensor_states (equipment_id, sensor_type)`
    },

    // Crew and scheduling indexes
    {
      name: 'idx_crew_assignments_crew_shift_date',
      sql: `CREATE INDEX IF NOT EXISTS idx_crew_assignments_crew_shift_date 
            ON crew_assignments (crew_id, shift_date)`
    },
    {
      name: 'idx_crew_leave_crew_dates',
      sql: `CREATE INDEX IF NOT EXISTS idx_crew_leave_crew_dates 
            ON crew_leave (crew_id, start_date, end_date)`
    },

    // STCW compliance indexes
    {
      name: 'idx_crew_rest_sheet_crew_work_date',
      sql: `CREATE INDEX IF NOT EXISTS idx_crew_rest_sheet_crew_work_date 
            ON crew_rest_sheet (crew_id, work_date DESC)`
    },
    {
      name: 'idx_crew_rest_day_crew_date',
      sql: `CREATE INDEX IF NOT EXISTS idx_crew_rest_day_crew_date 
            ON crew_rest_day (crew_id, rest_date DESC)`
    }
  ];

  // Validate tables exist before creating indexes
  const validIndexes = [];
  for (const index of indexes) {
    // Extract table name from SQL for validation
    const tableMatch = index.sql.match(/ON\s+(\w+)\s*\(/i);
    const tableName = tableMatch?.[1];
    
    if (!tableName) {
      console.warn(`⚠️  Could not extract table name from: ${index.name}`);
      continue;
    }
    
    if (!allowedTables.includes(tableName)) {
      console.warn(`⚠️  Table ${tableName} not in allowlist, skipping index ${index.name}`);
      continue;
    }
    
    const tableExists = await validateTableExists(tableName);
    if (tableExists) {
      validIndexes.push(index);
    } else {
      console.warn(`⚠️  Table ${tableName} does not exist, skipping index ${index.name}`);
    }
  }

  // Create indexes sequentially to avoid lock contention
  for (const index of validIndexes) {
    await createIndexSafely(index.sql, index.name);
  }

  console.log(`✅ Database indexes created successfully (${validIndexes.length}/${indexes.length})`);
}

/**
 * Analyze database performance and provide recommendations
 */
export async function analyzeDatabasePerformance(): Promise<void> {
  console.log('📊 Analyzing database performance...');

  try {
    // Get table sizes
    const tableSizes = await db.execute(sql.raw(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 10
    `));

    console.log('📊 Largest tables:');
    tableSizes.rows.forEach((row: any) => {
      console.log(`  ${row.tablename}: ${row.size}`);
    });

    // Get index usage statistics
    const indexStats = await db.execute(sql.raw(`
      SELECT 
        indexrelname as index_name,
        relname as table_name,
        idx_scan as times_used,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size
      FROM pg_stat_user_indexes 
      ORDER BY idx_scan DESC
      LIMIT 10
    `));

    console.log('📊 Most used indexes:');
    indexStats.rows.forEach((row: any) => {
      console.log(`  ${row.index_name} (${row.table_name}): ${row.times_used} scans, ${row.index_size}`);
    });

  } catch (error) {
    console.error('❌ Failed to analyze database performance:', error);
  }
}

/**
 * Database maintenance operations for production health
 */
export async function performDatabaseMaintenance(): Promise<void> {
  console.log('🔧 Performing database maintenance...');

  try {
    // Update table statistics for better query planning
    await db.execute(sql.raw('ANALYZE'));
    console.log('✅ Database statistics updated');

    // Check for unused indexes (in production, this would run periodically)
    const unusedIndexes = await db.execute(sql.raw(`
      SELECT 
        indexrelname as index_name,
        relname as table_name,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size
      FROM pg_stat_user_indexes 
      WHERE idx_scan = 0
      AND indexrelname NOT LIKE '%_pkey'
      ORDER BY pg_relation_size(indexrelid) DESC
    `));

    if (unusedIndexes.rows.length > 0) {
      console.log('⚠️  Unused indexes detected:');
      unusedIndexes.rows.forEach((row: any) => {
        console.log(`  ${row.index_name} (${row.table_name}): ${row.index_size}`);
      });
    }

  } catch (error) {
    console.error('❌ Database maintenance failed:', error);
  }
}