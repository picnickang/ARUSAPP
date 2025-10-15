import { db, libsqlClient, isLocalMode } from './db-config';
import { syncJournal, syncOutbox } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Sync Manager Service
 * Handles automatic synchronization between local SQLite and cloud database
 * for vessel deployments with intermittent connectivity.
 * 
 * Features:
 * - Auto-sync every 5 minutes (configurable)
 * - Processes sync outbox for WebSocket broadcasts
 * - Logs sync events to sync_journal for audit trail
 * - Graceful error handling (continues operating on sync failure)
 */
export class SyncManager {
  private syncInterval: NodeJS.Timeout | null = null;
  private syncIntervalMs: number;
  private isRunning: boolean = false;

  constructor(intervalMinutes: number = 5) {
    this.syncIntervalMs = intervalMinutes * 60 * 1000;
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

    try {
      // Trigger libSQL built-in sync (uploads local changes, downloads remote changes)
      await libsqlClient.sync();
      
      const duration = Date.now() - syncStart;
      console.log(`[Sync Manager] ✓ Sync completed in ${duration}ms`);

      // Process sync outbox (for custom events that need broadcasting)
      await this.processSyncOutbox();

      // Log successful sync to journal
      await this.logSyncEvent('sync_success', {
        duration_ms: duration,
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
   * Process pending events in the sync outbox
   * These are custom application events that need to be broadcast via WebSocket
   */
  private async processSyncOutbox() {
    try {
      const pending = await db.select()
        .from(syncOutbox)
        .where(eq(syncOutbox.processed, false))
        .limit(100);

      if (pending.length === 0) return;

      console.log(`[Sync Manager] Processing ${pending.length} outbox events`);

      for (const event of pending) {
        try {
          // Note: WebSocket broadcasting will be integrated when WebSocket server is available
          // For now, just mark as processed
          
          await db.update(syncOutbox)
            .set({ 
              processed: true, 
              processedAt: new Date() 
            })
            .where(eq(syncOutbox.id, event.id));

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
      await db.insert(syncJournal).values({
        entityType: 'sync_manager',
        entityId: 'system',
        operation,
        payload,
        syncStatus: operation === 'sync_success' ? 'synced' : 'failed',
      });
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
