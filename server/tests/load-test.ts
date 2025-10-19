/**
 * ARUS Load Testing Suite
 * Simulates concurrent users and measures system performance under load
 */

import { performance } from 'perf_hooks';

interface LoadTestConfig {
  baseUrl: string;
  concurrentUsers: number;
  requestsPerUser: number;
  rampUpSeconds: number;
}

interface TestResult {
  endpoint: string;
  method: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errors: string[];
}

interface LoadTestResults {
  config: LoadTestConfig;
  startTime: Date;
  endTime: Date;
  totalDuration: number;
  results: TestResult[];
  overallStats: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    requestsPerSecond: number;
  };
}

class LoadTester {
  private config: LoadTestConfig;
  private responseTimes: Map<string, number[]> = new Map();
  private errors: Map<string, string[]> = new Map();
  private successCounts: Map<string, number> = new Map();
  private failCounts: Map<string, number> = new Map();

  constructor(config: LoadTestConfig) {
    this.config = config;
  }

  private async makeRequest(
    endpoint: string,
    method: string = 'GET',
    body?: any,
    headers?: Record<string, string>
  ): Promise<{ duration: number; success: boolean; error?: string }> {
    const start = performance.now();
    
    try {
      const defaultHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-org-id': 'default-org-id',
      };

      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        method,
        headers: { ...defaultHeaders, ...headers },
        body: body ? JSON.stringify(body) : undefined,
      });

      const duration = performance.now() - start;
      
      if (!response.ok) {
        return {
          duration,
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      // Try to parse JSON response
      try {
        await response.json();
      } catch {
        // Some endpoints might not return JSON
      }

      return { duration, success: true };
    } catch (error: any) {
      const duration = performance.now() - start;
      return {
        duration,
        success: false,
        error: error.message || String(error),
      };
    }
  }

  private recordResult(
    key: string,
    duration: number,
    success: boolean,
    error?: string
  ) {
    if (!this.responseTimes.has(key)) {
      this.responseTimes.set(key, []);
      this.errors.set(key, []);
      this.successCounts.set(key, 0);
      this.failCounts.set(key, 0);
    }

    this.responseTimes.get(key)!.push(duration);
    
    if (success) {
      this.successCounts.set(key, this.successCounts.get(key)! + 1);
    } else {
      this.failCounts.set(key, this.failCounts.get(key)! + 1);
      if (error) {
        this.errors.get(key)!.push(error);
      }
    }
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private async simulateUser(userId: number): Promise<void> {
    const key = (endpoint: string, method: string = 'GET') =>
      `${method} ${endpoint}`;

    // Simulate realistic user behavior
    for (let i = 0; i < this.config.requestsPerUser; i++) {
      // 1. Load dashboard
      const dashboardResult = await this.makeRequest('/api/dashboard');
      this.recordResult(
        key('/api/dashboard'),
        dashboardResult.duration,
        dashboardResult.success,
        dashboardResult.error
      );

      // Small delay between requests (realistic user behavior)
      await new Promise(resolve => setTimeout(resolve, 100));

      // 2. Get equipment list
      const equipmentResult = await this.makeRequest('/api/equipment');
      this.recordResult(
        key('/api/equipment'),
        equipmentResult.duration,
        equipmentResult.success,
        equipmentResult.error
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      // 3. Get work orders
      const workOrdersResult = await this.makeRequest('/api/work-orders');
      this.recordResult(
        key('/api/work-orders'),
        workOrdersResult.duration,
        workOrdersResult.success,
        workOrdersResult.error
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      // 4. Get vessels
      const vesselsResult = await this.makeRequest('/api/vessels');
      this.recordResult(
        key('/api/vessels'),
        vesselsResult.duration,
        vesselsResult.success,
        vesselsResult.error
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      // 5. Get equipment health (heavy query)
      const healthResult = await this.makeRequest('/api/equipment/health');
      this.recordResult(
        key('/api/equipment/health'),
        healthResult.duration,
        healthResult.success,
        healthResult.error
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      // 6. Get telemetry data
      const telemetryResult = await this.makeRequest('/api/telemetry/latest?limit=100');
      this.recordResult(
        key('/api/telemetry/latest'),
        telemetryResult.duration,
        telemetryResult.success,
        telemetryResult.error
      );

      // Random delay between iterations (1-3 seconds)
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    }
  }

  async run(): Promise<LoadTestResults> {
    console.log('\n' + '='.repeat(80));
    console.log('ARUS LOAD TEST');
    console.log('='.repeat(80));
    console.log(`\nConfiguration:`);
    console.log(`  Base URL: ${this.config.baseUrl}`);
    console.log(`  Concurrent Users: ${this.config.concurrentUsers}`);
    console.log(`  Requests Per User: ${this.config.requestsPerUser}`);
    console.log(`  Ramp-Up Time: ${this.config.rampUpSeconds}s`);
    console.log(`  Total Requests: ${this.config.concurrentUsers * this.config.requestsPerUser * 6} (6 endpoints per iteration)`);
    console.log('\nStarting load test...\n');

    const startTime = new Date();
    const users: Promise<void>[] = [];

    // Ramp up users gradually
    const rampUpDelay = (this.config.rampUpSeconds * 1000) / this.config.concurrentUsers;

    for (let i = 0; i < this.config.concurrentUsers; i++) {
      // Add delay for ramp-up
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, rampUpDelay));
      }
      
      users.push(this.simulateUser(i));
      process.stdout.write(`\r  Spawned users: ${i + 1}/${this.config.concurrentUsers}`);
    }

    console.log('\n  All users spawned, waiting for completion...\n');

    // Wait for all users to complete
    await Promise.all(users);

    const endTime = new Date();
    const totalDuration = (endTime.getTime() - startTime.getTime()) / 1000;

    // Calculate results
    const results: TestResult[] = [];
    let totalRequests = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;
    let totalResponseTime = 0;

    for (const [endpoint, times] of this.responseTimes.entries()) {
      const successCount = this.successCounts.get(endpoint) || 0;
      const failCount = this.failCounts.get(endpoint) || 0;
      const errors = this.errors.get(endpoint) || [];

      const avgResponseTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minResponseTime = Math.min(...times);
      const maxResponseTime = Math.max(...times);
      const p50 = this.calculatePercentile(times, 50);
      const p95 = this.calculatePercentile(times, 95);
      const p99 = this.calculatePercentile(times, 99);

      const [method, path] = endpoint.split(' ');

      results.push({
        endpoint: path,
        method,
        totalRequests: times.length,
        successfulRequests: successCount,
        failedRequests: failCount,
        averageResponseTime: avgResponseTime,
        minResponseTime,
        maxResponseTime,
        p50ResponseTime: p50,
        p95ResponseTime: p95,
        p99ResponseTime: p99,
        requestsPerSecond: times.length / totalDuration,
        errors: [...new Set(errors)].slice(0, 5), // Unique errors, max 5
      });

      totalRequests += times.length;
      totalSuccessful += successCount;
      totalFailed += failCount;
      totalResponseTime += avgResponseTime * times.length;
    }

    return {
      config: this.config,
      startTime,
      endTime,
      totalDuration,
      results,
      overallStats: {
        totalRequests,
        successfulRequests: totalSuccessful,
        failedRequests: totalFailed,
        averageResponseTime: totalResponseTime / totalRequests,
        requestsPerSecond: totalRequests / totalDuration,
      },
    };
  }

  printResults(results: LoadTestResults) {
    console.log('\n' + '='.repeat(80));
    console.log('LOAD TEST RESULTS');
    console.log('='.repeat(80));
    console.log(`\nTest Duration: ${results.totalDuration.toFixed(2)}s`);
    console.log(`Start Time: ${results.startTime.toISOString()}`);
    console.log(`End Time: ${results.endTime.toISOString()}`);

    // Calculate rate-limited vs actual errors
    const rateLimitedRequests = results.results.reduce(
      (sum, r) => sum + r.errors.filter(e => e.includes('429')).length,
      0
    );
    const actualErrors = results.overallStats.failedRequests - rateLimitedRequests;

    console.log('\n📊 OVERALL STATISTICS\n');
    console.log(`  Total Requests: ${results.overallStats.totalRequests}`);
    console.log(`  ✅ Successful: ${results.overallStats.successfulRequests} (${((results.overallStats.successfulRequests / results.overallStats.totalRequests) * 100).toFixed(2)}%)`);
    console.log(`  ⚠️  Rate Limited (429): ${rateLimitedRequests} (${((rateLimitedRequests / results.overallStats.totalRequests) * 100).toFixed(2)}%)`);
    console.log(`  ❌ Failed (actual errors): ${actualErrors} (${((actualErrors / results.overallStats.totalRequests) * 100).toFixed(2)}%)`);
    console.log(`  Average Response Time: ${results.overallStats.averageResponseTime.toFixed(2)}ms`);
    console.log(`  Throughput: ${results.overallStats.requestsPerSecond.toFixed(2)} req/s`);

    console.log('\n📈 ENDPOINT PERFORMANCE\n');
    
    // Sort by average response time
    const sortedResults = [...results.results].sort((a, b) => b.averageResponseTime - a.averageResponseTime);

    for (const result of sortedResults) {
      const successRate = (result.successfulRequests / result.totalRequests) * 100;
      const statusEmoji = successRate === 100 ? '✅' : successRate >= 95 ? '⚠️' : '❌';
      
      console.log(`${statusEmoji} ${result.method} ${result.endpoint}`);
      console.log(`   Requests: ${result.totalRequests} | Success: ${successRate.toFixed(1)}% | RPS: ${result.requestsPerSecond.toFixed(2)}`);
      console.log(`   Response Times (ms): avg=${result.averageResponseTime.toFixed(2)} | min=${result.minResponseTime.toFixed(2)} | max=${result.maxResponseTime.toFixed(2)}`);
      console.log(`   Percentiles (ms): p50=${result.p50ResponseTime.toFixed(2)} | p95=${result.p95ResponseTime.toFixed(2)} | p99=${result.p99ResponseTime.toFixed(2)}`);
      
      if (result.failedRequests > 0) {
        console.log(`   ❌ Errors (${result.failedRequests}):`);
        result.errors.slice(0, 3).forEach(err => console.log(`      - ${err}`));
      }
      console.log();
    }

    // Performance assessment
    console.log('\n🎯 PERFORMANCE ASSESSMENT\n');
    
    const slowEndpoints = sortedResults.filter(r => r.averageResponseTime > 1000);
    const failingEndpoints = sortedResults.filter(r => r.failedRequests > 0);
    
    if (slowEndpoints.length === 0 && failingEndpoints.length === 0) {
      console.log('  ✅ EXCELLENT: All endpoints performing well');
    } else {
      if (slowEndpoints.length > 0) {
        console.log(`  ⚠️  ${slowEndpoints.length} endpoint(s) with avg response > 1s:`);
        slowEndpoints.forEach(e => console.log(`     - ${e.method} ${e.endpoint}: ${e.averageResponseTime.toFixed(2)}ms`));
      }
      
      if (failingEndpoints.length > 0) {
        console.log(`  ❌ ${failingEndpoints.length} endpoint(s) with failures:`);
        failingEndpoints.forEach(e => console.log(`     - ${e.method} ${e.endpoint}: ${e.failedRequests}/${e.totalRequests} failed`));
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('END OF LOAD TEST');
    console.log('='.repeat(80) + '\n');
  }
}

// Run load test
async function main() {
  const config: LoadTestConfig = {
    baseUrl: process.env.BASE_URL || 'http://localhost:5000',
    concurrentUsers: parseInt(process.env.CONCURRENT_USERS || '50'),
    requestsPerUser: parseInt(process.env.REQUESTS_PER_USER || '3'),
    rampUpSeconds: parseInt(process.env.RAMP_UP_SECONDS || '10'),
  };

  const tester = new LoadTester(config);
  const results = await tester.run();
  tester.printResults(results);

  // Exit with error code only for ACTUAL errors (not rate limiting)
  const rateLimitedRequests = results.results.reduce(
    (sum, r) => sum + r.errors.filter(e => e.includes('429')).length,
    0
  );
  const actualErrors = results.overallStats.failedRequests - rateLimitedRequests;
  const actualErrorRate = actualErrors / results.overallStats.totalRequests;
  
  // Fail if > 5% actual error rate (excluding rate limiting)
  if (actualErrorRate > 0.05) {
    console.log(`\n❌ LOAD TEST FAILED: ${(actualErrorRate * 100).toFixed(2)}% actual error rate (threshold: 5%)\n`);
    process.exit(1);
  } else {
    console.log(`\n✅ LOAD TEST PASSED: ${(actualErrorRate * 100).toFixed(2)}% actual error rate (${rateLimitedRequests} rate-limited responses are expected)\n`);
    process.exit(0);
  }
}

main();
