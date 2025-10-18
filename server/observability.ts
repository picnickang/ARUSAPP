import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

// Prometheus metrics
const httpRequestsTotal = new client.Counter({
  name: 'arus_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status_code']
});

const httpRequestDuration = new client.Histogram({
  name: 'arus_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const databaseConnectionsTotal = new client.Gauge({
  name: 'arus_database_connections_active',
  help: 'Active database connections'
});

// HoR-specific metrics (from Windows batch patch translation)
const horImportTotal = new client.Counter({
  name: 'arus_hor_import_total',
  help: 'Total number of HoR rows imported',
  labelNames: ['crew_id', 'format']
});

const horComplianceChecksTotal = new client.Counter({
  name: 'arus_hor_compliance_checks_total', 
  help: 'Total number of STCW compliance checks performed',
  labelNames: ['crew_id', 'result']
});

const horPdfExportsTotal = new client.Counter({
  name: 'arus_hor_pdf_exports_total',
  help: 'Total number of HoR PDF exports generated',
  labelNames: ['crew_id']
});

const idempotencyHitsTotal = new client.Counter({
  name: 'arus_idempotency_hits_total',
  help: 'Total number of idempotent request hits',
  labelNames: ['endpoint']
});

// ===== ENHANCED METRICS (from Windows batch patch translation) =====

// WebSocket connection metrics
const websocketConnectionsTotal = new client.Gauge({
  name: 'arus_websocket_connections_active',
  help: 'Number of active WebSocket connections'
});

const websocketMessagesTotal = new client.Counter({
  name: 'arus_websocket_messages_total',
  help: 'Total WebSocket messages processed',
  labelNames: ['type', 'channel']
});

const websocketReconnectionsTotal = new client.Counter({
  name: 'arus_websocket_reconnections_total',
  help: 'Total WebSocket reconnection attempts',
  labelNames: ['reason']
});

// Equipment and fleet health metrics
const equipmentHealthStatus = new client.Gauge({
  name: 'arus_equipment_health_status',
  help: 'Equipment health status distribution',
  labelNames: ['status', 'vessel_id']
});

const fleetHealthScore = new client.Gauge({
  name: 'arus_fleet_health_score',
  help: 'Overall fleet health score percentage'
});

const pdmScoresTotal = new client.Histogram({
  name: 'arus_pdm_scores',
  help: 'Distribution of predictive maintenance scores',
  labelNames: ['equipment_id', 'vessel_id'],
  buckets: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
});

// Alert system metrics
const alertsGeneratedTotal = new client.Counter({
  name: 'arus_alerts_generated_total',
  help: 'Total alerts generated',
  labelNames: ['type', 'equipment_id', 'severity']
});

const alertsAcknowledgedTotal = new client.Counter({
  name: 'arus_alerts_acknowledged_total',
  help: 'Total alerts acknowledged',
  labelNames: ['equipment_id']
});

const alertConfigurationsTotal = new client.Gauge({
  name: 'arus_alert_configurations_active',
  help: 'Number of active alert configurations'
});

// Telemetry processing metrics
const telemetryProcessedTotal = new client.Counter({
  name: 'arus_telemetry_processed_total',
  help: 'Total telemetry readings processed',
  labelNames: ['equipment_id', 'sensor_type', 'vessel_id']
});

const telemetryErrorsTotal = new client.Counter({
  name: 'arus_telemetry_errors_total',
  help: 'Total telemetry processing errors',
  labelNames: ['error_type', 'equipment_id']
});

// Business logic metrics
const workOrdersTotal = new client.Counter({
  name: 'arus_work_orders_total',
  help: 'Total work orders created/updated',
  labelNames: ['status', 'priority', 'vessel_id']
});

// MQTT Reliable Sync metrics
const mqttMessagesPublishedTotal = new client.Counter({
  name: 'arus_mqtt_messages_published_total',
  help: 'Total MQTT messages successfully published',
  labelNames: ['entity_type', 'operation', 'qos']
});

const mqttMessagesQueuedTotal = new client.Counter({
  name: 'arus_mqtt_messages_queued_total',
  help: 'Total MQTT messages queued for later delivery'
});

const mqttMessagesDroppedTotal = new client.Counter({
  name: 'arus_mqtt_messages_dropped_total',
  help: 'Total MQTT messages dropped due to queue overflow'
});

const mqttPublishFailuresTotal = new client.Counter({
  name: 'arus_mqtt_publish_failures_total',
  help: 'Total MQTT publish failures'
});

const mqttReconnectionAttemptsTotal = new client.Counter({
  name: 'arus_mqtt_reconnection_attempts_total',
  help: 'Total MQTT reconnection attempts'
});

const mqttQueueFlushesTotal = new client.Counter({
  name: 'arus_mqtt_queue_flushes_total',
  help: 'Total MQTT queue flush operations'
});

const mqttQueueDepthGauge = new client.Gauge({
  name: 'arus_mqtt_queue_depth',
  help: 'Current number of messages in MQTT queue'
});

const mqttQueueUtilizationGauge = new client.Gauge({
  name: 'arus_mqtt_queue_utilization_percent',
  help: 'MQTT queue utilization percentage'
});

const mqttConnectionStatusGauge = new client.Gauge({
  name: 'arus_mqtt_connection_status',
  help: 'MQTT connection status (1=connected, 0=disconnected)'
});

const maintenanceSchedulesTotal = new client.Counter({
  name: 'arus_maintenance_schedules_total',
  help: 'Total maintenance schedules created/updated',
  labelNames: ['type', 'vessel_id']
});

const vesselOperationsTotal = new client.Counter({
  name: 'arus_vessel_operations_total',
  help: 'Total vessel-related operations',
  labelNames: ['operation', 'vessel_id']
});

// Database performance metrics
const databaseQueryDuration = new client.Histogram({
  name: 'arus_database_query_duration_seconds',
  help: 'Database query execution time',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5]
});

const databaseErrorsTotal = new client.Counter({
  name: 'arus_database_errors_total',
  help: 'Total database operation errors',
  labelNames: ['operation', 'error_type']
});

// Range query performance metrics (for new functionality)
const rangeQueriesTotal = new client.Counter({
  name: 'arus_range_queries_total',
  help: 'Total range queries executed',
  labelNames: ['query_type', 'vessel_id']
});

const rangeQueryDuration = new client.Histogram({
  name: 'arus_range_query_duration_seconds',
  help: 'Range query execution time',
  labelNames: ['query_type'],
  buckets: [0.01, 0.1, 0.5, 1, 2, 5, 10]
});

// ===== HUB & SYNC ADDITIONAL METRICS =====

// Device registry metrics
const deviceRegistryOperationsTotal = new client.Counter({
  name: 'arus_device_registry_operations_total',
  help: 'Total device registry operations',
  labelNames: ['operation'] // 'create', 'update', 'list'
});

const deviceRegistryActiveDevices = new client.Gauge({
  name: 'arus_device_registry_active_devices',
  help: 'Number of devices registered in device registry'
});

// Sheet locking metrics
const sheetLockOperationsTotal = new client.Counter({
  name: 'arus_sheet_lock_operations_total',
  help: 'Total sheet lock operations',
  labelNames: ['operation', 'crew_id'] // 'acquire', 'release', 'check'
});

const sheetLocksActive = new client.Gauge({
  name: 'arus_sheet_locks_active',
  help: 'Number of active sheet locks'
});

// Sheet versioning metrics
const sheetVersionOperationsTotal = new client.Counter({
  name: 'arus_sheet_version_operations_total',
  help: 'Total sheet version operations',
  labelNames: ['operation', 'crew_id'] // 'increment', 'check'
});

const sheetVersionsTotal = new client.Gauge({
  name: 'arus_sheet_versions_total',
  help: 'Total number of sheet versions tracked'
});

// Replay helper metrics
const replayOperationsTotal = new client.Counter({
  name: 'arus_replay_operations_total',
  help: 'Total replay operations',
  labelNames: ['device_id', 'endpoint']
});

const replayDuplicatesTotal = new client.Counter({
  name: 'arus_replay_duplicates_total',
  help: 'Total duplicate replay requests detected',
  labelNames: ['device_id', 'endpoint']
});

// Enhanced middleware for request tracking with performance monitoring
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  // Add request ID to request context
  (req as any).requestId = requestId;
  
  // Check memory usage periodically
  checkResourceUsage();
  
  // Track when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const labels = {
      method: req.method,
      path: req.route?.path || req.path,
      status_code: res.statusCode.toString()
    };
    
    // Update Prometheus metrics
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, duration / 1000);
    
    // Performance tracking and alerting
    trackPerformance(`http_${req.method.toLowerCase()}_request`, duration, {
      requestId,
      operation: 'http_request',
      statusCode: res.statusCode,
      metadata: {
        path: req.path,
        method: req.method,
        userAgent: req.headers['user-agent'],
        contentLength: res.get('content-length') || '0'
      }
    });
    
    // Structured logging for production analysis
    if (process.env.NODE_ENV === 'production' || duration > PERFORMANCE_THRESHOLDS.SLOW_REQUEST_MS) {
      structuredLog(
        res.statusCode >= 500 ? 'error' : 
        res.statusCode >= 400 ? 'warn' : 
        duration > PERFORMANCE_THRESHOLDS.SLOW_REQUEST_MS ? 'warn' : 'info',
        `${req.method} ${req.path} ${res.statusCode}`,
        {
          requestId,
          operation: 'http_request',
          duration,
          statusCode: res.statusCode,
          metadata: {
            method: req.method,
            path: req.path,
            contentLength: res.get('content-length') || '0'
          }
        }
      );
    }
  });
  
  next();
}

// Health check endpoints
export function healthzEndpoint(req: Request, res: Response) {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}

export async function readyzEndpoint(req: Request, res: Response) {
  const start = Date.now();
  
  try {
    // Check database connectivity (using your existing storage)
    const { storage } = await import('./storage');
    await storage.getDevices(); // Simple health check query
    
    const duration = Date.now() - start;
    trackPerformance('database_health_check', duration);
    
    const memUsage = process.memoryUsage();
    const healthResponse = { 
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ok',
        memory: {
          heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
          status: memUsage.heapUsed / 1024 / 1024 > PERFORMANCE_THRESHOLDS.HIGH_MEMORY_MB ? 'warning' : 'ok'
        }
      },
      performance: {
        uptime: process.uptime(),
        dbCheckDuration: duration
      }
    };
    
    structuredLog('info', 'Health check completed', {
      operation: 'health_check',
      duration,
      metadata: healthResponse
    });
    
    res.json(healthResponse);
  } catch (error) {
    const duration = Date.now() - start;
    
    trackError(error instanceof Error ? error : new Error(String(error)), {
      operation: 'database_health_check',
      duration
    });
    
    res.status(503).json({ 
      status: 'not ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'error'
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function metricsEndpoint(req: Request, res: Response) {
  try {
    res.set('Content-Type', client.register.contentType);
    const metrics = await client.register.metrics();
    res.send(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
}

// HoR-specific metric functions (from Windows batch patch translation)
export function incrementHorImport(crewId: string, format: 'csv' | 'json', count: number = 1) {
  horImportTotal.inc({ crew_id: crewId, format }, count);
}

export function incrementHorComplianceCheck(crewId: string, result: 'compliant' | 'violation') {
  horComplianceChecksTotal.inc({ crew_id: crewId, result });
}

export function incrementHorPdfExport(crewId: string) {
  horPdfExportsTotal.inc({ crew_id: crewId });
}

export function incrementIdempotencyHit(endpoint: string) {
  idempotencyHitsTotal.inc({ endpoint });
}

// ===== ENHANCED METRIC FUNCTIONS (from Windows batch patch translation) =====

// WebSocket metrics functions
export function setWebSocketConnections(count: number) {
  websocketConnectionsTotal.set(count);
}

export function incrementWebSocketMessage(type: string, channel?: string) {
  websocketMessagesTotal.inc({ type, channel: channel || 'default' });
}

export function incrementWebSocketReconnection(reason: string) {
  websocketReconnectionsTotal.inc({ reason });
}

// Equipment and fleet health functions
export function updateEquipmentHealthStatus(status: 'healthy' | 'warning' | 'critical', count: number, vesselId?: string) {
  equipmentHealthStatus.set({ status, vessel_id: vesselId || 'unknown' }, count);
}

export function updateFleetHealthScore(score: number) {
  fleetHealthScore.set(score);
}

export function recordPdmScore(equipmentId: string, score: number, vesselId?: string) {
  pdmScoresTotal.observe({ equipment_id: equipmentId, vessel_id: vesselId || 'unknown' }, score);
}

// Alert system functions
export function incrementAlertGenerated(type: string, equipmentId: string, severity: 'warning' | 'critical') {
  alertsGeneratedTotal.inc({ type, equipment_id: equipmentId, severity });
}

export function incrementAlertAcknowledged(equipmentId: string) {
  alertsAcknowledgedTotal.inc({ equipment_id: equipmentId });
}

export function setAlertConfigurations(count: number) {
  alertConfigurationsTotal.set(count);
}

// Telemetry processing functions
export function incrementTelemetryProcessed(equipmentId: string, sensorType: string, vesselId?: string) {
  telemetryProcessedTotal.inc({ equipment_id: equipmentId, sensor_type: sensorType, vessel_id: vesselId || 'unknown' });
}

export function incrementTelemetryError(errorType: string, equipmentId: string) {
  telemetryErrorsTotal.inc({ error_type: errorType, equipment_id: equipmentId });
}

// Business logic functions
export function incrementWorkOrder(status: string, priority: string, vesselId?: string) {
  workOrdersTotal.inc({ status, priority, vessel_id: vesselId || 'unknown' });
}

export function incrementMaintenanceSchedule(type: string, vesselId?: string) {
  maintenanceSchedulesTotal.inc({ type, vessel_id: vesselId || 'unknown' });
}

export function incrementVesselOperation(operation: string, vesselId: string) {
  vesselOperationsTotal.inc({ operation, vessel_id: vesselId });
}

// Database performance functions
export function recordDatabaseQuery(operation: string, table: string, durationMs: number) {
  const durationSeconds = durationMs / 1000;
  databaseQueryDuration.observe({ operation, table }, durationSeconds);
}

export function incrementDatabaseError(operation: string, errorType: string) {
  databaseErrorsTotal.inc({ operation, error_type: errorType });
}

// Range query functions (for new functionality)
export function incrementRangeQuery(queryType: string, vesselId?: string) {
  rangeQueriesTotal.inc({ query_type: queryType, vessel_id: vesselId || 'unknown' });
}

export function recordRangeQueryDuration(queryType: string, durationMs: number) {
  const durationSeconds = durationMs / 1000;
  rangeQueryDuration.observe({ query_type: queryType }, durationSeconds);
}

// ===== HUB & SYNC METRIC FUNCTIONS =====

// Device registry functions
export function incrementDeviceRegistryOperation(operation: 'create' | 'update' | 'list') {
  deviceRegistryOperationsTotal.inc({ operation });
}

export function setDeviceRegistryActiveDevices(count: number) {
  deviceRegistryActiveDevices.set(count);
}

// Sheet locking functions
export function incrementSheetLockOperation(operation: 'acquire' | 'release' | 'check', crewId: string) {
  sheetLockOperationsTotal.inc({ operation, crew_id: crewId });
}

export function setSheetLocksActive(count: number) {
  sheetLocksActive.set(count);
}

// Sheet versioning functions
export function incrementSheetVersionOperation(operation: 'increment' | 'check', crewId: string) {
  sheetVersionOperationsTotal.inc({ operation, crew_id: crewId });
}

export function setSheetVersionsTotal(count: number) {
  sheetVersionsTotal.set(count);
}

// Replay helper functions
export function incrementReplayOperation(deviceId: string, endpoint: string) {
  replayOperationsTotal.inc({ device_id: deviceId, endpoint });
}

export function incrementReplayDuplicate(deviceId: string, endpoint: string) {
  replayDuplicatesTotal.inc({ device_id: deviceId, endpoint });
}

// MQTT Reliable Sync metric functions
export function incrementMqttMessagesPublished(entityType: string, operation: string, qos: number) {
  mqttMessagesPublishedTotal.inc({ entity_type: entityType, operation, qos: qos.toString() });
}

export function incrementMqttMessagesQueued() {
  mqttMessagesQueuedTotal.inc();
}

export function incrementMqttMessagesDropped() {
  mqttMessagesDroppedTotal.inc();
}

export function incrementMqttPublishFailures() {
  mqttPublishFailuresTotal.inc();
}

export function incrementMqttReconnectionAttempts() {
  mqttReconnectionAttemptsTotal.inc();
}

export function incrementMqttQueueFlushes() {
  mqttQueueFlushesTotal.inc();
}

export function setMqttQueueDepth(depth: number) {
  mqttQueueDepthGauge.set(depth);
}

export function setMqttQueueUtilization(percent: number) {
  mqttQueueUtilizationGauge.set(percent);
}

export function setMqttConnectionStatus(connected: boolean) {
  mqttConnectionStatusGauge.set(connected ? 1 : 0);
}

export function updateMqttMetrics(metrics: {
  messagesPublished?: number;
  messagesQueued?: number;
  messagesDropped?: number;
  publishFailures?: number;
  reconnectionAttempts?: number;
  queueFlushes?: number;
  currentQueueSize?: number;
  queueUtilization?: number;
  isConnected?: boolean;
}) {
  if (metrics.currentQueueSize !== undefined) {
    mqttQueueDepthGauge.set(metrics.currentQueueSize);
  }
  if (metrics.queueUtilization !== undefined) {
    mqttQueueUtilizationGauge.set(metrics.queueUtilization);
  }
  if (metrics.isConnected !== undefined) {
    mqttConnectionStatusGauge.set(metrics.isConnected ? 1 : 0);
  }
}

// Performance alerting thresholds
const PERFORMANCE_THRESHOLDS = {
  SLOW_REQUEST_MS: 1000,
  VERY_SLOW_REQUEST_MS: 5000,
  HIGH_ERROR_RATE_PERCENT: 5,
  CRITICAL_ERROR_RATE_PERCENT: 10,
  HIGH_MEMORY_MB: 512,
  CRITICAL_MEMORY_MB: 1024
};

// Structured logging for production
interface LogContext {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  service: string;
  version?: string;
  requestId?: string;
  userId?: string;
  operation?: string;
  duration?: number;
  statusCode?: number;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  metadata?: Record<string, any>;
}

export function structuredLog(level: LogContext['level'], message: string, context: Partial<LogContext> = {}) {
  const logEntry: LogContext = {
    timestamp: new Date().toISOString(),
    level,
    service: 'arus-api',
    version: process.env.npm_package_version || '1.0.0',
    ...context
  };

  if (process.env.NODE_ENV === 'production') {
    // JSON logging for production (easier to parse by log aggregators)
    console.log(JSON.stringify({ message, ...logEntry }));
  } else {
    // Human-readable logging for development
    const prefix = `[${level.toUpperCase()}] ${logEntry.timestamp}`;
    const suffix = logEntry.duration ? ` (${logEntry.duration}ms)` : '';
    console.log(`${prefix} ${message}${suffix}`, logEntry.metadata ? logEntry.metadata : '');
  }
}

// Performance monitoring and alerting
export function trackPerformance(operation: string, duration: number, context: Partial<LogContext> = {}) {
  // Log slow operations
  if (duration > PERFORMANCE_THRESHOLDS.SLOW_REQUEST_MS) {
    const level = duration > PERFORMANCE_THRESHOLDS.VERY_SLOW_REQUEST_MS ? 'error' : 'warn';
    structuredLog(level, `Slow ${operation} detected`, {
      operation,
      duration,
      threshold: PERFORMANCE_THRESHOLDS.SLOW_REQUEST_MS,
      ...context
    });
  }
  
  // Update performance metrics
  if (operation.startsWith('database_')) {
    databaseQueryDuration.observe({ operation: operation.replace('database_', ''), table: context.metadata?.table || 'unknown' }, duration / 1000);
  }
}

// Memory monitoring
let lastMemoryCheck = 0;
const MEMORY_CHECK_INTERVAL = 30000; // 30 seconds

export function checkResourceUsage() {
  const now = Date.now();
  if (now - lastMemoryCheck < MEMORY_CHECK_INTERVAL) return;
  
  lastMemoryCheck = now;
  const memUsage = process.memoryUsage();
  const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  
  // Alert on high memory usage
  if (memUsedMB > PERFORMANCE_THRESHOLDS.HIGH_MEMORY_MB) {
    const level = memUsedMB > PERFORMANCE_THRESHOLDS.CRITICAL_MEMORY_MB ? 'error' : 'warn';
    structuredLog(level, `High memory usage detected`, {
      operation: 'memory_check',
      metadata: {
        heapUsedMB: memUsedMB,
        heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
        rssUsedMB: Math.round(memUsage.rss / 1024 / 1024),
        threshold: PERFORMANCE_THRESHOLDS.HIGH_MEMORY_MB
      }
    });
  }
}

// Enhanced error tracking
export function trackError(error: Error, context: Partial<LogContext> = {}) {
  structuredLog('error', `${error.message}`, {
    error: {
      message: error.message,
      stack: error.stack,
      code: (error as any).code || 'UNKNOWN'
    },
    ...context
  });
  
  // Update error metrics
  if (context.operation) {
    if (context.operation.startsWith('database_')) {
      databaseErrorsTotal.inc({ 
        operation: context.operation.replace('database_', ''), 
        error_type: (error as any).code || 'unknown' 
      });
    }
  }
}

// Initialize default metrics collection
export function initializeMetrics() {
  // Collect default Node.js metrics
  client.collectDefaultMetrics({
    prefix: 'arus_',
    gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
  });
  
  structuredLog('info', 'Observability metrics initialized', {
    operation: 'startup',
    metadata: { 
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    }
  });
  
  // Start periodic resource monitoring
  setInterval(checkResourceUsage, MEMORY_CHECK_INTERVAL);
}