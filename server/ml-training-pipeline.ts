/**
 * ML Training Pipeline
 * Orchestrates model training, evaluation, and deployment
 */

import { IStorage } from './storage.js';
import { 
  prepareTimeSeriesDataset, 
  prepareClassificationDataset,
  splitDataset 
} from './ml-training-data.js';
import { 
  trainLSTMModel, 
  saveLSTMModel,
  type LSTMConfig,
  type TrainedLSTMModel 
} from './ml-lstm-model.js';
import { 
  trainRandomForest, 
  saveRandomForest,
  type RandomForestConfig,
  type TrainedRandomForest 
} from './ml-random-forest.js';
import { 
  determineOptimalTrainingWindow,
  shouldAllowTraining,
  type TrainingWindowConfig 
} from './adaptive-training-window.js';

export interface TrainingJobConfig {
  orgId: string;
  equipmentType?: string;
  modelType: 'lstm' | 'random_forest';
  targetMetric: 'failure_prediction' | 'health_classification';
}

export interface LSTMTrainingConfig extends TrainingJobConfig {
  modelType: 'lstm';
  lstmConfig: LSTMConfig;
}

export interface RFTrainingConfig extends TrainingJobConfig {
  modelType: 'random_forest';
  rfConfig: RandomForestConfig;
}

export interface TrainingResult {
  modelId: string;
  modelType: 'lstm' | 'random_forest';
  equipmentType?: string;
  metrics: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1Score?: number;
    loss?: number;
  };
  modelPath: string;
  trainingDuration: number; // milliseconds
  datasetInfo: {
    totalSamples: number;
    trainingSamples: number;
    validationSamples: number;
    featureCount: number;
  };
  trainingWindowConfig?: TrainingWindowConfig; // Adaptive training window metadata
}

/**
 * Train LSTM model for time-series failure prediction
 */
export async function trainLSTMForFailurePrediction(
  storage: IStorage,
  config: LSTMTrainingConfig
): Promise<TrainingResult> {
  const startTime = Date.now();
  
  // Determine optimal training window using adaptive algorithm
  const windowConfig = await determineOptimalTrainingWindow(
    storage,
    config.orgId,
    config.equipmentType
  );
  
  // Validate if training should proceed
  const trainingValidation = shouldAllowTraining(windowConfig);
  if (!trainingValidation.allowed) {
    throw new Error(`Training blocked: ${trainingValidation.reason}`);
  }
  
  // Log warnings and recommendations
  if (windowConfig.warnings.length > 0) {
    console.warn(`[Training Pipeline] Warnings:`, windowConfig.warnings);
  }
  if (windowConfig.recommendations.length > 0) {
    console.warn(`[Training Pipeline] Recommendations:`, windowConfig.recommendations);
  }
  
  // Prepare training data with adaptive window
  const dataset = await prepareTimeSeriesDataset(
    storage,
    config.orgId,
    config.equipmentType,
    windowConfig.lookbackDays, // Use adaptive lookback days
    7   // failure window days
  );
  
  // Validate minimum data requirements
  if (dataset.statistics.totalSamples < 10) {
    throw new Error(
      `Insufficient training data: ${dataset.statistics.totalSamples} samples found. ` +
      `At least 10 samples required for LSTM training. ` +
      `Please collect more telemetry and failure history data.`
    );
  }
  
  // Split into train/validation
  const { train, validation } = splitDataset(dataset.timeSeries, 0.8);
  
  // Train model
  const trainedModel = await trainLSTMModel(
    train,
    validation,
    config.lstmConfig
  );
  
  // Save model
  const modelPath = `./ml-models/lstm_${config.equipmentType || 'all'}_${Date.now()}`;
  await saveLSTMModel(trainedModel, modelPath);
  
  // Store model metadata in database
  const modelRecord = await storage.createMlModel({
    orgId: config.orgId,
    name: `LSTM Failure Prediction - ${config.equipmentType || 'All Equipment'}`,
    version: '1.0.0',
    modelType: 'failure_prediction',
    targetEquipmentType: config.equipmentType || null,
    trainingDataFeatures: {
      featureNames: trainedModel.featureNames,
      sensorTypes: dataset.statistics.sensorTypes
    },
    hyperparameters: {
      ...trainedModel.config,
      lookbackDays: windowConfig.lookbackDays,
      failureWindowDays: 7,
      dataQualityTier: windowConfig.tier,
      confidenceMultiplier: windowConfig.confidenceMultiplier,
      availableDays: windowConfig.metadata.availableDays
    },
    performance: {
      accuracy: trainedModel.trainingMetrics.accuracy,
      precision: trainedModel.trainingMetrics.precision,
      recall: trainedModel.trainingMetrics.recall,
      f1Score: trainedModel.trainingMetrics.f1Score,
      loss: trainedModel.trainingMetrics.loss
    },
    modelArtifactPath: modelPath,
    status: 'active'
  }, config.orgId);
  
  const trainingDuration = Date.now() - startTime;
  
  return {
    modelId: modelRecord.id,
    modelType: 'lstm',
    equipmentType: config.equipmentType,
    metrics: {
      accuracy: trainedModel.trainingMetrics.accuracy,
      precision: trainedModel.trainingMetrics.precision,
      recall: trainedModel.trainingMetrics.recall,
      f1Score: trainedModel.trainingMetrics.f1Score,
      loss: trainedModel.trainingMetrics.loss
    },
    modelPath,
    trainingDuration,
    datasetInfo: {
      totalSamples: dataset.statistics.totalSamples,
      trainingSamples: train.length,
      validationSamples: validation.length,
      featureCount: trainedModel.featureNames.length
    },
    trainingWindowConfig: windowConfig
  };
}

/**
 * Train Random Forest for health classification
 */
export async function trainRFForHealthClassification(
  storage: IStorage,
  config: RFTrainingConfig
): Promise<TrainingResult> {
  const startTime = Date.now();
  
  // Determine optimal training window using adaptive algorithm
  const windowConfig = await determineOptimalTrainingWindow(
    storage,
    config.orgId,
    config.equipmentType
  );
  
  // Validate if training should proceed
  const trainingValidation = shouldAllowTraining(windowConfig);
  if (!trainingValidation.allowed) {
    throw new Error(`Training blocked: ${trainingValidation.reason}`);
  }
  
  // Log warnings and recommendations
  if (windowConfig.warnings.length > 0) {
    console.warn(`[Training Pipeline] Warnings:`, windowConfig.warnings);
  }
  if (windowConfig.recommendations.length > 0) {
    console.warn(`[Training Pipeline] Recommendations:`, windowConfig.recommendations);
  }
  
  // Prepare classification data
  const classificationData = await prepareClassificationDataset(
    storage,
    config.orgId,
    config.equipmentType
  );
  
  // Split into train/validation
  const { train, validation } = splitDataset(classificationData, 0.8);
  
  // Train model
  const trainedModel = trainRandomForest(train, config.rfConfig);
  
  // Calculate validation accuracy
  let correctPredictions = 0;
  for (const sample of validation) {
    const { predictWithRandomForest } = await import('./ml-random-forest.js');
    const prediction = predictWithRandomForest(trainedModel, sample);
    if (prediction.prediction === sample.label) {
      correctPredictions++;
    }
  }
  const accuracy = correctPredictions / validation.length;
  
  // Save model
  const modelPath = `./ml-models/rf_${config.equipmentType || 'all'}_${Date.now()}`;
  await saveRandomForest(trainedModel, modelPath);
  
  // Store model metadata in database
  const modelRecord = await storage.createMlModel({
    orgId: config.orgId,
    name: `Random Forest Health Classification - ${config.equipmentType || 'All Equipment'}`,
    version: '1.0.0',
    modelType: 'health_classification',
    targetEquipmentType: config.equipmentType || null,
    trainingDataFeatures: {
      featureNames: trainedModel.featureNames,
      classLabels: trainedModel.classLabels
    },
    hyperparameters: {
      ...config.rfConfig,
      lookbackDays: windowConfig.lookbackDays,
      dataQualityTier: windowConfig.tier,
      confidenceMultiplier: windowConfig.confidenceMultiplier,
      availableDays: windowConfig.metadata.availableDays
    },
    performance: {
      accuracy,
      numTrees: trainedModel.trees.length
    },
    modelArtifactPath: modelPath,
    status: 'active'
  }, config.orgId);
  
  const trainingDuration = Date.now() - startTime;
  
  return {
    modelId: modelRecord.id,
    modelType: 'random_forest',
    equipmentType: config.equipmentType,
    metrics: {
      accuracy
    },
    modelPath,
    trainingDuration,
    datasetInfo: {
      totalSamples: classificationData.length,
      trainingSamples: train.length,
      validationSamples: validation.length,
      featureCount: trainedModel.featureNames.length
    },
    trainingWindowConfig: windowConfig
  };
}

/**
 * Retrain all models for an organization
 */
export async function retrainAllModels(
  storage: IStorage,
  orgId: string
): Promise<TrainingResult[]> {
  const results: TrainingResult[] = [];
  
  // Get all equipment types
  const equipment = await storage.getEquipmentRegistry(orgId);
  const equipmentTypes = Array.from(new Set(equipment.map(eq => eq.type)));
  
  // Train LSTM for each equipment type
  for (const equipmentType of equipmentTypes) {
    try {
      const lstmResult = await trainLSTMForFailurePrediction(storage, {
        orgId,
        equipmentType,
        modelType: 'lstm',
        targetMetric: 'failure_prediction',
        lstmConfig: {
          sequenceLength: 10,
          featureCount: 0, // will be set automatically
          lstmUnits: 64,
          dropoutRate: 0.2,
          learningRate: 0.001,
          epochs: 50,
          batchSize: 32
        }
      });
      results.push(lstmResult);
    } catch (error) {
      console.error(`[Training Pipeline] LSTM training failed for ${equipmentType}:`, error);
      // Continue with other equipment types but track the failure
      results.push({
        modelId: `failed-lstm-${equipmentType}`,
        modelType: 'lstm',
        equipmentType,
        metrics: {},
        modelPath: '',
        trainingDuration: 0,
        datasetInfo: { totalSamples: 0, trainingSamples: 0, validationSamples: 0, featureCount: 0 },
        error: error instanceof Error ? error.message : String(error)
      } as any);
    }
  }
  
  // Train Random Forest for each equipment type
  for (const equipmentType of equipmentTypes) {
    try {
      const rfResult = await trainRFForHealthClassification(storage, {
        orgId,
        equipmentType,
        modelType: 'random_forest',
        targetMetric: 'health_classification',
        rfConfig: {
          numTrees: 50,
          maxDepth: 10,
          minSamplesSplit: 5,
          maxFeatures: 8,
          bootstrapSampleRatio: 0.8
        }
      });
      results.push(rfResult);
    } catch (error) {
      console.error(`[Training Pipeline] RF training failed for ${equipmentType}:`, error);
      // Continue with other equipment types but track the failure
      results.push({
        modelId: `failed-rf-${equipmentType}`,
        modelType: 'random_forest',
        equipmentType,
        metrics: {},
        modelPath: '',
        trainingDuration: 0,
        datasetInfo: { totalSamples: 0, trainingSamples: 0, validationSamples: 0, featureCount: 0 },
        error: error instanceof Error ? error.message : String(error)
      } as any);
    }
  }
  
  return results;
}

/**
 * Get best model for equipment type and prediction task
 */
export async function getBestModel(
  storage: IStorage,
  orgId: string,
  equipmentType: string,
  modelType: 'lstm' | 'random_forest'
): Promise<string | null> {
  const models = await storage.getMlModels(orgId, modelType === 'lstm' ? 'failure_prediction' : 'health_classification', 'active');
  
  // Filter by equipment type
  const matchingModels = models.filter(m => 
    m.targetEquipmentType === equipmentType || m.targetEquipmentType === null
  );
  
  if (matchingModels.length === 0) return null;
  
  // Sort by performance (accuracy or f1Score)
  matchingModels.sort((a, b) => {
    const aScore = (a.performance as any)?.accuracy || (a.performance as any)?.f1Score || 0;
    const bScore = (b.performance as any)?.accuracy || (b.performance as any)?.f1Score || 0;
    return bScore - aScore;
  });
  
  return matchingModels[0].modelArtifactPath || null;
}
