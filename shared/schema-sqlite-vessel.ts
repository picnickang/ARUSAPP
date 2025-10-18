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

// ============================================================================
// PHASE 1: WORK ORDERS & MAINTENANCE (15 Tables)
// ============================================================================

// Work Orders - Core CMMS functionality
export const workOrdersSqlite = sqliteTable("work_orders", {
  id: text("id").primaryKey(),
  woNumber: text("wo_number"),
  orgId: text("org_id").notNull(),
  equipmentId: text("equipment_id").notNull(),
  vesselId: text("vessel_id"),
  status: text("status").notNull().default("open"),
  priority: integer("priority").notNull().default(3),
  maintenanceType: text("maintenance_type"),
  reason: text("reason"),
  description: text("description"),
  // Cost tracking (numeric → real)
  estimatedHours: real("estimated_hours"),
  actualHours: real("actual_hours"),
  estimatedCostPerHour: real("estimated_cost_per_hour"),
  actualCostPerHour: real("actual_cost_per_hour"),
  estimatedDowntimeHours: real("estimated_downtime_hours"),
  actualDowntimeHours: real("actual_downtime_hours"),
  totalPartsCost: real("total_parts_cost").default(0),
  totalLaborCost: real("total_labor_cost").default(0),
  totalCost: real("total_cost").default(0),
  roi: real("roi"),
  downtimeCostPerHour: real("downtime_cost_per_hour"),
  // Vessel downtime tracking (boolean → integer)
  affectsVesselDowntime: integer("affects_vessel_downtime", { mode: 'boolean' }).default(false),
  vesselDowntimeStartedAt: integer("vessel_downtime_started_at", { mode: 'timestamp' }),
  // Crew and labor
  assignedCrewId: text("assigned_crew_id"),
  requiredSkills: text("required_skills"), // array → text
  laborHours: real("labor_hours"),
  laborCost: real("labor_cost"),
  // Port and drydock scheduling
  portCallId: text("port_call_id"),
  drydockWindowId: text("drydock_window_id"),
  maintenanceWindow: text("maintenance_window"), // jsonb → text
  maintenanceTemplateId: text("maintenance_template_id"),
  scheduleId: text("schedule_id"),
  // Timestamps
  plannedStartDate: integer("planned_start_date", { mode: 'timestamp' }),
  plannedEndDate: integer("planned_end_date", { mode: 'timestamp' }),
  actualStartDate: integer("actual_start_date", { mode: 'timestamp' }),
  actualEndDate: integer("actual_end_date", { mode: 'timestamp' }),
  createdAt: integer("created_at", { mode: 'timestamp' }),
  updatedAt: integer("updated_at", { mode: 'timestamp' }),
  // Optimistic locking
  version: integer("version").default(1),
  lastModifiedBy: text("last_modified_by"),
  lastModifiedDevice: text("last_modified_device"),
}, (table) => ({
  orgIdx: index("idx_wo_org").on(table.orgId),
  equipmentStatusIdx: index("idx_wo_equipment_status").on(table.equipmentId, table.status),
  vesselIdx: index("idx_wo_vessel").on(table.vesselId),
  scheduleIdx: index("idx_wo_schedule").on(table.scheduleId),
  statusIdx: index("idx_wo_status").on(table.status),
}));

// Work Order Completions - Analytics and tracking
export const workOrderCompletionsSqlite = sqliteTable("work_order_completions", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  workOrderId: text("work_order_id").notNull(),
  equipmentId: text("equipment_id").notNull(),
  vesselId: text("vessel_id"),
  // Completion details
  completedAt: integer("completed_at", { mode: 'timestamp' }).notNull(),
  completedBy: text("completed_by"),
  completedByName: text("completed_by_name"),
  // Duration tracking
  actualDurationMinutes: integer("actual_duration_minutes"),
  estimatedDurationMinutes: integer("estimated_duration_minutes"),
  plannedStartDate: integer("planned_start_date", { mode: 'timestamp' }),
  plannedEndDate: integer("planned_end_date", { mode: 'timestamp' }),
  actualStartDate: integer("actual_start_date", { mode: 'timestamp' }),
  actualEndDate: integer("actual_end_date", { mode: 'timestamp' }),
  // Cost tracking
  totalCost: real("total_cost").default(0),
  totalPartsCost: real("total_parts_cost").default(0),
  totalLaborCost: real("total_labor_cost").default(0),
  // Downtime tracking
  estimatedDowntimeHours: real("estimated_downtime_hours"),
  actualDowntimeHours: real("actual_downtime_hours"),
  affectsVesselDowntime: integer("affects_vessel_downtime", { mode: 'boolean' }).default(false),
  vesselDowntimeHours: real("vessel_downtime_hours"),
  // Parts usage
  partsUsed: text("parts_used"), // jsonb → text
  partsCount: integer("parts_count").default(0),
  // Compliance and quality
  completionStatus: text("completion_status").default("completed"),
  complianceFlags: text("compliance_flags"), // array → text
  qualityCheckPassed: integer("quality_check_passed", { mode: 'boolean' }),
  notes: text("notes"),
  // Predictive context
  predictiveContext: text("predictive_context"), // jsonb → text
  maintenanceScheduleId: text("maintenance_schedule_id"),
  maintenanceType: text("maintenance_type"),
  // Performance metrics
  onTimeCompletion: integer("on_time_completion", { mode: 'boolean' }),
  durationVariancePercent: real("duration_variance_percent"),
  costVariancePercent: real("cost_variance_percent"),
  createdAt: integer("created_at", { mode: 'timestamp' }),
}, (table) => ({
  orgIdx: index("idx_woc_org").on(table.orgId),
  completedAtIdx: index("idx_woc_completed_at").on(table.completedAt),
  equipmentIdx: index("idx_woc_equipment").on(table.equipmentId),
  vesselIdx: index("idx_woc_vessel").on(table.vesselId),
  workOrderIdx: index("idx_woc_work_order").on(table.workOrderId),
}));

// Work Order Parts - Parts usage tracking
export const workOrderPartsSqlite = sqliteTable("work_order_parts", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  workOrderId: text("work_order_id").notNull(),
  partId: text("part_id").notNull(),
  quantityUsed: integer("quantity_used").notNull(),
  unitCost: real("unit_cost").notNull(),
  totalCost: real("total_cost").notNull(),
  usedBy: text("used_by").notNull(),
  usedAt: integer("used_at", { mode: 'timestamp' }),
  notes: text("notes"),
  // Supply chain tracking
  supplierId: text("supplier_id"),
  estimatedDeliveryDate: integer("estimated_delivery_date", { mode: 'timestamp' }),
  actualDeliveryDate: integer("actual_delivery_date", { mode: 'timestamp' }),
  actualCost: real("actual_cost"),
  deliveryStatus: text("delivery_status").default("pending"),
  inventoryMovementId: text("inventory_movement_id"),
  createdAt: integer("created_at", { mode: 'timestamp' }),
}, (table) => ({
  workOrderIdx: index("idx_wop_work_order").on(table.workOrderId),
  partIdx: index("idx_wop_part").on(table.partId),
}));

// Maintenance Schedules - PM scheduling
export const maintenanceSchedulesSqlite = sqliteTable("maintenance_schedules", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  equipmentId: text("equipment_id").notNull(),
  vesselId: text("vessel_id"),
  scheduledDate: integer("scheduled_date", { mode: 'timestamp' }).notNull(),
  maintenanceType: text("maintenance_type").notNull(),
  priority: integer("priority").notNull().default(2),
  estimatedDuration: integer("estimated_duration"),
  description: text("description"),
  status: text("status").notNull().default("scheduled"),
  assignedTo: text("assigned_to"),
  pdmScore: real("pdm_score"),
  autoGenerated: integer("auto_generated", { mode: 'boolean' }).default(false),
  workOrderId: text("work_order_id"),
  createdAt: integer("created_at", { mode: 'timestamp' }),
  updatedAt: integer("updated_at", { mode: 'timestamp' }),
}, (table) => ({
  equipmentIdx: index("idx_ms_equipment").on(table.equipmentId),
  vesselIdx: index("idx_ms_vessel").on(table.vesselId),
  scheduledDateIdx: index("idx_ms_scheduled_date").on(table.scheduledDate),
  statusIdx: index("idx_ms_status").on(table.status),
}));

// Maintenance Records - Maintenance history
export const maintenanceRecordsSqlite = sqliteTable("maintenance_records", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  scheduleId: text("schedule_id").notNull(),
  equipmentId: text("equipment_id").notNull(),
  maintenanceType: text("maintenance_type").notNull(),
  actualStartTime: integer("actual_start_time", { mode: 'timestamp' }),
  actualEndTime: integer("actual_end_time", { mode: 'timestamp' }),
  actualDuration: integer("actual_duration"),
  technician: text("technician"),
  notes: text("notes"),
  partsUsed: text("parts_used"), // JSON array → text
  laborHours: real("labor_hours"),
  downtimeMinutes: integer("downtime_minutes"),
  completionStatus: text("completion_status").notNull().default("completed"),
  followUpRequired: integer("follow_up_required", { mode: 'boolean' }).default(false),
  createdAt: integer("created_at", { mode: 'timestamp' }),
}, (table) => ({
  scheduleIdx: index("idx_mr_schedule").on(table.scheduleId),
  equipmentIdx: index("idx_mr_equipment").on(table.equipmentId),
}));

// Maintenance Costs - Cost tracking
export const maintenanceCostsSqlite = sqliteTable("maintenance_costs", {
  id: text("id").primaryKey(),
  recordId: text("record_id"),
  scheduleId: text("schedule_id"),
  equipmentId: text("equipment_id").notNull(),
  workOrderId: text("work_order_id"),
  costType: text("cost_type").notNull(),
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("USD"),
  description: text("description"),
  incurredAt: integer("incurred_at", { mode: 'timestamp' }),
  createdAt: integer("created_at", { mode: 'timestamp' }),
}, (table) => ({
  equipmentIdx: index("idx_mc_equipment").on(table.equipmentId),
  workOrderIdx: index("idx_mc_work_order").on(table.workOrderId),
}));

// Maintenance Templates - PM checklists
export const maintenanceTemplatesSqlite = sqliteTable("maintenance_templates", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  equipmentType: text("equipment_type").notNull(),
  manufacturer: text("manufacturer"),
  model: text("model"),
  maintenanceType: text("maintenance_type").notNull(),
  frequencyDays: integer("frequency_days"),
  frequencyHours: integer("frequency_hours"),
  estimatedDurationHours: real("estimated_duration_hours"),
  priority: integer("priority").default(3),
  requiredSkills: text("required_skills"), // array → text
  requiredParts: text("required_parts"), // jsonb → text
  safetyNotes: text("safety_notes"),
  isActive: integer("is_active", { mode: 'boolean' }).default(true),
  createdAt: integer("created_at", { mode: 'timestamp' }),
  updatedAt: integer("updated_at", { mode: 'timestamp' }),
}, (table) => ({
  typeIdx: index("idx_mt_type").on(table.equipmentType),
  activeIdx: index("idx_mt_active").on(table.isActive),
}));

// Maintenance Checklist Items - Individual checklist steps
export const maintenanceChecklistItemsSqlite = sqliteTable("maintenance_checklist_items", {
  id: text("id").primaryKey(),
  templateId: text("template_id").notNull(),
  stepNumber: integer("step_number").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  required: integer("required", { mode: 'boolean' }).default(true),
  imageUrl: text("image_url"),
  estimatedMinutes: integer("estimated_minutes"),
  safetyWarning: text("safety_warning"),
  expectedResult: text("expected_result"),
  acceptanceCriteria: text("acceptance_criteria"),
}, (table) => ({
  templateIdx: index("idx_mci_template").on(table.templateId, table.stepNumber),
}));

// Maintenance Checklist Completions - Checklist execution tracking
export const maintenanceChecklistCompletionsSqlite = sqliteTable("maintenance_checklist_completions", {
  id: text("id").primaryKey(),
  workOrderId: text("work_order_id").notNull(),
  itemId: text("item_id").notNull(),
  completedAt: integer("completed_at", { mode: 'timestamp' }),
  completedBy: text("completed_by"),
  completedByName: text("completed_by_name"),
  status: text("status").notNull().default("pending"),
  passed: integer("passed", { mode: 'boolean' }),
  actualValue: text("actual_value"),
  notes: text("notes"),
  photoUrls: text("photo_urls"), // array → text
}, (table) => ({
  workOrderIdx: index("idx_mcc_work_order").on(table.workOrderId),
  itemIdx: index("idx_mcc_item").on(table.itemId),
}));

// Equipment Lifecycle - Lifecycle tracking
export const equipmentLifecycleSqlite = sqliteTable("equipment_lifecycle", {
  id: text("id").primaryKey(),
  equipmentId: text("equipment_id").notNull(),
  manufacturer: text("manufacturer"),
  model: text("model"),
  serialNumber: text("serial_number"),
  installationDate: integer("installation_date", { mode: 'timestamp' }),
  warrantyExpiry: integer("warranty_expiry", { mode: 'timestamp' }),
  expectedLifespan: integer("expected_lifespan"),
  replacementCost: real("replacement_cost"),
  operatingHours: integer("operating_hours").default(0),
  maintenanceCount: integer("maintenance_count").default(0),
  lastMajorOverhaul: integer("last_major_overhaul", { mode: 'timestamp' }),
  nextRecommendedReplacement: integer("next_recommended_replacement", { mode: 'timestamp' }),
  condition: text("condition").notNull().default("good"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: 'timestamp' }),
  updatedAt: integer("updated_at", { mode: 'timestamp' }),
}, (table) => ({
  equipmentIdx: index("idx_el_equipment").on(table.equipmentId),
}));

// Performance Metrics - Equipment performance tracking
export const performanceMetricsSqlite = sqliteTable("performance_metrics", {
  id: text("id").primaryKey(),
  equipmentId: text("equipment_id").notNull(),
  metricDate: integer("metric_date", { mode: 'timestamp' }).notNull(),
  efficiency: real("efficiency"),
  reliability: real("reliability"),
  availability: real("availability"),
  mtbfHours: real("mtbf_hours"),
  mttrHours: real("mttr_hours"),
  totalDowntimeMinutes: integer("total_downtime_minutes"),
  plannedDowntimeMinutes: integer("planned_downtime_minutes"),
  unplannedDowntimeMinutes: integer("unplanned_downtime_minutes"),
  operatingHours: real("operating_hours"),
  energyConsumption: real("energy_consumption"),
  performanceScore: real("performance_score"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: 'timestamp' }),
}, (table) => ({
  equipmentIdx: index("idx_pm_equipment").on(table.equipmentId),
  dateIdx: index("idx_pm_date").on(table.metricDate),
}));

// Maintenance Windows - System maintenance scheduling
export const maintenanceWindowsSqlite = sqliteTable("maintenance_windows", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(),
  severity: text("severity").notNull().default("low"),
  status: text("status").notNull().default("scheduled"),
  startTime: integer("start_time", { mode: 'timestamp' }).notNull(),
  endTime: integer("end_time", { mode: 'timestamp' }).notNull(),
  actualStartTime: integer("actual_start_time", { mode: 'timestamp' }),
  actualEndTime: integer("actual_end_time", { mode: 'timestamp' }),
  affectedServices: text("affected_services"), // array → text
  maintenanceTasks: text("maintenance_tasks"), // jsonb → text
  completedTasks: text("completed_tasks"), // jsonb → text
  rollbackPlan: text("rollback_plan"),
  createdBy: text("created_by"),
  assignedTo: text("assigned_to"),
  notifyUsers: text("notify_users"), // array → text
  createdAt: integer("created_at", { mode: 'timestamp' }),
  updatedAt: integer("updated_at", { mode: 'timestamp' }),
}, (table) => ({
  orgIdx: index("idx_mw_org").on(table.orgId),
  statusIdx: index("idx_mw_status").on(table.status),
}));

// Port Calls - Vessel port call windows
export const portCallSqlite = sqliteTable("port_call", {
  id: text("id").primaryKey(),
  vesselId: text("vessel_id").notNull(),
  port: text("port").notNull(),
  start: integer("start", { mode: 'timestamp' }).notNull(),
  end: integer("end", { mode: 'timestamp' }).notNull(),
  status: text("status").default("scheduled"),
  createdAt: integer("created_at", { mode: 'timestamp' }),
}, (table) => ({
  vesselIdx: index("idx_pc_vessel").on(table.vesselId),
  startIdx: index("idx_pc_start").on(table.start),
}));

// Drydock Windows - Vessel drydock/maintenance windows
export const drydockWindowSqlite = sqliteTable("drydock_window", {
  id: text("id").primaryKey(),
  vesselId: text("vessel_id").notNull(),
  yard: text("yard"),
  start: integer("start", { mode: 'timestamp' }).notNull(),
  end: integer("end", { mode: 'timestamp' }).notNull(),
  workType: text("work_type"),
  status: text("status").default("scheduled"),
  createdAt: integer("created_at", { mode: 'timestamp' }),
}, (table) => ({
  vesselIdx: index("idx_dw_vessel").on(table.vesselId),
  startIdx: index("idx_dw_start").on(table.start),
}));

// Expenses - Expense tracking
export const expensesSqlite = sqliteTable("expenses", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  type: text("type").notNull(),
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("USD"),
  description: text("description").notNull(),
  vendor: text("vendor"),
  invoiceNumber: text("invoice_number"),
  workOrderId: text("work_order_id"),
  vesselName: text("vessel_name"),
  expenseDate: integer("expense_date", { mode: 'timestamp' }).notNull(),
  approvalStatus: text("approval_status").notNull().default("pending"),
  approvedBy: text("approved_by"),
  approvedAt: integer("approved_at", { mode: 'timestamp' }),
  receipt: text("receipt"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: 'timestamp' }),
  updatedAt: integer("updated_at", { mode: 'timestamp' }),
}, (table) => ({
  orgIdx: index("idx_exp_org").on(table.orgId),
  workOrderIdx: index("idx_exp_work_order").on(table.workOrderId),
  dateIdx: index("idx_exp_date").on(table.expenseDate),
}));

// Labor Rates - Labor cost rates
export const laborRatesSqlite = sqliteTable("labor_rates", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  skillLevel: text("skill_level").notNull(),
  position: text("position").notNull(),
  standardRate: real("standard_rate").notNull(),
  overtimeRate: real("overtime_rate").notNull(),
  emergencyRate: real("emergency_rate").notNull(),
  contractorRate: real("contractor_rate").notNull(),
  currency: text("currency").notNull().default("USD"),
  effectiveDate: integer("effective_date", { mode: 'timestamp' }),
  isActive: integer("is_active", { mode: 'boolean' }).default(true),
  createdAt: integer("created_at", { mode: 'timestamp' }),
  updatedAt: integer("updated_at", { mode: 'timestamp' }),
}, (table) => ({
  orgIdx: index("idx_lr_org").on(table.orgId),
  activeIdx: index("idx_lr_active").on(table.isActive),
}));

// ============================================================================
// PHASE 2: INVENTORY & PARTS MANAGEMENT (Key Tables)
// ============================================================================

// Parts Inventory - Parts catalog
export const partsInventorySqlite = sqliteTable("parts_inventory", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  partNumber: text("part_number").notNull(),
  partName: text("part_name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  manufacturer: text("manufacturer"),
  unitCost: real("unit_cost").notNull(),
  quantityOnHand: integer("quantity_on_hand").notNull().default(0),
  quantityReserved: integer("quantity_reserved").notNull().default(0),
  minStockLevel: integer("min_stock_level").default(1),
  maxStockLevel: integer("max_stock_level").default(100),
  location: text("location"),
  supplierName: text("supplier_name"),
  supplierPartNumber: text("supplier_part_number"),
  leadTimeDays: integer("lead_time_days").default(7),
  isActive: integer("is_active", { mode: 'boolean' }).default(true),
  createdAt: integer("created_at", { mode: 'timestamp' }),
  updatedAt: integer("updated_at", { mode: 'timestamp' }),
}, (table) => ({
  orgIdx: index("idx_pi_org").on(table.orgId),
  partNumberIdx: index("idx_pi_part_number").on(table.partNumber),
  categoryIdx: index("idx_pi_category").on(table.category),
}));

// Stock - Inventory tracking by location
export const stockSqlite = sqliteTable("stock", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  partId: text("part_id").notNull(),
  partNo: text("part_no").notNull(),
  location: text("location").notNull().default("MAIN"),
  quantityOnHand: real("quantity_on_hand").default(0),
  quantityReserved: real("quantity_reserved").default(0),
  quantityOnOrder: real("quantity_on_order").default(0),
  unitCost: real("unit_cost").default(0),
  lastCountDate: integer("last_count_date", { mode: 'timestamp' }),
  binLocation: text("bin_location"),
  supplierId: text("supplier_id"),
  reorderPoint: real("reorder_point"),
  maxQuantity: real("max_quantity"),
  createdAt: integer("created_at", { mode: 'timestamp' }),
  updatedAt: integer("updated_at", { mode: 'timestamp' }),
}, (table) => ({
  orgPartLocationIdx: index("idx_stock_org_part_location").on(table.orgId, table.partId, table.location),
  partNoIdx: index("idx_stock_part_no").on(table.partNo),
  supplierIdx: index("idx_stock_supplier").on(table.supplierId),
}));

// Inventory Movements - Transaction ledger
export const inventoryMovementsSqlite = sqliteTable("inventory_movements", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  partId: text("part_id").notNull(),
  workOrderId: text("work_order_id"),
  movementType: text("movement_type").notNull(),
  quantity: integer("quantity").notNull(),
  quantityBefore: integer("quantity_before").notNull(),
  quantityAfter: integer("quantity_after").notNull(),
  reservedBefore: integer("reserved_before").notNull().default(0),
  reservedAfter: integer("reserved_after").notNull().default(0),
  performedBy: text("performed_by").notNull(),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: 'timestamp' }),
}, (table) => ({
  partIdx: index("idx_im_part").on(table.partId),
  workOrderIdx: index("idx_im_work_order").on(table.workOrderId),
  typeIdx: index("idx_im_type").on(table.movementType),
}));

// Suppliers - Supplier management
export const suppliersSqlite = sqliteTable("suppliers", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  contactInfo: text("contact_info"), // jsonb → text
  leadTimeDays: integer("lead_time_days").default(14),
  qualityRating: real("quality_rating").default(5.0),
  reliabilityScore: real("reliability_score").default(5.0),
  costRating: real("cost_rating").default(5.0),
  paymentTerms: text("payment_terms"),
  isPreferred: integer("is_preferred", { mode: 'boolean' }).default(false),
  isActive: integer("is_active", { mode: 'boolean' }).default(true),
  // Performance tracking
  onTimeDeliveryRate: real("on_time_delivery_rate"),
  defectRate: real("defect_rate").default(0),
  averageLeadTime: integer("average_lead_time"),
  totalOrderValue: real("total_order_value").default(0),
  totalOrders: integer("total_orders").default(0),
  lastOrderDate: integer("last_order_date", { mode: 'timestamp' }),
  // Risk assessment
  riskLevel: text("risk_level").default("medium"),
  backupSuppliers: text("backup_suppliers"), // array → text
  minimumOrderValue: real("minimum_order_value"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: 'timestamp' }),
  updatedAt: integer("updated_at", { mode: 'timestamp' }),
}, (table) => ({
  orgCodeIdx: index("idx_suppliers_org_code").on(table.orgId, table.code),
  nameIdx: index("idx_suppliers_name").on(table.name),
}));

// Purchase Orders - Procurement tracking
export const purchaseOrdersSqlite = sqliteTable("purchase_orders", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  supplierId: text("supplier_id").notNull(),
  orderNumber: text("order_number").notNull(),
  expectedDate: integer("expected_date", { mode: 'timestamp' }),
  totalAmount: real("total_amount"),
  currency: text("currency").default("USD"),
  status: text("status").notNull().default("draft"),
  notes: text("notes"),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at", { mode: 'timestamp' }),
  updatedAt: integer("updated_at", { mode: 'timestamp' }),
}, (table) => ({
  supplierIdx: index("idx_po_supplier").on(table.supplierId),
  statusIdx: index("idx_po_status").on(table.status),
  orderNumberIdx: index("idx_po_order_number").on(table.orderNumber),
}));

// Purchase Order Items - PO line items
export const purchaseOrderItemsSqlite = sqliteTable("purchase_order_items", {
  id: text("id").primaryKey(),
  poId: text("po_id").notNull(),
  partId: text("part_id").notNull(),
  quantity: real("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  totalPrice: real("total_price").notNull(),
  receivedQuantity: real("received_quantity").default(0),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: 'timestamp' }),
}, (table) => ({
  poIdx: index("idx_poi_po").on(table.poId),
  partIdx: index("idx_poi_part").on(table.partId),
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
