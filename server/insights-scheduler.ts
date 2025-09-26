/**
 * Insights Snapshot Scheduling System
 * Automated daily insights generation with cron scheduling
 */

import * as cron from 'node-cron';
import { jobQueue, JOB_TYPES } from './background-jobs';

// Daily insights snapshots for different scopes
const INSIGHT_SCOPES = ['fleet', 'equipment', 'maintenance', 'compliance'] as const;

/**
 * Schedule daily insights snapshot generation
 */
export function setupInsightsSchedule(): void {
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