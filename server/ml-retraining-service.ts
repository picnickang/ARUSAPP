/**
 * ML Retraining Service
 * Automated system for detecting when models need retraining
 * based on performance degradation, user feedback, and data availability
 */

import { IStorage } from './storage.js';
import { db } from './db.js';
import { mlModels, modelPerformanceValidations, predictionFeedback, retrainingTriggers, failurePredictions, anomalyDetections } from '@shared/schema';
import { eq, and, gte, sql, desc, count } from 'drizzle-orm';

export interface RetrainingEvaluation {
  modelId: string;
  modelName: string;
  shouldRetrain: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  triggers: RetrainingTrigger[];
}

interface RetrainingTrigger {
  type: 'performance_degradation' | 'new_data_available' | 'user_feedback_threshold' | 'scheduled';
  reason: string;
  metrics: any;
}

const PERFORMANCE_THRESHOLDS = {
  accuracy: {
    critical: 0.6,  // Below 60% accuracy is critical
    high: 0.7,      // Below 70% is high priority
    medium: 0.8     // Below 80% is medium priority
  },
  feedbackThreshold: {
    critical: 10,   // 10+ negative feedback items
    high: 5,        // 5-9 negative feedback items
    medium: 3       // 3-4 negative feedback items
  },
  daysSinceTraining: {
    critical: 180,  // 6 months without retraining
    high: 90,       // 3 months
    medium: 60      // 2 months
  },
  minNewDataPoints: 50  // Minimum new data points to justify retraining
};

export class MLRetrainingService {
  constructor(private storage: IStorage) {}

  /**
   * Evaluate all active models for retraining needs
   */
  async evaluateAllModels(orgId: string): Promise<RetrainingEvaluation[]> {
    console.log(`[Retraining] Evaluating all models for org: ${orgId}`);

    const activeModels = await db
      .select()
      .from(mlModels)
      .where(and(
        eq(mlModels.orgId, orgId),
        eq(mlModels.status, 'active')
      ));

    console.log(`[Retraining] Found ${activeModels.length} active models`);

    const evaluations: RetrainingEvaluation[] = [];

    for (const model of activeModels) {
      const evaluation = await this.evaluateModel(model, orgId);
      evaluations.push(evaluation);
    }

    return evaluations;
  }

  /**
   * Evaluate a single model for retraining
   */
  private async evaluateModel(model: typeof mlModels.$inferSelect, orgId: string): Promise<RetrainingEvaluation> {
    const triggers: RetrainingTrigger[] = [];

    // 1. Check performance degradation
    const performanceTrigger = await this.checkPerformanceDegradation(model.id, orgId);
    if (performanceTrigger) {
      triggers.push(performanceTrigger);
    }

    // 2. Check user feedback
    const feedbackTrigger = await this.checkUserFeedback(model.id, orgId);
    if (feedbackTrigger) {
      triggers.push(feedbackTrigger);
    }

    // 3. Check data availability
    const dataTrigger = await this.checkDataAvailability(model, orgId);
    if (dataTrigger) {
      triggers.push(dataTrigger);
    }

    // 4. Check time since last training
    const timeTrigger = await this.checkTimeSinceTraining(model);
    if (timeTrigger) {
      triggers.push(timeTrigger);
    }

    // Determine overall priority
    const priority = this.calculatePriority(triggers);
    const shouldRetrain = triggers.length > 0;

    return {
      modelId: model.id,
      modelName: model.name,
      shouldRetrain,
      priority,
      triggers
    };
  }

  /**
   * Check if model performance has degraded
   */
  private async checkPerformanceDegradation(modelId: string, orgId: string): Promise<RetrainingTrigger | null> {
    // Get recent validations (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const recentValidations = await db
      .select()
      .from(modelPerformanceValidations)
      .where(and(
        eq(modelPerformanceValidations.modelId, modelId),
        eq(modelPerformanceValidations.orgId, orgId),
        gte(modelPerformanceValidations.createdAt, thirtyDaysAgo),
        sql`${modelPerformanceValidations.accuracyScore} IS NOT NULL`
      ))
      .orderBy(desc(modelPerformanceValidations.createdAt));

    if (recentValidations.length < 5) {
      // Not enough data to evaluate performance
      return null;
    }

    // Calculate average accuracy
    const avgAccuracy = recentValidations.reduce((sum, v) => sum + (v.accuracyScore || 0), 0) / recentValidations.length;

    // Check thresholds
    if (avgAccuracy < PERFORMANCE_THRESHOLDS.accuracy.critical) {
      return {
        type: 'performance_degradation',
        reason: `Model accuracy has dropped to ${(avgAccuracy * 100).toFixed(1)}% (below critical threshold of ${PERFORMANCE_THRESHOLDS.accuracy.critical * 100}%)`,
        metrics: {
          avgAccuracy,
          validationCount: recentValidations.length,
          threshold: PERFORMANCE_THRESHOLDS.accuracy.critical
        }
      };
    } else if (avgAccuracy < PERFORMANCE_THRESHOLDS.accuracy.high) {
      return {
        type: 'performance_degradation',
        reason: `Model accuracy is ${(avgAccuracy * 100).toFixed(1)}% (below high priority threshold)`,
        metrics: {
          avgAccuracy,
          validationCount: recentValidations.length,
          threshold: PERFORMANCE_THRESHOLDS.accuracy.high
        }
      };
    } else if (avgAccuracy < PERFORMANCE_THRESHOLDS.accuracy.medium) {
      return {
        type: 'performance_degradation',
        reason: `Model accuracy is ${(avgAccuracy * 100).toFixed(1)}% (below medium priority threshold)`,
        metrics: {
          avgAccuracy,
          validationCount: recentValidations.length,
          threshold: PERFORMANCE_THRESHOLDS.accuracy.medium
        }
      };
    }

    return null;
  }

  /**
   * Check user feedback for negative patterns
   */
  private async checkUserFeedback(modelId: string, orgId: string): Promise<RetrainingTrigger | null> {
    // Get recent negative feedback (last 60 days)
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    // Get all feedback for predictions from this model
    const feedbackResult = await db
      .select({ count: count() })
      .from(predictionFeedback)
      .where(and(
        eq(predictionFeedback.orgId, orgId),
        gte(predictionFeedback.createdAt, sixtyDaysAgo),
        sql`(${predictionFeedback.isAccurate} = false OR ${predictionFeedback.rating} <= 2 OR ${predictionFeedback.feedbackType} = 'flag')`
      ));

    const negativeFeedbackCount = feedbackResult[0]?.count || 0;

    if (negativeFeedbackCount >= PERFORMANCE_THRESHOLDS.feedbackThreshold.critical) {
      return {
        type: 'user_feedback_threshold',
        reason: `Received ${negativeFeedbackCount} negative feedback items (critical threshold: ${PERFORMANCE_THRESHOLDS.feedbackThreshold.critical})`,
        metrics: {
          negativeFeedbackCount,
          threshold: PERFORMANCE_THRESHOLDS.feedbackThreshold.critical,
          period: '60 days'
        }
      };
    } else if (negativeFeedbackCount >= PERFORMANCE_THRESHOLDS.feedbackThreshold.high) {
      return {
        type: 'user_feedback_threshold',
        reason: `Received ${negativeFeedbackCount} negative feedback items (high priority threshold)`,
        metrics: {
          negativeFeedbackCount,
          threshold: PERFORMANCE_THRESHOLDS.feedbackThreshold.high,
          period: '60 days'
        }
      };
    } else if (negativeFeedbackCount >= PERFORMANCE_THRESHOLDS.feedbackThreshold.medium) {
      return {
        type: 'user_feedback_threshold',
        reason: `Received ${negativeFeedbackCount} negative feedback items (medium priority threshold)`,
        metrics: {
          negativeFeedbackCount,
          threshold: PERFORMANCE_THRESHOLDS.feedbackThreshold.medium,
          period: '60 days'
        }
      };
    }

    return null;
  }

  /**
   * Check if new data is available for training
   */
  private async checkDataAvailability(model: typeof mlModels.$inferSelect, orgId: string): Promise<RetrainingTrigger | null> {
    // Get date of last training
    const lastTrainingDate = model.deployedAt || model.createdAt;
    if (!lastTrainingDate) return null;

    // Count new failure predictions since last training
    const newFailures = await db
      .select({ count: count() })
      .from(failurePredictions)
      .where(and(
        eq(failurePredictions.orgId, orgId),
        gte(failurePredictions.predictionTimestamp, lastTrainingDate),
        sql`${failurePredictions.actualFailureOccurred} IS NOT NULL` // Only count verified outcomes
      ));

    // Count new anomaly detections since last training
    const newAnomalies = await db
      .select({ count: count() })
      .from(anomalyDetections)
      .where(and(
        eq(anomalyDetections.orgId, orgId),
        gte(anomalyDetections.detectionTimestamp, lastTrainingDate),
        sql`${anomalyDetections.actualFailureOccurred} IS NOT NULL` // Only count verified outcomes
      ));

    const totalNewDataPoints = (newFailures[0]?.count || 0) + (newAnomalies[0]?.count || 0);

    if (totalNewDataPoints >= PERFORMANCE_THRESHOLDS.minNewDataPoints) {
      return {
        type: 'new_data_available',
        reason: `${totalNewDataPoints} new verified data points available since last training`,
        metrics: {
          newFailures: newFailures[0]?.count || 0,
          newAnomalies: newAnomalies[0]?.count || 0,
          totalNewDataPoints,
          threshold: PERFORMANCE_THRESHOLDS.minNewDataPoints
        }
      };
    }

    return null;
  }

  /**
   * Check time since last training
   */
  private async checkTimeSinceTraining(model: typeof mlModels.$inferSelect): Promise<RetrainingTrigger | null> {
    const lastTrainingDate = model.deployedAt || model.createdAt;
    if (!lastTrainingDate) return null;

    const daysSinceTraining = Math.floor((Date.now() - lastTrainingDate.getTime()) / (24 * 60 * 60 * 1000));

    if (daysSinceTraining >= PERFORMANCE_THRESHOLDS.daysSinceTraining.critical) {
      return {
        type: 'scheduled',
        reason: `Model has not been retrained in ${daysSinceTraining} days (critical threshold: ${PERFORMANCE_THRESHOLDS.daysSinceTraining.critical} days)`,
        metrics: {
          daysSinceTraining,
          threshold: PERFORMANCE_THRESHOLDS.daysSinceTraining.critical,
          lastTrainingDate
        }
      };
    } else if (daysSinceTraining >= PERFORMANCE_THRESHOLDS.daysSinceTraining.high) {
      return {
        type: 'scheduled',
        reason: `Model has not been retrained in ${daysSinceTraining} days (high priority threshold)`,
        metrics: {
          daysSinceTraining,
          threshold: PERFORMANCE_THRESHOLDS.daysSinceTraining.high,
          lastTrainingDate
        }
      };
    } else if (daysSinceTraining >= PERFORMANCE_THRESHOLDS.daysSinceTraining.medium) {
      return {
        type: 'scheduled',
        reason: `Model has not been retrained in ${daysSinceTraining} days (medium priority threshold)`,
        metrics: {
          daysSinceTraining,
          threshold: PERFORMANCE_THRESHOLDS.daysSinceTraining.medium,
          lastTrainingDate
        }
      };
    }

    return null;
  }

  /**
   * Calculate overall priority based on triggers
   */
  private calculatePriority(triggers: RetrainingTrigger[]): 'low' | 'medium' | 'high' | 'critical' {
    if (triggers.length === 0) return 'low';

    // If any trigger mentions "critical", return critical
    if (triggers.some(t => t.reason.toLowerCase().includes('critical'))) {
      return 'critical';
    }

    // If any trigger mentions "high priority", return high
    if (triggers.some(t => t.reason.toLowerCase().includes('high priority'))) {
      return 'high';
    }

    // If multiple triggers or mentions "medium", return medium
    if (triggers.length >= 2 || triggers.some(t => t.reason.toLowerCase().includes('medium'))) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Create retraining triggers for models that need retraining
   */
  async createRetrainingTriggers(evaluations: RetrainingEvaluation[], orgId: string): Promise<number> {
    let triggersCreated = 0;

    for (const evaluation of evaluations) {
      if (!evaluation.shouldRetrain) continue;

      // Check if a pending trigger already exists for this model
      const existingTrigger = await db
        .select()
        .from(retrainingTriggers)
        .where(and(
          eq(retrainingTriggers.modelId, evaluation.modelId),
          eq(retrainingTriggers.orgId, orgId),
          eq(retrainingTriggers.status, 'pending')
        ))
        .limit(1);

      if (existingTrigger.length > 0) {
        console.log(`[Retraining] Trigger already exists for model ${evaluation.modelName}, skipping`);
        continue;
      }

      // Get model details
      const model = await db
        .select()
        .from(mlModels)
        .where(eq(mlModels.id, evaluation.modelId))
        .limit(1);

      if (model.length === 0) continue;

      const lastTrainingDate = model[0].deployedAt || model[0].createdAt;
      const daysSinceTraining = lastTrainingDate 
        ? Math.floor((Date.now() - lastTrainingDate.getTime()) / (24 * 60 * 60 * 1000))
        : 0;

      // Create trigger
      await db.insert(retrainingTriggers).values({
        orgId,
        modelId: evaluation.modelId,
        equipmentType: model[0].targetEquipmentType,
        triggerType: evaluation.triggers[0].type,
        triggerReason: evaluation.triggers.map(t => t.reason).join('; '),
        triggerMetrics: {
          triggers: evaluation.triggers,
          evaluationDate: new Date().toISOString()
        },
        currentPerformance: model[0].performance,
        newDataPoints: evaluation.triggers.find(t => t.type === 'new_data_available')?.metrics?.totalNewDataPoints,
        negativeFeedbackCount: evaluation.triggers.find(t => t.type === 'user_feedback_threshold')?.metrics?.negativeFeedbackCount,
        lastTrainingDate,
        daysSinceTraining,
        priority: evaluation.priority,
        status: 'pending',
        triggeredBy: 'system'
      });

      triggersCreated++;
      console.log(`[Retraining] Created ${evaluation.priority} priority trigger for model: ${evaluation.modelName}`);
    }

    return triggersCreated;
  }

  /**
   * Get pending retraining triggers
   */
  async getPendingTriggers(orgId: string): Promise<typeof retrainingTriggers.$inferSelect[]> {
    return await db
      .select()
      .from(retrainingTriggers)
      .where(and(
        eq(retrainingTriggers.orgId, orgId),
        eq(retrainingTriggers.status, 'pending')
      ))
      .orderBy(desc(retrainingTriggers.priority), desc(retrainingTriggers.createdAt));
  }
}

// Export service instance - will be initialized after storage is imported
let mlRetrainingServiceInstance: MLRetrainingService | null = null;

export const getMlRetrainingService = async (): Promise<MLRetrainingService> => {
  if (!mlRetrainingServiceInstance) {
    const { storage } = await import('./storage.js');
    mlRetrainingServiceInstance = new MLRetrainingService(storage);
  }
  return mlRetrainingServiceInstance;
};

// For synchronous access after initialization
export const mlRetrainingService = new Proxy({} as MLRetrainingService, {
  get(_target, prop) {
    if (!mlRetrainingServiceInstance) {
      throw new Error('MLRetrainingService not initialized - use getMlRetrainingService() first');
    }
    return (mlRetrainingServiceInstance as any)[prop];
  }
});
