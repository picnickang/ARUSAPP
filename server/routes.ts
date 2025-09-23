import type { Express } from "express";
import { createServer, type Server } from "http";
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
  insertAlertNotificationSchema
} from "@shared/schema";
import { z } from "zod";
import type { EquipmentTelemetry } from "@shared/schema";
import * as csvWriter from "csv-writer";

// Global WebSocket server reference for broadcasting
let wsServerInstance: any = null;

// Alert processing function
async function checkAndCreateAlerts(telemetryReading: EquipmentTelemetry): Promise<void> {
  // Get all alert configurations for this equipment and sensor type
  const alertConfigs = await storage.getAlertConfigurations(telemetryReading.equipmentId);
  
  const matchingConfigs = alertConfigs.filter(config => 
    config.enabled && 
    config.sensorType === telemetryReading.sensorType
  );
  
  for (const config of matchingConfigs) {
    let alertTriggered = false;
    let alertType = "";
    let threshold = 0;
    
    // Check critical threshold first (higher priority)
    if (config.criticalThreshold !== null && telemetryReading.value >= config.criticalThreshold) {
      alertTriggered = true;
      alertType = "critical";
      threshold = config.criticalThreshold;
    }
    // Check warning threshold if no critical alert
    else if (config.warningThreshold !== null && telemetryReading.value >= config.warningThreshold) {
      alertTriggered = true;
      alertType = "warning";
      threshold = config.warningThreshold;
    }
    
    if (alertTriggered) {
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
        const message = `${telemetryReading.sensorType} ${alertType} alert: Value ${telemetryReading.value} exceeds ${alertType} threshold of ${threshold}`;
        
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

  app.post("/api/telemetry/readings", async (req, res) => {
    try {
      const readingData = insertTelemetrySchema.parse(req.body);
      const reading = await storage.createTelemetryReading(readingData);
      
      // Check for alert configurations and generate notifications if thresholds are exceeded
      try {
        await checkAndCreateAlerts(reading);
      } catch (alertError) {
        console.error("Failed to process alerts for telemetry reading:", alertError);
        // Don't fail the telemetry insert if alert processing fails
      }
      
      res.status(201).json(reading);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid telemetry data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create telemetry reading" });
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

  const httpServer = createServer(app);
  
  // Initialize WebSocket server for real-time telemetry
  const wsServer = new TelemetryWebSocketServer(httpServer);
  
  // Store global reference for alert broadcasting
  wsServerInstance = wsServer;
  
  return httpServer;
}
