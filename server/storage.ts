import { 
  type Device, 
  type InsertDevice,
  type EdgeHeartbeat,
  type InsertHeartbeat,
  type PdmScoreLog,
  type InsertPdmScore,
  type WorkOrder,
  type InsertWorkOrder,
  type SystemSettings,
  type InsertSettings,
  type EquipmentTelemetry,
  type InsertTelemetry,
  type DeviceWithStatus,
  type EquipmentHealth,
  type DashboardMetrics,
  type DeviceStatus,
  type TelemetryTrend,
  type AlertConfiguration,
  type InsertAlertConfig,
  type AlertNotification,
  type InsertAlertNotification,
  type MaintenanceSchedule,
  type InsertMaintenanceSchedule,
  type MaintenanceRecord,
  type InsertMaintenanceRecord,
  type MaintenanceCost,
  type InsertMaintenanceCost,
  type EquipmentLifecycle,
  type InsertEquipmentLifecycle,
  type PerformanceMetric,
  type InsertPerformanceMetric,
  devices,
  edgeHeartbeats,
  pdmScoreLogs,
  workOrders,
  systemSettings,
  equipmentTelemetry,
  alertConfigurations,
  alertNotifications,
  maintenanceSchedules,
  maintenanceRecords,
  maintenanceCosts,
  equipmentLifecycle,
  performanceMetrics
} from "@shared/schema";
import { randomUUID } from "crypto";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { db } from "./db";

export interface IStorage {
  // Device management
  getDevices(): Promise<Device[]>;
  getDevice(id: string): Promise<Device | undefined>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: string, device: Partial<InsertDevice>): Promise<Device>;
  deleteDevice(id: string): Promise<void>;
  
  // Edge heartbeats
  getHeartbeats(): Promise<EdgeHeartbeat[]>;
  getHeartbeat(deviceId: string): Promise<EdgeHeartbeat | undefined>;
  upsertHeartbeat(heartbeat: InsertHeartbeat): Promise<EdgeHeartbeat>;
  
  // PdM scoring
  getPdmScores(equipmentId?: string): Promise<PdmScoreLog[]>;
  createPdmScore(score: InsertPdmScore): Promise<PdmScoreLog>;
  getLatestPdmScore(equipmentId: string): Promise<PdmScoreLog | undefined>;
  
  // Work orders
  getWorkOrders(equipmentId?: string): Promise<WorkOrder[]>;
  createWorkOrder(order: InsertWorkOrder): Promise<WorkOrder>;
  updateWorkOrder(id: string, order: Partial<InsertWorkOrder>): Promise<WorkOrder>;
  deleteWorkOrder(id: string): Promise<void>;
  
  // Settings
  getSettings(): Promise<SystemSettings>;
  updateSettings(settings: Partial<InsertSettings>): Promise<SystemSettings>;
  
  // Telemetry
  getTelemetryTrends(equipmentId?: string, hours?: number): Promise<TelemetryTrend[]>;
  createTelemetryReading(reading: InsertTelemetry): Promise<EquipmentTelemetry>;
  getTelemetryHistory(equipmentId: string, sensorType: string, hours?: number): Promise<EquipmentTelemetry[]>;
  
  // Alert configurations
  getAlertConfigurations(equipmentId?: string): Promise<AlertConfiguration[]>;
  createAlertConfiguration(config: InsertAlertConfig): Promise<AlertConfiguration>;
  updateAlertConfiguration(id: string, config: Partial<InsertAlertConfig>): Promise<AlertConfiguration>;
  deleteAlertConfiguration(id: string): Promise<void>;
  
  // Alert notifications
  getAlertNotifications(acknowledged?: boolean): Promise<AlertNotification[]>;
  createAlertNotification(notification: InsertAlertNotification): Promise<AlertNotification>;
  acknowledgeAlert(id: string, acknowledgedBy: string): Promise<AlertNotification>;
  hasRecentAlert(equipmentId: string, sensorType: string, alertType: string, minutesBack?: number): Promise<boolean>;
  
  // Dashboard data
  getDashboardMetrics(): Promise<DashboardMetrics>;
  getDevicesWithStatus(): Promise<DeviceWithStatus[]>;
  getEquipmentHealth(): Promise<EquipmentHealth[]>;
  
  // Maintenance schedules
  getMaintenanceSchedules(equipmentId?: string, status?: string): Promise<MaintenanceSchedule[]>;
  createMaintenanceSchedule(schedule: InsertMaintenanceSchedule): Promise<MaintenanceSchedule>;
  updateMaintenanceSchedule(id: string, schedule: Partial<InsertMaintenanceSchedule>): Promise<MaintenanceSchedule>;
  deleteMaintenanceSchedule(id: string): Promise<void>;
  getUpcomingSchedules(days?: number): Promise<MaintenanceSchedule[]>;
  autoScheduleMaintenance(equipmentId: string, pdmScore: number): Promise<MaintenanceSchedule | null>;
  
  // Maintenance records
  getMaintenanceRecords(equipmentId?: string, dateFrom?: Date, dateTo?: Date): Promise<MaintenanceRecord[]>;
  createMaintenanceRecord(record: InsertMaintenanceRecord): Promise<MaintenanceRecord>;
  updateMaintenanceRecord(id: string, record: Partial<InsertMaintenanceRecord>): Promise<MaintenanceRecord>;
  deleteMaintenanceRecord(id: string): Promise<void>;
  
  // Maintenance costs
  getMaintenanceCosts(equipmentId?: string, costType?: string, dateFrom?: Date, dateTo?: Date): Promise<MaintenanceCost[]>;
  createMaintenanceCost(cost: InsertMaintenanceCost): Promise<MaintenanceCost>;
  getCostSummaryByEquipment(equipmentId?: string, months?: number): Promise<{ equipmentId: string; totalCost: number; costByType: Record<string, number> }[]>;
  getCostTrends(months?: number): Promise<{ month: string; totalCost: number; costByType: Record<string, number> }[]>;
  
  // Equipment lifecycle
  getEquipmentLifecycle(equipmentId?: string): Promise<EquipmentLifecycle[]>;
  upsertEquipmentLifecycle(lifecycle: InsertEquipmentLifecycle): Promise<EquipmentLifecycle>;
  updateEquipmentLifecycle(id: string, lifecycle: Partial<InsertEquipmentLifecycle>): Promise<EquipmentLifecycle>;
  getReplacementRecommendations(): Promise<EquipmentLifecycle[]>;
  
  // Performance metrics
  getPerformanceMetrics(equipmentId?: string, dateFrom?: Date, dateTo?: Date): Promise<PerformanceMetric[]>;
  createPerformanceMetric(metric: InsertPerformanceMetric): Promise<PerformanceMetric>;
  getFleetPerformanceOverview(): Promise<{ equipmentId: string; averageScore: number; reliability: number; availability: number; efficiency: number }[]>;
  getPerformanceTrends(equipmentId: string, months?: number): Promise<{ month: string; performanceScore: number; availability: number; efficiency: number }[]>;
}

export class MemStorage implements IStorage {
  private devices: Map<string, Device> = new Map();
  private heartbeats: Map<string, EdgeHeartbeat> = new Map();
  private pdmScores: Map<string, PdmScoreLog> = new Map();
  private workOrders: Map<string, WorkOrder> = new Map();
  private maintenanceSchedules: Map<string, MaintenanceSchedule> = new Map();
  private maintenanceRecords: Map<string, MaintenanceRecord> = new Map();
  private maintenanceCosts: Map<string, MaintenanceCost> = new Map();
  private equipmentLifecycle: Map<string, EquipmentLifecycle> = new Map();
  private performanceMetrics: Map<string, PerformanceMetric> = new Map();
  private settings: SystemSettings;

  constructor() {
    this.settings = {
      id: "system",
      hmacRequired: false,
      maxPayloadBytes: 2097152,
      strictUnits: false,
      llmEnabled: true,
      llmModel: "gpt-4o-mini",
    };

    // Initialize with some sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Sample devices
    const sampleDevices: Device[] = [
      {
        id: "DEV-001",
        vessel: "MV Atlantic",
        buses: JSON.stringify(["CAN1", "CAN2"]),
        sensors: JSON.stringify([
          { id: "ENG1", type: "engine", metrics: ["rpm", "temp", "pressure"] },
          { id: "GEN1", type: "generator", metrics: ["voltage", "current", "frequency"] }
        ]),
        config: JSON.stringify({ sampling_rate: 1000, buffer_size: 10000 }),
        hmacKey: null,
        updatedAt: new Date(),
      },
      {
        id: "DEV-002",
        vessel: "MV Pacific",
        buses: JSON.stringify(["CAN1"]),
        sensors: JSON.stringify([
          { id: "ENG2", type: "engine", metrics: ["rpm", "temp", "pressure"] }
        ]),
        config: JSON.stringify({ sampling_rate: 500, buffer_size: 5000 }),
        hmacKey: null,
        updatedAt: new Date(),
      },
      {
        id: "DEV-003",
        vessel: "MV Arctic",
        buses: JSON.stringify(["CAN1", "CAN2", "CAN3"]),
        sensors: JSON.stringify([
          { id: "PUMP1", type: "pump", metrics: ["flow", "pressure", "vibration"] }
        ]),
        config: JSON.stringify({ sampling_rate: 2000, buffer_size: 20000 }),
        hmacKey: null,
        updatedAt: new Date(),
      },
      {
        id: "DEV-004",
        vessel: "MV Nordic",
        buses: JSON.stringify(["CAN1"]),
        sensors: JSON.stringify([
          { id: "GEN2", type: "generator", metrics: ["voltage", "current", "frequency"] }
        ]),
        config: JSON.stringify({ sampling_rate: 1000, buffer_size: 15000 }),
        hmacKey: null,
        updatedAt: new Date(),
      },
    ];

    sampleDevices.forEach(device => this.devices.set(device.id, device));

    // Sample heartbeats
    const now = new Date();
    const heartbeats: EdgeHeartbeat[] = [
      {
        deviceId: "DEV-001",
        ts: new Date(now.getTime() - 2 * 60000), // 2 minutes ago
        cpuPct: 23,
        memPct: 67,
        diskFreeGb: 45.2,
        bufferRows: 1250,
        swVersion: "v2.1.3",
      },
      {
        deviceId: "DEV-002",
        ts: new Date(now.getTime() - 5 * 60000), // 5 minutes ago
        cpuPct: 89,
        memPct: 45,
        diskFreeGb: 12.8,
        bufferRows: 4500,
        swVersion: "v2.1.2",
      },
      {
        deviceId: "DEV-003",
        ts: new Date(now.getTime() - 15 * 60000), // 15 minutes ago
        cpuPct: 95,
        memPct: 92,
        diskFreeGb: 2.1,
        bufferRows: 19800,
        swVersion: "v2.1.1",
      },
      {
        deviceId: "DEV-004",
        ts: new Date(now.getTime() - 1 * 60000), // 1 minute ago
        cpuPct: 34,
        memPct: 52,
        diskFreeGb: 67.4,
        bufferRows: 890,
        swVersion: "v2.1.3",
      },
    ];

    heartbeats.forEach(hb => this.heartbeats.set(hb.deviceId, hb));

    // Sample PdM scores
    const pdmScores: PdmScoreLog[] = [
      {
        id: randomUUID(),
        ts: new Date(),
        equipmentId: "ENG1",
        healthIdx: 72,
        pFail30d: 0.15,
        predictedDueDate: new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000), // 18 days
        contextJson: JSON.stringify({ fuel_per_kw_drift_pct: 3.2, vib_sigma: 0.8 }),
      },
      {
        id: randomUUID(),
        ts: new Date(),
        equipmentId: "GEN2",
        healthIdx: 94,
        pFail30d: 0.03,
        predictedDueDate: new Date(now.getTime() + 42 * 24 * 60 * 60 * 1000), // 42 days
        contextJson: JSON.stringify({ fuel_per_kw_drift_pct: 1.1, vib_sigma: 0.3 }),
      },
      {
        id: randomUUID(),
        ts: new Date(),
        equipmentId: "PUMP1",
        healthIdx: 45,
        pFail30d: 0.35,
        predictedDueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days
        contextJson: JSON.stringify({ fuel_per_kw_drift_pct: 8.7, vib_sigma: 2.1 }),
      },
    ];

    pdmScores.forEach(score => this.pdmScores.set(score.id, score));

    // Sample work orders
    const workOrders: WorkOrder[] = [
      {
        id: "WO-2024-001",
        equipmentId: "ENG1",
        status: "in_progress",
        priority: 1,
        reason: "Elevated vibration levels detected",
        description: "Vibration analysis shows frequency spike at 2.5kHz indicating potential bearing wear",
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        id: "WO-2024-002",
        equipmentId: "PUMP1",
        status: "open",
        priority: 1,
        reason: "Critical health index - immediate inspection required",
        description: "Health index dropped to 45% - requires immediate visual inspection and diagnostic testing",
        createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
      },
      {
        id: "WO-2024-003",
        equipmentId: "GEN2",
        status: "completed",
        priority: 2,
        reason: "Routine maintenance - oil change and filter replacement",
        description: "Scheduled 500-hour maintenance completed. Oil changed, filters replaced, all systems checked",
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
      },
    ];

    workOrders.forEach(wo => this.workOrders.set(wo.id, wo));
  }

  // Device management
  async getDevices(): Promise<Device[]> {
    return Array.from(this.devices.values());
  }

  async getDevice(id: string): Promise<Device | undefined> {
    return this.devices.get(id);
  }

  async createDevice(device: InsertDevice): Promise<Device> {
    const newDevice: Device = {
      ...device,
      vessel: device.vessel || null,
      buses: device.buses || null,
      sensors: device.sensors || null,
      config: device.config || null,
      hmacKey: device.hmacKey || null,
      updatedAt: new Date(),
    };
    this.devices.set(device.id, newDevice);
    return newDevice;
  }

  async updateDevice(id: string, updates: Partial<InsertDevice>): Promise<Device> {
    const existing = this.devices.get(id);
    if (!existing) {
      throw new Error(`Device ${id} not found`);
    }
    const updated: Device = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.devices.set(id, updated);
    return updated;
  }

  async deleteDevice(id: string): Promise<void> {
    if (!this.devices.has(id)) {
      throw new Error(`Device ${id} not found`);
    }
    this.devices.delete(id);
  }

  // Edge heartbeats
  async getHeartbeats(): Promise<EdgeHeartbeat[]> {
    return Array.from(this.heartbeats.values());
  }

  async getHeartbeat(deviceId: string): Promise<EdgeHeartbeat | undefined> {
    return this.heartbeats.get(deviceId);
  }

  async upsertHeartbeat(heartbeat: InsertHeartbeat): Promise<EdgeHeartbeat> {
    const newHeartbeat: EdgeHeartbeat = {
      deviceId: heartbeat.deviceId,
      ts: new Date(),
      cpuPct: heartbeat.cpuPct || null,
      memPct: heartbeat.memPct || null,
      diskFreeGb: heartbeat.diskFreeGb || null,
      bufferRows: heartbeat.bufferRows || null,
      swVersion: heartbeat.swVersion || null,
    };
    this.heartbeats.set(heartbeat.deviceId, newHeartbeat);
    return newHeartbeat;
  }

  // PdM scoring
  async getPdmScores(equipmentId?: string): Promise<PdmScoreLog[]> {
    const scores = Array.from(this.pdmScores.values());
    if (equipmentId) {
      return scores.filter(score => score.equipmentId === equipmentId);
    }
    return scores;
  }

  async createPdmScore(score: InsertPdmScore): Promise<PdmScoreLog> {
    const newScore: PdmScoreLog = {
      id: randomUUID(),
      ts: new Date(),
      equipmentId: score.equipmentId,
      healthIdx: score.healthIdx || null,
      pFail30d: score.pFail30d || null,
      predictedDueDate: score.predictedDueDate || null,
      contextJson: score.contextJson || null,
    };
    this.pdmScores.set(newScore.id, newScore);
    return newScore;
  }

  async getLatestPdmScore(equipmentId: string): Promise<PdmScoreLog | undefined> {
    const scores = Array.from(this.pdmScores.values())
      .filter(score => score.equipmentId === equipmentId)
      .sort((a, b) => (b.ts?.getTime() || 0) - (a.ts?.getTime() || 0));
    return scores[0];
  }

  // Work orders
  async getWorkOrders(equipmentId?: string): Promise<WorkOrder[]> {
    const orders = Array.from(this.workOrders.values());
    if (equipmentId) {
      return orders.filter(order => order.equipmentId === equipmentId);
    }
    return orders.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async createWorkOrder(order: InsertWorkOrder): Promise<WorkOrder> {
    const newOrder: WorkOrder = {
      id: `WO-${new Date().getFullYear()}-${String(this.workOrders.size + 1).padStart(3, '0')}`,
      equipmentId: order.equipmentId,
      status: order.status || "open",
      priority: order.priority || 3,
      reason: order.reason || null,
      description: order.description || null,
      createdAt: new Date(),
    };
    this.workOrders.set(newOrder.id, newOrder);
    return newOrder;
  }

  async updateWorkOrder(id: string, updates: Partial<InsertWorkOrder>): Promise<WorkOrder> {
    const existing = this.workOrders.get(id);
    if (!existing) {
      throw new Error(`Work order ${id} not found`);
    }
    const updated: WorkOrder = {
      ...existing,
      ...updates,
    };
    this.workOrders.set(id, updated);
    return updated;
  }

  async deleteWorkOrder(id: string): Promise<void> {
    if (!this.workOrders.has(id)) {
      throw new Error(`Work order ${id} not found`);
    }
    this.workOrders.delete(id);
  }

  // Telemetry methods
  async getTelemetryTrends(equipmentId?: string, hours: number = 24): Promise<TelemetryTrend[]> {
    // Mock implementation for MemStorage
    return [];
  }

  async createTelemetryReading(reading: InsertTelemetry): Promise<EquipmentTelemetry> {
    // Mock implementation for MemStorage
    const newReading: EquipmentTelemetry = {
      id: `tel-${Date.now()}`,
      equipmentId: reading.equipmentId,
      sensorType: reading.sensorType,
      value: reading.value,
      unit: reading.unit,
      threshold: reading.threshold || null,
      status: reading.status || 'normal',
      ts: new Date(),
    };
    return newReading;
  }

  async getTelemetryHistory(equipmentId: string, sensorType: string, hours: number = 24): Promise<EquipmentTelemetry[]> {
    // Mock implementation for MemStorage
    return [];
  }

  // Alert configuration methods
  async getAlertConfigurations(equipmentId?: string): Promise<AlertConfiguration[]> {
    // Mock implementation for MemStorage
    return [];
  }

  async createAlertConfiguration(config: InsertAlertConfig): Promise<AlertConfiguration> {
    // Mock implementation for MemStorage
    const newConfig: AlertConfiguration = {
      id: `alert-config-${Date.now()}`,
      equipmentId: config.equipmentId,
      sensorType: config.sensorType,
      warningThreshold: config.warningThreshold || null,
      criticalThreshold: config.criticalThreshold || null,
      enabled: config.enabled ?? true,
      notifyEmail: config.notifyEmail ?? false,
      notifyInApp: config.notifyInApp ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return newConfig;
  }

  async updateAlertConfiguration(id: string, config: Partial<InsertAlertConfig>): Promise<AlertConfiguration> {
    // Mock implementation for MemStorage
    throw new Error(`Alert configuration ${id} not found`);
  }

  async deleteAlertConfiguration(id: string): Promise<void> {
    // Mock implementation for MemStorage
    throw new Error(`Alert configuration ${id} not found`);
  }

  // Alert notification methods
  async getAlertNotifications(acknowledged?: boolean): Promise<AlertNotification[]> {
    // Mock implementation for MemStorage
    return [];
  }

  async createAlertNotification(notification: InsertAlertNotification): Promise<AlertNotification> {
    // Mock implementation for MemStorage
    const newNotification: AlertNotification = {
      id: `alert-${Date.now()}`,
      equipmentId: notification.equipmentId,
      sensorType: notification.sensorType,
      alertType: notification.alertType,
      message: notification.message,
      value: notification.value,
      threshold: notification.threshold,
      acknowledged: false,
      acknowledgedBy: null,
      acknowledgedAt: null,
      createdAt: new Date(),
    };
    return newNotification;
  }

  async acknowledgeAlert(id: string, acknowledgedBy: string): Promise<AlertNotification> {
    // Mock implementation for MemStorage
    throw new Error(`Alert notification ${id} not found`);
  }

  async hasRecentAlert(equipmentId: string, sensorType: string, alertType: string, minutesBack: number = 10): Promise<boolean> {
    // Mock implementation for MemStorage
    return false;
  }

  // Settings
  async getSettings(): Promise<SystemSettings> {
    return this.settings;
  }

  async updateSettings(updates: Partial<InsertSettings>): Promise<SystemSettings> {
    this.settings = {
      ...this.settings,
      ...updates,
    };
    return this.settings;
  }

  // Dashboard data
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const devices = await this.getDevices();
    const heartbeats = await this.getHeartbeats();
    const workOrders = await this.getWorkOrders();
    const pdmScores = await this.getPdmScores();

    const activeDevices = heartbeats.filter(hb => {
      const timeSince = Date.now() - (hb.ts?.getTime() || 0);
      return timeSince < 10 * 60 * 1000; // Active if heartbeat within 10 minutes
    }).length;

    const healthScores = pdmScores.map(score => score.healthIdx || 0);
    const fleetHealth = healthScores.length > 0 
      ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
      : 0;

    const openWorkOrders = workOrders.filter(wo => wo.status !== "completed").length;

    const riskAlerts = pdmScores.filter(score => (score.healthIdx || 100) < 60).length;

    return {
      activeDevices,
      fleetHealth,
      openWorkOrders,
      riskAlerts,
    };
  }

  async getDevicesWithStatus(): Promise<DeviceWithStatus[]> {
    const devices = await this.getDevices();
    const heartbeats = await this.getHeartbeats();

    return devices.map(device => {
      const heartbeat = heartbeats.find(hb => hb.deviceId === device.id);
      let status: DeviceStatus = "Offline";

      if (heartbeat) {
        const timeSince = Date.now() - (heartbeat.ts?.getTime() || 0);
        if (timeSince < 5 * 60 * 1000) { // 5 minutes
          if ((heartbeat.cpuPct || 0) > 90 || (heartbeat.memPct || 0) > 90 || (heartbeat.diskFreeGb || 0) < 5) {
            status = "Critical";
          } else if ((heartbeat.cpuPct || 0) > 80 || (heartbeat.memPct || 0) > 80 || (heartbeat.diskFreeGb || 0) < 10) {
            status = "Warning";
          } else {
            status = "Online";
          }
        }
      }

      return {
        ...device,
        status,
        lastHeartbeat: heartbeat,
      };
    });
  }

  async getEquipmentHealth(): Promise<EquipmentHealth[]> {
    const pdmScores = await this.getPdmScores();
    const devices = await this.getDevices();

    return pdmScores.map(score => {
      const device = devices.find(d => {
        const sensors = JSON.parse(d.sensors || "[]");
        return sensors.some((s: any) => s.id === score.equipmentId);
      });

      const healthIndex = score.healthIdx || 0;
      const predictedDueDays = score.predictedDueDate 
        ? Math.ceil((score.predictedDueDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
        : 0;

      let status: "healthy" | "warning" | "critical" = "healthy";
      if (healthIndex < 50) status = "critical";
      else if (healthIndex < 75) status = "warning";

      return {
        id: score.equipmentId,
        vessel: device?.vessel || "Unknown",
        healthIndex,
        predictedDueDays,
        status,
      };
    });
  }

  // Maintenance schedules
  async getMaintenanceSchedules(equipmentId?: string, status?: string): Promise<MaintenanceSchedule[]> {
    let schedules = Array.from(this.maintenanceSchedules.values());
    
    if (equipmentId) {
      schedules = schedules.filter(s => s.equipmentId === equipmentId);
    }
    
    if (status) {
      schedules = schedules.filter(s => s.status === status);
    }
    
    return schedules.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  }

  async createMaintenanceSchedule(schedule: InsertMaintenanceSchedule): Promise<MaintenanceSchedule> {
    const id = randomUUID();
    const newSchedule: MaintenanceSchedule = {
      ...schedule,
      id,
      description: schedule.description || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.maintenanceSchedules.set(id, newSchedule);
    return newSchedule;
  }

  async updateMaintenanceSchedule(id: string, updates: Partial<InsertMaintenanceSchedule>): Promise<MaintenanceSchedule> {
    const existing = this.maintenanceSchedules.get(id);
    if (!existing) {
      throw new Error(`Maintenance schedule ${id} not found`);
    }
    
    const updated: MaintenanceSchedule = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.maintenanceSchedules.set(id, updated);
    return updated;
  }

  async deleteMaintenanceSchedule(id: string): Promise<void> {
    if (!this.maintenanceSchedules.has(id)) {
      throw new Error(`Maintenance schedule ${id} not found`);
    }
    this.maintenanceSchedules.delete(id);
  }

  async getUpcomingSchedules(days: number = 30): Promise<MaintenanceSchedule[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);
    
    return Array.from(this.maintenanceSchedules.values())
      .filter(s => s.scheduledDate <= cutoffDate && s.status === 'scheduled')
      .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  }

  async autoScheduleMaintenance(equipmentId: string, pdmScore: number): Promise<MaintenanceSchedule | null> {
    // Auto-schedule logic based on PdM score
    if (pdmScore < 30) {
      // Critical - schedule immediate maintenance
      const schedule: InsertMaintenanceSchedule = {
        equipmentId,
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        maintenanceType: 'predictive',
        priority: 1,
        status: 'scheduled',
        description: `Automatic predictive maintenance scheduled due to critical PdM score: ${pdmScore}`,
        pdmScore,
        autoGenerated: true,
      };
      return this.createMaintenanceSchedule(schedule);
    } else if (pdmScore < 60) {
      // Warning - schedule maintenance in a week
      const schedule: InsertMaintenanceSchedule = {
        equipmentId,
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
        maintenanceType: 'predictive',
        priority: 2,
        status: 'scheduled',
        description: `Automatic predictive maintenance scheduled due to warning PdM score: ${pdmScore}`,
        pdmScore,
        autoGenerated: true,
      };
      return this.createMaintenanceSchedule(schedule);
    }
    
    return null; // No scheduling needed
  }

  // Maintenance records methods
  async getMaintenanceRecords(equipmentId?: string, dateFrom?: Date, dateTo?: Date): Promise<MaintenanceRecord[]> {
    let records = Array.from(this.maintenanceRecords.values());
    
    if (equipmentId) {
      records = records.filter(r => r.equipmentId === equipmentId);
    }
    
    if (dateFrom) {
      records = records.filter(r => r.createdAt && r.createdAt >= dateFrom);
    }
    
    if (dateTo) {
      records = records.filter(r => r.createdAt && r.createdAt <= dateTo);
    }
    
    return records.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async createMaintenanceRecord(record: InsertMaintenanceRecord): Promise<MaintenanceRecord> {
    const id = randomUUID();
    const newRecord: MaintenanceRecord = {
      ...record,
      id,
      createdAt: new Date(),
    };
    
    this.maintenanceRecords.set(id, newRecord);
    return newRecord;
  }

  async updateMaintenanceRecord(id: string, updates: Partial<InsertMaintenanceRecord>): Promise<MaintenanceRecord> {
    const existing = this.maintenanceRecords.get(id);
    if (!existing) {
      throw new Error(`Maintenance record ${id} not found`);
    }
    
    const updated: MaintenanceRecord = {
      ...existing,
      ...updates,
    };
    
    this.maintenanceRecords.set(id, updated);
    return updated;
  }

  async deleteMaintenanceRecord(id: string): Promise<void> {
    if (!this.maintenanceRecords.has(id)) {
      throw new Error(`Maintenance record ${id} not found`);
    }
    this.maintenanceRecords.delete(id);
  }

  // Maintenance costs methods
  async getMaintenanceCosts(equipmentId?: string, costType?: string, dateFrom?: Date, dateTo?: Date): Promise<MaintenanceCost[]> {
    let costs = Array.from(this.maintenanceCosts.values());
    
    if (equipmentId) {
      costs = costs.filter(c => c.equipmentId === equipmentId);
    }
    
    if (costType) {
      costs = costs.filter(c => c.costType === costType);
    }
    
    if (dateFrom) {
      costs = costs.filter(c => c.createdAt && c.createdAt >= dateFrom);
    }
    
    if (dateTo) {
      costs = costs.filter(c => c.createdAt && c.createdAt <= dateTo);
    }
    
    return costs.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async createMaintenanceCost(cost: InsertMaintenanceCost): Promise<MaintenanceCost> {
    const id = randomUUID();
    const newCost: MaintenanceCost = {
      ...cost,
      id,
      createdAt: new Date(),
    };
    
    this.maintenanceCosts.set(id, newCost);
    return newCost;
  }

  async getCostSummaryByEquipment(equipmentId?: string, months: number = 12): Promise<{ equipmentId: string; totalCost: number; costByType: Record<string, number> }[]> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    
    let costs = Array.from(this.maintenanceCosts.values())
      .filter(c => c.createdAt && c.createdAt >= cutoffDate);
    
    if (equipmentId) {
      costs = costs.filter(c => c.equipmentId === equipmentId);
    }
    
    const summary: Record<string, { totalCost: number; costByType: Record<string, number> }> = {};
    
    costs.forEach(cost => {
      if (!summary[cost.equipmentId]) {
        summary[cost.equipmentId] = { totalCost: 0, costByType: {} };
      }
      
      summary[cost.equipmentId].totalCost += cost.amount;
      summary[cost.equipmentId].costByType[cost.costType] = 
        (summary[cost.equipmentId].costByType[cost.costType] || 0) + cost.amount;
    });
    
    return Object.entries(summary).map(([equipmentId, data]) => ({
      equipmentId,
      ...data
    }));
  }

  async getCostTrends(months: number = 12): Promise<{ month: string; totalCost: number; costByType: Record<string, number> }[]> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    
    const costs = Array.from(this.maintenanceCosts.values())
      .filter(c => c.createdAt && c.createdAt >= cutoffDate);
    
    const trends: Record<string, { totalCost: number; costByType: Record<string, number> }> = {};
    
    costs.forEach(cost => {
      if (!cost.createdAt) return;
      
      const monthKey = `${cost.createdAt.getFullYear()}-${String(cost.createdAt.getMonth() + 1).padStart(2, '0')}`;
      
      if (!trends[monthKey]) {
        trends[monthKey] = { totalCost: 0, costByType: {} };
      }
      
      trends[monthKey].totalCost += cost.amount;
      trends[monthKey].costByType[cost.costType] = 
        (trends[monthKey].costByType[cost.costType] || 0) + cost.amount;
    });
    
    return Object.entries(trends).map(([month, data]) => ({
      month,
      ...data
    })).sort((a, b) => a.month.localeCompare(b.month));
  }

  // Equipment lifecycle methods  
  async getEquipmentLifecycle(equipmentId?: string): Promise<EquipmentLifecycle[]> {
    let lifecycle = Array.from(this.equipmentLifecycle.values());
    
    if (equipmentId) {
      lifecycle = lifecycle.filter(l => l.equipmentId === equipmentId);
    }
    
    return lifecycle.sort((a, b) => (a.equipmentId || '').localeCompare(b.equipmentId || ''));
  }

  async upsertEquipmentLifecycle(lifecycle: InsertEquipmentLifecycle): Promise<EquipmentLifecycle> {
    const existing = Array.from(this.equipmentLifecycle.values())
      .find(l => l.equipmentId === lifecycle.equipmentId);
    
    if (existing) {
      return this.updateEquipmentLifecycle(existing.id, lifecycle);
    }
    
    const id = randomUUID();
    const newLifecycle: EquipmentLifecycle = {
      ...lifecycle,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.equipmentLifecycle.set(id, newLifecycle);
    return newLifecycle;
  }

  async updateEquipmentLifecycle(id: string, updates: Partial<InsertEquipmentLifecycle>): Promise<EquipmentLifecycle> {
    const existing = this.equipmentLifecycle.get(id);
    if (!existing) {
      throw new Error(`Equipment lifecycle ${id} not found`);
    }
    
    const updated: EquipmentLifecycle = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.equipmentLifecycle.set(id, updated);
    return updated;
  }

  async getReplacementRecommendations(): Promise<EquipmentLifecycle[]> {
    const now = new Date();
    
    return Array.from(this.equipmentLifecycle.values())
      .filter(l => {
        if (l.nextRecommendedReplacement && l.nextRecommendedReplacement <= now) return true;
        if (l.condition === 'poor' || l.condition === 'critical') return true;
        
        if (l.installationDate && l.expectedLifespan) {
          const expectedReplacementDate = new Date(l.installationDate);
          expectedReplacementDate.setMonth(expectedReplacementDate.getMonth() + l.expectedLifespan);
          if (expectedReplacementDate <= now) return true;
        }
        
        return false;
      })
      .sort((a, b) => {
        const urgencyOrder = { 'critical': 0, 'poor': 1, 'fair': 2, 'good': 3, 'excellent': 4 };
        return urgencyOrder[a.condition] - urgencyOrder[b.condition];
      });
  }

  // Performance metrics methods
  async getPerformanceMetrics(equipmentId?: string, dateFrom?: Date, dateTo?: Date): Promise<PerformanceMetric[]> {
    let metrics = Array.from(this.performanceMetrics.values());
    
    if (equipmentId) {
      metrics = metrics.filter(m => m.equipmentId === equipmentId);
    }
    
    if (dateFrom) {
      metrics = metrics.filter(m => m.metricDate >= dateFrom);
    }
    
    if (dateTo) {
      metrics = metrics.filter(m => m.metricDate <= dateTo);
    }
    
    return metrics.sort((a, b) => b.metricDate.getTime() - a.metricDate.getTime());
  }

  async createPerformanceMetric(metric: InsertPerformanceMetric): Promise<PerformanceMetric> {
    const id = randomUUID();
    const newMetric: PerformanceMetric = {
      ...metric,
      id,
      createdAt: new Date(),
    };
    
    this.performanceMetrics.set(id, newMetric);
    return newMetric;
  }

  async getFleetPerformanceOverview(): Promise<{ equipmentId: string; averageScore: number; reliability: number; availability: number; efficiency: number }[]> {
    const equipmentMetrics: Record<string, PerformanceMetric[]> = {};
    
    Array.from(this.performanceMetrics.values()).forEach(metric => {
      if (!equipmentMetrics[metric.equipmentId]) {
        equipmentMetrics[metric.equipmentId] = [];
      }
      equipmentMetrics[metric.equipmentId].push(metric);
    });
    
    return Object.entries(equipmentMetrics).map(([equipmentId, metrics]) => {
      const validMetrics = metrics.filter(m => m.performanceScore !== null);
      const reliabilityMetrics = metrics.filter(m => m.reliability !== null);
      const availabilityMetrics = metrics.filter(m => m.availability !== null);
      const efficiencyMetrics = metrics.filter(m => m.efficiency !== null);
      
      return {
        equipmentId,
        averageScore: validMetrics.length > 0 
          ? validMetrics.reduce((sum, m) => sum + (m.performanceScore || 0), 0) / validMetrics.length 
          : 0,
        reliability: reliabilityMetrics.length > 0
          ? reliabilityMetrics.reduce((sum, m) => sum + (m.reliability || 0), 0) / reliabilityMetrics.length
          : 0,
        availability: availabilityMetrics.length > 0
          ? availabilityMetrics.reduce((sum, m) => sum + (m.availability || 0), 0) / availabilityMetrics.length
          : 0,
        efficiency: efficiencyMetrics.length > 0
          ? efficiencyMetrics.reduce((sum, m) => sum + (m.efficiency || 0), 0) / efficiencyMetrics.length
          : 0,
      };
    });
  }

  async getPerformanceTrends(equipmentId: string, months: number = 12): Promise<{ month: string; performanceScore: number; availability: number; efficiency: number }[]> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    
    const metrics = Array.from(this.performanceMetrics.values())
      .filter(m => m.equipmentId === equipmentId && m.metricDate >= cutoffDate);
    
    const trends: Record<string, { scores: number[]; availability: number[]; efficiency: number[] }> = {};
    
    metrics.forEach(metric => {
      const monthKey = `${metric.metricDate.getFullYear()}-${String(metric.metricDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!trends[monthKey]) {
        trends[monthKey] = { scores: [], availability: [], efficiency: [] };
      }
      
      if (metric.performanceScore !== null) trends[monthKey].scores.push(metric.performanceScore);
      if (metric.availability !== null) trends[monthKey].availability.push(metric.availability);
      if (metric.efficiency !== null) trends[monthKey].efficiency.push(metric.efficiency);
    });
    
    return Object.entries(trends).map(([month, data]) => ({
      month,
      performanceScore: data.scores.length > 0 
        ? data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length 
        : 0,
      availability: data.availability.length > 0
        ? data.availability.reduce((sum, a) => sum + a, 0) / data.availability.length
        : 0,
      efficiency: data.efficiency.length > 0
        ? data.efficiency.reduce((sum, e) => sum + e, 0) / data.efficiency.length
        : 0,
    })).sort((a, b) => a.month.localeCompare(b.month));
  }
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  async getDevices(): Promise<Device[]> {
    return await db.select().from(devices);
  }

  async getDevice(id: string): Promise<Device | undefined> {
    const result = await db.select().from(devices).where(eq(devices.id, id));
    return result[0];
  }

  async createDevice(device: InsertDevice): Promise<Device> {
    const result = await db.insert(devices).values({
      ...device,
      vessel: device.vessel || null,
      buses: device.buses || null,
      sensors: device.sensors || null,
      config: device.config || null,
      hmacKey: device.hmacKey || null
    }).returning();
    return result[0];
  }

  async updateDevice(id: string, updates: Partial<InsertDevice>): Promise<Device> {
    const result = await db.update(devices)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(devices.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Device ${id} not found`);
    }
    return result[0];
  }

  async deleteDevice(id: string): Promise<void> {
    const result = await db
      .delete(devices)
      .where(eq(devices.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Device ${id} not found`);
    }
  }

  async getHeartbeats(): Promise<EdgeHeartbeat[]> {
    return await db.select().from(edgeHeartbeats).orderBy(desc(edgeHeartbeats.ts));
  }

  async getHeartbeat(deviceId: string): Promise<EdgeHeartbeat | undefined> {
    const result = await db.select().from(edgeHeartbeats).where(eq(edgeHeartbeats.deviceId, deviceId));
    return result[0];
  }

  async upsertHeartbeat(heartbeat: InsertHeartbeat): Promise<EdgeHeartbeat> {
    const result = await db.insert(edgeHeartbeats)
      .values({
        deviceId: heartbeat.deviceId,
        ts: new Date(),
        cpuPct: heartbeat.cpuPct || null,
        memPct: heartbeat.memPct || null,
        diskFreeGb: heartbeat.diskFreeGb || null,
        bufferRows: heartbeat.bufferRows || null,
        swVersion: heartbeat.swVersion || null
      })
      .onConflictDoUpdate({
        target: edgeHeartbeats.deviceId,
        set: {
          ts: new Date(),
          cpuPct: heartbeat.cpuPct || null,
          memPct: heartbeat.memPct || null,
          diskFreeGb: heartbeat.diskFreeGb || null,
          bufferRows: heartbeat.bufferRows || null,
          swVersion: heartbeat.swVersion || null
        }
      })
      .returning();
    return result[0];
  }

  async getPdmScores(equipmentId?: string): Promise<PdmScoreLog[]> {
    if (equipmentId) {
      return await db.select().from(pdmScoreLogs)
        .where(eq(pdmScoreLogs.equipmentId, equipmentId))
        .orderBy(desc(pdmScoreLogs.ts));
    }
    return await db.select().from(pdmScoreLogs).orderBy(desc(pdmScoreLogs.ts));
  }

  async createPdmScore(score: InsertPdmScore): Promise<PdmScoreLog> {
    const result = await db.insert(pdmScoreLogs)
      .values({
        equipmentId: score.equipmentId,
        healthIdx: score.healthIdx || null,
        pFail30d: score.pFail30d || null,
        predictedDueDate: score.predictedDueDate || null,
        contextJson: score.contextJson || null
      })
      .returning();
    return result[0];
  }

  async getLatestPdmScore(equipmentId: string): Promise<PdmScoreLog | undefined> {
    const result = await db.select().from(pdmScoreLogs)
      .where(eq(pdmScoreLogs.equipmentId, equipmentId))
      .orderBy(desc(pdmScoreLogs.ts))
      .limit(1);
    return result[0];
  }

  async getWorkOrders(equipmentId?: string): Promise<WorkOrder[]> {
    if (equipmentId) {
      return await db.select().from(workOrders)
        .where(eq(workOrders.equipmentId, equipmentId))
        .orderBy(desc(workOrders.createdAt));
    }
    return await db.select().from(workOrders).orderBy(desc(workOrders.createdAt));
  }

  async createWorkOrder(order: InsertWorkOrder): Promise<WorkOrder> {
    const result = await db.insert(workOrders)
      .values({
        equipmentId: order.equipmentId,
        status: order.status || "open",
        priority: order.priority || 3,
        reason: order.reason || null,
        description: order.description || null
      })
      .returning();
    return result[0];
  }

  async updateWorkOrder(id: string, updates: Partial<InsertWorkOrder>): Promise<WorkOrder> {
    const result = await db.update(workOrders)
      .set(updates)
      .where(eq(workOrders.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Work order ${id} not found`);
    }
    return result[0];
  }

  async deleteWorkOrder(id: string): Promise<void> {
    const result = await db
      .delete(workOrders)
      .where(eq(workOrders.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Work order ${id} not found`);
    }
  }

  async getSettings(): Promise<SystemSettings> {
    let result = await db.select().from(systemSettings).where(eq(systemSettings.id, "system"));
    
    if (result.length === 0) {
      // Create default settings if none exist
      const defaultSettings = {
        id: "system",
        hmacRequired: false,
        maxPayloadBytes: 2097152,
        strictUnits: false,
        llmEnabled: true,
        llmModel: "gpt-4o-mini"
      };
      
      const created = await db.insert(systemSettings).values(defaultSettings).returning();
      return created[0];
    }
    
    return result[0];
  }

  async updateSettings(updates: Partial<InsertSettings>): Promise<SystemSettings> {
    const result = await db.update(systemSettings)
      .set(updates)
      .where(eq(systemSettings.id, "system"))
      .returning();
    
    if (result.length === 0) {
      throw new Error("System settings not found");
    }
    return result[0];
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const [allDevices, allHeartbeats, allWorkOrders, allPdmScores] = await Promise.all([
      this.getDevices(),
      this.getHeartbeats(),
      this.getWorkOrders(),
      this.getPdmScores()
    ]);

    const activeDevices = allHeartbeats.filter(hb => {
      const timeSince = Date.now() - (hb.ts?.getTime() || 0);
      return timeSince < 10 * 60 * 1000; // Active if heartbeat within 10 minutes
    }).length;

    const healthScores = allPdmScores.map(score => score.healthIdx || 0);
    const fleetHealth = healthScores.length > 0 
      ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
      : 0;

    const openWorkOrders = allWorkOrders.filter(wo => wo.status !== "completed").length;
    const riskAlerts = allPdmScores.filter(score => (score.healthIdx || 100) < 60).length;

    return {
      activeDevices,
      fleetHealth,
      openWorkOrders,
      riskAlerts
    };
  }

  async getDevicesWithStatus(): Promise<DeviceWithStatus[]> {
    const [allDevices, allHeartbeats] = await Promise.all([
      this.getDevices(),
      this.getHeartbeats()
    ]);

    return allDevices.map(device => {
      const heartbeat = allHeartbeats.find(hb => hb.deviceId === device.id);
      let status: DeviceStatus = "Offline";

      if (heartbeat) {
        const timeSince = Date.now() - (heartbeat.ts?.getTime() || 0);
        if (timeSince < 5 * 60 * 1000) { // 5 minutes
          if ((heartbeat.cpuPct || 0) > 90 || (heartbeat.memPct || 0) > 90 || (heartbeat.diskFreeGb || 0) < 5) {
            status = "Critical";
          } else if ((heartbeat.cpuPct || 0) > 80 || (heartbeat.memPct || 0) > 80 || (heartbeat.diskFreeGb || 0) < 10) {
            status = "Warning";
          } else {
            status = "Online";
          }
        }
      }

      return {
        ...device,
        status,
        lastHeartbeat: heartbeat
      };
    });
  }

  async getEquipmentHealth(): Promise<EquipmentHealth[]> {
    const [allPdmScores, allDevices] = await Promise.all([
      this.getPdmScores(),
      this.getDevices()
    ]);

    // Get latest score for each equipment
    const latestScores = new Map<string, PdmScoreLog>();
    allPdmScores.forEach(score => {
      const existing = latestScores.get(score.equipmentId);
      if (!existing || (score.ts && existing.ts && score.ts > existing.ts)) {
        latestScores.set(score.equipmentId, score);
      }
    });

    return Array.from(latestScores.values()).map(score => {
      const device = allDevices.find(d => {
        const sensors = JSON.parse(d.sensors || "[]");
        return sensors.some((s: any) => s.id === score.equipmentId);
      });

      const healthIndex = score.healthIdx || 0;
      const predictedDueDays = score.predictedDueDate 
        ? Math.ceil((score.predictedDueDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
        : 0;

      let status: "healthy" | "warning" | "critical" = "healthy";
      if (healthIndex < 50) status = "critical";
      else if (healthIndex < 75) status = "warning";

      return {
        id: score.equipmentId,
        vessel: device?.vessel || "Unknown",
        healthIndex,
        predictedDueDays,
        status
      };
    });
  }

  async getTelemetryTrends(equipmentId?: string, hours: number = 24): Promise<TelemetryTrend[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    let readings;
    if (equipmentId) {
      readings = await db.select().from(equipmentTelemetry)
        .where(and(
          eq(equipmentTelemetry.equipmentId, equipmentId),
          gte(equipmentTelemetry.ts, since)
        ))
        .orderBy(desc(equipmentTelemetry.ts));
    } else {
      readings = await db.select().from(equipmentTelemetry)
        .where(gte(equipmentTelemetry.ts, since))
        .orderBy(desc(equipmentTelemetry.ts));
    }
    
    // Group by equipment and sensor type
    const grouped = new Map<string, EquipmentTelemetry[]>();
    readings.forEach(reading => {
      const key = `${reading.equipmentId}-${reading.sensorType}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(reading);
    });
    
    return Array.from(grouped.entries()).map(([key, data]) => {
      const [eqId, sensorType] = key.split('-');
      const latest = data[0];
      const oldest = data[data.length - 1];
      
      let trend: "increasing" | "decreasing" | "stable" = "stable";
      let changePercent = 0;
      
      if (data.length > 1 && oldest.value !== 0) {
        changePercent = ((latest.value - oldest.value) / oldest.value) * 100;
        if (Math.abs(changePercent) > 5) {
          trend = changePercent > 0 ? "increasing" : "decreasing";
        }
      }
      
      return {
        equipmentId: eqId,
        sensorType,
        unit: latest.unit,
        currentValue: latest.value,
        threshold: latest.threshold || undefined,
        status: latest.status,
        data: data.map(d => ({
          ts: d.ts || new Date(),
          value: d.value,
          status: d.status
        })),
        trend,
        changePercent: Math.round(changePercent * 100) / 100
      };
    });
  }

  async createTelemetryReading(reading: InsertTelemetry): Promise<EquipmentTelemetry> {
    const result = await db.insert(equipmentTelemetry)
      .values({
        ...reading,
        ts: new Date()
      })
      .returning();
    return result[0];
  }

  async getTelemetryHistory(equipmentId: string, sensorType: string, hours: number = 24): Promise<EquipmentTelemetry[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return await db.select().from(equipmentTelemetry)
      .where(and(
        eq(equipmentTelemetry.equipmentId, equipmentId),
        eq(equipmentTelemetry.sensorType, sensorType),
        gte(equipmentTelemetry.ts, since)
      ))
      .orderBy(desc(equipmentTelemetry.ts));
  }

  // Alert configuration methods
  async getAlertConfigurations(equipmentId?: string): Promise<AlertConfiguration[]> {
    if (equipmentId) {
      return await db.select().from(alertConfigurations)
        .where(eq(alertConfigurations.equipmentId, equipmentId))
        .orderBy(desc(alertConfigurations.createdAt));
    }
    return await db.select().from(alertConfigurations)
      .orderBy(desc(alertConfigurations.createdAt));
  }

  async createAlertConfiguration(config: InsertAlertConfig): Promise<AlertConfiguration> {
    const result = await db.insert(alertConfigurations).values({
      ...config,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return result[0];
  }

  async updateAlertConfiguration(id: string, config: Partial<InsertAlertConfig>): Promise<AlertConfiguration> {
    const result = await db.update(alertConfigurations)
      .set({
        ...config,
        updatedAt: new Date()
      })
      .where(eq(alertConfigurations.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Alert configuration ${id} not found`);
    }
    return result[0];
  }

  async deleteAlertConfiguration(id: string): Promise<void> {
    const result = await db.delete(alertConfigurations)
      .where(eq(alertConfigurations.id, id));
  }

  // Alert notification methods
  async getAlertNotifications(acknowledged?: boolean): Promise<AlertNotification[]> {
    if (acknowledged !== undefined) {
      return await db.select().from(alertNotifications)
        .where(eq(alertNotifications.acknowledged, acknowledged))
        .orderBy(desc(alertNotifications.createdAt));
    }
    return await db.select().from(alertNotifications)
      .orderBy(desc(alertNotifications.createdAt));
  }

  async createAlertNotification(notification: InsertAlertNotification): Promise<AlertNotification> {
    const result = await db.insert(alertNotifications).values({
      ...notification,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async acknowledgeAlert(id: string, acknowledgedBy: string): Promise<AlertNotification> {
    const result = await db.update(alertNotifications)
      .set({
        acknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedBy
      })
      .where(eq(alertNotifications.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Alert notification ${id} not found`);
    }
    return result[0];
  }

  // Optimized method to check for recent alerts to prevent spam
  async hasRecentAlert(equipmentId: string, sensorType: string, alertType: string, minutesBack: number = 10): Promise<boolean> {
    const cutoffTime = new Date(Date.now() - minutesBack * 60 * 1000);
    
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(alertNotifications)
      .where(and(
        eq(alertNotifications.equipmentId, equipmentId),
        eq(alertNotifications.sensorType, sensorType),
        eq(alertNotifications.alertType, alertType),
        eq(alertNotifications.acknowledged, false),
        gte(alertNotifications.createdAt, cutoffTime)
      ));
    
    return result[0].count > 0;
  }

  // Maintenance schedules
  async getMaintenanceSchedules(equipmentId?: string, status?: string): Promise<MaintenanceSchedule[]> {
    let query = db.select().from(maintenanceSchedules);
    
    const conditions = [];
    if (equipmentId) {
      conditions.push(eq(maintenanceSchedules.equipmentId, equipmentId));
    }
    if (status) {
      conditions.push(eq(maintenanceSchedules.status, status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return query.orderBy(maintenanceSchedules.scheduledDate);
  }

  async createMaintenanceSchedule(schedule: InsertMaintenanceSchedule): Promise<MaintenanceSchedule> {
    const [newSchedule] = await db.insert(maintenanceSchedules)
      .values(schedule)
      .returning();
    return newSchedule;
  }

  async updateMaintenanceSchedule(id: string, updates: Partial<InsertMaintenanceSchedule>): Promise<MaintenanceSchedule> {
    const [updated] = await db.update(maintenanceSchedules)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(maintenanceSchedules.id, id))
      .returning();
    
    if (!updated) {
      throw new Error(`Maintenance schedule ${id} not found`);
    }
    
    return updated;
  }

  async deleteMaintenanceSchedule(id: string): Promise<void> {
    const result = await db.delete(maintenanceSchedules)
      .where(eq(maintenanceSchedules.id, id));
    
    if (result.rowCount === 0) {
      throw new Error(`Maintenance schedule ${id} not found`);
    }
  }

  async getUpcomingSchedules(days: number = 30): Promise<MaintenanceSchedule[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);
    
    return db.select().from(maintenanceSchedules)
      .where(and(
        gte(maintenanceSchedules.scheduledDate, new Date()),
        gte(maintenanceSchedules.scheduledDate, cutoffDate),
        eq(maintenanceSchedules.status, 'scheduled')
      ))
      .orderBy(maintenanceSchedules.scheduledDate);
  }

  async autoScheduleMaintenance(equipmentId: string, pdmScore: number): Promise<MaintenanceSchedule | null> {
    // Check for existing auto-generated schedules for this equipment
    const existingSchedules = await db.select().from(maintenanceSchedules)
      .where(and(
        eq(maintenanceSchedules.equipmentId, equipmentId),
        eq(maintenanceSchedules.autoGenerated, true),
        eq(maintenanceSchedules.status, 'scheduled')
      ));
      
    if (existingSchedules.length > 0) {
      return null; // Already has auto-generated schedule
    }
    
    // Auto-schedule logic based on PdM score
    if (pdmScore < 30) {
      // Critical - schedule immediate maintenance
      const schedule: InsertMaintenanceSchedule = {
        equipmentId,
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        maintenanceType: 'predictive',
        priority: 1,
        status: 'scheduled',
        description: `Automatic predictive maintenance scheduled due to critical PdM score: ${pdmScore}`,
        pdmScore,
        autoGenerated: true,
      };
      return this.createMaintenanceSchedule(schedule);
    } else if (pdmScore < 60) {
      // Warning - schedule maintenance in a week
      const schedule: InsertMaintenanceSchedule = {
        equipmentId,
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
        maintenanceType: 'predictive',
        priority: 2,
        status: 'scheduled',
        description: `Automatic predictive maintenance scheduled due to warning PdM score: ${pdmScore}`,
        pdmScore,
        autoGenerated: true,
      };
      return this.createMaintenanceSchedule(schedule);
    }
    
    return null; // No scheduling needed
  }

  // Analytics - Maintenance Records
  async getMaintenanceRecords(equipmentId?: string, dateFrom?: Date, dateTo?: Date): Promise<MaintenanceRecord[]> {
    let query = db.select().from(maintenanceRecords);
    
    const conditions = [];
    if (equipmentId) {
      conditions.push(eq(maintenanceRecords.equipmentId, equipmentId));
    }
    if (dateFrom) {
      conditions.push(gte(maintenanceRecords.createdAt, dateFrom));
    }
    if (dateTo) {
      conditions.push(gte(dateTo, maintenanceRecords.createdAt));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return query.orderBy(desc(maintenanceRecords.createdAt));
  }

  async createMaintenanceRecord(record: InsertMaintenanceRecord): Promise<MaintenanceRecord> {
    const [newRecord] = await db.insert(maintenanceRecords)
      .values(record)
      .returning();
    return newRecord;
  }

  async updateMaintenanceRecord(id: string, updates: Partial<InsertMaintenanceRecord>): Promise<MaintenanceRecord> {
    const [updated] = await db.update(maintenanceRecords)
      .set(updates)
      .where(eq(maintenanceRecords.id, id))
      .returning();
    
    if (!updated) {
      throw new Error(`Maintenance record ${id} not found`);
    }
    
    return updated;
  }

  async deleteMaintenanceRecord(id: string): Promise<void> {
    const result = await db.delete(maintenanceRecords)
      .where(eq(maintenanceRecords.id, id));
    
    if (result.rowCount === 0) {
      throw new Error(`Maintenance record ${id} not found`);
    }
  }

  // Analytics - Maintenance Costs
  async getMaintenanceCosts(equipmentId?: string, costType?: string, dateFrom?: Date, dateTo?: Date): Promise<MaintenanceCost[]> {
    let query = db.select().from(maintenanceCosts);
    
    const conditions = [];
    if (equipmentId) {
      conditions.push(eq(maintenanceCosts.equipmentId, equipmentId));
    }
    if (costType) {
      conditions.push(eq(maintenanceCosts.costType, costType));
    }
    if (dateFrom) {
      conditions.push(gte(maintenanceCosts.createdAt, dateFrom));
    }
    if (dateTo) {
      conditions.push(gte(dateTo, maintenanceCosts.createdAt));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return query.orderBy(desc(maintenanceCosts.createdAt));
  }

  async createMaintenanceCost(cost: InsertMaintenanceCost): Promise<MaintenanceCost> {
    const [newCost] = await db.insert(maintenanceCosts)
      .values(cost)
      .returning();
    return newCost;
  }

  async getCostSummaryByEquipment(equipmentId?: string, months: number = 12): Promise<{ equipmentId: string; totalCost: number; costByType: Record<string, number> }[]> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    
    let query = db.select().from(maintenanceCosts)
      .where(gte(maintenanceCosts.createdAt, cutoffDate));
    
    if (equipmentId) {
      query = query.where(and(
        gte(maintenanceCosts.createdAt, cutoffDate),
        eq(maintenanceCosts.equipmentId, equipmentId)
      ));
    }
    
    const costs = await query;
    
    const summary: Record<string, { totalCost: number; costByType: Record<string, number> }> = {};
    
    costs.forEach(cost => {
      if (!summary[cost.equipmentId]) {
        summary[cost.equipmentId] = { totalCost: 0, costByType: {} };
      }
      
      summary[cost.equipmentId].totalCost += cost.amount;
      summary[cost.equipmentId].costByType[cost.costType] = 
        (summary[cost.equipmentId].costByType[cost.costType] || 0) + cost.amount;
    });
    
    return Object.entries(summary).map(([equipmentId, data]) => ({
      equipmentId,
      ...data
    }));
  }

  async getCostTrends(months: number = 12): Promise<{ month: string; totalCost: number; costByType: Record<string, number> }[]> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    
    const costs = await db.select().from(maintenanceCosts)
      .where(gte(maintenanceCosts.createdAt, cutoffDate));
    
    const trends: Record<string, { totalCost: number; costByType: Record<string, number> }> = {};
    
    costs.forEach(cost => {
      if (!cost.createdAt) return;
      
      const monthKey = `${cost.createdAt.getFullYear()}-${String(cost.createdAt.getMonth() + 1).padStart(2, '0')}`;
      
      if (!trends[monthKey]) {
        trends[monthKey] = { totalCost: 0, costByType: {} };
      }
      
      trends[monthKey].totalCost += cost.amount;
      trends[monthKey].costByType[cost.costType] = 
        (trends[monthKey].costByType[cost.costType] || 0) + cost.amount;
    });
    
    return Object.entries(trends).map(([month, data]) => ({
      month,
      ...data
    })).sort((a, b) => a.month.localeCompare(b.month));
  }

  // Analytics - Equipment Lifecycle
  async getEquipmentLifecycle(equipmentId?: string): Promise<EquipmentLifecycle[]> {
    let query = db.select().from(equipmentLifecycle);
    
    if (equipmentId) {
      query = query.where(eq(equipmentLifecycle.equipmentId, equipmentId));
    }
    
    return query.orderBy(equipmentLifecycle.equipmentId);
  }

  async upsertEquipmentLifecycle(lifecycle: InsertEquipmentLifecycle): Promise<EquipmentLifecycle> {
    // Try to find existing lifecycle for this equipment
    const existing = await db.select().from(equipmentLifecycle)
      .where(eq(equipmentLifecycle.equipmentId, lifecycle.equipmentId))
      .limit(1);
    
    if (existing.length > 0) {
      return this.updateEquipmentLifecycle(existing[0].id, lifecycle);
    }
    
    const [newLifecycle] = await db.insert(equipmentLifecycle)
      .values(lifecycle)
      .returning();
    return newLifecycle;
  }

  async updateEquipmentLifecycle(id: string, updates: Partial<InsertEquipmentLifecycle>): Promise<EquipmentLifecycle> {
    const [updated] = await db.update(equipmentLifecycle)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(equipmentLifecycle.id, id))
      .returning();
    
    if (!updated) {
      throw new Error(`Equipment lifecycle ${id} not found`);
    }
    
    return updated;
  }

  async getReplacementRecommendations(): Promise<EquipmentLifecycle[]> {
    const now = new Date();
    
    return db.select().from(equipmentLifecycle)
      .where(sql`
        ${equipmentLifecycle.nextRecommendedReplacement} <= ${now} OR
        ${equipmentLifecycle.condition} IN ('poor', 'critical') OR
        (${equipmentLifecycle.installationDate} IS NOT NULL AND 
         ${equipmentLifecycle.expectedLifespan} IS NOT NULL AND
         ${equipmentLifecycle.installationDate} + INTERVAL '1 month' * ${equipmentLifecycle.expectedLifespan} <= ${now})
      `);
  }

  // Analytics - Performance Metrics
  async getPerformanceMetrics(equipmentId?: string, dateFrom?: Date, dateTo?: Date): Promise<PerformanceMetric[]> {
    let query = db.select().from(performanceMetrics);
    
    const conditions = [];
    if (equipmentId) {
      conditions.push(eq(performanceMetrics.equipmentId, equipmentId));
    }
    if (dateFrom) {
      conditions.push(gte(performanceMetrics.metricDate, dateFrom));
    }
    if (dateTo) {
      conditions.push(gte(dateTo, performanceMetrics.metricDate));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return query.orderBy(desc(performanceMetrics.metricDate));
  }

  async createPerformanceMetric(metric: InsertPerformanceMetric): Promise<PerformanceMetric> {
    const [newMetric] = await db.insert(performanceMetrics)
      .values(metric)
      .returning();
    return newMetric;
  }

  async getFleetPerformanceOverview(): Promise<{ equipmentId: string; averageScore: number; reliability: number; availability: number; efficiency: number }[]> {
    const metrics = await db.select().from(performanceMetrics);
    
    const equipmentMetrics: Record<string, PerformanceMetric[]> = {};
    
    metrics.forEach(metric => {
      if (!equipmentMetrics[metric.equipmentId]) {
        equipmentMetrics[metric.equipmentId] = [];
      }
      equipmentMetrics[metric.equipmentId].push(metric);
    });
    
    return Object.entries(equipmentMetrics).map(([equipmentId, metrics]) => {
      const validMetrics = metrics.filter(m => m.performanceScore !== null);
      const reliabilityMetrics = metrics.filter(m => m.reliability !== null);
      const availabilityMetrics = metrics.filter(m => m.availability !== null);
      const efficiencyMetrics = metrics.filter(m => m.efficiency !== null);
      
      return {
        equipmentId,
        averageScore: validMetrics.length > 0 
          ? validMetrics.reduce((sum, m) => sum + (m.performanceScore || 0), 0) / validMetrics.length 
          : 0,
        reliability: reliabilityMetrics.length > 0
          ? reliabilityMetrics.reduce((sum, m) => sum + (m.reliability || 0), 0) / reliabilityMetrics.length
          : 0,
        availability: availabilityMetrics.length > 0
          ? availabilityMetrics.reduce((sum, m) => sum + (m.availability || 0), 0) / availabilityMetrics.length
          : 0,
        efficiency: efficiencyMetrics.length > 0
          ? efficiencyMetrics.reduce((sum, m) => sum + (m.efficiency || 0), 0) / efficiencyMetrics.length
          : 0,
      };
    });
  }

  async getPerformanceTrends(equipmentId: string, months: number = 12): Promise<{ month: string; performanceScore: number; availability: number; efficiency: number }[]> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    
    const metrics = await db.select().from(performanceMetrics)
      .where(and(
        eq(performanceMetrics.equipmentId, equipmentId),
        gte(performanceMetrics.metricDate, cutoffDate)
      ));
    
    const trends: Record<string, { scores: number[]; availability: number[]; efficiency: number[] }> = {};
    
    metrics.forEach(metric => {
      const monthKey = `${metric.metricDate.getFullYear()}-${String(metric.metricDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!trends[monthKey]) {
        trends[monthKey] = { scores: [], availability: [], efficiency: [] };
      }
      
      if (metric.performanceScore !== null) trends[monthKey].scores.push(metric.performanceScore);
      if (metric.availability !== null) trends[monthKey].availability.push(metric.availability);
      if (metric.efficiency !== null) trends[monthKey].efficiency.push(metric.efficiency);
    });
    
    return Object.entries(trends).map(([month, data]) => ({
      month,
      performanceScore: data.scores.length > 0 
        ? data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length 
        : 0,
      availability: data.availability.length > 0
        ? data.availability.reduce((sum, a) => sum + a, 0) / data.availability.length
        : 0,
      efficiency: data.efficiency.length > 0
        ? data.efficiency.reduce((sum, e) => sum + e, 0) / data.efficiency.length
        : 0,
    })).sort((a, b) => a.month.localeCompare(b.month));
  }
}

// Initialize sample data for database (only in development)
export async function initializeSampleData() {
  // Only initialize sample data in development or when explicitly requested
  const shouldSeed = process.env.NODE_ENV !== 'production' || process.env.SEED_SAMPLE_DATA === 'true';
  if (!shouldSeed) {
    return;
  }

  try {
    const storage = new DatabaseStorage();
    
    // Check if data already exists
    const existingDevices = await storage.getDevices();
    if (existingDevices.length > 0) {
      console.log('Sample data already exists, skipping initialization');
      return; // Data already initialized
    }

    console.log('Initializing sample data...');

  // Sample devices
  const sampleDevices = [
    {
      id: "DEV-001",
      vessel: "MV Atlantic",
      buses: JSON.stringify(["CAN1", "CAN2"]),
      sensors: JSON.stringify([
        { id: "ENG1", type: "engine", metrics: ["rpm", "temp", "pressure"] },
        { id: "GEN1", type: "generator", metrics: ["voltage", "current", "frequency"] }
      ]),
      config: JSON.stringify({ sampling_rate: 1000, buffer_size: 10000 }),
      hmacKey: null
    },
    {
      id: "DEV-002",
      vessel: "MV Pacific", 
      buses: JSON.stringify(["CAN1"]),
      sensors: JSON.stringify([
        { id: "ENG2", type: "engine", metrics: ["rpm", "temp", "pressure"] }
      ]),
      config: JSON.stringify({ sampling_rate: 500, buffer_size: 5000 }),
      hmacKey: null
    },
    {
      id: "DEV-003",
      vessel: "MV Arctic",
      buses: JSON.stringify(["CAN1", "CAN2", "CAN3"]),
      sensors: JSON.stringify([
        { id: "PUMP1", type: "pump", metrics: ["flow", "pressure", "vibration"] }
      ]),
      config: JSON.stringify({ sampling_rate: 2000, buffer_size: 20000 }),
      hmacKey: null
    },
    {
      id: "DEV-004",
      vessel: "MV Nordic",
      buses: JSON.stringify(["CAN1"]),
      sensors: JSON.stringify([
        { id: "GEN2", type: "generator", metrics: ["voltage", "current", "frequency"] }
      ]),
      config: JSON.stringify({ sampling_rate: 1000, buffer_size: 15000 }),
      hmacKey: null
    }
  ];

  // Create devices
  for (const device of sampleDevices) {
    await storage.createDevice(device);
  }

  // Sample heartbeats
  const now = new Date();
  const heartbeats = [
    {
      deviceId: "DEV-001",
      cpuPct: 23,
      memPct: 67,
      diskFreeGb: 45.2,
      bufferRows: 1250,
      swVersion: "v2.1.3"
    },
    {
      deviceId: "DEV-002",
      cpuPct: 89,
      memPct: 45,
      diskFreeGb: 12.8,
      bufferRows: 4500,
      swVersion: "v2.1.2"
    },
    {
      deviceId: "DEV-003",
      cpuPct: 95,
      memPct: 92,
      diskFreeGb: 2.1,
      bufferRows: 19800,
      swVersion: "v2.1.1"
    },
    {
      deviceId: "DEV-004",
      cpuPct: 34,
      memPct: 52,
      diskFreeGb: 67.4,
      bufferRows: 890,
      swVersion: "v2.1.3"
    }
  ];

  for (const hb of heartbeats) {
    await storage.upsertHeartbeat(hb);
  }

  // Sample PdM scores
  const pdmScores = [
    {
      equipmentId: "ENG1",
      healthIdx: 72,
      pFail30d: 0.15,
      predictedDueDate: new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000),
      contextJson: JSON.stringify({ fuel_per_kw_drift_pct: 3.2, vib_sigma: 0.8 })
    },
    {
      equipmentId: "GEN2",
      healthIdx: 94,
      pFail30d: 0.03,
      predictedDueDate: new Date(now.getTime() + 42 * 24 * 60 * 60 * 1000),
      contextJson: JSON.stringify({ fuel_per_kw_drift_pct: 1.1, vib_sigma: 0.3 })
    },
    {
      equipmentId: "PUMP1",
      healthIdx: 45,
      pFail30d: 0.35,
      predictedDueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      contextJson: JSON.stringify({ fuel_per_kw_drift_pct: 8.7, vib_sigma: 2.1 })
    }
  ];

  for (const score of pdmScores) {
    await storage.createPdmScore(score);
  }

  // Sample work orders
  const workOrders = [
    {
      equipmentId: "ENG1",
      status: "in_progress",
      priority: 1,
      reason: "Elevated vibration levels detected"
    },
    {
      equipmentId: "PUMP1",
      status: "open",
      priority: 1,
      reason: "Critical health index - immediate inspection required"
    },
    {
      equipmentId: "GEN2",
      status: "completed",
      priority: 2,
      reason: "Routine maintenance - oil change and filter replacement"
    }
  ];

  for (const order of workOrders) {
    await storage.createWorkOrder(order);
  }

  // Sample telemetry data - generate 24 hours of historical readings
  const currentTime = new Date();
  const telemetryReadings: InsertTelemetry[] = [];
  
  // Generate readings for the past 24 hours (every 30 minutes)
  for (let i = 0; i < 48; i++) {
    const timestamp = new Date(currentTime.getTime() - i * 30 * 60 * 1000); // 30 minutes ago
    
    // ENG1 - Engine with elevated vibration issues
    const engVibTrend = 1 + (i * 0.02); // Increasing vibration trend
    telemetryReadings.push({
      equipmentId: "ENG1",
      sensorType: "vibration",
      value: 0.8 + (Math.random() * 0.3) + engVibTrend,
      unit: "mm/s",
      threshold: 2.0,
      status: (0.8 + engVibTrend) > 1.8 ? "warning" : "normal"
    });
    
    telemetryReadings.push({
      equipmentId: "ENG1",
      sensorType: "temperature",
      value: 75 + (Math.random() * 10) + (i * 0.1),
      unit: "celsius",
      threshold: 95,
      status: "normal"
    });
    
    // GEN1 - Generator running normally
    telemetryReadings.push({
      equipmentId: "GEN1",
      sensorType: "voltage",
      value: 480 + (Math.random() * 5 - 2.5),
      unit: "volts",
      threshold: 500,
      status: "normal"
    });
    
    telemetryReadings.push({
      equipmentId: "GEN1",
      sensorType: "current",
      value: 100 + (Math.random() * 10 - 5),
      unit: "amps",
      threshold: 150,
      status: "normal"
    });
    
    // GEN2 - Generator with stable performance
    telemetryReadings.push({
      equipmentId: "GEN2",
      sensorType: "frequency",
      value: 60 + (Math.random() * 0.5 - 0.25),
      unit: "hz",
      threshold: 62,
      status: "normal"
    });
    
    // PUMP1 - Pump with critical issues (declining performance)
    const pumpFlow = 250 - (i * 1.5); // Declining flow rate
    const flowStatus = pumpFlow < 200 ? "critical" : pumpFlow < 220 ? "warning" : "normal";
    telemetryReadings.push({
      equipmentId: "PUMP1",
      sensorType: "flow_rate",
      value: Math.max(180, pumpFlow + (Math.random() * 10 - 5)),
      unit: "gpm",
      threshold: 220,
      status: flowStatus
    });
    
    telemetryReadings.push({
      equipmentId: "PUMP1",
      sensorType: "pressure",
      value: 85 - (i * 0.5) + (Math.random() * 5 - 2.5),
      unit: "psi",
      threshold: 70,
      status: (85 - i * 0.5) < 75 ? "warning" : "normal"
    });
  }
  
  // Insert telemetry readings with proper timestamps
  for (let i = 0; i < telemetryReadings.length; i++) {
    const reading = telemetryReadings[i];
    const readingIndex = Math.floor(i / 6); // 6 readings per time period
    const timestamp = new Date(currentTime.getTime() - readingIndex * 30 * 60 * 1000);
    
    await db.insert(equipmentTelemetry).values({
      ...reading,
      ts: timestamp
    });
  }

    console.log('Sample data initialization completed successfully');
  } catch (error) {
    console.error('Failed to initialize sample data:', error);
    throw error;
  }
}

// Create storage instance with error handling
let storage: DatabaseStorage;

try {
  storage = new DatabaseStorage();
} catch (error) {
  console.error('Failed to initialize database storage:', error);
  process.exit(1);
}

export { storage };

// Startup validation and initialization
export async function initializeDatabase() {
  try {
    // Test database connectivity
    console.log('Testing database connectivity...');
    await db.select().from(devices).limit(1);
    console.log('Database connectivity verified');
    
    // Initialize sample data if appropriate
    const shouldSeed = process.env.NODE_ENV !== 'production' || process.env.SEED_SAMPLE_DATA === 'true';
    if (shouldSeed) {
      await initializeSampleData();
    }
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// Delay initialization to allow for proper startup
setTimeout(() => {
  initializeDatabase().catch((error) => {
    console.error('Database startup failed:', error);
    process.exit(1);
  });
}, 1000);
