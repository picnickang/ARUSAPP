/**
 * ML Prediction Service
 * Integrates trained ML models with RUL engine for real-time predictions
 */

import { IStorage } from './storage.js';
import { loadLSTMModel, predictWithLSTM } from './ml-lstm-model.js';
import { loadRandomForest, predictWithRandomForest } from './ml-random-forest.js';
import { getBestModel } from './ml-training-pipeline.js';
import type { TimeSeriesFeatures, ClassificationFeatures } from './ml-training-data.js';
import type { EquipmentTelemetry } from '@shared/schema';

/**
 * Sanitize telemetry data by converting timestamps to Date objects
 */
function sanitizeTelemetry(telemetry: EquipmentTelemetry[]): EquipmentTelemetry[] {
  return telemetry.map(t => ({
    ...t,
    ts: t.ts instanceof Date ? t.ts : new Date(t.ts)
  })).filter(t => {
    if (!t.ts || isNaN(t.ts.getTime())) {
      console.warn(`[ML Prediction] Filtering out telemetry with invalid ts:`, t);
      return false;
    }
    return true;
  });
}

export interface MLPredictionResult {
  method: 'ml_lstm' | 'ml_rf' | 'hybrid';
  failureProbability: number;
  confidence: number;
  predictedFailureDate: Date | null;
  remainingDays: number;
  healthScore: number;
  recommendations: string[];
}

// In-memory cache for loaded models
const modelCache = new Map<string, any>();

/**
 * Get or load model from cache
 */
async function getModel(
  modelPath: string,
  modelType: 'lstm' | 'random_forest'
): Promise<any> {
  if (modelCache.has(modelPath)) {
    return modelCache.get(modelPath);
  }
  
  let model;
  if (modelType === 'lstm') {
    model = await loadLSTMModel(modelPath);
  } else {
    model = await loadRandomForest(modelPath);
  }
  
  modelCache.set(modelPath, model);
  return model;
}

/**
 * Predict equipment failure using LSTM model
 */
export async function predictFailureWithLSTM(
  storage: IStorage,
  equipmentId: string,
  orgId: string
): Promise<MLPredictionResult | null> {
  try {
    console.log(`[ML Prediction LSTM] Starting for equipment ${equipmentId}`);
    
    // Get equipment info
    const equipment = await storage.getEquipment(orgId, equipmentId);
    if (!equipment) {
      console.log(`[ML Prediction LSTM] Equipment not found`);
      return null;
    }
    
    console.log(`[ML Prediction LSTM] Equipment type: ${equipment.type}`);
    
    // Find best LSTM model for this equipment type
    const modelPath = await getBestModel(storage, orgId, equipment.type, 'lstm');
    if (!modelPath) {
      console.log(`[ML Prediction LSTM] No LSTM model found for ${equipment.type}`);
      return null;
    }
    
    console.log(`[ML Prediction LSTM] Model path: ${modelPath}`);
    
    // Load model
    const model = await getModel(modelPath, 'lstm');
    console.log(`[ML Prediction LSTM] Model loaded, config:`, model.config);
    
    // Get recent telemetry data
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days
    
    const rawTelemetry = await storage.getTelemetryByEquipmentAndDateRange(
      equipmentId,
      startDate,
      endDate,
      orgId
    );
    
    console.log(`[ML Prediction LSTM] Raw telemetry count: ${rawTelemetry.length}`);
    
    // Sanitize telemetry to ensure all timestamps are valid
    const telemetry = sanitizeTelemetry(rawTelemetry);
    
    console.log(`[ML Prediction LSTM] Sanitized telemetry count: ${telemetry.length}, required: ${model.config.sequenceLength}`);
    
    if (telemetry.length < model.config.sequenceLength) {
      console.log(`[ML Prediction LSTM] Insufficient telemetry data for LSTM prediction`);
      return null;
    }
    
    // Prepare features
    const timeSeriesFeatures: TimeSeriesFeatures[] = [];
    const timeGroups = new Map<string, typeof telemetry>();
    
    for (const t of telemetry) {
      const timeKey = t.ts.toISOString();
      if (!timeGroups.has(timeKey)) {
        timeGroups.set(timeKey, []);
      }
      timeGroups.get(timeKey)!.push(t);
    }
    
    for (const [timeKey, readings] of timeGroups.entries()) {
      const features: Record<string, number> = {};
      for (const reading of readings) {
        features[reading.sensorType] = reading.value;
      }
      
      timeSeriesFeatures.push({
        equipmentId,
        timestamp: new Date(timeKey),
        features,
        normalizedFeatures: {},
        label: 0
      });
    }
    
    // Make prediction
    const prediction = await predictWithLSTM(model, timeSeriesFeatures);
    
    // Calculate predicted failure date
    const predictedFailureDate = prediction.daysToFailure !== null
      ? new Date(Date.now() + prediction.daysToFailure * 24 * 60 * 60 * 1000)
      : null;
    
    // Generate recommendations
    const recommendations: string[] = [];
    if (prediction.failureProbability > 0.7) {
      recommendations.push('Critical: Schedule immediate inspection');
      recommendations.push('Prepare for possible equipment replacement');
    } else if (prediction.failureProbability > 0.5) {
      recommendations.push('Schedule maintenance within 7 days');
      recommendations.push('Monitor telemetry closely');
    } else if (prediction.failureProbability > 0.3) {
      recommendations.push('Increase monitoring frequency');
      recommendations.push('Review maintenance schedule');
    }
    
    return {
      method: 'ml_lstm',
      failureProbability: prediction.failureProbability,
      confidence: prediction.confidence,
      predictedFailureDate,
      remainingDays: prediction.daysToFailure || 30,
      healthScore: Math.round((1 - prediction.failureProbability) * 100),
      recommendations
    };
  } catch (error) {
    console.error('[ML Prediction] LSTM prediction error:', error);
    return null;
  }
}

/**
 * Predict equipment health classification using Random Forest
 */
export async function predictHealthWithRandomForest(
  storage: IStorage,
  equipmentId: string,
  orgId: string
): Promise<MLPredictionResult | null> {
  try {
    // Get equipment info
    const equipment = await storage.getEquipment(orgId, equipmentId);
    if (!equipment) return null;
    
    // Find best RF model for this equipment type
    const modelPath = await getBestModel(storage, orgId, equipment.type, 'random_forest');
    if (!modelPath) {
      console.log(`[ML Prediction] No Random Forest model found for ${equipment.type}`);
      return null;
    }
    
    // Load model
    const model = await getModel(modelPath, 'random_forest');
    
    // Get recent telemetry data for feature calculation
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const telemetry = await storage.getTelemetryByEquipmentAndDateRange(
      equipmentId,
      startDate,
      endDate,
      orgId
    );
    
    // Calculate aggregate features
    const tempReadings = telemetry.filter(t => t.sensorType.toLowerCase().includes('temp')).map(t => t.value);
    const vibReadings = telemetry.filter(t => t.sensorType.toLowerCase().includes('vib')).map(t => t.value);
    const pressureReadings = telemetry.filter(t => t.sensorType.toLowerCase().includes('pressure')).map(t => t.value);
    
    const calculateStats = (values: number[]) => {
      if (values.length === 0) return { avg: 0, max: 0, min: 0, std: 0 };
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);
      const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
      const std = Math.sqrt(variance);
      return { avg, max, min, std };
    };
    
    const tempStats = calculateStats(tempReadings);
    const vibStats = calculateStats(vibReadings);
    const pressureStats = calculateStats(pressureReadings);
    
    const features: ClassificationFeatures = {
      equipmentId,
      equipmentType: equipment.type,
      features: {
        avgTemperature: tempStats.avg,
        maxTemperature: tempStats.max,
        stdTemperature: tempStats.std,
        avgVibration: vibStats.avg,
        maxVibration: vibStats.max,
        stdVibration: vibStats.std,
        avgPressure: pressureStats.avg,
        minPressure: pressureStats.min,
        operatingHours: 0,
        cycleCount: 0,
        maintenanceAge: 30,
        failureHistory: 0
      },
      label: 'healthy',
      failureRisk: 0
    };
    
    // Make prediction
    const prediction = predictWithRandomForest(model, features);
    
    // Map prediction to failure probability
    const failureProbability = prediction.failureRisk;
    
    // Calculate remaining days based on prediction
    let remainingDays = 90;
    if (prediction.prediction === 'critical') {
      remainingDays = 7;
    } else if (prediction.prediction === 'warning') {
      remainingDays = 30;
    }
    
    const predictedFailureDate = prediction.prediction !== 'healthy'
      ? new Date(Date.now() + remainingDays * 24 * 60 * 60 * 1000)
      : null;
    
    // Generate recommendations
    const recommendations: string[] = [];
    if (prediction.prediction === 'critical') {
      recommendations.push('Critical health status detected');
      recommendations.push('Schedule immediate maintenance');
      recommendations.push(`Top contributing factors: ${prediction.contributingFeatures.slice(0, 2).map(f => f.feature).join(', ')}`);
    } else if (prediction.prediction === 'warning') {
      recommendations.push('Warning: Equipment health degrading');
      recommendations.push('Schedule preventive maintenance');
      recommendations.push(`Monitor: ${prediction.contributingFeatures.slice(0, 2).map(f => f.feature).join(', ')}`);
    } else {
      recommendations.push('Equipment health is good');
      recommendations.push('Continue routine monitoring');
    }
    
    return {
      method: 'ml_rf',
      failureProbability,
      confidence: prediction.confidence,
      predictedFailureDate,
      remainingDays,
      healthScore: Math.round((1 - failureProbability) * 100),
      recommendations
    };
  } catch (error) {
    console.error('[ML Prediction] Random Forest prediction error:', error);
    return null;
  }
}

/**
 * Hybrid prediction using both LSTM and Random Forest
 */
export async function predictWithHybridModel(
  storage: IStorage,
  equipmentId: string,
  orgId: string
): Promise<MLPredictionResult | null> {
  try {
    // Get predictions from both models
    const lstmPrediction = await predictFailureWithLSTM(storage, equipmentId, orgId);
    const rfPrediction = await predictHealthWithRandomForest(storage, equipmentId, orgId);
    
    // If neither model available, return null
    if (!lstmPrediction && !rfPrediction) {
      return null;
    }
    
    // If only one available, return that one
    if (!lstmPrediction) return rfPrediction;
    if (!rfPrediction) return lstmPrediction;
    
    // Combine predictions (weighted average)
    const lstmWeight = 0.6; // LSTM gets higher weight for time-series
    const rfWeight = 0.4;
    
    const failureProbability = 
      lstmPrediction.failureProbability * lstmWeight +
      rfPrediction.failureProbability * rfWeight;
    
    const confidence = 
      lstmPrediction.confidence * lstmWeight +
      rfPrediction.confidence * rfWeight;
    
    const remainingDays = Math.round(
      lstmPrediction.remainingDays * lstmWeight +
      rfPrediction.remainingDays * rfWeight
    );
    
    const predictedFailureDate = remainingDays > 0
      ? new Date(Date.now() + remainingDays * 24 * 60 * 60 * 1000)
      : null;
    
    const healthScore = Math.round((1 - failureProbability) * 100);
    
    // Combine recommendations
    const recommendations = [
      ...lstmPrediction.recommendations,
      ...rfPrediction.recommendations
    ];
    
    // Deduplicate
    const uniqueRecommendations = Array.from(new Set(recommendations));
    
    return {
      method: 'hybrid',
      failureProbability,
      confidence,
      predictedFailureDate,
      remainingDays,
      healthScore,
      recommendations: uniqueRecommendations.slice(0, 5) // Top 5
    };
  } catch (error) {
    console.error('[ML Prediction] Hybrid prediction error:', error);
    return null;
  }
}

/**
 * Store ML prediction in database
 */
export async function storePrediction(
  storage: IStorage,
  equipmentId: string,
  orgId: string,
  prediction: MLPredictionResult
): Promise<void> {
  // Get equipment info
  const equipment = await storage.getEquipment(equipmentId, orgId);
  if (!equipment) return;
  
  // Store in failurePredictions table
  await storage.createFailurePrediction({
    equipmentId,
    orgId,
    equipmentType: equipment.type,
    failureProbability: prediction.failureProbability,
    predictedFailureDate: prediction.predictedFailureDate,
    confidence: prediction.confidence,
    modelType: prediction.method,
    inputFeatures: {},
    predictionTimestamp: new Date()
  });
}
