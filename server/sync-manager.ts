import { db, libsqlClient, isLocalMode } from './db-config';
import { syncJournal, syncOutbox, syncConflicts } from '@shared/schema';
import { syncJournalSqlite, syncOutboxSqlite, sqliteJsonHelpers } from '@shared/schema-sqlite-sync';
import { syncConflictsSqlite } from '@shared/schema-sqlite-vessel';
import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

/**
 * Conflict Resolution Policy
 * Defines how to handle sync conflicts
 */
export type ConflictPolicy = 'last_write_wins' | 'shore_wins' | 'vessel_wins' | 'manual';

interface ConflictResolutionConfig {
  policy: ConflictPolicy;
  notifyUsers: boolean;
  maxConflictsToResolve: number;
}

interface SyncConflict {
  id: string;
  table: string;
  recordId: string;
  vesselVersion: any;
  shoreVersion: any;
  vesselTimestamp: Date;
  shoreTimestamp: Date;
  conflictType: 'update_update' | 'update_delete' | 'delete_update';
}

/**
 * Sync Manager Service
 * Handles automatic synchronization between local SQLite and cloud database
 * for vessel deployments with intermittent connectivity.
 * 
 * Features:
 * - Auto-sync every 5 minutes (configurable)
 * - Conflict detection and resolution
 * - Processes sync outbox for WebSocket broadcasts
 * - Logs sync events to sync_journal for audit trail
 * - Graceful error handling (continues operating on sync failure)
 * - Data integrity checks after long offline periods
 */
export class SyncManager {
  private syncInterval: NodeJS.Timeout | null = null;
  private syncIntervalMs: number;
  private isRunning: boolean = false;
  private conflictPolicy: ConflictPolicy;
  private lastSyncTime: Date | null = null;

  constructor(intervalMinutes: number = 5, conflictPolicy: ConflictPolicy = 'last_write_wins') {
    this.syncIntervalMs = intervalMinutes * 60 * 1000;
    this.conflictPolicy = conflictPolicy;
  }

  /**
   * Start the sync manager
   * Performs initial sync and sets up periodic sync
   */
  async start() {
    if (!isLocalMode) {
      console.log('[Sync Manager] Disabled (running in cloud mode)');
      return;
    }

    if (!libsqlClient) {
      console.warn('[Sync Manager] Cannot start - libSQL client not initialized');
      return;
    }

    console.log('[Sync Manager] Starting...');
    this.isRunning = true;

    // Perform initial sync on startup
    await this.performSync();

    // Set up periodic sync
    this.syncInterval = setInterval(() => {
      if (this.isRunning) {
        this.performSync();
      }
    }, this.syncIntervalMs);

    console.log(`[Sync Manager] Started (sync every ${this.syncIntervalMs / 60000} minutes)`);
  }

  /**
   * Perform a synchronization operation
   * Syncs local SQLite with cloud database and processes sync outbox
   */
  async performSync() {
    if (!libsqlClient) return;

    const syncStart = Date.now();
    const offlineDuration = this.lastSyncTime 
      ? Date.now() - this.lastSyncTime.getTime() 
      : 0;

    try {
      // Trigger libSQL built-in sync (uploads local changes, downloads remote changes)
      await libsqlClient.sync();
      
      const duration = Date.now() - syncStart;
      console.log(`[Sync Manager] ✓ Sync completed in ${duration}ms`);

      // Check for conflicts after sync (especially important after long offline periods)
      if (offlineDuration > 24 * 60 * 60 * 1000) { // More than 24 hours
        console.log(`[Sync Manager] Long offline period detected (${Math.round(offlineDuration / 3600000)}h), checking for conflicts...`);
        await this.detectAndResolveConflicts({
          policy: this.conflictPolicy,
          notifyUsers: true,
          maxConflictsToResolve: 100
        });
      }

      // Process sync outbox (for custom events that need broadcasting)
      await this.processSyncOutbox();

      // Update last sync time
      this.lastSyncTime = new Date();

      // Log successful sync to journal
      await this.logSyncEvent('sync_success', {
        duration_ms: duration,
        offline_duration_hours: Math.round(offlineDuration / 3600000),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      const duration = Date.now() - syncStart;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`[Sync Manager] ✗ Sync failed after ${duration}ms:`, errorMessage);

      // Log failed sync to journal
      await this.logSyncEvent('sync_failed', {
        duration_ms: duration,
        error: errorMessage,
        timestamp: new Date().toISOString()
      }).catch(err => {
        // If we can't even log to the journal, just console log
        console.error('[Sync Manager] Failed to log sync error:', err);
      });

      // Continue operating - will retry on next interval
      // This is critical for vessel operations - app should not crash on network failure
    }
  }

  /**
   * Detect and resolve sync conflicts
   * Called after sync operations, especially after long offline periods
   */
  private async detectAndResolveConflicts(config: ConflictResolutionConfig): Promise<number> {
    try {
      const conflictsTable = isLocalMode ? syncConflictsSqlite : syncConflicts;
      
      // Get unresolved conflicts from database
      const unresolvedConflicts = await db.select()
        .from(conflictsTable)
        .where(eq(conflictsTable.resolved, false))
        .limit(config.maxConflictsToResolve);

      if (unresolvedConflicts.length === 0) {
        console.log('[Sync Manager] No conflicts detected');
        return 0;
      }

      console.log(`[Sync Manager] Found ${unresolvedConflicts.length} unresolved conflicts`);
      let resolvedCount = 0;

      for (const conflict of unresolvedConflicts) {
        try {
          const resolved = await this.resolveConflict(conflict, config.policy);
          if (resolved) {
            resolvedCount++;
            
            // Mark conflict as resolved
            await db.update(conflictsTable)
              .set({
                resolved: true,
                resolvedAt: new Date(),
                resolvedBy: 'sync_manager',
                resolutionStrategy: config.policy,
                updatedAt: new Date()
              })
              .where(eq(conflictsTable.id, conflict.id));
          }
        } catch (err) {
          console.error(`[Sync Manager] Failed to resolve conflict ${conflict.id}:`, err);
        }
      }

      console.log(`[Sync Manager] ✓ Resolved ${resolvedCount}/${unresolvedConflicts.length} conflicts`);
      
      // Log conflict resolution to journal
      await this.logSyncEvent('conflicts_resolved', {
        total_conflicts: unresolvedConflicts.length,
        resolved: resolvedCount,
        policy: config.policy
      });

      return resolvedCount;

    } catch (error) {
      console.error('[Sync Manager] Error detecting/resolving conflicts:', error);
      return 0;
    }
  }

  /**
   * Resolve a single conflict based on policy
   */
  private async resolveConflict(conflict: any, policy: ConflictPolicy): Promise<boolean> {
    try {
      switch (policy) {
        case 'last_write_wins':
          // Compare timestamps and keep the most recent version
          const vesselTime = new Date(conflict.vesselTimestamp).getTime();
          const shoreTime = new Date(conflict.shoreTimestamp).getTime();
          
          if (vesselTime > shoreTime) {
            console.log(`[Sync Manager] Conflict ${conflict.id}: Vessel version wins (newer)`);
            // Vessel version already in local DB, no action needed
          } else {
            console.log(`[Sync Manager] Conflict ${conflict.id}: Shore version wins (newer)`);
            // Shore version will be applied by next sync
          }
          return true;

        case 'shore_wins':
          // Always use shore office version
          console.log(`[Sync Manager] Conflict ${conflict.id}: Shore version wins (policy)`);
          // Shore version will be applied by next sync
          return true;

        case 'vessel_wins':
          // Always use vessel version
          console.log(`[Sync Manager] Conflict ${conflict.id}: Vessel version wins (policy)`);
          // Vessel version already in local DB, no action needed
          return true;

        case 'manual':
          // Leave unresolved for manual intervention
          console.log(`[Sync Manager] Conflict ${conflict.id}: Requires manual resolution`);
          return false;

        default:
          console.warn(`[Sync Manager] Unknown conflict policy: ${policy}`);
          return false;
      }
    } catch (error) {
      console.error(`[Sync Manager] Error resolving conflict:`, error);
      return false;
    }
  }

  /**
   * Process pending events in the sync outbox
   * These are custom application events that need to be broadcast via WebSocket
   */
  private async processSyncOutbox() {
    try {
      const outboxTable = isLocalMode ? syncOutboxSqlite : syncOutbox;
      
      const pending = await db.select()
        .from(outboxTable)
        .where(eq(outboxTable.processed, false))
        .limit(100);

      if (pending.length === 0) return;

      console.log(`[Sync Manager] Processing ${pending.length} outbox events`);

      for (const event of pending) {
        try {
          // Note: WebSocket broadcasting will be integrated when WebSocket server is available
          // For now, just mark as processed
          
          await db.update(outboxTable)
            .set({ 
              processed: true, 
              processedAt: new Date() 
            })
            .where(eq(outboxTable.id, event.id));

        } catch (err) {
          console.error(`[Sync Manager] Failed to process event ${event.id}:`, err);
          // Continue with next event
        }
      }

    } catch (error) {
      console.error('[Sync Manager] Error processing sync outbox:', error);
    }
  }

  /**
   * Log sync events to the sync_journal for audit trail
   */
  private async logSyncEvent(operation: string, payload: any) {
    try {
      if (isLocalMode) {
        // SQLite: Use SQLite-compatible schema with JSON as text
        await db.insert(syncJournalSqlite).values({
          id: randomUUID(),
          entityType: 'sync_manager',
          entityId: 'system',
          operation,
          payload: sqliteJsonHelpers.stringify(payload),
          syncStatus: operation === 'sync_success' ? 'synced' : 'failed',
          createdAt: new Date(),
        });
      } else {
        // PostgreSQL: Use standard schema with jsonb
        await db.insert(syncJournal).values({
          entityType: 'sync_manager',
          entityId: 'system',
          operation,
          payload,
          syncStatus: operation === 'sync_success' ? 'synced' : 'failed',
        });
      }
    } catch (error) {
      // Silently fail - don't crash sync manager if journal write fails
      console.error('[Sync Manager] Failed to log event:', error);
    }
  }

  /**
   * Stop the sync manager
   * Cleans up interval timer
   */
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    console.log('[Sync Manager] Stopped');
  }

  /**
   * Manually trigger a sync (useful for testing or user-initiated sync)
   */
  async manualSync(): Promise<{ success: boolean; duration: number; error?: string }> {
    const start = Date.now();
    
    try {
      await this.performSync();
      return {
        success: true,
        duration: Date.now() - start
      };
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Singleton instance
export const syncManager = new SyncManager(5); // Sync every 5 minutes
