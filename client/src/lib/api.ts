import { apiRequest } from "./queryClient";
import type { 
  Device, 
  InsertDevice, 
  EdgeHeartbeat, 
  InsertHeartbeat,
  PdmScoreLog,
  InsertPdmScore,
  WorkOrder,
  InsertWorkOrder,
  SystemSettings,
  InsertSettings,
  DashboardMetrics,
  DeviceWithStatus,
  EquipmentHealth,
  EquipmentTelemetry,
  InsertTelemetry,
  TelemetryTrend
} from "@shared/schema";

// API functions for dashboard
export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const res = await apiRequest("GET", "/api/dashboard");
  return res.json();
}

// API functions for devices
export async function fetchDevices(): Promise<DeviceWithStatus[]> {
  const res = await apiRequest("GET", "/api/devices");
  return res.json();
}

export async function fetchDevice(id: string): Promise<Device> {
  const res = await apiRequest("GET", `/api/devices/${id}`);
  return res.json();
}

export async function createDevice(device: InsertDevice): Promise<Device> {
  const res = await apiRequest("POST", "/api/devices", device);
  return res.json();
}

export async function updateDevice(id: string, device: Partial<InsertDevice>): Promise<Device> {
  const res = await apiRequest("PUT", `/api/devices/${id}`, device);
  return res.json();
}

// API functions for edge heartbeats
export async function fetchHeartbeats(): Promise<EdgeHeartbeat[]> {
  const res = await apiRequest("GET", "/api/edge/heartbeats");
  return res.json();
}

export async function createHeartbeat(heartbeat: InsertHeartbeat): Promise<EdgeHeartbeat> {
  const res = await apiRequest("POST", "/api/edge/heartbeat", heartbeat);
  return res.json();
}

// API functions for PdM scoring
export async function fetchPdmScores(equipmentId?: string): Promise<PdmScoreLog[]> {
  const url = equipmentId ? `/api/pdm/scores?equipmentId=${equipmentId}` : "/api/pdm/scores";
  const res = await apiRequest("GET", url);
  return res.json();
}

export async function fetchLatestPdmScore(equipmentId: string): Promise<PdmScoreLog> {
  const res = await apiRequest("GET", `/api/pdm/scores/${equipmentId}/latest`);
  return res.json();
}

export async function createPdmScore(score: InsertPdmScore): Promise<PdmScoreLog> {
  const res = await apiRequest("POST", "/api/pdm/scores", score);
  return res.json();
}

// API functions for equipment health
export async function fetchEquipmentHealth(): Promise<EquipmentHealth[]> {
  const res = await apiRequest("GET", "/api/equipment/health");
  return res.json();
}

// API functions for work orders
export async function fetchWorkOrders(equipmentId?: string): Promise<WorkOrder[]> {
  const url = equipmentId ? `/api/work-orders?equipmentId=${equipmentId}` : "/api/work-orders";
  const res = await apiRequest("GET", url);
  return res.json();
}

export async function createWorkOrder(order: InsertWorkOrder): Promise<WorkOrder> {
  const res = await apiRequest("POST", "/api/work-orders", order);
  return res.json();
}

export async function updateWorkOrder(id: string, order: Partial<InsertWorkOrder>): Promise<WorkOrder> {
  const res = await apiRequest("PUT", `/api/work-orders/${id}`, order);
  return res.json();
}

// API functions for settings
export async function fetchSettings(): Promise<SystemSettings> {
  const res = await apiRequest("GET", "/api/settings");
  return res.json();
}

export async function updateSettings(settings: Partial<InsertSettings>): Promise<SystemSettings> {
  const res = await apiRequest("PUT", "/api/settings", settings);
  return res.json();
}

// API functions for reports
export async function fetchEquipmentReport(equipmentId: string): Promise<any> {
  const res = await apiRequest("GET", `/api/reports/equipment/${equipmentId}`);
  return res.json();
}

// API functions for telemetry
export async function fetchTelemetryTrends(): Promise<TelemetryTrend[]> {
  const res = await apiRequest("GET", "/api/telemetry/trends");
  return res.json();
}

export async function createTelemetryReading(reading: InsertTelemetry): Promise<EquipmentTelemetry> {
  const res = await apiRequest("POST", "/api/telemetry/readings", reading);
  return res.json();
}

export async function fetchTelemetryHistory(equipmentId: string, sensorType: string, hours: number = 24): Promise<EquipmentTelemetry[]> {
  const res = await apiRequest("GET", `/api/telemetry/history/${equipmentId}/${sensorType}?hours=${hours}`);
  return res.json();
}
