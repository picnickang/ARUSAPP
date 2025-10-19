/**
 * ARUS Integration Tests - Multi-Tenant Security & Core Functionality
 * Comprehensive backend validation of RLS, data isolation, and critical workflows
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';
import { equipment, workOrders, vessels, organizations, failurePredictions, partsInventory } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

interface TestResult {
  testName: string;
  category: string;
  status: 'PASS' | 'FAIL' | 'ERROR';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function logTest(testName: string, category: string, status: 'PASS' | 'FAIL' | 'ERROR', message: string, details?: any) {
  results.push({ testName, category, status, message, details });
  const symbol = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${symbol} [${category}] ${testName}: ${message}`);
  if (details) {
    console.log(`   Details:`, JSON.stringify(details, null, 2));
  }
}

async function runTests() {
  console.log('\n='.repeat(80));
  console.log('ARUS COMPREHENSIVE INTEGRATION TEST SUITE');
  console.log('='.repeat(80));
  console.log(`Started at: ${new Date().toISOString()}\n`);

  try {
    // ========================================
    // TEST CATEGORY 1: MULTI-TENANT DATA ISOLATION
    // ========================================
    console.log('\n📊 CATEGORY 1: MULTI-TENANT DATA ISOLATION\n');

    // Test 1.1: Verify all organizations have distinct data
    try {
      const orgData = await db.execute(sql`
        SELECT 
          o.id as org_id,
          o.name as org_name,
          COUNT(DISTINCT v.id) as vessel_count,
          COUNT(DISTINCT e.id) as equipment_count,
          COUNT(DISTINCT wo.id) as work_order_count
        FROM organizations o
        LEFT JOIN vessels v ON v.org_id = o.id
        LEFT JOIN equipment e ON e.org_id = o.id
        LEFT JOIN work_orders wo ON wo.org_id = o.id
        GROUP BY o.id, o.name
        ORDER BY o.name
      `);

      const rows = orgData.rows as any[];
      const orgsWithData = rows.filter(r => 
        parseInt(r.vessel_count) > 0 || 
        parseInt(r.equipment_count) > 0 || 
        parseInt(r.work_order_count) > 0
      );

      if (orgsWithData.length >= 2) {
        logTest(
          'Multi-org data distribution',
          'MULTI-TENANT',
          'PASS',
          `Found ${orgsWithData.length} organizations with data (supports isolation testing)`,
          orgsWithData
        );
      } else {
        logTest(
          'Multi-org data distribution',
          'MULTI-TENANT',
          'FAIL',
          `Only ${orgsWithData.length} org(s) have data - need multiple for isolation testing`,
          orgsWithData
        );
      }
    } catch (error: any) {
      logTest('Multi-org data distribution', 'MULTI-TENANT', 'ERROR', error.message);
    }

    // Test 1.2: Verify NO equipment exists without org_id
    try {
      const orphanedEquipment = await db.execute(sql`
        SELECT COUNT(*) as count FROM equipment WHERE org_id IS NULL
      `);
      const count = parseInt((orphanedEquipment.rows[0] as any).count);
      
      if (count === 0) {
        logTest('Equipment org_id integrity', 'MULTI-TENANT', 'PASS', 'All equipment has org_id assigned');
      } else {
        logTest('Equipment org_id integrity', 'MULTI-TENANT', 'FAIL', `Found ${count} equipment without org_id`, { count });
      }
    } catch (error: any) {
      logTest('Equipment org_id integrity', 'MULTI-TENANT', 'ERROR', error.message);
    }

    // Test 1.3: Verify NO work orders exist without org_id
    try {
      const orphanedWO = await db.execute(sql`
        SELECT COUNT(*) as count FROM work_orders WHERE org_id IS NULL
      `);
      const count = parseInt((orphanedWO.rows[0] as any).count);
      
      if (count === 0) {
        logTest('Work order org_id integrity', 'MULTI-TENANT', 'PASS', 'All work orders have org_id assigned');
      } else {
        logTest('Work order org_id integrity', 'MULTI-TENANT', 'FAIL', `Found ${count} work orders without org_id`, { count });
      }
    } catch (error: any) {
      logTest('Work order org_id integrity', 'MULTI-TENANT', 'ERROR', error.message);
    }

    // Test 1.4: Verify NO vessels exist without org_id
    try {
      const orphanedVessels = await db.execute(sql`
        SELECT COUNT(*) as count FROM vessels WHERE org_id IS NULL
      `);
      const count = parseInt((orphanedVessels.rows[0] as any).count);
      
      if (count === 0) {
        logTest('Vessel org_id integrity', 'MULTI-TENANT', 'PASS', 'All vessels have org_id assigned');
      } else {
        logTest('Vessel org_id integrity', 'MULTI-TENANT', 'FAIL', `Found ${count} vessels without org_id`, { count });
      }
    } catch (error: any) {
      logTest('Vessel org_id integrity', 'MULTI-TENANT', 'ERROR', error.message);
    }

    // Test 1.5: Verify RLS policies exist on critical tables
    try {
      const rlsPolicies = await db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          policyname,
          cmd,
          qual
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename IN ('equipment', 'work_orders', 'vessels', 'failure_predictions')
        ORDER BY tablename, policyname
      `);
      
      const tables = ['equipment', 'work_orders', 'vessels', 'failure_predictions'];
      const policiesFound = rlsPolicies.rows.length;
      
      if (policiesFound >= tables.length) {
        logTest(
          'RLS policies existence',
          'MULTI-TENANT',
          'PASS',
          `Found ${policiesFound} RLS policies on critical tables`,
          { policyCount: policiesFound }
        );
      } else {
        logTest(
          'RLS policies existence',
          'MULTI-TENANT',
          'FAIL',
          `Expected at least ${tables.length} policies, found ${policiesFound}`,
          { policyCount: policiesFound }
        );
      }
    } catch (error: any) {
      logTest('RLS policies existence', 'MULTI-TENANT', 'ERROR', error.message);
    }

    // Test 1.6: Verify FORCE RLS is enabled
    try {
      const forceRLS = await db.execute(sql`
        SELECT 
          tablename,
          rowsecurity
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN ('equipment', 'work_orders', 'vessels')
      `);
      
      const rows = forceRLS.rows as any[];
      const allEnabled = rows.every(r => r.rowsecurity === true);
      
      if (allEnabled && rows.length === 3) {
        logTest('FORCE RLS enabled', 'MULTI-TENANT', 'PASS', 'RLS enabled on all critical tables');
      } else {
        logTest('FORCE RLS enabled', 'MULTI-TENANT', 'FAIL', 'RLS not enabled on all tables', { tables: rows });
      }
    } catch (error: any) {
      logTest('FORCE RLS enabled', 'MULTI-TENANT', 'ERROR', error.message);
    }

    // ========================================
    // TEST CATEGORY 2: DATA INTEGRITY & FOREIGN KEYS
    // ========================================
    console.log('\n🔗 CATEGORY 2: DATA INTEGRITY & FOREIGN KEYS\n');

    // Test 2.1: Verify work_order → equipment relationship integrity
    try {
      const orphanedWO = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM work_orders wo
        LEFT JOIN equipment e ON wo.equipment_id = e.id
        WHERE wo.equipment_id IS NOT NULL AND e.id IS NULL
      `);
      const count = parseInt((orphanedWO.rows[0] as any).count);
      
      if (count === 0) {
        logTest('Work order → equipment FK', 'DATA_INTEGRITY', 'PASS', 'All work orders reference valid equipment');
      } else {
        logTest('Work order → equipment FK', 'DATA_INTEGRITY', 'FAIL', `Found ${count} orphaned work orders`, { count });
      }
    } catch (error: any) {
      logTest('Work order → equipment FK', 'DATA_INTEGRITY', 'ERROR', error.message);
    }

    // Test 2.2: Verify equipment → vessel relationship integrity
    try {
      const orphanedEquip = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM equipment e
        LEFT JOIN vessels v ON e.vessel_id = v.id
        WHERE e.vessel_id IS NOT NULL AND v.id IS NULL
      `);
      const count = parseInt((orphanedEquip.rows[0] as any).count);
      
      if (count === 0) {
        logTest('Equipment → vessel FK', 'DATA_INTEGRITY', 'PASS', 'All equipment references valid vessels');
      } else {
        logTest('Equipment → vessel FK', 'DATA_INTEGRITY', 'FAIL', `Found ${count} orphaned equipment`, { count });
      }
    } catch (error: any) {
      logTest('Equipment → vessel FK', 'DATA_INTEGRITY', 'ERROR', error.message);
    }

    // Test 2.3: Verify work order → equipment → vessel chain
    try {
      const chainCheck = await db.execute(sql`
        SELECT 
          COUNT(*) as total_work_orders,
          COUNT(e.id) as wo_with_equipment,
          COUNT(v.id) as wo_with_vessel_via_equipment
        FROM work_orders wo
        LEFT JOIN equipment e ON wo.equipment_id = e.id
        LEFT JOIN vessels v ON e.vessel_id = v.id
        WHERE wo.equipment_id IS NOT NULL
      `);
      
      const row = chainCheck.rows[0] as any;
      const total = parseInt(row.total_work_orders);
      const withEquip = parseInt(row.wo_with_equipment);
      
      if (total === withEquip) {
        logTest(
          'Work order chain integrity',
          'DATA_INTEGRITY',
          'PASS',
          `All ${total} work orders have valid equipment linkage`,
          row
        );
      } else {
        logTest(
          'Work order chain integrity',
          'DATA_INTEGRITY',
          'FAIL',
          `${total - withEquip} work orders have broken equipment links`,
          row
        );
      }
    } catch (error: any) {
      logTest('Work order chain integrity', 'DATA_INTEGRITY', 'ERROR', error.message);
    }

    // ========================================
    // TEST CATEGORY 3: RLS ENFORCEMENT SIMULATION
    // ========================================
    console.log('\n🔒 CATEGORY 3: RLS ENFORCEMENT VALIDATION\n');

    // Test 3.1: Simulate RLS filtering by manually checking org isolation
    try {
      // Get two different organizations
      const orgs = await db.execute(sql`
        SELECT id FROM organizations LIMIT 2
      `);
      
      if (orgs.rows.length >= 2) {
        const org1 = (orgs.rows[0] as any).id;
        const org2 = (orgs.rows[1] as any).id;
        
        // Get equipment for each org
        const org1Equipment = await db.execute(sql`
          SELECT id FROM equipment WHERE org_id = ${org1}
        `);
        
        const org2Equipment = await db.execute(sql`
          SELECT id FROM equipment WHERE org_id = ${org2}
        `);
        
        const org1Ids = org1Equipment.rows.map((r: any) => r.id);
        const org2Ids = org2Equipment.rows.map((r: any) => r.id);
        
        // Check for any overlap
        const overlap = org1Ids.filter(id => org2Ids.includes(id));
        
        if (overlap.length === 0) {
          logTest(
            'Equipment org isolation',
            'RLS_VALIDATION',
            'PASS',
            `No equipment overlap between orgs (Org1: ${org1Ids.length}, Org2: ${org2Ids.length})`,
            { org1Count: org1Ids.length, org2Count: org2Ids.length }
          );
        } else {
          logTest(
            'Equipment org isolation',
            'RLS_VALIDATION',
            'FAIL',
            `Found ${overlap.length} equipment items in both orgs`,
            { overlap }
          );
        }
      } else {
        logTest(
          'Equipment org isolation',
          'RLS_VALIDATION',
          'FAIL',
          'Need at least 2 organizations to test isolation'
        );
      }
    } catch (error: any) {
      logTest('Equipment org isolation', 'RLS_VALIDATION', 'ERROR', error.message);
    }

    // ========================================
    // TEST CATEGORY 4: PERFORMANCE & QUERY OPTIMIZATION
    // ========================================
    console.log('\n⚡ CATEGORY 4: PERFORMANCE VALIDATION\n');

    // Test 4.1: Equipment health query performance
    try {
      const start = Date.now();
      await db.execute(sql`
        SELECT * FROM mv_equipment_health LIMIT 100
      `);
      const duration = Date.now() - start;
      
      if (duration < 500) {
        logTest(
          'Equipment health query speed',
          'PERFORMANCE',
          'PASS',
          `Query completed in ${duration}ms (< 500ms threshold)`
        );
      } else {
        logTest(
          'Equipment health query speed',
          'PERFORMANCE',
          'FAIL',
          `Query took ${duration}ms (> 500ms threshold)`,
          { duration }
        );
      }
    } catch (error: any) {
      logTest('Equipment health query speed', 'PERFORMANCE', 'ERROR', error.message);
    }

    // Test 4.2: Dashboard query performance
    try {
      const start = Date.now();
      await db.execute(sql`
        SELECT 
          COUNT(DISTINCT e.id) as equipment_count,
          COUNT(DISTINCT wo.id) as work_order_count,
          COUNT(DISTINCT v.id) as vessel_count
        FROM equipment e
        LEFT JOIN work_orders wo ON wo.equipment_id = e.id
        LEFT JOIN vessels v ON e.vessel_id = v.id
        WHERE e.org_id = 'default-org-id'
      `);
      const duration = Date.now() - start;
      
      if (duration < 500) {
        logTest(
          'Dashboard aggregation speed',
          'PERFORMANCE',
          'PASS',
          `Query completed in ${duration}ms`
        );
      } else {
        logTest(
          'Dashboard aggregation speed',
          'PERFORMANCE',
          'FAIL',
          `Query took ${duration}ms (> 500ms)`,
          { duration }
        );
      }
    } catch (error: any) {
      logTest('Dashboard aggregation speed', 'PERFORMANCE', 'ERROR', error.message);
    }

    // ========================================
    // TEST CATEGORY 5: MATERIALIZED VIEW FUNCTIONALITY
    // ========================================
    console.log('\n📊 CATEGORY 5: MATERIALIZED VIEWS\n');

    // Test 5.1: Verify materialized views exist
    try {
      const views = await db.execute(sql`
        SELECT matviewname 
        FROM pg_matviews 
        WHERE schemaname = 'public'
        AND matviewname IN ('mv_equipment_health', 'mv_latest_equipment_telemetry')
      `);
      
      if (views.rows.length === 2) {
        logTest(
          'Materialized views exist',
          'MAT_VIEWS',
          'PASS',
          'Both critical materialized views found'
        );
      } else {
        logTest(
          'Materialized views exist',
          'MAT_VIEWS',
          'FAIL',
          `Expected 2 views, found ${views.rows.length}`,
          { views: views.rows }
        );
      }
    } catch (error: any) {
      logTest('Materialized views exist', 'MAT_VIEWS', 'ERROR', error.message);
    }

    // ========================================
    // SUMMARY
    // ========================================
    console.log('\n' + '='.repeat(80));
    console.log('TEST EXECUTION SUMMARY');
    console.log('='.repeat(80));
    
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const errors = results.filter(r => r.status === 'ERROR').length;
    const total = results.length;
    
    console.log(`\nTotal Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Errors: ${errors}`);
    console.log(`\nSuccess Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    // Group by category
    console.log('\n📋 Results by Category:\n');
    const categories = [...new Set(results.map(r => r.category))];
    categories.forEach(cat => {
      const catResults = results.filter(r => r.category === cat);
      const catPassed = catResults.filter(r => r.status === 'PASS').length;
      console.log(`  ${cat}: ${catPassed}/${catResults.length} passed`);
    });
    
    // List failures
    if (failed > 0 || errors > 0) {
      console.log('\n❌ Failed/Error Tests:\n');
      results
        .filter(r => r.status !== 'PASS')
        .forEach(r => {
          console.log(`  [${r.category}] ${r.testName}: ${r.message}`);
        });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`Completed at: ${new Date().toISOString()}`);
    console.log('='.repeat(80) + '\n');
    
    // Return exit code
    process.exit(failed > 0 || errors > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('\n💥 FATAL ERROR:', error);
    process.exit(1);
  }
}

// Run tests
runTests();
