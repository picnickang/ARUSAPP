import type { Express } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { TelemetryWebSocketServer } from "./websocket";
import { 
  metricsMiddleware, 
  healthzEndpoint, 
  readyzEndpoint, 
  metricsEndpoint,
  initializeMetrics 
} from "./observability";
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
  insertAlertSuppressionSchema,
  insertAlertCommentSchema,
  insertComplianceAuditLogSchema
} from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import type { EquipmentTelemetry } from "@shared/schema";
import * as csvWriter from "csv-writer";
import { analyzeFleetHealth, analyzeEquipmentHealth } from "./openai";

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
});

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
          equipmentId: telemetryReading.equipmentId,
          sensorType: telemetryReading.sensorType,
          alertType,
          message,
          value: telemetryReading.value,
          threshold
        });
        
        // Broadcast alert via WebSocket
        if (wsServerInstance) {
          wsServerInstance.broadcastAlert(newAlert);
        }
        
        // Log alert generation for monitoring
      }
    }
  }
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
  app.get('/api/metrics', metricsEndpoint);

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
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  // Devices
  app.get("/api/devices", async (req, res) => {
    try {
      const devices = await storage.getDevicesWithStatus();
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

  app.post("/api/devices", async (req, res) => {
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

  app.put("/api/devices/:id", async (req, res) => {
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

  app.delete("/api/devices/:id", async (req, res) => {
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

  app.post("/api/edge/heartbeat", async (req, res) => {
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
      const equipmentId = req.query.equipmentId as string;
      const scores = await storage.getPdmScores(equipmentId);
      res.json(scores);
    } catch (error) {
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

  app.post("/api/pdm/scores", async (req, res) => {
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

  // Equipment health
  app.get("/api/equipment/health", async (req, res) => {
    try {
      const health = await storage.getEquipmentHealth();
      res.json(health);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch equipment health" });
    }
  });

  // Telemetry endpoints
  app.get("/api/telemetry/trends", async (req, res) => {
    try {
      const equipmentId = req.query.equipmentId as string;
      const hours = req.query.hours ? parseInt(req.query.hours as string) : 24;
      const trends = await storage.getTelemetryTrends(equipmentId, hours);
      res.json(trends);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch telemetry trends" });
    }
  });

  app.post("/api/telemetry/readings", telemetryRateLimit, async (req, res) => {
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
      
      // Create telemetry reading with enhanced error logging
      const reading = await storage.createTelemetryReading(readingData);
      telemetryId = reading.id;
      
      // Enhanced alert processing with retry mechanism
      const processAlerts = async (retryCount = 0): Promise<void> => {
        try {
          await checkAndCreateAlerts(reading);
        } catch (alertError) {
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

  app.post("/api/work-orders", async (req, res) => {
    try {
      const orderData = insertWorkOrderSchema.parse(req.body);
      const workOrder = await storage.createWorkOrder(orderData);
      res.status(201).json(workOrder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid work order data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create work order" });
    }
  });

  app.put("/api/work-orders/:id", async (req, res) => {
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

  app.delete("/api/work-orders/:id", async (req, res) => {
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

  app.post("/api/maintenance-schedules", async (req, res) => {
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

  app.put("/api/maintenance-schedules/:id", async (req, res) => {
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

  app.delete("/api/maintenance-schedules/:id", async (req, res) => {
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

  app.put("/api/settings", async (req, res) => {
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

  app.post("/api/alerts/configurations", async (req, res) => {
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

  app.put("/api/alerts/configurations/:id", async (req, res) => {
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

  app.delete("/api/alerts/configurations/:id", async (req, res) => {
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

  // Validation schema for PDF generation
  const pdfRequestSchema = z.object({
    type: z.enum(["fleet", "health", "maintenance"]).default("fleet"),
    equipmentId: z.string().optional(),
    title: z.string().min(1).max(100).default("Marine Fleet Report")
  });

  app.post("/api/reports/generate/pdf", async (req, res) => {
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
  app.post("/api/import/telemetry/json", bulkImportRateLimit, async (req, res) => {
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
  app.post("/api/import/telemetry/csv", bulkImportRateLimit, async (req, res) => {
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
  app.post("/api/llm/equipment/analyze", generalApiRateLimit, async (req, res) => {
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
  app.post("/api/llm/fleet/analyze", generalApiRateLimit, async (req, res) => {
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
      const fleetAnalysis = await analyzeFleetHealth(equipmentHealth, telemetryTrends);
      
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
        const analysisPromise = analyzeFleetHealth(filteredEquipmentHealth, telemetryData);
        fleetAnalysis = await Promise.race([
          analysisPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('AI analysis timeout')), 5000)
          )
        ]);
      } catch (error) {
        console.warn('Fleet analysis failed, using fallback:', error);
        // Fallback analysis when AI fails
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
          summary: 'Fleet analysis completed using fallback mode due to AI service timeout'
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
            setTimeout(() => reject(new Error('AI analysis timeout')), 5000)
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

  const httpServer = createServer(app);
  
  // Initialize WebSocket server for real-time telemetry
  const wsServer = new TelemetryWebSocketServer(httpServer);
  
  // Store global reference for alert broadcasting
  wsServerInstance = wsServer;
  
  return httpServer;
}
