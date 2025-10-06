/**
 * Insights Snapshot Scheduling System
 * Automated daily insights generation with cron scheduling
 * Also includes predictive maintenance scheduling
 */

import * as cron from 'node-cron';
import { jobQueue, JOB_TYPES } from './background-jobs';
import { mlAnalyticsService } from './ml-analytics-service';
import { storage } from './storage';

// Daily insights snapshots for different scopes
const INSIGHT_SCOPES = ['fleet', 'equipment', 'maintenance', 'compliance'] as const;

// Guard flags to prevent duplicate scheduler initialization
let insightsSchedulerInitialized = false;
let pdmSchedulerInitialized = false;

/**
 * Schedule daily insights snapshot generation
 */
export function setupInsightsSchedule(): void {
  if (insightsSchedulerInitialized) {
    console.log('⚠️ Insights scheduler already initialized, skipping...');
    return;
  }
  
  console.log('🧠 Setting up insights scheduling...');
  
  // Schedule daily insights at 3 AM (after backup at 2 AM)
  const insightsSchedule = process.env.INSIGHTS_CRON_SCHEDULE || '0 3 * * *';
  
  cron.schedule(insightsSchedule, async () => {
    try {
      console.log('🧠 Automated insights generation starting...');
      
      const orgId = process.env.DEFAULT_ORG_ID || 'default-org-id';
      
      // Generate insights for each scope
      for (const scope of INSIGHT_SCOPES) {
        console.log(`[Insights] Scheduling snapshot for scope: ${scope}`);
        
        await jobQueue.addJob(
          JOB_TYPES.INSIGHTS_SNAPSHOT_GENERATION,
          { orgId, scope },
          {
            priority: 'medium',
            maxAttempts: 3,
            retryBackoff: 5000 // 5 second backoff
          }
        );
      }
      
      console.log('🧠 All insight snapshot jobs scheduled successfully');
      
    } catch (error) {
      console.error('❌ Automated insights scheduling failed:', error);
    }
  });
  
  insightsSchedulerInitialized = true;
  console.log(`✅ Insights schedule configured (${insightsSchedule})`);
}

/**
 * Manually trigger insights generation for testing
 */
export async function triggerInsightsGeneration(orgId: string = 'default-org-id', scope: string = 'fleet'): Promise<string> {
  console.log(`[Insights] Manual trigger for org: ${orgId}, scope: ${scope}`);
  
  const jobId = await jobQueue.addJob(
    JOB_TYPES.INSIGHTS_SNAPSHOT_GENERATION,
    { orgId, scope },
    {
      priority: 'high',
      maxAttempts: 3,
      retryBackoff: 2000
    }
  );
  
  console.log(`[Insights] Job scheduled with ID: ${jobId}`);
  return jobId;
}

/**
 * Get insights job statistics
 */
export function getInsightsJobStats() {
  const stats = jobQueue.getStats();
  const recentJobs = jobQueue.getRecentJobs(20)
    .filter(job => job.id.includes('insights'));
  
  return {
    ...stats,
    recentInsightsJobs: recentJobs
  };
}

/**
 * Setup automated predictive maintenance analysis
 */
export function setupPredictiveMaintenanceSchedule(): void {
  if (pdmSchedulerInitialized) {
    console.log('⚠️ Predictive maintenance scheduler already initialized, skipping...');
    return;
  }
  
  console.log('🔮 Setting up predictive maintenance scheduling...');
  
  // Run every 6 hours to generate failure predictions
  const pdmSchedule = process.env.PDM_CRON_SCHEDULE || '0 */6 * * *';
  
  cron.schedule(pdmSchedule, async () => {
    try {
      console.log('🔮 Automated predictive maintenance analysis starting...');
      
      const orgId = process.env.DEFAULT_ORG_ID || 'default-org-id';
      
      // Get all active equipment
      const equipment = await storage.getEquipmentRegistry(orgId);
      const activeEquipment = equipment.filter(eq => eq.isActive);
      
      console.log(`[PdM] Analyzing ${activeEquipment.length} active equipment items`);
      
      // Generate failure predictions for each equipment
      let successCount = 0;
      let skipCount = 0;
      
      for (const eq of activeEquipment) {
        try {
          // Only run predictions for equipment with recent telemetry
          const recentTelemetry = await storage.getTelemetryHistory(eq.id, 'temperature', 24); // Last 24 hours
          
          if (recentTelemetry.length === 0) {
            skipCount++;
            continue; // Skip equipment without recent data
          }
          
          // Generate failure prediction
          const prediction = await mlAnalyticsService.predictFailure(orgId, eq.id, eq.type);
          
          if (prediction && prediction.failureProbability > 0.3) {
            console.log(`[PdM] Generated prediction for ${eq.name}: ${Math.round(prediction.failureProbability * 100)}% failure probability`);
            successCount++;
          }
          
        } catch (error) {
          console.error(`[PdM] Failed to generate prediction for equipment ${eq.id}:`, error);
        }
      }
      
      console.log(`🔮 Predictive maintenance analysis complete: ${successCount} predictions generated, ${skipCount} skipped (no data)`);
      
    } catch (error) {
      console.error('❌ Automated predictive maintenance scheduling failed:', error);
    }
  });
  
  pdmSchedulerInitialized = true;
  console.log(`✅ Predictive maintenance schedule configured (${pdmSchedule})`);
}

/**
 * Manually trigger predictive maintenance analysis for testing
 */
export async function triggerPredictiveMaintenanceAnalysis(orgId: string = 'default-org-id', equipmentId?: string): Promise<number> {
  console.log(`[PdM] Manual trigger for org: ${orgId}${equipmentId ? `, equipment: ${equipmentId}` : ''}`);
  
  try {
    if (equipmentId) {
      // Run for specific equipment
      const eq = await storage.getEquipment(orgId, equipmentId);
      if (!eq) {
        throw new Error(`Equipment not found: ${equipmentId}`);
      }
      
      const prediction = await mlAnalyticsService.predictFailure(orgId, equipmentId, eq.type);
      console.log(`[PdM] Prediction generated: ${Math.round(prediction.failureProbability * 100)}% failure probability`);
      return 1;
    } else {
      // Run for all active equipment
      const equipment = await storage.getEquipmentRegistry(orgId);
      const activeEquipment = equipment.filter(eq => eq.isActive);
      
      let count = 0;
      for (const eq of activeEquipment) {
        try {
          const prediction = await mlAnalyticsService.predictFailure(orgId, eq.id, eq.type);
          if (prediction && prediction.failureProbability > 0.3) {
            count++;
          }
        } catch (error) {
          console.error(`[PdM] Failed for equipment ${eq.id}:`, error);
        }
      }
      
      console.log(`[PdM] Generated ${count} predictions for ${activeEquipment.length} equipment items`);
      return count;
    }
  } catch (error) {
    console.error('[PdM] Manual trigger failed:', error);
    throw error;
  }
}