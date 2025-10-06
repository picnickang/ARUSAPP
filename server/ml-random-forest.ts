/**
 * Random Forest Model for Equipment Failure Classification
 * Simplified implementation using decision trees for binary classification
 */

import type { ClassificationFeatures } from './ml-training-data.js';

export interface RandomForestConfig {
  numTrees: number;
  maxDepth: number;
  minSamplesSplit: number;
  maxFeatures: number; // number of features to consider for each split
  bootstrapSampleRatio: number; // ratio of samples to use for each tree
}

export interface RFPrediction {
  prediction: 'healthy' | 'warning' | 'critical';
  probabilities: {
    healthy: number;
    warning: number;
    critical: number;
  };
  confidence: number;
  failureRisk: number;
  method: 'ml_rf';
  contributingFeatures: Array<{
    feature: string;
    importance: number;
  }>;
}

export interface DecisionNode {
  isLeaf: boolean;
  prediction?: string;
  featureIndex?: number;
  featureName?: string;
  threshold?: number;
  left?: DecisionNode;
  right?: DecisionNode;
  samples?: number;
  impurity?: number;
}

export interface DecisionTree {
  root: DecisionNode;
  featureImportances: Map<string, number>;
}

export interface TrainedRandomForest {
  trees: DecisionTree[];
  config: RandomForestConfig;
  featureNames: string[];
  classLabels: string[];
  oobScore?: number; // Out-of-bag score
}

/**
 * Calculate Gini impurity
 */
function calculateGiniImpurity(labels: string[]): number {
  if (labels.length === 0) return 0;
  
  const counts = new Map<string, number>();
  for (const label of labels) {
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  
  let impurity = 1;
  for (const count of counts.values()) {
    const probability = count / labels.length;
    impurity -= probability * probability;
  }
  
  return impurity;
}

/**
 * Find best split for a feature
 */
function findBestSplit(
  data: number[][],
  labels: string[],
  featureIndices: number[]
): { featureIndex: number; threshold: number; gain: number } | null {
  let bestGain = -Infinity;
  let bestFeatureIndex = -1;
  let bestThreshold = 0;
  
  const parentImpurity = calculateGiniImpurity(labels);
  
  for (const featureIndex of featureIndices) {
    // Get unique values for this feature
    const values = data.map(row => row[featureIndex]);
    const uniqueValues = Array.from(new Set(values)).sort((a, b) => a - b);
    
    // Try split points between consecutive unique values
    for (let i = 0; i < uniqueValues.length - 1; i++) {
      const threshold = (uniqueValues[i] + uniqueValues[i + 1]) / 2;
      
      const leftIndices: number[] = [];
      const rightIndices: number[] = [];
      
      for (let j = 0; j < data.length; j++) {
        if (data[j][featureIndex] <= threshold) {
          leftIndices.push(j);
        } else {
          rightIndices.push(j);
        }
      }
      
      if (leftIndices.length === 0 || rightIndices.length === 0) continue;
      
      const leftLabels = leftIndices.map(idx => labels[idx]);
      const rightLabels = rightIndices.map(idx => labels[idx]);
      
      const leftImpurity = calculateGiniImpurity(leftLabels);
      const rightImpurity = calculateGiniImpurity(rightLabels);
      
      const weightedImpurity = 
        (leftLabels.length / labels.length) * leftImpurity +
        (rightLabels.length / labels.length) * rightImpurity;
      
      const gain = parentImpurity - weightedImpurity;
      
      if (gain > bestGain) {
        bestGain = gain;
        bestFeatureIndex = featureIndex;
        bestThreshold = threshold;
      }
    }
  }
  
  if (bestFeatureIndex === -1) return null;
  
  return { featureIndex: bestFeatureIndex, threshold: bestThreshold, gain: bestGain };
}

/**
 * Get majority class from labels
 */
function getMajorityClass(labels: string[]): string {
  const counts = new Map<string, number>();
  for (const label of labels) {
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  
  let maxCount = 0;
  let majorityClass = labels[0];
  for (const [label, count] of counts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      majorityClass = label;
    }
  }
  
  return majorityClass;
}

/**
 * Build decision tree recursively
 */
function buildTree(
  data: number[][],
  labels: string[],
  featureNames: string[],
  depth: number,
  config: RandomForestConfig,
  featureImportances: Map<string, number>
): DecisionNode {
  const impurity = calculateGiniImpurity(labels);
  
  // Stopping conditions
  if (
    depth >= config.maxDepth ||
    labels.length < config.minSamplesSplit ||
    impurity === 0
  ) {
    return {
      isLeaf: true,
      prediction: getMajorityClass(labels),
      samples: labels.length,
      impurity
    };
  }
  
  // Random feature selection
  const allFeatureIndices = Array.from({ length: data[0].length }, (_, i) => i);
  const selectedIndices = allFeatureIndices
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(config.maxFeatures, allFeatureIndices.length));
  
  // Find best split
  const split = findBestSplit(data, labels, selectedIndices);
  
  if (!split || split.gain <= 0) {
    return {
      isLeaf: true,
      prediction: getMajorityClass(labels),
      samples: labels.length,
      impurity
    };
  }
  
  // Update feature importance
  const featureName = featureNames[split.featureIndex];
  featureImportances.set(
    featureName,
    (featureImportances.get(featureName) || 0) + split.gain
  );
  
  // Split data
  const leftData: number[][] = [];
  const leftLabels: string[] = [];
  const rightData: number[][] = [];
  const rightLabels: string[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (data[i][split.featureIndex] <= split.threshold) {
      leftData.push(data[i]);
      leftLabels.push(labels[i]);
    } else {
      rightData.push(data[i]);
      rightLabels.push(labels[i]);
    }
  }
  
  // Recursively build subtrees
  const left = buildTree(leftData, leftLabels, featureNames, depth + 1, config, featureImportances);
  const right = buildTree(rightData, rightLabels, featureNames, depth + 1, config, featureImportances);
  
  return {
    isLeaf: false,
    featureIndex: split.featureIndex,
    featureName,
    threshold: split.threshold,
    left,
    right,
    samples: labels.length,
    impurity
  };
}

/**
 * Bootstrap sampling
 */
function bootstrapSample<T>(data: T[], ratio: number): T[] {
  const sampleSize = Math.floor(data.length * ratio);
  const sample: T[] = [];
  
  for (let i = 0; i < sampleSize; i++) {
    const index = Math.floor(Math.random() * data.length);
    sample.push(data[index]);
  }
  
  return sample;
}

/**
 * Train Random Forest model
 */
export function trainRandomForest(
  trainingData: ClassificationFeatures[],
  config: RandomForestConfig
): TrainedRandomForest {
  console.log('[Random Forest] Starting training...');
  
  // Extract feature names
  const featureNames = Object.keys(trainingData[0].features);
  const classLabels = Array.from(new Set(trainingData.map(d => d.label)));
  
  // Prepare data
  const data = trainingData.map(d => 
    featureNames.map(name => d.features[name])
  );
  const labels = trainingData.map(d => d.label);
  
  const trees: DecisionTree[] = [];
  
  // Train each tree
  for (let i = 0; i < config.numTrees; i++) {
    // Bootstrap sampling
    const indices = Array.from({ length: data.length }, (_, i) => i);
    const bootstrapIndices = bootstrapSample(indices, config.bootstrapSampleRatio);
    
    const treeData = bootstrapIndices.map(idx => data[idx]);
    const treeLabels = bootstrapIndices.map(idx => labels[idx]);
    
    const featureImportances = new Map<string, number>();
    
    const root = buildTree(
      treeData,
      treeLabels,
      featureNames,
      0,
      config,
      featureImportances
    );
    
    trees.push({ root, featureImportances });
    
    if ((i + 1) % 10 === 0 || i === config.numTrees - 1) {
      console.log(`[Random Forest] Trained ${i + 1}/${config.numTrees} trees`);
    }
  }
  
  console.log('[Random Forest] Training completed');
  
  return {
    trees,
    config,
    featureNames,
    classLabels
  };
}

/**
 * Predict using a single decision tree
 */
function predictTree(node: DecisionNode, features: number[]): string {
  if (node.isLeaf) {
    return node.prediction!;
  }
  
  if (features[node.featureIndex!] <= node.threshold!) {
    return predictTree(node.left!, features);
  } else {
    return predictTree(node.right!, features);
  }
}

/**
 * Predict using Random Forest
 */
export function predictWithRandomForest(
  model: TrainedRandomForest,
  features: ClassificationFeatures
): RFPrediction {
  const featureVector = model.featureNames.map(name => features.features[name]);
  
  // Get predictions from all trees
  const predictions: string[] = [];
  for (const tree of model.trees) {
    const prediction = predictTree(tree.root, featureVector);
    predictions.push(prediction);
  }
  
  // Count votes
  const votes = new Map<string, number>();
  for (const pred of predictions) {
    votes.set(pred, (votes.get(pred) || 0) + 1);
  }
  
  // Calculate probabilities
  const probabilities: { [key: string]: number } = {};
  for (const label of model.classLabels) {
    probabilities[label] = (votes.get(label) || 0) / predictions.length;
  }
  
  // Final prediction (majority vote)
  let maxVotes = 0;
  let finalPrediction = model.classLabels[0];
  for (const [label, count] of votes.entries()) {
    if (count > maxVotes) {
      maxVotes = count;
      finalPrediction = label;
    }
  }
  
  // Confidence (vote ratio)
  const confidence = maxVotes / predictions.length;
  
  // Calculate failure risk
  const failureRisk = 
    (probabilities['critical'] || 0) * 1.0 +
    (probabilities['warning'] || 0) * 0.6 +
    (probabilities['healthy'] || 0) * 0.1;
  
  // Aggregate feature importances
  const aggregatedImportances = new Map<string, number>();
  for (const tree of model.trees) {
    const importances = tree.featureImportances instanceof Map
      ? tree.featureImportances
      : new Map(Object.entries(tree.featureImportances || {}));
    
    for (const [feature, importance] of importances.entries()) {
      aggregatedImportances.set(
        feature,
        (aggregatedImportances.get(feature) || 0) + importance
      );
    }
  }
  
  // Normalize and sort
  const totalImportance = Array.from(aggregatedImportances.values())
    .reduce((sum, val) => sum + val, 0);
  
  const contributingFeatures = Array.from(aggregatedImportances.entries())
    .map(([feature, importance]) => ({
      feature,
      importance: importance / totalImportance
    }))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 5); // Top 5 features
  
  return {
    prediction: finalPrediction as 'healthy' | 'warning' | 'critical',
    probabilities: {
      healthy: probabilities['healthy'] || 0,
      warning: probabilities['warning'] || 0,
      critical: probabilities['critical'] || 0
    },
    confidence,
    failureRisk,
    method: 'ml_rf',
    contributingFeatures
  };
}

/**
 * Save Random Forest model
 */
export async function saveRandomForest(
  model: TrainedRandomForest,
  path: string
): Promise<void> {
  const fs = await import('fs/promises');
  await fs.mkdir(path, { recursive: true });
  await fs.writeFile(
    `${path}/model.json`,
    JSON.stringify(model, null, 2)
  );
}

/**
 * Load Random Forest model
 */
export async function loadRandomForest(path: string): Promise<TrainedRandomForest> {
  const fs = await import('fs/promises');
  const modelJson = await fs.readFile(`${path}/model.json`, 'utf-8');
  return JSON.parse(modelJson);
}
