#!/usr/bin/env tsx
/**
 * Live Concurrency & Stress Test Script
 * Tests MQTT, WebSocket, Database, and Sync systems for concurrency issues
 * Run with: tsx scripts/test-concurrency.ts
 */

import { db } from '../server/db';
import { workOrders, equipment, alertNotifications, vessels, organizations } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import WebSocket from 'ws';

// Create test organization for all tests
let testOrgId: string | null = null;

async function ensureTestOrganization(): Promise<string> {
  if (testOrgId) return testOrgId;
  
  const slug = `test-org-${Date.now()}`;
  const [org] = await db.insert(organizations).values({
    name: 'Test Organization (Concurrency Tests)',
    slug: slug,
    industry: 'maritime',
    country: 'US'
  } as any).returning();
  
  testOrgId = org.id;
  return testOrgId;
}

async function cleanupTestOrganization() {
  if (testOrgId) {
    await db.delete(workOrders).where(eq(workOrders.orgId, testOrgId));
    await db.delete(vessels).where(eq(vessels.orgId, testOrgId));
    await db.delete(organizations).where(eq(organizations.id, testOrgId));
  }
}

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const WS_URL = BASE_URL.replace('http://', 'ws://') + '/ws';

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

/**
 * Test 1: Database Concurrent Inserts
 */
async function testDatabaseConcurrentInserts(): Promise<TestResult> {
  const testName = 'Database Concurrent Inserts';
  const start = Date.now();
  
  try {
    const orgId = await ensureTestOrganization();
    const testVesselId = randomUUID();
    
    // Create test vessel first
    await db.insert(vessels).values({
      id: testVesselId,
      orgId: orgId,
      name: 'Test Vessel Concurrent',
      imo: `TEST${Date.now()}`
    } as any);

    // Concurrent inserts (50 work orders)
    const count = 50;
    const insertPromises = Array.from({ length: count }, (_, i) =>
      db.insert(workOrders).values({
        vesselId: testVesselId,
        orgId: orgId,
        title: `Concurrent WO ${i}`,
        description: 'Concurrency test',
        priority: 'medium',
        status: 'pending',
        createdBy: 'test-script'
      } as any).returning()
    );

    const results = await Promise.allSettled(insertPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    // Cleanup
    await db.delete(workOrders).where(eq(workOrders.orgId, orgId));
    await db.delete(vessels).where(eq(vessels.id, testVesselId));

    const duration = Date.now() - start;
    const passed = successful >= count * 0.9; // 90% success rate acceptable

    logTest(testName, passed ? '✓' : '✗', 
      `${successful}/${count} succeeded in ${duration}ms (${failed} failed)`);

    return {
      name: testName,
      passed,
      duration,
      details: `Successful: ${successful}, Failed: ${failed}, Throughput: ${(successful/duration*1000).toFixed(2)} ops/sec`
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
 * Test 2: Database Concurrent Updates
 */
async function testDatabaseConcurrentUpdates(): Promise<TestResult> {
  const testName = 'Database Concurrent Updates';
  const start = Date.now();
  
  try {
    const orgId = await ensureTestOrganization();
    const testVesselId = randomUUID();
    
    // Create test vessel
    await db.insert(vessels).values({
      id: testVesselId,
      orgId: orgId,
      name: 'Test Vessel',
      imo: `TEST${Date.now()}`,
      vesselType: 'cargo_ship',
      flag: 'US'
    } as any);

    // Create a single work order
    const [workOrder] = await db.insert(workOrders).values({
      vesselId: testVesselId,
      orgId: orgId,
      title: 'Update Test',
      description: 'Will be updated concurrently',
      priority: 'low',
      status: 'pending',
      createdBy: 'test-script'
    } as any).returning();

    // Concurrent updates (different fields)
    const updatePromises = Array.from({ length: 10 }, (_, i) =>
      db.update(workOrders)
        .set({ 
          description: `Updated ${i}`,
          updatedAt: new Date()
        })
        .where(eq(workOrders.id, workOrder.id))
    );

    const results = await Promise.allSettled(updatePromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;

    // Verify final state exists
    const [final] = await db.select()
      .from(workOrders)
      .where(eq(workOrders.id, workOrder.id));

    // Cleanup
    await db.delete(workOrders).where(eq(workOrders.id, workOrder.id));
    await db.delete(vessels).where(eq(vessels.id, testVesselId));

    const duration = Date.now() - start;
    const passed = successful === 10 && final !== undefined;

    logTest(testName, passed ? '✓' : '✗',
      `${successful}/10 updates succeeded, final state: ${final ? 'valid' : 'INVALID'}`);

    return {
      name: testName,
      passed,
      duration,
      details: `Updates: ${successful}/10, Final state preserved: ${!!final}`
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
 * Test 3: Database Transaction Rollback
 */
async function testDatabaseTransactionRollback(): Promise<TestResult> {
  const testName = 'Database Transaction Rollback';
  const start = Date.now();
  
  try {
    const orgId = await ensureTestOrganization();
    const testVesselId = randomUUID();

    // Create test vessel
    await db.insert(vessels).values({
      id: testVesselId,
      orgId: orgId,
      name: 'Test Vessel',
      imo: `TEST${Date.now()}`,
      vesselType: 'cargo_ship',
      flag: 'US'
    } as any);

    let errorCaught = false;
    try {
      await db.transaction(async (tx) => {
        await tx.insert(workOrders).values({
          vesselId: testVesselId,
          orgId: orgId,
          title: 'Transaction Test',
          description: 'Should rollback',
          priority: 'medium',
          status: 'pending',
          createdBy: 'test-script'
        } as any);

        throw new Error('Intentional rollback');
      });
    } catch (error: any) {
      errorCaught = error.message.includes('Intentional rollback');
    }

    // Verify rollback - no work orders should exist
    const orphans = await db.select()
      .from(workOrders)
      .where(eq(workOrders.organizationId, testOrgId));

    // Cleanup
    await db.delete(vessels).where(eq(vessels.id, testVesselId));

    const duration = Date.now() - start;
    const passed = errorCaught && orphans.length === 0;

    logTest(testName, passed ? '✓' : '✗',
      `Rollback ${passed ? 'successful' : 'FAILED'} (orphans: ${orphans.length})`);

    return {
      name: testName,
      passed,
      duration,
      details: `Error caught: ${errorCaught}, Orphan records: ${orphans.length}`
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
 * Test 4: API Concurrent Requests
 */
async function testAPIConcurrentRequests(): Promise<TestResult> {
  const testName = 'API Concurrent Requests';
  const start = Date.now();
  
  try {
    const requestCount = 20;
    
    // Concurrent API calls
    const requests = Array.from({ length: requestCount }, () =>
      fetch(`${BASE_URL}/api/vessels`)
        .then(res => res.json())
    );

    const results = await Promise.allSettled(requests);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    const duration = Date.now() - start;
    const passed = successful >= requestCount * 0.9;

    logTest(testName, passed ? '✓' : '✗',
      `${successful}/${requestCount} requests succeeded (${(successful/duration*1000).toFixed(2)} req/sec)`);

    return {
      name: testName,
      passed,
      duration,
      details: `Successful: ${successful}, Failed: ${failed}, Avg response: ${(duration/successful).toFixed(2)}ms`
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
 * Test 5: WebSocket Concurrent Connections
 */
async function testWebSocketConcurrentConnections(): Promise<TestResult> {
  const testName = 'WebSocket Concurrent Connections';
  const start = Date.now();
  
  try {
    const connectionCount = 20;
    const connections: WebSocket[] = [];
    const connectedCount = await new Promise<number>((resolve) => {
      let connected = 0;
      let failed = 0;

      for (let i = 0; i < connectionCount; i++) {
        const ws = new WebSocket(WS_URL);
        connections.push(ws);

        ws.on('open', () => {
          connected++;
          if (connected + failed === connectionCount) {
            resolve(connected);
          }
        });

        ws.on('error', () => {
          failed++;
          if (connected + failed === connectionCount) {
            resolve(connected);
          }
        });

        // Timeout safety
        setTimeout(() => {
          if (connected + failed < connectionCount) {
            resolve(connected);
          }
        }, 5000);
      }
    });

    // Close all connections
    connections.forEach(ws => ws.close());
    await sleep(100);

    const duration = Date.now() - start;
    const passed = connectedCount >= connectionCount * 0.9;

    logTest(testName, passed ? '✓' : '✗',
      `${connectedCount}/${connectionCount} connections established`);

    return {
      name: testName,
      passed,
      duration,
      details: `Connected: ${connectedCount}/${connectionCount}`
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
 * Test 6: MQTT Health Check
 */
async function testMQTTHealthCheck(): Promise<TestResult> {
  const testName = 'MQTT Health Check';
  const start = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}/api/mqtt/reliable-sync/health`);
    const health = await response.json();

    const duration = Date.now() - start;
    const passed = health.service === 'MQTT Reliable Sync Service' && health.mqtt !== undefined;

    logTest(testName, passed ? '✓' : '⚠',
      `Status: ${health.status}, Queue: ${health.mqtt?.queuedMessages || 0}/${health.mqtt?.maxQueueSize || 0}`);

    return {
      name: testName,
      passed,
      duration,
      details: `Status: ${health.status}, Queue utilization: ${health.mqtt?.queueUtilization || 'N/A'}`
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
 * Test 7: Race Condition Detection
 */
async function testRaceConditionDetection(): Promise<TestResult> {
  const testName = 'Race Condition Detection (Create/Update/Delete)';
  const start = Date.now();
  
  try {
    const orgId = await ensureTestOrganization();
    const testVesselId = randomUUID();

    // Create test vessel
    await db.insert(vessels).values({
      id: testVesselId,
      orgId: orgId,
      name: 'Test Vessel',
      imo: `TEST${Date.now()}`,
      vesselType: 'cargo_ship',
      flag: 'US'
    } as any);

    // Create work order
    const [wo] = await db.insert(workOrders).values({
      vesselId: testVesselId,
      orgId: orgId,
      title: 'Race Test',
      description: 'Initial',
      priority: 'low',
      status: 'pending',
      createdBy: 'test-script'
    } as any).returning();

    // Race: concurrent update and delete
    const [updateResult, deleteResult] = await Promise.allSettled([
      db.update(workOrders)
        .set({ priority: 'critical' })
        .where(eq(workOrders.id, wo.id)),
      sleep(10).then(() =>
        db.delete(workOrders).where(eq(workOrders.id, wo.id))
      )
    ]);

    // Check final state
    const [final] = await db.select()
      .from(workOrders)
      .where(eq(workOrders.id, wo.id));

    // Cleanup
    if (final) {
      await db.delete(workOrders).where(eq(workOrders.id, wo.id));
    }
    await db.delete(vessels).where(eq(vessels.id, testVesselId));

    const duration = Date.now() - start;
    const passed = updateResult.status === 'fulfilled' && deleteResult.status === 'fulfilled';

    logTest(testName, passed ? '✓' : '✗',
      `Both operations completed (Update: ${updateResult.status}, Delete: ${deleteResult.status})`);

    return {
      name: testName,
      passed,
      duration,
      details: `Update: ${updateResult.status}, Delete: ${deleteResult.status}, Final state: ${final ? 'exists' : 'deleted'}`
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
 * Test 8: Stress Test - Rapid Fire Operations
 */
async function testStressRapidOperations(): Promise<TestResult> {
  const testName = 'Stress Test - Rapid Fire Operations';
  const start = Date.now();
  
  try {
    const orgId = await ensureTestOrganization();
    const operationCount = 100;
    
    // Mix of API calls
    const operations = Array.from({ length: operationCount }, (_, i) => {
      if (i % 3 === 0) {
        return fetch(`${BASE_URL}/api/vessels`);
      } else if (i % 3 === 1) {
        return fetch(`${BASE_URL}/api/equipment`);
      } else {
        return fetch(`${BASE_URL}/api/dashboard`);
      }
    });

    const results = await Promise.allSettled(operations);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    const duration = Date.now() - start;
    const throughput = (successful / duration) * 1000;
    const passed = successful >= operationCount * 0.85; // 85% success rate under stress

    logTest(testName, passed ? '✓' : '✗',
      `${successful}/${operationCount} ops in ${duration}ms (${throughput.toFixed(2)} ops/sec)`);

    return {
      name: testName,
      passed,
      duration,
      details: `Successful: ${successful}, Failed: ${failed}, Throughput: ${throughput.toFixed(2)} ops/sec`
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
 * Main test runner
 */
async function runAllTests() {
  console.log('\n🧪 ARUS Concurrency & Stress Test Suite');
  console.log(`Target: ${BASE_URL}`);
  console.log(`WebSocket: ${WS_URL}\n`);

  const allResults: TestResult[] = [];

  // Database Tests
  logSection('📊 DATABASE CONCURRENCY TESTS');
  allResults.push(await testDatabaseConcurrentInserts());
  allResults.push(await testDatabaseConcurrentUpdates());
  allResults.push(await testDatabaseTransactionRollback());

  // API Tests
  logSection('🌐 API CONCURRENCY TESTS');
  allResults.push(await testAPIConcurrentRequests());

  // WebSocket Tests
  logSection('🔌 WEBSOCKET TESTS');
  allResults.push(await testWebSocketConcurrentConnections());

  // MQTT Tests
  logSection('📡 MQTT TESTS');
  allResults.push(await testMQTTHealthCheck());

  // Integration Tests
  logSection('🔄 INTEGRATION & RACE CONDITION TESTS');
  allResults.push(await testRaceConditionDetection());

  // Stress Tests
  logSection('💥 STRESS TESTS');
  allResults.push(await testStressRapidOperations());

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

  // Cleanup test organization
  await cleanupTestOrganization();

  // Exit code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
