/**
 * Scalability Module for ARUS
 * Provides horizontal scaling support, caching, and background processing integration
 */

import { jobQueue, JOB_TYPES, JobType } from './background-jobs';

// Simple in-memory cache with TTL support
export class MemoryCache {
  private cache: Map<string, { value: any; expires: number; hits: number }> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, value: any, ttl?: number): void {
    const expires = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expires, hits: 0 });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    item.hits++;
    return item.value;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats(): {
    size: number;
    totalHits: number;
    keys: string[];
  } {
    const totalHits = Array.from(this.cache.values()).reduce((sum, item) => sum + item.hits, 0);
    return {
      size: this.cache.size,
      totalHits,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Global cache instance
export const cache = new MemoryCache();

// Cache key generators
export const CacheKeys = {
  equipmentHealth: (equipmentId?: string) => 
    equipmentId ? `equipment:health:${equipmentId}` : 'equipment:health:all',
  
  telemetryLatest: (equipmentId?: string, sensorType?: string) => 
    `telemetry:latest:${equipmentId || 'all'}:${sensorType || 'all'}`,
  
  fleetOverview: () => 'fleet:overview',
  
  workOrders: (equipmentId?: string) => 
    equipmentId ? `work-orders:${equipmentId}` : 'work-orders:all',
  
  deviceStatus: (deviceId?: string) => 
    deviceId ? `device:status:${deviceId}` : 'devices:status:all',
  
  dashboard: () => 'dashboard:summary',
  
  reportData: (type: string, equipmentId?: string) => 
    `report:${type}:${equipmentId || 'all'}`,
  
  aiAnalysis: (type: string, equipmentId: string) => 
    `ai:${type}:${equipmentId}`,
  
  crewSchedule: (startDate: string, endDate: string) => 
    `crew:schedule:${startDate}:${endDate}`
};

// Cache TTL configurations (in milliseconds)
export const CacheTTL = {
  SHORT: 30 * 1000,      // 30 seconds - for rapidly changing data
  MEDIUM: 5 * 60 * 1000,  // 5 minutes - for moderately changing data
  LONG: 30 * 60 * 1000,   // 30 minutes - for relatively stable data
  EXTENDED: 2 * 60 * 60 * 1000 // 2 hours - for mostly static data
};

/**
 * Cached data fetcher with automatic cache management
 */
export async function cachedFetch<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  ttl: number = CacheTTL.MEDIUM
): Promise<T> {
  // Try cache first
  const cached = cache.get(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetcher();
  
  // Cache the result
  cache.set(cacheKey, data, ttl);
  
  return data;
}

/**
 * Background job helpers for heavy operations
 */
export class BackgroundJobHelpers {
  
  /**
   * Queue AI equipment analysis
   */
  static async queueEquipmentAnalysis(
    equipmentId: string, 
    telemetryData: any[], 
    equipmentType?: string,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<string> {
    return await jobQueue.addJob(
      JOB_TYPES.AI_EQUIPMENT_ANALYSIS,
      { equipmentId, telemetryData, equipmentType },
      { priority, maxAttempts: 2 }
    );
  }

  /**
   * Queue AI fleet analysis
   */
  static async queueFleetAnalysis(
    equipmentHealthData: any[],
    telemetryData: any[],
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<string> {
    return await jobQueue.addJob(
      JOB_TYPES.AI_FLEET_ANALYSIS,
      { equipmentHealthData, telemetryData },
      { priority, maxAttempts: 2 }
    );
  }

  /**
   * Queue report generation
   */
  static async queueReportGeneration(
    type: 'pdf' | 'csv' | 'html',
    reportData: any,
    options: any = {},
    priority: 'low' | 'medium' | 'high' | 'critical' = 'low'
  ): Promise<string> {
    const jobType = type === 'pdf' ? JOB_TYPES.REPORT_GENERATION_PDF :
                    type === 'csv' ? JOB_TYPES.REPORT_GENERATION_CSV :
                    JOB_TYPES.REPORT_GENERATION_HTML;
    
    return await jobQueue.addJob(
      jobType,
      { reportData, options },
      { priority, maxAttempts: 1 }
    );
  }

  /**
   * Queue crew scheduling optimization
   */
  static async queueCrewScheduling(
    days: string[],
    shifts: any[],
    crew: any[],
    leaves: any[],
    options: any = {},
    priority: 'low' | 'medium' | 'high' | 'critical' = 'high'
  ): Promise<string> {
    return await jobQueue.addJob(
      JOB_TYPES.CREW_SCHEDULING,
      { days, shifts, crew, leaves, options },
      { priority, maxAttempts: 2 }
    );
  }

  /**
   * Queue maintenance scheduling
   */
  static async queueMaintenanceScheduling(
    equipmentId: string,
    pdmScore: number,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'high'
  ): Promise<string> {
    return await jobQueue.addJob(
      JOB_TYPES.MAINTENANCE_SCHEDULING,
      { equipmentId, pdmScore },
      { priority, maxAttempts: 3 }
    );
  }
}

/**
 * Session management helpers for horizontal scaling
 */
export class SessionManager {
  private static sessions: Map<string, { data: any; expires: number }> = new Map();
  private static defaultTTL = 24 * 60 * 60 * 1000; // 24 hours

  static set(sessionId: string, data: any, ttl?: number): void {
    const expires = Date.now() + (ttl || this.defaultTTL);
    this.sessions.set(sessionId, { data, expires });
  }

  static get(sessionId: string): any | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    if (Date.now() > session.expires) {
      this.sessions.delete(sessionId);
      return null;
    }
    
    return session.data;
  }

  static delete(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  static cleanup(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expires) {
        this.sessions.delete(sessionId);
      }
    }
  }

  static getStats(): { activeSessions: number; totalSessions: number } {
    return {
      activeSessions: this.sessions.size,
      totalSessions: this.sessions.size // For in-memory implementation
    };
  }
}

/**
 * Load balancer health check endpoint data
 */
export function getLoadBalancerHealth(): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  metrics: {
    jobQueue: any;
    cache: any;
    sessions: any;
  };
} {
  const jobStats = jobQueue.getStats();
  const cacheStats = cache.getStats();
  const sessionStats = SessionManager.getStats();
  
  // Determine health status based on system metrics
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  
  if (jobStats.failed > jobStats.completed * 0.1) {
    status = 'degraded'; // More than 10% failure rate
  }
  
  if (jobStats.processing > 10 || jobStats.pending > 50) {
    status = 'degraded'; // High load
  }
  
  if (jobStats.failed > jobStats.completed * 0.5) {
    status = 'unhealthy'; // More than 50% failure rate
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    metrics: {
      jobQueue: jobStats,
      cache: cacheStats,
      sessions: sessionStats
    }
  };
}

// Cleanup scheduler - runs every 10 minutes
setInterval(() => {
  cache.cleanup();
  SessionManager.cleanup();
}, 10 * 60 * 1000);