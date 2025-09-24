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

// Middleware for request tracking
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  // Track when response finishes
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const labels = {
      method: req.method,
      path: req.route?.path || req.path,
      status_code: res.statusCode.toString()
    };
    
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, duration);
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
  try {
    // Check database connectivity (using your existing storage)
    const { storage } = await import('./storage');
    await storage.getDevices(); // Simple health check query
    
    res.json({ 
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ok'
      }
    });
  } catch (error) {
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

// Initialize default metrics collection
export function initializeMetrics() {
  // Collect default Node.js metrics
  client.collectDefaultMetrics({
    prefix: 'arus_',
    gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
  });
  
  console.log('Observability metrics initialized');
}