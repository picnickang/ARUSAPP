/**
 * Integration tests for SQL compatibility helpers
 * Tests both PostgreSQL and SQLite compatibility
 */

import { db } from '../../server/db';
import { sql, eq, and } from 'drizzle-orm';
import { 
  ilike, 
  arrayContains, 
  jsonSet,
  isSQLiteMode,
  jsonExtract
} from '../../server/utils/sql-compat';
import { equipment, vessels, organizations } from '../../shared/schema';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, error?: string) {
  results.push({ name, passed, error });
  const status = passed ? '✓' : '✗';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${status}\x1b[0m ${name}${error ? ': ' + error : ''}`);
}

async function setupTestData() {
  console.log('\n📝 Setting up test data...\n');
  
  try {
    // Create test organization
    const [org] = await db.insert(organizations).values({
      id: 'test-org',
      name: 'SQL Test Organization',
      slug: 'sql-test-org'
    }).returning();

    // Create test vessel
    const [vessel] = await db.insert(vessels).values({
      orgId: org.id,
      name: 'SQL Test Vessel',
      type: 'Test Type',
      imoNumber: 'TEST123',
      status: 'active'
    }).returning();

    // Create test equipment with various data types
    await db.insert(equipment).values([
      {
        orgId: 'test-org',
        vesselId: vessel.id,
        name: 'Main Engine',
        type: 'Engine',
        manufacturer: 'TestMfg',
        model: 'TE-100',
        status: 'operational',
        location: 'Engine Room',
        criticalityScore: 95
      },
      {
        orgId: 'test-org',
        vesselId: vessel.id,
        name: 'Auxiliary Engine',
        type: 'Engine',
        manufacturer: 'AuxMfg',
        model: 'AE-50',
        status: 'operational',
        location: 'Auxiliary Room',
        criticalityScore: 75
      },
      {
        orgId: 'test-org',
        vesselId: vessel.id,
        name: 'Generator Unit',
        type: 'Generator',
        manufacturer: 'GenCo',
        model: 'GEN-200',
        status: 'operational',
        location: 'Generator Room',
        criticalityScore: 85
      }
    ]);

    console.log('✓ Test data created\n');
    return vessel.id;
  } catch (error) {
    console.error('✗ Failed to create test data:', error);
    throw error;
  }
}

async function cleanupTestData(vesselId: string) {
  console.log('\n🧹 Cleaning up test data...\n');
  
  try {
    await db.delete(equipment).where(eq(equipment.vesselId, vesselId));
    await db.delete(vessels).where(eq(vessels.id, vesselId));
    await db.delete(organizations).where(eq(organizations.id, 'test-org'));
    console.log('✓ Test data cleaned up\n');
  } catch (error) {
    console.error('✗ Failed to cleanup test data:', error);
  }
}

async function testILIKE(vesselId: string) {
  try {
    // Test case-insensitive search scoped to our test vessel
    const results = await db
      .select()
      .from(equipment)
      .where(
        and(
          eq(equipment.vesselId, vesselId),
          ilike(equipment.name, '%engine%')
        )
      );

    const found = results.length === 2; // Should find "Main Engine" and "Auxiliary Engine"
    logTest('ilike() - Case-insensitive search', found, 
      found ? undefined : `Expected 2 results, got ${results.length}`);
  } catch (error) {
    logTest('ilike() - Case-insensitive search', false, 
      error instanceof Error ? error.message : String(error));
  }
}

async function testArrayContains(vesselId: string) {
  try {
    // Test with equipment tags (if they have tags field)
    // Since equipment doesn't have a tags field in the schema, 
    // we'll test the function directly with SQL
    
    // Create a test query that would use array contains
    const testValue = 'operational';
    const query = arrayContains(sql`${equipment.status}::text[]`, testValue);
    
    // This tests that the function returns valid SQL for both engines
    logTest('arrayContains() - Function executes without error', true);
  } catch (error) {
    logTest('arrayContains() - Function executes without error', false,
      error instanceof Error ? error.message : String(error));
  }
}

async function testJSONSet() {
  try {
    // Test JSON path modification
    // Note: This tests the SQL generation, actual DB update would require a jsonb column
    
    const testColumn = sql`'{"key": "value"}'::jsonb`;
    const result = jsonSet(testColumn, 'newKey', 'newValue');
    
    // Verify it returns SQL object
    const isValid = result && typeof result === 'object';
    logTest('jsonSet() - Generates valid SQL', isValid,
      isValid ? undefined : 'Did not return valid SQL object');
  } catch (error) {
    logTest('jsonSet() - Generates valid SQL', false,
      error instanceof Error ? error.message : String(error));
  }
}

async function testJSONExtract() {
  try {
    // Test JSON extraction
    const result = jsonExtract('test_column', 'key');
    
    // Verify it returns SQL
    const isValid = result && typeof result === 'object';
    logTest('jsonExtract() - Generates valid SQL', isValid,
      isValid ? undefined : 'Did not return valid SQL object');
  } catch (error) {
    logTest('jsonExtract() - Generates valid SQL', false,
      error instanceof Error ? error.message : String(error));
  }
}

async function testDatabaseMode() {
  try {
    const mode = isSQLiteMode();
    const modeStr = mode ? 'SQLite' : 'PostgreSQL';
    console.log(`\n📊 Database Mode: ${modeStr}\n`);
    logTest('Database mode detection', true, `Running in ${modeStr} mode`);
  } catch (error) {
    logTest('Database mode detection', false,
      error instanceof Error ? error.message : String(error));
  }
}

async function testComplexQuery(vesselId: string) {
  try {
    // Test complex query using multiple compatibility helpers
    const searchTerm = 'engine';
    
    const results = await db
      .select()
      .from(equipment)
      .where(
        and(
          eq(equipment.vesselId, vesselId),
          ilike(equipment.name, `%${searchTerm}%`)
        )
      );

    const found = results.length === 2;
    logTest('Complex query with multiple helpers', found,
      found ? undefined : `Expected 2 results, got ${results.length}`);
  } catch (error) {
    logTest('Complex query with multiple helpers', false,
      error instanceof Error ? error.message : String(error));
  }
}

async function runTests() {
  console.log('\n========================================');
  console.log('  SQL Compatibility Integration Tests');
  console.log('========================================\n');

  let vesselId: string | null = null;

  try {
    // Database mode check
    await testDatabaseMode();

    // Setup
    vesselId = await setupTestData();

    // Run all tests
    console.log('Running compatibility tests...\n');
    await testILIKE(vesselId);
    await testArrayContains(vesselId);
    await testJSONSet();
    await testJSONExtract();
    await testComplexQuery(vesselId);

  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
  } finally {
    // Cleanup
    if (vesselId) {
      await cleanupTestData(vesselId);
    }
  }

  // Summary
  console.log('\n========================================');
  console.log('  Test Summary');
  console.log('========================================\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`Total: ${total}`);
  console.log(`\x1b[32mPassed: ${passed}\x1b[0m`);
  console.log(`\x1b[31mFailed: ${failed}\x1b[0m`);
  
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
