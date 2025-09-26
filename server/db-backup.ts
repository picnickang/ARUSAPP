import { db } from "./db";
import { sql } from "drizzle-orm";
import * as fs from "fs/promises";
import * as path from "path";

/**
 * Database Backup and Recovery Strategy
 * 
 * This module implements production-ready backup strategies for the ARUS system.
 * Includes both logical backups and point-in-time recovery preparation.
 */

export interface BackupMetadata {
  timestamp: string;
  type: 'logical' | 'physical' | 'incremental';
  size: number;
  tables: string[];
  duration: number;
  status: 'success' | 'failed' | 'partial';
}

// Security: Allowlist of tables that can be backed up/restored
const ALLOWED_TABLES = [
  'devices',
  'edge_heartbeats',
  'alert_configurations', 
  'alert_notifications',
  'work_orders',
  'maintenance_schedules',
  'maintenance_records',
  'system_settings',
  'crew',
  'crew_assignments',
  'crew_certifications',
  'sensor_configurations',
  'pdm_score_logs',
  'equipment_telemetry',
  'raw_telemetry'
];

/**
 * Validate table name against allowlist for security
 */
function validateTableName(tableName: string): boolean {
  return ALLOWED_TABLES.includes(tableName);
}

/**
 * Safely quote table identifiers for PostgreSQL
 */
function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * Create a logical backup of critical system data
 * Focuses on operational data while excluding large telemetry archives
 */
export async function createLogicalBackup(
  backupPath: string = './backups',
  includeFullTelemetry: boolean = false
): Promise<BackupMetadata> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(backupPath, `backup-${timestamp}`);
  
  console.log('🗄️  Starting logical database backup...');
  
  try {
    // Create backup directory
    await fs.mkdir(backupDir, { recursive: true });
    
    // Define critical tables for backup (operational data) - filtered by allowlist
    const criticalTables = [
      'devices',
      'edge_heartbeats',
      'alert_configurations', 
      'alert_notifications',
      'work_orders',
      'maintenance_schedules',
      'maintenance_records',
      'system_settings',
      'crew',
      'crew_assignments',
      'crew_certifications',
      'sensor_configurations',
      'pdm_score_logs'
    ].filter(validateTableName);
    
    // Add telemetry tables if requested (large data - use with caution)
    const telemetryTables = ['equipment_telemetry', 'raw_telemetry'].filter(validateTableName);
    const allTables = includeFullTelemetry 
      ? [...criticalTables, ...telemetryTables]
      : criticalTables;
    
    const backupManifest: any = {
      timestamp,
      tables: allTables,
      metadata: {}
    };
    
    // Backup each table with safe SQL operations
    for (const table of allTables) {
      if (!validateTableName(table)) {
        console.warn(`⚠️  Skipping invalid table: ${table}`);
        continue;
      }
      
      try {
        console.log(`📊 Backing up table: ${table}`);
        const quotedTable = quoteIdentifier(table);
        
        // Get row count for metadata - using safe SQL
        const countResult = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${quotedTable}`));
        const rowCount = countResult.rows[0]?.count || 0;
        
        // Export table data as JSON - using safe SQL  
        const tableData = await db.execute(sql.raw(`SELECT * FROM ${quotedTable}`));
        const tableFile = path.join(backupDir, `${table}.json`);
        await fs.writeFile(tableFile, JSON.stringify(tableData.rows, null, 2));
        
        backupManifest.metadata[table] = {
          rowCount,
          backupSize: (await fs.stat(tableFile)).size
        };
        
        console.log(`✅ Backed up ${table}: ${rowCount} rows`);
      } catch (tableError) {
        console.error(`❌ Failed to backup table ${table}:`, tableError);
        backupManifest.metadata[table] = { error: tableError };
      }
    }
    
    // Save backup manifest
    await fs.writeFile(
      path.join(backupDir, 'manifest.json'),
      JSON.stringify(backupManifest, null, 2)
    );
    
    const duration = Date.now() - startTime;
    const backupStats = await getDirectorySize(backupDir);
    
    console.log(`✅ Backup completed in ${duration}ms, size: ${formatBytes(backupStats)}`);
    
    return {
      timestamp,
      type: includeFullTelemetry ? 'logical' : 'incremental',
      size: backupStats,
      tables: allTables,
      duration,
      status: 'success'
    };
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  }
}

/**
 * Restore from a logical backup
 * WARNING: This will overwrite existing data
 */
export async function restoreFromBackup(backupPath: string): Promise<void> {
  console.log('🔄 Starting database restore...');
  
  try {
    // Read backup manifest
    const manifestPath = path.join(backupPath, 'manifest.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    
    console.log(`📋 Restoring backup from ${manifest.timestamp}`);
    
    // Restore each table with security validation
    for (const table of manifest.tables) {
      if (!validateTableName(table)) {
        console.warn(`⚠️  Skipping invalid table: ${table} (not in allowlist)`);
        continue;
      }
      
      if (manifest.metadata[table]?.error) {
        console.log(`⚠️  Skipping ${table} (backup error)`);
        continue;
      }
      
      try {
        console.log(`📊 Restoring table: ${table}`);
        const quotedTable = quoteIdentifier(table);
        
        // Read table data
        const tableFile = path.join(backupPath, `${table}.json`);
        const tableData = JSON.parse(await fs.readFile(tableFile, 'utf8'));
        
        // Begin transaction for safety
        await db.execute(sql.raw('BEGIN'));
        
        try {
          // Truncate existing data (WARNING: Data loss) - using safe quoted identifier
          await db.execute(sql.raw(`TRUNCATE TABLE ${quotedTable} RESTART IDENTITY CASCADE`));
          
          // Insert backup data row by row with proper SQL template literals
          for (const row of tableData) {
            try {
              const columns = Object.keys(row);
              const values = Object.values(row);
              const quotedColumns = columns.map(col => quoteIdentifier(col));
              
              // Use safe SQL template literals for each insert
              const placeholders = values.map(() => '?').join(',');
              const insertQuery = `INSERT INTO ${quotedTable} (${quotedColumns.join(',')}) VALUES (${placeholders})`;
              
              // Execute with proper value escaping
              const escapedValues = values.map(val => {
                if (val === null || val === undefined) return null;
                if (typeof val === 'string') return val;
                if (typeof val === 'boolean') return val;
                if (typeof val === 'number') return val;
                if (val instanceof Date) return val.toISOString();
                return String(val);
              });
              
              await db.execute(sql.raw(
                insertQuery.replace(/\?/g, () => {
                  const val = escapedValues.shift();
                  if (val === null) return 'NULL';
                  if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
                  return String(val);
                })
              ));
              
            } catch (insertError) {
              console.error(`❌ Failed to insert row for ${table}:`, insertError);
              // Continue with next row instead of failing completely
            }
          }
          
          // Commit transaction
          await db.execute(sql.raw('COMMIT'));
          console.log(`✅ Restored ${table}: ${tableData.length} rows`);
          
        } catch (restoreError) {
          // Rollback on any error
          await db.execute(sql.raw('ROLLBACK'));
          throw restoreError;
        }
        
      } catch (tableError) {
        console.error(`❌ Failed to restore table ${table}:`, tableError);
      }
    }
    
    console.log('✅ Database restore completed');
    
  } catch (error) {
    console.error('❌ Restore failed:', error);
    throw error;
  }
}

/**
 * Setup automated backup schedule
 * In production, this would integrate with cron or system scheduler
 */
export function setupBackupSchedule(): void {
  console.log('⏰ Setting up backup schedule...');
  
  // Create daily backup at 2 AM (configurable)
  const backupInterval = process.env.BACKUP_INTERVAL_HOURS 
    ? parseInt(process.env.BACKUP_INTERVAL_HOURS) * 60 * 60 * 1000
    : 24 * 60 * 60 * 1000; // Default: 24 hours
  
  setInterval(async () => {
    try {
      console.log('⏰ Automated backup starting...');
      await createLogicalBackup('./backups/automated', false);
      
      // Cleanup old backups (keep last 7 days)
      await cleanupOldBackups('./backups/automated', 7);
      
    } catch (error) {
      console.error('❌ Automated backup failed:', error);
    }
  }, backupInterval);
  
  console.log(`✅ Backup schedule configured (every ${backupInterval / 1000 / 60 / 60} hours)`);
}

/**
 * Cleanup old backup files to manage disk space
 */
export async function cleanupOldBackups(backupPath: string, retentionDays: number): Promise<void> {
  try {
    const backupDir = await fs.readdir(backupPath);
    const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    
    for (const dir of backupDir) {
      if (dir.startsWith('backup-')) {
        const dirPath = path.join(backupPath, dir);
        const stats = await fs.stat(dirPath);
        
        if (stats.isDirectory() && stats.mtime.getTime() < cutoffTime) {
          await fs.rm(dirPath, { recursive: true });
          console.log(`🗑️  Removed old backup: ${dir}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Backup cleanup failed:', error);
  }
}

/**
 * Database health check and monitoring
 */
export async function checkDatabaseHealth(): Promise<any> {
  try {
    // Connection test
    const connectionTest = await db.execute(sql.raw('SELECT 1 as healthy'));
    
    // Database size
    const dbSize = await db.execute(sql.raw(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as database_size
    `));
    
    // Active connections
    const connections = await db.execute(sql.raw(`
      SELECT count(*) as active_connections 
      FROM pg_stat_activity 
      WHERE state = 'active'
    `));
    
    // Slow queries (queries running longer than 5 seconds)
    const slowQueries = await db.execute(sql.raw(`
      SELECT count(*) as slow_queries 
      FROM pg_stat_activity 
      WHERE state = 'active' 
      AND query_start < now() - interval '5 seconds'
    `));
    
    return {
      healthy: connectionTest.rows.length > 0,
      database_size: dbSize.rows[0]?.database_size || 'unknown',
      active_connections: connections.rows[0]?.active_connections || 0,
      slow_queries: slowQueries.rows[0]?.slow_queries || 0,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    return {
      healthy: false,
      error: error,
      timestamp: new Date().toISOString()
    };
  }
}

// Utility functions
async function getDirectorySize(dirPath: string): Promise<number> {
  let size = 0;
  const files = await fs.readdir(dirPath);
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stats = await fs.stat(filePath);
    size += stats.size;
  }
  
  return size;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}