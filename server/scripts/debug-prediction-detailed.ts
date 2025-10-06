import { DatabaseStorage } from "../storage.js";
import { predictHealthWithRandomForest, predictFailureWithLSTM } from "../ml-prediction-service.js";
import { getBestModel } from "../ml-training-pipeline.js";

const storage = new DatabaseStorage();

async function test() {
  const equipment = await storage.getEquipmentRegistry('default-org-id');
  const engines = equipment.filter(e => e.type === 'engine');
  const pumps = equipment.filter(e => e.type === 'pump');
  
  console.log(`Found ${engines.length} engines and ${pumps.length} pumps\n`);
  
  // Test 1: Check models
  console.log("=== Testing Model Discovery ===");
  const rfModelPath = await getBestModel(storage, 'default-org-id', 'engine', 'random_forest');
  const lstmModelPath = await getBestModel(storage, 'default-org-id', 'pump', 'lstm');
  
  console.log(`RF model for engine: ${rfModelPath}`);
  console.log(`LSTM model for pump: ${lstmModelPath}\n`);
  
  // Test 2: Check telemetry
  if (engines.length > 0) {
    const engine = engines[0];
    console.log(`=== Testing Telemetry for ${engine.name} ===`);
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const telemetry = await storage.getTelemetryByEquipmentAndDateRange(
      engine.id,
      startDate,
      endDate,
      'default-org-id'
    );
    
    console.log(`Telemetry records: ${telemetry.length}`);
    if (telemetry.length > 0) {
      console.log(`First record: ${JSON.stringify(telemetry[0])}\n`);
    }
  }
  
  // Test 3: Try predictions
  console.log("=== Testing Predictions ===");
  
  if (engines.length > 0) {
    const engine = engines[0];
    console.log(`\nTesting RF prediction for ${engine.name} (${engine.type})...`);
    try {
      const prediction = await predictHealthWithRandomForest(storage, engine.id, 'default-org-id');
      console.log('Result:', prediction ? JSON.stringify(prediction, null, 2) : 'null');
    } catch (error: any) {
      console.error('Error:', error.message);
    }
  }
  
  if (pumps.length > 0) {
    const pump = pumps[0];
    console.log(`\nTesting LSTM prediction for ${pump.name} (${pump.type})...`);
    try {
      const prediction = await predictFailureWithLSTM(storage, pump.id, 'default-org-id');
      console.log('Result:', prediction ? JSON.stringify(prediction, null, 2) : 'null');
    } catch (error: any) {
      console.error('Error:', error.message);
    }
  }
}

test().catch(console.error);
