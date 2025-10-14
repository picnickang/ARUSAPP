/**
 * Cost Savings Calculation Engine
 * 
 * Calculates money saved through predictive maintenance by comparing:
 * - Actual costs (preventive/predictive maintenance completed early)
 * - vs. Avoided costs (what emergency breakdown would have cost)
 * 
 * Key Formula: Savings = Emergency Cost - Actual Cost
 * 
 * Emergency Cost = (Labor × 3.0) + (Parts × 1.5) + (Downtime × Hours × Rate)
 */

import { db } from './db';
import { costSavings, workOrders, failurePredictions, equipment } from '@shared/schema';
import { eq, and, desc, sql, gte } from 'drizzle-orm';

export interface SavingsCalculation {
  workOrderId: string;
  equipmentId: string;
  vesselId: string | null;
  predictionId: number | null;
  
  // What we actually spent
  actualCost: number;
  actualLaborCost: number;
  actualPartsCost: number;
  actualDowntimeHours: number;
  
  // What we would have spent (emergency scenario)
  avoidedCost: number;
  emergencyLaborCost: number;
  emergencyPartsCost: number;
  emergencyDowntimeHours: number;
  emergencyDowntimeCost: number;
  
  // Savings breakdown
  totalSavings: number;
  laborSavings: number;
  partsSavings: number;
  downtimeSavings: number;
  
  // Attribution
  maintenanceType: 'preventive' | 'predictive' | 'corrective' | 'emergency';
  triggeredBy: 'ml_prediction' | 'sensor_alert' | 'scheduled' | 'manual';
  confidenceScore: number | null;
  
  // Multipliers used
  emergencyLaborMultiplier: number;
  emergencyPartsMultiplier: number;
  downtimeCostPerHour: number;
}

export interface SavingsSummary {
  totalSavings: number;
  totalDowntimePrevented: number;
  savingsByType: {
    labor: number;
    parts: number;
    downtime: number;
  };
  savingsCount: number;
  avgSavingsPerIncident: number;
  topSavings: Array<{
    workOrderId: string;
    equipmentName: string;
    savings: number;
    downtimePrevented: number;
  }>;
}

/**
 * Calculate cost savings for a completed work order
 */
export async function calculateWorkOrderSavings(
  workOrderId: string,
  orgId: string,
  options: {
    emergencyLaborMultiplier?: number;
    emergencyPartsMultiplier?: number;
    emergencyDowntimeMultiplier?: number;
  } = {}
): Promise<SavingsCalculation | null> {
  // Get work order details
  const [workOrder] = await db
    .select()
    .from(workOrders)
    .where(and(
      eq(workOrders.id, workOrderId),
      eq(workOrders.orgId, orgId)
    ))
    .limit(1);
  
  if (!workOrder) {
    throw new Error(`Work order ${workOrderId} not found`);
  }
  
  // Only calculate savings for preventive/predictive maintenance
  // Emergency work orders don't generate savings (they're the avoided cost!)
  if (workOrder.status !== 'completed') {
    return null;
  }
  
  // Determine maintenance type from work order context
  // Priority: 1) Check work order's maintenanceType field, 2) Check for linked prediction, 3) Check for schedule
  let maintenanceType: SavingsCalculation['maintenanceType'] = (workOrder.maintenanceType as any) || 'corrective';
  let triggeredBy: SavingsCalculation['triggeredBy'] = 'manual';
  let predictionId: number | null = null;
  let confidenceScore: number | null = null;
  
  // Check if this work order resolved a prediction
  const [linkedPrediction] = await db
    .select()
    .from(failurePredictions)
    .where(eq(failurePredictions.resolvedByWorkOrderId, workOrderId))
    .limit(1);
  
  if (linkedPrediction) {
    maintenanceType = 'predictive';
    triggeredBy = 'ml_prediction';
    predictionId = linkedPrediction.id;
    confidenceScore = linkedPrediction.failureProbability;
  } else if (workOrder.scheduleId) {
    maintenanceType = 'preventive';
    triggeredBy = 'scheduled';
  } else if (workOrder.maintenanceType === 'predictive') {
    triggeredBy = 'manual'; // Manual predictive maintenance (user-initiated)
  }
  
  // If it's emergency/corrective work, we don't calculate savings
  // (These ARE the avoided costs for other equipment)
  if (maintenanceType === 'corrective' || maintenanceType === 'emergency') {
    return null;
  }
  
  // Actual costs from work order
  const actualLaborCost = workOrder.totalLaborCost || 0;
  const actualPartsCost = workOrder.totalPartsCost || 0;
  const actualDowntimeHours = workOrder.actualDowntimeHours || 0;
  const downtimeCostPerHour = workOrder.downtimeCostPerHour || 1000; // Default $1000/hour
  const actualDowntimeCost = actualDowntimeHours * downtimeCostPerHour;
  const actualCost = actualLaborCost + actualPartsCost + actualDowntimeCost;
  
  // Emergency scenario calculations
  const emergencyLaborMultiplier = options.emergencyLaborMultiplier || 3.0;
  const emergencyPartsMultiplier = options.emergencyPartsMultiplier || 1.5;
  const emergencyDowntimeMultiplier = options.emergencyDowntimeMultiplier || 3.0;
  
  const emergencyLaborCost = actualLaborCost * emergencyLaborMultiplier;
  const emergencyPartsCost = actualPartsCost * emergencyPartsMultiplier;
  
  // Emergency downtime is typically 3x planned downtime
  // (Unplanned failures take longer to diagnose and fix)
  const emergencyDowntimeHours = actualDowntimeHours > 0 
    ? actualDowntimeHours * emergencyDowntimeMultiplier 
    : 24; // Default 24 hours if no downtime tracked
  const emergencyDowntimeCost = emergencyDowntimeHours * downtimeCostPerHour;
  
  const avoidedCost = emergencyLaborCost + emergencyPartsCost + emergencyDowntimeCost;
  
  // Calculate savings
  const laborSavings = emergencyLaborCost - actualLaborCost;
  const partsSavings = emergencyPartsCost - actualPartsCost;
  const downtimeSavings = emergencyDowntimeCost - actualDowntimeCost;
  const totalSavings = avoidedCost - actualCost;
  
  return {
    workOrderId,
    equipmentId: workOrder.equipmentId,
    vesselId: workOrder.vesselId || null,
    predictionId,
    
    actualCost,
    actualLaborCost,
    actualPartsCost,
    actualDowntimeHours,
    
    avoidedCost,
    emergencyLaborCost,
    emergencyPartsCost,
    emergencyDowntimeHours,
    emergencyDowntimeCost,
    
    totalSavings,
    laborSavings,
    partsSavings,
    downtimeSavings,
    
    maintenanceType,
    triggeredBy,
    confidenceScore,
    
    emergencyLaborMultiplier,
    emergencyPartsMultiplier,
    downtimeCostPerHour,
  };
}

/**
 * Save calculated savings to database
 */
export async function saveCostSavings(
  calculation: SavingsCalculation,
  orgId: string,
  notes?: string
): Promise<void> {
  await db.insert(costSavings).values({
    orgId,
    workOrderId: calculation.workOrderId,
    equipmentId: calculation.equipmentId,
    vesselId: calculation.vesselId,
    predictionId: calculation.predictionId,
    
    maintenanceType: calculation.maintenanceType,
    actualCost: calculation.actualCost,
    avoidedCost: calculation.avoidedCost,
    totalSavings: calculation.totalSavings,
    
    laborSavings: calculation.laborSavings,
    partsSavings: calculation.partsSavings,
    downtimeSavings: calculation.downtimeSavings,
    
    estimatedDowntimePrevented: calculation.emergencyDowntimeHours - calculation.actualDowntimeHours,
    downtimeCostPerHour: calculation.downtimeCostPerHour,
    
    triggeredBy: calculation.triggeredBy,
    confidenceScore: calculation.confidenceScore,
    
    emergencyLaborMultiplier: calculation.emergencyLaborMultiplier,
    emergencyPartsMultiplier: calculation.emergencyPartsMultiplier,
    
    notes,
  });
}

/**
 * Calculate and save savings when work order completes
 */
export async function processWorkOrderCompletion(
  workOrderId: string,
  orgId: string
): Promise<{ saved: boolean; savings?: SavingsCalculation }> {
  // Check if savings already calculated for this work order
  const [existing] = await db
    .select()
    .from(costSavings)
    .where(eq(costSavings.workOrderId, workOrderId))
    .limit(1);
  
  if (existing) {
    return { saved: false }; // Already calculated
  }
  
  const calculation = await calculateWorkOrderSavings(workOrderId, orgId);
  
  if (!calculation) {
    return { saved: false }; // No savings to calculate (emergency/corrective work)
  }
  
  // Only save if there are actual savings
  if (calculation.totalSavings > 0) {
    await saveCostSavings(calculation, orgId, 
      `Automatic calculation on work order completion`
    );
    return { saved: true, savings: calculation };
  }
  
  return { saved: false };
}

/**
 * Get savings summary for a time period
 */
export async function getSavingsSummary(
  orgId: string,
  startDate: Date,
  endDate: Date
): Promise<SavingsSummary> {
  const savings = await db
    .select()
    .from(costSavings)
    .where(and(
      eq(costSavings.orgId, orgId),
      gte(costSavings.calculatedAt, startDate),
      sql`${costSavings.calculatedAt} <= ${endDate}`
    ))
    .orderBy(desc(costSavings.totalSavings));
  
  const totalSavings = savings.reduce((sum, s) => sum + (s.totalSavings || 0), 0);
  const totalDowntimePrevented = savings.reduce((sum, s) => sum + (s.estimatedDowntimePrevented || 0), 0);
  
  const savingsByType = {
    labor: savings.reduce((sum, s) => sum + (s.laborSavings || 0), 0),
    parts: savings.reduce((sum, s) => sum + (s.partsSavings || 0), 0),
    downtime: savings.reduce((sum, s) => sum + (s.downtimeSavings || 0), 0),
  };
  
  const savingsCount = savings.length;
  const avgSavingsPerIncident = savingsCount > 0 ? totalSavings / savingsCount : 0;
  
  // Get equipment names for top savings
  const equipmentIds = [...new Set(savings.slice(0, 5).map(s => s.equipmentId))];
  const equipmentData = equipmentIds.length > 0 
    ? await db
        .select()
        .from(equipment)
        .where(sql`${equipment.id} IN (${sql.join(equipmentIds.map(id => sql`${id}`), sql`, `)})`)
    : [];
  
  const equipmentMap = new Map(equipmentData.map(e => [e.id, e.name]));
  
  const topSavings = savings.slice(0, 5).map(s => ({
    workOrderId: s.workOrderId || '',
    equipmentName: equipmentMap.get(s.equipmentId) || s.equipmentId,
    savings: s.totalSavings || 0,
    downtimePrevented: s.estimatedDowntimePrevented || 0,
  }));
  
  return {
    totalSavings,
    totalDowntimePrevented,
    savingsByType,
    savingsCount,
    avgSavingsPerIncident,
    topSavings,
  };
}

/**
 * Get monthly savings trend
 */
export async function getMonthlySavingsTrend(
  orgId: string,
  months: number = 12
): Promise<Array<{
  month: string;
  totalSavings: number;
  laborSavings: number;
  partsSavings: number;
  downtimeSavings: number;
  downtimePrevented: number;
  savingsCount: number;
}>> {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - months);
  
  const savings = await db
    .select()
    .from(costSavings)
    .where(and(
      eq(costSavings.orgId, orgId),
      gte(costSavings.calculatedAt, cutoffDate)
    ));
  
  // Group by month
  const monthlyData: Record<string, any> = {};
  
  savings.forEach(s => {
    if (!s.calculatedAt) return;
    
    const monthKey = `${s.calculatedAt.getFullYear()}-${String(s.calculatedAt.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        month: monthKey,
        totalSavings: 0,
        laborSavings: 0,
        partsSavings: 0,
        downtimeSavings: 0,
        downtimePrevented: 0,
        savingsCount: 0,
      };
    }
    
    monthlyData[monthKey].totalSavings += s.totalSavings || 0;
    monthlyData[monthKey].laborSavings += s.laborSavings || 0;
    monthlyData[monthKey].partsSavings += s.partsSavings || 0;
    monthlyData[monthKey].downtimeSavings += s.downtimeSavings || 0;
    monthlyData[monthKey].downtimePrevented += s.estimatedDowntimePrevented || 0;
    monthlyData[monthKey].savingsCount += 1;
  });
  
  return Object.values(monthlyData).sort((a: any, b: any) => a.month.localeCompare(b.month));
}
