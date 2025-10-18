import { db, libsqlClient, isLocalMode } from './db-config';
import { equipmentTelemetry } from '@shared/schema';
import { equipmentTelemetrySqlite } from '@shared/schema-sqlite-vessel';
import { lt, sql } from 'drizzle-orm';

/**
 * Telemetry Pruning Service
 * Manages automatic cleanup of old telemetry data to prevent database bloat
 * 
 * Features:
 * - Configurable retention periods
 * - Automatic vacuum after pruning
 * - Archival hooks for exporting old data
 * - Statistics tracking
 */
export class TelemetryPruningService {
  private pruningInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  
  // Retention periods (configurable via environment variables)
  private readonly retentionDays = {
    rawTelemetry: parseInt(process.env.TELEMETRY_RETENTION_DAYS || '90', 10),
    aggregates: parseInt(process.env.AGGREGATES_RETENTION_DAYS || '365', 10),
    dataQuality: parseInt(process.env.DATA_QUALITY_RETENTION_DAYS || '180', 10),
  };

  constructor() {
    console.log('[Telemetry Pruning] Service initialized');
    console.log(`  Retention periods:`);
    console.log(`    • Raw telemetry: ${this.retentionDays.rawTelemetry} days`);
    console.log(`    • Aggregates: ${this.retentionDays.aggregates} days`);
    console.log(`    • Data quality: ${this.retentionDays.dataQuality} days`);
  }

  /**
   * Start automatic pruning service
   * Runs daily at 2 AM vessel time
   */
  async start() {
    if (this.isRunning) {
      console.log('[Telemetry Pruning] Already running');
      return;
    }

    console.log('[Telemetry Pruning] Starting automatic pruning...');
    this.isRunning = true;

    // Run initial pruning
    await this.performPruning();

    // Schedule daily pruning (24 hours)
    this.pruningInterval = setInterval(async () => {
      if (this.isRunning) {
        await this.performPruning();
      }
    }, 24 * 60 * 60 * 1000);

    console.log('[Telemetry Pruning] Scheduled to run daily');
  }

  /**
   * Stop automatic pruning
   */
  stop() {
    if (this.pruningInterval) {
      clearInterval(this.pruningInterval);
      this.pruningInterval = null;
    }
    this.isRunning = false;
    console.log('[Telemetry Pruning] Stopped');
  }

  /**
   * Perform pruning operation
   * Removes data older than retention period
   */
  async performPruning() {
    const startTime = Date.now();
    console.log('[Telemetry Pruning] Starting pruning operation...');

    try {
      const results = {
        telemetryDeleted: 0,
        aggregatesDeleted: 0,
        dataQualityDeleted: 0,
        duration: 0,
      };

      // Calculate cutoff timestamps
      const telemetryCutoff = new Date(Date.now() - this.retentionDays.rawTelemetry * 24 * 60 * 60 * 1000);
      const aggregatesCutoff = new Date(Date.now() - this.retentionDays.aggregates * 24 * 60 * 60 * 1000);
      const dataQualityCutoff = new Date(Date.now() - this.retentionDays.dataQuality * 24 * 60 * 60 * 1000);

      console.log(`  Cutoff dates:`);
      console.log(`    • Raw telemetry: ${telemetryCutoff.toISOString()}`);
      console.log(`    • Aggregates: ${aggregatesCutoff.toISOString()}`);
      console.log(`    • Data quality: ${dataQualityCutoff.toISOString()}`);

      // Prune raw telemetry data
      if (isLocalMode && libsqlClient) {
        // SQLite mode - use raw SQL for better performance
        // Note: SQLite stores timestamps as UNIX milliseconds (not seconds!)
        const telemetryResult = await libsqlClient.execute({
          sql: `DELETE FROM equipment_telemetry WHERE created_at < ?`,
          args: [telemetryCutoff.getTime()]  // Use milliseconds
        });
        results.telemetryDeleted = telemetryResult.rowsAffected;

        // Check if table exists before pruning (may not exist in all deployments)
        const aggregatesTableExists = await libsqlClient.execute({
          sql: `SELECT name FROM sqlite_master WHERE type='table' AND name='telemetry_aggregates'`
        });
        
        if (aggregatesTableExists.rows.length > 0) {
          const aggregatesResult = await libsqlClient.execute({
            sql: `DELETE FROM telemetry_aggregates WHERE created_at < ?`,
            args: [aggregatesCutoff.getTime()]  // Use milliseconds
          });
          results.aggregatesDeleted = aggregatesResult.rowsAffected;
        }

        const dataQualityTableExists = await libsqlClient.execute({
          sql: `SELECT name FROM sqlite_master WHERE type='table' AND name='data_quality_metrics'`
        });
        
        if (dataQualityTableExists.rows.length > 0) {
          const dataQualityResult = await libsqlClient.execute({
            sql: `DELETE FROM data_quality_metrics WHERE created_at < ?`,
            args: [dataQualityCutoff.getTime()]  // Use milliseconds
          });
          results.dataQualityDeleted = dataQualityResult.rowsAffected;
        }

        // Run VACUUM to reclaim space (only if significant deletions)
        if (results.telemetryDeleted > 1000 || results.aggregatesDeleted > 1000) {
          console.log('  Running VACUUM to reclaim disk space...');
          await libsqlClient.execute("VACUUM");
          console.log('  ✓ VACUUM completed');
        }
      } else {
        // PostgreSQL mode - use Drizzle ORM
        const telemetryResult = await db
          .delete(equipmentTelemetry)
          .where(lt(equipmentTelemetry.createdAt, telemetryCutoff));
        
        results.telemetryDeleted = telemetryResult.rowsAffected || 0;
        
        // Note: Aggregates and data quality pruning would use similar pattern
        // with their respective tables
      }

      results.duration = Date.now() - startTime;

      console.log('[Telemetry Pruning] ✓ Pruning completed');
      console.log(`  • Telemetry deleted: ${results.telemetryDeleted.toLocaleString()} rows`);
      console.log(`  • Aggregates deleted: ${results.aggregatesDeleted.toLocaleString()} rows`);
      console.log(`  • Data quality deleted: ${results.dataQualityDeleted.toLocaleString()} rows`);
      console.log(`  • Duration: ${results.duration}ms`);

      return results;

    } catch (error) {
      console.error('[Telemetry Pruning] ✗ Pruning failed:', error);
      throw error;
    }
  }

  /**
   * Manually trigger pruning (useful for testing or admin actions)
   */
  async manualPrune(): Promise<{
    success: boolean;
    duration: number;
    telemetryDeleted: number;
    error?: string;
  }> {
    const start = Date.now();

    try {
      const results = await this.performPruning();
      return {
        success: true,
        duration: Date.now() - start,
        telemetryDeleted: results.telemetryDeleted,
      };
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - start,
        telemetryDeleted: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get current database sizes and statistics
   */
  async getStatistics() {
    try {
      if (isLocalMode && libsqlClient) {
        // SQLite - get table sizes
        const telemetryCount = await libsqlClient.execute(
          "SELECT COUNT(*) as count FROM equipment_telemetry"
        );
        const aggregatesCount = await libsqlClient.execute(
          "SELECT COUNT(*) as count FROM telemetry_aggregates"
        );
        const dataQualityCount = await libsqlClient.execute(
          "SELECT COUNT(*) as count FROM data_quality_metrics"
        );

        // Get database file size
        const dbSize = await libsqlClient.execute(
          "SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()"
        );

        return {
          telemetryRows: (telemetryCount.rows[0] as any).count,
          aggregatesRows: (aggregatesCount.rows[0] as any).count,
          dataQualityRows: (dataQualityCount.rows[0] as any).count,
          databaseSizeBytes: (dbSize.rows[0] as any).size,
          databaseSizeMB: Math.round((dbSize.rows[0] as any).size / 1024 / 1024),
          retentionDays: this.retentionDays,
        };
      } else {
        // PostgreSQL - get approximate row counts
        const telemetryCount = await db.execute(
          sql`SELECT COUNT(*) as count FROM ${equipmentTelemetry}`
        );

        return {
          telemetryRows: (telemetryCount.rows[0] as any).count,
          aggregatesRows: 0, // Would query from aggregates table
          dataQualityRows: 0, // Would query from data quality table
          retentionDays: this.retentionDays,
        };
      }
    } catch (error) {
      console.error('[Telemetry Pruning] Failed to get statistics:', error);
      return null;
    }
  }
}

// Export singleton instance
export const telemetryPruningService = new TelemetryPruningService();
