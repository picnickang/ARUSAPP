import { mean, standardDeviation, quantile } from "simple-statistics";
import { db } from "./db";
import { equipmentTelemetry, sensorConfigurations, thresholdOptimizations, equipment } from "@shared/schema";
import { eq, and, desc, gte, sql } from "drizzle-orm";

/**
 * Statistical Threshold Optimization Service
 * Analyzes historical sensor data to recommend optimal thresholds
 */

interface SensorStats {
  mean: number;
  stdDev: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  sampleSize: number;
}

interface ThresholdRecommendation {
  warnLo: number | null;
  warnHi: number | null;
  critLo: number | null;
  critHi: number | null;
  confidence: number;
  method: string;
  reasoning: string;
}

export class SensorOptimizationService {
  /**
   * Analyze sensor data and recommend optimal thresholds
   */
  async analyzeSensorThresholds(
    equipmentId: string,
    sensorType: string,
    orgId: string,
    daysOfHistory: number = 30
  ): Promise<ThresholdRecommendation | null> {
    // Get historical telemetry data
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOfHistory);

    const telemetryData = await db
      .select({
        value: equipmentTelemetry.value,
        timestamp: equipmentTelemetry.timestamp,
      })
      .from(equipmentTelemetry)
      .where(
        and(
          eq(equipmentTelemetry.equipmentId, equipmentId),
          eq(equipmentTelemetry.sensorType, sensorType),
          eq(equipmentTelemetry.orgId, orgId),
          gte(equipmentTelemetry.timestamp, cutoffDate)
        )
      )
      .orderBy(desc(equipmentTelemetry.timestamp))
      .limit(10000); // Limit to prevent memory issues

    if (telemetryData.length < 100) {
      console.log(`[Sensor Optimization] Insufficient data for ${equipmentId}/${sensorType}: ${telemetryData.length} readings`);
      return null;
    }

    // Extract valid numeric values
    const values = telemetryData
      .map(t => t.value)
      .filter(v => v !== null && isFinite(v)) as number[];

    if (values.length < 100) {
      return null;
    }

    // Calculate statistics
    const stats = this.calculateStats(values);
    
    // Determine threshold type based on sensor type
    const thresholds = this.calculateThresholds(sensorType, stats);

    return thresholds;
  }

  /**
   * Calculate statistical metrics from sensor values
   */
  private calculateStats(values: number[]): SensorStats {
    const sortedValues = [...values].sort((a, b) => a - b);
    
    return {
      mean: mean(values),
      stdDev: standardDeviation(values),
      p95: quantile(sortedValues, 0.95),
      p99: quantile(sortedValues, 0.99),
      min: Math.min(...values),
      max: Math.max(...values),
      sampleSize: values.length,
    };
  }

  /**
   * Calculate optimal thresholds based on sensor type and statistics
   */
  private calculateThresholds(
    sensorType: string,
    stats: SensorStats
  ): ThresholdRecommendation {
    const { mean: m, stdDev: s, p95, p99, min, max } = stats;

    // Different strategies for different sensor types
    switch (sensorType.toLowerCase()) {
      case 'temperature':
      case 'pressure':
      case 'vibration':
        // For "higher is worse" sensors: use statistical upper bounds
        return {
          warnLo: null,
          warnHi: Math.round((m + 2 * s) * 10) / 10,
          critLo: null,
          critHi: Math.round((m + 3 * s) * 10) / 10,
          confidence: this.calculateConfidence(stats),
          method: 'statistical_upper_bound',
          reasoning: `Based on ${stats.sampleSize} readings: mean=${m.toFixed(1)}, std=${s.toFixed(1)}. Warning at 2σ (${(m + 2*s).toFixed(1)}), Critical at 3σ (${(m + 3*s).toFixed(1)}).`
        };

      case 'oil_pressure':
      case 'flow_rate':
      case 'voltage':
      case 'current':
        // For "low is bad, high is also bad" sensors: use both bounds
        return {
          warnLo: Math.round((m - 2 * s) * 10) / 10,
          warnHi: Math.round((m + 2 * s) * 10) / 10,
          critLo: Math.round((m - 3 * s) * 10) / 10,
          critHi: Math.round((m + 3 * s) * 10) / 10,
          confidence: this.calculateConfidence(stats),
          method: 'statistical_both_bounds',
          reasoning: `Based on ${stats.sampleSize} readings: mean=${m.toFixed(1)}, std=${s.toFixed(1)}. Safe range: ${(m - 2*s).toFixed(1)} - ${(m + 2*s).toFixed(1)}.`
        };

      case 'rpm':
        // For RPM: use percentile-based approach
        return {
          warnLo: Math.round(min * 0.8),
          warnHi: Math.round(p95),
          critLo: Math.round(min * 0.7),
          critHi: Math.round(p99),
          confidence: this.calculateConfidence(stats),
          method: 'percentile_based',
          reasoning: `Based on ${stats.sampleSize} readings. Normal range: ${Math.round(min * 0.8)} - ${Math.round(p95)} RPM. P95=${Math.round(p95)}, P99=${Math.round(p99)}.`
        };

      default:
        // Generic approach: use 2σ and 3σ upper bounds
        return {
          warnLo: null,
          warnHi: Math.round((m + 2 * s) * 10) / 10,
          critLo: null,
          critHi: Math.round((m + 3 * s) * 10) / 10,
          confidence: this.calculateConfidence(stats),
          method: 'statistical_generic',
          reasoning: `Generic threshold for ${stats.sampleSize} readings: mean=${m.toFixed(1)}, std=${s.toFixed(1)}.`
        };
    }
  }

  /**
   * Calculate confidence score based on data quality
   */
  private calculateConfidence(stats: SensorStats): number {
    let confidence = 0;

    // Sample size factor (0-40 points)
    if (stats.sampleSize >= 1000) confidence += 40;
    else if (stats.sampleSize >= 500) confidence += 30;
    else if (stats.sampleSize >= 200) confidence += 20;
    else confidence += 10;

    // Stability factor (0-30 points) - lower CV is better
    const coefficientOfVariation = stats.stdDev / Math.abs(stats.mean);
    if (coefficientOfVariation < 0.1) confidence += 30;
    else if (coefficientOfVariation < 0.2) confidence += 20;
    else if (coefficientOfVariation < 0.3) confidence += 10;

    // Range factor (0-30 points) - narrower range is better
    const range = stats.max - stats.min;
    const rangeToMeanRatio = range / Math.abs(stats.mean);
    if (rangeToMeanRatio < 0.5) confidence += 30;
    else if (rangeToMeanRatio < 1.0) confidence += 20;
    else if (rangeToMeanRatio < 2.0) confidence += 10;

    return Math.min(100, confidence);
  }

  /**
   * Save threshold optimization recommendation to database
   */
  async saveOptimization(
    equipmentId: string,
    sensorType: string,
    orgId: string,
    currentThresholds: any,
    recommendation: ThresholdRecommendation
  ) {
    const [equip] = await db.select().from(equipment).where(eq(equipment.id, equipmentId)).limit(1);
    
    const optimization = await db.insert(thresholdOptimizations).values({
      orgId,
      equipmentId,
      equipmentType: equip?.type || 'unknown',
      sensorType,
      optimizationTimestamp: new Date(),
      currentThresholds: {
        warning: currentThresholds.warnHi,
        critical: currentThresholds.critHi,
        min: currentThresholds.warnLo,
        max: currentThresholds.critHi,
      },
      optimizedThresholds: {
        warning: recommendation.warnHi,
        critical: recommendation.critHi,
        min: recommendation.warnLo,
        max: recommendation.critHi,
        confidence: recommendation.confidence,
      },
      improvementMetrics: {
        precision: null,
        recall: null,
        falsePositiveRate: null,
        falseNegativeRate: null,
        f1Score: null,
      },
      optimizationMethod: recommendation.method,
      validationResults: {
        validated: false,
        testDataSize: 0,
        accuracy: null,
      },
      performance: {
        applied: false,
        durationDays: 0,
        alertsGenerated: 0,
        truePositives: 0,
        falsePositives: 0,
        falseNegatives: 0,
      },
      status: 'pending_review',
      metadata: {
        reasoning: recommendation.reasoning,
        confidence: recommendation.confidence,
      },
    }).returning();

    return optimization[0];
  }

  /**
   * Analyze all sensors for a given equipment
   */
  async analyzeEquipmentSensors(
    equipmentId: string,
    orgId: string,
    daysOfHistory: number = 30
  ) {
    // Get all configured sensors for this equipment
    const configs = await db
      .select()
      .from(sensorConfigurations)
      .where(
        and(
          eq(sensorConfigurations.equipmentId, equipmentId),
          eq(sensorConfigurations.orgId, orgId),
          eq(sensorConfigurations.enabled, true)
        )
      );

    const results = [];

    for (const config of configs) {
      try {
        const recommendation = await this.analyzeSensorThresholds(
          equipmentId,
          config.sensorType,
          orgId,
          daysOfHistory
        );

        if (recommendation) {
          const optimization = await this.saveOptimization(
            equipmentId,
            config.sensorType,
            orgId,
            config,
            recommendation
          );
          results.push(optimization);
        }
      } catch (error) {
        console.error(`[Sensor Optimization] Error analyzing ${config.sensorType}:`, error);
      }
    }

    return results;
  }
}

export const sensorOptimizationService = new SensorOptimizationService();
