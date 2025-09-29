import { db } from "./db.js";
import { parts, stock, reservations, purchaseOrders, purchaseOrderItems, crewCertification, sensorThresholds, dailyMetricRollups } from "@shared/schema.js";
import { eq, sql, and, lt, gte, isNotNull } from "drizzle-orm";

export interface DataIssue {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reference?: any;
  resolvedAt?: Date;
}

export interface ReconciliationResult {
  success: boolean;
  issues: DataIssue[];
  stats: {
    totalIssues: number;
    criticalIssues: number;
    checkedEntities: number;
    executionTimeMs: number;
  };
  timestamp: Date;
}

/**
 * Main reconciliation function that runs all data integrity checks
 */
export async function reconcileAll(orgId: string): Promise<ReconciliationResult> {
  const startTime = Date.now();
  const issues: DataIssue[] = [];
  let checkedEntities = 0;

  try {
    // Run all reconciliation checks with defensive error handling
    try {
      const partsStockIssues = await checkPartsStockAlignment(orgId);
      issues.push(...partsStockIssues.issues);
      checkedEntities += partsStockIssues.entitiesChecked;
    } catch (error) {
      console.warn('[Reconciliation] Parts-stock alignment check failed:', error.message);
      issues.push({
        code: 'PARTS_STOCK_CHECK_UNAVAILABLE',
        message: `Parts-stock alignment check temporarily unavailable: ${error.message}`,
        severity: 'low',
      });
    }

    try {
      const reservationIssues = await checkReservationOverflow(orgId);
      issues.push(...reservationIssues.issues);
      checkedEntities += reservationIssues.entitiesChecked;
    } catch (error) {
      console.warn('[Reconciliation] Reservation overflow check failed:', error.message);
      issues.push({
        code: 'RESERVATION_CHECK_UNAVAILABLE',
        message: `Reservation overflow check temporarily unavailable: ${error.message}`,
        severity: 'low',
      });
    }

    try {
      const purchaseOrderIssues = await checkWorkOrdersPendingOnPO(orgId);
      issues.push(...purchaseOrderIssues.issues);
      checkedEntities += purchaseOrderIssues.entitiesChecked;
    } catch (error) {
      console.warn('[Reconciliation] Purchase order dependency check failed:', error.message);
      issues.push({
        code: 'PO_DEPENDENCY_CHECK_UNAVAILABLE',
        message: `Purchase order dependency check temporarily unavailable: ${error.message}`,
        severity: 'low',
      });
    }

    try {
      const certificationIssues = await checkCrewCertificationExpiry(orgId);
      issues.push(...certificationIssues.issues);
      checkedEntities += certificationIssues.entitiesChecked;
    } catch (error) {
      console.warn('[Reconciliation] Crew certification check failed:', error.message);
      issues.push({
        code: 'CERTIFICATION_CHECK_UNAVAILABLE',
        message: `Crew certification expiry check temporarily unavailable: ${error.message}`,
        severity: 'low',
      });
    }

    try {
      const thresholdIssues = await checkSensorThresholdConflicts(orgId);
      issues.push(...thresholdIssues.issues);
      checkedEntities += thresholdIssues.entitiesChecked;
    } catch (error) {
      console.warn('[Reconciliation] Sensor threshold conflict check failed:', error.message);
      issues.push({
        code: 'THRESHOLD_CHECK_UNAVAILABLE',
        message: `Sensor threshold conflict check temporarily unavailable: ${error.message}`,
        severity: 'low',
      });
    }

    const executionTimeMs = Date.now() - startTime;

    return {
      success: true,
      issues,
      stats: {
        totalIssues: issues.length,
        criticalIssues: issues.filter(i => i.severity === 'critical').length,
        checkedEntities,
        executionTimeMs,
      },
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('Reconciliation failed:', error);
    return {
      success: false,
      issues: [{
        code: 'RECONCILIATION_ERROR',
        message: `Reconciliation process failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'critical',
      }],
      stats: {
        totalIssues: 1,
        criticalIssues: 1,
        checkedEntities,
        executionTimeMs: Date.now() - startTime,
      },
      timestamp: new Date(),
    };
  }
}

/**
 * Check if parts catalog prices are synchronized with stock unit costs
 */
async function checkPartsStockAlignment(orgId: string): Promise<{ issues: DataIssue[]; entitiesChecked: number }> {
  const issues: DataIssue[] = [];
  
  try {
    // Auto-fix: Update stock unit costs to match parts standard cost
    const updateResult = await db
      .update(stock)
      .set({
        unitCost: sql`(SELECT ${parts.standardCost} FROM ${parts} WHERE ${parts.id} = ${stock.partId})`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(stock.orgId, orgId),
          sql`${stock.unitCost} != (SELECT ${parts.standardCost} FROM ${parts} WHERE ${parts.id} = ${stock.partId} AND ${parts.orgId} = ${orgId})`
        )
      );

    // Check for any remaining misalignments
    const misalignedStock = await db
      .select({
        partId: stock.partId,
        stockUnitCost: stock.unitCost,
        partsStandardCost: parts.standardCost,
        partName: parts.name,
      })
      .from(stock)
      .innerJoin(parts, eq(stock.partId, parts.id))
      .where(
        and(
          eq(stock.orgId, orgId),
          sql`${stock.unitCost} != ${parts.standardCost}`
        )
      );

    for (const item of misalignedStock) {
      issues.push({
        code: 'PARTS_STOCK_PRICE_MISMATCH',
        message: `Price mismatch for ${item.partName}: stock shows $${item.stockUnitCost}, parts catalog shows $${item.partsStandardCost}`,
        severity: 'medium',
        reference: { partId: item.partId, stockPrice: item.stockUnitCost, catalogPrice: item.partsStandardCost },
      });
    }

    const entitiesChecked = await db
      .select({ count: sql<number>`count(*)` })
      .from(stock)
      .where(eq(stock.orgId, orgId))
      .then(r => r[0]?.count || 0);

    return { issues, entitiesChecked };
  } catch (error) {
    console.error('Parts-stock alignment check failed:', error);
    return {
      issues: [{
        code: 'PARTS_STOCK_CHECK_ERROR',
        message: `Failed to check parts-stock alignment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'high',
      }],
      entitiesChecked: 0,
    };
  }
}

/**
 * Check if reservations exceed available stock levels
 */
async function checkReservationOverflow(orgId: string): Promise<{ issues: DataIssue[]; entitiesChecked: number }> {
  const issues: DataIssue[] = [];
  
  try {
    const reservationOverflows = await db
      .select({
        partId: stock.partId,
        partName: parts.name,
        onHand: stock.quantityOnHand,
        reserved: sql<number>`COALESCE(SUM(${reservations.quantity}), 0)`,
      })
      .from(stock)
      .innerJoin(parts, eq(stock.partId, parts.id))
      .leftJoin(reservations, and(
        eq(reservations.partId, stock.partId),
        eq(reservations.status, 'active')
      ))
      .where(eq(stock.orgId, orgId))
      .groupBy(stock.partId, stock.quantityOnHand, parts.name)
      .having(sql`COALESCE(SUM(${reservations.quantity}), 0) > ${stock.quantityOnHand}`);

    for (const overflow of reservationOverflows) {
      issues.push({
        code: 'RESERVATION_EXCEEDS_STOCK',
        message: `Reservations (${overflow.reserved}) exceed available stock (${overflow.onHand}) for ${overflow.partName}`,
        severity: 'high',
        reference: { 
          partId: overflow.partId, 
          onHand: overflow.onHand, 
          reserved: overflow.reserved,
          overage: Number(overflow.reserved) - Number(overflow.onHand),
        },
      });
    }

    const entitiesChecked = await db
      .select({ count: sql<number>`count(*)` })
      .from(reservations)
      .innerJoin(stock, eq(reservations.partId, stock.partId))
      .where(and(eq(stock.orgId, orgId), eq(reservations.status, 'active')))
      .then(r => r[0]?.count || 0);

    return { issues, entitiesChecked };
  } catch (error) {
    console.error('Reservation overflow check failed:', error);
    return {
      issues: [{
        code: 'RESERVATION_CHECK_ERROR',
        message: `Failed to check reservation overflows: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'high',
      }],
      entitiesChecked: 0,
    };
  }
}

/**
 * Check for work orders waiting on open purchase orders
 */
async function checkWorkOrdersPendingOnPO(orgId: string): Promise<{ issues: DataIssue[]; entitiesChecked: number }> {
  const issues: DataIssue[] = [];
  
  try {
    const pendingWorkOrders = await db
      .select({
        workOrderId: reservations.workOrderId,
        partId: reservations.partId,
        partName: parts.name,
        reservedQty: reservations.quantity,
        poId: purchaseOrders.id,
        orderNumber: purchaseOrders.orderNumber,
        expectedDate: purchaseOrders.expectedDate,
        poStatus: purchaseOrders.status,
      })
      .from(reservations)
      .innerJoin(parts, eq(reservations.partId, parts.id))
      .innerJoin(purchaseOrderItems, eq(purchaseOrderItems.partId, reservations.partId))
      .innerJoin(purchaseOrders, eq(purchaseOrders.id, purchaseOrderItems.poId))
      .where(
        and(
          eq(parts.orgId, orgId),
          eq(reservations.status, 'active'),
          sql`${purchaseOrders.status} IN ('draft', 'sent', 'acknowledged', 'shipped')`
        )
      );

    for (const pending of pendingWorkOrders) {
      const severity = pending.expectedDate && new Date(pending.expectedDate) < new Date() ? 'high' : 'medium';
      const expectedText = pending.expectedDate ? 
        ` (expected ${pending.expectedDate.toLocaleDateString()})` : 
        ' (no expected date)';
      
      issues.push({
        code: 'WORK_ORDER_WAITING_ON_PO',
        message: `Work Order ${pending.workOrderId} waiting for part ${pending.partName} from PO ${pending.orderNumber}${expectedText}`,
        severity,
        reference: {
          workOrderId: pending.workOrderId,
          partId: pending.partId,
          poId: pending.poId,
          orderNumber: pending.orderNumber,
          expectedDate: pending.expectedDate,
          status: pending.poStatus,
        },
      });
    }

    return { issues, entitiesChecked: pendingWorkOrders.length };
  } catch (error) {
    console.error('Work orders pending on PO check failed:', error);
    return {
      issues: [{
        code: 'PO_DEPENDENCY_CHECK_ERROR',
        message: `Failed to check work order PO dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'high',
      }],
      entitiesChecked: 0,
    };
  }
}

/**
 * Check for crew certifications expiring within 30 days
 */
async function checkCrewCertificationExpiry(orgId: string): Promise<{ issues: DataIssue[]; entitiesChecked: number }> {
  const issues: DataIssue[] = [];
  
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Import crew table from schema
    const { crew } = await import("@shared/schema.js");
    
    const expiringCerts = await db
      .select({
        crewId: crewCertification.crewId,
        cert: crewCertification.cert,
        expiresAt: crewCertification.expiresAt,
        issuedBy: crewCertification.issuedBy,
      })
      .from(crewCertification)
      .innerJoin(crew, eq(crew.id, crewCertification.crewId))
      .where(
        and(
          eq(crew.orgId, orgId),
          lt(crewCertification.expiresAt, thirtyDaysFromNow),
          gte(crewCertification.expiresAt, new Date())
        )
      );

    for (const cert of expiringCerts) {
      const daysUntilExpiry = Math.ceil((cert.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const severity = daysUntilExpiry <= 7 ? 'critical' : daysUntilExpiry <= 14 ? 'high' : 'medium';
      
      issues.push({
        code: 'CREW_CERTIFICATION_EXPIRING',
        message: `Crew certification ${cert.cert} expires in ${daysUntilExpiry} days (${cert.expiresAt.toLocaleDateString()})`,
        severity,
        reference: {
          crewId: cert.crewId,
          certification: cert.cert,
          expiresAt: cert.expiresAt,
          issuedBy: cert.issuedBy,
          daysUntilExpiry,
        },
      });
    }

    const entitiesChecked = await db
      .select({ count: sql<number>`count(*)` })
      .from(crewCertification)
      .then(r => r[0]?.count || 0);

    return { issues, entitiesChecked };
  } catch (error) {
    console.error('Crew certification expiry check failed:', error);
    return {
      issues: [{
        code: 'CERTIFICATION_EXPIRY_CHECK_ERROR',
        message: `Failed to check certification expiry: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'high',
      }],
      entitiesChecked: 0,
    };
  }
}

/**
 * Check for multiple active sensor thresholds for the same device/sensor combination
 */
async function checkSensorThresholdConflicts(orgId: string): Promise<{ issues: DataIssue[]; entitiesChecked: number }> {
  const issues: DataIssue[] = [];
  
  try {
    const conflicts = await db
      .select({
        deviceId: sensorThresholds.deviceId,
        sensorType: sensorThresholds.sensorType,
        count: sql<number>`count(*)`,
      })
      .from(sensorThresholds)
      .where(
        and(
          eq(sensorThresholds.orgId, orgId),
          eq(sensorThresholds.isActive, true)
        )
      )
      .groupBy(sensorThresholds.deviceId, sensorThresholds.sensorType)
      .having(sql`count(*) > 1`);

    for (const conflict of conflicts) {
      issues.push({
        code: 'MULTIPLE_ACTIVE_THRESHOLDS',
        message: `Multiple active thresholds (${conflict.count}) found for device ${conflict.deviceId}, sensor ${conflict.sensorType}`,
        severity: 'medium',
        reference: {
          deviceId: conflict.deviceId,
          sensorType: conflict.sensorType,
          activeCount: conflict.count,
        },
      });
    }

    const entitiesChecked = await db
      .select({ count: sql<number>`count(*)` })
      .from(sensorThresholds)
      .where(
        and(
          eq(sensorThresholds.orgId, orgId),
          eq(sensorThresholds.isActive, true)
        )
      )
      .then(r => r[0]?.count || 0);

    return { issues, entitiesChecked };
  } catch (error) {
    console.error('Sensor threshold conflict check failed:', error);
    return {
      issues: [{
        code: 'THRESHOLD_CONFLICT_CHECK_ERROR',
        message: `Failed to check sensor threshold conflicts: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'high',
      }],
      entitiesChecked: 0,
    };
  }
}

/**
 * Create or update a daily metric rollup
 */
export async function rollupDailyMetric(
  orgId: string,
  date: string, // YYYY-MM-DD format
  vesselId: string | null,
  deviceId: string | null,
  metricName: string,
  value: number,
  unit?: string,
  aggregationType: 'sum' | 'avg' | 'min' | 'max' | 'count' = 'sum',
  dataQuality: number = 1.0
): Promise<void> {
  try {
    await db
      .insert(dailyMetricRollups)
      .values({
        date,
        orgId,
        vesselId,
        deviceId,
        metricName,
        value,
        unit,
        aggregationType,
        dataQuality,
      })
      .onConflictDoUpdate({
        target: [dailyMetricRollups.date, dailyMetricRollups.orgId, dailyMetricRollups.vesselId, dailyMetricRollups.deviceId, dailyMetricRollups.metricName],
        set: {
          value,
          unit,
          aggregationType,
          dataQuality,
          calculatedAt: new Date(),
        },
      });
  } catch (error) {
    console.error('Failed to create daily metric rollup:', error);
    throw error;
  }
}

/**
 * Get recent reconciliation summary for dashboard
 */
export async function getReconciliationSummary(orgId: string): Promise<{
  lastRun: Date | null;
  totalIssues: number;
  criticalIssues: number;
  recentActivity: string[];
}> {
  try {
    // This would typically be stored in a reconciliation_runs table
    // For now, we'll run a quick check to get current status
    const quickResult = await reconcileAll(orgId);
    
    return {
      lastRun: quickResult.timestamp,
      totalIssues: quickResult.stats.totalIssues,
      criticalIssues: quickResult.stats.criticalIssues,
      recentActivity: quickResult.issues.slice(0, 5).map(issue => `${issue.code}: ${issue.message}`),
    };
  } catch (error) {
    console.error('Failed to get reconciliation summary:', error);
    return {
      lastRun: null,
      totalIssues: 0,
      criticalIssues: 0,
      recentActivity: ['Failed to load reconciliation data'],
    };
  }
}