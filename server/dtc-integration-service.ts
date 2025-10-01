import type { IStorage } from './storage';
import type { DtcFault, DtcDefinition, InsertWorkOrder, InsertAlertNotification } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db';
import { dtcFaults, dtcDefinitions, workOrders, equipment } from '@shared/schema';

export class DtcIntegrationService {
  constructor(private storage: IStorage) {}

  /**
   * Auto-create work orders from critical DTCs (severity 1-2)
   * Returns created work order or null if already exists or not critical
   */
  async createWorkOrderFromDtc(
    dtc: DtcFault & { definition?: DtcDefinition },
    orgId: string
  ): Promise<any | null> {
    // Only create work orders for critical DTCs (severity 1-2)
    if (!dtc.definition || dtc.definition.severity > 2) {
      return null;
    }

    // Check if work order already exists for this DTC
    const existingOrders = await this.storage.getWorkOrders(dtc.equipmentId);
    const dtcWorkOrder = existingOrders.find(wo => 
      wo.status === 'open' && 
      wo.reason?.includes(`SPN ${dtc.spn}`) && 
      wo.reason?.includes(`FMI ${dtc.fmi}`)
    );

    if (dtcWorkOrder) {
      return null; // Work order already exists
    }

    // Get equipment details for vessel association
    const eq = await this.storage.getEquipment(orgId, dtc.equipmentId);
    if (!eq) {
      console.warn(`[DTC Integration] Equipment ${dtc.equipmentId} not found`);
      return null;
    }

    // Create work order
    const priority = dtc.definition.severity === 1 ? 1 : 2; // Critical=1, High=2
    const affectsVesselDowntime = dtc.definition.severity === 1; // Only critical DTCs affect vessel

    const workOrderData: InsertWorkOrder = {
      orgId,
      equipmentId: dtc.equipmentId,
      vesselId: eq.vesselId || undefined,
      status: 'open',
      priority,
      reason: `DTC Fault: SPN ${dtc.spn} / FMI ${dtc.fmi}`,
      description: `${dtc.definition.description}\n\nAutomatic work order created due to ${priority === 1 ? 'critical' : 'high'} severity fault code detected.\n\nDevice: ${dtc.deviceId}\nOccurrence Count: ${dtc.oc}\nFirst Seen: ${dtc.firstSeen}\nLast Seen: ${dtc.lastSeen}`,
      affectsVesselDowntime,
      estimatedDowntimeHours: affectsVesselDowntime ? 4 : undefined, // Default 4 hours for critical
    };

    const newWorkOrder = await this.storage.createWorkOrder(workOrderData);
    console.log(`[DTC Integration] Created work order ${newWorkOrder.id} for DTC SPN ${dtc.spn} FMI ${dtc.fmi}`);
    
    return newWorkOrder;
  }

  /**
   * Calculate equipment health impact from active DTCs
   * Returns a health penalty score (0-100, higher = worse)
   */
  calculateDtcHealthImpact(activeDtcs: Array<DtcFault & { definition?: DtcDefinition }>): number {
    let healthPenalty = 0;

    for (const dtc of activeDtcs) {
      const severity = dtc.definition?.severity || 4;
      const occurrenceMultiplier = Math.min(dtc.oc / 10, 2); // Cap at 2x for high occurrence
      
      // Severity penalties: 1=30, 2=20, 3=10, 4=5
      const basePenalty = severity === 1 ? 30 : severity === 2 ? 20 : severity === 3 ? 10 : 5;
      healthPenalty += basePenalty * (1 + occurrenceMultiplier);
    }

    return Math.min(healthPenalty, 100); // Cap at 100
  }

  /**
   * Get DTC summary for AI/LLM reports
   */
  async getDtcSummaryForReports(equipmentId: string, orgId: string): Promise<{
    activeDtcCount: number;
    criticalCount: number;
    highCount: number;
    moderateCount: number;
    lowCount: number;
    topDtcs: Array<{ spn: number; fmi: number; description: string; severity: number; oc: number }>;
  }> {
    const dtcs = await this.storage.getActiveDtcs(equipmentId, orgId);
    
    const criticalCount = dtcs.filter(d => d.definition?.severity === 1).length;
    const highCount = dtcs.filter(d => d.definition?.severity === 2).length;
    const moderateCount = dtcs.filter(d => d.definition?.severity === 3).length;
    const lowCount = dtcs.filter(d => d.definition?.severity === 4).length;

    // Sort by severity (ascending) then occurrence (descending)
    const topDtcs = dtcs
      .sort((a, b) => {
        const sevA = a.definition?.severity || 999;
        const sevB = b.definition?.severity || 999;
        if (sevA !== sevB) return sevA - sevB;
        return b.oc - a.oc;
      })
      .slice(0, 5)
      .map(d => ({
        spn: d.spn,
        fmi: d.fmi,
        description: d.definition?.description || 'Unknown fault',
        severity: d.definition?.severity || 0,
        oc: d.oc,
      }));

    return {
      activeDtcCount: dtcs.length,
      criticalCount,
      highCount,
      moderateCount,
      lowCount,
      topDtcs,
    };
  }

  /**
   * Get DTC impact on vessel financial tracking
   */
  async calculateDtcFinancialImpact(vesselId: string, orgId: string): Promise<{
    totalDowntimeHours: number;
    estimatedCost: number;
    criticalDtcCount: number;
  }> {
    // Get all equipment for vessel
    const vesselEquipment = await this.storage.getEquipmentByVessel(vesselId, orgId);

    let totalDowntimeHours = 0;
    let criticalDtcCount = 0;

    // Get active DTCs for all equipment
    for (const eq of vesselEquipment) {
      const dtcs = await this.storage.getActiveDtcs(eq.id, orgId);
      const criticalDtcs = dtcs.filter(d => d.definition?.severity === 1);
      criticalDtcCount += criticalDtcs.length;

      // Get related work orders
      const eqWorkOrders = await this.storage.getWorkOrders(eq.id);
      const dtcWorkOrders = eqWorkOrders.filter(wo => 
        wo.reason?.includes('DTC Fault') && wo.affectsVesselDowntime
      );

      for (const wo of dtcWorkOrders) {
        if (wo.actualDowntimeHours) {
          totalDowntimeHours += wo.actualDowntimeHours;
        } else if (wo.estimatedDowntimeHours) {
          totalDowntimeHours += wo.estimatedDowntimeHours;
        }
      }
    }

    // Get vessel to calculate cost
    const vessel = await this.storage.getVessel(vesselId, orgId);
    const dayRate = vessel?.dayRate ? Number(vessel.dayRate) : 50000; // Default $50k/day
    const hourlyRate = dayRate / 24;
    const estimatedCost = totalDowntimeHours * hourlyRate;

    return {
      totalDowntimeHours,
      estimatedCost,
      criticalDtcCount,
    };
  }

  /**
   * Correlate DTCs with telemetry anomalies
   * Returns telemetry readings that occurred near DTC occurrence
   */
  async correlateDtcWithTelemetry(
    dtc: DtcFault,
    orgId: string,
    timeWindowMinutes: number = 60
  ): Promise<any[]> {
    // Map SPN to sensor types
    const spnToSensorMap: Record<number, string> = {
      110: 'engine_coolant_temp',
      190: 'engine_speed',
      96: 'fuel_level',
      100: 'engine_oil_pressure',
      // Add more mappings as needed
    };

    const sensorType = spnToSensorMap[dtc.spn];
    if (!sensorType) {
      return []; // No sensor mapping available
    }

    const startTime = new Date(dtc.firstSeen.getTime() - timeWindowMinutes * 60 * 1000);
    const endTime = new Date(dtc.firstSeen.getTime() + timeWindowMinutes * 60 * 1000);
    
    // Calculate hours for time window (convert to hours, round up)
    const hoursWindow = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));

    try {
      // Use getTelemetryHistory which exists in storage interface
      const allTelemetry = await this.storage.getTelemetryHistory(
        dtc.equipmentId,
        sensorType,
        hoursWindow
      );
      
      // Filter to exact time window
      const filtered = allTelemetry.filter((t: any) => {
        const timestamp = new Date(t.timestamp);
        return timestamp >= startTime && timestamp <= endTime;
      });
      
      // Limit to 100 samples
      return filtered.slice(0, 100);
    } catch (err) {
      console.log(`[DTC Integration] No telemetry found for sensor ${sensorType}`);
      return [];
    }
  }

  /**
   * Check if DTC should trigger an alert
   */
  shouldTriggerAlert(dtc: DtcFault & { definition?: DtcDefinition }): boolean {
    // Trigger alerts for:
    // 1. Critical DTCs (severity 1)
    // 2. New DTCs (occurrence count = 1)
    // 3. Rapidly increasing DTCs (oc > 5)
    
    if (dtc.definition?.severity === 1) return true;
    if (dtc.oc === 1) return true;
    if (dtc.oc > 5) return true;
    
    return false;
  }

  /**
   * Get DTC statistics for dashboard
   */
  async getDtcDashboardStats(orgId: string): Promise<{
    totalActiveDtcs: number;
    criticalDtcs: number;
    equipmentWithDtcs: number;
    dtcTriggeredWorkOrders: number;
  }> {
    const allEquipment = await this.storage.getEquipmentRegistry(orgId);
    let totalActiveDtcs = 0;
    let criticalDtcs = 0;
    let equipmentWithDtcs = 0;

    for (const eq of allEquipment) {
      const dtcs = await this.storage.getActiveDtcs(eq.id, orgId);
      if (dtcs.length > 0) {
        equipmentWithDtcs++;
        totalActiveDtcs += dtcs.length;
        criticalDtcs += dtcs.filter(d => d.definition?.severity === 1).length;
      }
    }

    // Count DTC-triggered work orders (org-scoped)
    const allWorkOrders = await this.storage.getWorkOrders();
    const dtcWorkOrders = allWorkOrders.filter(wo => 
      wo.orgId === orgId && 
      wo.reason?.includes('DTC Fault') && 
      wo.status === 'open'
    );

    return {
      totalActiveDtcs,
      criticalDtcs,
      equipmentWithDtcs,
      dtcTriggeredWorkOrders: dtcWorkOrders.length,
    };
  }
}

// Export singleton instance
let dtcServiceInstance: DtcIntegrationService | null = null;

export function initDtcIntegrationService(storage: IStorage): DtcIntegrationService {
  if (!dtcServiceInstance) {
    dtcServiceInstance = new DtcIntegrationService(storage);
    console.log('[DTC Integration] Service initialized');
  }
  return dtcServiceInstance;
}

export function getDtcIntegrationService(): DtcIntegrationService {
  if (!dtcServiceInstance) {
    throw new Error('[DTC Integration] Service not initialized');
  }
  return dtcServiceInstance;
}
