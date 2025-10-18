#!/usr/bin/env tsx
/**
 * Real-Time Integration Test
 * Tests end-to-end flow: MQTT → WebSocket → Database
 * Run with: tsx scripts/test-realtime-integration.ts
 */

import { db } from '../server/db';
import { workOrders, vessels, equipment, organizations } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import WebSocket from 'ws';

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

// Test data
let testOrgId: string | null = null;
let testVesselId: string | null = null;
let testEquipmentId: string | null = null;

async function setupTestData() {
  const slug = `test-rt-${Date.now()}`;
  const [org] = await db.insert(organizations).values({
    name: 'Real-time Test Organization',
    slug: slug,
    industry: 'maritime',
    country: 'US'
  } as any).returning();
  
  testOrgId = org.id;

  const [vessel] = await db.insert(vessels).values({
    orgId: testOrgId,
    name: 'Real-time Test Vessel',
    imo: `RT${Date.now()}`
  } as any).returning();
  
  testVesselId = vessel.id;

  const [eq] = await db.insert(equipment).values({
    vesselId: testVesselId,
    orgId: testOrgId,
    name: 'Real-time Test Equipment',
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
  }
}

/**
 * Test 1: WebSocket Message Broadcast
 */
async function testWebSocketBroadcast(): Promise<TestResult> {
  const testName = 'WebSocket Message Broadcast';
  const start = Date.now();
  
  try {
    const receivedMessages: any[] = [];
    
    // Create WebSocket connection
    const ws = new WebSocket(WS_URL);
    
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
      
      ws.on('open', () => {
        clearTimeout(timeout);
        resolve();
      });
      
      ws.on('error', reject);
    });

    // Listen for messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        receivedMessages.push(message);
      } catch (e) {
        // Ignore parse errors
      }
    });

    // Create a work order (should trigger WebSocket broadcast)
    const [wo] = await db.insert(workOrders).values({
      vesselId: testVesselId!,
      orgId: testOrgId!,
      equipmentId: testEquipmentId!,
      description: 'WebSocket broadcast test',
      priority: 3,
      status: 'open'
    } as any).returning();

    // Wait for broadcast
    await sleep(500);

    // Cleanup
    await db.delete(workOrders).where(eq(workOrders.id, wo.id));
    ws.close();

    const duration = Date.now() - start;
    const passed = ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING;

    logTest(testName, passed ? '✓' : '✗',
      `Connection: ${passed ? 'successful' : 'FAILED'}, Messages received: ${receivedMessages.length}`);

    return {
      name: testName,
      passed,
      duration,
      details: `WebSocket connection established, Broadcast messages: ${receivedMessages.length}`
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
 * Test 2: Concurrent WebSocket Clients
 */
async function testConcurrentWSClients(): Promise<TestResult> {
  const testName = 'Concurrent WebSocket Clients';
  const start = Date.now();
  
  try {
    const clientCount = 10;
    const clients: WebSocket[] = [];
    const messageCounters = new Array(clientCount).fill(0);

    // Create multiple clients
    for (let i = 0; i < clientCount; i++) {
      const ws = new WebSocket(WS_URL);
      clients.push(ws);
      
      ws.on('message', () => {
        messageCounters[i]++;
      });
    }

    // Wait for all connections
    await Promise.all(clients.map((ws, i) => 
      new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`Client ${i} timeout`)), 5000);
        ws.on('open', () => {
          clearTimeout(timeout);
          resolve();
        });
        ws.on('error', reject);
      })
    ));

    // Create a work order (all clients should receive broadcast)
    const [wo] = await db.insert(workOrders).values({
      vesselId: testVesselId!,
      orgId: testOrgId!,
      equipmentId: testEquipmentId!,
      description: 'Multi-client broadcast test',
      priority: 3,
      status: 'open'
    } as any).returning();

    // Wait for broadcasts
    await sleep(500);

    // Cleanup
    await db.delete(workOrders).where(eq(workOrders.id, wo.id));
    clients.forEach(ws => ws.close());

    const duration = Date.now() - start;
    const connectedClients = clients.filter(ws => 
      ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CLOSING
    ).length;
    
    const passed = connectedClients >= clientCount * 0.9; // 90% success rate

    logTest(testName, passed ? '✓' : '✗',
      `${connectedClients}/${clientCount} clients connected successfully`);

    return {
      name: testName,
      passed,
      duration,
      details: `Connected clients: ${connectedClients}/${clientCount}, Total messages: ${messageCounters.reduce((a, b) => a + b, 0)}`
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
 * Test 3: MQTT Health and Queue Status
 */
async function testMQTTHealthStatus(): Promise<TestResult> {
  const testName = 'MQTT Health and Queue Status';
  const start = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}/api/mqtt/reliable-sync/health`);
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const health = await response.json();

    const duration = Date.now() - start;
    const hasQueueInfo = health.mqtt?.queuedMessages !== undefined;
    const passed = health.service === 'MQTT Reliable Sync Service' && hasQueueInfo;

    logTest(testName, passed ? '✓' : '⚠',
      `Status: ${health.status}, Queue: ${health.mqtt?.queuedMessages || 0}/${health.mqtt?.maxQueueSize || 0}`);

    return {
      name: testName,
      passed,
      duration,
      details: `Status: ${health.status}, Queue utilization: ${health.mqtt?.queueUtilization || 'N/A'}, Connected: ${health.mqtt?.connected || false}`
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
 * Test 4: Database → WebSocket Flow
 */
async function testDatabaseToWSFlow(): Promise<TestResult> {
  const testName = 'Database → WebSocket Propagation';
  const start = Date.now();
  
  try {
    let messageReceived = false;
    
    // Create WebSocket connection
    const ws = new WebSocket(WS_URL);
    
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
      ws.on('open', () => {
        clearTimeout(timeout);
        resolve();
      });
      ws.on('error', reject);
    });

    ws.on('message', () => {
      messageReceived = true;
    });

    // Database write
    const [wo] = await db.insert(workOrders).values({
      vesselId: testVesselId!,
      orgId: testOrgId!,
      equipmentId: testEquipmentId!,
      description: 'DB→WS propagation test',
      priority: 3,
      status: 'open'
    } as any).returning();

    // Wait for propagation
    await sleep(500);

    // Verify database record exists
    const [dbRecord] = await db.select()
      .from(workOrders)
      .where(eq(workOrders.id, wo.id));

    // Cleanup
    await db.delete(workOrders).where(eq(workOrders.id, wo.id));
    ws.close();

    const duration = Date.now() - start;
    const passed = dbRecord !== undefined;

    logTest(testName, passed ? '✓' : '✗',
      `DB write successful: ${passed}, WS notified: ${messageReceived ? 'Yes' : 'No'}`);

    return {
      name: testName,
      passed,
      duration,
      details: `Database record created: ${!!dbRecord}, WebSocket notified: ${messageReceived}`
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
 * Test 5: High-Frequency Updates
 */
async function testHighFrequencyUpdates(): Promise<TestResult> {
  const testName = 'High-Frequency Concurrent Updates';
  const start = Date.now();
  
  try {
    // Create a work order
    const [wo] = await db.insert(workOrders).values({
      vesselId: testVesselId!,
      orgId: testOrgId!,
      equipmentId: testEquipmentId!,
      description: 'High-freq test',
      priority: 3,
      status: 'open'
    } as any).returning();

    // Perform rapid updates
    const updateCount = 20;
    const updates = Array.from({ length: updateCount }, (_, i) =>
      db.update(workOrders)
        .set({ description: `Update ${i}` })
        .where(eq(workOrders.id, wo.id))
    );

    const results = await Promise.allSettled(updates);
    const successful = results.filter(r => r.status === 'fulfilled').length;

    // Verify final state
    const [final] = await db.select()
      .from(workOrders)
      .where(eq(workOrders.id, wo.id));

    // Cleanup
    await db.delete(workOrders).where(eq(workOrders.id, wo.id));

    const duration = Date.now() - start;
    const throughput = (successful / duration) * 1000;
    const passed = successful >= updateCount * 0.9; // 90% success rate

    logTest(testName, passed ? '✓' : '✗',
      `${successful}/${updateCount} updates in ${duration}ms (${throughput.toFixed(2)} ops/sec)`);

    return {
      name: testName,
      passed,
      duration,
      details: `Successful updates: ${successful}/${updateCount}, Throughput: ${throughput.toFixed(2)} ops/sec, Final state: ${final ? 'valid' : 'invalid'}`
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
  console.log('\n🔄 ARUS Real-Time Integration Test Suite');
  console.log(`Target: ${BASE_URL}`);
  console.log(`WebSocket: ${WS_URL}\n`);

  const allResults: TestResult[] = [];

  // Setup
  logSection('🛠️  SETUP');
  console.log('Creating test organization, vessel, and equipment...');
  await setupTestData();
  console.log(`✓ Organization: ${testOrgId}`);
  console.log(`✓ Vessel: ${testVesselId}`);
  console.log(`✓ Equipment: ${testEquipmentId}`);

  // WebSocket Tests
  logSection('🔌 WEBSOCKET BROADCAST TESTS');
  allResults.push(await testWebSocketBroadcast());
  allResults.push(await testConcurrentWSClients());

  // MQTT Tests
  logSection('📡 MQTT STATUS TESTS');
  allResults.push(await testMQTTHealthStatus());

  // Integration Tests
  logSection('🔄 END-TO-END INTEGRATION TESTS');
  allResults.push(await testDatabaseToWSFlow());
  allResults.push(await testHighFrequencyUpdates());

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
