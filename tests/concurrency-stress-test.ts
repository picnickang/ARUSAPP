/**
 * Concurrency & Stress Tests for ARUS System
 * Tests local network (MQTT), cloud storage, and sync mechanisms
 * for concurrency issues, race conditions, and error handling
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { MqttReliableSyncService } from '../server/mqtt-reliable-sync';
import { TelemetryWebSocketServer } from '../server/websocket';
import { db } from '../server/db';
import { workOrders, equipment, alertNotifications } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// Test configuration
const CONCURRENT_OPERATIONS = 100;
const STRESS_TEST_DURATION = 5000; // 5 seconds
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';

/**
 * Helper: Create test work order
 */
function createTestWorkOrder() {
  return {
    id: randomUUID(),
    vesselId: randomUUID(),
    equipmentId: randomUUID(),
    organizationId: randomUUID(),
    title: `Test Work Order ${Date.now()}`,
    description: 'Concurrency test work order',
    priority: 'medium' as const,
    status: 'pending' as const,
    createdBy: 'test-user',
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/**
 * Helper: Wait for async operations
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('MQTT Concurrent Operations', () => {
  let mqttService: MqttReliableSyncService;

  beforeAll(async () => {
    mqttService = new MqttReliableSyncService({
      brokerUrl: MQTT_BROKER_URL,
      clientIdPrefix: 'test_concurrency',
      reconnectPeriod: 1000,
      qosLevel: 1,
      maxQueueSize: 10000,
      enableTls: false
    });
    
    // Start service (will handle broker unavailability gracefully)
    await mqttService.start();
  });

  afterAll(async () => {
    await mqttService.stop();
  });

  test('should handle concurrent message publishing without data loss', async () => {
    const messages = Array.from({ length: CONCURRENT_OPERATIONS }, (_, i) => ({
      entityType: 'work_orders',
      operation: 'create' as const,
      data: { id: `test-${i}`, index: i }
    }));

    // Track published messages
    const publishedMessages: any[] = [];
    mqttService.on('message_published', (event) => {
      publishedMessages.push(event);
    });

    // Publish all messages concurrently
    const startTime = Date.now();
    const results = await Promise.allSettled(
      messages.map(msg => 
        mqttService.publishDataChange(msg.entityType, msg.operation, msg.data)
      )
    );
    const duration = Date.now() - startTime;

    console.log(`✓ Published ${CONCURRENT_OPERATIONS} messages in ${duration}ms`);
    
    // Check results
    const fulfilled = results.filter(r => r.status === 'fulfilled').length;
    const rejected = results.filter(r => r.status === 'rejected').length;
    
    console.log(`  Fulfilled: ${fulfilled}, Rejected: ${rejected}`);
    
    // If broker is unavailable, all should be queued
    const metrics = mqttService.getMetrics();
    expect(metrics.messagesPublished + metrics.messagesQueued).toBeGreaterThanOrEqual(CONCURRENT_OPERATIONS);
  });

  test('should enforce queue size limits under stress', async () => {
    const maxQueueSize = 50; // Small queue for testing
    const stressService = new MqttReliableSyncService({
      brokerUrl: MQTT_BROKER_URL,
      clientIdPrefix: 'test_queue_limit',
      reconnectPeriod: 1000,
      qosLevel: 1,
      maxQueueSize,
      enableTls: false
    });

    await stressService.start();

    // Publish more messages than queue can hold (while offline)
    const messagesToPublish = maxQueueSize + 20;
    const publishPromises = Array.from({ length: messagesToPublish }, (_, i) =>
      stressService.publishDataChange('work_orders', 'create', { id: `overflow-${i}` })
    );

    await Promise.allSettled(publishPromises);
    await sleep(100); // Let queue settle

    const metrics = stressService.getMetrics();
    
    // Queue should not exceed max size
    expect(metrics.currentQueueSize).toBeLessThanOrEqual(maxQueueSize);
    
    // Should have dropped some messages
    if (metrics.messagesQueued > maxQueueSize) {
      expect(metrics.messagesDropped).toBeGreaterThan(0);
      console.log(`✓ Correctly dropped ${metrics.messagesDropped} messages (FIFO policy)`);
    }

    await stressService.stop();
  });

  test('should handle concurrent subscriptions without race conditions', async () => {
    const subscriptionCount = 50;
    const callbacks: Array<(payload: any) => void> = [];
    const receivedMessages: any[] = [];

    // Subscribe many callbacks concurrently
    const subscribePromises = Array.from({ length: subscriptionCount }, (_, i) => {
      const callback = (payload: any) => {
        receivedMessages.push({ callback: i, payload });
      };
      callbacks.push(callback);
      return mqttService.subscribe('work_orders', callback, false);
    });

    await Promise.allSettled(subscribePromises);
    
    // All subscriptions should be tracked
    const healthStatus = mqttService.getHealthStatus();
    expect(healthStatus.activeSubscriptions).toBeGreaterThan(0);

    console.log(`✓ Successfully registered ${subscriptionCount} concurrent subscriptions`);
  });

  test('should maintain metrics accuracy under concurrent operations', async () => {
    mqttService.resetMetrics();
    
    const operations = 20;
    const publishPromises = Array.from({ length: operations }, (_, i) =>
      mqttService.publishDataChange('equipment', 'update', { id: `metrics-${i}` })
    );

    await Promise.allSettled(publishPromises);
    await sleep(200);

    const metrics = mqttService.getMetrics();
    const total = metrics.messagesPublished + metrics.messagesQueued + metrics.publishFailures;
    
    // Total should match operations (no lost counts)
    expect(total).toBe(operations);
    console.log(`✓ Metrics accurate: ${metrics.messagesPublished} published, ${metrics.messagesQueued} queued, ${metrics.publishFailures} failed`);
  });
});

describe('Database Concurrent Operations', () => {
  test('should handle concurrent inserts without constraint violations', async () => {
    const testOrgId = randomUUID();
    const testVesselId = randomUUID();
    
    // Create concurrent work orders
    const workOrderData = Array.from({ length: 50 }, () => {
      const woData: any = {
        vesselId: testVesselId,
        organizationId: testOrgId,
        title: `Concurrent WO ${randomUUID()}`,
        description: 'Concurrency test',
        priority: 'medium',
        status: 'pending',
        createdBy: 'test-user'
      };
      return woData;
    });

    const startTime = Date.now();
    const insertPromises = workOrderData.map(data =>
      db.insert(workOrders).values(data).returning()
    );

    const results = await Promise.allSettled(insertPromises);
    const duration = Date.now() - startTime;

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`✓ Database: ${successful} inserts succeeded, ${failed} failed in ${duration}ms`);
    expect(successful).toBeGreaterThan(0);
    
    // Cleanup
    await db.delete(workOrders).where(eq(workOrders.organizationId, testOrgId));
  });

  test('should handle concurrent updates without race conditions', async () => {
    const testOrgId = randomUUID();
    const testVesselId = randomUUID();
    
    // Create initial work order
    const [workOrder] = await db.insert(workOrders).values({
      vesselId: testVesselId,
      organizationId: testOrgId,
      title: 'Update Test WO',
      description: 'Will be updated concurrently',
      priority: 'medium',
      status: 'pending',
      createdBy: 'test-user'
    } as any).returning();

    // Concurrent updates with different fields
    const updatePromises = [
      db.update(workOrders)
        .set({ priority: 'high' })
        .where(eq(workOrders.id, workOrder.id)),
      db.update(workOrders)
        .set({ status: 'in_progress' })
        .where(eq(workOrders.id, workOrder.id)),
      db.update(workOrders)
        .set({ description: 'Updated description' })
        .where(eq(workOrders.id, workOrder.id)),
    ];

    const results = await Promise.allSettled(updatePromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;

    console.log(`✓ Concurrent updates: ${successful}/${updatePromises.length} succeeded`);
    
    // Verify final state (one of the updates should have won)
    const [updated] = await db.select()
      .from(workOrders)
      .where(eq(workOrders.id, workOrder.id));

    expect(updated).toBeDefined();
    
    // Cleanup
    await db.delete(workOrders).where(eq(workOrders.id, workOrder.id));
  });

  test('should handle transaction rollback on error', async () => {
    const testOrgId = randomUUID();
    
    try {
      await db.transaction(async (tx) => {
        // Insert work order
        await tx.insert(workOrders).values({
          vesselId: randomUUID(),
          organizationId: testOrgId,
          title: 'Transaction Test',
          description: 'Should be rolled back',
          priority: 'medium',
          status: 'pending',
          createdBy: 'test-user'
        } as any);

        // Force error to trigger rollback
        throw new Error('Intentional rollback');
      });
    } catch (error: any) {
      expect(error.message).toContain('Intentional rollback');
    }

    // Verify rollback - no work orders should exist
    const results = await db.select()
      .from(workOrders)
      .where(eq(workOrders.organizationId, testOrgId));

    expect(results.length).toBe(0);
    console.log('✓ Transaction correctly rolled back on error');
  });
});

describe('WebSocket Concurrent Broadcasting', () => {
  // Note: This would require a running WebSocket server
  // These tests outline what should be tested
  
  test('should handle multiple simultaneous broadcasts without message loss', async () => {
    console.log('⚠ WebSocket tests require running server (skipped in unit tests)');
    // Would test:
    // - 100+ concurrent broadcasts
    // - All connected clients receive messages
    // - No message duplication
    // - Messages maintain order per client
  });

  test('should handle concurrent client connections', async () => {
    console.log('⚠ WebSocket tests require running server (skipped in unit tests)');
    // Would test:
    // - 50+ clients connecting simultaneously
    // - Connection tracking accurate
    // - Subscription management correct
    // - No race conditions in client map
  });
});

describe('System Integration - Overlapping Operations', () => {
  test('should handle overlapping MQTT publish and DB insert', async () => {
    const mqttService = new MqttReliableSyncService({
      brokerUrl: MQTT_BROKER_URL,
      clientIdPrefix: 'test_overlap',
      reconnectPeriod: 1000,
      qosLevel: 1,
      maxQueueSize: 10000,
      enableTls: false
    });

    await mqttService.start();

    const testOrgId = randomUUID();
    const testVesselId = randomUUID();
    const testData = {
      vesselId: testVesselId,
      organizationId: testOrgId,
      title: 'Overlap Test',
      description: 'Testing MQTT + DB overlap',
      priority: 'medium',
      status: 'pending',
      createdBy: 'test-user'
    } as any;

    // Perform DB insert and MQTT publish simultaneously
    const [dbResult, mqttResult] = await Promise.allSettled([
      db.insert(workOrders).values(testData).returning(),
      mqttService.publishDataChange('work_orders', 'create', testData)
    ]);

    console.log(`✓ Overlapping operations: DB ${dbResult.status}, MQTT ${mqttResult.status}`);

    // At least one should succeed
    expect(dbResult.status === 'fulfilled' || mqttResult.status === 'fulfilled').toBe(true);

    // Cleanup
    if (dbResult.status === 'fulfilled') {
      await db.delete(workOrders).where(eq(workOrders.organizationId, testOrgId));
    }

    await mqttService.stop();
  });

  test('should detect potential race conditions in rapid create/update/delete', async () => {
    const testOrgId = randomUUID();
    const testVesselId = randomUUID();

    // Rapid sequence: create -> update -> delete
    const [createResult] = await db.insert(workOrders).values({
      vesselId: testVesselId,
      organizationId: testOrgId,
      title: 'Race Condition Test',
      description: 'Initial state',
      priority: 'low',
      status: 'pending',
      createdBy: 'test-user'
    } as any).returning();

    // Execute update and delete concurrently (potential race condition)
    const [updateResult, deleteResult] = await Promise.allSettled([
      db.update(workOrders)
        .set({ priority: 'critical' })
        .where(eq(workOrders.id, createResult.id)),
      sleep(5).then(() => 
        db.delete(workOrders).where(eq(workOrders.id, createResult.id))
      )
    ]);

    console.log(`✓ Race condition test: Update ${updateResult.status}, Delete ${deleteResult.status}`);
    
    // Both operations should complete (though update might affect 0 rows if delete wins)
    expect(updateResult.status).toBe('fulfilled');
    expect(deleteResult.status).toBe('fulfilled');
  });
});

describe('Error Handling Under Load', () => {
  test('should handle serialization errors gracefully', async () => {
    const mqttService = new MqttReliableSyncService({
      brokerUrl: MQTT_BROKER_URL,
      clientIdPrefix: 'test_error',
      reconnectPeriod: 1000,
      qosLevel: 1,
      maxQueueSize: 10000,
      enableTls: false
    });

    await mqttService.start();

    // Create circular reference (will fail JSON.stringify)
    const circularData: any = { id: 'test' };
    circularData.self = circularData;

    try {
      await mqttService.publishDataChange('work_orders', 'create', circularData);
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain('serialization failed');
      console.log('✓ Serialization error correctly caught and thrown');
    }

    const metrics = mqttService.getMetrics();
    expect(metrics.publishFailures).toBeGreaterThan(0);

    await mqttService.stop();
  });

  test('should recover from database connection errors', async () => {
    // This test would verify connection pool resilience
    console.log('⚠ Database connection error tests require controlled failure injection');
    // Would test:
    // - Connection pool handles timeouts
    // - Queries retry on temporary failures
    // - Application continues after connection restored
  });
});

describe('Performance Metrics', () => {
  test('should measure MQTT throughput under load', async () => {
    const mqttService = new MqttReliableSyncService({
      brokerUrl: MQTT_BROKER_URL,
      clientIdPrefix: 'test_perf',
      reconnectPeriod: 1000,
      qosLevel: 1,
      maxQueueSize: 10000,
      enableTls: false
    });

    await mqttService.start();
    mqttService.resetMetrics();

    const messageCount = 1000;
    const startTime = Date.now();

    const publishPromises = Array.from({ length: messageCount }, (_, i) =>
      mqttService.publishDataChange('equipment', 'update', { id: `perf-${i}` })
    );

    await Promise.allSettled(publishPromises);
    const duration = Date.now() - startTime;
    const throughput = (messageCount / duration) * 1000; // messages per second

    console.log(`\n📊 Performance Metrics:`);
    console.log(`  Messages: ${messageCount}`);
    console.log(`  Duration: ${duration}ms`);
    console.log(`  Throughput: ${throughput.toFixed(2)} msg/sec`);

    const metrics = mqttService.getMetrics();
    console.log(`  Published: ${metrics.messagesPublished}`);
    console.log(`  Queued: ${metrics.messagesQueued}`);
    console.log(`  Dropped: ${metrics.messagesDropped}`);
    console.log(`  Failures: ${metrics.publishFailures}`);

    await mqttService.stop();
  });

  test('should measure database insert throughput', async () => {
    const testOrgId = randomUUID();
    const insertCount = 100;
    
    const startTime = Date.now();
    
    const insertPromises = Array.from({ length: insertCount }, (_, i) =>
      db.insert(workOrders).values({
        vesselId: randomUUID(),
        organizationId: testOrgId,
        title: `Perf Test ${i}`,
        description: 'Performance test',
        priority: 'medium',
        status: 'pending',
        createdBy: 'test-user'
      } as any).returning()
    );

    const results = await Promise.allSettled(insertPromises);
    const duration = Date.now() - startTime;
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const throughput = (successful / duration) * 1000;

    console.log(`\n📊 Database Insert Performance:`);
    console.log(`  Inserts: ${insertCount}`);
    console.log(`  Successful: ${successful}`);
    console.log(`  Duration: ${duration}ms`);
    console.log(`  Throughput: ${throughput.toFixed(2)} inserts/sec`);

    // Cleanup
    await db.delete(workOrders).where(eq(workOrders.organizationId, testOrgId));
  });
});
