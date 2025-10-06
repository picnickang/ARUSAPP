import { DatabaseStorage } from "../storage.js";
import { predictWithHybridModel } from "../ml-prediction-service.js";

const storage = new DatabaseStorage();

async function test() {
  const equipment = await storage.getEquipmentRegistry('default-org-id');
  console.log('Found equipment:', equipment.length);

  if (equipment.length === 0) {
    console.log('No equipment found');
    return;
  }

  const testEq = equipment[0];
  console.log('Testing with:', testEq.name, testEq.type);

  const prediction = await predictWithHybridModel(storage, testEq.id, 'default-org-id');
  console.log('Prediction result:', JSON.stringify(prediction, null, 2));
}

test().catch(console.error);
