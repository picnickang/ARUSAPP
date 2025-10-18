import * as cron from 'node-cron';
import { db } from './db';
import { sql } from 'drizzle-orm';
import { isLocalMode } from './db-config';

/**
 * Performance Optimization: Materialized View Refresh Scheduler
 * 
 * Refreshes materialized views periodically to keep pre-aggregated data fresh.
 * These views significantly improve dashboard query performance by pre-computing
 * expensive aggregations.
 * 
 * IMPORTANT: Materialized views are PostgreSQL-only.
 * SQLite vessel mode uses regular views or direct queries instead.
 * 
 * Created: Oct 2025 (Performance Optimization Phase 1)
 */

/**
 * Setup scheduled refresh of materialized views
 * Runs every 5 minutes to keep dashboard data reasonably fresh
 * Only active in PostgreSQL cloud mode
 */
export function setupMaterializedViewRefresh() {
  // Skip materialized view refresh in SQLite mode (not supported)
  if (isLocalMode) {
    console.log('[MaterializedView] Skipped - SQLite mode uses regular views');
    return;
  }
  
  // Refresh every 5 minutes (reasonable balance between freshness and DB load)
  const refreshSchedule = '*/5 * * * *'; // Every 5 minutes
  
  cron.schedule(refreshSchedule, async () => {
    try {
      console.log('[MaterializedView] Starting scheduled refresh...');
      const startTime = Date.now();
      
      // Refresh latest equipment telemetry view (used by dashboard)
      await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_latest_equipment_telemetry`);
      console.log('[MaterializedView] ✓ Refreshed mv_latest_equipment_telemetry');
      
      // Refresh equipment health view (used by fleet health dashboard)
      await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_equipment_health`);
      console.log('[MaterializedView] ✓ Refreshed mv_equipment_health');
      
      const duration = Date.now() - startTime;
      console.log(`[MaterializedView] Completed refresh in ${duration}ms`);
      
    } catch (error) {
      console.error('[MaterializedView] Error refreshing views:', error);
      // Don't crash the server - log and continue
    }
  });
  
  console.log('[MaterializedView] Scheduler started (every 5 minutes)');
  
  // Run initial refresh on startup
  setTimeout(async () => {
    try {
      console.log('[MaterializedView] Running initial refresh...');
      await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_latest_equipment_telemetry`);
      await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_equipment_health`);
      console.log('[MaterializedView] ✓ Initial refresh complete');
    } catch (error) {
      console.error('[MaterializedView] Error in initial refresh:', error);
    }
  }, 5000); // Wait 5 seconds after server start
}
