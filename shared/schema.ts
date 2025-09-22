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
