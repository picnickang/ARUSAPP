import { storage } from './storage';
import { vesselIntelligence } from './vessel-intelligence';
import type { SelectVessel, WorkOrder, EquipmentTelemetry } from '@shared/schema';
import type { MLPredictionResult } from './ml-prediction-service';

export interface ReportContext {
  type: 'health' | 'fleet_summary' | 'maintenance' | 'compliance' | 'custom';
  scope: {
    vesselId?: string;
    equipmentId?: string;
    timeframe: { start: Date; end: Date };
    organizationId: string;
  };
  data: {
    vessels?: SelectVessel[];
    equipment?: any[];
    workOrders?: WorkOrder[];
    telemetry?: EquipmentTelemetry[];
    maintenanceSchedules?: any[];
    alerts?: any[];
    crew?: any[];
    compliance?: any[];
  };
  metadata: {
    generatedAt: Date;
    requestedBy?: string;
    audience: 'executive' | 'technical' | 'maintenance' | 'compliance';
    priority: 'low' | 'medium' | 'high' | 'critical';
  };
  intelligence?: {
    vesselLearnings?: any;
    historicalContext?: any;
    patterns?: any[];
    predictions?: Array<{
      equipmentId: string;
      equipmentName: string;
      equipmentType: string;
      mlPrediction: MLPredictionResult;
    }>;
  };
  citations?: {
    sourceType: string;
    sourceId: string;
    title: string;
    relevance: number;
  }[];
}

export interface ContextBuilderOptions {
  includeIntelligence?: boolean;
  includePredictions?: boolean;
  includeHistoricalData?: boolean;
  timeframeDays?: number;
  audience?: 'executive' | 'technical' | 'maintenance' | 'compliance';
}

export class ReportContextBuilder {
  /**
   * Build comprehensive context for vessel health report
   */
  async buildVesselHealthContext(
    vesselId: string,
    orgId: string = 'default-org',
    options: ContextBuilderOptions = {}
  ): Promise<ReportContext> {
    const vessel = await storage.getVessel(vesselId);
    if (!vessel) {
      throw new Error(`Vessel not found: ${vesselId}`);
    }

    const timeframeDays = options.timeframeDays || 30;
    const end = new Date();
    const start = new Date(end.getTime() - timeframeDays * 24 * 60 * 60 * 1000);

    const [equipment, workOrders, telemetry, schedules, alerts] = await Promise.all([
      this.getVesselEquipment(vesselId),
      this.getVesselWorkOrders(vesselId, start, end),
      this.getVesselTelemetry(vesselId, start, end),
      this.getVesselMaintenanceSchedules(vesselId),
      this.getVesselAlerts(vesselId, start, end)
    ]);

    let intelligence;
    if (options.includeIntelligence || options.includePredictions) {
      const tasks: Promise<any>[] = [];
      
      if (options.includeIntelligence) {
        tasks.push(
          vesselIntelligence.learnVesselPatterns(vesselId, timeframeDays),
          vesselIntelligence.getHistoricalContext(vesselId)
        );
      }
      
      const results = await Promise.all(tasks);
      
      intelligence = {
        ...(options.includeIntelligence && {
          vesselLearnings: results[0],
          historicalContext: results[1]
        })
      };
      
      // Fetch ML predictions for equipment if requested
      if (options.includePredictions && equipment.length > 0) {
        const { predictWithHybridModel } = await import('./ml-prediction-service');
        
        const predictionPromises = equipment.slice(0, 10).map(async (eq) => {
          try {
            const prediction = await predictWithHybridModel(storage, eq.id, orgId);
            if (prediction) {
              return {
                equipmentId: eq.id,
                equipmentName: eq.name,
                equipmentType: eq.type,
                mlPrediction: prediction
              };
            }
          } catch (error) {
            console.warn(`[Context] ML prediction failed for ${eq.id}:`, error);
          }
          return null;
        });
        
        const predictions = (await Promise.all(predictionPromises)).filter(p => p !== null);
        if (predictions.length > 0) {
          intelligence.predictions = predictions as any;
        }
      }
    }

    const citations = this.buildCitations(vessel, equipment, workOrders);

    return {
      type: 'health',
      scope: {
        vesselId,
        timeframe: { start, end },
        organizationId: orgId
      },
      data: {
        vessels: [vessel],
        equipment,
        workOrders,
        telemetry,
        maintenanceSchedules: schedules,
        alerts
      },
      metadata: {
        generatedAt: new Date(),
        audience: options.audience || 'technical',
        priority: this.determinePriority(workOrders, alerts)
      },
      intelligence,
      citations
    };
  }

  /**
   * Build comprehensive context for fleet summary report
   */
  async buildFleetSummaryContext(
    orgId: string = 'default-org',
    options: ContextBuilderOptions = {}
  ): Promise<ReportContext> {
    const timeframeDays = options.timeframeDays || 30;
    const end = new Date();
    const start = new Date(end.getTime() - timeframeDays * 24 * 60 * 60 * 1000);

    const [vessels, equipment, workOrders, telemetry, alerts] = await Promise.all([
      storage.getVessels(),
      storage.getEquipmentRegistry(),
      storage.getWorkOrders(),
      storage.getLatestTelemetryReadings(),
      storage.getAlertNotifications()
    ]);

    const filteredWorkOrders = workOrders.filter(wo => 
      new Date(wo.createdAt) >= start && new Date(wo.createdAt) <= end
    );

    const filteredAlerts = alerts.filter(alert => 
      new Date(alert.createdAt) >= start && new Date(alert.createdAt) <= end
    );

    let intelligence;
    if (options.includeIntelligence || options.includePredictions) {
      intelligence = {};
      
      if (options.includeIntelligence && vessels.length > 0) {
        const vesselIntelligencePromises = vessels.slice(0, 5).map(v => 
          vesselIntelligence.getHistoricalContext(v.id).catch(() => null)
        );
        const contexts = await Promise.all(vesselIntelligencePromises);
        intelligence.historicalContexts = contexts.filter(c => c !== null);
      }
      
      // Fetch ML predictions for equipment if requested
      if (options.includePredictions && equipment.length > 0) {
        const { predictWithHybridModel } = await import('./ml-prediction-service');
        
        const predictionPromises = equipment.slice(0, 20).map(async (eq) => {
          try {
            const prediction = await predictWithHybridModel(storage, eq.id, orgId);
            if (prediction) {
              return {
                equipmentId: eq.id,
                equipmentName: eq.name,
                equipmentType: eq.type,
                mlPrediction: prediction
              };
            }
          } catch (error) {
            console.warn(`[Context] ML prediction failed for ${eq.id}:`, error);
          }
          return null;
        });
        
        const predictions = (await Promise.all(predictionPromises)).filter(p => p !== null);
        if (predictions.length > 0) {
          intelligence.predictions = predictions as any;
        }
      }
    }

    const citations = this.buildCitations(vessels[0], equipment, filteredWorkOrders);

    return {
      type: 'fleet_summary',
      scope: {
        timeframe: { start, end },
        organizationId: orgId
      },
      data: {
        vessels,
        equipment,
        workOrders: filteredWorkOrders,
        telemetry,
        alerts: filteredAlerts
      },
      metadata: {
        generatedAt: new Date(),
        audience: options.audience || 'executive',
        priority: this.determinePriority(filteredWorkOrders, filteredAlerts)
      },
      intelligence,
      citations
    };
  }

  /**
   * Build comprehensive context for maintenance report
   */
  async buildMaintenanceContext(
    vesselId: string | undefined,
    orgId: string = 'default-org',
    options: ContextBuilderOptions = {}
  ): Promise<ReportContext> {
    const timeframeDays = options.timeframeDays || 90;
    const end = new Date();
    const start = new Date(end.getTime() - timeframeDays * 24 * 60 * 60 * 1000);

    let vessels: SelectVessel[];
    let equipment: any[];
    let workOrders: WorkOrder[];
    let schedules: any[];

    if (vesselId) {
      const vessel = await storage.getVessel(vesselId);
      if (!vessel) {
        throw new Error(`Vessel not found: ${vesselId}`);
      }
      vessels = [vessel];
      equipment = await this.getVesselEquipment(vesselId);
      workOrders = await this.getVesselWorkOrders(vesselId, start, end);
      schedules = await this.getVesselMaintenanceSchedules(vesselId);
    } else {
      vessels = await storage.getVessels();
      equipment = await storage.getEquipmentRegistry();
      const allOrders = await storage.getWorkOrders();
      workOrders = allOrders.filter(wo => 
        new Date(wo.createdAt) >= start && new Date(wo.createdAt) <= end
      );
      schedules = await storage.getMaintenanceSchedules();
    }

    let intelligence;
    if (options.includeIntelligence && vesselId) {
      const learnings = await vesselIntelligence.learnVesselPatterns(vesselId, timeframeDays);
      intelligence = {
        vesselLearnings: learnings,
        patterns: learnings.maintenancePatterns
      };
    }

    const citations = this.buildCitations(vessels[0], equipment, workOrders);

    return {
      type: 'maintenance',
      scope: {
        vesselId,
        timeframe: { start, end },
        organizationId: orgId
      },
      data: {
        vessels,
        equipment,
        workOrders,
        maintenanceSchedules: schedules
      },
      metadata: {
        generatedAt: new Date(),
        audience: options.audience || 'maintenance',
        priority: this.determinePriority(workOrders, [])
      },
      intelligence,
      citations
    };
  }

  /**
   * Build comprehensive context for compliance report
   */
  async buildComplianceContext(
    vesselId: string | undefined,
    orgId: string = 'default-org',
    options: ContextBuilderOptions = {}
  ): Promise<ReportContext> {
    const timeframeDays = options.timeframeDays || 90;
    const end = new Date();
    const start = new Date(end.getTime() - timeframeDays * 24 * 60 * 60 * 1000);

    let vessels: SelectVessel[];
    let crew: any[];
    let certifications: any[];
    let restSheets: any[];
    let complianceLogs: any[];

    if (vesselId) {
      const vessel = await storage.getVessel(vesselId);
      if (!vessel) {
        throw new Error(`Vessel not found: ${vesselId}`);
      }
      vessels = [vessel];
      crew = await storage.getCrew(undefined, vesselId);
      certifications = await this.getCrewCertifications(crew.map(c => c.id));
      restSheets = await this.getCrewRestSheets(vesselId, start, end);
      complianceLogs = await this.getComplianceLogs(start, end);
    } else {
      vessels = await storage.getVessels();
      crew = await storage.getCrew();
      certifications = await this.getCrewCertifications(crew.map(c => c.id));
      restSheets = await storage.getCrewRestSheets();
      complianceLogs = await this.getComplianceLogs(start, end);
    }

    const workOrders = await storage.getWorkOrders();
    const filteredOrders = workOrders.filter(wo => 
      new Date(wo.createdAt) >= start && 
      new Date(wo.createdAt) <= end &&
      (vesselId ? wo.vesselId === vesselId : true)
    );

    const citations = this.buildCitations(vessels[0], crew, filteredOrders);

    return {
      type: 'compliance',
      scope: {
        vesselId,
        timeframe: { start, end },
        organizationId: orgId
      },
      data: {
        vessels,
        crew,
        workOrders: filteredOrders,
        compliance: complianceLogs
      },
      metadata: {
        generatedAt: new Date(),
        audience: options.audience || 'compliance',
        priority: this.determinePriority(filteredOrders, complianceLogs)
      },
      citations
    };
  }

  /**
   * Build custom context for specialized reports
   */
  async buildCustomContext(
    reportType: string,
    params: Record<string, any>,
    orgId: string = 'default-org',
    options: ContextBuilderOptions = {}
  ): Promise<ReportContext> {
    const timeframeDays = options.timeframeDays || 30;
    const end = new Date();
    const start = new Date(end.getTime() - timeframeDays * 24 * 60 * 60 * 1000);

    const [vessels, equipment, workOrders, telemetry] = await Promise.all([
      storage.getVessels(),
      storage.getEquipmentRegistry(),
      storage.getWorkOrders(),
      storage.getLatestTelemetryReadings()
    ]);

    return {
      type: 'custom',
      scope: {
        timeframe: { start, end },
        organizationId: orgId
      },
      data: {
        vessels,
        equipment,
        workOrders,
        telemetry
      },
      metadata: {
        generatedAt: new Date(),
        audience: options.audience || 'technical',
        priority: 'medium'
      }
    };
  }

  private async getVesselEquipment(vesselId: string): Promise<any[]> {
    const allEquipment = await storage.getEquipmentRegistry();
    return allEquipment.filter(e => e.vesselId === vesselId);
  }

  private async getVesselWorkOrders(vesselId: string, start: Date, end: Date): Promise<WorkOrder[]> {
    const allOrders = await storage.getWorkOrders();
    return allOrders.filter(wo => 
      wo.vesselId === vesselId &&
      new Date(wo.createdAt) >= start &&
      new Date(wo.createdAt) <= end
    );
  }

  private async getVesselTelemetry(vesselId: string, start: Date, end: Date): Promise<EquipmentTelemetry[]> {
    const equipment = await this.getVesselEquipment(vesselId);
    const equipmentIds = equipment.map(e => e.id);
    
    const allTelemetry = await storage.getLatestTelemetryReadings();
    return allTelemetry.filter(t => 
      equipmentIds.includes(t.equipmentId) &&
      new Date(t.ts) >= start &&
      new Date(t.ts) <= end
    );
  }

  private async getVesselMaintenanceSchedules(vesselId: string): Promise<any[]> {
    const allSchedules = await storage.getMaintenanceSchedules();
    return allSchedules.filter(s => s.vesselId === vesselId);
  }

  private async getVesselAlerts(vesselId: string, start: Date, end: Date): Promise<any[]> {
    const equipment = await this.getVesselEquipment(vesselId);
    const equipmentIds = equipment.map(e => e.id);
    
    const allAlerts = await storage.getAlertNotifications();
    return allAlerts.filter(a => 
      equipmentIds.includes(a.equipmentId) &&
      new Date(a.createdAt) >= start &&
      new Date(a.createdAt) <= end
    );
  }

  private async getCrewCertifications(crewIds: string[]): Promise<any[]> {
    const allCerts = await storage.getCrewCertifications();
    return allCerts.filter(cert => crewIds.includes(cert.crewId));
  }

  private async getCrewRestSheets(vesselId: string, start: Date, end: Date): Promise<any[]> {
    const restData = await storage.getCrewRestByDateRange(
      vesselId,
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0]
    );
    return restData.map(r => r.sheet);
  }

  private async getComplianceLogs(start: Date, end: Date): Promise<any[]> {
    const allLogs = await storage.getComplianceAuditLog({
      startDate: start,
      endDate: end
    });
    return allLogs;
  }

  private determinePriority(
    workOrders: WorkOrder[],
    alerts: any[]
  ): 'low' | 'medium' | 'high' | 'critical' {
    const criticalOrders = workOrders.filter(wo => wo.priority === 'critical').length;
    const urgentOrders = workOrders.filter(wo => wo.priority === 'urgent').length;
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;

    if (criticalOrders > 0 || criticalAlerts > 2) return 'critical';
    if (urgentOrders > 2 || criticalAlerts > 0) return 'high';
    if (urgentOrders > 0 || alerts.length > 5) return 'medium';
    return 'low';
  }

  private buildCitations(
    vessel: SelectVessel | undefined,
    relatedItems: any[],
    workOrders: WorkOrder[]
  ): ReportContext['citations'] {
    const citations: ReportContext['citations'] = [];

    if (vessel) {
      citations.push({
        sourceType: 'vessel',
        sourceId: vessel.id,
        title: vessel.name,
        relevance: 1.0
      });
    }

    relatedItems.slice(0, 5).forEach((item, index) => {
      citations.push({
        sourceType: item.type || 'equipment',
        sourceId: item.id,
        title: item.name || item.type || `Item ${item.id}`,
        relevance: Math.max(0.5, 1.0 - (index * 0.1))
      });
    });

    const criticalOrders = workOrders
      .filter(wo => wo.priority === 'critical' || wo.priority === 'urgent')
      .slice(0, 3);

    criticalOrders.forEach((order, index) => {
      citations.push({
        sourceType: 'work_order',
        sourceId: order.id,
        title: order.title,
        relevance: Math.max(0.6, 0.9 - (index * 0.1))
      });
    });

    return citations;
  }
}

export const reportContextBuilder = new ReportContextBuilder();
