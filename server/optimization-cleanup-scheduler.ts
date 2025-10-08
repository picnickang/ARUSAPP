/**
 * Optimization Cleanup Scheduling System
 * Automated cleanup of old failed/cancelled optimization results
 */

import * as cron from 'node-cron';
import { storage } from './storage';

// Guard flag to prevent duplicate scheduler initialization
let cleanupSchedulerInitialized = false;

/**
 * Schedule automatic cleanup of old failed/cancelled optimization results
 * Runs daily at 4 AM to clean up results older than configured threshold
 */
export function setupOptimizationCleanupSchedule(): void {
  if (cleanupSchedulerInitialized) {
    console.log('⚠️ Optimization cleanup scheduler already initialized, skipping...');
    return;
  }
  
  console.log('🧹 Setting up optimization cleanup scheduling...');
  
  // Schedule daily cleanup at 4 AM
  const cleanupSchedule = process.env.OPTIMIZATION_CLEANUP_CRON || '0 4 * * *';
  
  cron.schedule(cleanupSchedule, async () => {
    try {
      console.log('🧹 Automated optimization cleanup starting...');
      
      const orgId = process.env.DEFAULT_ORG_ID || 'default-org-id';
      
      // Get all optimization results
      const results = await storage.getOptimizationResults(orgId);
      
      // Define cleanup threshold (default: 7 days)
      const cleanupThresholdDays = parseInt(process.env.OPTIMIZATION_CLEANUP_DAYS || '7', 10);
      const cleanupThresholdMs = cleanupThresholdDays * 24 * 60 * 60 * 1000;
      const now = Date.now();
      
      let deletedCount = 0;
      
      // Clean up old failed and cancelled optimizations
      // Note: Cancelled optimizations are marked with runStatus='failed' in the system
      for (const result of results) {
        if (result.runStatus === 'failed') {
          const resultAge = now - new Date(result.startTime).getTime();
          
          if (resultAge > cleanupThresholdMs) {
            console.log(`[Cleanup] Deleting old failed/cancelled optimization: ${result.id} (age: ${Math.round(resultAge / (24 * 60 * 60 * 1000))} days)`);
            await storage.deleteOptimizationResult(result.id);
            deletedCount++;
          }
        }
      }
      
      console.log(`✅ Optimization cleanup completed: ${deletedCount} old result(s) deleted`);
      
    } catch (error) {
      console.error('❌ Automated optimization cleanup failed:', error);
    }
  });
  
  cleanupSchedulerInitialized = true;
  console.log(`✅ Optimization cleanup schedule configured (${cleanupSchedule})`);
}

/**
 * Manually trigger cleanup for testing
 */
export async function triggerOptimizationCleanup(orgId: string = 'default-org-id', thresholdDays: number = 7): Promise<number> {
  console.log(`[Cleanup] Manual trigger for org: ${orgId}, threshold: ${thresholdDays} days`);
  
  const results = await storage.getOptimizationResults(orgId);
  const cleanupThresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  
  let deletedCount = 0;
  
  // Clean up old failed and cancelled optimizations
  // Note: Cancelled optimizations are marked with runStatus='failed' in the system
  for (const result of results) {
    if (result.runStatus === 'failed') {
      const resultAge = now - new Date(result.startTime).getTime();
      
      if (resultAge > cleanupThresholdMs) {
        console.log(`[Cleanup] Deleting old failed/cancelled optimization: ${result.id}`);
        await storage.deleteOptimizationResult(result.id);
        deletedCount++;
      }
    }
  }
  
  console.log(`[Cleanup] Manual cleanup completed: ${deletedCount} result(s) deleted`);
  return deletedCount;
}
