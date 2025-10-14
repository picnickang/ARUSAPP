import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, boolean, jsonb, unique, serial, index, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Organizations for multi-tenancy
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // URL-friendly identifier
  domain: text("domain"), // optional domain for SSO
  billingEmail: text("billing_email"),
  maxUsers: integer("max_users").default(50),
  maxEquipment: integer("max_equipment").default(1000),
  subscriptionTier: text("subscription_tier").notNull().default("basic"), // basic, pro, enterprise
  isActive: boolean("is_active").default(true),
  // Cost savings calculation multipliers for emergency scenarios
  emergencyLaborMultiplier: real("emergency_labor_multiplier").default(3.0), // Emergency labor is 3x more expensive
  emergencyPartsMultiplier: real("emergency_parts_multiplier").default(1.5), // Emergency parts are 1.5x more expensive
  emergencyDowntimeMultiplier: real("emergency_downtime_multiplier").default(3.0), // Emergency downtime is 3x longer
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// Sync journal for audit trails and change tracking
export const syncJournal = pgTable("sync_journal", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(), // vessel, crew, sensor, part, stock, etc.
  entityId: varchar("entity_id").notNull(),
  operation: text("operation").notNull(), // create, update, delete, reconcile
  payload: jsonb("payload"), // the data that was changed
  userId: varchar("user_id").references(() => users.id), // who made the change (if available)
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  entityIndex: index("idx_sync_journal_entity").on(table.entityType, table.entityId, table.createdAt),
}));

// Sync outbox for event publishing and real-time notifications
export const syncOutbox = pgTable("sync_outbox", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: text("event_type").notNull(), // part.updated, stock.updated, work_order.created, etc.
  payload: jsonb("payload"), // event data
  processed: boolean("processed").default(false),
  processingAttempts: integer("processing_attempts").default(0),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  processedAt: timestamp("processed_at", { mode: "date" }),
}, (table) => ({
  eventIndex: index("idx_sync_outbox_event").on(table.eventType, table.processed),
}));

// Users with RBAC scaffolding
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id), // foreign key to organizations
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("viewer"), // admin, manager, technician, viewer
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// Central equipment registry - normalized equipment catalog
export const equipment = pgTable("equipment", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  vesselId: varchar("vessel_id").references(() => vessels.id), // proper FK to vessels table
  vesselName: text("vessel_name"), // keep for backward compatibility during migration
  name: text("name").notNull(), // human-readable equipment name
  type: text("type").notNull(), // engine, pump, compressor, generator, etc.
  manufacturer: text("manufacturer"),
  model: text("model"),
  serialNumber: text("serial_number"),
  location: text("location"), // deck, engine room, bridge, etc.
  isActive: boolean("is_active").default(true),
  specifications: jsonb("specifications"), // technical specs as JSONB
  operatingParameters: jsonb("operating_parameters"), // normal operating ranges
  maintenanceSchedule: jsonb("maintenance_schedule"), // maintenance requirements
  // Equipment-specific cost multiplier overrides (null = use org defaults)
  emergencyLaborMultiplier: real("emergency_labor_multiplier"), // Override org-level multiplier
  emergencyPartsMultiplier: real("emergency_parts_multiplier"), // Override org-level multiplier
  emergencyDowntimeMultiplier: real("emergency_downtime_multiplier"), // Override org-level multiplier
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
  version: integer("version").default(1),
  lastModifiedBy: varchar("last_modified_by", { length: 255 }),
  lastModifiedDevice: varchar("last_modified_device", { length: 255 }),
});

export const devices = pgTable("devices", {
  id: varchar("id").primaryKey(),
  orgId: varchar("org_id").notNull().references(() => organizations.id), // foreign key to organizations
  equipmentId: varchar("equipment_id").references(() => equipment.id), // foreign key to equipment
  label: text("label"), // human-readable device label from Hub & Sync patch
  vessel: text("vessel"), // keep for backward compatibility, but equipmentId->vesselId is preferred
  buses: text("buses"), // temporary text, will be JSONB later
  sensors: text("sensors"), // temporary text, will be JSONB later
  config: text("config"), // temporary text, will be JSONB later
  hmacKey: text("hmac_key"),
  deviceType: text("device_type").default("generic"), // generic, j1939_ecm, modbus, etc.
  j1939Config: jsonb("j1939_config"), // J1939-specific configuration (CAN interface, PGN mappings)
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(), // added for Hub & Sync
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

export const edgeHeartbeats = pgTable("edge_heartbeats", {
  deviceId: varchar("device_id").primaryKey().references(() => devices.id), // foreign key to devices
  ts: timestamp("ts", { mode: "date" }).defaultNow(),
  cpuPct: real("cpu_pct"),
  memPct: real("mem_pct"),
  diskFreeGb: real("disk_free_gb"),
  bufferRows: integer("buffer_rows"),
  swVersion: text("sw_version"),
});

export const pdmScoreLogs = pgTable("pdm_score_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id), // add org scoping
  ts: timestamp("ts", { mode: "date" }).defaultNow(),
  equipmentId: varchar("equipment_id").notNull().references(() => equipment.id), // foreign key to equipment
  healthIdx: real("health_idx"),
  pFail30d: real("p_fail_30d"),
  predictedDueDate: timestamp("predicted_due_date", { mode: "date" }),
  contextJson: jsonb("context_json"), // converted to JSONB
});

export const workOrders = pgTable("work_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  woNumber: text("wo_number").unique(), // Human-readable work order number like WO-001 (nullable for existing records)
  orgId: varchar("org_id").notNull().references(() => organizations.id), // foreign key to organizations
  equipmentId: varchar("equipment_id").notNull().references(() => equipment.id), // foreign key to equipment
  vesselId: varchar("vessel_id").references(() => vessels.id), // denormalized vessel reference for faster queries
  status: text("status").notNull().default("open"),
  priority: integer("priority").notNull().default(3),
  maintenanceType: text("maintenance_type"), // preventive, corrective, predictive, emergency
  reason: text("reason"),
  description: text("description"),
  // Cost and time tracking fields
  estimatedHours: real("estimated_hours"), // estimated repair hours
  actualHours: real("actual_hours"), // actual hours spent
  estimatedCostPerHour: real("estimated_cost_per_hour"), // estimated hourly rate
  actualCostPerHour: real("actual_cost_per_hour"), // actual hourly rate
  estimatedDowntimeHours: real("estimated_downtime_hours"), // estimated equipment downtime
  actualDowntimeHours: real("actual_downtime_hours"), // actual equipment downtime
  totalPartsCost: real("total_parts_cost").default(0), // automatically calculated from parts
  totalLaborCost: real("total_labor_cost").default(0), // automatically calculated
  totalCost: real("total_cost").default(0), // total cost (parts + labor)
  roi: real("roi"), // return on investment calculation
  downtimeCostPerHour: real("downtime_cost_per_hour"), // cost of equipment being down
  // Vessel downtime tracking
  affectsVesselDowntime: boolean("affects_vessel_downtime").default(false), // When true, tracks vessel downtime
  vesselDowntimeStartedAt: timestamp("vessel_downtime_started_at", { mode: "date" }), // Timestamp when downtime tracking started
  // Crew and labor integration
  assignedCrewId: varchar("assigned_crew_id"), // Primary crew member assigned
  requiredSkills: text("required_skills").array(), // Skills needed for this work order
  laborHours: real("labor_hours"), // Total labor hours
  laborCost: real("labor_cost"), // Total labor cost
  // Port and drydock scheduling
  portCallId: varchar("port_call_id"), // Link to port call for maintenance window
  drydockWindowId: varchar("drydock_window_id"), // Link to drydock window
  maintenanceWindow: jsonb("maintenance_window"), // Optimal maintenance window {start, end, location}
  // Preventive maintenance template
  maintenanceTemplateId: varchar("maintenance_template_id"), // Link to maintenance template for PM checklists
  // Schedule linkage
  scheduleId: varchar("schedule_id"), // link to maintenance schedules
  plannedStartDate: timestamp("planned_start_date", { mode: "date" }),
  plannedEndDate: timestamp("planned_end_date", { mode: "date" }),
  actualStartDate: timestamp("actual_start_date", { mode: "date" }),
  actualEndDate: timestamp("actual_end_date", { mode: "date" }),
  // Conflict resolution: optimistic locking
  version: integer("version").default(1),
  lastModifiedBy: varchar("last_modified_by", { length: 255 }),
  lastModifiedDevice: varchar("last_modified_device", { length: 255 }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  // Index for searching work orders by equipment and status
  equipmentStatusIdx: sql`CREATE INDEX IF NOT EXISTS idx_work_orders_equipment_status ON work_orders (equipment_id, status)`,
  // Index for cost analysis
  costAnalysisIdx: sql`CREATE INDEX IF NOT EXISTS idx_work_orders_cost_analysis ON work_orders (total_cost, created_at)`,
  // Index for schedule linkage
  scheduleIdx: sql`CREATE INDEX IF NOT EXISTS idx_work_orders_schedule ON work_orders (schedule_id)`,
}));

// Work Order Completions - Analytics and tracking for completed work orders
export const workOrderCompletions = pgTable("work_order_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  workOrderId: varchar("work_order_id").notNull().references(() => workOrders.id, { onDelete: 'cascade' }),
  equipmentId: varchar("equipment_id").notNull().references(() => equipment.id),
  vesselId: varchar("vessel_id").references(() => vessels.id),
  // Completion details
  completedAt: timestamp("completed_at", { mode: "date" }).notNull().defaultNow(),
  completedBy: varchar("completed_by"), // User ID or crew member ID
  completedByName: text("completed_by_name"), // Cached name for reporting
  // Duration tracking
  actualDurationMinutes: integer("actual_duration_minutes"), // Actual time spent
  estimatedDurationMinutes: integer("estimated_duration_minutes"), // Snapshot of estimate
  plannedStartDate: timestamp("planned_start_date", { mode: "date" }), // Snapshot from work order
  plannedEndDate: timestamp("planned_end_date", { mode: "date" }), // Snapshot from work order
  actualStartDate: timestamp("actual_start_date", { mode: "date" }), // Snapshot from work order
  actualEndDate: timestamp("actual_end_date", { mode: "date" }), // Snapshot from work order
  // Cost tracking
  totalCost: real("total_cost").default(0), // Total cost snapshot
  totalPartsCost: real("total_parts_cost").default(0), // Parts cost snapshot
  totalLaborCost: real("total_labor_cost").default(0), // Labor cost snapshot
  // Downtime tracking
  estimatedDowntimeHours: real("estimated_downtime_hours"), // Snapshot from work order
  actualDowntimeHours: real("actual_downtime_hours"), // Snapshot from work order
  affectsVesselDowntime: boolean("affects_vessel_downtime").default(false),
  vesselDowntimeHours: real("vessel_downtime_hours"), // Calculated vessel downtime
  // Parts usage
  partsUsed: jsonb("parts_used"), // Array of {partId, partName, quantityUsed, unitCost}
  partsCount: integer("parts_count").default(0), // Number of different parts used
  // Compliance and quality
  completionStatus: text("completion_status").default("completed"), // completed, partial, deferred
  complianceFlags: text("compliance_flags").array(), // On-time, delayed, emergency, etc.
  qualityCheckPassed: boolean("quality_check_passed"),
  notes: text("notes"), // Completion notes
  // Predictive context
  predictiveContext: jsonb("predictive_context"), // ML predictions at time of completion
  maintenanceScheduleId: varchar("maintenance_schedule_id").references(() => maintenanceSchedules.id, { onDelete: 'set null' }), // Link to originating schedule
  maintenanceType: text("maintenance_type"), // preventive, corrective, predictive, emergency
  // Performance metrics
  onTimeCompletion: boolean("on_time_completion"), // Was it completed by planned end date?
  durationVariancePercent: real("duration_variance_percent"), // (actual - estimated) / estimated * 100
  costVariancePercent: real("cost_variance_percent"), // (actual - estimated) / estimated * 100
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  // Index for analytics queries
  orgCompletedAtIdx: sql`CREATE INDEX IF NOT EXISTS idx_work_order_completions_org ON work_order_completions (org_id, completed_at DESC)`,
  completedAtIdx: sql`CREATE INDEX IF NOT EXISTS idx_work_order_completions_completed_at ON work_order_completions (completed_at DESC)`,
  equipmentIdx: sql`CREATE INDEX IF NOT EXISTS idx_work_order_completions_equipment ON work_order_completions (equipment_id, completed_at DESC)`,
  vesselIdx: sql`CREATE INDEX IF NOT EXISTS idx_work_order_completions_vessel ON work_order_completions (vessel_id, completed_at DESC)`,
  scheduleIdx: sql`CREATE INDEX IF NOT EXISTS idx_work_order_completions_schedule ON work_order_completions (maintenance_schedule_id)`,
  workOrderIdx: sql`CREATE INDEX IF NOT EXISTS idx_work_order_completions_work_order ON work_order_completions (work_order_id)`,
}));

// Equipment telemetry data - TimescaleDB hypertable with composite primary key
export const equipmentTelemetry = pgTable("equipment_telemetry", {
  id: varchar("id").notNull().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id), // foreign key to organizations  
  ts: timestamp("ts", { mode: "date" }).notNull().defaultNow(), // TimescaleDB partition dimension - NOT NULL required
  equipmentId: varchar("equipment_id").notNull().references(() => equipment.id), // foreign key to equipment
  sensorType: text("sensor_type").notNull(), // temperature, vibration, pressure, flow_rate, etc.
  value: real("value").notNull(),
  unit: text("unit").notNull(), // celsius, hz, psi, gpm, etc.
  threshold: real("threshold"), // alert threshold value
  status: text("status").notNull().default("normal"), // normal, warning, critical
}, (table) => ({
  // Composite primary key required for TimescaleDB hypertables (includes partition column)
  pk: sql`PRIMARY KEY (org_id, ts, id)`,
  // Optimized indexes for time-series queries
  equipmentTsIdx: sql`CREATE INDEX IF NOT EXISTS idx_equipment_telemetry_equipment_ts ON equipment_telemetry (equipment_id, ts DESC)`,
  sensorTsIdx: sql`CREATE INDEX IF NOT EXISTS idx_equipment_telemetry_sensor_ts ON equipment_telemetry (sensor_type, ts DESC)`,
  statusTsIdx: sql`CREATE INDEX IF NOT EXISTS idx_equipment_telemetry_status_ts ON equipment_telemetry (status, ts DESC)`,
  idIdx: sql`CREATE INDEX IF NOT EXISTS idx_equipment_telemetry_id ON equipment_telemetry (id)`, // Non-unique index for lookups
}));

export const alertConfigurations = pgTable("alert_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id), // foreign key to organizations
  equipmentId: varchar("equipment_id").notNull().references(() => equipment.id), // foreign key to equipment
  sensorType: text("sensor_type").notNull(), // temperature, pressure, voltage, etc.
  warningThreshold: real("warning_threshold"),
  criticalThreshold: real("critical_threshold"),
  enabled: boolean("enabled").default(true),
  notifyEmail: boolean("notify_email").default(false),
  notifyInApp: boolean("notify_in_app").default(true),
  // Conflict resolution: optimistic locking
  version: integer("version").default(1),
  lastModifiedBy: varchar("last_modified_by", { length: 255 }),
  lastModifiedDevice: varchar("last_modified_device", { length: 255 }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  // Unique constraint: one config per equipment+sensor combination
  uniqueEquipmentSensor: sql`ALTER TABLE ${table} ADD CONSTRAINT unique_equipment_sensor UNIQUE (${table.equipmentId}, ${table.sensorType})`,
}));

export const alertNotifications = pgTable("alert_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id), // foreign key to organizations
  equipmentId: varchar("equipment_id").notNull().references(() => equipment.id), // foreign key to equipment
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
  openaiApiKey: text("openai_api_key"),
  aiInsightsThrottleMinutes: integer("ai_insights_throttle_minutes").default(2), // Minutes between AI insights per equipment/sensor
  timestampToleranceMinutes: integer("timestamp_tolerance_minutes").default(5), // Max minutes in future for timestamp validation
});

export const metricsHistory = pgTable("metrics_history", {
  id: serial("id").primaryKey(),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  recordedAt: timestamp("recorded_at", { mode: "date" }).notNull().defaultNow(),
  activeDevices: integer("active_devices").notNull().default(0),
  fleetHealth: real("fleet_health").notNull().default(0),
  openWorkOrders: integer("open_work_orders").notNull().default(0),
  riskAlerts: integer("risk_alerts").notNull().default(0),
  totalEquipment: integer("total_equipment").notNull().default(0),
  healthyEquipment: integer("healthy_equipment").notNull().default(0),
  warningEquipment: integer("warning_equipment").notNull().default(0),
  criticalEquipment: integer("critical_equipment").notNull().default(0),
}, (table) => ({
  orgTimeIdx: index("idx_metrics_history_org_time").on(table.orgId, table.recordedAt),
}));

export const maintenanceSchedules = pgTable("maintenance_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id), // foreign key to organizations
  equipmentId: varchar("equipment_id").notNull().references(() => equipment.id), // foreign key to equipment
  vesselId: varchar("vessel_id").references(() => vessels.id), // denormalized vessel reference for faster queries
  scheduledDate: timestamp("scheduled_date", { mode: "date" }).notNull(),
  maintenanceType: text("maintenance_type").notNull(), // preventive, corrective, predictive
  priority: integer("priority").notNull().default(2), // 1=high, 2=medium, 3=low
  estimatedDuration: integer("estimated_duration"), // minutes
  description: text("description"),
  status: text("status").notNull().default("scheduled"), // scheduled, in_progress, completed, cancelled
  assignedTo: text("assigned_to"), // technician or team
  pdmScore: real("pdm_score"), // PdM score that triggered this schedule
  autoGenerated: boolean("auto_generated").default(false), // true if automatically scheduled by algorithm
  workOrderId: text("work_order_id"), // linked work order if created
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// CMMS-lite: Work Order Checklists for standardized procedures
export const workOrderChecklists = pgTable("work_order_checklists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  workOrderId: varchar("work_order_id").notNull().references(() => workOrders.id),
  templateName: text("template_name").notNull(), // "Engine Inspection", "Pump Maintenance", etc.
  checklistItems: text("checklist_items").notNull(), // JSON array of checklist items
  completedItems: text("completed_items").notNull().default("[]"), // JSON array of completed item IDs
  completionRate: real("completion_rate").default(0), // percentage completed
  completedBy: text("completed_by"), // technician who completed
  completedAt: timestamp("completed_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

// CMMS-lite: Work Order Worklogs for time tracking and progress notes
export const workOrderWorklogs = pgTable("work_order_worklogs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  workOrderId: varchar("work_order_id").notNull().references(() => workOrders.id),
  technicianName: text("technician_name").notNull(),
  startTime: timestamp("start_time", { mode: "date" }).notNull(),
  endTime: timestamp("end_time", { mode: "date" }),
  durationMinutes: integer("duration_minutes"), // calculated field
  description: text("description").notNull(), // work performed
  laborType: text("labor_type").notNull().default("standard"), // standard, overtime, emergency
  laborCostPerHour: real("labor_cost_per_hour").default(75.0), // hourly rate
  totalLaborCost: real("total_labor_cost"), // calculated field
  status: text("status").notNull().default("in_progress"), // in_progress, completed, paused
  notes: text("notes"), // additional notes or observations
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// CMMS-lite: Parts Inventory Management
export const partsInventory = pgTable("parts_inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  partNumber: text("part_number").notNull(), // OEM part number
  partName: text("part_name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // filters, belts, fluids, electrical, etc.
  manufacturer: text("manufacturer"),
  unitCost: real("unit_cost").notNull(),
  quantityOnHand: integer("quantity_on_hand").notNull().default(0),
  quantityReserved: integer("quantity_reserved").notNull().default(0), // parts allocated to work orders
  minStockLevel: integer("min_stock_level").default(1), // reorder point
  maxStockLevel: integer("max_stock_level").default(100),
  location: text("location"), // warehouse location
  supplierName: text("supplier_name"),
  supplierPartNumber: text("supplier_part_number"),
  leadTimeDays: integer("lead_time_days").default(7),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  // Ensure reserved quantity never exceeds on-hand quantity
  validReservedQuantity: sql`CHECK (quantity_reserved <= quantity_on_hand)`,
  // Ensure quantities are non-negative
  nonNegativeOnHand: sql`CHECK (quantity_on_hand >= 0)`,
  nonNegativeReserved: sql`CHECK (quantity_reserved >= 0)`,
}));

// CMMS-lite: Parts Usage Tracking for Work Orders
export const workOrderParts = pgTable("work_order_parts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  workOrderId: varchar("work_order_id").notNull().references(() => workOrders.id),
  partId: varchar("part_id").notNull().references(() => partsInventory.id),
  quantityUsed: integer("quantity_used").notNull(),
  unitCost: real("unit_cost").notNull(), // cost at time of use
  totalCost: real("total_cost").notNull(), // quantityUsed * unitCost
  usedBy: text("used_by").notNull(), // technician who used the part
  usedAt: timestamp("used_at", { mode: "date" }).defaultNow(),
  notes: text("notes"), // installation notes or observations
  // Supply chain tracking
  supplierId: varchar("supplier_id").references(() => suppliers.id),
  estimatedDeliveryDate: timestamp("estimated_delivery_date", { mode: "date" }),
  actualDeliveryDate: timestamp("actual_delivery_date", { mode: "date" }),
  actualCost: real("actual_cost"), // Final cost (may differ from estimate)
  deliveryStatus: text("delivery_status").default("pending"), // pending, in_transit, delivered, delayed
  inventoryMovementId: varchar("inventory_movement_id"), // Link to inventory movements
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

// CMMS-lite: Inventory Movements Ledger for tracking all inventory transactions
export const inventoryMovements = pgTable("inventory_movements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  partId: varchar("part_id").notNull().references(() => partsInventory.id),
  workOrderId: varchar("work_order_id").references(() => workOrders.id), // nullable - not all movements are work order related
  movementType: text("movement_type").notNull(), // reserve, release, consume, restock, adjustment
  quantity: integer("quantity").notNull(), // positive or negative
  quantityBefore: integer("quantity_before").notNull(), // quantity on hand before transaction
  quantityAfter: integer("quantity_after").notNull(), // quantity on hand after transaction
  reservedBefore: integer("reserved_before").notNull().default(0), // reserved quantity before
  reservedAfter: integer("reserved_after").notNull().default(0), // reserved quantity after
  performedBy: text("performed_by").notNull(), // user/technician who performed the movement
  notes: text("notes"), // reason for movement
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

// Optimizer v1: Algorithm configurations and settings
export const optimizerConfigurations = pgTable("optimizer_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull(), // scoped to organization
  name: text("name").notNull(), // "fleet_optimization", "cost_minimization", etc.
  algorithmType: text("algorithm_type").notNull().default("greedy"), // greedy, genetic, simulated_annealing
  enabled: boolean("enabled").default(true),
  config: text("config").notNull(), // JSON configuration parameters
  // Optimization parameters
  maxSchedulingHorizon: integer("max_scheduling_horizon").default(90), // days
  costWeightFactor: real("cost_weight_factor").default(0.4), // 0-1 weight for cost optimization
  urgencyWeightFactor: real("urgency_weight_factor").default(0.6), // 0-1 weight for urgency
  resourceConstraintStrict: boolean("resource_constraint_strict").default(true),
  conflictResolutionStrategy: text("conflict_resolution_strategy").default("priority_based"), // priority_based, cost_based, earliest_first
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// Optimizer v1: Resource constraints (technician availability, parts, tools)
export const resourceConstraints = pgTable("resource_constraints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull(), // scoped to organization
  resourceType: text("resource_type").notNull(), // "technician", "part", "tool", "facility"
  resourceId: text("resource_id").notNull(), // ID of the resource (technician ID, part ID, etc.)
  resourceName: text("resource_name").notNull(), // human-readable name
  availabilityWindow: text("availability_window").notNull(), // JSON: {start: Date, end: Date, capacity: number}
  maxConcurrentTasks: integer("max_concurrent_tasks").default(1), // how many tasks can use this resource simultaneously
  costPerHour: real("cost_per_hour"), // resource cost (for technicians)
  costPerUnit: real("cost_per_unit"), // resource cost (for parts/tools)
  skills: text("skills"), // JSON array of skills for technicians
  restrictions: text("restrictions"), // JSON: equipment types, maintenance types this resource can handle
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// Optimizer v1: Optimization run results
export const optimizationResults = pgTable("optimization_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull(), // scoped to organization
  configurationId: text("configuration_id").notNull(), // references optimizer_configurations.id
  runStatus: text("run_status").notNull().default("pending"), // pending, running, completed, failed
  startTime: timestamp("start_time", { mode: "date" }).defaultNow(),
  endTime: timestamp("end_time", { mode: "date" }),
  executionTimeMs: integer("execution_time_ms"), // execution time in milliseconds
  // Input parameters
  equipmentScope: text("equipment_scope"), // JSON array of equipment IDs to optimize
  timeHorizon: integer("time_horizon"), // optimization window in days
  // Results
  totalSchedules: integer("total_schedules").default(0), // number of schedules generated
  totalCostEstimate: real("total_cost_estimate"), // estimated total cost of optimized schedules
  costSavings: real("cost_savings"), // estimated savings vs current approach
  resourceUtilization: text("resource_utilization"), // JSON: resource usage statistics
  conflictsResolved: integer("conflicts_resolved").default(0),
  optimizationScore: real("optimization_score"), // 0-100 score of optimization quality
  // Metadata
  algorithmMetrics: text("algorithm_metrics"), // JSON: iteration count, convergence info, etc.
  recommendations: text("recommendations"), // JSON array of schedule recommendations
  appliedToProduction: boolean("applied_to_production").default(false),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// Optimizer v1: Schedule optimization recommendations
export const scheduleOptimizations = pgTable("schedule_optimizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull(), // scoped to organization
  optimizationResultId: text("optimization_result_id").notNull(), // references optimization_results.id
  equipmentId: text("equipment_id").notNull(),
  currentScheduleId: text("current_schedule_id"), // existing schedule ID if any
  recommendedScheduleDate: timestamp("recommended_schedule_date", { mode: "date" }).notNull(),
  recommendedMaintenanceType: text("recommended_maintenance_type").notNull(),
  recommendedPriority: integer("recommended_priority").notNull(),
  estimatedDuration: integer("estimated_duration"), // minutes
  estimatedCost: real("estimated_cost"),
  assignedTechnicianId: text("assigned_technician_id"), // optimized technician assignment
  requiredParts: text("required_parts"), // JSON array of required parts
  optimizationReason: text("optimization_reason"), // explanation of why this schedule is optimal
  conflictsWith: text("conflicts_with"), // JSON array of conflicting schedule IDs
  priority: real("priority").notNull().default(50), // optimization priority score (0-100)
  status: text("status").notNull().default("pending"), // pending, approved, rejected, applied
  appliedAt: timestamp("applied_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

export const maintenanceRecords = pgTable("maintenance_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull(), // scoped to organization
  scheduleId: text("schedule_id").notNull(), // references maintenance_schedules.id
  equipmentId: text("equipment_id").notNull(),
  maintenanceType: text("maintenance_type").notNull(), // preventive, corrective, predictive
  actualStartTime: timestamp("actual_start_time", { mode: "date" }),
  actualEndTime: timestamp("actual_end_time", { mode: "date" }),
  actualDuration: integer("actual_duration"), // minutes
  technician: text("technician"),
  notes: text("notes"),
  partsUsed: text("parts_used"), // JSON array of parts
  laborHours: real("labor_hours"),
  downtimeMinutes: integer("downtime_minutes"),
  completionStatus: text("completion_status").notNull().default("completed"), // completed, partial, failed
  followUpRequired: boolean("follow_up_required").default(false),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const maintenanceCosts = pgTable("maintenance_costs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recordId: text("record_id"), // references maintenance_records.id (optional)
  scheduleId: text("schedule_id"), // references maintenance_schedules.id
  equipmentId: text("equipment_id").notNull(),
  workOrderId: varchar("work_order_id").references(() => workOrders.id),
  costType: text("cost_type").notNull(), // labor, parts, equipment, downtime
  amount: real("amount").notNull(), // cost amount
  currency: text("currency").notNull().default("USD"),
  description: text("description"),
  vendor: text("vendor"), // for parts/equipment costs
  category: text("category"), // routine, emergency, upgrade, repair
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const equipmentLifecycle = pgTable("equipment_lifecycle", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  equipmentId: text("equipment_id").notNull().unique(),
  manufacturer: text("manufacturer"),
  model: text("model"),
  serialNumber: text("serial_number"),
  installationDate: timestamp("installation_date", { mode: "date" }),
  warrantyExpiry: timestamp("warranty_expiry", { mode: "date" }),
  expectedLifespan: integer("expected_lifespan"), // months
  replacementCost: real("replacement_cost"),
  operatingHours: integer("operating_hours").default(0),
  maintenanceCount: integer("maintenance_count").default(0),
  lastMajorOverhaul: timestamp("last_major_overhaul", { mode: "date" }),
  nextRecommendedReplacement: timestamp("next_recommended_replacement", { mode: "date" }),
  condition: text("condition").notNull().default("good"), // excellent, good, fair, poor, critical
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

export const performanceMetrics = pgTable("performance_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  equipmentId: text("equipment_id").notNull(),
  metricDate: timestamp("metric_date", { mode: "date" }).notNull(),
  efficiency: real("efficiency"), // percentage 0-100
  reliability: real("reliability"), // percentage 0-100
  availability: real("availability"), // percentage 0-100
  meanTimeBetweenFailures: real("mtbf_hours"), // hours
  meanTimeToRepair: real("mttr_hours"), // hours
  totalDowntime: integer("total_downtime_minutes"), // minutes
  plannedDowntime: integer("planned_downtime_minutes"), // minutes
  unplannedDowntime: integer("unplanned_downtime_minutes"), // minutes
  operatingHours: real("operating_hours"),
  energyConsumption: real("energy_consumption"), // kWh
  performanceScore: real("performance_score"), // calculated composite score 0-100
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const alertSuppressions = pgTable("alert_suppressions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  equipmentId: text("equipment_id").notNull(),
  sensorType: text("sensor_type").notNull(),
  alertType: text("alert_type"), // warning, critical, or null for all
  suppressedBy: text("suppressed_by").notNull(),
  reason: text("reason"),
  suppressUntil: timestamp("suppress_until", { mode: "date" }).notNull(),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const alertComments = pgTable("alert_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  alertId: text("alert_id").notNull(),
  comment: text("comment").notNull(),
  commentedBy: text("commented_by").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

// Insert schemas
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  subscriptionTier: z.enum(['basic', 'pro', 'enterprise']).default('basic'),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/), // URL-friendly
  name: z.string().min(2).max(100),
  maxUsers: z.number().min(1).max(10000).default(50),
  maxEquipment: z.number().min(1).max(100000).default(1000),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
}).extend({
  role: z.enum(['admin', 'manager', 'technician', 'viewer']).default('viewer'),
  email: z.string().email(),
  name: z.string().min(2).max(100),
});

export const insertEquipmentSchema = createInsertSchema(equipment).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  vesselId: z.string().uuid().optional(), // proper FK to vessels table
  vesselName: z.string().optional(), // kept for backward compatibility
});

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
  woNumber: true, // Auto-generated on backend
  createdAt: true,
  updatedAt: true,
});

// Update schema with date coercion for HTTP JSON payloads (Date objects serialize to ISO strings)
export const updateWorkOrderSchema = insertWorkOrderSchema
  .partial()
  .extend({
    actualStartDate: z.coerce.date().optional(),
    actualEndDate: z.coerce.date().optional(),
  });

// Work Order Completions schemas
export const insertWorkOrderCompletionSchema = createInsertSchema(workOrderCompletions).omit({
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

export const insertMaintenanceScheduleSchema = createInsertSchema(maintenanceSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  maintenanceType: z.enum(['preventive', 'corrective', 'predictive']),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).default('scheduled'),
  priority: z.number().min(1).max(3).default(2),
  pdmScore: z.number().min(0).max(100).optional(),
  scheduledDate: z.string().or(z.date()).transform((val) => {
    // Accept both ISO strings and Date objects, convert to Date
    return typeof val === 'string' ? new Date(val) : val;
  }),
});

export const insertMaintenanceRecordSchema = createInsertSchema(maintenanceRecords).omit({
  id: true,
  createdAt: true,
}).extend({
  maintenanceType: z.enum(['preventive', 'corrective', 'predictive']),
  completionStatus: z.enum(['completed', 'partial', 'failed']).default('completed'),
  laborHours: z.number().min(0).optional(),
  downtimeMinutes: z.number().min(0).optional(),
});

export const insertMaintenanceCostSchema = createInsertSchema(maintenanceCosts).omit({
  id: true,
  createdAt: true,
}).extend({
  recordId: z.string().optional(), // Make recordId optional since it's not always provided from frontend
  costType: z.enum(['labor', 'parts', 'equipment', 'downtime']),
  amount: z.number().min(0),
  currency: z.string().length(3).default('USD'),
  category: z.enum(['routine', 'emergency', 'upgrade', 'repair']).optional(),
});

export const insertEquipmentLifecycleSchema = createInsertSchema(equipmentLifecycle).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  condition: z.enum(['excellent', 'good', 'fair', 'poor', 'critical']).default('good'),
  expectedLifespan: z.number().min(0).optional(),
  operatingHours: z.number().min(0).default(0),
  maintenanceCount: z.number().min(0).default(0),
});

export const insertPerformanceMetricSchema = createInsertSchema(performanceMetrics).omit({
  id: true,
  createdAt: true,
}).extend({
  efficiency: z.number().min(0).max(100).optional(),
  reliability: z.number().min(0).max(100).optional(),
  availability: z.number().min(0).max(100).optional(),
  performanceScore: z.number().min(0).max(100).optional(),
  meanTimeBetweenFailures: z.number().min(0).optional(),
  meanTimeToRepair: z.number().min(0).optional(),
});

export const insertAlertSuppressionSchema = createInsertSchema(alertSuppressions).omit({
  id: true,
  createdAt: true,
}).extend({
  alertType: z.enum(['warning', 'critical']).optional(),
  suppressUntil: z.coerce.date(),
});

export const insertAlertCommentSchema = createInsertSchema(alertComments).omit({
  id: true,
  createdAt: true,
});

// Compliance audit trail table for regulatory tracking
export const complianceAuditLog = pgTable("compliance_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  action: text("action").notNull(), // maintenance_completed, alert_acknowledged, schedule_created, etc.
  entityType: text("entity_type").notNull(), // equipment, work_order, alert, schedule
  entityId: text("entity_id").notNull(),
  performedBy: text("performed_by").notNull(), // user/technician who performed action
  timestamp: timestamp("timestamp", { mode: "date" }).defaultNow(),
  details: text("details"), // JSON object with action details
  complianceStandard: text("compliance_standard"), // ISM, SOLAS, MLC, etc.
  regulatoryReference: text("regulatory_reference"), // specific regulation reference
});

// Raw telemetry ingestion table for manual CSV/JSON imports
export const rawTelemetry = pgTable("raw_telemetry", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vessel: text("vessel").notNull(),
  ts: timestamp("ts", { mode: "date" }).notNull(),
  src: text("src").notNull(), // source/device identifier  
  sig: text("sig").notNull(), // signal/metric name
  value: real("value"),
  unit: text("unit"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

// Transport settings for telemetry ingestion configuration
export const transportSettings = pgTable("transport_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  enableHttpIngest: boolean("enable_http_ingest").default(true),
  enableMqttIngest: boolean("enable_mqtt_ingest").default(false),
  mqttHost: text("mqtt_host"),
  mqttPort: integer("mqtt_port").default(8883),
  mqttUser: text("mqtt_user"),
  mqttPass: text("mqtt_pass"),
  mqttTopic: text("mqtt_topic").default("fleet/+/telemetry"),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// Edge Diagnostics: Diagnostic event log for auto-fix tracking
export const edgeDiagnosticLogs = pgTable("edge_diagnostic_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  deviceId: varchar("device_id").references(() => devices.id),
  equipmentId: varchar("equipment_id").references(() => equipment.id),
  eventType: text("event_type").notNull(), // mqtt_failover, credential_refresh, port_restart, baud_detect, pgn_conflict, hot_plug, clock_skew, config_reconcile, calibration_fetch
  severity: text("severity").notNull().default("info"), // info, warning, error, critical
  status: text("status").notNull().default("pending"), // pending, in_progress, success, failed
  message: text("message").notNull(),
  details: jsonb("details"), // Detailed diagnostic data
  autoFixApplied: boolean("auto_fix_applied").default(false),
  autoFixAction: text("auto_fix_action"), // restart_port, switch_to_http, refresh_credentials, remap_pgn, sync_clock, etc.
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  resolvedAt: timestamp("resolved_at", { mode: "date" }),
}, (table) => ({
  deviceIdx: index("idx_edge_diag_device").on(table.deviceId, table.createdAt),
  eventTypeIdx: index("idx_edge_diag_event_type").on(table.eventType),
  statusIdx: index("idx_edge_diag_status").on(table.status),
}));

// Edge Diagnostics: Transport failover tracking (MQTT→HTTP fallback)
export const transportFailovers = pgTable("transport_failovers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  deviceId: varchar("device_id").notNull().references(() => devices.id),
  fromTransport: text("from_transport").notNull(), // mqtt, http, serial, can
  toTransport: text("to_transport").notNull(),
  reason: text("reason").notNull(), // connection_timeout, auth_failed, mqtt_down, etc.
  failedAt: timestamp("failed_at", { mode: "date" }).defaultNow(),
  recoveredAt: timestamp("recovered_at", { mode: "date" }),
  readingsPending: integer("readings_pending").default(0), // Number of buffered readings waiting to flush
  readingsFlushed: integer("readings_flushed").default(0), // Successfully sent after failover
  isActive: boolean("is_active").default(true), // Still in failover mode?
}, (table) => ({
  deviceIdx: index("idx_failover_device").on(table.deviceId, table.failedAt),
  activeIdx: index("idx_failover_active").on(table.isActive),
}));

// Edge Diagnostics: Serial/CAN port state tracking
export const serialPortStates = pgTable("serial_port_states", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  deviceId: varchar("device_id").notNull().references(() => devices.id),
  portPath: text("port_path").notNull(), // /dev/ttyUSB0, /dev/ttyS1, can0, etc.
  portType: text("port_type").notNull(), // serial, can
  protocol: text("protocol"), // j1939, j1708, modbus, nmea0183, etc.
  baudRate: integer("baud_rate"),
  parity: text("parity"), // none, even, odd
  dataBits: integer("data_bits").default(8),
  stopBits: integer("stop_bits").default(1),
  status: text("status").notNull().default("unknown"), // online, offline, error, no_traffic, wrong_config
  lastFrameAt: timestamp("last_frame_at", { mode: "date" }),
  frameCount: integer("frame_count").default(0),
  errorCount: integer("error_count").default(0),
  autoDetectedBaud: boolean("auto_detected_baud").default(false),
  autoDetectedProtocol: boolean("auto_detected_protocol").default(false),
  restartCount: integer("restart_count").default(0),
  lastRestartAt: timestamp("last_restart_at", { mode: "date" }),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  devicePortIdx: index("idx_serial_port_device").on(table.deviceId, table.portPath),
  statusIdx: index("idx_serial_port_status").on(table.status),
}));

// Edge Diagnostics: Calibration coefficient cache
export const calibrationCache = pgTable("calibration_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  equipmentType: text("equipment_type").notNull(), // engine, pump, compressor, etc.
  manufacturer: text("manufacturer").notNull(),
  model: text("model").notNull(),
  sensorType: text("sensor_type").notNull(), // temperature, pressure, vibration, etc.
  calibrationSource: text("calibration_source").notNull(), // manufacturer_api, manual_entry, auto_fetch, industry_standard
  coefficients: jsonb("coefficients").notNull(), // {gain, offset, polynomial, lookup_table, etc.}
  validFrom: timestamp("valid_from", { mode: "date" }),
  validUntil: timestamp("valid_until", { mode: "date" }),
  fetchedAt: timestamp("fetched_at", { mode: "date" }).defaultNow(),
  appliedToConfigs: integer("applied_to_configs").default(0), // How many sensor configs use this
  notes: text("notes"),
}, (table) => ({
  equipmentIdx: index("idx_calibration_equipment").on(table.equipmentType, table.manufacturer, table.model),
  sensorIdx: index("idx_calibration_sensor").on(table.sensorType),
}));

// Zod schemas for raw telemetry
export const insertRawTelemetrySchema = createInsertSchema(rawTelemetry).omit({
  id: true,
  createdAt: true,
});

// Zod schemas for transport settings
export const insertTransportSettingsSchema = createInsertSchema(transportSettings).omit({
  id: true,
  updatedAt: true,
});

// Zod schemas for edge diagnostics
export const insertEdgeDiagnosticLogSchema = createInsertSchema(edgeDiagnosticLogs).omit({
  id: true,
  createdAt: true,
}).extend({
  eventType: z.enum(['mqtt_failover', 'credential_refresh', 'port_restart', 'baud_detect', 'pgn_conflict', 'hot_plug', 'clock_skew', 'config_reconcile', 'calibration_fetch']),
  severity: z.enum(['info', 'warning', 'error', 'critical']).default('info'),
  status: z.enum(['pending', 'in_progress', 'success', 'failed']).default('pending'),
});

export const insertTransportFailoverSchema = createInsertSchema(transportFailovers).omit({
  id: true,
  failedAt: true,
}).extend({
  fromTransport: z.enum(['mqtt', 'http', 'serial', 'can']),
  toTransport: z.enum(['mqtt', 'http', 'serial', 'can']),
});

export const insertSerialPortStateSchema = createInsertSchema(serialPortStates).omit({
  id: true,
  updatedAt: true,
}).extend({
  portType: z.enum(['serial', 'can']),
  protocol: z.enum(['j1939', 'j1708', 'modbus', 'nmea0183', 'nmea2000']).optional(),
  parity: z.enum(['none', 'even', 'odd']).optional(),
  status: z.enum(['online', 'offline', 'error', 'no_traffic', 'wrong_config']).default('unknown'),
});

export const insertCalibrationCacheSchema = createInsertSchema(calibrationCache).omit({
  id: true,
  fetchedAt: true,
}).extend({
  calibrationSource: z.enum(['manufacturer_api', 'manual_entry', 'auto_fetch', 'industry_standard']),
  coefficients: z.record(z.any()), // Flexible JSONB schema
});

// Zod schemas for compliance audit log
export const insertComplianceAuditLogSchema = createInsertSchema(complianceAuditLog).omit({
  id: true,
  timestamp: true,
});

// CMMS-lite Zod schemas
export const insertWorkOrderChecklistSchema = createInsertSchema(workOrderChecklists).omit({
  id: true,
  createdAt: true,
});

export const insertWorkOrderWorklogSchema = createInsertSchema(workOrderWorklogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPartsInventorySchema = createInsertSchema(partsInventory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkOrderPartsSchema = createInsertSchema(workOrderParts).omit({
  id: true,
  createdAt: true,
});

// Optimizer v1 Schemas
export const insertOptimizerConfigurationSchema = createInsertSchema(optimizerConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  algorithmType: z.enum(['greedy', 'genetic', 'simulated_annealing']).default('greedy'),
  conflictResolutionStrategy: z.enum(['priority_based', 'cost_based', 'earliest_first']).default('priority_based'),
});

export const insertResourceConstraintSchema = createInsertSchema(resourceConstraints).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  resourceType: z.enum(['technician', 'part', 'tool', 'facility']),
});

export const insertOptimizationResultSchema = createInsertSchema(optimizationResults).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  runStatus: z.enum(['pending', 'running', 'completed', 'failed']).default('pending'),
});

export const insertScheduleOptimizationSchema = createInsertSchema(scheduleOptimizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(['pending', 'approved', 'rejected', 'applied']).default('pending'),
  recommendedMaintenanceType: z.enum(['predictive', 'preventive', 'corrective']),
});

// Types
export type Equipment = typeof equipment.$inferSelect;
export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;

export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;

export type EdgeHeartbeat = typeof edgeHeartbeats.$inferSelect;
export type InsertHeartbeat = z.infer<typeof insertHeartbeatSchema>;

export type PdmScoreLog = typeof pdmScoreLogs.$inferSelect;
export type InsertPdmScore = z.infer<typeof insertPdmScoreSchema>;

export type WorkOrder = typeof workOrders.$inferSelect;
export type InsertWorkOrder = z.infer<typeof insertWorkOrderSchema>;

export type WorkOrderCompletion = typeof workOrderCompletions.$inferSelect;
export type InsertWorkOrderCompletion = z.infer<typeof insertWorkOrderCompletionSchema>;

export type EquipmentTelemetry = typeof equipmentTelemetry.$inferSelect;
export type InsertTelemetry = z.infer<typeof insertTelemetrySchema>;

export type AlertConfiguration = typeof alertConfigurations.$inferSelect;
export type InsertAlertConfig = z.infer<typeof insertAlertConfigSchema>;

export type AlertNotification = typeof alertNotifications.$inferSelect;
export type InsertAlertNotification = z.infer<typeof insertAlertNotificationSchema>;

export type SystemSettings = typeof systemSettings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

export type MaintenanceSchedule = typeof maintenanceSchedules.$inferSelect;
export type InsertMaintenanceSchedule = z.infer<typeof insertMaintenanceScheduleSchema>;

export type MaintenanceRecord = typeof maintenanceRecords.$inferSelect;
export type InsertMaintenanceRecord = z.infer<typeof insertMaintenanceRecordSchema>;

export type MaintenanceCost = typeof maintenanceCosts.$inferSelect;
export type InsertMaintenanceCost = z.infer<typeof insertMaintenanceCostSchema>;

export type EquipmentLifecycle = typeof equipmentLifecycle.$inferSelect;
export type InsertEquipmentLifecycle = z.infer<typeof insertEquipmentLifecycleSchema>;

export type PerformanceMetric = typeof performanceMetrics.$inferSelect;
export type InsertPerformanceMetric = z.infer<typeof insertPerformanceMetricSchema>;

export type RawTelemetry = typeof rawTelemetry.$inferSelect;
export type InsertRawTelemetry = z.infer<typeof insertRawTelemetrySchema>;

export type TransportSettings = typeof transportSettings.$inferSelect;
export type InsertTransportSettings = z.infer<typeof insertTransportSettingsSchema>;

export type EdgeDiagnosticLog = typeof edgeDiagnosticLogs.$inferSelect;
export type InsertEdgeDiagnosticLog = z.infer<typeof insertEdgeDiagnosticLogSchema>;

export type TransportFailover = typeof transportFailovers.$inferSelect;
export type InsertTransportFailover = z.infer<typeof insertTransportFailoverSchema>;

export type SerialPortState = typeof serialPortStates.$inferSelect;
export type InsertSerialPortState = z.infer<typeof insertSerialPortStateSchema>;

export type CalibrationCache = typeof calibrationCache.$inferSelect;
export type InsertCalibrationCache = z.infer<typeof insertCalibrationCacheSchema>;

export type AlertSuppression = typeof alertSuppressions.$inferSelect;
export type InsertAlertSuppression = z.infer<typeof insertAlertSuppressionSchema>;

export type AlertComment = typeof alertComments.$inferSelect;
export type InsertAlertComment = z.infer<typeof insertAlertCommentSchema>;

export type ComplianceAuditLog = typeof complianceAuditLog.$inferSelect;
export type InsertComplianceAuditLog = z.infer<typeof insertComplianceAuditLogSchema>;

// Database hardening: Schema versioning for migrations
export const dbSchemaVersion = pgTable("db_schema_version", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  appliedAt: timestamp("applied_at", { mode: "date" }).defaultNow(),
});

// Database hardening: Retention policies for telemetry data
export const telemetryRetentionPolicies = pgTable("telemetry_retention_policies", {
  id: integer("id").primaryKey().default(1),
  retentionDays: integer("retention_days").default(365),
  rollupEnabled: boolean("rollup_enabled").default(true),
  rollupBucket: text("rollup_bucket").default("5 minutes"),
  compressionEnabled: boolean("compression_enabled").default(false),
  compressionAfterDays: integer("compression_after_days").default(7),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// Database hardening: Sensor types catalog for standardization
export const sensorTypes = pgTable("sensor_types", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // temperature, pressure, vibration, electrical, etc.
  defaultUnit: text("default_unit").notNull(),
  units: jsonb("units").notNull(), // Array of supported units
  description: text("description"),
  minValue: real("min_value"),
  maxValue: real("max_value"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

// Database hardening: Sensor mapping for equipment-specific configurations
export const sensorMapping = pgTable("sensor_mapping", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  vesselId: text("vessel_id").notNull(), // references devices.id
  sourceId: text("source_id").notNull(), // sensor source identifier
  signalId: text("signal_id").notNull(), // signal identifier
  sensorTypeId: text("sensor_type_id").notNull().references(() => sensorTypes.id),
  equipmentId: text("equipment_id"),
  preferredUnit: text("preferred_unit"),
  scalingFactor: real("scaling_factor").default(1.0),
  offset: real("offset").default(0.0),
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// Database hardening: Auto-discovered signals from telemetry data
export const discoveredSignals = pgTable("discovered_signals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  vesselId: text("vessel_id").notNull(), // references devices.id
  sourceId: text("source_id").notNull(),
  signalId: text("signal_id").notNull(),
  unit: text("unit"),
  firstSeen: timestamp("first_seen", { mode: "date" }).defaultNow(),
  lastSeen: timestamp("last_seen", { mode: "date" }).defaultNow(),
  sampleCount: integer("sample_count").default(0),
  minValue: real("min_value"),
  maxValue: real("max_value"),
  avgValue: real("avg_value"),
  isMapped: boolean("is_mapped").default(false),
  suggestedSensorType: text("suggested_sensor_type"),
});

// Database hardening: Request idempotency tracking
export const requestIdempotency = pgTable("request_idempotency", {
  key: text("key").primaryKey(),
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(),
  responseStatus: integer("response_status"),
  responseBody: text("response_body"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
});

// Database hardening: TimescaleDB rollup data for telemetry
export const telemetryRollups = pgTable("telemetry_rollups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  equipmentId: text("equipment_id").notNull(),
  sensorType: text("sensor_type").notNull(),
  bucket: timestamp("bucket", { mode: "date" }).notNull(),
  bucketSize: text("bucket_size").notNull(), // '5 minutes', '1 hour', etc.
  avgValue: real("avg_value"),
  minValue: real("min_value"),
  maxValue: real("max_value"),
  sampleCount: integer("sample_count").notNull(),
  unit: text("unit"),
});

// Create insert schemas for database hardening tables
export const insertDbSchemaVersionSchema = createInsertSchema(dbSchemaVersion);
export const insertTelemetryRetentionPolicySchema = createInsertSchema(telemetryRetentionPolicies);
export const insertSensorTypeSchema = createInsertSchema(sensorTypes);
export const insertSensorMappingSchema = createInsertSchema(sensorMapping);
export const insertDiscoveredSignalSchema = createInsertSchema(discoveredSignals);
export const insertRequestIdempotencySchema = createInsertSchema(requestIdempotency);
export const insertTelemetryRollupSchema = createInsertSchema(telemetryRollups);

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// CMMS-lite Types
export type WorkOrderChecklist = typeof workOrderChecklists.$inferSelect;
export type InsertWorkOrderChecklist = z.infer<typeof insertWorkOrderChecklistSchema>;

export type WorkOrderWorklog = typeof workOrderWorklogs.$inferSelect;
export type InsertWorkOrderWorklog = z.infer<typeof insertWorkOrderWorklogSchema>;

export type PartsInventory = typeof partsInventory.$inferSelect;
export type InsertPartsInventory = z.infer<typeof insertPartsInventorySchema>;

export type WorkOrderParts = typeof workOrderParts.$inferSelect;
export type InsertWorkOrderParts = z.infer<typeof insertWorkOrderPartsSchema>;

// Inventory Movements Types
export const insertInventoryMovementSchema = createInsertSchema(inventoryMovements).omit({ id: true, createdAt: true });
export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type InsertInventoryMovement = z.infer<typeof insertInventoryMovementSchema>;

// Optimizer v1 Types
export type OptimizerConfiguration = typeof optimizerConfigurations.$inferSelect;
export type InsertOptimizerConfiguration = z.infer<typeof insertOptimizerConfigurationSchema>;

export type ResourceConstraint = typeof resourceConstraints.$inferSelect;
export type InsertResourceConstraint = z.infer<typeof insertResourceConstraintSchema>;

export type OptimizationResult = typeof optimizationResults.$inferSelect;
export type InsertOptimizationResult = z.infer<typeof insertOptimizationResultSchema>;

export type ScheduleOptimization = typeof scheduleOptimizations.$inferSelect;
export type InsertScheduleOptimization = z.infer<typeof insertScheduleOptimizationSchema>;

// RAG Search System Types
export type KnowledgeBaseItem = typeof knowledgeBaseItems.$inferSelect;
export type InsertKnowledgeBaseItem = z.infer<typeof insertKnowledgeBaseItemSchema>;

export type RagSearchQuery = typeof ragSearchQueries.$inferSelect;
export type InsertRagSearchQuery = z.infer<typeof insertRagSearchQuerySchema>;

export type ContentSource = typeof contentSources.$inferSelect;
export type InsertContentSource = z.infer<typeof insertContentSourceSchema>;

// RAG Search System: Knowledge base for enhanced LLM report citations
export const knowledgeBaseItems = pgTable('knowledge_base_items', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar('org_id').notNull(),
  contentType: varchar('content_type').notNull(), // 'telemetry', 'alert', 'work_order', 'maintenance_record', 'equipment_data'
  sourceId: varchar('source_id').notNull(), // ID of the source entity (equipment ID, work order ID, etc.)
  title: varchar('title').notNull(),
  content: text('content').notNull(), // Full searchable text content
  summary: varchar('summary', { length: 500 }), // Short summary for quick context
  metadata: jsonb('metadata').default({}), // Additional context data (equipment type, sensor type, date ranges, etc.)
  keywords: text('keywords').array(), // Searchable keywords and tags
  relevanceScore: real('relevance_score').default(1.0), // Base relevance scoring (0.0-1.0)
  isActive: boolean('is_active').default(true),
  lastUpdated: timestamp('last_updated').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const insertKnowledgeBaseItemSchema = createInsertSchema(knowledgeBaseItems).omit({
  id: true,
  createdAt: true,
});

// RAG Search Queries: Track search queries and results for optimization
export const ragSearchQueries = pgTable('rag_search_queries', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar('org_id').notNull(),
  query: text('query').notNull(), // The search query
  searchType: varchar('search_type').notNull(), // 'semantic', 'keyword', 'hybrid'
  filters: jsonb('filters').default({}), // Content type, date range, equipment scope filters
  resultCount: integer('result_count').default(0),
  executionTimeMs: integer('execution_time_ms'),
  resultIds: text('result_ids').array(), // IDs of knowledge base items returned
  relevanceScores: real('relevance_scores').array(), // Corresponding relevance scores
  reportContext: varchar('report_context'), // Which report type this search was for
  aiModelUsed: varchar('ai_model_used'), // OpenAI model version
  successful: boolean('successful').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const insertRagSearchQuerySchema = createInsertSchema(ragSearchQueries).omit({
  id: true,
  createdAt: true,
});

// Content Source Mapping: Enhanced citations with data lineage
export const contentSources = pgTable('content_sources', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar('org_id').notNull(),
  sourceType: varchar('source_type').notNull(), // 'equipment', 'alert', 'work_order', 'maintenance', 'telemetry_batch'
  sourceId: varchar('source_id').notNull(), // Original entity ID
  entityName: varchar('entity_name'), // Human-readable name (equipment name, work order title, etc.)
  lastModified: timestamp('last_modified').defaultNow(),
  dataQuality: real('data_quality').default(1.0), // Data quality score (0.0-1.0)
  accessLevel: varchar('access_level').default('public'), // 'public', 'restricted', 'confidential'
  tags: text('tags').array(), // Content classification tags
  relatedSources: text('related_sources').array(), // IDs of related content sources
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const insertContentSourceSchema = createInsertSchema(contentSources).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// =============================
// ADVANCED PDM FEATURES
// =============================

// Vibration Analysis: FFT features and ISO band analysis
export const vibrationFeatures = pgTable("vibration_features", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  equipmentId: text("equipment_id").notNull(),
  vesselId: varchar("vessel_id").references(() => vessels.id), // optional vessel identification
  timestamp: timestamp("timestamp", { mode: "date" }).defaultNow(),
  rpm: real("rpm"), // equipment RPM for order analysis
  rms: real("rms"), // Root Mean Square
  crestFactor: real("crest_factor"), // Peak/RMS ratio
  kurtosis: real("kurtosis"), // Distribution kurtosis
  peakFrequency: real("peak_frequency"), // Dominant frequency (Hz)
  band1Power: real("band_1_power"), // 1x order band power
  band2Power: real("band_2_power"), // 2x order band power
  band3Power: real("band_3_power"), // 3x order band power
  band4Power: real("band_4_power"), // 4x order band power
  rawDataLength: integer("raw_data_length"), // Original sample count
  sampleRate: real("sample_rate"), // Sampling frequency (Hz)
  analysisMetadata: jsonb("analysis_metadata"), // Additional analysis context
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

// RUL Models: Weibull reliability models for component failure prediction
export const rulModels = pgTable("rul_models", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  modelId: text("model_id").notNull().unique(), // user-defined model identifier
  componentClass: text("component_class").notNull(), // 'fuel_pump', 'engine_bearing', etc.
  equipmentType: text("equipment_type"), // specific equipment type
  shapeK: real("shape_k").notNull(), // Weibull shape parameter
  scaleLambda: real("scale_lambda").notNull(), // Weibull scale parameter
  confidenceLo: real("confidence_lo"), // Lower confidence interval
  confidenceHi: real("confidence_hi"), // Upper confidence interval
  fittedAt: timestamp("fitted_at", { mode: "date" }).defaultNow(),
  trainingData: jsonb("training_data"), // Original failure times used for fitting
  validationMetrics: jsonb("validation_metrics"), // Model validation statistics
  notes: text("notes"), // Model description and notes
  isActive: boolean("is_active").default(true), // Model status
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// RUL Fit History: Version history for model retraining
export const rulFitHistory = pgTable("rul_fit_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  modelId: text("model_id").notNull(), // references rulModels.modelId
  shapeK: real("shape_k").notNull(),
  scaleLambda: real("scale_lambda").notNull(),
  trainingSize: integer("training_size"), // number of data points used
  goodnessOfFit: real("goodness_of_fit"), // statistical fit quality
  fittedAt: timestamp("fitted_at", { mode: "date" }).defaultNow(),
});

// Parts Catalog: Enhanced inventory management
export const parts = pgTable("parts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  partNo: text("part_no").notNull(), // part number (unique within org)
  name: text("name").notNull(), // descriptive name
  description: text("description"), // detailed description
  category: text("category"), // part category classification
  unitOfMeasure: text("unit_of_measure").notNull().default("ea"), // ea, kg, L, m, etc.
  minStockQty: real("min_stock_qty").default(0), // minimum stock level
  maxStockQty: real("max_stock_qty").default(0), // maximum stock level
  standardCost: real("standard_cost").default(0), // standard unit cost - synced with stock
  leadTimeDays: integer("lead_time_days").default(7), // typical lead time
  criticality: text("criticality").default("medium"), // low, medium, high, critical
  specifications: jsonb("specifications"), // technical specifications
  compatibleEquipment: text("compatible_equipment").array(), // equipment IDs this part fits
  primarySupplierId: varchar("primary_supplier_id").references(() => suppliers.id), // primary supplier
  alternateSupplierIds: text("alternate_supplier_ids").array(), // backup suppliers
  // Risk analysis fields
  riskLevel: text("risk_level").default("medium"), // low, medium, high, critical
  lastOrderDate: timestamp("last_order_date", { mode: "date" }),
  averageLeadTime: integer("average_lead_time"), // calculated from order history
  demandVariability: real("demand_variability"), // statistical measure of demand variance
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  // Unique constraint: part number must be unique within organization
  uniquePartNo: sql`ALTER TABLE ${table} ADD CONSTRAINT unique_part_no_org UNIQUE (${table.orgId}, ${table.partNo})`,
  // Full-text search index for part name and description
  searchIdx: sql`CREATE INDEX IF NOT EXISTS idx_parts_search ON parts USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')))`,
  // Index for part number searches
  partNoIdx: sql`CREATE INDEX IF NOT EXISTS idx_parts_part_no ON parts (part_no)`,
  // Index for category and criticality filtering
  categoryIdx: sql`CREATE INDEX IF NOT EXISTS idx_parts_category ON parts (category, criticality)`,
  // Index for supplier management
  supplierIdx: sql`CREATE INDEX IF NOT EXISTS idx_parts_supplier ON parts (primary_supplier_id)`,
}));

// Suppliers: Vendor and supplier management
export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  code: text("code").notNull(), // short supplier code
  contactInfo: jsonb("contact_info"), // address, phone, email, etc.
  leadTimeDays: integer("lead_time_days").default(14), // typical lead time
  qualityRating: real("quality_rating").default(5.0), // 1-10 quality score
  reliabilityScore: real("reliability_score").default(5.0), // 1-10 delivery reliability
  costRating: real("cost_rating").default(5.0), // 1-10 cost competitiveness
  paymentTerms: text("payment_terms"), // NET30, COD, etc.
  isPreferred: boolean("is_preferred").default(false),
  isActive: boolean("is_active").default(true),
  // Performance tracking
  onTimeDeliveryRate: real("on_time_delivery_rate"), // percentage of on-time deliveries
  defectRate: real("defect_rate").default(0), // percentage of defective parts
  averageLeadTime: integer("average_lead_time"), // calculated from order history
  totalOrderValue: real("total_order_value").default(0), // lifetime order value
  totalOrders: integer("total_orders").default(0), // total number of orders
  lastOrderDate: timestamp("last_order_date", { mode: "date" }),
  // Risk assessment
  riskLevel: text("risk_level").default("medium"), // low, medium, high, critical
  backupSuppliers: text("backup_suppliers").array(), // IDs of backup suppliers
  minimumOrderValue: real("minimum_order_value"), // minimum order amount
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  // Unique constraint: supplier code must be unique within organization
  uniqueSupplierCode: sql`ALTER TABLE ${table} ADD CONSTRAINT unique_supplier_code_org UNIQUE (${table.orgId}, ${table.code})`,
  // Index for supplier performance analysis
  performanceIdx: sql`CREATE INDEX IF NOT EXISTS idx_suppliers_performance ON suppliers (quality_rating, reliability_score, cost_rating)`,
  // Index for searching suppliers
  searchIdx: sql`CREATE INDEX IF NOT EXISTS idx_suppliers_search ON suppliers (name, code)`,
}));

// Stock Levels: Inventory tracking by location
export const stock = pgTable("stock", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  partId: varchar("part_id").notNull().references(() => parts.id), // foreign key to parts table
  partNo: text("part_no").notNull(), // denormalized for performance
  location: text("location").notNull().default("MAIN"), // warehouse/location code
  quantityOnHand: real("quantity_on_hand").default(0),
  quantityReserved: real("quantity_reserved").default(0), // reserved for work orders
  quantityOnOrder: real("quantity_on_order").default(0), // incoming orders
  unitCost: real("unit_cost").default(0), // synchronized with parts.standardCost
  lastCountDate: timestamp("last_count_date", { mode: "date" }),
  binLocation: text("bin_location"), // specific bin/shelf location
  supplierId: varchar("supplier_id").references(() => suppliers.id), // primary supplier for this location
  reorderPoint: real("reorder_point"), // when to reorder this part
  maxQuantity: real("max_quantity"), // maximum quantity for this location
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  // Unique constraint: one stock record per part per location per org
  uniquePartLocation: sql`ALTER TABLE ${table} ADD CONSTRAINT unique_part_location UNIQUE (${table.orgId}, ${table.partId}, ${table.location})`,
  // Index for part number searches
  partNoIdx: sql`CREATE INDEX IF NOT EXISTS idx_stock_part_no ON stock (part_no)`,
  // Index for low stock alerts
  lowStockIdx: sql`CREATE INDEX IF NOT EXISTS idx_stock_low_stock ON stock (quantity_on_hand, reorder_point)`,
  // Index for supplier management
  supplierIdx: sql`CREATE INDEX IF NOT EXISTS idx_stock_supplier ON stock (supplier_id)`,
}));

// Part Substitutions: Alternative parts mapping
export const partSubstitutions = pgTable("part_substitutions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  primaryPartId: varchar("primary_part_id").notNull().references(() => parts.id), // preferred part
  alternatePartId: varchar("alternate_part_id").notNull().references(() => parts.id), // substitute part
  primaryPartNo: text("primary_part_no").notNull(), // denormalized for performance
  alternatePartNo: text("alternate_part_no").notNull(), // denormalized for performance
  substitutionType: text("substitution_type").default("equivalent"), // equivalent, acceptable, emergency
  riskLevel: text("risk_level").default("low"), // low, medium, high - risk of using substitute
  costImpact: real("cost_impact"), // percentage cost difference (+/- from primary part)
  performanceImpact: text("performance_impact"), // description of performance differences
  restrictions: text("restrictions"), // when this substitution should/shouldn't be used
  notes: text("notes"), // substitution notes and restrictions
  isApproved: boolean("is_approved").default(true), // requires approval for use
  approvedBy: text("approved_by"), // who approved this substitution
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  // Unique constraint: one substitution rule per primary-alternate pair
  uniqueSubstitution: sql`ALTER TABLE ${table} ADD CONSTRAINT unique_substitution UNIQUE (${table.primaryPartId}, ${table.alternatePartId})`,
  // Index for finding substitutes for a primary part
  primaryPartIdx: sql`CREATE INDEX IF NOT EXISTS idx_substitutions_primary ON part_substitutions (primary_part_id, substitution_type)`,
  // Index for reverse lookups
  alternatePartIdx: sql`CREATE INDEX IF NOT EXISTS idx_substitutions_alternate ON part_substitutions (alternate_part_id)`,
}));

// Compliance Bundles: Regulatory documentation packages
export const complianceBundles = pgTable("compliance_bundles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  bundleId: text("bundle_id").notNull(), // user-defined bundle identifier
  kind: text("kind").notNull(), // ABS_DNV, CLASS_NK, etc.
  title: text("title").notNull(), // bundle title
  description: text("description"), // bundle description
  generatedAt: timestamp("generated_at", { mode: "date" }).defaultNow(),
  sha256Hash: text("sha256_hash").notNull(), // content verification hash
  filePath: text("file_path"), // path to generated file
  fileFormat: text("file_format").default("html"), // html, pdf
  payloadData: jsonb("payload_data"), // source data used for generation
  complianceStandards: text("compliance_standards").array(), // applicable standards
  validityPeriod: integer("validity_period_months"), // how long bundle is valid
  status: text("status").default("active"), // active, expired, superseded
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});


// Insert schemas for new tables
export const insertVibrationFeatureSchema = createInsertSchema(vibrationFeatures).omit({
  id: true,
  createdAt: true,
});

export const insertRulModelSchema = createInsertSchema(rulModels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRulFitHistorySchema = createInsertSchema(rulFitHistory).omit({
  id: true,
});

export const insertPartSchema = createInsertSchema(parts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updatePartSchema = insertPartSchema.partial();

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateSupplierSchema = insertSupplierSchema.partial();

export const insertStockSchema = createInsertSchema(stock).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateStockSchema = insertStockSchema.partial();

export const insertPartSubstitutionSchema = createInsertSchema(partSubstitutions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updatePartSubstitutionSchema = insertPartSubstitutionSchema.partial();

export const insertComplianceBundleSchema = createInsertSchema(complianceBundles).omit({
  id: true,
  createdAt: true,
});

// Types for new tables
export type VibrationFeature = typeof vibrationFeatures.$inferSelect;
export type InsertVibrationFeature = z.infer<typeof insertVibrationFeatureSchema>;

export type RulModel = typeof rulModels.$inferSelect;
export type InsertRulModel = z.infer<typeof insertRulModelSchema>;

export type RulFitHistory = typeof rulFitHistory.$inferSelect;
export type InsertRulFitHistory = z.infer<typeof insertRulFitHistorySchema>;

export type Part = typeof parts.$inferSelect;
export type InsertPart = z.infer<typeof insertPartSchema>;

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;

export type Stock = typeof stock.$inferSelect;
export type InsertStock = z.infer<typeof insertStockSchema>;

export type PartSubstitution = typeof partSubstitutions.$inferSelect;
export type InsertPartSubstitution = z.infer<typeof insertPartSubstitutionSchema>;

export type ComplianceBundle = typeof complianceBundles.$inferSelect;
export type InsertComplianceBundle = z.infer<typeof insertComplianceBundleSchema>;

// API Response types
export type DeviceStatus = "Online" | "Warning" | "Critical" | "Offline";

export type DeviceWithStatus = Device & {
  status: DeviceStatus;
  lastHeartbeat?: EdgeHeartbeat;
};

export type EquipmentHealth = {
  id: string;
  vessel: string;
  vesselId?: string;
  name?: string;
  type?: string;
  healthIndex: number;
  predictedDueDays: number;
  status: "healthy" | "warning" | "critical";
};

export type DashboardMetrics = {
  activeDevices: number;
  fleetHealth: number;
  openWorkOrders: number;
  riskAlerts: number;
  trends?: {
    activeDevices?: { value: number; direction: 'up' | 'down'; percentChange: number };
    fleetHealth?: { value: number; direction: 'up' | 'down'; percentChange: number };
    openWorkOrders?: { value: number; direction: 'up' | 'down'; percentChange: number };
    riskAlerts?: { value: number; direction: 'up' | 'down'; percentChange: number };
  };
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

// ===== CREW MANAGEMENT SYSTEM =====

// Vessels in the fleet
export const vessels = pgTable("vessels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  imo: text("imo"), // International Maritime Organization number
  flag: text("flag"), // flag state
  vesselType: text("vessel_type"), // cargo, tanker, passenger, etc.
  vesselClass: text("vessel_class"), // ABS, DNV GL, Lloyd's Register, etc.
  condition: text("condition").default("good"), // excellent, good, fair, poor, critical
  onlineStatus: text("online_status").default("unknown"), // online, offline, unknown
  lastHeartbeat: timestamp("last_heartbeat", { mode: "date" }), // last communication timestamp
  dwt: integer("dwt"), // deadweight tonnage
  yearBuilt: integer("year_built"),
  active: boolean("active").default(true),
  notes: text("notes"),
  // Financial tracking fields
  dayRateSgd: numeric("day_rate_sgd", { precision: 10, scale: 2 }), // Daily operational rate in SGD
  downtimeDays: numeric("downtime_days", { precision: 10, scale: 2 }).default("0"), // Accumulated downtime days
  downtimeResetAt: timestamp("downtime_reset_at", { mode: "date" }), // Last downtime reset timestamp
  operationDays: numeric("operation_days", { precision: 10, scale: 2 }).default("0"), // Accumulated operation days
  operationResetAt: timestamp("operation_reset_at", { mode: "date" }), // Last operation reset timestamp
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// Downtime Events: Track equipment and vessel downtime incidents
export const downtimeEvents = pgTable("downtime_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  workOrderId: varchar("work_order_id").references(() => workOrders.id),
  equipmentId: varchar("equipment_id").references(() => equipment.id),
  vesselId: varchar("vessel_id").references(() => vessels.id),
  downtimeType: text("downtime_type").notNull(), // equipment, vessel, planned, unplanned
  startTime: timestamp("start_time", { mode: "date" }).notNull(),
  endTime: timestamp("end_time", { mode: "date" }),
  durationHours: real("duration_hours"), // Calculated from start/end
  reason: text("reason"), // Description of downtime cause
  impactLevel: text("impact_level").default("medium"), // low, medium, high, critical
  revenueImpact: real("revenue_impact"), // Financial impact in currency
  opportunityCost: real("opportunity_cost"), // Lost revenue/opportunity
  rootCause: text("root_cause"), // Root cause analysis
  preventable: boolean("preventable"), // Could this have been prevented?
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  workOrderIdx: index("idx_downtime_work_order").on(table.workOrderId),
  equipmentIdx: index("idx_downtime_equipment").on(table.equipmentId),
  vesselIdx: index("idx_downtime_vessel").on(table.vesselId),
  timeIdx: index("idx_downtime_time").on(table.startTime),
}));

// Part Failure History: Track part failures for quality and supplier analysis
export const partFailureHistory = pgTable("part_failure_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  partId: varchar("part_id").notNull().references(() => partsInventory.id),
  equipmentId: varchar("equipment_id").notNull().references(() => equipment.id),
  supplierId: varchar("supplier_id").references(() => suppliers.id),
  workOrderId: varchar("work_order_id").references(() => workOrders.id),
  failureDate: timestamp("failure_date", { mode: "date" }).notNull(),
  installDate: timestamp("install_date", { mode: "date" }),
  operatingHours: real("operating_hours"), // Hours between install and failure
  failureMode: text("failure_mode"), // wear, fatigue, overload, defect, etc.
  failureSeverity: text("failure_severity").default("medium"), // low, medium, high, critical
  rootCause: text("root_cause"), // Detailed root cause
  defectiveOnArrival: boolean("defective_on_arrival").default(false),
  warrantyStatus: text("warranty_status"), // in_warranty, out_of_warranty, claimed
  replacementCost: real("replacement_cost"),
  downtimeHours: real("downtime_hours"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  partIdx: index("idx_part_failure_part").on(table.partId),
  supplierIdx: index("idx_part_failure_supplier").on(table.supplierId),
  equipmentIdx: index("idx_part_failure_equipment").on(table.equipmentId),
  dateIdx: index("idx_part_failure_date").on(table.failureDate),
}));

// Industry Benchmarks: Equipment performance benchmarks for comparison
export const industryBenchmarks = pgTable("industry_benchmarks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  equipmentType: text("equipment_type").notNull(), // engine, pump, compressor, etc.
  manufacturer: text("manufacturer"),
  model: text("model"),
  vesselType: text("vessel_type"), // cargo, tanker, passenger, etc.
  averageMTBF: integer("average_mtbf"), // Mean time between failures (hours)
  averageMTTR: integer("average_mttr"), // Mean time to repair (hours)
  typicalFailureModes: jsonb("typical_failure_modes"), // Array of common failure modes
  recommendedMaintenanceInterval: integer("recommended_maintenance_interval"), // Hours
  averageLifespan: integer("average_lifespan"), // Total expected lifespan (hours)
  industryStandard: text("industry_standard"), // ISO, IMO, class society standard
  dataSource: text("data_source"), // Where this benchmark data comes from
  sampleSize: integer("sample_size"), // Number of units in benchmark sample
  lastUpdated: timestamp("last_updated", { mode: "date" }).defaultNow(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  typeIdx: index("idx_benchmark_type").on(table.equipmentType),
  manufacturerIdx: index("idx_benchmark_manufacturer").on(table.manufacturer, table.model),
}));

// Operating Parameters: Optimal operating ranges for equipment life extension
export const operatingParameters = pgTable("operating_parameters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  equipmentType: text("equipment_type").notNull(), // engine, pump, compressor, etc.
  manufacturer: text("manufacturer"),
  model: text("model"),
  parameterName: text("parameter_name").notNull(), // rpm, temperature, pressure, load, etc.
  parameterType: text("parameter_type").notNull(), // telemetry sensor type
  unit: text("unit").notNull(), // RPM, °C, PSI, %, etc.
  optimalMin: real("optimal_min"), // Lower bound of optimal range
  optimalMax: real("optimal_max"), // Upper bound of optimal range
  criticalMin: real("critical_min"), // Critical low threshold
  criticalMax: real("critical_max"), // Critical high threshold
  lifeImpactDescription: text("life_impact_description"), // e.g., "Running at 85% load extends bearing life by 40%"
  recommendedAction: text("recommended_action"), // What to do when out of range
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
  version: integer("version").default(1),
  lastModifiedBy: varchar("last_modified_by", { length: 255 }),
  lastModifiedDevice: varchar("last_modified_device", { length: 255 }),
}, (table) => ({
  typeIdx: index("idx_operating_params_type").on(table.equipmentType),
  paramIdx: index("idx_operating_params_param").on(table.parameterName),
}));

// Operating Condition Alerts: Track when equipment runs outside optimal parameters
export const operatingConditionAlerts = pgTable("operating_condition_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  equipmentId: varchar("equipment_id").notNull().references(() => equipment.id),
  parameterId: varchar("parameter_id").notNull().references(() => operatingParameters.id),
  parameterName: text("parameter_name").notNull(), // Denormalized for faster queries
  currentValue: real("current_value").notNull(),
  optimalMin: real("optimal_min"),
  optimalMax: real("optimal_max"),
  thresholdType: text("threshold_type").notNull(), // below_optimal, above_optimal, below_critical, above_critical
  severity: text("severity").notNull().default("warning"), // info, warning, critical
  lifeImpact: text("life_impact"), // Description of impact on equipment life
  recommendedAction: text("recommended_action"),
  alertedAt: timestamp("alerted_at", { mode: "date" }).notNull().defaultNow(),
  acknowledgedAt: timestamp("acknowledged_at", { mode: "date" }),
  acknowledgedBy: varchar("acknowledged_by"),
  resolvedAt: timestamp("resolved_at", { mode: "date" }),
  notes: text("notes"),
}, (table) => ({
  equipmentIdx: index("idx_op_alerts_equipment").on(table.equipmentId),
  alertedIdx: index("idx_op_alerts_time").on(table.alertedAt),
  activeIdx: index("idx_op_alerts_active").on(table.equipmentId, table.acknowledgedAt),
}));

// Maintenance Templates: Reusable PM procedures for equipment types
export const maintenanceTemplates = pgTable("maintenance_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  equipmentType: text("equipment_type").notNull(), // engine, pump, compressor, etc.
  manufacturer: text("manufacturer"),
  model: text("model"),
  maintenanceType: text("maintenance_type").notNull(), // preventive, inspection, overhaul, etc.
  frequencyDays: integer("frequency_days"), // Recommended frequency in days
  frequencyHours: integer("frequency_hours"), // Recommended frequency in operating hours
  estimatedDurationHours: real("estimated_duration_hours"),
  priority: integer("priority").default(3), // 1-5, lower is higher priority
  requiredSkills: text("required_skills").array(),
  requiredParts: jsonb("required_parts"), // Array of {partId, quantity, optional}
  safetyNotes: text("safety_notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  typeIdx: index("idx_maint_template_type").on(table.equipmentType),
  activeIdx: index("idx_maint_template_active").on(table.isActive),
}));

// Maintenance Checklist Items: Individual steps in a maintenance template
export const maintenanceChecklistItems = pgTable("maintenance_checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => maintenanceTemplates.id),
  stepNumber: integer("step_number").notNull(), // Order of execution
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"), // inspection, cleaning, lubrication, adjustment, replacement, testing
  required: boolean("required").default(true), // Is this step mandatory?
  imageUrl: text("image_url"), // Reference diagram/photo
  estimatedMinutes: integer("estimated_minutes"),
  safetyWarning: text("safety_warning"),
  expectedResult: text("expected_result"), // What should be observed/measured
  acceptanceCriteria: text("acceptance_criteria"), // Pass/fail criteria
}, (table) => ({
  templateIdx: index("idx_checklist_template").on(table.templateId, table.stepNumber),
}));

// Maintenance Checklist Completions: Track execution of checklist items
export const maintenanceChecklistCompletions = pgTable("maintenance_checklist_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workOrderId: varchar("work_order_id").notNull().references(() => workOrders.id),
  itemId: varchar("item_id").notNull().references(() => maintenanceChecklistItems.id),
  completedAt: timestamp("completed_at", { mode: "date" }),
  completedBy: varchar("completed_by"), // User ID or crew member
  completedByName: text("completed_by_name"), // Denormalized for display
  status: text("status").notNull().default("pending"), // pending, completed, skipped, failed
  passed: boolean("passed"), // Did it meet acceptance criteria?
  actualValue: text("actual_value"), // Measured/observed value
  notes: text("notes"), // Additional observations
  photoUrls: text("photo_urls").array(), // Photos of work performed
}, (table) => ({
  workOrderIdx: index("idx_checklist_completion_wo").on(table.workOrderId),
  itemIdx: index("idx_checklist_completion_item").on(table.itemId),
}));

// Crew members with maritime roles and qualifications
export const crew = pgTable("crew", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  rank: text("rank"), // Chief Engineer, Deck Officer, Able Seaman, etc.
  vesselId: varchar("vessel_id").references(() => vessels.id), // assigned vessel (nullable - crew can be unassigned)
  maxHours7d: real("max_hours_7d").default(72), // max hours per 7-day period
  minRestH: real("min_rest_h").default(10), // minimum rest hours between shifts
  active: boolean("active").default(true),
  onDuty: boolean("on_duty").default(false), // current duty status for shift management
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// Master skills catalog for crew management
export const skills = pgTable("skills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull().unique(), // watchkeeping, diesel_maintenance, crane_operation, etc.
  category: text("category"), // navigation, engineering, deck, safety, etc.
  description: text("description"), // detailed description of the skill
  maxLevel: integer("max_level").default(5), // maximum proficiency level (1-5)
  active: boolean("active").default(true),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// Crew skills and proficiency levels
export const crewSkill = pgTable("crew_skill", {
  crewId: varchar("crew_id").notNull().references(() => crew.id),
  skill: text("skill").notNull(), // watchkeeping, diesel_lv2, crane_operator, etc.
  level: integer("level").default(1), // proficiency level 1-5
}, (table) => ({
  pk: sql`PRIMARY KEY (${table.crewId}, ${table.skill})`,
}));

// Crew leave periods
export const crewLeave = pgTable("crew_leave", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  crewId: varchar("crew_id").notNull().references(() => crew.id),
  start: timestamp("start", { mode: "date" }).notNull(),
  end: timestamp("end", { mode: "date" }).notNull(),
  reason: text("reason"), // vacation, sick leave, shore leave, etc.
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

// Shift templates for scheduling
export const shiftTemplate = pgTable("shift_template", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vesselId: varchar("vessel_id").references(() => vessels.id),
  equipmentId: text("equipment_id"),
  role: text("role").notNull(), // Watch, Maintenance, Engine Room, etc.
  start: text("start").notNull(), // HH:MM:SS format
  end: text("end").notNull(), // HH:MM:SS format
  durationH: real("duration_h").notNull(), // duration in hours (matches database)
  requiredSkills: text("required_skills"), // required skills for this shift
  rankMin: text("rank_min"), // minimum rank required for this shift
  certRequired: text("cert_required"), // required certification
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

// Actual crew assignments
export const crewAssignment = pgTable("crew_assignment", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull(), // YYYY-MM-DD format
  shiftId: varchar("shift_id").references(() => shiftTemplate.id),
  crewId: varchar("crew_id").notNull().references(() => crew.id),
  vesselId: varchar("vessel_id").references(() => vessels.id),
  start: timestamp("start", { mode: "date" }).notNull(),
  end: timestamp("end", { mode: "date" }).notNull(),
  role: text("role"),
  status: text("status").default("scheduled"), // scheduled, completed, cancelled
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  version: integer("version").default(1),
  lastModifiedBy: varchar("last_modified_by", { length: 255 }),
  lastModifiedDevice: varchar("last_modified_device", { length: 255 }),
});

// Crew certifications with expiry tracking
export const crewCertification = pgTable("crew_cert", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  crewId: varchar("crew_id").notNull().references(() => crew.id),
  cert: text("cert").notNull(), // STCW, BOSIET, etc.
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  issuedBy: text("issued_by"), // certification authority
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

// Vessel port call windows - when vessel is in port
export const portCall = pgTable("port_call", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vesselId: varchar("vessel_id").notNull().references(() => vessels.id),
  port: text("port").notNull(), // port code like SGSIN
  start: timestamp("start", { mode: "date" }).notNull(),
  end: timestamp("end", { mode: "date" }).notNull(),
  status: text("status").default("scheduled"), // scheduled, in_progress, completed
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

// Vessel drydock/maintenance windows - when vessel is unavailable  
export const drydockWindow = pgTable("drydock_window", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vesselId: varchar("vessel_id").notNull().references(() => vessels.id),
  yard: text("yard"), // shipyard or facility name
  start: timestamp("start", { mode: "date" }).notNull(),
  end: timestamp("end", { mode: "date" }).notNull(),
  workType: text("work_type"), // drydock, repair, inspection, etc.
  status: text("status").default("scheduled"), // scheduled, in_progress, completed
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

// STCW Hours of Rest tracking - crew rest sheet metadata (one per crew per month)
// Idempotency tracking table (translated from Windows batch patch)
export const idempotencyLog = pgTable("idempotency_log", {
  key: varchar("key").primaryKey(),
  endpoint: text("endpoint").notNull(),
  timestamp: timestamp("timestamp", { mode: "date" }).defaultNow(),
});

export const crewRestSheet = pgTable("crew_rest_sheet", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vesselId: varchar("vessel_id").references(() => vessels.id),
  crewId: varchar("crew_id").notNull().references(() => crew.id),
  crewName: text("crew_name").notNull(),
  rank: text("rank"),
  month: text("month").notNull(), // e.g., "AUGUST"
  year: integer("year").notNull(), // e.g., 2025
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

// STCW Hours of Rest daily tracking - 24 hourly flags per day (0=work, 1=rest)
export const crewRestDay = pgTable("crew_rest_day", {
  sheetId: varchar("sheet_id").notNull().references(() => crewRestSheet.id),
  date: text("date").notNull(), // YYYY-MM-DD format
  h0: integer("h0").default(0), h1: integer("h1").default(0), h2: integer("h2").default(0), h3: integer("h3").default(0),
  h4: integer("h4").default(0), h5: integer("h5").default(0), h6: integer("h6").default(0), h7: integer("h7").default(0),
  h8: integer("h8").default(0), h9: integer("h9").default(0), h10: integer("h10").default(0), h11: integer("h11").default(0),
  h12: integer("h12").default(0), h13: integer("h13").default(0), h14: integer("h14").default(0), h15: integer("h15").default(0),
  h16: integer("h16").default(0), h17: integer("h17").default(0), h18: integer("h18").default(0), h19: integer("h19").default(0),
  h20: integer("h20").default(0), h21: integer("h21").default(0), h22: integer("h22").default(0), h23: integer("h23").default(0),
}, (table) => ({
  pk: sql`PRIMARY KEY (${table.sheetId}, ${table.date})`,
}));

// ===== HUB & SYNC PATCH TABLES =====
// Translated from Windows batch patch for device registry, replay helper, and sheet locks/versioning

// Replay incoming requests logging (from Hub & Sync patch)
export const replayIncoming = pgTable("replay_incoming", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deviceId: text("device_id"),
  endpoint: text("endpoint"),
  key: text("key"), // idempotency key
  receivedAt: timestamp("received_at", { mode: "date" }).defaultNow(),
});

// Sheet locking for Hours of Rest (soft enforcement)
export const sheetLock = pgTable("sheet_lock", {
  sheetKey: text("sheet_key").primaryKey(), // crew_id:year:month format
  token: text("token"),
  holder: text("holder"), // device_id or user
  expiresAt: timestamp("expires_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

// Sheet versioning for Hours of Rest data
export const sheetVersion = pgTable("sheet_version", {
  sheetKey: text("sheet_key").primaryKey(), // crew_id:year:month format
  version: integer("version").default(1), // incremented on each import
  lastModified: timestamp("last_modified", { mode: "date" }).defaultNow(),
  lastModifiedBy: text("last_modified_by"), // device_id or user
});

// Device registry for Hub & Sync (enhanced version of devices table)
export const deviceRegistry = pgTable("device_registry", {
  id: text("id").primaryKey(),
  label: text("label"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

// Zod schemas for vessel management
export const insertVesselSchema = createInsertSchema(vessels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  condition: z.enum(['excellent', 'good', 'fair', 'poor', 'critical']).default('good'),
  onlineStatus: z.enum(['online', 'offline', 'unknown']).default('unknown'),
  vesselClass: z.string().optional(), // Classification society: ABS, DNV GL, Lloyd's Register, etc.
  dayRateSgd: z.string().optional(), // Numeric stored as string for precision
  downtimeDays: z.string().optional(),
  operationDays: z.string().optional(),
});
export type InsertVessel = z.infer<typeof insertVesselSchema>;
export type SelectVessel = typeof vessels.$inferSelect;

// Zod schemas for crew management
export const insertCrewSchema = createInsertSchema(crew).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCrew = z.infer<typeof insertCrewSchema>;
export type SelectCrew = typeof crew.$inferSelect;

export const insertSkillSchema = createInsertSchema(skills).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSkill = z.infer<typeof insertSkillSchema>;
export type SelectSkill = typeof skills.$inferSelect;

export const insertCrewSkillSchema = createInsertSchema(crewSkill);
export type InsertCrewSkill = z.infer<typeof insertCrewSkillSchema>;
export type SelectCrewSkill = typeof crewSkill.$inferSelect;

export const insertCrewLeaveSchema = createInsertSchema(crewLeave).omit({
  id: true,
  createdAt: true,
});
export type InsertCrewLeave = z.infer<typeof insertCrewLeaveSchema>;
export type SelectCrewLeave = typeof crewLeave.$inferSelect;

export const insertShiftTemplateSchema = createInsertSchema(shiftTemplate).omit({
  id: true,
  createdAt: true,
});
export type InsertShiftTemplate = z.infer<typeof insertShiftTemplateSchema>;
export type SelectShiftTemplate = typeof shiftTemplate.$inferSelect;

export const insertCrewAssignmentSchema = createInsertSchema(crewAssignment).omit({
  id: true,
  createdAt: true,
});
export type InsertCrewAssignment = z.infer<typeof insertCrewAssignmentSchema>;
export type SelectCrewAssignment = typeof crewAssignment.$inferSelect;

export const insertCrewCertificationSchema = createInsertSchema(crewCertification).omit({
  id: true,
  createdAt: true,
});
export type InsertCrewCertification = z.infer<typeof insertCrewCertificationSchema>;
export type SelectCrewCertification = typeof crewCertification.$inferSelect;

export const insertPortCallSchema = createInsertSchema(portCall).omit({
  id: true,
  createdAt: true,
});
export type InsertPortCall = z.infer<typeof insertPortCallSchema>;
export type SelectPortCall = typeof portCall.$inferSelect;

export const insertDrydockWindowSchema = createInsertSchema(drydockWindow).omit({
  id: true,
  createdAt: true,
});
export type InsertDrydockWindow = z.infer<typeof insertDrydockWindowSchema>;
export type SelectDrydockWindow = typeof drydockWindow.$inferSelect;

// STCW Hours of Rest schemas
// Idempotency schema (translated from Windows batch patch)
export const insertIdempotencyLogSchema = createInsertSchema(idempotencyLog).omit({
  timestamp: true,
});
export type InsertIdempotencyLog = z.infer<typeof insertIdempotencyLogSchema>;
export type SelectIdempotencyLog = typeof idempotencyLog.$inferSelect;

export const insertCrewRestSheetSchema = createInsertSchema(crewRestSheet).omit({
  id: true,
  createdAt: true,
});
export type InsertCrewRestSheet = z.infer<typeof insertCrewRestSheetSchema>;
export type SelectCrewRestSheet = typeof crewRestSheet.$inferSelect;

export const insertCrewRestDaySchema = createInsertSchema(crewRestDay);
export type InsertCrewRestDay = z.infer<typeof insertCrewRestDaySchema>;
export type SelectCrewRestDay = typeof crewRestDay.$inferSelect;

// ===== HUB & SYNC PATCH SCHEMAS =====
// Zod schemas for new Hub & Sync tables

export const insertReplayIncomingSchema = createInsertSchema(replayIncoming).omit({
  id: true,
  receivedAt: true,
});
export type InsertReplayIncoming = z.infer<typeof insertReplayIncomingSchema>;
export type SelectReplayIncoming = typeof replayIncoming.$inferSelect;

export const insertSheetLockSchema = createInsertSchema(sheetLock).omit({
  createdAt: true,
});
export type InsertSheetLock = z.infer<typeof insertSheetLockSchema>;
export type SelectSheetLock = typeof sheetLock.$inferSelect;

export const insertSheetVersionSchema = createInsertSchema(sheetVersion).omit({
  lastModified: true,
});
export type InsertSheetVersion = z.infer<typeof insertSheetVersionSchema>;
export type SelectSheetVersion = typeof sheetVersion.$inferSelect;

export const insertDeviceRegistrySchema = createInsertSchema(deviceRegistry).omit({
  createdAt: true,
});
export type InsertDeviceRegistry = z.infer<typeof insertDeviceRegistrySchema>;
export type SelectDeviceRegistry = typeof deviceRegistry.$inferSelect;

// Extended types for crew with skills
export type CrewWithSkills = SelectCrew & {
  skills: string[];
};

export type SchedulePlanRequest = {
  days: string[];
  shifts: SelectShiftTemplate[];
  crew: CrewWithSkills[];
  leaves: SelectCrewLeave[];
};

export type SchedulePlanResponse = {
  scheduled: SelectCrewAssignment[];
  unfilled: {
    day: string;
    shiftId: string;
    need: number;
    reason: string;
  }[];
};

// ===== ENHANCED UTC VALIDATION SCHEMAS =====
// Translated from Python patch - provides strict UTC date/time validation

/**
 * UTC Date string pattern (YYYY-MM-DD) with strict calendar validation
 */
export const utcDateSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  "Must be valid UTC date format (YYYY-MM-DD)"
).refine((date) => {
  // Parse components manually to prevent rollover
  const [yearStr, monthStr, dayStr] = date.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  
  // Basic range validation
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  
  // Create date and verify it didn't roll over
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (isNaN(parsed.getTime())) return false;
  
  // Verify the components match exactly (no rollover)
  return parsed.getUTCFullYear() === year &&
         parsed.getUTCMonth() === month - 1 &&
         parsed.getUTCDate() === day;
}, "Must be valid calendar date (no rollover allowed)");

/**
 * UTC Time string pattern (HH:MM:SS)
 */
export const utcTimeSchema = z.string().regex(
  /^\d{2}:\d{2}:\d{2}$/,
  "Must be valid UTC time format (HH:MM:SS)"
).refine((time) => {
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return hours >= 0 && hours < 24 && 
         minutes >= 0 && minutes < 60 && 
         seconds >= 0 && seconds < 60;
}, "Must be valid time values");

/**
 * ISO timestamp with strict UTC validation (requires 'Z' suffix, no calendar rollover)
 */
export const utcTimestampSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/,
  "Must be valid ISO timestamp with 'Z' suffix (UTC)"
).refine((timestamp) => {
  try {
    // Parse components manually to prevent rollover
    const [datePart, timePart] = timestamp.replace('Z', '').split('T');
    const [yearStr, monthStr, dayStr] = datePart.split('-');
    const [hourStr, minuteStr, secondStr] = timePart.split('.')[0].split(':');
    
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    const second = parseInt(secondStr, 10);
    
    // Basic range validation
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    if (hour < 0 || hour > 23) return false;
    if (minute < 0 || minute > 59) return false;
    if (second < 0 || second > 59) return false;
    
    // Create date and verify it didn't roll over
    const parsed = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    if (isNaN(parsed.getTime())) return false;
    
    // Verify the components match exactly (no rollover)
    return parsed.getUTCFullYear() === year &&
           parsed.getUTCMonth() === month - 1 &&
           parsed.getUTCDate() === day &&
           parsed.getUTCHours() === hour &&
           parsed.getUTCMinutes() === minute &&
           parsed.getUTCSeconds() === second;
  } catch {
    return false;
  }
}, "Must be valid UTC timestamp (no calendar rollover allowed)");

/**
 * Enhanced Hours of Rest day validation (0-1 for each hour, no defaults to catch malformed payloads)
 */
export const horDaySchema = z.object({
  date: utcDateSchema,
  h0: z.number().int().min(0).max(1),
  h1: z.number().int().min(0).max(1),
  h2: z.number().int().min(0).max(1),
  h3: z.number().int().min(0).max(1),
  h4: z.number().int().min(0).max(1),
  h5: z.number().int().min(0).max(1),
  h6: z.number().int().min(0).max(1),
  h7: z.number().int().min(0).max(1),
  h8: z.number().int().min(0).max(1),
  h9: z.number().int().min(0).max(1),
  h10: z.number().int().min(0).max(1),
  h11: z.number().int().min(0).max(1),
  h12: z.number().int().min(0).max(1),
  h13: z.number().int().min(0).max(1),
  h14: z.number().int().min(0).max(1),
  h15: z.number().int().min(0).max(1),
  h16: z.number().int().min(0).max(1),
  h17: z.number().int().min(0).max(1),
  h18: z.number().int().min(0).max(1),
  h19: z.number().int().min(0).max(1),
  h20: z.number().int().min(0).max(1),
  h21: z.number().int().min(0).max(1),
  h22: z.number().int().min(0).max(1),
  h23: z.number().int().min(0).max(1),
});

/**
 * Enhanced HoR sheet metadata validation with strict month/year constraints
 */
export const horSheetMetaSchema = z.object({
  vessel_id: z.string().min(1, "Vessel ID is required"),
  crew_id: z.string().min(1, "Crew ID is required"),
  crew_name: z.string().min(1, "Crew name is required"),
  rank: z.string().min(1, "Rank is required"),
  month: z.enum([
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
  ], {
    errorMap: () => ({ message: "Month must be uppercase full month name (e.g., 'JANUARY')" })
  }),
  year: z.number().int()
    .min(new Date().getFullYear() - 1, `Year must be ${new Date().getFullYear() - 1} or later`)
    .max(new Date().getFullYear() + 1, `Year must be ${new Date().getFullYear() + 1} or earlier`)
});

/**
 * Enhanced HoR import payload validation
 */
export const horImportSchema = z.object({
  sheet: horSheetMetaSchema,
  rows: z.array(horDaySchema).min(1, "At least one rest day required").max(31, "Maximum 31 days per month")
});

/**
 * Ingest signal validation (for telemetry)
 */
export const ingestSignalSchema = z.object({
  src: z.string().min(1, "Signal source is required"),
  sig: z.string().min(1, "Signal name is required"),
  value: z.number().optional(),
  unit: z.string().optional()
});

/**
 * Enhanced telemetry payload validation
 */
export const ingestPayloadSchema = z.object({
  vessel: z.string().min(1, "Vessel identifier is required"),
  ts: z.number().int().positive("Timestamp must be positive epoch seconds"),
  signals: z.array(ingestSignalSchema).min(1, "At least one signal required")
});

/**
 * Request validation helpers
 */
export const requestIdSchema = z.string().min(1, "Request ID is required");
export const idempotencyKeySchema = z.string().min(1, "Idempotency key is required");
export const vesselIdSchema = z.string().min(1, "Vessel ID is required");
export const crewIdSchema = z.string().min(1, "Crew ID is required");

/**
 * Enhanced Query Parameter Validation Schemas
 * These replace unsafe 'as string' casts and manual parsing throughout the API
 */

// Common Equipment & Marine Entity Filters
export const equipmentIdQuerySchema = z.object({
  equipmentId: z.string().min(1, "Equipment ID is required")
});

export const optionalEquipmentIdQuerySchema = z.object({
  equipmentId: z.string().min(1, "Equipment ID must be non-empty").optional()
});

export const vesselQuerySchema = z.object({
  vessel_id: z.string().min(1, "Vessel ID must be non-empty").optional(),
  org_id: z.string().min(1, "Organization ID must be non-empty").optional()
});

export const crewQuerySchema = z.object({
  crew_id: z.string().min(1, "Crew ID must be non-empty").optional(),
  vessel_id: z.string().min(1, "Vessel ID must be non-empty").optional()
});

// Time Range & Period Queries
export const timeRangeQuerySchema = z.object({
  dateFrom: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: "dateFrom must be a valid date"
  }),
  dateTo: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: "dateTo must be a valid date"
  }),
  hours: z.string().optional().transform((val) => val ? parseInt(val) : 24).pipe(
    z.number().int().min(1).max(8760, "Hours must be between 1 and 8760 (1 year)")
  ),
  days: z.string().optional().transform((val) => val ? parseInt(val) : 30).pipe(
    z.number().int().min(1).max(365, "Days must be between 1 and 365")
  ),
  months: z.string().optional().transform((val) => val ? parseInt(val) : 12).pipe(
    z.number().int().min(1).max(60, "Months must be between 1 and 60")
  )
});

// Marine Hours of Rest Specific Queries
export const horQuerySchema = z.object({
  crew_id: z.string().min(1, "Crew ID is required"),
  year: z.string().transform((val) => parseInt(val)).pipe(
    z.number().int().min(2020).max(2030, "Year must be between 2020 and 2030")
  ),
  month: z.enum([
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
  ])
});

// Advanced Range Query (Task 14 implementation)
export const rangeQuerySchema = z.object({
  vesselId: z.string().min(1, "Vessel ID is required").optional(),
  startDate: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: "startDate must be a valid ISO date string"
  }),
  endDate: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: "endDate must be a valid ISO date string"
  }),
  complianceFilter: z.string().optional().transform((val) => val === 'true' ? true : val === 'false' ? false : undefined)
});

// Status & Type Filtering
export const statusQuerySchema = z.object({
  status: z.enum(['open', 'in_progress', 'completed', 'cancelled', 'scheduled']).optional(),
  type: z.enum(['preventive', 'corrective', 'predictive', 'all', 'fleet', 'health', 'maintenance', 'workorders', 'telemetry']).optional(),
  costType: z.enum(['labor', 'parts', 'equipment', 'downtime']).optional(),
  priority: z.string().optional().transform((val) => val ? parseInt(val) : undefined).pipe(
    z.number().int().min(1).max(3, "Priority must be 1, 2, or 3").optional()
  )
});

// Telemetry & Analytics Queries  
export const telemetryQuerySchema = z.object({
  equipmentId: z.string().min(1, "Equipment ID is required").optional(),
  sensorType: z.string().min(1, "Sensor type is required").optional(),
  hours: z.string().optional().transform((val) => val ? parseInt(val) : 24).pipe(
    z.number().int().min(1).max(8760, "Hours must be between 1 and 8760")
  ),
  threshold: z.string().optional().transform((val) => val ? parseFloat(val) : 2.0).pipe(
    z.number().min(0.1).max(10.0, "Threshold must be between 0.1 and 10.0")
  )
});

// Pagination & Limits
export const paginationQuerySchema = z.object({
  limit: z.string().optional().transform((val) => val ? parseInt(val) : 100).pipe(
    z.number().int().min(1).max(1000, "Limit must be between 1 and 1000")
  ),
  offset: z.string().optional().transform((val) => val ? parseInt(val) : 0).pipe(
    z.number().int().min(0, "Offset must be non-negative")
  )
});

//================================================================
// Sensor Configuration System (per-sensor config with scaling, validation, EMA)
//================================================================

export const sensorConfigurations = pgTable("sensor_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  equipmentId: text("equipment_id").notNull(),
  sensorType: text("sensor_type").notNull(), // matches equipmentTelemetry.sensorType
  enabled: boolean("enabled").default(true),
  sampleRateHz: real("sample_rate_hz"), // target sampling rate
  gain: real("gain").default(1.0), // scaling multiplier 
  offset: real("offset").default(0.0), // scaling offset
  deadband: real("deadband").default(0.0), // minimum change to record
  minValid: real("min_valid"), // validation range minimum
  maxValid: real("max_valid"), // validation range maximum
  warnLo: real("warn_lo"), // warning threshold (low)
  warnHi: real("warn_hi"), // warning threshold (high)
  critLo: real("crit_lo"), // critical threshold (low) 
  critHi: real("crit_hi"), // critical threshold (high)
  hysteresis: real("hysteresis").default(0.0), // threshold hysteresis to prevent flapping
  emaAlpha: real("ema_alpha"), // exponential moving average alpha (0-1)
  targetUnit: text("target_unit"), // desired unit for this sensor
  notes: text("notes"), // user notes/description
  // Status detection configuration
  expectedIntervalMs: integer("expected_interval_ms"), // expected telemetry interval in milliseconds (null = use default 5min)
  graceMultiplier: real("grace_multiplier").default(2.0), // multiplier for offline threshold (2.0 = 2x expected interval)
  // Conflict resolution: optimistic locking
  version: integer("version").default(1),
  lastModifiedBy: varchar("last_modified_by", { length: 255 }),
  lastModifiedDevice: varchar("last_modified_device", { length: 255 }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  // Unique constraint to prevent duplicate configurations
  uniqueSensorConfig: sql`UNIQUE (equipment_id, sensor_type, org_id)`,
}));

export const sensorStates = pgTable("sensor_states", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  equipmentId: text("equipment_id").notNull(),
  sensorType: text("sensor_type").notNull(), // matches equipmentTelemetry.sensorType
  lastValue: real("last_value"), // last processed value (after scaling)
  ema: real("ema"), // current exponential moving average
  lastTs: timestamp("last_ts", { mode: "date" }), // timestamp of last reading
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  // Unique constraint for upsert operations
  uniqueSensorState: sql`UNIQUE (equipment_id, sensor_type, org_id)`,
}));

// Sensor configuration types
export const insertSensorConfigSchema = createInsertSchema(sensorConfigurations).omit({
  id: true,
  orgId: true, 
  createdAt: true,
  updatedAt: true,
});

export const insertSensorStateSchema = createInsertSchema(sensorStates).omit({
  id: true,
  orgId: true,
  updatedAt: true,
});

export type SensorConfiguration = typeof sensorConfigurations.$inferSelect;
export type InsertSensorConfiguration = z.infer<typeof insertSensorConfigSchema>;
export type SensorState = typeof sensorStates.$inferSelect;
export type InsertSensorState = z.infer<typeof insertSensorStateSchema>;

// Storage configuration tables for object storage and operational DB management
export const storageConfig = pgTable("storage_config", {
  id: varchar("id").primaryKey(),
  kind: varchar("kind", { length: 20 }).notNull(), // 'object' or 'export'
  provider: varchar("provider", { length: 50 }).notNull(), // s3|gcs|azure_blob|b2|webdav|sftp|dropbox|onedrive|gdrive
  isDefault: boolean("is_default").default(false),
  mirror: boolean("mirror").default(false), // send exports to multiple targets when true
  cfg: jsonb("cfg").notNull().$type<Record<string, any>>(), // credentials and options
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

export const opsDbStaged = pgTable("ops_db_staged", {
  id: integer("id").primaryKey().default(1),
  url: text("url"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

// Storage configuration schemas
export const insertStorageConfigSchema = createInsertSchema(storageConfig).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertOpsDbStagedSchema = createInsertSchema(opsDbStaged).omit({
  id: true,
  createdAt: true,
});

export type StorageConfig = typeof storageConfig.$inferSelect;
export type InsertStorageConfig = z.infer<typeof insertStorageConfigSchema>;
export type OpsDbStaged = typeof opsDbStaged.$inferSelect;
export type InsertOpsDbStaged = z.infer<typeof insertOpsDbStagedSchema>;

// Database hardening types
export type DbSchemaVersion = typeof dbSchemaVersion.$inferSelect;
export type InsertDbSchemaVersion = z.infer<typeof insertDbSchemaVersionSchema>;

export type TelemetryRetentionPolicy = typeof telemetryRetentionPolicies.$inferSelect;
export type InsertTelemetryRetentionPolicy = z.infer<typeof insertTelemetryRetentionPolicySchema>;

export type SensorType = typeof sensorTypes.$inferSelect;
export type InsertSensorType = z.infer<typeof insertSensorTypeSchema>;

export type SensorMapping = typeof sensorMapping.$inferSelect;
export type InsertSensorMapping = z.infer<typeof insertSensorMappingSchema>;

export type DiscoveredSignal = typeof discoveredSignals.$inferSelect;
export type InsertDiscoveredSignal = z.infer<typeof insertDiscoveredSignalSchema>;

export type RequestIdempotency = typeof requestIdempotency.$inferSelect;
export type InsertRequestIdempotency = z.infer<typeof insertRequestIdempotencySchema>;

export type TelemetryRollup = typeof telemetryRollups.$inferSelect;
export type InsertTelemetryRollup = z.infer<typeof insertTelemetryRollupSchema>;

// Combined Query Schemas for Complex Endpoints
export const equipmentAnalyticsQuerySchema = equipmentIdQuerySchema.merge(timeRangeQuerySchema).merge(statusQuerySchema);
export const fleetManagementQuerySchema = vesselQuerySchema.merge(timeRangeQuerySchema).merge(paginationQuerySchema);
export const maintenanceQuerySchema = equipmentIdQuerySchema.merge(timeRangeQuerySchema).merge(statusQuerySchema);
export const performanceQuerySchema = equipmentIdQuerySchema.merge(timeRangeQuerySchema).merge(telemetryQuerySchema.partial());

// Insights and Analytics Engine - Fleet KPI Snapshots and Risk Analysis
export const insightSnapshots = pgTable("insight_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  scope: text("scope").notNull(), // 'fleet' or specific vesselId
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  kpi: jsonb("kpi").notNull().$type<{
    fleet: { 
      vessels: number; 
      signalsMapped: number; 
      signalsDiscovered: number; 
      dq7d: number; 
      latestGapVessels: string[]; 
    };
    perVessel: Record<string, { 
      lastTs: string | null; 
      dq7d: number; 
      totalSignals: number; 
      stale: boolean; 
    }>;
  }>(),
  risks: jsonb("risks").notNull().$type<{ 
    critical: string[]; 
    warnings: string[]; 
  }>(),
  recommendations: jsonb("recommendations").notNull().$type<string[]>(),
  anomalies: jsonb("anomalies").notNull().$type<Array<{
    vesselId: string;
    src: string;
    sig: string;
    kind: string;
    severity: string;
    tStart: string;
    tEnd: string;
  }>>(),
  compliance: jsonb("compliance").notNull().$type<{ 
    horViolations7d?: number; 
    notes?: string[]; 
  }>(),
});

export const insightReports = pgTable("insight_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  scope: text("scope").notNull(),
  periodStart: timestamp("period_start", { mode: "date" }).notNull(),
  periodEnd: timestamp("period_end", { mode: "date" }).notNull(),
  snapshotId: varchar("snapshot_id").references(() => insightSnapshots.id, { onDelete: "set null" }),
  llmSummary: text("llm_summary"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

// Insights schemas
export const insertInsightSnapshotSchema = createInsertSchema(insightSnapshots).omit({
  id: true,
  orgId: true,
  createdAt: true,
});

export const insertInsightReportSchema = createInsertSchema(insightReports).omit({
  id: true,
  orgId: true,
  createdAt: true,
});

export type InsightSnapshot = typeof insightSnapshots.$inferSelect;
export type InsertInsightSnapshot = z.infer<typeof insertInsightSnapshotSchema>;
export type InsightReport = typeof insightReports.$inferSelect;
export type InsertInsightReport = z.infer<typeof insertInsightReportSchema>;

// Export types for enhanced validation
// Beast Mode Extension Tables (Phase 1) - All features disabled by default
export const vibrationAnalysis = pgTable("vibration_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  equipmentId: varchar("equipment_id").notNull().references(() => equipment.id),
  sampleRate: real("sample_rate").notNull(), // Hz
  shaftRpm: real("shaft_rpm"), // optional shaft speed
  windowType: text("window_type").notNull().default("hann"), // FFT window
  rawData: jsonb("raw_data").notNull(), // acceleration time series
  spectrumData: jsonb("spectrum_data").notNull(), // frequency domain results
  isoBands: jsonb("iso_bands").notNull(), // ISO frequency band RMS values
  faultBands: jsonb("fault_bands"), // bearing/gear fault bands
  overallRms: real("overall_rms"), // overall RMS acceleration
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const weibullEstimates = pgTable("weibull_estimates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  equipmentId: varchar("equipment_id").notNull().references(() => equipment.id),
  currentAgeDays: real("current_age_days").notNull(),
  sampleData: jsonb("sample_data").notNull(), // historical failure times
  shapeParameter: real("shape_parameter").notNull(), // Beta parameter
  scaleParameter: real("scale_parameter").notNull(), // Eta parameter  
  fittingMethod: text("fitting_method").notNull(), // Method used for fitting
  rulMedianDays: real("rul_median_days").notNull(), // Remaining useful life in days
  recommendation: text("recommendation"), // immediate, urgent, scheduled, routine
  analysisConfig: jsonb("analysis_config"), // analysis configuration
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const inventoryParts = pgTable("inventory_parts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  partNumber: text("part_number").notNull(),
  description: text("description").notNull(),
  currentStock: integer("current_stock").notNull().default(0),
  minStockLevel: integer("min_stock_level").notNull(),
  maxStockLevel: integer("max_stock_level").notNull(),
  leadTimeDays: integer("lead_time_days").notNull(),
  unitCost: real("unit_cost"),
  supplier: text("supplier"),
  lastUsage30d: integer("last_usage_30d").default(0), // rolling 30-day usage
  riskLevel: text("risk_level").notNull().default("low"), // low, medium, high
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

export const beastModeConfig = pgTable("beast_mode_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  featureName: text("feature_name").notNull(), // vibration_analysis, weibull_rul, lp_optimizer, etc.
  enabled: boolean("enabled").default(false), // ALL FEATURES DISABLED BY DEFAULT
  configuration: jsonb("configuration"), // feature-specific config
  lastModifiedBy: text("last_modified_by"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  uniqueOrgFeature: unique().on(table.orgId, table.featureName),
}));

// PdM Pack v1 - Statistical baseline monitoring with μ±kσ thresholds
export const pdmBaseline = pgTable("pdm_baseline", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  vesselName: text("vessel_name").notNull(), // vessel identifier
  assetId: text("asset_id").notNull(), // e.g., BEARING_PORT_AFT, PUMP_MAIN
  assetClass: text("asset_class").notNull(), // 'bearing' | 'pump'
  feature: text("feature").notNull(), // 'rms', 'kurtosis', 'env_rms', 'iso_10_100', 'order_1x', 'flow_eff', etc.
  mu: real("mu").notNull(), // statistical mean
  sigma: real("sigma").notNull(), // statistical standard deviation
  n: integer("n").notNull().default(0), // sample count
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  uniqueVesselAssetFeature: unique().on(table.orgId, table.vesselName, table.assetId, table.feature),
}));

export const pdmAlerts = pgTable("pdm_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  at: timestamp("at", { mode: "date" }).defaultNow(),
  vesselName: text("vessel_name").notNull(),
  assetId: text("asset_id").notNull(),
  assetClass: text("asset_class").notNull(), // 'bearing' | 'pump'
  feature: text("feature").notNull(), // feature that triggered alert
  value: real("value"), // actual feature value
  scoreZ: real("score_z"), // Z-score deviation from baseline
  severity: text("severity"), // 'info' | 'warn' | 'high'
  explain: jsonb("explain"), // analysis details, why the alert was generated
}, (table) => ({
  vesselAtIndex: sql`CREATE INDEX IF NOT EXISTS idx_pdm_alerts_vat ON ${table} (${table.orgId}, ${table.vesselName}, ${table.at} DESC)`,
}));


// Beast Mode Insert Schemas
export const insertVibrationAnalysisSchema = createInsertSchema(vibrationAnalysis).omit({
  id: true,
  orgId: true,
  createdAt: true,
});

export const insertWeibullEstimateSchema = createInsertSchema(weibullEstimates).omit({
  id: true,
  orgId: true,
  createdAt: true,
});

export const insertInventoryPartSchema = createInsertSchema(inventoryParts).omit({
  id: true,
  orgId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBeastModeConfigSchema = createInsertSchema(beastModeConfig).omit({
  id: true,
  orgId: true,
  createdAt: true,
  updatedAt: true,
});


// PdM Pack Insert Schemas
export const insertPdmBaselineSchema = createInsertSchema(pdmBaseline).omit({
  id: true,
  orgId: true,
  updatedAt: true,
});

export const insertPdmAlertSchema = createInsertSchema(pdmAlerts).omit({
  id: true,
  orgId: true,
  at: true,
});

// PdM Pack API Request Validation Schemas
export const pdmOrgIdHeaderSchema = z.object({
  "x-org-id": z.string().min(1, "Organization ID is required")
});

export const pdmBaselineUpdateSchema = z.object({
  vesselName: z.string().min(1, "Vessel name is required"),
  assetId: z.string().min(1, "Asset ID is required"),
  assetClass: z.enum(["bearing", "pump"], {
    errorMap: () => ({ message: "Asset class must be 'bearing' or 'pump'" })
  }),
  features: z.record(z.string(), z.number().finite()).refine(
    (features) => Object.keys(features).length > 0,
    { message: "At least one feature required" }
  )
});

export const pdmBearingAnalysisSchema = z.object({
  vesselName: z.string().min(1, "Vessel name is required"),
  assetId: z.string().min(1, "Asset ID is required"),
  fs: z.number().positive("Sampling frequency must be positive"),
  rpm: z.number().positive("RPM must be positive").optional(),
  series: z.array(z.number().finite()).min(10, "At least 10 data points required"),
  spectrum: z.object({
    freq: z.array(z.number()),
    mag: z.array(z.number())
  }).optional(),
  autoBaseline: z.boolean().optional().default(false)
});

export const pdmPumpAnalysisSchema = z.object({
  vesselName: z.string().min(1, "Vessel name is required"),
  assetId: z.string().min(1, "Asset ID is required"),
  flow: z.array(z.number().finite()).optional(),
  pressure: z.array(z.number().finite()).optional(),
  current: z.array(z.number().finite()).optional(),
  fs: z.number().positive("Sampling frequency must be positive").optional(),
  vibSeries: z.array(z.number().finite()).optional(),
  autoBaseline: z.boolean().optional().default(false)
}).refine(
  (data) => data.flow || data.pressure || data.current || data.vibSeries,
  { message: "At least one data source required: flow, pressure, current, or vibSeries" }
);

export const pdmAlertsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(1000).optional().default(100)
});

// Oil Analysis - Condition-based maintenance through lubricant monitoring
export const oilAnalysis = pgTable("oil_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  equipmentId: varchar("equipment_id").notNull().references(() => equipment.id),
  sampleDate: timestamp("sample_date", { mode: "date" }).notNull(),
  sampleNumber: text("sample_number").notNull(), // Lab reference number
  oilType: text("oil_type").notNull(), // hydraulic, engine, gear, etc.
  oilGrade: text("oil_grade"), // SAE 40, ISO VG 68, etc.
  serviceHours: real("service_hours"), // hours on oil since last change
  
  // Physical properties
  viscosity40C: real("viscosity_40c"), // cSt at 40°C
  viscosity100C: real("viscosity_100c"), // cSt at 100°C
  viscosityIndex: real("viscosity_index"), // VI
  density15C: real("density_15c"), // g/cm³ at 15°C
  flashPoint: real("flash_point"), // °C
  pourPoint: real("pour_point"), // °C
  
  // Chemical properties
  acidNumber: real("acid_number"), // mg KOH/g
  baseNumber: real("base_number"), // mg KOH/g (for alkaline oils)
  waterContent: real("water_content"), // % by volume
  fuelDilution: real("fuel_dilution"), // % by volume
  oxidation: real("oxidation"), // Abs/cm (FTIR)
  nitration: real("nitration"), // Abs/cm (FTIR)
  sulfation: real("sulfation"), // Abs/cm (FTIR)
  
  // Elemental analysis (wear metals) - ppm
  iron: real("iron"),
  chromium: real("chromium"),
  nickel: real("nickel"),
  aluminum: real("aluminum"),
  copper: real("copper"),
  lead: real("lead"),
  tin: real("tin"),
  silver: real("silver"),
  molybdenum: real("molybdenum"),
  titanium: real("titanium"),
  
  // Additives - ppm
  calcium: real("calcium"),
  magnesium: real("magnesium"),
  zinc: real("zinc"),
  phosphorus: real("phosphorus"),
  sulfur: real("sulfur"),
  barium: real("barium"),
  boron: real("boron"),
  
  // Contaminants - ppm
  silicon: real("silicon"), // dirt/dust
  sodium: real("sodium"), // coolant
  potassium: real("potassium"), // coolant
  
  // Particle counts
  iso4406: text("iso_4406"), // e.g., "18/16/13"
  particleCount4: integer("particle_count_4"), // >4μm per mL
  particleCount6: integer("particle_count_6"), // >6μm per mL
  particleCount14: integer("particle_count_14"), // >14μm per mL
  particleCount21: integer("particle_count_21"), // >21μm per mL
  particleCount38: integer("particle_count_38"), // >38μm per mL
  particleCount70: integer("particle_count_70"), // >70μm per mL
  
  // Overall assessment
  condition: text("condition").notNull().default("normal"), // normal, marginal, critical
  recommendations: text("recommendations"),
  labComments: text("lab_comments"),
  analysisMetadata: jsonb("analysis_metadata"), // Additional lab data
  
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// Wear Particle Analysis - Ferrography and particle morphology
export const wearParticleAnalysis = pgTable("wear_particle_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  equipmentId: varchar("equipment_id").notNull().references(() => equipment.id),
  oilAnalysisId: varchar("oil_analysis_id").references(() => oilAnalysis.id), // Link to oil sample
  analysisDate: timestamp("analysis_date", { mode: "date" }).notNull(),
  sampleNumber: text("sample_number").notNull(),
  
  // Ferrography results
  dl: real("dl"), // Direct read large particles (>5μm)
  ds: real("ds"), // Direct read small particles (2-5μm)
  pqIndex: real("pq_index"), // Particle quantity index (DL+DS)
  wpc: real("wpc"), // Wear particle concentration
  severity: text("severity").notNull().default("normal"), // normal, moderate, severe
  
  // Particle morphology classification
  cuttingParticles: real("cutting_particles"), // % of total wear particles
  slidingParticles: real("sliding_particles"), // % of total wear particles
  fatigueParticles: real("fatigue_particles"), // % of total wear particles
  sphericalParticles: real("spherical_particles"), // % of total wear particles
  fibersContaminants: real("fibers_contaminants"), // % of contaminant particles
  
  // Particle composition
  ferroMagnetic: real("ferro_magnetic"), // % ferrous particles
  nonFerrous: real("non_ferrous"), // % non-ferrous particles
  
  // Size distribution
  largeParticles: real("large_particles"), // >15μm count
  mediumParticles: real("medium_particles"), // 5-15μm count
  smallParticles: real("small_particles"), // 2-5μm count
  
  // Specific component indicators
  gearWear: real("gear_wear"), // Gear tooth wear indicator
  bearingWear: real("bearing_wear"), // Bearing wear indicator
  pumpWear: real("pump_wear"), // Pump impeller/casing wear
  cylinderWear: real("cylinder_wear"), // Engine cylinder wear
  
  // Analysis interpretation
  wearMode: text("wear_mode"), // adhesive, abrasive, fatigue, corrosive
  wearSeverity: text("wear_severity").notNull().default("normal"), // normal, moderate, high, severe
  suspectedComponent: text("suspected_component"), // component likely wearing
  recommendations: text("recommendations"),
  analystComments: text("analyst_comments"),
  
  // Microscopy metadata
  magnification: text("magnification"), // 200x, 500x, etc.
  analysisMethod: text("analysis_method").notNull().default("ferrography"), // ferrography, SEM, optical
  imageUrls: text("image_urls").array(), // URLs to microscopy images
  analysisMetadata: jsonb("analysis_metadata"),
  
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// Condition Monitoring Summary - Aggregated condition assessment
export const conditionMonitoring = pgTable("condition_monitoring", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  equipmentId: varchar("equipment_id").notNull().references(() => equipment.id),
  assessmentDate: timestamp("assessment_date", { mode: "date" }).notNull(),
  
  // Condition monitoring scores (0-100, 100 = excellent)
  oilConditionScore: real("oil_condition_score"), // Based on oil analysis
  wearConditionScore: real("wear_condition_score"), // Based on wear particle analysis
  vibrationScore: real("vibration_score"), // From vibration analysis
  thermalScore: real("thermal_score"), // Temperature-based assessment
  overallConditionScore: real("overall_condition_score").notNull(), // Weighted average
  
  // Trending analysis
  trend: text("trend").notNull().default("stable"), // improving, stable, degrading
  trendConfidence: real("trend_confidence"), // 0-1, confidence in trend assessment
  
  // Risk assessment
  failureRisk: text("failure_risk").notNull().default("low"), // low, medium, high, critical
  estimatedTtf: real("estimated_ttf"), // Estimated time to failure (days)
  confidenceInterval: real("confidence_interval"), // CI for TTF prediction
  
  // Maintenance recommendations
  maintenanceAction: text("maintenance_action"), // monitor, inspect, service, repair, replace
  maintenanceUrgency: text("maintenance_urgency").notNull().default("routine"), // routine, urgent, immediate
  maintenanceWindow: real("maintenance_window"), // Recommended maintenance window (days)
  costEstimate: real("cost_estimate"), // Estimated maintenance cost
  
  // Supporting data references
  lastOilAnalysisId: varchar("last_oil_analysis_id").references(() => oilAnalysis.id),
  lastWearAnalysisId: varchar("last_wear_analysis_id").references(() => wearParticleAnalysis.id),
  lastVibrationAnalysisId: varchar("last_vibration_analysis_id").references(() => vibrationAnalysis.id),
  
  // Analysis metadata
  assessmentMethod: text("assessment_method").notNull().default("combined"), // oil, wear, vibration, combined
  analysisSummary: text("analysis_summary"), // Key findings summary
  recommendations: text("recommendations"),
  analystId: varchar("analyst_id"), // Who performed the assessment
  analysisMetadata: jsonb("analysis_metadata"),
  
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// Oil Change Records - Track oil service history for condition monitoring context
export const oilChangeRecords = pgTable("oil_change_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  equipmentId: varchar("equipment_id").notNull().references(() => equipment.id),
  changeDate: timestamp("change_date", { mode: "date" }).notNull(),
  serviceHours: real("service_hours").notNull(), // Equipment hours at change
  
  // Oil details
  oilType: text("oil_type").notNull(),
  oilGrade: text("oil_grade").notNull(),
  quantityLiters: real("quantity_liters").notNull(),
  oilManufacturer: text("oil_manufacturer"),
  batchNumber: text("batch_number"),
  
  // Service details
  changeReason: text("change_reason").notNull(), // scheduled, contamination, analysis_recommendation
  filterChanged: boolean("filter_changed").default(true),
  filterType: text("filter_type"),
  laborHours: real("labor_hours"),
  totalCost: real("total_cost"),
  
  // Pre-change condition
  preChangeCondition: text("pre_change_condition"), // oil condition before change
  draineOilAnalysisId: varchar("drained_oil_analysis_id").references(() => oilAnalysis.id),
  
  // Service metadata
  technicianId: varchar("technician_id"),
  workOrderId: varchar("work_order_id").references(() => workOrders.id),
  serviceNotes: text("service_notes"),
  
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// Zod schemas for condition monitoring
export const insertOilAnalysisSchema = createInsertSchema(oilAnalysis).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWearParticleAnalysisSchema = createInsertSchema(wearParticleAnalysis).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConditionMonitoringSchema = createInsertSchema(conditionMonitoring).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOilChangeRecordSchema = createInsertSchema(oilChangeRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Beast Mode Types
export type VibrationAnalysis = typeof vibrationAnalysis.$inferSelect;
export type InsertVibrationAnalysis = z.infer<typeof insertVibrationAnalysisSchema>;
export type WeibullEstimate = typeof weibullEstimates.$inferSelect;
export type InsertWeibullEstimate = z.infer<typeof insertWeibullEstimateSchema>;
export type InventoryPart = typeof inventoryParts.$inferSelect;
export type InsertInventoryPart = z.infer<typeof insertInventoryPartSchema>;
export type BeastModeConfig = typeof beastModeConfig.$inferSelect;
export type InsertBeastModeConfig = z.infer<typeof insertBeastModeConfigSchema>;


// PdM Pack Types
export type PdmBaseline = typeof pdmBaseline.$inferSelect;
export type InsertPdmBaseline = z.infer<typeof insertPdmBaselineSchema>;
export type PdmAlert = typeof pdmAlerts.$inferSelect;
export type InsertPdmAlert = z.infer<typeof insertPdmAlertSchema>;

// Condition Monitoring Types
export type OilAnalysis = typeof oilAnalysis.$inferSelect;
export type InsertOilAnalysis = z.infer<typeof insertOilAnalysisSchema>;
export type WearParticleAnalysis = typeof wearParticleAnalysis.$inferSelect;
export type InsertWearParticleAnalysis = z.infer<typeof insertWearParticleAnalysisSchema>;
export type ConditionMonitoring = typeof conditionMonitoring.$inferSelect;
export type InsertConditionMonitoring = z.infer<typeof insertConditionMonitoringSchema>;
export type OilChangeRecord = typeof oilChangeRecords.$inferSelect;
export type InsertOilChangeRecord = z.infer<typeof insertOilChangeRecordSchema>;


export type HorDay = z.infer<typeof horDaySchema>;
export type HorSheetMeta = z.infer<typeof horSheetMetaSchema>;
export type HorImport = z.infer<typeof horImportSchema>;
export type IngestSignal = z.infer<typeof ingestSignalSchema>;
export type IngestPayload = z.infer<typeof ingestPayloadSchema>;

// ========================================
// Phase 1: Real-time Data Ingestion Schema
// ========================================

// MQTT device management for sensor networks
export const mqttDevices = pgTable("mqtt_devices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deviceId: varchar("device_id").references(() => devices.id).notNull(),
  mqttClientId: varchar("mqtt_client_id").unique().notNull(),
  brokerEndpoint: varchar("broker_endpoint").notNull(),
  topicPrefix: varchar("topic_prefix").notNull(),
  qosLevel: integer("qos_level").default(1),
  lastSeen: timestamp("last_seen", { withTimezone: true }),
  connectionStatus: varchar("connection_status").default("disconnected"),
  credentials: jsonb("credentials"), // Encrypted MQTT credentials
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

// Time-series aggregated telemetry for analytics
export const telemetryAggregates = pgTable("telemetry_aggregates", {
  id: serial("id").primaryKey(),
  orgId: varchar("org_id").notNull().default("default-org-id"),
  equipmentId: varchar("equipment_id").notNull(),
  sensorType: varchar("sensor_type").notNull(),
  timeWindow: varchar("time_window").notNull(), // '1m', '5m', '15m', '1h', '6h', '1d'
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  windowEnd: timestamp("window_end", { withTimezone: true }).notNull(),
  avgValue: real("avg_value"),
  minValue: real("min_value"),
  maxValue: real("max_value"),
  stdDev: real("std_dev"),
  sampleCount: integer("sample_count"),
  anomalyScore: real("anomaly_score"), // ML-computed anomaly score
  qualityScore: real("quality_score"), // Data quality assessment
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (table) => ({
  equipmentTimeIdx: index("idx_telemetry_agg_equipment_time").on(table.equipmentId, table.windowStart),
  orgTimeIdx: index("idx_telemetry_agg_org_time").on(table.orgId, table.windowStart)
}));

// Real-time data quality validation results
export const dataQualityMetrics = pgTable("data_quality_metrics", {
  id: serial("id").primaryKey(),
  equipmentId: varchar("equipment_id").notNull(),
  sensorType: varchar("sensor_type").notNull(),
  validationTimestamp: timestamp("validation_timestamp", { withTimezone: true }).defaultNow(),
  completenessScore: real("completeness_score"), // % of expected data points
  consistencyScore: real("consistency_score"), // Range/pattern consistency
  timelinessScore: real("timeliness_score"), // Data arrival timing
  accuracyScore: real("accuracy_score"), // Cross-validation accuracy
  overallQuality: real("overall_quality"), // Composite quality score
  issuesDetected: jsonb("issues_detected"), // Array of quality issues
  recommendedActions: jsonb("recommended_actions"),
  metadata: jsonb("metadata")
});

// ========================================
// Phase 2: Advanced Analytics Schema
// ========================================

// ML model management and versioning
export const mlModels = pgTable("ml_models", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id).default("default-org-id"),
  name: varchar("name").notNull(),
  version: varchar("version").notNull(),
  modelType: varchar("model_type").notNull(), // 'anomaly_detection', 'failure_prediction', 'threshold_optimization'
  targetEquipmentType: varchar("target_equipment_type"), // 'pump', 'engine', 'bearing', etc.
  trainingDataFeatures: jsonb("training_data_features"),
  hyperparameters: jsonb("hyperparameters"),
  performance: jsonb("performance"), // accuracy, precision, recall, etc.
  modelArtifactPath: varchar("model_artifact_path"), // Path to serialized model
  status: varchar("status").default("training"), // 'training', 'active', 'deprecated'
  deployedAt: timestamp("deployed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (table) => ({
  nameVersionIdx: index("idx_ml_models_name_version").on(table.name, table.version),
  orgIdx: index("idx_ml_models_org").on(table.orgId)
}));

// Anomaly detection results
export const anomalyDetections = pgTable("anomaly_detections", {
  id: serial("id").primaryKey(),
  orgId: varchar("org_id").notNull().default("default-org-id"),
  equipmentId: varchar("equipment_id").notNull(),
  sensorType: varchar("sensor_type").notNull(),
  detectionTimestamp: timestamp("detection_timestamp", { withTimezone: true }).defaultNow(),
  anomalyScore: real("anomaly_score").notNull(), // 0-1 anomaly confidence
  anomalyType: varchar("anomaly_type"), // 'statistical', 'pattern', 'trend', 'seasonal'
  severity: varchar("severity").notNull(), // 'low', 'medium', 'high', 'critical'
  detectedValue: real("detected_value"),
  expectedValue: real("expected_value"),
  deviation: real("deviation"),
  modelId: varchar("model_id").references(() => mlModels.id),
  contributingFactors: jsonb("contributing_factors"),
  recommendedActions: jsonb("recommended_actions"),
  acknowledgedBy: varchar("acknowledged_by"),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  // Outcome tracking for model improvement
  resolvedByWorkOrderId: varchar("resolved_by_work_order_id").references(() => workOrders.id),
  actualFailureOccurred: boolean("actual_failure_occurred"),
  outcomeLabel: varchar("outcome_label"), // 'true_positive', 'false_positive', 'true_negative', 'false_negative'
  outcomeVerifiedAt: timestamp("outcome_verified_at", { withTimezone: true }),
  outcomeVerifiedBy: varchar("outcome_verified_by"),
  metadata: jsonb("metadata")
}, (table) => ({
  equipmentTimeIdx: index("idx_anomaly_equipment_time").on(table.equipmentId, table.detectionTimestamp),
  severityIdx: index("idx_anomaly_severity").on(table.severity)
}));

// Failure prediction results
export const failurePredictions = pgTable("failure_predictions", {
  id: serial("id").primaryKey(),
  orgId: varchar("org_id").notNull().default("default-org-id"),
  equipmentId: varchar("equipment_id").notNull(),
  predictionTimestamp: timestamp("prediction_timestamp", { withTimezone: true }).defaultNow(),
  failureProbability: real("failure_probability").notNull(), // 0-1 probability
  predictedFailureDate: timestamp("predicted_failure_date", { withTimezone: true }),
  remainingUsefulLife: integer("remaining_useful_life"), // Days or hours
  confidenceInterval: jsonb("confidence_interval"), // {lower: number, upper: number}
  failureMode: varchar("failure_mode"), // 'wear', 'fatigue', 'overload', etc.
  riskLevel: varchar("risk_level").notNull(), // 'low', 'medium', 'high', 'critical'
  modelId: varchar("model_id").references(() => mlModels.id),
  inputFeatures: jsonb("input_features"), // Features used for prediction
  maintenanceRecommendations: jsonb("maintenance_recommendations"),
  costImpact: jsonb("cost_impact"), // Estimated costs
  // Outcome tracking for prediction accuracy
  resolvedByWorkOrderId: varchar("resolved_by_work_order_id").references(() => workOrders.id),
  actualFailureDate: timestamp("actual_failure_date", { withTimezone: true }),
  actualFailureMode: varchar("actual_failure_mode"),
  predictionAccuracy: real("prediction_accuracy"), // How accurate was the prediction (0-1)
  timeToFailureError: integer("time_to_failure_error"), // Difference between predicted and actual (days)
  outcomeLabel: varchar("outcome_label"), // 'accurate', 'early', 'late', 'false_alarm'
  outcomeVerifiedAt: timestamp("outcome_verified_at", { withTimezone: true }),
  outcomeVerifiedBy: varchar("outcome_verified_by"),
  metadata: jsonb("metadata")
}, (table) => ({
  equipmentRiskIdx: index("idx_failure_equipment_risk").on(table.equipmentId, table.riskLevel),
  predictionTimeIdx: index("idx_failure_prediction_time").on(table.predictionTimestamp)
}));

// Automated threshold optimization
export const thresholdOptimizations = pgTable("threshold_optimizations", {
  id: serial("id").primaryKey(),
  orgId: varchar("org_id").notNull().references(() => organizations.id).default("default-org-id"),
  equipmentId: varchar("equipment_id").notNull(),
  sensorType: varchar("sensor_type").notNull(),
  optimizationTimestamp: timestamp("optimization_timestamp", { withTimezone: true }).defaultNow(),
  currentThresholds: jsonb("current_thresholds"), // {warning: number, critical: number}
  optimizedThresholds: jsonb("optimized_thresholds"),
  improvementMetrics: jsonb("improvement_metrics"), // precision, recall, false positive rate
  optimizationMethod: varchar("optimization_method"), // 'statistical', 'ml_based', 'hybrid'
  validationResults: jsonb("validation_results"),
  appliedAt: timestamp("applied_at", { withTimezone: true }),
  performance: jsonb("performance"), // Post-application performance metrics
  metadata: jsonb("metadata")
}, (table) => ({
  equipmentTimeIdx: index("idx_threshold_opt_equipment_time").on(table.equipmentId, table.optimizationTimestamp),
  orgIdx: index("idx_threshold_opt_org").on(table.orgId)
}));

// Component degradation tracking for RUL prediction
export const componentDegradation = pgTable("component_degradation", {
  id: serial("id").primaryKey(),
  orgId: varchar("org_id").notNull().references(() => organizations.id).default("default-org-id"),
  equipmentId: varchar("equipment_id").notNull().references(() => equipment.id),
  componentType: varchar("component_type").notNull(), // 'bearing', 'seal', 'belt', 'filter', etc.
  measurementTimestamp: timestamp("measurement_timestamp", { withTimezone: true }).defaultNow(),
  degradationMetric: real("degradation_metric").notNull(), // Primary degradation indicator (0-100)
  degradationRate: real("degradation_rate"), // Rate of change per day
  vibrationLevel: real("vibration_level"), // mm/s RMS
  temperature: real("temperature"), // degrees Celsius
  oilCondition: real("oil_condition"), // 0-100 score
  acousticSignature: real("acoustic_signature"), // dB
  wearParticleCount: integer("wear_particle_count"),
  operatingHours: integer("operating_hours"), // Total operating hours at measurement
  cycleCount: integer("cycle_count"), // Number of operating cycles
  loadFactor: real("load_factor"), // Average load % during measurement period
  environmentConditions: jsonb("environment_conditions"), // Temperature, humidity, vibration environment
  trendAnalysis: jsonb("trend_analysis"), // {slope, acceleration, confidence}
  predictedFailureDate: timestamp("predicted_failure_date", { withTimezone: true }),
  confidenceScore: real("confidence_score"), // 0-1 confidence in prediction
  metadata: jsonb("metadata")
}, (table) => ({
  equipmentTimeIdx: index("idx_component_deg_equipment_time").on(table.equipmentId, table.measurementTimestamp),
  componentIdx: index("idx_component_deg_component").on(table.componentType)
}));

// Historical failure patterns for ML training
export const failureHistory = pgTable("failure_history", {
  id: serial("id").primaryKey(),
  orgId: varchar("org_id").notNull().references(() => organizations.id).default("default-org-id"),
  equipmentId: varchar("equipment_id").notNull().references(() => equipment.id),
  failureTimestamp: timestamp("failure_timestamp", { withTimezone: true }).notNull(),
  failureMode: varchar("failure_mode").notNull(), // 'wear', 'fatigue', 'overload', 'corrosion', etc.
  failureSeverity: varchar("failure_severity").notNull(), // 'minor', 'moderate', 'severe', 'catastrophic'
  rootCause: text("root_cause"),
  componentAffected: varchar("component_affected"),
  ageAtFailure: integer("age_at_failure"), // Operating hours at failure
  cyclesAtFailure: integer("cycles_at_failure"),
  priorWarnings: jsonb("prior_warnings"), // Array of warning signs before failure
  degradationHistory: jsonb("degradation_history"), // Historical degradation measurements
  environmentalFactors: jsonb("environmental_factors"),
  maintenanceHistory: jsonb("maintenance_history"), // Recent maintenance before failure
  repairCost: real("repair_cost"),
  downtimeHours: real("downtime_hours"),
  replacementPartsCost: real("replacement_parts_cost"),
  totalCost: real("total_cost"),
  wasPreventable: boolean("was_preventable"),
  preventabilityAnalysis: text("preventability_analysis"),
  lessonsLearned: text("lessons_learned"),
  workOrderId: varchar("work_order_id").references(() => workOrders.id),
  verifiedBy: varchar("verified_by"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (table) => ({
  equipmentFailureIdx: index("idx_failure_history_equipment").on(table.equipmentId, table.failureTimestamp),
  failureModeIdx: index("idx_failure_history_mode").on(table.failureMode),
  severityIdx: index("idx_failure_history_severity").on(table.failureSeverity)
}));

// ========================================
// ML/AI Enhancements: Model Performance & Feedback
// ========================================

// Model performance validation - tracks predictions vs actual outcomes
export const modelPerformanceValidations = pgTable("model_performance_validations", {
  id: serial("id").primaryKey(),
  orgId: varchar("org_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }).default("default-org-id"),
  modelId: varchar("model_id").notNull().references(() => mlModels.id, { onDelete: 'cascade' }),
  equipmentId: varchar("equipment_id").notNull().references(() => equipment.id, { onDelete: 'cascade' }),
  predictionId: integer("prediction_id"), // Polymorphic reference: can be failurePredictions.id or anomalyDetections.id - discriminated by predictionType
  predictionType: varchar("prediction_type").notNull(), // 'failure_prediction', 'anomaly_detection', 'health_classification'
  predictionTimestamp: timestamp("prediction_timestamp", { withTimezone: true }).notNull(),
  predictedOutcome: jsonb("predicted_outcome").notNull(), // {probability, date, severity, etc.}
  actualOutcome: jsonb("actual_outcome"), // {actualDate, actualSeverity, etc.}
  validatedAt: timestamp("validated_at", { withTimezone: true }),
  validatedBy: varchar("validated_by"),
  accuracyScore: real("accuracy_score"), // 0-1 how accurate was this prediction
  timeToFailureError: integer("time_to_failure_error"), // Days difference (predicted vs actual)
  classificationLabel: varchar("classification_label"), // 'true_positive', 'false_positive', 'true_negative', 'false_negative'
  modelVersion: varchar("model_version"),
  performanceMetrics: jsonb("performance_metrics"), // Additional metrics for analysis
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (table) => ({
  modelIdIdx: index("idx_perf_val_model").on(table.modelId),
  equipmentIdIdx: index("idx_perf_val_equipment").on(table.equipmentId),
  predictionTimeIdx: index("idx_perf_val_prediction_time").on(table.predictionTimestamp),
  classificationIdx: index("idx_perf_val_classification").on(table.classificationLabel),
  // Composite indexes for common query patterns
  modelEquipmentIdx: index("idx_perf_val_model_equipment").on(table.modelId, table.equipmentId),
  predictionLookupIdx: index("idx_perf_val_prediction_lookup").on(table.predictionType, table.predictionId)
}));

// Prediction feedback - user corrections and quality ratings
export const predictionFeedback = pgTable("prediction_feedback", {
  id: serial("id").primaryKey(),
  orgId: varchar("org_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }).default("default-org-id"),
  predictionId: integer("prediction_id").notNull(), // Polymorphic reference: can be failurePredictions.id or anomalyDetections.id - discriminated by predictionType
  predictionType: varchar("prediction_type").notNull(), // 'failure_prediction', 'anomaly_detection'
  equipmentId: varchar("equipment_id").notNull().references(() => equipment.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull(), // User who provided feedback
  feedbackType: varchar("feedback_type").notNull(), // 'correction', 'confirmation', 'rating', 'flag'
  rating: integer("rating"), // 1-5 star rating of prediction quality
  isAccurate: boolean("is_accurate"), // Simple true/false accuracy flag
  correctedValue: jsonb("corrected_value"), // User's correction if prediction was wrong
  comments: text("comments"), // User's explanation or notes
  actualFailureDate: timestamp("actual_failure_date", { withTimezone: true }),
  actualFailureMode: varchar("actual_failure_mode"),
  flagReason: varchar("flag_reason"), // 'false_positive', 'missed_detection', 'timing_off', 'severity_wrong'
  useForRetraining: boolean("use_for_retraining").default(true), // Should this feedback be used to retrain models?
  feedbackStatus: varchar("feedback_status").default("pending"), // 'pending', 'reviewed', 'incorporated', 'rejected'
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (table) => ({
  predictionIdx: index("idx_feedback_prediction").on(table.predictionId, table.predictionType),
  equipmentIdx: index("idx_feedback_equipment").on(table.equipmentId),
  userIdx: index("idx_feedback_user").on(table.userId),
  statusIdx: index("idx_feedback_status").on(table.feedbackStatus),
  retrainingIdx: index("idx_feedback_retraining").on(table.useForRetraining, table.feedbackStatus)
}));

// LLM cost tracking - monitors AI API usage and costs
export const llmCostTracking = pgTable("llm_cost_tracking", {
  id: serial("id").primaryKey(),
  orgId: varchar("org_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }).default("default-org-id"),
  requestId: varchar("request_id").notNull(), // Unique ID for this API call
  provider: varchar("provider").notNull(), // 'openai', 'anthropic'
  model: varchar("model").notNull(), // 'gpt-4o', 'claude-3-5-sonnet', etc.
  requestType: varchar("request_type").notNull(), // 'report_generation', 'sensor_tuning', 'anomaly_analysis', 'maintenance_recommendation'
  reportType: varchar("report_type"), // 'health', 'fleet', 'maintenance', 'compliance' (if applicable)
  audience: varchar("audience"), // 'executive', 'technical', 'maintenance', 'compliance'
  vesselId: varchar("vessel_id").references(() => vessels.id, { onDelete: 'set null' }),
  equipmentId: varchar("equipment_id").references(() => equipment.id, { onDelete: 'set null' }),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  totalTokens: integer("total_tokens").notNull(),
  estimatedCost: real("estimated_cost").notNull(), // USD cost estimate
  actualCost: real("actual_cost"), // Actual cost if available from API
  latencyMs: integer("latency_ms"), // Response time in milliseconds
  success: boolean("success").notNull().default(true),
  errorMessage: text("error_message"),
  fallbackUsed: boolean("fallback_used").default(false), // Did we fall back to a cheaper model?
  fallbackModel: varchar("fallback_model"), // Which model was used as fallback?
  userId: varchar("user_id"), // User who triggered the request
  metadata: jsonb("metadata"), // Additional context
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (table) => ({
  orgDateIdx: index("idx_llm_cost_org_date").on(table.orgId, table.createdAt),
  providerModelIdx: index("idx_llm_cost_provider_model").on(table.provider, table.model),
  requestTypeIdx: index("idx_llm_cost_request_type").on(table.requestType),
  vesselIdx: index("idx_llm_cost_vessel").on(table.vesselId),
  successIdx: index("idx_llm_cost_success").on(table.success),
  // Composite index for common analytics queries
  dateProviderModelIdx: index("idx_llm_cost_date_provider_model").on(table.createdAt, table.provider, table.model)
}));

// LLM budget configuration - organization-level spending controls
export const llmBudgetConfigs = pgTable("llm_budget_configs", {
  id: serial("id").primaryKey(),
  orgId: varchar("org_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }).unique(),
  provider: varchar("provider"), // Null for all providers, or specific like 'openai', 'anthropic'
  dailyLimit: real("daily_limit"), // Max daily spending in USD
  monthlyLimit: real("monthly_limit"), // Max monthly spending in USD
  alertThreshold: real("alert_threshold").default(0.8), // Alert when spending reaches this % of limit
  currentDailySpend: real("current_daily_spend").default(0), // Running total for today
  currentMonthlySpend: real("current_monthly_spend").default(0), // Running total for this month
  lastResetDate: timestamp("last_reset_date", { withTimezone: true }).defaultNow(), // When daily counter was last reset
  isEnabled: boolean("is_enabled").default(true),
  notifyEmail: text("notify_email"), // Email to notify when threshold is reached
  blockWhenExceeded: boolean("block_when_exceeded").default(false), // Block requests when limit exceeded
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (table) => ({
  orgProviderIdx: index("idx_llm_budget_org_provider").on(table.orgId, table.provider)
}));

// Retraining triggers - automated signals for when models need retraining
export const retrainingTriggers = pgTable("retraining_triggers", {
  id: serial("id").primaryKey(),
  orgId: varchar("org_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }).default("default-org-id"),
  modelId: varchar("model_id").notNull().references(() => mlModels.id, { onDelete: 'cascade' }),
  equipmentType: varchar("equipment_type"), // If type-specific model
  triggerType: varchar("trigger_type").notNull(), // 'performance_degradation', 'new_data_available', 'user_feedback_threshold', 'scheduled', 'manual'
  triggerReason: text("trigger_reason").notNull(), // Human-readable explanation
  triggerMetrics: jsonb("trigger_metrics").notNull(), // {accuracy, feedbackCount, newFailures, etc.}
  currentPerformance: jsonb("current_performance"), // Current model metrics
  performanceThreshold: real("performance_threshold"), // Threshold that was crossed
  newDataPoints: integer("new_data_points"), // How many new training examples available
  negativeFeedbackCount: integer("negative_feedback_count"), // Count of negative user feedback
  lastTrainingDate: timestamp("last_training_date", { withTimezone: true }),
  daysSinceTraining: integer("days_since_training"),
  priority: varchar("priority").notNull().default("medium"), // 'low', 'medium', 'high', 'critical'
  status: varchar("status").notNull().default("pending"), // 'pending', 'scheduled', 'in_progress', 'completed', 'failed', 'ignored'
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  processingStartedAt: timestamp("processing_started_at", { withTimezone: true }),
  processingCompletedAt: timestamp("processing_completed_at", { withTimezone: true }),
  newModelId: varchar("new_model_id").references(() => mlModels.id), // ID of newly trained model
  retrainingDuration: integer("retraining_duration"), // Milliseconds
  retrainingResult: jsonb("retraining_result"), // Training metrics for new model
  errorMessage: text("error_message"),
  triggeredBy: varchar("triggered_by"), // User ID or 'system'
  reviewedBy: varchar("reviewed_by"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (table) => ({
  modelIdIdx: index("idx_retrain_model").on(table.modelId),
  statusIdx: index("idx_retrain_status").on(table.status),
  priorityIdx: index("idx_retrain_priority").on(table.priority),
  scheduledIdx: index("idx_retrain_scheduled").on(table.scheduledFor),
  triggerTypeIdx: index("idx_retrain_trigger_type").on(table.triggerType)
}));

// ========================================
// Phase 3: Digital Twin Schema
// ========================================

// Digital twin vessel models
export const digitalTwins = pgTable("digital_twins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vesselId: varchar("vessel_id").references(() => vessels.id).notNull(),
  twinType: varchar("twin_type").notNull(), // 'vessel', 'engine', 'propulsion', 'hull'
  name: varchar("name").notNull(),
  specifications: jsonb("specifications"), // Technical specifications
  cadModel: jsonb("cad_model"), // 3D model reference and metadata
  physicsModel: jsonb("physics_model"), // Physics simulation parameters
  currentState: jsonb("current_state"), // Live twin state
  lastUpdate: timestamp("last_update", { withTimezone: true }).defaultNow(),
  simulationConfig: jsonb("simulation_config"),
  validationStatus: varchar("validation_status").default("active"), // 'active', 'calibrating', 'offline'
  accuracy: real("accuracy"), // Twin-to-reality accuracy percentage
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

// Digital twin simulation scenarios
export const twinSimulations = pgTable("twin_simulations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  digitalTwinId: varchar("digital_twin_id").references(() => digitalTwins.id).notNull(),
  scenarioName: varchar("scenario_name").notNull(),
  scenarioType: varchar("scenario_type").notNull(), // 'maintenance', 'failure', 'optimization', 'training'
  inputParameters: jsonb("input_parameters"),
  simulationResults: jsonb("simulation_results"),
  startTime: timestamp("start_time", { withTimezone: true }).defaultNow(),
  endTime: timestamp("end_time", { withTimezone: true }),
  status: varchar("status").default("running"), // 'queued', 'running', 'completed', 'failed'
  progressPercentage: real("progress_percentage").default(0),
  recommendedActions: jsonb("recommended_actions"),
  costBenefitAnalysis: jsonb("cost_benefit_analysis"),
  metadata: jsonb("metadata")
});

// 3D visualization assets
export const visualizationAssets = pgTable("visualization_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetType: varchar("asset_type").notNull(), // '3d_model', 'texture', 'animation', 'ar_overlay'
  name: varchar("name").notNull(),
  filePath: varchar("file_path").notNull(),
  fileFormat: varchar("file_format"), // 'gltf', 'obj', 'fbx', 'dae'
  fileSizeBytes: integer("file_size_bytes"),
  targetPlatform: varchar("target_platform"), // 'web', 'mobile', 'ar', 'vr'
  lodLevel: integer("lod_level"), // Level of detail (0=highest, 3=lowest)
  boundingBox: jsonb("bounding_box"), // 3D bounding box coordinates
  textureResolution: varchar("texture_resolution"),
  compressionType: varchar("compression_type"),
  optimizationLevel: varchar("optimization_level"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

// AR maintenance procedures
export const arMaintenanceProcedures = pgTable("ar_maintenance_procedures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  equipmentId: varchar("equipment_id").references(() => devices.id),
  procedureName: varchar("procedure_name").notNull(),
  procedureType: varchar("procedure_type").notNull(), // 'inspection', 'repair', 'replacement', 'calibration'
  arAssets: jsonb("ar_assets"), // Array of AR visualization asset references
  steps: jsonb("steps"), // Detailed step-by-step instructions
  safetyRequirements: jsonb("safety_requirements"),
  requiredTools: jsonb("required_tools"),
  estimatedDuration: integer("estimated_duration"), // Minutes
  skillLevel: varchar("skill_level"), // 'beginner', 'intermediate', 'expert'
  completionCriteria: jsonb("completion_criteria"),
  troubleshooting: jsonb("troubleshooting"),
  qualityChecks: jsonb("quality_checks"),
  version: varchar("version").notNull(),
  status: varchar("status").default("active"), // 'draft', 'active', 'deprecated'
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

// Insert schemas for new tables
export const insertMqttDeviceSchema = createInsertSchema(mqttDevices).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertTelemetryAggregateSchema = createInsertSchema(telemetryAggregates).omit({
  id: true,
  createdAt: true
});

export const insertDataQualityMetricSchema = createInsertSchema(dataQualityMetrics).omit({
  id: true,
  validationTimestamp: true
});

export const insertMlModelSchema = createInsertSchema(mlModels).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertAnomalyDetectionSchema = createInsertSchema(anomalyDetections).omit({
  id: true,
  detectionTimestamp: true
});

export const insertFailurePredictionSchema = createInsertSchema(failurePredictions).omit({
  id: true,
  predictionTimestamp: true
});

export const insertThresholdOptimizationSchema = createInsertSchema(thresholdOptimizations).omit({
  id: true,
  optimizationTimestamp: true
});

export const insertComponentDegradationSchema = createInsertSchema(componentDegradation).omit({
  id: true,
  measurementTimestamp: true
});

export const insertFailureHistorySchema = createInsertSchema(failureHistory).omit({
  id: true,
  createdAt: true
});

export const insertModelPerformanceValidationSchema = createInsertSchema(modelPerformanceValidations).omit({
  id: true,
  createdAt: true
});

export const insertPredictionFeedbackSchema = createInsertSchema(predictionFeedback).omit({
  id: true,
  createdAt: true
});

export const insertLlmCostTrackingSchema = createInsertSchema(llmCostTracking).omit({
  id: true,
  createdAt: true
});

export const insertLlmBudgetConfigSchema = createInsertSchema(llmBudgetConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertRetrainingTriggerSchema = createInsertSchema(retrainingTriggers).omit({
  id: true,
  createdAt: true
});

export const insertDigitalTwinSchema = createInsertSchema(digitalTwins).omit({
  id: true,
  lastUpdate: true,
  createdAt: true,
  updatedAt: true
});

export const insertTwinSimulationSchema = createInsertSchema(twinSimulations).omit({
  id: true,
  startTime: true
});

export const insertVisualizationAssetSchema = createInsertSchema(visualizationAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertArMaintenanceProcedureSchema = createInsertSchema(arMaintenanceProcedures).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Type exports for new tables
export type MqttDevice = typeof mqttDevices.$inferSelect;
export type TelemetryAggregate = typeof telemetryAggregates.$inferSelect;
export type DataQualityMetric = typeof dataQualityMetrics.$inferSelect;
export type MlModel = typeof mlModels.$inferSelect;
export type AnomalyDetection = typeof anomalyDetections.$inferSelect;
export type FailurePrediction = typeof failurePredictions.$inferSelect;
export type ThresholdOptimization = typeof thresholdOptimizations.$inferSelect;
export type ComponentDegradation = typeof componentDegradation.$inferSelect;
export type FailureHistory = typeof failureHistory.$inferSelect;
export type DigitalTwin = typeof digitalTwins.$inferSelect;
export type TwinSimulation = typeof twinSimulations.$inferSelect;
export type VisualizationAsset = typeof visualizationAssets.$inferSelect;
export type ArMaintenanceProcedure = typeof arMaintenanceProcedures.$inferSelect;

// Labor Rates Configuration
export const laborRates = pgTable("labor_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  skillLevel: text("skill_level").notNull(), // trainee, apprentice, technician, senior_technician, supervisor, specialist
  position: text("position").notNull(), // engine_technician, mechanical_engineer, electrical_technician, etc.
  standardRate: real("standard_rate").notNull(),
  overtimeRate: real("overtime_rate").notNull(),
  emergencyRate: real("emergency_rate").notNull(),
  contractorRate: real("contractor_rate").notNull(),
  currency: text("currency").notNull().default("USD"),
  effectiveDate: timestamp("effective_date", { mode: "date" }).defaultNow(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// Expense Tracking
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  type: text("type").notNull(), // vendor_invoice, labor_cost, downtime_cost, emergency_repair, port_fees, fuel_cost, other
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("USD"),
  description: text("description").notNull(),
  vendor: text("vendor"),
  invoiceNumber: text("invoice_number"),
  workOrderId: varchar("work_order_id").references(() => workOrders.id),
  vesselName: text("vessel_name"),
  expenseDate: timestamp("expense_date", { mode: "date" }).notNull(),
  approvalStatus: text("approval_status").notNull().default("pending"), // pending, approved, rejected
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { mode: "date" }),
  receipt: text("receipt"), // URL or file path to receipt
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// Insert schemas for new tables
export const insertLaborRateSchema = createInsertSchema(laborRates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  skillLevel: z.enum(['trainee', 'apprentice', 'technician', 'senior_technician', 'supervisor', 'specialist']),
  position: z.enum(['engine_technician', 'mechanical_engineer', 'electrical_technician', 'electronics_technician', 'hvac_technician', 'deck_hand', 'maintenance_supervisor']),
  standardRate: z.number().min(0.01),
  overtimeRate: z.number().min(0.01),
  emergencyRate: z.number().min(0.01),
  contractorRate: z.number().min(0.01),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  type: z.enum(['vendor_invoice', 'labor_cost', 'downtime_cost', 'emergency_repair', 'port_fees', 'fuel_cost', 'other']),
  amount: z.number().min(0.01),
  approvalStatus: z.enum(['pending', 'approved', 'rejected']).default('pending'),
});

// J1939 configuration and mapping schema
export const j1939Configurations = pgTable("j1939_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  deviceId: varchar("device_id").references(() => devices.id),
  name: text("name").notNull(), // configuration name
  description: text("description"),
  canInterface: text("can_interface").default("can0"), // SocketCAN interface
  baudRate: integer("baud_rate").default(250000), // CAN baud rate
  mappings: jsonb("mappings").notNull(), // PGN/SPN mapping rules
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// J1939 signal schemas for type safety
export const j1939SpnRuleSchema = z.object({
  spn: z.number(), // Suspect Parameter Number
  sig: z.string(), // signal name (mapped to sensorType)
  src: z.string(), // source (ECM, TCM, etc.)
  unit: z.string().optional(), // measurement unit
  bytes: z.array(z.number()), // byte positions in frame
  endian: z.enum(['LE', 'BE']).default('LE'), // byte order
  scale: z.number().default(1), // scaling factor
  offset: z.number().default(0), // offset value
  formula: z.string().optional(), // custom formula using 'x' as variable
});

export const j1939PgnRuleSchema = z.object({
  pgn: z.number(), // Parameter Group Number
  name: z.string().optional(), // descriptive name
  spns: z.array(j1939SpnRuleSchema),
});

export const j1939MappingSchema = z.object({
  schema: z.string().default("https://arus.app/schemas/j1939-map-v1.json"),
  notes: z.string().optional(),
  signals: z.array(j1939PgnRuleSchema),
});

export const insertJ1939ConfigurationSchema = createInsertSchema(j1939Configurations).omit({
  id: true,
  orgId: true, // orgId injected from headers server-side
  createdAt: true,
  updatedAt: true,
}).extend({
  mappings: j1939MappingSchema,
});

// Type exports for new tables
export type LaborRate = typeof laborRates.$inferSelect;
export type InsertLaborRate = z.infer<typeof insertLaborRateSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type J1939Configuration = typeof j1939Configurations.$inferSelect;
export type InsertJ1939Configuration = z.infer<typeof insertJ1939ConfigurationSchema>;
export type J1939SpnRule = z.infer<typeof j1939SpnRuleSchema>;
export type J1939PgnRule = z.infer<typeof j1939PgnRuleSchema>;
export type J1939Mapping = z.infer<typeof j1939MappingSchema>;

// Advanced Analytics type exports
export type MlModel = typeof mlModels.$inferSelect;
export type InsertMlModel = z.infer<typeof insertMlModelSchema>;
export type AnomalyDetection = typeof anomalyDetections.$inferSelect;
export type InsertAnomalyDetection = z.infer<typeof insertAnomalyDetectionSchema>;
export type FailurePrediction = typeof failurePredictions.$inferSelect;
export type InsertFailurePrediction = z.infer<typeof insertFailurePredictionSchema>;
export type ThresholdOptimization = typeof thresholdOptimizations.$inferSelect;
export type InsertThresholdOptimization = z.infer<typeof insertThresholdOptimizationSchema>;
export type ModelPerformanceValidation = typeof modelPerformanceValidations.$inferSelect;
export type InsertModelPerformanceValidation = z.infer<typeof insertModelPerformanceValidationSchema>;
export type PredictionFeedback = typeof predictionFeedback.$inferSelect;
export type InsertPredictionFeedback = z.infer<typeof insertPredictionFeedbackSchema>;
export type LlmCostTracking = typeof llmCostTracking.$inferSelect;
export type InsertLlmCostTracking = z.infer<typeof insertLlmCostTrackingSchema>;
export type LlmBudgetConfig = typeof llmBudgetConfigs.$inferSelect;
export type InsertLlmBudgetConfig = z.infer<typeof insertLlmBudgetConfigSchema>;
export type RetrainingTrigger = typeof retrainingTriggers.$inferSelect;
export type InsertRetrainingTrigger = z.infer<typeof insertRetrainingTriggerSchema>;
export type DigitalTwin = typeof digitalTwins.$inferSelect;
export type TwinSimulation = typeof twinSimulations.$inferSelect;
export type VisualizationAsset = typeof visualizationAssets.$inferSelect;
export type VibrationAnalysis = typeof vibrationAnalysis.$inferSelect;
export type WeibullEstimate = typeof weibullEstimates.$inferSelect;

// ===== SYSTEM ADMINISTRATION TABLES =====

// Admin Audit Events - Track all administrative actions
export const adminAuditEvents = pgTable("admin_audit_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  userId: varchar("user_id").references(() => users.id),
  action: text("action").notNull(), // create_user, update_settings, delete_data, system_restart, etc.
  resourceType: text("resource_type").notNull(), // user, organization, device, equipment, etc.
  resourceId: varchar("resource_id"),
  details: jsonb("details").default({}), // action-specific details
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  outcome: text("outcome").notNull().default("success"), // success, failure, partial
  errorMessage: text("error_message"),
  severity: text("severity").notNull().default("info"), // info, warning, critical
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

// Admin System Settings - Advanced system configuration management
export const adminSystemSettings = pgTable("admin_system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  category: text("category").notNull(), // authentication, alerts, retention, integrations, etc.
  key: text("key").notNull(), // setting key within category
  value: jsonb("value").notNull(), // setting value as JSON
  dataType: text("data_type").notNull(), // string, number, boolean, object, array
  description: text("description"),
  isSecret: boolean("is_secret").default(false), // mark sensitive settings
  isReadonly: boolean("is_readonly").default(false), // system-managed settings
  validationRule: jsonb("validation_rule"), // validation schema
  defaultValue: jsonb("default_value"),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  uniqueOrgCategoryKey: unique().on(table.orgId, table.category, table.key),
}));

// Integration Configs - Third-party service configurations
export const integrationConfigs = pgTable("integration_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(), // OpenAI, Stripe, Twilio, AWS S3, etc.
  type: text("type").notNull(), // ai_service, payment, communication, storage, etc.
  status: text("status").notNull().default("inactive"), // active, inactive, error, testing
  config: jsonb("config").notNull(), // service-specific configuration
  credentials: jsonb("credentials"), // encrypted credentials
  lastHealthCheck: timestamp("last_health_check", { mode: "date" }),
  healthStatus: text("health_status").default("unknown"), // healthy, unhealthy, unknown
  errorCount: integer("error_count").default(0),
  lastError: text("last_error"),
  usageStats: jsonb("usage_stats").default({}), // API calls, costs, etc.
  rateLimit: jsonb("rate_limit"), // rate limiting configuration
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// Maintenance Windows - System maintenance scheduling
export const maintenanceWindows = pgTable("maintenance_windows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // database, application, infrastructure, security
  severity: text("severity").notNull().default("low"), // low, medium, high, critical
  status: text("status").notNull().default("scheduled"), // scheduled, active, completed, cancelled
  startTime: timestamp("start_time", { mode: "date" }).notNull(),
  endTime: timestamp("end_time", { mode: "date" }).notNull(),
  actualStartTime: timestamp("actual_start_time", { mode: "date" }),
  actualEndTime: timestamp("actual_end_time", { mode: "date" }),
  affectedServices: text("affected_services").array(), // telemetry, alerts, reports, etc.
  maintenanceTasks: jsonb("maintenance_tasks").default([]), // list of tasks to perform
  completedTasks: jsonb("completed_tasks").default([]), // list of completed tasks
  rollbackPlan: text("rollback_plan"),
  createdBy: varchar("created_by").references(() => users.id),
  assignedTo: varchar("assigned_to").references(() => users.id),
  notifyUsers: text("notify_users").array(), // user IDs to notify
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// System Performance Metrics - System-level performance monitoring
export const systemPerformanceMetrics = pgTable("system_performance_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  metricName: text("metric_name").notNull(), // cpu_usage, memory_usage, disk_usage, api_response_time, etc.
  category: text("category").notNull(), // system, database, application, network
  value: real("value").notNull(),
  unit: text("unit").notNull(), // percent, milliseconds, bytes, requests_per_second, etc.
  threshold: real("threshold"), // alert threshold
  status: text("status").default("normal"), // normal, warning, critical
  tags: jsonb("tags").default({}), // additional metadata
  source: text("source").notNull(), // prometheus, custom, database, etc.
  recordedAt: timestamp("recorded_at", { mode: "date" }).defaultNow(),
});

// System Health Checks - Automated health monitoring
export const systemHealthChecks = pgTable("system_health_checks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  checkName: text("check_name").notNull(), // database_connection, api_endpoint, disk_space, etc.
  category: text("category").notNull(), // infrastructure, application, external_service
  status: text("status").notNull(), // healthy, warning, critical, unknown
  responseTime: integer("response_time_ms"),
  message: text("message"),
  details: jsonb("details").default({}),
  lastSuccess: timestamp("last_success", { mode: "date" }),
  consecutiveFailures: integer("consecutive_failures").default(0),
  isEnabled: boolean("is_enabled").default(true),
  checkInterval: integer("check_interval_seconds").default(300), // 5 minutes
  timeoutSeconds: integer("timeout_seconds").default(30),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// Insert schemas for System Administration tables
export const insertAdminAuditEventSchema = createInsertSchema(adminAuditEvents).omit({
  id: true,
  createdAt: true,
}).extend({
  action: z.string().min(1),
  resourceType: z.string().min(1),
  outcome: z.enum(['success', 'failure', 'partial']).default('success'),
  severity: z.enum(['info', 'warning', 'critical']).default('info'),
});

export const insertAdminSystemSettingSchema = createInsertSchema(adminSystemSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  category: z.string().min(1),
  key: z.string().min(1),
  dataType: z.enum(['string', 'number', 'boolean', 'object', 'array']),
});

export const insertIntegrationConfigSchema = createInsertSchema(integrationConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1),
  type: z.string().min(1),
  status: z.enum(['active', 'inactive', 'error', 'testing']).default('inactive'),
  healthStatus: z.enum(['healthy', 'unhealthy', 'unknown']).optional(),
});

export const insertMaintenanceWindowSchema = createInsertSchema(maintenanceWindows).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(1),
  type: z.enum(['database', 'application', 'infrastructure', 'security']),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('low'),
  status: z.enum(['scheduled', 'active', 'completed', 'cancelled']).default('scheduled'),
});

export const insertSystemPerformanceMetricSchema = createInsertSchema(systemPerformanceMetrics).omit({
  id: true,
  recordedAt: true,
}).extend({
  metricName: z.string().min(1),
  category: z.enum(['system', 'database', 'application', 'network']),
  value: z.number(),
  unit: z.string().min(1),
  status: z.enum(['normal', 'warning', 'critical']).optional(),
});

export const insertSystemHealthCheckSchema = createInsertSchema(systemHealthChecks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  checkName: z.string().min(1),
  category: z.enum(['infrastructure', 'application', 'external_service']),
  status: z.enum(['healthy', 'warning', 'critical', 'unknown']),
});

// Type exports for System Administration
export type AdminAuditEvent = typeof adminAuditEvents.$inferSelect;
export type InsertAdminAuditEvent = z.infer<typeof insertAdminAuditEventSchema>;

export type AdminSystemSetting = typeof adminSystemSettings.$inferSelect;
export type InsertAdminSystemSetting = z.infer<typeof insertAdminSystemSettingSchema>;

export type IntegrationConfig = typeof integrationConfigs.$inferSelect;
export type InsertIntegrationConfig = z.infer<typeof insertIntegrationConfigSchema>;

export type MaintenanceWindow = typeof maintenanceWindows.$inferSelect;
export type InsertMaintenanceWindow = z.infer<typeof insertMaintenanceWindowSchema>;

export type SystemPerformanceMetric = typeof systemPerformanceMetrics.$inferSelect;
export type InsertSystemPerformanceMetric = z.infer<typeof insertSystemPerformanceMetricSchema>;

export type SystemHealthCheck = typeof systemHealthChecks.$inferSelect;
export type InsertSystemHealthCheck = z.infer<typeof insertSystemHealthCheckSchema>;

// Sync system schemas
export const insertSyncJournalSchema = createInsertSchema(syncJournal).omit({
  id: true,
  createdAt: true,
}).extend({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  operation: z.enum(['create', 'update', 'delete', 'reconcile']),
});

export const insertSyncOutboxSchema = createInsertSchema(syncOutbox).omit({
  id: true,
  createdAt: true,
  processedAt: true,
}).extend({
  eventType: z.string().min(1),
  processed: z.boolean().default(false),
  processingAttempts: z.number().min(0).default(0),
});

// Sync system types
export type SyncJournal = typeof syncJournal.$inferSelect;
export type InsertSyncJournal = z.infer<typeof insertSyncJournalSchema>;

export type SyncOutbox = typeof syncOutbox.$inferSelect;
export type InsertSyncOutbox = z.infer<typeof insertSyncOutboxSchema>;

// ===== SYNC EXPANSION TABLES =====
// Additional tables for enhanced inventory management, compliance, and analytics

// Parts reservations for work orders - tracks parts allocated to specific work orders
export const reservations = pgTable("reservations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  partId: varchar("part_id").notNull().references(() => parts.id),
  workOrderId: varchar("work_order_id").notNull().references(() => workOrders.id),
  quantity: real("quantity").notNull(), // quantity reserved
  reservedBy: text("reserved_by"), // user who made the reservation
  expiresAt: timestamp("expires_at", { mode: "date" }), // auto-release unused reservations
  status: text("status").notNull().default("active"), // active, used, cancelled, expired
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  partIdx: sql`CREATE INDEX IF NOT EXISTS idx_reservations_part ON reservations (part_id)`,
  workOrderIdx: sql`CREATE INDEX IF NOT EXISTS idx_reservations_work_order ON reservations (work_order_id)`,
  statusIdx: sql`CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations (status, expires_at)`,
}));

// Purchase orders for inventory replenishment
export const purchaseOrders = pgTable("purchase_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  supplierId: varchar("supplier_id").notNull().references(() => suppliers.id),
  orderNumber: text("order_number").notNull(), // external PO number
  expectedDate: timestamp("expected_date", { mode: "date" }),
  totalAmount: real("total_amount"),
  currency: text("currency").default("USD"),
  status: text("status").notNull().default("draft"), // draft, sent, acknowledged, shipped, received, cancelled
  notes: text("notes"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  supplierIdx: sql`CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders (supplier_id)`,
  statusIdx: sql`CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders (status, expected_date)`,
  orderNumberIdx: sql`CREATE INDEX IF NOT EXISTS idx_purchase_orders_number ON purchase_orders (order_number)`,
}));

// Purchase order line items
export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  poId: varchar("po_id").notNull().references(() => purchaseOrders.id),
  partId: varchar("part_id").notNull().references(() => parts.id),
  quantity: real("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  totalPrice: real("total_price").notNull(), // quantity * unitPrice
  receivedQuantity: real("received_quantity").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  poIdx: sql`CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON purchase_order_items (po_id)`,
  partIdx: sql`CREATE INDEX IF NOT EXISTS idx_purchase_order_items_part ON purchase_order_items (part_id)`,
}));

// Sensor threshold rules and alarms
export const sensorThresholds = pgTable("sensor_thresholds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  deviceId: varchar("device_id").notNull().references(() => devices.id),
  sensorType: text("sensor_type").notNull(), // temperature, pressure, vibration, etc.
  rule: jsonb("rule").notNull(), // threshold configuration JSON
  minValue: real("min_value"),
  maxValue: real("max_value"),
  warningThreshold: real("warning_threshold"),
  criticalThreshold: real("critical_threshold"),
  version: integer("version").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  description: text("description"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  deviceIdx: sql`CREATE INDEX IF NOT EXISTS idx_sensor_thresholds_device ON sensor_thresholds (device_id, sensor_type)`,
  activeIdx: sql`CREATE INDEX IF NOT EXISTS idx_sensor_thresholds_active ON sensor_thresholds (is_active, device_id)`,
}));

// Predictive maintenance and analytics model registry
export const modelRegistry = pgTable("model_registry", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  componentClass: text("component_class").notNull(), // engine, pump, compressor, etc.
  modelType: text("model_type").notNull(), // pdm, rul, anomaly_detection, classification
  version: text("version").notNull(),
  algorithm: text("algorithm"), // random_forest, svm, lstm, etc.
  windowDays: integer("window_days"), // data window for analysis
  features: jsonb("features"), // input features configuration
  metrics: jsonb("metrics"), // performance metrics (accuracy, precision, etc.)
  isActive: boolean("is_active").default(true),
  deployedAt: timestamp("deployed_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  componentIdx: sql`CREATE INDEX IF NOT EXISTS idx_model_registry_component ON model_registry (component_class, model_type)`,
  activeIdx: sql`CREATE INDEX IF NOT EXISTS idx_model_registry_active ON model_registry (is_active, deployed_at)`,
}));

// Organization cost model for ROI calculations
export const costModel = pgTable("cost_model", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  currency: text("currency").notNull().default("USD"),
  laborRatePerHour: real("labor_rate_per_hour").notNull().default(50), // cost per technician hour
  downtimePerHour: real("downtime_per_hour").notNull().default(1000), // cost of equipment downtime per hour
  fuelCostPerLiter: real("fuel_cost_per_liter"), // fuel cost for ROI calculations
  inspectionCostPerHour: real("inspection_cost_per_hour"), // cost of inspection time
  emergencyMultiplier: real("emergency_multiplier").default(2.0), // emergency work cost multiplier
  description: text("description"),
  isActive: boolean("is_active").default(true),
  effectiveFrom: timestamp("effective_from", { mode: "date" }).defaultNow(),
  effectiveTo: timestamp("effective_to", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  orgActiveIdx: sql`CREATE INDEX IF NOT EXISTS idx_cost_model_org_active ON cost_model (org_id, is_active, effective_from)`,
}));

// Compliance documents with hash verification
export const complianceDocs = pgTable("compliance_docs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  vesselId: varchar("vessel_id").references(() => vessels.id),
  documentType: text("document_type").notNull(), // certificate, inspection, audit, permit, etc.
  title: text("title").notNull(),
  issuer: text("issuer"), // authority that issued the document
  documentNumber: text("document_number"),
  issuedAt: timestamp("issued_at", { mode: "date" }),
  expiresAt: timestamp("expires_at", { mode: "date" }),
  sha256Hash: text("sha256_hash").notNull(), // document integrity hash
  fileSize: integer("file_size"), // file size in bytes
  mimeType: text("mime_type"),
  metadata: jsonb("metadata"), // additional document properties
  status: text("status").default("active"), // active, expired, superseded, revoked
  tags: text("tags"), // comma-separated tags for categorization
  uploadedBy: text("uploaded_by").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  vesselIdx: sql`CREATE INDEX IF NOT EXISTS idx_compliance_docs_vessel ON compliance_docs (vessel_id, document_type)`,
  expiryIdx: sql`CREATE INDEX IF NOT EXISTS idx_compliance_docs_expiry ON compliance_docs (expires_at, status)`,
  hashIdx: sql`CREATE INDEX IF NOT EXISTS idx_compliance_docs_hash ON compliance_docs (sha256_hash)`,
}));

// Daily metric rollups for analytics and reporting
export const dailyMetricRollups = pgTable("daily_metric_rollups", {
  date: text("date").notNull(), // YYYY-MM-DD format
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  vesselId: varchar("vessel_id").references(() => vessels.id),
  deviceId: varchar("device_id").references(() => devices.id),
  metricName: text("metric_name").notNull(), // fuel_consumption, engine_hours, distance_traveled, etc.
  value: real("value").notNull(),
  unit: text("unit"), // liters, hours, nautical_miles, etc.
  aggregationType: text("aggregation_type").default("sum"), // sum, avg, min, max, count
  dataQuality: real("data_quality").default(1.0), // 0.0 to 1.0 confidence score
  calculatedAt: timestamp("calculated_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  pk: sql`PRIMARY KEY (${table.date}, ${table.orgId}, ${table.vesselId}, ${table.deviceId}, ${table.metricName})`,
  vesselMetricIdx: sql`CREATE INDEX IF NOT EXISTS idx_daily_rollups_vessel_metric ON daily_metric_rollups (vessel_id, metric_name, date)`,
  deviceMetricIdx: sql`CREATE INDEX IF NOT EXISTS idx_daily_rollups_device_metric ON daily_metric_rollups (device_id, metric_name, date)`,
  qualityIdx: sql`CREATE INDEX IF NOT EXISTS idx_daily_rollups_quality ON daily_metric_rollups (data_quality, date)`,
}));

// DTC (Diagnostic Trouble Code) Definitions - J1939 SPN/FMI mappings
export const dtcDefinitions = pgTable("dtc_definitions", {
  spn: integer("spn").notNull(), // Suspect Parameter Number
  fmi: integer("fmi").notNull(), // Failure Mode Identifier
  manufacturer: text("manufacturer").notNull().default(''), // Empty string for standard J1939, vendor name for proprietary
  spnName: text("spn_name").notNull(), // e.g., "Engine Oil Pressure"
  fmiName: text("fmi_name").notNull(), // e.g., "Data Valid But Above Normal Operating Range"
  description: text("description").notNull(), // detailed fault description
  severity: integer("severity").notNull().default(3), // 1=critical, 2=high, 3=medium, 4=low
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  pk: sql`PRIMARY KEY (${table.spn}, ${table.fmi}, ${table.manufacturer})`,
  spnIdx: index("idx_dtc_definitions_spn").on(table.spn),
  severityIdx: index("idx_dtc_definitions_severity").on(table.severity),
}));

// DTC Faults - Active and historical diagnostic trouble codes from equipment
export const dtcFaults = pgTable("dtc_faults", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  equipmentId: varchar("equipment_id").notNull().references(() => equipment.id),
  deviceId: varchar("device_id").notNull().references(() => devices.id),
  spn: integer("spn").notNull(), // Suspect Parameter Number
  fmi: integer("fmi").notNull(), // Failure Mode Identifier
  oc: integer("oc"), // Occurrence Count
  sa: integer("sa"), // Source Address
  pgn: integer("pgn"), // Parameter Group Number (typically 65226 for DM1)
  lamp: jsonb("lamp"), // {mil, redStop, amberWarn, protect} lamp statuses
  active: boolean("active").notNull().default(true), // true if fault is currently active
  firstSeen: timestamp("first_seen", { mode: "date" }).notNull().defaultNow(),
  lastSeen: timestamp("last_seen", { mode: "date" }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  version: integer("version").default(1),
  lastModifiedBy: varchar("last_modified_by", { length: 255 }),
  lastModifiedDevice: varchar("last_modified_device", { length: 255 }),
}, (table) => ({
  orgEquipmentActiveIdx: index("idx_dtc_faults_org_eq_active").on(table.orgId, table.equipmentId, table.active),
  deviceActiveIdx: index("idx_dtc_faults_device_active").on(table.deviceId, table.active),
  lastSeenIdx: index("idx_dtc_faults_last_seen").on(table.orgId, table.lastSeen),
  activePartialIdx: sql`CREATE INDEX IF NOT EXISTS idx_dtc_faults_active_only ON dtc_faults (org_id, equipment_id, last_seen DESC) WHERE active = true`,
}));

// Zod schemas for new sync expansion tables
export const insertReservationSchema = createInsertSchema(reservations).omit({
  id: true,
  createdAt: true,
}).extend({
  partId: z.string().min(1),
  workOrderId: z.string().min(1),
  quantity: z.number().min(0),
  status: z.enum(['active', 'used', 'cancelled', 'expired']).default('active'),
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  supplierId: z.string().min(1),
  orderNumber: z.string().min(1),
  status: z.enum(['draft', 'sent', 'acknowledged', 'shipped', 'received', 'cancelled']).default('draft'),
  totalAmount: z.number().min(0).optional(),
  currency: z.string().default('USD'),
  createdBy: z.string().min(1),
});

export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItems).omit({
  id: true,
  createdAt: true,
}).extend({
  poId: z.string().min(1),
  partId: z.string().min(1),
  quantity: z.number().min(0),
  unitPrice: z.number().min(0),
  totalPrice: z.number().min(0),
  receivedQuantity: z.number().min(0).default(0),
});

export const insertSensorThresholdSchema = createInsertSchema(sensorThresholds).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  deviceId: z.string().min(1),
  sensorType: z.string().min(1),
  rule: z.record(z.any()), // JSON object for threshold rules
  version: z.number().min(1).default(1),
  isActive: z.boolean().default(true),
});

export const insertModelRegistrySchema = createInsertSchema(modelRegistry).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1),
  componentClass: z.string().min(1),
  modelType: z.enum(['pdm', 'rul', 'anomaly_detection', 'classification']),
  version: z.string().min(1),
  windowDays: z.number().min(1).optional(),
  isActive: z.boolean().default(true),
});

export const insertCostModelSchema = createInsertSchema(costModel).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  currency: z.string().default('USD'),
  laborRatePerHour: z.number().min(0).default(50),
  downtimePerHour: z.number().min(0).default(1000),
  emergencyMultiplier: z.number().min(1).default(2.0),
  isActive: z.boolean().default(true),
});

export const insertComplianceDocSchema = createInsertSchema(complianceDocs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  documentType: z.string().min(1),
  title: z.string().min(1),
  sha256Hash: z.string().min(64).max(64), // SHA256 is exactly 64 hex characters
  status: z.enum(['active', 'expired', 'superseded', 'revoked']).default('active'),
  uploadedBy: z.string().min(1),
});

export const insertDailyMetricRollupSchema = createInsertSchema(dailyMetricRollups).omit({
  calculatedAt: true,
}).extend({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  metricName: z.string().min(1),
  value: z.number(),
  aggregationType: z.enum(['sum', 'avg', 'min', 'max', 'count']).default('sum'),
  dataQuality: z.number().min(0).max(1).default(1.0),
});

// TypeScript types for sync expansion tables
export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = z.infer<typeof insertReservationSchema>;

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;

export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = z.infer<typeof insertPurchaseOrderItemSchema>;

export type SensorThreshold = typeof sensorThresholds.$inferSelect;
export type InsertSensorThreshold = z.infer<typeof insertSensorThresholdSchema>;

export type ModelRegistry = typeof modelRegistry.$inferSelect;
export type InsertModelRegistry = z.infer<typeof insertModelRegistrySchema>;

export type CostModel = typeof costModel.$inferSelect;
export type InsertCostModel = z.infer<typeof insertCostModelSchema>;

export type ComplianceDoc = typeof complianceDocs.$inferSelect;
export type InsertComplianceDoc = z.infer<typeof insertComplianceDocSchema>;

export type DailyMetricRollup = typeof dailyMetricRollups.$inferSelect;
export type InsertDailyMetricRollup = z.infer<typeof insertDailyMetricRollupSchema>;

// DTC schemas and types
export const insertDtcDefinitionSchema = createInsertSchema(dtcDefinitions).omit({
  createdAt: true,
  updatedAt: true,
}).extend({
  spn: z.number().int().min(0).max(524287), // J1939 SPN is 19-bit (0-524287)
  fmi: z.number().int().min(0).max(31), // J1939 FMI is 5-bit (0-31)
  manufacturer: z.string().default(''), // Empty string for standard J1939, vendor name for proprietary
  spnName: z.string().min(1),
  fmiName: z.string().min(1),
  description: z.string().min(1),
  severity: z.number().int().min(1).max(4).default(3), // 1=critical, 2=high, 3=medium, 4=low
});

export const insertDtcFaultSchema = createInsertSchema(dtcFaults).omit({
  id: true,
  createdAt: true,
  firstSeen: true,
  lastSeen: true,
}).extend({
  orgId: z.string().min(1),
  equipmentId: z.string().min(1),
  deviceId: z.string().min(1),
  spn: z.number().int().min(0),
  fmi: z.number().int().min(0),
  oc: z.number().int().min(0).optional().nullable(),
  sa: z.number().int().min(0).max(255).optional().nullable(), // Source Address is 8-bit
  pgn: z.number().int().min(0).optional().nullable(),
  lamp: z.record(z.any()).optional().nullable(), // {mil, redStop, amberWarn, protect}
  active: z.boolean().default(true),
});

export type DtcDefinition = typeof dtcDefinitions.$inferSelect;
export type InsertDtcDefinition = z.infer<typeof insertDtcDefinitionSchema>;

export type DtcFault = typeof dtcFaults.$inferSelect;
export type InsertDtcFault = z.infer<typeof insertDtcFaultSchema>;

// Data linking enhancement schemas and types

export const insertDowntimeEventSchema = createInsertSchema(downtimeEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPartFailureHistorySchema = createInsertSchema(partFailureHistory).omit({
  id: true,
  createdAt: true,
});

export const insertIndustryBenchmarkSchema = createInsertSchema(industryBenchmarks).omit({
  id: true,
  createdAt: true,
  lastUpdated: true,
});

export type DowntimeEvent = typeof downtimeEvents.$inferSelect;
export type InsertDowntimeEvent = z.infer<typeof insertDowntimeEventSchema>;

export type PartFailureHistory = typeof partFailureHistory.$inferSelect;
export type InsertPartFailureHistory = z.infer<typeof insertPartFailureHistorySchema>;

export type IndustryBenchmark = typeof industryBenchmarks.$inferSelect;
export type InsertIndustryBenchmark = z.infer<typeof insertIndustryBenchmarkSchema>;

// Operating condition optimization and PM checklists schemas and types

export const insertOperatingParameterSchema = createInsertSchema(operatingParameters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOperatingConditionAlertSchema = createInsertSchema(operatingConditionAlerts).omit({
  id: true,
  alertedAt: true,
});

export const insertMaintenanceTemplateSchema = createInsertSchema(maintenanceTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMaintenanceChecklistItemSchema = createInsertSchema(maintenanceChecklistItems).omit({
  id: true,
});

export const insertMaintenanceChecklistCompletionSchema = createInsertSchema(maintenanceChecklistCompletions).omit({
  id: true,
});

export type OperatingParameter = typeof operatingParameters.$inferSelect;
export type InsertOperatingParameter = z.infer<typeof insertOperatingParameterSchema>;

export type OperatingConditionAlert = typeof operatingConditionAlerts.$inferSelect;
export type InsertOperatingConditionAlert = z.infer<typeof insertOperatingConditionAlertSchema>;

export type MaintenanceTemplate = typeof maintenanceTemplates.$inferSelect;
export type InsertMaintenanceTemplate = z.infer<typeof insertMaintenanceTemplateSchema>;

export type MaintenanceChecklistItem = typeof maintenanceChecklistItems.$inferSelect;
export type InsertMaintenanceChecklistItem = z.infer<typeof insertMaintenanceChecklistItemSchema>;

export type MaintenanceChecklistCompletion = typeof maintenanceChecklistCompletions.$inferSelect;
export type InsertMaintenanceChecklistCompletion = z.infer<typeof insertMaintenanceChecklistCompletionSchema>;

// Error logging system for debugging and monitoring
export const errorLogs = pgTable("error_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  timestamp: timestamp("timestamp", { mode: "date" }).defaultNow().notNull(),
  severity: text("severity").notNull(), // 'info' | 'warning' | 'error' | 'critical'
  category: text("category").notNull(), // 'frontend' | 'backend' | 'api' | 'database' | 'security' | 'performance'
  message: text("message").notNull(),
  stackTrace: text("stack_trace"),
  context: jsonb("context"), // { userId, url, userAgent, requestId, etc. }
  errorCode: text("error_code"),
  resolved: boolean("resolved").default(false),
  resolvedAt: timestamp("resolved_at", { mode: "date" }),
  resolvedBy: varchar("resolved_by"),
}, (table) => ({
  timestampIndex: index("idx_error_logs_timestamp").on(table.timestamp),
  severityIndex: index("idx_error_logs_severity").on(table.severity),
  categoryIndex: index("idx_error_logs_category").on(table.category),
  resolvedIndex: index("idx_error_logs_resolved").on(table.resolved),
}));

export const insertErrorLogSchema = createInsertSchema(errorLogs).omit({
  id: true,
  timestamp: true,
}).extend({
  orgId: z.string().min(1),
  severity: z.enum(['info', 'warning', 'error', 'critical']),
  category: z.enum(['frontend', 'backend', 'api', 'database', 'security', 'performance']),
  message: z.string().min(1),
  stackTrace: z.string().optional(),
  context: z.record(z.any()).optional(),
  errorCode: z.string().optional(),
});

export type ErrorLog = typeof errorLogs.$inferSelect;
export type InsertErrorLog = z.infer<typeof insertErrorLogSchema>;

// Cost Savings Tracking - Track money saved through predictive maintenance
export const costSavings = pgTable("cost_savings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  workOrderId: varchar("work_order_id").references(() => workOrders.id, { onDelete: 'cascade' }),
  equipmentId: varchar("equipment_id").notNull().references(() => equipment.id),
  vesselId: varchar("vessel_id").references(() => vessels.id),
  predictionId: integer("prediction_id").references(() => failurePredictions.id, { onDelete: 'set null' }),
  
  // Savings calculation
  maintenanceType: text("maintenance_type").notNull(), // 'preventive' | 'predictive' | 'corrective' | 'emergency'
  actualCost: real("actual_cost").notNull().default(0), // What we actually spent
  avoidedCost: real("avoided_cost").notNull().default(0), // What we would have spent (emergency scenario)
  totalSavings: real("total_savings").notNull().default(0), // avoidedCost - actualCost
  
  // Breakdown
  laborSavings: real("labor_savings").default(0),
  partsSavings: real("parts_savings").default(0),
  downtimeSavings: real("downtime_savings").default(0), // Most significant savings
  
  // Downtime prevented
  estimatedDowntimePrevented: real("estimated_downtime_prevented").default(0), // Hours of downtime avoided
  downtimeCostPerHour: real("downtime_cost_per_hour").default(0),
  
  // Attribution
  triggeredBy: text("triggered_by"), // 'ml_prediction' | 'sensor_alert' | 'scheduled' | 'manual'
  confidenceScore: real("confidence_score"), // ML prediction confidence if applicable
  
  // Emergency cost multipliers (what would have happened)
  emergencyLaborMultiplier: real("emergency_labor_multiplier").default(3.0), // Emergency labor is ~3x normal
  emergencyPartsMultiplier: real("emergency_parts_multiplier").default(1.5), // Rush parts are ~1.5x normal
  
  // Metadata
  notes: text("notes"),
  calculatedAt: timestamp("calculated_at", { mode: "date" }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  orgSavingsIdx: index("idx_cost_savings_org").on(table.orgId, table.calculatedAt),
  equipmentSavingsIdx: index("idx_cost_savings_equipment").on(table.equipmentId, table.calculatedAt),
  vesselSavingsIdx: index("idx_cost_savings_vessel").on(table.vesselId, table.calculatedAt),
  workOrderIdx: index("idx_cost_savings_work_order").on(table.workOrderId),
}));

export const insertCostSavingsSchema = createInsertSchema(costSavings).omit({
  id: true,
  calculatedAt: true,
  createdAt: true,
}).extend({
  orgId: z.string().min(1),
  equipmentId: z.string().min(1),
  maintenanceType: z.enum(['preventive', 'predictive', 'corrective', 'emergency']),
  actualCost: z.number().min(0),
  avoidedCost: z.number().min(0),
  totalSavings: z.number(),
});

export type CostSavings = typeof costSavings.$inferSelect;
export type InsertCostSavings = z.infer<typeof insertCostSavingsSchema>;

// Cost Savings API Validation Schemas
export const costSavingsSummaryQuerySchema = z.object({
  months: z.string().regex(/^\d+$/).transform(Number).refine(n => n >= 1 && n <= 60, {
    message: "Months must be between 1 and 60"
  }).default("12")
});

export const costSavingsTrendQuerySchema = z.object({
  months: z.string().regex(/^\d+$/).transform(Number).refine(n => n >= 1 && n <= 60, {
    message: "Months must be between 1 and 60"
  }).default("12")
});

export const costSavingsCalculateOptionsSchema = z.object({
  emergencyLaborMultiplier: z.number().min(1).max(10).optional(),
  emergencyPartsMultiplier: z.number().min(1).max(5).optional(),
  emergencyDowntimeMultiplier: z.number().min(1).max(10).optional()
}).optional();

export const costSavingsListQuerySchema = z.object({
  equipmentId: z.string().uuid().optional(),
  vesselId: z.string().uuid().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).refine(n => n >= 1 && n <= 500, {
    message: "Limit must be between 1 and 500"
  }).default("50")
});

export const downtimeCostValidationSchema = z.object({
  downtimeCostPerHour: z.number().min(100).max(50000, {
    message: "Downtime cost per hour must be between $100 and $50,000"
  })
});

export * from "./sync-conflicts-schema";
