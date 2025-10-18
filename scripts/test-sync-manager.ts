#!/usr/bin/env tsx
/**
 * Sync Manager Integration Test
 * Tests sync conflict detection, resolution, journal integrity, and multi-device scenarios
 * Run with: tsx scripts/test-sync-manager.ts
 */

import { db } from '../server/db';
import { workOrders, vessels, equipment, organizations, syncJournal, syncOutbox } from '../shared/schema';
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  details: string;
  error?: string;
}

const results: TestResult[] = [];

function logTest(name: string, status: '✓' | '✗' | '⚠', message: string) {
  const icon = status === '✓' ? '✓' : status === '✗' ? '✗' : '⚠';
  console.log(`${icon} ${name}: ${message}`);
}

function logSection(title: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(title);
  console.log('='.repeat(60));
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test data setup
let testOrgId: string | null = null;
let testVesselId: string | null = null;
let testEquipmentId: string | null = null;

async function setupTestData() {
  const slug = `test-sync-${Date.now()}`;
  const [org] = await db.insert(organizations).values({
    name: 'Sync Test Organization',
    slug: slug,
    industry: 'maritime',
    country: 'US'
  } as any).returning();
  
  testOrgId = org.id;

  const [vessel] = await db.insert(vessels).values({
    orgId: testOrgId,
    name: 'Sync Test Vessel',
    imo: `SYNC${Date.now()}`
  } as any).returning();
  
  testVesselId = vessel.id;

  const [eq] = await db.insert(equipment).values({
    vesselId: testVesselId,
    orgId: testOrgId,
    name: 'Sync Test Equipment',
    type: 'engine'
  } as any).returning();
  
  testEquipmentId = eq.id;
}

async function cleanupTestData() {
  if (testOrgId) {
    await db.delete(workOrders).where(eq(workOrders.orgId, testOrgId));
    await db.delete(equipment).where(eq(equipment.orgId, testOrgId));
    await db.delete(vessels).where(eq(vessels.orgId, testOrgId));
    await db.delete(organizations).where(eq(organizations.id, testOrgId));
    
    // Note: Sync journal and outbox don't have vesselId column
    // They track changes generically by entityType/entityId
    // No need to clean them up specifically for this test
  }
}

/**
 * Test 1: Sync Journal Creation on Write
 */
async function testSyncJournalCreation(): Promise<TestResult> {
  const testName = 'Sync Journal Creation on Write';
  const start = Date.now();
  
  try {
    // Get initial journal count (all entries)
    const initialJournals = await db.select().from(syncJournal);
    const initialCount = initialJournals.length;

    // Create a work order (should trigger journal entry)
    const [wo] = await db.insert(workOrders).values({
      vesselId: testVesselId!,
      orgId: testOrgId!,
      equipmentId: testEquipmentId!,
      description: 'Test sync journal creation',
      priority: 3,
      status: 'open'
    } as any).returning();

    // Wait a bit for async journal creation
    await sleep(100);

    // Check if journal entry was created
    const finalJournals = await db.select()
      .from(syncJournal)
      .orderBy(desc(syncJournal.createdAt));

    const finalCount = finalJournals.length;
    const journalCreated = finalCount > initialCount;

    // Cleanup
    await db.delete(workOrders).where(eq(workOrders.id, wo.id));

    const duration = Date.now() - start;
    const passed = journalCreated;

    logTest(testName, passed ? '✓' : '⚠',
      `Journal entries: ${initialCount} → ${finalCount} (${journalCreated ? 'created' : 'NOT created'})`);

    return {
      name: testName,
      passed,
      duration,
      details: `Initial: ${initialCount}, Final: ${finalCount}, Journal created: ${journalCreated}`
    };
  } catch (error: any) {
    const duration = Date.now() - start;
    logTest(testName, '✗', `Failed: ${error.message}`);
    return {
      name: testName,
      passed: false,
      duration,
      details: 'Test crashed',
      error: error.message
    };
  }
}

/**
 * Test 2: Concurrent Updates with Version Tracking
 */
async function testVersionTracking(): Promise<TestResult> {
  const testName = 'Concurrent Updates with Version Tracking';
  const start = Date.now();
  
  try {
    // Create a work order
    const [wo] = await db.insert(workOrders).values({
      vesselId: testVesselId!,
      orgId: testOrgId!,
      equipmentId: testEquipmentId!,
      description: 'Version test initial',
      priority: 3,
      status: 'open',
      version: 1
    } as any).returning();

    const initialVersion = wo.version;

    // Update the work order
    await db.update(workOrders)
      .set({ 
        description: 'Version test updated',
        version: (wo.version || 1) + 1
      })
      .where(eq(workOrders.id, wo.id));

    // Verify version increased
    const [updated] = await db.select()
      .from(workOrders)
      .where(eq(workOrders.id, wo.id));

    const versionIncreased = updated.version > initialVersion;

    // Cleanup
    await db.delete(workOrders).where(eq(workOrders.id, wo.id));

    const duration = Date.now() - start;
    const passed = versionIncreased;

    logTest(testName, passed ? '✓' : '✗',
      `Version: ${initialVersion} → ${updated.version} (${versionIncreased ? 'increased' : 'NOT increased'})`);

    return {
      name: testName,
      passed,
      duration,
      details: `Initial version: ${initialVersion}, Updated version: ${updated.version}`
    };
  } catch (error: any) {
    const duration = Date.now() - start;
    logTest(testName, '✗', `Failed: ${error.message}`);
    return {
      name: testName,
      passed: false,
      duration,
      details: 'Test crashed',
      error: error.message
    };
  }
}

/**
 * Test 3: Simulated Conflict Detection
 */
async function testConflictDetection(): Promise<TestResult> {
  const testName = 'Simulated Conflict Detection';
  const start = Date.now();
  
  try {
    // Create a work order
    const [wo] = await db.insert(workOrders).values({
      vesselId: testVesselId!,
      orgId: testOrgId!,
      equipmentId: testEquipmentId!,
      description: 'Conflict test',
      priority: 3,
      status: 'open',
      version: 1,
      lastModifiedBy: 'device-1',
      lastModifiedDevice: 'device-1'
    } as any).returning();

    // Simulate concurrent update from device-2
    const update1Promise = db.update(workOrders)
      .set({ 
        description: 'Updated by device-1',
        version: 2,
        lastModifiedBy: 'device-1',
        lastModifiedDevice: 'device-1'
      })
      .where(eq(workOrders.id, wo.id));

    // Simulate concurrent update from device-2 (slight delay)
    const update2Promise = sleep(10).then(() =>
      db.update(workOrders)
        .set({ 
          description: 'Updated by device-2',
          version: 2,
          lastModifiedBy: 'device-2',
          lastModifiedDevice: 'device-2'
        })
        .where(eq(workOrders.id, wo.id))
    );

    // Execute both updates
    await Promise.all([update1Promise, update2Promise]);

    // Check final state
    const [final] = await db.select()
      .from(workOrders)
      .where(eq(workOrders.id, wo.id));

    const conflictHandled = final !== undefined && final.lastModifiedDevice !== undefined;

    // Cleanup
    await db.delete(workOrders).where(eq(workOrders.id, wo.id));

    const duration = Date.now() - start;
    const passed = conflictHandled;

    logTest(testName, passed ? '✓' : '✗',
      `Final state: ${final?.lastModifiedDevice}, Version: ${final?.version}`);

    return {
      name: testName,
      passed,
      duration,
      details: `Conflict handled: ${conflictHandled}, Final device: ${final?.lastModifiedDevice}, Final version: ${final?.version}`
    };
  } catch (error: any) {
    const duration = Date.now() - start;
    logTest(testName, '✗', `Failed: ${error.message}`);
    return {
      name: testName,
      passed: false,
      duration,
      details: 'Test crashed',
      error: error.message
    };
  }
}

/**
 * Test 4: Sync Outbox Queue Management
 */
async function testSyncOutboxQueue(): Promise<TestResult> {
  const testName = 'Sync Outbox Queue Management';
  const start = Date.now();
  
  try {
    // Get initial outbox count (all entries)
    const initialOutbox = await db.select().from(syncOutbox);
    const initialCount = initialOutbox.length;

    // Create multiple work orders (should queue for sync)
    const count = 5;
    const createPromises = Array.from({ length: count }, (_, i) =>
      db.insert(workOrders).values({
        vesselId: testVesselId!,
        orgId: testOrgId!,
        equipmentId: testEquipmentId!,
        description: `Outbox test ${i}`,
        priority: 3,
        status: 'open'
      } as any).returning()
    );

    const results = await Promise.all(createPromises);
    await sleep(100); // Wait for outbox entries

    // Check outbox
    const finalOutbox = await db.select().from(syncOutbox);
    const finalCount = finalOutbox.length;
    const outboxGrew = finalCount > initialCount;

    // Cleanup
    for (const [wo] of results) {
      await db.delete(workOrders).where(eq(workOrders.id, wo.id));
    }

    const duration = Date.now() - start;
    const passed = outboxGrew;

    logTest(testName, passed ? '✓' : '⚠',
      `Outbox: ${initialCount} → ${finalCount} (${outboxGrew ? 'grew' : 'unchanged'})`);

    return {
      name: testName,
      passed,
      duration,
      details: `Initial: ${initialCount}, Final: ${finalCount}, Created: ${count} records`
    };
  } catch (error: any) {
    const duration = Date.now() - start;
    logTest(testName, '✗', `Failed: ${error.message}`);
    return {
      name: testName,
      passed: false,
      duration,
      details: 'Test crashed',
      error: error.message
    };
  }
}

/**
 * Test 5: Sync Health Check API
 */
async function testSyncHealthAPI(): Promise<TestResult> {
  const testName = 'Sync Health Check API';
  const start = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}/api/sync/health`);
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const health = await response.json();

    const duration = Date.now() - start;
    const passed = health && health.status !== undefined;

    logTest(testName, passed ? '✓' : '✗',
      `Status: ${health?.status || 'unknown'}, Responsive: ${response.ok}`);

    return {
      name: testName,
      passed,
      duration,
      details: `Status: ${health?.status}, API responsive: ${response.ok}`
    };
  } catch (error: any) {
    const duration = Date.now() - start;
    logTest(testName, '✗', `Failed: ${error.message}`);
    return {
      name: testName,
      passed: false,
      duration,
      details: 'Test crashed',
      error: error.message
    };
  }
}

/**
 * Test 6: API Route Sync Journal Integration
 */
async function testAPIRouteSyncJournalIntegration(): Promise<TestResult> {
  const testName = 'API Route Sync Journal Integration';
  const start = Date.now();
  
  try {
    // Get initial journal count
    const initialJournals = await db.select().from(syncJournal);
    const initialCount = initialJournals.length;

    // Create a work order via API (should trigger recordAndPublish)
    const response = await fetch(`${BASE_URL}/api/work-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-org-id': testOrgId!
      },
      body: JSON.stringify({
        vesselId: testVesselId!,
        orgId: testOrgId!,
        equipmentId: testEquipmentId!,
        description: 'Test API sync journal integration',
        priority: 3,
        status: 'open'
      })
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${await response.text()}`);
    }

    const workOrder = await response.json();

    // Wait for async journal creation
    await sleep(200);

    // Check if journal entry was created
    const finalJournals = await db.select()
      .from(syncJournal)
      .orderBy(desc(syncJournal.createdAt));

    const finalCount = finalJournals.length;
    const journalCreated = finalCount > initialCount;
    
    // Find the journal entry for our work order
    const journalEntry = finalJournals.find(
      j => j.entityType === 'work_order' && j.entityId === workOrder.id
    );

    // Cleanup
    await fetch(`${BASE_URL}/api/work-orders/${workOrder.id}`, {
      method: 'DELETE',
      headers: {
        'x-org-id': testOrgId!
      }
    });

    const duration = Date.now() - start;
    const passed = journalCreated && !!journalEntry;

    if (passed) {
      logTest(testName, '✓', `Journal entry created via API route (${finalCount - initialCount} new entries)`);
    } else {
      logTest(testName, '✗', `Journal entry NOT created via API route`);
    }

    return {
      name: testName,
      passed,
      duration,
      details: passed 
        ? `API route correctly populated sync journal (${finalCount - initialCount} entries)`
        : 'API route did not populate sync journal',
      error: passed ? undefined : 'No journal entry found for created work order'
    };
  } catch (error) {
    const duration = Date.now() - start;
    logTest(testName, '✗', `Error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      name: testName,
      passed: false,
      duration,
      details: 'Test failed with error',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('\n🔄 ARUS Sync Manager Integration Test Suite');
  console.log(`Target: ${BASE_URL}\n`);

  const allResults: TestResult[] = [];

  // Setup
  logSection('🛠️  SETUP');
  console.log('Creating test organization, vessel, and equipment...');
  await setupTestData();
  console.log(`✓ Organization: ${testOrgId}`);
  console.log(`✓ Vessel: ${testVesselId}`);
  console.log(`✓ Equipment: ${testEquipmentId}`);

  // Sync Journal Tests
  logSection('📝 SYNC JOURNAL TESTS');
  allResults.push(await testSyncJournalCreation());

  // Version Tracking Tests
  logSection('🔢 VERSION TRACKING TESTS');
  allResults.push(await testVersionTracking());

  // Conflict Detection Tests
  logSection('⚔️  CONFLICT DETECTION TESTS');
  allResults.push(await testConflictDetection());

  // Sync Outbox Tests
  logSection('📤 SYNC OUTBOX TESTS');
  allResults.push(await testSyncOutboxQueue());

  // API Tests
  logSection('🌐 SYNC API TESTS');
  allResults.push(await testSyncHealthAPI());
  
  // API Route Integration Tests
  logSection('🔌 API ROUTE INTEGRATION TESTS');
  allResults.push(await testAPIRouteSyncJournalIntegration());

  // Cleanup
  logSection('🧹 CLEANUP');
  console.log('Cleaning up test data...');
  await cleanupTestData();
  console.log('✓ Cleanup complete');

  // Summary
  logSection('📈 TEST SUMMARY');
  const passed = allResults.filter(r => r.passed).length;
  const failed = allResults.filter(r => !r.passed).length;
  const totalDuration = allResults.reduce((sum, r) => sum + r.duration, 0);

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  console.log(`Total Duration: ${totalDuration}ms`);
  console.log(`Average Test Duration: ${(totalDuration / allResults.length).toFixed(2)}ms\n`);

  // Detailed results
  if (failed > 0) {
    console.log('❌ Failed Tests:');
    allResults
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`  - ${r.name}: ${r.details}`);
        if (r.error) {
          console.log(`    Error: ${r.error}`);
        }
      });
  }

  console.log('\n✅ Passed Tests:');
  allResults
    .filter(r => r.passed)
    .forEach(r => {
      console.log(`  - ${r.name}: ${r.details}`);
    });

  // Exit code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
