/**
 * ML Data Seeding Script
 * 
 * ⚠️ WARNING: THIS SCRIPT IS FOR REFERENCE ONLY - DO NOT RUN IN PRODUCTION
 * 
 * This script was used during development to generate test data for ML training.
 * The production database should be populated with real operational data from vessels.
 * 
 * Generates comprehensive test data for machine learning models:
 * - Equipment with various types (engines, pumps, generators, compressors)
 * - Realistic telemetry patterns (normal operation + degradation)
 * - Failure events and work orders
 * - Sufficient volume for ML training
 * 
 * To use this script (development/testing only):
 * Run: tsx server/scripts/seed-ml-data.ts
 */

import { db } from "../db.js";
import { 
  equipment, 
  equipmentTelemetry, 
  workOrders, 
  vessels 
} from "../../shared/schema.js";

const ORG_ID = "default-org-id";

// Equipment types with their sensor configurations
const EQUIPMENT_CONFIGS = [
  {
    type: "engine",
    count: 8,
    sensors: [
      { type: "temperature", unit: "celsius", normalRange: [75, 85], threshold: 95 },
      { type: "vibration", unit: "mm/s", normalRange: [2, 4], threshold: 8 },
      { type: "oil_pressure", unit: "psi", normalRange: [40, 60], threshold: 30 },
      { type: "rpm", unit: "rpm", normalRange: [1500, 1800], threshold: 2000 },
      { type: "exhaust_temperature", unit: "celsius", normalRange: [350, 400], threshold: 500 }
    ]
  },
  {
    type: "pump",
    count: 6,
    sensors: [
      { type: "temperature", unit: "celsius", normalRange: [40, 55], threshold: 70 },
      { type: "vibration", unit: "mm/s", normalRange: [1, 3], threshold: 6 },
      { type: "pressure", unit: "psi", normalRange: [80, 120], threshold: 140 },
      { type: "flow_rate", unit: "gpm", normalRange: [200, 250], threshold: 180 },
      { type: "current", unit: "amps", normalRange: [15, 25], threshold: 35 }
    ]
  },
  {
    type: "generator",
    count: 4,
    sensors: [
      { type: "temperature", unit: "celsius", normalRange: [65, 75], threshold: 90 },
      { type: "vibration", unit: "mm/s", normalRange: [1.5, 2.5], threshold: 5 },
      { type: "voltage", unit: "volts", normalRange: [440, 460], threshold: 480 },
      { type: "current", unit: "amps", normalRange: [200, 300], threshold: 400 },
      { type: "frequency", unit: "hz", normalRange: [59.5, 60.5], threshold: 62 }
    ]
  },
  {
    type: "compressor",
    count: 4,
    sensors: [
      { type: "temperature", unit: "celsius", normalRange: [80, 95], threshold: 110 },
      { type: "vibration", unit: "mm/s", normalRange: [2, 5], threshold: 10 },
      { type: "pressure", unit: "psi", normalRange: [120, 150], threshold: 175 },
      { type: "oil_pressure", unit: "psi", normalRange: [35, 50], threshold: 25 }
    ]
  }
];

// Failure scenarios with degradation patterns
const FAILURE_SCENARIOS = [
  {
    type: "bearing_failure",
    description: "Bearing wear causing excessive vibration",
    degradationDays: 21,
    affectedSensors: ["vibration", "temperature"],
    pattern: (day: number, totalDays: number) => {
      const progress = day / totalDays;
      return {
        vibration: Math.pow(progress, 2) * 3, // Exponential increase
        temperature: progress * 15 // Linear increase
      };
    }
  },
  {
    type: "overheating",
    description: "Cooling system failure leading to overheating",
    degradationDays: 14,
    affectedSensors: ["temperature", "exhaust_temperature"],
    pattern: (day: number, totalDays: number) => {
      const progress = day / totalDays;
      return {
        temperature: Math.pow(progress, 1.5) * 25,
        exhaust_temperature: Math.pow(progress, 1.5) * 100
      };
    }
  },
  {
    type: "pressure_drop",
    description: "Seal degradation causing pressure loss",
    degradationDays: 28,
    affectedSensors: ["pressure", "oil_pressure", "flow_rate"],
    pattern: (day: number, totalDays: number) => {
      const progress = day / totalDays;
      return {
        pressure: -progress * 40, // Negative = decrease
        oil_pressure: -progress * 20,
        flow_rate: -progress * 50
      };
    }
  },
  {
    type: "electrical_fault",
    description: "Electrical system degradation",
    degradationDays: 10,
    affectedSensors: ["voltage", "current"],
    pattern: (day: number, totalDays: number) => {
      const progress = day / totalDays;
      return {
        voltage: -progress * 30 + (Math.random() - 0.5) * 10, // Unstable voltage
        current: progress * 50 + (Math.random() - 0.5) * 20 // Erratic current
      };
    }
  }
];

/**
 * Generate random value within a range
 */
function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Generate telemetry value with noise
 */
function generateTelemetryValue(
  baseValue: number,
  noiseLevel: number = 0.05
): number {
  const noise = (Math.random() - 0.5) * 2 * noiseLevel * baseValue;
  return baseValue + noise;
}

/**
 * Create vessels
 */
async function createVessels() {
  console.log("Creating vessels...");
  
  const vesselData = [
    { name: "MV Atlantic Voyager", type: "Container Ship", imoNumber: "IMO9234567" },
    { name: "MV Pacific Explorer", type: "Bulk Carrier", imoNumber: "IMO9234568" },
    { name: "MV Arctic Titan", type: "Oil Tanker", imoNumber: "IMO9234569" }
  ];

  const createdVessels = [];
  
  for (const vessel of vesselData) {
    const [created] = await db.insert(vessels).values({
      orgId: ORG_ID,
      name: vessel.name,
      type: vessel.type,
      imoNumber: vessel.imoNumber,
      flag: "USA",
      status: "active"
    }).returning();
    
    createdVessels.push(created);
    console.log(`  ✓ Created vessel: ${vessel.name}`);
  }
  
  return createdVessels;
}

/**
 * Create equipment
 */
async function createEquipment(vesselIds: string[]) {
  console.log("Creating equipment...");
  
  const createdEquipment = [];
  let equipmentIndex = 1;
  
  for (const config of EQUIPMENT_CONFIGS) {
    for (let i = 0; i < config.count; i++) {
      const vesselId = vesselIds[i % vesselIds.length];
      
      const [eq] = await db.insert(equipment).values({
        orgId: ORG_ID,
        vesselId,
        name: `${config.type.toUpperCase()}-${String(equipmentIndex).padStart(3, '0')}`,
        type: config.type,
        manufacturer: ["CAT", "Wartsila", "MAN", "Cummins"][Math.floor(Math.random() * 4)],
        model: `Model-${Math.floor(Math.random() * 9000) + 1000}`,
        serialNumber: `SN${Date.now()}${equipmentIndex}`,
        location: ["Engine Room", "Deck", "Auxiliary Room"][Math.floor(Math.random() * 3)],
        isActive: true
      }).returning();
      
      createdEquipment.push({ ...eq, sensors: config.sensors });
      equipmentIndex++;
    }
    
    console.log(`  ✓ Created ${config.count} ${config.type}s`);
  }
  
  return createdEquipment;
}

/**
 * Generate telemetry data
 */
async function generateTelemetryData(
  equipmentList: any[],
  daysOfHistory: number = 90
) {
  console.log(`Generating ${daysOfHistory} days of telemetry data...`);
  
  const now = new Date();
  const startDate = new Date(now.getTime() - daysOfHistory * 24 * 60 * 60 * 1000);
  
  // Select equipment for failures (30% of equipment will have failures)
  const failureEquipment = equipmentList
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.floor(equipmentList.length * 0.3));
  
  const failureEvents: any[] = [];
  
  // Assign failure scenarios to selected equipment
  failureEquipment.forEach(eq => {
    const scenario = FAILURE_SCENARIOS[Math.floor(Math.random() * FAILURE_SCENARIOS.length)];
    const failureDay = Math.floor(Math.random() * (daysOfHistory - scenario.degradationDays - 5)) + 5;
    
    failureEvents.push({
      equipmentId: eq.id,
      equipmentName: eq.name,
      equipmentType: eq.type,
      scenario,
      failureDay,
      degradationStartDay: failureDay - scenario.degradationDays
    });
  });
  
  console.log(`  Planning ${failureEvents.length} failure scenarios...`);
  
  // Generate telemetry for each day
  const batchSize = 1000;
  let telemetryBatch: any[] = [];
  let totalRecords = 0;
  
  for (let day = 0; day < daysOfHistory; day++) {
    const currentDate = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000);
    
    // Generate 4 readings per day (every 6 hours)
    for (let hour = 0; hour < 24; hour += 6) {
      const timestamp = new Date(currentDate);
      timestamp.setHours(hour);
      
      for (const eq of equipmentList) {
        // Check if this equipment has a failure event
        const failureEvent = failureEvents.find(f => f.equipmentId === eq.id);
        
        for (const sensor of eq.sensors) {
          let value = randomInRange(sensor.normalRange[0], sensor.normalRange[1]);
          let status = "normal";
          
          // Apply degradation pattern if in failure window
          if (failureEvent && day >= failureEvent.degradationStartDay && day < failureEvent.failureDay) {
            const degradationDay = day - failureEvent.degradationStartDay;
            const pattern = failureEvent.scenario.pattern(
              degradationDay, 
              failureEvent.scenario.degradationDays
            );
            
            if (pattern[sensor.type] !== undefined) {
              value += pattern[sensor.type];
            }
          }
          
          // Add some random noise
          value = generateTelemetryValue(value, 0.05);
          
          // Determine status based on threshold
          if (Math.abs(value) >= sensor.threshold * 0.9) {
            status = "critical";
          } else if (Math.abs(value) >= sensor.threshold * 0.7) {
            status = "warning";
          }
          
          telemetryBatch.push({
            orgId: ORG_ID,
            ts: timestamp,
            equipmentId: eq.id,
            sensorType: sensor.type,
            value: parseFloat(value.toFixed(2)),
            unit: sensor.unit,
            threshold: sensor.threshold,
            status
          });
          
          // Insert batch when it reaches size limit
          if (telemetryBatch.length >= batchSize) {
            await db.insert(equipmentTelemetry).values(telemetryBatch);
            totalRecords += telemetryBatch.length;
            telemetryBatch = [];
          }
        }
      }
    }
    
    if (day % 10 === 0) {
      console.log(`  Progress: Day ${day}/${daysOfHistory} (${totalRecords} records)`);
    }
  }
  
  // Insert remaining records
  if (telemetryBatch.length > 0) {
    await db.insert(equipmentTelemetry).values(telemetryBatch);
    totalRecords += telemetryBatch.length;
  }
  
  console.log(`  ✓ Generated ${totalRecords} telemetry records`);
  
  return failureEvents;
}

/**
 * Create work orders for failures
 */
async function createFailureWorkOrders(failureEvents: any[], daysOfHistory: number) {
  console.log("Creating failure work orders...");
  
  const now = new Date();
  const startDate = new Date(now.getTime() - daysOfHistory * 24 * 60 * 60 * 1000);
  
  for (const event of failureEvents) {
    const failureDate = new Date(startDate.getTime() + event.failureDay * 24 * 60 * 60 * 1000);
    const completionDate = new Date(failureDate.getTime() + (Math.random() * 48 + 4) * 60 * 60 * 1000);
    
    const downtimeHours = (completionDate.getTime() - failureDate.getTime()) / (60 * 60 * 1000);
    const laborCost = downtimeHours * (50 + Math.random() * 50);
    const partsCost = Math.random() * 5000 + 1000;
    
    await db.insert(workOrders).values({
      orgId: ORG_ID,
      equipmentId: event.equipmentId,
      status: "completed",
      priority: event.scenario.type === "bearing_failure" || event.scenario.type === "overheating" ? 5 : 4,
      reason: event.scenario.description,
      description: `${event.scenario.type.replace('_', ' ')} detected on ${event.equipmentName}. ${event.scenario.description}.`,
      estimatedHours: downtimeHours * 0.8,
      actualHours: downtimeHours,
      estimatedCostPerHour: 75,
      actualCostPerHour: 85,
      estimatedDowntimeHours: downtimeHours * 0.9,
      actualDowntimeHours: downtimeHours,
      totalPartsCost: partsCost,
      totalLaborCost: laborCost,
      totalCost: partsCost + laborCost,
      actualStartDate: failureDate,
      actualEndDate: completionDate
    });
  }
  
  console.log(`  ✓ Created ${failureEvents.length} failure work orders`);
}

/**
 * Create some healthy preventive maintenance work orders
 */
async function createPreventiveWorkOrders(equipmentList: any[], daysOfHistory: number) {
  console.log("Creating preventive maintenance work orders...");
  
  const now = new Date();
  const count = Math.floor(equipmentList.length * 0.5);
  
  for (let i = 0; i < count; i++) {
    const eq = equipmentList[i];
    const daysAgo = Math.floor(Math.random() * daysOfHistory);
    const serviceDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const completionDate = new Date(serviceDate.getTime() + (2 + Math.random() * 4) * 60 * 60 * 1000);
    
    const hours = (completionDate.getTime() - serviceDate.getTime()) / (60 * 60 * 1000);
    const cost = hours * 75 + Math.random() * 500;
    
    await db.insert(workOrders).values({
      orgId: ORG_ID,
      equipmentId: eq.id,
      status: "completed",
      priority: 3,
      reason: "Scheduled preventive maintenance",
      description: `Routine ${eq.type} maintenance: oil change, filter replacement, inspection`,
      estimatedHours: hours * 0.9,
      actualHours: hours,
      estimatedCostPerHour: 75,
      actualCostPerHour: 75,
      totalPartsCost: Math.random() * 500,
      totalLaborCost: hours * 75,
      totalCost: cost,
      actualStartDate: serviceDate,
      actualEndDate: completionDate
    });
  }
  
  console.log(`  ✓ Created ${count} preventive maintenance work orders`);
}

/**
 * Main seeding function
 */
async function seedMLData() {
  console.log("\n🌱 Starting ML Data Seeding...\n");
  
  const startTime = Date.now();
  
  try {
    // Create vessels
    const vesselIds = (await createVessels()).map(v => v.id);
    
    // Create equipment
    const equipmentList = await createEquipment(vesselIds);
    
    // Generate telemetry data (90 days of history)
    const failureEvents = await generateTelemetryData(equipmentList, 90);
    
    // Create work orders
    await createFailureWorkOrders(failureEvents, 90);
    await createPreventiveWorkOrders(equipmentList, 90);
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ ML Data Seeding Complete!`);
    console.log(`   Time elapsed: ${elapsed}s`);
    console.log(`\nSummary:`);
    console.log(`   - Vessels: ${vesselIds.length}`);
    console.log(`   - Equipment: ${equipmentList.length}`);
    console.log(`   - Failure scenarios: ${failureEvents.length}`);
    console.log(`   - Telemetry records: ~${equipmentList.length * 90 * 4 * 5} (90 days)`);
    console.log(`\n📊 System is ready for ML training and testing!`);
    
  } catch (error) {
    console.error("\n❌ Error during seeding:", error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedMLData()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export { seedMLData };
