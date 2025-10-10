// Conflict Resolution Types and Constants for ARUS Marine Offline Sync

export type ResolutionStrategy = 
  | 'manual'      // Require human decision
  | 'max'         // Use maximum value (conservative for safety)
  | 'min'         // Use minimum value
  | 'append'      // Concatenate values
  | 'lww'         // Last Write Wins (based on timestamp)
  | 'priority'    // Based on priority/progression
  | 'or'          // Logical OR (for boolean flags)
  | 'server';     // Always prefer server value

export interface SafetyCriticalField {
  table: string;
  field: string;
  strategy: ResolutionStrategy;
  reason: string;
}

// Safety-critical fields requiring manual resolution
export const SAFETY_CRITICAL_FIELDS: SafetyCriticalField[] = [
  // Sensor Configurations - Safety Thresholds
  { table: 'sensor_configurations', field: 'critLo', strategy: 'manual', reason: 'Critical low threshold - safety impact' },
  { table: 'sensor_configurations', field: 'critHi', strategy: 'manual', reason: 'Critical high threshold - safety impact' },
  { table: 'sensor_configurations', field: 'warnLo', strategy: 'manual', reason: 'Warning low threshold - safety impact' },
  { table: 'sensor_configurations', field: 'warnHi', strategy: 'manual', reason: 'Warning high threshold - safety impact' },
  
  // Alert Configurations - Alert Thresholds
  { table: 'alert_configurations', field: 'warningThreshold', strategy: 'manual', reason: 'Warning threshold - safety impact' },
  { table: 'alert_configurations', field: 'criticalThreshold', strategy: 'manual', reason: 'Critical threshold - safety impact' },
  
  // Operating Parameters - Critical Limits
  { table: 'operating_parameters', field: 'criticalMin', strategy: 'manual', reason: 'Critical minimum - safety impact' },
  { table: 'operating_parameters', field: 'criticalMax', strategy: 'manual', reason: 'Critical maximum - safety impact' },
  { table: 'operating_parameters', field: 'optimalMin', strategy: 'manual', reason: 'Optimal minimum - operational impact' },
  { table: 'operating_parameters', field: 'optimalMax', strategy: 'manual', reason: 'Optimal maximum - operational impact' },
  
  // Equipment - Active Status
  { table: 'equipment', field: 'isActive', strategy: 'manual', reason: 'Equipment active status - operational safety' },
  
  // DTC Faults - Active Status
  { table: 'dtc_faults', field: 'active', strategy: 'manual', reason: 'Fault active status - safety monitoring' },
];

// Automatic resolution rules for non-safety-critical fields
export interface AutoResolutionRule {
  table: string;
  field: string;
  strategy: ResolutionStrategy;
  description: string;
}

export const AUTO_RESOLUTION_RULES: AutoResolutionRule[] = [
  // Work Orders - Status Progression
  { table: 'work_orders', field: 'status', strategy: 'priority', description: 'Use most progressed status' },
  { table: 'work_orders', field: 'priority', strategy: 'max', description: 'Use higher priority' },
  { table: 'work_orders', field: 'description', strategy: 'append', description: 'Combine descriptions' },
  { table: 'work_orders', field: 'notes', strategy: 'append', description: 'Combine notes' },
  
  // Sensor Configurations - Non-critical fields
  { table: 'sensor_configurations', field: 'label', strategy: 'lww', description: 'Last write wins for labels' },
  { table: 'sensor_configurations', field: 'unit', strategy: 'lww', description: 'Last write wins for units' },
  { table: 'sensor_configurations', field: 'isActive', strategy: 'or', description: 'OR logic for active status' },
  
  // Alert Configurations - Non-critical fields
  { table: 'alert_configurations', field: 'message', strategy: 'lww', description: 'Last write wins for messages' },
  { table: 'alert_configurations', field: 'isActive', strategy: 'or', description: 'OR logic for active status' },
  
  // Crew Assignments
  { table: 'crew_assignment', field: 'status', strategy: 'priority', description: 'Use most progressed status' },
  { table: 'crew_assignment', field: 'role', strategy: 'lww', description: 'Last write wins for role' },
  
  // Equipment - Non-critical fields
  { table: 'equipment', field: 'name', strategy: 'lww', description: 'Last write wins for name' },
  { table: 'equipment', field: 'location', strategy: 'lww', description: 'Last write wins for location' },
];

// Work order status progression order (for priority resolution)
export const WORK_ORDER_STATUS_PRIORITY: Record<string, number> = {
  'pending': 1,
  'scheduled': 2,
  'in_progress': 3,
  'paused': 4,
  'completed': 5,
  'cancelled': 6,
};

// Crew assignment status progression order
export const CREW_ASSIGNMENT_STATUS_PRIORITY: Record<string, number> = {
  'scheduled': 1,
  'completed': 2,
  'cancelled': 3,
};

// Helper function to check if a field is safety-critical
export function isSafetyCritical(table: string, field: string): boolean {
  return SAFETY_CRITICAL_FIELDS.some(
    scf => scf.table === table && scf.field === field
  );
}

// Helper function to get resolution strategy for a field
export function getResolutionStrategy(table: string, field: string): ResolutionStrategy {
  // Check safety-critical fields first
  const safetyCritical = SAFETY_CRITICAL_FIELDS.find(
    scf => scf.table === table && scf.field === field
  );
  if (safetyCritical) {
    return safetyCritical.strategy;
  }
  
  // Check automatic resolution rules
  const autoRule = AUTO_RESOLUTION_RULES.find(
    rule => rule.table === table && rule.field === field
  );
  if (autoRule) {
    return autoRule.strategy;
  }
  
  // Default: last write wins for non-specified fields
  return 'lww';
}

// Helper function to get reason for resolution strategy
export function getResolutionReason(table: string, field: string): string {
  const safetyCritical = SAFETY_CRITICAL_FIELDS.find(
    scf => scf.table === table && scf.field === field
  );
  if (safetyCritical) {
    return safetyCritical.reason;
  }
  
  const autoRule = AUTO_RESOLUTION_RULES.find(
    rule => rule.table === table && rule.field === field
  );
  if (autoRule) {
    return autoRule.description;
  }
  
  return 'Default last-write-wins strategy';
}

// Conflict detection result
export interface ConflictDetectionResult {
  hasConflict: boolean;
  conflicts: FieldConflict[];
  canAutoResolve: boolean;
  requiresManualResolution: boolean;
}

// Individual field conflict
export interface FieldConflict {
  table: string;
  recordId: string;
  field: string;
  localValue: any;
  localVersion: number;
  localTimestamp: Date;
  serverValue: any;
  serverVersion: number;
  serverTimestamp: Date;
  isSafetyCritical: boolean;
  strategy: ResolutionStrategy;
  reason: string;
  suggestedResolution?: any;
}

// Conflict resolution request
export interface ConflictResolutionRequest {
  conflictId: string;
  resolvedValue: any;
  resolvedBy: string;
  resolutionNotes?: string;
}

// Batch sync request with conflict detection
export interface BatchSyncRequest {
  table: string;
  records: Array<{
    id: string;
    data: any;
    version: number;
    modifiedBy: string;
    modifiedDevice: string;
    timestamp: Date;
  }>;
  deviceId: string;
  userId: string;
}
