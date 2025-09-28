import { performance } from 'perf_hooks';
import { db } from './db';
import { sql } from 'drizzle-orm';

// Performance monitoring configuration
const SLOW_QUERY_THRESHOLD_MS = 1000; // 1 second
const CONNECTION_POOL_CHECK_INTERVAL_MS = 30000; // 30 seconds
const PERFORMANCE_METRICS_RETENTION_HOURS = 24;

// In-memory query performance metrics
interface QueryMetric {
  query: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

interface ConnectionPoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
  timestamp: Date;
}

// Store metrics in memory with circular buffer
const queryMetrics: QueryMetric[] = [];
const connectionPoolHistory: ConnectionPoolStats[] = [];
const MAX_METRICS_IN_MEMORY = 10000;

// Query performance wrapper
export async function monitoredQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  const timestamp = new Date();
  
  try {
    const result = await queryFn();
    const duration = performance.now() - startTime;
    
    // Log slow queries
    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      console.warn(`🐌 Slow query detected: ${queryName} took ${duration.toFixed(2)}ms`);
    }
    
    // Store metric
    addQueryMetric({
      query: queryName,
      duration,
      timestamp,
      success: true
    });
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    console.error(`❌ Query failed: ${queryName} after ${duration.toFixed(2)}ms`, error);
    
    // Store failed metric
    addQueryMetric({
      query: queryName,
      duration,
      timestamp,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    throw error;
  }
}

function addQueryMetric(metric: QueryMetric) {
  queryMetrics.push(metric);
  
  // Maintain circular buffer
  if (queryMetrics.length > MAX_METRICS_IN_MEMORY) {
    queryMetrics.shift();
  }
  
  // Clean old metrics (older than retention period)
  const cutoff = new Date(Date.now() - PERFORMANCE_METRICS_RETENTION_HOURS * 60 * 60 * 1000);
  while (queryMetrics.length > 0 && queryMetrics[0].timestamp < cutoff) {
    queryMetrics.shift();
  }
}

// Database connection pool monitoring
export async function checkConnectionPoolHealth(): Promise<ConnectionPoolStats> {
  try {
    // Query pg_stat_database for connection info
    const result = await db.execute(sql`
      SELECT 
        sum(numbackends) as active_connections,
        count(*) as total_databases
      FROM pg_stat_database 
      WHERE datname = current_database()
    `);
    
    // Query pg_stat_activity for detailed connection info
    const activeResult = await db.execute(sql`
      SELECT 
        state,
        count(*) as connection_count
      FROM pg_stat_activity 
      WHERE datname = current_database()
      GROUP BY state
    `);
    
    // Calculate connection pool stats
    let activeConnections = 0;
    let idleConnections = 0;
    
    for (const row of activeResult.rows as any[]) {
      if (row.state === 'active') {
        activeConnections += parseInt(row.connection_count);
      } else if (row.state === 'idle') {
        idleConnections += parseInt(row.connection_count);
      }
    }
    
    const stats: ConnectionPoolStats = {
      totalConnections: activeConnections + idleConnections,
      activeConnections,
      idleConnections,
      waitingClients: 0, // Would need specific connection pool instrumentation
      timestamp: new Date()
    };
    
    // Store in history
    connectionPoolHistory.push(stats);
    if (connectionPoolHistory.length > 1000) { // Keep last 1000 samples
      connectionPoolHistory.shift();
    }
    
    return stats;
  } catch (error) {
    console.error('Failed to check connection pool health:', error);
    return {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingClients: 0,
      timestamp: new Date()
    };
  }
}

// Get slow query analysis
export function getSlowQueryAnalysis() {
  const slowQueries = queryMetrics.filter(m => m.duration > SLOW_QUERY_THRESHOLD_MS);
  
  // Group by query name
  const queryStats = new Map<string, {
    count: number;
    totalDuration: number;
    maxDuration: number;
    avgDuration: number;
    failureRate: number;
    failures: number;
  }>();
  
  for (const metric of queryMetrics) {
    if (!queryStats.has(metric.query)) {
      queryStats.set(metric.query, {
        count: 0,
        totalDuration: 0,
        maxDuration: 0,
        avgDuration: 0,
        failureRate: 0,
        failures: 0
      });
    }
    
    const stats = queryStats.get(metric.query)!;
    stats.count++;
    stats.totalDuration += metric.duration;
    stats.maxDuration = Math.max(stats.maxDuration, metric.duration);
    
    if (!metric.success) {
      stats.failures++;
    }
  }
  
  // Calculate averages and failure rates
  for (const [query, stats] of queryStats) {
    stats.avgDuration = stats.totalDuration / stats.count;
    stats.failureRate = stats.failures / stats.count;
  }
  
  return {
    slowQueryCount: slowQueries.length,
    totalQueries: queryMetrics.length,
    queryStats: Object.fromEntries(queryStats),
    recentSlowQueries: slowQueries.slice(-10) // Last 10 slow queries
  };
}

// Database health check with performance metrics
export async function getDatabasePerformanceHealth() {
  try {
    const startTime = performance.now();
    
    // Test basic connectivity
    await db.execute(sql`SELECT 1 as test`);
    const connectionTime = performance.now() - startTime;
    
    // Get database size information
    const dbSizeResult = await db.execute(sql`
      SELECT 
        pg_size_pretty(pg_database_size(current_database())) as database_size,
        pg_database_size(current_database()) as database_size_bytes
    `);
    
    // Get table sizes for largest tables
    const tableSizeResult = await db.execute(sql`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 10
    `);
    
    // Get index usage statistics
    const indexUsageResult = await db.execute(sql`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes
      WHERE idx_scan = 0 AND schemaname = 'public'
      ORDER BY pg_relation_size(indexrelid) DESC
      LIMIT 5
    `);
    
    const connectionPoolStats = await checkConnectionPoolHealth();
    const slowQueryAnalysis = getSlowQueryAnalysis();
    
    return {
      healthy: true,
      connectionTime: Math.round(connectionTime * 100) / 100,
      database: {
        size: (dbSizeResult.rows[0] as any)?.database_size || 'Unknown',
        sizeBytes: parseInt((dbSizeResult.rows[0] as any)?.database_size_bytes || '0')
      },
      largestTables: tableSizeResult.rows.map((row: any) => ({
        schema: row.schemaname,
        table: row.tablename,
        size: row.size,
        sizeBytes: parseInt(row.size_bytes)
      })),
      unusedIndexes: indexUsageResult.rows.map((row: any) => ({
        schema: row.schemaname,
        table: row.tablename,
        index: row.indexname,
        scans: row.idx_scan
      })),
      connectionPool: connectionPoolStats,
      queryPerformance: slowQueryAnalysis,
      recommendations: generatePerformanceRecommendations(slowQueryAnalysis, connectionPoolStats)
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown database error',
      connectionTime: -1
    };
  }
}

function generatePerformanceRecommendations(
  queryAnalysis: ReturnType<typeof getSlowQueryAnalysis>,
  connectionStats: ConnectionPoolStats
): string[] {
  const recommendations: string[] = [];
  
  // Query performance recommendations
  if (queryAnalysis.slowQueryCount > queryAnalysis.totalQueries * 0.1) {
    recommendations.push('Consider optimizing queries - more than 10% are slow');
  }
  
  // Connection pool recommendations
  if (connectionStats.activeConnections > connectionStats.totalConnections * 0.8) {
    recommendations.push('Connection pool utilization is high - consider increasing pool size');
  }
  
  // Specific query recommendations
  for (const [query, stats] of Object.entries(queryAnalysis.queryStats)) {
    if (stats.avgDuration > SLOW_QUERY_THRESHOLD_MS * 2) {
      recommendations.push(`Query "${query}" averages ${stats.avgDuration.toFixed(0)}ms - consider adding indexes`);
    }
    
    if (stats.failureRate > 0.05) {
      recommendations.push(`Query "${query}" has ${(stats.failureRate * 100).toFixed(1)}% failure rate - investigate errors`);
    }
  }
  
  return recommendations;
}

// Index optimization suggestions
export async function getIndexOptimizationSuggestions() {
  try {
    // Find tables without primary keys
    const missingPkResult = await db.execute(sql`
      SELECT 
        schemaname, 
        tablename
      FROM pg_tables t
      WHERE schemaname = 'public'
        AND NOT EXISTS (
          SELECT 1 FROM pg_constraint c 
          WHERE c.conrelid = (schemaname||'.'||tablename)::regclass 
            AND c.contype = 'p'
        )
    `);
    
    // Find tables with many sequential scans but few index scans
    const scanRatioResult = await db.execute(sql`
      SELECT 
        schemaname,
        tablename,
        seq_scan,
        seq_tup_read,
        idx_scan,
        idx_tup_fetch,
        CASE 
          WHEN idx_scan = 0 THEN 0
          ELSE seq_scan::float / (seq_scan + idx_scan)
        END as seq_scan_ratio
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
        AND seq_scan > 100  -- Tables with significant activity
      ORDER BY seq_scan_ratio DESC, seq_scan DESC
      LIMIT 10
    `);
    
    return {
      tablesWithoutPrimaryKeys: missingPkResult.rows.map((row: any) => ({
        schema: row.schemaname,
        table: row.tablename
      })),
      highSequentialScanTables: scanRatioResult.rows.map((row: any) => ({
        schema: row.schemaname,
        table: row.tablename,
        sequentialScans: row.seq_scan,
        indexScans: row.idx_scan || 0,
        sequentialScanRatio: parseFloat(row.seq_scan_ratio) || 1.0
      }))
    };
  } catch (error) {
    console.error('Failed to get index optimization suggestions:', error);
    return {
      tablesWithoutPrimaryKeys: [],
      highSequentialScanTables: []
    };
  }
}

// Start periodic connection pool monitoring
let poolMonitoringInterval: NodeJS.Timeout | null = null;

export function startPerformanceMonitoring() {
  if (poolMonitoringInterval) {
    clearInterval(poolMonitoringInterval);
  }
  
  poolMonitoringInterval = setInterval(async () => {
    try {
      await checkConnectionPoolHealth();
    } catch (error) {
      console.error('Connection pool monitoring failed:', error);
    }
  }, CONNECTION_POOL_CHECK_INTERVAL_MS);
  
  console.log('🔍 Database performance monitoring started');
}

export function stopPerformanceMonitoring() {
  if (poolMonitoringInterval) {
    clearInterval(poolMonitoringInterval);
    poolMonitoringInterval = null;
  }
  
  console.log('🔍 Database performance monitoring stopped');
}