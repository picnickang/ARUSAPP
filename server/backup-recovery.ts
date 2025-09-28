import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { db } from './db';
import { sql } from 'drizzle-orm';

/**
 * Backup and Disaster Recovery System for ARUS
 * 
 * Provides automated database backup, monitoring, and recovery capabilities
 * for the marine predictive maintenance system.
 */

// Backup configuration
export const BACKUP_CONFIG = {
  // Backup storage directory (should be on persistent volume in production)
  backupDir: process.env.BACKUP_DIR || '/tmp/backups',
  
  // Retention policies
  retention: {
    daily: 7,      // Keep 7 daily backups
    weekly: 4,     // Keep 4 weekly backups  
    monthly: 6,    // Keep 6 monthly backups
  },
  
  // Backup types
  types: {
    FULL: 'full',
    INCREMENTAL: 'incremental', // Not implemented yet - requires WAL archiving
    SCHEMA_ONLY: 'schema_only',
  },
  
  // Compression settings
  compression: {
    enabled: true,
    level: 6, // gzip compression level (1-9)
  },
  
  // Validation settings
  validation: {
    checksumEnabled: true,
    testRestoreEnabled: false, // Requires separate test database
  }
} as const;

// Backup metadata interface
export interface BackupMetadata {
  id: string;
  type: 'full' | 'schema_only';
  filename: string;
  filepath: string;
  size: number;
  checksum?: string;
  timestamp: Date;
  databaseVersion: string;
  retentionType: 'daily' | 'weekly' | 'monthly';
  status: 'creating' | 'completed' | 'failed' | 'corrupted';
  errorMessage?: string;
}

// Backup operation result
export interface BackupResult {
  success: boolean;
  metadata?: BackupMetadata;
  error?: string;
  duration: number;
  size?: number;
}

// Recovery operation result
export interface RecoveryResult {
  success: boolean;
  restoredTables: string[];
  duration: number;
  error?: string;
}

/**
 * Create a full database backup using pg_dump
 */
export async function createFullBackup(): Promise<BackupResult> {
  const startTime = Date.now();
  const backupId = generateBackupId();
  const timestamp = new Date();
  const filename = `arus_full_backup_${backupId}.sql${BACKUP_CONFIG.compression.enabled ? '.gz' : ''}`;
  const filepath = join(BACKUP_CONFIG.backupDir, filename);

  try {
    // Ensure backup directory exists
    await fs.mkdir(BACKUP_CONFIG.backupDir, { recursive: true });

    console.log(`🗄️  Starting full database backup: ${filename}`);

    // Get database connection info
    const dbUrl = new URL(process.env.DATABASE_URL!);
    
    // Prepare pg_dump command
    const pgDumpArgs = [
      '--verbose',
      '--no-owner',
      '--no-privileges',
      '--format=plain',
      '--inserts', // Use INSERT statements for better readability
      '--disable-triggers',
      `--host=${dbUrl.hostname}`,
      `--port=${dbUrl.port || '5432'}`,
      `--username=${dbUrl.username}`,
      `--dbname=${dbUrl.pathname.slice(1)}`, // Remove leading /
    ];

    const metadata: BackupMetadata = {
      id: backupId,
      type: 'full',
      filename,
      filepath,
      size: 0,
      timestamp,
      databaseVersion: await getDatabaseVersion(),
      retentionType: determineRetentionType(timestamp),
      status: 'creating'
    };

    // Execute pg_dump with optional compression
    const backupSize = await executePgDump(pgDumpArgs, filepath, dbUrl.password || '');
    
    // Calculate checksum if enabled
    let checksum: string | undefined;
    if (BACKUP_CONFIG.validation.checksumEnabled) {
      checksum = await calculateFileChecksum(filepath);
    }

    // Update metadata
    metadata.size = backupSize;
    metadata.checksum = checksum;
    metadata.status = 'completed';

    // Store backup metadata
    await storeBackupMetadata(metadata);

    const duration = Date.now() - startTime;
    console.log(`✅ Full backup completed: ${filename} (${formatBytes(backupSize)} in ${duration}ms)`);

    return {
      success: true,
      metadata,
      duration,
      size: backupSize
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(`❌ Full backup failed:`, errorMessage);

    // Store failed backup metadata for tracking
    const failedMetadata: BackupMetadata = {
      id: backupId,
      type: 'full',
      filename,
      filepath,
      size: 0,
      timestamp,
      databaseVersion: await getDatabaseVersion(),
      retentionType: determineRetentionType(timestamp),
      status: 'failed',
      errorMessage
    };
    
    try {
      await storeBackupMetadata(failedMetadata);
    } catch (metadataError) {
      console.error(`Failed to store backup failure metadata:`, metadataError);
    }

    return {
      success: false,
      error: errorMessage,
      duration
    };
  }
}

/**
 * Create a schema-only backup (structure without data)
 */
export async function createSchemaBackup(): Promise<BackupResult> {
  const startTime = Date.now();
  const backupId = generateBackupId();
  const timestamp = new Date();
  const filename = `arus_schema_backup_${backupId}.sql`;
  const filepath = join(BACKUP_CONFIG.backupDir, filename);

  try {
    await fs.mkdir(BACKUP_CONFIG.backupDir, { recursive: true });

    console.log(`📋 Starting schema backup: ${filename}`);

    const dbUrl = new URL(process.env.DATABASE_URL!);
    
    const pgDumpArgs = [
      '--verbose',
      '--no-owner',
      '--no-privileges',
      '--schema-only', // Only structure, no data
      '--format=plain',
      `--host=${dbUrl.hostname}`,
      `--port=${dbUrl.port || '5432'}`,
      `--username=${dbUrl.username}`,
      `--dbname=${dbUrl.pathname.slice(1)}`,
    ];

    const metadata: BackupMetadata = {
      id: backupId,
      type: 'schema_only',
      filename,
      filepath,
      size: 0,
      timestamp,
      databaseVersion: await getDatabaseVersion(),
      retentionType: 'daily', // Schema backups are kept daily
      status: 'creating'
    };

    const backupSize = await executePgDump(pgDumpArgs, filepath, dbUrl.password || '');
    
    let checksum: string | undefined;
    if (BACKUP_CONFIG.validation.checksumEnabled) {
      checksum = await calculateFileChecksum(filepath);
    }

    metadata.size = backupSize;
    metadata.checksum = checksum;
    metadata.status = 'completed';

    await storeBackupMetadata(metadata);

    const duration = Date.now() - startTime;
    console.log(`✅ Schema backup completed: ${filename} (${formatBytes(backupSize)} in ${duration}ms)`);

    return {
      success: true,
      metadata,
      duration,
      size: backupSize
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(`❌ Schema backup failed:`, errorMessage);

    // Store failed backup metadata for tracking
    const failedMetadata: BackupMetadata = {
      id: backupId,
      type: 'schema_only',
      filename,
      filepath,
      size: 0,
      timestamp,
      databaseVersion: await getDatabaseVersion(),
      retentionType: 'daily',
      status: 'failed',
      errorMessage
    };
    
    try {
      await storeBackupMetadata(failedMetadata);
    } catch (metadataError) {
      console.error(`Failed to store backup failure metadata:`, metadataError);
    }

    return {
      success: false,
      error: errorMessage,
      duration
    };
  }
}

/**
 * Execute pg_dump command with optional compression and proper stream handling
 */
async function executePgDump(args: string[], outputPath: string, password: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, PGPASSWORD: password };
    
    const pgDump = spawn('pg_dump', args, { env });
    let outputStream = pgDump.stdout;
    let gzipProcess: any = null;

    // Add compression if enabled
    if (BACKUP_CONFIG.compression.enabled) {
      const { spawn: spawnGzip } = require('child_process');
      gzipProcess = spawnGzip('gzip', [`-${BACKUP_CONFIG.compression.level}`]);
      
      // Handle gzip errors
      gzipProcess.on('error', (error: Error) => {
        reject(new Error(`gzip compression failed: ${error.message}`));
      });
      
      pgDump.stdout.pipe(gzipProcess.stdin);
      outputStream = gzipProcess.stdout;
    }

    // Write to output file
    const writeStream = require('fs').createWriteStream(outputPath);
    outputStream.pipe(writeStream);

    let totalBytes = 0;
    let stderr = '';
    let errors: Error[] = [];
    
    // Track data for size calculation
    outputStream.on('data', (chunk: Buffer) => {
      totalBytes += chunk.length;
    });

    // Collect stderr from pg_dump
    pgDump.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    // Handle pg_dump errors
    pgDump.on('error', (error: Error) => {
      errors.push(new Error(`Failed to spawn pg_dump: ${error.message}`));
    });

    // Handle gzip stderr if compression is enabled
    if (gzipProcess) {
      gzipProcess.stderr.on('data', (data: Buffer) => {
        stderr += `[gzip] ${data.toString()}`;
      });
    }

    // Handle write stream errors
    writeStream.on('error', (error: Error) => {
      errors.push(new Error(`Write stream error: ${error.message}`));
    });

    // Wait for all streams to complete
    let processesCompleted = 0;
    const totalProcesses = gzipProcess ? 3 : 2; // pg_dump + (optional gzip) + writeStream
    
    function checkCompletion(processName: string, code?: number) {
      processesCompleted++;
      
      // Check for errors
      if (errors.length > 0) {
        reject(errors[0]);
        return;
      }
      
      if (processName === 'pg_dump' && code !== 0) {
        reject(new Error(`pg_dump failed with code ${code}: ${stderr}`));
        return;
      }
      
      if (processName === 'gzip' && code !== 0) {
        reject(new Error(`gzip failed with code ${code}: ${stderr}`));
        return;
      }
      
      // All processes completed successfully
      if (processesCompleted === totalProcesses) {
        resolve(totalBytes);
      }
    }

    // Wait for pg_dump to close
    pgDump.on('close', (code) => {
      checkCompletion('pg_dump', code);
    });

    // Wait for gzip to close if enabled
    if (gzipProcess) {
      gzipProcess.on('close', (code: number) => {
        checkCompletion('gzip', code);
      });
    }

    // Wait for write stream to finish
    writeStream.on('finish', () => {
      checkCompletion('writeStream');
    });
  });
}

/**
 * Get current database version
 */
async function getDatabaseVersion(): Promise<string> {
  try {
    const result = await db.execute(sql`SELECT version();`);
    return (result.rows[0] as any).version;
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Determine retention type based on timestamp
 */
function determineRetentionType(timestamp: Date): 'daily' | 'weekly' | 'monthly' {
  const dayOfWeek = timestamp.getDay();
  const dayOfMonth = timestamp.getDate();

  // Monthly backup on 1st of month
  if (dayOfMonth === 1) {
    return 'monthly';
  }
  
  // Weekly backup on Sundays
  if (dayOfWeek === 0) {
    return 'weekly';
  }
  
  // Daily backup otherwise
  return 'daily';
}

/**
 * Generate unique backup ID
 */
function generateBackupId(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * Calculate file checksum for integrity validation using streaming to avoid memory issues
 */
async function calculateFileChecksum(filepath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = require('fs').createReadStream(filepath);
    
    stream.on('error', reject);
    stream.on('data', (chunk: Buffer) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

/**
 * Store backup metadata (in-memory for now, should be in database for production)
 */
const backupMetadataStore = new Map<string, BackupMetadata>();

async function storeBackupMetadata(metadata: BackupMetadata): Promise<void> {
  backupMetadataStore.set(metadata.id, metadata);
  
  // Also save to filesystem for persistence
  const metadataFile = join(BACKUP_CONFIG.backupDir, `${metadata.id}.metadata.json`);
  await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2));
}

/**
 * Get all backup metadata
 */
export async function listBackups(): Promise<BackupMetadata[]> {
  try {
    // Load from filesystem
    const files = await fs.readdir(BACKUP_CONFIG.backupDir);
    const metadataFiles = files.filter(f => f.endsWith('.metadata.json'));
    
    const backups: BackupMetadata[] = [];
    for (const file of metadataFiles) {
      try {
        const content = await fs.readFile(join(BACKUP_CONFIG.backupDir, file), 'utf8');
        const metadata = JSON.parse(content) as BackupMetadata;
        backups.push(metadata);
      } catch (error) {
        console.warn(`Failed to load backup metadata ${file}:`, error);
      }
    }
    
    return backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    console.error('Failed to list backups:', error);
    return [];
  }
}

/**
 * Clean up old backups according to retention policy
 */
export async function cleanupOldBackups(): Promise<{
  deletedCount: number;
  errors: string[];
}> {
  const backups = await listBackups();
  const errors: string[] = [];
  let deletedCount = 0;

  // Group by retention type
  const backupsByType = {
    daily: backups.filter(b => b.retentionType === 'daily'),
    weekly: backups.filter(b => b.retentionType === 'weekly'),
    monthly: backups.filter(b => b.retentionType === 'monthly'),
  };

  // Apply retention policies
  for (const [type, typeBackups] of Object.entries(backupsByType)) {
    const retentionLimit = BACKUP_CONFIG.retention[type as keyof typeof BACKUP_CONFIG.retention];
    const toDelete = typeBackups.slice(retentionLimit);

    for (const backup of toDelete) {
      try {
        await fs.unlink(backup.filepath);
        await fs.unlink(join(BACKUP_CONFIG.backupDir, `${backup.id}.metadata.json`));
        deletedCount++;
        console.log(`🗑️  Deleted old backup: ${backup.filename}`);
      } catch (error) {
        const errorMsg = `Failed to delete backup ${backup.filename}: ${error}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }
  }

  return { deletedCount, errors };
}

/**
 * Verify backup integrity
 */
export async function verifyBackupIntegrity(backupId: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  try {
    const backups = await listBackups();
    const backup = backups.find(b => b.id === backupId);
    
    if (!backup) {
      return { valid: false, error: 'Backup not found' };
    }

    // Check if file exists
    try {
      await fs.access(backup.filepath);
    } catch (error) {
      return { valid: false, error: 'Backup file not found' };
    }

    // Verify checksum if available
    if (backup.checksum) {
      const currentChecksum = await calculateFileChecksum(backup.filepath);
      if (currentChecksum !== backup.checksum) {
        return { valid: false, error: 'Checksum mismatch - backup file may be corrupted' };
      }
    }

    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

/**
 * Get backup and recovery status overview
 */
export async function getBackupStatus(): Promise<{
  totalBackups: number;
  latestBackup: BackupMetadata | null;
  backupSizeTotal: number;
  retentionSummary: Record<string, number>;
  healthStatus: 'healthy' | 'warning' | 'error';
  issues: string[];
}> {
  try {
    const backups = await listBackups();
    const issues: string[] = [];
    
    const totalBackups = backups.length;
    const latestBackup = backups[0] || null;
    const backupSizeTotal = backups.reduce((sum, b) => sum + b.size, 0);
    
    const retentionSummary = {
      daily: backups.filter(b => b.retentionType === 'daily').length,
      weekly: backups.filter(b => b.retentionType === 'weekly').length,
      monthly: backups.filter(b => b.retentionType === 'monthly').length,
    };

    // Health checks
    let healthStatus: 'healthy' | 'warning' | 'error' = 'healthy';
    
    if (totalBackups === 0) {
      healthStatus = 'error';
      issues.push('No backups found');
    } else if (latestBackup) {
      const hoursAgo = (Date.now() - new Date(latestBackup.timestamp).getTime()) / (1000 * 60 * 60);
      if (hoursAgo > 48) {
        healthStatus = 'warning';
        issues.push(`Latest backup is ${Math.round(hoursAgo)} hours old`);
      }
    }

    // Check for failed backups
    const failedBackups = backups.filter(b => b.status === 'failed').length;
    if (failedBackups > 0) {
      healthStatus = failedBackups > 2 ? 'error' : 'warning';
      issues.push(`${failedBackups} failed backup(s) found`);
    }

    return {
      totalBackups,
      latestBackup,
      backupSizeTotal,
      retentionSummary,
      healthStatus,
      issues
    };
  } catch (error) {
    return {
      totalBackups: 0,
      latestBackup: null,
      backupSizeTotal: 0,
      retentionSummary: { daily: 0, weekly: 0, monthly: 0 },
      healthStatus: 'error',
      issues: [`Failed to get backup status: ${error}`]
    };
  }
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Schedule automatic backups (for production deployment)
 */
export function scheduleAutomaticBackups(): void {
  // This would integrate with a job scheduler like node-cron
  // For now, just log the intention
  console.log('📅 Automatic backup scheduling would be configured here');
  console.log('💡 In production, integrate with node-cron or system cron for:');
  console.log('   - Daily full backups at 2:00 AM');
  console.log('   - Schema backups every 6 hours');
  console.log('   - Weekly cleanup of old backups');
}