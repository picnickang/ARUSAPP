/**
 * ARUS Integration Test - Work Order Complete Lifecycle
 * Tests the end-to-end workflow of work order creation, assignment, and completion
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';
import { eq, and } from 'drizzle-orm';
import {
  equipment,
  workOrders,
  vessels,
  crew,
  partsInventory,
  workOrderParts,
  workOrderCompletions,
  costSavings,
  failurePredictions
} from '@shared/schema';

interface TestResult {
  step: string;
  status: 'PASS' | 'FAIL' | 'ERROR';
  message: string;
  data?: any;
}

const results: TestResult[] = [];
let testEquipmentId: string | null = null;
let testWorkOrderId: string | null = null;
let testPredictionId: string | null = null;

function log(step: string, status: 'PASS' | 'FAIL' | 'ERROR', message: string, data?: any) {
  results.push({ step, status, message, data });
  const symbol = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${symbol} [${step}] ${message}`);
  if (data) console.log(`   Data:`, JSON.stringify(data, null, 2));
}

async function runWorkOrderLifecycleTest() {
  console.log('\n' + '='.repeat(80));
  console.log('ARUS WORK ORDER LIFECYCLE TEST');
  console.log('='.repeat(80));
  console.log(`Started at: ${new Date().toISOString()}\n`);

  try {
    // ====================
    // STEP 1: Setup - Get test equipment
    // ====================
    console.log('\n📋 STEP 1: Test Setup\n');

    const testEquip = await db.execute(sql`
      SELECT id, name, org_id, vessel_id 
      FROM equipment 
      WHERE org_id = 'default-org-id'
      LIMIT 1
    `);

    if (testEquip.rows.length > 0) {
      testEquipmentId = (testEquip.rows[0] as any).id;
      log(
        'Setup',
        'PASS',
        `Found test equipment: ${(testEquip.rows[0] as any).name}`,
        { equipment: testEquip.rows[0] }
      );
    } else {
      log('Setup', 'FAIL', 'No equipment found for testing');
      throw new Error('Cannot proceed without test equipment');
    }

    // ====================
    // STEP 2: Create Failure Prediction
    // ====================
    console.log('\n🔮 STEP 2: Predictive Maintenance\n');

    const prediction = await db.execute(sql`
      INSERT INTO failure_predictions (
        org_id,
        equipment_id,
        predicted_failure_date,
        failure_probability,
        failure_mode,
        risk_level,
        maintenance_recommendations
      ) VALUES (
        'default-org-id',
        ${testEquipmentId},
        NOW() + INTERVAL '7 days',
        0.85,
        'bearing_failure',
        'high',
        '{"action": "Replace main bearing before failure"}'::jsonb
      )
      RETURNING id, failure_probability, failure_mode
    `);

    if (prediction.rows.length > 0) {
      testPredictionId = (prediction.rows[0] as any).id;
      log(
        'Prediction',
        'PASS',
        `Created failure prediction (85% confidence)`,
        { prediction: prediction.rows[0] }
      );
    } else {
      log('Prediction', 'FAIL', 'Failed to create prediction');
    }

    // ====================
    // STEP 3: Create Work Order from Prediction
    // ====================
    console.log('\n📝 STEP 3: Work Order Creation\n');

    const workOrder = await db.execute(sql`
      INSERT INTO work_orders (
        id,
        equipment_id,
        status,
        priority,
        reason,
        description,
        org_id,
        estimated_hours,
        estimated_cost_per_hour,
        affects_vessel_downtime,
        maintenance_type
      ) VALUES (
        gen_random_uuid(),
        ${testEquipmentId},
        'open',
        1,
        'Predictive Maintenance',
        'Replace main bearing - predicted failure in 7 days (85% confidence)',
        'default-org-id',
        4.0,
        75.00,
        true,
        'predictive'
      )
      RETURNING id, status, priority, estimated_hours
    `);

    if (workOrder.rows.length > 0) {
      testWorkOrderId = (workOrder.rows[0] as any).id;
      log(
        'Work Order Creation',
        'PASS',
        `Created work order ${testWorkOrderId}`,
        { workOrder: workOrder.rows[0] }
      );
    } else {
      log('Work Order Creation', 'FAIL', 'Failed to create work order');
      throw new Error('Cannot proceed without work order');
    }

    // ====================
    // STEP 4: Verify Initial State
    // ====================
    console.log('\n🔍 STEP 4: Initial State Verification\n');

    const initialState = await db.execute(sql`
      SELECT 
        id,
        status,
        priority,
        estimated_hours,
        actual_hours,
        total_cost,
        roi
      FROM work_orders
      WHERE id = ${testWorkOrderId}
    `);

    const state = initialState.rows[0] as any;
    
    if (state.status === 'open' && state.actual_hours === null) {
      log(
        'Initial State',
        'PASS',
        'Work order in correct initial state (open, no actual data)',
        { state }
      );
    } else {
      log(
        'Initial State',
        'FAIL',
        `Unexpected initial state: ${state.status}`,
        { state }
      );
    }

    // ====================
    // STEP 5: Assign Crew (if crew exists)
    // ====================
    console.log('\n👷 STEP 5: Crew Assignment\n');

    const availableCrew = await db.execute(sql`
      SELECT id, name FROM crew WHERE org_id = 'default-org-id' LIMIT 1
    `);

    if (availableCrew.rows.length > 0) {
      const crewId = (availableCrew.rows[0] as any).id;
      
      await db.execute(sql`
        UPDATE work_orders
        SET assigned_crew_id = ${crewId}
        WHERE id = ${testWorkOrderId}
      `);
      
      log(
        'Crew Assignment',
        'PASS',
        `Assigned crew: ${(availableCrew.rows[0] as any).name}`
      );
    } else {
      log(
        'Crew Assignment',
        'PASS',
        'No crew available - skipping assignment (optional step)'
      );
    }

    // ====================
    // STEP 6: Add Parts to Work Order
    // ====================
    console.log('\n🔧 STEP 6: Parts Allocation\n');

    const availableParts = await db.execute(sql`
      SELECT id, part_name, quantity_on_hand, unit_cost
      FROM parts_inventory
      WHERE org_id = 'default-org-id' AND quantity_on_hand > 0
      LIMIT 1
    `);

    if (availableParts.rows.length > 0) {
      const part = availableParts.rows[0] as any;
      const quantityNeeded = 2;
      
      await db.execute(sql`
        INSERT INTO work_order_parts (
          work_order_id,
          part_id,
          quantity_used,
          unit_cost
        ) VALUES (
          ${testWorkOrderId},
          ${part.id},
          ${quantityNeeded},
          ${part.unit_cost}
        )
      `);
      
      log(
        'Parts Allocation',
        'PASS',
        `Added ${quantityNeeded}x ${part.part_name} ($${part.unit_cost} each)`,
        { part: part.part_name, quantity: quantityNeeded, cost: part.unit_cost }
      );
    } else {
      log(
        'Parts Allocation',
        'PASS',
        'No parts available - skipping (optional step)'
      );
    }

    // ====================
    // STEP 7: Start Work Order
    // ====================
    console.log('\n🚀 STEP 7: Start Work\n');

    await db.execute(sql`
      UPDATE work_orders
      SET 
        status = 'in_progress',
        actual_start_date = NOW(),
        vessel_downtime_started_at = NOW()
      WHERE id = ${testWorkOrderId}
    `);

    const startedWO = await db.execute(sql`
      SELECT status, actual_start_date
      FROM work_orders
      WHERE id = ${testWorkOrderId}
    `);

    if ((startedWO.rows[0] as any).status === 'in_progress') {
      log(
        'Start Work',
        'PASS',
        'Work order status changed to in_progress',
        { started_at: (startedWO.rows[0] as any).actual_start_date }
      );
    } else {
      log(
        'Start Work',
        'FAIL',
        `Status not updated correctly: ${(startedWO.rows[0] as any).status}`
      );
    }

    // ====================
    // STEP 8: Complete Work Order
    // ====================
    console.log('\n✅ STEP 8: Complete Work Order\n');

    const actualHours = 5.5;
    const actualCostPerHour = 75.00;
    const laborCost = actualHours * actualCostPerHour;
    
    // Update work order with completion data
    await db.execute(sql`
      UPDATE work_orders
      SET 
        status = 'completed',
        actual_end_date = NOW(),
        actual_hours = ${actualHours},
        actual_cost_per_hour = ${actualCostPerHour},
        labor_cost = ${laborCost},
        total_labor_cost = ${laborCost}
      WHERE id = ${testWorkOrderId}
    `);

    // Parts already allocated, no update needed
    // (quantity_used was set during insertion)

    // Calculate total cost
    const partsCost = await db.execute(sql`
      SELECT COALESCE(SUM(quantity_used * unit_cost), 0) as total
      FROM work_order_parts
      WHERE work_order_id = ${testWorkOrderId}
    `);

    const totalPartsCost = parseFloat((partsCost.rows[0] as any).total || '0');
    const totalCost = laborCost + totalPartsCost;

    await db.execute(sql`
      UPDATE work_orders
      SET 
        total_parts_cost = ${totalPartsCost},
        total_cost = ${totalCost}
      WHERE id = ${testWorkOrderId}
    `);

    log(
      'Work Order Completion',
      'PASS',
      `Completed work order - Labor: $${laborCost}, Parts: $${totalPartsCost}, Total: $${totalCost}`,
      { actualHours, laborCost, totalPartsCost, totalCost }
    );

    // ====================
    // STEP 9: Verify Completion State
    // ====================
    console.log('\n🔍 STEP 9: Completion State Verification\n');

    const completedState = await db.execute(sql`
      SELECT 
        id,
        status,
        estimated_hours,
        actual_hours,
        labor_cost,
        total_parts_cost,
        total_cost,
        actual_start_date,
        actual_end_date
      FROM work_orders
      WHERE id = ${testWorkOrderId}
    `);

    const completedWO = completedState.rows[0] as any;
    
    const checks = [
      { name: 'Status is completed', pass: completedWO.status === 'completed' },
      { name: 'Actual hours recorded', pass: completedWO.actual_hours > 0 },
      { name: 'Labor cost calculated', pass: completedWO.labor_cost > 0 },
      { name: 'Total cost calculated', pass: completedWO.total_cost > 0 },
      { name: 'Start date recorded', pass: completedWO.actual_start_date !== null },
      { name: 'End date recorded', pass: completedWO.actual_end_date !== null }
    ];

    const allPassed = checks.every(c => c.pass);
    
    if (allPassed) {
      log(
        'Completion Verification',
        'PASS',
        'All completion checks passed',
        { checks, completedWO }
      );
    } else {
      const failed = checks.filter(c => !c.pass);
      log(
        'Completion Verification',
        'FAIL',
        `${failed.length} checks failed`,
        { failed, completedWO }
      );
    }

    // ====================
    // STEP 10: Verify Prediction Update
    // ====================
    console.log('\n🔮 STEP 10: Prediction Feedback Loop\n');

    if (testPredictionId) {
      // In a full system, prediction would be updated via ML feedback loop
      // For this test, we just verify the prediction still exists
      const updatedPrediction = await db.execute(sql`
        SELECT id, failure_probability, failure_mode
        FROM failure_predictions
        WHERE id = ${testPredictionId}
      `);

      if (updatedPrediction.rows.length > 0) {
        log(
          'Prediction Feedback',
          'PASS',
          'Prediction exists and can be linked to completed work order',
          { prediction: updatedPrediction.rows[0] }
        );
      } else {
        log('Prediction Feedback', 'FAIL', 'Prediction not found');
      }
    }

    // ====================
    // STEP 11: Verify Equipment State
    // ====================
    console.log('\n🛠️  STEP 11: Equipment State Verification\n');

    const equipmentState = await db.execute(sql`
      SELECT 
        e.id,
        e.name,
        COUNT(wo.id) as total_work_orders,
        COUNT(CASE WHEN wo.status = 'completed' THEN 1 END) as completed_work_orders
      FROM equipment e
      LEFT JOIN work_orders wo ON wo.equipment_id = e.id
      WHERE e.id = ${testEquipmentId}
      GROUP BY e.id, e.name
    `);

    const equipState = equipmentState.rows[0] as any;
    
    if (parseInt(equipState.completed_work_orders) > 0) {
      log(
        'Equipment State',
        'PASS',
        `Equipment has ${equipState.completed_work_orders} completed work orders`,
        { equipState }
      );
    } else {
      log(
        'Equipment State',
        'FAIL',
        'Equipment has no completed work orders',
        { equipState }
      );
    }

    // ====================
    // STEP 12: Cleanup (Optional)
    // ====================
    console.log('\n🧹 STEP 12: Cleanup Test Data\n');

    // Note: In a production test, you might want to clean up test data
    // For now, we'll leave it to verify in database
    log(
      'Cleanup',
      'PASS',
      `Test data preserved for verification (WO ID: ${testWorkOrderId})`
    );

    // ====================
    // SUMMARY
    // ====================
    console.log('\n' + '='.repeat(80));
    console.log('WORK ORDER LIFECYCLE TEST SUMMARY');
    console.log('='.repeat(80));
    
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const errors = results.filter(r => r.status === 'ERROR').length;
    const total = results.length;
    
    console.log(`\nTotal Steps: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Errors: ${errors}`);
    console.log(`\nSuccess Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0 || errors > 0) {
      console.log('\n❌ Failed/Error Steps:\n');
      results
        .filter(r => r.status !== 'PASS')
        .forEach(r => {
          console.log(`  [${r.step}] ${r.message}`);
        });
    }
    
    console.log('\n📊 Test Artifacts:');
    console.log(`  Equipment ID: ${testEquipmentId}`);
    console.log(`  Work Order ID: ${testWorkOrderId}`);
    console.log(`  Prediction ID: ${testPredictionId}`);
    
    console.log('\n' + '='.repeat(80));
    console.log(`Completed at: ${new Date().toISOString()}`);
    console.log('='.repeat(80) + '\n');
    
    process.exit(failed > 0 || errors > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('\n💥 FATAL ERROR:', error);
    process.exit(1);
  }
}

// Run test
runWorkOrderLifecycleTest();
