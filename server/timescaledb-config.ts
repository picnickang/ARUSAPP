import { db } from './db';
import { sql } from 'drizzle-orm';

/**
 * TimescaleDB Configuration and Management
 * 
 * This module provides utilities for managing TimescaleDB hypertables,
 * monitoring chunk health, and optimizing time-series query performance.
 */

// TimescaleDB configuration constants
export const TIMESCALE_CONFIG = {
  // Default chunk interval for new hypertables (7 days provides good balance)
  DEFAULT_CHUNK_INTERVAL: '7 days',
  
  // Data retention settings (manual cleanup since Apache license doesn't support auto-retention)
  MANUAL_RETENTION_DAYS: 90,
  
  // Chunk monitoring thresholds
  MAX_CHUNKS_PER_HYPERTABLE: 1000,
  CHUNK_SIZE_WARNING_MB: 500
} as const;

// Interface for hypertable information
export interface HypertableInfo {
  hypertableName: string;
  schemaName: string;
  numChunks: number;
  tableSize: string;
  indexSize: string;
  totalSize: string;
}

// Interface for chunk information
export interface ChunkInfo {
  chunkName: string;
  hypertableName: string;
  chunkSize: string;
  rangeStart: Date;
  rangeEnd: Date;
  numRows: number;
}

/**
 * Get information about all hypertables in the database
 */
export async function getHypertableInfo(): Promise<HypertableInfo[]> {
  try {
    const result = await db.execute(sql`
      SELECT 
        h.hypertable_name,
        h.hypertable_schema as schema_name,
        h.num_chunks,
        pg_size_pretty(pg_total_relation_size(format('%I.%I', h.hypertable_schema, h.hypertable_name))) as total_size,
        pg_size_pretty(pg_relation_size(format('%I.%I', h.hypertable_schema, h.hypertable_name))) as table_size,
        pg_size_pretty(pg_indexes_size(format('%I.%I', h.hypertable_schema, h.hypertable_name))) as index_size
      FROM timescaledb_information.hypertables h
      ORDER BY h.hypertable_name;
    `);
    
    return result.rows.map((row: any) => ({
      hypertableName: row.hypertable_name,
      schemaName: row.schema_name,
      numChunks: parseInt(row.num_chunks),
      tableSize: row.table_size,
      indexSize: row.index_size,
      totalSize: row.total_size
    }));
  } catch (error) {
    console.error('Failed to get hypertable information:', error);
    return [];
  }
}

/**
 * Get information about chunks for a specific hypertable
 */
export async function getChunkInfo(hypertableName: string): Promise<ChunkInfo[]> {
  try {
    const result = await db.execute(sql`
      SELECT 
        c.chunk_name,
        c.hypertable_name,
        pg_size_pretty(pg_total_relation_size(format('%I.%I', c.chunk_schema, c.chunk_name))) as chunk_size,
        c.range_start,
        c.range_end,
        (SELECT reltuples::bigint 
         FROM pg_class 
         WHERE oid = format('%I.%I', c.chunk_schema, c.chunk_name)::regclass) as num_rows
      FROM timescaledb_information.chunks c
      WHERE c.hypertable_name = ${hypertableName}
      ORDER BY c.range_start DESC;
    `);
    
    return result.rows.map((row: any) => ({
      chunkName: row.chunk_name,
      hypertableName: row.hypertable_name,
      chunkSize: row.chunk_size,
      rangeStart: new Date(row.range_start),
      rangeEnd: new Date(row.range_end),
      numRows: parseInt(row.num_rows) || 0
    }));
  } catch (error) {
    console.error(`Failed to get chunk information for ${hypertableName}:`, error);
    return [];
  }
}

/**
 * Check if TimescaleDB extension is installed and working
 */
export async function checkTimescaleDBStatus(): Promise<{
  installed: boolean;
  version: string | null;
  hypertableCount: number;
  totalChunks: number;
}> {
  try {
    // Check if extension is installed
    const extensionResult = await db.execute(sql`
      SELECT installed_version 
      FROM pg_available_extensions 
      WHERE name = 'timescaledb' AND installed_version IS NOT NULL;
    `);
    
    const installed = extensionResult.rows.length > 0;
    const version = installed ? (extensionResult.rows[0] as any).installed_version : null;
    
    if (!installed) {
      return { installed: false, version: null, hypertableCount: 0, totalChunks: 0 };
    }
    
    // Get hypertable statistics
    const statsResult = await db.execute(sql`
      SELECT 
        COUNT(*) as hypertable_count,
        COALESCE(SUM(num_chunks), 0) as total_chunks
      FROM timescaledb_information.hypertables;
    `);
    
    const stats = statsResult.rows[0] as any;
    
    return {
      installed: true,
      version,
      hypertableCount: parseInt(stats.hypertable_count),
      totalChunks: parseInt(stats.total_chunks)
    };
  } catch (error) {
    console.error('Failed to check TimescaleDB status:', error);
    return { installed: false, version: null, hypertableCount: 0, totalChunks: 0 };
  }
}

/**
 * Manual cleanup of old telemetry data (since automatic retention requires commercial license)
 */
export async function cleanupOldTelemetryData(retentionDays: number = TIMESCALE_CONFIG.MANUAL_RETENTION_DAYS): Promise<{
  success: boolean;
  deletedRows: number;
  error?: string;
}> {
  try {
    const cutoffDate = sql`NOW() - INTERVAL '${sql.raw(retentionDays.toString())} days'`;
    
    const result = await db.execute(sql`
      DELETE FROM equipment_telemetry 
      WHERE ts < NOW() - INTERVAL '${sql.raw(retentionDays.toString())} days'
    `);
    
    return {
      success: true,
      deletedRows: result.rowCount || 0
    };
  } catch (error) {
    console.error('Failed to cleanup old telemetry data:', error);
    return {
      success: false,
      deletedRows: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get TimescaleDB performance recommendations based on current setup
 */
export async function getTimescaleDBRecommendations(): Promise<string[]> {
  const recommendations: string[] = [];
  
  try {
    const hypertables = await getHypertableInfo();
    const status = await checkTimescaleDBStatus();
    
    // Check if TimescaleDB is properly utilized
    if (status.hypertableCount === 0) {
      recommendations.push('No hypertables found - consider converting time-series tables to hypertables for better performance');
    }
    
    // Check chunk counts
    for (const hypertable of hypertables) {
      if (hypertable.numChunks > TIMESCALE_CONFIG.MAX_CHUNKS_PER_HYPERTABLE) {
        recommendations.push(`Hypertable ${hypertable.hypertableName} has ${hypertable.numChunks} chunks - consider increasing chunk interval`);
      }
      
      if (hypertable.numChunks < 2 && status.totalChunks > 0) {
        recommendations.push(`Hypertable ${hypertable.hypertableName} has only ${hypertable.numChunks} chunk - may need more data or smaller chunk interval for optimal partitioning`);
      }
    }
    
    // License-related recommendations
    recommendations.push('Consider upgrading to TimescaleDB commercial license for compression, retention policies, and continuous aggregates');
    
    // Query optimization recommendations
    recommendations.push('Ensure time-based queries use the ts column in WHERE clauses for optimal chunk elimination');
    recommendations.push('Create composite indexes on (equipment_id, ts) for equipment-specific time range queries');
    
    return recommendations;
  } catch (error) {
    console.error('Failed to generate TimescaleDB recommendations:', error);
    return ['Failed to analyze TimescaleDB setup - check database connectivity'];
  }
}

/**
 * Optimize existing hypertable by adding recommended indexes
 */
export async function optimizeHypertableIndexes(hypertableName: string): Promise<{
  success: boolean;
  indexesCreated: string[];
  error?: string;
}> {
  try {
    const indexesCreated: string[] = [];
    
    if (hypertableName === 'equipment_telemetry') {
      // Create time-series optimized indexes
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
          indexesCreated.push(index.name);
        } catch (indexError) {
          console.warn(`Failed to create index ${index.name}:`, indexError);
        }
      }
    }
    
    return {
      success: true,
      indexesCreated
    };
  } catch (error) {
    console.error(`Failed to optimize indexes for ${hypertableName}:`, error);
    return {
      success: false,
      indexesCreated: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get query performance statistics for hypertables
 */
export async function getHypertableQueryStats(hypertableName: string): Promise<{
  sequentialScans: number;
  indexScans: number;
  chunksExamined: number;
  avgQueryTime: number;
}> {
  try {
    // Get basic table statistics
    const tableStatsResult = await db.execute(sql`
      SELECT 
        seq_scan,
        seq_tup_read,
        idx_scan,
        idx_tup_fetch
      FROM pg_stat_user_tables 
      WHERE relname = ${hypertableName};
    `);
    
    const stats = tableStatsResult.rows[0] as any;
    
    return {
      sequentialScans: parseInt(stats?.seq_scan) || 0,
      indexScans: parseInt(stats?.idx_scan) || 0,
      chunksExamined: 0, // Would require query plan analysis
      avgQueryTime: 0    // Would require pg_stat_statements extension
    };
  } catch (error) {
    console.error(`Failed to get query stats for ${hypertableName}:`, error);
    return { sequentialScans: 0, indexScans: 0, chunksExamined: 0, avgQueryTime: 0 };
  }
}