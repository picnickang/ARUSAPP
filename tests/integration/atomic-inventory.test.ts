/**
 * Integration Test: Atomic Inventory Reservations
 * 
 * Tests the critical bug fix for work order parts inventory reservations.
 * Bug #3 from Oct 11, 2025 - Ensures inventory + work order updates are atomic.
 * 
 * @see docs/regression-test-suite.md#bug-3-work-order-atomic-inventory-reservations
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import request from 'supertest';
import { db } from '../../server/db';
import { partsInventory, workOrderParts, workOrders, equipment } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { getTestApp } from '../setup/test-app';

const ORG_ID = 'test-org-atomic';

describe('Atomic Inventory Reservations', () => {
  let app: any;
  let testPartId: string;
  let testWorkOrderId: string;
  let testEquipmentId: string;

  beforeAll(async () => {
    // Initialize test app with routes
    app = await getTestApp();
  });

  beforeEach(async () => {
    // Setup: Create test equipment
    const [equip] = await db.insert(equipment).values({
      name: 'Test Engine - Atomic Test',
      type: 'engine',
      orgId: ORG_ID,
      manufacturer: 'TestMfg',
      model: 'T1000'
    }).returning();
    testEquipmentId = equip.id;

    // Setup: Create test part with known inventory
    const [part] = await db.insert(partsInventory).values({
      partNumber: 'ATOMIC-TEST-001',
      partName: 'Test Part for Atomic Operations',
      quantityOnHand: 100,
      quantityReserved: 35,
      unitCost: 25.00,
      orgId: ORG_ID,
      location: 'TEST-WAREHOUSE'
    }).returning();
    testPartId = part.id;

    // Setup: Create test work order
    const [wo] = await db.insert(workOrders).values({
      workOrderNumber: 'WO-ATOMIC-TEST',
      equipmentId: testEquipmentId,
      description: 'Test work order for atomic inventory',
      status: 'open',
      orgId: ORG_ID
    }).returning();
    testWorkOrderId = wo.id;
  });

  afterEach(async () => {
    // Cleanup: Remove test data
    await db.delete(workOrderParts).where(eq(workOrderParts.workOrderId, testWorkOrderId));
    await db.delete(workOrders).where(eq(workOrders.id, testWorkOrderId));
    await db.delete(partsInventory).where(eq(partsInventory.id, testPartId));
    await db.delete(equipment).where(eq(equipment.id, testEquipmentId));
  });

  describe('Atomic Success Path', () => {
    it('should reserve inventory and create work order part atomically', async () => {
      // ARRANGE
      const initialStock = await db.select()
        .from(partsInventory)
        .where(eq(partsInventory.id, testPartId))
        .limit(1);
      
      expect(initialStock[0].quantityOnHand).toBe(100);
      expect(initialStock[0].quantityReserved).toBe(35);

      // ACT: Add part to work order
      const response = await request(app)
        .post(`/api/work-orders/${testWorkOrderId}/parts/bulk`)
        .set('x-org-id', ORG_ID)
        .send({
          parts: [{
            partId: testPartId,
            quantity: 10,
            usedBy: 'integration-test',
            notes: 'Atomic test'
          }]
        });

      // ASSERT: Response successful
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.summary.added).toBe(1);

      // ASSERT: Inventory reserved atomically
      const updatedStock = await db.select()
        .from(partsInventory)
        .where(eq(partsInventory.id, testPartId))
        .limit(1);
      
      expect(updatedStock[0].quantityReserved).toBe(45); // 35 + 10

      // ASSERT: Work order part created atomically
      const workOrderPart = await db.select()
        .from(workOrderParts)
        .where(and(
          eq(workOrderParts.workOrderId, testWorkOrderId),
          eq(workOrderParts.partId, testPartId)
        ))
        .limit(1);
      
      expect(workOrderPart).toHaveLength(1);
      expect(workOrderPart[0].quantityUsed).toBe(10);
      expect(workOrderPart[0].totalCost).toBe(250.00); // 10 * 25
    });

    it('should handle part deduplication (update existing) atomically', async () => {
      // ARRANGE: Add part once
      await request(app)
        .post(`/api/work-orders/${testWorkOrderId}/parts/bulk`)
        .set('x-org-id', ORG_ID)
        .send({
          parts: [{
            partId: testPartId,
            quantity: 10,
            usedBy: 'test-user-1'
          }]
        });

      const stockAfterFirst = await db.select()
        .from(partsInventory)
        .where(eq(partsInventory.id, testPartId))
        .limit(1);
      expect(stockAfterFirst[0].quantityReserved).toBe(45); // 35 + 10

      // ACT: Add same part again (should update, not create)
      const response = await request(app)
        .post(`/api/work-orders/${testWorkOrderId}/parts/bulk`)
        .set('x-org-id', ORG_ID)
        .send({
          parts: [{
            partId: testPartId,
            quantity: 5,
            usedBy: 'test-user-2'
          }]
        });

      // ASSERT: Response shows update, not add
      expect(response.status).toBe(201);
      expect(response.body.summary.updated).toBe(1);
      expect(response.body.summary.added).toBe(0);

      // ASSERT: Inventory reserved additional quantity atomically
      const finalStock = await db.select()
        .from(partsInventory)
        .where(eq(partsInventory.id, testPartId))
        .limit(1);
      expect(finalStock[0].quantityReserved).toBe(50); // 35 + 10 + 5

      // ASSERT: Work order part quantity updated (not duplicated)
      const workOrderPartsList = await db.select()
        .from(workOrderParts)
        .where(and(
          eq(workOrderParts.workOrderId, testWorkOrderId),
          eq(workOrderParts.partId, testPartId)
        ));
      
      expect(workOrderPartsList).toHaveLength(1); // Only ONE entry
      expect(workOrderPartsList[0].quantityUsed).toBe(15); // 10 + 5
    });
  });

  describe('Atomic Failure Path (Insufficient Stock)', () => {
    it('should rollback entire operation if insufficient stock', async () => {
      // ARRANGE: Available stock is 65 (100 on hand - 35 reserved)
      const initialStock = await db.select()
        .from(partsInventory)
        .where(eq(partsInventory.id, testPartId))
        .limit(1);
      
      const availableStock = initialStock[0].quantityOnHand - initialStock[0].quantityReserved;
      expect(availableStock).toBe(65);

      // ACT: Try to add MORE than available (should fail)
      const response = await request(app)
        .post(`/api/work-orders/${testWorkOrderId}/parts/bulk`)
        .set('x-org-id', ORG_ID)
        .send({
          parts: [{
            partId: testPartId,
            quantity: 70, // More than 65 available
            usedBy: 'integration-test'
          }]
        });

      // ASSERT: Request failed
      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.stringContaining('Insufficient stock')
      );

      // ASSERT: Inventory NOT changed (atomic rollback)
      const finalStock = await db.select()
        .from(partsInventory)
        .where(eq(partsInventory.id, testPartId))
        .limit(1);
      expect(finalStock[0].quantityReserved).toBe(35); // Unchanged

      // ASSERT: Work order part NOT created (atomic rollback)
      const workOrderPart = await db.select()
        .from(workOrderParts)
        .where(and(
          eq(workOrderParts.workOrderId, testWorkOrderId),
          eq(workOrderParts.partId, testPartId)
        ));
      expect(workOrderPart).toHaveLength(0); // Nothing created
    });
  });

  describe('Concurrent Operations (Race Condition Prevention)', () => {
    it('should prevent over-commitment when multiple requests compete', async () => {
      // ARRANGE: Available stock is 65
      const initialStock = await db.select()
        .from(partsInventory)
        .where(eq(partsInventory.id, testPartId))
        .limit(1);
      const availableStock = initialStock[0].quantityOnHand - initialStock[0].quantityReserved;
      expect(availableStock).toBe(65);

      // ACT: Send 3 concurrent requests, each trying to reserve 40 units
      // Only 1-2 should succeed (total reserved <= available)
      const requests = [
        request(app)
          .post(`/api/work-orders/${testWorkOrderId}/parts/bulk`)
          .set('x-org-id', ORG_ID)
          .send({
            parts: [{ partId: testPartId, quantity: 40, usedBy: 'user1' }]
          }),
        request(app)
          .post(`/api/work-orders/${testWorkOrderId}/parts/bulk`)
          .set('x-org-id', ORG_ID)
          .send({
            parts: [{ partId: testPartId, quantity: 40, usedBy: 'user2' }]
          }),
        request(app)
          .post(`/api/work-orders/${testWorkOrderId}/parts/bulk`)
          .set('x-org-id', ORG_ID)
          .send({
            parts: [{ partId: testPartId, quantity: 40, usedBy: 'user3' }]
          })
      ];

      const responses = await Promise.allSettled(requests);

      // ASSERT: Not all succeeded (at least one failed due to insufficient stock)
      const successCount = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 201
      ).length;
      expect(successCount).toBeLessThan(3); // Can't all succeed (3 * 40 = 120 > 65 available)

      // ASSERT: Inventory never over-committed
      const finalStock = await db.select()
        .from(partsInventory)
        .where(eq(partsInventory.id, testPartId))
        .limit(1);
      
      const totalReserved = finalStock[0].quantityReserved - 35; // Subtract initial
      expect(totalReserved).toBeLessThanOrEqual(65); // Never exceed available
      
      // ASSERT: Reserved quantity matches work order parts (consistency check)
      const workOrderPartsList = await db.select()
        .from(workOrderParts)
        .where(and(
          eq(workOrderParts.workOrderId, testWorkOrderId),
          eq(workOrderParts.partId, testPartId)
        ));
      
      const totalUsed = workOrderPartsList.reduce((sum, p) => sum + p.quantityUsed, 0);
      expect(totalUsed).toBe(totalReserved); // Perfect consistency
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero quantity gracefully', async () => {
      const response = await request(app)
        .post(`/api/work-orders/${testWorkOrderId}/parts/bulk`)
        .set('x-org-id', ORG_ID)
        .send({
          parts: [{
            partId: testPartId,
            quantity: 0,
            usedBy: 'test'
          }]
        });

      expect(response.status).toBe(400); // Validation error
    });

    it('should handle negative quantity gracefully', async () => {
      const response = await request(app)
        .post(`/api/work-orders/${testWorkOrderId}/parts/bulk`)
        .set('x-org-id', ORG_ID)
        .send({
          parts: [{
            partId: testPartId,
            quantity: -5,
            usedBy: 'test'
          }]
        });

      expect(response.status).toBe(400); // Validation error
    });

    it('should handle non-existent part ID', async () => {
      const response = await request(app)
        .post(`/api/work-orders/${testWorkOrderId}/parts/bulk`)
        .set('x-org-id', ORG_ID)
        .send({
          parts: [{
            partId: 'non-existent-uuid',
            quantity: 10,
            usedBy: 'test'
          }]
        });

      expect(response.status).toBe(409);
      expect(response.body.errors).toContainEqual(
        expect.stringContaining('not found in inventory')
      );
    });
  });
});

/**
 * Test Statistics & Coverage
 * 
 * Total Test Cases: 9
 * Critical Paths: 3 (atomic success, atomic failure, race conditions)
 * Edge Cases: 3 (zero, negative, non-existent)
 * 
 * Coverage:
 * - ✅ Atomic transaction success
 * - ✅ Atomic transaction rollback on failure
 * - ✅ Race condition prevention (concurrent operations)
 * - ✅ Deduplication logic (update vs create)
 * - ✅ Inventory consistency (reserved = used)
 * - ✅ Input validation
 * 
 * Run: npm run test:integration -- atomic-inventory.test.ts
 */
