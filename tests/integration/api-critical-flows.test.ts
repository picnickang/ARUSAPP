/**
 * Integration tests for critical API flows
 * Tests multi-step operations, transactions, and error handling
 */

import { db } from '../../server/db';
import { eq, and } from 'drizzle-orm';
import { 
  organizations,
  vessels, 
  equipment, 
  workOrders,
  partsInventory,
  workOrderParts,
  failurePredictions
} from '../../shared/schema';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, duration?: number, error?: string) {
  results.push({ name, passed, error, duration });
  const status = passed ? '✓' : '✗';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  const durationStr = duration ? ` (${duration}ms)` : '';
  console.log(`${color}${status}\x1b[0m ${name}${durationStr}${error ? ': ' + error : ''}`);
}

async function setupTestData() {
  console.log('\n📝 Setting up test data...\n');
  
  // Generate unique org ID to avoid conflicts
  const orgId = `api-test-org-${Date.now()}`;
  
  // Create test organization
  const [org] = await db.insert(organizations).values({
    id: orgId,
    name: 'API Test Organization',
    slug: orgId
  }).returning();

  const [vessel] = await db.insert(vessels).values({
    orgId,
    name: 'API Test Vessel',
    type: 'Container Ship',
    imoNumber: 'API123',
    status: 'active'
  }).returning();

  const [equip] = await db.insert(equipment).values({
    orgId,
    vesselId: vessel.id,
    name: 'Critical Engine',
    type: 'Engine',
    manufacturer: 'TestMfg',
    model: 'T-1000',
    status: 'operational',
    criticalityScore: 95
  }).returning();

  const [part] = await db.insert(partsInventory).values({
    orgId,
    partNumber: 'API-PART-001',
    partName: 'Critical Component',
    category: 'Engine Parts',
    quantityOnHand: 100,
    quantityReserved: 0,
    unitCost: 500.00,
    location: 'Warehouse A'
  }).returning();

  console.log('✓ Test data created\n');
  return { vesselId: vessel.id, equipmentId: equip.id, partId: part.id, orgId };
}

async function cleanupTestData(testIds: { vesselId: string; equipmentId: string; partId: string; orgId: string }) {
  console.log('\n🧹 Cleaning up test data...\n');
  
  try {
    // Delete in dependency order
    await db.delete(workOrderParts).where(eq(workOrderParts.orgId, testIds.orgId));
    await db.delete(workOrders).where(eq(workOrders.orgId, testIds.orgId));
    await db.delete(failurePredictions).where(eq(failurePredictions.orgId, testIds.orgId));
    await db.delete(partsInventory).where(eq(partsInventory.id, testIds.partId));
    await db.delete(equipment).where(eq(equipment.id, testIds.equipmentId));
    await db.delete(vessels).where(eq(vessels.id, testIds.vesselId));
    await db.delete(organizations).where(eq(organizations.id, testIds.orgId));
    
    console.log('✓ Test data cleaned up\n');
  } catch (error) {
    console.error('✗ Cleanup error:', error);
  }
}

async function testWorkOrderCreation(equipmentId: string, orgId: string) {
  const start = Date.now();
  try {
    const [workOrder] = await db.insert(workOrders).values({
      orgId,
      equipmentId,
      workOrderNumber: 'WO-API-TEST-001',
      description: 'Test work order',
      status: 'open',
      priorityScore: 8
    }).returning();

    const exists = !!workOrder.id;
    logTest('Work Order Creation', exists, Date.now() - start);
    return workOrder.id;
  } catch (error) {
    logTest('Work Order Creation', false, Date.now() - start,
      error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function testInventoryReservation(workOrderId: string, partId: string, orgId: string) {
  const start = Date.now();
  try {
    // Transaction: Add part to work order and reserve inventory
    await db.transaction(async (tx) => {
      // Create work order part
      await tx.insert(workOrderParts).values({
        orgId,
        workOrderId,
        partId,
        quantityUsed: 5,
        unitCost: 500,
        totalCost: 2500,
        usedBy: 'test-user'
      });

      // Reserve inventory
      await tx.update(partsInventory)
        .set({ quantityReserved: 5 })
        .where(eq(partsInventory.id, partId));
    });

    // Verify reservation
    const [part] = await db.select()
      .from(partsInventory)
      .where(eq(partsInventory.id, partId));

    const success = part.quantityReserved === 5;
    logTest('Atomic Inventory Reservation', success, Date.now() - start,
      success ? undefined : `Expected reserved=5, got ${part.quantityReserved}`);
  } catch (error) {
    logTest('Atomic Inventory Reservation', false, Date.now() - start,
      error instanceof Error ? error.message : String(error));
  }
}

async function testWorkOrderCompletion(workOrderId: string, partId: string) {
  const start = Date.now();
  try {
    // Transaction: Complete work order and release inventory
    await db.transaction(async (tx) => {
      // Update work order status
      await tx.update(workOrders)
        .set({ 
          status: 'completed',
          completedDate: new Date()
        })
        .where(eq(workOrders.id, workOrderId));

      // Release inventory
      await tx.update(partsInventory)
        .set({ 
          quantityReserved: 0,
          quantityOnHand: 95 // Consumed 5 units
        })
        .where(eq(partsInventory.id, partId));
    });

    // Verify completion
    const [wo] = await db.select()
      .from(workOrders)
      .where(eq(workOrders.id, workOrderId));

    const [part] = await db.select()
      .from(partsInventory)
      .where(eq(partsInventory.id, partId));

    const success = wo.status === 'completed' && 
                    part.quantityReserved === 0 &&
                    part.quantityOnHand === 95;
    
    logTest('Work Order Completion Transaction', success, Date.now() - start,
      success ? undefined : 'Transaction did not complete correctly');
  } catch (error) {
    logTest('Work Order Completion Transaction', false, Date.now() - start,
      error instanceof Error ? error.message : String(error));
  }
}

async function testPredictionCreation(equipmentId: string, orgId: string) {
  const start = Date.now();
  try {
    const [prediction] = await db.insert(failurePredictions).values({
      orgId,
      equipmentId,
      componentType: 'bearing',
      failureProbability: 0.75,
      confidenceScore: 0.85,
      predictedFailureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      severity: 'high',
      riskLevel: 'high',
      mlModelId: 'test-model',
      mlModelVersion: '1.0.0'
    }).returning();

    const success = !!prediction.id && prediction.failureProbability === 0.75;
    logTest('ML Prediction Creation', success, Date.now() - start);
  } catch (error) {
    logTest('ML Prediction Creation', false, Date.now() - start,
      error instanceof Error ? error.message : String(error));
  }
}

async function testConcurrentReads(equipmentId: string) {
  const start = Date.now();
  try {
    // Simulate concurrent API requests
    const promises = [
      db.select().from(equipment).where(eq(equipment.id, equipmentId)),
      db.select().from(workOrders).where(eq(workOrders.equipmentId, equipmentId)),
      db.select().from(failurePredictions).where(eq(failurePredictions.equipmentId, equipmentId)),
    ];

    const [equipResults, woResults, predResults] = await Promise.all(promises);

    const success = equipResults.length > 0;
    logTest('Concurrent Read Operations', success, Date.now() - start);
  } catch (error) {
    logTest('Concurrent Read Operations', false, Date.now() - start,
      error instanceof Error ? error.message : String(error));
  }
}

async function testErrorHandling(orgId: string) {
  const start = Date.now();
  try {
    // Attempt to create work order with invalid equipment ID
    try {
      await db.insert(workOrders).values({
        orgId,
        equipmentId: 'non-existent-id',
        workOrderNumber: 'WO-ERROR-TEST',
        description: 'Should fail',
        status: 'open'
      });
      
      // If we get here, the test failed (should have thrown)
      logTest('Error Handling - Foreign Key Constraint', false, Date.now() - start,
        'Expected foreign key error did not occur');
    } catch (fkError) {
      // This is expected - foreign key constraint should fail
      const isExpectedError = fkError instanceof Error && 
        (fkError.message.includes('foreign key') || 
         fkError.message.includes('constraint') ||
         fkError.message.includes('violates'));
      
      logTest('Error Handling - Foreign Key Constraint', isExpectedError, Date.now() - start,
        isExpectedError ? undefined : 'Unexpected error type');
    }
  } catch (error) {
    logTest('Error Handling - Foreign Key Constraint', false, Date.now() - start,
      error instanceof Error ? error.message : String(error));
  }
}

async function runTests() {
  console.log('\n========================================');
  console.log('  Critical API Flows Integration Tests');
  console.log('========================================\n');

  let testIds: { vesselId: string; equipmentId: string; partId: string; orgId: string } | null = null;
  let workOrderId: string | null = null;

  try {
    // Setup
    testIds = await setupTestData();

    // Run flow tests
    console.log('Testing critical API flows...\n');
    
    workOrderId = await testWorkOrderCreation(testIds.equipmentId, testIds.orgId);
    
    if (workOrderId) {
      await testInventoryReservation(workOrderId, testIds.partId, testIds.orgId);
      await testWorkOrderCompletion(workOrderId, testIds.partId);
    }
    
    await testPredictionCreation(testIds.equipmentId, testIds.orgId);
    await testConcurrentReads(testIds.equipmentId);
    await testErrorHandling(testIds.orgId);

  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
  } finally {
    // Cleanup
    if (testIds) {
      await cleanupTestData(testIds);
    }
  }

  // Summary
  console.log('\n========================================');
  console.log('  Test Summary');
  console.log('========================================\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  const avgDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0) / total;
  
  console.log(`Total: ${total}`);
  console.log(`\x1b[32mPassed: ${passed}\x1b[0m`);
  console.log(`\x1b[31mFailed: ${failed}\x1b[0m`);
  console.log(`Average Duration: ${avgDuration.toFixed(2)}ms`);
  
  if (failed > 0) {
    console.log('\n❌ Some tests failed\n');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed\n');
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
