import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const devices = pgTable("devices", {
  id: varchar("id").primaryKey(),
  vessel: text("vessel"),
  buses: text("buses"), // JSON string array
  sensors: text("sensors"), // JSON string array
  config: text("config"), // JSON object
  hmacKey: text("hmac_key"),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

export const edgeHeartbeats = pgTable("edge_heartbeats", {
  deviceId: varchar("device_id").primaryKey(),
  ts: timestamp("ts", { mode: "date" }).defaultNow(),
  cpuPct: real("cpu_pct"),
  memPct: real("mem_pct"),
  diskFreeGb: real("disk_free_gb"),
  bufferRows: integer("buffer_rows"),
  swVersion: text("sw_version"),
});

export const pdmScoreLogs = pgTable("pdm_score_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ts: timestamp("ts", { mode: "date" }).defaultNow(),
  equipmentId: text("equipment_id").notNull(),
  healthIdx: real("health_idx"),
  pFail30d: real("p_fail_30d"),
  predictedDueDate: timestamp("predicted_due_date", { mode: "date" }),
  contextJson: text("context_json"), // JSON object
});

export const workOrders = pgTable("work_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  equipmentId: text("equipment_id").notNull(),
  status: text("status").notNull().default("open"),
  priority: integer("priority").notNull().default(3),
  reason: text("reason"),
  description: text("description"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const equipmentTelemetry = pgTable("equipment_telemetry", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ts: timestamp("ts", { mode: "date" }).defaultNow(),
  equipmentId: text("equipment_id").notNull(),
  sensorType: text("sensor_type").notNull(), // temperature, vibration, pressure, flow_rate, etc.
  value: real("value").notNull(),
  unit: text("unit").notNull(), // celsius, hz, psi, gpm, etc.
  threshold: real("threshold"), // alert threshold value
  status: text("status").notNull().default("normal"), // normal, warning, critical
});

export const alertConfigurations = pgTable("alert_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  equipmentId: text("equipment_id").notNull(),
  sensorType: text("sensor_type").notNull(), // temperature, pressure, voltage, etc.
  warningThreshold: real("warning_threshold"),
  criticalThreshold: real("critical_threshold"),
  enabled: boolean("enabled").default(true),
  notifyEmail: boolean("notify_email").default(false),
  notifyInApp: boolean("notify_in_app").default(true),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

export const alertNotifications = pgTable("alert_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  equipmentId: text("equipment_id").notNull(),
  sensorType: text("sensor_type").notNull(),
  alertType: text("alert_type").notNull(), // warning, critical
  message: text("message").notNull(),
  value: real("value").notNull(),
  threshold: real("threshold").notNull(),
  acknowledged: boolean("acknowledged").default(false),
  acknowledgedAt: timestamp("acknowledged_at", { mode: "date" }),
  acknowledgedBy: text("acknowledged_by"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default("system"),
  hmacRequired: boolean("hmac_required").default(false),
  maxPayloadBytes: integer("max_payload_bytes").default(2097152),
  strictUnits: boolean("strict_units").default(false),
  llmEnabled: boolean("llm_enabled").default(true),
  llmModel: text("llm_model").default("gpt-4o-mini"),
});

// Insert schemas
export const insertDeviceSchema = createInsertSchema(devices).omit({
  updatedAt: true,
});

export const insertHeartbeatSchema = createInsertSchema(edgeHeartbeats).omit({
  ts: true,
});

export const insertPdmScoreSchema = createInsertSchema(pdmScoreLogs).omit({
  id: true,
  ts: true,
});

export const insertWorkOrderSchema = createInsertSchema(workOrders).omit({
  id: true,
  createdAt: true,
});

export const insertTelemetrySchema = createInsertSchema(equipmentTelemetry).omit({
  id: true,
  ts: true,
});

export const insertAlertConfigSchema = createInsertSchema(alertConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAlertNotificationSchema = createInsertSchema(alertNotifications).omit({
  id: true,
  createdAt: true,
});

export const insertSettingsSchema = createInsertSchema(systemSettings).omit({
  id: true,
});

// Types
export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;

export type EdgeHeartbeat = typeof edgeHeartbeats.$inferSelect;
export type InsertHeartbeat = z.infer<typeof insertHeartbeatSchema>;

export type PdmScoreLog = typeof pdmScoreLogs.$inferSelect;
export type InsertPdmScore = z.infer<typeof insertPdmScoreSchema>;

export type WorkOrder = typeof workOrders.$inferSelect;
export type InsertWorkOrder = z.infer<typeof insertWorkOrderSchema>;

export type EquipmentTelemetry = typeof equipmentTelemetry.$inferSelect;
export type InsertTelemetry = z.infer<typeof insertTelemetrySchema>;

export type AlertConfiguration = typeof alertConfigurations.$inferSelect;
export type InsertAlertConfig = z.infer<typeof insertAlertConfigSchema>;

export type AlertNotification = typeof alertNotifications.$inferSelect;
export type InsertAlertNotification = z.infer<typeof insertAlertNotificationSchema>;

export type SystemSettings = typeof systemSettings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

// API Response types
export type DeviceStatus = "Online" | "Warning" | "Critical" | "Offline";

export type DeviceWithStatus = Device & {
  status: DeviceStatus;
  lastHeartbeat?: EdgeHeartbeat;
};

export type EquipmentHealth = {
  id: string;
  vessel: string;
  healthIndex: number;
  predictedDueDays: number;
  status: "healthy" | "warning" | "critical";
};

export type DashboardMetrics = {
  activeDevices: number;
  fleetHealth: number;
  openWorkOrders: number;
  riskAlerts: number;
};

export type TelemetryDataPoint = {
  ts: Date;
  value: number;
  status: string;
};

export type TelemetryTrend = {
  equipmentId: string;
  sensorType: string;
  unit: string;
  currentValue: number;
  threshold?: number;
  status: string;
  data: TelemetryDataPoint[];
  trend: "increasing" | "decreasing" | "stable";
  changePercent: number;
};
