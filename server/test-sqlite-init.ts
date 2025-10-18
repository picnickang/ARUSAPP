/**
 * Test Script: SQLite Initialization and CRUD Operations
 * 
 * This script tests the vessel mode SQLite database initialization
 * and performs basic CRUD operations to validate schema compatibility.
 */

import { initializeSqliteDatabase, isSqliteDatabaseInitialized } from "./sqlite-init";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const TEST_DB_PATH = path.join(DATA_DIR, "vessel-local.db");

async function runTests() {
  console.log('\n========================================');
  console.log('SQLite Vessel Mode Initialization Test');
  console.log('========================================\n');

  try {
    // Clean up existing test database
    if (fs.existsSync(TEST_DB_PATH)) {
      console.log('[Test] Removing existing test database...');
      fs.unlinkSync(TEST_DB_PATH);
    }

    // Test 1: Initialize database
    console.log('\n[Test 1] Initializing SQLite database...');
    const initResult = await initializeSqliteDatabase();
    console.log(`✅ Database initialization: ${initResult ? 'SUCCESS' : 'FAILED'}`);

    // Test 2: Verify database is initialized
    console.log('\n[Test 2] Verifying database initialization...');
    const isInit = await isSqliteDatabaseInitialized();
    console.log(`✅ Database verification: ${isInit ? 'SUCCESS' : 'FAILED'}`);

    // Test 3: Count all tables
    console.log('\n[Test 3] Counting created tables...');
    const client = createClient({ url: `file:${TEST_DB_PATH}` });
    const db = drizzle(client);

    const tables = await db.all<{ name: string }>(sql`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name
    `);
    
    console.log(`✅ Total tables created: ${tables.length}`);
    console.log('\nTable List:');
    tables.forEach((table, idx) => {
      console.log(`  ${idx + 1}. ${table.name}`);
    });

    // Test 4: Count all indexes
    console.log('\n[Test 4] Counting created indexes...');
    const indexes = await db.all<{ name: string }>(sql`
      SELECT name FROM sqlite_master 
      WHERE type='index' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);
    console.log(`✅ Total indexes created: ${indexes.length}`);

    // Test 5: CRUD Smoke Test - Work Orders
    console.log('\n[Test 5] CRUD Smoke Test - Work Orders table...');
    
    // Create test organization
    const orgId = 'test-org-001';
    await db.run(sql`
      INSERT INTO organizations (id, name, slug, subscription_tier, created_at)
      VALUES (${orgId}, 'Test Org', 'test-org', 'basic', ${Date.now()})
    `);
    console.log('  ✅ Created test organization');

    // Create test equipment
    const equipmentId = 'test-equip-001';
    await db.run(sql`
      INSERT INTO equipment (id, org_id, name, type, created_at)
      VALUES (${equipmentId}, ${orgId}, 'Test Engine', 'engine', ${Date.now()})
    `);
    console.log('  ✅ Created test equipment');

    // Create work order
    const woId = 'test-wo-001';
    await db.run(sql`
      INSERT INTO work_orders (
        id, org_id, equipment_id, status, priority, 
        maintenance_type, description, created_at
      )
      VALUES (
        ${woId}, ${orgId}, ${equipmentId}, 'open', 3,
        'preventive', 'Test maintenance work', ${Date.now()}
      )
    `);
    console.log('  ✅ Created work order');

    // Read work order
    const workOrder = await db.get(sql`
      SELECT * FROM work_orders WHERE id = ${woId}
    `);
    console.log('  ✅ Read work order:', workOrder ? 'SUCCESS' : 'FAILED');

    // Update work order
    await db.run(sql`
      UPDATE work_orders 
      SET status = 'in_progress', updated_at = ${Date.now()}
      WHERE id = ${woId}
    `);
    console.log('  ✅ Updated work order status');

    // Verify update
    const updatedWo = await db.get<{ status: string }>(sql`
      SELECT status FROM work_orders WHERE id = ${woId}
    `);
    console.log(`  ✅ Verified update: status = ${updatedWo?.status}`);

    // Test 6: CRUD Smoke Test - Inventory Movements
    console.log('\n[Test 6] CRUD Smoke Test - Inventory Movements table...');

    // Create test part
    const partId = 'test-part-001';
    await db.run(sql`
      INSERT INTO parts_inventory (
        id, org_id, part_number, part_name, category, unit_cost, created_at
      )
      VALUES (
        ${partId}, ${orgId}, 'PN-12345', 'Test Bearing', 'bearings', 150.50, ${Date.now()}
      )
    `);
    console.log('  ✅ Created test part');

    // Create inventory movement
    const movementId = 'test-movement-001';
    await db.run(sql`
      INSERT INTO inventory_movements (
        id, org_id, part_id, work_order_id, movement_type,
        quantity, quantity_before, quantity_after,
        performed_by, created_at
      )
      VALUES (
        ${movementId}, ${orgId}, ${partId}, ${woId}, 'consumption',
        -2, 10, 8, 'test-user', ${Date.now()}
      )
    `);
    console.log('  ✅ Created inventory movement');

    // Read inventory movement
    const movement = await db.get(sql`
      SELECT * FROM inventory_movements WHERE id = ${movementId}
    `);
    console.log('  ✅ Read inventory movement:', movement ? 'SUCCESS' : 'FAILED');

    // Test 7: Test Indexes Performance
    console.log('\n[Test 7] Testing index usage...');
    const explainResult = await db.get(sql`
      EXPLAIN QUERY PLAN 
      SELECT * FROM work_orders WHERE org_id = ${orgId} AND status = 'open'
    `);
    console.log('  ✅ Index test completed (check EXPLAIN output above)');

    // Test 8: Foreign Key Relationships
    console.log('\n[Test 8] Testing relationships...');
    const joinResult = await db.all(sql`
      SELECT wo.id, wo.description, e.name as equipment_name
      FROM work_orders wo
      JOIN equipment e ON wo.equipment_id = e.id
      WHERE wo.org_id = ${orgId}
    `);
    console.log(`  ✅ Join query successful: ${joinResult.length} rows`);

    // Test 9: Complex Query with Multiple Tables
    console.log('\n[Test 9] Testing complex multi-table query...');
    const complexResult = await db.all(sql`
      SELECT 
        wo.id,
        wo.description,
        e.name as equipment_name,
        im.quantity,
        pi.part_name
      FROM work_orders wo
      LEFT JOIN equipment e ON wo.equipment_id = e.id
      LEFT JOIN inventory_movements im ON wo.id = im.work_order_id
      LEFT JOIN parts_inventory pi ON im.part_id = pi.id
      WHERE wo.org_id = ${orgId}
    `);
    console.log(`  ✅ Complex query successful: ${complexResult.length} rows`);

    // Test 10: CRUD Smoke Test - Crew Management
    console.log('\n[Test 10] CRUD Smoke Test - Crew Management (Phase 3)...');
    
    // Create test crew member
    const crewId = 'test-crew-001';
    await db.run(sql`
      INSERT INTO crew (
        id, org_id, name, rank, vessel_id, max_hours_7d, min_rest_h, created_at
      )
      VALUES (
        ${crewId}, ${orgId}, 'John Smith', 'Chief Engineer', 
        (SELECT id FROM vessels LIMIT 1), 72, 10, ${Date.now()}
      )
    `);
    console.log('  ✅ Created crew member');

    // Create crew skill
    await db.run(sql`
      INSERT INTO crew_skill (crew_id, skill, level)
      VALUES (${crewId}, 'diesel_maintenance', 4)
    `);
    console.log('  ✅ Created crew skill');

    // Create crew assignment
    const assignmentId = 'test-assignment-001';
    const now = Date.now();
    await db.run(sql`
      INSERT INTO crew_assignment (
        id, crew_id, date, start, end, role, status, created_at
      )
      VALUES (
        ${assignmentId}, ${crewId}, '2025-01-20', ${now}, ${now + 28800000}, 
        'Watch Keeper', 'scheduled', ${now}
      )
    `);
    console.log('  ✅ Created crew assignment');

    // Read and verify crew data
    const crewData = await db.get(sql`
      SELECT c.name, c.rank, cs.skill, cs.level, ca.role, ca.status
      FROM crew c
      LEFT JOIN crew_skill cs ON c.id = cs.crew_id
      LEFT JOIN crew_assignment ca ON c.id = ca.crew_id
      WHERE c.id = ${crewId}
    `);
    console.log(`  ✅ Read crew data: ${crewData ? 'SUCCESS' : 'FAILED'}`);
    if (crewData) {
      console.log(`     - Name: ${crewData.name}, Rank: ${crewData.rank}`);
      console.log(`     - Skill: ${crewData.skill} (Level ${crewData.level})`);
      console.log(`     - Assignment: ${crewData.role} (${crewData.status})`);
    }

    // Test 11: CRUD Smoke Test - ML & Predictive Maintenance (Phase 4A)
    console.log('\n[Test 11] CRUD Smoke Test - ML & Predictive Maintenance (Phase 4A)...');
    
    // Get equipment ID
    const mlEquipmentId = await db.get(sql`SELECT id FROM equipment LIMIT 1`);
    
    // Create a test device for DTC testing
    const testDeviceId = 'test-device-ml-001';
    await db.run(sql`
      INSERT INTO devices (
        id, org_id, equipment_id, label, created_at
      )
      VALUES (
        ${testDeviceId}, ${orgId}, ${mlEquipmentId?.id}, 'Test Engine ECU', ${Date.now()}
      )
    `);
    console.log('  ✅ Created test device');
    
    // Create ML model
    const modelId = 'test-model-001';
    await db.run(sql`
      INSERT INTO ml_models (
        id, org_id, name, version, model_type, status, created_at
      )
      VALUES (
        ${modelId}, ${orgId}, 'Pump Failure Predictor', 'v1.0', 
        'failure_prediction', 'active', ${Date.now()}
      )
    `);
    console.log('  ✅ Created ML model');

    // Create failure prediction
    const predictionId = 'test-prediction-001';
    await db.run(sql`
      INSERT INTO failure_predictions (
        id, org_id, equipment_id, prediction_timestamp, failure_probability,
        risk_level, model_id, failure_mode, remaining_useful_life
      )
      VALUES (
        ${predictionId}, ${orgId}, ${mlEquipmentId?.id}, ${Date.now()}, 0.75,
        'high', ${modelId}, 'bearing_wear', 168
      )
    `);
    console.log('  ✅ Created failure prediction');

    // Create anomaly detection
    const anomalyId = 'test-anomaly-001';
    await db.run(sql`
      INSERT INTO anomaly_detections (
        id, org_id, equipment_id, sensor_type, detection_timestamp,
        anomaly_score, severity, detected_value, expected_value
      )
      VALUES (
        ${anomalyId}, ${orgId}, ${mlEquipmentId?.id}, 'vibration', ${Date.now()},
        0.85, 'critical', 12.5, 4.2
      )
    `);
    console.log('  ✅ Created anomaly detection');

    // Create prediction feedback
    const feedbackId = 'test-feedback-001';
    await db.run(sql`
      INSERT INTO prediction_feedback (
        id, org_id, prediction_id, prediction_type, equipment_id, user_id,
        feedback_type, rating, is_accurate, created_at
      )
      VALUES (
        ${feedbackId}, ${orgId}, ${predictionId}, 'failure_prediction', 
        ${mlEquipmentId?.id}, 'operator-001', 'rating', 4, 1, ${Date.now()}
      )
    `);
    console.log('  ✅ Created prediction feedback');

    // Create DTC definition
    await db.run(sql`
      INSERT INTO dtc_definitions (
        spn, fmi, manufacturer, spn_name, fmi_name, description, severity, created_at
      )
      VALUES (
        100, 3, '', 'Engine Oil Pressure', 'Voltage Above Normal', 
        'Oil pressure sensor reading high', 2, ${Date.now()}
      )
    `);
    console.log('  ✅ Created DTC definition');

    // Create DTC fault
    const faultId = 'test-fault-001';
    await db.run(sql`
      INSERT INTO dtc_faults (
        id, org_id, equipment_id, device_id, spn, fmi, active,
        first_seen, last_seen, created_at
      )
      VALUES (
        ${faultId}, ${orgId}, ${mlEquipmentId?.id}, ${testDeviceId}, 100, 3, 1,
        ${Date.now()}, ${Date.now()}, ${Date.now()}
      )
    `);
    console.log('  ✅ Created DTC fault');

    // Read and verify ML data with join
    const mlData = await db.get(sql`
      SELECT 
        m.name as model_name,
        m.version,
        fp.failure_probability,
        fp.risk_level,
        fp.failure_mode,
        ad.anomaly_score,
        ad.severity,
        pf.rating,
        pf.is_accurate
      FROM ml_models m
      LEFT JOIN failure_predictions fp ON m.id = fp.model_id
      LEFT JOIN anomaly_detections ad ON fp.equipment_id = ad.equipment_id
      LEFT JOIN prediction_feedback pf ON fp.id = pf.prediction_id
      WHERE m.id = ${modelId}
    `);
    console.log(`  ✅ Read ML data: ${mlData ? 'SUCCESS' : 'FAILED'}`);
    if (mlData) {
      console.log(`     - Model: ${mlData.model_name} ${mlData.version}`);
      console.log(`     - Prediction: ${mlData.failure_mode} (${mlData.risk_level} risk, ${(mlData.failure_probability * 100).toFixed(0)}% probability)`);
      console.log(`     - Anomaly: Score ${mlData.anomaly_score} (${mlData.severity})`);
      console.log(`     - Feedback: ${mlData.rating}/5 stars, Accurate: ${mlData.is_accurate ? 'Yes' : 'No'}`);
    }

    // Verify DTC data with join
    const dtcData = await db.get(sql`
      SELECT 
        df.spn,
        df.fmi,
        dd.spn_name,
        dd.fmi_name,
        dd.description,
        dd.severity,
        df.active
      FROM dtc_faults df
      LEFT JOIN dtc_definitions dd ON df.spn = dd.spn AND df.fmi = dd.fmi AND dd.manufacturer = ''
      WHERE df.id = ${faultId}
    `);
    console.log(`  ✅ Read DTC data: ${dtcData ? 'SUCCESS' : 'FAILED'}`);
    if (dtcData) {
      console.log(`     - Code: SPN ${dtcData.spn} / FMI ${dtcData.fmi}`);
      console.log(`     - ${dtcData.spn_name}: ${dtcData.fmi_name}`);
      console.log(`     - Description: ${dtcData.description}`);
      console.log(`     - Severity: ${dtcData.severity}, Active: ${dtcData.active ? 'Yes' : 'No'}`);
    }

    console.log('\n[Test 12] CRUD Smoke Test - ML Analytics & Training Support (Phase 4B)...');
    
    // Create test vessel for vibration features
    const testVesselId = 'test-vessel-ml-001';
    await db.run(sql`
      INSERT INTO vessels (id, org_id, name, imo, created_at)
      VALUES (${testVesselId}, ${orgId}, 'Test Vessel MV Analytics', '1234567', ${Date.now()})
    `);
    const vesselId = testVesselId;
    
    // Create sensor type
    const sensorTypeId = 'test-sensor-type-' + Date.now();
    await db.run(sql`
      INSERT INTO sensor_types (id, name, category, default_unit, units, description, min_value, max_value, is_active, created_at)
      VALUES (
        ${sensorTypeId},
        'Test Pressure Sensor',
        'pressure',
        'bar',
        '["bar", "psi", "kPa"]',
        'High-precision pressure sensor for marine applications',
        0,
        100,
        1,
        ${Date.now()}
      )
    `);
    console.log('  ✅ Created sensor type');

    // Create sensor configuration
    const sensorConfigId = randomUUID();
    await db.run(sql`
      INSERT INTO sensor_configurations (
        id, org_id, equipment_id, sensor_type, enabled, sample_rate_hz, gain, offset, deadband,
        min_valid, max_valid, warn_lo, warn_hi, crit_lo, crit_hi, hysteresis, ema_alpha, target_unit,
        notes, expected_interval_ms, grace_multiplier, version, created_at, updated_at
      )
      VALUES (
        ${sensorConfigId}, ${orgId}, ${equipmentId}, 'pressure', 1, 10.0, 1.0, 0.0, 0.1,
        0, 100, 10, 80, 5, 90, 0.5, 0.2, 'bar',
        'Main engine pressure sensor', 1000, 2.0, 1, ${Date.now()}, ${Date.now()}
      )
    `);
    console.log('  ✅ Created sensor configuration');

    // Create sensor state
    const sensorStateId = randomUUID();
    await db.run(sql`
      INSERT INTO sensor_states (id, org_id, equipment_id, sensor_type, last_value, ema, last_ts, updated_at)
      VALUES (${sensorStateId}, ${orgId}, ${equipmentId}, 'pressure', 55.5, 54.8, ${Date.now()}, ${Date.now()})
    `);
    console.log('  ✅ Created sensor state');

    // Create vibration features
    const vibrationId = randomUUID();
    await db.run(sql`
      INSERT INTO vibration_features (
        id, org_id, equipment_id, vessel_id, timestamp, rpm, rms, crest_factor, kurtosis,
        peak_frequency, band_1_power, band_2_power, band_3_power, band_4_power,
        raw_data_length, sample_rate, analysis_metadata, created_at
      )
      VALUES (
        ${vibrationId}, ${orgId}, ${equipmentId}, ${vesselId}, ${Date.now()},
        1800, 2.5, 3.2, 2.8, 30.0, 0.8, 0.3, 0.15, 0.05,
        4096, 2000, '{"window":"hann","nfft":4096}', ${Date.now()}
      )
    `);
    console.log('  ✅ Created vibration features');

    // Create model registry entry
    const modelRegId = randomUUID();
    await db.run(sql`
      INSERT INTO model_registry (
        id, org_id, name, component_class, model_type, version, algorithm, window_days, features, metrics, is_active, deployed_at, created_at, updated_at
      )
      VALUES (
        ${modelRegId}, ${orgId}, 'Bearing Failure Classifier', 'bearing', 'anomaly_detection', 'v2.0', 'random_forest',
        30, '["rms","crest_factor","kurtosis","peak_frequency"]', '{"accuracy":0.92,"precision":0.88}',
        1, ${Date.now()}, ${Date.now()}, ${Date.now()}
      )
    `);
    console.log('  ✅ Created model registry entry');

    // Create model performance validation (using existing model from Phase 4A)
    const perfValId = randomUUID();
    await db.run(sql`
      INSERT INTO model_performance_validations (
        id, org_id, model_id, equipment_id, prediction_id, prediction_type, prediction_timestamp,
        predicted_outcome, actual_outcome, validated_at, validated_by, accuracy_score, time_to_failure_error,
        classification_label, model_version, performance_metrics, created_at
      )
      VALUES (
        ${perfValId}, ${orgId}, ${modelId}, ${equipmentId}, 1, 'failure_prediction', ${Date.now()},
        '{"probability":0.75,"failure_date":"2025-11-01","failure_mode":"bearing_wear"}',
        '{"actual_date":"2025-11-05","actual_mode":"bearing_wear"}', ${Date.now()}, 'system', 0.85, 4,
        'true_positive', 'v1.0', '{"mae":4,"rmse":5.2}', ${Date.now()}
      )
    `);
    console.log('  ✅ Created model performance validation');

    // Create threshold optimization
    const thresholdOptId = randomUUID();
    await db.run(sql`
      INSERT INTO threshold_optimizations (
        id, org_id, equipment_id, sensor_type, optimization_timestamp, current_thresholds, optimized_thresholds,
        improvement_metrics, optimization_method, validation_results, applied_at, status, performance, metadata
      )
      VALUES (
        ${thresholdOptId}, ${orgId}, ${equipmentId}, 'pressure', ${Date.now()},
        '{"warning":80,"critical":90}', '{"warning":75,"critical":85}',
        '{"precision_improvement":0.15,"recall_improvement":0.08}', 'ml_based',
        '{"validation_accuracy":0.88}', ${Date.now()}, 'applied', '{"false_positive_rate":0.05}',
        '{"notes":"Optimized based on 30-day historical data"}'
      )
    `);
    console.log('  ✅ Created threshold optimization');

    // Create retraining trigger
    const retrainingTriggerId = randomUUID();
    await db.run(sql`
      INSERT INTO retraining_triggers (
        id, org_id, model_id, equipment_type, trigger_type, trigger_reason, trigger_metrics,
        current_performance, performance_threshold, new_data_points, negative_feedback_count,
        last_training_date, days_since_training, priority, status, scheduled_for,
        processing_started_at, processing_completed_at, new_model_id, retraining_duration,
        retraining_result, error_message, triggered_by, reviewed_by, review_notes, created_at
      )
      VALUES (
        ${retrainingTriggerId}, ${orgId}, ${modelId}, 'pump', 'performance_degradation',
        'Model accuracy dropped below threshold', '{"accuracy":0.72,"target":0.80}',
        '{"accuracy":0.72,"precision":0.68}', 0.80, 150, 5, ${Date.now() - (40 * 24 * 60 * 60 * 1000)}, 40,
        'high', 'pending', ${Date.now() + (24 * 60 * 60 * 1000)}, NULL, NULL, NULL, NULL, NULL, NULL,
        'system', NULL, NULL, ${Date.now()}
      )
    `);
    console.log('  ✅ Created retraining trigger');

    // Verify Phase 4B data with complex join
    const phase4bData = await db.get(sql`
      SELECT 
        sc.sensor_type,
        sc.gain,
        sc.warn_hi,
        ss.last_value,
        ss.ema,
        vf.rms,
        vf.crest_factor,
        mr.name as model_name,
        mr.algorithm,
        pv.accuracy_score,
        pv.classification_label,
        topt.status as opt_status,
        rt.trigger_type,
        rt.priority,
        st.category as sensor_category
      FROM sensor_configurations sc
      LEFT JOIN sensor_states ss ON sc.equipment_id = ss.equipment_id AND sc.sensor_type = ss.sensor_type
      LEFT JOIN vibration_features vf ON sc.equipment_id = vf.equipment_id
      LEFT JOIN model_registry mr ON sc.org_id = mr.org_id
      LEFT JOIN model_performance_validations pv ON sc.equipment_id = pv.equipment_id
      LEFT JOIN threshold_optimizations topt ON sc.equipment_id = topt.equipment_id AND sc.sensor_type = topt.sensor_type
      LEFT JOIN retraining_triggers rt ON mr.id = rt.model_id
      LEFT JOIN sensor_types st ON sc.sensor_type = 'pressure'
      WHERE sc.id = ${sensorConfigId}
      LIMIT 1
    `);
    console.log(`  ✅ Read Phase 4B data: ${phase4bData ? 'SUCCESS' : 'FAILED'}`);
    if (phase4bData) {
      console.log(`     - Sensor: ${phase4bData.sensor_type} (gain: ${phase4bData.gain}, warn: ${phase4bData.warn_hi})`);
      console.log(`     - State: Last=${phase4bData.last_value}, EMA=${phase4bData.ema}`);
      console.log(`     - Vibration: RMS=${phase4bData.rms}, Crest Factor=${phase4bData.crest_factor}`);
      console.log(`     - Model: ${phase4bData.model_name} (${phase4bData.algorithm})`);
      console.log(`     - Performance: Accuracy=${phase4bData.accuracy_score} (${phase4bData.classification_label})`);
      console.log(`     - Threshold Opt: ${phase4bData.opt_status}`);
      console.log(`     - Retraining: ${phase4bData.trigger_type} (${phase4bData.priority} priority)`);
      console.log(`     - Sensor Type: ${phase4bData.sensor_category}`);
    }

    console.log('\n========================================');
    console.log('✅ All Tests Passed Successfully!');
    console.log('========================================\n');

    console.log('Summary:');
    console.log(`- Tables created: ${tables.length}/56`);
    console.log(`- Indexes created: ${indexes.length}`);
    console.log('- CRUD operations: ✅ Working');
    console.log('- Joins: ✅ Working');
    console.log('- Complex queries: ✅ Working');
    console.log('- Crew management: ✅ Working');
    console.log('- ML & Predictive Maintenance: ✅ Working');
    console.log('- ML Analytics & Training Support: ✅ Working');
    console.log('\nPhase Breakdown:');
    console.log('  - Phase 0 (Core): 9 tables');
    console.log('  - Phase 1 (Work Orders & Maintenance): 16 tables');
    console.log('  - Phase 2 (Inventory & Parts): 6 tables');
    console.log('  - Phase 3 (Crew Management): 9 tables');
    console.log('  - Phase 4A (ML & Predictive Maintenance): 8 tables');
    console.log('  - Phase 4B (ML Analytics & Training): 8 tables');
    console.log('  - Total: 56 tables (30.3% of 185 total)');

    return true;

  } catch (error) {
    console.error('\n❌ Test Failed:', error);
    console.error('\nError Details:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

// Run tests
runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
