/**
 * SQLite-Compatible Vessel Operations Schema
 * 
 * This file contains SQLite versions of critical vessel operation tables.
 * Converts PostgreSQL-specific types to SQLite-compatible types.
 */

import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { index } from "drizzle-orm/sqlite-core";

// Vessels table (SQLite version)
export const vesselsSqlite = sqliteTable("vessels", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  name: text("name").notNull(),
  imo: text("imo"),
  flag: text("flag"),
  vesselType: text("vessel_type"),
  vesselClass: text("vessel_class"),
  condition: text("condition").default("good"),
  onlineStatus: text("online_status").default("unknown"),
  lastHeartbeat: integer("last_heartbeat", { mode: 'timestamp' }),
  dwt: integer("dwt"),
  yearBuilt: integer("year_built"),
  active: integer("active", { mode: 'boolean' }).default(true),
  notes: text("notes"),
  // Financial tracking (numeric → real)
  dayRateSgd: real("day_rate_sgd"),
  downtimeDays: real("downtime_days").default(0),
  downtimeResetAt: integer("downtime_reset_at", { mode: 'timestamp' }),
  operationDays: real("operation_days").default(0),
  operationResetAt: integer("operation_reset_at", { mode: 'timestamp' }),
  createdAt: integer("created_at", { mode: 'timestamp' }),
  updatedAt: integer("updated_at", { mode: 'timestamp' }),
}, (table) => ({
  orgIdx: index("idx_vessels_org").on(table.orgId),
}));

// Equipment table (SQLite version)
export const equipmentSqlite = sqliteTable("equipment", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  vesselId: text("vessel_id"),
  vesselName: text("vessel_name"),
  name: text("name").notNull(),
  type: text("type").notNull(),
  manufacturer: text("manufacturer"),
  model: text("model"),
  serialNumber: text("serial_number"),
  location: text("location"),
  isActive: integer("is_active", { mode: 'boolean' }).default(true),
  specifications: text("specifications"), // jsonb → text (store as JSON string)
  operatingParameters: text("operating_parameters"), // jsonb → text
  maintenanceSchedule: text("maintenance_schedule"), // jsonb → text
  emergencyLaborMultiplier: real("emergency_labor_multiplier"),
  emergencyPartsMultiplier: real("emergency_parts_multiplier"),
  emergencyDowntimeMultiplier: real("emergency_downtime_multiplier"),
  createdAt: integer("created_at", { mode: 'timestamp' }),
  updatedAt: integer("updated_at", { mode: 'timestamp' }),
  version: integer("version").default(1),
  lastModifiedBy: text("last_modified_by"),
  lastModifiedDevice: text("last_modified_device"),
}, (table) => ({
  orgIdx: index("idx_equipment_org").on(table.orgId),
  vesselIdx: index("idx_equipment_vessel").on(table.vesselId),
}));

// Devices table (SQLite version)
export const devicesSqlite = sqliteTable("devices", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  equipmentId: text("equipment_id"),
  label: text("label"),
  vessel: text("vessel"),
  buses: text("buses"),
  sensors: text("sensors"),
  config: text("config"),
  hmacKey: text("hmac_key"),
  deviceType: text("device_type").default("generic"),
  j1939Config: text("j1939_config"), // jsonb → text
  createdAt: integer("created_at", { mode: 'timestamp' }),
  updatedAt: integer("updated_at", { mode: 'timestamp' }),
}, (table) => ({
  orgIdx: index("idx_devices_org").on(table.orgId),
  equipmentIdx: index("idx_devices_equipment").on(table.equipmentId),
}));

// Equipment Telemetry table (SQLite version)
// Note: SQLite doesn't support composite primary keys the same way,
// so we'll use a simple id primary key with indexes for performance
export const equipmentTelemetrySqlite = sqliteTable("equipment_telemetry", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  ts: integer("ts", { mode: 'timestamp' }).notNull(),
  equipmentId: text("equipment_id").notNull(),
  sensorType: text("sensor_type").notNull(),
  value: real("value").notNull(),
  unit: text("unit").notNull(),
  threshold: real("threshold"),
  status: text("status").notNull().default("normal"),
}, (table) => ({
  orgIdx: index("idx_telemetry_org").on(table.orgId),
  equipmentTsIdx: index("idx_telemetry_equipment_ts").on(table.equipmentId, table.ts),
  sensorTsIdx: index("idx_telemetry_sensor_ts").on(table.sensorType, table.ts),
  statusIdx: index("idx_telemetry_status").on(table.status),
}));

// Downtime Events table (SQLite version)
export const downtimeEventsSqlite = sqliteTable("downtime_events", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  workOrderId: text("work_order_id"),
  equipmentId: text("equipment_id"),
  vesselId: text("vessel_id"),
  downtimeType: text("downtime_type").notNull(),
  startTime: integer("start_time", { mode: 'timestamp' }).notNull(),
  endTime: integer("end_time", { mode: 'timestamp' }),
  durationHours: real("duration_hours"),
  reason: text("reason"),
  impactLevel: text("impact_level").default("medium"),
  revenueImpact: real("revenue_impact"),
  opportunityCost: real("opportunity_cost"),
  rootCause: text("root_cause"),
  preventable: integer("preventable", { mode: 'boolean' }),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: 'timestamp' }),
  updatedAt: integer("updated_at", { mode: 'timestamp' }),
}, (table) => ({
  orgIdx: index("idx_downtime_org").on(table.orgId),
  workOrderIdx: index("idx_downtime_work_order").on(table.workOrderId),
  equipmentIdx: index("idx_downtime_equipment").on(table.equipmentId),
  vesselIdx: index("idx_downtime_vessel").on(table.vesselId),
  timeIdx: index("idx_downtime_time").on(table.startTime),
}));

// JSON helper functions (same as in schema-sqlite-sync.ts)
export const sqliteJsonHelpers = {
  stringify: (obj: any) => obj ? JSON.stringify(obj) : null,
  parse: <T = any>(str: string | null): T | null => {
    if (!str) return null;
    try {
      return JSON.parse(str) as T;
    } catch {
      return null;
    }
  },
};
