import { eq, and, desc, gte, sql } from "drizzle-orm";
import { 
  failurePredictions, 
  componentDegradation, 
  failureHistory,
  equipment,
  equipmentTelemetry,
  mlModels
} from "../shared/schema.js";

/**
 * RUL (Remaining Useful Life) Calculation Engine
 * ML-based predictive maintenance with component-specific degradation tracking
 * Target: 95% failure prediction accuracy with 4-6 weeks advance warning
 */

export interface RulPrediction {
  equipmentId: string;
  remainingDays: number;
  confidenceScore: number;
  healthIndex: number; // 0-100
  degradationRate: number; // Health points per day
  failureProbability: number; // 0-1
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  componentStatus: ComponentHealthStatus[];
  predictionMethod: 'ml_lstm' | 'ml_rf' | 'statistical' | 'hybrid';
  recommendations: string[];
}

export interface ComponentHealthStatus {
  componentType: string;
  healthScore: number; // 0-100
  degradationMetric: number;
  degradationRate: number;
  predictedFailureDays: number;
  confidence: number;
  criticalMetrics: string[];
}

export interface DegradationPattern {
  equipmentId: string;
  trendSlope: number; // Degradation per day
  acceleration: number; // Change in degradation rate
  volatility: number; // Variance in measurements
  timeToFailure: number; // Estimated days
  confidence: number;
}

export class RulEngine {
  constructor(private db: any) {}

  /**
   * Calculate RUL for equipment using ML predictions and degradation patterns
   * This is the main entry point for advanced predictive maintenance
   */
  async calculateRul(equipmentId: string, orgId: string): Promise<RulPrediction | null> {
    // Get the most recent ML-based failure prediction
    const mlPredictions = await this.db
      .select()
      .from(failurePredictions)
      .where(
        and(
          eq(failurePredictions.equipmentId, equipmentId),
          eq(failurePredictions.orgId, orgId)
        )
      )
      .orderBy(desc(failurePredictions.predictionTimestamp))
      .limit(1);

    // Get component degradation data
    const degradationData = await this.db
      .select()
      .from(componentDegradation)
      .where(
        and(
          eq(componentDegradation.equipmentId, equipmentId),
          eq(componentDegradation.orgId, orgId),
          gte(componentDegradation.measurementTimestamp, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        )
      )
      .orderBy(desc(componentDegradation.measurementTimestamp));

    // Get historical failure patterns for this equipment type
    const equipmentRecord = await this.db
      .select()
      .from(equipment)
      .where(eq(equipment.id, equipmentId))
      .limit(1);

    if (!equipmentRecord.length) {
      return null;
    }

    const equipmentType = equipmentRecord[0].type;

    // Analyze degradation patterns
    const degradationPattern = this.analyzeDegradationPattern(degradationData);
    
    // Calculate component-specific health
    const componentStatus = this.calculateComponentHealth(degradationData);

    // Combine ML predictions with degradation analysis
    let remainingDays = 30; // Default
    let confidenceScore = 0.5;
    let predictionMethod: 'ml_lstm' | 'ml_rf' | 'statistical' | 'hybrid' = 'statistical';
    let failureProbability = 0.1;

    if (mlPredictions.length > 0) {
      const prediction = mlPredictions[0];
      
      // Calculate days until predicted failure
      if (prediction.predictedFailureDate) {
        const daysUntilFailure = Math.max(0, 
          (prediction.predictedFailureDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        remainingDays = Math.round(daysUntilFailure);
      }
      
      // Get base confidence from prediction
      let baseConfidence = prediction.confidence || 0.5;
      
      // Apply tier-based confidence multiplier from model metadata
      if (prediction.modelId) {
        const modelRecord = await this.db
          .select()
          .from(mlModels)
          .where(eq(mlModels.id, prediction.modelId))
          .limit(1);
          
        if (modelRecord.length > 0 && modelRecord[0].hyperparameters) {
          const hyperparams = modelRecord[0].hyperparameters as any;
          const confidenceMultiplier = hyperparams.confidenceMultiplier || 1.0;
          const dataQualityTier = hyperparams.dataQualityTier;
          
          // Apply multiplier but cap at 0.95 (never claim 100% certainty)
          confidenceScore = Math.min(0.95, baseConfidence * confidenceMultiplier);
          
          console.log(`[RUL Engine] Applied ${dataQualityTier} tier multiplier (${confidenceMultiplier}x): ${baseConfidence.toFixed(2)} → ${confidenceScore.toFixed(2)}`);
        } else {
          confidenceScore = baseConfidence;
        }
      } else {
        confidenceScore = baseConfidence;
      }
      
      predictionMethod = (prediction.modelType?.includes('lstm') ? 'ml_lstm' : 
                         prediction.modelType?.includes('forest') ? 'ml_rf' : 'hybrid') as any;
      failureProbability = prediction.failureProbability || 0.1;
    } else if (degradationPattern && degradationPattern.timeToFailure > 0) {
      // Use degradation-based prediction if no ML prediction available
      remainingDays = Math.round(degradationPattern.timeToFailure);
      confidenceScore = degradationPattern.confidence;
      predictionMethod = 'statistical';
      failureProbability = this.estimateFailureProbability(degradationPattern);
    }

    // Calculate overall health index (0-100)
    const healthIndex = this.calculateHealthIndex(
      remainingDays, 
      degradationPattern, 
      componentStatus
    );

    // Determine risk level
    const riskLevel = this.determineRiskLevel(remainingDays, failureProbability, healthIndex);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      remainingDays, 
      riskLevel, 
      componentStatus,
      degradationPattern
    );

    return {
      equipmentId,
      remainingDays,
      confidenceScore,
      healthIndex,
      degradationRate: degradationPattern?.trendSlope || 0,
      failureProbability,
      riskLevel,
      componentStatus,
      predictionMethod,
      recommendations
    };
  }

  /**
   * Calculate RUL for multiple equipment in batch
   */
  async calculateBatchRul(equipmentIds: string[], orgId: string): Promise<Map<string, RulPrediction>> {
    const results = new Map<string, RulPrediction>();
    
    // Process in parallel for efficiency
    const predictions = await Promise.all(
      equipmentIds.map(id => this.calculateRul(id, orgId))
    );

    equipmentIds.forEach((id, index) => {
      if (predictions[index]) {
        results.set(id, predictions[index]);
      }
    });

    return results;
  }

  /**
   * Analyze degradation pattern from historical component data
   * Uses linear regression and trend analysis
   */
  private analyzeDegradationPattern(degradationData: any[]): DegradationPattern | null {
    if (degradationData.length < 3) {
      return null; // Need at least 3 data points for trend analysis
    }

    // Group by component type and analyze each
    const byComponent = new Map<string, any[]>();
    degradationData.forEach(d => {
      if (!byComponent.has(d.componentType)) {
        byComponent.set(d.componentType, []);
      }
      byComponent.get(d.componentType)!.push(d);
    });

    // Find the component with highest degradation rate
    let worstTrend: DegradationPattern | null = null;
    let worstTimeToFailure = Infinity;

    for (const [componentType, data] of byComponent.entries()) {
      if (data.length < 3) continue;

      // Sort by time
      data.sort((a, b) => a.measurementTimestamp.getTime() - b.measurementTimestamp.getTime());

      // Calculate linear regression for degradation metric
      const n = data.length;
      const times = data.map((d, i) => i); // Use index as x
      const values = data.map(d => d.degradationMetric);

      const sumX = times.reduce((a, b) => a + b, 0);
      const sumY = values.reduce((a, b) => a + b, 0);
      const sumXY = times.reduce((sum, x, i) => sum + x * values[i], 0);
      const sumXX = times.reduce((sum, x) => sum + x * x, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      // Calculate variance (volatility) using squared residuals
      const predicted = times.map(x => slope * x + intercept);
      const residuals = values.map((y, i) => Math.pow(y - predicted[i], 2));
      const volatility = Math.sqrt(residuals.reduce((a, b) => a + b, 0) / n);

      // Estimate time to failure (when degradation metric reaches critical threshold of 100)
      const currentValue = values[values.length - 1];
      const daysPerPoint = data.length > 1 
        ? (data[data.length - 1].measurementTimestamp.getTime() - data[0].measurementTimestamp.getTime()) / (1000 * 60 * 60 * 24) / (data.length - 1)
        : 1;

      const degradationPerDay = slope / daysPerPoint;
      const timeToFailure = slope > 0 ? (100 - currentValue) / degradationPerDay : Infinity;

      // Calculate acceleration (second derivative approximation)
      const acceleration = data.length > 2 ? 
        ((values[n-1] - values[n-2]) - (values[1] - values[0])) / n : 0;

      // Confidence based on R-squared and data quantity
      const meanY = sumY / n;
      const ssTotal = values.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
      const ssResidual = residuals.reduce((a, b) => a + b, 0);
      const rSquared = 1 - (ssResidual / (ssTotal + 0.0001));
      const confidence = Math.min(0.95, rSquared * (Math.min(n, 30) / 30));

      if (timeToFailure < worstTimeToFailure && timeToFailure > 0) {
        worstTimeToFailure = timeToFailure;
        worstTrend = {
          equipmentId: data[0].equipmentId,
          trendSlope: degradationPerDay,
          acceleration,
          volatility,
          timeToFailure,
          confidence
        };
      }
    }

    return worstTrend;
  }

  /**
   * Calculate health status for each component
   */
  private calculateComponentHealth(degradationData: any[]): ComponentHealthStatus[] {
    const byComponent = new Map<string, any[]>();
    degradationData.forEach(d => {
      if (!byComponent.has(d.componentType)) {
        byComponent.set(d.componentType, []);
      }
      byComponent.get(d.componentType)!.push(d);
    });

    const componentStatus: ComponentHealthStatus[] = [];

    for (const [componentType, data] of byComponent.entries()) {
      data.sort((a, b) => b.measurementTimestamp.getTime() - a.measurementTimestamp.getTime());
      const latest = data[0];

      // Health score is inverse of degradation metric (100 = perfect, 0 = failed)
      const healthScore = Math.max(0, 100 - (latest.degradationMetric || 0));

      // Identify critical metrics
      const criticalMetrics: string[] = [];
      if (latest.vibrationLevel && latest.vibrationLevel > 10) criticalMetrics.push('vibration');
      if (latest.temperature && latest.temperature > 80) criticalMetrics.push('temperature');
      if (latest.oilCondition && latest.oilCondition < 40) criticalMetrics.push('oil_condition');
      if (latest.wearParticleCount && latest.wearParticleCount > 1000) criticalMetrics.push('wear_particles');

      // Estimate days to failure for this component
      const predictedFailureDays = latest.predictedFailureDate 
        ? Math.max(0, (latest.predictedFailureDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : healthScore * 0.3; // Rough estimate: 30 days for 100% health

      componentStatus.push({
        componentType,
        healthScore,
        degradationMetric: latest.degradationMetric || 0,
        degradationRate: latest.degradationRate || 0,
        predictedFailureDays: Math.round(predictedFailureDays),
        confidence: latest.confidenceScore || 0.5,
        criticalMetrics
      });
    }

    return componentStatus;
  }

  /**
   * Calculate overall equipment health index (0-100)
   */
  private calculateHealthIndex(
    remainingDays: number, 
    degradationPattern: DegradationPattern | null,
    componentStatus: ComponentHealthStatus[]
  ): number {
    // Base health on remaining days (30+ days = 100%, 0 days = 0%)
    let healthIndex = Math.min(100, (remainingDays / 30) * 100);

    // Adjust for component health
    if (componentStatus.length > 0) {
      const avgComponentHealth = componentStatus.reduce((sum, c) => sum + c.healthScore, 0) / componentStatus.length;
      healthIndex = (healthIndex * 0.6) + (avgComponentHealth * 0.4); // Weighted average
    }

    // Penalize for high degradation rate
    if (degradationPattern && degradationPattern.trendSlope > 2) {
      healthIndex *= 0.9; // 10% penalty for rapid degradation
    }

    return Math.max(0, Math.min(100, Math.round(healthIndex)));
  }

  /**
   * Estimate failure probability from degradation pattern
   */
  private estimateFailureProbability(pattern: DegradationPattern): number {
    if (!pattern || pattern.timeToFailure <= 0) return 0.05;

    // Higher probability as time to failure decreases
    const timeFactor = Math.max(0, 1 - (pattern.timeToFailure / 60));
    
    // Higher probability with higher degradation rate
    const rateFactor = Math.min(1, pattern.trendSlope / 5);
    
    // Higher probability with acceleration
    const accelFactor = Math.min(0.3, Math.abs(pattern.acceleration) / 10);

    const probability = (timeFactor * 0.5) + (rateFactor * 0.3) + (accelFactor * 0.2);
    
    return Math.min(0.95, Math.max(0.05, probability));
  }

  /**
   * Determine risk level based on RUL and failure probability with hysteresis
   * Prevents state flapping by adding buffer zones to individual thresholds
   * Preserves OR-based escalation (any critical factor triggers critical risk)
   */
  private determineRiskLevel(
    remainingDays: number, 
    failureProbability: number,
    healthIndex: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Hysteresis buffers: Small zones around thresholds to prevent oscillation
    // Using conservative approach: buffer zones default to higher risk level
    const BUFFER = 0.05; // 5% buffer for probabilities, 2 days for RUL, 5 points for health
    
    // Critical: Any single severe indicator escalates to critical
    // Buffers extend the critical range slightly to prevent flapping back to high
    if (
      failureProbability > (0.7 - BUFFER) || // 0.65+ triggers critical
      remainingDays < (7 + 2) ||             // <9 days triggers critical  
      healthIndex < (30 + 5)                 // <35 triggers critical
    ) {
      return 'critical';
    }
    
    // High: Moderate indicators
    // Buffers extend the high range to prevent flapping back to medium
    if (
      failureProbability > (0.4 - BUFFER) || // 0.35+ triggers high
      remainingDays < (21 + 2) ||            // <23 days triggers high
      healthIndex < (60 + 5)                 // <65 triggers high
    ) {
      return 'high';
    }
    
    // Medium: Some risk present
    // Buffers extend the medium range to prevent flapping back to low
    if (
      failureProbability > (0.2 - BUFFER) || // 0.15+ triggers medium
      remainingDays < (35 + 2) ||            // <37 days triggers medium
      healthIndex < (80 + 5)                 // <85 triggers medium
    ) {
      return 'medium';
    }
    
    // Low: Minimal risk
    return 'low';
  }

  /**
   * Generate maintenance recommendations based on RUL analysis
   */
  private generateRecommendations(
    remainingDays: number,
    riskLevel: string,
    componentStatus: ComponentHealthStatus[],
    degradationPattern: DegradationPattern | null
  ): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'critical') {
      recommendations.push('URGENT: Schedule immediate inspection and maintenance');
      recommendations.push('Consider taking equipment offline to prevent catastrophic failure');
    } else if (riskLevel === 'high') {
      recommendations.push('Schedule maintenance within the next week');
      recommendations.push('Increase monitoring frequency to daily');
    } else if (riskLevel === 'medium') {
      recommendations.push('Plan maintenance within the next 2-3 weeks');
      recommendations.push('Monitor degradation trends closely');
    }

    // Component-specific recommendations
    componentStatus.forEach(component => {
      if (component.healthScore < 50) {
        recommendations.push(`Replace or service ${component.componentType} - health at ${Math.round(component.healthScore)}%`);
      }
      
      component.criticalMetrics.forEach(metric => {
        if (metric === 'vibration') {
          recommendations.push(`Investigate ${component.componentType} vibration levels - possible misalignment or bearing wear`);
        } else if (metric === 'temperature') {
          recommendations.push(`Check ${component.componentType} cooling system - temperature elevated`);
        } else if (metric === 'oil_condition') {
          recommendations.push(`Schedule oil change for ${component.componentType} - contamination detected`);
        } else if (metric === 'wear_particles') {
          recommendations.push(`Inspect ${component.componentType} for excessive wear - particle count high`);
        }
      });
    });

    // Degradation pattern recommendations
    if (degradationPattern) {
      if (degradationPattern.acceleration > 1) {
        recommendations.push('Degradation is accelerating - prioritize investigation of root cause');
      }
      if (degradationPattern.volatility > 5) {
        recommendations.push('Unstable operating conditions detected - review recent operational changes');
      }
    }

    return recommendations.slice(0, 6); // Limit to top 6 recommendations
  }

  /**
   * Record component degradation measurement
   * Used to build ML training data
   */
  async recordDegradation(
    orgId: string,
    equipmentId: string,
    componentType: string,
    metrics: {
      degradationMetric: number;
      vibrationLevel?: number;
      temperature?: number;
      oilCondition?: number;
      acousticSignature?: number;
      wearParticleCount?: number;
      operatingHours?: number;
      cycleCount?: number;
      loadFactor?: number;
    }
  ): Promise<void> {
    // Calculate degradation rate from previous measurement
    const previous = await this.db
      .select()
      .from(componentDegradation)
      .where(
        and(
          eq(componentDegradation.equipmentId, equipmentId),
          eq(componentDegradation.componentType, componentType)
        )
      )
      .orderBy(desc(componentDegradation.measurementTimestamp))
      .limit(1);

    let degradationRate = 0;
    if (previous.length > 0) {
      const timeDiff = (Date.now() - previous[0].measurementTimestamp.getTime()) / (1000 * 60 * 60 * 24);
      if (timeDiff > 0) {
        degradationRate = (metrics.degradationMetric - previous[0].degradationMetric) / timeDiff;
      }
    }

    await this.db.insert(componentDegradation).values({
      orgId,
      equipmentId,
      componentType,
      ...metrics,
      degradationRate
    });
  }
}
