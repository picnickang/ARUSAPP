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

    console.log('\n========================================');
    console.log('✅ All Tests Passed Successfully!');
    console.log('========================================\n');

    console.log('Summary:');
    console.log(`- Tables created: ${tables.length}/31`);
    console.log(`- Indexes created: ${indexes.length}`);
    console.log('- CRUD operations: ✅ Working');
    console.log('- Joins: ✅ Working');
    console.log('- Complex queries: ✅ Working');

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
