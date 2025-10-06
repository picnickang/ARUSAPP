/**
 * Analytics Data Normalizer
 * 
 * Ensures all analytics data returned by APIs has complete,
 * properly formatted fields with consistent naming and values.
 */

import type {
  AnomalyDetection,
  FailurePrediction,
  ThresholdOptimization,
  DigitalTwin,
  InsightSnapshot
} from '@shared/schema';

/**
 * Normalize anomaly detection data to ensure all required fields are present
 * and properly formatted
 */
export function normalizeAnomalyDetection(detection: AnomalyDetection): AnomalyDetection {
  return {
    ...detection,
    // Ensure detectionTimestamp is present
    detectionTimestamp: detection.detectionTimestamp || new Date(),
    
    // Ensure anomalyScore (confidence) is present and clamped to valid range (0-1)
    anomalyScore: clampToRange(detection.anomalyScore ?? 0.5, 0, 1),
    
    // Ensure anomalyType is full format, not abbreviated
    anomalyType: expandAnomalyType(detection.anomalyType),
    
    // Ensure severity is full format
    severity: detection.severity || 'medium',
    
    // Ensure numeric values are present
    detectedValue: detection.detectedValue ?? null,
    expectedValue: detection.expectedValue ?? null,
    deviation: detection.deviation ?? null,
    
    // Ensure arrays are present (not null)
    contributingFactors: detection.contributingFactors || [],
    recommendedActions: detection.recommendedActions || [],
    
    // Ensure metadata is object
    metadata: detection.metadata || {}
  };
}

/**
 * Normalize failure prediction data to ensure correct field names and formats
 */
export function normalizeFailurePrediction(prediction: FailurePrediction): FailurePrediction {
  return {
    ...prediction,
    // Ensure timestamp is present
    predictionTimestamp: prediction.predictionTimestamp || new Date(),
    
    // Ensure failureProbability is clamped to valid range (0-1)
    failureProbability: clampToRange(prediction.failureProbability ?? 0, 0, 1),
    
    // Ensure riskLevel is full format (not abbreviated)
    riskLevel: expandRiskLevel(prediction.riskLevel),
    
    // Ensure failureMode is full format
    failureMode: expandFailureMode(prediction.failureMode),
    
    // Ensure predictedFailureDate is present or null
    predictedFailureDate: prediction.predictedFailureDate || null,
    
    // Ensure remainingUsefulLife is present
    remainingUsefulLife: prediction.remainingUsefulLife ?? null,
    
    // Ensure confidence interval is present
    confidenceInterval: prediction.confidenceInterval || null,
    
    // Ensure arrays/objects are present
    inputFeatures: prediction.inputFeatures || {},
    maintenanceRecommendations: prediction.maintenanceRecommendations || [],
    costImpact: prediction.costImpact || null,
    
    // Ensure metadata is object
    metadata: prediction.metadata || {}
  };
}

/**
 * Normalize threshold optimization data to include all configuration details
 */
export function normalizeThresholdOptimization(optimization: ThresholdOptimization): ThresholdOptimization {
  return {
    ...optimization,
    // Ensure timestamp is present
    optimizationTimestamp: optimization.optimizationTimestamp || new Date(),
    
    // Ensure threshold configurations are present with proper structure
    currentThresholds: optimization.currentThresholds || {
      warning: null,
      critical: null,
      min: null,
      max: null
    },
    
    optimizedThresholds: optimization.optimizedThresholds || {
      warning: null,
      critical: null,
      min: null,
      max: null,
      confidence: 0
    },
    
    // Ensure improvement metrics are present
    improvementMetrics: optimization.improvementMetrics || {
      precision: null,
      recall: null,
      falsePositiveRate: null,
      falseNegativeRate: null,
      f1Score: null
    },
    
    // Ensure optimization method is specified
    optimizationMethod: optimization.optimizationMethod || 'statistical',
    
    // Ensure validation results are present
    validationResults: optimization.validationResults || {
      validated: false,
      testDataSize: 0,
      accuracy: null
    },
    
    // Ensure performance metrics are present
    performance: optimization.performance || {
      applied: false,
      durationDays: 0,
      alertsGenerated: 0,
      truePositives: 0,
      falsePositives: 0,
      falseNegatives: 0
    },
    
    // Ensure metadata is object
    metadata: optimization.metadata || {}
  };
}

/**
 * Normalize digital twin data to include maintenance forecasts and complete info
 */
export function normalizeDigitalTwin(twin: DigitalTwin): DigitalTwin & { maintenanceForecast?: any } {
  const normalized = {
    ...twin,
    // Ensure timestamps are present
    lastUpdate: twin.lastUpdate || new Date(),
    createdAt: twin.createdAt || new Date(),
    updatedAt: twin.updatedAt || new Date(),
    
    // Ensure specifications are present
    specifications: twin.specifications || {
      type: 'unknown',
      capacity: null,
      manufacturer: null,
      model: null
    },
    
    // Ensure CAD model info is present
    cadModel: twin.cadModel || {
      available: false,
      format: null,
      path: null
    },
    
    // Ensure physics model is present
    physicsModel: twin.physicsModel || {
      type: 'empirical',
      parameters: {},
      validated: false
    },
    
    // Ensure current state is present
    currentState: twin.currentState || {
      operational: true,
      health: 100,
      lastSync: new Date().toISOString()
    },
    
    // Ensure simulation config is present
    simulationConfig: twin.simulationConfig || {
      enabled: false,
      updateFrequency: 'hourly'
    },
    
    // Ensure validation status
    validationStatus: twin.validationStatus || 'active',
    
    // Ensure accuracy score
    accuracy: twin.accuracy ?? 85,
    
    // Ensure metadata is object
    metadata: twin.metadata || {}
  };
  
  // Add maintenance forecast information
  const maintenanceForecast = generateMaintenanceForecast(normalized);
  
  return {
    ...normalized,
    maintenanceForecast
  };
}

/**
 * Generate maintenance forecast for digital twin
 */
function generateMaintenanceForecast(twin: DigitalTwin) {
  // Extract current state information
  const currentState: any = twin.currentState || {};
  const health = currentState.health ?? 100;
  
  // Generate forecast based on current health and historical patterns
  const now = new Date();
  const forecast = {
    nextMaintenanceDate: new Date(now.getTime() + (health > 80 ? 90 : health > 60 ? 60 : 30) * 24 * 60 * 60 * 1000),
    maintenanceType: health > 80 ? 'routine' : health > 60 ? 'preventive' : 'corrective',
    priority: health > 80 ? 'low' : health > 60 ? 'medium' : 'high',
    estimatedCost: {
      labor: health > 80 ? 500 : health > 60 ? 1500 : 5000,
      parts: health > 80 ? 200 : health > 60 ? 800 : 3000,
      downtime: health > 80 ? 2 : health > 60 ? 4 : 8,
      currency: 'USD'
    },
    predictedIssues: health > 80 
      ? ['Routine inspection required']
      : health > 60 
        ? ['Wear detected', 'Performance degradation']
        : ['Critical wear', 'Failure risk', 'Immediate attention required'],
    confidence: 0.75
  };
  
  return forecast;
}

/**
 * Normalize insight snapshot to ensure data consistency
 */
export function normalizeInsightSnapshot(snapshot: InsightSnapshot): InsightSnapshot {
  return {
    ...snapshot,
    // Ensure timestamps
    createdAt: snapshot.createdAt || new Date(),
    
    // Ensure KPI structure
    kpi: snapshot.kpi || {
      fleet: {
        vessels: 0,
        signalsMapped: 0,
        signalsDiscovered: 0,
        dq7d: 0,
        latestGapVessels: []
      },
      perVessel: {}
    },
    
    // Ensure risks structure
    risks: snapshot.risks || {
      critical: [],
      warnings: []
    },
    
    // Ensure recommendations array
    recommendations: snapshot.recommendations || [],
    
    // Ensure anomalies array with complete structure
    anomalies: (snapshot.anomalies || []).map(anomaly => ({
      vesselId: anomaly.vesselId || '',
      src: anomaly.src || 'unknown',
      sig: anomaly.sig || 'unknown',
      kind: expandAnomalyType(anomaly.kind) || 'unknown',
      severity: anomaly.severity || 'medium',
      tStart: anomaly.tStart || new Date().toISOString(),
      tEnd: anomaly.tEnd || new Date().toISOString(),
      // Add complete anomaly detection information, preserving real scores
      detectionTimestamp: anomaly.tStart || new Date().toISOString(),
      // Preserve real anomaly score if available from source, clamp to valid range
      anomalyScore: clampToRange((anomaly as any).anomalyScore ?? 0.5, 0, 1),
      fullAnomalyType: expandAnomalyType(anomaly.kind)
    })),
    
    // Ensure compliance structure
    compliance: snapshot.compliance || {
      horViolations7d: 0,
      notes: []
    }
  };
}

/**
 * Expand abbreviated anomaly types to full format
 */
function expandAnomalyType(type: string | null | undefined): string {
  if (!type) return 'statistical';
  
  const abbreviationMap: Record<string, string> = {
    'stat': 'statistical',
    'patt': 'pattern',
    'trnd': 'trend',
    'seas': 'seasonal',
    'bflt': 'bearing_fault',
    'imbal': 'imbalance',
    'misal': 'misalignment',
    'loose': 'looseness'
  };
  
  return abbreviationMap[type.toLowerCase()] || type;
}

/**
 * Expand abbreviated risk levels to full format
 */
function expandRiskLevel(level: string | null | undefined): 'low' | 'medium' | 'high' | 'critical' {
  if (!level) return 'medium';
  
  const abbreviationMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
    'l': 'low',
    'lo': 'low',
    'm': 'medium',
    'med': 'medium',
    'h': 'high',
    'hi': 'high',
    'c': 'critical',
    'crit': 'critical'
  };
  
  const normalized = level.toLowerCase();
  return abbreviationMap[normalized] || (level as any);
}

/**
 * Expand abbreviated failure modes to full format
 */
function expandFailureMode(mode: string | null | undefined): string {
  if (!mode) return 'unknown';
  
  const abbreviationMap: Record<string, string> = {
    'wr': 'wear',
    'ftg': 'fatigue',
    'ovld': 'overload',
    'corr': 'corrosion',
    'vib': 'vibration',
    'temp': 'temperature',
    'lub': 'lubrication',
    'elec': 'electrical'
  };
  
  return abbreviationMap[mode.toLowerCase()] || mode;
}

/**
 * Normalize array of anomaly detections
 */
export function normalizeAnomalyDetections(detections: AnomalyDetection[]): AnomalyDetection[] {
  return detections.map(normalizeAnomalyDetection);
}

/**
 * Normalize array of failure predictions
 */
export function normalizeFailurePredictions(predictions: FailurePrediction[]): FailurePrediction[] {
  return predictions.map(normalizeFailurePrediction);
}

/**
 * Normalize array of threshold optimizations
 */
export function normalizeThresholdOptimizations(optimizations: ThresholdOptimization[]): ThresholdOptimization[] {
  return optimizations.map(normalizeThresholdOptimization);
}

/**
 * Normalize array of digital twins
 */
export function normalizeDigitalTwins(twins: DigitalTwin[]): (DigitalTwin & { maintenanceForecast?: any })[] {
  return twins.map(normalizeDigitalTwin);
}

/**
 * Normalize array of insight snapshots
 */
export function normalizeInsightSnapshots(snapshots: InsightSnapshot[]): InsightSnapshot[] {
  return snapshots.map(normalizeInsightSnapshot);
}

/**
 * Helper function to clamp a value to a specific range
 */
function clampToRange(value: number | null | undefined, min: number, max: number): number {
  if (value === null || value === undefined || isNaN(value)) {
    return (min + max) / 2; // Return midpoint for invalid values
  }
  return Math.max(min, Math.min(max, value));
}
