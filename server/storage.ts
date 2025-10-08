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
  type AlertSuppression,
  type InsertAlertSuppression,
  type AlertComment,
  type InsertAlertComment,
  type ComplianceAuditLog,
  type InsertComplianceAuditLog,
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
  type RawTelemetry,
  type InsertRawTelemetry,
  type TransportSettings,
  type InsertTransportSettings,
  type Organization,
  type InsertOrganization,
  type User,
  type InsertUser,
  type AdminAuditEvent,
  type InsertAdminAuditEvent,
  type AdminSystemSetting,
  type InsertAdminSystemSetting,
  type IntegrationConfig,
  type InsertIntegrationConfig,
  type MaintenanceWindow,
  type InsertMaintenanceWindow,
  type SystemPerformanceMetric,
  type InsertSystemPerformanceMetric,
  type SystemHealthCheck,
  type InsertSystemHealthCheck,
  type VibrationFeature,
  type InsertVibrationFeature,
  type VibrationAnalysis,
  type InsertVibrationAnalysis,
  type RulModel,
  type InsertRulModel,
  type Part,
  type InsertPart,
  type PartsInventory,
  type InsertPartsInventory,
  type Supplier,
  type InsertSupplier,
  type Stock,
  type InsertStock,
  type PartSubstitution,
  type InsertPartSubstitution,
  type ComplianceBundle,
  type InsertComplianceBundle,
  type SelectCrew,
  type InsertCrew,
  type SelectCrewSkill,
  type InsertCrewSkill,
  type SelectSkill,
  type InsertSkill,
  type SelectCrewLeave,
  type InsertCrewLeave,
  type SelectShiftTemplate,
  type InsertShiftTemplate,
  type SelectCrewAssignment,
  type InsertCrewAssignment,
  type CrewWithSkills,
  type SelectCrewCertification,
  type InsertCrewCertification,
  type SelectPortCall,
  type InsertPortCall,
  type SelectDrydockWindow,
  type InsertDrydockWindow,
  type SelectCrewRestSheet,
  type InsertCrewRestSheet,
  type SelectCrewRestDay,
  type InsertCrewRestDay,
  type SelectVessel,
  type InsertVessel,
  type SelectDeviceRegistry,
  type InsertDeviceRegistry,
  type SelectReplayIncoming,
  type InsertReplayIncoming,
  type SelectSheetLock,
  type InsertSheetLock,
  type SelectSheetVersion,
  type InsertSheetVersion,
  devices,
  edgeHeartbeats,
  pdmScoreLogs,
  workOrders,
  systemSettings,
  equipment,
  equipmentTelemetry,
  alertConfigurations,
  alertNotifications,
  alertSuppressions,
  alertComments,
  complianceAuditLog,
  maintenanceSchedules,
  maintenanceRecords,
  maintenanceCosts,
  equipmentLifecycle,
  performanceMetrics,
  rawTelemetry,
  transportSettings,
  organizations,
  users,
  vibrationFeatures,
  vibrationAnalysis,
  rulModels,
  parts,
  partsInventory,
  suppliers,
  stock,
  partSubstitutions,
  complianceBundles,
  crew,
  crewSkill,
  skills,
  crewLeave,
  shiftTemplate,
  crewAssignment,
  crewCertification,
  portCall,
  drydockWindow,
  idempotencyLog,
  crewRestSheet,
  crewRestDay,
  vessels,
  replayIncoming,
  sheetLock,
  sheetVersion,
  deviceRegistry,
  sensorConfigurations,
  sensorStates,
  optimizerConfigurations,
  resourceConstraints,
  optimizationResults,
  type SensorConfiguration,
  type InsertSensorConfiguration,
  type SensorState,
  type InsertSensorState,
  type InsightSnapshot,
  type InsertInsightSnapshot,
  type InsightReport,
  type InsertInsightReport,
  insightSnapshots,
  insightReports,
  type OilAnalysis,
  type InsertOilAnalysis,
  type WearParticleAnalysis,
  type InsertWearParticleAnalysis,
  type ConditionMonitoring,
  type InsertConditionMonitoring,
  type OilChangeRecord,
  type InsertOilChangeRecord,
  oilAnalysis,
  wearParticleAnalysis,
  conditionMonitoring,
  oilChangeRecords,
  laborRates,
  expenses,
  type LaborRate,
  type InsertLaborRate,
  type Expense,
  type InsertExpense,
  type J1939Configuration,
  type InsertJ1939Configuration,
  j1939Configurations,
  // Analytics tables
  type MlModel,
  type InsertMlModel,
  type AnomalyDetection,
  type InsertAnomalyDetection,
  type FailurePrediction,
  type InsertFailurePrediction,
  type ThresholdOptimization,
  type InsertThresholdOptimization,
  type DigitalTwin,
  type InsertDigitalTwin,
  type TwinSimulation,
  type InsertTwinSimulation,
  type DtcDefinition,
  type InsertDtcDefinition,
  type DtcFault,
  type InsertDtcFault,
  type DowntimeEvent,
  type InsertDowntimeEvent,
  type PartFailureHistory,
  type InsertPartFailureHistory,
  type IndustryBenchmark,
  type InsertIndustryBenchmark,
  type OperatingParameter,
  type InsertOperatingParameter,
  type OperatingConditionAlert,
  type InsertOperatingConditionAlert,
  type MaintenanceTemplate,
  type InsertMaintenanceTemplate,
  type MaintenanceChecklistItem,
  type InsertMaintenanceChecklistItem,
  type MaintenanceChecklistCompletion,
  type InsertMaintenanceChecklistCompletion,
  mlModels,
  anomalyDetections,
  failurePredictions,
  thresholdOptimizations,
  digitalTwins,
  twinSimulations,
  workOrderParts,
  dtcDefinitions,
  dtcFaults,
  downtimeEvents,
  partFailureHistory,
  industryBenchmarks,
  operatingParameters,
  operatingConditionAlerts,
  maintenanceTemplates,
  maintenanceChecklistItems,
  maintenanceChecklistCompletions,
  metricsHistory
} from "@shared/schema";
import { randomUUID } from "crypto";
import { eq, desc, and, or, gte, lte, sql, inArray, like, asc, isNull, isNotNull } from "drizzle-orm";
import { recordAndPublish, publishEvent } from "./sync-events.js";
import { db } from "./db";
import { getWebSocketServer } from "./routes";
import { RulEngine } from "./rul-engine.js";

export interface IStorage {
  // Organization management
  getOrganizations(): Promise<Organization[]>;
  getOrganization(id: string): Promise<Organization | undefined>;
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: string, org: Partial<InsertOrganization>): Promise<Organization>;
  deleteOrganization(id: string): Promise<void>;
  
  // User management
  getUsers(orgId?: string): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string, orgId?: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  
  // Device management (now org-scoped)
  getDevices(orgId?: string): Promise<Device[]>;
  getDevice(id: string, orgId?: string): Promise<Device | undefined>;
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
  generateWorkOrderNumber(orgId: string): Promise<string>;
  createWorkOrder(order: InsertWorkOrder & { woNumber?: string }): Promise<WorkOrder>;
  updateWorkOrder(id: string, order: Partial<InsertWorkOrder>): Promise<WorkOrder>;
  deleteWorkOrder(id: string): Promise<void>;
  
  // Enhanced Work Order Management (New Methods) - TEMPORARILY DISABLED
  // getWorkOrderById(id: string, orgId?: string): Promise<WorkOrder | undefined>;
  // getWorkOrdersEnhanced(equipmentId?: string, orgId?: string, status?: string): Promise<WorkOrder[]>;
  // calculateWorkOrderCosts(workOrderId: string): Promise<{ totalPartsCost: number; totalLaborCost: number; totalCost: number; roi?: number }>;
  // updateWorkOrderCosts(workOrderId: string): Promise<WorkOrder>; // Recalculate and update all costs
  
  // Settings
  getSettings(): Promise<SystemSettings>;
  updateSettings(settings: Partial<InsertSettings>): Promise<SystemSettings>;
  
  // Telemetry
  getTelemetryTrends(equipmentId?: string, hours?: number): Promise<TelemetryTrend[]>;
  createTelemetryReading(reading: InsertTelemetry): Promise<EquipmentTelemetry>;
  getTelemetryHistory(
    arg1: string, 
    arg2: string, 
    arg3?: number | string, 
    arg4?: Date,
    arg5?: Date
  ): Promise<EquipmentTelemetry[]>;
  getTelemetryByEquipmentAndDateRange(equipmentId: string, startDate: Date, endDate: Date, orgId?: string): Promise<EquipmentTelemetry[]>;
  
  // Enhanced LLM Report Context (for AI-powered analysis)
  getVesselContext(vesselId: string, orgId?: string): Promise<{
    vessel: any;
    ageYears: number;
    operatingConditions: string[];
    environmentalFactors: string[];
    maintenanceHistory: any[];
    fleetPosition?: { lat: number; lng: number };
  }>;
  getRelatedEquipment(equipmentId: string, orgId?: string): Promise<Equipment[]>;
  getWorkOrderHistory(equipmentId: string, days?: number, orgId?: string): Promise<WorkOrder[]>;
  getMaintenanceHistory(equipmentId: string, days?: number, orgId?: string): Promise<any[]>;
  
  // Sensor configurations
  getSensorConfigurations(orgId?: string, equipmentId?: string, sensorType?: string): Promise<SensorConfiguration[]>;
  getSensorConfiguration(equipmentId: string, sensorType: string, orgId?: string): Promise<SensorConfiguration | undefined>;
  createSensorConfiguration(config: InsertSensorConfiguration): Promise<SensorConfiguration>;
  updateSensorConfiguration(equipmentId: string, sensorType: string, config: Partial<InsertSensorConfiguration>, orgId?: string): Promise<SensorConfiguration>;
  deleteSensorConfiguration(equipmentId: string, sensorType: string, orgId?: string): Promise<void>;
  // ID-based convenience methods for UI
  updateSensorConfigurationById(id: string, config: Partial<InsertSensorConfiguration>, orgId?: string): Promise<SensorConfiguration>;
  deleteSensorConfigurationById(id: string, orgId?: string): Promise<void>;
  
  // Sensor states
  getSensorState(equipmentId: string, sensorType: string, orgId?: string): Promise<SensorState | undefined>;
  upsertSensorState(state: InsertSensorState): Promise<SensorState>;
  
  // J1939 configurations
  getJ1939Configurations(orgId: string, deviceId?: string): Promise<J1939Configuration[]>;
  getJ1939Configuration(id: string, orgId: string): Promise<J1939Configuration | undefined>;
  createJ1939Configuration(config: InsertJ1939Configuration): Promise<J1939Configuration>;
  updateJ1939Configuration(id: string, config: Partial<InsertJ1939Configuration>, orgId: string): Promise<J1939Configuration>;
  deleteJ1939Configuration(id: string, orgId: string): Promise<void>;
  
  // DTC (Diagnostic Trouble Codes) management
  getDtcDefinitions(spn?: number, fmi?: number, manufacturer?: string): Promise<DtcDefinition[]>;
  getDtcDefinition(spn: number, fmi: number, manufacturer?: string): Promise<DtcDefinition | undefined>;
  createDtcDefinition(definition: InsertDtcDefinition): Promise<DtcDefinition>;
  bulkInsertDtcDefinitions(definitions: InsertDtcDefinition[]): Promise<number>;
  getActiveDtcs(equipmentId: string, orgId?: string): Promise<(DtcFault & { definition?: DtcDefinition })[]>;
  getDtcHistory(equipmentId: string, orgId?: string, filters?: {
    spn?: number;
    fmi?: number;
    severity?: number;
    from?: Date;
    to?: Date;
    limit?: number;
  }): Promise<(DtcFault & { definition?: DtcDefinition })[]>;
  upsertDtcFault(fault: InsertDtcFault): Promise<DtcFault>;
  clearInactiveDtcs(deviceId: string, activeSPNs: Array<{spn: number; fmi: number}>): Promise<number>;
  
  // Alert configurations
  getAlertConfigurations(equipmentId?: string): Promise<AlertConfiguration[]>;
  createAlertConfiguration(config: InsertAlertConfig): Promise<AlertConfiguration>;
  updateAlertConfiguration(id: string, config: Partial<InsertAlertConfig>): Promise<AlertConfiguration>;
  deleteAlertConfiguration(id: string): Promise<void>;
  
  // Alert notifications (now org-scoped)
  getAlertNotifications(acknowledged?: boolean, orgId?: string): Promise<AlertNotification[]>;
  createAlertNotification(notification: InsertAlertNotification): Promise<AlertNotification>;
  acknowledgeAlert(id: string, acknowledgedBy: string): Promise<AlertNotification>;
  hasRecentAlert(equipmentId: string, sensorType: string, alertType: string, minutesBack?: number): Promise<boolean>;
  
  // Alert comments
  addAlertComment(commentData: InsertAlertComment): Promise<AlertComment>;
  getAlertComments(alertId: string): Promise<AlertComment[]>;
  
  // Alert suppressions
  createAlertSuppression(suppressionData: InsertAlertSuppression): Promise<AlertSuppression>;
  getActiveSuppressions(): Promise<AlertSuppression[]>;
  removeAlertSuppression(id: string): Promise<void>;
  isAlertSuppressed(equipmentId: string, sensorType: string, alertType: string): Promise<boolean>;
  
  // Compliance audit logging
  logComplianceAction(data: InsertComplianceAuditLog): Promise<ComplianceAuditLog>;
  getComplianceAuditLog(filters?: { 
    entityType?: string; 
    entityId?: string; 
    complianceStandard?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<ComplianceAuditLog[]>;
  
  // Dashboard data (now org-scoped)
  getDashboardMetrics(orgId?: string): Promise<DashboardMetrics>;
  recordMetricsHistory(orgId: string, metrics: Omit<DashboardMetrics, 'trends'>, equipmentStats: { total: number; healthy: number; warning: number; critical: number }): Promise<void>;
  getMetricsHistory(orgId: string, days?: number): Promise<any[]>;
  getDevicesWithStatus(orgId?: string): Promise<DeviceWithStatus[]>;
  getEquipmentHealth(orgId?: string, vesselId?: string): Promise<EquipmentHealth[]>;
  
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
  getMaintenanceCostsByWorkOrder(workOrderId: string): Promise<MaintenanceCost[]>;
  createMaintenanceCost(cost: InsertMaintenanceCost): Promise<MaintenanceCost>;
  getCostSummaryByEquipment(equipmentId?: string, months?: number): Promise<{ equipmentId: string; totalCost: number; costByType: Record<string, number> }[]>;
  getCostTrends(months?: number): Promise<{ month: string; totalCost: number; costByType: Record<string, number> }[]>;
  
  // Parts cost management
  updatePartCost(partId: string, updateData: { unitCost: number; supplier: string }): Promise<PartsInventory>;
  
  // Stock quantities management
  updatePartStockQuantities(partId: string, updateData: {
    quantityOnHand?: number;
    quantityReserved?: number;
    minStockLevel?: number;
    maxStockLevel?: number;
  }): Promise<PartsInventory>;
  
  // Labor rates
  getLaborRates(orgId?: string): Promise<LaborRate[]>;
  createLaborRate(rate: InsertLaborRate): Promise<LaborRate>;
  updateLaborRate(rateId: string, updateData: Partial<InsertLaborRate>): Promise<LaborRate>;
  updateCrewRate(crewId: string, updateData: { currentRate: number; overtimeMultiplier: number; effectiveDate: Date }): Promise<SelectCrew>;
  
  // Expense tracking
  getExpenses(orgId?: string): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpenseStatus(expenseId: string, status: 'pending' | 'approved' | 'rejected'): Promise<Expense>;
  
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

  // Raw telemetry ingestion methods
  getRawTelemetry(vessel?: string, fromDate?: Date, toDate?: Date): Promise<RawTelemetry[]>;
  bulkInsertRawTelemetry(telemetryData: InsertRawTelemetry[]): Promise<number>;
  deleteRawTelemetry(id: string): Promise<void>;
  
  // Transport settings methods
  getTransportSettings(): Promise<TransportSettings | undefined>;
  createTransportSettings(settings: InsertTransportSettings): Promise<TransportSettings>;
  updateTransportSettings(id: string, settings: Partial<InsertTransportSettings>): Promise<TransportSettings>;
  
  // Data cleanup methods
  clearOrphanedTelemetryData(): Promise<void>;
  clearAllAlerts(): Promise<void>;
  
  // CMMS-lite: Work Order Checklists
  getWorkOrderChecklists(workOrderId?: string, orgId?: string): Promise<WorkOrderChecklist[]>;
  createWorkOrderChecklist(checklist: InsertWorkOrderChecklist): Promise<WorkOrderChecklist>;
  updateWorkOrderChecklist(id: string, checklist: Partial<InsertWorkOrderChecklist>): Promise<WorkOrderChecklist>;
  deleteWorkOrderChecklist(id: string): Promise<void>;
  
  // CMMS-lite: Work Order Worklogs 
  getWorkOrderWorklogs(workOrderId?: string, orgId?: string): Promise<WorkOrderWorklog[]>;
  createWorkOrderWorklog(worklog: InsertWorkOrderWorklog): Promise<WorkOrderWorklog>;
  updateWorkOrderWorklog(id: string, worklog: Partial<InsertWorkOrderWorklog>): Promise<WorkOrderWorklog>;
  deleteWorkOrderWorklog(id: string): Promise<void>;
  calculateWorklogCosts(workOrderId: string): Promise<{ totalLaborHours: number; totalLaborCost: number }>;
  
  // CMMS-lite: Parts Inventory
  getPartsInventory(category?: string, orgId?: string, search?: string, sortBy?: string, sortOrder?: 'asc' | 'desc'): Promise<any[]>;
  getPartById(id: string, orgId?: string): Promise<PartsInventory | undefined>;
  createPart(part: InsertPartsInventory): Promise<PartsInventory>;
  updatePart(id: string, part: Partial<InsertPartsInventory>): Promise<PartsInventory>;
  deletePart(id: string): Promise<void>;
  getLowStockParts(orgId?: string): Promise<PartsInventory[]>; // parts below min stock level
  reservePart(partId: string, quantity: number): Promise<PartsInventory>; // allocate to work order
  
  // Enhanced Work Order Parts Usage with Validation
  getWorkOrderParts(workOrderId?: string, orgId?: string): Promise<WorkOrderParts[]>;
  addPartToWorkOrder(workOrderPart: InsertWorkOrderParts): Promise<WorkOrderParts>;
  addPartToWorkOrderWithValidation(workOrderId: string, partId: string, quantity: number, usedBy: string, orgId: string): Promise<WorkOrderParts>;
  updateWorkOrderPart(id: string, workOrderPart: Partial<InsertWorkOrderParts>): Promise<WorkOrderParts>;
  removePartFromWorkOrder(id: string): Promise<void>;
  getPartsCostForWorkOrder(workOrderId: string): Promise<{ totalPartsCost: number; partsCount: number }>;
  checkPartAvailabilityForWorkOrder(partId: string, quantity: number, orgId?: string): Promise<{ available: boolean; onHand: number; reserved: number }>;
  reservePartsForWorkOrder(workOrderId: string): Promise<void>; // Reserve all parts for a work order
  releasePartsFromWorkOrder(workOrderId: string): Promise<void>; // Release reserved parts when work order is cancelled
  
  // Bulk parts addition with deduplication
  addBulkPartsToWorkOrder(
    workOrderId: string, 
    partsToAdd: Array<{ partId: string; quantity: number; usedBy: string; notes?: string }>,
    orgId: string
  ): Promise<{ added: WorkOrderParts[]; updated: WorkOrderParts[]; errors: string[] }>;
  
  // Inventory Risk Analysis: Additional methods for risk assessment
  getWorkOrderPartsByEquipment(orgId: string, equipmentId: string): Promise<WorkOrderParts[]>;
  getWorkOrderPartsByPartId(orgId: string, partId: string): Promise<WorkOrderParts[]>;
  
  // Equipment-Parts-Sensor Linkage: Methods to connect sensor management, configuration, and inventory
  getPartsForEquipment(equipmentId: string, orgId: string): Promise<Part[]>;
  getEquipmentForPart(partId: string, orgId: string): Promise<Equipment[]>;
  suggestPartsForSensorIssue(equipmentId: string, sensorType: string, orgId: string): Promise<Part[]>;
  getEquipmentWithSensorIssues(orgId: string, severityFilter?: 'warning' | 'critical'): Promise<Array<{ equipment: Equipment; sensors: Array<{ sensorType: string; status: string; value: number | null }> }>>;
  updatePartCompatibility(partId: string, equipmentIds: string[], orgId: string): Promise<Part>;
  
  // Equipment registry management
  getEquipment(orgId: string, equipmentId: string): Promise<Equipment | undefined>;
  getEquipmentRegistry(orgId?: string): Promise<Equipment[]>;
  createEquipment(equipment: InsertEquipment): Promise<Equipment>;
  updateEquipment(id: string, equipment: Partial<InsertEquipment>, orgId?: string): Promise<Equipment>;
  deleteEquipment(id: string, orgId?: string): Promise<void>;
  
  // Vessel-Equipment associations
  getEquipmentByVessel(vesselId: string, orgId: string): Promise<Equipment[]>;
  associateEquipmentToVessel(equipmentId: string, vesselId: string, orgId: string): Promise<Equipment>;
  disassociateEquipmentFromVessel(equipmentId: string, orgId: string): Promise<void>;
  
  getWorkOrder(orgId: string, workOrderId: string): Promise<WorkOrder | undefined>;
  getEquipmentSensorTypes(orgId: string, equipmentId: string): Promise<string[]>;

  // Optimizer v1: Fleet scheduling optimization with greedy algorithm
  getOptimizerConfigurations(orgId?: string): Promise<OptimizerConfiguration[]>;
  createOptimizerConfiguration(config: InsertOptimizerConfiguration): Promise<OptimizerConfiguration>;
  updateOptimizerConfiguration(id: string, config: Partial<InsertOptimizerConfiguration>): Promise<OptimizerConfiguration>;
  deleteOptimizerConfiguration(id: string): Promise<void>;

  // Resource constraints management
  getResourceConstraints(resourceType?: string, orgId?: string): Promise<ResourceConstraint[]>;
  createResourceConstraint(constraint: InsertResourceConstraint): Promise<ResourceConstraint>;
  updateResourceConstraint(id: string, constraint: Partial<InsertResourceConstraint>): Promise<ResourceConstraint>;
  deleteResourceConstraint(id: string): Promise<void>;

  // Optimization execution and results
  runOptimization(configId: string, equipmentScope?: string[], timeHorizon?: number): Promise<OptimizationResult>;
  getOptimizationResults(orgId?: string, limit?: number): Promise<OptimizationResult[]>;
  getOptimizationResult(id: string): Promise<OptimizationResult | undefined>;
  cancelOptimization(optimizationId: string): Promise<OptimizationResult>;

  // Schedule optimization recommendations
  getScheduleOptimizations(optimizationResultId: string): Promise<ScheduleOptimization[]>;
  applyScheduleOptimization(optimizationId: string): Promise<MaintenanceSchedule>;
  rejectScheduleOptimization(optimizationId: string, reason?: string): Promise<ScheduleOptimization>;
  getOptimizationRecommendations(equipmentId?: string, timeHorizon?: number): Promise<ScheduleOptimization[]>;

  // RAG Search System: Knowledge base and enhanced citations
  searchKnowledgeBase(query: string, filters?: { contentType?: string[]; orgId?: string; equipmentId?: string; }): Promise<KnowledgeBaseItem[]>;
  createKnowledgeBaseItem(item: InsertKnowledgeBaseItem): Promise<KnowledgeBaseItem>;
  updateKnowledgeBaseItem(id: string, item: Partial<InsertKnowledgeBaseItem>): Promise<KnowledgeBaseItem>;
  deleteKnowledgeBaseItem(id: string): Promise<void>;
  getKnowledgeBaseItems(orgId?: string, contentType?: string): Promise<KnowledgeBaseItem[]>;
  
  // Content source management for citations
  getContentSources(orgId?: string, sourceType?: string): Promise<ContentSource[]>;
  createContentSource(source: InsertContentSource): Promise<ContentSource>;
  updateContentSource(id: string, source: Partial<InsertContentSource>): Promise<ContentSource>;
  
  // RAG search query logging and analytics
  logRagSearchQuery(query: InsertRagSearchQuery): Promise<RagSearchQuery>;
  getRagSearchHistory(orgId?: string, limit?: number): Promise<RagSearchQuery[]>;
  
  // Enhanced search methods for LLM report generation
  semanticSearch(query: string, orgId: string, contentTypes?: string[], limit?: number): Promise<{ items: KnowledgeBaseItem[]; citations: ContentSource[]; }>;
  indexContent(sourceType: string, sourceId: string, content: string, metadata?: Record<string, any>, orgId?: string): Promise<KnowledgeBaseItem>;
  refreshContentIndex(orgId?: string, sourceTypes?: string[]): Promise<{ indexed: number; updated: number; }>;

  // Advanced PdM: Vibration Analysis
  getVibrationFeatures(equipmentId?: string, orgId?: string): Promise<VibrationFeature[]>;
  createVibrationFeature(feature: InsertVibrationFeature): Promise<VibrationFeature>;
  getVibrationHistory(equipmentId: string, hours?: number, orgId?: string): Promise<VibrationFeature[]>;
  
  // Beast Mode: Advanced Vibration Analysis
  createVibrationAnalysis(analysis: Omit<VibrationAnalysis, 'id' | 'createdAt'>): Promise<VibrationAnalysis>;
  getVibrationAnalysisHistory(orgId: string, equipmentId: string, limit?: number): Promise<VibrationAnalysis[]>;
  
  // Beast Mode: Weibull RUL Analysis  
  createWeibullAnalysis(analysis: Omit<WeibullEstimate, 'id' | 'createdAt'>): Promise<WeibullEstimate>;
  getWeibullAnalysisHistory(equipmentId: string, orgId: string, limit?: number): Promise<WeibullEstimate[]>;
  
  // Advanced PdM: RUL Models
  getRulModels(componentClass?: string, orgId?: string): Promise<RulModel[]>;
  getRulModel(modelId: string, orgId?: string): Promise<RulModel | undefined>;
  createRulModel(model: InsertRulModel): Promise<RulModel>;
  updateRulModel(id: string, model: Partial<InsertRulModel>): Promise<RulModel>;
  deleteRulModel(id: string): Promise<void>;
  
  // TEMPORARILY REMOVED ALL ENHANCED INVENTORY METHODS TO FIX 500 ERRORS
  
  // Advanced PdM: Compliance Bundles
  getComplianceBundles(orgId?: string): Promise<ComplianceBundle[]>;
  createComplianceBundle(bundle: InsertComplianceBundle): Promise<ComplianceBundle>;
  getComplianceBundle(bundleId: string, orgId?: string): Promise<ComplianceBundle | undefined>;
  deleteComplianceBundle(id: string): Promise<void>;
  
  // Crew Management System
  getCrew(orgId?: string, vesselId?: string): Promise<CrewWithSkills[]>;
  getCrewMember(id: string, orgId?: string): Promise<SelectCrew | undefined>;
  createCrew(crew: InsertCrew): Promise<SelectCrew>;
  updateCrew(id: string, crew: Partial<InsertCrew>): Promise<SelectCrew>;
  deleteCrew(id: string): Promise<void>;
  
  // Crew Skills
  setCrewSkill(crewId: string, skill: string, level: number): Promise<SelectCrewSkill>;
  getCrewSkills(crewId: string): Promise<SelectCrewSkill[]>;
  deleteCrewSkill(crewId: string, skill: string): Promise<void>;
  
  // Skills Master Catalog
  getSkills(orgId?: string): Promise<SelectSkill[]>;
  createSkill(skill: InsertSkill): Promise<SelectSkill>;
  updateSkill(id: string, skill: Partial<InsertSkill>): Promise<SelectSkill>;
  deleteSkill(id: string): Promise<void>;
  
  // Crew Leave
  getCrewLeave(crewId?: string, startDate?: Date, endDate?: Date): Promise<SelectCrewLeave[]>;
  createCrewLeave(leave: InsertCrewLeave): Promise<SelectCrewLeave>;
  updateCrewLeave(id: string, leave: Partial<InsertCrewLeave>): Promise<SelectCrewLeave>;
  deleteCrewLeave(id: string): Promise<void>;
  
  // Shift Templates
  getShiftTemplates(vesselId?: string): Promise<SelectShiftTemplate[]>;
  getShiftTemplate(id: string): Promise<SelectShiftTemplate | undefined>;
  createShiftTemplate(template: InsertShiftTemplate): Promise<SelectShiftTemplate>;
  updateShiftTemplate(id: string, template: Partial<InsertShiftTemplate>): Promise<SelectShiftTemplate>;
  deleteShiftTemplate(id: string): Promise<void>;
  
  // Crew Assignments
  getCrewAssignments(date?: string, crewId?: string, vesselId?: string): Promise<SelectCrewAssignment[]>;
  createCrewAssignment(assignment: InsertCrewAssignment): Promise<SelectCrewAssignment>;
  updateCrewAssignment(id: string, assignment: Partial<InsertCrewAssignment>): Promise<SelectCrewAssignment>;
  deleteCrewAssignment(id: string): Promise<void>;
  
  // Bulk assignment creation for schedule planning
  createBulkCrewAssignments(assignments: InsertCrewAssignment[]): Promise<SelectCrewAssignment[]>;

  // Crew Certifications
  getCrewCertifications(crewId?: string): Promise<SelectCrewCertification[]>;
  createCrewCertification(cert: InsertCrewCertification): Promise<SelectCrewCertification>;
  updateCrewCertification(id: string, cert: Partial<InsertCrewCertification>): Promise<SelectCrewCertification>;
  deleteCrewCertification(id: string): Promise<void>;

  // Port Calls (vessel constraints)
  getPortCalls(vesselId?: string): Promise<SelectPortCall[]>;
  createPortCall(portCall: InsertPortCall): Promise<SelectPortCall>;
  updatePortCall(id: string, portCall: Partial<InsertPortCall>): Promise<SelectPortCall>;
  deletePortCall(id: string): Promise<void>;

  // Drydock Windows (vessel constraints)
  getDrydockWindows(vesselId?: string): Promise<SelectDrydockWindow[]>;
  createDrydockWindow(drydock: InsertDrydockWindow): Promise<SelectDrydockWindow>;
  updateDrydockWindow(id: string, drydock: Partial<InsertDrydockWindow>): Promise<SelectDrydockWindow>;
  deleteDrydockWindow(id: string): Promise<void>;

  // Vessel Management (translated from Windows batch patch)
  getVessels(orgId?: string): Promise<SelectVessel[]>;
  getVessel(id: string, orgId?: string): Promise<SelectVessel | undefined>;
  createVessel(vessel: InsertVessel): Promise<SelectVessel>;
  updateVessel(id: string, vessel: Partial<InsertVessel>): Promise<SelectVessel>;
  deleteVessel(id: string, deleteEquipment?: boolean, orgId?: string): Promise<void>;
  resetVesselDowntime(id: string): Promise<SelectVessel>;
  resetVesselOperation(id: string): Promise<SelectVessel>;
  wipeVesselData(vesselId: string, orgId?: string): Promise<{ deletedRecords: number }>;
  exportVessel(vesselId: string, orgId: string): Promise<any>;
  importVessel(data: any, orgId: string): Promise<{ vesselId: string; equipmentCount: number; crewCount: number }>;

  // Latest readings and vessel-centric fleet overview (Option A extension)
  getLatestTelemetryReadings(vesselId?: string, equipmentId?: string, sensorType?: string, limit?: number): Promise<EquipmentTelemetry[]>;
  getVesselFleetOverview(orgId?: string): Promise<{
    vessels: number;
    signalsMapped: number;
    signalsDiscovered: number;
    latestPerVessel: Array<{vesselId: string; lastTs: string}>;
    dq7d: Record<string, number>;
  }>;

  // STCW Hours of Rest
  createCrewRestSheet(sheet: InsertCrewRestSheet): Promise<SelectCrewRestSheet>;
  upsertCrewRestDay(sheetId: string, dayData: any): Promise<SelectCrewRestDay>;
  getCrewRestMonth(crewId: string, year: number, month: string): Promise<{sheet: SelectCrewRestSheet | null, days: any[]}>;
  
  // ENHANCED RANGE FETCHING (translated from Python patch)
  getCrewRestRange(crewId: string, startDate: string, endDate: string): Promise<{sheets: SelectCrewRestSheet[], days: SelectCrewRestDay[]}>;
  getMultipleCrewRest(crewIds: string[], year: number, month: string): Promise<{[crewId: string]: {sheet: SelectCrewRestSheet | null, days: SelectCrewRestDay[]}}>;
  getVesselCrewRest(vesselId: string, year: number, month: string): Promise<{[crewId: string]: {sheet: SelectCrewRestSheet | null, days: SelectCrewRestDay[]}}>;
  getCrewRestByDateRange(vesselId?: string, startDate?: string, endDate?: string, complianceFilter?: boolean): Promise<{crewId: string, vesselId: string, sheet: SelectCrewRestSheet, days: SelectCrewRestDay[]}[]>;
  // Idempotency operations (translated from Windows batch patch)
  checkIdempotency(key: string, endpoint: string): Promise<boolean>;
  recordIdempotency(key: string, endpoint: string): Promise<void>;
  
  // Data management operations
  clearAllWorkOrders(): Promise<void>;
  clearAllMaintenanceSchedules(): Promise<void>;

  // ===== HUB & SYNC DEVICE REGISTRY =====
  // Device registry management (from Hub & Sync patch)
  getDeviceRegistryEntries(): Promise<DeviceRegistry[]>;
  getDeviceRegistryEntry(id: string): Promise<DeviceRegistry | undefined>;
  createDeviceRegistryEntry(device: InsertDeviceRegistry): Promise<DeviceRegistry>;
  updateDeviceRegistryEntry(id: string, device: Partial<InsertDeviceRegistry>): Promise<DeviceRegistry>;
  deleteDeviceRegistryEntry(id: string): Promise<void>;

  // Replay helper methods
  logReplayRequest(request: InsertReplayIncoming): Promise<ReplayIncoming>;
  getReplayHistory(deviceId?: string, endpoint?: string): Promise<ReplayIncoming[]>;

  // Sheet locking methods
  acquireSheetLock(sheetKey: string, holder: string, token: string, expiresAt: Date): Promise<SheetLock>;
  releaseSheetLock(sheetKey: string, token: string): Promise<void>;
  getSheetLock(sheetKey: string): Promise<SheetLock | undefined>;
  isSheetLocked(sheetKey: string): Promise<boolean>;

  // Sheet versioning methods
  getSheetVersion(sheetKey: string): Promise<SheetVersion | undefined>;
  incrementSheetVersion(sheetKey: string, modifiedBy: string): Promise<SheetVersion>;
  setSheetVersion(version: InsertSheetVersion): Promise<SheetVersion>;

  // Insights and Analytics Engine
  getInsightSnapshots(orgId?: string, scope?: string): Promise<InsightSnapshot[]>;
  getLatestInsightSnapshot(orgId: string, scope: string): Promise<InsightSnapshot | undefined>;
  createInsightSnapshot(orgId: string, snapshot: InsertInsightSnapshot): Promise<InsightSnapshot>;
  getInsightReports(orgId?: string, scope?: string): Promise<InsightReport[]>;
  createInsightReport(orgId: string, report: InsertInsightReport): Promise<InsightReport>;
  
  // Condition Monitoring - Oil Analysis
  getOilAnalyses(orgId?: string, equipmentId?: string): Promise<OilAnalysis[]>;
  getOilAnalysis(id: string, orgId?: string): Promise<OilAnalysis | undefined>;
  createOilAnalysis(analysis: InsertOilAnalysis): Promise<OilAnalysis>;
  updateOilAnalysis(id: string, analysis: Partial<InsertOilAnalysis>, orgId?: string): Promise<OilAnalysis>;
  deleteOilAnalysis(id: string, orgId?: string): Promise<void>;
  getLatestOilAnalysis(equipmentId: string, orgId?: string): Promise<OilAnalysis | undefined>;
  
  // Condition Monitoring - Wear Particle Analysis  
  getWearParticleAnalyses(orgId?: string, equipmentId?: string): Promise<WearParticleAnalysis[]>;
  getWearParticleAnalysis(id: string, orgId?: string): Promise<WearParticleAnalysis | undefined>;
  createWearParticleAnalysis(analysis: InsertWearParticleAnalysis): Promise<WearParticleAnalysis>;
  updateWearParticleAnalysis(id: string, analysis: Partial<InsertWearParticleAnalysis>, orgId?: string): Promise<WearParticleAnalysis>;
  deleteWearParticleAnalysis(id: string, orgId?: string): Promise<void>;
  getLatestWearParticleAnalysis(equipmentId: string, orgId?: string): Promise<WearParticleAnalysis | undefined>;
  
  // Condition Monitoring - Integrated Assessment
  getConditionMonitoringAssessments(orgId?: string, equipmentId?: string): Promise<ConditionMonitoring[]>;
  getConditionMonitoringAssessment(id: string, orgId?: string): Promise<ConditionMonitoring | undefined>;
  createConditionMonitoringAssessment(assessment: InsertConditionMonitoring): Promise<ConditionMonitoring>;
  updateConditionMonitoringAssessment(id: string, assessment: Partial<InsertConditionMonitoring>, orgId?: string): Promise<ConditionMonitoring>;
  deleteConditionMonitoringAssessment(id: string, orgId?: string): Promise<void>;
  getLatestConditionAssessment(equipmentId: string, orgId?: string): Promise<ConditionMonitoring | undefined>;
  
  // Oil Change Records
  getOilChangeRecords(orgId?: string, equipmentId?: string): Promise<OilChangeRecord[]>;
  getOilChangeRecord(id: string, orgId?: string): Promise<OilChangeRecord | undefined>;
  createOilChangeRecord(record: InsertOilChangeRecord): Promise<OilChangeRecord>;
  updateOilChangeRecord(id: string, record: Partial<InsertOilChangeRecord>, orgId?: string): Promise<OilChangeRecord>;
  deleteOilChangeRecord(id: string, orgId?: string): Promise<void>;
  getLatestOilChange(equipmentId: string, orgId?: string): Promise<OilChangeRecord | undefined>;

  // ===== SYSTEM ADMINISTRATION =====
  
  // Admin Audit Events
  getAdminAuditEvents(orgId?: string, action?: string, limit?: number): Promise<AdminAuditEvent[]>;
  createAdminAuditEvent(event: InsertAdminAuditEvent): Promise<AdminAuditEvent>;
  getAuditEventsByUser(userId: string, orgId?: string): Promise<AdminAuditEvent[]>;
  getAuditEventsByResource(resourceType: string, resourceId: string, orgId?: string): Promise<AdminAuditEvent[]>;

  // Admin System Settings
  getAdminSystemSettings(orgId?: string, category?: string): Promise<AdminSystemSetting[]>;
  getAdminSystemSetting(orgId: string, category: string, key: string): Promise<AdminSystemSetting | undefined>;
  createAdminSystemSetting(setting: InsertAdminSystemSetting): Promise<AdminSystemSetting>;
  updateAdminSystemSetting(id: string, setting: Partial<InsertAdminSystemSetting>): Promise<AdminSystemSetting>;
  deleteAdminSystemSetting(id: string): Promise<void>;
  getSettingsByCategory(orgId: string, category: string): Promise<AdminSystemSetting[]>;

  // Integration Configs
  getIntegrationConfigs(orgId?: string, type?: string): Promise<IntegrationConfig[]>;
  getIntegrationConfig(id: string, orgId?: string): Promise<IntegrationConfig | undefined>;
  createIntegrationConfig(config: InsertIntegrationConfig): Promise<IntegrationConfig>;
  updateIntegrationConfig(id: string, config: Partial<InsertIntegrationConfig>): Promise<IntegrationConfig>;
  deleteIntegrationConfig(id: string): Promise<void>;
  updateIntegrationHealth(id: string, healthStatus: string, errorMessage?: string): Promise<IntegrationConfig>;

  // Maintenance Windows
  getMaintenanceWindows(orgId?: string, status?: string): Promise<MaintenanceWindow[]>;
  getMaintenanceWindow(id: string, orgId?: string): Promise<MaintenanceWindow | undefined>;
  createMaintenanceWindow(window: InsertMaintenanceWindow): Promise<MaintenanceWindow>;
  updateMaintenanceWindow(id: string, window: Partial<InsertMaintenanceWindow>): Promise<MaintenanceWindow>;
  deleteMaintenanceWindow(id: string): Promise<void>;
  getActiveMaintenanceWindows(orgId?: string): Promise<MaintenanceWindow[]>;

  // System Performance Metrics  
  getSystemPerformanceMetrics(orgId?: string, category?: string, hours?: number): Promise<SystemPerformanceMetric[]>;
  createSystemPerformanceMetric(metric: InsertSystemPerformanceMetric): Promise<SystemPerformanceMetric>;
  getLatestMetricsByCategory(orgId: string, category: string): Promise<SystemPerformanceMetric[]>;
  getMetricTrends(orgId: string, metricName: string, hours: number): Promise<SystemPerformanceMetric[]>;

  // System Health Checks
  getSystemHealthChecks(orgId?: string, category?: string): Promise<SystemHealthCheck[]>;
  getSystemHealthCheck(id: string, orgId?: string): Promise<SystemHealthCheck | undefined>;
  createSystemHealthCheck(check: InsertSystemHealthCheck): Promise<SystemHealthCheck>;
  updateSystemHealthCheck(id: string, check: Partial<InsertSystemHealthCheck>): Promise<SystemHealthCheck>;
  deleteSystemHealthCheck(id: string): Promise<void>;
  updateHealthCheckStatus(id: string, status: string, message?: string, responseTime?: number): Promise<SystemHealthCheck>;
  getFailingHealthChecks(orgId?: string): Promise<SystemHealthCheck[]>;

  // System Health Overview
  getSystemHealth(orgId?: string): Promise<{
    overall: 'healthy' | 'warning' | 'critical';
    checks: { healthy: number; warning: number; critical: number; };
    integrations: { healthy: number; unhealthy: number; unknown: number; };
    activeMaintenanceWindows: number;
    recentAuditEvents: number;
    performanceIssues: number;
  }>;

  // ===== DATA LINKING ENHANCEMENTS =====
  
  // Downtime Events - Track equipment/vessel downtime
  getDowntimeEvents(orgId?: string, workOrderId?: string, equipmentId?: string, vesselId?: string): Promise<DowntimeEvent[]>;
  getDowntimeEvent(id: string, orgId?: string): Promise<DowntimeEvent | undefined>;
  createDowntimeEvent(event: InsertDowntimeEvent): Promise<DowntimeEvent>;
  updateDowntimeEvent(id: string, event: Partial<InsertDowntimeEvent>, orgId?: string): Promise<DowntimeEvent>;
  deleteDowntimeEvent(id: string, orgId?: string): Promise<void>;
  getDowntimeByPeriod(startDate: Date, endDate: Date, orgId?: string): Promise<DowntimeEvent[]>;
  calculateTotalDowntime(equipmentId: string, startDate?: Date, endDate?: Date, orgId?: string): Promise<number>;
  
  // Part Failure History - Track part failures for quality analysis
  getPartFailureHistory(orgId?: string, partId?: string, equipmentId?: string, supplierId?: string): Promise<PartFailureHistory[]>;
  getPartFailure(id: string, orgId?: string): Promise<PartFailureHistory | undefined>;
  createPartFailure(failure: InsertPartFailureHistory): Promise<PartFailureHistory>;
  updatePartFailure(id: string, failure: Partial<InsertPartFailureHistory>, orgId?: string): Promise<PartFailureHistory>;
  deletePartFailure(id: string, orgId?: string): Promise<void>;
  getPartFailureRate(partId: string, days?: number, orgId?: string): Promise<number>;
  getSupplierDefectRate(supplierId: string, days?: number, orgId?: string): Promise<number>;
  updateSupplierQualityMetrics(supplierId: string, orgId?: string): Promise<void>;
  
  // Industry Benchmarks - Equipment performance benchmarks
  getIndustryBenchmarks(equipmentType?: string, manufacturer?: string, model?: string): Promise<IndustryBenchmark[]>;
  getIndustryBenchmark(id: string): Promise<IndustryBenchmark | undefined>;
  createIndustryBenchmark(benchmark: InsertIndustryBenchmark): Promise<IndustryBenchmark>;
  updateIndustryBenchmark(id: string, benchmark: Partial<InsertIndustryBenchmark>): Promise<IndustryBenchmark>;
  deleteIndustryBenchmark(id: string): Promise<void>;
  findMatchingBenchmark(equipmentType: string, manufacturer?: string, model?: string): Promise<IndustryBenchmark | undefined>;
  
  // Prediction Outcome Labeling - ML feedback loop
  linkPredictionToWorkOrder(predictionId: string, predictionType: 'anomaly' | 'failure', workOrderId: string, orgId?: string): Promise<void>;
  labelPredictionOutcome(predictionId: string, predictionType: 'anomaly' | 'failure', outcome: {
    resolvedByWorkOrderId?: string;
    actualFailureOccurred: boolean;
    outcomeLabel: 'true_positive' | 'false_positive' | 'true_negative' | 'false_negative';
    predictionAccuracy?: number;
  }, orgId?: string): Promise<void>;
  getPredictionAccuracy(predictionType: 'anomaly' | 'failure', equipmentId?: string, horizonDays: number, orgId?: string): Promise<{
    totalPredictions: number;
    truePositives: number;
    falsePositives: number;
    trueNegatives: number;
    falseNegatives: number;
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  }>;
  
  // Crew Skill Validation - Check if crew has required skills
  validateCrewSkills(crewId: string, requiredSkills: string[], orgId?: string): Promise<{
    hasAllSkills: boolean;
    missingSkills: string[];
    matchingSkills: string[];
  }>;
  findQualifiedCrew(requiredSkills: string[], vesselId?: string, availableFrom?: Date, availableTo?: Date, orgId?: string): Promise<SelectCrew[]>;
  
  // Inventory Availability - Check if parts are in stock
  checkPartAvailability(partId: string, quantityRequired: number, orgId?: string): Promise<{
    available: boolean;
    quantityOnHand: number;
    quantityReserved: number;
    quantityAvailable: number;
    estimatedLeadTimeDays?: number;
    alternativeSuppliers?: string[];
  }>;
  checkMultiplePartsAvailability(parts: Array<{partId: string; quantity: number}>, orgId?: string): Promise<Map<string, boolean>>;
  reserveInventoryForWorkOrder(workOrderId: string, items: Array<{partId: string; quantity: number}>, orgId?: string): Promise<void>;
  cancelReservation(workOrderId: string, orgId?: string): Promise<void>;
  suggestPartSubstitutions(partId: string, quantityRequired: number, orgId?: string): Promise<Array<{
    partId: string;
    partNumber: string;
    description: string;
    quantityAvailable: number;
    reason: string;
  }>>;
  
  // Work Order Cost Calculation - Calculate total costs
  calculateWorkOrderTotalCost(workOrderId: string, orgId?: string): Promise<{
    totalPartsCost: number;
    totalLaborCost: number;
    downtimeCost: number;
    totalCost: number;
    roi?: number;
  }>;
  updateWorkOrderCosts(workOrderId: string, orgId?: string): Promise<WorkOrder>;
  
  // Smart Scheduling - Find optimal maintenance windows
  findOptimalMaintenanceWindow(equipmentId: string, estimatedDurationHours: number, requiredSkills: string[], requiredParts: Array<{partId: string; quantity: number}>, orgId?: string): Promise<{
    portCalls: SelectPortCall[];
    drydockWindows: SelectDrydockWindow[];
    availableCrew: SelectCrew[];
    partsAvailable: boolean;
    recommendations: Array<{
      type: 'port' | 'drydock' | 'underway';
      window: Date[];
      score: number;
      reason: string;
    }>;
  }>;
  
  // ===== OPERATING CONDITION OPTIMIZATION =====
  
  // Operating Parameters - Optimal operating ranges
  getOperatingParameters(orgId?: string, equipmentType?: string, manufacturer?: string): Promise<OperatingParameter[]>;
  getOperatingParameter(id: string, orgId?: string): Promise<OperatingParameter | undefined>;
  createOperatingParameter(parameter: InsertOperatingParameter): Promise<OperatingParameter>;
  updateOperatingParameter(id: string, parameter: Partial<InsertOperatingParameter>, orgId?: string): Promise<OperatingParameter>;
  deleteOperatingParameter(id: string, orgId?: string): Promise<void>;
  bulkCreateOperatingParameters(parameters: InsertOperatingParameter[]): Promise<OperatingParameter[]>;
  
  // Operating Condition Alerts - Violations of optimal ranges
  getOperatingConditionAlerts(orgId?: string, equipmentId?: string, acknowledged?: boolean): Promise<OperatingConditionAlert[]>;
  getOperatingConditionAlert(id: string, orgId?: string): Promise<OperatingConditionAlert | undefined>;
  createOperatingConditionAlert(alert: InsertOperatingConditionAlert): Promise<OperatingConditionAlert>;
  updateOperatingConditionAlert(id: string, alert: Partial<InsertOperatingConditionAlert>, orgId?: string): Promise<OperatingConditionAlert>;
  acknowledgeOperatingConditionAlert(id: string, acknowledgedBy: string, notes?: string, orgId?: string): Promise<OperatingConditionAlert>;
  resolveOperatingConditionAlert(id: string, notes?: string, orgId?: string): Promise<OperatingConditionAlert>;
  getActiveOperatingAlerts(equipmentId: string, orgId?: string): Promise<OperatingConditionAlert[]>;
  
  // Operating Condition Monitoring - Check telemetry against parameters (fetches latest if not provided)
  checkOperatingConditions(equipmentId: string, telemetry?: { sensorType: string; value: number }[], orgId?: string): Promise<{
    violations: Array<{
      parameterId: string;
      parameterName: string;
      currentValue: number;
      thresholdType: 'below_optimal' | 'above_optimal' | 'below_critical' | 'above_critical';
      severity: 'info' | 'warning' | 'critical';
      lifeImpact?: string;
      recommendedAction?: string;
    }>;
    alertsCreated: number;
  }>;
  
  // ===== PREVENTIVE MAINTENANCE CHECKLISTS =====
  
  // Maintenance Templates - Reusable PM procedures
  getMaintenanceTemplates(orgId?: string, equipmentType?: string, isActive?: boolean): Promise<MaintenanceTemplate[]>;
  getMaintenanceTemplate(id: string, orgId?: string): Promise<MaintenanceTemplate | undefined>;
  createMaintenanceTemplate(template: InsertMaintenanceTemplate): Promise<MaintenanceTemplate>;
  updateMaintenanceTemplate(id: string, template: Partial<InsertMaintenanceTemplate>, orgId?: string): Promise<MaintenanceTemplate>;
  deleteMaintenanceTemplate(id: string, orgId?: string): Promise<void>;
  cloneMaintenanceTemplate(id: string, newName: string, orgId?: string): Promise<MaintenanceTemplate>;
  
  // Maintenance Checklist Items - Steps in a template
  getMaintenanceChecklistItems(templateId: string): Promise<MaintenanceChecklistItem[]>;
  getMaintenanceChecklistItem(id: string): Promise<MaintenanceChecklistItem | undefined>;
  createMaintenanceChecklistItem(item: InsertMaintenanceChecklistItem): Promise<MaintenanceChecklistItem>;
  updateMaintenanceChecklistItem(id: string, item: Partial<InsertMaintenanceChecklistItem>): Promise<MaintenanceChecklistItem>;
  deleteMaintenanceChecklistItem(id: string): Promise<void>;
  bulkCreateChecklistItems(items: InsertMaintenanceChecklistItem[]): Promise<MaintenanceChecklistItem[]>;
  reorderChecklistItems(templateId: string, itemIds: string[]): Promise<void>;
  
  // Maintenance Checklist Completions - Track execution
  getMaintenanceChecklistCompletions(workOrderId: string): Promise<MaintenanceChecklistCompletion[]>;
  getMaintenanceChecklistCompletion(id: string): Promise<MaintenanceChecklistCompletion | undefined>;
  createMaintenanceChecklistCompletion(completion: InsertMaintenanceChecklistCompletion): Promise<MaintenanceChecklistCompletion>;
  updateMaintenanceChecklistCompletion(id: string, completion: Partial<InsertMaintenanceChecklistCompletion>): Promise<MaintenanceChecklistCompletion>;
  completeChecklistItem(workOrderId: string, itemId: string, completedBy: string, completedByName: string, passed?: boolean, actualValue?: string, notes?: string, photoUrls?: string[]): Promise<MaintenanceChecklistCompletion>;
  bulkCompleteChecklistItems(workOrderId: string, completions: Array<{itemId: string; completedBy: string; completedByName: string; passed?: boolean; actualValue?: string; notes?: string}>): Promise<MaintenanceChecklistCompletion[]>;
  getChecklistCompletionProgress(workOrderId: string): Promise<{
    totalItems: number;
    completedItems: number;
    pendingItems: number;
    skippedItems: number;
    failedItems: number;
    percentComplete: number;
  }>;
  
  // Work Order Template Association
  linkWorkOrderToTemplate(workOrderId: string, templateId: string, orgId?: string): Promise<WorkOrder>;
  initializeChecklistFromTemplate(workOrderId: string, templateId: string): Promise<MaintenanceChecklistCompletion[]>;
}

export class MemStorage implements IStorage {
  private organizations: Map<string, Organization> = new Map();
  private users: Map<string, User> = new Map();
  private devices: Map<string, Device> = new Map();
  private heartbeats: Map<string, EdgeHeartbeat> = new Map();
  private pdmScores: Map<string, PdmScoreLog> = new Map();
  private workOrders: Map<string, WorkOrder> = new Map();
  private maintenanceSchedules: Map<string, MaintenanceSchedule> = new Map();
  private maintenanceRecords: Map<string, MaintenanceRecord> = new Map();
  private maintenanceCosts: Map<string, MaintenanceCost> = new Map();
  private laborRates: Map<string, LaborRate> = new Map();
  private expenses: Map<string, Expense> = new Map();
  private equipmentLifecycle: Map<string, EquipmentLifecycle> = new Map();
  private performanceMetrics: Map<string, PerformanceMetric> = new Map();
  private complianceAuditLogs: ComplianceAuditLog[] = [];
  
  // CMMS-lite collections
  private workOrderChecklists: Map<string, WorkOrderChecklist> = new Map();
  private workOrderWorklogs: Map<string, WorkOrderWorklog> = new Map();
  private partsInventory: Map<string, PartsInventory> = new Map();
  private workOrderParts: Map<string, WorkOrderParts> = new Map();
  
  // Enhanced Inventory Management Collections (New Schema)
  private parts: Map<string, Part> = new Map();
  private stock: Map<string, Stock> = new Map();
  private suppliers: Map<string, Supplier> = new Map();
  private partSubstitutions: Map<string, PartSubstitution> = new Map();
  
  // Optimizer v1 collections
  private optimizerConfigurations: Map<string, OptimizerConfiguration> = new Map();
  private resourceConstraints: Map<string, ResourceConstraint> = new Map();
  private optimizationResults: Map<string, OptimizationResult> = new Map();
  private scheduleOptimizations: Map<string, ScheduleOptimization> = new Map();
  
  // RAG Search System collections
  private knowledgeBaseItems: Map<string, KnowledgeBaseItem> = new Map();
  private contentSources: Map<string, ContentSource> = new Map();
  private ragSearchQueries: Map<string, RagSearchQuery> = new Map();
  
  // Crew management collections
  private crew: Map<string, SelectCrew> = new Map();
  private crewSkills: Map<string, SelectCrewSkill[]> = new Map();
  private crewLeave: Map<string, SelectCrewLeave> = new Map();
  private shiftTemplates: Map<string, SelectShiftTemplate> = new Map();
  private crewAssignments: Map<string, SelectCrewAssignment> = new Map();
  private crewCertifications: Map<string, SelectCrewCertification> = new Map();
  private portCalls: Map<string, SelectPortCall> = new Map();
  private drydockWindows: Map<string, SelectDrydockWindow> = new Map();
  private vessels: Map<string, SelectVessel> = new Map();
  
  // STCW Hours of Rest collections
  private crewRestSheets: Map<string, SelectCrewRestSheet> = new Map();
  private crewRestDays: Map<string, SelectCrewRestDay> = new Map();
  
  // Hub & Sync collections
  private deviceRegistryEntries: Map<string, SelectDeviceRegistry> = new Map();
  private replayRequests: Map<string, SelectReplayIncoming> = new Map();
  private sheetLocks: Map<string, SelectSheetLock> = new Map();
  private sheetVersions: Map<string, SelectSheetVersion> = new Map();
  
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

    // Sample data initialization removed
  }

  private initializeSampleData() {
    // Sample organizations
    const sampleOrganizations: Organization[] = [
      {
        id: "default-org-id",
        name: "Default Organization",
        slug: "default",
        domain: null,
        billingEmail: null,
        maxUsers: 100,
        maxEquipment: 1000,
        subscriptionTier: "enterprise",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    sampleOrganizations.forEach(org => this.organizations.set(org.id, org));

    // Sample users
    const sampleUsers: User[] = [
      {
        id: "user-001",
        orgId: "default-org-id",
        email: "admin@default.com",
        name: "System Administrator",
        role: "admin",
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "user-002", 
        orgId: "default-org-id",
        email: "tech@default.com",
        name: "Marine Technician",
        role: "technician",
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    sampleUsers.forEach(user => this.users.set(user.id, user));
    // Sample devices with orgId
    const sampleDevices: Device[] = [
      {
        id: "DEV-001",
        orgId: "default-org-id", // Default organization
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
        orgId: "default-org-id", // Default organization
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
        orgId: "default-org-id", // Default organization
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
        orgId: "default-org-id", // Default organization
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

    // Sample PdM scores - Updated to match telemetry equipment IDs
    const pdmScores: PdmScoreLog[] = [
      // Engines
      {
        id: randomUUID(),
        ts: new Date(),
        equipmentId: "MAIN_ENG_001",
        healthIdx: 72,
        pFail30d: 0.15,
        predictedDueDate: new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000),
        contextJson: JSON.stringify({ fuel_per_kw_drift_pct: 3.2, vib_sigma: 0.8 }),
      },
      {
        id: randomUUID(),
        ts: new Date(),
        equipmentId: "MAIN_ENG_002",
        healthIdx: 84,
        pFail30d: 0.08,
        predictedDueDate: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000),
        contextJson: JSON.stringify({ fuel_per_kw_drift_pct: 2.1, vib_sigma: 0.5 }),
      },
      // Pumps
      {
        id: randomUUID(),
        ts: new Date(),
        equipmentId: "PUMP001",
        healthIdx: 45,
        pFail30d: 0.35,
        predictedDueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        contextJson: JSON.stringify({ fuel_per_kw_drift_pct: 8.7, vib_sigma: 2.1 }),
      },
      {
        id: randomUUID(),
        ts: new Date(),
        equipmentId: "PUMP002",
        healthIdx: 67,
        pFail30d: 0.22,
        predictedDueDate: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000),
        contextJson: JSON.stringify({ fuel_per_kw_drift_pct: 4.3, vib_sigma: 1.2 }),
      },
      // Generators
      {
        id: randomUUID(),
        ts: new Date(),
        equipmentId: "GEN001",
        healthIdx: 94,
        pFail30d: 0.03,
        predictedDueDate: new Date(now.getTime() + 42 * 24 * 60 * 60 * 1000),
        contextJson: JSON.stringify({ fuel_per_kw_drift_pct: 1.1, vib_sigma: 0.3 }),
      },
      {
        id: randomUUID(),
        ts: new Date(),
        equipmentId: "GEN002",
        healthIdx: 89,
        pFail30d: 0.05,
        predictedDueDate: new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000),
        contextJson: JSON.stringify({ fuel_per_kw_drift_pct: 1.8, vib_sigma: 0.4 }),
      },
      // Compressors
      {
        id: randomUUID(),
        ts: new Date(),
        equipmentId: "COMP001",
        healthIdx: 38,
        pFail30d: 0.42,
        predictedDueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        contextJson: JSON.stringify({ fuel_per_kw_drift_pct: 12.1, vib_sigma: 2.8 }),
      },
      {
        id: randomUUID(),
        ts: new Date(),
        equipmentId: "COMP002",
        healthIdx: 76,
        pFail30d: 0.12,
        predictedDueDate: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
        contextJson: JSON.stringify({ fuel_per_kw_drift_pct: 3.4, vib_sigma: 0.7 }),
      },
      // Bearings
      {
        id: randomUUID(),
        ts: new Date(),
        equipmentId: "BEAR001",
        healthIdx: 58,
        pFail30d: 0.28,
        predictedDueDate: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000),
        contextJson: JSON.stringify({ fuel_per_kw_drift_pct: 6.2, vib_sigma: 1.5 }),
      },
      {
        id: randomUUID(),
        ts: new Date(),
        equipmentId: "BEAR002",
        healthIdx: 82,
        pFail30d: 0.09,
        predictedDueDate: new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000),
        contextJson: JSON.stringify({ fuel_per_kw_drift_pct: 2.3, vib_sigma: 0.6 }),
      },
    ];

    pdmScores.forEach(score => this.pdmScores.set(score.id, score));

    // Sample work orders with orgId
    const workOrders: WorkOrder[] = [
      {
        id: "WO-2024-001",
        orgId: "default-org-id", // Default organization
        equipmentId: "ENG001",
        status: "in_progress",
        priority: 1,
        reason: "Elevated vibration levels detected",
        description: "Vibration analysis shows frequency spike at 2.5kHz indicating potential bearing wear",
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        id: "WO-2024-002",
        orgId: "default-org-id", // Default organization
        equipmentId: "PUMP001",
        status: "open",
        priority: 1,
        reason: "Critical health index - immediate inspection required",
        description: "Health index dropped to 45% - requires immediate visual inspection and diagnostic testing",
        createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
      },
      {
        id: "WO-2024-003",
        orgId: "default-org-id", // Default organization
        equipmentId: "GEN001",
        status: "completed",
        priority: 2,
        reason: "Routine maintenance - oil change and filter replacement",
        description: "Scheduled 500-hour maintenance completed. Oil changed, filters replaced, all systems checked",
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
      },
    ];

    workOrders.forEach(wo => this.workOrders.set(wo.id, wo));

    // Add comprehensive mock data for analytics
    this.initializeComprehensiveMockData();
  }

  private initializeComprehensiveMockData(): void {
    const now = new Date();
    
    // Enhanced equipment list
    const equipmentList = [
      'COMP001', 'COMP002', 'COMP003', 'PUMP001', 'PUMP002', 'PUMP003', 'PUMP004', 
      'GEN001', 'GEN002', 'GEN003', 'ENG001', 'ENG002', 'ENG003', 'ENG004',
      'BEAR001', 'BEAR002', 'BEAR003', 'BEAR004', 'BEAR005',
      'FAN001', 'FAN002', 'COOL001', 'COOL002', 'HYD001', 'HYD002'
    ];

    // Generate comprehensive telemetry data over the last 30 days
    const telemetryData: EquipmentTelemetry[] = [];
    equipmentList.forEach((equipmentId, equipIndex) => {
      for (let day = 0; day < 30; day++) {
        for (let hour = 0; hour < 24; hour += 2) {
          const timestamp = new Date(now.getTime() - (day * 24 + hour) * 60 * 60 * 1000);
          
          // Base values with some variation
          const baseTemp = 75 + Math.sin(day * 0.2) * 10 + Math.random() * 5;
          const basePressure = 45 + Math.sin(day * 0.3) * 8 + Math.random() * 3;
          const baseVibration = 2.1 + Math.sin(day * 0.4) * 0.8 + Math.random() * 0.3;
          
          // Sensor readings with realistic patterns
          const sensorTypes = ['temperature', 'pressure', 'vibration', 'flow', 'current'];
          sensorTypes.forEach(sensorType => {
            let value: number;
            let status: 'normal' | 'warning' | 'critical' = 'normal';
            
            switch (sensorType) {
              case 'temperature':
                value = baseTemp;
                if (value > 90) status = 'critical';
                else if (value > 85) status = 'warning';
                break;
              case 'pressure':
                value = basePressure;
                if (value < 20 || value > 60) status = 'critical';
                else if (value < 25 || value > 55) status = 'warning';
                break;
              case 'vibration':
                value = baseVibration;
                if (value > 4.0) status = 'critical';
                else if (value > 3.0) status = 'warning';
                break;
              case 'flow':
                value = 120 + Math.sin(day * 0.25) * 20 + Math.random() * 10;
                if (value < 80 || value > 160) status = 'critical';
                else if (value < 90 || value > 150) status = 'warning';
                break;
              case 'current':
                value = 15.5 + Math.sin(day * 0.35) * 3 + Math.random() * 1.5;
                if (value > 22 || value < 8) status = 'critical';
                else if (value > 20 || value < 10) status = 'warning';
                break;
              default:
                value = 50 + Math.random() * 20;
            }

            telemetryData.push({
              id: randomUUID(),
              equipmentId,
              sensorType,
              value: parseFloat(value.toFixed(2)),
              unit: sensorType === 'temperature' ? '°C' : 
                    sensorType === 'pressure' ? 'bar' : 
                    sensorType === 'vibration' ? 'mm/s' :
                    sensorType === 'flow' ? 'L/min' : 'A',
              ts: timestamp,
              threshold: sensorType === 'temperature' ? 85 : 
                        sensorType === 'pressure' ? 55 : 
                        sensorType === 'vibration' ? 3.0 :
                        sensorType === 'flow' ? 150 : 20,
              status,
              contextJson: JSON.stringify({ 
                equipmentType: equipmentId.includes('COMP') ? 'compressor' : 
                              equipmentId.includes('PUMP') ? 'pump' : 
                              equipmentId.includes('GEN') ? 'generator' :
                              equipmentId.includes('ENG') ? 'engine' : 'bearing',
                location: `Zone ${Math.floor(equipIndex / 5) + 1}`,
                criticalityLevel: status === 'critical' ? 'high' : status === 'warning' ? 'medium' : 'low'
              })
            });
          });
        }
      }
    });

    // Store telemetry data
    telemetryData.forEach(t => this.equipmentTelemetry.set(t.id, t));

    // Generate comprehensive PdM scores
    const enhancedPdmScores: PdmScoreLog[] = [];
    equipmentList.forEach(equipmentId => {
      // Generate score trends over time
      for (let day = 0; day < 30; day++) {
        const scoreTimestamp = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);
        
        // Health trends that show degradation over time for some equipment
        let baseHealth = 95;
        if (equipmentId.includes('PUMP001') || equipmentId.includes('ENG001')) {
          baseHealth = 95 - (day * 1.2); // Declining health
        } else if (equipmentId.includes('COMP001')) {
          baseHealth = 45 + Math.sin(day * 0.3) * 10; // Fluctuating critical health
        } else {
          baseHealth = 80 + Math.sin(day * 0.2) * 15 + Math.random() * 5;
        }

        const healthIdx = Math.max(10, Math.min(100, baseHealth));
        const pFail30d = (100 - healthIdx) / 100 * 0.5;
        
        enhancedPdmScores.push({
          id: randomUUID(),
          ts: scoreTimestamp,
          equipmentId,
          healthIdx: Math.round(healthIdx),
          pFail30d: parseFloat(pFail30d.toFixed(3)),
          predictedDueDate: new Date(scoreTimestamp.getTime() + (healthIdx / 100) * 30 * 24 * 60 * 60 * 1000),
          contextJson: JSON.stringify({
            vibration_rms: 2.1 + Math.random() * 1.5,
            temperature_avg: 75 + Math.random() * 15,
            load_factor: 0.7 + Math.random() * 0.25,
            runtime_hours: 2400 + day * 24,
            maintenance_due: healthIdx < 60
          })
        });
      }
    });

    enhancedPdmScores.forEach(score => this.pdmScores.set(score.id, score));

    // Generate maintenance costs
    const maintenanceCosts: MaintenanceCost[] = [];
    equipmentList.forEach(equipmentId => {
      // Generate costs over the last 12 months
      for (let month = 0; month < 12; month++) {
        const costDate = new Date(now.getFullYear(), now.getMonth() - month, 1);
        
        // Different cost types
        const costTypes = ['labor', 'parts', 'external_service', 'materials'];
        costTypes.forEach(costType => {
          let baseCost = 0;
          switch (costType) {
            case 'labor':
              baseCost = 800 + Math.random() * 1200;
              break;
            case 'parts':
              baseCost = 1500 + Math.random() * 2500;
              break;
            case 'external_service':
              baseCost = 2000 + Math.random() * 3000;
              break;
            case 'materials':
              baseCost = 300 + Math.random() * 700;
              break;
          }

          // Some equipment is more expensive to maintain
          if (equipmentId.includes('ENG')) {
            baseCost *= 1.5;
          } else if (equipmentId.includes('PUMP001')) {
            baseCost *= 2.2; // High maintenance equipment
          }

          maintenanceCosts.push({
            id: randomUUID(),
            equipmentId,
            costType,
            amount: parseFloat(baseCost.toFixed(2)),
            description: `${costType.replace('_', ' ')} costs for ${equipmentId}`,
            workOrderId: null,
            expenseDate: costDate,
            createdAt: costDate,
            updatedAt: costDate
          });
        });
      }
    });

    maintenanceCosts.forEach(cost => this.maintenanceCosts.set(cost.id, cost));

    // Generate expenses for ROI calculations
    const expenses: Expense[] = [];
    for (let month = 0; month < 12; month++) {
      const expenseDate = new Date(now.getFullYear(), now.getMonth() - month, Math.floor(Math.random() * 28) + 1);
      
      const expenseTypes = [
        { type: 'fuel', amount: 15000 + Math.random() * 10000 },
        { type: 'crew', amount: 45000 + Math.random() * 15000 },
        { type: 'port_fees', amount: 8000 + Math.random() * 5000 },
        { type: 'insurance', amount: 12000 + Math.random() * 3000 },
        { type: 'spare_parts', amount: 25000 + Math.random() * 20000 }
      ];

      expenseTypes.forEach(exp => {
        expenses.push({
          id: randomUUID(),
          description: `Monthly ${exp.type} expense`,
          amount: parseFloat(exp.amount.toFixed(2)),
          expenseType: exp.type,
          expenseDate,
          vesselName: ['MV Green Belt', 'MV Arctic', 'MV Nordic'][Math.floor(Math.random() * 3)],
          equipmentId: equipmentList[Math.floor(Math.random() * equipmentList.length)],
          approvalStatus: 'approved',
          approvedAt: expenseDate,
          createdAt: expenseDate,
          updatedAt: expenseDate
        });
      });
    }

    expenses.forEach(expense => this.expenses.set(expense.id, expense));

    // Generate equipment lifecycle data for replacement recommendations
    equipmentList.forEach(equipmentId => {
      const installDate = new Date(now.getTime() - Math.random() * 5 * 365 * 24 * 60 * 60 * 1000);
      const expectedLifespan = 60 + Math.random() * 40; // 60-100 months
      const currentAge = (now.getTime() - installDate.getTime()) / (30 * 24 * 60 * 60 * 1000);
      
      let condition: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
      if (currentAge / expectedLifespan > 0.9) condition = 'critical';
      else if (currentAge / expectedLifespan > 0.75) condition = 'poor';
      else if (currentAge / expectedLifespan > 0.5) condition = 'fair';
      else if (currentAge / expectedLifespan > 0.25) condition = 'good';
      else condition = 'excellent';

      // PUMP001 and COMP001 are in critical condition
      if (equipmentId === 'PUMP001' || equipmentId === 'COMP001') {
        condition = 'critical';
      }

      this.equipmentLifecycle.set(randomUUID(), {
        id: randomUUID(),
        equipmentId,
        installationDate: installDate,
        expectedLifespan: Math.round(expectedLifespan),
        currentAge: Math.round(currentAge),
        condition,
        estimatedReplacementCost: 50000 + Math.random() * 100000,
        nextRecommendedReplacement: condition === 'critical' ? 
          new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) : // 1 week
          new Date(now.getTime() + (100 - currentAge / expectedLifespan * 100) * 7 * 24 * 60 * 60 * 1000),
        createdAt: installDate,
        updatedAt: now
      });
    });

    // Generate additional work orders for better analytics
    const additionalWorkOrders: WorkOrder[] = [];
    for (let i = 0; i < 20; i++) {
      const workOrderDate = new Date(now.getTime() - Math.random() * 60 * 24 * 60 * 60 * 1000);
      const statuses = ['open', 'in_progress', 'completed', 'cancelled'];
      const priorities = [1, 1, 2, 2, 3]; // More high priority items
      
      additionalWorkOrders.push({
        id: `WO-2024-${String(i + 10).padStart(3, '0')}`,
        orgId: "default-org-id",
        equipmentId: equipmentList[Math.floor(Math.random() * equipmentList.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)] as any,
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        reason: [
          'Scheduled maintenance due',
          'Abnormal vibration detected',
          'Temperature threshold exceeded',
          'Pressure anomaly observed',
          'Routine inspection required',
          'Bearing replacement needed',
          'Filter replacement due',
          'Oil analysis shows contamination'
        ][Math.floor(Math.random() * 8)],
        description: `Maintenance work required for equipment monitoring and health optimization`,
        createdAt: workOrderDate
      });
    }

    additionalWorkOrders.forEach(wo => this.workOrders.set(wo.id, wo));

    console.log('✅ Comprehensive mock data initialized:', {
      telemetryRecords: telemetryData.length,
      pdmScores: enhancedPdmScores.length,
      maintenanceCosts: maintenanceCosts.length,
      expenses: expenses.length,
      equipmentCount: equipmentList.length,
      workOrders: additionalWorkOrders.length + 3
    });
  }

  // Organization management
  async getOrganizations(): Promise<Organization[]> {
    return Array.from(this.organizations.values());
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    return this.organizations.get(id);
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    return Array.from(this.organizations.values()).find(org => org.slug === slug);
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const newOrg: Organization = {
      id: randomUUID(),
      ...org,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.organizations.set(newOrg.id, newOrg);
    return newOrg;
  }

  async updateOrganization(id: string, updates: Partial<InsertOrganization>): Promise<Organization> {
    const existing = this.organizations.get(id);
    if (!existing) {
      throw new Error(`Organization ${id} not found`);
    }
    const updated: Organization = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.organizations.set(id, updated);
    return updated;
  }

  async deleteOrganization(id: string): Promise<void> {
    if (!this.organizations.has(id)) {
      throw new Error(`Organization ${id} not found`);
    }
    this.organizations.delete(id);
  }

  // User management
  async getUsers(orgId?: string): Promise<User[]> {
    const users = Array.from(this.users.values());
    if (orgId) {
      return users.filter(user => user.orgId === orgId);
    }
    return users;
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string, orgId?: string): Promise<User | undefined> {
    const users = Array.from(this.users.values());
    return users.find(user => {
      const emailMatch = user.email === email;
      return orgId ? (emailMatch && user.orgId === orgId) : emailMatch;
    });
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = {
      id: randomUUID(),
      ...user,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(newUser.id, newUser);
    return newUser;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const existing = this.users.get(id);
    if (!existing) {
      throw new Error(`User ${id} not found`);
    }
    const updated: User = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    if (!this.users.has(id)) {
      throw new Error(`User ${id} not found`);
    }
    this.users.delete(id);
  }

  // Device management (now org-scoped)
  async getDevices(orgId?: string): Promise<Device[]> {
    const devices = Array.from(this.devices.values());
    if (orgId) {
      return devices.filter(device => device.orgId === orgId);
    }
    return devices;
  }

  async getDevice(id: string, orgId?: string): Promise<Device | undefined> {
    const device = this.devices.get(id);
    if (device && orgId && device.orgId !== orgId) {
      return undefined; // Device exists but not in requested org
    }
    return device;
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

  async generateWorkOrderNumber(orgId: string): Promise<string> {
    const currentYear = new Date().getFullYear();
    
    // Get the count of work orders for this org in the current year
    const existingOrders = Array.from(this.workOrders.values())
      .filter(order => order.orgId === orgId);
    
    // Filter by year in the woNumber field (if it exists) or fallback to counting all
    const yearOrders = existingOrders.filter(order => {
      if (order.woNumber && order.woNumber.startsWith(`WO-${currentYear}-`)) {
        return true;
      }
      // For legacy orders without woNumber, check creation year
      const orderYear = order.createdAt ? new Date(order.createdAt).getFullYear() : currentYear;
      return orderYear === currentYear;
    });
    
    const nextNumber = yearOrders.length + 1;
    return `WO-${currentYear}-${String(nextNumber).padStart(4, '0')}`;
  }

  async createWorkOrder(order: InsertWorkOrder & { woNumber?: string }): Promise<WorkOrder> {
    const newOrder: WorkOrder = {
      id: randomUUID(),
      orgId: order.orgId,
      equipmentId: order.equipmentId,
      status: order.status || "open",
      priority: order.priority || 3,
      reason: order.reason || null,
      description: order.description || null,
      estimatedDowntimeHours: order.estimatedDowntimeHours || null,
      actualDowntimeHours: order.actualDowntimeHours || null,
      affectsVesselDowntime: order.affectsVesselDowntime || false,
      woNumber: order.woNumber || null,
      createdAt: new Date(),
    };
    this.workOrders.set(newOrder.id, newOrder);
    
    // Broadcast work order creation to all connected clients
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.broadcastWorkOrderChange('create', newOrder);
    }
    
    return newOrder;
  }

  async updateWorkOrder(id: string, updates: Partial<InsertWorkOrder>): Promise<WorkOrder> {
    const existing = this.workOrders.get(id);
    if (!existing) {
      throw new Error(`Work order ${id} not found`);
    }
    
    const postUpdateOrder = { ...existing, ...updates };
    const finalUpdates = { ...updates };
    
    const shouldTrackDowntime = postUpdateOrder.affectsVesselDowntime && postUpdateOrder.equipmentId;
    
    if (shouldTrackDowntime) {
      const equipment = this.equipment.get(postUpdateOrder.equipmentId);
      
      if (equipment && equipment.vesselId) {
        const vesselId = equipment.vesselId;
        const vessel = this.vessels.get(vesselId);
        const oldStatus = existing.status;
        const newStatus = postUpdateOrder.status;
        
        if (newStatus === 'in_progress' && oldStatus !== 'in_progress' && !postUpdateOrder.vesselDowntimeStartedAt) {
          finalUpdates.vesselDowntimeStartedAt = new Date();
          console.log(`[Downtime Tracking] Started for work order ${id}, vessel ${vesselId}`);
        }
        
        else if (newStatus === 'completed' && oldStatus === 'in_progress' && existing.vesselDowntimeStartedAt) {
          const startTime = new Date(existing.vesselDowntimeStartedAt);
          const endTime = new Date();
          const downtimeHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
          const downtimeDays = downtimeHours / 24;
          
          if (vessel) {
            const currentDowntime = parseFloat(vessel.downtimeDays || '0');
            const newDowntime = currentDowntime + downtimeDays;
            
            this.vessels.set(vesselId, {
              ...vessel,
              downtimeDays: newDowntime.toFixed(2),
              updatedAt: new Date(),
            });
            
            console.log(`[Downtime Tracking] Added ${downtimeDays.toFixed(2)} days to vessel ${vesselId} (total: ${newDowntime.toFixed(2)} days)`);
          }
          
          finalUpdates.vesselDowntimeStartedAt = null;
        }
      }
    }
    
    const updated: WorkOrder = {
      ...existing,
      ...finalUpdates,
    };
    this.workOrders.set(id, updated);
    
    // Broadcast work order update to all connected clients
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.broadcastWorkOrderChange('update', updated);
    }
    
    return updated;
  }

  async deleteWorkOrder(id: string): Promise<void> {
    if (!this.workOrders.has(id)) {
      throw new Error(`Work order ${id} not found`);
    }
    const deletedOrder = this.workOrders.get(id);
    this.workOrders.delete(id);
    
    // Broadcast work order deletion to all connected clients
    const wsServer = getWebSocketServer();
    if (wsServer && deletedOrder) {
      wsServer.broadcastWorkOrderChange('delete', { id: deletedOrder.id });
    }
  }

  // Telemetry methods
  async getTelemetryTrends(equipmentId?: string, hours: number = 24): Promise<TelemetryTrend[]> {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    // Get telemetry data within the time range
    let telemetryData = Array.from(this.equipmentTelemetry.values())
      .filter(t => t.ts && t.ts >= cutoffTime);
    
    // Filter by equipment if specified
    if (equipmentId) {
      telemetryData = telemetryData.filter(t => t.equipmentId === equipmentId);
    }
    
    // Group by equipment and sensor type
    const grouped = telemetryData.reduce((acc, reading) => {
      const key = `${reading.equipmentId}-${reading.sensorType}`;
      if (!acc[key]) {
        acc[key] = {
          equipmentId: reading.equipmentId,
          sensorType: reading.sensorType,
          unit: reading.unit,
          data: [],
          currentValue: reading.value,
          status: reading.status || 'normal',
          threshold: reading.threshold
        };
      }
      acc[key].data.push({
        ts: reading.ts,
        value: reading.value,
        status: reading.status || 'normal'
      });
      // Keep the most recent value as current
      if (!acc[key].latestTime || (reading.ts && reading.ts > acc[key].latestTime)) {
        acc[key].currentValue = reading.value;
        acc[key].status = reading.status || 'normal';
        acc[key].latestTime = reading.ts;
      }
      return acc;
    }, {} as Record<string, any>);
    
    // Convert to TelemetryTrend format and sort data by time
    return Object.values(grouped).map((trend: any) => ({
      equipmentId: trend.equipmentId,
      sensorType: trend.sensorType,
      unit: trend.unit,
      data: trend.data.sort((a: any, b: any) => new Date(b.ts).getTime() - new Date(a.ts).getTime()),
      currentValue: trend.currentValue,
      status: trend.status,
      threshold: trend.threshold
    }));
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
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return Array.from(this.equipmentTelemetry.values())
      .filter(t => 
        t.equipmentId === equipmentId &&
        t.sensorType === sensorType &&
        t.ts && t.ts >= cutoffTime
      )
      .sort((a, b) => (a.ts?.getTime() || 0) - (b.ts?.getTime() || 0)); // Sort by time ascending
  }

  async getTelemetryByEquipmentAndDateRange(
    equipmentId: string, 
    startDate: Date, 
    endDate: Date, 
    orgId?: string
  ): Promise<EquipmentTelemetry[]> {
    return Array.from(this.equipmentTelemetry.values())
      .filter(t => 
        t.equipmentId === equipmentId &&
        (!orgId || t.orgId === orgId) &&
        t.ts && t.ts >= startDate && t.ts <= endDate
      )
      .sort((a, b) => (a.ts?.getTime() || 0) - (b.ts?.getTime() || 0));
  }

  // Sensor configuration methods
  async getSensorConfigurations(orgId?: string, equipmentId?: string, sensorType?: string): Promise<SensorConfiguration[]> {
    // Mock implementation for MemStorage
    return [];
  }

  async getSensorConfiguration(equipmentId: string, sensorType: string, orgId?: string): Promise<SensorConfiguration | undefined> {
    // Mock implementation for MemStorage
    return undefined;
  }

  async createSensorConfiguration(config: InsertSensorConfiguration): Promise<SensorConfiguration> {
    // Mock implementation for MemStorage
    const newConfig: SensorConfiguration = {
      id: `sensor-config-${Date.now()}`,
      orgId: config.orgId || 'default-org-id',
      equipmentId: config.equipmentId,
      sensorType: config.sensorType,
      enabled: config.enabled ?? true,
      sampleRateHz: config.sampleRateHz || null,
      gain: config.gain ?? 1.0,
      offset: config.offset ?? 0.0,
      deadband: config.deadband ?? 0.0,
      minValid: config.minValid || null,
      maxValid: config.maxValid || null,
      warnLo: config.warnLo || null,
      warnHi: config.warnHi || null,
      critLo: config.critLo || null,
      critHi: config.critHi || null,
      hysteresis: config.hysteresis ?? 0.0,
      emaAlpha: config.emaAlpha || null,
      targetUnit: config.targetUnit || null,
      notes: config.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return newConfig;
  }

  async updateSensorConfiguration(equipmentId: string, sensorType: string, config: Partial<InsertSensorConfiguration>, orgId?: string): Promise<SensorConfiguration> {
    // Mock implementation for MemStorage - just return a mock updated config
    throw new Error("Sensor configuration not found in memory storage");
  }

  async deleteSensorConfiguration(equipmentId: string, sensorType: string, orgId?: string): Promise<void> {
    // Mock implementation for MemStorage
    return;
  }

  async updateSensorConfigurationById(id: string, config: Partial<InsertSensorConfiguration>, orgId?: string): Promise<SensorConfiguration> {
    // For MemStorage, find by ID in the configurations map and update it
    // Since this is a mock implementation, we'll create a realistic response using correct schema field names
    const mockConfig: SensorConfiguration = {
      id,
      equipmentId: config.equipmentId || "ENG001",
      sensorType: config.sensorType || "temperature",
      orgId: orgId || "default-org-id",
      enabled: config.enabled !== undefined ? config.enabled : true,
      sampleRateHz: config.sampleRateHz || null,
      gain: config.gain !== undefined ? config.gain : 1.0,
      offset: config.offset !== undefined ? config.offset : 0.0,
      deadband: config.deadband !== undefined ? config.deadband : 0.1,
      minValid: config.minValid || null,
      maxValid: config.maxValid || null,
      warnLo: config.warnLo || null,
      warnHi: config.warnHi || null,
      critLo: config.critLo !== undefined ? config.critLo : null,
      critHi: config.critHi || null,
      hysteresis: config.hysteresis !== undefined ? config.hysteresis : 1.0,
      emaAlpha: config.emaAlpha || null,
      targetUnit: config.targetUnit || null,
      notes: config.notes || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return mockConfig;
  }

  async deleteSensorConfigurationById(id: string, orgId?: string): Promise<void> {
    // For MemStorage, this would remove the config from memory
    // Mock implementation - in a real MemStorage this would delete from a Map/Array
    return;
  }

  // Sensor state methods
  async getSensorState(equipmentId: string, sensorType: string, orgId?: string): Promise<SensorState | undefined> {
    // Mock implementation for MemStorage
    return undefined;
  }

  async upsertSensorState(state: InsertSensorState): Promise<SensorState> {
    // Mock implementation for MemStorage
    const newState: SensorState = {
      id: `sensor-state-${Date.now()}`,
      orgId: state.orgId || 'default-org-id',
      equipmentId: state.equipmentId,
      sensorType: state.sensorType,
      lastValue: state.lastValue || null,
      ema: state.ema || null,
      lastTs: state.lastTs || null,
      updatedAt: new Date(),
    };
    return newState;
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

  // Alert comments
  async addAlertComment(commentData: InsertAlertComment): Promise<AlertComment> {
    const comment: AlertComment = {
      id: randomUUID(),
      alertId: commentData.alertId,
      comment: commentData.comment,
      commentedBy: commentData.commentedBy,
      createdAt: new Date(),
    };
    // Mock implementation - would store in memory
    return comment;
  }

  async getAlertComments(alertId: string): Promise<AlertComment[]> {
    // Mock implementation for MemStorage
    return [];
  }

  // Alert suppressions
  async createAlertSuppression(suppressionData: InsertAlertSuppression): Promise<AlertSuppression> {
    const suppression: AlertSuppression = {
      id: randomUUID(),
      equipmentId: suppressionData.equipmentId,
      sensorType: suppressionData.sensorType,
      alertType: suppressionData.alertType || null,
      suppressedBy: suppressionData.suppressedBy,
      reason: suppressionData.reason || null,
      suppressUntil: suppressionData.suppressUntil,
      active: true,
      createdAt: new Date(),
    };
    // Mock implementation - would store in memory
    return suppression;
  }

  async getActiveSuppressions(): Promise<AlertSuppression[]> {
    // Mock implementation for MemStorage
    return [];
  }

  async removeAlertSuppression(id: string): Promise<void> {
    // Mock implementation for MemStorage
    // Would mark suppression as inactive
  }

  async isAlertSuppressed(equipmentId: string, sensorType: string, alertType: string): Promise<boolean> {
    // Mock implementation for MemStorage
    return false;
  }

  // Compliance audit logging
  async logComplianceAction(data: InsertComplianceAuditLog): Promise<ComplianceAuditLog> {
    const auditEntry: ComplianceAuditLog = {
      id: `compliance-${Date.now()}`,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      performedBy: data.performedBy,
      timestamp: new Date(),
      details: data.details || null,
      complianceStandard: data.complianceStandard || null,
      regulatoryReference: data.regulatoryReference || null,
    };
    
    // Store in memory for MemStorage
    if (!this.complianceAuditLogs) {
      this.complianceAuditLogs = [];
    }
    this.complianceAuditLogs.push(auditEntry);
    
    return auditEntry;
  }

  async getComplianceAuditLog(filters?: { 
    entityType?: string; 
    entityId?: string; 
    complianceStandard?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<ComplianceAuditLog[]> {
    if (!this.complianceAuditLogs) {
      this.complianceAuditLogs = [];
    }
    
    let filtered = this.complianceAuditLogs;
    
    if (filters?.entityType) {
      filtered = filtered.filter(log => log.entityType === filters.entityType);
    }
    if (filters?.entityId) {
      filtered = filtered.filter(log => log.entityId === filters.entityId);
    }
    if (filters?.complianceStandard) {
      filtered = filtered.filter(log => log.complianceStandard === filters.complianceStandard);
    }
    if (filters?.startDate) {
      filtered = filtered.filter(log => log.timestamp >= filters.startDate!);
    }
    if (filters?.endDate) {
      filtered = filtered.filter(log => log.timestamp <= filters.endDate!);
    }
    
    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
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
  async getDashboardMetrics(orgId?: string): Promise<DashboardMetrics> {
    const devices = await this.getDevices();
    const heartbeats = await this.getHeartbeats();
    const workOrders = await this.getWorkOrders();
    const pdmScores = await this.getPdmScores();
    const telemetryData = await this.getLatestTelemetryReadings();
    const equipmentList = await this.getEquipmentRegistry(orgId);

    console.log('[DatabaseStorage.getDashboardMetrics] Starting...');

    // Count active devices from both heartbeats and recent telemetry
    const activeFromHeartbeats = heartbeats.filter(hb => {
      const timeSince = Date.now() - (hb.ts?.getTime() || 0);
      return timeSince < 10 * 60 * 1000; // Active if heartbeat within 10 minutes
    }).length;

    // Count equipment with recent telemetry (within last 10 minutes)
    const now = Date.now();
    const recentTelemetry = telemetryData.filter(t => {
      const timeSince = now - (t.ts?.getTime() || 0);
      return timeSince < 10 * 60 * 1000;
    });
    
    const activeEquipmentIds = new Set(recentTelemetry.map(t => t.equipmentId));
    const activeFromTelemetry = activeEquipmentIds.size;

    // Count active equipment from Equipment Registry
    const activeEquipmentFromRegistry = equipmentList.filter(eq => eq.isActive).length;

    console.log('[DatabaseStorage.getDashboardMetrics] Got data:', {
      devices: devices.length,
      heartbeats: activeFromHeartbeats,
      workOrders: workOrders.length,
      pdmScores: pdmScores.length,
      equipment: equipmentList.length,
      activeEquipment: activeEquipmentFromRegistry
    });

    // Use the maximum count across all sources
    const activeDevices = Math.max(
      activeFromHeartbeats, 
      activeFromTelemetry, 
      activeEquipmentFromRegistry
    );

    // Calculate fleet health from both PdM scores and telemetry status
    const healthScores = pdmScores.map(score => score.healthIdx || 0);
    let fleetHealth = 0;

    console.log('[DatabaseStorage.getDashboardMetrics] Health calculation inputs:', {
      pdmScoresCount: pdmScores.length,
      totalTelemetry: telemetryData.length,
      recentTelemetryCount: recentTelemetry.length,
      activeEquipmentFromRegistry
    });

    if (healthScores.length > 0) {
      fleetHealth = Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length);
      console.log('[DatabaseStorage.getDashboardMetrics] Using PdM scores for health:', fleetHealth);
    } else if (recentTelemetry.length > 0) {
      // Calculate health based on telemetry status if no PdM scores
      const statusWeights = { normal: 100, warning: 60, critical: 20 };
      const totalWeight = recentTelemetry.reduce((sum, t) => {
        return sum + (statusWeights[t.status as keyof typeof statusWeights] || 50);
      }, 0);
      fleetHealth = Math.round(totalWeight / recentTelemetry.length);
      console.log('[DatabaseStorage.getDashboardMetrics] Using recent telemetry for health:', fleetHealth);
    } else if (activeEquipmentFromRegistry > 0) {
      // If we have active equipment but no telemetry/scores, assume moderate health
      fleetHealth = 75; // Default to 75% health for active equipment without data
      console.log('[DatabaseStorage.getDashboardMetrics] Using default health for active equipment:', fleetHealth);
    }

    const openWorkOrders = workOrders.filter(wo => wo.status !== "completed").length;

    // Count risk alerts from both PdM scores and telemetry
    const pdmRiskAlerts = pdmScores.filter(score => (score.healthIdx || 100) < 60).length;
    const telemetryRiskAlerts = recentTelemetry.filter(t => 
      t.status === 'critical' || t.status === 'warning'
    ).length;
    const riskAlerts = Math.max(pdmRiskAlerts, telemetryRiskAlerts);

    // Get historical metrics for trend calculation
    const history = await this.getMetricsHistory(orgId || 'default-org-id', 7);
    
    // Calculate trends by comparing current vs week ago
    const calculateTrend = (current: number, previous: number | undefined) => {
      if (previous === undefined || previous === 0) {
        return {
          value: 0,
          direction: 'down' as const,
          percentChange: 0
        };
      }
      const change = current - previous;
      const percentChange = Math.round((change / previous) * 100);
      return {
        value: Math.abs(change),
        direction: change >= 0 ? 'up' as const : 'down' as const,
        percentChange: Math.abs(percentChange)
      };
    };

    // Get week-old metrics if available
    const weekOldMetrics = history.length > 0 ? history[history.length - 1] : undefined;

    const result: DashboardMetrics = {
      activeDevices,
      fleetHealth,
      openWorkOrders,
      riskAlerts,
      trends: {
        activeDevices: calculateTrend(activeDevices, weekOldMetrics?.activeDevices),
        fleetHealth: calculateTrend(fleetHealth, weekOldMetrics?.fleetHealth),
        openWorkOrders: calculateTrend(openWorkOrders, weekOldMetrics?.openWorkOrders),
        riskAlerts: calculateTrend(riskAlerts, weekOldMetrics?.riskAlerts)
      }
    };

    console.log('[DatabaseStorage.getDashboardMetrics] Returning:', result);

    return result;
  }

  async recordMetricsHistory(
    orgId: string,
    metrics: Omit<DashboardMetrics, 'trends'>,
    equipmentStats: { total: number; healthy: number; warning: number; critical: number }
  ): Promise<void> {
    // MemStorage: Not implemented - history tracking is only in DatabaseStorage
    return Promise.resolve();
  }

  async getMetricsHistory(orgId: string, days: number = 30): Promise<any[]> {
    // MemStorage: Not implemented - history tracking is only in DatabaseStorage
    return [];
  }

  // Latest readings and vessel-centric fleet overview (Option A extension)  
  async getLatestTelemetryReadings(vesselId?: string, equipmentId?: string, sensorType?: string, limit: number = 500): Promise<EquipmentTelemetry[]> {
    const query = db.select().from(equipmentTelemetry);
    const conditions = [];

    if (vesselId) {
      // Join with equipment table to filter by vessel
      const equipmentQuery = db.select({id: equipment.id}).from(equipment).where(eq(equipment.vesselName, vesselId));
      const equipmentIds = await equipmentQuery;
      if (equipmentIds.length > 0) {
        conditions.push(inArray(equipmentTelemetry.equipmentId, equipmentIds.map(e => e.id)));
      } else {
        return []; // No equipment for this vessel
      }
    }

    if (equipmentId) {
      conditions.push(eq(equipmentTelemetry.equipmentId, equipmentId));
    }

    if (sensorType) {
      conditions.push(eq(equipmentTelemetry.sensorType, sensorType));
    }

    const readings = await query
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(equipmentTelemetry.ts));

    // Get latest reading per equipment+sensor combination
    const latestMap = new Map<string, EquipmentTelemetry>();
    readings.forEach(reading => {
      const key = `${reading.equipmentId}:${reading.sensorType}`;
      if (!latestMap.has(key)) {
        latestMap.set(key, reading);
      }
    });

    return Array.from(latestMap.values()).slice(0, limit);
  }

  async getVesselFleetOverview(orgId?: string): Promise<{
    vessels: number;
    signalsMapped: number;
    signalsDiscovered: number;
    latestPerVessel: Array<{vesselId: string; lastTs: string}>;
    dq7d: Record<string, number>;
  }> {
    const [vesselCount, sensorConfigCount, latestReadings] = await Promise.all([
      // Count vessels
      db.select({ count: sql<number>`count(*)::int` }).from(vessels)
        .where(orgId ? eq(vessels.orgId, orgId) : undefined),
      
      // Count sensor configurations (mapped signals)
      db.select({ count: sql<number>`count(*)::int` }).from(sensorConfigurations)
        .where(orgId ? eq(sensorConfigurations.orgId, orgId) : undefined),
        
      // Get latest readings per vessel
      db.select({
        vesselName: equipment.vesselName,
        lastTs: sql<Date>`max(${equipmentTelemetry.ts})`
      })
      .from(equipmentTelemetry)
      .innerJoin(equipment, eq(equipmentTelemetry.equipmentId, equipment.id))
      .where(orgId ? eq(equipment.orgId, orgId) : undefined)
      .groupBy(equipment.vesselName)
    ]);

    // Mock data quality findings for now
    const dq7d = {
      "missing_data": 2,
      "out_of_range": 1,
      "duplicate_values": 0
    };

    return {
      vessels: vesselCount[0]?.count || 0,
      signalsMapped: sensorConfigCount[0]?.count || 0,
      signalsDiscovered: Math.floor((sensorConfigCount[0]?.count || 0) * 1.2), // Mock discovered signals
      latestPerVessel: latestReadings
        .filter(r => r.vesselName && r.lastTs)
        .map(r => ({
          vesselId: r.vesselName!,
          lastTs: r.lastTs instanceof Date ? r.lastTs.toISOString() : new Date(r.lastTs!).toISOString()
        })),
      dq7d
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

  async getEquipmentHealth(orgId?: string, vesselId?: string): Promise<EquipmentHealth[]> {
    // Get equipment and vessels for proper vessel mapping
    const equipmentList = Array.from(this.equipment.values());
    const vesselsList = Array.from(this.vessels.values());
    const pdmScores = await this.getPdmScores();

    // Filter equipment by orgId and vesselId if provided
    let filteredEquipment = equipmentList;
    if (orgId) {
      filteredEquipment = filteredEquipment.filter(eq => eq.orgId === orgId);
    }
    if (vesselId && vesselId !== 'all') {
      filteredEquipment = filteredEquipment.filter(eq => eq.vesselId === vesselId);
    }

    // Short-circuit if no equipment found
    if (filteredEquipment.length === 0) {
      return [];
    }

    // Get sensor configurations to filter out equipment without sensors
    const allSensorConfigs = await this.getSensorConfigurations(orgId);
    const equipmentIdsWithSensors = new Set(allSensorConfigs.map(config => config.equipmentId));
    
    // Filter to only include equipment that has sensor configurations
    filteredEquipment = filteredEquipment.filter(eq => equipmentIdsWithSensors.has(eq.id));

    return filteredEquipment.map(equipment => {
      // Find corresponding PdM score for this equipment
      const score = pdmScores.find(s => s.equipmentId === equipment.id);
      
      // Find vessel name from vessels table
      const vessel = vesselsList.find(v => v.id === equipment.vesselId);
      const vesselName = vessel?.name || equipment.vesselName || "Unassigned";

      const healthIndex = score?.healthIdx || 50; // Default to moderate health if no PdM data
      const predictedDueDays = score?.predictedDueDate 
        ? Math.ceil((score.predictedDueDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
        : 30; // Default to 30 days

      let status: "healthy" | "warning" | "critical" = "healthy";
      if (healthIndex < 50) status = "critical";
      else if (healthIndex < 75) status = "warning";

      return {
        id: equipment.id,
        vessel: vesselName,
        vesselId: equipment.vesselId,
        name: equipment.name,
        type: equipment.type,
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
    
    // Broadcast maintenance schedule creation to all connected clients
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.broadcastMaintenanceScheduleChange('create', newSchedule);
    }
    
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
    
    // Broadcast maintenance schedule update to all connected clients
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.broadcastMaintenanceScheduleChange('update', updated);
    }
    
    return updated;
  }

  async deleteMaintenanceSchedule(id: string): Promise<void> {
    if (!this.maintenanceSchedules.has(id)) {
      throw new Error(`Maintenance schedule ${id} not found`);
    }
    this.maintenanceSchedules.delete(id);
    
    // Broadcast maintenance schedule deletion to all connected clients
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.broadcastMaintenanceScheduleChange('delete', { id });
    }
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

  async getMaintenanceCostsByWorkOrder(workOrderId: string): Promise<MaintenanceCost[]> {
    const costs = Array.from(this.maintenanceCosts.values())
      .filter(c => c.workOrderId === workOrderId);
    return costs.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  // Parts cost management methods
  async updatePartCost(partId: string, updateData: { unitCost: number; supplier: string }): Promise<PartsInventory> {
    const part = this.partsInventory.get(partId);
    if (!part) {
      throw new Error(`Part ${partId} not found`);
    }
    const updatedPart = { ...part, ...updateData, updatedAt: new Date() };
    this.partsInventory.set(partId, updatedPart);
    return updatedPart;
  }

  // Stock quantities management method
  async updatePartStockQuantities(partId: string, updateData: {
    quantityOnHand?: number;
    quantityReserved?: number;
    minStockLevel?: number;
    maxStockLevel?: number;
  }): Promise<PartsInventory> {
    const part = this.partsInventory.get(partId);
    if (!part) {
      throw new Error(`Part ${partId} not found`);
    }

    // Validate the update data
    if (updateData.quantityReserved !== undefined && updateData.quantityReserved < 0) {
      throw new Error("validation: Reserved quantity cannot be negative");
    }
    
    if (updateData.minStockLevel !== undefined && updateData.minStockLevel < 0) {
      throw new Error("validation: Minimum stock level cannot be negative");
    }
    
    if (updateData.maxStockLevel !== undefined && updateData.maxStockLevel < 0) {
      throw new Error("validation: Maximum stock level cannot be negative");
    }
    
    // Validate min/max relationship if both are provided
    const newMinStock = updateData.minStockLevel !== undefined ? updateData.minStockLevel : part.minStockLevel;
    const newMaxStock = updateData.maxStockLevel !== undefined ? updateData.maxStockLevel : part.maxStockLevel;
    
    if (newMinStock > newMaxStock) {
      throw new Error("validation: Minimum stock level cannot be greater than maximum stock level");
    }

    // Update the part with new stock quantities and recalculate availability
    const updatedPart: PartsInventory = {
      ...part,
      ...updateData,
      updatedAt: new Date()
    };

    // Recalculate available quantity
    updatedPart.availableQuantity = Math.max(0, updatedPart.quantityOnHand - updatedPart.quantityReserved);

    // Recalculate stock status based on new quantities
    updatedPart.stockStatus = this.calculateStockStatus(
      updatedPart.quantityOnHand,
      updatedPart.quantityReserved,
      updatedPart.minStockLevel,
      updatedPart.maxStockLevel
    );

    this.partsInventory.set(partId, updatedPart);

    // Record in sync journal and publish event (only for database-backed storage)
    if (process.env.SYNC_ENABLED === 'true') {
      try {
        await recordAndPublish("part", partId, "stock_update", updatedPart);
      } catch (error) {
        console.warn("[MemStorage] Sync operation failed (expected in memory-only mode):", error.message);
      }
    }

    return updatedPart;
  }

  // Helper method to calculate stock status
  private calculateStockStatus(
    quantityOnHand: number,
    quantityReserved: number,
    minStockLevel: number,
    maxStockLevel: number
  ): 'critical' | 'low_stock' | 'adequate' | 'excess_stock' | 'out_of_stock' {
    const available = Math.max(0, quantityOnHand - quantityReserved);
    
    if (quantityOnHand <= 0) return 'out_of_stock';
    if (available <= 0) return 'critical';
    if (available < minStockLevel * 0.5) return 'critical';
    if (available < minStockLevel) return 'low_stock';
    if (available > maxStockLevel) return 'excess_stock';
    return 'adequate';
  }

  // Labor rates methods
  async getLaborRates(orgId?: string): Promise<LaborRate[]> {
    let rates = Array.from(this.laborRates.values());
    if (orgId) {
      rates = rates.filter(r => r.orgId === orgId);
    }
    return rates.filter(r => r.isActive).sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async createLaborRate(rate: InsertLaborRate): Promise<LaborRate> {
    const id = randomUUID();
    const newRate: LaborRate = {
      ...rate,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.laborRates.set(id, newRate);
    return newRate;
  }

  async updateLaborRate(rateId: string, updateData: Partial<InsertLaborRate>): Promise<LaborRate> {
    const rate = this.laborRates.get(rateId);
    if (!rate) {
      throw new Error(`Labor rate ${rateId} not found`);
    }
    const updatedRate = { ...rate, ...updateData, updatedAt: new Date() };
    this.laborRates.set(rateId, updatedRate);
    return updatedRate;
  }

  async updateCrewRate(crewId: string, updateData: { currentRate: number; overtimeMultiplier: number; effectiveDate: Date }): Promise<SelectCrew> {
    const crewMember = this.crew.get(crewId);
    if (!crewMember) {
      throw new Error(`Crew member ${crewId} not found`);
    }
    const updatedCrew = { ...crewMember, ...updateData, updatedAt: new Date() };
    this.crew.set(crewId, updatedCrew);
    return updatedCrew;
  }

  // Expense tracking methods
  async getExpenses(orgId?: string): Promise<Expense[]> {
    let expenses = Array.from(this.expenses.values());
    if (orgId) {
      expenses = expenses.filter(e => e.orgId === orgId);
    }
    return expenses.sort((a, b) => (b.expenseDate?.getTime() || 0) - (a.expenseDate?.getTime() || 0));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const id = randomUUID();
    const newExpense: Expense = {
      ...expense,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.expenses.set(id, newExpense);
    return newExpense;
  }

  async updateExpenseStatus(expenseId: string, status: 'pending' | 'approved' | 'rejected'): Promise<Expense> {
    const expense = this.expenses.get(expenseId);
    if (!expense) {
      throw new Error(`Expense ${expenseId} not found`);
    }
    const updatedExpense = { 
      ...expense, 
      approvalStatus: status, 
      approvedAt: status !== 'pending' ? new Date() : null,
      updatedAt: new Date() 
    };
    this.expenses.set(expenseId, updatedExpense);
    return updatedExpense;
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

  async clearOrphanedTelemetryData(): Promise<void> {
    // Clear all in-memory telemetry data
    this.heartbeats.clear();
    this.pdmScores.clear();
    console.log('Cleared all telemetry data from memory');
  }

  async clearAllAlerts(): Promise<void> {
    // Clear all in-memory alert data - MemStorage doesn't actually store alerts
    // but we'll implement this for interface compliance
    console.log('Cleared all alerts from memory (MemStorage doesn\'t persist alerts)');
  }

  async clearAllWorkOrders(): Promise<void> {
    // Clear all work orders from memory
    this.workOrders.clear();
    console.log('Cleared all work orders from memory');
  }

  async clearAllMaintenanceSchedules(): Promise<void> {
    // Clear all maintenance schedules from memory
    this.maintenanceSchedules.clear();
    console.log('Cleared all maintenance schedules from memory');
  }

  // Idempotency operations (translated from Windows batch patch)
  private idempotencyKeys: Map<string, { endpoint: string; timestamp: Date }> = new Map();

  async checkIdempotency(key: string, endpoint: string): Promise<boolean> {
    return this.idempotencyKeys.has(key);
  }

  async recordIdempotency(key: string, endpoint: string): Promise<void> {
    this.idempotencyKeys.set(key, {
      endpoint,
      timestamp: new Date()
    });
  }

  // STCW Hours of Rest methods
  async createCrewRestSheet(sheet: InsertCrewRestSheet): Promise<SelectCrewRestSheet> {
    const id = randomUUID();
    const newSheet: SelectCrewRestSheet = {
      id,
      ...sheet,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.crewRestSheets.set(id, newSheet);
    return newSheet;
  }

  async upsertCrewRestDay(sheetId: string, dayData: any): Promise<SelectCrewRestDay> {
    const id = randomUUID();
    const newDay: SelectCrewRestDay = {
      id,
      sheetId,
      ...dayData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Check if already exists and update
    const existing = Array.from(this.crewRestDays.values()).find(
      day => day.sheetId === sheetId && day.date === dayData.date
    );
    
    if (existing) {
      const updated = { ...existing, ...dayData, updatedAt: new Date() };
      this.crewRestDays.set(existing.id, updated);
      return updated;
    } else {
      this.crewRestDays.set(id, newDay);
      return newDay;
    }
  }

  async getCrewRestMonth(crewId: string, year: number, month: string): Promise<{sheet: SelectCrewRestSheet | null, days: any[]}> {
    // Find the sheet
    const sheets = Array.from(this.crewRestSheets.values()).filter(
      sheet => sheet.crewId === crewId && sheet.year === year && sheet.month === month
    );
    
    if (sheets.length === 0) {
      return { sheet: null, days: [] };
    }
    
    const sheet = sheets[0];
    
    // Get all days for this sheet
    const days = Array.from(this.crewRestDays.values())
      .filter(day => day.sheetId === sheet.id)
      .sort((a, b) => a.date.localeCompare(b.date));
    
    return { sheet, days };
  }

  // ENHANCED RANGE FETCHING METHODS (translated from Python patch)
  
  async getCrewRestRange(crewId: string, startDate: string, endDate: string): Promise<{sheets: SelectCrewRestSheet[], days: SelectCrewRestDay[]}> {
    // Find all sheets for this crew member
    const allSheets = Array.from(this.crewRestSheets.values())
      .filter(sheet => sheet.crewId === crewId);
    
    // Filter sheets by date range (convert month names to numbers for comparison)
    const sheets = allSheets.filter(sheet => {
      const sheetDate = new Date(sheet.year, this.monthNameToNumber(sheet.month) - 1, 1);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return sheetDate >= start && sheetDate <= end;
    });
    
    if (sheets.length === 0) {
      return { sheets: [], days: [] };
    }
    
    // Get all days for these sheets within the date range
    const sheetIds = sheets.map(s => s.id);
    const days = Array.from(this.crewRestDays.values())
      .filter(day => sheetIds.includes(day.sheetId) && 
                     day.date >= startDate && 
                     day.date <= endDate)
      .sort((a, b) => a.date.localeCompare(b.date));
    
    return { sheets, days };
  }

  async getMultipleCrewRest(crewIds: string[], year: number, month: string): Promise<{[crewId: string]: {sheet: SelectCrewRestSheet | null, days: SelectCrewRestDay[]}}> {
    const result: {[crewId: string]: {sheet: SelectCrewRestSheet | null, days: SelectCrewRestDay[]}} = {};
    
    // Initialize result for all crew members
    for (const crewId of crewIds) {
      result[crewId] = { sheet: null, days: [] };
    }
    
    if (crewIds.length === 0) {
      return result;
    }
    
    // Get all sheets for these crew members in the specified month
    const sheets = Array.from(this.crewRestSheets.values())
      .filter(sheet => crewIds.includes(sheet.crewId) && 
                       sheet.year === year && 
                       sheet.month === month);
    
    // Get all days for these sheets
    const sheetIds = sheets.map(s => s.id);
    const allDays = Array.from(this.crewRestDays.values())
      .filter(day => sheetIds.includes(day.sheetId))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Organize data by crew member
    for (const sheet of sheets) {
      const crewId = sheet.crewId;
      if (crewId in result) {
        result[crewId].sheet = sheet;
        result[crewId].days = allDays.filter(day => day.sheetId === sheet.id);
      }
    }
    
    return result;
  }

  async getVesselCrewRest(vesselId: string, year: number, month: string): Promise<{[crewId: string]: {sheet: SelectCrewRestSheet | null, days: SelectCrewRestDay[]}}> {
    // First get all crew members for this vessel
    const vesselCrew = Array.from(this.crew.values())
      .filter(c => c.vesselId === vesselId);
    
    const crewIds = vesselCrew.map(c => c.id);
    
    if (crewIds.length === 0) {
      return {};
    }
    
    // Use the multiple crew rest method
    return this.getMultipleCrewRest(crewIds, year, month);
  }

  async getCrewRestByDateRange(
    vesselId?: string, 
    startDate?: string, 
    endDate?: string, 
    complianceFilter?: boolean
  ): Promise<{crewId: string, vesselId: string, sheet: SelectCrewRestSheet, days: SelectCrewRestDay[]}[]> {
    // Get all sheets
    let sheets = Array.from(this.crewRestSheets.values());
    
    // Filter by vessel if specified
    if (vesselId) {
      const vesselCrew = Array.from(this.crew.values())
        .filter(c => c.vesselId === vesselId)
        .map(c => c.id);
      sheets = sheets.filter(sheet => vesselCrew.includes(sheet.crewId));
    }
    
    // Filter by date range if specified
    if (startDate && endDate) {
      sheets = sheets.filter(sheet => {
        const sheetDate = new Date(sheet.year, this.monthNameToNumber(sheet.month) - 1, 1);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return sheetDate >= start && sheetDate <= end;
      });
    }
    
    // Get days for each sheet and build result
    const result = [];
    for (const sheet of sheets) {
      const crewMember = this.crew.get(sheet.crewId);
      if (crewMember) {
        const days = Array.from(this.crewRestDays.values())
          .filter(day => day.sheetId === sheet.id &&
                        (!startDate || day.date >= startDate) &&
                        (!endDate || day.date <= endDate))
          .sort((a, b) => a.date.localeCompare(b.date));
        
        result.push({
          crewId: sheet.crewId,
          vesselId: crewMember.vesselId,
          sheet,
          days
        });
      }
    }
    
    return result;
  }

  // Helper method for month name conversion
  private monthNameToNumber(monthName: string): number {
    const months = [
      'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
    ];
    
    const index = months.indexOf(monthName.toUpperCase());
    return index >= 0 ? index + 1 : 1; // Default to January if not found
  }

  // CMMS-lite: Work Order Checklists Implementation
  async getWorkOrderChecklists(workOrderId?: string, orgId?: string): Promise<WorkOrderChecklist[]> {
    const checklists = Array.from(this.workOrderChecklists.values());
    return checklists.filter(checklist => {
      if (workOrderId && checklist.workOrderId !== workOrderId) return false;
      if (orgId && checklist.orgId !== orgId) return false;
      return true;
    });
  }

  async createWorkOrderChecklist(checklist: InsertWorkOrderChecklist): Promise<WorkOrderChecklist> {
    const newChecklist: WorkOrderChecklist = {
      id: randomUUID(),
      ...checklist,
      createdAt: new Date(),
    };
    this.workOrderChecklists.set(newChecklist.id, newChecklist);
    return newChecklist;
  }

  async updateWorkOrderChecklist(id: string, updates: Partial<InsertWorkOrderChecklist>): Promise<WorkOrderChecklist> {
    const existing = this.workOrderChecklists.get(id);
    if (!existing) {
      throw new Error(`Work order checklist ${id} not found`);
    }
    const updated: WorkOrderChecklist = {
      ...existing,
      ...updates,
    };
    this.workOrderChecklists.set(id, updated);
    return updated;
  }

  async deleteWorkOrderChecklist(id: string): Promise<void> {
    if (!this.workOrderChecklists.has(id)) {
      throw new Error(`Work order checklist ${id} not found`);
    }
    this.workOrderChecklists.delete(id);
  }

  // CMMS-lite: Work Order Worklogs Implementation
  async getWorkOrderWorklogs(workOrderId?: string, orgId?: string): Promise<WorkOrderWorklog[]> {
    const worklogs = Array.from(this.workOrderWorklogs.values());
    return worklogs.filter(worklog => {
      if (workOrderId && worklog.workOrderId !== workOrderId) return false;
      if (orgId && worklog.orgId !== orgId) return false;
      return true;
    });
  }

  async createWorkOrderWorklog(worklog: InsertWorkOrderWorklog): Promise<WorkOrderWorklog> {
    const newWorklog: WorkOrderWorklog = {
      id: randomUUID(),
      ...worklog,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.workOrderWorklogs.set(newWorklog.id, newWorklog);
    return newWorklog;
  }

  async updateWorkOrderWorklog(id: string, updates: Partial<InsertWorkOrderWorklog>): Promise<WorkOrderWorklog> {
    const existing = this.workOrderWorklogs.get(id);
    if (!existing) {
      throw new Error(`Work order worklog ${id} not found`);
    }
    const updated: WorkOrderWorklog = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.workOrderWorklogs.set(id, updated);
    return updated;
  }

  async deleteWorkOrderWorklog(id: string): Promise<void> {
    if (!this.workOrderWorklogs.has(id)) {
      throw new Error(`Work order worklog ${id} not found`);
    }
    this.workOrderWorklogs.delete(id);
  }

  async calculateWorklogCosts(workOrderId: string): Promise<{ totalLaborHours: number; totalLaborCost: number }> {
    const worklogs = Array.from(this.workOrderWorklogs.values()).filter(w => w.workOrderId === workOrderId);
    let totalLaborHours = 0;
    let totalLaborCost = 0;

    worklogs.forEach(worklog => {
      if (worklog.durationMinutes) {
        const hours = worklog.durationMinutes / 60;
        totalLaborHours += hours;
        totalLaborCost += worklog.totalLaborCost || 0;
      }
    });

    return { totalLaborHours, totalLaborCost };
  }

  // CMMS-lite: Parts Inventory Implementation  
  async getPartsInventory(
    category?: string, 
    orgId?: string,
    search?: string,
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Promise<PartsInventory[]> {
    const parts = Array.from(this.partsInventory.values());
    
    // Apply filters
    let filteredParts = parts.filter(part => {
      if (category && part.category !== category) return false;
      if (orgId && part.orgId !== orgId) return false;
      
      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch = 
          part.partNumber.toLowerCase().includes(searchLower) ||
          part.partName.toLowerCase().includes(searchLower) ||
          part.category.toLowerCase().includes(searchLower) ||
          part.manufacturer?.toLowerCase().includes(searchLower) ||
          part.supplierName?.toLowerCase().includes(searchLower) ||
          part.description?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      return true;
    });
    
    // Apply sorting
    if (sortBy) {
      filteredParts.sort((a, b) => {
        let aValue: any = a[sortBy as keyof PartsInventory];
        let bValue: any = b[sortBy as keyof PartsInventory];
        
        // Handle special sorting cases
        if (sortBy === 'stockStatus') {
          // Calculate stock status for sorting
          const getStockStatus = (part: PartsInventory) => {
            if (part.quantityOnHand <= part.minStockLevel) return 'critical';
            if (part.quantityOnHand <= part.minStockLevel * 1.5) return 'low';
            if (part.quantityOnHand >= part.maxStockLevel) return 'excess';
            return 'normal';
          };
          aValue = getStockStatus(a);
          bValue = getStockStatus(b);
        } else if (sortBy === 'totalValue') {
          aValue = a.quantityOnHand * a.unitCost;
          bValue = b.quantityOnHand * b.unitCost;
        }
        
        // Handle null/undefined values
        if (aValue === null || aValue === undefined) aValue = '';
        if (bValue === null || bValue === undefined) bValue = '';
        
        // Perform comparison
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.localeCompare(bValue);
          return sortOrder === 'asc' ? comparison : -comparison;
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          const comparison = aValue - bValue;
          return sortOrder === 'asc' ? comparison : -comparison;
        } else {
          // Convert to string for comparison
          const comparison = String(aValue).localeCompare(String(bValue));
          return sortOrder === 'asc' ? comparison : -comparison;
        }
      });
    }
    
    return filteredParts;
  }

  async getPartById(id: string, orgId?: string): Promise<PartsInventory | undefined> {
    const part = this.partsInventory.get(id);
    if (part && orgId && part.orgId !== orgId) {
      return undefined; // Part exists but not in requested org
    }
    return part;
  }

  async createPart(part: InsertPartsInventory): Promise<PartsInventory> {
    const newPart: PartsInventory = {
      id: randomUUID(),
      ...part,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.partsInventory.set(newPart.id, newPart);
    
    // Record in sync journal and publish event (only for database-backed storage)
    if (process.env.SYNC_ENABLED === 'true') {
      try {
        await recordAndPublish("part", newPart.id, "create", newPart);
      } catch (error) {
        console.warn("[MemStorage] Sync operation failed (expected in memory-only mode):", error.message);
      }
    }
    
    return newPart;
  }

  async updatePart(id: string, updates: Partial<InsertPartsInventory>): Promise<PartsInventory> {
    const existing = this.partsInventory.get(id);
    if (!existing) {
      throw new Error(`Part ${id} not found`);
    }
    const updated: PartsInventory = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.partsInventory.set(id, updated);
    
    // Record in sync journal and publish event (only for database-backed storage)
    if (process.env.SYNC_ENABLED === 'true') {
      try {
        await recordAndPublish("part", id, "update", updated);
      } catch (error) {
        console.warn("[MemStorage] Sync operation failed (expected in memory-only mode):", error.message);
      }
    }
    
    return updated;
  }

  async deletePart(id: string): Promise<void> {
    const existing = this.partsInventory.get(id);
    if (!existing) {
      throw new Error(`Part ${id} not found`);
    }
    
    this.partsInventory.delete(id);
    
    // Record in sync journal and publish event (only for database-backed storage)
    if (process.env.SYNC_ENABLED === 'true') {
      try {
        await recordAndPublish("part", id, "delete", existing);
      } catch (error) {
        console.warn("[MemStorage] Sync operation failed (expected in memory-only mode):", error.message);
      }
    }
  }

  async getLowStockParts(orgId?: string): Promise<PartsInventory[]> {
    const parts = Array.from(this.partsInventory.values());
    return parts.filter(part => {
      if (orgId && part.orgId !== orgId) return false;
      return part.quantityOnHand <= (part.minStockLevel || 0);
    });
  }

  async reservePart(partId: string, quantity: number): Promise<PartsInventory> {
    const part = this.partsInventory.get(partId);
    if (!part) {
      throw new Error(`Part ${partId} not found`);
    }
    if (part.quantityOnHand < quantity) {
      throw new Error(`Insufficient stock for part ${partId}. Available: ${part.quantityOnHand}, Requested: ${quantity}`);
    }
    
    const updated: PartsInventory = {
      ...part,
      quantityReserved: part.quantityReserved + quantity,
      updatedAt: new Date(),
    };
    this.partsInventory.set(partId, updated);
    return updated;
  }

  // Enhanced Parts Catalogue Management (New Schema) - TEMPORARILY DISABLED
  async getPartsCatalogue(orgId?: string, search?: string, category?: string, sortBy?: string, sortOrder?: string): Promise<Part[]> {
    return []; // Temporary stub - implementation disabled
  }

  async getPartCatalogueByNumber(partNo: string, orgId?: string): Promise<Part | undefined> {
    return undefined; // Temporary stub - implementation disabled
  }

  async getPartCatalogueById(id: string, orgId?: string): Promise<Part | undefined> {
    return undefined; // Temporary stub - implementation disabled
  }

  async createPartCatalogue(part: InsertPart): Promise<Part> {
    throw new Error("Enhanced parts catalogue functionality temporarily disabled");
  }

  async updatePartCatalogue(id: string, updates: Partial<InsertPart>): Promise<Part> {
    throw new Error("Enhanced parts catalogue functionality temporarily disabled");
  }

  async deletePartCatalogue(id: string): Promise<void> {
    throw new Error("Enhanced parts catalogue functionality temporarily disabled");
  }

  // Parts-Stock Cost Synchronization Engine
  async syncPartCostToStock(partId: string): Promise<void> {
    console.log(`[DatabaseStorage.syncPartCostToStock] Starting cost sync for part ${partId}`);
    
    // Step 1: Get the part's current standardCost and partNo
    const part = await db.select({
      id: parts.id,
      partNo: parts.partNo,
      standardCost: parts.standardCost,
      orgId: parts.orgId
    })
    .from(parts)
    .where(eq(parts.id, partId))
    .limit(1);
    
    if (part.length === 0) {
      throw new Error(`Part ${partId} not found`);
    }
    
    const { partNo, standardCost, orgId } = part[0];
    console.log(`[DatabaseStorage.syncPartCostToStock] Found part ${partNo} with standardCost ${standardCost}`);
    
    // Step 2: Update partsInventory records that match this part
    const partsInventoryUpdates = await db.update(partsInventory)
      .set({ 
        unitCost: standardCost, 
        updatedAt: new Date() 
      })
      .where(and(
        eq(partsInventory.partNumber, partNo),
        eq(partsInventory.orgId, orgId)
      ))
      .returning({ id: partsInventory.id });
    
    console.log(`[DatabaseStorage.syncPartCostToStock] Updated ${partsInventoryUpdates.length} partsInventory records`);
    
    // Step 3: Update stock records that match this part
    const stockUpdates = await db.update(stock)
      .set({ 
        unitCost: standardCost, 
        updatedAt: new Date() 
      })
      .where(and(
        eq(stock.partId, partId),
        eq(stock.orgId, orgId)
      ))
      .returning({ id: stock.id });
    
    console.log(`[DatabaseStorage.syncPartCostToStock] Updated ${stockUpdates.length} stock records`);
    console.log(`[DatabaseStorage.syncPartCostToStock] Cost synchronization completed for part ${partId}`);
    
    // Record cost sync operation in journal for audit consistency
    await recordAndPublish("part", partId, "update", {
      partNo,
      standardCost,
      partsInventoryUpdated: partsInventoryUpdates.length,
      stockUpdated: stockUpdates.length,
      operation: "cost_sync"
    });
    
    // Publish cost synchronization event (additional to journal entry)
    await publishEvent("cost.synced", {
      partId,
      partNo,
      standardCost,
      partsInventoryUpdated: partsInventoryUpdates.length,
      stockUpdated: stockUpdates.length
    });
  }

  async syncStockCostFromPart(partId: string): Promise<void> {
    throw new Error("Enhanced parts-stock synchronization functionality temporarily disabled");
  }

  // Enhanced Stock Management with Search/Sort
  async getStock(orgId?: string, search?: string, location?: string, sortBy?: string): Promise<Stock[]> {
    return []; // Temporary stub - implementation disabled
  }

  async getStockByPart(partId: string, orgId?: string): Promise<Stock[]> {
    return []; // Temporary stub - implementation disabled
  }

  async getStockByPartNumber(partNo: string, orgId?: string): Promise<Stock[]> {
    return []; // Temporary stub - implementation disabled
  }

  async createStock(stock: InsertStock): Promise<Stock> {
    throw new Error("Enhanced stock management functionality temporarily disabled");
  }

  async updateStock(id: string, updates: Partial<InsertStock>): Promise<Stock> {
    throw new Error("Enhanced stock management functionality temporarily disabled");
  }

  async deleteStock(id: string): Promise<void> {
    throw new Error("Enhanced stock management functionality temporarily disabled");
  }

  async updateStockQuantities(stockId: string, onHand?: number, reserved?: number): Promise<Stock> {
    throw new Error("Enhanced stock management functionality temporarily disabled");
  }

  // CMMS-lite: Work Order Parts Usage Implementation
  async getWorkOrderParts(workOrderId?: string, orgId?: string): Promise<WorkOrderParts[]> {
    const workOrderParts = Array.from(this.workOrderParts.values());
    return workOrderParts.filter(woPart => {
      if (workOrderId && woPart.workOrderId !== workOrderId) return false;
      if (orgId && woPart.orgId !== orgId) return false;
      return true;
    });
  }

  async addPartToWorkOrder(workOrderPart: InsertWorkOrderParts): Promise<WorkOrderParts> {
    const newWorkOrderPart: WorkOrderParts = {
      id: randomUUID(),
      ...workOrderPart,
      createdAt: new Date(),
    };
    this.workOrderParts.set(newWorkOrderPart.id, newWorkOrderPart);
    return newWorkOrderPart;
  }

  async updateWorkOrderPart(id: string, updates: Partial<InsertWorkOrderParts>): Promise<WorkOrderParts> {
    const existing = this.workOrderParts.get(id);
    if (!existing) {
      throw new Error(`Work order part ${id} not found`);
    }
    const updated: WorkOrderParts = {
      ...existing,
      ...updates,
    };
    this.workOrderParts.set(id, updated);
    return updated;
  }

  async removePartFromWorkOrder(id: string): Promise<void> {
    if (!this.workOrderParts.has(id)) {
      throw new Error(`Work order part ${id} not found`);
    }
    this.workOrderParts.delete(id);
  }

  // Bulk parts addition with deduplication logic
  async addBulkPartsToWorkOrder(
    workOrderId: string, 
    partsToAdd: Array<{ partId: string; quantity: number; usedBy: string; notes?: string }>,
    orgId: string
  ): Promise<{ added: WorkOrderParts[]; updated: WorkOrderParts[]; errors: string[] }> {
    const result = {
      added: [] as WorkOrderParts[],
      updated: [] as WorkOrderParts[],
      errors: [] as string[]
    };

    // Get existing parts for this work order to check for duplicates
    const existingParts = await this.getWorkOrderParts(workOrderId, orgId);
    const existingPartMap = new Map(existingParts.map(p => [p.partId, p]));

    for (const partToAdd of partsToAdd) {
      try {
        // Get part details for cost calculation
        const part = this.partsInventory.get(partToAdd.partId);
        if (!part) {
          result.errors.push(`Part ${partToAdd.partId} not found`);
          continue;
        }

        const unitCost = part.unitCost || 0;
        const totalCost = partToAdd.quantity * unitCost;

        // Check if part already exists in this work order
        const existingPart = existingPartMap.get(partToAdd.partId);
        
        if (existingPart) {
          // Update existing part by adding quantities
          const newQuantity = existingPart.quantityUsed + partToAdd.quantity;
          const newTotalCost = newQuantity * unitCost;
          
          const updated = await this.updateWorkOrderPart(existingPart.id, {
            quantityUsed: newQuantity,
            totalCost: newTotalCost,
            notes: partToAdd.notes ? 
              (existingPart.notes ? `${existingPart.notes}; ${partToAdd.notes}` : partToAdd.notes) :
              existingPart.notes
          });
          
          result.updated.push(updated);
          existingPartMap.set(partToAdd.partId, updated); // Update our map
        } else {
          // Add new part
          const newWorkOrderPart = await this.addPartToWorkOrder({
            orgId,
            workOrderId,
            partId: partToAdd.partId,
            quantityUsed: partToAdd.quantity,
            unitCost,
            totalCost,
            usedBy: partToAdd.usedBy,
            notes: partToAdd.notes
          });
          
          result.added.push(newWorkOrderPart);
          existingPartMap.set(partToAdd.partId, newWorkOrderPart); // Add to our map
        }
      } catch (error) {
        result.errors.push(`Failed to add part ${partToAdd.partId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return result;
  }

  async getPartsCostForWorkOrder(workOrderId: string): Promise<{ totalPartsCost: number; partsCount: number }> {
    const workOrderParts = Array.from(this.workOrderParts.values()).filter(wp => wp.workOrderId === workOrderId);
    let totalPartsCost = 0;
    let partsCount = 0;

    workOrderParts.forEach(woPart => {
      totalPartsCost += woPart.totalCost;
      partsCount += woPart.quantityUsed;
    });

    return { totalPartsCost, partsCount };
  }

  // Inventory Risk Analysis: Additional methods for risk assessment
  async getWorkOrderPartsByEquipment(orgId: string, equipmentId: string): Promise<WorkOrderParts[]> {
    // First get work orders for this equipment
    const workOrders = Array.from(this.workOrders.values()).filter(wo => 
      wo.orgId === orgId && wo.equipmentId === equipmentId
    );
    const workOrderIds = workOrders.map(wo => wo.id);
    
    // Then get parts used in those work orders
    return Array.from(this.workOrderParts.values()).filter(wop =>
      workOrderIds.includes(wop.workOrderId)
    );
  }

  async getWorkOrderPartsByPartId(orgId: string, partId: string): Promise<WorkOrderParts[]> {
    return Array.from(this.workOrderParts.values()).filter(wop => {
      if (wop.partId !== partId) return false;
      if (wop.orgId !== orgId) return false;
      return true;
    });
  }

  // Equipment-Parts-Sensor Linkage: Implementation
  async getPartsForEquipment(equipmentId: string, orgId: string): Promise<Part[]> {
    return Array.from(this.parts.values()).filter(part => 
      part.orgId === orgId && 
      part.compatibleEquipment && 
      part.compatibleEquipment.includes(equipmentId)
    );
  }

  async getEquipmentForPart(partId: string, orgId: string): Promise<Equipment[]> {
    const part = this.parts.get(partId);
    if (!part || part.orgId !== orgId || !part.compatibleEquipment) {
      return [];
    }
    
    return Array.from(this.equipment.values()).filter(equipment =>
      equipment.orgId === orgId &&
      part.compatibleEquipment!.includes(equipment.id)
    );
  }

  async suggestPartsForSensorIssue(equipmentId: string, sensorType: string, orgId: string): Promise<Part[]> {
    const equipment = await this.getEquipment(orgId, equipmentId);
    if (!equipment) return [];

    // CRITICAL: Only suggest parts that are compatible with this equipment
    const allPartsForEquipment = await this.getPartsForEquipment(equipmentId, orgId);
    
    // If no compatible parts exist, return empty array
    if (allPartsForEquipment.length === 0) return [];
    
    const sensorTypeKeywords: Record<string, string[]> = {
      temperature: ['thermostat', 'sensor', 'cooling', 'coolant', 'heat', 'temperature'],
      pressure: ['pump', 'valve', 'seal', 'gasket', 'hose', 'pressure'],
      vibration: ['bearing', 'mount', 'dampener', 'shaft', 'coupling', 'vibration'],
      flow: ['pump', 'filter', 'valve', 'impeller', 'flow'],
      voltage: ['battery', 'alternator', 'wire', 'fuse', 'relay', 'voltage', 'electrical'],
      current: ['wire', 'fuse', 'relay', 'connector', 'current', 'electrical'],
    };

    const keywords = sensorTypeKeywords[sensorType.toLowerCase()] || [];
    
    // If no keywords, return all compatible parts
    if (keywords.length === 0) {
      return allPartsForEquipment;
    }

    // Filter compatible parts by keyword relevance
    const relevantParts = allPartsForEquipment.filter(part => {
      const searchText = `${part.name} ${part.description || ''} ${part.category || ''}`.toLowerCase();
      return keywords.some(keyword => searchText.includes(keyword.toLowerCase()));
    });

    // If keyword filtering produces results, use them; otherwise return all compatible parts
    return relevantParts.length > 0 ? relevantParts : allPartsForEquipment;
  }

  async getEquipmentWithSensorIssues(orgId: string, severityFilter?: 'warning' | 'critical'): Promise<Array<{ equipment: Equipment; sensors: Array<{ sensorType: string; status: string; value: number | null }> }>> {
    const equipmentList = await this.getEquipmentRegistry(orgId);
    const results: Array<{ equipment: Equipment; sensors: Array<{ sensorType: string; status: string; value: number | null }> }> = [];

    for (const equipment of equipmentList) {
      const sensorStates = Array.from(this.sensorStates.values()).filter(
        state => state.equipmentId === equipment.id && state.orgId === orgId
      );

      const sensorIssues: Array<{ sensorType: string; status: string; value: number | null }> = [];

      for (const state of sensorStates) {
        const config = await this.getSensorConfiguration(equipment.id, state.sensorType, orgId);
        if (!config || !config.enabled) continue;

        let status = 'normal';
        const value = state.lastValue;

        if (value !== null && value !== undefined) {
          if (config.critHi !== null && value >= config.critHi) status = 'critical';
          else if (config.critLo !== null && value <= config.critLo) status = 'critical';
          else if (config.warnHi !== null && value >= config.warnHi) status = 'warning';
          else if (config.warnLo !== null && value <= config.warnLo) status = 'warning';
        }

        if (status !== 'normal') {
          if (!severityFilter || status === severityFilter) {
            sensorIssues.push({ sensorType: state.sensorType, status, value });
          }
        }
      }

      if (sensorIssues.length > 0) {
        results.push({ equipment, sensors: sensorIssues });
      }
    }

    return results;
  }

  async updatePartCompatibility(partId: string, equipmentIds: string[], orgId: string): Promise<Part> {
    const part = this.parts.get(partId);
    if (!part || part.orgId !== orgId) {
      throw new Error(`Part ${partId} not found`);
    }

    const updatedPart: Part = {
      ...part,
      compatibleEquipment: equipmentIds,
      updatedAt: new Date(),
    };

    this.parts.set(partId, updatedPart);
    return updatedPart;
  }

  async getEquipment(orgId: string, equipmentId: string): Promise<Equipment | undefined> {
    const equipment = this.equipment.get(equipmentId);
    if (equipment && equipment.orgId === orgId) {
      return equipment;
    }
    return undefined;
  }

  async getEquipmentRegistry(orgId?: string): Promise<Equipment[]> {
    let equipmentList = Array.from(this.equipment.values());
    if (orgId) {
      equipmentList = equipmentList.filter(e => e.orgId === orgId);
    }
    return equipmentList.sort((a, b) => a.name.localeCompare(b.name));
  }

  async createEquipment(equipmentData: InsertEquipment): Promise<Equipment> {
    const newEquipment: Equipment = {
      id: crypto.randomUUID(),
      ...equipmentData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.equipment.set(newEquipment.id, newEquipment);

    // Automatically setup analytics for new equipment
    try {
      const { equipmentAnalyticsService } = await import('./equipment-analytics-service.js');
      await equipmentAnalyticsService.setupEquipmentAnalytics(newEquipment);
    } catch (error) {
      console.error(`Failed to setup analytics for new equipment ${newEquipment.id}:`, error);
      // Don't fail equipment creation if analytics setup fails
    }

    // Broadcast equipment creation to all connected clients
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.broadcastEquipmentChange('create', newEquipment);
    }

    return newEquipment;
  }

  async updateEquipment(id: string, equipmentData: Partial<InsertEquipment>, orgId?: string): Promise<Equipment> {
    const existing = this.equipment.get(id);
    if (!existing || (orgId && existing.orgId !== orgId)) {
      throw new Error(`Equipment ${id} not found`);
    }

    const updated: Equipment = {
      ...existing,
      ...equipmentData,
      updatedAt: new Date(),
    };
    this.equipment.set(id, updated);
    
    // Broadcast equipment update to all connected clients
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.broadcastEquipmentChange('update', updated);
    }
    
    return updated;
  }

  async deleteEquipment(id: string, orgId?: string): Promise<void> {
    const existing = this.equipment.get(id);
    if (!existing || (orgId && existing.orgId !== orgId)) {
      throw new Error(`Equipment ${id} not found`);
    }
    this.equipment.delete(id);
    
    // Broadcast equipment deletion to all connected clients
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.broadcastEquipmentChange('delete', { id });
    }
  }

  // Vessel-Equipment association methods
  async getEquipmentByVessel(vesselId: string, orgId: string): Promise<Equipment[]> {
    const equipmentList = Array.from(this.equipment.values());
    return equipmentList.filter(equip => 
      equip.orgId === orgId && 
      (equip.vesselId === vesselId || equip.vesselName === this.getVesselNameById(vesselId))
    ).sort((a, b) => a.name.localeCompare(b.name));
  }

  async associateEquipmentToVessel(equipmentId: string, vesselId: string, orgId: string): Promise<Equipment> {
    const equipment = this.equipment.get(equipmentId);
    if (!equipment || equipment.orgId !== orgId) {
      throw new Error(`Equipment ${equipmentId} not found`);
    }
    
    const vessel = Array.from(this.vessels.values()).find(v => v.id === vesselId && v.orgId === orgId);
    if (!vessel) {
      throw new Error(`Vessel ${vesselId} not found`);
    }

    const updated = {
      ...equipment,
      vesselId: vesselId,
      vesselName: vessel.name,
      updatedAt: new Date()
    };
    this.equipment.set(equipmentId, updated);
    return updated;
  }

  async disassociateEquipmentFromVessel(equipmentId: string, orgId: string): Promise<void> {
    const equipment = this.equipment.get(equipmentId);
    if (!equipment || equipment.orgId !== orgId) {
      throw new Error(`Equipment ${equipmentId} not found`);
    }

    const updated = {
      ...equipment,
      vesselId: null,
      // Keep vesselName for backward compatibility
      updatedAt: new Date()
    };
    this.equipment.set(equipmentId, updated);
  }

  private getVesselNameById(vesselId: string): string | null {
    const vessel = Array.from(this.vessels.values()).find(v => v.id === vesselId);
    return vessel ? vessel.name : null;
  }

  async getWorkOrder(orgId: string, workOrderId: string): Promise<WorkOrder | undefined> {
    const workOrder = this.workOrders.get(workOrderId);
    if (workOrder && workOrder.orgId === orgId) {
      return workOrder;
    }
    return undefined;
  }

  async getEquipmentSensorTypes(orgId: string, equipmentId: string): Promise<string[]> {
    // Get unique sensor types from telemetry for this equipment
    const telemetryData = Array.from(this.equipmentTelemetry.values()).filter(t => 
      t.orgId === orgId && t.equipmentId === equipmentId
    );
    
    const sensorTypes = [...new Set(telemetryData.map(t => t.sensorType))];
    return sensorTypes;
  }

  // Optimizer v1: Fleet scheduling optimization with greedy algorithm
  async getOptimizerConfigurations(orgId?: string): Promise<OptimizerConfiguration[]> {
    let configs = Array.from(this.optimizerConfigurations.values());
    if (orgId) {
      configs = configs.filter(c => c.orgId === orgId);
    }
    return configs;
  }

  async createOptimizerConfiguration(config: InsertOptimizerConfiguration): Promise<OptimizerConfiguration> {
    const newConfig: OptimizerConfiguration = {
      id: crypto.randomUUID(),
      ...config,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.optimizerConfigurations.set(newConfig.id, newConfig);
    return newConfig;
  }

  async updateOptimizerConfiguration(id: string, config: Partial<InsertOptimizerConfiguration>): Promise<OptimizerConfiguration> {
    const existing = this.optimizerConfigurations.get(id);
    if (!existing) {
      throw new Error(`Optimizer configuration ${id} not found`);
    }
    const updated: OptimizerConfiguration = {
      ...existing,
      ...config,
      updatedAt: new Date(),
    };
    this.optimizerConfigurations.set(id, updated);
    return updated;
  }

  async deleteOptimizerConfiguration(id: string): Promise<void> {
    if (!this.optimizerConfigurations.has(id)) {
      throw new Error(`Optimizer configuration ${id} not found`);
    }
    this.optimizerConfigurations.delete(id);
  }

  // Resource constraints management
  async getResourceConstraints(resourceType?: string, orgId?: string): Promise<ResourceConstraint[]> {
    let constraints = Array.from(this.resourceConstraints.values());
    if (orgId) {
      constraints = constraints.filter(c => c.orgId === orgId);
    }
    if (resourceType) {
      constraints = constraints.filter(c => c.resourceType === resourceType);
    }
    return constraints.filter(c => c.isActive);
  }

  async createResourceConstraint(constraint: InsertResourceConstraint): Promise<ResourceConstraint> {
    const newConstraint: ResourceConstraint = {
      id: crypto.randomUUID(),
      ...constraint,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.resourceConstraints.set(newConstraint.id, newConstraint);
    return newConstraint;
  }

  async updateResourceConstraint(id: string, constraint: Partial<InsertResourceConstraint>): Promise<ResourceConstraint> {
    const existing = this.resourceConstraints.get(id);
    if (!existing) {
      throw new Error(`Resource constraint ${id} not found`);
    }
    const updated: ResourceConstraint = {
      ...existing,
      ...constraint,
      updatedAt: new Date(),
    };
    this.resourceConstraints.set(id, updated);
    return updated;
  }

  async deleteResourceConstraint(id: string): Promise<void> {
    if (!this.resourceConstraints.has(id)) {
      throw new Error(`Resource constraint ${id} not found`);
    }
    this.resourceConstraints.delete(id);
  }

  // Optimization execution with greedy algorithm
  async runOptimization(configId: string, equipmentScope?: string[], timeHorizon?: number): Promise<OptimizationResult> {
    const config = this.optimizerConfigurations.get(configId);
    if (!config) {
      throw new Error(`Optimizer configuration ${configId} not found`);
    }

    const startTime = new Date();
    const optimizationResult: OptimizationResult = {
      id: crypto.randomUUID(),
      orgId: config.orgId,
      configurationId: configId,
      runStatus: 'running',
      startTime,
      endTime: null,
      executionTimeMs: null,
      equipmentScope: JSON.stringify(equipmentScope || []),
      timeHorizon: timeHorizon || config.maxSchedulingHorizon || 90,
      totalSchedules: 0,
      totalCostEstimate: null,
      costSavings: null,
      resourceUtilization: null,
      conflictsResolved: 0,
      optimizationScore: null,
      algorithmMetrics: null,
      recommendations: null,
      appliedToProduction: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.optimizationResults.set(optimizationResult.id, optimizationResult);

    try {
      // Execute greedy optimization algorithm
      const result = await this.executeGreedyOptimization(config, equipmentScope, timeHorizon || 90);
      
      const endTime = new Date();
      const executionTimeMs = endTime.getTime() - startTime.getTime();

      // Update result with optimization outcome
      const completedResult: OptimizationResult = {
        ...optimizationResult,
        runStatus: 'completed',
        endTime,
        executionTimeMs,
        totalSchedules: result.scheduleOptimizations.length,
        totalCostEstimate: result.totalCostEstimate,
        costSavings: result.costSavings,
        resourceUtilization: JSON.stringify(result.resourceUtilization),
        conflictsResolved: result.conflictsResolved,
        optimizationScore: result.optimizationScore,
        algorithmMetrics: JSON.stringify(result.algorithmMetrics),
        recommendations: JSON.stringify(result.scheduleOptimizations),
        updatedAt: new Date(),
      };

      this.optimizationResults.set(optimizationResult.id, completedResult);

      // Store individual schedule optimizations
      result.scheduleOptimizations.forEach(scheduleOpt => {
        this.scheduleOptimizations.set(scheduleOpt.id, scheduleOpt);
      });

      return completedResult;
    } catch (error) {
      // Mark as failed
      const failedResult: OptimizationResult = {
        ...optimizationResult,
        runStatus: 'failed',
        endTime: new Date(),
        executionTimeMs: new Date().getTime() - startTime.getTime(),
        updatedAt: new Date(),
      };
      this.optimizationResults.set(optimizationResult.id, failedResult);
      throw error;
    }
  }

  // Core greedy optimization algorithm implementation
  private async executeGreedyOptimization(
    config: OptimizerConfiguration, 
    equipmentScope?: string[], 
    timeHorizon: number = 90
  ): Promise<{
    scheduleOptimizations: ScheduleOptimization[];
    totalCostEstimate: number;
    costSavings: number;
    resourceUtilization: Record<string, any>;
    conflictsResolved: number;
    optimizationScore: number;
    algorithmMetrics: Record<string, any>;
  }> {
    const configParams = JSON.parse(config.config);
    const costWeight = config.costWeightFactor || 0.4;
    const urgencyWeight = config.urgencyWeightFactor || 0.6;
    
    // Get equipment scope (default to all if not specified)
    const targetEquipment = equipmentScope && equipmentScope.length > 0 
      ? equipmentScope 
      : Array.from(this.devices.values()).filter(d => d.orgId === config.orgId).map(d => d.id);

    // Get current schedules within time horizon
    const horizonEnd = new Date(Date.now() + timeHorizon * 24 * 60 * 60 * 1000);
    const currentSchedules = Array.from(this.maintenanceSchedules.values())
      .filter(s => s.orgId === config.orgId && s.scheduledDate <= horizonEnd);

    // Get resource constraints
    const technicians = await this.getResourceConstraints('technician', config.orgId);
    const parts = await this.getResourceConstraints('part', config.orgId);

    // Calculate maintenance urgency for each equipment
    const equipmentUrgency: Array<{
      equipmentId: string;
      urgencyScore: number;
      pdmScore: number;
      estimatedCost: number;
      lastMaintenance?: Date;
      alertCount: number;
    }> = [];

    for (const equipmentId of targetEquipment) {
      const pdmScore = await this.getLatestPdmScore(equipmentId);
      const alerts = await this.getAlertNotifications(false, config.orgId);
      const equipmentAlerts = alerts.filter(a => a.equipmentId === equipmentId);
      const lastMaintenance = Array.from(this.maintenanceRecords.values())
        .filter(r => r.equipmentId === equipmentId)
        .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))[0];

      // Calculate urgency score (0-100)
      const healthScore = pdmScore?.score || 70;
      const daysSinceLastMaintenance = lastMaintenance 
        ? Math.floor((Date.now() - (lastMaintenance.createdAt?.getTime() || Date.now())) / (24 * 60 * 60 * 1000))
        : 365;
      
      const urgencyScore = Math.min(100, 
        (100 - healthScore) * 0.6 + // Health deterioration
        Math.min(50, daysSinceLastMaintenance / 7) * 0.2 + // Time since last maintenance
        Math.min(30, equipmentAlerts.length * 5) * 0.2 // Alert frequency
      );

      // Estimate maintenance cost based on urgency and equipment type
      const baseCost = this.estimateMaintenanceCost(equipmentId, urgencyScore);

      equipmentUrgency.push({
        equipmentId,
        urgencyScore,
        pdmScore: healthScore,
        estimatedCost: baseCost,
        lastMaintenance: lastMaintenance?.createdAt,
        alertCount: equipmentAlerts.length,
      });
    }

    // Sort by composite priority (greedy selection)
    equipmentUrgency.sort((a, b) => {
      const priorityA = urgencyWeight * a.urgencyScore + costWeight * (100 - a.estimatedCost / 1000);
      const priorityB = urgencyWeight * b.urgencyScore + costWeight * (100 - b.estimatedCost / 1000);
      return priorityB - priorityA; // Highest priority first
    });

    // Greedy schedule optimization
    const scheduleOptimizations: ScheduleOptimization[] = [];
    const resourceSchedule: Record<string, Array<{start: Date, end: Date, equipmentId: string}>> = {};
    let totalCostEstimate = 0;
    let conflictsResolved = 0;

    // Initialize resource schedules
    technicians.forEach(tech => {
      resourceSchedule[tech.resourceId] = [];
    });

    for (const equipment of equipmentUrgency) {
      // Determine optimal maintenance window
      const optimalDate = this.calculateOptimalMaintenanceDate(
        equipment, 
        config, 
        currentSchedules,
        resourceSchedule
      );

      // Find best available technician
      const assignedTechnician = this.findBestAvailableTechnician(
        technicians,
        optimalDate,
        resourceSchedule,
        equipment.equipmentId
      );

      if (assignedTechnician && optimalDate) {
        const estimatedDuration = this.estimateMaintenanceDuration(equipment.equipmentId, equipment.urgencyScore);
        const maintenanceType = equipment.urgencyScore > 80 ? 'corrective' : 
                              equipment.urgencyScore > 50 ? 'predictive' : 'preventive';

        // Check for conflicts with existing schedules
        const conflicts = currentSchedules.filter(s => 
          s.equipmentId === equipment.equipmentId &&
          Math.abs(s.scheduledDate.getTime() - optimalDate.getTime()) < 24 * 60 * 60 * 1000
        );

        if (conflicts.length > 0) {
          conflictsResolved += conflicts.length;
        }

        const scheduleOpt: ScheduleOptimization = {
          id: crypto.randomUUID(),
          orgId: config.orgId,
          optimizationResultId: '', // Will be set by caller
          equipmentId: equipment.equipmentId,
          currentScheduleId: conflicts[0]?.id || null,
          recommendedScheduleDate: optimalDate,
          recommendedMaintenanceType: maintenanceType,
          recommendedPriority: equipment.urgencyScore > 80 ? 1 : equipment.urgencyScore > 50 ? 2 : 3,
          estimatedDuration,
          estimatedCost: equipment.estimatedCost,
          assignedTechnicianId: assignedTechnician.resourceId,
          requiredParts: JSON.stringify(this.getRequiredPartsForMaintenance(equipment.equipmentId)),
          optimizationReason: `Greedy optimization: urgency=${equipment.urgencyScore.toFixed(1)}, cost=${equipment.estimatedCost}, priority=${(urgencyWeight * equipment.urgencyScore + costWeight * (100 - equipment.estimatedCost / 1000)).toFixed(1)}`,
          conflictsWith: JSON.stringify(conflicts.map(c => c.id)),
          priority: urgencyWeight * equipment.urgencyScore + costWeight * (100 - equipment.estimatedCost / 1000),
          status: 'pending',
          appliedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        scheduleOptimizations.push(scheduleOpt);

        // Block technician time
        const endTime = new Date(optimalDate.getTime() + estimatedDuration * 60 * 1000);
        resourceSchedule[assignedTechnician.resourceId].push({
          start: optimalDate,
          end: endTime,
          equipmentId: equipment.equipmentId
        });

        totalCostEstimate += equipment.estimatedCost;
      }
    }

    // Calculate optimization metrics
    const currentTotalCost = equipmentUrgency.reduce((sum, eq) => sum + eq.estimatedCost * 1.2, 0); // 20% higher without optimization
    const costSavings = currentTotalCost - totalCostEstimate;
    const optimizationScore = Math.min(100, (costSavings / currentTotalCost) * 100 + (conflictsResolved * 5));

    // Resource utilization
    const resourceUtilization = {
      technicians: technicians.map(tech => ({
        resourceId: tech.resourceId,
        resourceName: tech.resourceName,
        scheduledHours: resourceSchedule[tech.resourceId]?.reduce((hours, slot) => 
          hours + (slot.end.getTime() - slot.start.getTime()) / (60 * 60 * 1000), 0) || 0,
        utilization: Math.min(100, ((resourceSchedule[tech.resourceId]?.length || 0) / timeHorizon * 24) * 100)
      })),
      totalScheduledTasks: scheduleOptimizations.length,
      averageUtilization: technicians.length > 0 ? 
        technicians.reduce((sum, tech) => sum + Math.min(100, ((resourceSchedule[tech.resourceId]?.length || 0) / timeHorizon * 24) * 100), 0) / technicians.length : 0
    };

    const algorithmMetrics = {
      algorithm: 'greedy',
      equipmentEvaluated: targetEquipment.length,
      scheduleGenerated: scheduleOptimizations.length,
      costWeight,
      urgencyWeight,
      timeHorizon,
      convergenceIterations: 1, // Greedy is single pass
      optimizationCriteria: config.conflictResolutionStrategy
    };

    return {
      scheduleOptimizations,
      totalCostEstimate,
      costSavings,
      resourceUtilization,
      conflictsResolved,
      optimizationScore,
      algorithmMetrics
    };
  }

  // Helper methods for greedy algorithm
  private calculateOptimalMaintenanceDate(
    equipment: any, 
    config: OptimizerConfiguration, 
    currentSchedules: MaintenanceSchedule[],
    resourceSchedule: Record<string, Array<{start: Date, end: Date, equipmentId: string}>>
  ): Date {
    const now = new Date();
    const urgency = equipment.urgencyScore;
    
    // High urgency: schedule within 1-3 days
    // Medium urgency: schedule within 1-2 weeks  
    // Low urgency: schedule optimally within time horizon
    let targetDays: number;
    if (urgency > 80) targetDays = Math.random() * 2 + 1; // 1-3 days
    else if (urgency > 50) targetDays = Math.random() * 10 + 3; // 3-13 days
    else targetDays = Math.random() * 30 + 7; // 1-5 weeks

    return new Date(now.getTime() + targetDays * 24 * 60 * 60 * 1000);
  }

  private findBestAvailableTechnician(
    technicians: ResourceConstraint[],
    targetDate: Date,
    resourceSchedule: Record<string, Array<{start: Date, end: Date, equipmentId: string}>>,
    equipmentId: string
  ): ResourceConstraint | null {
    // Find technician with least conflicts and appropriate skills
    let bestTechnician: ResourceConstraint | null = null;
    let minConflicts = Infinity;

    for (const tech of technicians) {
      const schedule = resourceSchedule[tech.resourceId] || [];
      const conflicts = schedule.filter(slot => 
        targetDate >= slot.start && targetDate <= slot.end
      ).length;

      if (conflicts < minConflicts) {
        minConflicts = conflicts;
        bestTechnician = tech;
      }
    }

    return bestTechnician;
  }

  private estimateMaintenanceCost(equipmentId: string, urgencyScore: number): number {
    // Base cost estimation with urgency multiplier
    const baseCost = 500; // Base maintenance cost
    const urgencyMultiplier = 1 + (urgencyScore / 100); // 1.0 to 2.0x
    const equipmentMultiplier = equipmentId.includes('ENG') ? 1.5 : 1.0; // Engines cost more
    
    return baseCost * urgencyMultiplier * equipmentMultiplier;
  }

  private estimateMaintenanceDuration(equipmentId: string, urgencyScore: number): number {
    // Duration in minutes
    const baseDuration = 120; // 2 hours base
    const urgencyMultiplier = 1 + (urgencyScore / 200); // 1.0 to 1.5x
    const equipmentMultiplier = equipmentId.includes('ENG') ? 1.5 : 1.0;
    
    return Math.round(baseDuration * urgencyMultiplier * equipmentMultiplier);
  }

  private getRequiredPartsForMaintenance(equipmentId: string): string[] {
    // Simplified part requirements based on equipment type
    if (equipmentId.includes('ENG')) {
      return ['oil-filter', 'engine-oil', 'spark-plugs'];
    } else if (equipmentId.includes('PUMP')) {
      return ['pump-seal', 'hydraulic-fluid'];
    } else {
      return ['general-maintenance-kit'];
    }
  }

  async getOptimizationResults(orgId?: string, limit?: number): Promise<OptimizationResult[]> {
    let results = Array.from(this.optimizationResults.values());
    if (orgId) {
      results = results.filter(r => r.orgId === orgId);
    }
    results.sort((a, b) => (b.startTime?.getTime() || 0) - (a.startTime?.getTime() || 0));
    return limit ? results.slice(0, limit) : results;
  }

  async getOptimizationResult(id: string): Promise<OptimizationResult | undefined> {
    return this.optimizationResults.get(id);
  }

  async cancelOptimization(optimizationId: string): Promise<OptimizationResult> {
    const result = this.optimizationResults.get(optimizationId);
    if (!result) {
      throw new Error(`Optimization ${optimizationId} not found`);
    }

    if (result.runStatus !== 'running') {
      throw new Error(`Cannot cancel optimization ${optimizationId}: status is ${result.runStatus}`);
    }

    const cancelledResult: OptimizationResult = {
      ...result,
      runStatus: 'failed',
      endTime: new Date().toISOString(),
      executionTimeMs: Date.now() - new Date(result.startTime).getTime(),
      updatedAt: new Date().toISOString(),
    };

    this.optimizationResults.set(optimizationId, cancelledResult);
    return cancelledResult;
  }

  // Schedule optimization recommendations
  async getScheduleOptimizations(optimizationResultId: string): Promise<ScheduleOptimization[]> {
    return Array.from(this.scheduleOptimizations.values())
      .filter(s => s.optimizationResultId === optimizationResultId);
  }

  async applyScheduleOptimization(optimizationId: string): Promise<MaintenanceSchedule> {
    const optimization = this.scheduleOptimizations.get(optimizationId);
    if (!optimization) {
      throw new Error(`Schedule optimization ${optimizationId} not found`);
    }

    // Create maintenance schedule from optimization
    const schedule: InsertMaintenanceSchedule = {
      orgId: optimization.orgId,
      equipmentId: optimization.equipmentId,
      scheduledDate: optimization.recommendedScheduleDate,
      maintenanceType: optimization.recommendedMaintenanceType,
      priority: optimization.recommendedPriority,
      estimatedDuration: optimization.estimatedDuration || undefined,
      description: `Optimized schedule: ${optimization.optimizationReason}`,
      status: 'scheduled',
      assignedTo: optimization.assignedTechnicianId || undefined,
      autoGenerated: true,
    };

    const newSchedule = await this.createMaintenanceSchedule(schedule);

    // Update optimization status
    const updatedOptimization: ScheduleOptimization = {
      ...optimization,
      status: 'applied',
      appliedAt: new Date(),
      updatedAt: new Date(),
    };
    this.scheduleOptimizations.set(optimizationId, updatedOptimization);

    return newSchedule;
  }

  async rejectScheduleOptimization(optimizationId: string, reason?: string): Promise<ScheduleOptimization> {
    const optimization = this.scheduleOptimizations.get(optimizationId);
    if (!optimization) {
      throw new Error(`Schedule optimization ${optimizationId} not found`);
    }

    const updated: ScheduleOptimization = {
      ...optimization,
      status: 'rejected',
      optimizationReason: reason ? `${optimization.optimizationReason} | Rejected: ${reason}` : optimization.optimizationReason,
      updatedAt: new Date(),
    };
    this.scheduleOptimizations.set(optimizationId, updated);
    return updated;
  }

  async getOptimizationRecommendations(equipmentId?: string, timeHorizon?: number): Promise<ScheduleOptimization[]> {
    let recommendations = Array.from(this.scheduleOptimizations.values())
      .filter(s => s.status === 'pending');
    
    if (equipmentId) {
      recommendations = recommendations.filter(s => s.equipmentId === equipmentId);
    }

    if (timeHorizon) {
      const horizonEnd = new Date(Date.now() + timeHorizon * 24 * 60 * 60 * 1000);
      recommendations = recommendations.filter(s => s.recommendedScheduleDate <= horizonEnd);
    }

    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  // RAG Search System: Knowledge base and enhanced citations
  async searchKnowledgeBase(query: string, filters?: { contentType?: string[]; orgId?: string; equipmentId?: string; }): Promise<KnowledgeBaseItem[]> {
    let items = Array.from(this.knowledgeBaseItems.values()).filter(item => item.isActive);
    
    // Apply filters
    if (filters?.orgId) {
      items = items.filter(item => item.orgId === filters.orgId);
    }
    if (filters?.contentType && filters.contentType.length > 0) {
      items = items.filter(item => filters.contentType!.includes(item.contentType));
    }
    if (filters?.equipmentId) {
      items = items.filter(item => 
        item.sourceId === filters.equipmentId || 
        (item.metadata as any)?.equipmentId === filters.equipmentId
      );
    }

    // Simple text search (in production, this would use vector similarity or Elasticsearch)
    const queryLower = query.toLowerCase();
    const searchResults = items.filter(item => 
      item.title.toLowerCase().includes(queryLower) ||
      item.content.toLowerCase().includes(queryLower) ||
      item.summary?.toLowerCase().includes(queryLower) ||
      item.keywords?.some(keyword => keyword.toLowerCase().includes(queryLower))
    );

    // Score and sort results
    return searchResults
      .map(item => ({
        ...item,
        relevanceScore: this.calculateRelevanceScore(item, query)
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 20); // Limit to top 20 results
  }

  private calculateRelevanceScore(item: KnowledgeBaseItem, query: string): number {
    const queryLower = query.toLowerCase();
    let score = item.relevanceScore || 1.0;

    // Boost score for exact matches in title
    if (item.title.toLowerCase().includes(queryLower)) {
      score *= 1.5;
    }

    // Boost score for keyword matches
    if (item.keywords?.some(keyword => keyword.toLowerCase().includes(queryLower))) {
      score *= 1.3;
    }

    // Boost score for recent content
    const daysSinceUpdate = (Date.now() - (item.lastUpdated?.getTime() || item.createdAt?.getTime() || Date.now())) / (24 * 60 * 60 * 1000);
    if (daysSinceUpdate < 7) {
      score *= 1.2; // Recent content is more relevant
    }

    return score;
  }

  async createKnowledgeBaseItem(item: InsertKnowledgeBaseItem): Promise<KnowledgeBaseItem> {
    const newItem: KnowledgeBaseItem = {
      id: crypto.randomUUID(),
      ...item,
      lastUpdated: new Date(),
      createdAt: new Date(),
    };
    this.knowledgeBaseItems.set(newItem.id, newItem);
    return newItem;
  }

  async updateKnowledgeBaseItem(id: string, item: Partial<InsertKnowledgeBaseItem>): Promise<KnowledgeBaseItem> {
    const existing = this.knowledgeBaseItems.get(id);
    if (!existing) {
      throw new Error(`Knowledge base item ${id} not found`);
    }
    const updated: KnowledgeBaseItem = {
      ...existing,
      ...item,
      lastUpdated: new Date(),
    };
    this.knowledgeBaseItems.set(id, updated);
    return updated;
  }

  async deleteKnowledgeBaseItem(id: string): Promise<void> {
    if (!this.knowledgeBaseItems.has(id)) {
      throw new Error(`Knowledge base item ${id} not found`);
    }
    this.knowledgeBaseItems.delete(id);
  }

  async getKnowledgeBaseItems(orgId?: string, contentType?: string): Promise<KnowledgeBaseItem[]> {
    let items = Array.from(this.knowledgeBaseItems.values()).filter(item => item.isActive);
    if (orgId) {
      items = items.filter(item => item.orgId === orgId);
    }
    if (contentType) {
      items = items.filter(item => item.contentType === contentType);
    }
    return items.sort((a, b) => (b.lastUpdated?.getTime() || 0) - (a.lastUpdated?.getTime() || 0));
  }

  // Content source management for citations
  async getContentSources(orgId?: string, sourceType?: string): Promise<ContentSource[]> {
    let sources = Array.from(this.contentSources.values());
    if (orgId) {
      sources = sources.filter(source => source.orgId === orgId);
    }
    if (sourceType) {
      sources = sources.filter(source => source.sourceType === sourceType);
    }
    return sources.sort((a, b) => (b.lastModified?.getTime() || 0) - (a.lastModified?.getTime() || 0));
  }

  async createContentSource(source: InsertContentSource): Promise<ContentSource> {
    const newSource: ContentSource = {
      id: crypto.randomUUID(),
      ...source,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.contentSources.set(newSource.id, newSource);
    return newSource;
  }

  async updateContentSource(id: string, source: Partial<InsertContentSource>): Promise<ContentSource> {
    const existing = this.contentSources.get(id);
    if (!existing) {
      throw new Error(`Content source ${id} not found`);
    }
    const updated: ContentSource = {
      ...existing,
      ...source,
      updatedAt: new Date(),
    };
    this.contentSources.set(id, updated);
    return updated;
  }

  // RAG search query logging and analytics
  async logRagSearchQuery(query: InsertRagSearchQuery): Promise<RagSearchQuery> {
    const newQuery: RagSearchQuery = {
      id: crypto.randomUUID(),
      ...query,
      createdAt: new Date(),
    };
    this.ragSearchQueries.set(newQuery.id, newQuery);
    return newQuery;
  }

  async getRagSearchHistory(orgId?: string, limit?: number): Promise<RagSearchQuery[]> {
    let queries = Array.from(this.ragSearchQueries.values());
    if (orgId) {
      queries = queries.filter(query => query.orgId === orgId);
    }
    queries.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
    return limit ? queries.slice(0, limit) : queries;
  }

  // Enhanced search methods for LLM report generation
  async semanticSearch(query: string, orgId: string, contentTypes?: string[], limit?: number): Promise<{ items: KnowledgeBaseItem[]; citations: ContentSource[]; }> {
    // Perform knowledge base search
    const items = await this.searchKnowledgeBase(query, {
      orgId,
      contentType: contentTypes
    });

    // Get related content sources for citations
    const sourceIds = items.map(item => item.sourceId);
    const citations = await this.getContentSources(orgId);
    const relevantCitations = citations.filter(citation => 
      sourceIds.includes(citation.sourceId) ||
      citation.relatedSources?.some(relatedId => sourceIds.includes(relatedId))
    );

    const limitedItems = limit ? items.slice(0, limit) : items;

    // Log this search for analytics
    await this.logRagSearchQuery({
      orgId,
      query,
      searchType: 'semantic',
      filters: { contentTypes, limit },
      resultCount: limitedItems.length,
      executionTimeMs: 50, // Simulated execution time
      resultIds: limitedItems.map(item => item.id),
      relevanceScores: limitedItems.map(item => item.relevanceScore || 1.0),
      successful: true,
    });

    return {
      items: limitedItems,
      citations: relevantCitations.slice(0, 10) // Limit citations
    };
  }

  async indexContent(sourceType: string, sourceId: string, content: string, metadata?: Record<string, any>, orgId?: string): Promise<KnowledgeBaseItem> {
    // Generate title based on content type and ID
    const title = this.generateContentTitle(sourceType, sourceId, metadata);
    
    // Generate summary from content
    const summary = this.generateContentSummary(content);
    
    // Extract keywords
    const keywords = this.extractKeywords(content, sourceType);

    // Create or update content source
    await this.createContentSource({
      orgId: orgId || 'default-org-id',
      sourceType,
      sourceId,
      entityName: title,
      lastModified: new Date(),
      tags: keywords,
    });

    // Create knowledge base item
    return await this.createKnowledgeBaseItem({
      orgId: orgId || 'default-org-id',
      contentType: sourceType,
      sourceId,
      title,
      content,
      summary,
      metadata: metadata || {},
      keywords,
      relevanceScore: 1.0,
      isActive: true,
    });
  }

  private generateContentTitle(sourceType: string, sourceId: string, metadata?: Record<string, any>): string {
    switch (sourceType) {
      case 'equipment':
        return `Equipment ${sourceId}${metadata?.equipmentType ? ` (${metadata.equipmentType})` : ''}`;
      case 'alert':
        return `Alert for ${metadata?.equipmentId || sourceId}${metadata?.sensorType ? ` - ${metadata.sensorType}` : ''}`;
      case 'work_order':
        return `Work Order ${sourceId}${metadata?.title ? ` - ${metadata.title}` : ''}`;
      case 'maintenance_record':
        return `Maintenance Record ${sourceId}${metadata?.equipmentId ? ` for ${metadata.equipmentId}` : ''}`;
      case 'telemetry':
        return `Telemetry Data${metadata?.equipmentId ? ` for ${metadata.equipmentId}` : ''}${metadata?.sensorType ? ` - ${metadata.sensorType}` : ''}`;
      default:
        return `${sourceType} ${sourceId}`;
    }
  }

  private generateContentSummary(content: string): string {
    // Simple summary generation (first 500 characters)
    if (content.length <= 500) return content;
    
    const words = content.split(' ');
    let summary = '';
    for (const word of words) {
      if (summary.length + word.length + 1 > 500) break;
      summary += (summary ? ' ' : '') + word;
    }
    return summary + '...';
  }

  private extractKeywords(content: string, sourceType: string): string[] {
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should']);
    
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.has(word));

    // Get word frequency
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });

    // Get top keywords
    const keywords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(entry => entry[0]);

    // Add source type as keyword
    keywords.unshift(sourceType);

    return keywords;
  }

  async refreshContentIndex(orgId?: string, sourceTypes?: string[]): Promise<{ indexed: number; updated: number; }> {
    let indexed = 0;
    let updated = 0;

    // Get all equipment data
    const devices = await this.getDevices(orgId);
    for (const device of devices) {
      if (!sourceTypes || sourceTypes.includes('equipment')) {
        try {
          const content = `Equipment: ${device.id} (${device.type || 'Unknown'}) on vessel ${device.vessel || 'Unknown'}. 
            Location: ${device.location || 'Unknown'}. 
            Configuration: ${JSON.stringify(device.configuration || {})}`;
          
          await this.indexContent('equipment', device.id, content, {
            equipmentType: device.type,
            vessel: device.vessel,
            location: device.location
          }, device.orgId);
          indexed++;
        } catch (error) {
          console.warn(`Failed to index equipment ${device.id}:`, error);
        }
      }
    }

    // Get all work orders
    const workOrders = await this.getWorkOrders(undefined, orgId);
    for (const workOrder of workOrders) {
      if (!sourceTypes || sourceTypes.includes('work_order')) {
        try {
          const content = `Work Order: ${workOrder.title || 'Untitled'}. 
            Equipment: ${workOrder.equipmentId}. 
            Description: ${workOrder.description || 'No description'}. 
            Status: ${workOrder.status}. 
            Priority: ${workOrder.priority}`;
          
          await this.indexContent('work_order', workOrder.id, content, {
            equipmentId: workOrder.equipmentId,
            title: workOrder.title,
            status: workOrder.status,
            priority: workOrder.priority
          }, workOrder.orgId);
          indexed++;
        } catch (error) {
          console.warn(`Failed to index work order ${workOrder.id}:`, error);
        }
      }
    }

    // Get recent alerts
    const alerts = await this.getAlertNotifications(false, orgId);
    for (const alert of alerts.slice(0, 100)) { // Limit to recent 100 alerts
      if (!sourceTypes || sourceTypes.includes('alert')) {
        try {
          const content = `Alert: ${alert.alertType} for equipment ${alert.equipmentId}. 
            Sensor: ${alert.sensorType}. 
            Message: ${alert.message}. 
            Severity: ${alert.severity}. 
            Value: ${alert.value}, Threshold: ${alert.threshold}`;
          
          await this.indexContent('alert', alert.id, content, {
            equipmentId: alert.equipmentId,
            sensorType: alert.sensorType,
            alertType: alert.alertType,
            severity: alert.severity
          }, alert.orgId);
          indexed++;
        } catch (error) {
          console.warn(`Failed to index alert ${alert.id}:`, error);
        }
      }
    }

    return { indexed, updated };
  }

  // ===== VESSEL MANAGEMENT (MemStorage implementation for interface compliance) =====

  async getVessels(orgId?: string): Promise<SelectVessel[]> {
    const vessels = Array.from(this.vessels.values());
    return vessels.filter(vessel => !orgId || vessel.orgId === orgId);
  }

  async getVessel(id: string, orgId?: string): Promise<SelectVessel | undefined> {
    const vessel = this.vessels.get(id);
    if (!vessel) return undefined;
    if (orgId && vessel.orgId !== orgId) return undefined;
    return vessel;
  }

  async createVessel(vesselData: InsertVessel): Promise<SelectVessel> {
    const newVessel: SelectVessel = {
      id: randomUUID(),
      ...vesselData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.vessels.set(newVessel.id, newVessel);
    
    // Broadcast vessel creation to all connected clients
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.broadcastVesselChange('create', newVessel);
    }
    
    return newVessel;
  }

  async updateVessel(id: string, vesselData: Partial<InsertVessel>): Promise<SelectVessel> {
    const existing = this.vessels.get(id);
    if (!existing) {
      throw new Error(`Vessel ${id} not found`);
    }
    const updated: SelectVessel = {
      ...existing,
      ...vesselData,
      updatedAt: new Date(),
    };
    this.vessels.set(id, updated);
    
    // Broadcast vessel update to all connected clients
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.broadcastVesselChange('update', updated);
    }
    
    return updated;
  }

  async deleteVessel(id: string, deleteEquipment: boolean = true, orgId?: string): Promise<void> {
    const vessel = this.vessels.get(id);
    if (!vessel) {
      throw new Error(`Vessel ${id} not found`);
    }
    
    // Validate org ownership if orgId is provided
    if (orgId && vessel.orgId !== orgId) {
      throw new Error(`Vessel ${id} not found or does not belong to your organization`);
    }
    
    // Unassign crew from this vessel (do not delete crew)
    for (const [crewId, crewMember] of this.crew) {
      if (crewMember.vesselId === id) {
        this.crew.set(crewId, { ...crewMember, vesselId: null });
      }
    }
    
    // Always delete all equipment assigned to this vessel
    const equipmentToDelete = Array.from(this.equipment.entries())
      .filter(([_, eq]) => eq.vesselId === id)
      .map(([eqId, _]) => eqId);
    
    for (const eqId of equipmentToDelete) {
      await this.deleteEquipment(eqId);
    }
    
    // Now delete the vessel
    this.vessels.delete(id);
    
    // Broadcast vessel deletion to all connected clients
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.broadcastVesselChange('delete', { id });
    }
  }

  async resetVesselDowntime(id: string): Promise<SelectVessel> {
    const existing = this.vessels.get(id);
    if (!existing) {
      throw new Error(`Vessel ${id} not found`);
    }
    const updated: SelectVessel = {
      ...existing,
      downtimeDays: "0",
      downtimeResetAt: new Date(),
      updatedAt: new Date(),
    };
    this.vessels.set(id, updated);
    return updated;
  }

  async resetVesselOperation(id: string): Promise<SelectVessel> {
    const existing = this.vessels.get(id);
    if (!existing) {
      throw new Error(`Vessel ${id} not found`);
    }
    const updated: SelectVessel = {
      ...existing,
      operationDays: "0",
      operationResetAt: new Date(),
      updatedAt: new Date(),
    };
    this.vessels.set(id, updated);
    return updated;
  }

  async getVesselContext(vesselId: string, orgId?: string): Promise<{
    vessel: any;
    ageYears: number;
    operatingConditions: string[];
    environmentalFactors: string[];
    maintenanceHistory: any[];
    fleetPosition?: { lat: number; lng: number };
  }> {
    const vessel = this.vessels.get(vesselId);
    if (!vessel || (orgId && vessel.orgId !== orgId)) {
      throw new Error(`Vessel ${vesselId} not found`);
    }

    const commissionDate = vessel.commissionDate ? new Date(vessel.commissionDate) : new Date(vessel.createdAt);
    const ageYears = (Date.now() - commissionDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

    const equipment = await this.getEquipmentRegistry();
    const vesselEquipment = equipment.filter(e => e.vesselId === vesselId);
    
    const workOrders = await this.getWorkOrders();
    const vesselOrders = workOrders.filter(wo => wo.vesselId === vesselId).slice(0, 50);

    const operatingConditions: string[] = [];
    if (vesselEquipment.length > 0) {
      operatingConditions.push(`${vesselEquipment.length} equipment units monitored`);
    }
    if (vessel.status === 'active') {
      operatingConditions.push('Vessel in active operation');
    }
    if (vessel.operationDays && parseFloat(vessel.operationDays) > 0) {
      operatingConditions.push(`${vessel.operationDays} days operational`);
    }

    const telemetry = await this.getLatestTelemetryReadings(vesselId);
    const environmentalFactors: string[] = [];
    
    const tempReadings = telemetry.filter(t => t.sensorType.toLowerCase().includes('temp'));
    if (tempReadings.length > 0) {
      const avgTemp = tempReadings.reduce((sum, r) => sum + r.value, 0) / tempReadings.length;
      environmentalFactors.push(`Average temperature: ${avgTemp.toFixed(1)}°C`);
    }
    
    const pressureReadings = telemetry.filter(t => t.sensorType.toLowerCase().includes('pressure'));
    if (pressureReadings.length > 0) {
      const avgPressure = pressureReadings.reduce((sum, r) => sum + r.value, 0) / pressureReadings.length;
      environmentalFactors.push(`Average pressure: ${avgPressure.toFixed(1)} bar`);
    }

    const maintenanceHistory = vesselOrders.map(wo => ({
      id: wo.id,
      title: wo.title,
      type: wo.type,
      priority: wo.priority,
      status: wo.status,
      createdAt: wo.createdAt,
      completedAt: wo.completedAt,
      estimatedCost: wo.estimatedCost
    }));

    return {
      vessel,
      ageYears: Math.round(ageYears * 10) / 10,
      operatingConditions,
      environmentalFactors,
      maintenanceHistory,
      fleetPosition: vessel.lastKnownLat && vessel.lastKnownLon ? {
        lat: parseFloat(vessel.lastKnownLat),
        lng: parseFloat(vessel.lastKnownLon)
      } : undefined
    };
  }

  // ===== HUB & SYNC METHOD IMPLEMENTATIONS =====
  
  // Device registry methods
  async getDeviceRegistryEntries(): Promise<SelectDeviceRegistry[]> {
    return Array.from(this.deviceRegistryEntries.values());
  }

  async getDeviceRegistryEntry(id: string): Promise<SelectDeviceRegistry | undefined> {
    return this.deviceRegistryEntries.get(id);
  }

  async createDeviceRegistryEntry(device: InsertDeviceRegistry): Promise<SelectDeviceRegistry> {
    const newDevice: SelectDeviceRegistry = {
      ...device,
      createdAt: new Date(),
    };
    this.deviceRegistryEntries.set(device.id, newDevice);
    return newDevice;
  }

  async updateDeviceRegistryEntry(id: string, device: Partial<InsertDeviceRegistry>): Promise<SelectDeviceRegistry> {
    const existing = this.deviceRegistryEntries.get(id);
    if (!existing) {
      throw new Error(`Device registry entry ${id} not found`);
    }
    const updated: SelectDeviceRegistry = {
      ...existing,
      ...device,
    };
    this.deviceRegistryEntries.set(id, updated);
    return updated;
  }

  async deleteDeviceRegistryEntry(id: string): Promise<void> {
    if (!this.deviceRegistryEntries.has(id)) {
      throw new Error(`Device registry entry ${id} not found`);
    }
    this.deviceRegistryEntries.delete(id);
  }

  // Replay helper methods
  async logReplayRequest(request: InsertReplayIncoming): Promise<SelectReplayIncoming> {
    const newRequest: SelectReplayIncoming = {
      id: randomUUID(),
      ...request,
      receivedAt: new Date(),
    };
    this.replayRequests.set(newRequest.id, newRequest);
    return newRequest;
  }

  async getReplayHistory(deviceId?: string, endpoint?: string): Promise<SelectReplayIncoming[]> {
    const requests = Array.from(this.replayRequests.values());
    return requests.filter(request => {
      if (deviceId && request.deviceId !== deviceId) return false;
      if (endpoint && request.endpoint !== endpoint) return false;
      return true;
    }).sort((a, b) => (b.receivedAt?.getTime() || 0) - (a.receivedAt?.getTime() || 0));
  }

  // Sheet locking methods
  async acquireSheetLock(sheetKey: string, holder: string, token: string, expiresAt: Date): Promise<SelectSheetLock> {
    const existingLock = this.sheetLocks.get(sheetKey);
    if (existingLock && existingLock.expiresAt && existingLock.expiresAt > new Date()) {
      throw new Error(`Sheet ${sheetKey} is already locked by ${existingLock.holder}`);
    }

    const newLock: SelectSheetLock = {
      sheetKey,
      token,
      holder,
      expiresAt,
      createdAt: new Date(),
    };
    this.sheetLocks.set(sheetKey, newLock);
    return newLock;
  }

  async releaseSheetLock(sheetKey: string, token: string): Promise<void> {
    const lock = this.sheetLocks.get(sheetKey);
    if (!lock) {
      throw new Error(`No lock found for sheet ${sheetKey}`);
    }
    if (lock.token !== token) {
      throw new Error(`Invalid token for sheet lock ${sheetKey}`);
    }
    this.sheetLocks.delete(sheetKey);
  }

  async getSheetLock(sheetKey: string): Promise<SelectSheetLock | undefined> {
    return this.sheetLocks.get(sheetKey);
  }

  async isSheetLocked(sheetKey: string): Promise<boolean> {
    const lock = this.sheetLocks.get(sheetKey);
    if (!lock) return false;
    if (lock.expiresAt && lock.expiresAt <= new Date()) {
      // Clean up expired lock
      this.sheetLocks.delete(sheetKey);
      return false;
    }
    return true;
  }

  // Sheet versioning methods
  async getSheetVersion(sheetKey: string): Promise<SelectSheetVersion | undefined> {
    return this.sheetVersions.get(sheetKey);
  }

  async incrementSheetVersion(sheetKey: string, modifiedBy: string): Promise<SelectSheetVersion> {
    const existing = this.sheetVersions.get(sheetKey);
    const newVersion: SelectSheetVersion = {
      sheetKey,
      version: (existing?.version || 0) + 1,
      lastModified: new Date(),
      lastModifiedBy: modifiedBy,
    };
    this.sheetVersions.set(sheetKey, newVersion);
    return newVersion;
  }

  async setSheetVersion(version: InsertSheetVersion): Promise<SelectSheetVersion> {
    const newVersion: SelectSheetVersion = {
      ...version,
      lastModified: new Date(),
    };
    this.sheetVersions.set(version.sheetKey, newVersion);
    return newVersion;
  }

  // ===== SYSTEM ADMINISTRATION - MEMORY IMPLEMENTATIONS =====
  
  // Admin Audit Events
  async getAdminAuditEvents(orgId?: string, action?: string, limit?: number): Promise<AdminAuditEvent[]> {
    // TODO: Implement in-memory admin audit events
    return [];
  }

  async createAdminAuditEvent(event: InsertAdminAuditEvent): Promise<AdminAuditEvent> {
    // TODO: Implement in-memory admin audit event creation
    const auditEvent: AdminAuditEvent = {
      id: `audit-${Date.now()}`,
      ...event,
      createdAt: new Date(),
    };
    return auditEvent;
  }

  async getAuditEventsByUser(userId: string, orgId?: string): Promise<AdminAuditEvent[]> {
    return [];
  }

  async getAuditEventsByResource(resourceType: string, resourceId: string, orgId?: string): Promise<AdminAuditEvent[]> {
    return [];
  }

  // Admin System Settings
  async getAdminSystemSettings(orgId?: string, category?: string): Promise<AdminSystemSetting[]> {
    return [];
  }

  async getAdminSystemSetting(orgId: string, category: string, key: string): Promise<AdminSystemSetting | undefined> {
    return undefined;
  }

  async createAdminSystemSetting(setting: InsertAdminSystemSetting): Promise<AdminSystemSetting> {
    const adminSetting: AdminSystemSetting = {
      id: `setting-${Date.now()}`,
      ...setting,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return adminSetting;
  }

  async updateAdminSystemSetting(id: string, setting: Partial<InsertAdminSystemSetting>): Promise<AdminSystemSetting> {
    throw new Error("Admin system setting not found");
  }

  async deleteAdminSystemSetting(id: string): Promise<void> {
    // TODO: Implement in-memory deletion
  }

  async getSettingsByCategory(orgId: string, category: string): Promise<AdminSystemSetting[]> {
    return [];
  }

  // Integration Configs
  async getIntegrationConfigs(orgId?: string, type?: string): Promise<IntegrationConfig[]> {
    return [];
  }

  async getIntegrationConfig(id: string, orgId?: string): Promise<IntegrationConfig | undefined> {
    return undefined;
  }

  async createIntegrationConfig(config: InsertIntegrationConfig): Promise<IntegrationConfig> {
    const integrationConfig: IntegrationConfig = {
      id: `integration-${Date.now()}`,
      ...config,
      errorCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return integrationConfig;
  }

  async updateIntegrationConfig(id: string, config: Partial<InsertIntegrationConfig>): Promise<IntegrationConfig> {
    throw new Error("Integration config not found");
  }

  async deleteIntegrationConfig(id: string): Promise<void> {
    // TODO: Implement in-memory deletion
  }

  async updateIntegrationHealth(id: string, healthStatus: string, errorMessage?: string): Promise<IntegrationConfig> {
    throw new Error("Integration config not found");
  }

  // Maintenance Windows
  async getMaintenanceWindows(orgId?: string, status?: string): Promise<MaintenanceWindow[]> {
    return [];
  }

  async getMaintenanceWindow(id: string, orgId?: string): Promise<MaintenanceWindow | undefined> {
    return undefined;
  }

  async createMaintenanceWindow(window: InsertMaintenanceWindow): Promise<MaintenanceWindow> {
    const maintenanceWindow: MaintenanceWindow = {
      id: `window-${Date.now()}`,
      ...window,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return maintenanceWindow;
  }

  async updateMaintenanceWindow(id: string, window: Partial<InsertMaintenanceWindow>): Promise<MaintenanceWindow> {
    throw new Error("Maintenance window not found");
  }

  async deleteMaintenanceWindow(id: string): Promise<void> {
    // TODO: Implement in-memory deletion
  }

  async getActiveMaintenanceWindows(orgId?: string): Promise<MaintenanceWindow[]> {
    return [];
  }

  // System Performance Metrics
  async getSystemPerformanceMetrics(orgId?: string, category?: string, hours?: number): Promise<SystemPerformanceMetric[]> {
    return [];
  }

  async createSystemPerformanceMetric(metric: InsertSystemPerformanceMetric): Promise<SystemPerformanceMetric> {
    const perfMetric: SystemPerformanceMetric = {
      id: `metric-${Date.now()}`,
      ...metric,
      recordedAt: new Date(),
    };
    return perfMetric;
  }

  async getLatestMetricsByCategory(orgId: string, category: string): Promise<SystemPerformanceMetric[]> {
    return [];
  }

  async getMetricTrends(orgId: string, metricName: string, hours: number): Promise<SystemPerformanceMetric[]> {
    return [];
  }

  // System Health Checks
  async getSystemHealthChecks(orgId?: string, category?: string): Promise<SystemHealthCheck[]> {
    return [];
  }

  async getSystemHealthCheck(id: string, orgId?: string): Promise<SystemHealthCheck | undefined> {
    return undefined;
  }

  async createSystemHealthCheck(check: InsertSystemHealthCheck): Promise<SystemHealthCheck> {
    const healthCheck: SystemHealthCheck = {
      id: `check-${Date.now()}`,
      ...check,
      consecutiveFailures: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return healthCheck;
  }

  async updateSystemHealthCheck(id: string, check: Partial<InsertSystemHealthCheck>): Promise<SystemHealthCheck> {
    throw new Error("System health check not found");
  }

  async deleteSystemHealthCheck(id: string): Promise<void> {
    // TODO: Implement in-memory deletion
  }

  async updateHealthCheckStatus(id: string, status: string, message?: string, responseTime?: number): Promise<SystemHealthCheck> {
    throw new Error("System health check not found");
  }

  async getFailingHealthChecks(orgId?: string): Promise<SystemHealthCheck[]> {
    return [];
  }

  // System Health Overview
  async getSystemHealth(orgId?: string): Promise<{
    overall: 'healthy' | 'warning' | 'critical';
    checks: { healthy: number; warning: number; critical: number; };
    integrations: { healthy: number; unhealthy: number; unknown: number; };
    activeMaintenanceWindows: number;
    recentAuditEvents: number;
    performanceIssues: number;
  }> {
    return {
      overall: 'healthy',
      checks: { healthy: 0, warning: 0, critical: 0 },
      integrations: { healthy: 0, unhealthy: 0, unknown: 0 },
      activeMaintenanceWindows: 0,
      recentAuditEvents: 0,
      performanceIssues: 0,
    };
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
    try {
      if (equipmentId) {
        return await db.select().from(workOrders)
          .where(eq(workOrders.equipmentId, equipmentId))
          .orderBy(desc(workOrders.createdAt));
      }
      return await db.select().from(workOrders).orderBy(desc(workOrders.createdAt));
    } catch (error) {
      console.error('[DatabaseStorage.getWorkOrders] Error:', error);
      throw error;
    }
  }

  async generateWorkOrderNumber(orgId: string): Promise<string> {
    const currentYear = new Date().getFullYear();
    
    // Get the count of work orders for this org in the current year
    const existingOrders = await db.select()
      .from(workOrders)
      .where(eq(workOrders.orgId, orgId));
    
    // Filter by year in the woNumber field (if it exists) or fallback to counting all
    const yearOrders = existingOrders.filter(order => {
      if (order.woNumber && order.woNumber.startsWith(`WO-${currentYear}-`)) {
        return true;
      }
      // For legacy orders without woNumber, check creation year
      const orderYear = new Date(order.createdAt).getFullYear();
      return orderYear === currentYear;
    });
    
    const nextNumber = yearOrders.length + 1;
    return `WO-${currentYear}-${String(nextNumber).padStart(4, '0')}`;
  }

  async createWorkOrder(order: InsertWorkOrder & { woNumber?: string }): Promise<WorkOrder> {
    const result = await db.insert(workOrders)
      .values({
        orgId: order.orgId,
        equipmentId: order.equipmentId,
        status: order.status || "open",
        priority: order.priority || 3,
        reason: order.reason || null,
        description: order.description || null,
        estimatedDowntimeHours: order.estimatedDowntimeHours || null,
        actualDowntimeHours: order.actualDowntimeHours || null,
        affectsVesselDowntime: order.affectsVesselDowntime || false,
        woNumber: order.woNumber || null
      })
      .returning();
    
    const newOrder = result[0];
    
    // Broadcast work order creation to all connected clients
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.broadcastWorkOrderChange('create', newOrder);
    }
    
    return newOrder;
  }

  async updateWorkOrder(id: string, updates: Partial<InsertWorkOrder>): Promise<WorkOrder> {
    const existing = await db.select().from(workOrders).where(eq(workOrders.id, id)).limit(1);
    
    if (existing.length === 0) {
      throw new Error(`Work order ${id} not found`);
    }
    
    const existingOrder = existing[0];
    
    const postUpdateOrder = { ...existingOrder, ...updates };
    const finalUpdates = { ...updates };
    
    const shouldTrackDowntime = postUpdateOrder.affectsVesselDowntime && postUpdateOrder.equipmentId;
    
    if (shouldTrackDowntime) {
      const equipmentResult = await db.select().from(equipment).where(eq(equipment.id, postUpdateOrder.equipmentId)).limit(1);
      
      if (equipmentResult.length > 0 && equipmentResult[0].vesselId) {
        const vesselId = equipmentResult[0].vesselId;
        const oldStatus = existingOrder.status;
        const newStatus = postUpdateOrder.status;
        
        if (newStatus === 'in_progress' && oldStatus !== 'in_progress' && !postUpdateOrder.vesselDowntimeStartedAt) {
          finalUpdates.vesselDowntimeStartedAt = new Date();
          console.log(`[Downtime Tracking] Started for work order ${id}, vessel ${vesselId}`);
        }
        
        else if (newStatus === 'completed' && oldStatus === 'in_progress' && existingOrder.vesselDowntimeStartedAt) {
          const startTime = new Date(existingOrder.vesselDowntimeStartedAt);
          const endTime = new Date();
          const downtimeHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
          const downtimeDays = downtimeHours / 24;
          
          await db.transaction(async (tx) => {
            const vessel = await tx.select().from(vessels).where(eq(vessels.id, vesselId)).limit(1);
            if (vessel.length > 0) {
              const currentDowntime = parseFloat(vessel[0].downtimeDays || '0');
              const newDowntime = currentDowntime + downtimeDays;
              
              await tx.update(vessels)
                .set({
                  downtimeDays: newDowntime.toFixed(2),
                  updatedAt: new Date(),
                })
                .where(eq(vessels.id, vesselId));
              
              console.log(`[Downtime Tracking] Added ${downtimeDays.toFixed(2)} days to vessel ${vesselId} (total: ${newDowntime.toFixed(2)} days)`);
            }
          });
          
          finalUpdates.vesselDowntimeStartedAt = null;
        }
      }
    }
    
    const result = await db.update(workOrders)
      .set(finalUpdates)
      .where(eq(workOrders.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Work order ${id} not found`);
    }
    
    const updatedOrder = result[0];
    
    // Broadcast work order update to all connected clients
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.broadcastWorkOrderChange('update', updatedOrder);
    }
    
    return updatedOrder;
  }

  async deleteWorkOrder(id: string): Promise<void> {
    // Cascade delete all related records before deleting the work order
    // This prevents foreign key constraint violations
    
    // Delete associated parts
    await db
      .delete(workOrderParts)
      .where(eq(workOrderParts.workOrderId, id));
    
    // Delete associated checklists
    await db
      .delete(workOrderChecklists)
      .where(eq(workOrderChecklists.workOrderId, id));
    
    // Delete associated worklogs
    await db
      .delete(workOrderWorklogs)
      .where(eq(workOrderWorklogs.workOrderId, id));
    
    // Delete associated maintenance costs
    await db
      .delete(maintenanceCosts)
      .where(eq(maintenanceCosts.workOrderId, id));
    
    // Finally, delete the work order itself
    const result = await db
      .delete(workOrders)
      .where(eq(workOrders.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Work order ${id} not found`);
    }
    
    const deletedOrder = result[0];
    
    // Broadcast work order deletion to all connected clients
    const wsServer = getWebSocketServer();
    if (wsServer && deletedOrder) {
      wsServer.broadcastWorkOrderChange('delete', { id: deletedOrder.id });
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

  async getDashboardMetrics(orgId?: string): Promise<DashboardMetrics> {
    try {
      console.log('[DatabaseStorage.getDashboardMetrics] Starting...', { orgId });
      
      const [allDevices, allHeartbeats, allWorkOrders, allPdmScores, equipmentList] = await Promise.all([
        this.getDevices(),
        this.getHeartbeats(),
        this.getWorkOrders(),
        this.getPdmScores(),
        this.getEquipmentRegistry(orgId)
      ]);
      
      console.log('[DatabaseStorage.getDashboardMetrics] Got data:', { 
        devices: allDevices.length, 
        heartbeats: allHeartbeats.length, 
        workOrders: allWorkOrders.length, 
        pdmScores: allPdmScores.length,
        equipment: equipmentList.length
      });

      // Get recent telemetry data directly from database (last 10 minutes)
      const since = new Date(Date.now() - 10 * 60 * 1000);
      const telemetryData = await db.select().from(equipmentTelemetry)
        .where(gte(equipmentTelemetry.ts, since))
        .orderBy(desc(equipmentTelemetry.ts));

      // Count active devices from both heartbeats and recent telemetry
      const activeFromHeartbeats = allHeartbeats.filter(hb => {
        const timeSince = Date.now() - (hb.ts?.getTime() || 0);
        return timeSince < 10 * 60 * 1000; // Active if heartbeat within 10 minutes
      }).length;

      // Count equipment with recent telemetry (within last 10 minutes)
      const now = Date.now();
      const recentTelemetry = telemetryData.filter(t => {
        const timeSince = now - (t.ts?.getTime() || 0);
        return timeSince < 10 * 60 * 1000;
      });
      
      const activeEquipmentIds = new Set(recentTelemetry.map(t => t.equipmentId));
      const activeFromTelemetry = activeEquipmentIds.size;

      // Count active equipment from Equipment Registry
      const activeEquipmentFromRegistry = equipmentList.filter(eq => eq.isActive).length;

      // Use the maximum count across all sources
      const activeDevices = Math.max(
        activeFromHeartbeats, 
        activeFromTelemetry, 
        activeEquipmentFromRegistry
      );

      // Calculate fleet health from both PdM scores and telemetry status
      const healthScores = allPdmScores.map(score => score.healthIdx || 0);
      let fleetHealth = 0;

      if (healthScores.length > 0) {
        fleetHealth = Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length);
      } else if (recentTelemetry.length > 0) {
        // Calculate health based on telemetry status if no PdM scores
        const statusWeights = { normal: 100, warning: 60, critical: 20 };
        const totalWeight = recentTelemetry.reduce((sum, t) => {
          return sum + (statusWeights[t.status as keyof typeof statusWeights] || 50);
        }, 0);
        fleetHealth = Math.round(totalWeight / recentTelemetry.length);
      } else if (activeEquipmentFromRegistry > 0) {
        // If we have active equipment but no telemetry/scores, assume moderate health
        fleetHealth = 75; // Default to 75% health for active equipment without data
      }

      const openWorkOrders = allWorkOrders.filter(wo => wo.status !== "completed").length;

      // Count risk alerts from both PdM scores and telemetry
      const pdmRiskAlerts = allPdmScores.filter(score => (score.healthIdx || 100) < 60).length;
      const telemetryRiskAlerts = recentTelemetry.filter(t => 
        t.status === 'critical' || t.status === 'warning'
      ).length;
      const riskAlerts = Math.max(pdmRiskAlerts, telemetryRiskAlerts);

      // Calculate equipment stats for history recording
      const equipmentHealth = await this.getEquipmentHealth(orgId);
      const equipmentStats = {
        total: equipmentHealth.length,
        healthy: equipmentHealth.filter(e => e.status === 'healthy').length,
        warning: equipmentHealth.filter(e => e.status === 'warning').length,
        critical: equipmentHealth.filter(e => e.status === 'critical').length
      };

      // Calculate standardized fleet health (including all equipment, not just those with telemetry)
      const standardizedFleetHealth = equipmentStats.total > 0
        ? Math.round(equipmentHealth.reduce((sum, eq) => sum + eq.healthIndex, 0) / equipmentStats.total)
        : 0;

      // Calculate trends from historical data (last 7 days)
      const history = await this.getMetricsHistory(orgId || 'default-org-id', 7);
      
      // Default trend structure when no history exists
      const defaultTrend = { value: 0, direction: 'up' as const, percentChange: 0 };
      let trends = {
        activeDevices: defaultTrend,
        fleetHealth: defaultTrend,
        openWorkOrders: defaultTrend,
        riskAlerts: defaultTrend
      };
      
      if (history.length > 0) {
        const lastWeek = history[0]; // Most recent historical record
        
        const calculateTrend = (current: number, previous: number) => {
          if (previous === 0) return { value: current, direction: 'up' as const, percentChange: 0 };
          const change = current - previous;
          const percentChange = Math.abs(Math.round((change / previous) * 100));
          return {
            value: Math.abs(change),
            direction: change >= 0 ? 'up' as const : 'down' as const,
            percentChange
          };
        };

        trends = {
          activeDevices: calculateTrend(activeDevices, lastWeek.activeDevices),
          fleetHealth: calculateTrend(standardizedFleetHealth, lastWeek.fleetHealth),
          openWorkOrders: calculateTrend(openWorkOrders, lastWeek.openWorkOrders),
          riskAlerts: calculateTrend(riskAlerts, lastWeek.riskAlerts)
        };
      }

      const result = {
        activeDevices,
        fleetHealth: standardizedFleetHealth,
        openWorkOrders,
        riskAlerts,
        trends
      };

      // Record metrics history (fire and forget to avoid blocking response)
      this.recordMetricsHistory(orgId || 'default-org-id', {
        activeDevices,
        fleetHealth: standardizedFleetHealth,
        openWorkOrders,
        riskAlerts
      }, equipmentStats).catch(err => {
        console.error('[DatabaseStorage] Failed to record metrics history:', err);
      });
      
      console.log('[DatabaseStorage.getDashboardMetrics] Returning:', result);
      return result;
    } catch (error) {
      console.error('[DatabaseStorage.getDashboardMetrics] Error:', error);
      console.error('[DatabaseStorage.getDashboardMetrics] Stack:', error.stack);
      throw error;
    }
  }

  async recordMetricsHistory(
    orgId: string,
    metrics: Omit<DashboardMetrics, 'trends'>,
    equipmentStats: { total: number; healthy: number; warning: number; critical: number }
  ): Promise<void> {
    try {
      // Only record once per day to avoid excessive data
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const existing = await db.select().from(metricsHistory)
        .where(and(
          eq(metricsHistory.orgId, orgId),
          gte(metricsHistory.recordedAt, today)
        ))
        .limit(1);
      
      if (existing.length === 0) {
        await db.insert(metricsHistory).values({
          orgId,
          activeDevices: metrics.activeDevices,
          fleetHealth: metrics.fleetHealth,
          openWorkOrders: metrics.openWorkOrders,
          riskAlerts: metrics.riskAlerts,
          totalEquipment: equipmentStats.total,
          healthyEquipment: equipmentStats.healthy,
          warningEquipment: equipmentStats.warning,
          criticalEquipment: equipmentStats.critical,
          recordedAt: new Date()
        });
      }
    } catch (error) {
      console.error('[DatabaseStorage.recordMetricsHistory] Error:', error);
      // Don't throw - this is a background operation
    }
  }

  async getMetricsHistory(orgId: string, days: number = 30): Promise<any[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    const history = await db.select().from(metricsHistory)
      .where(and(
        eq(metricsHistory.orgId, orgId),
        gte(metricsHistory.recordedAt, since)
      ))
      .orderBy(desc(metricsHistory.recordedAt));
    
    return history;
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

  async getEquipmentHealth(orgId?: string, vesselId?: string): Promise<EquipmentHealth[]> {
    console.log('[getEquipmentHealth] Called with:', { orgId, vesselId });
    
    // Validate vesselId to prevent object stringification issues
    if (vesselId && (vesselId === '[object Object]' || vesselId.startsWith('[object'))) {
      console.warn('[getEquipmentHealth] Invalid vesselId detected, ignoring filter:', vesselId);
      vesselId = undefined;
    }
    
    // Build equipment query with proper joins and filtering
    let equipmentQuery = db.select({
      id: equipment.id,
      name: equipment.name,
      type: equipment.type,
      vesselId: equipment.vesselId,
      vesselName: equipment.vesselName,
      actualVesselName: vessels.name,
      orgId: equipment.orgId
    }).from(equipment)
    .leftJoin(vessels, eq(equipment.vesselId, vessels.id));

    // Add filters
    const conditions = [];
    if (orgId) {
      conditions.push(eq(equipment.orgId, orgId));
    }
    if (vesselId && vesselId !== 'all' && typeof vesselId === 'string') {
      conditions.push(eq(equipment.vesselId, vesselId));
    }
    if (conditions.length > 0) {
      equipmentQuery = equipmentQuery.where(and(...conditions));
    }
    
    console.log('[getEquipmentHealth] Filters:', { orgId, vesselId, conditionCount: conditions.length });

    // Get sensor configurations to filter out equipment without sensors
    const sensorConfigConditions = [];
    if (orgId) {
      sensorConfigConditions.push(eq(sensorConfigurations.orgId, orgId));
    }
    
    const sensorConfigsQuery = sensorConfigConditions.length > 0 
      ? db.select().from(sensorConfigurations).where(and(...sensorConfigConditions))
      : db.select().from(sensorConfigurations);

    // Get telemetry data for the same period and filters
    const telemetryConditions = [
      gte(equipmentTelemetry.ts, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    ];
    if (orgId) {
      telemetryConditions.push(eq(equipmentTelemetry.orgId, orgId));
    }
    
    const telemetryQuery = db.select().from(equipmentTelemetry)
      .where(and(...telemetryConditions))
      .orderBy(desc(equipmentTelemetry.ts));

    const [allEquipment, recentTelemetry] = await Promise.all([
      equipmentQuery,
      telemetryQuery
    ]);
    
    console.log('[getEquipmentHealth] Query results:', { 
      equipmentCount: allEquipment.length, 
      telemetryCount: recentTelemetry.length
    });

    // Short-circuit if no equipment found
    if (allEquipment.length === 0) {
      console.log('[getEquipmentHealth] No equipment found, returning empty array');
      return [];
    }

    // Get sensor configurations for the equipment
    const allSensorConfigs = await sensorConfigsQuery;
    
    console.log('[getEquipmentHealth] Sensor configs:', { 
      sensorConfigCount: allSensorConfigs.length
    });

    // Group sensor configurations by equipment to identify equipment with sensors
    const sensorConfigsByEquipment = new Map<string, SensorConfiguration[]>();
    allSensorConfigs.forEach(config => {
      if (!sensorConfigsByEquipment.has(config.equipmentId)) {
        sensorConfigsByEquipment.set(config.equipmentId, []);
      }
      sensorConfigsByEquipment.get(config.equipmentId)!.push(config);
    });

    // Filter equipment to only include those with sensor configurations
    const equipmentWithSensors = allEquipment.filter(equipmentRow => 
      sensorConfigsByEquipment.has(equipmentRow.id)
    );
    
    console.log('[getEquipmentHealth] Equipment with sensors:', {
      total: allEquipment.length,
      withSensors: equipmentWithSensors.length,
      filtered: allEquipment.length - equipmentWithSensors.length
    });

    // Group telemetry by equipment
    const telemetryByEquipment = new Map<string, EquipmentTelemetry[]>();
    recentTelemetry.forEach(reading => {
      if (!telemetryByEquipment.has(reading.equipmentId)) {
        telemetryByEquipment.set(reading.equipmentId, []);
      }
      telemetryByEquipment.get(reading.equipmentId)!.push(reading);
    });

    // Initialize RUL engine for ML-based predictions
    const rulEngine = new RulEngine(db);

    // Process equipment health with ML-based RUL predictions where available
    const healthResults = await Promise.all(
      equipmentWithSensors.map(async (equipmentRow) => {
        const equipmentTelemetry = telemetryByEquipment.get(equipmentRow.id) || [];
        
        let healthIndex = 100;
        let status: "healthy" | "warning" | "critical" = "healthy";
        let predictedDueDays = 30;

        // Try ML-based RUL prediction first
        try {
          const rulPrediction = await rulEngine.calculateRul(equipmentRow.id, equipmentRow.orgId);
          
          if (rulPrediction && rulPrediction.confidenceScore > 0.3) {
            // Use ML-based prediction
            healthIndex = rulPrediction.healthIndex;
            predictedDueDays = rulPrediction.remainingDays;
            
            // Map risk level to status
            if (rulPrediction.riskLevel === 'critical') {
              status = 'critical';
            } else if (rulPrediction.riskLevel === 'high' || rulPrediction.riskLevel === 'medium') {
              status = 'warning';
            } else {
              status = 'healthy';
            }
            
            console.log(`[ML-RUL] Equipment ${equipmentRow.id}: health=${healthIndex}%, days=${predictedDueDays}, confidence=${rulPrediction.confidenceScore.toFixed(2)}, method=${rulPrediction.predictionMethod}`);
          } else {
            // Fall back to rule-based calculation
            throw new Error('ML prediction not available or low confidence');
          }
        } catch (error) {
          // Fall back to rule-based health calculation
          if (equipmentTelemetry.length > 0) {
            const statusCounts = { normal: 0, warning: 0, critical: 0 };
            equipmentTelemetry.forEach(reading => {
              const readingStatus = reading.status as keyof typeof statusCounts;
              if (statusCounts.hasOwnProperty(readingStatus)) {
                statusCounts[readingStatus]++;
              }
            });

            const totalReadings = equipmentTelemetry.length;
            const criticalPct = (statusCounts.critical / totalReadings) * 100;
            const warningPct = (statusCounts.warning / totalReadings) * 100;
            const normalPct = (statusCounts.normal / totalReadings) * 100;

            healthIndex = Math.round(
              (normalPct * 100 + warningPct * 60 + criticalPct * 20) / 100
            );

            if (criticalPct > 20 || healthIndex < 50) {
              status = "critical";
              predictedDueDays = Math.max(1, Math.round(7 - (criticalPct / 10)));
            } else if (warningPct > 30 || healthIndex < 75) {
              status = "warning";
              predictedDueDays = Math.max(7, Math.round(21 - (warningPct / 5)));
            } else {
              status = "healthy";
              predictedDueDays = Math.max(14, Math.round(30 - (warningPct / 10)));
            }

            const latestReading = equipmentTelemetry[0];
            if (latestReading && latestReading.ts) {
              const hoursSinceLastReading = (Date.now() - latestReading.ts.getTime()) / (1000 * 60 * 60);
              if (hoursSinceLastReading > 12) {
                healthIndex = Math.max(0, healthIndex - Math.round(hoursSinceLastReading * 2));
                if (hoursSinceLastReading > 24) {
                  status = "warning";
                  predictedDueDays = Math.min(predictedDueDays, 14);
                }
              }
            }
          } else {
            healthIndex = 0;
            status = "critical";
            predictedDueDays = 1;
          }
        }

        return {
          id: equipmentRow.id,
          vessel: equipmentRow.actualVesselName || equipmentRow.vesselName || "Unassigned",
          vesselId: equipmentRow.vesselId,
          name: equipmentRow.name,
          type: equipmentRow.type,
          healthIndex: Math.max(0, Math.min(100, healthIndex)),
          predictedDueDays,
          status
        };
      })
    );

    return healthResults;
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
      // Split key properly - format is "equipmentId-sensorType"
      // Equipment IDs are UUIDs with dashes, so split on the LAST dash
      const lastDashIndex = key.lastIndexOf('-');
      const eqId = key.substring(0, lastDashIndex);
      const sensorType = key.substring(lastDashIndex + 1);
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
    // Validate equipment exists before accepting telemetry
    const equipment = await this.getEquipment(reading.orgId!, reading.equipmentId);
    if (!equipment) {
      throw new Error(`Equipment ${reading.equipmentId} not found in registry. Telemetry rejected.`);
    }

    // Validate sensor configuration exists and is enabled
    const sensorConfig = await this.getSensorConfiguration(reading.equipmentId, reading.sensorType, reading.orgId);
    if (!sensorConfig) {
      console.warn(`No sensor configuration found for ${reading.equipmentId}/${reading.sensorType}. Creating with defaults.`);
      // Auto-create basic sensor configuration if missing
      const { equipmentAnalyticsService } = await import('./equipment-analytics-service.js');
      await equipmentAnalyticsService.setupMissingSensorConfigurations(reading.equipmentId, reading.orgId || equipment.orgId);
    } else if (!sensorConfig.enabled) {
      throw new Error(`Sensor ${reading.sensorType} is disabled for equipment ${reading.equipmentId}. Telemetry rejected.`);
    }

    const result = await db.insert(equipmentTelemetry)
      .values({
        ...reading,
        ts: new Date()
      })
      .returning();
    return result[0];
  }

  async getTelemetryHistory(
    arg1: string,
    arg2: string,
    arg3?: number | string,
    arg4?: Date,
    arg5?: Date
  ): Promise<EquipmentTelemetry[]> {
    // Handle two call signatures:
    // 1. (equipmentId, sensorType, hours?) - original signature
    // 2. (orgId, equipmentId, sensorType, startTime, endTime) - enhanced-trends signature
    
    let orgId: string | undefined;
    let equipmentId: string;
    let sensorType: string;
    let startTime: Date;
    let endTime: Date;
    
    if (arg4 instanceof Date && arg5 instanceof Date) {
      // New signature: (orgId, equipmentId, sensorType, startTime, endTime)
      orgId = arg1;
      equipmentId = arg2;
      sensorType = arg3 as string;
      startTime = arg4;
      endTime = arg5;
    } else {
      // Old signature: (equipmentId, sensorType, hours?)
      equipmentId = arg1;
      sensorType = arg2;
      const hours = typeof arg3 === 'number' ? arg3 : 24;
      endTime = new Date();
      startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    }
    
    const conditions = [
      eq(equipmentTelemetry.equipmentId, equipmentId),
      eq(equipmentTelemetry.sensorType, sensorType),
      gte(equipmentTelemetry.ts, startTime),
      lte(equipmentTelemetry.ts, endTime)
    ];
    
    if (orgId) {
      conditions.push(eq(equipmentTelemetry.orgId, orgId));
    }
    
    return await db.select().from(equipmentTelemetry)
      .where(and(...conditions))
      .orderBy(equipmentTelemetry.ts);
  }

  async getTelemetryByEquipmentAndDateRange(
    equipmentId: string, 
    startDate: Date, 
    endDate: Date, 
    orgId?: string
  ): Promise<EquipmentTelemetry[]> {
    const conditions = [
      eq(equipmentTelemetry.equipmentId, equipmentId),
      gte(equipmentTelemetry.ts, startDate),
      lte(equipmentTelemetry.ts, endDate)
    ];
    
    if (orgId) {
      conditions.push(eq(equipmentTelemetry.orgId, orgId));
    }
    
    return await db.select().from(equipmentTelemetry)
      .where(and(...conditions))
      .orderBy(equipmentTelemetry.ts);
  }

  // Sensor configuration methods
  async getSensorConfigurations(orgId?: string, equipmentId?: string, sensorType?: string): Promise<SensorConfiguration[]> {
    let query = db.select().from(sensorConfigurations);
    const conditions = [];
    
    if (orgId) {
      conditions.push(eq(sensorConfigurations.orgId, orgId));
    }
    if (equipmentId) {
      conditions.push(eq(sensorConfigurations.equipmentId, equipmentId));
    }
    if (sensorType) {
      conditions.push(eq(sensorConfigurations.sensorType, sensorType));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(sensorConfigurations.updatedAt));
  }

  async getSensorConfiguration(equipmentId: string, sensorType: string, orgId?: string): Promise<SensorConfiguration | undefined> {
    const conditions = [
      eq(sensorConfigurations.equipmentId, equipmentId),
      eq(sensorConfigurations.sensorType, sensorType)
    ];
    
    if (orgId) {
      conditions.push(eq(sensorConfigurations.orgId, orgId));
    }
    
    const result = await db.select().from(sensorConfigurations)
      .where(and(...conditions))
      .limit(1);
    
    return result[0];
  }

  async createSensorConfiguration(config: InsertSensorConfiguration): Promise<SensorConfiguration> {
    const result = await db.insert(sensorConfigurations).values({
      ...config,
      orgId: config.orgId || 'default-org-id', // Use default if not provided
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return result[0];
  }

  async updateSensorConfiguration(equipmentId: string, sensorType: string, config: Partial<InsertSensorConfiguration>, orgId?: string): Promise<SensorConfiguration> {
    const conditions = [
      eq(sensorConfigurations.equipmentId, equipmentId),
      eq(sensorConfigurations.sensorType, sensorType)
    ];
    
    if (orgId) {
      conditions.push(eq(sensorConfigurations.orgId, orgId));
    }
    
    const result = await db.update(sensorConfigurations)
      .set({
        ...config,
        updatedAt: new Date()
      })
      .where(and(...conditions))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Sensor configuration not found for ${equipmentId}:${sensorType}`);
    }
    
    return result[0];
  }

  async deleteSensorConfiguration(equipmentId: string, sensorType: string, orgId?: string): Promise<void> {
    const conditions = [
      eq(sensorConfigurations.equipmentId, equipmentId),
      eq(sensorConfigurations.sensorType, sensorType)
    ];
    
    if (orgId) {
      conditions.push(eq(sensorConfigurations.orgId, orgId));
    }
    
    await db.delete(sensorConfigurations)
      .where(and(...conditions));
  }

  async updateSensorConfigurationById(id: string, config: Partial<InsertSensorConfiguration>, orgId?: string): Promise<SensorConfiguration> {
    const conditions = [eq(sensorConfigurations.id, id)];
    
    if (orgId) {
      conditions.push(eq(sensorConfigurations.orgId, orgId));
    }

    const result = await db.update(sensorConfigurations)
      .set({
        ...config,
        updatedAt: new Date()
      })
      .where(and(...conditions))
      .returning();

    if (result.length === 0) {
      throw new Error("Sensor configuration not found");
    }

    return result[0];
  }

  async deleteSensorConfigurationById(id: string, orgId?: string): Promise<void> {
    const conditions = [eq(sensorConfigurations.id, id)];
    
    if (orgId) {
      conditions.push(eq(sensorConfigurations.orgId, orgId));
    }

    await db.delete(sensorConfigurations)
      .where(and(...conditions));
  }

  // Sensor state methods
  async getSensorState(equipmentId: string, sensorType: string, orgId?: string): Promise<SensorState | undefined> {
    const conditions = [
      eq(sensorStates.equipmentId, equipmentId),
      eq(sensorStates.sensorType, sensorType)
    ];
    
    if (orgId) {
      conditions.push(eq(sensorStates.orgId, orgId));
    }
    
    const result = await db.select().from(sensorStates)
      .where(and(...conditions))
      .limit(1);
    
    return result[0];
  }

  async upsertSensorState(state: InsertSensorState): Promise<SensorState> {
    const result = await db.insert(sensorStates).values({
      ...state,
      orgId: state.orgId || 'default-org-id', // Use default if not provided
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: [sensorStates.equipmentId, sensorStates.sensorType, sensorStates.orgId],
      set: {
        lastValue: state.lastValue,
        ema: state.ema,
        lastTs: state.lastTs,
        updatedAt: new Date()
      }
    })
    .returning();
    
    return result[0];
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
  // Uses composite index: idx_alert_notifications_equipment_sensor_type_time
  async hasRecentAlert(equipmentId: string, sensorType: string, alertType: string, minutesBack: number = 10): Promise<boolean> {
    const cutoffTime = new Date(Date.now() - minutesBack * 60 * 1000);
    
    // Use COUNT for better compatibility across different databases
    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(alertNotifications)
      .where(and(
        eq(alertNotifications.equipmentId, equipmentId),
        eq(alertNotifications.sensorType, sensorType),
        eq(alertNotifications.alertType, alertType),
        eq(alertNotifications.acknowledged, false),
        gte(alertNotifications.createdAt, cutoffTime)
      ));
    
    return (result[0]?.count || 0) > 0;
  }

  // Alert comments
  async addAlertComment(commentData: InsertAlertComment): Promise<AlertComment> {
    const result = await db.insert(alertComments).values({
      ...commentData,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async getAlertComments(alertId: string): Promise<AlertComment[]> {
    return await db.select().from(alertComments)
      .where(eq(alertComments.alertId, alertId))
      .orderBy(desc(alertComments.createdAt));
  }

  // Alert suppressions
  async createAlertSuppression(suppressionData: InsertAlertSuppression): Promise<AlertSuppression> {
    const result = await db.insert(alertSuppressions).values({
      ...suppressionData,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async getActiveSuppressions(): Promise<AlertSuppression[]> {
    const now = new Date();
    return await db.select().from(alertSuppressions)
      .where(and(
        eq(alertSuppressions.active, true),
        gte(alertSuppressions.suppressUntil, now)
      ))
      .orderBy(desc(alertSuppressions.createdAt));
  }

  async removeAlertSuppression(id: string): Promise<void> {
    await db.update(alertSuppressions)
      .set({ active: false })
      .where(eq(alertSuppressions.id, id));
  }

  async isAlertSuppressed(equipmentId: string, sensorType: string, alertType: string): Promise<boolean> {
    const now = new Date();
    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(alertSuppressions)
      .where(and(
        eq(alertSuppressions.equipmentId, equipmentId),
        eq(alertSuppressions.sensorType, sensorType),
        eq(alertSuppressions.active, true),
        gte(alertSuppressions.suppressUntil, now),
        // Check if alertType matches or if suppression is for all alert types (null)
        sql`(${alertSuppressions.alertType} = ${alertType} OR ${alertSuppressions.alertType} IS NULL)`
      ));
    
    return (result[0]?.count || 0) > 0;
  }

  // Compliance audit logging
  async logComplianceAction(data: InsertComplianceAuditLog): Promise<ComplianceAuditLog> {
    const result = await db.insert(complianceAuditLog).values({
      ...data,
      timestamp: new Date()
    }).returning();
    return result[0];
  }

  async getComplianceAuditLog(filters?: { 
    entityType?: string; 
    entityId?: string; 
    complianceStandard?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<ComplianceAuditLog[]> {
    let query = db.select().from(complianceAuditLog);
    
    const conditions = [];
    if (filters?.entityType) {
      conditions.push(eq(complianceAuditLog.entityType, filters.entityType));
    }
    if (filters?.entityId) {
      conditions.push(eq(complianceAuditLog.entityId, filters.entityId));
    }
    if (filters?.complianceStandard) {
      conditions.push(eq(complianceAuditLog.complianceStandard, filters.complianceStandard));
    }
    if (filters?.startDate) {
      conditions.push(gte(complianceAuditLog.timestamp, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(complianceAuditLog.timestamp, filters.endDate));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return query.orderBy(desc(complianceAuditLog.timestamp));
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
    
    // Broadcast maintenance schedule creation to all connected clients
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.broadcastMaintenanceScheduleChange('create', newSchedule);
    }
    
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
    
    // Broadcast maintenance schedule update to all connected clients
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.broadcastMaintenanceScheduleChange('update', updated);
    }
    
    return updated;
  }

  async deleteMaintenanceSchedule(id: string): Promise<void> {
    // Get schedule data before deletion for broadcast
    const scheduleToDelete = await db.select().from(maintenanceSchedules).where(eq(maintenanceSchedules.id, id)).limit(1);
    
    const result = await db.delete(maintenanceSchedules)
      .where(eq(maintenanceSchedules.id, id));
    
    if (result.rowCount === 0) {
      throw new Error(`Maintenance schedule ${id} not found`);
    }
    
    // Broadcast maintenance schedule deletion to all connected clients
    const wsServer = getWebSocketServer();
    if (wsServer && scheduleToDelete.length > 0) {
      wsServer.broadcastMaintenanceScheduleChange('delete', { id: scheduleToDelete[0].id });
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
    
    // Enhanced auto-schedule logic with sophisticated factors
    const schedulingDecision = await this.calculateMaintenanceSchedulingDecision(equipmentId, pdmScore);
    
    if (schedulingDecision.shouldSchedule) {
      const schedule: InsertMaintenanceSchedule = {
        equipmentId,
        scheduledDate: schedulingDecision.scheduledDate,
        maintenanceType: schedulingDecision.maintenanceType,
        priority: schedulingDecision.priority,
        status: 'scheduled',
        description: schedulingDecision.description,
        pdmScore,
        autoGenerated: true,
      };
      return this.createMaintenanceSchedule(schedule);
    }
    
    return null; // No scheduling needed
  }

  // Sophisticated maintenance scheduling decision algorithm
  private async calculateMaintenanceSchedulingDecision(equipmentId: string, pdmScore: number): Promise<{
    shouldSchedule: boolean;
    scheduledDate: Date;
    maintenanceType: 'predictive' | 'preventive' | 'corrective';
    priority: number;
    description: string;
  }> {
    // Gather equipment context data
    const now = new Date();
    const from90DaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const from30DaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const [
      equipmentLifecycle,
      recentMaintenanceRecords,
      performanceMetrics,
      alertHistory
    ] = await Promise.all([
      this.getEquipmentLifecycle(equipmentId).then(data => data[0] || null),
      this.getMaintenanceRecords(equipmentId, from90DaysAgo, now), // Fixed: Last 90 days
      this.getPerformanceMetrics(equipmentId, from30DaysAgo, now), // Last 30 days
      this.getAlertNotifications().then(alerts => alerts.filter(a => a.equipmentId === equipmentId)) // Include all alerts for frequency assessment
    ]);

    // Calculate dynamic thresholds based on equipment characteristics
    const equipmentType = this.getEquipmentType(equipmentId);
    const criticalityFactor = this.getEquipmentCriticalityFactor(equipmentId, equipmentType);
    const ageFactor = this.calculateAgeFactor(equipmentLifecycle);
    const maintenanceHistoryFactor = this.calculateMaintenanceHistoryFactor(recentMaintenanceRecords);
    const performanceTrendFactor = this.calculatePerformanceTrendFactor(performanceMetrics);
    const alertFrequencyFactor = this.calculateAlertFrequencyFactor(alertHistory);

    // Dynamic threshold calculation (base thresholds adjusted by factors)
    const baseCriticalThreshold = 30;
    const baseWarningThreshold = 60;
    
    const adjustedCriticalThreshold = baseCriticalThreshold * criticalityFactor * ageFactor;
    const adjustedWarningThreshold = baseWarningThreshold * criticalityFactor * ageFactor;

    // Determine urgency level based on multiple factors
    const urgencyScore = this.calculateUrgencyScore(
      pdmScore,
      adjustedCriticalThreshold,
      adjustedWarningThreshold,
      maintenanceHistoryFactor,
      performanceTrendFactor,
      alertFrequencyFactor
    );

    // Enhanced scheduling logic
    if (urgencyScore >= 90) {
      // Emergency - schedule within hours for critical equipment
      return {
        shouldSchedule: true,
        scheduledDate: new Date(Date.now() + (criticalityFactor > 1.2 ? 4 : 12) * 60 * 60 * 1000), // 4-12 hours
        maintenanceType: 'corrective',
        priority: 1,
        description: `EMERGENCY: Critical maintenance required for ${equipmentId}. PdM score: ${pdmScore.toFixed(1)}, Urgency: ${urgencyScore.toFixed(1)}`
      };
    } else if (urgencyScore >= 70) {
      // Critical - schedule tomorrow or next business day
      const hoursUntilMaintenance = this.calculateOptimalMaintenanceWindow(equipmentType, 1);
      return {
        shouldSchedule: true,
        scheduledDate: new Date(Date.now() + hoursUntilMaintenance * 60 * 60 * 1000),
        maintenanceType: 'predictive',
        priority: 1,
        description: `Critical predictive maintenance for ${equipmentId}. PdM score: ${pdmScore.toFixed(1)}, multiple risk factors detected`
      };
    } else if (urgencyScore >= 50) {
      // Warning - schedule within optimal window (3-7 days)
      const hoursUntilMaintenance = this.calculateOptimalMaintenanceWindow(equipmentType, 2);
      return {
        shouldSchedule: true,
        scheduledDate: new Date(Date.now() + hoursUntilMaintenance * 60 * 60 * 1000),
        maintenanceType: 'predictive',
        priority: 2,
        description: `Scheduled predictive maintenance for ${equipmentId}. PdM score: ${pdmScore.toFixed(1)}, trending towards maintenance threshold`
      };
    } else if (urgencyScore >= 30 && this.shouldSchedulePreventive(equipmentLifecycle, recentMaintenanceRecords)) {
      // Preventive - schedule based on time/usage intervals
      const hoursUntilMaintenance = this.calculateOptimalMaintenanceWindow(equipmentType, 3);
      return {
        shouldSchedule: true,
        scheduledDate: new Date(Date.now() + hoursUntilMaintenance * 60 * 60 * 1000),
        maintenanceType: 'preventive',
        priority: 3,
        description: `Preventive maintenance for ${equipmentId}. Regular service interval due, PdM score: ${pdmScore.toFixed(1)}`
      };
    }

    return { shouldSchedule: false, scheduledDate: new Date(), maintenanceType: 'preventive', priority: 3, description: '' };
  }

  private getEquipmentType(equipmentId: string): string {
    const typeMap: Record<string, string> = {
      'ENG': 'engine',
      'GEN': 'generator', 
      'PUMP': 'pump',
      'COMP': 'compressor'
    };
    
    const prefix = equipmentId.substring(0, 3);
    return typeMap[prefix] || 'generic';
  }

  private getEquipmentCriticalityFactor(equipmentId: string, equipmentType: string): number {
    // Critical equipment types get higher factors (lower thresholds)
    const criticalityMap: Record<string, number> = {
      'engine': 1.3,      // Main propulsion - critical
      'generator': 1.2,   // Power generation - critical  
      'pump': 1.1,        // Fluid systems - important
      'compressor': 1.15, // Air systems - important
      'generic': 1.0      // Default
    };
    
    return criticalityMap[equipmentType] || 1.0;
  }

  private calculateAgeFactor(equipmentLifecycle?: EquipmentLifecycle | null): number {
    if (!equipmentLifecycle?.installationDate) return 1.0; // Neutral factor for unknown age
    
    const ageInMonths = (Date.now() - equipmentLifecycle.installationDate.getTime()) / (30 * 24 * 60 * 60 * 1000);
    const expectedLifespan = equipmentLifecycle.expectedLifespan || 120; // Default 10 years
    
    // Guard against invalid data
    if (ageInMonths < 0 || expectedLifespan <= 0) return 1.0;
    
    const ageRatio = ageInMonths / expectedLifespan;
    
    // Older equipment needs more frequent maintenance (higher factor = lower thresholds)
    if (ageRatio > 0.8) return 1.4;      // Very old equipment
    if (ageRatio > 0.6) return 1.2;      // Aging equipment
    if (ageRatio > 0.3) return 1.0;      // Mature equipment
    return 0.9;                          // New equipment
  }

  private calculateMaintenanceHistoryFactor(maintenanceRecords: MaintenanceRecord[]): number {
    if (!maintenanceRecords || maintenanceRecords.length === 0) return 1.2; // No recent maintenance = higher risk
    
    const recentFailures = maintenanceRecords.filter(r => r.maintenanceType === 'corrective').length;
    const plannedMaintenance = maintenanceRecords.filter(r => r.maintenanceType === 'preventive').length;
    const predictiveMaintenance = maintenanceRecords.filter(r => r.maintenanceType === 'predictive').length;
    
    const totalRecords = maintenanceRecords.length;
    const failureRate = recentFailures / Math.max(1, totalRecords);
    const plannedRate = (plannedMaintenance + predictiveMaintenance) / Math.max(1, totalRecords);
    
    // High failure rate = need more aggressive scheduling
    if (failureRate > 0.3) return 1.3;
    if (failureRate > 0.1) return 1.1;
    if (plannedRate > 0.7) return 0.9; // Excellent maintenance history
    if (plannedRate > 0.5) return 0.95; // Good maintenance history
    return 1.0;
  }

  private calculatePerformanceTrendFactor(performanceMetrics: PerformanceMetric[]): number {
    if (!performanceMetrics || performanceMetrics.length < 3) return 1.0; // Insufficient data - neutral factor
    
    // Analyze performance trend over time
    const sortedMetrics = performanceMetrics
      .filter(m => m.performanceScore !== null && m.performanceScore !== undefined)
      .sort((a, b) => a.metricDate.getTime() - b.metricDate.getTime());
      
    if (sortedMetrics.length < 3) return 1.0; // Still insufficient valid data
    
    const recentMetrics = sortedMetrics.slice(-3);
    
    const avgPerformanceChange = recentMetrics.reduce((acc, metric, index) => {
      if (index === 0) return acc;
      const prev = recentMetrics[index - 1];
      const change = (metric.performanceScore || 0) - (prev.performanceScore || 0);
      return acc + change;
    }, 0) / Math.max(1, recentMetrics.length - 1);
    
    // Declining performance = need maintenance sooner
    if (avgPerformanceChange < -5) return 1.3;  // Rapidly declining
    if (avgPerformanceChange < -2) return 1.1;  // Slowly declining
    if (avgPerformanceChange > 2) return 0.9;   // Improving
    return 1.0; // Stable
  }

  private calculateAlertFrequencyFactor(alertHistory: AlertNotification[]): number {
    if (alertHistory.length === 0) return 1.0;
    
    const recentAlerts = alertHistory.filter(alert => {
      const alertTime = alert.createdAt?.getTime() || 0;
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return alertTime > sevenDaysAgo;
    });
    
    const criticalAlerts = recentAlerts.filter(a => a.alertType === 'critical').length;
    
    // High alert frequency = need maintenance sooner
    if (criticalAlerts > 3) return 1.4;
    if (criticalAlerts > 1) return 1.2;
    if (recentAlerts.length > 5) return 1.1;
    return 1.0;
  }

  private calculateUrgencyScore(
    pdmScore: number,
    criticalThreshold: number,
    warningThreshold: number,
    maintenanceFactor: number,
    performanceFactor: number,
    alertFactor: number
  ): number {
    // Ensure all factors have safe defaults
    const safeMaintenance = Math.max(0.5, Math.min(2.0, maintenanceFactor || 1.0));
    const safePerformance = Math.max(0.5, Math.min(2.0, performanceFactor || 1.0));
    const safeAlert = Math.max(0.5, Math.min(2.0, alertFactor || 1.0));
    
    // Base urgency from health score (lower health = higher urgency)
    // pdmScore represents health (0-100), so risk = 100 - health
    const healthRisk = Math.max(0, 100 - pdmScore);
    let urgency = healthRisk;
    
    // Apply threshold-based scaling (lower health scores trigger more urgency)
    if (pdmScore < criticalThreshold) {
      urgency *= 1.5; // Boost urgency for critical health scores
    } else if (pdmScore < warningThreshold) {
      urgency *= 1.2; // Moderate boost for warning health scores
    }
    
    // Apply contextual factors with bounds checking
    urgency *= safeMaintenance * safePerformance * safeAlert;
    
    return Math.min(100, Math.max(0, urgency));
  }

  private calculateOptimalMaintenanceWindow(equipmentType: string, priority: number): number {
    // Calculate optimal maintenance timing based on equipment type and operational patterns
    const baseWindows: Record<string, number[]> = {
      'engine': [4, 24, 72],      // 4h, 1d, 3d for priorities 1,2,3
      'generator': [6, 48, 120],   // 6h, 2d, 5d
      'pump': [8, 72, 168],       // 8h, 3d, 7d
      'compressor': [12, 96, 240], // 12h, 4d, 10d
      'generic': [24, 168, 336]   // 1d, 7d, 14d
    };
    
    const windows = baseWindows[equipmentType] || baseWindows['generic'];
    return windows[Math.min(priority - 1, windows.length - 1)];
  }

  private shouldSchedulePreventive(equipmentLifecycle?: EquipmentLifecycle, maintenanceRecords?: MaintenanceRecord[]): boolean {
    if (!equipmentLifecycle) return false;
    
    // Check if it's time for regular preventive maintenance based on operating hours or time
    const operatingHours = equipmentLifecycle.operatingHours || 0;
    const lastMaintenance = maintenanceRecords?.[0]?.createdAt;
    const daysSinceLastMaintenance = lastMaintenance 
      ? (Date.now() - lastMaintenance.getTime()) / (24 * 60 * 60 * 1000)
      : 365; // Assume 1 year if no maintenance history
    
    // Different equipment types have different maintenance intervals
    const maintenanceIntervals: Record<string, { hours: number; days: number }> = {
      'engine': { hours: 500, days: 30 },
      'generator': { hours: 750, days: 45 },
      'pump': { hours: 1000, days: 60 },
      'compressor': { hours: 800, days: 50 },
      'generic': { hours: 1000, days: 90 }
    };
    
    const equipmentType = this.getEquipmentType(equipmentLifecycle.equipmentId);
    const interval = maintenanceIntervals[equipmentType] || maintenanceIntervals['generic'];
    
    return daysSinceLastMaintenance >= interval.days || 
           (operatingHours % interval.hours < 10 && operatingHours > interval.hours);
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

  // ===== PREVENTIVE MAINTENANCE CHECKLISTS METHODS =====

  async getMaintenanceTemplates(orgId?: string, equipmentType?: string, isActive?: boolean): Promise<MaintenanceTemplate[]> {
    const conditions = [];
    if (orgId) conditions.push(eq(maintenanceTemplates.orgId, orgId));
    if (equipmentType) conditions.push(eq(maintenanceTemplates.equipmentType, equipmentType));
    if (isActive !== undefined) conditions.push(eq(maintenanceTemplates.isActive, isActive));
    
    let query = db.select().from(maintenanceTemplates);
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return query.orderBy(maintenanceTemplates.name);
  }

  async getMaintenanceTemplate(id: string, orgId?: string): Promise<MaintenanceTemplate | undefined> {
    const conditions = [eq(maintenanceTemplates.id, id)];
    if (orgId) conditions.push(eq(maintenanceTemplates.orgId, orgId));
    
    const result = await db.select().from(maintenanceTemplates)
      .where(and(...conditions));
    return result[0];
  }

  async createMaintenanceTemplate(template: InsertMaintenanceTemplate): Promise<MaintenanceTemplate> {
    const [newTemplate] = await recordAndPublish(
      db.insert(maintenanceTemplates).values(template).returning(),
      'maintenance_template',
      'create'
    );
    return newTemplate;
  }

  async updateMaintenanceTemplate(id: string, template: Partial<InsertMaintenanceTemplate>, orgId?: string): Promise<MaintenanceTemplate> {
    const conditions = [eq(maintenanceTemplates.id, id)];
    if (orgId) conditions.push(eq(maintenanceTemplates.orgId, orgId));
    
    const [updated] = await recordAndPublish(
      db.update(maintenanceTemplates)
        .set({ ...template, updatedAt: new Date() })
        .where(and(...conditions))
        .returning(),
      'maintenance_template',
      'update'
    );
    
    if (!updated) {
      throw new Error(`Maintenance template ${id} not found`);
    }
    return updated;
  }

  async deleteMaintenanceTemplate(id: string, orgId?: string): Promise<void> {
    const conditions = [eq(maintenanceTemplates.id, id)];
    if (orgId) conditions.push(eq(maintenanceTemplates.orgId, orgId));
    
    const result = await recordAndPublish(
      db.delete(maintenanceTemplates)
        .where(and(...conditions))
        .returning(),
      'maintenance_template',
      'delete'
    );
    
    if (result.length === 0) {
      throw new Error(`Maintenance template ${id} not found`);
    }
  }

  async cloneMaintenanceTemplate(id: string, newName: string, orgId?: string): Promise<MaintenanceTemplate> {
    return await db.transaction(async (tx) => {
      // Get the original template
      const conditions = [eq(maintenanceTemplates.id, id)];
      if (orgId) conditions.push(eq(maintenanceTemplates.orgId, orgId));
      
      const [originalTemplate] = await tx.select().from(maintenanceTemplates)
        .where(and(...conditions));
      
      if (!originalTemplate) {
        throw new Error(`Maintenance template ${id} not found`);
      }
      
      // Create cloned template
      const [clonedTemplate] = await tx.insert(maintenanceTemplates)
        .values({
          ...originalTemplate,
          id: undefined, // Let database generate new ID
          name: newName,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      // Get all checklist items from original template
      const originalItems = await tx.select().from(maintenanceChecklistItems)
        .where(eq(maintenanceChecklistItems.templateId, id))
        .orderBy(maintenanceChecklistItems.sortOrder);
      
      // Clone all checklist items
      if (originalItems.length > 0) {
        await tx.insert(maintenanceChecklistItems)
          .values(originalItems.map(item => ({
            ...item,
            id: undefined, // Let database generate new ID
            templateId: clonedTemplate.id
          })));
      }
      
      await publishEvent('maintenance_template', 'create', clonedTemplate);
      
      return clonedTemplate;
    });
  }

  async getMaintenanceChecklistItems(templateId: string): Promise<MaintenanceChecklistItem[]> {
    return db.select().from(maintenanceChecklistItems)
      .where(eq(maintenanceChecklistItems.templateId, templateId))
      .orderBy(maintenanceChecklistItems.sortOrder, maintenanceChecklistItems.createdAt);
  }

  async getMaintenanceChecklistItem(id: string): Promise<MaintenanceChecklistItem | undefined> {
    const result = await db.select().from(maintenanceChecklistItems)
      .where(eq(maintenanceChecklistItems.id, id));
    return result[0];
  }

  async createMaintenanceChecklistItem(item: InsertMaintenanceChecklistItem): Promise<MaintenanceChecklistItem> {
    const [newItem] = await recordAndPublish(
      db.insert(maintenanceChecklistItems).values(item).returning(),
      'maintenance_checklist_item',
      'create'
    );
    return newItem;
  }

  async updateMaintenanceChecklistItem(id: string, item: Partial<InsertMaintenanceChecklistItem>): Promise<MaintenanceChecklistItem> {
    const [updated] = await recordAndPublish(
      db.update(maintenanceChecklistItems)
        .set(item)
        .where(eq(maintenanceChecklistItems.id, id))
        .returning(),
      'maintenance_checklist_item',
      'update'
    );
    
    if (!updated) {
      throw new Error(`Maintenance checklist item ${id} not found`);
    }
    return updated;
  }

  async deleteMaintenanceChecklistItem(id: string): Promise<void> {
    const result = await recordAndPublish(
      db.delete(maintenanceChecklistItems)
        .where(eq(maintenanceChecklistItems.id, id))
        .returning(),
      'maintenance_checklist_item',
      'delete'
    );
    
    if (result.length === 0) {
      throw new Error(`Maintenance checklist item ${id} not found`);
    }
  }

  async bulkCreateChecklistItems(items: InsertMaintenanceChecklistItem[]): Promise<MaintenanceChecklistItem[]> {
    if (items.length === 0) return [];
    
    return await db.transaction(async (tx) => {
      const created = await tx.insert(maintenanceChecklistItems)
        .values(items)
        .returning();
      
      // Publish events for each created item
      for (const item of created) {
        await publishEvent('maintenance_checklist_item', 'create', item);
      }
      
      return created;
    });
  }

  async reorderChecklistItems(templateId: string, itemIds: string[]): Promise<void> {
    await db.transaction(async (tx) => {
      // Update sort order for each item
      for (let i = 0; i < itemIds.length; i++) {
        await tx.update(maintenanceChecklistItems)
          .set({ sortOrder: i })
          .where(and(
            eq(maintenanceChecklistItems.id, itemIds[i]),
            eq(maintenanceChecklistItems.templateId, templateId)
          ));
      }
    });
  }

  async getMaintenanceChecklistCompletions(workOrderId: string): Promise<MaintenanceChecklistCompletion[]> {
    return db.select().from(maintenanceChecklistCompletions)
      .where(eq(maintenanceChecklistCompletions.workOrderId, workOrderId))
      .orderBy(maintenanceChecklistCompletions.completedAt);
  }

  async getMaintenanceChecklistCompletion(id: string): Promise<MaintenanceChecklistCompletion | undefined> {
    const result = await db.select().from(maintenanceChecklistCompletions)
      .where(eq(maintenanceChecklistCompletions.id, id));
    return result[0];
  }

  async createMaintenanceChecklistCompletion(completion: InsertMaintenanceChecklistCompletion): Promise<MaintenanceChecklistCompletion> {
    const [newCompletion] = await recordAndPublish(
      db.insert(maintenanceChecklistCompletions).values(completion).returning(),
      'maintenance_checklist_completion',
      'create'
    );
    return newCompletion;
  }

  async updateMaintenanceChecklistCompletion(id: string, completion: Partial<InsertMaintenanceChecklistCompletion>): Promise<MaintenanceChecklistCompletion> {
    const [updated] = await recordAndPublish(
      db.update(maintenanceChecklistCompletions)
        .set(completion)
        .where(eq(maintenanceChecklistCompletions.id, id))
        .returning(),
      'maintenance_checklist_completion',
      'update'
    );
    
    if (!updated) {
      throw new Error(`Maintenance checklist completion ${id} not found`);
    }
    return updated;
  }

  async completeChecklistItem(
    workOrderId: string,
    itemId: string,
    completedBy: string,
    completedByName: string,
    passed?: boolean,
    actualValue?: string,
    notes?: string,
    photoUrls?: string[]
  ): Promise<MaintenanceChecklistCompletion> {
    const [completion] = await recordAndPublish(
      db.insert(maintenanceChecklistCompletions)
        .values({
          workOrderId,
          itemId,
          completedBy,
          completedByName,
          passed: passed ?? null,
          actualValue: actualValue || null,
          notes: notes || null,
          photoUrls: photoUrls || null,
          completedAt: new Date()
        })
        .returning(),
      'maintenance_checklist_completion',
      'create'
    );
    return completion;
  }

  async bulkCompleteChecklistItems(
    workOrderId: string,
    completions: Array<{
      itemId: string;
      completedBy: string;
      completedByName: string;
      passed?: boolean;
      actualValue?: string;
      notes?: string;
    }>
  ): Promise<MaintenanceChecklistCompletion[]> {
    if (completions.length === 0) return [];
    
    return await db.transaction(async (tx) => {
      const created = await tx.insert(maintenanceChecklistCompletions)
        .values(completions.map(c => ({
          workOrderId,
          itemId: c.itemId,
          completedBy: c.completedBy,
          completedByName: c.completedByName,
          passed: c.passed ?? null,
          actualValue: c.actualValue || null,
          notes: c.notes || null,
          photoUrls: null,
          completedAt: new Date()
        })))
        .returning();
      
      // Publish events for each completion
      for (const completion of created) {
        await publishEvent('maintenance_checklist_completion', 'create', completion);
      }
      
      return created;
    });
  }

  async getChecklistCompletionProgress(workOrderId: string): Promise<{
    totalItems: number;
    completedItems: number;
    pendingItems: number;
    skippedItems: number;
    failedItems: number;
    percentComplete: number;
  }> {
    // Get work order to find template
    const workOrder = await db.select().from(workOrders)
      .where(eq(workOrders.id, workOrderId))
      .limit(1);
    
    if (workOrder.length === 0 || !workOrder[0].maintenanceTemplateId) {
      return {
        totalItems: 0,
        completedItems: 0,
        pendingItems: 0,
        skippedItems: 0,
        failedItems: 0,
        percentComplete: 0
      };
    }
    
    // Get all checklist items for template
    const items = await db.select().from(maintenanceChecklistItems)
      .where(eq(maintenanceChecklistItems.templateId, workOrder[0].maintenanceTemplateId));
    
    const totalItems = items.length;
    
    if (totalItems === 0) {
      return {
        totalItems: 0,
        completedItems: 0,
        pendingItems: 0,
        skippedItems: 0,
        failedItems: 0,
        percentComplete: 0
      };
    }
    
    // Get all completions for this work order
    const completions = await db.select().from(maintenanceChecklistCompletions)
      .where(eq(maintenanceChecklistCompletions.workOrderId, workOrderId));
    
    const completedItems = completions.filter(c => c.passed === true).length;
    const failedItems = completions.filter(c => c.passed === false).length;
    const skippedItems = completions.filter(c => c.passed === null).length;
    const pendingItems = totalItems - completions.length;
    const percentComplete = totalItems > 0 ? Math.round((completions.length / totalItems) * 100) : 0;
    
    return {
      totalItems,
      completedItems,
      pendingItems,
      skippedItems,
      failedItems,
      percentComplete
    };
  }

  async linkWorkOrderToTemplate(workOrderId: string, templateId: string, orgId?: string): Promise<WorkOrder> {
    const conditions = [eq(workOrders.id, workOrderId)];
    if (orgId) conditions.push(eq(workOrders.orgId, orgId));
    
    const [updated] = await recordAndPublish(
      db.update(workOrders)
        .set({
          maintenanceTemplateId: templateId,
          updatedAt: new Date()
        })
        .where(and(...conditions))
        .returning(),
      'work_order',
      'update'
    );
    
    if (!updated) {
      throw new Error(`Work order ${workOrderId} not found`);
    }
    return updated;
  }

  async initializeChecklistFromTemplate(workOrderId: string, templateId: string): Promise<MaintenanceChecklistCompletion[]> {
    return await db.transaction(async (tx) => {
      // Verify template exists
      const [template] = await tx.select().from(maintenanceTemplates)
        .where(eq(maintenanceTemplates.id, templateId))
        .limit(1);
      
      if (!template) {
        throw new Error(`Maintenance template ${templateId} not found`);
      }
      
      // Verify work order exists
      const [workOrder] = await tx.select().from(workOrders)
        .where(eq(workOrders.id, workOrderId))
        .limit(1);
      
      if (!workOrder) {
        throw new Error(`Work order ${workOrderId} not found`);
      }
      
      // Link template to work order
      await tx.update(workOrders)
        .set({
          maintenanceTemplateId: templateId,
          updatedAt: new Date()
        })
        .where(eq(workOrders.id, workOrderId));
      
      // Get all checklist items from template
      const items = await tx.select().from(maintenanceChecklistItems)
        .where(eq(maintenanceChecklistItems.templateId, templateId))
        .orderBy(maintenanceChecklistItems.sortOrder);
      
      // Create completion records for each item (initially incomplete)
      const completions: MaintenanceChecklistCompletion[] = [];
      
      if (items.length > 0) {
        const created = await tx.insert(maintenanceChecklistCompletions)
          .values(items.map(item => ({
            workOrderId,
            itemId: item.id,
            completedBy: null,
            completedByName: null,
            passed: null,
            actualValue: null,
            notes: null,
            photoUrls: null,
            completedAt: null
          })))
          .returning();
        
        completions.push(...created);
        
        // Publish events
        for (const completion of created) {
          await publishEvent('maintenance_checklist_completion', 'create', completion);
        }
      }
      
      return completions;
    });
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

  async getMaintenanceCostsByWorkOrder(workOrderId: string): Promise<MaintenanceCost[]> {
    return await db.select()
      .from(maintenanceCosts)
      .where(eq(maintenanceCosts.workOrderId, workOrderId))
      .orderBy(desc(maintenanceCosts.createdAt));
  }

  // Parts cost management methods
  async updatePartCost(partId: string, updateData: { unitCost: number; supplier: string }): Promise<PartsInventory> {
    const [updatedPart] = await db.update(partsInventory)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(partsInventory.id, partId))
      .returning();
    
    if (!updatedPart) {
      throw new Error(`Part ${partId} not found`);
    }
    return updatedPart;
  }

  // Stock quantities management method
  async updatePartStockQuantities(partId: string, updateData: {
    quantityOnHand?: number;
    quantityReserved?: number;
    minStockLevel?: number;
    maxStockLevel?: number;
  }): Promise<PartsInventory> {
    // Validate the update data
    if (updateData.quantityReserved !== undefined && updateData.quantityReserved < 0) {
      throw new Error("validation: Reserved quantity cannot be negative");
    }
    
    if (updateData.minStockLevel !== undefined && updateData.minStockLevel < 0) {
      throw new Error("validation: Minimum stock level cannot be negative");
    }
    
    if (updateData.maxStockLevel !== undefined && updateData.maxStockLevel < 0) {
      throw new Error("validation: Maximum stock level cannot be negative");
    }

    // Get current part to validate min/max relationship
    const currentPart = await db.select().from(partsInventory).where(eq(partsInventory.id, partId)).limit(1);
    if (currentPart.length === 0) {
      throw new Error(`Part ${partId} not found`);
    }

    const part = currentPart[0];
    
    // Validate min/max relationship if both are provided
    const newMinStock = updateData.minStockLevel !== undefined ? updateData.minStockLevel : part.minStockLevel;
    const newMaxStock = updateData.maxStockLevel !== undefined ? updateData.maxStockLevel : part.maxStockLevel;
    
    if (newMinStock > newMaxStock) {
      throw new Error("validation: Minimum stock level cannot be greater than maximum stock level");
    }

    // Calculate new available quantity
    const newQuantityOnHand = updateData.quantityOnHand !== undefined ? updateData.quantityOnHand : part.quantityOnHand;
    const newQuantityReserved = updateData.quantityReserved !== undefined ? updateData.quantityReserved : part.quantityReserved;
    const availableQuantity = Math.max(0, newQuantityOnHand - newQuantityReserved);

    // Calculate new stock status
    const stockStatus = this.calculateStockStatus(newQuantityOnHand, newQuantityReserved, newMinStock, newMaxStock);

    // Update the part with new stock quantities
    const [updatedPart] = await db.update(partsInventory)
      .set({ 
        ...updateData, 
        availableQuantity,
        stockStatus,
        updatedAt: new Date() 
      })
      .where(eq(partsInventory.id, partId))
      .returning();
    
    if (!updatedPart) {
      throw new Error(`Part ${partId} not found`);
    }
    return updatedPart;
  }

  // Helper method to calculate stock status for DatabaseStorage
  private calculateStockStatus(
    quantityOnHand: number,
    quantityReserved: number,
    minStockLevel: number,
    maxStockLevel: number
  ): 'critical' | 'low_stock' | 'adequate' | 'excess_stock' | 'out_of_stock' {
    const available = Math.max(0, quantityOnHand - quantityReserved);
    
    if (quantityOnHand <= 0) return 'out_of_stock';
    if (available <= 0) return 'critical';
    if (available < minStockLevel * 0.5) return 'critical';
    if (available < minStockLevel) return 'low_stock';
    if (available > maxStockLevel) return 'excess_stock';
    return 'adequate';
  }

  // Labor rates methods
  async getLaborRates(orgId?: string): Promise<LaborRate[]> {
    const conditions = [eq(laborRates.isActive, true)];
    if (orgId) {
      conditions.push(eq(laborRates.orgId, orgId));
    }
    
    return await db.select()
      .from(laborRates)
      .where(and(...conditions))
      .orderBy(desc(laborRates.createdAt));
  }

  async createLaborRate(rate: InsertLaborRate): Promise<LaborRate> {
    const [newRate] = await db.insert(laborRates)
      .values(rate)
      .returning();
    return newRate;
  }

  async updateLaborRate(rateId: string, updateData: Partial<InsertLaborRate>): Promise<LaborRate> {
    const [updatedRate] = await db.update(laborRates)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(laborRates.id, rateId))
      .returning();
    
    if (!updatedRate) {
      throw new Error(`Labor rate ${rateId} not found`);
    }
    return updatedRate;
  }

  async updateCrewRate(crewId: string, updateData: { currentRate: number; overtimeMultiplier: number; effectiveDate: Date }): Promise<SelectCrew> {
    const [updatedCrew] = await db.update(crew)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(crew.id, crewId))
      .returning();
    
    if (!updatedCrew) {
      throw new Error(`Crew member ${crewId} not found`);
    }
    return updatedCrew;
  }

  // Expense tracking methods
  async getExpenses(orgId?: string): Promise<Expense[]> {
    const conditions = [];
    if (orgId) {
      conditions.push(eq(expenses.orgId, orgId));
    }
    
    return await db.select()
      .from(expenses)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(expenses.expenseDate));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db.insert(expenses)
      .values(expense)
      .returning();
    return newExpense;
  }

  async updateExpenseStatus(expenseId: string, status: 'pending' | 'approved' | 'rejected'): Promise<Expense> {
    const [updatedExpense] = await db.update(expenses)
      .set({ 
        approvalStatus: status, 
        approvedAt: status !== 'pending' ? new Date() : null,
        updatedAt: new Date() 
      })
      .where(eq(expenses.id, expenseId))
      .returning();
    
    if (!updatedExpense) {
      throw new Error(`Expense ${expenseId} not found`);
    }
    return updatedExpense;
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
    // Try to get existing performance metrics first
    const metrics = await db.select().from(performanceMetrics);
    
    // If we have performance metrics, use them
    if (metrics.length > 0) {
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
    
    // Fallback: Generate performance metrics from equipment health data
    const healthData = await this.getEquipmentHealth();
    
    if (healthData.length === 0) {
      return [];
    }
    
    // Since getEquipmentHealth returns one record per equipment (not multiple health readings),
    // we can directly map to performance metrics
    return healthData.map(health => {
      // Map health score to performance metrics (0-100 scale)
      const performanceScore = health.healthIndex;
      
      // Calculate reliability based on health status
      const reliability = health.status === 'healthy' ? 100 : 
                         health.status === 'warning' ? 50 : 0;
      
      // Calculate availability (assume equipment is available when not critical)
      const availability = health.status === 'critical' ? 0 : 100;
      
      // Efficiency based on health score and status
      const efficiency = health.status === 'critical' ? 0 : health.healthIndex;
      
      return {
        equipmentId: health.id, // Use the equipment ID from health data
        averageScore: Math.round(performanceScore * 10) / 10,
        reliability: Math.round(reliability * 10) / 10,
        availability: Math.round(availability * 10) / 10,
        efficiency: Math.round(efficiency * 10) / 10,
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

  // Raw telemetry ingestion methods
  async getRawTelemetry(vessel?: string, fromDate?: Date, toDate?: Date): Promise<RawTelemetry[]> {
    let query = db.select().from(rawTelemetry);
    const conditions: any[] = [];

    if (vessel) {
      conditions.push(eq(rawTelemetry.vessel, vessel));
    }
    if (fromDate) {
      conditions.push(gte(rawTelemetry.ts, fromDate));
    }
    if (toDate) {
      conditions.push(lte(rawTelemetry.ts, toDate));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return query.orderBy(desc(rawTelemetry.ts));
  }

  async bulkInsertRawTelemetry(telemetryData: InsertRawTelemetry[]): Promise<number> {
    if (telemetryData.length === 0) return 0;
    
    await db.insert(rawTelemetry).values(telemetryData);
    return telemetryData.length;
  }

  async deleteRawTelemetry(id: string): Promise<void> {
    await db.delete(rawTelemetry).where(eq(rawTelemetry.id, id));
  }

  // Transport settings methods
  async getTransportSettings(): Promise<TransportSettings | undefined> {
    const [settings] = await db.select().from(transportSettings).limit(1);
    return settings;
  }

  async createTransportSettings(settings: InsertTransportSettings): Promise<TransportSettings> {
    const [newSettings] = await db.insert(transportSettings)
      .values(settings)
      .returning();
    return newSettings;
  }

  async updateTransportSettings(id: string, settings: Partial<InsertTransportSettings>): Promise<TransportSettings> {
    const [updatedSettings] = await db.update(transportSettings)
      .set(settings)
      .where(eq(transportSettings.id, id))
      .returning();
    return updatedSettings;
  }

  async clearOrphanedTelemetryData(): Promise<void> {
    // Clear all telemetry data since we don't have any real devices
    await db.delete(rawTelemetry);
    await db.delete(equipmentTelemetry);
    console.log('Cleared all telemetry data');
  }

  async clearAllAlerts(): Promise<void> {
    // Clear all alert notifications, comments, and suppressions
    await db.delete(alertComments);
    await db.delete(alertSuppressions);
    await db.delete(alertNotifications);
    console.log('Cleared all alert notifications, comments, and suppressions');
  }

  // CMMS-lite: Work Order Checklists (Stub implementations - DB tables not yet created)
  async getWorkOrderChecklists(workOrderId?: string, orgId?: string): Promise<WorkOrderChecklist[]> {
    // TODO: Implement when CMMS database tables are created
    return [];
  }

  async createWorkOrderChecklist(checklist: InsertWorkOrderChecklist): Promise<WorkOrderChecklist> {
    throw new Error('CMMS-lite database tables not yet implemented. Use MemStorage for development.');
  }

  async updateWorkOrderChecklist(id: string, checklist: Partial<InsertWorkOrderChecklist>): Promise<WorkOrderChecklist> {
    throw new Error('CMMS-lite database tables not yet implemented. Use MemStorage for development.');
  }

  async deleteWorkOrderChecklist(id: string): Promise<void> {
    throw new Error('CMMS-lite database tables not yet implemented. Use MemStorage for development.');
  }

  // CMMS-lite: Work Order Worklogs (Stub implementations)
  async getWorkOrderWorklogs(workOrderId?: string, orgId?: string): Promise<WorkOrderWorklog[]> {
    return [];
  }

  async createWorkOrderWorklog(worklog: InsertWorkOrderWorklog): Promise<WorkOrderWorklog> {
    throw new Error('CMMS-lite database tables not yet implemented. Use MemStorage for development.');
  }

  async updateWorkOrderWorklog(id: string, worklog: Partial<InsertWorkOrderWorklog>): Promise<WorkOrderWorklog> {
    throw new Error('CMMS-lite database tables not yet implemented. Use MemStorage for development.');
  }

  async deleteWorkOrderWorklog(id: string): Promise<void> {
    throw new Error('CMMS-lite database tables not yet implemented. Use MemStorage for development.');
  }

  async calculateWorklogCosts(workOrderId: string): Promise<{ totalLaborHours: number; totalLaborCost: number }> {
    return { totalLaborHours: 0, totalLaborCost: 0 };
  }

  // CMMS-lite: Parts Inventory (PostgreSQL implementations)
  async getPartsInventory(
    category?: string, 
    orgId?: string,
    search?: string,
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Promise<any[]> {
    // Build all conditions in a single array to ensure proper combining
    const conditions = [];
    
    // Always enforce orgId filtering for security
    if (orgId) {
      conditions.push(eq(partsInventory.orgId, orgId));
    }
    
    // Add category filter
    if (category) {
      conditions.push(eq(partsInventory.category, category));
    }

    // Add search filter (combine with existing conditions, don't overwrite)
    if (search) {
      const searchPattern = `%${search}%`;
      const searchCondition = or(
        sql`${partsInventory.partNumber} ILIKE ${searchPattern}`,
        sql`${partsInventory.partName} ILIKE ${searchPattern}`,
        sql`${partsInventory.category} ILIKE ${searchPattern}`,
        sql`${partsInventory.description} ILIKE ${searchPattern}`
      );
      conditions.push(searchCondition);
    }

    // Start with base query and apply all conditions together
    let query = db.select().from(partsInventory);
    
    // Apply all filters in a single where clause to maintain all conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting with proper column mapping
    if (sortBy) {
      // Map frontend field names to Drizzle column references
      const columnMap: Record<string, any> = {
        'partName': partsInventory.partName,
        'partNumber': partsInventory.partNumber,
        'category': partsInventory.category,
        'quantityOnHand': partsInventory.quantityOnHand,
        'quantityReserved': partsInventory.quantityReserved,
        'unitCost': partsInventory.unitCost,
        'minStockLevel': partsInventory.minStockLevel,
        'maxStockLevel': partsInventory.maxStockLevel,
        'leadTimeDays': partsInventory.leadTimeDays,
        'location': partsInventory.location,
        'createdAt': partsInventory.createdAt,
        'updatedAt': partsInventory.updatedAt
      };
      
      const sortColumn = columnMap[sortBy] || partsInventory.partName;
      query = query.orderBy(sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn));
    } else {
      query = query.orderBy(asc(partsInventory.partName));
    }

    const results = await query;
    
    // Return the results as-is since they already match the expected PartsInventory structure
    return results;
  }

  // Stock seeding: Ensure every part has a stock row
  async seedStockForParts(orgId?: string): Promise<{ created: number; skipped: number }> {
    const targetOrgId = orgId || 'default-org-id';
    
    // Find parts that don't have stock rows for the default location
    const partsWithoutStock = await db.execute(sql`
      SELECT p.id, p.part_no, p.org_id, p.standard_cost
      FROM parts p
      LEFT JOIN stock s ON p.id = s.part_id AND s.location = 'MAIN' AND s.org_id = p.org_id
      WHERE p.org_id = ${targetOrgId} AND s.id IS NULL
    `);

    let createdCount = 0;
    let skippedCount = 0;

    for (const part of partsWithoutStock.rows) {
      try {
        // Create stock row with zero quantities for the default location
        await db.insert(stock).values({
          orgId: part.org_id,
          partId: part.id,
          partNo: part.part_no,
          location: 'MAIN',
          quantityOnHand: 0,
          quantityReserved: 0,
          quantityOnOrder: 0,
          unitCost: part.standard_cost || 0,
        });
        createdCount++;
      } catch (error) {
        // Skip if stock row already exists (race condition)
        console.warn(`Skipped creating stock for part ${part.part_no}:`, error);
        skippedCount++;
      }
    }

    console.log(`Stock seeding complete: ${createdCount} created, ${skippedCount} skipped`);
    return { created: createdCount, skipped: skippedCount };
  }

  async getPartById(id: string, orgId?: string): Promise<PartsInventory | undefined> {
    let query = db.select().from(partsInventory).where(eq(partsInventory.id, id));
    if (orgId) {
      query = query.where(eq(partsInventory.orgId, orgId));
    }
    const results = await query;
    return results[0];
  }

  async createPart(partData: any): Promise<PartsInventory> {
    const part = {
      orgId: partData.orgId || 'default-org-id',
      partNumber: partData.partNo,
      partName: partData.name,
      category: partData.category,
      unitCost: partData.unitCost || 0,
      quantityOnHand: partData.quantityOnHand || 0,
      quantityReserved: 0,
      minStockLevel: partData.minStockLevel || 0,
      maxStockLevel: partData.maxStockLevel || 0,
      leadTimeDays: partData.leadTimeDays || 7,
      supplierName: partData.supplier,
      isActive: true,
    };
    
    const [created] = await db.insert(partsInventory).values(part).returning();
    return created;
  }

  async updatePart(id: string, part: Partial<InsertPartsInventory>): Promise<PartsInventory> {
    console.log(`[DatabaseStorage.updatePart] Attempting to update part with ID: ${id}`);
    console.log(`[DatabaseStorage.updatePart] Update data:`, part);
    
    const [updated] = await db
      .update(partsInventory)
      .set({ ...part, updatedAt: new Date() })
      .where(eq(partsInventory.id, id))
      .returning();
    
    console.log(`[DatabaseStorage.updatePart] Update result:`, updated);
    
    if (!updated) {
      console.error(`[DatabaseStorage.updatePart] Part with ID ${id} not found in partsInventory table`);
      throw new Error('Part not found');
    }
    
    console.log(`[DatabaseStorage.updatePart] Successfully updated part:`, updated);
    return updated;
  }

  async deletePart(id: string): Promise<void> {
    await db.delete(partsInventory).where(eq(partsInventory.id, id));
  }

  async updatePartCost(partId: string, updateData: { unitCost: number; supplier: string }): Promise<PartsInventory> {
    const [updated] = await db
      .update(partsInventory)
      .set({
        unitCost: updateData.unitCost,
        supplierName: updateData.supplier,
        updatedAt: new Date(),
      })
      .where(eq(partsInventory.id, partId))
      .returning();
    
    if (!updated) {
      throw new Error('Part not found');
    }
    return updated;
  }

  async getLowStockParts(orgId?: string): Promise<PartsInventory[]> {
    return [];
  }

  async reservePart(partId: string, quantity: number): Promise<PartsInventory> {
    throw new Error('CMMS-lite database tables not yet implemented. Use MemStorage for development.');
  }

  // CMMS-lite: Work Order Parts Usage (Stub implementations)
  async getWorkOrderParts(workOrderId?: string, orgId?: string): Promise<WorkOrderParts[]> {
    let query = db.select().from(workOrderParts);
    
    if (workOrderId) {
      query = query.where(eq(workOrderParts.workOrderId, workOrderId));
    }
    
    if (orgId) {
      query = query.where(eq(workOrderParts.orgId, orgId));
    }
    
    return await query;
  }

  async addPartToWorkOrder(workOrderPart: InsertWorkOrderParts): Promise<WorkOrderParts> {
    const [created] = await db.insert(workOrderParts).values(workOrderPart).returning();
    return created;
  }

  async updateWorkOrderPart(id: string, workOrderPart: Partial<InsertWorkOrderParts>): Promise<WorkOrderParts> {
    const [updated] = await db
      .update(workOrderParts)
      .set(workOrderPart)
      .where(eq(workOrderParts.id, id))
      .returning();
    
    if (!updated) {
      throw new Error('Work order part not found');
    }
    return updated;
  }

  async removePartFromWorkOrder(id: string): Promise<void> {
    await db.delete(workOrderParts).where(eq(workOrderParts.id, id));
  }

  async getPartsCostForWorkOrder(workOrderId: string): Promise<{ totalPartsCost: number; partsCount: number }> {
    const results = await db
      .select({
        totalPartsCost: sql<number>`COALESCE(SUM(${workOrderParts.totalCost}), 0)`,
        partsCount: sql<number>`COALESCE(COUNT(*), 0)`
      })
      .from(workOrderParts)
      .where(eq(workOrderParts.workOrderId, workOrderId));

    return results[0] || { totalPartsCost: 0, partsCount: 0 };
  }

  // Bulk parts addition with deduplication logic
  async addBulkPartsToWorkOrder(
    workOrderId: string, 
    partsToAdd: Array<{ partId: string; quantity: number; usedBy: string; notes?: string }>,
    orgId: string
  ): Promise<{ added: WorkOrderParts[]; updated: WorkOrderParts[]; errors: string[] }> {
    const result = {
      added: [] as WorkOrderParts[],
      updated: [] as WorkOrderParts[],
      errors: [] as string[]
    };

    // Get existing parts for this work order to check for duplicates
    const existingParts = await this.getWorkOrderParts(workOrderId, orgId);
    const existingPartMap = new Map(existingParts.map(p => [p.partId, p]));

    for (const partToAdd of partsToAdd) {
      try {
        // Get part details for cost calculation
        const part = await db.select().from(parts).where(eq(parts.id, partToAdd.partId)).limit(1);
        if (part.length === 0) {
          result.errors.push(`Part ${partToAdd.partId} not found`);
          continue;
        }

        const partDetails = part[0];
        const unitCost = partDetails.standardCost || 0;
        const totalCost = partToAdd.quantity * unitCost;

        // Check if part already exists in this work order
        const existingPart = existingPartMap.get(partToAdd.partId);
        
        if (existingPart) {
          // Update existing part by adding quantities
          const newQuantity = existingPart.quantityUsed + partToAdd.quantity;
          const newTotalCost = newQuantity * unitCost;
          
          const updated = await this.updateWorkOrderPart(existingPart.id, {
            quantityUsed: newQuantity,
            totalCost: newTotalCost,
            notes: partToAdd.notes ? 
              (existingPart.notes ? `${existingPart.notes}; ${partToAdd.notes}` : partToAdd.notes) :
              existingPart.notes
          });
          
          result.updated.push(updated);
          existingPartMap.set(partToAdd.partId, updated); // Update our map
        } else {
          // Add new part
          const newWorkOrderPart = await this.addPartToWorkOrder({
            orgId,
            workOrderId,
            partId: partToAdd.partId,
            quantityUsed: partToAdd.quantity,
            unitCost,
            totalCost,
            usedBy: partToAdd.usedBy,
            notes: partToAdd.notes
          });
          
          result.added.push(newWorkOrderPart);
          existingPartMap.set(partToAdd.partId, newWorkOrderPart); // Add to our map
        }
      } catch (error) {
        result.errors.push(`Failed to add part ${partToAdd.partId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return result;
  }

  // Inventory Risk Analysis: Additional methods for risk assessment (Stub implementations)
  async getWorkOrderPartsByEquipment(orgId: string, equipmentId: string): Promise<WorkOrderParts[]> {
    return [];
  }

  async getWorkOrderPartsByPartId(orgId: string, partId: string): Promise<WorkOrderParts[]> {
    return [];
  }

  // Equipment-Parts-Sensor Linkage: Database Implementation
  async getPartsForEquipment(equipmentId: string, orgId: string): Promise<Part[]> {
    const result = await db.select().from(parts)
      .where(and(
        eq(parts.orgId, orgId),
        sql`${parts.compatibleEquipment} @> ARRAY[${equipmentId}]::text[]`
      ));
    return result;
  }

  async getEquipmentForPart(partId: string, orgId: string): Promise<Equipment[]> {
    const part = await db.select().from(parts)
      .where(and(eq(parts.id, partId), eq(parts.orgId, orgId)))
      .limit(1);
    
    if (part.length === 0 || !part[0].compatibleEquipment) {
      return [];
    }

    const result = await db.select().from(equipment)
      .where(and(
        eq(equipment.orgId, orgId),
        sql`${equipment.id} = ANY(${part[0].compatibleEquipment})`
      ));
    
    return result;
  }

  async suggestPartsForSensorIssue(equipmentId: string, sensorType: string, orgId: string): Promise<Part[]> {
    const equipmentResult = await this.getEquipment(orgId, equipmentId);
    if (!equipmentResult) return [];

    // CRITICAL: Only suggest parts that are compatible with this equipment
    const allPartsForEquipment = await this.getPartsForEquipment(equipmentId, orgId);
    
    // If no compatible parts exist, return empty array
    if (allPartsForEquipment.length === 0) return [];
    
    const sensorTypeKeywords: Record<string, string[]> = {
      temperature: ['thermostat', 'sensor', 'cooling', 'coolant', 'heat', 'temperature'],
      pressure: ['pump', 'valve', 'seal', 'gasket', 'hose', 'pressure'],
      vibration: ['bearing', 'mount', 'dampener', 'shaft', 'coupling', 'vibration'],
      flow: ['pump', 'filter', 'valve', 'impeller', 'flow'],
      voltage: ['battery', 'alternator', 'wire', 'fuse', 'relay', 'voltage', 'electrical'],
      current: ['wire', 'fuse', 'relay', 'connector', 'current', 'electrical'],
    };

    const keywords = sensorTypeKeywords[sensorType.toLowerCase()] || [];
    
    // If no keywords, return all compatible parts
    if (keywords.length === 0) {
      return allPartsForEquipment;
    }

    // Filter compatible parts by keyword relevance
    const relevantParts = allPartsForEquipment.filter(part => {
      const searchText = `${part.name} ${part.description || ''} ${part.category || ''}`.toLowerCase();
      return keywords.some(keyword => searchText.includes(keyword.toLowerCase()));
    });

    // If keyword filtering produces results, use them; otherwise return all compatible parts
    return relevantParts.length > 0 ? relevantParts : allPartsForEquipment;
  }

  async getEquipmentWithSensorIssues(orgId: string, severityFilter?: 'warning' | 'critical'): Promise<Array<{ equipment: Equipment; sensors: Array<{ sensorType: string; status: string; value: number | null }> }>> {
    const equipmentList = await this.getEquipmentRegistry(orgId);
    const results: Array<{ equipment: Equipment; sensors: Array<{ sensorType: string; status: string; value: number | null }> }> = [];

    for (const equipmentItem of equipmentList) {
      const sensorStateResults = await db.select().from(sensorStates)
        .where(and(
          eq(sensorStates.equipmentId, equipmentItem.id),
          eq(sensorStates.orgId, orgId)
        ));

      const sensorIssues: Array<{ sensorType: string; status: string; value: number | null }> = [];

      for (const state of sensorStateResults) {
        const configResults = await db.select().from(sensorConfigurations)
          .where(and(
            eq(sensorConfigurations.equipmentId, equipmentItem.id),
            eq(sensorConfigurations.sensorType, state.sensorType),
            eq(sensorConfigurations.orgId, orgId)
          ))
          .limit(1);

        if (configResults.length === 0 || !configResults[0].enabled) continue;

        const config = configResults[0];
        let status = 'normal';
        const value = state.lastValue;

        if (value !== null && value !== undefined) {
          if (config.critHi !== null && value >= config.critHi) status = 'critical';
          else if (config.critLo !== null && value <= config.critLo) status = 'critical';
          else if (config.warnHi !== null && value >= config.warnHi) status = 'warning';
          else if (config.warnLo !== null && value <= config.warnLo) status = 'warning';
        }

        if (status !== 'normal') {
          if (!severityFilter || status === severityFilter) {
            sensorIssues.push({ sensorType: state.sensorType, status, value });
          }
        }
      }

      if (sensorIssues.length > 0) {
        results.push({ equipment: equipmentItem, sensors: sensorIssues });
      }
    }

    return results;
  }

  async updatePartCompatibility(partId: string, equipmentIds: string[], orgId: string): Promise<Part> {
    const result = await db.update(parts)
      .set({
        compatibleEquipment: equipmentIds,
        updatedAt: new Date(),
      })
      .where(and(eq(parts.id, partId), eq(parts.orgId, orgId)))
      .returning();

    if (result.length === 0) {
      throw new Error(`Part ${partId} not found`);
    }

    return result[0];
  }

  async getEquipment(orgId: string, equipmentId: string): Promise<Equipment | undefined> {
    const result = await db.select().from(equipment)
      .where(and(eq(equipment.id, equipmentId), eq(equipment.orgId, orgId)));
    return result[0];
  }

  async getEquipmentRegistry(orgId?: string): Promise<Equipment[]> {
    let query = db.select().from(equipment);
    if (orgId) {
      query = query.where(eq(equipment.orgId, orgId));
    }
    return query.orderBy(equipment.name);
  }

  async createEquipment(equipmentData: InsertEquipment): Promise<Equipment> {
    // Auto-populate vesselName when vesselId is provided for data integrity
    let vesselName = equipmentData.vesselName;
    if (equipmentData.vesselId && equipmentData.vesselId !== "unassigned") {
      try {
        const vessel = await db.select({ name: vessels.name })
          .from(vessels)
          .where(eq(vessels.id, equipmentData.vesselId))
          .limit(1);
        if (vessel.length > 0) {
          vesselName = vessel[0].name;
        }
      } catch (error) {
        console.warn(`Failed to lookup vessel name for ID ${equipmentData.vesselId}:`, error);
        // Continue with provided vesselName or null
      }
    }

    const result = await db.insert(equipment)
      .values({
        ...equipmentData,
        vesselName, // Use auto-populated or provided vesselName
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    const newEquipment = result[0];

    // Automatically setup analytics for new equipment
    try {
      const { equipmentAnalyticsService } = await import('./equipment-analytics-service.js');
      await equipmentAnalyticsService.setupEquipmentAnalytics(newEquipment);
    } catch (error) {
      console.error(`Failed to setup analytics for new equipment ${newEquipment.id}:`, error);
      // Don't fail equipment creation if analytics setup fails
    }

    // Broadcast equipment creation to all connected clients
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.broadcastEquipmentChange('create', newEquipment);
    }

    return newEquipment;
  }

  async updateEquipment(id: string, equipmentData: Partial<InsertEquipment>, orgId?: string): Promise<Equipment> {
    const conditions = [eq(equipment.id, id)];
    if (orgId) conditions.push(eq(equipment.orgId, orgId));

    // Auto-populate vesselName when vesselId is provided for data integrity
    let updateData = { ...equipmentData };
    if (equipmentData.vesselId !== undefined) {
      if (equipmentData.vesselId && equipmentData.vesselId !== "unassigned") {
        try {
          const vessel = await db.select({ name: vessels.name })
            .from(vessels)
            .where(eq(vessels.id, equipmentData.vesselId))
            .limit(1);
          if (vessel.length > 0) {
            updateData.vesselName = vessel[0].name;
          }
        } catch (error) {
          console.warn(`Failed to lookup vessel name for ID ${equipmentData.vesselId}:`, error);
          // Continue with existing or provided vesselName
        }
      } else {
        // If vesselId is null or "unassigned", clear vesselName for consistency
        updateData.vesselName = null;
      }
    }

    const result = await db.update(equipment)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(and(...conditions))
      .returning();

    if (result.length === 0) {
      throw new Error(`Equipment ${id} not found`);
    }
    
    const updatedEquipment = result[0];
    
    // Broadcast equipment update to all connected clients
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.broadcastEquipmentChange('update', updatedEquipment);
    }
    
    return updatedEquipment;
  }

  async deleteEquipment(id: string, orgId?: string): Promise<void> {
    return await db.transaction(async (tx) => {
      const conditions = [eq(equipment.id, id)];
      if (orgId) conditions.push(eq(equipment.orgId, orgId));

      // Verify equipment exists before deletion
      const equipmentToDelete = await tx.select()
        .from(equipment)
        .where(and(...conditions))
        .limit(1);
      
      if (equipmentToDelete.length === 0) {
        throw new Error(`Equipment ${id} not found`);
      }

      // CASCADE DELETE: Delete all related data in correct order
      // 1. Sensor configurations and states
      await tx.delete(sensorConfigurations)
        .where(eq(sensorConfigurations.equipmentId, id));
      
      await tx.delete(sensorStates)
        .where(eq(sensorStates.equipmentId, id));
      
      // 2. Telemetry data
      await tx.delete(equipmentTelemetry)
        .where(eq(equipmentTelemetry.equipmentId, id));
      
      await tx.delete(rawTelemetry)
        .where(eq(rawTelemetry.equipmentId, id));
      
      // 3. Analytics and predictions
      await tx.delete(pdmScoreLogs)
        .where(eq(pdmScoreLogs.equipmentId, id));
      
      await tx.delete(anomalyDetections)
        .where(eq(anomalyDetections.equipmentId, id));
      
      await tx.delete(failurePredictions)
        .where(eq(failurePredictions.equipmentId, id));
      
      // 4. Vibration analysis data
      await tx.delete(vibrationFeatures)
        .where(eq(vibrationFeatures.equipmentId, id));
      
      await tx.delete(vibrationAnalysis)
        .where(eq(vibrationAnalysis.equipmentId, id));
      
      // 5. Digital twin data
      await tx.delete(twinSimulations)
        .where(eq(twinSimulations.equipmentId, id));
      
      // 6. Condition monitoring data
      await tx.delete(conditionMonitoring)
        .where(eq(conditionMonitoring.equipmentId, id));
      
      await tx.delete(oilAnalysis)
        .where(eq(oilAnalysis.equipmentId, id));
      
      await tx.delete(wearParticleAnalysis)
        .where(eq(wearParticleAnalysis.equipmentId, id));
      
      // 7. DTC faults
      await tx.delete(dtcFaults)
        .where(eq(dtcFaults.equipmentId, id));
      
      // 8. Insight snapshots and reports (if equipment-scoped)
      await tx.delete(insightReports)
        .where(eq(insightReports.equipmentId, id));
      
      await tx.delete(insightSnapshots)
        .where(eq(insightSnapshots.equipmentId, id));
      
      // 9. Finally delete the equipment itself
      const result = await tx.delete(equipment)
        .where(and(...conditions))
        .returning();

      const deletedEquipment = result[0];
      
      // Broadcast equipment deletion to all connected clients
      const wsServer = getWebSocketServer();
      if (wsServer && deletedEquipment) {
        wsServer.broadcastEquipmentChange('delete', { id: deletedEquipment.id });
      }
    });
  }

  // Vessel-Equipment association methods
  async getEquipmentByVessel(vesselId: string, orgId: string): Promise<Equipment[]> {
    // First get vessel name for legacy vesselName lookup
    const vessel = await db.select({ name: vessels.name })
      .from(vessels)
      .where(eq(vessels.id, vesselId))
      .limit(1);
    
    const vesselName = vessel[0]?.name;
    
    const equipmentList = await db.select()
      .from(equipment)
      .where(and(
        eq(equipment.orgId, orgId),
        or(
          eq(equipment.vesselId, vesselId),
          vesselName ? eq(equipment.vesselName, vesselName) : sql`false`
        )
      ))
      .orderBy(equipment.name);
    
    return equipmentList;
  }

  async associateEquipmentToVessel(equipmentId: string, vesselId: string, orgId: string): Promise<Equipment> {
    // Verify equipment exists and belongs to org
    const existingEquipment = await db.select()
      .from(equipment)
      .where(and(eq(equipment.id, equipmentId), eq(equipment.orgId, orgId)))
      .limit(1);
    
    if (existingEquipment.length === 0) {
      throw new Error(`Equipment ${equipmentId} not found`);
    }

    // Verify vessel exists and belongs to org
    const vessel = await db.select({ name: vessels.name })
      .from(vessels)
      .where(and(eq(vessels.id, vesselId), eq(vessels.orgId, orgId)))
      .limit(1);
    
    if (vessel.length === 0) {
      throw new Error(`Vessel ${vesselId} not found`);
    }

    // Update equipment with vessel association
    const [updated] = await db.update(equipment)
      .set({
        vesselId: vesselId,
        vesselName: vessel[0].name,
        updatedAt: new Date()
      })
      .where(eq(equipment.id, equipmentId))
      .returning();

    return updated;
  }

  async disassociateEquipmentFromVessel(equipmentId: string, orgId: string): Promise<void> {
    const result = await db.update(equipment)
      .set({
        vesselId: null,
        vesselName: null, // Clear vesselName for data integrity consistency
        updatedAt: new Date()
      })
      .where(and(eq(equipment.id, equipmentId), eq(equipment.orgId, orgId)))
      .returning();

    if (result.length === 0) {
      throw new Error(`Equipment ${equipmentId} not found`);
    }
  }

  async getWorkOrder(orgId: string, workOrderId: string): Promise<WorkOrder | undefined> {
    return undefined;
  }

  async getEquipmentSensorTypes(orgId: string, equipmentId: string): Promise<string[]> {
    return [];
  }

  // Optimizer v1: Fleet scheduling optimization
  async getOptimizerConfigurations(orgId?: string): Promise<OptimizerConfiguration[]> {
    let query = db.select().from(optimizerConfigurations);
    if (orgId) {
      query = query.where(eq(optimizerConfigurations.orgId, orgId));
    }
    const configs = await query;
    
    return configs.map(config => ({
      ...config,
      createdAt: config.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: config.updatedAt?.toISOString() || new Date().toISOString(),
    }));
  }

  async createOptimizerConfiguration(config: InsertOptimizerConfiguration): Promise<OptimizerConfiguration> {
    const [newConfig] = await db
      .insert(optimizerConfigurations)
      .values(config)
      .returning();
    
    return {
      ...newConfig,
      createdAt: newConfig.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: newConfig.updatedAt?.toISOString() || new Date().toISOString(),
    };
  }

  async updateOptimizerConfiguration(id: string, config: Partial<InsertOptimizerConfiguration>): Promise<OptimizerConfiguration> {
    const [updatedConfig] = await db
      .update(optimizerConfigurations)
      .set({ ...config, updatedAt: new Date() })
      .where(eq(optimizerConfigurations.id, id))
      .returning();
      
    if (!updatedConfig) {
      throw new Error(`Optimizer configuration ${id} not found`);
    }
    
    return {
      ...updatedConfig,
      createdAt: updatedConfig.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: updatedConfig.updatedAt?.toISOString() || new Date().toISOString(),
    };
  }

  async deleteOptimizerConfiguration(id: string): Promise<void> {
    const result = await db
      .delete(optimizerConfigurations)
      .where(eq(optimizerConfigurations.id, id))
      .returning();
      
    if (result.length === 0) {
      throw new Error(`Optimizer configuration ${id} not found`);
    }
  }

  // Resource constraints management (Stub implementations)
  async getResourceConstraints(resourceType?: string, orgId?: string): Promise<ResourceConstraint[]> {
    return [];
  }

  async createResourceConstraint(constraint: InsertResourceConstraint): Promise<ResourceConstraint> {
    throw new Error('Optimizer database tables not yet implemented. Use MemStorage for development.');
  }

  async updateResourceConstraint(id: string, constraint: Partial<InsertResourceConstraint>): Promise<ResourceConstraint> {
    throw new Error('Optimizer database tables not yet implemented. Use MemStorage for development.');
  }

  async deleteResourceConstraint(id: string): Promise<void> {
    throw new Error('Optimizer database tables not yet implemented. Use MemStorage for development.');
  }

  // Optimization execution and results
  async runOptimization(configId: string, equipmentScope?: string[], timeHorizon?: number): Promise<OptimizationResult> {
    const startTime = new Date();
    
    // Create a new optimization result record
    const [result] = await db
      .insert(optimizationResults)
      .values({
        configurationId: configId,
        orgId: 'default-org-id',
        runStatus: 'running',
        equipmentScope: equipmentScope ? JSON.stringify(equipmentScope) : null,
        timeHorizon: timeHorizon || 90,
        totalSchedules: 0,
      })
      .returning();
    
    // Simulate optimization execution (for demo purposes)
    // In production, this would be moved to a background job queue
    const simulationDelay = 1500 + Math.random() * 1500; // 1.5-3 seconds
    await new Promise(resolve => setTimeout(resolve, simulationDelay));
    
    // Generate mock optimization results
    const equipmentCount = equipmentScope?.length || 5;
    const totalSchedules = Math.floor(equipmentCount * (1 + Math.random() * 2)); // 1-3 schedules per equipment
    const totalCostEstimate = totalSchedules * (2000 + Math.random() * 3000);
    const costSavings = totalCostEstimate * (0.15 + Math.random() * 0.25); // 15-40% savings
    const conflictsResolved = Math.floor(totalSchedules * (Math.random() * 0.3)); // 0-30% conflicts
    const optimizationScore = 70 + Math.random() * 25; // 70-95 score
    
    const resourceUtilization = {
      technicians: {
        utilized: Math.floor(50 + Math.random() * 40),
        available: 100,
        utilization: 0.5 + Math.random() * 0.4
      },
      parts: {
        utilized: Math.floor(60 + Math.random() * 30),
        available: 100,
        utilization: 0.6 + Math.random() * 0.3
      }
    };
    
    const algorithmMetrics = {
      iterations: Math.floor(50 + Math.random() * 100),
      convergenceTime: simulationDelay,
      algorithmType: 'greedy',
      feasible: true
    };
    
    const recommendations = Array.from({ length: totalSchedules }, (_, i) => ({
      id: crypto.randomUUID(),
      equipmentId: equipmentScope?.[i % equipmentCount] || `equipment-${i}`,
      recommendedDate: new Date(Date.now() + (i + 1) * 7 * 24 * 60 * 60 * 1000).toISOString(),
      priority: Math.floor(1 + Math.random() * 3),
      estimatedCost: 2000 + Math.random() * 3000,
      reasoning: 'Optimized based on urgency and cost factors'
    }));
    
    const endTime = new Date();
    const executionTimeMs = endTime.getTime() - startTime.getTime();
    
    // Update the result with completion data
    const [completedResult] = await db
      .update(optimizationResults)
      .set({
        runStatus: 'completed',
        endTime,
        executionTimeMs,
        totalSchedules,
        totalCostEstimate,
        costSavings,
        resourceUtilization: JSON.stringify(resourceUtilization),
        conflictsResolved,
        optimizationScore,
        algorithmMetrics: JSON.stringify(algorithmMetrics),
        recommendations: JSON.stringify(recommendations),
        updatedAt: new Date(),
      })
      .where(eq(optimizationResults.id, result.id))
      .returning();
    
    return {
      ...completedResult,
      startTime: completedResult.startTime?.toISOString() || new Date().toISOString(),
      endTime: completedResult.endTime?.toISOString() || null,
      createdAt: completedResult.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: completedResult.updatedAt?.toISOString() || new Date().toISOString(),
    };
  }

  async getOptimizationResults(orgId?: string, limit?: number): Promise<OptimizationResult[]> {
    let query = db.select().from(optimizationResults);
    if (orgId) {
      query = query.where(eq(optimizationResults.orgId, orgId));
    }
    if (limit) {
      query = query.limit(limit);
    }
    query = query.orderBy(sql`${optimizationResults.startTime} DESC`);
    
    const results = await query;
    return results.map(result => ({
      ...result,
      startTime: result.startTime?.toISOString() || new Date().toISOString(),
      endTime: result.endTime?.toISOString() || null,
      createdAt: result.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: result.updatedAt?.toISOString() || new Date().toISOString(),
    }));
  }

  async getOptimizationResult(id: string): Promise<OptimizationResult | undefined> {
    const [result] = await db
      .select()
      .from(optimizationResults)
      .where(eq(optimizationResults.id, id))
      .limit(1);
    
    if (!result) return undefined;
    
    return {
      ...result,
      startTime: result.startTime?.toISOString() || new Date().toISOString(),
      endTime: result.endTime?.toISOString() || null,
      createdAt: result.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: result.updatedAt?.toISOString() || new Date().toISOString(),
    };
  }

  async cancelOptimization(optimizationId: string): Promise<OptimizationResult> {
    // First get the current optimization result
    const currentResult = await this.getOptimizationResult(optimizationId);
    if (!currentResult) {
      throw new Error(`Optimization ${optimizationId} not found`);
    }

    if (currentResult.runStatus !== 'running') {
      throw new Error(`Cannot cancel optimization ${optimizationId}: status is ${currentResult.runStatus}`);
    }

    // Update the optimization result to cancelled (marked as failed)
    const [updatedResult] = await db
      .update(optimizationResults)
      .set({
        runStatus: 'failed',
        endTime: new Date(),
        executionTimeMs: Date.now() - new Date(currentResult.startTime).getTime(),
        updatedAt: new Date(),
      })
      .where(eq(optimizationResults.id, optimizationId))
      .returning();

    if (!updatedResult) {
      throw new Error(`Failed to cancel optimization ${optimizationId}`);
    }

    return {
      ...updatedResult,
      startTime: updatedResult.startTime?.toISOString() || new Date().toISOString(),
      endTime: updatedResult.endTime?.toISOString() || null,
      createdAt: updatedResult.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: updatedResult.updatedAt?.toISOString() || new Date().toISOString(),
    };
  }

  // Schedule optimization recommendations (Stub implementations)
  async getScheduleOptimizations(optimizationResultId: string): Promise<ScheduleOptimization[]> {
    return [];
  }

  async applyScheduleOptimization(optimizationId: string): Promise<MaintenanceSchedule> {
    throw new Error('Optimizer database tables not yet implemented. Use MemStorage for development.');
  }

  async rejectScheduleOptimization(optimizationId: string, reason?: string): Promise<ScheduleOptimization> {
    throw new Error('Optimizer database tables not yet implemented. Use MemStorage for development.');
  }

  async getOptimizationRecommendations(equipmentId?: string, timeHorizon?: number): Promise<ScheduleOptimization[]> {
    return [];
  }

  // RAG Search System: Knowledge base and enhanced citations (Stub implementations - DB tables not yet created)
  async searchKnowledgeBase(query: string, filters?: { contentType?: string[]; orgId?: string; equipmentId?: string; }): Promise<KnowledgeBaseItem[]> {
    return [];
  }

  async createKnowledgeBaseItem(item: InsertKnowledgeBaseItem): Promise<KnowledgeBaseItem> {
    throw new Error('RAG search database tables not yet implemented. Use MemStorage for development.');
  }

  async updateKnowledgeBaseItem(id: string, item: Partial<InsertKnowledgeBaseItem>): Promise<KnowledgeBaseItem> {
    throw new Error('RAG search database tables not yet implemented. Use MemStorage for development.');
  }

  async deleteKnowledgeBaseItem(id: string): Promise<void> {
    throw new Error('RAG search database tables not yet implemented. Use MemStorage for development.');
  }

  async getKnowledgeBaseItems(orgId?: string, contentType?: string): Promise<KnowledgeBaseItem[]> {
    return [];
  }

  // Content source management for citations (Stub implementations)
  async getContentSources(orgId?: string, sourceType?: string): Promise<ContentSource[]> {
    return [];
  }

  async createContentSource(source: InsertContentSource): Promise<ContentSource> {
    throw new Error('RAG search database tables not yet implemented. Use MemStorage for development.');
  }

  async updateContentSource(id: string, source: Partial<InsertContentSource>): Promise<ContentSource> {
    throw new Error('RAG search database tables not yet implemented. Use MemStorage for development.');
  }

  // RAG search query logging and analytics (Stub implementations)
  async logRagSearchQuery(query: InsertRagSearchQuery): Promise<RagSearchQuery> {
    throw new Error('RAG search database tables not yet implemented. Use MemStorage for development.');
  }

  async getRagSearchHistory(orgId?: string, limit?: number): Promise<RagSearchQuery[]> {
    return [];
  }

  // Enhanced search methods for LLM report generation (Stub implementations)
  async semanticSearch(query: string, orgId: string, contentTypes?: string[], limit?: number): Promise<{ items: KnowledgeBaseItem[]; citations: ContentSource[]; }> {
    return { items: [], citations: [] };
  }

  async indexContent(sourceType: string, sourceId: string, content: string, metadata?: Record<string, any>, orgId?: string): Promise<KnowledgeBaseItem> {
    throw new Error('RAG search database tables not yet implemented. Use MemStorage for development.');
  }

  async refreshContentIndex(orgId?: string, sourceTypes?: string[]): Promise<{ indexed: number; updated: number; }> {
    return { indexed: 0, updated: 0 };
  }

  // ============================================================================
  // ADVANCED PDM STORAGE METHODS IMPLEMENTATION
  // ============================================================================

  // Vibration Analysis Methods
  async getVibrationFeatures(equipmentId?: string, orgId?: string): Promise<VibrationFeature[]> {
    let query = db.select().from(vibrationFeatures);
    
    const conditions = [];
    if (orgId) conditions.push(eq(vibrationFeatures.orgId, orgId));
    if (equipmentId) conditions.push(eq(vibrationFeatures.equipmentId, equipmentId));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(vibrationFeatures.createdAt));
  }

  async createVibrationFeature(feature: InsertVibrationFeature): Promise<VibrationFeature> {
    const result = await db.insert(vibrationFeatures).values({
      ...feature,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async getVibrationHistory(equipmentId: string, hours: number = 24, orgId?: string): Promise<VibrationFeature[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const conditions = [
      eq(vibrationFeatures.equipmentId, equipmentId),
      gte(vibrationFeatures.createdAt, since)
    ];
    
    if (orgId) conditions.push(eq(vibrationFeatures.orgId, orgId));
    
    return await db.select().from(vibrationFeatures)
      .where(and(...conditions))
      .orderBy(desc(vibrationFeatures.createdAt));
  }

  // Beast Mode: Advanced Vibration Analysis Methods
  async createVibrationAnalysis(analysis: Omit<VibrationAnalysis, 'id' | 'createdAt'>): Promise<VibrationAnalysis> {
    const result = await db.insert(vibrationAnalysis).values({
      ...analysis,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async getVibrationAnalysisHistory(orgId: string, equipmentId: string, limit: number = 50): Promise<VibrationAnalysis[]> {
    const conditions = [
      eq(vibrationAnalysis.orgId, orgId),
      eq(vibrationAnalysis.equipmentId, equipmentId)
    ];
    
    return await db.select().from(vibrationAnalysis)
      .where(and(...conditions))
      .orderBy(desc(vibrationAnalysis.timestamp))
      .limit(limit);
  }

  // Beast Mode: Weibull RUL Analysis Methods
  async createWeibullAnalysis(analysis: Omit<WeibullEstimate, 'id' | 'createdAt'>): Promise<WeibullEstimate> {
    const result = await db.insert(weibullEstimates).values({
      ...analysis,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async getWeibullAnalysisHistory(equipmentId: string, orgId: string, limit: number = 50): Promise<WeibullEstimate[]> {
    const conditions = [
      eq(weibullEstimates.equipmentId, equipmentId),
      eq(weibullEstimates.orgId, orgId)
    ];
    
    const result = await db
      .select()
      .from(weibullEstimates)
      .where(and(...conditions))
      .orderBy(desc(weibullEstimates.createdAt))
      .limit(limit);
      
    return result.length ? result : [];
  }

  // RUL Model Methods
  async getRulModels(componentClass?: string, orgId?: string): Promise<RulModel[]> {
    let query = db.select().from(rulModels);
    
    const conditions = [];
    if (orgId) conditions.push(eq(rulModels.orgId, orgId));
    if (componentClass) conditions.push(eq(rulModels.componentClass, componentClass));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(rulModels.createdAt));
  }

  async getRulModel(modelId: string, orgId?: string): Promise<RulModel | undefined> {
    const conditions = [eq(rulModels.modelId, modelId)];
    if (orgId) conditions.push(eq(rulModels.orgId, orgId));
    
    const result = await db.select().from(rulModels)
      .where(and(...conditions))
      .limit(1);
    
    return result[0];
  }

  async createRulModel(model: InsertRulModel): Promise<RulModel> {
    const result = await db.insert(rulModels).values({
      ...model,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async updateRulModel(id: string, model: Partial<InsertRulModel>): Promise<RulModel> {
    const result = await db.update(rulModels)
      .set(model)
      .where(eq(rulModels.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`RUL model ${id} not found`);
    }
    return result[0];
  }

  async deleteRulModel(id: string): Promise<void> {
    await db.delete(rulModels).where(eq(rulModels.id, id));
  }

  // Parts Management Methods
  async getParts(orgId?: string): Promise<Part[]> {
    let query = db.select().from(parts);
    
    if (orgId) {
      query = query.where(eq(parts.orgId, orgId));
    }
    
    return await query.orderBy(parts.partNo);
  }

  async getPartByNumber(partNo: string, orgId?: string): Promise<Part | undefined> {
    const conditions = [eq(parts.partNo, partNo)];
    if (orgId) conditions.push(eq(parts.orgId, orgId));
    
    const result = await db.select().from(parts)
      .where(and(...conditions))
      .limit(1);
    
    return result[0];
  }

  // Parts catalog functionality temporarily disabled - use parts inventory instead

  // Parts catalog update functionality temporarily disabled - use parts inventory instead

  async deletePart(id: string): Promise<void> {
    await db.delete(parts).where(eq(parts.id, id));
  }

  // Parts-Stock Cost Synchronization Engine
  async syncPartCostToStock(partId: string): Promise<void> {
    console.log(`[DatabaseStorage.syncPartCostToStock] Starting cost sync for part ${partId}`);
    
    try {
      // Step 1: Get the part's current standardCost and partNo
      const part = await db.select({
        id: parts.id,
        partNo: parts.partNo,
        standardCost: parts.standardCost,
        orgId: parts.orgId
      })
      .from(parts)
      .where(eq(parts.id, partId))
      .limit(1);
      
      if (part.length === 0) {
        throw new Error(`Part ${partId} not found`);
      }
      
      const { partNo, standardCost, orgId } = part[0];
      console.log(`[DatabaseStorage.syncPartCostToStock] Found part ${partNo} with standardCost ${standardCost}`);
      
      // Step 2: Update partsInventory records that match this part (by partNumber)
      const partsInventoryUpdates = await db.update(partsInventory)
        .set({ 
          unitCost: standardCost, 
          updatedAt: new Date() 
        })
        .where(and(
          eq(partsInventory.partNumber, partNo),
          eq(partsInventory.orgId, orgId)
        ))
        .returning({ id: partsInventory.id });
      
      console.log(`[DatabaseStorage.syncPartCostToStock] Updated ${partsInventoryUpdates.length} partsInventory records`);
      
      // Step 3: Update stock records that match this part (by partNo, since partId may be NULL)
      const stockUpdates = await db.update(stock)
        .set({ 
          unitCost: standardCost, 
          updatedAt: new Date() 
        })
        .where(and(
          eq(stock.partNo, partNo),
          eq(stock.orgId, orgId)
        ))
        .returning({ id: stock.id });
      
      console.log(`[DatabaseStorage.syncPartCostToStock] Updated ${stockUpdates.length} stock records`);
      
      // Log detailed sync results
      console.log(`[DatabaseStorage.syncPartCostToStock] Synchronization completed successfully:`);
      console.log(`  - Part: ${partNo} (${partId})`);
      console.log(`  - New cost: ${standardCost}`);
      console.log(`  - PartsInventory records updated: ${partsInventoryUpdates.length}`);
      console.log(`  - Stock records updated: ${stockUpdates.length}`);
      
    } catch (error) {
      console.error(`[DatabaseStorage.syncPartCostToStock] Error during cost sync:`, error);
      throw error; // Re-throw to let the API handler deal with it
    }
    
    console.log(`[DatabaseStorage.syncPartCostToStock] Cost synchronization completed for part ${partId}`);
  }

  // Supplier Management Methods
  async getSuppliers(orgId?: string): Promise<Supplier[]> {
    let query = db.select().from(suppliers);
    
    if (orgId) {
      query = query.where(eq(suppliers.orgId, orgId));
    }
    
    return await query.orderBy(suppliers.name);
  }

  async getSupplier(id: string, orgId?: string): Promise<Supplier | undefined> {
    const conditions = [eq(suppliers.id, id)];
    if (orgId) conditions.push(eq(suppliers.orgId, orgId));
    
    const result = await db.select().from(suppliers)
      .where(and(...conditions))
      .limit(1);
    
    return result[0];
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const result = await db.insert(suppliers).values({
      ...supplier,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return result[0];
  }

  async updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier> {
    const result = await db.update(suppliers)
      .set({ ...supplier, updatedAt: new Date() })
      .where(eq(suppliers.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Supplier ${id} not found`);
    }
    return result[0];
  }

  async deleteSupplier(id: string): Promise<void> {
    await db.delete(suppliers).where(eq(suppliers.id, id));
  }

  // Stock Management Methods
  async getStockByPart(partId: string, orgId?: string): Promise<Stock[]> {
    const conditions = [eq(stock.partId, partId)];
    if (orgId) conditions.push(eq(stock.orgId, orgId));
    
    return await db.select().from(stock)
      .where(and(...conditions));
  }

  async createStock(stockData: InsertStock): Promise<Stock> {
    const result = await db.insert(stock).values({
      ...stockData,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return result[0];
  }

  async updateStock(id: string, stockData: Partial<InsertStock>): Promise<Stock> {
    const result = await db.update(stock)
      .set({ ...stockData, updatedAt: new Date() })
      .where(eq(stock.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Stock ${id} not found`);
    }
    return result[0];
  }

  // Part Substitution Methods
  async getPartSubstitutions(partId: string, orgId?: string): Promise<PartSubstitution[]> {
    const conditions = [eq(partSubstitutions.originalPartId, partId)];
    if (orgId) conditions.push(eq(partSubstitutions.orgId, orgId));
    
    return await db.select().from(partSubstitutions)
      .where(and(...conditions));
  }

  async createPartSubstitution(substitution: InsertPartSubstitution): Promise<PartSubstitution> {
    const result = await db.insert(partSubstitutions).values({
      ...substitution,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async deletePartSubstitution(id: string): Promise<void> {
    await db.delete(partSubstitutions).where(eq(partSubstitutions.id, id));
  }

  // Compliance Bundle Methods
  async getComplianceBundles(orgId?: string): Promise<ComplianceBundle[]> {
    let query = db.select().from(complianceBundles);
    
    if (orgId) {
      query = query.where(eq(complianceBundles.orgId, orgId));
    }
    
    return await query.orderBy(desc(complianceBundles.generatedAt));
  }

  async createComplianceBundle(bundle: InsertComplianceBundle): Promise<ComplianceBundle> {
    const result = await db.insert(complianceBundles).values({
      ...bundle,
      generatedAt: new Date()
    }).returning();
    return result[0];
  }

  async getComplianceBundle(bundleId: string, orgId?: string): Promise<ComplianceBundle | undefined> {
    const conditions = [eq(complianceBundles.bundleId, bundleId)];
    if (orgId) conditions.push(eq(complianceBundles.orgId, orgId));
    
    const result = await db.select().from(complianceBundles)
      .where(and(...conditions))
      .limit(1);
    
    return result[0];
  }

  async updateComplianceBundle(id: string, bundle: Partial<InsertComplianceBundle>): Promise<ComplianceBundle> {
    const result = await db.update(complianceBundles)
      .set(bundle)
      .where(eq(complianceBundles.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Compliance bundle ${id} not found`);
    }
    return result[0];
  }

  // ===== CREW MANAGEMENT METHODS =====

  async getCrew(orgId?: string, vesselId?: string): Promise<CrewWithSkills[]> {
    const conditions = [];
    if (orgId) conditions.push(eq(crew.orgId, orgId));
    if (vesselId) conditions.push(eq(crew.vesselId, vesselId));
    
    const crewMembers = await db.select().from(crew)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(crew.name);
    
    // Fetch skills for each crew member
    const crewWithSkills: CrewWithSkills[] = [];
    for (const member of crewMembers) {
      const skills = await db.select({ skill: crewSkill.skill })
        .from(crewSkill)
        .where(eq(crewSkill.crewId, member.id));
      
      crewWithSkills.push({
        ...member,
        skills: skills.map(s => s.skill)
      });
    }
    
    return crewWithSkills;
  }

  async getCrewMember(id: string, orgId?: string): Promise<SelectCrew | undefined> {
    const conditions = [eq(crew.id, id)];
    if (orgId) conditions.push(eq(crew.orgId, orgId));
    
    const result = await db.select().from(crew)
      .where(and(...conditions))
      .limit(1);
    
    return result[0];
  }

  async createCrew(crewData: InsertCrew): Promise<SelectCrew> {
    // Validate vessel_id is provided (now required by schema)
    if (!crewData.vesselId) {
      throw new Error('vessel_id is required for crew creation');
    }

    // Validate that vessel exists
    const vessel = await db.select({ id: vessels.id })
      .from(vessels)
      .where(eq(vessels.id, crewData.vesselId))
      .limit(1);
    
    if (vessel.length === 0) {
      throw new Error('vessel not found');
    }

    const result = await db.insert(crew).values({
      ...crewData,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    const newCrew = result[0];
    
    // Broadcast crew creation to all connected clients
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.broadcastCrewChange('create', newCrew);
    }
    
    return newCrew;
  }

  async updateCrew(id: string, crewData: Partial<InsertCrew>): Promise<SelectCrew> {
    const result = await db.update(crew)
      .set({ ...crewData, updatedAt: new Date() })
      .where(eq(crew.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Crew member ${id} not found`);
    }
    
    const updatedCrew = result[0];
    
    // Broadcast crew update to all connected clients
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.broadcastCrewChange('update', updatedCrew);
    }
    
    return updatedCrew;
  }

  async deleteCrew(id: string): Promise<void> {
    return await db.transaction(async (tx) => {
      // Get crew data before deletion for broadcast
      const crewToDelete = await tx.select().from(crew).where(eq(crew.id, id)).limit(1);
      
      if (crewToDelete.length === 0) {
        throw new Error(`Crew member ${id} not found`);
      }
      
      // CASCADE DELETE: Delete all crew-related data
      // 1. Crew skills and proficiency levels
      await tx.delete(crewSkill).where(eq(crewSkill.crewId, id));
      
      // 2. Crew leave records
      await tx.delete(crewLeave).where(eq(crewLeave.crewId, id));
      
      // 3. Crew assignments to vessels and shifts
      await tx.delete(crewAssignment).where(eq(crewAssignment.crewId, id));
      
      // 4. Crew certifications (licenses, training certificates)
      await tx.delete(crewCertification).where(eq(crewCertification.crewId, id));
      
      // 5. STCW Hours of Rest data - get rest sheet IDs first, then delete related days
      const restSheets = await tx.select({ id: crewRestSheet.id })
        .from(crewRestSheet)
        .where(eq(crewRestSheet.crewId, id));
      
      for (const sheet of restSheets) {
        await tx.delete(crewRestDay).where(eq(crewRestDay.sheetId, sheet.id));
      }
      
      await tx.delete(crewRestSheet).where(eq(crewRestSheet.crewId, id));
      
      // 6. Delete crew member
      await tx.delete(crew).where(eq(crew.id, id));
      
      // Broadcast crew deletion to all connected clients
      const wsServer = getWebSocketServer();
      if (wsServer && crewToDelete.length > 0) {
        wsServer.broadcastCrewChange('delete', { id: crewToDelete[0].id });
      }
    });
  }

  // Crew Skills Methods
  async setCrewSkill(crewId: string, skill: string, level: number): Promise<SelectCrewSkill> {
    const result = await db.insert(crewSkill).values({
      crewId,
      skill,
      level
    }).onConflictDoUpdate({
      target: [crewSkill.crewId, crewSkill.skill],
      set: { level }
    }).returning();
    return result[0];
  }

  async getCrewSkills(crewId: string): Promise<SelectCrewSkill[]> {
    return await db.select().from(crewSkill)
      .where(eq(crewSkill.crewId, crewId))
      .orderBy(crewSkill.skill);
  }

  async deleteCrewSkill(crewId: string, skill: string): Promise<void> {
    await db.delete(crewSkill)
      .where(and(eq(crewSkill.crewId, crewId), eq(crewSkill.skill, skill)));
  }

  // Skills Master Catalog Methods
  async getSkills(orgId?: string): Promise<SelectSkill[]> {
    const conditions = [];
    if (orgId) conditions.push(eq(skills.orgId, orgId));
    else conditions.push(eq(skills.orgId, "default-org-id")); // Default org scope
    conditions.push(eq(skills.active, true));
    
    return await db.select().from(skills)
      .where(and(...conditions))
      .orderBy(skills.category, skills.name);
  }

  async createSkill(skill: InsertSkill): Promise<SelectSkill> {
    const result = await db.insert(skills).values(skill).returning();
    return result[0];
  }

  async updateSkill(id: string, skill: Partial<InsertSkill>): Promise<SelectSkill> {
    const result = await db.update(skills)
      .set({ ...skill, updatedAt: new Date() })
      .where(eq(skills.id, id))
      .returning();
    return result[0];
  }

  async deleteSkill(id: string): Promise<void> {
    await db.delete(skills).where(eq(skills.id, id));
  }

  // Crew Leave Methods
  async getCrewLeave(crewId?: string, startDate?: Date, endDate?: Date): Promise<SelectCrewLeave[]> {
    const conditions = [];
    if (crewId) conditions.push(eq(crewLeave.crewId, crewId));
    if (startDate) conditions.push(gte(crewLeave.end, startDate));
    if (endDate) conditions.push(lte(crewLeave.start, endDate));
    
    return await db.select().from(crewLeave)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(crewLeave.start);
  }

  async createCrewLeave(leaveData: InsertCrewLeave): Promise<SelectCrewLeave> {
    const result = await db.insert(crewLeave).values({
      ...leaveData,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async updateCrewLeave(id: string, leaveData: Partial<InsertCrewLeave>): Promise<SelectCrewLeave> {
    const result = await db.update(crewLeave)
      .set(leaveData)
      .where(eq(crewLeave.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Leave record ${id} not found`);
    }
    return result[0];
  }

  async deleteCrewLeave(id: string): Promise<void> {
    await db.delete(crewLeave).where(eq(crewLeave.id, id));
  }

  // Shift Template Methods
  async getShiftTemplates(vesselId?: string): Promise<SelectShiftTemplate[]> {
    const conditions = [];
    if (vesselId) conditions.push(eq(shiftTemplate.vesselId, vesselId));
    
    return await db.select().from(shiftTemplate)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(shiftTemplate.start);
  }

  async getShiftTemplate(id: string): Promise<SelectShiftTemplate | undefined> {
    const result = await db.select().from(shiftTemplate)
      .where(eq(shiftTemplate.id, id))
      .limit(1);
    
    return result[0];
  }

  async createShiftTemplate(templateData: InsertShiftTemplate): Promise<SelectShiftTemplate> {
    const result = await db.insert(shiftTemplate).values({
      ...templateData,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async updateShiftTemplate(id: string, templateData: Partial<InsertShiftTemplate>): Promise<SelectShiftTemplate> {
    const result = await db.update(shiftTemplate)
      .set(templateData)
      .where(eq(shiftTemplate.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Shift template ${id} not found`);
    }
    return result[0];
  }

  async deleteShiftTemplate(id: string): Promise<void> {
    await db.delete(shiftTemplate).where(eq(shiftTemplate.id, id));
  }

  // Crew Assignment Methods
  async getCrewAssignments(date?: string, crewId?: string, vesselId?: string): Promise<SelectCrewAssignment[]> {
    const conditions = [];
    if (date) conditions.push(eq(crewAssignment.date, date));
    if (crewId) conditions.push(eq(crewAssignment.crewId, crewId));
    if (vesselId) conditions.push(eq(crewAssignment.vesselId, vesselId));
    
    return await db.select().from(crewAssignment)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(crewAssignment.start);
  }

  async createCrewAssignment(assignmentData: InsertCrewAssignment): Promise<SelectCrewAssignment> {
    const result = await db.insert(crewAssignment).values({
      ...assignmentData,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async updateCrewAssignment(id: string, assignmentData: Partial<InsertCrewAssignment>): Promise<SelectCrewAssignment> {
    const result = await db.update(crewAssignment)
      .set(assignmentData)
      .where(eq(crewAssignment.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Assignment ${id} not found`);
    }
    return result[0];
  }

  async deleteCrewAssignment(id: string): Promise<void> {
    await db.delete(crewAssignment).where(eq(crewAssignment.id, id));
  }

  async createBulkCrewAssignments(assignments: InsertCrewAssignment[]): Promise<SelectCrewAssignment[]> {
    if (assignments.length === 0) return [];
    
    const assignmentsWithTimestamps = assignments.map(assignment => ({
      ...assignment,
      createdAt: new Date()
    }));
    
    const result = await db.insert(crewAssignment)
      .values(assignmentsWithTimestamps)
      .returning();
    
    return result;
  }

  // ===== CREW EXTENSIONS: CERTIFICATIONS, PORT CALLS, DRYDOCK WINDOWS =====

  // Crew Certifications
  async getCrewCertifications(crewId?: string): Promise<SelectCrewCertification[]> {
    let query = db.select().from(crewCertification);
    
    if (crewId) {
      query = query.where(eq(crewCertification.crewId, crewId));
    }
    
    return query.orderBy(crewCertification.expiresAt);
  }

  async createCrewCertification(cert: InsertCrewCertification): Promise<SelectCrewCertification> {
    const [newCert] = await db.insert(crewCertification)
      .values(cert)
      .returning();
    return newCert;
  }

  async updateCrewCertification(id: string, cert: Partial<InsertCrewCertification>): Promise<SelectCrewCertification> {
    const [updated] = await db.update(crewCertification)
      .set(cert)
      .where(eq(crewCertification.id, id))
      .returning();
    
    if (!updated) {
      throw new Error(`Crew certification ${id} not found`);
    }
    
    return updated;
  }

  async deleteCrewCertification(id: string): Promise<void> {
    const result = await db.delete(crewCertification)
      .where(eq(crewCertification.id, id));
    
    if (result.rowCount === 0) {
      throw new Error(`Crew certification ${id} not found`);
    }
  }

  // Port Calls (vessel constraints)
  async getPortCalls(vesselId?: string): Promise<SelectPortCall[]> {
    let query = db.select().from(portCall);
    
    if (vesselId) {
      query = query.where(eq(portCall.vesselId, vesselId));
    }
    
    return query.orderBy(portCall.start);
  }

  async createPortCall(portCallData: InsertPortCall): Promise<SelectPortCall> {
    const [newPortCall] = await db.insert(portCall)
      .values(portCallData)
      .returning();
    return newPortCall;
  }

  async updatePortCall(id: string, portCallData: Partial<InsertPortCall>): Promise<SelectPortCall> {
    const [updated] = await db.update(portCall)
      .set(portCallData)
      .where(eq(portCall.id, id))
      .returning();
    
    if (!updated) {
      throw new Error(`Port call ${id} not found`);
    }
    
    return updated;
  }

  async deletePortCall(id: string): Promise<void> {
    const result = await db.delete(portCall)
      .where(eq(portCall.id, id));
    
    if (result.rowCount === 0) {
      throw new Error(`Port call ${id} not found`);
    }
  }

  // Drydock Windows (vessel constraints)
  async getDrydockWindows(vesselId?: string): Promise<SelectDrydockWindow[]> {
    let query = db.select().from(drydockWindow);
    
    if (vesselId) {
      query = query.where(eq(drydockWindow.vesselId, vesselId));
    }
    
    return query.orderBy(drydockWindow.start);
  }

  async createDrydockWindow(drydockData: InsertDrydockWindow): Promise<SelectDrydockWindow> {
    const [newDrydock] = await db.insert(drydockWindow)
      .values(drydockData)
      .returning();
    return newDrydock;
  }

  async updateDrydockWindow(id: string, drydockData: Partial<InsertDrydockWindow>): Promise<SelectDrydockWindow> {
    const [updated] = await db.update(drydockWindow)
      .set(drydockData)
      .where(eq(drydockWindow.id, id))
      .returning();
    
    if (!updated) {
      throw new Error(`Drydock window ${id} not found`);
    }
    
    return updated;
  }

  async deleteDrydockWindow(id: string): Promise<void> {
    const result = await db.delete(drydockWindow)
      .where(eq(drydockWindow.id, id));
    
    if (result.rowCount === 0) {
      throw new Error(`Drydock window ${id} not found`);
    }
  }

  // ===== VESSEL MANAGEMENT =====

  async getVessels(orgId?: string): Promise<SelectVessel[]> {
    let query = db.select().from(vessels);
    
    if (orgId) {
      query = query.where(eq(vessels.orgId, orgId));
    }
    
    return query.orderBy(vessels.name);
  }

  async getVessel(id: string, orgId?: string): Promise<SelectVessel | undefined> {
    let query = db.select().from(vessels).where(eq(vessels.id, id));
    
    if (orgId) {
      query = query.where(and(eq(vessels.id, id), eq(vessels.orgId, orgId)));
    }
    
    const results = await query.limit(1);
    return results[0];
  }

  async createVessel(vesselData: InsertVessel): Promise<SelectVessel> {
    const [newVessel] = await db.insert(vessels)
      .values(vesselData)
      .returning();
    
    // Broadcast vessel creation to all connected clients
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.broadcastVesselChange('create', newVessel);
    }
    
    return newVessel;
  }

  async updateVessel(id: string, vesselData: Partial<InsertVessel>): Promise<SelectVessel> {
    const [updated] = await db.update(vessels)
      .set(vesselData)
      .where(eq(vessels.id, id))
      .returning();
    
    if (!updated) {
      throw new Error(`Vessel ${id} not found`);
    }
    
    // Broadcast vessel update to all connected clients
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.broadcastVesselChange('update', updated);
    }
    
    return updated;
  }

  // Helper method to delete equipment within a transaction
  private async deleteEquipmentInTransaction(tx: any, equipmentId: string): Promise<void> {
    // CASCADE DELETE: Delete all related data using raw SQL to avoid Drizzle + TimescaleDB hypertable issues
    
    // 1. Sensor configurations and states
    await tx.execute(sql`DELETE FROM sensor_configurations WHERE equipment_id = ${equipmentId}`);
    await tx.execute(sql`DELETE FROM sensor_states WHERE equipment_id = ${equipmentId}`);
    
    // 2. Telemetry data (TimescaleDB hypertable with composite primary key)
    await tx.execute(sql`DELETE FROM equipment_telemetry WHERE equipment_id = ${equipmentId}`);
    // Note: raw_telemetry is organized by vessel, not equipment, so skip it
    
    // 3. Analytics and predictions
    await tx.execute(sql`DELETE FROM pdm_score_logs WHERE equipment_id = ${equipmentId}`);
    await tx.execute(sql`DELETE FROM anomaly_detections WHERE equipment_id = ${equipmentId}`);
    await tx.execute(sql`DELETE FROM failure_predictions WHERE equipment_id = ${equipmentId}`);
    
    // 4. Vibration analysis data
    await tx.execute(sql`DELETE FROM vibration_features WHERE equipment_id = ${equipmentId}`);
    await tx.execute(sql`DELETE FROM vibration_analysis WHERE equipment_id = ${equipmentId}`);
    
    // 5. Digital twin data (skip - table doesn't exist in database)
    
    // 6. Condition monitoring data
    await tx.execute(sql`DELETE FROM condition_monitoring WHERE equipment_id = ${equipmentId}`);
    await tx.execute(sql`DELETE FROM oil_analysis WHERE equipment_id = ${equipmentId}`);
    await tx.execute(sql`DELETE FROM wear_particle_analysis WHERE equipment_id = ${equipmentId}`);
    
    // 7. DTC faults
    await tx.execute(sql`DELETE FROM dtc_faults WHERE equipment_id = ${equipmentId}`);
    
    // 8. Work orders
    await tx.execute(sql`DELETE FROM work_orders WHERE equipment_id = ${equipmentId}`);
    
    // 9. Maintenance schedules
    await tx.execute(sql`DELETE FROM maintenance_schedules WHERE equipment_id = ${equipmentId}`);
    
    // 10. Alert configurations
    await tx.execute(sql`DELETE FROM alert_configurations WHERE equipment_id = ${equipmentId}`);
    
    // 11. Insight snapshots and reports (organized by scope, not equipment - skip)
    
    // 12. Finally delete the equipment itself
    await tx.execute(sql`DELETE FROM equipment WHERE id = ${equipmentId}`);
  }

  async deleteVessel(id: string, deleteEquipment: boolean = true, orgId?: string): Promise<void> {
    return await db.transaction(async (tx) => {
      console.log(`[DELETE VESSEL] Starting deletion of vessel ${id}`);
      
      // First, get the vessel data before deletion for broadcast and org validation
      const vesselToDelete = await tx.select().from(vessels).where(eq(vessels.id, id)).limit(1);
      
      if (vesselToDelete.length === 0) {
        throw new Error(`Vessel ${id} not found`);
      }
      
      // Validate org ownership if orgId is provided
      if (orgId && vesselToDelete[0].orgId !== orgId) {
        throw new Error(`Vessel ${id} not found or does not belong to your organization`);
      }
      
      // Unassign crew from this vessel (do not delete crew)
      await tx.delete(crewAssignment)
        .where(eq(crewAssignment.vesselId, id));
      
      await tx.update(crew)
        .set({ vesselId: null })
        .where(eq(crew.vesselId, id));
      // Always delete equipment and their related data
      const vesselEquipment = await tx.select({ id: equipment.id })
        .from(equipment)
        .where(eq(equipment.vesselId, id));
      
      const equipmentIds = vesselEquipment.map(e => e.id);
      
      // Delete all equipment and their related data using existing deleteEquipment logic
      for (const eqId of equipmentIds) {
        await this.deleteEquipmentInTransaction(tx, eqId);
      }
      
      // Delete port calls
      await tx.delete(portCall)
        .where(eq(portCall.vesselId, id));
      
      // Delete drydock windows
      await tx.delete(drydockWindow)
        .where(eq(drydockWindow.vesselId, id));
      
      // Delete shift templates
      await tx.delete(shiftTemplate)
        .where(eq(shiftTemplate.vesselId, id));
      
      // Now delete the vessel
      await tx.delete(vessels)
        .where(eq(vessels.id, id));
      
      // Broadcast vessel deletion to all connected clients
      const wsServer = getWebSocketServer();
      if (wsServer) {
        wsServer.broadcastVesselChange('delete', { id: vesselToDelete[0].id });
      }
    });
  }

  async resetVesselDowntime(id: string): Promise<SelectVessel> {
    const [updated] = await db.update(vessels)
      .set({
        downtimeDays: "0",
        downtimeResetAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(vessels.id, id))
      .returning();
    
    if (!updated) {
      throw new Error(`Vessel ${id} not found`);
    }
    
    return updated;
  }

  async resetVesselOperation(id: string): Promise<SelectVessel> {
    const [updated] = await db.update(vessels)
      .set({
        operationDays: "0",
        operationResetAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(vessels.id, id))
      .returning();
    
    if (!updated) {
      throw new Error(`Vessel ${id} not found`);
    }
    
    return updated;
  }

  async wipeVesselData(vesselId: string, orgId: string): Promise<{ deletedRecords: number }> {
    return await db.transaction(async (tx) => {
      // Verify vessel exists AND belongs to the authenticated org (critical for security)
      const vesselCheck = await tx.select()
        .from(vessels)
        .where(and(
          eq(vessels.id, vesselId),
          eq(vessels.orgId, orgId)
        ))
        .limit(1);
      
      if (vesselCheck.length === 0) {
        throw new Error(`Vessel ${vesselId} not found or access denied`);
      }
      
      let deletedCount = 0;
      
      // Get all equipment IDs for this vessel
      const vesselEquipment = await tx.select({ id: equipment.id })
        .from(equipment)
        .where(eq(equipment.vesselId, vesselId));
      
      const equipmentIds = vesselEquipment.map(e => e.id);
      
      if (equipmentIds.length > 0) {
        // 1. Delete all telemetry data for vessel equipment
        const telemetryResult = await tx.delete(equipmentTelemetry)
          .where(inArray(equipmentTelemetry.equipmentId, equipmentIds))
          .returning({ id: equipmentTelemetry.id });
        deletedCount += telemetryResult.length;
        
        // 2. Delete raw telemetry data
        const rawTelemetryResult = await tx.delete(rawTelemetry)
          .where(inArray(rawTelemetry.equipmentId, equipmentIds))
          .returning({ id: rawTelemetry.id });
        deletedCount += rawTelemetryResult.length;
        
        // 3. Delete PdM scores and predictions
        const pdmResult = await tx.delete(pdmScores)
          .where(inArray(pdmScores.equipmentId, equipmentIds))
          .returning({ id: pdmScores.id });
        deletedCount += pdmResult.length;
        
        const pdmLogResult = await tx.delete(pdmScoreLog)
          .where(inArray(pdmScoreLog.equipmentId, equipmentIds))
          .returning({ id: pdmScoreLog.id });
        deletedCount += pdmLogResult.length;
        
        // 4. Delete anomaly detections
        const anomalyResult = await tx.delete(anomalyDetections)
          .where(inArray(anomalyDetections.equipmentId, equipmentIds))
          .returning({ id: anomalyDetections.id });
        deletedCount += anomalyResult.length;
        
        // 5. Delete failure predictions
        const failureResult = await tx.delete(failurePredictions)
          .where(inArray(failurePredictions.equipmentId, equipmentIds))
          .returning({ id: failurePredictions.id });
        deletedCount += failureResult.length;
        
        // 6. Delete digital twin simulations
        const twinSimResult = await tx.delete(twinSimulations)
          .where(inArray(twinSimulations.equipmentId, equipmentIds))
          .returning({ id: twinSimulations.id });
        deletedCount += twinSimResult.length;
        
        // 7. Delete condition monitoring records (oil, wear, vibration)
        const conditionResult = await tx.delete(conditionMonitoring)
          .where(inArray(conditionMonitoring.equipmentId, equipmentIds))
          .returning({ id: conditionMonitoring.id });
        deletedCount += conditionResult.length;
        
        const oilResult = await tx.delete(oilAnalysis)
          .where(inArray(oilAnalysis.equipmentId, equipmentIds))
          .returning({ id: oilAnalysis.id });
        deletedCount += oilResult.length;
        
        const wearResult = await tx.delete(wearParticleAnalysis)
          .where(inArray(wearParticleAnalysis.equipmentId, equipmentIds))
          .returning({ id: wearParticleAnalysis.id });
        deletedCount += wearResult.length;
        
        // 8. Delete DTC faults for vessel equipment
        const dtcResult = await tx.delete(dtcFaults)
          .where(inArray(dtcFaults.equipmentId, equipmentIds))
          .returning({ id: dtcFaults.id });
        deletedCount += dtcResult.length;
        
        // 9. Delete vibration analysis data
        const vibrationFeaturesResult = await tx.delete(vibrationFeatures)
          .where(inArray(vibrationFeatures.equipmentId, equipmentIds))
          .returning({ id: vibrationFeatures.id });
        deletedCount += vibrationFeaturesResult.length;
        
        const vibrationAnalysisResult = await tx.delete(vibrationAnalysis)
          .where(inArray(vibrationAnalysis.equipmentId, equipmentIds))
          .returning({ id: vibrationAnalysis.id });
        deletedCount += vibrationAnalysisResult.length;
        
        // 10. Delete insight reports and snapshots (if equipment-scoped)
        const insightReportsResult = await tx.delete(insightReports)
          .where(inArray(insightReports.equipmentId, equipmentIds))
          .returning({ id: insightReports.id });
        deletedCount += insightReportsResult.length;
        
        const insightSnapshotsResult = await tx.delete(insightSnapshots)
          .where(inArray(insightSnapshots.equipmentId, equipmentIds))
          .returning({ id: insightSnapshots.id });
        deletedCount += insightSnapshotsResult.length;
      }
      
      console.log(`[Vessel Data Wipe] Deleted ${deletedCount} records for vessel ${vesselId}`);
      
      return { deletedRecords: deletedCount };
    });
  }

  async exportVessel(vesselId: string, orgId: string): Promise<any> {
    // Verify vessel exists and belongs to org
    const vessel = await db.select()
      .from(vessels)
      .where(and(
        eq(vessels.id, vesselId),
        eq(vessels.orgId, orgId)
      ))
      .limit(1);
    
    if (vessel.length === 0) {
      throw new Error(`Vessel ${vesselId} not found or access denied`);
    }

    // Export all vessel-related data
    // NOTE: Crew assignments (crew_assignment table) are intentionally excluded from export
    // This allows crew data to be exported without their specific shift/role assignments
    const exportData: any = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      vessel: vessel[0],
      equipment: [],
      crew: [],
      portCalls: [],
      drydockWindows: [],
      shiftTemplates: []
    };

    // Get equipment assigned to this vessel
    const equipmentList = await db.select()
      .from(equipment)
      .where(eq(equipment.vesselId, vesselId));
    
    // For each equipment, get related data
    for (const equip of equipmentList) {
      const equipmentData: any = { ...equip };
      
      // Get sensors
      equipmentData.sensorConfigurations = await db.select()
        .from(sensorConfigurations)
        .where(eq(sensorConfigurations.equipmentId, equip.id));
      
      // Get recent telemetry (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      equipmentData.recentTelemetry = await db.select()
        .from(equipmentTelemetry)
        .where(and(
          eq(equipmentTelemetry.equipmentId, equip.id),
          sql`${equipmentTelemetry.ts} >= ${thirtyDaysAgo}`
        ))
        .limit(1000);
      
      // Get work orders
      equipmentData.workOrders = await db.select()
        .from(workOrders)
        .where(eq(workOrders.equipmentId, equip.id));
      
      // Get maintenance schedules
      equipmentData.maintenanceSchedules = await db.select()
        .from(maintenanceSchedules)
        .where(eq(maintenanceSchedules.equipmentId, equip.id));
      
      // Get DTCs
      equipmentData.dtcFaults = await db.select()
        .from(dtcFaults)
        .where(eq(dtcFaults.equipmentId, equip.id));
      
      exportData.equipment.push(equipmentData);
    }

    // Get crew assigned to this vessel
    const crewList = await db.select()
      .from(crew)
      .where(eq(crew.vesselId, vesselId));
    
    for (const c of crewList) {
      const crewData: any = { ...c };
      
      // Get crew skills
      crewData.skills = await db.select()
        .from(crewSkill)
        .where(eq(crewSkill.crewId, c.id));
      
      // Get crew certifications
      crewData.certifications = await db.select()
        .from(crewCertification)
        .where(eq(crewCertification.crewId, c.id));
      
      // Get crew leave
      crewData.leave = await db.select()
        .from(crewLeave)
        .where(eq(crewLeave.crewId, c.id));
      
      exportData.crew.push(crewData);
    }

    // Get port calls
    exportData.portCalls = await db.select()
      .from(portCall)
      .where(eq(portCall.vesselId, vesselId));
    
    // Get drydock windows
    exportData.drydockWindows = await db.select()
      .from(drydockWindow)
      .where(eq(drydockWindow.vesselId, vesselId));
    
    // Get shift templates
    exportData.shiftTemplates = await db.select()
      .from(shiftTemplate)
      .where(eq(shiftTemplate.vesselId, vesselId));
    
    return exportData;
  }

  async importVessel(data: any, orgId: string): Promise<{ vesselId: string; equipmentCount: number; crewCount: number }> {
    return await db.transaction(async (tx) => {
      // Validate data format
      if (!data.version || !data.vessel) {
        throw new Error('Invalid export data format');
      }
      
      // Create mapping for old IDs to new IDs
      const idMap: Record<string, string> = {};
      
      // Import vessel with new ID
      const oldVesselId = data.vessel.id;
      const newVesselId = randomUUID();
      idMap[oldVesselId] = newVesselId;
      
      const vesselData = { ...data.vessel };
      delete vesselData.id;
      delete vesselData.createdAt;
      delete vesselData.updatedAt;
      vesselData.orgId = orgId; // Use authenticated user's orgId
      vesselData.name = `${vesselData.name} (Imported)`;
      
      const [newVessel] = await tx.insert(vessels)
        .values({ ...vesselData, id: newVesselId })
        .returning();
      
      // Import equipment
      for (const equip of (data.equipment || [])) {
        const oldEquipmentId = equip.id;
        const newEquipmentId = randomUUID();
        idMap[oldEquipmentId] = newEquipmentId;
        
        const equipmentData = { ...equip };
        delete equipmentData.id;
        delete equipmentData.createdAt;
        delete equipmentData.updatedAt;
        delete equipmentData.sensorConfigurations;
        delete equipmentData.recentTelemetry;
        delete equipmentData.workOrders;
        delete equipmentData.maintenanceSchedules;
        delete equipmentData.dtcFaults;
        equipmentData.orgId = orgId;
        equipmentData.vesselId = newVesselId;
        
        await tx.insert(equipment)
          .values({ ...equipmentData, id: newEquipmentId });
        
        // Import sensor configurations
        for (const sensor of (equip.sensorConfigurations || [])) {
          const sensorData = { ...sensor };
          delete sensorData.id;
          sensorData.equipmentId = newEquipmentId;
          await tx.insert(sensorConfigurations).values(sensorData);
        }
        
        // Import recent telemetry
        for (const tel of (equip.recentTelemetry || [])) {
          const telData = { ...tel };
          delete telData.id;
          telData.equipmentId = newEquipmentId;
          telData.orgId = orgId;
          await tx.insert(equipmentTelemetry).values(telData);
        }
        
        // Import work orders
        for (const wo of (equip.workOrders || [])) {
          const woData = { ...wo };
          delete woData.id;
          delete woData.createdAt;
          delete woData.updatedAt;
          woData.equipmentId = newEquipmentId;
          woData.vesselId = newVesselId;
          woData.orgId = orgId;
          await tx.insert(workOrders).values(woData);
        }
        
        // Import maintenance schedules
        for (const ms of (equip.maintenanceSchedules || [])) {
          const msData = { ...ms };
          delete msData.id;
          delete msData.createdAt;
          delete msData.updatedAt;
          msData.equipmentId = newEquipmentId;
          msData.vesselId = newVesselId;
          msData.orgId = orgId;
          await tx.insert(maintenanceSchedules).values(msData);
        }
        
        // Import DTCs
        for (const dtc of (equip.dtcFaults || [])) {
          const dtcData = { ...dtc };
          delete dtcData.id;
          delete dtcData.createdAt;
          delete dtcData.updatedAt;
          dtcData.equipmentId = newEquipmentId;
          dtcData.orgId = orgId;
          await tx.insert(dtcFaults).values(dtcData);
        }
      }
      
      // Import crew
      for (const c of (data.crew || [])) {
        const oldCrewId = c.id;
        const newCrewId = randomUUID();
        idMap[oldCrewId] = newCrewId;
        
        const crewData = { ...c };
        delete crewData.id;
        delete crewData.createdAt;
        delete crewData.updatedAt;
        delete crewData.skills;
        delete crewData.certifications;
        delete crewData.leave;
        crewData.orgId = orgId;
        crewData.vesselId = newVesselId;
        
        await tx.insert(crew)
          .values({ ...crewData, id: newCrewId });
        
        // Import crew skills
        for (const skill of (c.skills || [])) {
          await tx.insert(crewSkill).values({
            crewId: newCrewId,
            skill: skill.skill,
            level: skill.level
          });
        }
        
        // Import crew certifications
        for (const cert of (c.certifications || [])) {
          const certData = { ...cert };
          delete certData.id;
          delete certData.createdAt;
          certData.crewId = newCrewId;
          await tx.insert(crewCertification).values(certData);
        }
        
        // Import crew leave
        for (const leave of (c.leave || [])) {
          const leaveData = { ...leave };
          delete leaveData.id;
          delete leaveData.createdAt;
          leaveData.crewId = newCrewId;
          await tx.insert(crewLeave).values(leaveData);
        }
      }
      
      // Import port calls
      for (const pc of (data.portCalls || [])) {
        const pcData = { ...pc };
        delete pcData.id;
        delete pcData.createdAt;
        pcData.vesselId = newVesselId;
        await tx.insert(portCall).values(pcData);
      }
      
      // Import drydock windows
      for (const dd of (data.drydockWindows || [])) {
        const ddData = { ...dd };
        delete ddData.id;
        delete ddData.createdAt;
        ddData.vesselId = newVesselId;
        await tx.insert(drydockWindow).values(ddData);
      }
      
      // Import shift templates
      for (const st of (data.shiftTemplates || [])) {
        const stData = { ...st };
        delete stData.id;
        delete stData.createdAt;
        stData.vesselId = newVesselId;
        await tx.insert(shiftTemplate).values(stData);
      }
      
      // Broadcast vessel creation
      const wsServer = getWebSocketServer();
      if (wsServer) {
        wsServer.broadcastVesselChange('create', newVessel);
      }
      
      return {
        vesselId: newVesselId,
        equipmentCount: data.equipment?.length || 0,
        crewCount: data.crew?.length || 0
      };
    });
  }

  async getVesselContext(vesselId: string, orgId?: string): Promise<{
    vessel: any;
    ageYears: number;
    operatingConditions: string[];
    environmentalFactors: string[];
    maintenanceHistory: any[];
    fleetPosition?: { lat: number; lng: number };
  }> {
    const vesselQuery = db.select().from(vessels).where(eq(vessels.id, vesselId));
    if (orgId) {
      vesselQuery.where(eq(vessels.orgId, orgId));
    }
    const [vessel] = await vesselQuery.limit(1);
    
    if (!vessel) {
      throw new Error(`Vessel ${vesselId} not found`);
    }

    const commissionDate = vessel.commissionDate ? new Date(vessel.commissionDate) : new Date(vessel.createdAt);
    const ageYears = (Date.now() - commissionDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

    const vesselEquipment = await db.select().from(equipment).where(eq(equipment.vesselId, vesselId));
    
    const vesselOrders = await db.select().from(workOrders)
      .where(eq(workOrders.vesselId, vesselId))
      .orderBy(desc(workOrders.createdAt))
      .limit(50);

    const operatingConditions: string[] = [];
    if (vesselEquipment.length > 0) {
      operatingConditions.push(`${vesselEquipment.length} equipment units monitored`);
    }
    if (vessel.status === 'active') {
      operatingConditions.push('Vessel in active operation');
    }
    if (vessel.operationDays && parseFloat(vessel.operationDays) > 0) {
      operatingConditions.push(`${vessel.operationDays} days operational`);
    }

    const equipmentIds = vesselEquipment.map(e => e.id);
    let telemetry: any[] = [];
    if (equipmentIds.length > 0) {
      telemetry = await db.select().from(equipmentTelemetry)
        .where(inArray(equipmentTelemetry.equipmentId, equipmentIds))
        .orderBy(desc(equipmentTelemetry.ts))
        .limit(100);
    }

    const environmentalFactors: string[] = [];
    
    const tempReadings = telemetry.filter(t => t.sensorType.toLowerCase().includes('temp'));
    if (tempReadings.length > 0) {
      const avgTemp = tempReadings.reduce((sum, r) => sum + r.value, 0) / tempReadings.length;
      environmentalFactors.push(`Average temperature: ${avgTemp.toFixed(1)}°C`);
    }
    
    const pressureReadings = telemetry.filter(t => t.sensorType.toLowerCase().includes('pressure'));
    if (pressureReadings.length > 0) {
      const avgPressure = pressureReadings.reduce((sum, r) => sum + r.value, 0) / pressureReadings.length;
      environmentalFactors.push(`Average pressure: ${avgPressure.toFixed(1)} bar`);
    }

    const maintenanceHistory = vesselOrders.map(wo => ({
      id: wo.id,
      title: wo.title,
      type: wo.type,
      priority: wo.priority,
      status: wo.status,
      createdAt: wo.createdAt,
      completedAt: wo.completedAt,
      estimatedCost: wo.estimatedCost
    }));

    return {
      vessel,
      ageYears: Math.round(ageYears * 10) / 10,
      operatingConditions,
      environmentalFactors,
      maintenanceHistory,
      fleetPosition: vessel.lastKnownLat && vessel.lastKnownLon ? {
        lat: parseFloat(vessel.lastKnownLat),
        lng: parseFloat(vessel.lastKnownLon)
      } : undefined
    };
  }

  // ===== STCW HOURS OF REST =====

  // Create crew rest sheet (monthly metadata)
  async createCrewRestSheet(sheetData: InsertCrewRestSheet): Promise<SelectCrewRestSheet> {
    const [newSheet] = await db.insert(crewRestSheet)
      .values(sheetData)
      .returning();
    return newSheet;
  }

  // Upsert crew rest day data (hourly rest flags)
  async upsertCrewRestDay(sheetId: string, dayData: any): Promise<SelectCrewRestDay> {
    // First try to find existing record
    const existing = await db.select().from(crewRestDay)
      .where(and(
        eq(crewRestDay.sheetId, sheetId),
        eq(crewRestDay.date, dayData.date)
      ))
      .limit(1);

    if (existing.length > 0) {
      // Update existing record
      const [updated] = await db.update(crewRestDay)
        .set(dayData)
        .where(and(
          eq(crewRestDay.sheetId, sheetId),
          eq(crewRestDay.date, dayData.date)
        ))
        .returning();
      return updated;
    } else {
      // Insert new record
      const [inserted] = await db.insert(crewRestDay)
        .values({
          sheetId,
          ...dayData
        })
        .returning();
      return inserted;
    }
  }

  // Get complete rest data for a crew member's month
  async getCrewRestMonth(crewId: string, year: number, month: string): Promise<{sheet: SelectCrewRestSheet | null, days: any[]}> {
    // Find the rest sheet for this crew member and month
    const sheets = await db.select().from(crewRestSheet)
      .where(and(
        eq(crewRestSheet.crewId, crewId),
        eq(crewRestSheet.year, year),
        eq(crewRestSheet.month, month)
      ))
      .limit(1);

    if (sheets.length === 0) {
      return { sheet: null, days: [] };
    }

    const sheet = sheets[0];

    // Get all rest day data for this sheet
    const days = await db.select().from(crewRestDay)
      .where(eq(crewRestDay.sheetId, sheet.id))
      .orderBy(crewRestDay.date);

    return { sheet, days };
  }

  // ENHANCED RANGE FETCHING METHODS (translated from Python patch)
  
  // Get rest data for a crew member across a date range (multiple months/years)
  async getCrewRestRange(crewId: string, startDate: string, endDate: string): Promise<{sheets: SelectCrewRestSheet[], days: SelectCrewRestDay[]}> {
    // Parse date strings to get year/month ranges
    const startYear = parseInt(startDate.substring(0, 4));
    const startMonth = parseInt(startDate.substring(5, 7));
    const endYear = parseInt(endDate.substring(0, 4));
    const endMonth = parseInt(endDate.substring(5, 7));
    
    // Build month conditions for sheets
    const monthConditions = [];
    for (let year = startYear; year <= endYear; year++) {
      const monthStart = year === startYear ? startMonth : 1;
      const monthEnd = year === endYear ? endMonth : 12;
      
      for (let month = monthStart; month <= monthEnd; month++) {
        const monthName = new Date(year, month - 1).toLocaleString('en-US', { month: 'long' }).toUpperCase();
        monthConditions.push(and(
          eq(crewRestSheet.crewId, crewId),
          eq(crewRestSheet.year, year),
          eq(crewRestSheet.month, monthName)
        ));
      }
    }
    
    // Get all relevant sheets
    const sheets = monthConditions.length > 0 ? 
      await db.select().from(crewRestSheet).where(sql`${crewRestSheet.crewId} = ${crewId} AND (${monthConditions.map(cond => sql`(${cond})`).join(' OR ')})`) :
      [];
    
    if (sheets.length === 0) {
      return { sheets: [], days: [] };
    }
    
    // Get all rest days for these sheets within the date range
    const sheetIds = sheets.map(s => s.id);
    const days = await db.select().from(crewRestDay)
      .where(and(
        sql`${crewRestDay.sheetId} IN (${sheetIds.join(', ')})`,
        gte(crewRestDay.date, startDate),
        lte(crewRestDay.date, endDate)
      ))
      .orderBy(crewRestDay.date);
    
    return { sheets, days };
  }
  
  // Get rest data for multiple crew members in the same month
  async getMultipleCrewRest(crewIds: string[], year: number, month: string): Promise<{[crewId: string]: {sheet: SelectCrewRestSheet | null, days: SelectCrewRestDay[]}}> {
    const result: {[crewId: string]: {sheet: SelectCrewRestSheet | null, days: SelectCrewRestDay[]}} = {};
    
    // Initialize result for all crew members
    for (const crewId of crewIds) {
      result[crewId] = { sheet: null, days: [] };
    }
    
    if (crewIds.length === 0) {
      return result;
    }
    
    // Get all sheets for these crew members in the specified month
    const sheets = await db.select().from(crewRestSheet)
      .where(and(
        sql`${crewRestSheet.crewId} IN (${crewIds.map(id => `'${id}'`).join(', ')})`,
        eq(crewRestSheet.year, year),
        eq(crewRestSheet.month, month)
      ));
    
    // Get all days for these sheets
    const sheetIds = sheets.map(s => s.id);
    const allDays = sheetIds.length > 0 ? 
      await db.select().from(crewRestDay)
        .where(sql`${crewRestDay.sheetId} IN (${sheetIds.map(id => `'${id}'`).join(', ')})`)
        .orderBy(crewRestDay.date) :
      [];
    
    // Organize data by crew member
    for (const sheet of sheets) {
      const crewId = sheet.crewId;
      if (crewId in result) {
        result[crewId].sheet = sheet;
        result[crewId].days = allDays.filter(day => day.sheetId === sheet.id);
      }
    }
    
    return result;
  }
  
  // Get rest data for all crew members on a vessel in a specific month
  async getVesselCrewRest(vesselId: string, year: number, month: string): Promise<{[crewId: string]: {sheet: SelectCrewRestSheet | null, days: SelectCrewRestDay[]}}> {
    // First get all crew members for this vessel
    const vesselCrew = await db.select().from(crew)
      .where(eq(crew.vesselId, vesselId));
    
    const crewIds = vesselCrew.map(c => c.id);
    
    if (crewIds.length === 0) {
      return {};
    }
    
    // Use the multiple crew rest method
    return this.getMultipleCrewRest(crewIds, year, month);
  }
  
  // Advanced range query with optional filters
  async getCrewRestByDateRange(
    vesselId?: string, 
    startDate?: string, 
    endDate?: string, 
    complianceFilter?: boolean
  ): Promise<{crewId: string, vesselId: string, sheet: SelectCrewRestSheet, days: SelectCrewRestDay[]}[]> {
    let query = db.select({
      sheet: crewRestSheet,
      crew: crew,
      vessel: vessels
    })
    .from(crewRestSheet)
    .leftJoin(crew, eq(crew.id, crewRestSheet.crewId))
    .leftJoin(vessels, eq(vessels.id, crew.vesselId));
    
    // Apply filters
    const conditions = [];
    
    if (vesselId) {
      conditions.push(eq(crew.vesselId, vesselId));
    }
    
    if (startDate && endDate) {
      // Convert dates to year/month range
      const startYear = parseInt(startDate.substring(0, 4));
      const startMonth = parseInt(startDate.substring(5, 7));
      const endYear = parseInt(endDate.substring(0, 4));
      const endMonth = parseInt(endDate.substring(5, 7));
      
      // Build date range conditions
      conditions.push(sql`(
        (${crewRestSheet.year} > ${startYear} OR 
         (${crewRestSheet.year} = ${startYear} AND ${crewRestSheet.month} >= ${new Date(startYear, startMonth - 1).toLocaleString('en-US', { month: 'long' }).toUpperCase()})) AND
        (${crewRestSheet.year} < ${endYear} OR 
         (${crewRestSheet.year} = ${endYear} AND ${crewRestSheet.month} <= ${new Date(endYear, endMonth - 1).toLocaleString('en-US', { month: 'long' }).toUpperCase()}))
      )`);
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const sheetsWithCrew = await query;
    
    // Get days for each sheet
    const result = [];
    for (const row of sheetsWithCrew) {
      if (row.sheet && row.crew && row.vessel) {
        const days = await db.select().from(crewRestDay)
          .where(and(
            eq(crewRestDay.sheetId, row.sheet.id),
            ...(startDate ? [gte(crewRestDay.date, startDate)] : []),
            ...(endDate ? [lte(crewRestDay.date, endDate)] : [])
          ))
          .orderBy(crewRestDay.date);
        
        result.push({
          crewId: row.crew.id,
          vesselId: row.vessel.id,
          sheet: row.sheet,
          days: days
        });
      }
    }
    
    return result;
  }

  // Data management operations
  async clearAllWorkOrders(): Promise<void> {
    // Cascade delete all related records first to prevent foreign key violations
    await db.delete(workOrderParts);
    await db.delete(workOrderChecklists);
    await db.delete(workOrderWorklogs);
    await db.delete(maintenanceCosts).where(sql`work_order_id IS NOT NULL`);
    
    // Finally delete all work orders
    await db.delete(workOrders);
  }

  async clearAllMaintenanceSchedules(): Promise<void> {
    await db.delete(maintenanceSchedule);
  }

  // Idempotency operations (translated from Windows batch patch)
  async checkIdempotency(key: string, endpoint: string): Promise<boolean> {
    const result = await db.select()
      .from(idempotencyLog)
      .where(eq(idempotencyLog.key, key))
      .limit(1);
    
    return result.length > 0;
  }

  async recordIdempotency(key: string, endpoint: string): Promise<void> {
    await db.insert(idempotencyLog).values({
      key,
      endpoint
    });
  }

  // ===== HUB & SYNC METHOD IMPLEMENTATIONS =====
  
  // Device registry methods
  async getDeviceRegistryEntries(): Promise<SelectDeviceRegistry[]> {
    return await db.select().from(deviceRegistry);
  }

  async getDeviceRegistryEntry(id: string): Promise<SelectDeviceRegistry | undefined> {
    const result = await db.select().from(deviceRegistry).where(eq(deviceRegistry.id, id));
    return result[0];
  }

  async createDeviceRegistryEntry(device: InsertDeviceRegistry): Promise<SelectDeviceRegistry> {
    const result = await db.insert(deviceRegistry).values(device).returning();
    return result[0];
  }

  async updateDeviceRegistryEntry(id: string, device: Partial<InsertDeviceRegistry>): Promise<SelectDeviceRegistry> {
    const result = await db.update(deviceRegistry)
      .set(device)
      .where(eq(deviceRegistry.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Device registry entry ${id} not found`);
    }
    return result[0];
  }

  async deleteDeviceRegistryEntry(id: string): Promise<void> {
    const result = await db.delete(deviceRegistry)
      .where(eq(deviceRegistry.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Device registry entry ${id} not found`);
    }
  }

  // Replay helper methods
  async logReplayRequest(request: InsertReplayIncoming): Promise<SelectReplayIncoming> {
    const result = await db.insert(replayIncoming).values(request).returning();
    return result[0];
  }

  async getReplayHistory(deviceId?: string, endpoint?: string): Promise<SelectReplayIncoming[]> {
    let query = db.select().from(replayIncoming);
    
    if (deviceId || endpoint) {
      const conditions = [];
      if (deviceId) conditions.push(eq(replayIncoming.deviceId, deviceId));
      if (endpoint) conditions.push(eq(replayIncoming.endpoint, endpoint));
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(replayIncoming.receivedAt));
  }

  // Sheet locking methods
  async acquireSheetLock(sheetKey: string, holder: string, token: string, expiresAt: Date): Promise<SelectSheetLock> {
    // Check if already locked
    const existingLock = await this.getSheetLock(sheetKey);
    if (existingLock && existingLock.expiresAt && existingLock.expiresAt > new Date()) {
      throw new Error(`Sheet ${sheetKey} is already locked by ${existingLock.holder}`);
    }

    // Clean up expired lock if exists
    if (existingLock) {
      await db.delete(sheetLock).where(eq(sheetLock.sheetKey, sheetKey));
    }

    const result = await db.insert(sheetLock).values({
      sheetKey,
      token,
      holder,
      expiresAt,
    }).returning();
    
    return result[0];
  }

  async releaseSheetLock(sheetKey: string, token: string): Promise<void> {
    const result = await db.delete(sheetLock)
      .where(and(eq(sheetLock.sheetKey, sheetKey), eq(sheetLock.token, token)))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`No valid lock found for sheet ${sheetKey} with provided token`);
    }
  }

  async getSheetLock(sheetKey: string): Promise<SelectSheetLock | undefined> {
    const result = await db.select().from(sheetLock).where(eq(sheetLock.sheetKey, sheetKey));
    return result[0];
  }

  async isSheetLocked(sheetKey: string): Promise<boolean> {
    const lock = await this.getSheetLock(sheetKey);
    if (!lock) return false;
    
    if (lock.expiresAt && lock.expiresAt <= new Date()) {
      // Clean up expired lock
      await db.delete(sheetLock).where(eq(sheetLock.sheetKey, sheetKey));
      return false;
    }
    
    return true;
  }

  // Sheet versioning methods
  async getSheetVersion(sheetKey: string): Promise<SelectSheetVersion | undefined> {
    const result = await db.select().from(sheetVersion).where(eq(sheetVersion.sheetKey, sheetKey));
    return result[0];
  }

  async incrementSheetVersion(sheetKey: string, modifiedBy: string): Promise<SelectSheetVersion> {
    const existing = await this.getSheetVersion(sheetKey);
    const newVersion = (existing?.version || 0) + 1;
    
    if (existing) {
      const result = await db.update(sheetVersion)
        .set({
          version: newVersion,
          lastModified: new Date(),
          lastModifiedBy: modifiedBy,
        })
        .where(eq(sheetVersion.sheetKey, sheetKey))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(sheetVersion).values({
        sheetKey,
        version: newVersion,
        lastModifiedBy: modifiedBy,
      }).returning();
      return result[0];
    }
  }

  async setSheetVersion(version: InsertSheetVersion): Promise<SelectSheetVersion> {
    const existing = await this.getSheetVersion(version.sheetKey);
    
    if (existing) {
      const result = await db.update(sheetVersion)
        .set({
          ...version,
          lastModified: new Date(),
        })
        .where(eq(sheetVersion.sheetKey, version.sheetKey))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(sheetVersion).values(version).returning();
      return result[0];
    }
  }

  // Insights and Analytics Engine Implementation
  async getInsightSnapshots(orgId?: string, scope?: string): Promise<InsightSnapshot[]> {
    let query = db.select().from(insightSnapshots);
    
    const conditions = [];
    if (orgId) conditions.push(eq(insightSnapshots.orgId, orgId));
    if (scope) conditions.push(eq(insightSnapshots.scope, scope));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(insightSnapshots.createdAt));
  }

  async getLatestInsightSnapshot(orgId: string, scope: string): Promise<InsightSnapshot | undefined> {
    const result = await db.select().from(insightSnapshots)
      .where(and(
        eq(insightSnapshots.orgId, orgId),
        eq(insightSnapshots.scope, scope)
      ))
      .orderBy(desc(insightSnapshots.createdAt))
      .limit(1);
    
    return result[0];
  }

  async createInsightSnapshot(orgId: string, snapshot: InsertInsightSnapshot): Promise<InsightSnapshot> {
    const result = await db.insert(insightSnapshots)
      .values({
        ...snapshot,
        orgId,
        createdAt: new Date(),
      })
      .returning();
    
    return result[0];
  }

  async getInsightReports(orgId?: string, scope?: string): Promise<InsightReport[]> {
    let query = db.select().from(insightReports);
    
    const conditions = [];
    if (orgId) conditions.push(eq(insightReports.orgId, orgId));
    if (scope) conditions.push(eq(insightReports.scope, scope));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(insightReports.createdAt));
  }

  // ==== CONDITION MONITORING IMPLEMENTATION ====

  // Oil Analysis Methods
  async getOilAnalyses(orgId?: string, equipmentId?: string): Promise<OilAnalysis[]> {
    let query = db.select().from(oilAnalysis);
    
    const conditions = [];
    if (orgId) conditions.push(eq(oilAnalysis.orgId, orgId));
    if (equipmentId) conditions.push(eq(oilAnalysis.equipmentId, equipmentId));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(oilAnalysis.sampleDate));
  }

  async getOilAnalysis(id: string, orgId?: string): Promise<OilAnalysis | undefined> {
    const conditions = [eq(oilAnalysis.id, id)];
    if (orgId) conditions.push(eq(oilAnalysis.orgId, orgId));
    
    const result = await db.select().from(oilAnalysis)
      .where(and(...conditions))
      .limit(1);
    
    return result[0];
  }

  async createOilAnalysis(analysis: InsertOilAnalysis): Promise<OilAnalysis> {
    const result = await db.insert(oilAnalysis)
      .values({
        ...analysis,
        sampleDate: analysis.sampleDate ? new Date(analysis.sampleDate) : new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return result[0];
  }

  async updateOilAnalysis(id: string, analysis: Partial<InsertOilAnalysis>, orgId?: string): Promise<OilAnalysis> {
    const conditions = [eq(oilAnalysis.id, id)];
    if (orgId) conditions.push(eq(oilAnalysis.orgId, orgId));
    
    const result = await db.update(oilAnalysis)
      .set({
        ...analysis,
        updatedAt: new Date(),
      })
      .where(and(...conditions))
      .returning();
    
    if (result.length === 0) {
      throw new Error('Oil analysis not found');
    }
    
    return result[0];
  }

  async deleteOilAnalysis(id: string, orgId?: string): Promise<void> {
    const conditions = [eq(oilAnalysis.id, id)];
    if (orgId) conditions.push(eq(oilAnalysis.orgId, orgId));
    
    const result = await db.delete(oilAnalysis)
      .where(and(...conditions));
    
    if (result.rowCount === 0) {
      throw new Error('Oil analysis not found');
    }
  }

  async getLatestOilAnalysis(equipmentId: string, orgId?: string): Promise<OilAnalysis | undefined> {
    const conditions = [eq(oilAnalysis.equipmentId, equipmentId)];
    if (orgId) conditions.push(eq(oilAnalysis.orgId, orgId));
    
    const result = await db.select().from(oilAnalysis)
      .where(and(...conditions))
      .orderBy(desc(oilAnalysis.sampleDate))
      .limit(1);
    
    return result[0];
  }

  // Wear Particle Analysis Methods
  async getWearParticleAnalyses(orgId?: string, equipmentId?: string): Promise<WearParticleAnalysis[]> {
    let query = db.select().from(wearParticleAnalysis);
    
    const conditions = [];
    if (orgId) conditions.push(eq(wearParticleAnalysis.orgId, orgId));
    if (equipmentId) conditions.push(eq(wearParticleAnalysis.equipmentId, equipmentId));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(wearParticleAnalysis.sampleDate));
  }

  async getWearParticleAnalysis(id: string, orgId?: string): Promise<WearParticleAnalysis | undefined> {
    const conditions = [eq(wearParticleAnalysis.id, id)];
    if (orgId) conditions.push(eq(wearParticleAnalysis.orgId, orgId));
    
    const result = await db.select().from(wearParticleAnalysis)
      .where(and(...conditions))
      .limit(1);
    
    return result[0];
  }

  async createWearParticleAnalysis(analysis: InsertWearParticleAnalysis): Promise<WearParticleAnalysis> {
    // Ensure date field is properly handled
    const analysisData = {
      ...analysis,
      analysisDate: analysis.analysisDate ? new Date(analysis.analysisDate) : new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Remove undefined fields that could cause issues
    Object.keys(analysisData).forEach(key => {
      if (analysisData[key] === undefined) {
        delete analysisData[key];
      }
    });

    const result = await db.insert(wearParticleAnalysis)
      .values(analysisData)
      .returning();
    
    return result[0];
  }

  async updateWearParticleAnalysis(id: string, analysis: Partial<InsertWearParticleAnalysis>, orgId?: string): Promise<WearParticleAnalysis> {
    const conditions = [eq(wearParticleAnalysis.id, id)];
    if (orgId) conditions.push(eq(wearParticleAnalysis.orgId, orgId));
    
    const result = await db.update(wearParticleAnalysis)
      .set({
        ...analysis,
        updatedAt: new Date(),
      })
      .where(and(...conditions))
      .returning();
    
    if (result.length === 0) {
      throw new Error('Wear particle analysis not found');
    }
    
    return result[0];
  }

  async deleteWearParticleAnalysis(id: string, orgId?: string): Promise<void> {
    const conditions = [eq(wearParticleAnalysis.id, id)];
    if (orgId) conditions.push(eq(wearParticleAnalysis.orgId, orgId));
    
    const result = await db.delete(wearParticleAnalysis)
      .where(and(...conditions));
    
    if (result.rowCount === 0) {
      throw new Error('Wear particle analysis not found');
    }
  }

  async getLatestWearParticleAnalysis(equipmentId: string, orgId?: string): Promise<WearParticleAnalysis | undefined> {
    const conditions = [eq(wearParticleAnalysis.equipmentId, equipmentId)];
    if (orgId) conditions.push(eq(wearParticleAnalysis.orgId, orgId));
    
    const result = await db.select().from(wearParticleAnalysis)
      .where(and(...conditions))
      .orderBy(desc(wearParticleAnalysis.analysisDate))
      .limit(1);
    
    return result[0];
  }

  // Condition Monitoring Assessment Methods
  async getConditionMonitoringAssessments(orgId?: string, equipmentId?: string): Promise<ConditionMonitoring[]> {
    let query = db.select().from(conditionMonitoring);
    
    const conditions = [];
    if (orgId) conditions.push(eq(conditionMonitoring.orgId, orgId));
    if (equipmentId) conditions.push(eq(conditionMonitoring.equipmentId, equipmentId));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(conditionMonitoring.assessmentDate));
  }

  async getConditionMonitoringAssessment(id: string, orgId?: string): Promise<ConditionMonitoring | undefined> {
    const conditions = [eq(conditionMonitoring.id, id)];
    if (orgId) conditions.push(eq(conditionMonitoring.orgId, orgId));
    
    const result = await db.select().from(conditionMonitoring)
      .where(and(...conditions))
      .limit(1);
    
    return result[0];
  }

  async createConditionMonitoringAssessment(assessment: InsertConditionMonitoring): Promise<ConditionMonitoring> {
    const result = await db.insert(conditionMonitoring)
      .values({
        ...assessment,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return result[0];
  }

  async updateConditionMonitoringAssessment(id: string, assessment: Partial<InsertConditionMonitoring>, orgId?: string): Promise<ConditionMonitoring> {
    const conditions = [eq(conditionMonitoring.id, id)];
    if (orgId) conditions.push(eq(conditionMonitoring.orgId, orgId));
    
    const result = await db.update(conditionMonitoring)
      .set({
        ...assessment,
        updatedAt: new Date(),
      })
      .where(and(...conditions))
      .returning();
    
    if (result.length === 0) {
      throw new Error('Condition monitoring assessment not found');
    }
    
    return result[0];
  }

  async deleteConditionMonitoringAssessment(id: string, orgId?: string): Promise<void> {
    const conditions = [eq(conditionMonitoring.id, id)];
    if (orgId) conditions.push(eq(conditionMonitoring.orgId, orgId));
    
    const result = await db.delete(conditionMonitoring)
      .where(and(...conditions));
    
    if (result.rowCount === 0) {
      throw new Error('Condition monitoring assessment not found');
    }
  }

  async getLatestConditionAssessment(equipmentId: string, orgId?: string): Promise<ConditionMonitoring | undefined> {
    const conditions = [eq(conditionMonitoring.equipmentId, equipmentId)];
    if (orgId) conditions.push(eq(conditionMonitoring.orgId, orgId));
    
    const result = await db.select().from(conditionMonitoring)
      .where(and(...conditions))
      .orderBy(desc(conditionMonitoring.assessmentDate))
      .limit(1);
    
    return result[0];
  }

  // Oil Change Records Methods
  async getOilChangeRecords(orgId?: string, equipmentId?: string): Promise<OilChangeRecord[]> {
    let query = db.select().from(oilChangeRecords);
    
    const conditions = [];
    if (orgId) conditions.push(eq(oilChangeRecords.orgId, orgId));
    if (equipmentId) conditions.push(eq(oilChangeRecords.equipmentId, equipmentId));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(oilChangeRecords.changeDate));
  }

  async getOilChangeRecord(id: string, orgId?: string): Promise<OilChangeRecord | undefined> {
    const conditions = [eq(oilChangeRecords.id, id)];
    if (orgId) conditions.push(eq(oilChangeRecords.orgId, orgId));
    
    const result = await db.select().from(oilChangeRecords)
      .where(and(...conditions))
      .limit(1);
    
    return result[0];
  }

  async createOilChangeRecord(record: InsertOilChangeRecord): Promise<OilChangeRecord> {
    const result = await db.insert(oilChangeRecords)
      .values({
        ...record,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return result[0];
  }

  async updateOilChangeRecord(id: string, record: Partial<InsertOilChangeRecord>, orgId?: string): Promise<OilChangeRecord> {
    const conditions = [eq(oilChangeRecords.id, id)];
    if (orgId) conditions.push(eq(oilChangeRecords.orgId, orgId));
    
    const result = await db.update(oilChangeRecords)
      .set({
        ...record,
        updatedAt: new Date(),
      })
      .where(and(...conditions))
      .returning();
    
    if (result.length === 0) {
      throw new Error('Oil change record not found');
    }
    
    return result[0];
  }

  async deleteOilChangeRecord(id: string, orgId?: string): Promise<void> {
    const conditions = [eq(oilChangeRecords.id, id)];
    if (orgId) conditions.push(eq(oilChangeRecords.orgId, orgId));
    
    const result = await db.delete(oilChangeRecords)
      .where(and(...conditions));
    
    if (result.rowCount === 0) {
      throw new Error('Oil change record not found');
    }
  }

  async getLatestOilChange(equipmentId: string, orgId?: string): Promise<OilChangeRecord | undefined> {
    const conditions = [eq(oilChangeRecords.equipmentId, equipmentId)];
    if (orgId) conditions.push(eq(oilChangeRecords.orgId, orgId));
    
    const result = await db.select().from(oilChangeRecords)
      .where(and(...conditions))
      .orderBy(desc(oilChangeRecords.changeDate))
      .limit(1);
    
    return result[0];
  }

  async createInsightReport(orgId: string, report: InsertInsightReport): Promise<InsightReport> {
    const result = await db.insert(insightReports)
      .values({
        ...report,
        orgId,
        createdAt: new Date(),
      })
      .returning();
    
    return result[0];
  }

  // Latest readings and vessel-centric fleet overview (Option A extension)
  async getLatestTelemetryReadings(vesselId?: string, equipmentId?: string, sensorType?: string, limit: number = 500): Promise<EquipmentTelemetry[]> {
    console.log("Fetching latest telemetry readings with params:", { vesselId, equipmentId, sensorType, limit });
    
    let query = db
      .select()
      .from(equipmentTelemetry);

    // Apply filters
    const conditions = [];
    
    if (vesselId) {
      // Need to join with equipment table when filtering by vessel
      query = query.innerJoin(equipment, eq(equipmentTelemetry.equipmentId, equipment.id));
      conditions.push(eq(equipment.vesselName, vesselId));
    }
    
    if (equipmentId) {
      conditions.push(eq(equipmentTelemetry.equipmentId, equipmentId));
    }
    
    if (sensorType) {
      conditions.push(eq(equipmentTelemetry.sensorType, sensorType));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(equipmentTelemetry.ts))
      .limit(limit);
    
    // Extract telemetry data from results (handle join case)
    if (vesselId) {
      // When joined, extract equipment_telemetry from the result
      return results.map(row => (row as any).equipment_telemetry);
    } else {
      // When not joined, return results directly
      return results as EquipmentTelemetry[];
    }
  }

  async getVesselFleetOverview(orgId?: string): Promise<{
    vessels: number;
    signalsMapped: number;
    signalsDiscovered: number;
    latestPerVessel: Array<{vesselId: string; lastTs: string}>;
    dq7d: Record<string, number>;
  }> {
    // Get vessel count
    let vesselQuery = db.select({ count: sql<number>`count(*)` }).from(vessels);
    if (orgId) {
      vesselQuery = vesselQuery.where(eq(vessels.orgId, orgId));
    }

    // Get sensor configurations count
    let sensorConfigQuery = db.select({ count: sql<number>`count(*)` }).from(sensorConfigurations);
    if (orgId) {
      sensorConfigQuery = sensorConfigQuery.where(eq(sensorConfigurations.orgId, orgId));
    }

    // Get latest readings per vessel
    let latestReadingsQuery = db
      .select({
        vesselName: equipment.vesselName,
        lastTs: sql<Date>`max(${equipmentTelemetry.ts})`.as('lastTs')
      })
      .from(equipmentTelemetry)
      .innerJoin(equipment, eq(equipmentTelemetry.equipmentId, equipment.id));
    
    if (orgId) {
      latestReadingsQuery = latestReadingsQuery.where(eq(equipment.orgId, orgId));
    }
    
    latestReadingsQuery = latestReadingsQuery.groupBy(equipment.vesselName);

    const [vesselCount, sensorConfigCount, latestReadings] = await Promise.all([
      vesselQuery,
      sensorConfigQuery,
      latestReadingsQuery
    ]);

    // Mock data quality findings for now
    const dq7d = {
      "missing_data": 2,
      "out_of_range": 1,
      "duplicate_values": 0
    };

    return {
      vessels: vesselCount[0]?.count || 0,
      signalsMapped: sensorConfigCount[0]?.count || 0,
      signalsDiscovered: Math.floor((sensorConfigCount[0]?.count || 0) * 1.2), // Mock discovered signals
      latestPerVessel: latestReadings
        .filter(r => r.vesselName && r.lastTs)
        .map(r => ({
          vesselId: r.vesselName!,
          lastTs: r.lastTs instanceof Date ? r.lastTs.toISOString() : new Date(r.lastTs!).toISOString()
        })),
      dq7d
    };
  }

  // J1939 configuration management
  async getJ1939Configurations(orgId: string, deviceId?: string): Promise<J1939Configuration[]> {
    const conditions = [eq(j1939Configurations.orgId, orgId)];
    if (deviceId) conditions.push(eq(j1939Configurations.deviceId, deviceId));
    
    return await db.select().from(j1939Configurations)
      .where(and(...conditions))
      .orderBy(desc(j1939Configurations.createdAt));
  }

  async getJ1939Configuration(id: string, orgId: string): Promise<J1939Configuration | undefined> {
    const conditions = [eq(j1939Configurations.id, id), eq(j1939Configurations.orgId, orgId)];
    
    const result = await db.select().from(j1939Configurations)
      .where(and(...conditions));
    return result[0];
  }

  async createJ1939Configuration(config: InsertJ1939Configuration): Promise<J1939Configuration> {
    const result = await db.insert(j1939Configurations)
      .values({
        ...config,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    if (result.length === 0) {
      throw new Error('Failed to create J1939 configuration');
    }
    return result[0];
  }

  async updateJ1939Configuration(id: string, config: Partial<InsertJ1939Configuration>, orgId: string): Promise<J1939Configuration> {
    // Security: Enforce org scoping - orgId is required
    const conditions = [eq(j1939Configurations.id, id), eq(j1939Configurations.orgId, orgId)];
    
    const existing = await db.select().from(j1939Configurations)
      .where(and(...conditions));
    
    if (existing.length === 0) {
      throw new Error(`J1939 configuration ${id} not found`);
    }
    
    // Update with org scoping enforced
    const result = await db.update(j1939Configurations)
      .set({
        ...config,
        updatedAt: new Date()
      })
      .where(and(...conditions))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`J1939 configuration ${id} not found or access denied`);
    }
    return result[0];
  }

  async deleteJ1939Configuration(id: string, orgId: string): Promise<void> {
    // Security: Enforce org scoping - orgId is required
    const conditions = [eq(j1939Configurations.id, id), eq(j1939Configurations.orgId, orgId)];
    
    const existing = await db.select().from(j1939Configurations)
      .where(and(...conditions));
    
    if (existing.length === 0) {
      throw new Error(`J1939 configuration ${id} not found`);
    }
    
    // Delete with org scoping enforced
    const result = await db.delete(j1939Configurations)
      .where(and(...conditions))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`J1939 configuration ${id} not found or access denied`);
    }
  }

  // ===== DTC (DIAGNOSTIC TROUBLE CODES) MANAGEMENT =====

  async getDtcDefinitions(spn?: number, fmi?: number, manufacturer?: string): Promise<DtcDefinition[]> {
    const conditions = [];
    if (spn !== undefined) conditions.push(eq(dtcDefinitions.spn, spn));
    if (fmi !== undefined) conditions.push(eq(dtcDefinitions.fmi, fmi));
    if (manufacturer !== undefined) conditions.push(eq(dtcDefinitions.manufacturer, manufacturer));
    
    if (conditions.length === 0) {
      return await db.select().from(dtcDefinitions)
        .orderBy(dtcDefinitions.spn, dtcDefinitions.fmi);
    }
    
    return await db.select().from(dtcDefinitions)
      .where(and(...conditions))
      .orderBy(dtcDefinitions.spn, dtcDefinitions.fmi);
  }

  async getDtcDefinition(spn: number, fmi: number, manufacturer: string = ''): Promise<DtcDefinition | undefined> {
    const result = await db.select().from(dtcDefinitions)
      .where(and(
        eq(dtcDefinitions.spn, spn),
        eq(dtcDefinitions.fmi, fmi),
        eq(dtcDefinitions.manufacturer, manufacturer)
      ));
    return result[0];
  }

  async createDtcDefinition(definition: InsertDtcDefinition): Promise<DtcDefinition> {
    const result = await db.insert(dtcDefinitions)
      .values({
        ...definition,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    if (result.length === 0) {
      throw new Error('Failed to create DTC definition');
    }
    return result[0];
  }

  async bulkInsertDtcDefinitions(definitions: InsertDtcDefinition[]): Promise<number> {
    if (definitions.length === 0) return 0;
    
    await db.insert(dtcDefinitions)
      .values(definitions.map(def => ({
        ...def,
        createdAt: new Date(),
        updatedAt: new Date()
      })))
      .onConflictDoNothing();
    
    return definitions.length;
  }

  async getActiveDtcs(equipmentId: string, orgId?: string): Promise<(DtcFault & { definition?: DtcDefinition })[]> {
    const conditions = [
      eq(dtcFaults.equipmentId, equipmentId),
      eq(dtcFaults.active, true)
    ];
    if (orgId) conditions.push(eq(dtcFaults.orgId, orgId));
    
    const faults = await db.select().from(dtcFaults)
      .where(and(...conditions))
      .orderBy(desc(dtcFaults.lastSeen));
    
    // Enrich with definitions
    const enriched = await Promise.all(faults.map(async (fault) => {
      const definition = await this.getDtcDefinition(fault.spn, fault.fmi, '');
      return { ...fault, definition };
    }));
    
    return enriched;
  }

  async getDtcHistory(
    equipmentId: string, 
    orgId?: string, 
    filters?: {
      spn?: number;
      fmi?: number;
      severity?: number;
      from?: Date;
      to?: Date;
      limit?: number;
    }
  ): Promise<(DtcFault & { definition?: DtcDefinition })[]> {
    const conditions = [eq(dtcFaults.equipmentId, equipmentId)];
    if (orgId) conditions.push(eq(dtcFaults.orgId, orgId));
    
    if (filters?.spn !== undefined) conditions.push(eq(dtcFaults.spn, filters.spn));
    if (filters?.fmi !== undefined) conditions.push(eq(dtcFaults.fmi, filters.fmi));
    if (filters?.from) conditions.push(gte(dtcFaults.lastSeen, filters.from));
    if (filters?.to) conditions.push(lte(dtcFaults.lastSeen, filters.to));
    
    let query = db.select().from(dtcFaults)
      .where(and(...conditions))
      .orderBy(desc(dtcFaults.lastSeen));
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    const faults = await query;
    
    // Enrich with definitions and filter by severity if needed
    let enriched = await Promise.all(faults.map(async (fault) => {
      const definition = await this.getDtcDefinition(fault.spn, fault.fmi, '');
      return { ...fault, definition };
    }));
    
    if (filters?.severity !== undefined) {
      enriched = enriched.filter(f => f.definition?.severity === filters.severity);
    }
    
    return enriched;
  }

  async upsertDtcFault(fault: InsertDtcFault): Promise<DtcFault> {
    // Check if this fault already exists (active or inactive) for this device
    const existing = await db.select().from(dtcFaults)
      .where(and(
        eq(dtcFaults.deviceId, fault.deviceId),
        eq(dtcFaults.spn, fault.spn),
        eq(dtcFaults.fmi, fault.fmi)
      ))
      .orderBy(desc(dtcFaults.lastSeen))
      .limit(1);
    
    if (existing.length > 0) {
      // Update existing fault
      const result = await db.update(dtcFaults)
        .set({
          active: fault.active,
          lastSeen: new Date(),
          oc: fault.oc,
          lamp: fault.lamp,
        })
        .where(eq(dtcFaults.id, existing[0].id))
        .returning();
      return result[0];
    } else {
      // Insert new fault
      const result = await db.insert(dtcFaults)
        .values({
          ...fault,
          firstSeen: new Date(),
          lastSeen: new Date(),
          createdAt: new Date()
        })
        .returning();
      return result[0];
    }
  }

  async clearInactiveDtcs(deviceId: string, activeSPNs: Array<{spn: number; fmi: number}>): Promise<number> {
    if (activeSPNs.length === 0) {
      // If no active faults, mark all as inactive
      const result = await db.update(dtcFaults)
        .set({ active: false, lastSeen: new Date() })
        .where(and(
          eq(dtcFaults.deviceId, deviceId),
          eq(dtcFaults.active, true)
        ))
        .returning();
      return result.length;
    }
    
    // Get all active faults for this device
    const currentActive = await db.select().from(dtcFaults)
      .where(and(
        eq(dtcFaults.deviceId, deviceId),
        eq(dtcFaults.active, true)
      ));
    
    // Find faults that are no longer active
    const toDeactivate = currentActive.filter(fault => 
      !activeSPNs.some(active => active.spn === fault.spn && active.fmi === fault.fmi)
    );
    
    if (toDeactivate.length === 0) return 0;
    
    // Mark them as inactive
    const deactivated = await Promise.all(
      toDeactivate.map(fault =>
        db.update(dtcFaults)
          .set({ active: false, lastSeen: new Date() })
          .where(eq(dtcFaults.id, fault.id))
          .returning()
      )
    );
    
    return deactivated.length;
  }

  // ===== OPERATING CONDITION OPTIMIZATION METHODS =====

  async getOperatingParameters(orgId?: string, equipmentType?: string, manufacturer?: string): Promise<OperatingParameter[]> {
    const conditions = [];
    if (orgId) conditions.push(eq(operatingParameters.orgId, orgId));
    if (equipmentType) conditions.push(eq(operatingParameters.equipmentType, equipmentType));
    if (manufacturer) conditions.push(eq(operatingParameters.manufacturer, manufacturer));
    
    let query = db.select().from(operatingParameters);
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return query.orderBy(operatingParameters.equipmentType, operatingParameters.parameterName);
  }

  async getOperatingParameter(id: string, orgId?: string): Promise<OperatingParameter | undefined> {
    const conditions = [eq(operatingParameters.id, id)];
    if (orgId) conditions.push(eq(operatingParameters.orgId, orgId));
    
    const result = await db.select().from(operatingParameters)
      .where(and(...conditions));
    return result[0];
  }

  async createOperatingParameter(parameter: InsertOperatingParameter): Promise<OperatingParameter> {
    const [newParameter] = await recordAndPublish(
      db.insert(operatingParameters).values(parameter).returning(),
      'operating_parameter',
      'create'
    );
    return newParameter;
  }

  async updateOperatingParameter(id: string, parameter: Partial<InsertOperatingParameter>, orgId?: string): Promise<OperatingParameter> {
    const conditions = [eq(operatingParameters.id, id)];
    if (orgId) conditions.push(eq(operatingParameters.orgId, orgId));
    
    const [updated] = await recordAndPublish(
      db.update(operatingParameters)
        .set({ ...parameter, updatedAt: new Date() })
        .where(and(...conditions))
        .returning(),
      'operating_parameter',
      'update'
    );
    
    if (!updated) {
      throw new Error(`Operating parameter ${id} not found`);
    }
    return updated;
  }

  async deleteOperatingParameter(id: string, orgId?: string): Promise<void> {
    const conditions = [eq(operatingParameters.id, id)];
    if (orgId) conditions.push(eq(operatingParameters.orgId, orgId));
    
    const result = await recordAndPublish(
      db.delete(operatingParameters)
        .where(and(...conditions))
        .returning(),
      'operating_parameter',
      'delete'
    );
    
    if (result.length === 0) {
      throw new Error(`Operating parameter ${id} not found`);
    }
  }

  async bulkCreateOperatingParameters(parameters: InsertOperatingParameter[]): Promise<OperatingParameter[]> {
    if (parameters.length === 0) return [];
    
    return await db.transaction(async (tx) => {
      const created = await tx.insert(operatingParameters)
        .values(parameters)
        .returning();
      
      // Publish events for each created parameter
      for (const param of created) {
        await publishEvent('operating_parameter', 'create', param);
      }
      
      return created;
    });
  }

  async getOperatingConditionAlerts(orgId?: string, equipmentId?: string, acknowledged?: boolean): Promise<OperatingConditionAlert[]> {
    const conditions = [];
    if (orgId) conditions.push(eq(operatingConditionAlerts.orgId, orgId));
    if (equipmentId) conditions.push(eq(operatingConditionAlerts.equipmentId, equipmentId));
    if (acknowledged !== undefined) {
      // Check acknowledgedAt: null = not acknowledged, not null = acknowledged
      if (acknowledged) {
        conditions.push(isNotNull(operatingConditionAlerts.acknowledgedAt));
      } else {
        conditions.push(isNull(operatingConditionAlerts.acknowledgedAt));
      }
    }
    
    let query = db.select().from(operatingConditionAlerts);
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return query.orderBy(desc(operatingConditionAlerts.alertedAt));
  }

  async getOperatingConditionAlert(id: string, orgId?: string): Promise<OperatingConditionAlert | undefined> {
    const conditions = [eq(operatingConditionAlerts.id, id)];
    if (orgId) conditions.push(eq(operatingConditionAlerts.orgId, orgId));
    
    const result = await db.select().from(operatingConditionAlerts)
      .where(and(...conditions));
    return result[0];
  }

  async createOperatingConditionAlert(alert: InsertOperatingConditionAlert): Promise<OperatingConditionAlert> {
    // Check for duplicate alerts (idempotency)
    if (alert.equipmentId && alert.parameterId) {
      const recentAlert = await db.select().from(operatingConditionAlerts)
        .where(and(
          eq(operatingConditionAlerts.equipmentId, alert.equipmentId),
          eq(operatingConditionAlerts.parameterId, alert.parameterId),
          eq(operatingConditionAlerts.resolved, false),
          gte(operatingConditionAlerts.createdAt, new Date(Date.now() - 10 * 60 * 1000)) // Last 10 minutes
        ))
        .limit(1);
      
      if (recentAlert.length > 0) {
        return recentAlert[0]; // Return existing alert instead of creating duplicate
      }
    }
    
    const [newAlert] = await recordAndPublish(
      db.insert(operatingConditionAlerts).values(alert).returning(),
      'operating_condition_alert',
      'create'
    );
    return newAlert;
  }

  async updateOperatingConditionAlert(id: string, alert: Partial<InsertOperatingConditionAlert>, orgId?: string): Promise<OperatingConditionAlert> {
    const conditions = [eq(operatingConditionAlerts.id, id)];
    if (orgId) conditions.push(eq(operatingConditionAlerts.orgId, orgId));
    
    const [updated] = await recordAndPublish(
      db.update(operatingConditionAlerts)
        .set(alert)
        .where(and(...conditions))
        .returning(),
      'operating_condition_alert',
      'update'
    );
    
    if (!updated) {
      throw new Error(`Operating condition alert ${id} not found`);
    }
    return updated;
  }

  async acknowledgeOperatingConditionAlert(id: string, acknowledgedBy: string, notes?: string, orgId?: string): Promise<OperatingConditionAlert> {
    const conditions = [eq(operatingConditionAlerts.id, id)];
    if (orgId) conditions.push(eq(operatingConditionAlerts.orgId, orgId));
    
    const [acknowledged] = await recordAndPublish(
      db.update(operatingConditionAlerts)
        .set({
          acknowledged: true,
          acknowledgedBy,
          acknowledgedAt: new Date(),
          notes: notes || null
        })
        .where(and(...conditions))
        .returning(),
      'operating_condition_alert',
      'update'
    );
    
    if (!acknowledged) {
      throw new Error(`Operating condition alert ${id} not found`);
    }
    return acknowledged;
  }

  async resolveOperatingConditionAlert(id: string, notes?: string, orgId?: string): Promise<OperatingConditionAlert> {
    const conditions = [eq(operatingConditionAlerts.id, id)];
    if (orgId) conditions.push(eq(operatingConditionAlerts.orgId, orgId));
    
    const [resolved] = await recordAndPublish(
      db.update(operatingConditionAlerts)
        .set({
          resolved: true,
          resolvedAt: new Date(),
          notes: notes || null
        })
        .where(and(...conditions))
        .returning(),
      'operating_condition_alert',
      'update'
    );
    
    if (!resolved) {
      throw new Error(`Operating condition alert ${id} not found`);
    }
    return resolved;
  }

  async getActiveOperatingAlerts(equipmentId: string, orgId?: string): Promise<OperatingConditionAlert[]> {
    const conditions = [
      eq(operatingConditionAlerts.equipmentId, equipmentId),
      eq(operatingConditionAlerts.resolved, false)
    ];
    if (orgId) conditions.push(eq(operatingConditionAlerts.orgId, orgId));
    
    return db.select().from(operatingConditionAlerts)
      .where(and(...conditions))
      .orderBy(desc(operatingConditionAlerts.severity), desc(operatingConditionAlerts.createdAt));
  }

  async checkOperatingConditions(
    equipmentId: string,
    telemetry?: { sensorType: string; value: number }[],
    orgId?: string
  ): Promise<{
    violations: Array<{
      parameterId: string;
      parameterName: string;
      currentValue: number;
      thresholdType: 'below_optimal' | 'above_optimal' | 'below_critical' | 'above_critical';
      severity: 'info' | 'warning' | 'critical';
      lifeImpact?: string;
      recommendedAction?: string;
    }>;
    alertsCreated: number;
  }> {
    // Get equipment to find its type and manufacturer
    const equipmentResult = await db.select()
      .from(equipment)
      .where(and(
        eq(equipment.id, equipmentId),
        ...(orgId ? [eq(equipment.orgId, orgId)] : [])
      ))
      .limit(1);
    
    if (equipmentResult.length === 0) {
      throw new Error(`Equipment ${equipmentId} not found`);
    }
    
    const equipmentData = equipmentResult[0];
    
    // If telemetry not provided, fetch latest readings from storage
    let telemetryData: { sensorType: string; value: number }[];
    if (!telemetry || telemetry.length === 0) {
      const latestReadings = await db.select({
        sensorType: equipmentTelemetry.sensorType,
        value: equipmentTelemetry.value
      })
        .from(equipmentTelemetry)
        .where(eq(equipmentTelemetry.equipmentId, equipmentId))
        .orderBy(desc(equipmentTelemetry.ts))
        .limit(50);
      
      // Get most recent value for each sensorType
      const telemetryMap = new Map<string, number>();
      for (const reading of latestReadings) {
        if (!telemetryMap.has(reading.sensorType)) {
          telemetryMap.set(reading.sensorType, reading.value);
        }
      }
      
      telemetryData = Array.from(telemetryMap.entries()).map(([sensorType, value]) => ({
        sensorType,
        value
      }));
    } else {
      telemetryData = telemetry;
    }
    
    // Get applicable operating parameters for this equipment
    const conditions = [];
    if (orgId) conditions.push(eq(operatingParameters.orgId, orgId));
    if (equipmentData.type) conditions.push(eq(operatingParameters.equipmentType, equipmentData.type));
    if (equipmentData.manufacturer) conditions.push(eq(operatingParameters.manufacturer, equipmentData.manufacturer));
    
    const parameters = await db.select().from(operatingParameters)
      .where(and(...conditions));
    
    const violations: Array<{
      parameterId: string;
      parameterName: string;
      currentValue: number;
      thresholdType: 'below_optimal' | 'above_optimal' | 'below_critical' | 'above_critical';
      severity: 'info' | 'warning' | 'critical';
      lifeImpact?: string;
      recommendedAction?: string;
    }> = [];
    
    let alertsCreated = 0;
    
    // Check each telemetry reading against parameters
    for (const reading of telemetryData) {
      const matchingParams = parameters.filter(p => p.parameterType === reading.sensorType);
      
      for (const param of matchingParams) {
        let violation: typeof violations[0] | null = null;
        
        // Check critical thresholds first
        if (param.criticalMin !== null && reading.value < param.criticalMin) {
          violation = {
            parameterId: param.id,
            parameterName: param.parameterName,
            currentValue: reading.value,
            thresholdType: 'below_critical',
            severity: 'critical',
            lifeImpact: param.lifeImpactDescription || undefined,
            recommendedAction: param.recommendedAction || undefined
          };
        } else if (param.criticalMax !== null && reading.value > param.criticalMax) {
          violation = {
            parameterId: param.id,
            parameterName: param.parameterName,
            currentValue: reading.value,
            thresholdType: 'above_critical',
            severity: 'critical',
            lifeImpact: param.lifeImpactDescription || undefined,
            recommendedAction: param.recommendedAction || undefined
          };
        }
        // Check optimal thresholds
        else if (param.optimalMin !== null && reading.value < param.optimalMin) {
          violation = {
            parameterId: param.id,
            parameterName: param.parameterName,
            currentValue: reading.value,
            thresholdType: 'below_optimal',
            severity: 'warning',
            lifeImpact: param.lifeImpactDescription || undefined,
            recommendedAction: param.recommendedAction || undefined
          };
        } else if (param.optimalMax !== null && reading.value > param.optimalMax) {
          violation = {
            parameterId: param.id,
            parameterName: param.parameterName,
            currentValue: reading.value,
            thresholdType: 'above_optimal',
            severity: 'warning',
            lifeImpact: param.lifeImpactDescription || undefined,
            recommendedAction: param.recommendedAction || undefined
          };
        }
        
        if (violation) {
          violations.push(violation);
          
          // Create alert for violation
          try {
            // Determine which thresholds to store based on violation type
            let optimalMin: number | undefined;
            let optimalMax: number | undefined;
            
            if (violation.thresholdType === 'below_critical') {
              optimalMin = param.criticalMin ?? undefined;
            } else if (violation.thresholdType === 'above_critical') {
              optimalMax = param.criticalMax ?? undefined;
            } else {
              optimalMin = param.optimalMin ?? undefined;
              optimalMax = param.optimalMax ?? undefined;
            }
            
            await this.createOperatingConditionAlert({
              orgId: orgId || equipmentData.orgId,
              equipmentId,
              parameterId: param.id,
              parameterName: param.parameterName,
              currentValue: reading.value,
              optimalMin,
              optimalMax,
              thresholdType: violation.thresholdType,
              severity: violation.severity,
              lifeImpact: param.lifeImpactDescription ?? undefined,
              recommendedAction: param.recommendedAction ?? undefined,
              message: `${param.parameterName} is ${violation.thresholdType.replace('_', ' ')}: ${reading.value} ${param.unit || ''}`,
              acknowledged: false,
              resolved: false
            });
            alertsCreated++;
          } catch (error) {
            // Alert might already exist (idempotency), continue
          }
        }
      }
    }
    
    return { violations, alertsCreated };
  }

  // ===== ORGANIZATION MANAGEMENT METHODS =====

  async getOrganizations(): Promise<Organization[]> {
    return await db.select().from(organizations).orderBy(organizations.name);
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const result = await db.select().from(organizations).where(eq(organizations.id, id));
    return result[0];
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    const result = await db.select().from(organizations).where(eq(organizations.slug, slug));
    return result[0];
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const [newOrg] = await db.insert(organizations)
      .values({
        ...org,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newOrg;
  }

  async updateOrganization(id: string, updates: Partial<InsertOrganization>): Promise<Organization> {
    const [updated] = await db.update(organizations)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, id))
      .returning();
    
    if (!updated) {
      throw new Error(`Organization ${id} not found`);
    }
    
    return updated;
  }

  async deleteOrganization(id: string): Promise<void> {
    const result = await db.delete(organizations)
      .where(eq(organizations.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Organization ${id} not found`);
    }
  }

  // ===== USER MANAGEMENT METHODS =====

  async getUsers(orgId?: string): Promise<User[]> {
    let query = db.select().from(users);
    
    if (orgId) {
      query = query.where(eq(users.orgId, orgId));
    }
    
    return query.orderBy(users.name);
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByEmail(email: string, orgId?: string): Promise<User | undefined> {
    let query = db.select().from(users).where(eq(users.email, email));
    
    if (orgId) {
      query = query.where(and(eq(users.email, email), eq(users.orgId, orgId)));
    }
    
    const result = await query;
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users)
      .values({
        ...user,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newUser;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const [updated] = await db.update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    
    if (!updated) {
      throw new Error(`User ${id} not found`);
    }
    
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    const result = await db.delete(users)
      .where(eq(users.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`User ${id} not found`);
    }
  }

  // ===== ADVANCED ANALYTICS MANAGEMENT METHODS =====

  // ML Models Management
  async getMlModels(orgId: string, modelType?: string, status?: string): Promise<MlModel[]> {
    let query = db.select().from(mlModels);
    
    const conditions = [eq(mlModels.orgId, orgId)]; // Always enforce org scoping
    if (modelType) {
      conditions.push(eq(mlModels.modelType, modelType));
    }
    if (status) {
      conditions.push(eq(mlModels.status, status));
    }
    
    query = query.where(and(...conditions));
    
    return query.orderBy(desc(mlModels.createdAt));
  }

  async getMlModel(id: string, orgId: string): Promise<MlModel | undefined> {
    const result = await db.select().from(mlModels)
      .where(and(eq(mlModels.id, id), eq(mlModels.orgId, orgId)));
    return result[0];
  }

  async createMlModel(model: InsertMlModel, orgId: string): Promise<MlModel> {
    const [newModel] = await db.insert(mlModels)
      .values({
        ...model,
        orgId, // Enforce org scoping
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newModel;
  }

  async updateMlModel(id: string, updates: Partial<InsertMlModel>, orgId: string): Promise<MlModel> {
    const [updated] = await db.update(mlModels)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(mlModels.id, id), eq(mlModels.orgId, orgId)))
      .returning();
    
    if (!updated) {
      throw new Error(`ML Model ${id} not found or access denied`);
    }
    
    return updated;
  }

  async deleteMlModel(id: string, orgId: string): Promise<void> {
    const result = await db.delete(mlModels)
      .where(and(eq(mlModels.id, id), eq(mlModels.orgId, orgId)))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`ML Model ${id} not found or access denied`);
    }
  }

  // Anomaly Detection Management
  async getAnomalyDetections(orgId: string, equipmentId?: string, severity?: string): Promise<AnomalyDetection[]> {
    let query = db.select().from(anomalyDetections);
    
    const conditions = [eq(anomalyDetections.orgId, orgId)]; // Always enforce org scoping
    if (equipmentId) {
      conditions.push(eq(anomalyDetections.equipmentId, equipmentId));
    }
    if (severity) {
      conditions.push(eq(anomalyDetections.severity, severity));
    }
    
    query = query.where(and(...conditions));
    
    return query.orderBy(desc(anomalyDetections.detectionTimestamp));
  }

  async getAnomalyDetection(id: number, orgId: string): Promise<AnomalyDetection | undefined> {
    const result = await db.select().from(anomalyDetections)
      .where(and(eq(anomalyDetections.id, id), eq(anomalyDetections.orgId, orgId)));
    return result[0];
  }

  async createAnomalyDetection(detection: InsertAnomalyDetection, orgId: string): Promise<AnomalyDetection> {
    const [newDetection] = await db.insert(anomalyDetections)
      .values({
        ...detection,
        orgId, // Enforce org scoping
        detectionTimestamp: new Date(),
      })
      .returning();
    return newDetection;
  }

  async acknowledgeAnomaly(id: number, acknowledgedBy: string, orgId: string): Promise<AnomalyDetection> {
    const [updated] = await db.update(anomalyDetections)
      .set({
        acknowledgedBy,
        acknowledgedAt: new Date(),
      })
      .where(and(eq(anomalyDetections.id, id), eq(anomalyDetections.orgId, orgId)))
      .returning();
    
    if (!updated) {
      throw new Error(`Anomaly detection ${id} not found or access denied`);
    }
    
    return updated;
  }

  // Failure Prediction Management
  async getFailurePredictions(orgId: string, equipmentId?: string, riskLevel?: string): Promise<FailurePrediction[]> {
    let query = db.select().from(failurePredictions);
    
    const conditions = [eq(failurePredictions.orgId, orgId)]; // Always enforce org scoping
    if (equipmentId) {
      conditions.push(eq(failurePredictions.equipmentId, equipmentId));
    }
    if (riskLevel) {
      conditions.push(eq(failurePredictions.riskLevel, riskLevel));
    }
    
    query = query.where(and(...conditions));
    
    return query.orderBy(desc(failurePredictions.predictionTimestamp));
  }

  async getFailurePrediction(id: number, orgId: string): Promise<FailurePrediction | undefined> {
    const result = await db.select().from(failurePredictions)
      .where(and(eq(failurePredictions.id, id), eq(failurePredictions.orgId, orgId)));
    return result[0];
  }

  async createFailurePrediction(prediction: InsertFailurePrediction, orgId: string): Promise<FailurePrediction> {
    const [newPrediction] = await db.insert(failurePredictions)
      .values({
        ...prediction,
        orgId, // Enforce org scoping
        predictionTimestamp: new Date(),
      })
      .returning();
    return newPrediction;
  }

  // Threshold Optimization Management
  async getThresholdOptimizations(orgId: string, equipmentId?: string, sensorType?: string): Promise<ThresholdOptimization[]> {
    let query = db.select().from(thresholdOptimizations);
    
    const conditions = [eq(thresholdOptimizations.orgId, orgId)]; // Always enforce org scoping
    if (equipmentId) {
      conditions.push(eq(thresholdOptimizations.equipmentId, equipmentId));
    }
    if (sensorType) {
      conditions.push(eq(thresholdOptimizations.sensorType, sensorType));
    }
    
    query = query.where(and(...conditions));
    
    return query.orderBy(desc(thresholdOptimizations.optimizationTimestamp));
  }

  async getThresholdOptimization(id: number, orgId: string): Promise<ThresholdOptimization | undefined> {
    const result = await db.select().from(thresholdOptimizations)
      .where(and(eq(thresholdOptimizations.id, id), eq(thresholdOptimizations.orgId, orgId)));
    return result[0];
  }

  async createThresholdOptimization(optimization: InsertThresholdOptimization, orgId: string): Promise<ThresholdOptimization> {
    const [newOptimization] = await db.insert(thresholdOptimizations)
      .values({
        ...optimization,
        orgId, // Enforce org scoping
        optimizationTimestamp: new Date(),
      })
      .returning();
    return newOptimization;
  }

  async applyThresholdOptimization(id: number, orgId: string): Promise<ThresholdOptimization> {
    const [updated] = await db.update(thresholdOptimizations)
      .set({
        appliedAt: new Date(),
      })
      .where(and(eq(thresholdOptimizations.id, id), eq(thresholdOptimizations.orgId, orgId)))
      .returning();
    
    if (!updated) {
      throw new Error(`Threshold optimization ${id} not found or access denied`);
    }
    
    return updated;
  }

  // Digital Twin Management
  async getDigitalTwins(orgId: string, vesselId?: string, twinType?: string): Promise<DigitalTwin[]> {
    let query = db.select().from(digitalTwins)
      .innerJoin(vessels, eq(digitalTwins.vesselId, vessels.id));
    
    const conditions = [eq(vessels.orgId, orgId)]; // Enforce org scoping through vessel ownership
    if (vesselId) {
      conditions.push(eq(digitalTwins.vesselId, vesselId));
    }
    if (twinType) {
      conditions.push(eq(digitalTwins.twinType, twinType));
    }
    
    query = query.where(and(...conditions));
    
    return query.orderBy(desc(digitalTwins.updatedAt)).then(results => 
      results.map(r => r.digital_twins)
    );
  }

  async getDigitalTwin(id: string, orgId: string): Promise<DigitalTwin | undefined> {
    const result = await db.select().from(digitalTwins)
      .innerJoin(vessels, eq(digitalTwins.vesselId, vessels.id))
      .where(and(eq(digitalTwins.id, id), eq(vessels.orgId, orgId)));
    return result[0]?.digital_twins;
  }

  // Twin Simulation Management
  async getTwinSimulations(digitalTwinId?: string, scenarioType?: string, status?: string): Promise<TwinSimulation[]> {
    let query = db.select().from(twinSimulations);
    
    const conditions = [];
    if (digitalTwinId) {
      conditions.push(eq(twinSimulations.digitalTwinId, digitalTwinId));
    }
    if (scenarioType) {
      conditions.push(eq(twinSimulations.scenarioType, scenarioType));
    }
    if (status) {
      conditions.push(eq(twinSimulations.status, status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return query.orderBy(desc(twinSimulations.startTime));
  }

  async getTwinSimulation(id: string): Promise<TwinSimulation | undefined> {
    const result = await db.select().from(twinSimulations).where(eq(twinSimulations.id, id));
    return result[0];
  }

}

// Initialize sample data for database (only in development)
export async function initializeSampleData() {
  // Initialize sample data for development and testing
  console.log('Initializing sample data for reports and analytics...');

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

  // Sample alert configurations - comprehensive monitoring thresholds
  const sampleAlertConfigurations = [
    // Engine temperature monitoring
    {
      equipmentId: "ENG1",
      sensorType: "temperature",
      warningThreshold: 85,
      criticalThreshold: 95,
      enabled: true,
      notifyEmail: false,
      notifyInApp: true
    },
    {
      equipmentId: "ENG2",
      sensorType: "temperature",
      warningThreshold: 85,
      criticalThreshold: 95,
      enabled: true,
      notifyEmail: true,
      notifyInApp: true
    },
    // Engine vibration monitoring
    {
      equipmentId: "ENG1",
      sensorType: "vibration",
      warningThreshold: 1.8,
      criticalThreshold: 2.5,
      enabled: true,
      notifyEmail: true,
      notifyInApp: true
    },
    {
      equipmentId: "ENG2",
      sensorType: "vibration",
      warningThreshold: 1.8,
      criticalThreshold: 2.5,
      enabled: true,
      notifyEmail: false,
      notifyInApp: true
    },
    // Generator voltage monitoring
    {
      equipmentId: "GEN1",
      sensorType: "voltage",
      warningThreshold: 495,
      criticalThreshold: 510,
      enabled: true,
      notifyEmail: false,
      notifyInApp: true
    },
    {
      equipmentId: "GEN2",
      sensorType: "voltage",
      warningThreshold: 495,
      criticalThreshold: 510,
      enabled: true,
      notifyEmail: true,
      notifyInApp: true
    },
    // Generator current monitoring
    {
      equipmentId: "GEN1",
      sensorType: "current",
      warningThreshold: 140,
      criticalThreshold: 160,
      enabled: true,
      notifyEmail: false,
      notifyInApp: true
    },
    {
      equipmentId: "GEN2",
      sensorType: "current",
      warningThreshold: 140,
      criticalThreshold: 160,
      enabled: true,
      notifyEmail: false,
      notifyInApp: true
    },
    // Generator frequency monitoring
    {
      equipmentId: "GEN1",
      sensorType: "frequency",
      warningThreshold: 61.5,
      criticalThreshold: 63.0,
      enabled: true,
      notifyEmail: false,
      notifyInApp: true
    },
    {
      equipmentId: "GEN2",
      sensorType: "frequency",
      warningThreshold: 61.5,
      criticalThreshold: 63.0,
      enabled: true,
      notifyEmail: true,
      notifyInApp: true
    },
    // Pump flow rate monitoring (low flow alerts)
    {
      equipmentId: "PUMP1",
      sensorType: "flow_rate",
      warningThreshold: 220,
      criticalThreshold: 200,
      enabled: true,
      notifyEmail: true,
      notifyInApp: true
    },
    // Pump pressure monitoring
    {
      equipmentId: "PUMP1",
      sensorType: "pressure",
      warningThreshold: 75,
      criticalThreshold: 65,
      enabled: true,
      notifyEmail: true,
      notifyInApp: true
    },
    // Additional pump vibration monitoring
    {
      equipmentId: "PUMP1",
      sensorType: "vibration",
      warningThreshold: 2.0,
      criticalThreshold: 3.0,
      enabled: true,
      notifyEmail: false,
      notifyInApp: true
    }
  ];

  // Insert alert configurations
  for (const config of sampleAlertConfigurations) {
    await db.insert(alertConfigurations).values(config);
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
    
    // Initialize TimescaleDB setup
    const { ensureTimescaleDBSetup } = await import('./timescaledb-bootstrap');
    await ensureTimescaleDBSetup();
    
    // Create essential database views for inventory management
    const { createDatabaseViews, verifyDatabaseViews } = await import('./schema-views');
    await createDatabaseViews();
    
    // Verify views are working correctly
    const viewVerification = await verifyDatabaseViews();
    if (!viewVerification.success) {
      console.error('Database view verification failed:', viewVerification.errors);
      throw new Error('Essential database views are not functioning properly');
    }
    
    // Seed stock entries for existing parts to ensure data consistency
    console.log('🌱 Seeding stock entries for parts...');
    const storage = new DatabaseStorage();
    const seedResult = await storage.seedStockForParts('default-org-id');
    console.log(`✅ Stock seeding completed: ${seedResult.created} stock entries created, ${seedResult.skipped} skipped`);
    
    // Initialize database indexes for production performance
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DB_INDEXES === 'true') {
      const { createDatabaseIndexes, analyzeDatabasePerformance } = await import('./db-indexes');
      await createDatabaseIndexes();
      
      // Analyze performance in development for optimization insights
      if (process.env.NODE_ENV === 'development') {
        await analyzeDatabasePerformance();
      }
    }
    
    // Sample data seeding disabled
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// Database initialization is now handled explicitly in server/index.ts
// Removed auto-execution to prevent duplicate initialization
