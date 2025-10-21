import { db } from './db';
import { sql } from 'drizzle-orm';

/**
 * TimescaleDB Bootstrap Script
 * 
 * This script ensures TimescaleDB is properly set up in a reproducible way.
 * It should be run during application initialization to set up hypertables,
 * indexes, and other TimescaleDB features.
 */

export interface BootstrapResult {
  success: boolean;
  steps: string[];
  errors: string[];
  skipped: string[];
}

/**
 * Bootstrap TimescaleDB setup for the ARUS system
 */
export async function bootstrapTimescaleDB(): Promise<BootstrapResult> {
  const result: BootstrapResult = {
    success: true,
    steps: [],
    errors: [],
    skipped: []
  };

  try {
    console.log('🚀 Starting TimescaleDB bootstrap...');

    // Step 1: Enable TimescaleDB extension (optional for managed databases)
    try {
      await db.execute(sql`CREATE EXTENSION IF NOT EXISTS timescaledb;`);
      result.steps.push('Enabled TimescaleDB extension');
      console.log('✅ TimescaleDB extension enabled');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check if this is a managed database limitation (not a real error)
      // Common on Neon, Render PostgreSQL, and other managed services
      const isManagedDbLimitation = 
        errorMessage.includes('permission denied') ||
        errorMessage.includes('must be owner') ||
        errorMessage.includes('must be superuser') ||
        errorMessage.includes('is not available') ||
        errorMessage.includes('could not open extension control file') ||
        errorMessage.includes('extension does not exist');
      
      if (isManagedDbLimitation) {
        const msg = 'TimescaleDB extension not available (managed database - this is OK)';
        result.skipped.push(msg);
        console.warn('⚠️ ', msg);
        console.log('ℹ️  Continuing without TimescaleDB optimizations');
        console.log(`   Reason: ${errorMessage}`);
        
        // Return success but skip hypertable creation
        return {
          success: true,
          steps: result.steps,
          errors: [],
          skipped: [...result.skipped, 'Hypertable creation skipped (TimescaleDB not available)']
        };
      }
      
      // For other errors, still fail
      const msg = `Failed to enable TimescaleDB extension: ${errorMessage}`;
      result.errors.push(msg);
      console.error('❌', msg);
      return { ...result, success: false };
    }

    // Step 2: Check if equipment_telemetry is already a hypertable
    const hypertableCheck = await db.execute(sql`
      SELECT hypertable_name 
      FROM timescaledb_information.hypertables 
      WHERE hypertable_name = 'equipment_telemetry'
    `);

    if (hypertableCheck.rows.length > 0) {
      result.skipped.push('equipment_telemetry is already a hypertable');
      console.log('⏭️  equipment_telemetry is already a hypertable, skipping conversion');
    } else {
      // Step 3: Ensure proper schema structure for hypertable conversion
      try {
        // Check if we need to modify the primary key structure
        const pkCheck = await db.execute(sql`
          SELECT constraint_name, column_name
          FROM information_schema.key_column_usage
          WHERE table_name = 'equipment_telemetry' 
            AND constraint_name LIKE '%pkey%'
          ORDER BY ordinal_position
        `);

        const pkColumns = pkCheck.rows.map((row: any) => row.column_name);
        const expectedPkColumns = ['org_id', 'ts', 'id'];
        const needsPkUpdate = JSON.stringify(pkColumns) !== JSON.stringify(expectedPkColumns);

        if (needsPkUpdate) {
          console.log('🔧 Updating primary key structure for TimescaleDB compatibility...');
          
          await db.transaction(async (tx) => {
            // Ensure ts column is NOT NULL
            await tx.execute(sql`
              UPDATE equipment_telemetry 
              SET ts = COALESCE(ts, NOW()) 
              WHERE ts IS NULL
            `);
            
            await tx.execute(sql`
              ALTER TABLE equipment_telemetry 
              ALTER COLUMN ts SET NOT NULL
            `);

            // Drop existing primary key constraint
            await tx.execute(sql`
              ALTER TABLE equipment_telemetry 
              DROP CONSTRAINT IF EXISTS equipment_telemetry_pkey
            `);

            // Create composite primary key with time dimension
            await tx.execute(sql`
              ALTER TABLE equipment_telemetry 
              ADD CONSTRAINT equipment_telemetry_pkey 
              PRIMARY KEY (org_id, ts, id)
            `);

            // Create non-unique index on id for lookups
            await tx.execute(sql`
              CREATE INDEX IF NOT EXISTS idx_equipment_telemetry_id 
              ON equipment_telemetry (id)
            `);
          });
          
          result.steps.push('Updated primary key structure for TimescaleDB');
          console.log('✅ Primary key structure updated');
        }

        // Step 4: Convert to hypertable
        await db.execute(sql`
          SELECT create_hypertable(
            'equipment_telemetry', 
            'ts', 
            chunk_time_interval => INTERVAL '7 days', 
            migrate_data => true
          )
        `);
        
        result.steps.push('Converted equipment_telemetry to hypertable with 7-day chunks');
        console.log('✅ Converted equipment_telemetry to hypertable');

      } catch (error) {
        const msg = `Failed to convert equipment_telemetry to hypertable: ${error}`;
        result.errors.push(msg);
        console.error('❌', msg);
        result.success = false;
      }
    }

    // Step 5: Create time-series optimized indexes
    const indexes = [
      {
        name: 'idx_equipment_telemetry_equipment_ts',
        sql: sql`CREATE INDEX IF NOT EXISTS idx_equipment_telemetry_equipment_ts ON equipment_telemetry (equipment_id, ts DESC)`
      },
      {
        name: 'idx_equipment_telemetry_sensor_ts', 
        sql: sql`CREATE INDEX IF NOT EXISTS idx_equipment_telemetry_sensor_ts ON equipment_telemetry (sensor_type, ts DESC)`
      },
      {
        name: 'idx_equipment_telemetry_status_ts',
        sql: sql`CREATE INDEX IF NOT EXISTS idx_equipment_telemetry_status_ts ON equipment_telemetry (status, ts DESC)`
      }
    ];

    for (const index of indexes) {
      try {
        await db.execute(index.sql);
        result.steps.push(`Created index: ${index.name}`);
        console.log(`✅ Created index: ${index.name}`);
      } catch (error) {
        // Index creation failures are not critical
        const msg = `Failed to create index ${index.name}: ${error}`;
        result.errors.push(msg);
        console.warn('⚠️', msg);
      }
    }

    // Step 6: Verify hypertable setup
    const verificationResult = await db.execute(sql`
      SELECT 
        hypertable_name,
        num_chunks,
        compression_enabled
      FROM timescaledb_information.hypertables 
      WHERE hypertable_name = 'equipment_telemetry'
    `);

    if (verificationResult.rows.length > 0) {
      const hypertable = verificationResult.rows[0] as any;
      result.steps.push(`Verified hypertable: ${hypertable.num_chunks} chunks, compression: ${hypertable.compression_enabled}`);
      console.log(`✅ Hypertable verified: ${hypertable.num_chunks} chunks`);
    } else {
      const msg = 'Hypertable verification failed - table not found in hypertables list';
      result.errors.push(msg);
      console.error('❌', msg);
      result.success = false;
    }

    console.log('🎉 TimescaleDB bootstrap completed successfully');
    return result;

  } catch (error) {
    const msg = `Unexpected error during TimescaleDB bootstrap: ${error}`;
    result.errors.push(msg);
    console.error('💥', msg);
    return { ...result, success: false };
  }
}

/**
 * Check if TimescaleDB bootstrap has been completed
 */
export async function isTimescaleDBBootstrapped(): Promise<boolean> {
  try {
    // Check if TimescaleDB extension is installed
    const extensionCheck = await db.execute(sql`
      SELECT installed_version 
      FROM pg_available_extensions 
      WHERE name = 'timescaledb' AND installed_version IS NOT NULL
    `);

    if (extensionCheck.rows.length === 0) {
      return false;
    }

    // Check if equipment_telemetry is a hypertable
    const hypertableCheck = await db.execute(sql`
      SELECT hypertable_name 
      FROM timescaledb_information.hypertables 
      WHERE hypertable_name = 'equipment_telemetry'
    `);

    return hypertableCheck.rows.length > 0;

  } catch (error) {
    console.error('Failed to check TimescaleDB bootstrap status:', error);
    return false;
  }
}

/**
 * Run TimescaleDB bootstrap conditionally (only if not already done)
 */
export async function ensureTimescaleDBSetup(): Promise<void> {
  try {
    const isBootstrapped = await isTimescaleDBBootstrapped();
    
    if (isBootstrapped) {
      console.log('ℹ️  TimescaleDB is already bootstrapped, skipping setup');
      return;
    }

    console.log('🚀 TimescaleDB not yet bootstrapped, running setup...');
    const result = await bootstrapTimescaleDB();
    
    if (!result.success) {
      console.error('💥 TimescaleDB bootstrap failed:', result.errors);
      throw new Error(`TimescaleDB bootstrap failed: ${result.errors.join(', ')}`);
    }

    console.log('✅ TimescaleDB bootstrap completed successfully');

  } catch (error) {
    console.error('Failed to ensure TimescaleDB setup:', error);
    throw error;
  }
}