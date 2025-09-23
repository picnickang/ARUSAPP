import type { Express } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { TelemetryWebSocketServer } from "./websocket";
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
import type { EquipmentTelemetry } from "@shared/schema";
import * as csvWriter from "csv-writer";

// Global WebSocket server reference for broadcasting
let wsServerInstance: any = null;

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
        console.log(`Alert generated: ${message}`);
      }
    }
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
        console.log(`Automatic maintenance scheduled for ${telemetryReading.equipmentId}: Health score ${healthScore.toFixed(1)} triggered ${newSchedule.priority === 1 ? 'critical' : 'warning'} maintenance`);
      }
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check
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
      
      // Process alerts and scheduling in parallel (don't block response)
      Promise.all([processAlerts(), processScheduling()]);
      
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
      
      console.log(`JSON import ${importId} completed:`, {
        imported,
        processed: payload.rows.length,
        errors: processingErrors.length,
        processingTime
      });
      
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
      
      console.log(`CSV import ${importId} completed:`, {
        imported,
        processed: totalProcessed,
        validRows: validRows.length,
        errors: processingErrors.length,
        processingTime
      });
      
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

  const httpServer = createServer(app);
  
  // Initialize WebSocket server for real-time telemetry
  const wsServer = new TelemetryWebSocketServer(httpServer);
  
  // Store global reference for alert broadcasting
  wsServerInstance = wsServer;
  
  return httpServer;
}
