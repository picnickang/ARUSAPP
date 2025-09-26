import pg from "pg";
const { Pool } = pg;
import { db } from "./db.js";
import { 
  telemetryRetentionPolicies, 
  dbSchemaVersion, 
  equipmentTelemetry,
  telemetryRollups 
} from "@shared/schema.js";
import { eq, sql, lt } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Database health monitoring
export interface DatabaseHealth {
  ok: boolean;
  engine: 'postgres' | 'neon';
  timescaledb: boolean;
  connectionPool: {
    total: number;
    idle: number;
    waiting: number;
  };
  tableCount: number;
  telemetryRecords: number;
  detail?: string;
}

export async function getDatabaseHealth(): Promise<DatabaseHealth> {
  let pool: Pool | null = null;
  
  try {
    // Create a pool for raw SQL operations
    pool = new Pool({ 
      connectionString: DATABASE_URL,
      statement_timeout: 10000,
      idleTimeoutMillis: 30000,
      max: 10
    });
    
    const client = await pool.connect();
    
    try {
      // Basic connectivity test
      await client.query("SELECT 1");
      
      // Check for TimescaleDB extension
      const timescaleCheck = await client.query(
        "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'timescaledb')"
      );
      const hasTimescale = timescaleCheck.rows[0]?.exists || false;
      
      // Pool statistics
      const poolStats = {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      };
      
      // Get table count
      const tableCountResult = await client.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      const tableCount = parseInt(tableCountResult.rows[0]?.count || "0");
      
      // Get telemetry record count (with timeout protection)
      let telemetryRecords = 0;
      try {
        const telemetryCountResult = await client.query(
          "SELECT COUNT(*) as count FROM equipment_telemetry"
        );
        telemetryRecords = parseInt(telemetryCountResult.rows[0]?.count || "0");
      } catch (e) {
        // Table might not exist yet, that's ok
        telemetryRecords = 0;
      }
      
      return {
        ok: true,
        engine: DATABASE_URL.includes('neon.tech') ? 'neon' : 'postgres',
        timescaledb: hasTimescale,
        connectionPool: poolStats,
        tableCount,
        telemetryRecords
      };
      
    } finally {
      client.release();
    }
    
  } catch (error: any) {
    return {
      ok: false,
      engine: DATABASE_URL.includes('neon.tech') ? 'neon' : 'postgres',
      timescaledb: false,
      connectionPool: { total: 0, idle: 0, waiting: 0 },
      tableCount: 0,
      telemetryRecords: 0,
      detail: error?.message || String(error)
    };
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// TimescaleDB management functions
export async function enableTimescaleDB(): Promise<{ success: boolean; message: string }> {
  let pool: Pool | null = null;
  
  try {
    pool = new Pool({ 
      connectionString: DATABASE_URL,
      statement_timeout: 30000,
      max: 5
    });
    
    const client = await pool.connect();
    
    try {
      await client.query("BEGIN");
      
      // Check if TimescaleDB extension exists
      const extensionCheck = await client.query(
        "SELECT EXISTS(SELECT 1 FROM pg_available_extensions WHERE name = 'timescaledb')"
      );
      
      if (!extensionCheck.rows[0]?.exists) {
        await client.query("ROLLBACK");
        return {
          success: false,
          message: "TimescaleDB extension is not available in this PostgreSQL instance"
        };
      }
      
      // Enable TimescaleDB extension
      await client.query("CREATE EXTENSION IF NOT EXISTS timescaledb");
      
      await client.query("COMMIT");
      
      return {
        success: true,
        message: "TimescaleDB extension enabled successfully"
      };
      
    } catch (error: any) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to enable TimescaleDB: ${error?.message || String(error)}`
    };
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

export async function createHypertable(): Promise<{ success: boolean; message: string }> {
  let pool: Pool | null = null;
  
  try {
    pool = new Pool({ 
      connectionString: DATABASE_URL,
      statement_timeout: 30000,
      max: 5
    });
    
    const client = await pool.connect();
    
    try {
      // Check if TimescaleDB is available
      const timescaleCheck = await client.query(
        "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'timescaledb')"
      );
      
      if (!timescaleCheck.rows[0]?.exists) {
        return {
          success: false,
          message: "TimescaleDB extension is not enabled. Enable it first."
        };
      }
      
      // Check if table is already a hypertable
      const hypertableCheck = await client.query(`
        SELECT EXISTS(
          SELECT 1 FROM _timescaledb_catalog.hypertable 
          WHERE table_name = 'equipment_telemetry'
        )
      `);
      
      if (hypertableCheck.rows[0]?.exists) {
        return {
          success: true,
          message: "equipment_telemetry is already a hypertable"
        };
      }
      
      // Convert to hypertable
      await client.query(`
        SELECT create_hypertable('equipment_telemetry', 'ts', if_not_exists => TRUE)
      `);
      
      return {
        success: true,
        message: "equipment_telemetry converted to hypertable successfully"
      };
      
    } finally {
      client.release();
    }
    
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to create hypertable: ${error?.message || String(error)}`
    };
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

export async function createContinuousAggregate(): Promise<{ success: boolean; message: string }> {
  let pool: Pool | null = null;
  
  try {
    pool = new Pool({ 
      connectionString: DATABASE_URL,
      statement_timeout: 60000,
      max: 5
    });
    
    const client = await pool.connect();
    
    try {
      // Check if continuous aggregate already exists
      const caggCheck = await client.query(`
        SELECT EXISTS(
          SELECT 1 FROM _timescaledb_catalog.continuous_agg 
          WHERE user_view_name = 'telemetry_5m_rollup'
        )
      `);
      
      if (caggCheck.rows[0]?.exists) {
        return {
          success: true,
          message: "Continuous aggregate telemetry_5m_rollup already exists"
        };
      }
      
      // Create continuous aggregate for 5-minute rollups
      await client.query(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_5m_rollup
        WITH (timescaledb.continuous) AS
        SELECT
          org_id,
          equipment_id,
          sensor_type,
          time_bucket(INTERVAL '5 minutes', ts) AS bucket,
          avg(value) AS avg_value,
          min(value) AS min_value,
          max(value) AS max_value,
          count(*) AS sample_count,
          mode() WITHIN GROUP (ORDER BY unit) AS unit
        FROM equipment_telemetry
        GROUP BY org_id, equipment_id, sensor_type, time_bucket(INTERVAL '5 minutes', ts), unit
      `);
      
      // Create refresh policy for continuous aggregate
      await client.query(`
        SELECT add_continuous_aggregate_policy('telemetry_5m_rollup',
          start_offset => INTERVAL '1 hour',
          end_offset => INTERVAL '5 minutes',
          schedule_interval => INTERVAL '5 minutes',
          if_not_exists => TRUE)
      `);
      
      return {
        success: true,
        message: "Continuous aggregate telemetry_5m_rollup created successfully with 5-minute refresh policy"
      };
      
    } finally {
      client.release();
    }
    
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to create continuous aggregate: ${error?.message || String(error)}`
    };
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// Retention management
export async function applyTelemetryRetention(): Promise<{ success: boolean; deletedRecords: number; message: string }> {
  try {
    // Get retention policy
    const policies = await db.select().from(telemetryRetentionPolicies).where(eq(telemetryRetentionPolicies.id, 1));
    
    if (policies.length === 0) {
      return {
        success: false,
        deletedRecords: 0,
        message: "No retention policy found. Create a policy first."
      };
    }
    
    const policy = policies[0];
    const retentionDays = policy.retentionDays || 365;
    
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    // Delete old telemetry records
    const result = await db.delete(equipmentTelemetry)
      .where(lt(equipmentTelemetry.ts, cutoffDate));
    
    const deletedRecords = result.rowCount || 0;
    
    return {
      success: true,
      deletedRecords,
      message: `Successfully deleted ${deletedRecords} telemetry records older than ${retentionDays} days`
    };
    
  } catch (error: any) {
    return {
      success: false,
      deletedRecords: 0,
      message: `Failed to apply retention policy: ${error?.message || String(error)}`
    };
  }
}

export async function getRetentionPolicy(): Promise<{ retentionDays: number; rollupEnabled: boolean; compressionEnabled: boolean } | null> {
  try {
    const policies = await db.select().from(telemetryRetentionPolicies).where(eq(telemetryRetentionPolicies.id, 1));
    
    if (policies.length === 0) {
      return null;
    }
    
    const policy = policies[0];
    return {
      retentionDays: policy.retentionDays || 365,
      rollupEnabled: policy.rollupEnabled || false,
      compressionEnabled: policy.compressionEnabled || false
    };
    
  } catch (error) {
    return null;
  }
}

export async function updateRetentionPolicy(
  retentionDays: number,
  rollupEnabled: boolean = true,
  compressionEnabled: boolean = false
): Promise<{ success: boolean; message: string }> {
  try {
    await db.insert(telemetryRetentionPolicies)
      .values({
        id: 1,
        retentionDays,
        rollupEnabled,
        compressionEnabled,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: telemetryRetentionPolicies.id,
        set: {
          retentionDays,
          rollupEnabled,
          compressionEnabled,
          updatedAt: new Date()
        }
      });
    
    return {
      success: true,
      message: `Retention policy updated: ${retentionDays} days retention, rollup ${rollupEnabled ? 'enabled' : 'disabled'}, compression ${compressionEnabled ? 'enabled' : 'disabled'}`
    };
    
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to update retention policy: ${error?.message || String(error)}`
    };
  }
}

// Schema version management 
export async function getCurrentSchemaVersion(): Promise<number> {
  try {
    const versions = await db.select().from(dbSchemaVersion).orderBy(sql`applied_at DESC`).limit(1);
    return versions.length > 0 ? versions[0].id : 0;
  } catch (error) {
    return 0;
  }
}

export async function recordSchemaVersion(id: number, name: string): Promise<void> {
  await db.insert(dbSchemaVersion).values({
    id,
    name,
    appliedAt: new Date()
  });
}

// Compression management (TimescaleDB)
export async function enableCompression(): Promise<{ success: boolean; message: string }> {
  let pool: Pool | null = null;
  
  try {
    pool = new Pool({ 
      connectionString: DATABASE_URL,
      statement_timeout: 30000,
      max: 5
    });
    
    const client = await pool.connect();
    
    try {
      // Check if TimescaleDB is available
      const timescaleCheck = await client.query(
        "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'timescaledb')"
      );
      
      if (!timescaleCheck.rows[0]?.exists) {
        return {
          success: false,
          message: "TimescaleDB extension is not enabled"
        };
      }
      
      // Enable compression on hypertable
      await client.query(`
        ALTER TABLE equipment_telemetry SET (
          timescaledb.compress,
          timescaledb.compress_segmentby = 'equipment_id, sensor_type',
          timescaledb.compress_orderby = 'ts DESC'
        )
      `);
      
      // Add compression policy (compress data older than 7 days)
      await client.query(`
        SELECT add_compression_policy('equipment_telemetry', INTERVAL '7 days', if_not_exists => TRUE)
      `);
      
      return {
        success: true,
        message: "Compression enabled with 7-day policy. Data older than 7 days will be compressed automatically."
      };
      
    } finally {
      client.release();
    }
    
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to enable compression: ${error?.message || String(error)}`
    };
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}