import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

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

export const devices = pgTable("devices", {
  id: varchar("id").primaryKey(),
  orgId: varchar("org_id").notNull().references(() => organizations.id), // foreign key to organizations
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
  orgId: varchar("org_id").notNull().references(() => organizations.id), // foreign key to organizations
  equipmentId: text("equipment_id").notNull(),
  status: text("status").notNull().default("open"),
  priority: integer("priority").notNull().default(3),
  reason: text("reason"),
  description: text("description"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const equipmentTelemetry = pgTable("equipment_telemetry", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull(), // scoped to organization
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
  orgId: varchar("org_id").notNull(), // scoped to organization
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
  orgId: varchar("org_id").notNull(), // scoped to organization
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
  openaiApiKey: text("openai_api_key"),
});

export const maintenanceSchedules = pgTable("maintenance_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull(), // scoped to organization
  equipmentId: text("equipment_id").notNull(),
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
});

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
  recordId: text("record_id").notNull(), // references maintenance_records.id
  scheduleId: text("schedule_id"), // references maintenance_schedules.id
  equipmentId: text("equipment_id").notNull(),
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

export const insertMaintenanceScheduleSchema = createInsertSchema(maintenanceSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  maintenanceType: z.enum(['preventive', 'corrective', 'predictive']),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).default('scheduled'),
  priority: z.number().min(1).max(3).default(2),
  pdmScore: z.number().min(0).max(100).optional(),
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

export type AlertSuppression = typeof alertSuppressions.$inferSelect;
export type InsertAlertSuppression = z.infer<typeof insertAlertSuppressionSchema>;

export type AlertComment = typeof alertComments.$inferSelect;
export type InsertAlertComment = z.infer<typeof insertAlertCommentSchema>;

export type ComplianceAuditLog = typeof complianceAuditLog.$inferSelect;
export type InsertComplianceAuditLog = z.infer<typeof insertComplianceAuditLogSchema>;

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
  vesselId: text("vessel_id"), // optional vessel identification
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
  standardCost: real("standard_cost").default(0), // standard unit cost
  leadTimeDays: integer("lead_time_days").default(7), // typical lead time
  criticality: text("criticality").default("medium"), // low, medium, high, critical
  specifications: jsonb("specifications"), // technical specifications
  compatibleEquipment: text("compatible_equipment").array(), // equipment IDs this part fits
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// Suppliers: Vendor and supplier management
export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  code: text("code").notNull(), // short supplier code
  contactInfo: jsonb("contact_info"), // address, phone, email, etc.
  leadTimeDays: integer("lead_time_days").default(14), // typical lead time
  qualityRating: real("quality_rating").default(5.0), // 1-10 quality score
  paymentTerms: text("payment_terms"), // NET30, COD, etc.
  isPreferred: boolean("is_preferred").default(false),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// Stock Levels: Inventory tracking by location
export const stock = pgTable("stock", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  partNo: text("part_no").notNull(), // references parts.partNo
  location: text("location").notNull().default("MAIN"), // warehouse/location code
  quantityOnHand: real("quantity_on_hand").default(0),
  quantityReserved: real("quantity_reserved").default(0), // reserved for work orders
  quantityOnOrder: real("quantity_on_order").default(0), // incoming orders
  lastCountDate: timestamp("last_count_date", { mode: "date" }),
  binLocation: text("bin_location"), // specific bin/shelf location
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// Part Substitutions: Alternative parts mapping
export const partSubstitutions = pgTable("part_substitutions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  primaryPartNo: text("primary_part_no").notNull(), // preferred part
  alternatePartNo: text("alternate_part_no").notNull(), // substitute part
  substitutionType: text("substitution_type").default("equivalent"), // equivalent, acceptable, emergency
  notes: text("notes"), // substitution notes and restrictions
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

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

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStockSchema = createInsertSchema(stock).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPartSubstitutionSchema = createInsertSchema(partSubstitutions).omit({
  id: true,
  createdAt: true,
});

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

// ===== CREW MANAGEMENT SYSTEM =====

// Crew members with maritime roles and qualifications
export const crew = pgTable("crew", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  rank: text("rank"), // Chief Engineer, Deck Officer, Able Seaman, etc.
  vesselId: text("vessel_id"), // assigned vessel
  maxHours7d: real("max_hours_7d").default(72), // max hours per 7-day period
  minRestH: real("min_rest_h").default(10), // minimum rest hours between shifts
  active: boolean("active").default(true),
  notes: text("notes"),
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
  vesselId: text("vessel_id"),
  equipmentId: text("equipment_id"),
  role: text("role").notNull(), // Watch, Maintenance, Engine Room, etc.
  start: text("start").notNull(), // HH:MM:SS format
  end: text("end").notNull(), // HH:MM:SS format
  needed: integer("needed").default(1), // number of crew needed
  skillRequired: text("skill_required"), // required skill for this shift
  description: text("description"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

// Actual crew assignments
export const crewAssignment = pgTable("crew_assignment", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull(), // YYYY-MM-DD format
  shiftId: varchar("shift_id").references(() => shiftTemplate.id),
  crewId: varchar("crew_id").notNull().references(() => crew.id),
  vesselId: text("vessel_id"),
  start: timestamp("start", { mode: "date" }).notNull(),
  end: timestamp("end", { mode: "date" }).notNull(),
  role: text("role"),
  status: text("status").default("scheduled"), // scheduled, completed, cancelled
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

// Zod schemas for crew management
export const insertCrewSchema = createInsertSchema(crew).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCrew = z.infer<typeof insertCrewSchema>;
export type SelectCrew = typeof crew.$inferSelect;

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
