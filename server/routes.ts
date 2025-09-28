import type { Express } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import { ipKeyGenerator } from "express-rate-limit";
import { storage } from "./storage";
import { TelemetryWebSocketServer } from "./websocket";
import { computeInsights, persistSnapshot, getLatestSnapshot } from "./insights-engine";
import { triggerInsightsGeneration, getInsightsJobStats } from "./insights-scheduler";
import { 
  metricsMiddleware, 
  healthzEndpoint, 
  readyzEndpoint, 
  metricsEndpoint,
  initializeMetrics,
  incrementHorImport,
  incrementHorComplianceCheck,
  incrementHorPdfExport,
  incrementIdempotencyHit,
  // Enhanced metrics functions
  incrementTelemetryProcessed,
  incrementTelemetryError,
  incrementAlertGenerated,
  incrementAlertAcknowledged,
  incrementWorkOrder,
  incrementMaintenanceSchedule,
  incrementVesselOperation,
  incrementRangeQuery,
  recordRangeQueryDuration,
  updateEquipmentHealthStatus,
  updateFleetHealthScore,
  recordPdmScore
} from "./observability";
import { 
  safeDbOperation, 
  safeExternalOperation, 
  gracefulFallbacks,
  getErrorHandlingHealth,
  circuitBreaker
} from "./error-handling";
import { 
  insertDeviceSchema, 
  insertHeartbeatSchema, 
  insertPdmScoreSchema, 
  insertWorkOrderSchema,
  insertSettingsSchema,
  insertTelemetrySchema,
  insertAlertConfigSchema,
  insertAlertNotificationSchema,
  insertMaintenanceScheduleSchema,
  insertMaintenanceRecordSchema,
  insertMaintenanceCostSchema,
  insertEquipmentLifecycleSchema,
  insertPerformanceMetricSchema,
  insertRawTelemetrySchema,
  insertTransportSettingsSchema,
  // Enhanced query parameter validation schemas
  telemetryQuerySchema,
  equipmentIdQuerySchema,
  maintenanceQuerySchema,
  vesselQuerySchema,
  timeRangeQuerySchema,
  horQuerySchema,
  rangeQuerySchema,
  insertAlertSuppressionSchema,
  insertAlertCommentSchema,
  insertSensorConfigSchema,
  insertSensorStateSchema,
  insertComplianceAuditLogSchema,
  insertCrewSchema,
  insertCrewSkillSchema,
  insertSkillSchema,
  insertCrewLeaveSchema,
  insertShiftTemplateSchema,
  insertCrewAssignmentSchema,
  insertCrewCertificationSchema,
  insertPortCallSchema,
  insertDrydockWindowSchema,
  insertCrewRestSheetSchema,
  insertCrewRestDaySchema,
  insertVesselSchema,
  // Hub & Sync schemas
  insertDeviceRegistrySchema,
  insertReplayIncomingSchema,
  insertSheetLockSchema,
  insertSheetVersionSchema,
  insertStorageConfigSchema,
  insertOpsDbStagedSchema,
  // PdM Pack validation schemas
  pdmOrgIdHeaderSchema,
  pdmBaselineUpdateSchema,
  pdmBearingAnalysisSchema,
  pdmPumpAnalysisSchema,
  pdmAlertsQuerySchema
} from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import { storageConfigService, opsDbService } from "./storage-config";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { beastModeRouter } from "./beast-mode-routes";
import type { EquipmentTelemetry } from "@shared/schema";
import { createHmac, timingSafeEqual } from "crypto";
import { 
  getDatabaseHealth,
  enableTimescaleDB,
  createHypertable,
  createContinuousAggregate,
  applyTelemetryRetention,
  getRetentionPolicy,
  updateRetentionPolicy,
  enableCompression
} from "./db-utils";
import * as csvWriter from "csv-writer";
import { analyzeFleetHealth, analyzeEquipmentHealth } from "./openai";
import { planShifts } from "./crew-scheduler";
import { planWithEngine, ConstraintScheduleRequest, ENGINE_GREEDY, ENGINE_OR_TOOLS } from "./crew-scheduler-ortools";
import { checkMonthCompliance, normalizeRestDays, type RestDay } from "./stcw-compliance";
import { renderRestPdf, generatePdfFilename } from "./stcw-pdf-generator";
import { 
  getDatabasePerformanceHealth, 
  getIndexOptimizationSuggestions,
  monitoredQuery,
  startPerformanceMonitoring 
} from "./db-performance";
import {
  createFullBackup,
  createSchemaBackup,
  listBackups,
  cleanupOldBackups,
  verifyBackupIntegrity,
  getBackupStatus
} from "./backup-recovery";
import { createGraphQLServer, GRAPHQL_FEATURES } from './graphql-server';
import { externalMarineDataService } from './external-integrations';

// Global WebSocket server reference for broadcasting
let wsServerInstance: any = null;

// AI insights throttling cache (equipment + sensor type -> last run timestamp)
const aiInsightsCache = new Map<string, number>();
const AI_INSIGHTS_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes throttle per equipment/sensor

// Rate limiting configurations for different endpoint types
const telemetryRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 120, // Allow 120 readings per minute (2 per second) per IP - suitable for edge devices
  message: {
    error: "Too many telemetry requests. Marine equipment should limit data transmission to 2 readings per second maximum.",
    code: "RATE_LIMIT_TELEMETRY"
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Remove custom keyGenerator to use default IP-based limiting with proper IPv6 support
});

const bulkImportRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minute window
  max: 10, // Allow 10 bulk imports per 5 minutes - prevents abuse
  message: {
    error: "Too many bulk import requests. Bulk telemetry imports are limited to prevent system overload.",
    code: "RATE_LIMIT_BULK_IMPORT"
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IPv6-compatible IP + User-Agent for unique identification
    const ip = ipKeyGenerator(req);
    const userAgent = req.get('User-Agent')?.slice(0, 50) || 'unknown';
    return `${ip}-${userAgent}`;
  }
});

const generalApiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 300, // Allow 300 requests per minute - generous for dashboard usage
  message: {
    error: "Too many API requests. Please reduce request frequency.",
    code: "RATE_LIMIT_GENERAL"
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IPv6-compatible IP + User-Agent for unique identification
    const ip = ipKeyGenerator(req);
    const userAgent = req.get('User-Agent')?.slice(0, 50) || 'unknown';
    return `${ip}-${userAgent}`;
  }
});

// Write operation rate limits - different limits for different operation types
const writeOperationRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 60, // Allow 60 write operations per minute - reasonable for user operations
  message: {
    error: "Too many write operations. Please slow down data modifications.",
    code: "RATE_LIMIT_WRITE_OPERATIONS"
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IPv6-compatible IP + User-Agent for unique identification
    const ip = ipKeyGenerator(req);
    const userAgent = req.get('User-Agent')?.slice(0, 50) || 'unknown';
    return `${ip}-${userAgent}`;
  }
});

const criticalOperationRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minute window  
  max: 20, // Allow 20 critical operations per 5 minutes - very restrictive for dangerous ops
  message: {
    error: "Too many critical operations. Critical system operations are heavily rate limited for safety.",
    code: "RATE_LIMIT_CRITICAL_OPERATIONS"
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IPv6-compatible IP + User-Agent for unique identification
    const ip = ipKeyGenerator(req);
    const userAgent = req.get('User-Agent')?.slice(0, 50) || 'unknown';
    return `${ip}-${userAgent}`;
  }
});

const crewOperationRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 30, // Allow 30 crew operations per minute - moderate for crew management
  message: {
    error: "Too many crew operations. Please slow down crew management activities.",
    code: "RATE_LIMIT_CREW_OPERATIONS"
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IPv6-compatible IP + User-Agent for unique identification
    const ip = ipKeyGenerator(req);
    const userAgent = req.get('User-Agent')?.slice(0, 50) || 'unknown';
    return `${ip}-${userAgent}`;
  }
});

const reportGenerationRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minute window
  max: 10, // Allow 10 report generations per 5 minutes - resource intensive
  message: {
    error: "Too many report generation requests. AI-powered reports are limited to prevent resource exhaustion.",
    code: "RATE_LIMIT_REPORT_GENERATION"
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IPv6-compatible IP + User-Agent for unique identification
    const ip = ipKeyGenerator(req);
    const userAgent = req.get('User-Agent')?.slice(0, 50) || 'unknown';
    return `${ip}-${userAgent}`;
  }
});

// HMAC Validation Middleware for Telemetry Endpoints
async function validateHMAC(req: any, res: any, next: any) {
  try {
    // Check if HMAC is required globally
    const settings = await storage.getSettings();
    if (!settings.hmacRequired) {
      // HMAC validation is disabled - allow request to proceed
      return next();
    }

    // Extract equipment ID from request body, headers, or telemetry import rows
    let equipmentId = req.body?.equipmentId || req.headers['x-equipment-id'];
    
    // For telemetry import endpoints, check if equipmentId is in the rows or CSV data
    if (!equipmentId && req.body?.rows && Array.isArray(req.body.rows) && req.body.rows.length > 0) {
      equipmentId = req.body.rows[0]?.src; // Use first row's src as equipment ID
    }
    
    // For CSV import, parse the CSV data to extract equipment ID
    if (!equipmentId && req.body?.csvData && typeof req.body.csvData === 'string') {
      const csvLines = req.body.csvData.trim().split('\n');
      if (csvLines.length > 1) {
        const headerLine = csvLines[0];
        const dataLine = csvLines[1];
        const headers = headerLine.split(',').map((h: string) => h.trim());
        const values = dataLine.split(',').map((v: string) => v.trim());
        const srcIndex = headers.indexOf('src');
        if (srcIndex >= 0 && values[srcIndex]) {
          equipmentId = values[srcIndex];
        }
      }
    }
    if (!equipmentId) {
      return res.status(400).json({
        error: "Equipment ID required for HMAC validation",
        code: "MISSING_EQUIPMENT_ID"
      });
    }

    // Get the device and its HMAC key
    const device = await storage.getDevice(equipmentId);
    if (!device || !device.hmacKey) {
      return res.status(401).json({
        error: "Device not found or HMAC key not configured",
        code: "HMAC_KEY_MISSING"
      });
    }

    // Extract HMAC signature from headers
    const signature = req.headers['x-hmac-signature'] || req.headers['authorization']?.replace('HMAC ', '');
    if (!signature) {
      return res.status(401).json({
        error: "HMAC signature required in X-HMAC-Signature header or Authorization header",
        code: "MISSING_HMAC_SIGNATURE"
      });
    }

    // Generate expected HMAC signature
    const payload = JSON.stringify(req.body);
    const expectedSignature = createHmac('sha256', device.hmacKey)
      .update(payload)
      .digest('hex');

    // Compare signatures using timing-safe comparison
    const providedSignature = signature.toLowerCase().replace(/^sha256=/, '');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const providedBuffer = Buffer.from(providedSignature, 'hex');

    if (expectedBuffer.length !== providedBuffer.length || !timingSafeEqual(expectedBuffer, providedBuffer)) {
      return res.status(401).json({
        error: "Invalid HMAC signature",
        code: "INVALID_HMAC_SIGNATURE"
      });
    }

    // HMAC validation passed
    next();
  } catch (error) {
    console.error('HMAC validation error:', error);
    res.status(500).json({
      error: "HMAC validation failed",
      code: "HMAC_VALIDATION_ERROR"
    });
  }
}

// Alert processing function
export async function checkAndCreateAlerts(telemetryReading: EquipmentTelemetry): Promise<void> {
  // Get all alert configurations for this equipment and sensor type
  const alertConfigs = await storage.getAlertConfigurations(telemetryReading.equipmentId);
  
  const matchingConfigs = alertConfigs.filter(config => 
    config.enabled && 
    config.sensorType.toLowerCase().trim() === telemetryReading.sensorType.toLowerCase().trim()
  );
  
  for (const config of matchingConfigs) {
    let alertTriggered = false;
    let alertType = "";
    let threshold = 0;
    
    // Define sensor types where "low is bad" (reduced values indicate problems)
    // TODO: Consider adding explicit direction field to AlertConfiguration for better maintainability
    const LOW_IS_BAD_SENSORS = new Set([
      "flow_rate", "flow", "pressure", "level", "efficiency", "power_output",
      "fuel_level", "fuel_pressure", "oil_pressure", "lube_oil_pressure", 
      "coolant_level", "coolant_pressure", "hydraulic_pressure", "battery_level",
      "water_level", "tank_level", "vacuum", "suction_pressure", "rpm_efficiency",
      "capacity", "throughput", "output", "performance", "availability"
    ]);
    
    // Determine if this is a "low is bad" metric based on sensor type and threshold configuration
    let isLowIsBad = LOW_IS_BAD_SENSORS.has(config.sensorType.toLowerCase().trim());
    
    // If both thresholds present, validate they align with expected direction
    if (config.criticalThreshold != null && config.warningThreshold != null) {
      const thresholdOrderIndicatesLowIsBad = config.criticalThreshold < config.warningThreshold;
      if (isLowIsBad !== thresholdOrderIndicatesLowIsBad) {
        console.warn(`Threshold order mismatch for ${config.equipmentId} ${config.sensorType}: expected ${isLowIsBad ? 'critical < warning' : 'critical > warning'}`);
      }
      // Use threshold order as definitive indicator when both are present
      isLowIsBad = thresholdOrderIndicatesLowIsBad;
    }
    
    if (isLowIsBad) {
      // For "low is bad" metrics (flow_rate, pressure): trigger when value <= thresholds
      // Check critical threshold first (lower value, higher priority)
      if (config.criticalThreshold != null && telemetryReading.value <= config.criticalThreshold) {
        alertTriggered = true;
        alertType = "critical";
        threshold = config.criticalThreshold;
      }
      // Check warning threshold if no critical alert
      else if (config.warningThreshold != null && telemetryReading.value <= config.warningThreshold) {
        alertTriggered = true;
        alertType = "warning";
        threshold = config.warningThreshold;
      }
    } else {
      // For "high is bad" metrics (temperature, vibration): trigger when value >= thresholds
      // Check critical threshold first (higher value, higher priority)
      if (config.criticalThreshold != null && telemetryReading.value >= config.criticalThreshold) {
        alertTriggered = true;
        alertType = "critical";
        threshold = config.criticalThreshold;
      }
      // Check warning threshold if no critical alert
      else if (config.warningThreshold != null && telemetryReading.value >= config.warningThreshold) {
        alertTriggered = true;
        alertType = "warning";
        threshold = config.warningThreshold;
      }
    }
    
    if (alertTriggered) {
      // Check if this alert type is currently suppressed
      const isSuppressed = await storage.isAlertSuppressed(
        telemetryReading.equipmentId,
        telemetryReading.sensorType,
        alertType
      );
      
      if (isSuppressed) {
        // Log suppressed alert for monitoring
        const directionText = isLowIsBad ? "at or below" : "at or above";
        const message = `${telemetryReading.sensorType} ${alertType} alert: Value ${telemetryReading.value} is ${directionText} ${alertType} threshold of ${threshold}`;
        console.log(`Alert suppressed: ${message}`);
        continue;
      }
      
      // Check if we already have a recent unacknowledged alert for this equipment/sensor/type
      // to prevent spam (within last 10 minutes) - optimized database query
      const hasRecentAlert = await storage.hasRecentAlert(
        telemetryReading.equipmentId,
        telemetryReading.sensorType,
        alertType,
        10
      );
      
      if (!hasRecentAlert) {
        // Create new alert notification
        const directionText = isLowIsBad ? "at or below" : "at or above";
        const message = `${telemetryReading.sensorType} ${alertType} alert: Value ${telemetryReading.value} is ${directionText} ${alertType} threshold of ${threshold}`;
        
        const newAlert = await storage.createAlertNotification({
          orgId: telemetryReading.orgId || 'default-org-id',
          equipmentId: telemetryReading.equipmentId,
          sensorType: telemetryReading.sensorType,
          alertType,
          message,
          value: telemetryReading.value,
          threshold
        });
        
        // Record alert generation metric (enhanced observability)
        incrementAlertGenerated(telemetryReading.sensorType, telemetryReading.equipmentId, alertType as 'warning' | 'critical');
        
        // Broadcast alert via WebSocket
        if (wsServerInstance) {
          wsServerInstance.broadcastAlert(newAlert);
        }
        
        // Log alert generation for monitoring
      }
    }
  }
}

// Sensor configuration processing function
interface ProcessedTelemetryResult {
  shouldKeep: boolean;
  processedValue: number | null;
  flags: string[];
  ema: number | null;
}

async function applySensorConfiguration(
  equipmentId: string, 
  sensorType: string, 
  value: number | null, 
  unit: string | null,
  orgId: string = 'default-org-id'
): Promise<ProcessedTelemetryResult> {
  // Allow null values to pass through unchanged (sensor offline/no data states)
  if (value == null) {
    return { shouldKeep: true, processedValue: value, flags: ['null_value'], ema: null };
  }

  // Get sensor configuration
  const config = await storage.getSensorConfiguration(equipmentId, sensorType, orgId);
  const state = await storage.getSensorState(equipmentId, sensorType, orgId);
  
  let processedValue = Number(value);
  const flags: string[] = [];
  
  // Check if sensor is disabled
  if (config?.enabled === false) {
    return { shouldKeep: false, processedValue, flags: ['disabled'], ema: state?.ema ?? null };
  }
  
  // Apply scaling (gain and offset)
  if (config) {
    const gain = config.gain ?? 1.0;
    const offset = config.offset ?? 0.0;
    processedValue = processedValue * gain + offset;
  }
  
  // Validation range check
  if (config?.minValid != null && processedValue < config.minValid) {
    flags.push('below_min');
  }
  if (config?.maxValid != null && processedValue > config.maxValid) {
    flags.push('above_max');
  }
  
  // Deadband filtering
  if (config?.deadband != null && state?.lastValue != null) {
    if (Math.abs(processedValue - state.lastValue) < config.deadband) {
      return { shouldKeep: false, processedValue: state.lastValue, flags: ['deadband'], ema: state?.ema ?? null };
    }
  }
  
  // Enhanced threshold checking with hysteresis
  if (config) {
    const hysteresis = config.hysteresis ?? 0.0;
    
    // Check critical thresholds
    if (config.critHi != null && processedValue >= config.critHi) {
      flags.push('crit_hi');
    }
    if (config.critLo != null && processedValue <= config.critLo) {
      flags.push('crit_lo');
    }
    
    // Check warning thresholds (with hysteresis to prevent overlap with critical)
    if (config.warnHi != null && (config.critHi == null || processedValue < config.critHi - hysteresis)) {
      if (processedValue >= config.warnHi) {
        flags.push('warn_hi');
      }
    }
    if (config.warnLo != null && (config.critLo == null || processedValue > config.critLo + hysteresis)) {
      if (processedValue <= config.warnLo) {
        flags.push('warn_lo');
      }
    }
  }
  
  // EMA calculation
  let ema = state?.ema ?? null;
  if (config?.emaAlpha != null && config.emaAlpha > 0 && config.emaAlpha < 1) {
    const alpha = config.emaAlpha;
    ema = (ema == null) ? processedValue : (alpha * processedValue + (1 - alpha) * ema);
  }
  
  // Update sensor state
  await storage.upsertSensorState({
    equipmentId,
    sensorType,
    lastValue: processedValue,
    ema,
    lastTs: new Date()
  });
  
  return { shouldKeep: true, processedValue, flags, ema };
}

// AI-powered maintenance insights function
async function generateAIInsights(telemetryReading: EquipmentTelemetry): Promise<void> {
  try {
    // Check if AI insights are enabled
    const settings = await storage.getSettings();
    if (!settings?.llmEnabled) {
      return; // AI insights disabled
    }

    // Normalize sensor type for consistent matching
    const sensorType = telemetryReading.sensorType.toLowerCase();
    
    // Trigger AI analysis for critical conditions or anomalies
    const triggerConditions = [
      telemetryReading.status === 'critical',
      telemetryReading.status === 'warning' && sensorType.includes('temperature'),
      sensorType.includes('vibration') && telemetryReading.threshold != null && telemetryReading.value > telemetryReading.threshold * 0.8,
      sensorType.includes('pressure') && telemetryReading.status !== 'normal'
    ];

    if (triggerConditions.some(condition => condition)) {
      // Check throttling to prevent excessive AI API calls
      const throttleKey = `${telemetryReading.equipmentId}:${telemetryReading.sensorType}`;
      const lastRun = aiInsightsCache.get(throttleKey);
      const now = Date.now();
      
      if (lastRun && (now - lastRun) < AI_INSIGHTS_THROTTLE_MS) {
        // Skip AI insights - too soon since last run for this equipment/sensor
        return;
      }
      
      // Update throttle cache
      aiInsightsCache.set(throttleKey, now);
      // Import AI functions dynamically to avoid startup dependencies
      const { generateMaintenanceRecommendations } = await import("./openai");
      
      // Get device info for context
      const device = await storage.getDevice(telemetryReading.equipmentId);
      
      // Generate AI recommendations
      const recommendations = await generateMaintenanceRecommendations(
        telemetryReading.status === 'critical' ? 'critical_threshold' : 'warning_threshold',
        telemetryReading.equipmentId,
        {
          sensorType: telemetryReading.sensorType,
          currentValue: telemetryReading.value,
          threshold: telemetryReading.threshold,
          unit: telemetryReading.unit,
          status: telemetryReading.status
        },
        device?.vessel || undefined
      );

      // Broadcast AI insights via WebSocket if severity is high enough
      if (recommendations.severity === 'critical' || recommendations.severity === 'high') {
        if (wsServerInstance) {
          // Use existing broadcastAlert method with AI insights type
          wsServerInstance.broadcastAlert({
            type: 'ai_maintenance_recommendation',
            equipmentId: telemetryReading.equipmentId,
            recommendations,
            telemetryContext: {
              sensorType: telemetryReading.sensorType,
              value: telemetryReading.value,
              status: telemetryReading.status
            },
            timestamp: new Date().toISOString()
          });
        }
      }

      console.log(`AI insights generated for ${telemetryReading.equipmentId}:`, {
        severity: recommendations.severity,
        urgency: recommendations.urgency,
        title: recommendations.title
      });
    }
  } catch (error) {
    // Don't fail telemetry processing if AI insights fail
    console.error(`AI insights generation failed for ${telemetryReading.equipmentId}:`, {
      error: error instanceof Error ? error.message : String(error),
      sensorType: telemetryReading.sensorType,
      value: telemetryReading.value
    });
  }
}

// Automatic maintenance scheduling function based on health/PdM data
async function checkAndScheduleAutomaticMaintenance(telemetryReading: EquipmentTelemetry): Promise<void> {
  // Check if this is health-related telemetry that should trigger maintenance scheduling
  const healthSensorTypes = ['health_index', 'pdm_score', 'failure_risk', 'condition_score'];
  
  if (healthSensorTypes.includes(telemetryReading.sensorType.toLowerCase())) {
    // Normalize telemetry value to health score (0-100 scale)
    let healthScore = telemetryReading.value;
    
    // Apply proper normalization based on sensor type
    const sensorType = telemetryReading.sensorType.toLowerCase();
    if (sensorType === 'failure_risk') {
      // Failure risk is 0-1 scale, convert to health score (100-0 scale)
      healthScore = Math.max(0, Math.min(100, (1 - telemetryReading.value) * 100));
    } else if (sensorType === 'pdm_score') {
      // PdM score might be 0-1 or 0-100, normalize to 0-100
      if (telemetryReading.value <= 1.0) {
        // Assume 0-1 scale (probability), convert to health percentage
        healthScore = Math.max(0, Math.min(100, (1 - telemetryReading.value) * 100));
      } else {
        // Assume already 0-100 scale
        healthScore = Math.max(0, Math.min(100, telemetryReading.value));
      }
    } else {
      // health_index, condition_score - assume 0-100 scale
      healthScore = Math.max(0, Math.min(100, telemetryReading.value));
    }
    
    // Check if we already have recent auto-scheduled maintenance for this equipment
    // to prevent duplicate scheduling (within last 24 hours)
    const equipmentSchedules = await storage.getMaintenanceSchedules(telemetryReading.equipmentId);
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
    
    const hasRecentAutoSchedule = equipmentSchedules.some(schedule => {
      const scheduleCreatedAt = schedule.createdAt ? schedule.createdAt.getTime() : 0;
      return schedule.autoGenerated && 
             schedule.status === 'scheduled' &&
             scheduleCreatedAt > cutoffTime;
    });
    
    if (!hasRecentAutoSchedule) {
      // Attempt automatic scheduling based on health score
      const newSchedule = await storage.autoScheduleMaintenance(telemetryReading.equipmentId, healthScore);
      
      if (newSchedule) {
        // Broadcast new maintenance schedule via WebSocket using same pattern as alerts
        if (wsServerInstance && wsServerInstance.broadcastAlert) {
          // Use alert broadcast pattern for consistency
          wsServerInstance.broadcastAlert({
            type: 'maintenance_scheduled',
            equipmentId: telemetryReading.equipmentId,
            scheduleId: newSchedule.id,
            priority: newSchedule.priority,
            scheduledDate: newSchedule.scheduledDate,
            message: `Automatic maintenance scheduled for ${telemetryReading.equipmentId}`
          });
        }
        
        // Log automatic scheduling for monitoring
      }
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize metrics collection
  initializeMetrics();

  // Add metrics middleware to track all requests
  app.use(metricsMiddleware);

  // Observability endpoints (no rate limiting)
  app.get('/api/healthz', healthzEndpoint);
  app.get('/api/readyz', readyzEndpoint);
  
  // Error handling health endpoint
  app.get('/api/error-health', (req, res) => {
    try {
      const errorHandlingHealth = getErrorHandlingHealth();
      res.json({
        ...errorHandlingHealth,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get error handling health',
        timestamp: new Date().toISOString()
      });
    }
  });  
  app.get('/api/metrics', metricsEndpoint);

  // Scalability and load balancer health endpoints
  app.get("/api/health/scalability", generalApiRateLimit, async (req, res) => {
    try {
      const { getLoadBalancerHealth } = await import("./scalability");
      res.json(getLoadBalancerHealth());
    } catch (error) {
      res.status(500).json({ message: "Failed to get scalability health" });
    }
  });

  app.get("/api/health/background-jobs", generalApiRateLimit, async (req, res) => {
    try {
      const { jobQueue } = await import("./background-jobs");
      res.json({
        status: 'active',
        timestamp: new Date().toISOString(),
        statistics: jobQueue.getStats(),
        recentJobs: jobQueue.getRecentJobs(10)
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get background job status" });
    }
  });

  app.get("/api/health/cache", generalApiRateLimit, async (req, res) => {
    try {
      const { cache } = await import("./scalability");
      res.json({
        status: 'active',
        timestamp: new Date().toISOString(),
        statistics: cache.getStats()
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get cache status" });
    }
  });

  // Health check (legacy endpoint)
  app.get("/api/health", async (req, res) => {
    res.json({ 
      ok: true, 
      timestamp: new Date().toISOString(),
      service: "arus-api"
    });
  });

  // Dashboard metrics
  app.get("/api/dashboard", async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      
      // Update fleet health score metric (enhanced observability)
      if (metrics.fleetHealth !== undefined) {
        updateFleetHealthScore(metrics.fleetHealth);
      }
      
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  // Vessel-centric fleet overview (Option A extension)
  app.get("/api/fleet/overview", async (req, res) => {
    try {
      const orgId = req.query.orgId as string | undefined;
      const overview = await storage.getVesselFleetOverview(orgId);
      res.json(overview);
    } catch (error) {
      console.error("Failed to fetch vessel fleet overview:", error);
      res.status(500).json({ message: "Failed to fetch vessel fleet overview" });
    }
  });

  // Latest telemetry readings (Option A extension)
  app.get("/api/telemetry/latest", async (req, res) => {
    try {
      const vesselId = req.query.vesselId as string | undefined;
      const equipmentId = req.query.equipmentId as string | undefined;
      const sensorType = req.query.sensorType as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 500;
      
      console.log("Fetching latest telemetry readings with params:", { vesselId, equipmentId, sensorType, limit });
      
      const readings = await storage.getLatestTelemetryReadings(vesselId, equipmentId, sensorType, limit);
      
      console.log("Successfully fetched", readings.length, "telemetry readings");
      res.json(readings);
    } catch (error) {
      console.error("Failed to fetch latest telemetry readings:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ 
        message: "Failed to fetch latest telemetry readings",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Devices
  app.get("/api/devices", async (req, res) => {
    try {
      // Enhanced error handling with proper graceful degradation
      const devices = await safeDbOperation(
        () => storage.getDevicesWithStatus(),
        'getDevicesWithStatus',
        // Proper fallback with cached/default data instead of more DB calls
        async () => {
          // Return default device structure when database is unavailable
          return [{
            id: 'ENG001',
            orgId: 'default-org-id',
            equipmentId: 'ENG001', 
            name: 'Primary Engine',
            type: 'engine',
            vessel: 'MV Green Belle',
            status: 'unknown' as const,
            lastSeen: null,
            isOnline: false
          }];
        }
      );
      res.json(devices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch devices" });
    }
  });

  app.get("/api/devices/:id", async (req, res) => {
    try {
      const device = await storage.getDevice(req.params.id);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      res.json(device);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch device" });
    }
  });

  app.post("/api/devices", writeOperationRateLimit, async (req, res) => {
    try {
      const deviceData = insertDeviceSchema.parse(req.body);
      const device = await storage.createDevice(deviceData);
      res.status(201).json(device);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid device data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create device" });
    }
  });

  app.put("/api/devices/:id", writeOperationRateLimit, async (req, res) => {
    try {
      const deviceData = insertDeviceSchema.partial().parse(req.body);
      const device = await storage.updateDevice(req.params.id, deviceData);
      res.json(device);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid device data", errors: error.errors });
      }
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update device" });
    }
  });

  app.delete("/api/devices/:id", criticalOperationRateLimit, async (req, res) => {
    try {
      await storage.deleteDevice(req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete device" });
    }
  });

  // Edge heartbeats
  app.get("/api/edge/heartbeats", async (req, res) => {
    try {
      const heartbeats = await storage.getHeartbeats();
      res.json(heartbeats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch heartbeats" });
    }
  });

  app.post("/api/edge/heartbeat", telemetryRateLimit, validateHMAC, async (req, res) => {
    try {
      const heartbeatData = insertHeartbeatSchema.parse(req.body);
      const heartbeat = await storage.upsertHeartbeat(heartbeatData);
      res.json(heartbeat);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid heartbeat data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to process heartbeat" });
    }
  });

  // PdM scoring
  app.get("/api/pdm/scores", async (req, res) => {
    try {
      // Enhanced query validation (Task 16)
      const queryValidation = equipmentIdQuerySchema.parse(req.query);
      const { equipmentId } = queryValidation;
      
      const scores = await storage.getPdmScores(equipmentId);
      res.json(scores);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid query parameters", 
          errors: error.errors,
          code: "VALIDATION_ERROR"
        });
      }
      res.status(500).json({ message: "Failed to fetch PdM scores" });
    }
  });

  app.get("/api/pdm/scores/:equipmentId/latest", async (req, res) => {
    try {
      const score = await storage.getLatestPdmScore(req.params.equipmentId);
      if (!score) {
        return res.status(404).json({ message: "No PdM score found for equipment" });
      }
      res.json(score);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch latest PdM score" });
    }
  });

  app.post("/api/pdm/scores", writeOperationRateLimit, async (req, res) => {
    try {
      const scoreData = insertPdmScoreSchema.parse(req.body);
      const score = await storage.createPdmScore(scoreData);
      res.status(201).json(score);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid PdM score data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create PdM score" });
    }
  });

  // ========================================
  // PdM Pack v1 - Baseline Monitoring Routes
  // ========================================
  
  // Import PdM Pack service and database
  const { PdmPackService } = await import("./pdm-services.js");
  const { db } = await import("./db.js");
  const pdmPackService = new PdmPackService(storage, db);

  // ========================================
  // Advanced Analytics & Digital Twin Services
  // ========================================
  
  // Import advanced services
  const { mqttIngestionService } = await import("./mqtt-ingestion-service.js");
  const { mlAnalyticsService } = await import("./ml-analytics-service.js");
  const { digitalTwinService } = await import("./digital-twin-service.js");

  // Update baseline with new data points
  app.post("/api/pdm/baseline/update", writeOperationRateLimit, async (req, res) => {
    try {
      // Validate required x-org-id header (fixes multi-tenant security)
      const headerValidation = pdmOrgIdHeaderSchema.parse(req.headers);
      const orgId = headerValidation["x-org-id"];

      // Validate request body with proper Zod schema
      const requestData = pdmBaselineUpdateSchema.parse(req.body);

      await pdmPackService.upsertBaselinePoint(orgId, {
        vesselName: requestData.vesselName,
        assetId: requestData.assetId,
        assetClass: requestData.assetClass,
        features: requestData.features
      });

      res.status(200).json({
        message: "Baseline updated successfully",
        updated_features: Object.keys(requestData.features).length
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: error.errors,
          code: "VALIDATION_ERROR"
        });
      }
      console.error("[PdM Pack] Baseline update error:", error);
      res.status(500).json({ 
        message: "Failed to update baseline",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Analyze bearing vibration data
  app.post("/api/pdm/analyze/bearing", writeOperationRateLimit, async (req, res) => {
    try {
      // Validate required x-org-id header (fixes multi-tenant security)
      const headerValidation = pdmOrgIdHeaderSchema.parse(req.headers);
      const orgId = headerValidation["x-org-id"];

      // Validate request body with proper Zod schema
      const requestData = pdmBearingAnalysisSchema.parse(req.body);

      const analysis = await pdmPackService.analyzeBearing({
        orgId,
        vesselName: requestData.vesselName,
        assetId: requestData.assetId,
        fs: requestData.fs,
        rpm: requestData.rpm,
        series: requestData.series,
        spectrum: requestData.spectrum,
        autoBaseline: requestData.autoBaseline
      });

      res.status(200).json({
        success: true,
        analysis,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: error.errors,
          code: "VALIDATION_ERROR"
        });
      }
      console.error("[PdM Pack] Bearing analysis error:", error);
      res.status(500).json({
        message: "Failed to analyze bearing data",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Analyze pump process data
  app.post("/api/pdm/analyze/pump", writeOperationRateLimit, async (req, res) => {
    try {
      // Validate required x-org-id header (fixes multi-tenant security)
      const headerValidation = pdmOrgIdHeaderSchema.parse(req.headers);
      const orgId = headerValidation["x-org-id"];

      // Validate request body with proper Zod schema
      const requestData = pdmPumpAnalysisSchema.parse(req.body);

      const analysis = await pdmPackService.analyzePump({
        orgId,
        vesselName: requestData.vesselName,
        assetId: requestData.assetId,
        flow: requestData.flow,
        pressure: requestData.pressure,
        current: requestData.current,
        fs: requestData.fs,
        vibSeries: requestData.vibSeries,
        autoBaseline: requestData.autoBaseline
      });

      res.status(200).json({
        success: true,
        analysis,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: error.errors,
          code: "VALIDATION_ERROR"
        });
      }
      console.error("[PdM Pack] Pump analysis error:", error);
      res.status(500).json({
        message: "Failed to analyze pump data",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get recent PdM alerts
  app.get("/api/pdm/alerts", async (req, res) => {
    try {
      // Validate required x-org-id header (fixes multi-tenant security)
      const headerValidation = pdmOrgIdHeaderSchema.parse(req.headers);
      const orgId = headerValidation["x-org-id"];

      // Validate query parameters with proper Zod schema
      const queryData = pdmAlertsQuerySchema.parse(req.query);

      const alerts = await pdmPackService.getRecentAlerts(orgId, queryData.limit);
      res.json(alerts);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid request parameters",
          errors: error.errors,
          code: "VALIDATION_ERROR"
        });
      }
      console.error("[PdM Pack] Alerts fetch error:", error);
      res.status(500).json({
        message: "Failed to fetch PdM alerts",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get baseline statistics for specific asset
  app.get("/api/pdm/baseline/:vesselName/:assetId", async (req, res) => {
    try {
      // Validate required x-org-id header (fixes multi-tenant security)
      const headerValidation = pdmOrgIdHeaderSchema.parse(req.headers);
      const orgId = headerValidation["x-org-id"];

      // Validate path parameters
      const { vesselName, assetId } = req.params;
      if (!vesselName || !assetId) {
        return res.status(400).json({
          message: "Invalid path parameters: vesselName and assetId are required",
          code: "VALIDATION_ERROR"
        });
      }

      const baselines = await pdmPackService.getBaselineStats(orgId, vesselName, assetId);
      
      if (baselines.length === 0) {
        return res.status(404).json({
          message: "No baseline data found for this asset",
          code: "NOT_FOUND"
        });
      }

      res.json({
        vesselName,
        assetId,
        baselines,
        feature_count: baselines.length
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid request headers",
          errors: error.errors,
          code: "VALIDATION_ERROR"
        });
      }
      console.error("[PdM Pack] Baseline fetch error:", error);
      res.status(500).json({
        message: "Failed to fetch baseline statistics",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // PdM Pack service health check  
  app.get("/api/pdm/health", async (req, res) => {
    try {
      // Health check endpoint doesn't require x-org-id header since it returns service status only
      // No tenant-specific data is exposed, only service availability and feature list
      const health = await pdmPackService.healthCheck();
      res.json({
        service: "PdM Pack v1",
        ...health,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("[PdM Pack] Health check error:", error);
      res.status(500).json({
        message: "PdM Pack service health check failed",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Equipment health
  app.get("/api/equipment/health", async (req, res) => {
    try {
      const health = await storage.getEquipmentHealth();
      
      // Update equipment health metrics per vessel (enhanced observability)
      const vesselHealthCounts: Record<string, Record<string, number>> = {};
      
      health.forEach(equipment => {
        const vesselId = equipment.vessel || 'unknown';
        const status = equipment.healthIndex >= 75 ? 'healthy' : 
                      equipment.healthIndex >= 50 ? 'warning' : 'critical';
        
        // Initialize vessel counts if not exist
        if (!vesselHealthCounts[vesselId]) {
          vesselHealthCounts[vesselId] = { healthy: 0, warning: 0, critical: 0 };
        }
        
        vesselHealthCounts[vesselId][status]++;
        
        // Record PdM score for this equipment
        recordPdmScore(equipment.id, equipment.healthIndex, equipment.vessel);
      });
      
      // Update health status distribution metrics per vessel
      Object.entries(vesselHealthCounts).forEach(([vesselId, counts]) => {
        updateEquipmentHealthStatus('healthy', counts.healthy, vesselId);
        updateEquipmentHealthStatus('warning', counts.warning, vesselId);
        updateEquipmentHealthStatus('critical', counts.critical, vesselId);
      });
      
      res.json(health);
    } catch (error) {
      console.error("Equipment health API error:", error);
      res.status(500).json({ message: "Failed to fetch equipment health", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Telemetry endpoints
  app.get("/api/telemetry/trends", async (req, res) => {
    try {
      // Enhanced query validation (Task 16)
      const queryValidation = telemetryQuerySchema.parse(req.query);
      const { equipmentId, hours } = queryValidation;
      
      const trends = await storage.getTelemetryTrends(equipmentId, hours);
      res.json(trends);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid query parameters", 
          errors: error.errors,
          code: "VALIDATION_ERROR"
        });
      }
      res.status(500).json({ message: "Failed to fetch telemetry trends" });
    }
  });

  app.post("/api/telemetry/readings", telemetryRateLimit, validateHMAC, async (req, res) => {
    const startTime = Date.now();
    let telemetryId = null;
    
    try {
      const readingData = insertTelemetrySchema.parse(req.body);
      
      // Enhanced validation for marine equipment data
      if (readingData.value !== null && (typeof readingData.value !== 'number' || !isFinite(readingData.value))) {
        return res.status(400).json({ 
          message: "Invalid telemetry value: must be a finite number or null",
          code: "INVALID_VALUE_TYPE"
        });
      }
      
      // Validate timestamp is not too far in future (prevent clock drift issues)
      const now = new Date();
      const maxFutureTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes
      if (readingData.timestamp > maxFutureTime) {
        return res.status(400).json({
          message: "Telemetry timestamp is too far in the future. Check equipment clock synchronization.",
          code: "FUTURE_TIMESTAMP"
        });
      }
      
      // Apply sensor configuration processing before storing
      const orgId = req.headers['x-org-id'] as string || 'default-org-id';
      const configResult = await applySensorConfiguration(
        readingData.equipmentId, 
        readingData.sensorType, 
        readingData.value, 
        readingData.unit,
        orgId
      );
      
      // Skip storage if sensor configuration filtering indicates we shouldn't keep this reading
      if (!configResult.shouldKeep) {
        return res.status(200).json({ 
          message: "Telemetry reading filtered by sensor configuration", 
          code: "SENSOR_CONFIG_FILTERED",
          flags: configResult.flags,
          processedValue: configResult.processedValue
        });
      }
      
      // Create telemetry reading with processed value and enhanced error handling
      const processedReadingData = {
        ...readingData,
        value: configResult.processedValue,
        // Add sensor config flags to status if validation failed
        status: configResult.flags.includes('below_min') || configResult.flags.includes('above_max') 
          ? 'invalid' 
          : readingData.status || 'normal'
      };
      
      const reading = await storage.createTelemetryReading(processedReadingData);
      telemetryId = reading.id;
      
      // Record telemetry processing metric (enhanced observability)
      const device = await storage.getDevice(reading.equipmentId);
      incrementTelemetryProcessed(reading.equipmentId, reading.sensorType, device?.vessel);
      
      // Enhanced alert processing with retry mechanism
      const processAlerts = async (retryCount = 0): Promise<void> => {
        try {
          await checkAndCreateAlerts(reading);
        } catch (alertError) {
          // Record telemetry error metric (enhanced observability)
          incrementTelemetryError('alert_processing_failed', reading.equipmentId);
          
          console.error(`Alert processing failed for telemetry ${reading.id} (attempt ${retryCount + 1}):`, {
            error: alertError instanceof Error ? alertError.message : String(alertError),
            stack: alertError instanceof Error ? alertError.stack : undefined,
            equipmentId: reading.equipmentId,
            sensorType: reading.sensorType,
            value: reading.value
          });
          
          // Retry once for transient failures
          if (retryCount === 0 && alertError instanceof Error && 
              (alertError.message.includes('timeout') || alertError.message.includes('connection'))) {
            setTimeout(() => processAlerts(1), 1000);
          }
        }
      };
      
      // Enhanced maintenance scheduling with retry mechanism
      const processScheduling = async (retryCount = 0): Promise<void> => {
        try {
          await checkAndScheduleAutomaticMaintenance(reading);
        } catch (schedulingError) {
          console.error(`Maintenance scheduling failed for telemetry ${reading.id} (attempt ${retryCount + 1}):`, {
            error: schedulingError instanceof Error ? schedulingError.message : String(schedulingError),
            stack: schedulingError instanceof Error ? schedulingError.stack : undefined,
            equipmentId: reading.equipmentId,
            pdmScore: reading.pdmScore
          });
          
          // Retry once for transient failures  
          if (retryCount === 0 && schedulingError instanceof Error && 
              (schedulingError.message.includes('timeout') || schedulingError.message.includes('connection'))) {
            setTimeout(() => processScheduling(1), 1000);
          }
        }
      };
      
      // AI insights processing with retry mechanism
      const processAIInsights = async (retryCount = 0): Promise<void> => {
        try {
          await generateAIInsights(reading);
        } catch (aiError) {
          console.error(`AI insights generation failed for telemetry ${reading.id} (attempt ${retryCount + 1}):`, {
            error: aiError instanceof Error ? aiError.message : String(aiError),
            stack: aiError instanceof Error ? aiError.stack : undefined,
            equipmentId: reading.equipmentId,
            sensorType: reading.sensorType,
            value: reading.value
          });
          
          // Don't retry AI failures to avoid overwhelming OpenAI API
          // AI insights are optional and shouldn't block telemetry processing
        }
      };
      
      // Process alerts, scheduling, and AI insights in parallel (don't block response)
      Promise.all([processAlerts(), processScheduling(), processAIInsights()]);
      
      const processingTime = Date.now() - startTime;
      res.status(201).json({
        ...reading,
        _processing: {
          time: processingTime,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      if (error instanceof z.ZodError) {
        // Record telemetry error metric (enhanced observability)
        incrementTelemetryError('validation_failed', req.body?.equipmentId || 'unknown');
        
        console.error("Telemetry validation error:", {
          errors: error.errors,
          body: req.body,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        return res.status(400).json({ 
          message: "Invalid telemetry data", 
          errors: error.errors,
          code: "VALIDATION_ERROR"
        });
      }
      
      // Record telemetry error metric (enhanced observability)
      incrementTelemetryError('database_error', req.body?.equipmentId || 'unknown');
      
      // Enhanced database error logging
      console.error("Telemetry database error:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        telemetryId,
        body: req.body,
        processingTime,
        ip: req.ip
      });
      
      res.status(500).json({ 
        message: "Failed to create telemetry reading",
        code: "DATABASE_ERROR",
        telemetryId
      });
    }
  });

  app.get("/api/telemetry/history/:equipmentId/:sensorType", async (req, res) => {
    try {
      const { equipmentId, sensorType } = req.params;
      const hours = req.query.hours ? parseInt(req.query.hours as string) : 24;
      const history = await storage.getTelemetryHistory(equipmentId, sensorType, hours);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch telemetry history" });
    }
  });

  // Sensor configurations
  app.get("/api/sensor-configs", async (req, res) => {
    try {
      const { equipmentId, sensorType } = req.query;
      const orgId = req.headers['x-org-id'] as string || 'default-org-id';
      
      const configs = await storage.getSensorConfigurations(
        orgId,
        equipmentId as string,
        sensorType as string
      );
      res.json(configs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sensor configurations" });
    }
  });

  app.get("/api/sensor-configs/:equipmentId/:sensorType", async (req, res) => {
    try {
      const { equipmentId, sensorType } = req.params;
      const orgId = req.headers['x-org-id'] as string || 'default-org-id';
      
      const config = await storage.getSensorConfiguration(equipmentId, sensorType, orgId);
      
      if (!config) {
        return res.status(404).json({ message: "Sensor configuration not found" });
      }
      
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sensor configuration" });
    }
  });

  app.post("/api/sensor-configs", writeOperationRateLimit, async (req, res) => {
    try {
      const configData = insertSensorConfigSchema.parse(req.body);
      const orgId = req.headers['x-org-id'] as string || 'default-org-id';
      
      const sensorConfig = await storage.createSensorConfiguration({
        ...configData,
        orgId
      });
      res.status(201).json(sensorConfig);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid sensor configuration data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create sensor configuration" });
    }
  });

  app.put("/api/sensor-configs/:equipmentId/:sensorType", writeOperationRateLimit, async (req, res) => {
    try {
      const { equipmentId, sensorType } = req.params;
      const orgId = req.headers['x-org-id'] as string || 'default-org-id';
      const configData = insertSensorConfigSchema.partial().parse(req.body);
      
      const sensorConfig = await storage.updateSensorConfiguration(
        equipmentId, 
        sensorType, 
        configData, 
        orgId
      );
      res.json(sensorConfig);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid sensor configuration data", errors: error.errors });
      }
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update sensor configuration" });
    }
  });

  // ID-based routes for UI convenience
  app.put("/api/sensor-configs/:id", writeOperationRateLimit, async (req, res) => {
    try {
      const { id } = req.params;
      const orgId = req.headers['x-org-id'] as string || 'default-org-id';
      const configData = insertSensorConfigSchema.partial().parse(req.body);
      
      const sensorConfig = await storage.updateSensorConfigurationById(id, configData, orgId);
      res.json(sensorConfig);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid sensor configuration data", errors: error.errors });
      }
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update sensor configuration" });
    }
  });

  app.delete("/api/sensor-configs/:equipmentId/:sensorType", criticalOperationRateLimit, async (req, res) => {
    try {
      const { equipmentId, sensorType } = req.params;
      const orgId = req.headers['x-org-id'] as string || 'default-org-id';
      
      await storage.deleteSensorConfiguration(equipmentId, sensorType, orgId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete sensor configuration" });
    }
  });

  // ID-based delete route for UI convenience
  app.delete("/api/sensor-configs/:id", criticalOperationRateLimit, async (req, res) => {
    try {
      const { id } = req.params;
      const orgId = req.headers['x-org-id'] as string || 'default-org-id';
      
      await storage.deleteSensorConfigurationById(id, orgId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete sensor configuration" });
    }
  });

  // Sensor states
  app.get("/api/sensor-states/:equipmentId/:sensorType", async (req, res) => {
    try {
      const { equipmentId, sensorType } = req.params;
      const orgId = req.headers['x-org-id'] as string || 'default-org-id';
      
      const state = await storage.getSensorState(equipmentId, sensorType, orgId);
      
      if (!state) {
        return res.status(404).json({ message: "Sensor state not found" });
      }
      
      res.json(state);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sensor state" });
    }
  });

  app.post("/api/sensor-states", async (req, res) => {
    try {
      const stateData = insertSensorStateSchema.parse(req.body);
      const orgId = req.headers['x-org-id'] as string || 'default-org-id';
      
      const sensorState = await storage.upsertSensorState({
        ...stateData,
        orgId
      });
      res.status(201).json(sensorState);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid sensor state data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create/update sensor state" });
    }
  });

  // Work orders
  app.get("/api/work-orders", async (req, res) => {
    try {
      const equipmentId = req.query.equipmentId as string;
      const workOrders = await storage.getWorkOrders(equipmentId);
      res.json(workOrders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch work orders" });
    }
  });

  app.post("/api/work-orders", writeOperationRateLimit, async (req, res) => {
    try {
      const orderData = insertWorkOrderSchema.parse(req.body);
      
      // Enhanced error handling for critical work order creation
      const workOrder = await safeDbOperation(
        () => storage.createWorkOrder(orderData),
        'createWorkOrder'
      );
      
      // Record work order metric (enhanced observability)
      const priorityString = workOrder.priority ? 
        ['critical', 'high', 'medium', 'low', 'lowest'][workOrder.priority - 1] || 'medium' : 
        'medium';
      incrementWorkOrder(workOrder.status || 'open', priorityString, workOrder.vesselId);
      
      res.status(201).json(workOrder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid work order data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create work order" });
    }
  });

  app.put("/api/work-orders/:id", writeOperationRateLimit, async (req, res) => {
    try {
      const orderData = insertWorkOrderSchema.partial().parse(req.body);
      const workOrder = await storage.updateWorkOrder(req.params.id, orderData);
      res.json(workOrder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid work order data", errors: error.errors });
      }
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update work order" });
    }
  });

  app.delete("/api/work-orders/:id", criticalOperationRateLimit, async (req, res) => {
    try {
      await storage.deleteWorkOrder(req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete work order" });
    }
  });

  // Maintenance schedules
  app.get("/api/maintenance-schedules", async (req, res) => {
    try {
      const { equipmentId, status } = req.query;
      const schedules = await storage.getMaintenanceSchedules(
        equipmentId as string, 
        status as string
      );
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch maintenance schedules" });
    }
  });

  app.get("/api/maintenance-schedules/upcoming", async (req, res) => {
    try {
      let days = 30; // default
      if (req.query.days) {
        const parsedDays = parseInt(req.query.days as string);
        if (isNaN(parsedDays) || parsedDays < 1 || parsedDays > 365) {
          return res.status(400).json({ message: "Days parameter must be a number between 1 and 365" });
        }
        days = parsedDays;
      }
      const schedules = await storage.getUpcomingSchedules(days);
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch upcoming schedules" });
    }
  });

  app.post("/api/maintenance-schedules", writeOperationRateLimit, async (req, res) => {
    try {
      const validatedData = insertMaintenanceScheduleSchema.parse(req.body);
      const schedule = await storage.createMaintenanceSchedule(validatedData);
      res.status(201).json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid schedule data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create maintenance schedule" });
    }
  });

  app.put("/api/maintenance-schedules/:id", writeOperationRateLimit, async (req, res) => {
    try {
      const validatedData = insertMaintenanceScheduleSchema.partial().parse(req.body);
      const schedule = await storage.updateMaintenanceSchedule(req.params.id, validatedData);
      res.json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid schedule data", errors: error.errors });
      }
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update maintenance schedule" });
    }
  });

  app.delete("/api/maintenance-schedules/:id", criticalOperationRateLimit, async (req, res) => {
    try {
      await storage.deleteMaintenanceSchedule(req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete maintenance schedule" });
    }
  });

  app.post("/api/maintenance-schedules/auto-schedule/:equipmentId", async (req, res) => {
    try {
      const { equipmentId } = req.params;
      const { pdmScore } = req.body;
      
      if (typeof pdmScore !== 'number') {
        return res.status(400).json({ message: "PdM score must be a number" });
      }
      
      const schedule = await storage.autoScheduleMaintenance(equipmentId, pdmScore);
      
      if (schedule) {
        res.status(201).json(schedule);
      } else {
        res.status(200).json({ message: "No automatic scheduling needed" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to auto-schedule maintenance" });
    }
  });

  // Analytics - Maintenance Records
  app.get("/api/analytics/maintenance-records", async (req, res) => {
    try {
      const { equipmentId, dateFrom, dateTo } = req.query;
      const dateFromObj = dateFrom ? new Date(dateFrom as string) : undefined;
      const dateToObj = dateTo ? new Date(dateTo as string) : undefined;
      
      const records = await storage.getMaintenanceRecords(
        equipmentId as string,
        dateFromObj,
        dateToObj
      );
      res.json(records);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch maintenance records" });
    }
  });

  app.post("/api/analytics/maintenance-records", async (req, res) => {
    try {
      const recordData = insertMaintenanceRecordSchema.parse(req.body);
      const record = await storage.createMaintenanceRecord(recordData);
      res.status(201).json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid record data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create maintenance record" });
    }
  });

  app.put("/api/analytics/maintenance-records/:id", async (req, res) => {
    try {
      const recordData = insertMaintenanceRecordSchema.partial().parse(req.body);
      const record = await storage.updateMaintenanceRecord(req.params.id, recordData);
      res.json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid record data", errors: error.errors });
      }
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update maintenance record" });
    }
  });

  app.delete("/api/analytics/maintenance-records/:id", async (req, res) => {
    try {
      await storage.deleteMaintenanceRecord(req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete maintenance record" });
    }
  });

  // Analytics - Maintenance Costs
  app.get("/api/analytics/maintenance-costs", async (req, res) => {
    try {
      const { equipmentId, costType, dateFrom, dateTo } = req.query;
      const dateFromObj = dateFrom ? new Date(dateFrom as string) : undefined;
      const dateToObj = dateTo ? new Date(dateTo as string) : undefined;
      
      const costs = await storage.getMaintenanceCosts(
        equipmentId as string,
        costType as string,
        dateFromObj,
        dateToObj
      );
      res.json(costs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch maintenance costs" });
    }
  });

  app.post("/api/analytics/maintenance-costs", async (req, res) => {
    try {
      const costData = insertMaintenanceCostSchema.parse(req.body);
      const cost = await storage.createMaintenanceCost(costData);
      res.status(201).json(cost);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid cost data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create maintenance cost" });
    }
  });

  app.get("/api/analytics/cost-summary", async (req, res) => {
    try {
      const { equipmentId, months } = req.query;
      const monthsNum = months ? parseInt(months as string, 10) : 12;
      
      const summary = await storage.getCostSummaryByEquipment(
        equipmentId as string,
        monthsNum
      );
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cost summary" });
    }
  });

  app.get("/api/analytics/cost-trends", async (req, res) => {
    try {
      const { months } = req.query;
      const monthsNum = months ? parseInt(months as string, 10) : 12;
      
      const trends = await storage.getCostTrends(monthsNum);
      res.json(trends);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cost trends" });
    }
  });

  // Analytics - Equipment Lifecycle
  app.get("/api/analytics/equipment-lifecycle", async (req, res) => {
    try {
      const { equipmentId } = req.query;
      const lifecycle = await storage.getEquipmentLifecycle(equipmentId as string);
      res.json(lifecycle);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch equipment lifecycle" });
    }
  });

  app.post("/api/analytics/equipment-lifecycle", async (req, res) => {
    try {
      const lifecycleData = insertEquipmentLifecycleSchema.parse(req.body);
      const lifecycle = await storage.upsertEquipmentLifecycle(lifecycleData);
      res.status(201).json(lifecycle);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid lifecycle data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create/update equipment lifecycle" });
    }
  });

  app.put("/api/analytics/equipment-lifecycle/:id", async (req, res) => {
    try {
      const lifecycleData = insertEquipmentLifecycleSchema.partial().parse(req.body);
      const lifecycle = await storage.updateEquipmentLifecycle(req.params.id, lifecycleData);
      res.json(lifecycle);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid lifecycle data", errors: error.errors });
      }
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update equipment lifecycle" });
    }
  });

  app.get("/api/analytics/replacement-recommendations", async (req, res) => {
    try {
      const recommendations = await storage.getReplacementRecommendations();
      res.json(recommendations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch replacement recommendations" });
    }
  });

  // Analytics - Performance Metrics
  app.get("/api/analytics/performance-metrics", async (req, res) => {
    try {
      const { equipmentId, dateFrom, dateTo } = req.query;
      const dateFromObj = dateFrom ? new Date(dateFrom as string) : undefined;
      const dateToObj = dateTo ? new Date(dateTo as string) : undefined;
      
      const metrics = await storage.getPerformanceMetrics(
        equipmentId as string,
        dateFromObj,
        dateToObj
      );
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch performance metrics" });
    }
  });

  app.post("/api/analytics/performance-metrics", async (req, res) => {
    try {
      const metricData = insertPerformanceMetricSchema.parse(req.body);
      const metric = await storage.createPerformanceMetric(metricData);
      res.status(201).json(metric);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid metric data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create performance metric" });
    }
  });

  app.get("/api/analytics/fleet-performance", async (req, res) => {
    try {
      const overview = await storage.getFleetPerformanceOverview();
      res.json(overview);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch fleet performance overview" });
    }
  });

  app.get("/api/analytics/performance-trends/:equipmentId", async (req, res) => {
    try {
      const { equipmentId } = req.params;
      const { months } = req.query;
      const monthsNum = months ? parseInt(months as string, 10) : 12;
      
      const trends = await storage.getPerformanceTrends(equipmentId, monthsNum);
      res.json(trends);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch performance trends" });
    }
  });

  // System settings
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.put("/api/settings", writeOperationRateLimit, async (req, res) => {
    try {
      const settingsData = insertSettingsSchema.partial().parse(req.body);
      const settings = await storage.updateSettings(settingsData);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid settings data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Alert configurations
  app.get("/api/alerts/configurations", async (req, res) => {
    try {
      const { equipmentId } = req.query;
      const configurations = await storage.getAlertConfigurations(equipmentId as string);
      res.json(configurations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch alert configurations" });
    }
  });

  app.post("/api/alerts/configurations", writeOperationRateLimit, async (req, res) => {
    try {
      const configData = insertAlertConfigSchema.parse(req.body);
      const configuration = await storage.createAlertConfiguration(configData);
      res.status(201).json(configuration);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid configuration data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create alert configuration" });
    }
  });

  app.put("/api/alerts/configurations/:id", writeOperationRateLimit, async (req, res) => {
    try {
      const configData = insertAlertConfigSchema.partial().parse(req.body);
      const configuration = await storage.updateAlertConfiguration(req.params.id, configData);
      res.json(configuration);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid configuration data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update alert configuration" });
    }
  });

  app.delete("/api/alerts/configurations/:id", criticalOperationRateLimit, async (req, res) => {
    try {
      await storage.deleteAlertConfiguration(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete alert configuration" });
    }
  });

  // Alert notifications
  app.get("/api/alerts/notifications", async (req, res) => {
    try {
      const { acknowledged } = req.query;
      const ackParam = acknowledged === "true" ? true : acknowledged === "false" ? false : undefined;
      const notifications = await storage.getAlertNotifications(ackParam);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch alert notifications" });
    }
  });

  app.post("/api/alerts/notifications", async (req, res) => {
    try {
      const notificationData = insertAlertNotificationSchema.parse(req.body);
      const notification = await storage.createAlertNotification(notificationData);
      
      // Broadcast new alert via WebSocket
      if (wsServerInstance) {
        wsServerInstance.broadcastAlert(notification);
      }
      
      res.status(201).json(notification);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid notification data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create alert notification" });
    }
  });

  app.patch("/api/alerts/notifications/:id/acknowledge", async (req, res) => {
    try {
      const { acknowledgedBy } = req.body;
      if (!acknowledgedBy) {
        return res.status(400).json({ message: "acknowledgedBy is required" });
      }
      const notification = await storage.acknowledgeAlert(req.params.id, acknowledgedBy);
      
      // Record alert acknowledgment metric (enhanced observability)
      if (notification) {
        incrementAlertAcknowledged(notification.equipmentId || 'unknown');
      }
      
      // Broadcast alert acknowledgment via WebSocket
      if (wsServerInstance) {
        wsServerInstance.broadcastAlertAcknowledged(req.params.id, acknowledgedBy);
      }
      
      res.json(notification);
    } catch (error) {
      res.status(500).json({ message: "Failed to acknowledge alert" });
    }
  });

  // Add comment to alert
  app.post("/api/alerts/notifications/:id/comment", async (req, res) => {
    try {
      const commentData = insertAlertCommentSchema.parse({
        alertId: req.params.id,
        comment: req.body.comment,
        commentedBy: req.body.commentedBy
      });
      
      const result = await storage.addAlertComment(commentData);
      res.json(result);
    } catch (error) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add comment" });
    }
  });

  // Get comments for an alert
  app.get("/api/alerts/notifications/:id/comments", async (req, res) => {
    try {
      const comments = await storage.getAlertComments(req.params.id);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Failed to get comments" });
    }
  });

  // Suppress alerts for equipment/sensor combination
  app.post("/api/alerts/suppress", async (req, res) => {
    try {
      const suppressionData = insertAlertSuppressionSchema.parse(req.body);
      const result = await storage.createAlertSuppression(suppressionData);
      
      // Broadcast suppression update
      if (wsServerInstance) {
        wsServerInstance.broadcastAlertSuppression(result);
      }
      
      res.json(result);
    } catch (error) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create alert suppression" });
    }
  });

  // Get active alert suppressions
  app.get("/api/alerts/suppressions", async (req, res) => {
    try {
      const suppressions = await storage.getActiveSuppressions();
      res.json(suppressions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get suppressions" });
    }
  });

  // Remove alert suppression
  app.delete("/api/alerts/suppressions/:id", async (req, res) => {
    try {
      await storage.removeAlertSuppression(req.params.id);
      res.json({ message: "Suppression removed" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove suppression" });
    }
  });

  // Escalate alert to work order
  app.post("/api/alerts/notifications/:id/escalate", async (req, res) => {
    try {
      // Validate escalation input
      const escalationSchema = z.object({
        reason: z.string().optional(),
        priority: z.number().min(1).max(3).optional(),
        description: z.string().optional()
      });
      
      const { reason, priority, description } = escalationSchema.parse(req.body);
      
      // Get the alert notification first
      const notifications = await storage.getAlertNotifications();
      const alert = notifications.find(n => n.id === req.params.id);
      
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      
      // Create work order from alert
      const workOrderData = {
        equipmentId: alert.equipmentId,
        reason: reason || `Alert escalation: ${alert.alertType} ${alert.sensorType} alert`,
        description: description || `Escalated from ${alert.alertType} alert: ${alert.message}`,
        priority: priority || (alert.alertType === 'critical' ? 1 : 2),
        status: "open"
      };
      
      const workOrder = await storage.createWorkOrder(workOrderData);
      
      // Broadcast work order creation
      if (wsServerInstance) {
        wsServerInstance.broadcastWorkOrderCreated(workOrder);
      }
      
      res.json(workOrder);
    } catch (error) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to escalate alert" });
    }
  });

  // Clear all alerts and notifications
  app.delete("/api/alerts/all", async (req, res) => {
    try {
      await storage.clearAllAlerts();
      
      // Broadcast clear all alerts via WebSocket
      if (wsServerInstance) {
        wsServerInstance.broadcastToAll({
          type: 'alerts-cleared',
          message: 'All alerts have been cleared'
        });
      }
      
      res.json({ message: "All alerts and notifications cleared successfully" });
    } catch (error) {
      console.error("Clear all alerts error:", error);
      res.status(500).json({ message: "Failed to clear alerts" });
    }
  });

  // Reports
  app.get("/api/reports/equipment/:equipmentId", async (req, res) => {
    try {
      const equipmentId = req.params.equipmentId;
      const [latestScore, workOrders] = await Promise.all([
        storage.getLatestPdmScore(equipmentId),
        storage.getWorkOrders(equipmentId)
      ]);

      const report = {
        equipmentId,
        timestamp: new Date().toISOString(),
        healthScore: latestScore?.healthIdx || null,
        failureProbability: latestScore?.pFail30d || null,
        predictedDueDate: latestScore?.predictedDueDate || null,
        openWorkOrders: workOrders.filter(wo => wo.status !== "completed").length,
        workOrderHistory: workOrders,
      };

      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate equipment report" });
    }
  });

  // Export endpoints
  app.get("/api/reports/export/csv", async (req, res) => {
    try {
      const { type = "all", equipmentId } = req.query;
      let data: any[] = [];
      let filename = "marine_report";
      let headers: any[] = [];

      // Function to sanitize CSV values to prevent formula injection
      const sanitizeCSV = (value: any): string => {
        const str = String(value || '');
        // Prefix with single quote if starts with dangerous characters
        if (str.match(/^[=+\-@]/)) {
          return `'${str}`;
        }
        return str;
      };

      if (type === "health" || type === "all") {
        const equipmentHealth = await storage.getEquipmentHealth();
        const healthData = equipmentHealth.map(eq => ({
          Equipment: sanitizeCSV(eq.id),
          Vessel: sanitizeCSV(eq.vessel),
          HealthIndex: eq.healthIndex,
          PredictedDueDays: eq.predictedDueDays,
          LastUpdated: new Date().toISOString()
        }));
        
        if (type === "health") {
          data = healthData;
          filename = "equipment_health_report";
          headers = [
            {id: 'Equipment', title: 'Equipment ID'},
            {id: 'Vessel', title: 'Vessel'},
            {id: 'HealthIndex', title: 'Health Index (%)'},
            {id: 'PredictedDueDays', title: 'Predicted Due (Days)'},
            {id: 'LastUpdated', title: 'Last Updated'}
          ];
        }
      }

      if (type === "workorders" || type === "all") {
        const workOrders = await storage.getWorkOrders(equipmentId as string);
        const workOrderData = workOrders.map(wo => ({
          OrderID: sanitizeCSV(wo.id),
          Equipment: sanitizeCSV(wo.equipmentId),
          Status: sanitizeCSV(wo.status),
          Priority: wo.priority,
          Reason: sanitizeCSV(wo.reason || ''),
          Description: sanitizeCSV(wo.description || ''),
          Created: wo.createdAt?.toISOString() || ''
        }));

        if (type === "workorders") {
          data = workOrderData;
          filename = "work_orders_report";
          headers = [
            {id: 'OrderID', title: 'Order ID'},
            {id: 'Equipment', title: 'Equipment ID'},
            {id: 'Status', title: 'Status'},
            {id: 'Priority', title: 'Priority'},
            {id: 'Reason', title: 'Reason'},
            {id: 'Description', title: 'Description'},
            {id: 'Created', title: 'Created Date'}
          ];
        }
      }

      if (type === "telemetry") {
        const telemetryTrends = await storage.getTelemetryTrends(equipmentId as string);
        const telemetryData = telemetryTrends.flatMap(trend => 
          trend.data.map(point => ({
            Equipment: trend.equipmentId,
            SensorType: trend.sensorType,
            Value: point.value,
            Status: point.status,
            Timestamp: point.ts?.toISOString() || ''
          }))
        );
        
        data = telemetryData;
        filename = "telemetry_data_report";
        headers = [
          {id: 'Equipment', title: 'Equipment ID'},
          {id: 'SensorType', title: 'Sensor Type'},
          {id: 'Value', title: 'Value'},
          {id: 'Status', title: 'Status'},
          {id: 'Timestamp', title: 'Timestamp'}
        ];
      }

      if (type === "all") {
        // Combine all data types
        const equipmentHealth = await storage.getEquipmentHealth();
        const workOrders = await storage.getWorkOrders();
        
        data = [
          ...equipmentHealth.map(eq => ({
            Type: 'Health',
            Equipment: eq.id,
            Vessel: eq.vessel,
            Value: eq.healthIndex,
            Status: eq.healthIndex >= 75 ? 'Good' : eq.healthIndex >= 50 ? 'Warning' : 'Critical',
            Details: `${eq.predictedDueDays} days until due`,
            Timestamp: new Date().toISOString()
          })),
          ...workOrders.map(wo => ({
            Type: 'WorkOrder',
            Equipment: wo.equipmentId,
            Vessel: '',
            Value: wo.priority,
            Status: wo.status,
            Details: wo.reason || '',
            Timestamp: wo.createdAt?.toISOString() || ''
          }))
        ];
        
        filename = "complete_fleet_report";
        headers = [
          {id: 'Type', title: 'Data Type'},
          {id: 'Equipment', title: 'Equipment ID'},
          {id: 'Vessel', title: 'Vessel'},
          {id: 'Value', title: 'Value'},
          {id: 'Status', title: 'Status'},
          {id: 'Details', title: 'Details'},
          {id: 'Timestamp', title: 'Timestamp'}
        ];
      }

      // Generate CSV
      const writer = csvWriter.createObjectCsvStringifier({
        header: headers
      });

      const csvContent = writer.getHeaderString() + writer.stringifyRecords(data);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error('CSV export error:', error);
      res.status(500).json({ message: "Failed to export CSV" });
    }
  });

  app.get("/api/reports/export/json", async (req, res) => {
    try {
      const { type = "all", equipmentId } = req.query;
      
      // Validate type parameter
      const validTypes = ["all", "health", "workorders", "telemetry", "pdm"];
      if (!validTypes.includes(type as string)) {
        return res.status(400).json({ message: "Invalid report type" });
      }
      
      let reportData: any = {};

      if (type === "health" || type === "all") {
        reportData.equipmentHealth = await storage.getEquipmentHealth();
      }

      if (type === "workorders" || type === "all") {
        reportData.workOrders = await storage.getWorkOrders(equipmentId as string);
      }

      if (type === "telemetry" || type === "all") {
        reportData.telemetryTrends = await storage.getTelemetryTrends(equipmentId as string);
      }

      if (type === "pdm" || type === "all") {
        reportData.pdmScores = await storage.getPdmScores();
      }

      // Add metadata
      const report = {
        metadata: {
          generatedAt: new Date().toISOString(),
          reportType: type,
          equipmentFilter: equipmentId || "all",
          version: "1.0",
          recordCounts: {
            equipmentHealth: reportData.equipmentHealth?.length || 0,
            workOrders: reportData.workOrders?.length || 0,
            telemetryTrends: reportData.telemetryTrends?.length || 0,
            pdmScores: reportData.pdmScores?.length || 0
          }
        },
        data: reportData
      };

      const filename = `marine_report_${type}_${new Date().toISOString().split('T')[0]}.json`;
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json(report);
    } catch (error) {
      console.error('JSON export error:', error);
      res.status(500).json({ message: "Failed to export JSON" });
    }
  });

  // Validation schema for PDF generation and LLM exports
  const pdfRequestSchema = z.object({
    type: z.enum([
      "fleet", 
      "health", 
      "maintenance", 
      "fleet-summary", 
      "maintenance-compliance", 
      "alert-response-compliance"
    ]).default("fleet"),
    equipmentId: z.string().optional(),
    title: z.string().min(1).max(100).default("Marine Fleet Report")
  });

  app.post("/api/reports/generate/pdf", reportGenerationRateLimit, async (req, res) => {
    try {
      const validatedData = pdfRequestSchema.parse(req.body);
      const { type, equipmentId, title } = validatedData;
      
      // Get report data
      const [equipmentHealth, workOrders, pdmScores] = await Promise.all([
        storage.getEquipmentHealth(),
        storage.getWorkOrders(equipmentId),
        storage.getPdmScores()
      ]);

      // Create PDF data structure for frontend processing
      const reportData = {
        metadata: {
          title,
          generatedAt: new Date().toISOString(),
          reportType: type,
          equipmentFilter: equipmentId || "all"
        },
        sections: {
          summary: {
            totalEquipment: equipmentHealth.length,
            avgHealthIndex: Math.round(equipmentHealth.reduce((sum, eq) => sum + eq.healthIndex, 0) / equipmentHealth.length),
            openWorkOrders: workOrders.filter(wo => wo.status !== "completed").length,
            criticalEquipment: equipmentHealth.filter(eq => eq.healthIndex < 50).length
          },
          equipmentHealth,
          workOrders: workOrders.slice(0, 20), // Limit for PDF size
          pdmScores: pdmScores.slice(0, 10)
        }
      };

      res.json(reportData);
    } catch (error) {
      console.error('PDF generation error:', error);
      res.status(500).json({ message: "Failed to generate PDF data" });
    }
  });

  // LLM Report CSV Export - Formats AI-generated report data into CSV
  app.post("/api/reports/export/llm-csv", reportGenerationRateLimit, async (req, res) => {
    try {
      const validatedData = pdfRequestSchema.parse(req.body);
      const { type, equipmentId, title } = validatedData;
      
      // Generate LLM report data
      const [equipmentHealth, workOrders, pdmScores, alerts] = await Promise.all([
        storage.getEquipmentHealth(),
        storage.getWorkOrders(equipmentId),
        storage.getPdmScores(),
        storage.getAlertNotifications(false, 'default-org-id')
      ]);

      // Generate AI insights (with fallback if OpenAI not available)
      let aiInsights: any = null;
      try {
        const settings = await storage.getSettings();
        if (settings.llmEnabled) {
          const { analyzeFleetHealth } = await import("./openai");
          aiInsights = await analyzeFleetHealth(equipmentHealth, workOrders.slice(0, 10));
        }
      } catch (error) {
        console.warn('AI insights not available for CSV export:', error);
      }

      // CSV sanitization function
      const sanitizeCSV = (value: any): string => {
        const str = String(value || '');
        if (str.match(/^[=+\-@]/)) {
          return `'${str}`;
        }
        return str.replace(/"/g, '""'); // Escape quotes
      };

      // Prepare CSV data structure
      const csvData: any[] = [];
      const timestamp = new Date().toISOString();

      // Add report metadata
      csvData.push({
        Section: 'Metadata',
        Type: 'Report Title',
        ID: '',
        Value: sanitizeCSV(title),
        Details: '',
        Timestamp: timestamp,
        AIInsight: ''
      });

      csvData.push({
        Section: 'Metadata', 
        Type: 'Generated At',
        ID: '',
        Value: timestamp,
        Details: `Report Type: ${type}`,
        Timestamp: timestamp,
        AIInsight: ''
      });

      // Add equipment health data
      equipmentHealth.forEach(equipment => {
        const aiEquipmentInsight = aiInsights?.equipmentAnalysis?.find((analysis: any) => 
          analysis.equipmentId === equipment.id
        );
        
        csvData.push({
          Section: 'Equipment Health',
          Type: 'Health Index',
          ID: sanitizeCSV(equipment.id),
          Value: equipment.healthIndex,
          Details: `Vessel: ${sanitizeCSV(equipment.vessel)}, Status: ${equipment.status}, Due Days: ${equipment.predictedDueDays}`,
          Timestamp: timestamp,
          AIInsight: sanitizeCSV(aiEquipmentInsight?.summary || 'No AI analysis available')
        });
      });

      // Add work orders
      workOrders.slice(0, 20).forEach(workOrder => {
        csvData.push({
          Section: 'Work Orders',
          Type: 'Maintenance Task',
          ID: sanitizeCSV(workOrder.id),
          Value: sanitizeCSV(workOrder.status),
          Details: `Equipment: ${sanitizeCSV(workOrder.equipmentId)}, Priority: ${workOrder.priority}, Reason: ${sanitizeCSV(workOrder.reason || '')}`,
          Timestamp: workOrder.createdAt?.toISOString() || timestamp,
          AIInsight: sanitizeCSV(workOrder.description || '')
        });
      });

      // Add critical alerts
      alerts.slice(0, 15).forEach(alert => {
        csvData.push({
          Section: 'Critical Alerts',
          Type: 'Alert',
          ID: sanitizeCSV(alert.equipmentId),
          Value: `${alert.severity}: ${alert.value}`,
          Details: `Sensor: ${sanitizeCSV(alert.sensorType)}, Threshold: ${alert.threshold}, Message: ${sanitizeCSV(alert.message)}`,
          Timestamp: alert.createdAt?.toISOString() || timestamp,
          AIInsight: alert.severity === 'critical' ? 'Immediate action required' : 'Monitor closely'
        });
      });

      // Add AI fleet summary if available
      if (aiInsights?.summary) {
        csvData.push({
          Section: 'AI Analysis',
          Type: 'Fleet Summary',
          ID: '',
          Value: sanitizeCSV(aiInsights.summary),
          Details: `Cost Estimate: $${aiInsights.costEstimate || 0}`,
          Timestamp: timestamp,
          AIInsight: sanitizeCSV(aiInsights.topRecommendations?.join('; ') || 'No recommendations')
        });
      }

      // Convert to CSV string
      const headers = ['Section', 'Type', 'ID', 'Value', 'Details', 'Timestamp', 'AI Insight'];
      const csvRows = [headers.join(',')];
      
      csvData.forEach(row => {
        const csvRow = headers.map(header => {
          const value = row[header.replace(' ', '')] || '';
          return `"${value}"`;
        }).join(',');
        csvRows.push(csvRow);
      });

      const csvContent = csvRows.join('\n');
      const filename = `llm_report_${type}_${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);

    } catch (error) {
      console.error('LLM CSV export error:', error);
      res.status(500).json({ message: "Failed to export LLM report as CSV" });
    }
  });

  // LLM Report HTML Export - Formats AI-generated report data into HTML
  app.post("/api/reports/export/llm-html", reportGenerationRateLimit, async (req, res) => {
    try {
      const validatedData = pdfRequestSchema.parse(req.body);
      const { type, equipmentId, title } = validatedData;
      
      // Generate LLM report data
      const [equipmentHealth, workOrders, pdmScores, alerts] = await Promise.all([
        storage.getEquipmentHealth(),
        storage.getWorkOrders(equipmentId),
        storage.getPdmScores(),
        storage.getAlertNotifications(false, 'default-org-id')
      ]);

      // Generate AI insights (with fallback if OpenAI not available)
      let aiInsights: any = null;
      try {
        const settings = await storage.getSettings();
        if (settings.llmEnabled) {
          const { analyzeFleetHealth } = await import("./openai");
          aiInsights = await analyzeFleetHealth(equipmentHealth, workOrders.slice(0, 10));
        }
      } catch (error) {
        console.warn('AI insights not available for HTML export:', error);
      }

      // HTML escape function with null safety
      const escapeHtml = (text: any) => {
        if (text === null || text === undefined) {
          return '';
        }
        const str = String(text);
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      };

      const timestamp = new Date().toISOString();
      const formattedDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Generate HTML content
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)} - Marine Predictive Maintenance Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            line-height: 1.6;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
            background-color: #f8fafc;
        }
        .header {
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 2.2em;
            font-weight: 700;
        }
        .header .subtitle {
            font-size: 1.1em;
            opacity: 0.9;
        }
        .section {
            background: white;
            margin-bottom: 25px;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .section-header {
            background: #f1f5f9;
            padding: 15px 20px;
            border-bottom: 2px solid #e2e8f0;
            font-weight: 600;
            font-size: 1.1em;
            color: #334155;
        }
        .section-content {
            padding: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
        }
        th {
            background-color: #f8fafc;
            font-weight: 600;
            color: #475569;
        }
        tr:hover {
            background-color: #f8fafc;
        }
        .status {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.85em;
            font-weight: 500;
        }
        .status.healthy { background: #dcfce7; color: #166534; }
        .status.warning { background: #fef3c7; color: #92400e; }
        .status.critical { background: #fecaca; color: #991b1b; }
        .status.completed { background: #dbeafe; color: #1e40af; }
        .status.pending { background: #f3e8ff; color: #7c3aed; }
        .metric {
            display: inline-block;
            background: #f1f5f9;
            padding: 8px 16px;
            margin: 5px 10px 5px 0;
            border-radius: 8px;
            border-left: 4px solid #3b82f6;
        }
        .metric-value {
            font-size: 1.4em;
            font-weight: 700;
            color: #1e40af;
        }
        .metric-label {
            font-size: 0.9em;
            color: #64748b;
            margin-top: 2px;
        }
        .ai-insight {
            background: linear-gradient(135deg, #fef3c7 0%, #fbbf24 100%);
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
        }
        .ai-insight h4 {
            margin: 0 0 10px 0;
            color: #92400e;
            display: flex;
            align-items: center;
        }
        .ai-insight h4:before {
            content: "🤖";
            margin-right: 8px;
        }
        .footer {
            text-align: center;
            padding: 20px;
            color: #64748b;
            font-size: 0.9em;
        }
        .alert-critical {
            border-left: 4px solid #dc2626;
        }
        .alert-warning {
            border-left: 4px solid #d97706;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${escapeHtml(title)}</h1>
        <div class="subtitle">Generated: ${formattedDate} | Report Type: ${escapeHtml(type.toUpperCase())}</div>
    </div>

    <div class="section">
        <div class="section-header">📊 Fleet Overview</div>
        <div class="section-content">
            <div class="metric">
                <div class="metric-value">${equipmentHealth.length}</div>
                <div class="metric-label">Total Equipment</div>
            </div>
            <div class="metric">
                <div class="metric-value">${Math.round(equipmentHealth.reduce((sum, eq) => sum + eq.healthIndex, 0) / equipmentHealth.length)}%</div>
                <div class="metric-label">Average Health</div>
            </div>
            <div class="metric">
                <div class="metric-value">${workOrders.filter(wo => wo.status !== "completed").length}</div>
                <div class="metric-label">Open Work Orders</div>
            </div>
            <div class="metric">
                <div class="metric-value">${equipmentHealth.filter(eq => eq.healthIndex < 50).length}</div>
                <div class="metric-label">Critical Equipment</div>
            </div>
        </div>
    </div>

    ${aiInsights ? `
    <div class="section">
        <div class="section-header">🤖 AI Fleet Analysis</div>
        <div class="section-content">
            <div class="ai-insight">
                <h4>AI Summary</h4>
                <p>${escapeHtml(aiInsights.summary || 'AI analysis completed successfully.')}</p>
                ${aiInsights.costEstimate ? `<p><strong>Estimated Maintenance Cost:</strong> $${aiInsights.costEstimate.toLocaleString()}</p>` : ''}
            </div>
            ${aiInsights.topRecommendations?.length ? `
            <h4>Top Recommendations:</h4>
            <ul>
                ${aiInsights.topRecommendations.map((rec: string) => `<li>${escapeHtml(rec)}</li>`).join('')}
            </ul>
            ` : ''}
        </div>
    </div>
    ` : ''}

    <div class="section">
        <div class="section-header">⚡ Equipment Health Status</div>
        <div class="section-content">
            <table>
                <thead>
                    <tr>
                        <th>Equipment ID</th>
                        <th>Vessel</th>
                        <th>Health Index</th>
                        <th>Status</th>
                        <th>Predicted Due (Days)</th>
                    </tr>
                </thead>
                <tbody>
                    ${equipmentHealth.map(equipment => `
                    <tr>
                        <td><strong>${escapeHtml(equipment.id)}</strong></td>
                        <td>${escapeHtml(equipment.vessel)}</td>
                        <td>${equipment.healthIndex}%</td>
                        <td><span class="status ${equipment.healthIndex >= 70 ? 'healthy' : equipment.healthIndex >= 50 ? 'warning' : 'critical'}">${equipment.status}</span></td>
                        <td>${equipment.predictedDueDays}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>

    <div class="section">
        <div class="section-header">🔧 Work Orders</div>
        <div class="section-content">
            <table>
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Equipment</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th>Reason</th>
                        <th>Created</th>
                    </tr>
                </thead>
                <tbody>
                    ${workOrders.slice(0, 20).map(workOrder => `
                    <tr>
                        <td><strong>${escapeHtml(workOrder.id.substring(0, 8))}...</strong></td>
                        <td>${escapeHtml(workOrder.equipmentId)}</td>
                        <td><span class="status ${workOrder.status}">${escapeHtml(workOrder.status)}</span></td>
                        <td>${workOrder.priority}</td>
                        <td>${escapeHtml(workOrder.reason || 'N/A')}</td>
                        <td>${workOrder.createdAt?.toLocaleDateString() || 'Unknown'}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>

    ${alerts.length > 0 ? `
    <div class="section">
        <div class="section-header">🚨 Recent Critical Alerts</div>
        <div class="section-content">
            <table>
                <thead>
                    <tr>
                        <th>Equipment</th>
                        <th>Sensor</th>
                        <th>Severity</th>
                        <th>Value</th>
                        <th>Threshold</th>
                        <th>Message</th>
                    </tr>
                </thead>
                <tbody>
                    ${alerts.slice(0, 15).map(alert => `
                    <tr class="alert-${alert.severity}">
                        <td><strong>${escapeHtml(alert.equipmentId)}</strong></td>
                        <td>${escapeHtml(alert.sensorType)}</td>
                        <td><span class="status ${alert.severity}">${escapeHtml(alert.severity)}</span></td>
                        <td>${alert.value}</td>
                        <td>${alert.threshold}</td>
                        <td>${escapeHtml(alert.message)}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>
    ` : ''}

    <div class="footer">
        <p>Generated by ARUS Marine Predictive Maintenance System | ${timestamp}</p>
        <p>This report contains AI-generated insights for enhanced decision making</p>
    </div>
</body>
</html>`;

      const filename = `llm_report_${type}_${new Date().toISOString().split('T')[0]}.html`;

      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(htmlContent);

    } catch (error) {
      console.error('LLM HTML export error:', error);
      res.status(500).json({ message: "Failed to export LLM report as HTML" });
    }
  });

  // Telemetry Import Routes
  const telemetryRowSchema = z.object({
    ts: z.string().refine(val => !isNaN(Date.parse(val)), "Invalid timestamp"),
    vessel: z.string().min(1),
    src: z.string().min(1), // source/device identifier
    sig: z.string().min(1), // signal/metric name
    value: z.number().optional(),
    unit: z.string().optional()
  });

  const telemetryPayloadSchema = z.object({
    rows: z.array(telemetryRowSchema).default([])
  });

  // JSON telemetry import
  app.post("/api/import/telemetry/json", bulkImportRateLimit, validateHMAC, async (req, res) => {
    const startTime = Date.now();
    const importId = `json-import-${Date.now()}`;
    
    try {
      const payload = telemetryPayloadSchema.parse(req.body);
      
      if (payload.rows.length === 0) {
        return res.json({ 
          ok: true, 
          imported: 0, 
          processed: 0,
          errors: [],
          importId,
          processingTime: Date.now() - startTime
        });
      }

      // Enhanced validation and processing with detailed error reporting
      const validRows: any[] = [];
      const processingErrors: any[] = [];
      const maxFutureTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes future limit
      
      payload.rows.forEach((row, index) => {
        try {
          // Enhanced marine equipment validation
          const timestamp = new Date(row.ts);
          
          // Validate timestamp sanity
          if (isNaN(timestamp.getTime())) {
            throw new Error(`Invalid timestamp format: ${row.ts}`);
          }
          
          if (timestamp > maxFutureTime) {
            throw new Error(`Timestamp too far in future. Check equipment clock synchronization.`);
          }
          
          // Validate sensor value if provided
          if (row.value !== undefined && row.value !== null) {
            const numValue = typeof row.value === 'string' ? parseFloat(row.value) : row.value;
            if (!isFinite(numValue)) {
              throw new Error(`Invalid sensor value: must be a finite number, got ${row.value}`);
            }
            row.value = numValue;
          }
          
          // Validate marine equipment identifiers
          if (!row.vessel || typeof row.vessel !== 'string' || row.vessel.trim().length === 0) {
            throw new Error(`Invalid vessel identifier: ${row.vessel}`);
          }
          
          if (!row.src || typeof row.src !== 'string' || row.src.trim().length === 0) {
            throw new Error(`Invalid equipment source: ${row.src}`);
          }
          
          if (!row.sig || typeof row.sig !== 'string' || row.sig.trim().length === 0) {
            throw new Error(`Invalid sensor signal: ${row.sig}`);
          }
          
          // Transform to raw telemetry format
          validRows.push({
            vessel: row.vessel.trim(),
            ts: timestamp,
            src: row.src.trim(),
            sig: row.sig.trim(),
            value: row.value ?? null, // Fix: Use nullish coalescing to preserve 0 values
            unit: row.unit?.trim() || null
          });
          
        } catch (validationError) {
          processingErrors.push({
            row: index + 1,
            data: row,
            error: validationError instanceof Error ? validationError.message : String(validationError),
            type: 'VALIDATION_ERROR'
          });
        }
      });

      // Attempt bulk insert of valid rows
      let inserted = 0;
      if (validRows.length > 0) {
        try {
          inserted = await storage.bulkInsertRawTelemetry(validRows);
        } catch (dbError) {
          console.error(`JSON import ${importId} database error:`, {
            error: dbError instanceof Error ? dbError.message : String(dbError),
            validRowCount: validRows.length,
            importId
          });
          
          processingErrors.push({
            type: 'DATABASE_ERROR',
            error: `Failed to insert ${validRows.length} valid rows: ${dbError instanceof Error ? dbError.message : String(dbError)}`,
            affectedRows: validRows.length
          });
        }
      }

      const processingTime = Date.now() - startTime;
      const response = {
        ok: true,
        imported: inserted,
        processed: payload.rows.length,
        validRows: validRows.length,
        errors: processingErrors,
        summary: {
          successRate: payload.rows.length > 0 ? (inserted / payload.rows.length * 100).toFixed(1) + '%' : '0%',
          errorRate: payload.rows.length > 0 ? (processingErrors.length / payload.rows.length * 100).toFixed(1) + '%' : '0%'
        },
        importId,
        processingTime: `${processingTime}ms`,
        message: `Successfully imported ${inserted} of ${payload.rows.length} telemetry records`
      };
      
      
      res.json(response);
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      console.error(`JSON import ${importId} failed:`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        processingTime,
        ip: req.ip
      });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "JSON payload validation error", 
          errors: error.errors,
          code: "PAYLOAD_VALIDATION_ERROR",
          importId,
          processingTime: `${processingTime}ms`
        });
      }
      
      res.status(500).json({ 
        message: "Failed to import JSON telemetry data",
        code: "IMPORT_FAILURE",
        importId,
        processingTime: `${processingTime}ms`
      });
    }
  });

  // CSV telemetry import (with multipart support for file uploads)
  app.post("/api/import/telemetry/csv", bulkImportRateLimit, validateHMAC, async (req, res) => {
    const startTime = Date.now();
    const importId = `csv-import-${Date.now()}`;
    
    try {
      // Enhanced CSV data validation
      const csvText = req.body.csvData || '';
      
      if (!csvText.trim()) {
        return res.status(400).json({ 
          message: "No CSV data provided",
          code: "EMPTY_CSV_DATA",
          importId,
          processingTime: `${Date.now() - startTime}ms`
        });
      }

      // Parse CSV with enhanced error handling
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        let i = 0;
        
        while (i < line.length) {
          const char = line[i];
          
          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              // Escaped quote
              current += '"';
              i += 2;
            } else {
              // Toggle quote state
              inQuotes = !inQuotes;
              i++;
            }
          } else if (char === ',' && !inQuotes) {
            // Field separator outside quotes
            result.push(current.trim());
            current = '';
            i++;
          } else {
            current += char;
            i++;
          }
        }
        
        // Add final field
        result.push(current.trim());
        return result;
      }

      const lines = csvText.trim().split('\n');
      if (lines.length < 2) {
        return res.status(400).json({
          message: "CSV must contain at least a header row and one data row",
          code: "INSUFFICIENT_CSV_DATA",
          importId,
          processingTime: `${Date.now() - startTime}ms`
        });
      }

      const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
      
      // Enhanced header validation with case-insensitive matching
      const requiredHeaders = ['ts', 'vessel', 'src', 'sig'];
      const normalizedHeaders = headers.map(h => h.toLowerCase());
      const missingHeaders = requiredHeaders.filter(h => !normalizedHeaders.includes(h));
      
      if (missingHeaders.length > 0) {
        return res.status(400).json({ 
          message: `Missing required columns: ${missingHeaders.join(', ')}. Found columns: ${headers.join(', ')}`,
          code: "MISSING_HEADERS",
          required: requiredHeaders,
          found: headers,
          importId,
          processingTime: `${Date.now() - startTime}ms`
        });
      }

      // Enhanced processing with detailed error tracking
      const validRows: any[] = [];
      const processingErrors: any[] = [];
      const maxFutureTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes future limit
      
      for (let i = 1; i < lines.length; i++) {
        const lineNumber = i + 1;
        const line = lines[i].trim();
        
        // Skip empty lines
        if (!line) {
          continue;
        }
        
        try {
          const values = parseCSVLine(line);
          
          // Check column count
          if (values.length !== headers.length) {
            processingErrors.push({
              row: lineNumber,
              line: line.substring(0, 100) + (line.length > 100 ? '...' : ''),
              error: `Column count mismatch: expected ${headers.length} columns, got ${values.length}`,
              type: 'COLUMN_COUNT_ERROR'
            });
            continue;
          }
          
          const rowData: any = {};
          headers.forEach((header, index) => {
            rowData[header.toLowerCase()] = values[index];
          });

          // Enhanced marine equipment validation
          const timestamp = new Date(rowData.ts);
          
          // Validate timestamp
          if (isNaN(timestamp.getTime())) {
            throw new Error(`Invalid timestamp format: ${rowData.ts}`);
          }
          
          if (timestamp > maxFutureTime) {
            throw new Error(`Timestamp too far in future. Check equipment clock synchronization.`);
          }
          
          // Validate vessel identifier
          if (!rowData.vessel || typeof rowData.vessel !== 'string' || rowData.vessel.trim().length === 0) {
            throw new Error(`Invalid vessel identifier: ${rowData.vessel}`);
          }
          
          // Validate equipment source
          if (!rowData.src || typeof rowData.src !== 'string' || rowData.src.trim().length === 0) {
            throw new Error(`Invalid equipment source: ${rowData.src}`);
          }
          
          // Validate sensor signal
          if (!rowData.sig || typeof rowData.sig !== 'string' || rowData.sig.trim().length === 0) {
            throw new Error(`Invalid sensor signal: ${rowData.sig}`);
          }
          
          // Validate sensor value if provided
          let numericValue = null;
          if (rowData.value && rowData.value.trim() !== '') {
            numericValue = parseFloat(rowData.value);
            if (!isFinite(numericValue)) {
              throw new Error(`Invalid sensor value: must be a finite number, got ${rowData.value}`);
            }
          }

          // Transform to telemetry format
          validRows.push({
            vessel: rowData.vessel.trim(),
            ts: timestamp,
            src: rowData.src.trim(),
            sig: rowData.sig.trim(),
            value: numericValue, // Already properly validated and preserves 0 values
            unit: rowData.unit?.trim() || null
          });
          
        } catch (validationError) {
          processingErrors.push({
            row: lineNumber,
            line: line.substring(0, 100) + (line.length > 100 ? '...' : ''),
            error: validationError instanceof Error ? validationError.message : String(validationError),
            type: 'VALIDATION_ERROR'
          });
        }
      }

      // Check if any valid rows were found
      if (validRows.length === 0) {
        return res.status(400).json({
          message: "No valid telemetry rows found in CSV",
          code: "NO_VALID_ROWS",
          totalRows: lines.length - 1,
          errors: processingErrors,
          importId,
          processingTime: `${Date.now() - startTime}ms`
        });
      }

      // Attempt bulk insert with enhanced error handling
      let inserted = 0;
      if (validRows.length > 0) {
        try {
          inserted = await storage.bulkInsertRawTelemetry(validRows);
        } catch (dbError) {
          console.error(`CSV import ${importId} database error:`, {
            error: dbError instanceof Error ? dbError.message : String(dbError),
            validRowCount: validRows.length,
            importId
          });
          
          processingErrors.push({
            type: 'DATABASE_ERROR',
            error: `Failed to insert ${validRows.length} valid rows: ${dbError instanceof Error ? dbError.message : String(dbError)}`,
            affectedRows: validRows.length
          });
        }
      }

      const processingTime = Date.now() - startTime;
      const totalProcessed = lines.length - 1; // Exclude header
      
      const response = {
        ok: true,
        imported: inserted,
        processed: totalProcessed,
        validRows: validRows.length,
        errors: processingErrors,
        summary: {
          successRate: totalProcessed > 0 ? (inserted / totalProcessed * 100).toFixed(1) + '%' : '0%',
          errorRate: totalProcessed > 0 ? (processingErrors.length / totalProcessed * 100).toFixed(1) + '%' : '0%',
          csvStats: {
            totalLines: lines.length,
            headerLine: 1,
            dataLines: totalProcessed,
            emptyLinesSkipped: lines.length - 1 - totalProcessed - processingErrors.length
          }
        },
        importId,
        processingTime: `${processingTime}ms`,
        message: `Successfully imported ${inserted} of ${totalProcessed} telemetry records from CSV`
      };
      
      
      res.json(response);
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      console.error(`CSV import ${importId} failed:`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        processingTime,
        ip: req.ip
      });
      
      res.status(500).json({ 
        message: "Failed to import CSV telemetry data",
        code: "CSV_IMPORT_FAILURE",
        importId,
        processingTime: `${processingTime}ms`
      });
    }
  });

  // Transport settings routes
  app.get("/api/transport-settings", async (req, res) => {
    try {
      const settings = await storage.getTransportSettings();
      res.json(settings || {
        enableHttpIngest: true,
        enableMqttIngest: false,
        mqttHost: "",
        mqttPort: 8883,
        mqttUser: "",
        mqttPass: "",
        mqttTopic: "fleet/+/telemetry"
      });
    } catch (error) {
      console.error('Get transport settings error:', error);
      res.status(500).json({ message: "Failed to get transport settings" });
    }
  });

  app.put("/api/transport-settings", async (req, res) => {
    try {
      const settings = insertTransportSettingsSchema.parse(req.body);
      
      const existingSettings = await storage.getTransportSettings();
      let result;
      
      if (existingSettings) {
        result = await storage.updateTransportSettings(existingSettings.id, settings);
      } else {
        result = await storage.createTransportSettings(settings);
      }
      
      res.json({ 
        ok: true, 
        settings: result,
        message: "Transport settings updated successfully"
      });
    } catch (error) {
      console.error('Update transport settings error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update transport settings" });
    }
  });

  // Raw telemetry data retrieval
  app.get("/api/raw-telemetry", async (req, res) => {
    try {
      const { vessel, fromDate, toDate } = req.query;
      
      const from = fromDate ? new Date(fromDate as string) : undefined;
      const to = toDate ? new Date(toDate as string) : undefined;
      
      const telemetryData = await storage.getRawTelemetry(vessel as string, from, to);
      res.json(telemetryData);
    } catch (error) {
      console.error('Get raw telemetry error:', error);
      res.status(500).json({ message: "Failed to get raw telemetry data" });
    }
  });

  // Advanced Historical Analytics Endpoints

  // Anomaly Detection Analytics
  app.get("/api/analytics/anomalies", async (req, res) => {
    try {
      const { equipmentId, sensorType, hours, threshold } = req.query;
      const hoursNum = hours ? parseInt(hours as string) : 168; // Default 7 days
      const thresholdNum = threshold ? parseFloat(threshold as string) : 2.0; // 2 std deviations
      
      const telemetryData = await storage.getTelemetryTrends(equipmentId as string, hoursNum);
      
      const anomalies = telemetryData.map(trend => {
        if (!trend.data || trend.data.length < 10) return null; // Need sufficient data
        
        const values = trend.data.map(d => d.value).filter(v => v !== null && v !== undefined);
        if (values.length < 10) return null;
        
        // Calculate statistical metrics
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        
        // Detect anomalies (values beyond threshold standard deviations)
        const anomalyPoints = trend.data.filter(d => {
          if (d.value === null || d.value === undefined) return false;
          const zScore = Math.abs(d.value - mean) / stdDev;
          return zScore > thresholdNum;
        });
        
        if (anomalyPoints.length === 0) return null;
        
        return {
          equipmentId: trend.equipmentId,
          sensorType: trend.sensorType,
          unit: trend.unit,
          anomalyCount: anomalyPoints.length,
          anomalyRate: (anomalyPoints.length / trend.data.length) * 100,
          baseline: { mean, stdDev },
          anomalies: anomalyPoints.map(point => ({
            timestamp: point.ts,
            value: point.value,
            deviation: Math.abs(point.value - mean) / stdDev,
            severity: Math.abs(point.value - mean) / stdDev > 3 ? 'critical' : 'warning'
          }))
        };
      }).filter(Boolean);

      res.json(anomalies);
    } catch (error) {
      console.error('Anomaly detection error:', error);
      res.status(500).json({ message: "Failed to detect anomalies" });
    }
  });

  // Equipment Health Trend Analysis
  app.get("/api/analytics/health-trends", async (req, res) => {
    try {
      const { equipmentId, months } = req.query;
      const monthsNum = months ? parseInt(months as string) : 12;
      
      const pdmScores = await storage.getPdmScores(equipmentId as string);
      const telemetryData = await storage.getTelemetryTrends(equipmentId as string, monthsNum * 30 * 24);
      
      // Group PdM scores by month
      const healthTrends: Record<string, any> = {};
      pdmScores.forEach(score => {
        if (!score.ts) return; // Skip if no timestamp
        const monthKey = format(new Date(score.ts), 'yyyy-MM');
        if (!healthTrends[monthKey]) {
          healthTrends[monthKey] = {
            month: monthKey,
            avgHealthScore: 0,
            minHealthScore: 100,
            maxHealthScore: 0,
            riskLevel: 'low',
            scores: []
          };
        }
        
        const healthScore = score.healthIdx || 0;
        healthTrends[monthKey].scores.push(healthScore);
        healthTrends[monthKey].minHealthScore = Math.min(healthTrends[monthKey].minHealthScore, healthScore);
        healthTrends[monthKey].maxHealthScore = Math.max(healthTrends[monthKey].maxHealthScore, healthScore);
      });
      
      // Calculate averages and risk levels
      Object.values(healthTrends).forEach((trend: any) => {
        trend.avgHealthScore = trend.scores.reduce((a, b) => a + b, 0) / trend.scores.length;
        trend.riskLevel = trend.avgHealthScore < 30 ? 'critical' : 
                         trend.avgHealthScore < 60 ? 'warning' : 'healthy';
        trend.trendDirection = trend.scores.length > 1 ? 
          (trend.scores[trend.scores.length - 1] > trend.scores[0] ? 'improving' : 'declining') : 'stable';
        delete trend.scores; // Clean up for response
      });
      
      // Add sensor reliability metrics
      const sensorReliability = telemetryData.map(trend => ({
        equipmentId: trend.equipmentId,
        sensorType: trend.sensorType,
        reliability: trend.data ? (trend.data.filter(d => d.status === 'normal').length / trend.data.length) * 100 : 0,
        avgValue: trend.data ? trend.data.reduce((sum, d) => sum + (d.value || 0), 0) / trend.data.length : 0,
        dataPoints: trend.data ? trend.data.length : 0
      }));

      res.json({
        healthTrends: Object.values(healthTrends).sort((a: any, b: any) => a.month.localeCompare(b.month)),
        sensorReliability: sensorReliability
      });
    } catch (error) {
      console.error('Health trends analysis error:', error);
      res.status(500).json({ message: "Failed to analyze health trends" });
    }
  });

  // Operational Efficiency Analytics  
  app.get("/api/analytics/operational-efficiency", async (req, res) => {
    try {
      const { equipmentId, hours } = req.query;
      const hoursNum = hours ? parseInt(hours as string) : 168; // Default 7 days
      
      const telemetryData = await storage.getTelemetryTrends(equipmentId as string, hoursNum);
      const pdmScores = await storage.getPdmScores(equipmentId as string);
      const maintenanceRecords = await storage.getMaintenanceRecords(equipmentId as string);
      
      const efficiency = telemetryData.map(trend => {
        if (!trend.data || trend.data.length === 0) return null;
        
        // Calculate uptime (percentage of normal status readings)
        const normalReadings = trend.data.filter(d => d.status === 'normal').length;
        const uptime = (normalReadings / trend.data.length) * 100;
        
        // Calculate availability (percentage of time with data)
        const expectedDataPoints = hoursNum * 12; // Assuming 5-minute intervals
        const availability = Math.min((trend.data.length / expectedDataPoints) * 100, 100);
        
        // Performance score from latest PdM data
        const latestPdm = pdmScores
          .filter(score => score.equipmentId === trend.equipmentId)
          .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())[0];
        
        const performanceScore = latestPdm ? latestPdm.healthIdx : null;
        
        // Calculate efficiency index (composite metric)
        const efficiencyIndex = performanceScore ? 
          (uptime * 0.4 + availability * 0.3 + performanceScore * 0.3) : 
          (uptime * 0.6 + availability * 0.4);
        
        return {
          equipmentId: trend.equipmentId,
          sensorType: trend.sensorType,
          uptime: Math.round(uptime * 100) / 100,
          availability: Math.round(availability * 100) / 100,
          performanceScore: performanceScore ? Math.round(performanceScore * 100) / 100 : null,
          efficiencyIndex: Math.round(efficiencyIndex * 100) / 100,
          status: efficiencyIndex > 80 ? 'excellent' : 
                 efficiencyIndex > 60 ? 'good' : 
                 efficiencyIndex > 40 ? 'fair' : 'poor',
          dataQuality: trend.data.filter(d => d.value !== null).length / trend.data.length * 100
        };
      }).filter(Boolean);

      // Fleet-wide efficiency summary
      const fleetSummary = efficiency.length > 0 ? {
        avgUptime: efficiency.reduce((sum, e) => sum + e.uptime, 0) / efficiency.length,
        avgAvailability: efficiency.reduce((sum, e) => sum + e.availability, 0) / efficiency.length,
        avgEfficiencyIndex: efficiency.reduce((sum, e) => sum + e.efficiencyIndex, 0) / efficiency.length,
        equipmentCount: efficiency.length,
        excellentCount: efficiency.filter(e => e.status === 'excellent').length,
        poorCount: efficiency.filter(e => e.status === 'poor').length
      } : null;

      res.json({
        equipmentEfficiency: efficiency,
        fleetSummary: fleetSummary
      });
    } catch (error) {
      console.error('Operational efficiency analysis error:', error);
      res.status(500).json({ message: "Failed to analyze operational efficiency" });
    }
  });

  // Failure Pattern Analysis
  app.get("/api/analytics/failure-patterns", async (req, res) => {
    try {
      const { equipmentId, months } = req.query;
      const monthsNum = months ? parseInt(months as string) : 12;
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - monthsNum);
      
      const alerts = await storage.getAlertNotifications();
      const pdmScores = await storage.getPdmScores(equipmentId as string);
      const maintenanceRecords = await storage.getMaintenanceRecords(equipmentId as string, cutoffDate);
      
      // Analyze failure patterns from alerts
      const criticalAlerts = alerts.filter(alert => 
        alert.alertType === 'critical' && 
        (!equipmentId || alert.equipmentId === equipmentId) &&
        alert.createdAt && alert.createdAt >= cutoffDate
      );
      
      // Group by equipment and sensor type
      const failurePatterns: Record<string, any> = {};
      criticalAlerts.forEach(alert => {
        const key = `${alert.equipmentId}-${alert.sensorType}`;
        if (!failurePatterns[key]) {
          failurePatterns[key] = {
            equipmentId: alert.equipmentId,
            sensorType: alert.sensorType,
            failureCount: 0,
            avgTimeBetweenFailures: 0,
            commonThresholds: [],
            riskScore: 0,
            failures: []
          };
        }
        
        failurePatterns[key].failureCount++;
        failurePatterns[key].failures.push({
          timestamp: alert.createdAt,
          value: alert.value,
          threshold: alert.threshold,
          message: alert.message
        });
      });
      
      // Calculate patterns and risk scores
      Object.values(failurePatterns).forEach((pattern: any) => {
        // Sort failures by time
        pattern.failures.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        // Calculate average time between failures
        if (pattern.failures.length > 1) {
          const timeDiffs = [];
          for (let i = 1; i < pattern.failures.length; i++) {
            const diff = new Date(pattern.failures[i].timestamp).getTime() - 
                        new Date(pattern.failures[i-1].timestamp).getTime();
            timeDiffs.push(diff / (1000 * 60 * 60 * 24)); // Convert to days
          }
          pattern.avgTimeBetweenFailures = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
        }
        
        // Calculate risk score based on frequency and recent activity
        const recentFailures = pattern.failures.filter(f => 
          new Date(f.timestamp).getTime() > Date.now() - (30 * 24 * 60 * 60 * 1000) // Last 30 days
        ).length;
        
        pattern.riskScore = Math.min(100, (pattern.failureCount * 10) + (recentFailures * 20));
        pattern.riskLevel = pattern.riskScore > 70 ? 'high' : 
                           pattern.riskScore > 40 ? 'medium' : 'low';
        
        // Clean up for response
        pattern.failures = pattern.failures.slice(-5); // Keep only last 5 failures
      });
      
      // Predictive failure risk analysis
      const riskPredictions = pdmScores
        .filter(score => !equipmentId || score.equipmentId === equipmentId)
        .map(score => {
          const failurePattern = Object.values(failurePatterns).find((p: any) => p.equipmentId === score.equipmentId);
          const historicalRisk = failurePattern ? (failurePattern as any).riskScore : 0;
          
          // Combine PdM score with historical failure data
          const combinedRisk = (100 - score.healthIdx) * 0.7 + historicalRisk * 0.3;
          
          return {
            equipmentId: score.equipmentId,
            currentHealthScore: score.healthIdx,
            failureRisk: Math.round(combinedRisk),
            predictedFailureDays: score.pFail30d ? Math.round(30 * score.pFail30d) : null,
            riskLevel: combinedRisk > 70 ? 'critical' : 
                      combinedRisk > 50 ? 'high' : 
                      combinedRisk > 30 ? 'medium' : 'low',
            lastPrediction: score.ts
          };
        })
        .sort((a, b) => b.failureRisk - a.failureRisk);

      res.json({
        failurePatterns: Object.values(failurePatterns).sort((a: any, b: any) => b.riskScore - a.riskScore),
        riskPredictions: riskPredictions,
        summary: {
          totalFailures: criticalAlerts.length,
          equipmentAtRisk: riskPredictions.filter(r => r.riskLevel === 'critical' || r.riskLevel === 'high').length,
          avgRiskScore: riskPredictions.length > 0 ? 
            riskPredictions.reduce((sum, r) => sum + r.failureRisk, 0) / riskPredictions.length : 0
        }
      });
    } catch (error) {
      console.error('Failure pattern analysis error:', error);
      res.status(500).json({ message: "Failed to analyze failure patterns" });
    }
  });

  // Advanced Cost Intelligence Endpoints

  // ROI Analysis
  app.get("/api/analytics/roi-analysis", async (req, res) => {
    try {
      const { equipmentId, months } = req.query;
      const monthsNum = months ? parseInt(months as string) : 12;
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - monthsNum);
      
      const maintenanceCosts = await storage.getMaintenanceCosts(equipmentId as string, undefined, cutoffDate);
      const maintenanceRecords = await storage.getMaintenanceRecords(equipmentId as string, cutoffDate);
      const pdmScores = await storage.getPdmScores(equipmentId as string);
      const telemetryData = await storage.getTelemetryTrends(equipmentId as string, monthsNum * 30 * 24);
      
      // Calculate operational efficiency metrics for ROI calculation
      const equipmentROI = {};
      telemetryData.forEach(trend => {
        if (!trend.data || trend.data.length === 0) return;
        
        const normalReadings = trend.data.filter(d => d.status === 'normal').length;
        const uptime = (normalReadings / trend.data.length) * 100;
        
        // Get costs for this equipment
        const equipmentCosts = maintenanceCosts.filter(c => c.equipmentId === trend.equipmentId);
        const totalCosts = equipmentCosts.reduce((sum, c) => sum + c.amount, 0);
        
        // Get maintenance events
        const maintenanceEvents = maintenanceRecords.filter(r => r.equipmentId === trend.equipmentId);
        
        // Estimate operational value based on uptime
        // Assuming $1000/day operational value for marine equipment
        const dailyValue = 1000;
        const daysAnalyzed = monthsNum * 30;
        const operationalValue = (uptime / 100) * dailyValue * daysAnalyzed;
        
        // Calculate ROI metrics
        const roi = totalCosts > 0 ? ((operationalValue - totalCosts) / totalCosts) * 100 : 0;
        const costPerUptimeDay = totalCosts > 0 ? totalCosts / (daysAnalyzed * uptime / 100) : 0;
        
        // Get latest health score for predictive analysis
        const latestHealth = pdmScores
          .filter(score => score.equipmentId === trend.equipmentId)
          .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())[0];
        
        // Predict future costs based on health trend
        const healthDeclineRate = latestHealth ? Math.max(0, (100 - latestHealth.healthIdx) / 100) : 0.1;
        const predictedAnnualCosts = totalCosts * (1 + healthDeclineRate * 0.5); // Declining health increases costs
        
        equipmentROI[trend.equipmentId] = {
          equipmentId: trend.equipmentId,
          currentUptime: Math.round(uptime * 100) / 100,
          totalCosts: Math.round(totalCosts),
          operationalValue: Math.round(operationalValue),
          roi: Math.round(roi * 100) / 100,
          costPerUptimeDay: Math.round(costPerUptimeDay),
          maintenanceEvents: maintenanceEvents.length,
          currentHealthScore: latestHealth ? latestHealth.healthIdx : null,
          predictedAnnualCosts: Math.round(predictedAnnualCosts),
          costOptimizationPotential: Math.round((totalCosts - predictedAnnualCosts * 0.8)),
          riskLevel: roi < 0 ? 'high' : roi < 50 ? 'medium' : 'low'
        };
      });
      
      // Fleet-wide ROI summary
      const roiValues = Object.values(equipmentROI);
      const fleetROI = roiValues.length > 0 ? {
        totalInvestment: roiValues.reduce((sum: number, e: any) => sum + e.totalCosts, 0),
        totalOperationalValue: roiValues.reduce((sum: number, e: any) => sum + e.operationalValue, 0),
        avgROI: roiValues.reduce((sum: number, e: any) => sum + e.roi, 0) / roiValues.length,
        bestPerformer: roiValues.reduce((best: any, current: any) => current.roi > best.roi ? current : best),
        worstPerformer: roiValues.reduce((worst: any, current: any) => current.roi < worst.roi ? current : worst),
        equipmentAtRisk: roiValues.filter((e: any) => e.riskLevel === 'high').length,
        totalOptimizationPotential: roiValues.reduce((sum: number, e: any) => sum + Math.max(0, e.costOptimizationPotential), 0)
      } : null;

      res.json({
        equipmentROI: roiValues,
        fleetROI: fleetROI,
        analysisMetadata: {
          periodMonths: monthsNum,
          equipmentAnalyzed: roiValues.length,
          totalMaintenanceEvents: maintenanceRecords.length
        }
      });
    } catch (error) {
      console.error('ROI analysis error:', error);
      res.status(500).json({ message: "Failed to perform ROI analysis" });
    }
  });

  // Cost Optimization Recommendations
  app.get("/api/analytics/cost-optimization", async (req, res) => {
    try {
      const { equipmentId } = req.query;
      const months = 12;
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - months);
      
      const maintenanceCosts = await storage.getMaintenanceCosts(equipmentId as string, undefined, cutoffDate);
      const maintenanceRecords = await storage.getMaintenanceRecords(equipmentId as string, cutoffDate);
      const pdmScores = await storage.getPdmScores(equipmentId as string);
      const alerts = await storage.getAlertNotifications();
      
      const recommendations: any[] = [];
      
      // Analyze costs by equipment
      const costsByEquipment: Record<string, any> = {};
      maintenanceCosts.forEach(cost => {
        if (!costsByEquipment[cost.equipmentId]) {
          costsByEquipment[cost.equipmentId] = {
            equipmentId: cost.equipmentId,
            totalCosts: 0,
            costsByType: {},
            maintenanceFrequency: 0,
            avgCostPerEvent: 0
          };
        }
        
        costsByEquipment[cost.equipmentId].totalCosts += cost.amount;
        costsByEquipment[cost.equipmentId].costsByType[cost.costType] = 
          (costsByEquipment[cost.equipmentId].costsByType[cost.costType] || 0) + cost.amount;
      });
      
      // Add maintenance frequency data
      Object.keys(costsByEquipment).forEach(equipId => {
        const events = maintenanceRecords.filter(r => r.equipmentId === equipId);
        costsByEquipment[equipId].maintenanceFrequency = events.length;
        costsByEquipment[equipId].avgCostPerEvent = 
          events.length > 0 ? costsByEquipment[equipId].totalCosts / events.length : 0;
      });
      
      // Generate optimization recommendations
      Object.values(costsByEquipment).forEach((equipment: any) => {
        const latestHealth = pdmScores
          .filter(score => score.equipmentId === equipment.equipmentId)
          .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())[0];
        
        const criticalAlerts = alerts.filter(alert => 
          alert.equipmentId === equipment.equipmentId && 
          alert.alertType === 'critical' &&
          alert.createdAt >= cutoffDate
        ).length;
        
        // High maintenance frequency recommendation
        if (equipment.maintenanceFrequency > 4) {
          recommendations.push({
            equipmentId: equipment.equipmentId,
            type: 'maintenance_frequency',
            priority: 'high',
            title: 'Reduce Maintenance Frequency',
            description: `${equipment.equipmentId} has ${equipment.maintenanceFrequency} maintenance events in 12 months`,
            potentialSavings: Math.round(equipment.totalCosts * 0.2),
            actionItems: [
              'Review maintenance procedures for efficiency',
              'Consider predictive maintenance scheduling',
              'Evaluate equipment condition for potential replacement'
            ],
            impactLevel: equipment.totalCosts > 10000 ? 'high' : 'medium'
          });
        }
        
        // High cost per event recommendation
        if (equipment.avgCostPerEvent > 2000) {
          recommendations.push({
            equipmentId: equipment.equipmentId,
            type: 'cost_per_event',
            priority: 'medium',
            title: 'Optimize Maintenance Costs',
            description: `Average cost per maintenance event is $${Math.round(equipment.avgCostPerEvent)}`,
            potentialSavings: Math.round(equipment.avgCostPerEvent * 0.15 * equipment.maintenanceFrequency),
            actionItems: [
              'Negotiate better rates with maintenance providers',
              'Consider bulk purchasing of common parts',
              'Train crew for basic maintenance tasks'
            ],
            impactLevel: 'medium'
          });
        }
        
        // Declining health recommendation
        if (latestHealth && latestHealth.healthIdx < 60) {
          recommendations.push({
            equipmentId: equipment.equipmentId,
            type: 'declining_health',
            priority: 'critical',
            title: 'Address Declining Equipment Health',
            description: `Health score is ${latestHealth.healthIdx}% - intervention needed`,
            potentialSavings: Math.round(equipment.totalCosts * 0.3),
            actionItems: [
              'Schedule immediate inspection',
              'Consider preventive maintenance',
              'Evaluate replacement vs repair costs'
            ],
            impactLevel: 'high'
          });
        }
        
        // Critical alerts pattern recommendation
        if (criticalAlerts > 3) {
          recommendations.push({
            equipmentId: equipment.equipmentId,
            type: 'alert_pattern',
            priority: 'high',
            title: 'Address Recurring Critical Alerts',
            description: `${criticalAlerts} critical alerts in 12 months indicate systemic issues`,
            potentialSavings: Math.round(equipment.totalCosts * 0.25),
            actionItems: [
              'Investigate root cause of recurring alerts',
              'Upgrade monitoring equipment if needed',
              'Implement proactive maintenance schedule'
            ],
            impactLevel: 'high'
          });
        }
        
        // Parts cost optimization
        const partsCost = equipment.costsByType.parts || 0;
        if (partsCost > equipment.totalCosts * 0.4) {
          recommendations.push({
            equipmentId: equipment.equipmentId,
            type: 'parts_optimization',
            priority: 'medium',
            title: 'Optimize Parts Management',
            description: `Parts costs represent ${Math.round(partsCost / equipment.totalCosts * 100)}% of total maintenance costs`,
            potentialSavings: Math.round(partsCost * 0.15),
            actionItems: [
              'Review parts inventory management',
              'Consider alternative suppliers',
              'Implement just-in-time parts ordering'
            ],
            impactLevel: 'medium'
          });
        }
      });
      
      // Sort recommendations by potential savings
      recommendations.sort((a, b) => b.potentialSavings - a.potentialSavings);
      
      // Calculate total optimization potential
      const totalSavings = recommendations.reduce((sum, rec) => sum + rec.potentialSavings, 0);
      const totalCurrentCosts = Object.values(costsByEquipment).reduce((sum: number, eq: any) => sum + eq.totalCosts, 0);
      
      res.json({
        recommendations: recommendations,
        summary: {
          totalRecommendations: recommendations.length,
          totalPotentialSavings: totalSavings,
          currentAnnualCosts: totalCurrentCosts,
          optimizationPercentage: totalCurrentCosts > 0 ? Math.round((totalSavings / totalCurrentCosts) * 100) : 0,
          priorityBreakdown: {
            critical: recommendations.filter(r => r.priority === 'critical').length,
            high: recommendations.filter(r => r.priority === 'high').length,
            medium: recommendations.filter(r => r.priority === 'medium').length
          }
        }
      });
    } catch (error) {
      console.error('Cost optimization analysis error:', error);
      res.status(500).json({ message: "Failed to generate cost optimization recommendations" });
    }
  });

  // Advanced Cost Trends Analysis
  app.get("/api/analytics/advanced-cost-trends", async (req, res) => {
    try {
      const { equipmentId, months } = req.query;
      const monthsNum = months ? parseInt(months as string) : 24; // Default 2 years for trend analysis
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - monthsNum);
      
      const maintenanceCosts = await storage.getMaintenanceCosts(equipmentId as string, undefined, cutoffDate);
      const maintenanceRecords = await storage.getMaintenanceRecords(equipmentId as string, cutoffDate);
      const pdmScores = await storage.getPdmScores(equipmentId as string);
      
      // Group costs by month and equipment
      const monthlyTrends: Record<string, any> = {};
      maintenanceCosts.forEach(cost => {
        if (!cost.createdAt) return; // Skip if no creation date
        const monthKey = format(new Date(cost.createdAt), 'yyyy-MM');
        if (!monthlyTrends[monthKey]) {
          monthlyTrends[monthKey] = {
            month: monthKey,
            totalCosts: 0,
            costsByType: {},
            costsByEquipment: {},
            maintenanceEvents: 0,
            avgHealthScore: 0,
            healthScores: []
          };
        }
        
        monthlyTrends[monthKey].totalCosts += cost.amount;
        monthlyTrends[monthKey].costsByType[cost.costType] = 
          (monthlyTrends[monthKey].costsByType[cost.costType] || 0) + cost.amount;
        monthlyTrends[monthKey].costsByEquipment[cost.equipmentId] = 
          (monthlyTrends[monthKey].costsByEquipment[cost.equipmentId] || 0) + cost.amount;
      });
      
      // Add maintenance events count
      maintenanceRecords.forEach(record => {
        const monthKey = format(new Date(record.createdAt!), 'yyyy-MM');
        if (monthlyTrends[monthKey]) {
          monthlyTrends[monthKey].maintenanceEvents++;
        }
      });
      
      // Add health scores
      pdmScores.forEach(score => {
        const monthKey = format(new Date(score.ts), 'yyyy-MM');
        if (monthlyTrends[monthKey]) {
          monthlyTrends[monthKey].healthScores.push(score.healthIdx);
        }
      });
      
      // Calculate average health scores and cost trends
      Object.values(monthlyTrends).forEach((trend: any) => {
        if (trend.healthScores.length > 0) {
          trend.avgHealthScore = trend.healthScores.reduce((a, b) => a + b, 0) / trend.healthScores.length;
        }
        delete trend.healthScores; // Clean up for response
      });
      
      const trendsArray = Object.values(monthlyTrends).sort((a: any, b: any) => a.month.localeCompare(b.month));
      
      // Calculate cost predictions and trends
      const recentTrends = trendsArray.slice(-6); // Last 6 months
      const avgMonthlyCost = recentTrends.reduce((sum: number, t: any) => sum + t.totalCosts, 0) / recentTrends.length;
      const costTrendDirection = recentTrends.length > 1 ? 
        (recentTrends[recentTrends.length - 1].totalCosts > recentTrends[0].totalCosts ? 'increasing' : 'decreasing') : 'stable';
      
      // Predict next 3 months based on trend
      const trendMultiplier = costTrendDirection === 'increasing' ? 1.1 : 
                             costTrendDirection === 'decreasing' ? 0.9 : 1.0;
      
      const predictions = [];
      for (let i = 1; i <= 3; i++) {
        const futureMonth = new Date();
        futureMonth.setMonth(futureMonth.getMonth() + i);
        predictions.push({
          month: format(futureMonth, 'yyyy-MM'),
          predictedCosts: Math.round(avgMonthlyCost * Math.pow(trendMultiplier, i)),
          confidence: Math.max(0.6, 1 - (i * 0.1)) // Decreasing confidence for future months
        });
      }
      
      // Cost efficiency analysis
      const costEfficiency = trendsArray.map((trend: any) => ({
        month: trend.month,
        costPerEvent: trend.maintenanceEvents > 0 ? trend.totalCosts / trend.maintenanceEvents : 0,
        healthVsCost: trend.avgHealthScore > 0 ? trend.totalCosts / trend.avgHealthScore : 0,
        efficiency: trend.avgHealthScore > 0 && trend.totalCosts > 0 ? 
          Math.round((trend.avgHealthScore / (trend.totalCosts / 1000)) * 100) / 100 : 0
      }));

      res.json({
        monthlyTrends: trendsArray,
        costEfficiency: costEfficiency,
        predictions: predictions,
        summary: {
          totalCosts: trendsArray.reduce((sum: number, t: any) => sum + t.totalCosts, 0),
          avgMonthlyCost: Math.round(avgMonthlyCost),
          costTrendDirection: costTrendDirection,
          totalEvents: trendsArray.reduce((sum: number, t: any) => sum + t.maintenanceEvents, 0),
          avgCostPerEvent: Math.round(avgMonthlyCost / (recentTrends.reduce((sum: number, t: any) => sum + t.maintenanceEvents, 0) / recentTrends.length || 1)),
          periodAnalyzed: monthsNum
        }
      });
    } catch (error) {
      console.error('Advanced cost trends analysis error:', error);
      res.status(500).json({ message: "Failed to analyze advanced cost trends" });
    }
  });

  // Clear telemetry data
  app.delete("/api/telemetry/cleanup", async (req, res) => {
    try {
      // Clear telemetry data that doesn't have corresponding devices
      await storage.clearOrphanedTelemetryData();
      res.json({ 
        ok: true,
        message: "Telemetry data cleared successfully" 
      });
    } catch (error) {
      console.error('Clear telemetry data error:', error);
      res.status(500).json({ message: "Failed to clear telemetry data" });
    }
  });

  // Compliance reporting endpoints
  app.post("/api/compliance/audit-log", async (req, res) => {
    try {
      const auditData = insertComplianceAuditLogSchema.parse(req.body);
      const result = await storage.logComplianceAction(auditData);
      res.json(result);
    } catch (error) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to log compliance action" });
    }
  });

  app.get("/api/compliance/audit-log", async (req, res) => {
    try {
      const { entityType, entityId, complianceStandard, startDate, endDate } = req.query;
      
      const filters: any = {};
      if (entityType) filters.entityType = entityType as string;
      if (entityId) filters.entityId = entityId as string;
      if (complianceStandard) filters.complianceStandard = complianceStandard as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      
      const auditLog = await storage.getComplianceAuditLog(filters);
      res.json(auditLog);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve compliance audit log" });
    }
  });

  app.get("/api/reports/compliance/:type", async (req, res) => {
    try {
      const { type } = req.params;
      const { equipmentId, startDate, endDate, standard } = req.query;
      
      let reportData: any = {};
      
      switch (type) {
        case 'maintenance-compliance':
          const startDateParsed = startDate ? new Date(startDate as string) : undefined;
          const endDateParsed = endDate ? new Date(endDate as string) : undefined;
          const equipmentIdParsed = equipmentId !== 'all' ? equipmentId as string : undefined;
          
          const [maintenanceRecords, schedules, auditLog] = await Promise.all([
            storage.getMaintenanceRecords(equipmentIdParsed, startDateParsed, endDateParsed),
            storage.getMaintenanceSchedules(equipmentIdParsed),
            storage.getComplianceAuditLog({ 
              entityType: 'maintenance',
              complianceStandard: standard as string,
              startDate: startDateParsed,
              endDate: endDateParsed
            })
          ]);
          
          reportData = {
            type: 'maintenance-compliance',
            period: { startDate, endDate },
            standard: standard || 'ISM',
            summary: {
              totalMaintenanceRecords: maintenanceRecords.length,
              completedOnTime: maintenanceRecords.filter(r => r.completionStatus === 'completed').length,
              overdue: schedules.filter(s => s.status === 'scheduled' && new Date(s.scheduledDate) < new Date()).length,
              complianceRate: maintenanceRecords.length > 0 ? 
                Math.round((maintenanceRecords.filter(r => r.completionStatus === 'completed').length / maintenanceRecords.length) * 100) : 0
            },
            maintenanceRecords,
            schedules,
            auditTrail: auditLog
          };
          break;
          
        case 'alert-response':
          const alertNotifications = await storage.getAlertNotifications();
          const alertAuditLog = await storage.getComplianceAuditLog({ 
            entityType: 'alert',
            complianceStandard: standard as string,
            startDate: startDate ? new Date(startDate as string) : undefined,
            endDate: endDate ? new Date(endDate as string) : undefined
          });
          
          reportData = {
            type: 'alert-response',
            period: { startDate, endDate },
            standard: standard || 'SOLAS',
            summary: {
              totalAlerts: alertNotifications.length,
              acknowledgedAlerts: alertNotifications.filter(a => a.acknowledged).length,
              criticalAlerts: alertNotifications.filter(a => a.alertType === 'critical').length,
              responseRate: alertNotifications.length > 0 ?
                Math.round((alertNotifications.filter(a => a.acknowledged).length / alertNotifications.length) * 100) : 0
            },
            alerts: alertNotifications,
            auditTrail: alertAuditLog
          };
          break;
          
        default:
          return res.status(400).json({ message: "Invalid compliance report type" });
      }
      
      res.json(reportData);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate compliance report" });
    }
  });

  // =========================
  // LLM API ENDPOINTS (Marine Predictive Maintenance Analysis)
  // =========================

  // Equipment health analysis using AI
  app.post("/api/llm/equipment/analyze", reportGenerationRateLimit, async (req, res) => {
    try {
      const { equipmentId, sensorType, hours = 24, equipmentType } = req.body;
      
      if (!equipmentId || !sensorType) {
        return res.status(400).json({ 
          message: "Equipment ID and sensor type are required" 
        });
      }

      // Import the OpenAI service functions
      const { analyzeEquipmentHealth } = await import("./openai");
      
      // Get recent telemetry data for the equipment
      const telemetryData = await storage.getTelemetryHistory(equipmentId, sensorType, hours);
      
      if (telemetryData.length === 0) {
        return res.status(404).json({ 
          message: "No telemetry data found for equipment",
          equipmentId,
          sensorType
        });
      }

      // Generate AI analysis
      const analysis = await analyzeEquipmentHealth(telemetryData, equipmentId, equipmentType);
      
      res.json(analysis);
    } catch (error) {
      console.error("Equipment analysis failed:", error);
      res.status(500).json({ 
        message: "Failed to analyze equipment health",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Fleet-wide health analysis using AI
  app.post("/api/llm/fleet/analyze", reportGenerationRateLimit, async (req, res) => {
    try {
      const { hours = 24 } = req.body;
      
      // Import the OpenAI service functions
      const { analyzeFleetHealth } = await import("./openai");
      
      // Get equipment health data and recent telemetry trends
      const [equipmentHealth, telemetryTrends] = await Promise.all([
        storage.getEquipmentHealth(),
        storage.getTelemetryTrends(undefined, hours)
      ]);
      
      if (equipmentHealth.length === 0) {
        return res.status(404).json({ 
          message: "No equipment health data available for fleet analysis"
        });
      }

      // Generate fleet analysis
      const fleetAnalysis = await analyzeFleetHealth(equipmentHealth, telemetryTrends, storage);
      
      res.json(fleetAnalysis);
    } catch (error) {
      console.error("Fleet analysis failed:", error);
      res.status(500).json({ 
        message: "Failed to analyze fleet health",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Generate maintenance recommendations for specific alerts
  app.post("/api/llm/maintenance/recommend", generalApiRateLimit, async (req, res) => {
    try {
      const { alertType, equipmentId, sensorData, equipmentType } = req.body;
      
      if (!alertType || !equipmentId) {
        return res.status(400).json({ 
          message: "Alert type and equipment ID are required" 
        });
      }

      // Import the OpenAI service functions
      const { generateMaintenanceRecommendations } = await import("./openai");
      
      // Generate maintenance recommendations
      const recommendations = await generateMaintenanceRecommendations(
        alertType, 
        equipmentId, 
        sensorData, 
        equipmentType
      );
      
      res.json(recommendations);
    } catch (error) {
      console.error("Maintenance recommendation failed:", error);
      res.status(500).json({ 
        message: "Failed to generate maintenance recommendations",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Enhanced equipment insights endpoint (combines multiple AI analyses)
  app.get("/api/llm/equipment/:equipmentId/insights", generalApiRateLimit, async (req, res) => {
    try {
      const { equipmentId } = req.params;
      const { includeRecommendations = 'true', hours = '24' } = req.query;
      
      // Import the OpenAI service functions
      const { analyzeEquipmentHealth, generateMaintenanceRecommendations } = await import("./openai");
      
      // Get comprehensive equipment data
      const [device, equipmentHealth, alerts, telemetryTrends, pdmScore] = await Promise.all([
        storage.getDevice(equipmentId),
        storage.getEquipmentHealth(),
        storage.getAlertNotifications(),
        storage.getTelemetryTrends(equipmentId, parseInt(hours as string)),
        storage.getLatestPdmScore(equipmentId)
      ]);
      
      // Filter data for this specific equipment
      const recentAlerts = alerts.filter(alert => 
        alert.equipmentId === equipmentId
      ).slice(0, 10);
      
      const equipmentHealthData = equipmentHealth.find(h => h.equipmentId === equipmentId);
      
      if (telemetryTrends.length === 0) {
        return res.status(404).json({ 
          message: "No telemetry data found for equipment",
          equipmentId 
        });
      }

      // Generate equipment analysis
      const analysis = await analyzeEquipmentHealth(
        telemetryTrends, 
        equipmentId, 
        device?.type
      );
      
      // Generate recommendations for recent alerts if requested
      let alertRecommendations = [];
      if (includeRecommendations === 'true' && recentAlerts.length > 0) {
        const recommendations = await Promise.all(
          recentAlerts.slice(0, 3).map((alert: any) => // Limit to 3 most recent alerts
            generateMaintenanceRecommendations(
              alert.alertType,
              equipmentId,
              alert.context,
              device?.type
            )
          )
        );
        alertRecommendations = recommendations;
      }
      
      res.json({
        equipment: {
          device,
          health: equipmentHealthData,
          pdmScore
        },
        analysis,
        alerts: recentAlerts,
        alertRecommendations,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Equipment insights failed for ${req.params.equipmentId}:`, error);
      res.status(500).json({ 
        message: "Failed to generate equipment insights",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ==========================================================
  // LLM REPORTS API - Properly integrated with existing architecture
  // ==========================================================

  // Fleet Health Report - Uses existing analyzeFleetHealth
  app.post("/api/report/health", generalApiRateLimit, async (req, res) => {
    try {
      const { vesselId, equipmentId, lookbackHours = 24 } = req.body;

      // Get equipment health data with proper filtering
      const equipmentHealth = await storage.getEquipmentHealth();
      const filteredEquipmentHealth = vesselId 
        ? equipmentHealth.filter(eq => eq.vessel === vesselId)
        : equipmentId
        ? equipmentHealth.filter(eq => eq.id === equipmentId) 
        : equipmentHealth;

      // Get telemetry data for analysis
      const telemetryData = equipmentId 
        ? await storage.getTelemetryTrends(equipmentId, lookbackHours)
        : await storage.getTelemetryTrends('', lookbackHours);

      // Use existing fleet analysis function with timeout handling
      let fleetAnalysis;
      try {
        const analysisPromise = analyzeFleetHealth(filteredEquipmentHealth, telemetryData, storage);
        fleetAnalysis = await Promise.race([
          analysisPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('AI analysis timeout')), 10000)
          )
        ]);
      } catch (error) {
        console.warn('Fleet analysis failed, using fallback:', error);
        // Fallback analysis when AI fails - maintain contract with new structured fields
        fleetAnalysis = {
          totalEquipment: filteredEquipmentHealth.length,
          healthyEquipment: filteredEquipmentHealth.filter(eq => eq.healthIndex > 70).length,
          equipmentAtRisk: filteredEquipmentHealth.filter(eq => eq.healthIndex >= 30 && eq.healthIndex <= 70).length,
          criticalEquipment: filteredEquipmentHealth.filter(eq => eq.healthIndex < 30).length,
          topRecommendations: [
            'Schedule maintenance for equipment with health scores below 70%',
            'Monitor critical equipment closely for deteriorating conditions',
            'Review recent alert patterns for early warning signs'
          ],
          costEstimate: filteredEquipmentHealth.length * 2500, // Basic estimate
          summary: 'Fleet analysis completed using fallback mode due to AI service timeout',
          riskMatrix: [], // Empty array when AI unavailable
          prioritizedActions: [], // Empty array when AI unavailable  
          systemIntegration: {
            linkedWorkOrders: 0,
            pendingComplianceItems: 0,
            scheduledMaintenanceOverlap: 0
          },
          fleetBenchmarks: {
            fleetAverage: { healthIndex: 0, predictedDueDays: 0, maintenanceFrequency: 0 },
            performancePercentiles: { top10Percent: 0, median: 0, bottom10Percent: 0 },
            bestPerformers: [],
            worstPerformers: []
          },
          equipmentComparisons: []
        };
      }
      
      // Get additional context data
      const [workOrders, alerts] = await Promise.all([
        storage.getWorkOrders(),
        storage.getAlertNotifications()
      ]);

      const filteredWorkOrders = equipmentId 
        ? workOrders.filter(wo => wo.equipmentId === equipmentId)
        : workOrders;

      // Return structured data compatible with existing export flows
      res.json({
        metadata: {
          title: "Fleet Health Report",
          generatedAt: new Date().toISOString(),
          reportType: "health",
          equipmentFilter: equipmentId || vesselId || "all"
        },
        sections: {
          summary: {
            totalEquipment: fleetAnalysis.totalEquipment,
            healthyEquipment: fleetAnalysis.healthyEquipment,
            criticalEquipment: fleetAnalysis.criticalEquipment,
            openWorkOrders: filteredWorkOrders.filter(wo => wo.status === 'open').length
          },
          analysis: fleetAnalysis,
          equipmentHealth: filteredEquipmentHealth,
          workOrders: filteredWorkOrders.slice(0, 20), // Limit for report
          alerts: alerts.slice(0, 10) // Recent alerts
        }
      });
    } catch (error) {
      console.error("Health report generation failed:", error);
      res.status(500).json({ 
        error: "Failed to generate health report",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Maintenance Report Endpoint  
  app.post("/api/report/maintenance", generalApiRateLimit, async (req, res) => {
    try {
      const { vesselId, equipmentId } = req.body;

      const [maintenanceSchedules, maintenanceRecords, workOrders, equipmentHealth] = await Promise.all([
        storage.getMaintenanceSchedules(),
        storage.getMaintenanceRecords(),
        storage.getWorkOrders(),
        storage.getEquipmentHealth()
      ]);

      // Filter by vessel/equipment
      const filteredSchedules = equipmentId 
        ? maintenanceSchedules.filter(ms => ms.equipmentId === equipmentId)
        : vesselId
        ? maintenanceSchedules.filter(ms => {
            const equipment = equipmentHealth.find(eh => eh.id === ms.equipmentId);
            return equipment?.vessel === vesselId;
          })
        : maintenanceSchedules;

      const filteredRecords = equipmentId
        ? maintenanceRecords.filter(mr => mr.equipmentId === equipmentId)
        : maintenanceRecords;

      // Calculate compliance metrics
      const now = new Date();
      const overdueSchedules = filteredSchedules.filter(s => new Date(s.scheduledDate) < now && s.status !== 'completed');
      const upcomingSchedules = filteredSchedules.filter(s => {
        const schedDate = new Date(s.scheduledDate);
        return schedDate > now && schedDate < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      });

      res.json({
        metadata: {
          title: "Maintenance Report", 
          generatedAt: new Date().toISOString(),
          reportType: "maintenance",
          equipmentFilter: equipmentId || vesselId || "all"
        },
        sections: {
          summary: {
            totalSchedules: filteredSchedules.length,
            overdueCount: overdueSchedules.length,
            upcomingCount: upcomingSchedules.length,
            completedThisMonth: filteredRecords.filter(r => 
              new Date(r.completedDate) > new Date(now.getFullYear(), now.getMonth(), 1)
            ).length
          },
          schedules: filteredSchedules,
          records: filteredRecords.slice(0, 50),
          overdue: overdueSchedules,
          upcoming: upcomingSchedules
        }
      });
    } catch (error) {
      console.error("Maintenance report generation failed:", error);
      res.status(500).json({ 
        error: "Failed to generate maintenance report",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Fleet Summary Endpoint - Enhanced with AI insights
  // Maintenance Compliance Report - POST endpoint for frontend compatibility
  app.post("/api/report/compliance/maintenance", generalApiRateLimit, async (req, res) => {
    try {
      const { period = 'QTD', equipmentId, standard = 'ISM' } = req.body;
      
      // Calculate date range based on period
      let startDate: Date | undefined;
      let endDate: Date = new Date();
      
      switch (period) {
        case 'QTD':
          const quarter = Math.floor(new Date().getMonth() / 3);
          startDate = new Date(new Date().getFullYear(), quarter * 3, 1);
          break;
        case 'YTD':
          startDate = new Date(new Date().getFullYear(), 0, 1);
          break;
        case 'MTD':
          startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
          break;
        default:
          startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
      }

      const equipmentFilter = equipmentId !== 'all' ? equipmentId : undefined;
      
      const [maintenanceSchedules, alerts] = await Promise.all([
        storage.getMaintenanceSchedules(equipmentFilter),
        storage.getAlertNotifications(false, 'default-org-id')
      ]);
      
      const overdue = maintenanceSchedules.filter(s => s.status === 'scheduled' && new Date(s.scheduledDate) < new Date()).length;
      const totalSchedules = maintenanceSchedules.length;
      const complianceRate = totalSchedules > 0 ? Math.round(((totalSchedules - overdue) / totalSchedules) * 100) : 0;

      const response = {
        metadata: {
          title: "Maintenance Compliance Report",
          generatedAt: new Date().toISOString(),
          reportType: "maintenance-compliance",
          period,
          standard
        },
        sections: {
          summary: {
            totalMaintenanceSchedules: totalSchedules,
            overdueCount: overdue,
            complianceRate: `${complianceRate}%`,
            standard,
            reportingPeriod: period
          },
          schedules: maintenanceSchedules.slice(0, 20),
          overdue: maintenanceSchedules.filter(s => s.status === 'scheduled' && new Date(s.scheduledDate) < new Date()).slice(0, 10),
          upcoming: maintenanceSchedules.filter(s => s.status === 'scheduled' && new Date(s.scheduledDate) >= new Date()).slice(0, 10)
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Maintenance compliance report generation error:', error);
      res.status(500).json({ message: "Failed to generate maintenance compliance report" });
    }
  });

  // Alert Response Compliance Report - POST endpoint for frontend compatibility
  app.post("/api/report/compliance/alerts", generalApiRateLimit, async (req, res) => {
    try {
      const { slaHours = 24, lookbackHours = 168, standard = 'SOLAS' } = req.body;
      
      const lookbackDate = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
      
      const alertNotifications = await storage.getAlertNotifications(undefined, 'default-org-id');
      
      // Filter alerts within lookback period
      const recentAlerts = alertNotifications.filter(alert => 
        new Date(alert.createdAt) >= lookbackDate
      );
      
      // Calculate SLA compliance
      const acknowledgedWithinSLA = recentAlerts.filter(alert => {
        if (!alert.acknowledged || !alert.acknowledgedAt) return false;
        const responseTime = new Date(alert.acknowledgedAt).getTime() - new Date(alert.createdAt).getTime();
        return responseTime <= (slaHours * 60 * 60 * 1000);
      }).length;
      
      const criticalAlerts = recentAlerts.filter(a => a.severity === 'critical').length;
      const acknowledgedAlerts = recentAlerts.filter(a => a.acknowledged).length;
      const responseRate = recentAlerts.length > 0 ?
        Math.round((acknowledgedAlerts / recentAlerts.length) * 100) : 0;
      const slaComplianceRate = recentAlerts.length > 0 ?
        Math.round((acknowledgedWithinSLA / recentAlerts.length) * 100) : 0;

      const response = {
        metadata: {
          title: "Alert Response Compliance Report",
          generatedAt: new Date().toISOString(),
          reportType: "alert-response-compliance",
          slaHours,
          lookbackHours,
          standard
        },
        sections: {
          summary: {
            totalAlerts: recentAlerts.length,
            acknowledgedAlerts,
            criticalAlerts,
            responseRate: `${responseRate}%`,
            slaComplianceRate: `${slaComplianceRate}%`,
            slaTarget: `${slaHours} hours`,
            standard,
            lookbackPeriod: `${lookbackHours} hours`
          },
          recentAlerts: recentAlerts.slice(0, 20),
          critical: recentAlerts.filter(a => a.severity === 'critical').slice(0, 10),
          slaViolations: recentAlerts.filter(alert => {
            if (!alert.acknowledged || !alert.acknowledgedAt) return true;
            const responseTime = new Date(alert.acknowledgedAt).getTime() - new Date(alert.createdAt).getTime();
            return responseTime > (slaHours * 60 * 60 * 1000);
          }).slice(0, 10)
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Alert response compliance report generation error:', error);
      res.status(500).json({ message: "Failed to generate alert response compliance report" });
    }
  });

  app.post("/api/report/fleet-summary", generalApiRateLimit, async (req, res) => {
    try {
      const { lookbackHours = 168 } = req.body; // Default 7 days

      const [equipmentHealth, telemetryData, workOrders, pdmScores] = await Promise.all([
        storage.getEquipmentHealth(),
        storage.getTelemetryTrends('', lookbackHours),
        storage.getWorkOrders(),
        storage.getPdmScores()
      ]);

      // Use existing fleet analysis with timeout handling
      let fleetAnalysis;
      try {
        const analysisPromise = analyzeFleetHealth(equipmentHealth, telemetryData);
        fleetAnalysis = await Promise.race([
          analysisPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('AI analysis timeout')), 10000)
          )
        ]);
      } catch (error) {
        console.warn('Fleet analysis failed, using fallback:', error);
        // Fallback analysis
        fleetAnalysis = {
          totalEquipment: equipmentHealth.length,
          healthyEquipment: equipmentHealth.filter(eq => eq.healthIndex > 70).length,
          equipmentAtRisk: equipmentHealth.filter(eq => eq.healthIndex >= 30 && eq.healthIndex <= 70).length,
          criticalEquipment: equipmentHealth.filter(eq => eq.healthIndex < 30).length,
          topRecommendations: [
            'Review equipment with declining health scores',
            'Schedule preventive maintenance for at-risk equipment',
            'Monitor critical systems for immediate attention'
          ],
          costEstimate: equipmentHealth.length * 3000,
          summary: 'Fleet summary generated using fallback analysis'
        };
      }

      // Calculate additional fleet metrics
      const criticalWorkOrders = workOrders.filter(wo => wo.priority === 1 && wo.status === 'open');
      const avgHealthIndex = equipmentHealth.length > 0 
        ? equipmentHealth.reduce((sum, eq) => sum + eq.healthIndex, 0) / equipmentHealth.length
        : 0;

      res.json({
        metadata: {
          title: "Fleet Summary Report",
          generatedAt: new Date().toISOString(), 
          reportType: "fleet-summary",
          lookbackHours
        },
        sections: {
          summary: {
            ...fleetAnalysis,
            avgHealthIndex: Math.round(avgHealthIndex),
            criticalWorkOrders: criticalWorkOrders.length
          },
          equipment: equipmentHealth,
          criticalIssues: criticalWorkOrders,
          recentPdmScores: pdmScores.slice(0, 20)
        }
      });
    } catch (error) {
      console.error("Fleet summary generation failed:", error);
      res.status(500).json({ 
        error: "Failed to generate fleet summary",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ============================================================================
  // ADVANCED PDM ROUTES: Vibration Analysis, RUL Models, Inventory, Compliance
  // ============================================================================

  // Vibration Analysis Routes
  app.get("/api/vibration/features", generalApiRateLimit, async (req, res) => {
    try {
      const { equipmentId, orgId = "default-org-id" } = req.query;
      const features = await storage.getVibrationFeatures(equipmentId as string, orgId as string);
      res.json(features);
    } catch (error) {
      console.error("Failed to get vibration features:", error);
      res.status(500).json({ error: "Failed to retrieve vibration features" });
    }
  });

  app.post("/api/vibration/analyze", generalApiRateLimit, async (req, res) => {
    try {
      const { equipmentId, telemetryData, analysisConfig } = req.body;
      
      // Import vibration analysis functions dynamically
      const { performVibrationAnalysis } = await import('./vibration');
      
      const result = performVibrationAnalysis(telemetryData, analysisConfig);
      
      // Store the analysis results
      const feature = await storage.createVibrationFeature({
        orgId: "default-org-id",
        equipmentId,
        ...result,
        createdAt: new Date()
      });

      res.json({ analysisResult: result, storedFeature: feature });
    } catch (error) {
      console.error("Vibration analysis failed:", error);
      res.status(500).json({ error: "Vibration analysis failed" });
    }
  });

  // ISO 10816/20816 Assessment Routes
  app.post("/api/vibration/iso-assessment", generalApiRateLimit, async (req, res) => {
    try {
      const { velocityRms, machineClass } = req.body;
      
      // Validate input
      if (typeof velocityRms !== 'number' || !machineClass) {
        return res.status(400).json({ 
          error: "Invalid input. Requires velocityRms (number) and machineClass (I, II, III, or IV)" 
        });
      }
      
      // Import ISO assessment function
      const { assessISO10816 } = await import('./vibration');
      
      const assessment = assessISO10816(velocityRms, machineClass);
      res.json(assessment);
    } catch (error) {
      console.error("ISO assessment failed:", error);
      res.status(500).json({ error: "ISO assessment failed" });
    }
  });

  app.post("/api/vibration/enhanced-analysis", generalApiRateLimit, async (req, res) => {
    try {
      const { 
        vibrationData, 
        sampleRate, 
        rpm, 
        machineClass, 
        bearingGeometry 
      } = req.body;
      
      // Validate input
      if (!Array.isArray(vibrationData) || typeof sampleRate !== 'number') {
        return res.status(400).json({ 
          error: "Invalid input. Requires vibrationData (array) and sampleRate (number)" 
        });
      }
      
      // Import enhanced vibration analysis function
      const { analyzeVibration } = await import('./vibration');
      
      const analysis = analyzeVibration(
        vibrationData, 
        sampleRate, 
        rpm, 
        machineClass, 
        bearingGeometry
      );
      
      res.json(analysis);
    } catch (error) {
      console.error("Enhanced vibration analysis failed:", error);
      res.status(500).json({ error: "Enhanced vibration analysis failed" });
    }
  });

  // Bearing Fault Frequency Calculation Routes
  app.post("/api/vibration/bearing-frequencies", generalApiRateLimit, async (req, res) => {
    try {
      const { bearingGeometry, rpm } = req.body;
      
      // Validate input
      if (!bearingGeometry || typeof rpm !== 'number') {
        return res.status(400).json({ 
          error: "Invalid input. Requires bearingGeometry object and rpm (number)" 
        });
      }
      
      // Import bearing calculation function
      const { calculateBearingFaultFrequencies } = await import('./vibration');
      
      const frequencies = calculateBearingFaultFrequencies(bearingGeometry, rpm);
      res.json(frequencies);
    } catch (error) {
      console.error("Bearing frequency calculation failed:", error);
      res.status(500).json({ error: "Bearing frequency calculation failed" });
    }
  });

  app.post("/api/vibration/bearing-fault-detection", generalApiRateLimit, async (req, res) => {
    try {
      const { 
        frequencies, 
        powerSpectrum, 
        bearingFrequencies, 
        tolerance = 0.05 
      } = req.body;
      
      // Validate input
      if (!Array.isArray(frequencies) || !Array.isArray(powerSpectrum) || !bearingFrequencies) {
        return res.status(400).json({ 
          error: "Invalid input. Requires frequencies array, powerSpectrum array, and bearingFrequencies object" 
        });
      }
      
      // Import bearing fault detection function
      const { detectBearingFaults } = await import('./vibration');
      
      const detection = detectBearingFaults(
        frequencies, 
        powerSpectrum, 
        bearingFrequencies, 
        tolerance
      );
      
      res.json(detection);
    } catch (error) {
      console.error("Bearing fault detection failed:", error);
      res.status(500).json({ error: "Bearing fault detection failed" });
    }
  });

  // RUL Analysis Routes
  app.get("/api/rul/models", generalApiRateLimit, async (req, res) => {
    try {
      const { componentClass, orgId = "default-org-id" } = req.query;
      const models = await storage.getRulModels(componentClass as string, orgId as string);
      res.json(models);
    } catch (error) {
      console.error("Failed to get RUL models:", error);
      res.status(500).json({ error: "Failed to retrieve RUL models" });
    }
  });

  app.post("/api/rul/fit", generalApiRateLimit, async (req, res) => {
    try {
      const { modelId, componentClass, failureTimes } = req.body;
      
      // Import RUL analysis functions dynamically
      const { fitWeibullComprehensive } = await import('./rul');
      
      const fitResult = fitWeibullComprehensive(failureTimes, modelId, componentClass);
      
      // Store the fitted model
      const model = await storage.createRulModel({
        orgId: "default-org-id",
        modelId: fitResult.modelId,
        componentClass: fitResult.componentClass,
        shapeK: fitResult.shapeK,
        scaleLambda: fitResult.scaleLambda,
        confidenceLo: fitResult.confidenceInterval.lower,
        confidenceHi: fitResult.confidenceInterval.upper,
        trainingData: fitResult.trainingData,
        validationMetrics: fitResult.validationMetrics,
        isActive: true,
        createdAt: new Date()
      });

      res.json({ fitResult, storedModel: model });
    } catch (error) {
      console.error("RUL model fitting failed:", error);
      res.status(500).json({ error: "RUL model fitting failed" });
    }
  });

  app.post("/api/rul/predict", generalApiRateLimit, async (req, res) => {
    try {
      const { modelId, currentAge, quantile = 0.5 } = req.body;
      
      const model = await storage.getRulModel(modelId, "default-org-id");
      if (!model) {
        return res.status(404).json({ error: "RUL model not found" });
      }

      const { predictRUL } = await import('./rul');
      const prediction = predictRUL(currentAge, model.shapeK, model.scaleLambda, quantile);

      res.json({ prediction, model: { modelId: model.modelId, componentClass: model.componentClass } });
    } catch (error) {
      console.error("RUL prediction failed:", error);
      res.status(500).json({ error: "RUL prediction failed" });
    }
  });

  // Parts Management Routes
  app.get("/api/parts", generalApiRateLimit, async (req, res) => {
    try {
      const { orgId = "default-org-id" } = req.query;
      const parts = await storage.getParts(orgId as string);
      res.json(parts);
    } catch (error) {
      console.error("Failed to get parts:", error);
      res.status(500).json({ error: "Failed to retrieve parts" });
    }
  });

  app.post("/api/parts/availability", generalApiRateLimit, async (req, res) => {
    try {
      const { partNumbers } = req.body;
      
      const { checkPartsAvailability } = await import('./inventory');
      const availability = await checkPartsAvailability(partNumbers, storage, "default-org-id");

      res.json(availability);
    } catch (error) {
      console.error("Parts availability check failed:", error);
      res.status(500).json({ error: "Parts availability check failed" });
    }
  });

  app.post("/api/inventory/cost-planning", generalApiRateLimit, async (req, res) => {
    try {
      const { workOrderIds } = req.body;
      
      const workOrders = await Promise.all(
        workOrderIds.map(id => storage.getWorkOrders(undefined, "default-org-id").then(orders => 
          orders.find(wo => wo.id === id)
        ))
      );
      const validWorkOrders = workOrders.filter(wo => wo !== undefined);

      const { planMaintenanceCosts } = await import('./inventory');
      const costPlan = await planMaintenanceCosts(validWorkOrders, storage, "default-org-id");

      res.json(costPlan);
    } catch (error) {
      console.error("Cost planning failed:", error);
      res.status(500).json({ error: "Cost planning failed" });
    }
  });

  // Compliance Bundle Routes
  app.get("/api/compliance/bundles", generalApiRateLimit, async (req, res) => {
    try {
      const { orgId = "default-org-id" } = req.query;
      const bundles = await storage.getComplianceBundles(orgId as string);
      res.json(bundles);
    } catch (error) {
      console.error("Failed to get compliance bundles:", error);
      res.status(500).json({ error: "Failed to retrieve compliance bundles" });
    }
  });

  app.post("/api/compliance/generate", generalApiRateLimit, async (req, res) => {
    try {
      const {
        bundleId,
        title,
        reportType,
        vessel,
        reportingPeriod,
        equipmentIds,
        standardCodes
      } = req.body;

      const { generateComplianceReport, generateHTMLReport } = await import('./compliance');
      
      const config = {
        bundleId,
        title,
        reportType,
        vessel,
        reportingPeriod: {
          startDate: new Date(reportingPeriod.startDate),
          endDate: new Date(reportingPeriod.endDate)
        },
        equipmentIds,
        standardCodes
      };

      const report = await generateComplianceReport(config, storage, "default-org-id");
      const htmlContent = generateHTMLReport(report);

      // Store the compliance bundle
      const bundle = await storage.createComplianceBundle({
        bundleId,
        title,
        orgId: "default-org-id",
        kind: "compliance_report",
        sha256Hash: Buffer.from(htmlContent).toString('base64').slice(0, 64),
        description: `${reportType} compliance report for ${vessel.name}`,
        generatedAt: new Date(),
        filePath: null,
        metadata: { report },
        fileFormat: "html",
        status: "completed"
      });

      res.json({ report, bundle, htmlContent });
    } catch (error) {
      console.error("Compliance report generation failed:", error);
      res.status(500).json({ error: "Compliance report generation failed" });
    }
  });

  // ===== CREW MANAGEMENT API ROUTES =====


  // Crew CRUD operations
  app.get("/api/crew", async (req, res) => {
    try {
      const { vessel_id } = req.query;
      const crew = await storage.getCrew(undefined, vessel_id as string | undefined);
      res.json(crew);
    } catch (error) {
      console.error("Failed to fetch crew:", error);
      res.status(500).json({ error: "Failed to fetch crew" });
    }
  });

  app.post("/api/crew", crewOperationRateLimit, async (req, res) => {
    try {
      // Validate request body first
      const crewData = insertCrewSchema.parse({
        ...req.body,
        orgId: "default-org-id" // TODO: Extract from auth context
      });
      
      const crew = await storage.createCrew(crewData);
      res.status(201).json(crew);
    } catch (error) {
      console.error("Failed to create crew member:", error);
      
      // Handle specific vessel validation errors
      if (error instanceof Error) {
        if (error.message === 'vessel_id is required for crew creation') {
          return res.status(400).json({ ok: false, error: 'vessel_id required' });
        }
        if (error.message === 'vessel not found') {
          return res.status(400).json({ ok: false, error: 'vessel not found' });
        }
        // Handle Zod validation errors
        if (error.name === 'ZodError') {
          return res.status(400).json({ ok: false, error: 'validation failed', details: error.message });
        }
      }
      
      res.status(400).json({ ok: false, error: "Failed to create crew member" });
    }
  });

  // ===== CREW EXTENSIONS: CERTIFICATIONS =====
  // NOTE: Specific routes like /certifications must come BEFORE parameterized routes like /:id

  // Crew Certifications management  
  app.get("/api/crew/certifications", async (req, res) => {
    try {
      const { crew_id } = req.query;
      const certifications = await storage.getCrewCertifications(crew_id as string | undefined);
      res.json(certifications);
    } catch (error) {
      console.error("Failed to fetch crew certifications:", error);
      res.status(500).json({ error: "Failed to fetch crew certifications" });
    }
  });

  app.post("/api/crew/certifications", crewOperationRateLimit, async (req, res) => {
    try {
      const certData = insertCrewCertificationSchema.parse(req.body);
      const certification = await storage.createCrewCertification(certData);
      res.json(certification);
    } catch (error) {
      console.error("Failed to create crew certification:", error);
      res.status(400).json({ error: "Failed to create crew certification" });
    }
  });

  app.put("/api/crew/certifications/:id", async (req, res) => {
    try {
      const certData = insertCrewCertificationSchema.partial().parse(req.body);
      const certification = await storage.updateCrewCertification(req.params.id, certData);
      res.json(certification);
    } catch (error) {
      console.error("Failed to update crew certification:", error);
      res.status(400).json({ error: "Failed to update crew certification" });
    }
  });

  app.delete("/api/crew/certifications/:id", criticalOperationRateLimit, async (req, res) => {
    try {
      await storage.deleteCrewCertification(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete crew certification:", error);
      res.status(500).json({ error: "Failed to delete crew certification" });
    }
  });

  // Crew Leave management - Must be before parameterized routes
  app.get("/api/crew/leave", async (req, res) => {
    try {
      const { crew_id, start_date, end_date } = req.query;
      const leaves = await storage.getCrewLeave(
        crew_id as string | undefined,
        start_date ? new Date(start_date as string) : undefined,
        end_date ? new Date(end_date as string) : undefined
      );
      res.json(leaves);
    } catch (error) {
      console.error("Failed to fetch crew leave:", error);
      res.status(500).json({ error: "Failed to fetch crew leave" });
    }
  });

  app.post("/api/crew/leave", async (req, res) => {
    try {
      const leaveData = insertCrewLeaveSchema.parse(req.body);
      const leave = await storage.createCrewLeave(leaveData);
      res.json(leave);
    } catch (error) {
      console.error("Failed to create crew leave:", error);
      res.status(400).json({ error: "Failed to create crew leave" });
    }
  });

  app.put("/api/crew/leave/:id", async (req, res) => {
    try {
      const leaveData = insertCrewLeaveSchema.partial().parse(req.body);
      const leave = await storage.updateCrewLeave(req.params.id, leaveData);
      res.json(leave);
    } catch (error) {
      console.error("Failed to update crew leave:", error);
      res.status(400).json({ error: "Failed to update crew leave" });
    }
  });

  app.delete("/api/crew/leave/:id", async (req, res) => {
    try {
      await storage.deleteCrewLeave(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete crew leave:", error);
      res.status(500).json({ error: "Failed to delete crew leave" });
    }
  });

  app.get("/api/crew/:id", async (req, res) => {
    try {
      const crew = await storage.getCrewMember(req.params.id);
      if (!crew) {
        return res.status(404).json({ error: "Crew member not found" });
      }
      res.json(crew);
    } catch (error) {
      console.error("Failed to fetch crew member:", error);
      res.status(500).json({ error: "Failed to fetch crew member" });
    }
  });

  app.put("/api/crew/:id", crewOperationRateLimit, async (req, res) => {
    try {
      const crewData = insertCrewSchema.partial().parse(req.body);
      const crew = await storage.updateCrew(req.params.id, crewData);
      res.json(crew);
    } catch (error) {
      console.error("Failed to update crew member:", error);
      res.status(400).json({ error: "Failed to update crew member" });
    }
  });

  app.patch("/api/crew/:id", crewOperationRateLimit, async (req, res) => {
    try {
      const crewData = insertCrewSchema.partial().parse(req.body);
      const crew = await storage.updateCrew(req.params.id, crewData);
      res.json(crew);
    } catch (error) {
      console.error("Failed to update crew member:", error);
      res.status(400).json({ error: "Failed to update crew member" });
    }
  });

  app.delete("/api/crew/:id", criticalOperationRateLimit, async (req, res) => {
    try {
      await storage.deleteCrew(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete crew member:", error);
      res.status(500).json({ error: "Failed to delete crew member" });
    }
  });

  // Toggle crew duty status (from Windows batch patch integration)
  app.post("/api/crew/:id/toggle-duty", crewOperationRateLimit, async (req, res) => {
    try {
      const crew = await storage.getCrewMember(req.params.id);
      if (!crew) {
        return res.status(404).json({ error: "Crew member not found" });
      }
      
      // Toggle the duty status
      const newDutyStatus = !crew.onDuty;
      const updatedCrew = await storage.updateCrew(req.params.id, { 
        onDuty: newDutyStatus 
      });
      
      res.json({ 
        success: true, 
        crew: updatedCrew,
        message: `${crew.name} is now ${newDutyStatus ? 'on duty' : 'off duty'}` 
      });
    } catch (error) {
      console.error("Failed to toggle crew duty status:", error);
      res.status(500).json({ error: "Failed to toggle duty status" });
    }
  });

  // ===== SKILLS MASTER CATALOG API ROUTES =====
  
  // Get all skills in the catalog
  app.get("/api/skills", async (req, res) => {
    try {
      const skills = await storage.getSkills();
      res.json(skills);
    } catch (error) {
      console.error("Failed to fetch skills:", error);
      res.status(500).json({ error: "Failed to fetch skills" });
    }
  });

  // Create a new skill
  app.post("/api/skills", crewOperationRateLimit, async (req, res) => {
    try {
      const skillData = insertSkillSchema.parse({
        ...req.body,
        orgId: "default-org-id" // TODO: Extract from auth context
      });
      const skill = await storage.createSkill(skillData);
      res.status(201).json(skill);
    } catch (error) {
      console.error("Failed to create skill:", error);
      if (error instanceof Error) {
        if (error.message.includes('unique constraint')) {
          return res.status(400).json({ error: "Skill name already exists" });
        }
      }
      res.status(400).json({ error: "Failed to create skill" });
    }
  });

  // Update a skill
  app.put("/api/skills/:id", crewOperationRateLimit, async (req, res) => {
    try {
      const skillData = insertSkillSchema.partial().parse(req.body);
      const skill = await storage.updateSkill(req.params.id, skillData);
      res.json(skill);
    } catch (error) {
      console.error("Failed to update skill:", error);
      res.status(400).json({ error: "Failed to update skill" });
    }
  });

  // Delete a skill
  app.delete("/api/skills/:id", criticalOperationRateLimit, async (req, res) => {
    try {
      await storage.deleteSkill(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete skill:", error);
      res.status(500).json({ error: "Failed to delete skill" });
    }
  });

  // Crew Skills management
  app.post("/api/crew/skills", async (req, res) => {
    try {
      const { crewId, skill, level = 1 } = req.body;
      const crewSkill = await storage.setCrewSkill(crewId, skill, level);
      res.json(crewSkill);
    } catch (error) {
      console.error("Failed to set crew skill:", error);
      res.status(400).json({ error: "Failed to set crew skill" });
    }
  });

  app.get("/api/crew/:id/skills", async (req, res) => {
    try {
      const skills = await storage.getCrewSkills(req.params.id);
      res.json(skills);
    } catch (error) {
      console.error("Failed to fetch crew skills:", error);
      res.status(500).json({ error: "Failed to fetch crew skills" });
    }
  });

  app.delete("/api/crew/:crewId/skills/:skill", async (req, res) => {
    try {
      await storage.deleteCrewSkill(req.params.crewId, req.params.skill);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete crew skill:", error);
      res.status(500).json({ error: "Failed to delete crew skill" });
    }
  });


  // Shift Templates management
  app.get("/api/shifts", async (req, res) => {
    try {
      const { vessel_id } = req.query;
      const shifts = await storage.getShiftTemplates(vessel_id as string | undefined);
      res.json(shifts);
    } catch (error) {
      console.error("Failed to fetch shift templates:", error);
      res.status(500).json({ error: "Failed to fetch shift templates" });
    }
  });

  app.post("/api/shifts", async (req, res) => {
    try {
      const shiftData = insertShiftTemplateSchema.parse(req.body);
      const shift = await storage.createShiftTemplate(shiftData);
      res.json(shift);
    } catch (error) {
      console.error("Failed to create shift template:", error);
      res.status(400).json({ error: "Failed to create shift template" });
    }
  });

  app.put("/api/shifts/:id", async (req, res) => {
    try {
      const shiftData = insertShiftTemplateSchema.partial().parse(req.body);
      const shift = await storage.updateShiftTemplate(req.params.id, shiftData);
      res.json(shift);
    } catch (error) {
      console.error("Failed to update shift template:", error);
      res.status(400).json({ error: "Failed to update shift template" });
    }
  });

  app.delete("/api/shifts/:id", async (req, res) => {
    try {
      await storage.deleteShiftTemplate(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete shift template:", error);
      res.status(500).json({ error: "Failed to delete shift template" });
    }
  });

  // Crew Assignments
  app.get("/api/crew/assignments", async (req, res) => {
    try {
      const { date, crew_id, vessel_id } = req.query;
      const assignments = await storage.getCrewAssignments(
        date as string | undefined,
        crew_id as string | undefined,
        vessel_id as string | undefined
      );
      res.json(assignments);
    } catch (error) {
      console.error("Failed to fetch crew assignments:", error);
      res.status(500).json({ error: "Failed to fetch crew assignments" });
    }
  });

  app.post("/api/crew/assignments", async (req, res) => {
    try {
      const assignmentData = insertCrewAssignmentSchema.parse(req.body);
      const assignment = await storage.createCrewAssignment(assignmentData);
      res.json(assignment);
    } catch (error) {
      console.error("Failed to create crew assignment:", error);
      res.status(400).json({ error: "Failed to create crew assignment" });
    }
  });

  // Smart Crew Scheduling - The main scheduling algorithm
  app.post("/api/crew/schedule/plan", crewOperationRateLimit, async (req, res) => {
    try {
      const { days, shifts, crew, leaves, existing = [] } = req.body;
      
      // Validate input
      if (!Array.isArray(days) || !Array.isArray(shifts) || !Array.isArray(crew)) {
        return res.status(400).json({ 
          error: "Invalid input: days, shifts, and crew must be arrays" 
        });
      }

      // Run the intelligent scheduling algorithm
      const { scheduled, unfilled } = planShifts(days, shifts, crew, leaves || [], existing);
      
      // Persist scheduled assignments to database
      if (scheduled.length > 0) {
        const assignments = scheduled.map(assignment => ({
          date: assignment.date,
          shiftId: assignment.shiftId,
          crewId: assignment.crewId,
          vesselId: assignment.vesselId || null,
          start: new Date(assignment.start),
          end: new Date(assignment.end),
          role: assignment.role || null,
          status: "scheduled" as const
        }));

        await storage.createBulkCrewAssignments(assignments);
      }

      res.json({ 
        scheduled: scheduled.length,
        assignments: scheduled,
        unfilled,
        message: `Successfully scheduled ${scheduled.length} shifts${unfilled.length > 0 ? `, ${unfilled.length} positions remain unfilled` : ""}`
      });
    } catch (error) {
      console.error("Failed to plan crew schedule:", error);
      res.status(500).json({ error: "Failed to plan crew schedule" });
    }
  });


  // Port Calls management (vessel constraints)
  app.get("/api/port-calls", async (req, res) => {
    try {
      const { vessel_id } = req.query;
      const portCalls = await storage.getPortCalls(vessel_id as string | undefined);
      res.json(portCalls);
    } catch (error) {
      console.error("Failed to fetch port calls:", error);
      res.status(500).json({ error: "Failed to fetch port calls" });
    }
  });

  app.post("/api/port-calls", async (req, res) => {
    try {
      // Transform date strings to Date objects before validation
      const requestData = {
        ...req.body,
        start: req.body.start ? new Date(req.body.start) : undefined,
        end: req.body.end ? new Date(req.body.end) : undefined,
      };
      
      const portCallData = insertPortCallSchema.parse(requestData);
      const portCall = await storage.createPortCall(portCallData);
      res.json(portCall);
    } catch (error) {
      console.error("Failed to create port call:", error);
      res.status(400).json({ error: "Failed to create port call" });
    }
  });

  app.put("/api/port-calls/:id", async (req, res) => {
    try {
      const portCallData = insertPortCallSchema.partial().parse(req.body);
      const portCall = await storage.updatePortCall(req.params.id, portCallData);
      res.json(portCall);
    } catch (error) {
      console.error("Failed to update port call:", error);
      res.status(400).json({ error: "Failed to update port call" });
    }
  });

  app.delete("/api/port-calls/:id", async (req, res) => {
    try {
      await storage.deletePortCall(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete port call:", error);
      res.status(500).json({ error: "Failed to delete port call" });
    }
  });

  // Drydock Windows management (vessel constraints)
  app.get("/api/drydock-windows", async (req, res) => {
    try {
      const { vessel_id } = req.query;
      const drydockWindows = await storage.getDrydockWindows(vessel_id as string | undefined);
      res.json(drydockWindows);
    } catch (error) {
      console.error("Failed to fetch drydock windows:", error);
      res.status(500).json({ error: "Failed to fetch drydock windows" });
    }
  });

  app.post("/api/drydock-windows", async (req, res) => {
    try {
      // Transform date strings to Date objects before validation
      const requestData = {
        ...req.body,
        start: req.body.start ? new Date(req.body.start) : undefined,
        end: req.body.end ? new Date(req.body.end) : undefined,
      };
      
      const drydockData = insertDrydockWindowSchema.parse(requestData);
      const drydockWindow = await storage.createDrydockWindow(drydockData);
      res.json(drydockWindow);
    } catch (error) {
      console.error("Failed to create drydock window:", error);
      res.status(400).json({ error: "Failed to create drydock window" });
    }
  });

  app.put("/api/drydock-windows/:id", async (req, res) => {
    try {
      const drydockData = insertDrydockWindowSchema.partial().parse(req.body);
      const drydockWindow = await storage.updateDrydockWindow(req.params.id, drydockData);
      res.json(drydockWindow);
    } catch (error) {
      console.error("Failed to update drydock window:", error);
      res.status(400).json({ error: "Failed to update drydock window" });
    }
  });

  app.delete("/api/drydock-windows/:id", async (req, res) => {
    try {
      await storage.deleteDrydockWindow(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete drydock window:", error);
      res.status(500).json({ error: "Failed to delete drydock window" });
    }
  });

  // ===== VESSEL MANAGEMENT API ROUTES =====

  // Vessel CRUD operations (translated from Windows batch patch)
  app.get("/api/vessels", async (req, res) => {
    try {
      const { org_id } = req.query;
      const vessels = await storage.getVessels(org_id as string | undefined);
      res.json(vessels);
    } catch (error) {
      console.error("Failed to fetch vessels:", error);
      res.status(500).json({ error: "Failed to fetch vessels" });
    }
  });

  app.post("/api/vessels", async (req, res) => {
    try {
      const vesselData = insertVesselSchema.parse({
        ...req.body,
        orgId: "default-org-id" // TODO: Extract from auth context
      });
      const vessel = await storage.createVessel(vesselData);
      
      // Record vessel operation metric (enhanced observability)
      incrementVesselOperation('create', vessel.id);
      
      res.status(201).json(vessel);
    } catch (error) {
      console.error("Failed to create vessel:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid vessel data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create vessel" });
    }
  });

  app.get("/api/vessels/:id", async (req, res) => {
    try {
      const vessel = await storage.getVessel(req.params.id);
      if (!vessel) {
        return res.status(404).json({ error: "Vessel not found" });
      }
      res.json(vessel);
    } catch (error) {
      console.error("Failed to fetch vessel:", error);
      res.status(500).json({ error: "Failed to fetch vessel" });
    }
  });

  app.put("/api/vessels/:id", async (req, res) => {
    try {
      const vesselData = insertVesselSchema.partial().parse(req.body);
      const vessel = await storage.updateVessel(req.params.id, vesselData);
      res.json(vessel);
    } catch (error) {
      console.error("Failed to update vessel:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid vessel data", errors: error.errors });
      }
      if (error.message && error.message.includes("not found")) {
        return res.status(404).json({ error: "Vessel not found" });
      }
      res.status(500).json({ message: "Failed to update vessel" });
    }
  });

  app.delete("/api/vessels/:id", async (req, res) => {
    try {
      await storage.deleteVessel(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete vessel:", error);
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete vessel" });
    }
  });

  // Enhanced Crew Scheduling with OR-Tools and constraint support
  app.post("/api/crew/schedule/plan-enhanced", crewOperationRateLimit, async (req, res) => {
    try {
      const { 
        engine = ENGINE_GREEDY, 
        days, 
        shifts, 
        crew, 
        leaves = [], 
        portCalls = [], 
        drydocks = [], 
        certifications = {},
        preferences = {},
        validate_stcw = false
      } = req.body;
      
      // Validate input
      if (!Array.isArray(days) || !Array.isArray(shifts) || !Array.isArray(crew)) {
        return res.status(400).json({ 
          error: "Invalid input: days, shifts, and crew must be arrays" 
        });
      }

      // Prepare constraint schedule request
      const scheduleRequest: ConstraintScheduleRequest = {
        engine,
        days,
        shifts,
        crew,
        leaves,
        portCalls,
        drydocks,
        certifications,
        preferences
      };

      // Run the enhanced scheduling algorithm
      const { scheduled, unfilled } = planWithEngine(scheduleRequest);
      
      // Initialize compliance result
      let compliance = {
        overall_ok: true,
        per_crew: [] as any[],
        rows_by_crew: {} as { [crewId: string]: RestDay[] }
      };
      
      // If STCW validation is requested, build HoR rows and check compliance
      if (validate_stcw) {
        try {
          const { mergeHistoryWithPlan, summarizeHoRContext } = await import("./hor-plan-utils");
          const { checkMonthCompliance } = await import("./stcw-compliance");
          
          // Get planning date range
          const startDate = days[0];
          const endDate = days[days.length - 1];
          
          // Helper function to get historical rest data
          const getHistoryRows = async (crewId: string): Promise<RestDay[]> => {
            try {
              const startPlanDate = new Date(startDate);
              const results: RestDay[] = [];
              
              // Get rest data from a few months back to establish context
              const historyStart = new Date(startPlanDate);
              historyStart.setMonth(historyStart.getMonth() - 1);
              
              let current = new Date(historyStart.getFullYear(), historyStart.getMonth(), 1);
              const endLimit = new Date(startPlanDate.getFullYear(), startPlanDate.getMonth(), 1);
              
              while (current <= endLimit) {
                const year = current.getFullYear();
                const month = current.getMonth() + 1;
                
                try {
                  const restData = await storage.getCrewRestMonth(crewId, year, month);
                  if (restData.days && restData.days.length > 0) {
                    results.push(...restData.days);
                  }
                } catch (error) {
                  // No historical data available - that's OK
                }
                current.setMonth(current.getMonth() + 1);
              }
              
              return results;
            } catch (error) {
              console.warn(`Failed to get history for crew ${crewId}:`, error);
              return [];
            }
          };
          
          // Process each crew member
          for (const crewMember of crew) {
            const crewId = crewMember.id;
            
            // Get historical data
            const historyRows = await getHistoryRows(crewId);
            
            // Convert scheduled assignments to HoR format
            const crewAssignments = scheduled
              .filter(a => a.crewId === crewId)
              .map(a => ({
                date: a.date,
                start: a.start,
                end: a.end,
                crewId: a.crewId,
                shiftId: a.shiftId,
                vesselId: a.vesselId
              }));
            
            // Merge history with planned assignments
            const mergedRows = mergeHistoryWithPlan(
              historyRows,
              crewAssignments,
              startDate,
              endDate
            );
            
            // Check compliance for the merged data
            const crewCompliance = checkMonthCompliance(mergedRows);
            const context = summarizeHoRContext(historyRows);
            
            // Store rows for potential frontend use
            compliance.rows_by_crew[crewId] = mergedRows;
            
            // Add crew compliance info
            compliance.per_crew.push({
              crew_id: crewId,
              name: crewMember.name || crewId,
              ok: crewCompliance.ok,
              min_rest_24: context.min_rest_24,
              rest_7d: context.rest_7d,
              nights_this_week: context.nights_this_week,
              violations: crewCompliance.ok ? 0 : crewCompliance.days.filter(d => !d.day_ok).length
            });
            
            // Update overall compliance
            if (!crewCompliance.ok) {
              compliance.overall_ok = false;
            }
          }
        } catch (error) {
          console.error("Failed to validate STCW compliance:", error);
          compliance.overall_ok = false;
          compliance.per_crew.push({
            error: "Failed to validate STCW compliance",
            details: error.message
          });
        }
      }
      
      res.json({
        engine: engine,
        scheduled: scheduled,
        unfilled: unfilled,
        compliance: compliance,
        summary: {
          totalShifts: shifts.length * days.length,
          scheduledAssignments: scheduled.length,
          unfilledPositions: unfilled.reduce((sum, u) => sum + u.need, 0),
          coverage: scheduled.length / (shifts.length * days.length) * 100
        }
      });
    } catch (error) {
      console.error("Failed to run enhanced crew scheduling:", error);
      res.status(500).json({ error: "Failed to run enhanced crew scheduling" });
    }
  });

  // ===== STCW HOURS OF REST API ROUTES =====
  
  // Import STCW rest data (JSON or CSV format) - Enhanced with idempotency and metrics (translated from Windows batch patch)
  app.post("/api/crew/rest/import", async (req, res) => {
    const startTime = Date.now();
    
    try {
      // Idempotency handling (translated from Windows batch patch)
      const idempotencyKey = req.header('Idempotency-Key');
      if (idempotencyKey) {
        const isDuplicate = await storage.checkIdempotency(idempotencyKey, '/api/crew/rest/import');
        if (isDuplicate) {
          incrementIdempotencyHit('/api/crew/rest/import');
          return res.json({ 
            ok: true, 
            duplicate: true,
            message: "Request already processed - idempotent response" 
          });
        }
      }
      
      let rows: RestDay[] = [];
      const format = req.body.csv ? 'csv' : 'json';
      
      // Handle CSV format
      if (req.body.csv) {
        const lines = req.body.csv.trim().split('\n');
        const headers = lines[0].split(',');
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          const row: any = { date: values[0] };
          
          // Map h0-h23 columns
          for (let h = 0; h < 24; h++) {
            const headerIndex = headers.indexOf(`h${h}`);
            if (headerIndex >= 0) {
              row[`h${h}`] = parseInt(values[headerIndex] || '0');
            }
          }
          rows.push(row);
        }
      } else if (req.body.rows) {
        rows = req.body.rows;
      }
      
      // Normalize the data
      rows = normalizeRestDays(rows);
      
      // Create or update rest sheet
      const sheetData = insertCrewRestSheetSchema.parse({
        ...req.body.sheet,
        crewId: req.body.sheet?.crewId || req.body.sheet?.crew_id
      });
      
      const sheet = await storage.createCrewRestSheet(sheetData);
      
      // Upsert rest day data
      let rowCount = 0;
      for (const dayData of rows) {
        await storage.upsertCrewRestDay(sheet.id, dayData);
        rowCount++;
      }
      
      // Record idempotency if key provided
      if (idempotencyKey) {
        await storage.recordIdempotency(idempotencyKey, '/api/crew/rest/import');
      }
      
      // Record metrics (translated from Windows batch patch)
      incrementHorImport(sheetData.crewId, format, rowCount);
      
      const processingTime = Date.now() - startTime;
      console.log(`HoR import completed: ${rowCount} rows for crew ${sheetData.crewId} in ${processingTime}ms`);
      
      res.json({ 
        ok: true, 
        sheet_id: sheet.id, 
        rows: rowCount,
        processing_time_ms: processingTime
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error("Failed to import STCW rest data:", error);
      res.status(400).json({ 
        error: "Failed to import STCW rest data",
        processing_time_ms: processingTime,
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Check STCW compliance for a crew member's rest data
  app.post("/api/crew/rest/check", async (req, res) => {
    try {
      let rows: RestDay[] = [];
      
      // Use inline rows if provided
      if (req.body.rows) {
        rows = normalizeRestDays(req.body.rows);
      } else {
        // Fetch from database
        const { crew_id, year, month } = req.body;
        if (!crew_id || !year || !month) {
          return res.status(400).json({ 
            error: "crew_id, year, and month are required" 
          });
        }
        
        const restData = await storage.getCrewRestMonth(crew_id, parseInt(year), month);
        if (!restData.sheet) {
          return res.status(404).json({ 
            ok: false, 
            error: "No rest sheet found for this crew member and month" 
          });
        }
        
        rows = restData.days;
      }
      
      // Run compliance check
      const compliance = checkMonthCompliance(rows);
      res.json(compliance);
    } catch (error) {
      console.error("Failed to check STCW compliance:", error);
      res.status(500).json({ error: "Failed to check STCW compliance" });
    }
  });

  // Check STCW compliance for a crew member's rest data (GET endpoint)
  app.get("/api/stcw/compliance/:crewId/:year/:month", async (req, res) => {
    try {
      const { crewId, year, month } = req.params;
      
      if (!crewId || !year || !month) {
        return res.status(400).json({ 
          error: "crewId, year, and month are required" 
        });
      }
      
      // Fetch from database
      const restData = await storage.getCrewRestMonth(crewId, parseInt(year), month);
      if (!restData.sheet) {
        // If no rest sheet in database, return a compliance result indicating no data
        return res.status(200).json({ 
          ok: false,
          error: "No rest sheet found",
          message: "Upload or import rest data first to check compliance",
          days: [],
          rolling7d: []
        });
      }
      
      // Run compliance check
      const compliance = checkMonthCompliance(restData.days);
      res.json(compliance);
    } catch (error) {
      console.error("Failed to check STCW compliance:", error);
      res.status(500).json({ error: "Failed to check STCW compliance" });
    }
  });

  // STCW Import endpoint for FormData file uploads (frontend compatibility) - Enhanced with idempotency and metrics
  app.post("/api/stcw/import", async (req, res) => {
    const startTime = Date.now();
    
    try {
      // Idempotency handling (translated from Windows batch patch)
      const idempotencyKey = req.header('Idempotency-Key');
      if (idempotencyKey) {
        const isDuplicate = await storage.checkIdempotency(idempotencyKey, '/api/stcw/import');
        if (isDuplicate) {
          incrementIdempotencyHit('/api/stcw/import');
          return res.json({ 
            success: true, 
            duplicate: true,
            message: "Request already processed - idempotent response" 
          });
        }
      }

      // Handle FormData file upload - parse CSV data
      let csvText = '';
      let crewId = '';
      let vessel = '';
      let year = new Date().getFullYear();
      let month = 'AUGUST';

      // Extract data from FormData (multipart/form-data)
      if (req.body && req.body.constructor === Object) {
        // Handle JSON body fallback
        csvText = req.body.csv || '';
        crewId = req.body.crewId || req.body.crew_id || '';
        vessel = req.body.vessel || 'Unknown';
        year = req.body.year || new Date().getFullYear();
        month = req.body.month || 'AUGUST';
      }

      if (!csvText && req.body) {
        // Try to extract from potential file content
        const bodyStr = req.body.toString();
        if (bodyStr.includes('date,h0,h1')) {
          csvText = bodyStr;
        }
      }

      if (!csvText) {
        return res.status(400).json({ 
          success: false,
          error: "No CSV data provided - include 'csv' field with CSV content" 
        });
      }

      // Parse CSV into rows format for crew rest import
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) {
        return res.status(400).json({ 
          success: false,
          error: "Invalid CSV format - must have header and data rows" 
        });
      }

      const headers = lines[0].split(',');
      const rows: any[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const row: any = { date: values[0] };
        
        // Map h0-h23 columns
        for (let h = 0; h < 24; h++) {
          const headerIndex = headers.indexOf(`h${h}`);
          if (headerIndex >= 0) {
            row[`h${h}`] = parseInt(values[headerIndex] || '0');
          }
        }
        rows.push(row);
      }

      if (rows.length === 0) {
        return res.status(400).json({ 
          success: false,
          error: "No valid data rows found in CSV" 
        });
      }

      // Validate crew and vessel relationship (vessel-first enforcement)
      if (!crewId || !vessel) {
        return res.status(400).json({ 
          success: false,
          error: "crew_id and vessel_id are required" 
        });
      }

      // Validate that crew exists and belongs to the selected vessel
      const crewMember = await storage.getCrewMember(crewId);
      if (!crewMember) {
        return res.status(400).json({ 
          success: false,
          error: "crew not found" 
        });
      }
      
      if (crewMember.vesselId !== vessel) {
        return res.status(400).json({ 
          success: false,
          error: "crew not assigned to selected vessel" 
        });
      }

      // Validate that vessel exists
      const vesselExists = await storage.getVessel(vessel);
      if (!vesselExists) {
        return res.status(400).json({ 
          success: false,
          error: "vessel not found" 
        });
      }

      // Delegate to enhanced crew rest import logic
      const importRequest = {
        sheet: {
          crewId: crewId,
          crewName: crewMember.name,
          vessel: vessel,
          month: month,
          year: year
        },
        rows: rows
      };

      // Use internal crew rest import (with idempotency already handled)
      const { checkMonthCompliance, normalizeRestDays } = await import("./stcw-compliance");
      const normalizedRows = normalizeRestDays(rows);
      
      // Create or update rest sheet
      const sheetData = insertCrewRestSheetSchema.parse({
        ...importRequest.sheet,
        crewId: importRequest.sheet.crewId
      });
      
      const sheet = await storage.createCrewRestSheet(sheetData);
      
      // Upsert rest day data
      let rowCount = 0;
      for (const dayData of normalizedRows) {
        await storage.upsertCrewRestDay(sheet.id, dayData);
        rowCount++;
      }

      // Record idempotency if key provided
      if (idempotencyKey) {
        await storage.recordIdempotency(idempotencyKey, '/api/stcw/import');
      }
      
      // Record metrics (translated from Windows batch patch)
      incrementHorImport(sheetData.crewId, 'csv', rowCount);
      
      const processingTime = Date.now() - startTime;
      console.log(`STCW import completed: ${rowCount} rows for crew ${sheetData.crewId} in ${processingTime}ms`);
      
      res.json({ 
        success: true,
        sheet_id: sheet.id, 
        rows_imported: rowCount,
        processing_time_ms: processingTime,
        message: `Successfully imported ${rowCount} days of rest data`
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error("Failed to import STCW data via file upload:", error);
      res.status(400).json({ 
        success: false,
        error: "Failed to import STCW data",
        processing_time_ms: processingTime,
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // STCW Export endpoint with path parameters (frontend compatibility) - Enhanced with metrics
  app.get("/api/stcw/export/:crewId/:year/:month", async (req, res) => {
    try {
      const { crewId, year, month } = req.params;
      
      if (!crewId || !year || !month) {
        return res.status(400).json({ 
          error: "crewId, year, and month are required" 
        });
      }

      // Fetch rest data from database
      const restData = await storage.getCrewRestMonth(crewId, parseInt(year), month);
      
      if (!restData.sheet) {
        return res.status(404).json({ 
          error: "No rest sheet found for this crew member and month" 
        });
      }

      // Generate PDF filename
      const pdfPath = generatePdfFilename(crewId, parseInt(year), month);
      
      // Render PDF
      await renderRestPdf(restData.sheet, restData.days, { 
        outputPath: pdfPath,
        title: `STCW Hours of Rest - ${restData.sheet.crewName}`
      });

      // Record PDF export metric (translated from Windows batch patch)
      incrementHorPdfExport(crewId, month, parseInt(year));
      
      // Send file download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="stcw_rest_${crewId}_${year}_${month}.pdf"`);
      
      const fs = await import('fs');
      const pdfBuffer = fs.readFileSync(pdfPath);
      res.send(pdfBuffer);
      
      console.log(`STCW PDF export completed for crew ${crewId}, ${month} ${year}`);
    } catch (error) {
      console.error("Failed to export STCW PDF:", error);
      res.status(500).json({ 
        error: "Failed to export STCW PDF",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Export STCW rest data as PDF
  app.get("/api/crew/rest/export_pdf", async (req, res) => {
    try {
      const { crew_id, year, month } = req.query;
      
      if (!crew_id || !year || !month) {
        return res.status(400).json({ 
          error: "crew_id, year, and month are required" 
        });
      }
      
      // Fetch rest data from database
      const restData = await storage.getCrewRestMonth(
        crew_id as string, 
        parseInt(year as string), 
        month as string
      );
      
      if (!restData.sheet) {
        return res.status(404).json({ 
          ok: false, 
          error: "No rest sheet found for this crew member and month" 
        });
      }
      
      // Generate PDF
      const pdfPath = generatePdfFilename(
        crew_id as string, 
        parseInt(year as string), 
        month as string
      );
      
      await renderRestPdf(restData.sheet, restData.days, { 
        outputPath: pdfPath,
        title: `STCW Hours of Rest - ${restData.sheet.crewName}`
      });
      
      res.json({ 
        ok: true, 
        path: pdfPath 
      });
    } catch (error) {
      console.error("Failed to export STCW rest PDF:", error);
      res.status(500).json({ error: "Failed to export STCW rest PDF" });
    }
  });

  // Get rest sheet data for a crew member
  app.get("/api/crew/rest/sheet", async (req, res) => {
    try {
      const { crew_id, year, month } = req.query;
      
      if (!crew_id || !year || !month) {
        return res.status(400).json({ 
          error: "crew_id, year, and month are required" 
        });
      }
      
      const restData = await storage.getCrewRestMonth(
        crew_id as string, 
        parseInt(year as string), 
        month as string
      );
      
      if (!restData.sheet) {
        return res.status(404).json({ 
          error: "No rest sheet found for this crew member and month" 
        });
      }
      
      res.json(restData);
    } catch (error) {
      console.error("Failed to fetch STCW rest sheet:", error);
      res.status(500).json({ error: "Failed to fetch STCW rest sheet" });
    }
  });

  // Prepare HoR context for crew scheduling planning
  app.post("/api/crew/rest/prepare_for_plan", async (req, res) => {
    try {
      const { crew, range } = req.body;
      
      if (!crew || !range || !range.start || !range.end) {
        return res.status(400).json({ 
          ok: false, 
          error: "Missing crew or range parameters" 
        });
      }
      
      const { prepareCrewHoRContext } = await import("./hor-plan-utils");
      
      // Extract crew IDs from request
      const crewIds = crew.map((c: { id: string }) => c.id);
      
      // Helper function to get historical rest data for a crew member
      const getHistoryRows = async (crewId: string, start: string, end: string): Promise<RestDay[]> => {
        try {
          // Parse start and end dates to get year/month range
          const startDate = new Date(start);
          const endDate = new Date(end);
          
          const results: RestDay[] = [];
          
          // Iterate through months in the range
          let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
          const endLimit = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
          
          while (current <= endLimit) {
            const year = current.getFullYear();
            const month = current.getMonth() + 1;
            
            try {
              const restData = await storage.getCrewRestMonth(crewId, year, month);
              if (restData.days && restData.days.length > 0) {
                // Filter to date range
                const filteredDays = restData.days.filter(day => {
                  const dayDate = new Date(day.date);
                  return dayDate >= startDate && dayDate <= endDate;
                });
                results.push(...filteredDays);
              }
            } catch (error) {
              console.warn(`No rest data found for crew ${crewId} in ${year}-${month}`);
            }
            
            current.setMonth(current.getMonth() + 1);
          }
          
          return results;
        } catch (error) {
          console.error(`Failed to get history for crew ${crewId}:`, error);
          return [];
        }
      };
      
      // Prepare context for all crew members
      const contexts = await prepareCrewHoRContext(
        crewIds,
        range.start,
        range.end,
        getHistoryRows
      );
      
      res.json({
        ok: true,
        contexts: contexts.map(ctx => ({
          crew_id: ctx.crew_id,
          context: ctx.context,
          history_available: ctx.history_rows.length > 0
        }))
      });
    } catch (error) {
      console.error("Failed to prepare HoR context for planning:", error);
      res.status(500).json({ 
        ok: false, 
        error: "Failed to prepare HoR context for planning" 
      });
    }
  });

  // ===== ENHANCED RANGE FETCHING ENDPOINTS (translated from Python patch) =====
  
  // Get crew rest data across a date range (multiple months/years)
  app.get("/api/stcw/rest/range/:crewId/:startDate/:endDate", async (req, res) => {
    const startTime = Date.now();
    try {
      const { crewId, startDate, endDate } = req.params;
      
      if (!crewId || !startDate || !endDate) {
        return res.status(400).json({ 
          error: "Missing required parameters: crewId, startDate, endDate" 
        });
      }
      
      // Record range query metric (enhanced observability)
      incrementRangeQuery('crew_range');
      
      const result = await storage.getCrewRestRange(crewId, startDate, endDate);
      
      // Record query duration
      recordRangeQueryDuration('crew_range', Date.now() - startTime);
      
      res.json(result);
    } catch (error) {
      console.error("Failed to fetch crew rest range:", error);
      res.status(500).json({ error: "Failed to fetch crew rest range" });
    }
  });
  
  // Get rest data for multiple crew members in the same month
  app.post("/api/stcw/rest/multiple", async (req, res) => {
    const startTime = Date.now();
    try {
      const { crewIds, year, month } = req.body;
      
      if (!crewIds || !Array.isArray(crewIds) || !year || !month) {
        return res.status(400).json({ 
          error: "Missing required parameters: crewIds (array), year, month" 
        });
      }
      
      // Parse year to integer to match database schema
      const yearInt = parseInt(year, 10);
      if (isNaN(yearInt)) {
        return res.status(400).json({ 
          error: "Invalid year parameter: must be a valid integer" 
        });
      }
      
      // Record range query metric (enhanced observability)
      incrementRangeQuery('multi_crew');
      
      const result = await storage.getMultipleCrewRest(crewIds, yearInt, month);
      
      // Record query duration
      recordRangeQueryDuration('multi_crew', Date.now() - startTime);
      
      res.json(result);
    } catch (error) {
      console.error("Failed to fetch multiple crew rest data:", error);
      res.status(500).json({ error: "Failed to fetch multiple crew rest data" });
    }
  });
  
  // Get rest data for all crew members on a vessel in a specific month
  app.get("/api/stcw/rest/vessel/:vesselId/:year/:month", async (req, res) => {
    const startTime = Date.now();
    try {
      const { vesselId, year, month } = req.params;
      
      if (!vesselId || !year || !month) {
        return res.status(400).json({ 
          error: "Missing required parameters: vesselId, year, month" 
        });
      }
      
      // Record range query metric (enhanced observability)
      incrementRangeQuery('vessel_crew', vesselId);
      
      const result = await storage.getVesselCrewRest(vesselId, parseInt(year), month);
      
      // Record query duration
      recordRangeQueryDuration('vessel_crew', Date.now() - startTime);
      
      res.json(result);
    } catch (error) {
      console.error("Failed to fetch vessel crew rest data:", error);
      res.status(500).json({ error: "Failed to fetch vessel crew rest data" });
    }
  });
  
  // Advanced range query with optional filters
  app.get("/api/stcw/rest/search", async (req, res) => {
    const startTime = Date.now();
    try {
      // Enhanced query validation (Task 16)
      const queryValidation = rangeQuerySchema.parse(req.query);
      const { vesselId, startDate, endDate, complianceFilter } = queryValidation;
      
      // Record range query metric (enhanced observability)
      incrementRangeQuery('advanced_search', vesselId);
      
      const result = await storage.getCrewRestByDateRange(
        vesselId,
        startDate,
        endDate,
        complianceFilter
      );
      
      // Record query duration
      recordRangeQueryDuration('advanced_search', Date.now() - startTime);
      
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid query parameters", 
          errors: error.errors,
          code: "VALIDATION_ERROR"
        });
      }
      console.error("Failed to search crew rest data:", error);
      res.status(500).json({ error: "Failed to search crew rest data" });
    }
  });

  // =========================
  // Data Management & Clear Operations
  // =========================
  
  // Clear all work orders
  app.delete("/api/work-orders/clear", async (req, res) => {
    try {
      await storage.clearAllWorkOrders();
      res.json({ 
        ok: true, 
        message: "All work orders cleared successfully" 
      });
    } catch (error) {
      console.error("Failed to clear work orders:", error);
      res.status(500).json({ error: "Failed to clear work orders" });
    }
  });

  // Clear all maintenance schedules
  app.delete("/api/maintenance/schedules/clear", async (req, res) => {
    try {
      await storage.clearAllMaintenanceSchedules();
      res.json({ 
        ok: true, 
        message: "All maintenance schedules cleared successfully" 
      });
    } catch (error) {
      console.error("Failed to clear maintenance schedules:", error);
      res.status(500).json({ error: "Failed to clear maintenance schedules" });
    }
  });

  // Get all shift templates
  app.get("/api/shift-templates", async (req, res) => {
    try {
      const templates = await storage.getShiftTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Failed to get shift templates:", error);
      res.status(500).json({ error: "Failed to get shift templates" });
    }
  });

  // Create shift template
  app.post("/api/shift-templates", async (req, res) => {
    try {
      const template = await storage.createShiftTemplate(req.body);
      res.json(template);
    } catch (error) {
      console.error("Failed to create shift template:", error);
      res.status(500).json({ error: "Failed to create shift template" });
    }
  });

  // Delete shift template
  app.delete("/api/shift-templates/:id", async (req, res) => {
    try {
      await storage.deleteShiftTemplate(req.params.id);
      res.json({ 
        ok: true, 
        message: "Shift template deleted successfully" 
      });
    } catch (error) {
      console.error("Failed to delete shift template:", error);
      res.status(500).json({ error: "Failed to delete shift template" });
    }
  });

  // Get all crew assignments
  app.get("/api/crew-assignments", async (req, res) => {
    try {
      const assignments = await storage.getCrewAssignments();
      res.json(assignments);
    } catch (error) {
      console.error("Failed to get crew assignments:", error);
      res.status(500).json({ error: "Failed to get crew assignments" });
    }
  });

  // Create crew assignment
  app.post("/api/crew-assignments", async (req, res) => {
    try {
      const assignment = await storage.createCrewAssignment(req.body);
      res.json(assignment);
    } catch (error) {
      console.error("Failed to create crew assignment:", error);
      res.status(500).json({ error: "Failed to create crew assignment" });
    }
  });

  // Delete crew assignment
  app.delete("/api/crew-assignments/:id", async (req, res) => {
    try {
      await storage.deleteCrewAssignment(req.params.id);
      res.json({ 
        ok: true, 
        message: "Crew assignment deleted successfully" 
      });
    } catch (error) {
      console.error("Failed to delete crew assignment:", error);
      res.status(500).json({ error: "Failed to delete crew assignment" });
    }
  });

  // ===== HUB & SYNC API ENDPOINTS =====
  
  // Note: Device registry functionality is integrated into the existing /api/devices endpoints above.
  // The devices table now includes a 'label' field for registry functionality from the Hub & Sync patch.

  // Replay Helper Endpoints
  app.post("/api/replay", async (req, res) => {
    try {
      const validatedData = insertReplayIncomingSchema.parse(req.body);
      const request = await storage.logReplayRequest(validatedData);
      res.status(201).json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("Failed to log replay request:", error);
      res.status(500).json({ error: "Failed to log replay request" });
    }
  });

  app.get("/api/replay/history", async (req, res) => {
    try {
      // Validate query parameters
      const replayHistoryQuerySchema = z.object({
        deviceId: z.string().optional(),
        endpoint: z.string().optional()
      });
      
      const validatedQuery = replayHistoryQuerySchema.parse(req.query);
      const history = await storage.getReplayHistory(
        validatedQuery.deviceId,
        validatedQuery.endpoint
      );
      res.json(history);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      console.error("Failed to get replay history:", error);
      res.status(500).json({ error: "Failed to get replay history" });
    }
  });

  // Sheet Locking Endpoints
  app.post("/api/sheets/lock", async (req, res) => {
    try {
      const { sheetKey, holder, token, expiresAt } = req.body;
      
      if (!sheetKey || !holder || !token || !expiresAt) {
        return res.status(400).json({ 
          error: "Missing required fields: sheetKey, holder, token, expiresAt" 
        });
      }

      const lock = await storage.acquireSheetLock(
        sheetKey,
        holder,
        token,
        new Date(expiresAt)
      );
      res.status(201).json(lock);
    } catch (error) {
      console.error("Failed to acquire sheet lock:", error);
      if (error instanceof Error && error.message.includes("already locked")) {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to acquire sheet lock" });
    }
  });

  app.delete("/api/sheets/lock", async (req, res) => {
    try {
      const { sheetKey, token } = req.body;
      
      if (!sheetKey || !token) {
        return res.status(400).json({ 
          error: "Missing required fields: sheetKey, token" 
        });
      }

      await storage.releaseSheetLock(sheetKey, token);
      res.json({ ok: true, message: "Sheet lock released successfully" });
    } catch (error) {
      console.error("Failed to release sheet lock:", error);
      res.status(500).json({ error: "Failed to release sheet lock" });
    }
  });

  app.get("/api/sheets/lock/:sheetKey", async (req, res) => {
    try {
      const lock = await storage.getSheetLock(req.params.sheetKey);
      if (!lock) {
        return res.status(404).json({ error: "Sheet lock not found" });
      }
      res.json(lock);
    } catch (error) {
      console.error("Failed to get sheet lock:", error);
      res.status(500).json({ error: "Failed to get sheet lock" });
    }
  });

  app.get("/api/sheets/lock/:sheetKey/status", async (req, res) => {
    try {
      const isLocked = await storage.isSheetLocked(req.params.sheetKey);
      res.json({ sheetKey: req.params.sheetKey, isLocked });
    } catch (error) {
      console.error("Failed to check sheet lock status:", error);
      res.status(500).json({ error: "Failed to check sheet lock status" });
    }
  });

  // Sheet Versioning Endpoints
  app.get("/api/sheets/version/:sheetKey", async (req, res) => {
    try {
      const version = await storage.getSheetVersion(req.params.sheetKey);
      if (!version) {
        return res.status(404).json({ error: "Sheet version not found" });
      }
      res.json(version);
    } catch (error) {
      console.error("Failed to get sheet version:", error);
      res.status(500).json({ error: "Failed to get sheet version" });
    }
  });

  app.post("/api/sheets/version/:sheetKey/increment", async (req, res) => {
    try {
      const { modifiedBy } = req.body;
      
      if (!modifiedBy) {
        return res.status(400).json({ 
          error: "Missing required field: modifiedBy" 
        });
      }

      const version = await storage.incrementSheetVersion(req.params.sheetKey, modifiedBy);
      res.json(version);
    } catch (error) {
      console.error("Failed to increment sheet version:", error);
      res.status(500).json({ error: "Failed to increment sheet version" });
    }
  });

  app.post("/api/sheets/version", async (req, res) => {
    try {
      const validatedData = insertSheetVersionSchema.parse(req.body);
      const version = await storage.setSheetVersion(validatedData);
      res.json(version);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("Failed to set sheet version:", error);
      res.status(500).json({ error: "Failed to set sheet version" });
    }
  });

  // Storage Configuration Management API
  // List storage configurations by kind (object/export)
  app.get("/api/storage/config", async (req, res) => {
    try {
      const { kind } = req.query;
      const configs = await storageConfigService.list(kind as string);
      res.json(configs);
    } catch (error) {
      console.error("Failed to list storage configurations:", error);
      res.status(500).json({ error: "Failed to list storage configurations" });
    }
  });

  // Create or update storage configuration
  app.post("/api/storage/config", async (req, res) => {
    try {
      const validatedData = insertStorageConfigSchema.parse(req.body);
      await storageConfigService.upsert(validatedData);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("Failed to upsert storage configuration:", error);
      res.status(500).json({ error: "Failed to save storage configuration" });
    }
  });

  // Delete storage configuration
  app.delete("/api/storage/config/:id", async (req, res) => {
    try {
      await storageConfigService.delete(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete storage configuration:", error);
      res.status(500).json({ error: "Failed to delete storage configuration" });
    }
  });

  // Test storage provider configuration
  app.post("/api/storage/config/test", async (req, res) => {
    try {
      const validatedData = insertStorageConfigSchema.parse(req.body);
      const result = await storageConfigService.test(validatedData);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("Failed to test storage configuration:", error);
      res.status(500).json({ error: "Failed to test storage configuration" });
    }
  });

  // Operational Database Management API
  // Get current operational database info
  app.get("/api/storage/ops-db/current", async (req, res) => {
    try {
      const current = await opsDbService.getCurrent();
      res.json(current);
    } catch (error) {
      console.error("Failed to get current operational database:", error);
      res.status(500).json({ error: "Failed to get current operational database" });
    }
  });

  // Stage operational database URL
  app.post("/api/storage/ops-db/stage", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }
      await opsDbService.stage(url);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to stage operational database:", error);
      res.status(500).json({ error: "Failed to stage operational database" });
    }
  });

  // Get staged operational database URL
  app.get("/api/storage/ops-db/staged", async (req, res) => {
    try {
      const staged = await opsDbService.getStaged();
      res.json(staged);
    } catch (error) {
      console.error("Failed to get staged operational database:", error);
      res.status(500).json({ error: "Failed to get staged operational database" });
    }
  });

  // Test operational database connection
  app.post("/api/storage/ops-db/test", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }
      const result = await opsDbService.test(url);
      res.json(result);
    } catch (error) {
      console.error("Failed to test operational database:", error);
      res.status(500).json({ error: "Failed to test operational database" });
    }
  });

  // Replit App Storage Integration Endpoints
  const objectStorageService = new ObjectStorageService();

  // Serve public objects from configured storage paths
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get upload URL for object entities (requires proper object storage setup)
  app.post("/api/objects/upload", async (req, res) => {
    try {
      if (!objectStorageService.isConfigured()) {
        return res.status(503).json({ 
          error: "Object storage not configured", 
          message: "Please configure PUBLIC_OBJECT_SEARCH_PATHS and PRIVATE_OBJECT_DIR environment variables" 
        });
      }
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Failed to get upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Serve private objects (with ACL checking)
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      
      // For now, allow access to all objects - in production this should check user auth and ACL
      // const canAccess = await objectStorageService.canAccessObjectEntity({
      //   objectFile,
      //   userId: req.user?.id, // would need authentication middleware
      //   requestedPermission: ObjectPermission.READ,
      // });
      // if (!canAccess) {
      //   return res.sendStatus(401);
      // }

      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Object storage status endpoint
  app.get("/api/storage/app-storage/status", async (req, res) => {
    try {
      const configured = objectStorageService.isConfigured();
      const publicPaths = objectStorageService.getPublicObjectSearchPaths();
      const privateDir = objectStorageService.getPrivateObjectDir();
      
      res.json({
        configured,
        publicObjectSearchPaths: publicPaths,
        privateObjectDir: privateDir,
        replicationEnabled: !!process.env.REPLIT_SIDECAR_ENDPOINT
      });
    } catch (error) {
      console.error("Error checking app storage status:", error);
      res.status(500).json({ error: "Failed to check app storage status" });
    }
  });

  // Factory Reset Admin Operation (from Windows batch patch integration)
  // WARNING: This is a destructive operation that clears ALL system data
  app.post("/api/admin/factory-reset", async (req, res) => {
    try {
      const { confirmationCode } = req.body;
      
      // Safety check - require specific confirmation code
      if (confirmationCode !== "FACTORY_RESET_CONFIRMED") {
        return res.status(400).json({ 
          error: "Invalid confirmation code",
          message: "Provide 'confirmationCode': 'FACTORY_RESET_CONFIRMED' to proceed"
        });
      }

      console.log("🚨 FACTORY RESET: Starting complete data wipe...");
      
      // Clear all data tables in dependency order
      const resetOperations = [
        // Crew system data
        () => storage.clearTable('crew_rest_day'),
        () => storage.clearTable('crew_rest_sheet'),
        () => storage.clearTable('crew_assignment'),
        () => storage.clearTable('crew_cert'),
        () => storage.clearTable('crew_skill'),
        () => storage.clearTable('crew_leave'),
        () => storage.clearTable('crew'),
        
        // Vessel and fleet data
        () => storage.clearTable('vessel_port_window'),
        () => storage.clearTable('vessel_drydock_window'),
        () => storage.clearTable('shift_template'),
        () => storage.clearTable('vessels'),
        
        // Telemetry and device data
        () => storage.clearTable('alert'),
        () => storage.clearTable('telemetry'),
        () => storage.clearTable('device_heartbeat'),
        () => storage.clearTable('device'),
        () => storage.clearTable('equipment'),
        
        // Work orders and maintenance
        () => storage.clearTable('work_order_attachment'),
        () => storage.clearTable('work_order'),
        () => storage.clearTable('maintenance_schedule'),
        
        // System and hub data
        () => storage.clearTable('sheet_lock'),
        () => storage.clearTable('sheet_version'),
        () => storage.clearTable('replay_log'),
        () => storage.clearTable('hub_manifest'),
        
        // Settings and organizations (keep minimal structure)
        () => storage.clearTable('transport_settings'),
        () => storage.clearTable('settings'),
        // Note: Keep organizations table as it provides basic structure
      ];

      // Execute all reset operations
      let clearedTables = 0;
      for (const operation of resetOperations) {
        try {
          await operation();
          clearedTables++;
        } catch (error) {
          console.warn(`Factory reset: Failed to clear table:`, error);
          // Continue with other tables even if one fails
        }
      }
      
      console.log(`🚨 FACTORY RESET COMPLETE: Cleared ${clearedTables} tables`);
      
      res.json({ 
        success: true,
        message: "Factory reset completed successfully",
        clearedTables,
        warning: "All system data has been permanently deleted"
      });
      
    } catch (error) {
      console.error("Failed to perform factory reset:", error);
      res.status(500).json({ 
        error: "Factory reset failed",
        message: "Some data may have been partially cleared"
      });
    }
  });

  // Database hardening: Health monitoring endpoint
  app.get("/api/admin/database/health", async (req, res) => {
    try {
      const health = await getDatabaseHealth();
      res.json(health);
    } catch (error: any) {
      res.status(500).json({ 
        error: "Health check failed", 
        message: error?.message || "Unknown error occurred"
      });
    }
  });

  // Database hardening: Enable TimescaleDB extension
  app.post("/api/admin/database/timescale/enable", async (req, res) => {
    try {
      const result = await enableTimescaleDB();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ 
        error: "TimescaleDB enable failed", 
        message: error?.message || "Unknown error occurred"
      });
    }
  });

  // Database hardening: Convert telemetry to hypertable
  app.post("/api/admin/database/timescale/hypertable", async (req, res) => {
    try {
      const result = await createHypertable();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ 
        error: "Hypertable creation failed", 
        message: error?.message || "Unknown error occurred"
      });
    }
  });

  // Database hardening: Create continuous aggregates
  app.post("/api/admin/database/timescale/continuous-aggregate", async (req, res) => {
    try {
      const result = await createContinuousAggregate();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ 
        error: "Continuous aggregate creation failed", 
        message: error?.message || "Unknown error occurred"
      });
    }
  });

  // Database hardening: Enable compression
  app.post("/api/admin/database/timescale/compression", async (req, res) => {
    try {
      const result = await enableCompression();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ 
        error: "Compression enable failed", 
        message: error?.message || "Unknown error occurred"
      });
    }
  });

  // Database hardening: Get retention policy
  app.get("/api/admin/database/retention/policy", async (req, res) => {
    try {
      const policy = await getRetentionPolicy();
      if (!policy) {
        return res.status(404).json({ 
          error: "No retention policy found",
          message: "Create a retention policy first"
        });
      }
      res.json(policy);
    } catch (error: any) {
      res.status(500).json({ 
        error: "Failed to get retention policy", 
        message: error?.message || "Unknown error occurred"
      });
    }
  });

  // Database hardening: Update retention policy
  app.post("/api/admin/database/retention/policy", async (req, res) => {
    try {
      const { retentionDays, rollupEnabled, compressionEnabled } = req.body;
      
      if (typeof retentionDays !== "number" || retentionDays < 1 || retentionDays > 3650) {
        return res.status(400).json({ 
          error: "Invalid retention days",
          message: "retentionDays must be a number between 1 and 3650"
        });
      }
      
      const result = await updateRetentionPolicy(
        retentionDays,
        Boolean(rollupEnabled),
        Boolean(compressionEnabled)
      );
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ 
        error: "Failed to update retention policy", 
        message: error?.message || "Unknown error occurred"
      });
    }
  });

  // Database hardening: Apply retention manually
  app.post("/api/admin/database/retention/apply", async (req, res) => {
    try {
      const result = await applyTelemetryRetention();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ 
        error: "Failed to apply retention", 
        message: error?.message || "Unknown error occurred"
      });
    }
  });

  // ===== INSIGHTS API ENDPOINTS =====
  // Complementary insights system that works with existing LLM reports and analytics
  
  // Get all insight snapshots (with optional filtering)
  app.get("/api/insights/snapshots", generalApiRateLimit, async (req, res) => {
    try {
      const { orgId, scope } = req.query;
      const snapshots = await storage.getInsightSnapshots(
        orgId as string | undefined,
        scope as string | undefined
      );
      res.json(snapshots);
    } catch (error) {
      console.error("Failed to fetch insight snapshots:", error);
      res.status(500).json({ 
        message: "Failed to fetch insight snapshots",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get latest insight snapshot for specific scope
  app.get("/api/insights/snapshots/latest", generalApiRateLimit, async (req, res) => {
    try {
      const { orgId = 'default-org-id', scope = 'fleet' } = req.query;
      const snapshot = await storage.getLatestInsightSnapshot(
        orgId as string,
        scope as string
      );
      
      if (!snapshot) {
        return res.status(404).json({ 
          message: `No insight snapshots found for org: ${orgId}, scope: ${scope}` 
        });
      }
      
      res.json(snapshot);
    } catch (error) {
      console.error("Failed to fetch latest insight snapshot:", error);
      res.status(500).json({ 
        message: "Failed to fetch latest insight snapshot",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Manually trigger insights generation (for testing or immediate updates)
  app.post("/api/insights/generate", reportGenerationRateLimit, async (req, res) => {
    try {
      const { orgId = 'default-org-id', scope = 'fleet' } = req.body;
      
      console.log(`[Insights API] Manual trigger requested for org: ${orgId}, scope: ${scope}`);
      
      const jobId = await triggerInsightsGeneration(orgId, scope);
      
      res.status(202).json({
        message: "Insights generation job scheduled successfully",
        jobId,
        orgId,
        scope,
        estimatedCompletionTime: "1-2 minutes"
      });
    } catch (error) {
      console.error("Failed to trigger insights generation:", error);
      res.status(500).json({ 
        message: "Failed to trigger insights generation",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get insight generation job statistics
  app.get("/api/insights/jobs/stats", generalApiRateLimit, async (req, res) => {
    try {
      const stats = getInsightsJobStats();
      res.json(stats);
    } catch (error) {
      console.error("Failed to get insights job stats:", error);
      res.status(500).json({ 
        message: "Failed to get insights job statistics",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get insight reports (structured analysis results)
  app.get("/api/insights/reports", generalApiRateLimit, async (req, res) => {
    try {
      const { orgId, scope } = req.query;
      const reports = await storage.getInsightReports(
        orgId as string | undefined,
        scope as string | undefined
      );
      res.json(reports);
    } catch (error) {
      console.error("Failed to fetch insight reports:", error);
      res.status(500).json({ 
        message: "Failed to fetch insight reports",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Database Performance Monitoring Routes
  app.get("/api/database/performance", generalApiRateLimit, async (req, res) => {
    try {
      const performanceData = await getDatabasePerformanceHealth();
      res.json(performanceData);
    } catch (error) {
      console.error("Failed to get database performance data:", error);
      res.status(500).json({ 
        message: "Failed to retrieve database performance metrics",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/database/optimization", generalApiRateLimit, async (req, res) => {
    try {
      const optimizationSuggestions = await getIndexOptimizationSuggestions();
      res.json(optimizationSuggestions);
    } catch (error) {
      console.error("Failed to get database optimization suggestions:", error);
      res.status(500).json({ 
        message: "Failed to retrieve database optimization suggestions",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Backup and Disaster Recovery Routes
  app.get("/api/backup/status", generalApiRateLimit, async (req, res) => {
    try {
      const status = await getBackupStatus();
      res.json(status);
    } catch (error) {
      console.error("Failed to get backup status:", error);
      res.status(500).json({ 
        message: "Failed to retrieve backup status",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/backup/list", generalApiRateLimit, async (req, res) => {
    try {
      const backups = await listBackups();
      res.json(backups);
    } catch (error) {
      console.error("Failed to list backups:", error);
      res.status(500).json({ 
        message: "Failed to retrieve backup list",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/backup/create/full", generalApiRateLimit, async (req, res) => {
    try {
      console.log("🗄️  Full backup initiated via API");
      const result = await createFullBackup();
      
      if (result.success) {
        res.json({
          message: "Full backup completed successfully",
          backup: result.metadata,
          duration: result.duration,
          size: result.size
        });
      } else {
        res.status(500).json({
          message: "Full backup failed",
          error: result.error,
          duration: result.duration
        });
      }
    } catch (error) {
      console.error("Failed to create full backup:", error);
      res.status(500).json({ 
        message: "Failed to create full backup",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/backup/create/schema", generalApiRateLimit, async (req, res) => {
    try {
      console.log("📋 Schema backup initiated via API");
      const result = await createSchemaBackup();
      
      if (result.success) {
        res.json({
          message: "Schema backup completed successfully",
          backup: result.metadata,
          duration: result.duration,
          size: result.size
        });
      } else {
        res.status(500).json({
          message: "Schema backup failed",
          error: result.error,
          duration: result.duration
        });
      }
    } catch (error) {
      console.error("Failed to create schema backup:", error);
      res.status(500).json({ 
        message: "Failed to create schema backup",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/backup/cleanup", generalApiRateLimit, async (req, res) => {
    try {
      const result = await cleanupOldBackups();
      res.json({
        message: `Backup cleanup completed: ${result.deletedCount} backups deleted`,
        deletedCount: result.deletedCount,
        errors: result.errors
      });
    } catch (error) {
      console.error("Failed to cleanup old backups:", error);
      res.status(500).json({ 
        message: "Failed to cleanup old backups",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/backup/verify/:backupId", generalApiRateLimit, async (req, res) => {
    try {
      const { backupId } = req.params;
      const result = await verifyBackupIntegrity(backupId);
      
      if (result.valid) {
        res.json({
          message: "Backup integrity verified successfully",
          backupId,
          valid: true
        });
      } else {
        res.status(400).json({
          message: "Backup integrity check failed",
          backupId,
          valid: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error("Failed to verify backup integrity:", error);
      res.status(500).json({ 
        message: "Failed to verify backup integrity",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ===== CONDITION MONITORING ROUTES =====
  // Oil Analysis API
  app.get("/api/condition/oil-analysis", generalApiRateLimit, async (req, res) => {
    try {
      const { orgId = 'default-org-id', equipmentId } = req.query;
      const analyses = await storage.getOilAnalyses(orgId as string, equipmentId as string);
      res.json(analyses);
    } catch (error) {
      console.error("Failed to fetch oil analyses:", error);
      res.status(500).json({ 
        message: "Failed to fetch oil analyses",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/condition/oil-analysis/:id", generalApiRateLimit, async (req, res) => {
    try {
      const { id } = req.params;
      const { orgId = 'default-org-id' } = req.query;
      const analysis = await storage.getOilAnalysis(id, orgId as string);
      
      if (!analysis) {
        return res.status(404).json({ message: "Oil analysis not found" });
      }
      
      res.json(analysis);
    } catch (error) {
      console.error("Failed to fetch oil analysis:", error);
      res.status(500).json({ 
        message: "Failed to fetch oil analysis",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/condition/oil-analysis", generalApiRateLimit, async (req, res) => {
    try {
      // Add date transformation to handle both strings and Date objects
      const oilAnalysisSchema = insertOilAnalysisSchema.extend({
        sampleDate: z.string().or(z.date()).transform((val) => {
          return typeof val === 'string' ? new Date(val) : val;
        }),
      });
      
      const validatedData = oilAnalysisSchema.parse(req.body);
      const analysis = await storage.createOilAnalysis(validatedData);
      res.status(201).json(analysis);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      console.error("Failed to create oil analysis:", error);
      res.status(500).json({ 
        message: "Failed to create oil analysis",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.put("/api/condition/oil-analysis/:id", generalApiRateLimit, async (req, res) => {
    try {
      const { id } = req.params;
      const { orgId = 'default-org-id' } = req.query;
      const analysis = await storage.updateOilAnalysis(id, req.body, orgId as string);
      res.json(analysis);
    } catch (error) {
      console.error("Failed to update oil analysis:", error);
      res.status(500).json({ 
        message: "Failed to update oil analysis",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.delete("/api/condition/oil-analysis/:id", generalApiRateLimit, async (req, res) => {
    try {
      const { id } = req.params;
      const { orgId = 'default-org-id' } = req.query;
      await storage.deleteOilAnalysis(id, orgId as string);
      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete oil analysis:", error);
      res.status(500).json({ 
        message: "Failed to delete oil analysis",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Wear Particle Analysis API
  app.get("/api/condition/wear-analysis", generalApiRateLimit, async (req, res) => {
    try {
      const { orgId = 'default-org-id', equipmentId } = req.query;
      const analyses = await storage.getWearParticleAnalyses(orgId as string, equipmentId as string);
      res.json(analyses);
    } catch (error) {
      console.error("Failed to fetch wear particle analyses:", error);
      res.status(500).json({ 
        message: "Failed to fetch wear particle analyses",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/condition/wear-analysis/:id", generalApiRateLimit, async (req, res) => {
    try {
      const { id } = req.params;
      const { orgId = 'default-org-id' } = req.query;
      const analysis = await storage.getWearParticleAnalysis(id, orgId as string);
      
      if (!analysis) {
        return res.status(404).json({ message: "Wear particle analysis not found" });
      }
      
      res.json(analysis);
    } catch (error) {
      console.error("Failed to fetch wear particle analysis:", error);
      res.status(500).json({ 
        message: "Failed to fetch wear particle analysis",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/condition/wear-analysis", generalApiRateLimit, async (req, res) => {
    try {
      // Add date transformation to handle both strings and Date objects
      const wearAnalysisSchema = insertWearParticleAnalysisSchema.extend({
        analysisDate: z.string().or(z.date()).transform((val) => {
          return typeof val === 'string' ? new Date(val) : val;
        }),
      });
      
      const validatedData = wearAnalysisSchema.parse(req.body);
      const analysis = await storage.createWearParticleAnalysis(validatedData);
      res.status(201).json(analysis);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      console.error("Failed to create wear particle analysis:", error);
      res.status(500).json({ 
        message: "Failed to create wear particle analysis",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.put("/api/condition/wear-analysis/:id", generalApiRateLimit, async (req, res) => {
    try {
      const { id } = req.params;
      const { orgId = 'default-org-id' } = req.query;
      const analysis = await storage.updateWearParticleAnalysis(id, req.body, orgId as string);
      res.json(analysis);
    } catch (error) {
      console.error("Failed to update wear particle analysis:", error);
      res.status(500).json({ 
        message: "Failed to update wear particle analysis",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.delete("/api/condition/wear-analysis/:id", generalApiRateLimit, async (req, res) => {
    try {
      const { id } = req.params;
      const { orgId = 'default-org-id' } = req.query;
      await storage.deleteWearParticleAnalysis(id, orgId as string);
      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete wear particle analysis:", error);
      res.status(500).json({ 
        message: "Failed to delete wear particle analysis",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Condition Monitoring Assessment API
  app.get("/api/condition/assessments", generalApiRateLimit, async (req, res) => {
    try {
      const { orgId = 'default-org-id', equipmentId } = req.query;
      const assessments = await storage.getConditionMonitoringAssessments(orgId as string, equipmentId as string);
      res.json(assessments);
    } catch (error) {
      console.error("Failed to fetch condition monitoring assessments:", error);
      res.status(500).json({ 
        message: "Failed to fetch condition monitoring assessments",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/condition/assessments/:id", generalApiRateLimit, async (req, res) => {
    try {
      const { id } = req.params;
      const { orgId = 'default-org-id' } = req.query;
      const assessment = await storage.getConditionMonitoringAssessment(id, orgId as string);
      
      if (!assessment) {
        return res.status(404).json({ message: "Condition monitoring assessment not found" });
      }
      
      res.json(assessment);
    } catch (error) {
      console.error("Failed to fetch condition monitoring assessment:", error);
      res.status(500).json({ 
        message: "Failed to fetch condition monitoring assessment",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/condition/assessments", generalApiRateLimit, async (req, res) => {
    try {
      const assessment = await storage.createConditionMonitoringAssessment(req.body);
      res.status(201).json(assessment);
    } catch (error) {
      console.error("Failed to create condition monitoring assessment:", error);
      res.status(500).json({ 
        message: "Failed to create condition monitoring assessment",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Oil Change Records API
  app.get("/api/condition/oil-changes", generalApiRateLimit, async (req, res) => {
    try {
      const { orgId = 'default-org-id', equipmentId } = req.query;
      const records = await storage.getOilChangeRecords(orgId as string, equipmentId as string);
      res.json(records);
    } catch (error) {
      console.error("Failed to fetch oil change records:", error);
      res.status(500).json({ 
        message: "Failed to fetch oil change records",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/condition/oil-changes", generalApiRateLimit, async (req, res) => {
    try {
      const record = await storage.createOilChangeRecord(req.body);
      res.status(201).json(record);
    } catch (error) {
      console.error("Failed to create oil change record:", error);
      res.status(500).json({ 
        message: "Failed to create oil change record",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Condition Assessment Generation API (integrates oil + wear analysis)
  app.post("/api/condition/generate-assessment", generalApiRateLimit, async (req, res) => {
    try {
      const { oilAnalysisId, wearAnalysisId, vibrationScore } = req.body;
      
      // Fetch oil analysis
      const oilAnalysis = await storage.getOilAnalysis(oilAnalysisId);
      if (!oilAnalysis) {
        return res.status(404).json({ message: "Oil analysis not found" });
      }

      // Fetch wear analysis if provided
      let wearAnalysis;
      if (wearAnalysisId) {
        wearAnalysis = await storage.getWearParticleAnalysis(wearAnalysisId);
        if (!wearAnalysis) {
          return res.status(404).json({ message: "Wear particle analysis not found" });
        }
      }

      // Import condition monitoring service
      const { generateConditionAssessment } = await import('./condition-monitoring.js');
      
      // Generate integrated assessment
      const assessmentData = generateConditionAssessment(oilAnalysis, wearAnalysis, vibrationScore);
      
      // Save assessment to database
      const savedAssessment = await storage.createConditionMonitoringAssessment(assessmentData);
      
      res.status(201).json(savedAssessment);
    } catch (error) {
      console.error("Failed to generate condition assessment:", error);
      res.status(500).json({ 
        message: "Failed to generate condition assessment",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Latest condition data endpoints for equipment dashboard
  app.get("/api/condition/latest/:equipmentId", generalApiRateLimit, async (req, res) => {
    try {
      const { equipmentId } = req.params;
      const { orgId = 'default-org-id' } = req.query;
      
      const [latestOil, latestWear, latestAssessment, latestOilChange] = await Promise.all([
        storage.getLatestOilAnalysis(equipmentId, orgId as string),
        storage.getLatestWearParticleAnalysis(equipmentId, orgId as string),
        storage.getLatestConditionAssessment(equipmentId, orgId as string),
        storage.getLatestOilChange(equipmentId, orgId as string)
      ]);
      
      res.json({
        oilAnalysis: latestOil,
        wearAnalysis: latestWear,
        conditionAssessment: latestAssessment,
        lastOilChange: latestOilChange
      });
    } catch (error) {
      console.error("Failed to fetch latest condition data:", error);
      res.status(500).json({ 
        message: "Failed to fetch latest condition data",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ========================================
  // MQTT Real-time Data Ingestion API Routes
  // ========================================

  // Register MQTT device
  app.post("/api/mqtt/devices", writeOperationRateLimit, async (req, res) => {
    try {
      const deviceData = req.body;
      const mqttDevice = await mqttIngestionService.registerMqttDevice(deviceData);
      res.status(201).json(mqttDevice);
    } catch (error) {
      console.error("[MQTT API] Error registering device:", error);
      res.status(500).json({ 
        message: "Failed to register MQTT device",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get MQTT devices
  app.get("/api/mqtt/devices", async (req, res) => {
    try {
      const devices = await mqttIngestionService.getMqttDevices();
      res.json(devices);
    } catch (error) {
      console.error("[MQTT API] Error fetching devices:", error);
      res.status(500).json({ message: "Failed to fetch MQTT devices" });
    }
  });

  // MQTT service health check
  app.get("/api/mqtt/health", async (req, res) => {
    try {
      const health = mqttIngestionService.getHealthStatus();
      res.json({
        service: "MQTT Ingestion Service",
        ...health,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        service: "MQTT Ingestion Service",
        status: "error",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ========================================
  // ML Analytics API Routes
  // ========================================

  // Detect anomalies for equipment/sensor
  app.post("/api/ml/anomaly-detection", writeOperationRateLimit, async (req, res) => {
    try {
      const { orgId = 'default-org-id', equipmentId, sensorType, value, timestamp } = req.body;
      
      const result = await mlAnalyticsService.detectAnomalies(
        orgId,
        equipmentId,
        sensorType,
        value,
        timestamp ? new Date(timestamp) : new Date()
      );
      
      res.json(result);
    } catch (error) {
      console.error("[ML Analytics] Error detecting anomalies:", error);
      res.status(500).json({ 
        message: "Failed to detect anomalies",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Predict equipment failure
  app.post("/api/ml/failure-prediction", writeOperationRateLimit, async (req, res) => {
    try {
      const { orgId = 'default-org-id', equipmentId, equipmentType = 'general' } = req.body;
      
      const prediction = await mlAnalyticsService.predictFailure(orgId, equipmentId, equipmentType);
      res.json(prediction);
    } catch (error) {
      console.error("[ML Analytics] Error predicting failure:", error);
      res.status(500).json({ 
        message: "Failed to predict failure",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ML Analytics service health check
  app.get("/api/ml/health", async (req, res) => {
    try {
      const health = mlAnalyticsService.getHealthStatus();
      res.json({
        service: "ML Analytics Service",
        ...health,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        service: "ML Analytics Service",
        status: "error",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ========================================
  // Digital Twin API Routes
  // ========================================

  // Create digital twin
  app.post("/api/digital-twins", writeOperationRateLimit, async (req, res) => {
    try {
      const { vesselId, twinType, name, specifications, physicsModel } = req.body;
      
      const digitalTwin = await digitalTwinService.createDigitalTwin(
        vesselId,
        twinType,
        name,
        specifications,
        physicsModel
      );
      
      res.status(201).json(digitalTwin);
    } catch (error) {
      console.error("[Digital Twin] Error creating twin:", error);
      res.status(500).json({ 
        message: "Failed to create digital twin",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get digital twins
  app.get("/api/digital-twins", async (req, res) => {
    try {
      const { vesselId } = req.query;
      const twins = await digitalTwinService.getDigitalTwins(vesselId as string);
      res.json(twins);
    } catch (error) {
      console.error("[Digital Twin] Error fetching twins:", error);
      res.status(500).json({ message: "Failed to fetch digital twins" });
    }
  });

  // Run simulation scenario
  app.post("/api/digital-twins/:twinId/simulate", writeOperationRateLimit, async (req, res) => {
    try {
      const { twinId } = req.params;
      const { scenarioName, scenario } = req.body;
      
      const simulation = await digitalTwinService.runSimulation(twinId, scenarioName, scenario);
      res.status(201).json(simulation);
    } catch (error) {
      console.error("[Digital Twin] Error running simulation:", error);
      res.status(500).json({ 
        message: "Failed to run simulation",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Digital Twin service health check
  app.get("/api/digital-twins/health", async (req, res) => {
    try {
      const health = digitalTwinService.getHealthStatus();
      res.json({
        service: "Digital Twin Service",
        ...health,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        service: "Digital Twin Service",
        status: "error",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  console.log("🦾 Advanced analytics and digital twin API routes registered successfully");

  // Beast Mode API Routes (Phase 1) - Feature flag management
  console.log("🦾 Registering Beast Mode API routes...");
  app.use("/api/beast", generalApiRateLimit, beastModeRouter);

  // 🌊 Phase 4: External Marine Data Integration Routes
  app.get('/api/external/weather/:lat/:lon', generalApiRateLimit, async (req, res) => {
    try {
      const { lat, lon } = req.params;
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);
      
      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ error: 'Invalid coordinates' });
      }
      
      const weatherData = await externalMarineDataService.getMarineWeather(latitude, longitude);
      res.json(weatherData);
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
      res.status(500).json({ error: 'Failed to fetch weather data' });
    }
  });

  app.get('/api/external/vessel-tracking/:imo', generalApiRateLimit, async (req, res) => {
    try {
      const { imo } = req.params;
      const trackingData = await externalMarineDataService.getVesselTracking(imo);
      
      if (!trackingData) {
        return res.status(404).json({ error: 'Vessel not found' });
      }
      
      res.json(trackingData);
    } catch (error) {
      console.error('Failed to fetch vessel tracking data:', error);
      res.status(500).json({ error: 'Failed to fetch vessel tracking data' });
    }
  });

  app.get('/api/external/port-info/:locode', generalApiRateLimit, async (req, res) => {
    try {
      const { locode } = req.params;
      const portData = await externalMarineDataService.getPortInformation(locode.toUpperCase());
      
      if (!portData) {
        return res.status(404).json({ error: 'Port not found' });
      }
      
      res.json(portData);
    } catch (error) {
      console.error('Failed to fetch port information:', error);
      res.status(500).json({ error: 'Failed to fetch port information' });
    }
  });

  // 🔗 External System Webhook Endpoint
  app.post('/api/webhooks/:source', writeOperationRateLimit, async (req, res) => {
    try {
      const { source } = req.params;
      const payload = req.body;
      
      const result = await externalMarineDataService.processWebhook(source, payload);
      
      res.json({
        success: result.success,
        message: result.message,
        processedAt: new Date().toISOString(),
        source
      });
    } catch (error) {
      console.error(`Failed to process webhook from ${req.params.source}:`, error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to process webhook',
        source: req.params.source 
      });
    }
  });

  // 📊 External Integration Health Status
  app.get('/api/external/health', generalApiRateLimit, async (req, res) => {
    try {
      res.json({
        service: 'External Marine Data Integration',
        status: 'operational',
        integrations: {
          weather: {
            provider: 'OpenWeatherMap',
            status: process.env.OPENWEATHERMAP_API_KEY ? 'configured' : 'mock_data',
            features: ['current_weather', 'marine_conditions', 'forecasts', 'alerts']
          },
          vesselTracking: {
            provider: 'Marine Traffic API', 
            status: process.env.MARINETRAFFIC_API_KEY ? 'configured' : 'mock_data',
            features: ['vessel_positions', 'ais_data', 'port_calls', 'vessel_details']
          },
          portInformation: {
            provider: 'Port Call API',
            status: process.env.PORTCALL_API_KEY ? 'configured' : 'mock_data',
            features: ['port_facilities', 'services', 'restrictions', 'schedules']
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get external integration health' });
    }
  });

  console.log("🌊 Phase 4: External marine data integration API routes registered");

  const httpServer = createServer(app);
  
  // TODO: Initialize GraphQL Server (Phase 4: API Enhancement) - Apollo Server import issue
  // await createGraphQLServer(app, httpServer);
  
  // Initialize WebSocket server for real-time telemetry
  const wsServer = new TelemetryWebSocketServer(httpServer);
  
  // Store global reference for alert broadcasting
  wsServerInstance = wsServer;
  
  // Start database performance monitoring
  startPerformanceMonitoring();
  
  return httpServer;
}
