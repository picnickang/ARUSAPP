/**
 * Test ML Training Script
 * 
 * ⚠️ WARNING: THIS SCRIPT IS FOR TESTING ONLY - DO NOT RUN IN PRODUCTION
 * 
 * Validates that seeded data can be used for ML model training.
 * Requires seeded data (see seed-ml-data.ts) to run successfully.
 * 
 * To use this script (development/testing only):
 * Run: tsx server/scripts/test-ml-training.ts
 */

import { db } from "../db.js";
import { DatabaseStorage } from "../storage.js";
import { 
  trainLSTMForFailurePrediction,
  trainRFForHealthClassification,
  type LSTMTrainingConfig,
  type RFTrainingConfig
} from "../ml-training-pipeline.js";

const ORG_ID = "default-org-id";

/**
 * Test LSTM training
 */
async function testLSTMTraining(storage: DatabaseStorage) {
  console.log("\n🧠 Testing LSTM Model Training...\n");
  
  try {
    const lstmConfig: LSTMTrainingConfig = {
      orgId: ORG_ID,
      equipmentType: "pump", // Test on pumps (they have failures)
      modelType: "lstm",
      targetMetric: "failure_prediction",
      lstmConfig: {
        sequenceLength: 10,
        featureCount: 0, // Will be set automatically
        lstmUnits: 32, // Smaller for faster testing
        dropoutRate: 0.2,
        learningRate: 0.001,
        epochs: 10, // Reduced epochs for testing
        batchSize: 16
      }
    };
    
    const result = await trainLSTMForFailurePrediction(storage, lstmConfig);
    
    console.log("✅ LSTM Training Complete!");
    console.log(`   Model ID: ${result.modelId}`);
    console.log(`   Equipment Type: ${result.equipmentType}`);
    console.log(`   Training Duration: ${(result.trainingDuration / 1000).toFixed(2)}s`);
    console.log(`   Dataset:`);
    console.log(`     - Total Samples: ${result.datasetInfo.totalSamples}`);
    console.log(`     - Training Samples: ${result.datasetInfo.trainingSamples}`);
    console.log(`     - Validation Samples: ${result.datasetInfo.validationSamples}`);
    console.log(`     - Feature Count: ${result.datasetInfo.featureCount}`);
    console.log(`   Metrics:`);
    console.log(`     - Accuracy: ${(result.metrics.accuracy! * 100).toFixed(2)}%`);
    console.log(`     - Precision: ${(result.metrics.precision! * 100).toFixed(2)}%`);
    console.log(`     - Recall: ${(result.metrics.recall! * 100).toFixed(2)}%`);
    console.log(`     - F1 Score: ${(result.metrics.f1Score! * 100).toFixed(2)}%`);
    console.log(`     - Loss: ${result.metrics.loss?.toFixed(4)}`);
    
    return result;
  } catch (error) {
    console.error("❌ LSTM Training Failed:", error);
    throw error;
  }
}

/**
 * Test Random Forest training
 */
async function testRFTraining(storage: DatabaseStorage) {
  console.log("\n🌲 Testing Random Forest Model Training...\n");
  
  try {
    const rfConfig: RFTrainingConfig = {
      orgId: ORG_ID,
      equipmentType: "engine", // Test on engines
      modelType: "random_forest",
      targetMetric: "health_classification",
      rfConfig: {
        numTrees: 20, // Reduced for testing
        maxDepth: 8,
        minSamplesSplit: 3,
        maxFeatures: 6,
        bootstrapSampleRatio: 0.8
      }
    };
    
    const result = await trainRFForHealthClassification(storage, rfConfig);
    
    console.log("✅ Random Forest Training Complete!");
    console.log(`   Model ID: ${result.modelId}`);
    console.log(`   Equipment Type: ${result.equipmentType}`);
    console.log(`   Training Duration: ${(result.trainingDuration / 1000).toFixed(2)}s`);
    console.log(`   Dataset:`);
    console.log(`     - Total Samples: ${result.datasetInfo.totalSamples}`);
    console.log(`     - Training Samples: ${result.datasetInfo.trainingSamples}`);
    console.log(`     - Validation Samples: ${result.datasetInfo.validationSamples}`);
    console.log(`     - Feature Count: ${result.datasetInfo.featureCount}`);
    console.log(`   Metrics:`);
    console.log(`     - Accuracy: ${(result.metrics.accuracy! * 100).toFixed(2)}%`);
    console.log(`     - Precision: ${(result.metrics.precision! * 100).toFixed(2)}%`);
    console.log(`     - Recall: ${(result.metrics.recall! * 100).toFixed(2)}%`);
    console.log(`     - F1 Score: ${(result.metrics.f1Score! * 100).toFixed(2)}%`);
    
    return result;
  } catch (error) {
    console.error("❌ Random Forest Training Failed:", error);
    throw error;
  }
}

/**
 * Main test function
 */
async function runMLTests() {
  console.log("🧪 Starting ML Training Tests...");
  console.log("=".repeat(50));
  
  const startTime = Date.now();
  
  try {
    // Initialize storage with database connection
    const storage = new DatabaseStorage();
    
    // Test LSTM
    const lstmResult = await testLSTMTraining(storage);
    
    // Test Random Forest
    const rfResult = await testRFTraining(storage);
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log("\n" + "=".repeat(50));
    console.log("✅ All ML Training Tests Passed!");
    console.log(`   Total Time: ${totalTime}s`);
    console.log(`   Models Trained: 2 (LSTM + Random Forest)`);
    console.log("\n📊 Summary:");
    console.log(`   - LSTM Accuracy: ${(lstmResult.metrics.accuracy! * 100).toFixed(1)}%`);
    console.log(`   - Random Forest Accuracy: ${(rfResult.metrics.accuracy! * 100).toFixed(1)}%`);
    console.log("\n✨ Your ML system is fully operational!");
    
  } catch (error) {
    console.error("\n❌ ML Training Tests Failed:", error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMLTests()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export { runMLTests };
