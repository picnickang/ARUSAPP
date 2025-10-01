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

// API functions for insights
export async function fetchInsightSnapshots(orgId?: string, scope?: string) {
  const params = new URLSearchParams();
  if (orgId) params.append('orgId', orgId);
  if (scope) params.append('scope', scope);
  const url = `/api/insights/snapshots${params.toString() ? `?${params.toString()}` : ''}`;
  return await apiRequest("GET", url);
}

export async function fetchLatestInsightSnapshot(orgId = 'default-org-id', scope = 'fleet') {
  const url = `/api/insights/snapshots/latest?orgId=${orgId}&scope=${scope}`;
  return await apiRequest("GET", url);
}

export async function triggerInsightsGeneration(orgId = 'default-org-id', scope = 'fleet') {
  return await apiRequest("POST", "/api/insights/generate", { orgId, scope });
}

export async function fetchInsightsJobStats() {
  return await apiRequest("GET", "/api/insights/jobs/stats");
}

export async function fetchInsightReports(orgId?: string, scope?: string) {
  const params = new URLSearchParams();
  if (orgId) params.append('orgId', orgId);
  if (scope) params.append('scope', scope);
  const url = `/api/insights/reports${params.toString() ? `?${params.toString()}` : ''}`;
  return await apiRequest("GET", url);
}

// API functions for dashboard
export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  return await apiRequest("GET", "/api/dashboard");
}

// API function for DTC dashboard stats (Task 9: Frontend UI Updates)
export async function fetchDtcDashboardStats(): Promise<{
  totalActiveDtcs: number;
  criticalDtcs: number;
  equipmentWithDtcs: number;
  dtcTriggeredWorkOrders: number;
}> {
  return await apiRequest("GET", "/api/dtc/dashboard-stats");
}

// API functions for devices
export async function fetchDevices(): Promise<DeviceWithStatus[]> {
  return await apiRequest("GET", "/api/devices");
}

export async function fetchDevice(id: string): Promise<Device> {
  return await apiRequest("GET", `/api/devices/${id}`);
}

export async function createDevice(device: InsertDevice): Promise<Device> {
  return await apiRequest("POST", "/api/devices", device);
}

export async function updateDevice(id: string, device: Partial<InsertDevice>): Promise<Device> {
  return await apiRequest("PUT", `/api/devices/${id}`, device);
}

// API functions for edge heartbeats
export async function fetchHeartbeats(): Promise<EdgeHeartbeat[]> {
  return await apiRequest("GET", "/api/edge/heartbeats");
}

export async function createHeartbeat(heartbeat: InsertHeartbeat): Promise<EdgeHeartbeat> {
  return await apiRequest("POST", "/api/edge/heartbeat", heartbeat);
}

// API functions for PdM scoring
export async function fetchPdmScores(equipmentId?: string): Promise<PdmScoreLog[]> {
  const url = equipmentId ? `/api/pdm/scores?equipmentId=${equipmentId}` : "/api/pdm/scores";
  return await apiRequest("GET", url);
}

export async function fetchLatestPdmScore(equipmentId: string): Promise<PdmScoreLog> {
  return await apiRequest("GET", `/api/pdm/scores/${equipmentId}/latest`);
}

export async function createPdmScore(score: InsertPdmScore): Promise<PdmScoreLog> {
  return await apiRequest("POST", "/api/pdm/scores", score);
}

// API functions for equipment health
export async function fetchEquipmentHealth(vesselId?: string): Promise<EquipmentHealth[]> {
  const params = new URLSearchParams();
  if (vesselId) {
    params.append('vesselId', vesselId);
  }
  const url = `/api/equipment/health${params.toString() ? `?${params.toString()}` : ''}`;
  return await apiRequest("GET", url);
}

// Vessel-centric fleet overview (Option A extension)
export async function fetchVesselFleetOverview(orgId?: string) {
  const url = orgId ? `/api/fleet/overview?orgId=${orgId}` : "/api/fleet/overview";
  return await apiRequest("GET", url);
}

// Latest telemetry readings (Option A extension)
export async function fetchLatestTelemetryReadings(
  vesselId?: string,
  equipmentId?: string,
  sensorType?: string,
  limit?: number
) {
  const params = new URLSearchParams();
  if (vesselId) params.set("vesselId", vesselId);
  if (equipmentId) params.set("equipmentId", equipmentId);
  if (sensorType) params.set("sensorType", sensorType);
  if (limit) params.set("limit", limit.toString());
  
  const url = `/api/telemetry/latest${params.toString() ? `?${params.toString()}` : ""}`;
  return await apiRequest("GET", url);
}

// API functions for work orders
export async function fetchWorkOrders(equipmentId?: string): Promise<WorkOrder[]> {
  const url = equipmentId ? `/api/work-orders?equipmentId=${equipmentId}` : "/api/work-orders";
  return await apiRequest("GET", url);
}

export async function createWorkOrder(order: InsertWorkOrder): Promise<WorkOrder> {
  return await apiRequest("POST", "/api/work-orders", order);
}

export async function updateWorkOrder(id: string, order: Partial<InsertWorkOrder>): Promise<WorkOrder> {
  return await apiRequest("PUT", `/api/work-orders/${id}`, order);
}

// API functions for settings
export async function fetchSettings(): Promise<SystemSettings> {
  return await apiRequest("GET", "/api/settings");
}

export async function updateSettings(settings: Partial<InsertSettings>): Promise<SystemSettings> {
  return await apiRequest("PUT", "/api/settings", settings);
}

// API functions for reports
export async function fetchEquipmentReport(equipmentId: string): Promise<any> {
  return await apiRequest("GET", `/api/reports/equipment/${equipmentId}`);
}

// API functions for telemetry
export async function fetchTelemetryTrends(): Promise<TelemetryTrend[]> {
  return await apiRequest("GET", "/api/telemetry/trends");
}

export async function createTelemetryReading(reading: InsertTelemetry): Promise<EquipmentTelemetry> {
  return await apiRequest("POST", "/api/telemetry/readings", reading);
}

export async function fetchTelemetryHistory(equipmentId: string, sensorType: string, hours: number = 24): Promise<EquipmentTelemetry[]> {
  return await apiRequest("GET", `/api/telemetry/history/${equipmentId}/${sensorType}?hours=${hours}`);
}
