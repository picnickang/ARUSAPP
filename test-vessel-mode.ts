/**
 * Test script for vessel mode SQLite initialization
 */
import { initializeSqliteDatabase, isSqliteDatabaseInitialized } from './server/sqlite-init';
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { sql } from "drizzle-orm";
import * as schemaSqliteSync from './shared/schema-sqlite-sync';
import path from "path";

async function testVesselMode() {
  console.log('🧪 Testing Vessel Mode SQLite Implementation\n');
  
  // Step 1: Initialize database
  console.log('Step 1: Initializing SQLite database...');
  const isInit = await isSqliteDatabaseInitialized();
  console.log(`  Database initialized: ${isInit}`);
  
  if (!isInit) {
    await initializeSqliteDatabase();
    console.log('  ✓ Database initialized successfully\n');
  } else {
    console.log('  ✓ Database already initialized\n');
  }
  
  // Step 2: Connect to database
  console.log('Step 2: Connecting to SQLite database...');
  const dbPath = path.join(process.cwd(), "data", "vessel-local.db");
  const client = createClient({ url: `file:${dbPath}` });
  const db = drizzle(client, { schema: schemaSqliteSync });
  console.log(`  ✓ Connected to ${dbPath}\n`);
  
  // Step 3: Verify tables exist
  console.log('Step 3: Verifying table structure...');
  const tables = await db.get(sql`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    ORDER BY name
  `);
  console.log('  Tables found:', tables);
  
  // Step 4: Test organizations table with decimal multiplier
  console.log('\nStep 4: Testing organizations table...');
  try {
    // Insert test organization
    const testOrg = {
      id: 'test-vessel-org-001',
      name: 'Test Vessel Organization',
      slug: 'test-vessel',
      subscriptionTier: 'basic',
      isActive: true,
      emergencyLaborMultiplier: 3,
      emergencyPartsMultiplier: 1.5, // Critical: decimal value
      emergencyDowntimeMultiplier: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await db.insert(schemaSqliteSync.organizationsSqlite).values(testOrg);
    console.log('  ✓ Inserted test organization');
    
    // Read back and verify decimal precision
    const readOrg = await db.select()
      .from(schemaSqliteSync.organizationsSqlite)
      .where(sql`id = 'test-vessel-org-001'`)
      .limit(1);
    
    if (readOrg.length > 0) {
      console.log(`  ✓ Retrieved organization: ${readOrg[0].name}`);
      console.log(`  ✓ emergencyPartsMultiplier: ${readOrg[0].emergencyPartsMultiplier}`);
      
      if (readOrg[0].emergencyPartsMultiplier === 1.5) {
        console.log('  ✅ Decimal precision CORRECT (1.5 preserved)');
      } else {
        console.error(`  ❌ Decimal precision ERROR (got ${readOrg[0].emergencyPartsMultiplier}, expected 1.5)`);
      }
    }
    
    // Cleanup
    await db.delete(schemaSqliteSync.organizationsSqlite)
      .where(sql`id = 'test-vessel-org-001'`);
    console.log('  ✓ Cleanup completed');
    
  } catch (error) {
    console.error('  ❌ Error testing organizations table:', error);
  }
  
  // Step 5: Test sync_journal table
  console.log('\nStep 5: Testing sync_journal table...');
  try {
    const testEvent = {
      id: 'test-sync-event-001',
      entityType: 'test',
      entityId: 'test-001',
      operation: 'test_operation',
      payload: schemaSqliteSync.sqliteJsonHelpers.stringify({ test: 'data', value: 123 }),
      syncStatus: 'pending',
      createdAt: new Date(),
    };
    
    await db.insert(schemaSqliteSync.syncJournalSqlite).values(testEvent);
    console.log('  ✓ Inserted sync journal event');
    
    const readEvent = await db.select()
      .from(schemaSqliteSync.syncJournalSqlite)
      .where(sql`id = 'test-sync-event-001'`)
      .limit(1);
    
    if (readEvent.length > 0) {
      const parsedPayload = schemaSqliteSync.sqliteJsonHelpers.parse(readEvent[0].payload);
      console.log(`  ✓ Retrieved event, payload:`, parsedPayload);
      
      if (parsedPayload?.test === 'data' && parsedPayload?.value === 123) {
        console.log('  ✅ JSON serialization CORRECT');
      } else {
        console.error('  ❌ JSON serialization ERROR');
      }
    }
    
    // Cleanup
    await db.delete(schemaSqliteSync.syncJournalSqlite)
      .where(sql`id = 'test-sync-event-001'`);
    console.log('  ✓ Cleanup completed');
    
  } catch (error) {
    console.error('  ❌ Error testing sync_journal table:', error);
  }
  
  console.log('\n✅ Vessel Mode Test Complete!\n');
}

testVesselMode().catch(console.error);
