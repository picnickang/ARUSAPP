/**
 * LSTM Model for Time-Series Forecasting
 * Predicts equipment failure using sequential sensor data
 */

import * as tf from '@tensorflow/tfjs-node';
import type { TimeSeriesFeatures } from './ml-training-data.js';

export interface LSTMConfig {
  sequenceLength: number; // number of time steps to look back
  featureCount: number; // number of sensor features
  lstmUnits: number; // LSTM hidden units
  dropoutRate: number; // dropout for regularization
  learningRate: number;
  epochs: number;
  batchSize: number;
}

export interface LSTMPrediction {
  failureProbability: number; // 0-1
  confidence: number; // 0-1
  daysToFailure: number | null;
  method: 'ml_lstm';
}

export interface TrainedLSTMModel {
  model: tf.LayersModel;
  config: LSTMConfig;
  featureNames: string[];
  normalizationParams: {
    mean: number[];
    std: number[];
  };
  trainingMetrics: {
    loss: number;
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
}

/**
 * Create LSTM model architecture
 */
export function createLSTMModel(config: LSTMConfig): tf.LayersModel {
  const model = tf.sequential();
  
  // Input layer
  model.add(tf.layers.inputLayer({
    inputShape: [config.sequenceLength, config.featureCount]
  }));
  
  // First LSTM layer with dropout
  model.add(tf.layers.lstm({
    units: config.lstmUnits,
    returnSequences: true,
    kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
  }));
  model.add(tf.layers.dropout({ rate: config.dropoutRate }));
  
  // Second LSTM layer
  model.add(tf.layers.lstm({
    units: Math.floor(config.lstmUnits / 2),
    returnSequences: false,
    kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
  }));
  model.add(tf.layers.dropout({ rate: config.dropoutRate }));
  
  // Dense layers for classification
  model.add(tf.layers.dense({
    units: 32,
    activation: 'relu',
    kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
  }));
  model.add(tf.layers.dropout({ rate: config.dropoutRate / 2 }));
  
  // Output layer (binary classification: failure/healthy)
  model.add(tf.layers.dense({
    units: 1,
    activation: 'sigmoid'
  }));
  
  // Compile model
  model.compile({
    optimizer: tf.train.adam(config.learningRate),
    loss: 'binaryCrossentropy',
    metrics: ['accuracy'] // TensorFlow.js only supports accuracy as built-in metric
  });
  
  return model;
}

/**
 * Normalize features using z-score normalization
 */
export function normalizeFeatures(
  data: number[][],
  mean?: number[],
  std?: number[]
): { normalized: number[][]; mean: number[]; std: number[] } {
  // Validate input
  if (!data || data.length === 0) {
    throw new Error('Cannot normalize empty dataset');
  }
  
  if (!data[0] || data[0].length === 0) {
    throw new Error('Cannot normalize data with no features');
  }
  
  const featureCount = data[0].length;
  
  // Calculate mean and std if not provided
  if (!mean || !std) {
    mean = new Array(featureCount).fill(0);
    std = new Array(featureCount).fill(0);
    
    // Calculate mean
    for (const row of data) {
      for (let i = 0; i < featureCount; i++) {
        mean[i] += row[i];
      }
    }
    mean = mean.map(m => m / data.length);
    
    // Calculate std
    for (const row of data) {
      for (let i = 0; i < featureCount; i++) {
        std[i] += Math.pow(row[i] - mean[i], 2);
      }
    }
    std = std.map((s, i) => Math.sqrt(s / data.length));
    
    // Replace zero std with 1 to avoid division by zero
    std = std.map(s => s === 0 ? 1 : s);
  }
  
  // Normalize
  const normalized = data.map(row => 
    row.map((val, i) => (val - mean![i]) / std![i])
  );
  
  return { normalized, mean, std };
}

/**
 * Prepare sequences from time series data
 */
export function prepareSequences(
  data: TimeSeriesFeatures[],
  sequenceLength: number,
  featureNames: string[]
): { sequences: number[][][]; labels: number[] } {
  const sequences: number[][][] = [];
  const labels: number[] = [];
  
  // Group by equipment
  const equipmentGroups = new Map<string, TimeSeriesFeatures[]>();
  for (const point of data) {
    if (!equipmentGroups.has(point.equipmentId)) {
      equipmentGroups.set(point.equipmentId, []);
    }
    equipmentGroups.get(point.equipmentId)!.push(point);
  }
  
  // Create sequences for each equipment
  for (const [_, points] of equipmentGroups.entries()) {
    // Sort by timestamp
    points.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    for (let i = sequenceLength; i < points.length; i++) {
      const sequence: number[][] = [];
      
      // Build sequence from past points
      for (let j = i - sequenceLength; j < i; j++) {
        const features: number[] = [];
        for (const featureName of featureNames) {
          features.push(points[j].features[featureName] || 0);
        }
        sequence.push(features);
      }
      
      sequences.push(sequence);
      labels.push(points[i].label);
    }
  }
  
  return { sequences, labels };
}

/**
 * Train LSTM model on time series data
 */
export async function trainLSTMModel(
  trainingData: TimeSeriesFeatures[],
  validationData: TimeSeriesFeatures[],
  config: LSTMConfig
): Promise<TrainedLSTMModel> {
  // Extract feature names from first data point
  const featureNames = Object.keys(trainingData[0].features);
  const updatedConfig = { ...config, featureCount: featureNames.length };
  
  // Prepare sequences
  const { sequences: trainSeqs, labels: trainLabels } = prepareSequences(
    trainingData,
    config.sequenceLength,
    featureNames
  );
  const { sequences: valSeqs, labels: valLabels } = prepareSequences(
    validationData,
    config.sequenceLength,
    featureNames
  );
  
  // Validate that we have enough sequences
  if (trainSeqs.length === 0) {
    throw new Error(
      `Insufficient training data: No sequences could be created. ` +
      `Each equipment needs at least ${config.sequenceLength + 1} data points. ` +
      `Please collect more telemetry data over time.`
    );
  }
  
  if (valSeqs.length === 0) {
    throw new Error(
      `Insufficient validation data: No sequences could be created. ` +
      `Please collect more telemetry data.`
    );
  }
  
  // Flatten sequences for normalization
  const flatTrainData = trainSeqs.flatMap(seq => seq);
  const { normalized: normalizedFlat, mean, std } = normalizeFeatures(flatTrainData);
  
  // Reshape back to sequences
  const normalizedTrainSeqs: number[][][] = [];
  for (let i = 0; i < trainSeqs.length; i++) {
    normalizedTrainSeqs.push(
      normalizedFlat.slice(i * config.sequenceLength, (i + 1) * config.sequenceLength)
    );
  }
  
  // Normalize validation data with training params
  const flatValData = valSeqs.flatMap(seq => seq);
  const { normalized: normalizedValFlat } = normalizeFeatures(flatValData, mean, std);
  const normalizedValSeqs: number[][][] = [];
  for (let i = 0; i < valSeqs.length; i++) {
    normalizedValSeqs.push(
      normalizedValFlat.slice(i * config.sequenceLength, (i + 1) * config.sequenceLength)
    );
  }
  
  // Convert to tensors
  const xTrain = tf.tensor3d(normalizedTrainSeqs);
  const yTrain = tf.tensor2d(trainLabels.map(l => [l]));
  const xVal = tf.tensor3d(normalizedValSeqs);
  const yVal = tf.tensor2d(valLabels.map(l => [l]));
  
  // Create model
  const model = createLSTMModel(updatedConfig);
  
  // Train model
  console.log('[LSTM] Starting training...');
  const history = await model.fit(xTrain, yTrain, {
    epochs: config.epochs,
    batchSize: config.batchSize,
    validationData: [xVal, yVal],
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        console.log(`[LSTM] Epoch ${epoch + 1}/${config.epochs} - Loss: ${logs?.loss.toFixed(4)} - Acc: ${logs?.acc?.toFixed(4)}`);
      }
    },
    verbose: 0
  });
  
  // Calculate final metrics
  const finalMetrics = history.history;
  const lastEpoch = config.epochs - 1;
  
  const loss = Array.isArray(finalMetrics.loss) ? finalMetrics.loss[lastEpoch] : 0;
  const accuracy = Array.isArray(finalMetrics.acc) ? finalMetrics.acc[lastEpoch] : 0;
  const precision = Array.isArray(finalMetrics.precision) ? finalMetrics.precision[lastEpoch] : 0;
  const recall = Array.isArray(finalMetrics.recall) ? finalMetrics.recall[lastEpoch] : 0;
  const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
  
  // Cleanup tensors
  xTrain.dispose();
  yTrain.dispose();
  xVal.dispose();
  yVal.dispose();
  
  console.log('[LSTM] Training completed');
  console.log(`[LSTM] Final metrics - Loss: ${loss.toFixed(4)}, Accuracy: ${accuracy.toFixed(4)}, F1: ${f1Score.toFixed(4)}`);
  
  return {
    model,
    config: updatedConfig,
    featureNames,
    normalizationParams: { mean, std },
    trainingMetrics: {
      loss,
      accuracy,
      precision,
      recall,
      f1Score
    }
  };
}

/**
 * Predict failure probability using trained LSTM model
 */
export async function predictWithLSTM(
  model: TrainedLSTMModel,
  recentData: TimeSeriesFeatures[]
): Promise<LSTMPrediction> {
  if (recentData.length < model.config.sequenceLength) {
    throw new Error(`Insufficient data: need at least ${model.config.sequenceLength} time steps`);
  }
  
  // Sort by timestamp
  const sorted = [...recentData].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  // Take last N points
  const sequence = sorted.slice(-model.config.sequenceLength);
  
  // Extract features
  const featureSequence: number[][] = [];
  for (const point of sequence) {
    const features: number[] = [];
    for (const featureName of model.featureNames) {
      features.push(point.features[featureName] || 0);
    }
    featureSequence.push(features);
  }
  
  // Normalize
  const { normalized } = normalizeFeatures(
    featureSequence,
    model.normalizationParams.mean,
    model.normalizationParams.std
  );
  
  // Convert to tensor
  const inputTensor = tf.tensor3d([normalized]);
  
  // Predict
  const prediction = model.model.predict(inputTensor) as tf.Tensor;
  const failureProbability = (await prediction.data())[0];
  
  // Cleanup
  inputTensor.dispose();
  prediction.dispose();
  
  // Calculate confidence based on distance from decision boundary
  const confidence = Math.abs(failureProbability - 0.5) * 2;
  
  // Estimate days to failure (if failure is predicted)
  let daysToFailure: number | null = null;
  if (failureProbability > 0.5) {
    // Simple heuristic: higher probability = sooner failure
    daysToFailure = Math.round(30 * (1 - failureProbability));
  }
  
  return {
    failureProbability,
    confidence,
    daysToFailure,
    method: 'ml_lstm'
  };
}

/**
 * Save trained model to disk
 */
export async function saveLSTMModel(
  trainedModel: TrainedLSTMModel,
  path: string
): Promise<void> {
  await trainedModel.model.save(`file://${path}`);
  
  // Save metadata separately
  const metadata = {
    config: trainedModel.config,
    featureNames: trainedModel.featureNames,
    normalizationParams: trainedModel.normalizationParams,
    trainingMetrics: trainedModel.trainingMetrics
  };
  
  const fs = await import('fs/promises');
  await fs.writeFile(`${path}/metadata.json`, JSON.stringify(metadata, null, 2));
}

/**
 * Load trained model from disk
 */
export async function loadLSTMModel(path: string): Promise<TrainedLSTMModel> {
  const model = await tf.loadLayersModel(`file://${path}/model.json`);
  
  const fs = await import('fs/promises');
  const metadataJson = await fs.readFile(`${path}/metadata.json`, 'utf-8');
  const metadata = JSON.parse(metadataJson);
  
  return {
    model,
    config: metadata.config,
    featureNames: metadata.featureNames,
    normalizationParams: metadata.normalizationParams,
    trainingMetrics: metadata.trainingMetrics
  };
}
