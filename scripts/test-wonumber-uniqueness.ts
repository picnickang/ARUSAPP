#!/usr/bin/env tsx

/**
 * ARUS woNumber Uniqueness Regression Test
 * 
 * Verifies that concurrent work order creation produces unique woNumbers
 * and prevents duplicate key violations.
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
  duration: number;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<{ passed: boolean; details: string }>) {
  const start = Date.now();
  try {
    const result = await testFn();
    const duration = Date.now() - start;
    results.push({ name, ...result, duration });
    console.log(result.passed ? '✓' : '⚠', name + ':', result.details);
  } catch (error) {
    const duration = Date.now() - start;
    results.push({
      name,
      passed: false,
      details: error instanceof Error ? error.message : String(error),
      duration
    });
    console.log('✗', name + ':', error instanceof Error ? error.message : String(error));
  }
}

async function setup() {
  console.log('\n============================================================');
  console.log('🛠️  SETUP');
  console.log('============================================================');
  
  // Create test organization
  const orgRes = await fetch(`${BASE_URL}/api/organizations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      name: 'WO Test Org',
      slug: 'wo-test-org-' + Date.now(),
      subscriptionTier: 'basic'
    }),
  });
  
  if (!orgRes.ok) {
    throw new Error(`Failed to create organization: ${orgRes.statusText}`);
  }
  
  const org = await orgRes.json() as any;
  console.log(`✓ Organization: ${org.id}`);
  
  // Create test vessel
  const vesselRes = await fetch(`${BASE_URL}/api/vessels`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-org-id': org.id
    },
    body: JSON.stringify({ 
      name: 'Test Vessel',
      type: 'cargo',
      orgId: org.id
    }),
  });
  
  if (!vesselRes.ok) {
    throw new Error(`Failed to create vessel: ${vesselRes.statusText}`);
  }
  
  const vessel = await vesselRes.json() as any;
  console.log(`✓ Vessel: ${vessel.id}`);
  
  // Create test equipment
  const equipmentRes = await fetch(`${BASE_URL}/api/equipment`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-org-id': org.id
    },
    body: JSON.stringify({ 
      name: 'Test Equipment',
      type: 'engine',
      orgId: org.id,
      vesselId: vessel.id
    }),
  });
  
  if (!equipmentRes.ok) {
    throw new Error(`Failed to create equipment: ${equipmentRes.statusText}`);
  }
  
  const equipment = await equipmentRes.json() as any;
  console.log(`✓ Equipment: ${equipment.id}`);
  
  return { org, vessel, equipment };
}

async function cleanup(orgId: string) {
  console.log('\n============================================================');
  console.log('🧹 CLEANUP');
  console.log('============================================================');
  
  try {
    await fetch(`${BASE_URL}/api/organizations/${orgId}`, { 
      method: 'DELETE',
      headers: { 'x-org-id': orgId }
    });
    console.log('✓ Cleanup complete');
  } catch (error) {
    console.error('Failed to cleanup:', error);
  }
}

async function testConcurrentWorkOrderCreation(orgId: string, equipmentId: string) {
  const CONCURRENT_REQUESTS = 20;
  const workOrderIds: string[] = [];
  const woNumbers: string[] = [];
  
  // Fire concurrent work order creation requests
  const promises = Array.from({ length: CONCURRENT_REQUESTS }, (_, i) =>
    fetch(`${BASE_URL}/api/work-orders`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-org-id': orgId
      },
      body: JSON.stringify({
        title: `Concurrent WO ${i + 1}`,
        description: 'Concurrency test',
        equipmentId,
        orgId,
        status: 'open',
        priority: 3,
      }),
    }).then(async res => {
      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Request ${i + 1} failed: ${res.status} ${error}`);
      }
      return res.json();
    })
  );
  
  const workOrders = await Promise.all(promises);
  
  workOrders.forEach((wo: any) => {
    workOrderIds.push(wo.id);
    woNumbers.push(wo.woNumber);
  });
  
  // Check for duplicates
  const uniqueWoNumbers = new Set(woNumbers);
  const hasDuplicates = uniqueWoNumbers.size !== woNumbers.length;
  
  if (hasDuplicates) {
    // Find which numbers are duplicated
    const counts = new Map<string, number>();
    woNumbers.forEach(num => counts.set(num, (counts.get(num) || 0) + 1));
    const duplicates = Array.from(counts.entries())
      .filter(([_, count]) => count > 1)
      .map(([num, count]) => `${num} (${count}x)`);
    
    return {
      passed: false,
      details: `Duplicates found: ${duplicates.join(', ')} | Created: ${woNumbers.length}, Unique: ${uniqueWoNumbers.size}`
    };
  }
  
  return {
    passed: true,
    details: `All ${CONCURRENT_REQUESTS} woNumbers unique | Sample: ${woNumbers.slice(0, 3).join(', ')}`
  };
}

async function testWoNumberFormat(orgId: string, equipmentId: string) {
  const res = await fetch(`${BASE_URL}/api/work-orders`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-org-id': orgId
    },
    body: JSON.stringify({
      title: 'Format Test',
      description: 'Test woNumber format',
      equipmentId,
      orgId,
      status: 'open',
      priority: 3,
    }),
  });
  
  if (!res.ok) {
    throw new Error(`Failed to create work order: ${res.statusText}`);
  }
  
  const workOrder = await res.json() as any;
  const woNumber = workOrder.woNumber;
  
  // Format: WO-YYYY-####-XXXXXXXX (where XXXXXXXX is 8-char UUID segment)
  const pattern = /^WO-\d{4}-\d{4}-[a-f0-9]{8}$/;
  const isValid = pattern.test(woNumber);
  
  return {
    passed: isValid,
    details: isValid ? `Format valid: ${woNumber}` : `Invalid format: ${woNumber}`
  };
}

async function main() {
  console.log('\n🔄 ARUS woNumber Uniqueness Regression Test');
  console.log(`Target: ${BASE_URL}\n`);
  
  let testData: any;
  
  try {
    testData = await setup();
    
    console.log('\n============================================================');
    console.log('🔢 WONUMBER UNIQUENESS TESTS');
    console.log('============================================================');
    
    await runTest(
      'woNumber Format Validation',
      () => testWoNumberFormat(testData.org.id, testData.equipment.id)
    );
    
    await runTest(
      'Concurrent Work Order Creation - No Duplicates',
      () => testConcurrentWorkOrderCreation(testData.org.id, testData.equipment.id)
    );
    
  } finally {
    if (testData) {
      await cleanup(testData.org.id);
    }
  }
  
  // Print summary
  console.log('\n============================================================');
  console.log('📈 TEST SUMMARY');
  console.log('============================================================\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const avgDuration = totalDuration / results.length;
  
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`Total Duration: ${totalDuration}ms`);
  console.log(`Average Test Duration: ${avgDuration.toFixed(2)}ms\n`);
  
  if (failed > 0) {
    console.log('❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.details}`);
    });
  }
  
  if (passed > 0) {
    console.log('\n✅ Passed Tests:');
    results.filter(r => r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.details}`);
    });
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
