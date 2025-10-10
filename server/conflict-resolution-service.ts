// Conflict Resolution Service for ARUS Marine Offline Sync
import { db } from './db';
import { syncConflicts } from '@shared/sync-conflicts-schema';
import { 
  ConflictDetectionResult, 
  FieldConflict, 
  ResolutionStrategy,
  getResolutionStrategy,
  getResolutionReason,
  isSafetyCritical,
  WORK_ORDER_STATUS_PRIORITY,
  CREW_ASSIGNMENT_STATUS_PRIORITY,
} from '@shared/conflict-resolution-types';
import { eq, and } from 'drizzle-orm';

/**
 * Detect conflicts between local changes and server state
 */
export async function detectConflicts(
  table: string,
  recordId: string,
  localData: Record<string, any>,
  localVersion: number,
  localTimestamp: Date,
  localUser: string,
  localDevice: string,
  orgId: string
): Promise<ConflictDetectionResult> {
  
  // Fetch current server state
  const serverRecord = await getServerRecord(table, recordId);
  
  if (!serverRecord) {
    // Record doesn't exist on server - no conflict, can insert
    return {
      hasConflict: false,
      conflicts: [],
      canAutoResolve: true,
      requiresManualResolution: false,
    };
  }
  
  const serverVersion = serverRecord.version || 1;
  
  // Check for version conflict
  if (localVersion >= serverVersion) {
    // Local version is same or newer - no conflict
    return {
      hasConflict: false,
      conflicts: [],
      canAutoResolve: true,
      requiresManualResolution: false,
    };
  }
  
  // Version mismatch - detect field-level conflicts
  const conflicts: FieldConflict[] = [];
  
  for (const field in localData) {
    // Skip metadata fields
    if (['id', 'orgId', 'createdAt', 'updatedAt', 'version', 'lastModifiedBy', 'lastModifiedDevice'].includes(field)) {
      continue;
    }
    
    const localValue = localData[field];
    const serverValue = serverRecord[field];
    
    // Check if values differ
    if (JSON.stringify(localValue) !== JSON.stringify(serverValue)) {
      const safetyCritical = isSafetyCritical(table, field);
      const strategy = getResolutionStrategy(table, field);
      const reason = getResolutionReason(table, field);
      
      const conflict: FieldConflict = {
        table,
        recordId,
        field,
        localValue,
        localVersion,
        localTimestamp,
        serverValue,
        serverVersion,
        serverTimestamp: serverRecord.updatedAt || serverRecord.createdAt,
        isSafetyCritical: safetyCritical,
        strategy,
        reason,
      };
      
      // Calculate suggested resolution based on strategy
      if (strategy !== 'manual') {
        conflict.suggestedResolution = calculateAutoResolution(
          strategy,
          localValue,
          serverValue,
          localTimestamp,
          serverRecord.updatedAt || serverRecord.createdAt,
          table,
          field
        );
      }
      
      conflicts.push(conflict);
    }
  }
  
  if (conflicts.length === 0) {
    // No actual conflicts, safe to apply
    return {
      hasConflict: false,
      conflicts: [],
      canAutoResolve: true,
      requiresManualResolution: false,
    };
  }
  
  const requiresManual = conflicts.some(c => c.isSafetyCritical);
  const canAutoResolve = conflicts.every(c => !c.isSafetyCritical);
  
  return {
    hasConflict: true,
    conflicts,
    canAutoResolve,
    requiresManualResolution: requiresManual,
  };
}

/**
 * Calculate automatic resolution based on strategy
 */
function calculateAutoResolution(
  strategy: ResolutionStrategy,
  localValue: any,
  serverValue: any,
  localTimestamp: Date,
  serverTimestamp: Date,
  table: string,
  field: string
): any {
  switch (strategy) {
    case 'max':
      return Math.max(Number(localValue), Number(serverValue));
    
    case 'min':
      return Math.min(Number(localValue), Number(serverValue));
    
    case 'append':
      if (typeof localValue === 'string' && typeof serverValue === 'string') {
        return `${serverValue}\n---\n${localValue}`;
      }
      return localValue;
    
    case 'lww': // Last Write Wins
      return localTimestamp > serverTimestamp ? localValue : serverValue;
    
    case 'priority':
      if (table === 'work_orders' && field === 'status') {
        const localPriority = WORK_ORDER_STATUS_PRIORITY[localValue as string] || 0;
        const serverPriority = WORK_ORDER_STATUS_PRIORITY[serverValue as string] || 0;
        return localPriority > serverPriority ? localValue : serverValue;
      }
      if (table === 'crew_assignment' && field === 'status') {
        const localPriority = CREW_ASSIGNMENT_STATUS_PRIORITY[localValue as string] || 0;
        const serverPriority = CREW_ASSIGNMENT_STATUS_PRIORITY[serverValue as string] || 0;
        return localPriority > serverPriority ? localValue : serverValue;
      }
      return localValue;
    
    case 'or':
      return Boolean(localValue) || Boolean(serverValue);
    
    case 'server':
      return serverValue;
    
    default:
      return localValue;
  }
}

/**
 * Log conflict to sync_conflicts table
 */
export async function logConflict(
  conflict: FieldConflict,
  localUser: string,
  localDevice: string,
  serverUser: string | null,
  serverDevice: string | null,
  orgId: string
): Promise<string> {
  const [conflictRecord] = await db.insert(syncConflicts).values({
    orgId,
    tableName: conflict.table,
    recordId: conflict.recordId,
    fieldName: conflict.field,
    localValue: JSON.stringify(conflict.localValue),
    localVersion: conflict.localVersion,
    localTimestamp: conflict.localTimestamp,
    localUser,
    localDevice,
    serverValue: JSON.stringify(conflict.serverValue),
    serverVersion: conflict.serverVersion,
    serverTimestamp: conflict.serverTimestamp,
    serverUser,
    serverDevice,
    resolutionStrategy: conflict.strategy,
    resolved: false,
    isSafetyCritical: conflict.isSafetyCritical,
  }).returning({ id: syncConflicts.id });
  
  return conflictRecord.id;
}

/**
 * Auto-resolve conflicts that don't require manual intervention
 */
export async function autoResolveConflicts(
  conflicts: FieldConflict[],
  localUser: string,
  localDevice: string,
  orgId: string
): Promise<Record<string, any>> {
  const resolvedData: Record<string, any> = {};
  
  for (const conflict of conflicts) {
    if (!conflict.isSafetyCritical && conflict.suggestedResolution !== undefined) {
      resolvedData[conflict.field] = conflict.suggestedResolution;
      
      // Log the auto-resolution
      const conflictId = await logConflict(
        conflict,
        localUser,
        localDevice,
        null, // serverUser unknown in this context
        null, // serverDevice unknown in this context
        orgId
      );
      
      // Mark as auto-resolved
      await db.update(syncConflicts)
        .set({
          resolved: true,
          resolvedValue: JSON.stringify(conflict.suggestedResolution),
          resolvedBy: 'system:auto',
          resolvedAt: new Date(),
        })
        .where(eq(syncConflicts.id, conflictId));
    }
  }
  
  return resolvedData;
}

/**
 * Manually resolve a conflict
 */
export async function manuallyResolveConflict(
  conflictId: string,
  resolvedValue: any,
  resolvedBy: string
): Promise<void> {
  await db.update(syncConflicts)
    .set({
      resolved: true,
      resolvedValue: JSON.stringify(resolvedValue),
      resolvedBy,
      resolvedAt: new Date(),
    })
    .where(eq(syncConflicts.id, conflictId));
}

/**
 * Get pending conflicts for an organization
 */
export async function getPendingConflicts(orgId: string) {
  return await db.select()
    .from(syncConflicts)
    .where(
      and(
        eq(syncConflicts.orgId, orgId),
        eq(syncConflicts.resolved, false)
      )
    )
    .orderBy(syncConflicts.isSafetyCritical, syncConflicts.createdAt);
}

/**
 * Get server record for conflict detection
 * This is a helper that dynamically queries the correct table
 */
async function getServerRecord(table: string, recordId: string): Promise<any> {
  // Import all tables dynamically
  const schema = await import('@shared/schema');
  const tableMap: Record<string, any> = {
    'sensor_configurations': schema.sensorConfigurations,
    'alert_configurations': schema.alertConfigurations,
    'work_orders': schema.workOrders,
    'operating_parameters': schema.operatingParameters,
    'equipment': schema.equipment,
    'crew_assignment': schema.crewAssignment,
    'dtc_faults': schema.dtcFaults,
  };
  
  const dbTable = tableMap[table];
  if (!dbTable) {
    throw new Error(`Unknown table: ${table}`);
  }
  
  const [record] = await db.select()
    .from(dbTable)
    .where(eq(dbTable.id, recordId))
    .limit(1);
  
  return record;
}
