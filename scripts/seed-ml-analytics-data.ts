#!/usr/bin/env tsx
/**
 * Seed ML Analytics Mock Data
 * Populates: Anomaly Detections, Failure Predictions, Threshold Optimizations, Digital Twins, Insights
 */

import { db } from "../server/db.js";
import { 
  anomalyDetections, 
  failurePredictions, 
  thresholdOptimizations,
  digitalTwins,
  twinSimulations,
  insightSnapshots,
  equipment,
  vessels,
  componentDegradation,
  failureHistory
} from "@shared/schema";
import { sql } from "drizzle-orm";

const ORG_ID = "default-org-id";

async function seedAnomalyDetections() {
  console.log("\n🔍 Seeding Anomaly Detections...");
  
  // Get some equipment
  const equipmentList = await db.select().from(equipment).where(sql`org_id = ${ORG_ID}`).limit(10);
  
  if (equipmentList.length === 0) {
    console.log("⚠️  No equipment found. Skipping anomaly detections.");
    return;
  }
  
  const anomalyTypes = ['statistical', 'pattern', 'trend', 'seasonal'];
  const severities = ['low', 'medium', 'high', 'critical'];
  const sensorTypes = ['temperature', 'vibration', 'pressure', 'rpm', 'oil_pressure'];
  
  const anomalies: any[] = [];
  
  // Create 50 anomalies across equipment
  for (let i = 0; i < 50; i++) {
    const eq = equipmentList[i % equipmentList.length];
    const sensorType = sensorTypes[Math.floor(Math.random() * sensorTypes.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const anomalyType = anomalyTypes[Math.floor(Math.random() * anomalyTypes.length)];
    
    const expectedValue = 50 + Math.random() * 50;
    const deviation = severity === 'critical' ? 50 + Math.random() * 50 :
                     severity === 'high' ? 30 + Math.random() * 20 :
                     severity === 'medium' ? 15 + Math.random() * 15 :
                     5 + Math.random() * 10;
    const detectedValue = expectedValue + deviation * (Math.random() > 0.5 ? 1 : -1);
    
    anomalies.push({
      orgId: ORG_ID,
      equipmentId: eq.id,
      sensorType,
      detectionTimestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      anomalyScore: 0.5 + Math.random() * 0.5,
      anomalyType,
      severity,
      detectedValue,
      expectedValue,
      deviation,
      contributingFactors: {
        factors: [`${sensorType} threshold exceeded`, 'Operating hours increased', 'Environmental conditions'],
        weights: [0.6, 0.25, 0.15]
      },
      recommendedActions: severity === 'critical' || severity === 'high' ? [
        'Schedule immediate inspection',
        'Check sensor calibration',
        'Review maintenance history'
      ] : [
        'Monitor closely',
        'Schedule routine maintenance'
      ],
      metadata: { source: 'ml_analytics', confidence: 0.75 + Math.random() * 0.25 }
    });
  }
  
  await db.insert(anomalyDetections).values(anomalies);
  console.log(`✅ Created ${anomalies.length} anomaly detections`);
}

async function seedFailurePredictions() {
  console.log("\n🔮 Seeding Failure Predictions...");
  
  const equipmentList = await db.select().from(equipment).where(sql`org_id = ${ORG_ID}`).limit(15);
  
  if (equipmentList.length === 0) {
    console.log("⚠️  No equipment found. Skipping failure predictions.");
    return;
  }
  
  const failureModes = ['wear', 'fatigue', 'overload', 'corrosion', 'thermal_stress', 'bearing_failure'];
  const riskLevels = ['low', 'medium', 'high', 'critical'];
  
  const predictions: any[] = [];
  
  for (const eq of equipmentList) {
    // Create 1-3 predictions per equipment
    const numPredictions = 1 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < numPredictions; i++) {
      const failureProbability = Math.random();
      const riskLevel = failureProbability > 0.75 ? 'critical' :
                       failureProbability > 0.5 ? 'high' :
                       failureProbability > 0.25 ? 'medium' : 'low';
      const remainingUsefulLife = Math.floor(7 + Math.random() * 180); // 7-180 days
      const predictedFailureDate = new Date(Date.now() + remainingUsefulLife * 24 * 60 * 60 * 1000);
      
      predictions.push({
        orgId: ORG_ID,
        equipmentId: eq.id,
        predictionTimestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        failureProbability,
        predictedFailureDate,
        remainingUsefulLife,
        confidenceInterval: {
          lower: Math.max(0, remainingUsefulLife - 15),
          upper: remainingUsefulLife + 15
        },
        failureMode: failureModes[Math.floor(Math.random() * failureModes.length)],
        riskLevel,
        inputFeatures: {
          temperature: 80 + Math.random() * 40,
          vibration: 2 + Math.random() * 8,
          operatingHours: 5000 + Math.random() * 5000,
          rpm: 1000 + Math.random() * 1500
        },
        featureImportance: {
          temperature: 0.35,
          vibration: 0.40,
          operatingHours: 0.15,
          rpm: 0.10
        },
        modelVersion: 'v2.1-lstm-hybrid',
        recommendations: riskLevel === 'critical' || riskLevel === 'high' ? [
          'Schedule immediate preventive maintenance',
          'Order replacement parts',
          'Increase monitoring frequency'
        ] : [
          'Continue routine monitoring',
          'Schedule maintenance within recommended window'
        ],
        metadata: { 
          modelType: Math.random() > 0.5 ? 'lstm' : 'random_forest',
          trainingDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      });
    }
  }
  
  await db.insert(failurePredictions).values(predictions);
  console.log(`✅ Created ${predictions.length} failure predictions`);
}

async function seedThresholdOptimizations() {
  console.log("\n⚙️  Seeding Threshold Optimizations...");
  
  const equipmentList = await db.select().from(equipment).where(sql`org_id = ${ORG_ID}`).limit(10);
  
  if (equipmentList.length === 0) {
    console.log("⚠️  No equipment found. Skipping threshold optimizations.");
    return;
  }
  
  const sensorTypes = ['temperature', 'vibration', 'pressure', 'rpm', 'oil_pressure'];
  const methods = ['statistical', 'ml_based', 'hybrid'];
  
  const optimizations: any[] = [];
  
  for (const eq of equipmentList) {
    // 1-2 optimizations per equipment
    const numOpts = 1 + Math.floor(Math.random() * 2);
    
    for (let i = 0; i < numOpts; i++) {
      const sensorType = sensorTypes[i % sensorTypes.length];
      const oldMin = 40 + Math.random() * 20;
      const oldMax = 80 + Math.random() * 40;
      const newMin = oldMin - 5 + Math.random() * 10;
      const newMax = oldMax - 5 + Math.random() * 10;
      
      optimizations.push({
        orgId: ORG_ID,
        equipmentId: eq.id,
        sensorType,
        optimizationTimestamp: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
        oldThresholdMin: oldMin,
        oldThresholdMax: oldMax,
        newThresholdMin: newMin,
        newThresholdMax: newMax,
        optimizationReason: 'Adaptive learning based on operational patterns',
        confidenceScore: 0.70 + Math.random() * 0.30,
        optimizationMethod: methods[Math.floor(Math.random() * methods.length)],
        validationResults: {
          falsePositiveReduction: 15 + Math.random() * 35,
          truePositiveRate: 85 + Math.random() * 10,
          accuracy: 88 + Math.random() * 10
        },
        appliedAt: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null,
        performance: Math.random() > 0.3 ? {
          alertReduction: 20 + Math.random() * 30,
          detectionAccuracy: 90 + Math.random() * 8
        } : null,
        metadata: { algorithmVersion: 'v1.5', dataPoints: 5000 + Math.floor(Math.random() * 5000) }
      });
    }
  }
  
  await db.insert(thresholdOptimizations).values(optimizations);
  console.log(`✅ Created ${optimizations.length} threshold optimizations`);
}

async function seedDigitalTwins() {
  console.log("\n🤖 Seeding Digital Twins...");
  
  const vesselList = await db.select().from(vessels).limit(5);
  
  if (vesselList.length === 0) {
    console.log("⚠️  No vessels found. Skipping digital twins.");
    return;
  }
  
  // Check for existing twins and skip those vessels
  const existingTwins = await db.select().from(digitalTwins);
  const existingVesselIds = new Set(existingTwins.map(t => t.vesselId));
  
  const availableVessels = vesselList.filter(v => !existingVesselIds.has(v.id));
  
  if (availableVessels.length === 0) {
    console.log("ℹ️  All vessels already have digital twins. Skipping.");
    return;
  }
  
  const twins: any[] = [];
  const simulations: any[] = [];
  
  for (const vessel of availableVessels) {
    const twinId = `twin-${vessel.id}`;
    
    const specifications = {
      length: 150 + Math.random() * 100,
      beam: 20 + Math.random() * 10,
      draft: 6 + Math.random() * 4,
      displacement: 5000 + Math.random() * 15000,
      enginePower: 5000 + Math.random() * 10000,
      fuelCapacity: 500 + Math.random() * 1500,
      cargoCapacity: 10000 + Math.random() * 40000
    };
    
    twins.push({
      id: twinId,
      vesselId: vessel.id,
      twinType: 'vessel',
      name: `${vessel.name} Digital Twin`,
      specifications,
      physicsModel: {
        hydrodynamics: {
          hullResistance: 0.015 + Math.random() * 0.01,
          waveMaking: 0.01 + Math.random() * 0.01,
          frictionCoefficient: 0.002 + Math.random() * 0.002
        },
        propulsion: {
          efficiency: 0.80 + Math.random() * 0.10,
          thrustCurve: [0, 0.25, 0.5, 0.75, 1.0],
          fuelConsumption: 0.15 + Math.random() * 0.1
        },
        machinery: {
          mainEngines: [{ 
            id: 'MAIN_ENGINE_01', 
            power: specifications.enginePower, 
            efficiency: 0.38 + Math.random() * 0.08 
          }],
          auxiliaryPower: specifications.enginePower * 0.12,
          heatExchangers: [{ id: 'HE_01', capacity: 800 + Math.random() * 400 }]
        },
        environmental: {
          windResistance: 0.008 + Math.random() * 0.005,
          currentEffect: 0.4 + Math.random() * 0.2,
          waveHeight: 1.5 + Math.random() * 1.0
        }
      },
      currentState: {
        position: { 
          latitude: -90 + Math.random() * 180, 
          longitude: -180 + Math.random() * 360 
        },
        speed: 8 + Math.random() * 12,
        heading: Math.random() * 360,
        draft: specifications.draft * (0.7 + Math.random() * 0.3),
        trim: -2 + Math.random() * 4,
        list: -1 + Math.random() * 2,
        machinery: {
          engines: { 
            MAIN_ENGINE_01: { 
              rpm: 800 + Math.random() * 800, 
              load: 50 + Math.random() * 40, 
              temperature: 85 + Math.random() * 30 
            } 
          },
          generators: { 
            GEN_01: { 
              load: 40 + Math.random() * 50, 
              voltage: 440, 
              frequency: 60 
            } 
          },
          pumps: { 
            COOLING_PUMP_01: { 
              flow: 100 + Math.random() * 100, 
              pressure: 3 + Math.random() * 2, 
              status: 'running' 
            } 
          }
        },
        cargo: {
          totalWeight: Math.random() * specifications.cargoCapacity,
          distribution: []
        },
        fuel: {
          totalCapacity: specifications.fuelCapacity,
          currentLevel: specifications.fuelCapacity * (0.3 + Math.random() * 0.6),
          consumptionRate: 50 + Math.random() * 100
        },
        crew: {
          onboard: 15 + Math.floor(Math.random() * 15),
          positions: {}
        }
      },
      simulationConfig: {
        updateInterval: 60,
        realTimeSync: true,
        dataAssimilation: true
      },
      validationStatus: 'active',
      accuracy: 0.80 + Math.random() * 0.15,
      metadata: {
        createdBy: 'system-seed',
        modelVersion: '2.1',
        lastCalibration: new Date().toISOString()
      }
    });
    
    // Create 2-3 simulations per twin
    const numSims = 2 + Math.floor(Math.random() * 2);
    const scenarioTypes = ['voyage_planning', 'weather_impact', 'fuel_optimization', 'emergency_response'];
    const statuses = ['completed', 'running', 'completed', 'completed']; // mostly completed
    
    for (let i = 0; i < numSims; i++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const startTime = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000);
      const endTime = status === 'completed' ? 
        new Date(startTime.getTime() + (1 + Math.random() * 4) * 60 * 60 * 1000) : null;
      
      simulations.push({
        digitalTwinId: twinId,
        scenarioType: scenarioTypes[i % scenarioTypes.length],
        scenarioName: `${scenarioTypes[i % scenarioTypes.length].replace('_', ' ')} simulation ${i + 1}`,
        startTime,
        endTime,
        duration: endTime ? Math.floor((endTime.getTime() - startTime.getTime()) / 60000) : null,
        initialConditions: {
          weather: { windSpeed: 10 + Math.random() * 20, waveHeight: 1 + Math.random() * 3 },
          vessel: { speed: 10 + Math.random() * 10, fuel: 70 + Math.random() * 20 }
        },
        results: status === 'completed' ? {
          fuelConsumption: 100 + Math.random() * 500,
          timeElapsed: 2 + Math.random() * 8,
          efficiency: 75 + Math.random() * 20,
          recommendations: ['Optimize route', 'Adjust speed profile']
        } : null,
        status,
        metadata: { runBy: 'auto-scheduler', priority: 'normal' }
      });
    }
  }
  
  await db.insert(digitalTwins).values(twins);
  await db.insert(twinSimulations).values(simulations);
  console.log(`✅ Created ${twins.length} digital twins and ${simulations.length} simulations`);
}

async function seedComponentDegradation() {
  console.log("\n📉 Seeding Component Degradation Data...");
  
  const equipmentList = await db.select().from(equipment).where(sql`org_id = ${ORG_ID}`).limit(10);
  
  if (equipmentList.length === 0) {
    console.log("⚠️  No equipment found. Skipping component degradation.");
    return;
  }
  
  const componentTypes = ['bearing', 'seal', 'belt', 'filter', 'gasket', 'pump_impeller'];
  const degradations: any[] = [];
  
  for (const eq of equipmentList) {
    // 1-2 component degradations per equipment
    const numComponents = 1 + Math.floor(Math.random() * 2);
    
    for (let i = 0; i < numComponents; i++) {
      const componentType = componentTypes[i % componentTypes.length];
      const degradationMetric = 30 + Math.random() * 60; // 30-90%
      const degradationRate = 0.5 + Math.random() * 2; // per day
      
      degradations.push({
        orgId: ORG_ID,
        equipmentId: eq.id,
        componentType,
        measurementTimestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        degradationMetric,
        degradationRate,
        vibrationLevel: 2 + Math.random() * 6,
        temperature: 70 + Math.random() * 50,
        oilCondition: 40 + Math.random() * 50,
        acousticSignature: 60 + Math.random() * 30,
        wearParticleCount: Math.floor(100 + Math.random() * 500),
        operatingHours: Math.floor(5000 + Math.random() * 15000),
        cycleCount: Math.floor(10000 + Math.random() * 50000),
        loadFactor: 50 + Math.random() * 40,
        environmentConditions: {
          ambientTemp: 20 + Math.random() * 20,
          humidity: 40 + Math.random() * 40,
          vibrationEnvironment: 'moderate'
        },
        trendAnalysis: {
          slope: degradationRate,
          acceleration: 0.1 + Math.random() * 0.3,
          confidence: 0.75 + Math.random() * 0.20
        },
        predictedFailureDate: new Date(Date.now() + (30 + Math.random() * 120) * 24 * 60 * 60 * 1000),
        confidenceScore: 0.70 + Math.random() * 0.25,
        metadata: { sensorNetwork: 'distributed', calibrationDate: new Date().toISOString() }
      });
    }
  }
  
  await db.insert(componentDegradation).values(degradations);
  console.log(`✅ Created ${degradations.length} component degradation records`);
}

async function seedFailureHistory() {
  console.log("\n📜 Seeding Failure History...");
  
  const equipmentList = await db.select().from(equipment).where(sql`org_id = ${ORG_ID}`).limit(15);
  
  if (equipmentList.length === 0) {
    console.log("⚠️  No equipment found. Skipping failure history.");
    return;
  }
  
  const failureModes = ['wear', 'fatigue', 'overload', 'corrosion', 'thermal_stress'];
  const severities = ['minor', 'moderate', 'severe', 'catastrophic'];
  
  const failures: any[] = [];
  
  // Create 20-30 historical failures
  const numFailures = 20 + Math.floor(Math.random() * 10);
  
  for (let i = 0; i < numFailures; i++) {
    const eq = equipmentList[i % equipmentList.length];
    const failureMode = failureModes[Math.floor(Math.random() * failureModes.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const downtimeHours = severity === 'catastrophic' ? 48 + Math.random() * 120 :
                         severity === 'severe' ? 12 + Math.random() * 36 :
                         severity === 'moderate' ? 2 + Math.random() * 10 :
                         0.5 + Math.random() * 2;
    
    failures.push({
      orgId: ORG_ID,
      equipmentId: eq.id,
      failureTimestamp: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      failureMode,
      failureSeverity: severity,
      rootCause: `${failureMode} due to operational stress and aging`,
      componentAffected: ['bearing', 'seal', 'gasket', 'belt'][Math.floor(Math.random() * 4)],
      repairDescription: `Replaced ${['component', 'assembly', 'parts'][Math.floor(Math.random() * 3)]} and performed calibration`,
      repairCost: severity === 'catastrophic' ? 50000 + Math.random() * 150000 :
                 severity === 'severe' ? 10000 + Math.random() * 40000 :
                 severity === 'moderate' ? 2000 + Math.random() * 8000 :
                 500 + Math.random() * 1500,
      downtimeHours,
      preFailureIndicators: {
        temperature: 90 + Math.random() * 40,
        vibration: 8 + Math.random() * 12,
        noise: 'abnormal',
        performance: 'degraded'
      },
      lessonsLearned: [
        'Increase monitoring frequency',
        'Implement predictive maintenance',
        'Review operating procedures'
      ],
      metadata: { reportedBy: 'maintenance-team', investigationComplete: true }
    });
  }
  
  await db.insert(failureHistory).values(failures);
  console.log(`✅ Created ${failures.length} failure history records`);
}

async function seedInsightSnapshots() {
  console.log("\n💡 Seeding Analytics Insights...");
  
  const vesselList = await db.select().from(vessels).limit(5);
  const equipmentCount = await db.select({ count: sql<number>`count(*)` })
    .from(equipment)
    .where(sql`org_id = ${ORG_ID}`);
  
  const snapshots: any[] = [];
  
  // Create 10 snapshots over the past 30 days
  for (let i = 0; i < 10; i++) {
    const daysAgo = i * 3;
    const timestamp = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    
    snapshots.push({
      orgId: ORG_ID,
      scope: 'fleet',
      createdAt: timestamp,
      kpi: {
        fleet: {
          vessels: vesselList.length,
          signalsMapped: 8 + Math.floor(Math.random() * 12),
          signalsDiscovered: 50 + Math.floor(Math.random() * 100),
          dq7d: 85 + Math.random() * 12,
          latestGapVessels: []
        },
        perVessel: vesselList.reduce((acc, vessel) => {
          acc[vessel.id] = {
            lastTs: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
            dq7d: 80 + Math.random() * 18,
            totalSignals: 10 + Math.floor(Math.random() * 20),
            stale: Math.random() < 0.1
          };
          return acc;
        }, {} as Record<string, any>)
      },
      risks: {
        critical: Math.random() > 0.7 ? [`Critical equipment health degradation on vessel ${vesselList[0]?.id}`] : [],
        warnings: [
          `${Math.floor(2 + Math.random() * 5)} equipment items require attention`,
          `${Math.floor(1 + Math.random() * 3)} maintenance tasks overdue`
        ]
      },
      recommendations: [
        'Schedule preventive maintenance for high-risk equipment',
        'Review sensor threshold configurations',
        'Update maintenance schedules based on predictions'
      ],
      anomalies: Array.from({ length: Math.floor(Math.random() * 5) }, (_, idx) => ({
        vesselId: vesselList[idx % vesselList.length]?.id || 'unknown',
        src: 'ml_analytics',
        sig: `SENSOR_${idx + 1}`,
        kind: ['statistical', 'pattern', 'trend'][Math.floor(Math.random() * 3)],
        severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        tStart: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        tEnd: new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000).toISOString()
      })),
      compliance: {
        horViolations7d: Math.floor(Math.random() * 3),
        notes: Math.random() > 0.5 ? ['All vessels compliant with STCW regulations'] : []
      }
    });
  }
  
  await db.insert(insightSnapshots).values(snapshots);
  console.log(`✅ Created ${snapshots.length} insight snapshots`);
}

async function main() {
  console.log("🌱 Starting ML Analytics Data Seeding...\n");
  console.log(`Organization: ${ORG_ID}\n`);
  
  const results: { [key: string]: boolean } = {};
  
  try {
    await seedAnomalyDetections();
    results['Anomaly Detections'] = true;
  } catch (error) {
    console.error("❌ Failed to seed anomaly detections:", error);
    results['Anomaly Detections'] = false;
  }
  
  try {
    await seedFailurePredictions();
    results['Failure Predictions'] = true;
  } catch (error) {
    console.error("❌ Failed to seed failure predictions:", error);
    results['Failure Predictions'] = false;
  }
  
  try {
    await seedThresholdOptimizations();
    results['Threshold Optimizations'] = true;
  } catch (error) {
    console.error("❌ Failed to seed threshold optimizations:", error);
    results['Threshold Optimizations'] = false;
  }
  
  try {
    await seedComponentDegradation();
    results['Component Degradation'] = true;
  } catch (error) {
    console.error("❌ Failed to seed component degradation:", error);
    results['Component Degradation'] = false;
  }
  
  try {
    await seedFailureHistory();
    results['Failure History'] = true;
  } catch (error) {
    console.error("❌ Failed to seed failure history (table may not exist yet):", error.message);
    results['Failure History'] = false;
  }
  
  try {
    await seedDigitalTwins();
    results['Digital Twins'] = true;
  } catch (error) {
    console.error("❌ Failed to seed digital twins:", error);
    results['Digital Twins'] = false;
  }
  
  try {
    await seedInsightSnapshots();
    results['Analytics Insights'] = true;
  } catch (error) {
    console.error("❌ Failed to seed analytics insights:", error);
    results['Analytics Insights'] = false;
  }
  
  console.log("\n📊 Seeding Summary:");
  for (const [name, success] of Object.entries(results)) {
    console.log(`   - ${name}: ${success ? '✓' : '✗'}`);
  }
  
  const successCount = Object.values(results).filter(v => v).length;
  const totalCount = Object.keys(results).length;
  
  console.log(`\n${successCount}/${totalCount} features seeded successfully`);
  
  process.exit(0);
}

main();
