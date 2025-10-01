import { storage } from './storage';
import type { EquipmentTelemetry, WorkOrder, MaintenanceSchedule, SelectVessel } from '@shared/schema';

export interface VesselPattern {
  vesselId: string;
  patternType: 'failure' | 'maintenance' | 'operational' | 'seasonal';
  description: string;
  frequency: number;
  confidence: number;
  firstObserved: Date;
  lastObserved: Date;
  affectedEquipment: string[];
  correlatedMetrics: string[];
  recommendedActions: string[];
}

export interface VesselLearnings {
  vesselId: string;
  totalOperatingHours: number;
  failurePatterns: VesselPattern[];
  maintenancePatterns: VesselPattern[];
  operationalInsights: {
    peakLoadTimes: string[];
    efficiencyTrends: { metric: string; trend: 'improving' | 'declining' | 'stable'; change: number }[];
    environmentalFactors: { factor: string; impact: 'high' | 'medium' | 'low'; description: string }[];
  };
  costAnalysis: {
    averageMaintenanceCost: number;
    costTrend: 'increasing' | 'decreasing' | 'stable';
    costDrivers: { category: string; percentage: number }[];
  };
  predictiveIndicators: {
    indicator: string;
    leadTime: number;
    accuracy: number;
    description: string;
  }[];
}

export interface HistoricalContext {
  vesselId: string;
  age: number;
  totalWorkOrders: number;
  completedWorkOrders: number;
  avgResolutionTime: number;
  criticalIncidents: number;
  complianceScore: number;
  maintenanceHistory: {
    scheduled: number;
    unscheduled: number;
    emergency: number;
    preventive: number;
  };
  performanceMetrics: {
    availability: number;
    reliability: number;
    maintainability: number;
  };
  equipmentHealth: {
    critical: number;
    warning: number;
    normal: number;
    excellent: number;
  };
}

export class VesselIntelligenceService {
  /**
   * Learn patterns from vessel historical data
   */
  async learnVesselPatterns(vesselId: string, lookbackDays: number = 365): Promise<VesselLearnings> {
    const vessel = await storage.getVessel(vesselId);
    if (!vessel) {
      throw new Error(`Vessel not found: ${vesselId}`);
    }

    const [workOrders, equipment, telemetry, schedules] = await Promise.all([
      this.getWorkOrdersForVessel(vesselId, lookbackDays),
      storage.getEquipmentRegistry(),
      this.getTelemetryForVessel(vesselId, lookbackDays),
      this.getMaintenanceSchedulesForVessel(vesselId)
    ]);

    const vesselEquipment = equipment.filter(e => e.vesselId === vesselId);

    const failurePatterns = await this.analyzeFailurePatterns(workOrders, vesselEquipment, telemetry);
    const maintenancePatterns = await this.analyzeMaintenancePatterns(schedules, workOrders);
    const operationalInsights = await this.analyzeOperationalPatterns(telemetry, vesselEquipment);
    const costAnalysis = await this.analyzeCosts(workOrders);
    const predictiveIndicators = await this.identifyPredictiveIndicators(telemetry, workOrders);

    const totalHours = this.calculateOperatingHours(vessel);

    return {
      vesselId,
      totalOperatingHours: totalHours,
      failurePatterns,
      maintenancePatterns,
      operationalInsights,
      costAnalysis,
      predictiveIndicators
    };
  }

  /**
   * Get comprehensive historical context for a vessel
   */
  async getHistoricalContext(vesselId: string): Promise<HistoricalContext> {
    const vessel = await storage.getVessel(vesselId);
    if (!vessel) {
      throw new Error(`Vessel not found: ${vesselId}`);
    }

    const [workOrders, equipment] = await Promise.all([
      this.getWorkOrdersForVessel(vesselId),
      storage.getEquipmentRegistry()
    ]);

    const vesselEquipment = equipment.filter(e => e.vesselId === vesselId);
    const vesselAge = this.calculateVesselAge(vessel);

    const completedOrders = workOrders.filter(wo => wo.status === 'completed');
    const avgResolutionTime = this.calculateAverageResolutionTime(completedOrders);
    const criticalIncidents = workOrders.filter(wo => wo.priority === 'critical' || wo.priority === 'urgent').length;

    const maintenanceHistory = {
      scheduled: workOrders.filter(wo => wo.type === 'scheduled').length,
      unscheduled: workOrders.filter(wo => wo.type === 'unscheduled').length,
      emergency: workOrders.filter(wo => wo.priority === 'critical').length,
      preventive: workOrders.filter(wo => wo.type === 'preventive').length
    };

    const performanceMetrics = this.calculatePerformanceMetrics(workOrders, vesselAge);
    const equipmentHealth = this.analyzeEquipmentHealth(vesselEquipment);

    return {
      vesselId,
      age: vesselAge,
      totalWorkOrders: workOrders.length,
      completedWorkOrders: completedOrders.length,
      avgResolutionTime,
      criticalIncidents,
      complianceScore: this.calculateComplianceScore(workOrders, maintenanceHistory),
      maintenanceHistory,
      performanceMetrics,
      equipmentHealth
    };
  }

  /**
   * Analyze failure patterns from work orders and telemetry
   */
  private async analyzeFailurePatterns(
    workOrders: WorkOrder[],
    equipment: any[],
    telemetry: EquipmentTelemetry[]
  ): Promise<VesselPattern[]> {
    const patterns: VesselPattern[] = [];
    
    const failureOrders = workOrders.filter(wo => 
      wo.type === 'corrective' || wo.priority === 'critical' || wo.priority === 'urgent'
    );

    const equipmentFailures = new Map<string, WorkOrder[]>();
    failureOrders.forEach(order => {
      if (!equipmentFailures.has(order.equipmentId)) {
        equipmentFailures.set(order.equipmentId, []);
      }
      equipmentFailures.get(order.equipmentId)!.push(order);
    });

    equipmentFailures.forEach((orders, equipmentId) => {
      if (orders.length >= 2) {
        const eq = equipment.find(e => e.id === equipmentId);
        const avgDaysBetween = this.calculateAverageDaysBetween(orders);
        
        const relatedTelemetry = telemetry.filter(t => t.equipmentId === equipmentId);
        const correlatedMetrics = this.identifyCorrelatedMetrics(relatedTelemetry, orders);

        patterns.push({
          vesselId: orders[0].vesselId || '',
          patternType: 'failure',
          description: `Recurring ${eq?.type || 'equipment'} failures observed ${orders.length} times over ${Math.round(avgDaysBetween * orders.length)} days`,
          frequency: orders.length,
          confidence: Math.min(0.9, orders.length / 10),
          firstObserved: new Date(orders[orders.length - 1].createdAt),
          lastObserved: new Date(orders[0].createdAt),
          affectedEquipment: [equipmentId],
          correlatedMetrics,
          recommendedActions: this.generateFailureRecommendations(eq?.type, orders.length, avgDaysBetween)
        });
      }
    });

    return patterns;
  }

  /**
   * Analyze maintenance patterns from schedules and work orders
   */
  private async analyzeMaintenancePatterns(
    schedules: MaintenanceSchedule[],
    workOrders: WorkOrder[]
  ): Promise<VesselPattern[]> {
    const patterns: VesselPattern[] = [];

    const scheduledWork = workOrders.filter(wo => wo.type === 'scheduled' || wo.type === 'preventive');
    
    if (scheduledWork.length > 0) {
      const adherenceRate = (scheduledWork.filter(wo => wo.status === 'completed').length / scheduledWork.length) * 100;
      const avgCompletionTime = this.calculateAverageResolutionTime(scheduledWork.filter(wo => wo.status === 'completed'));

      patterns.push({
        vesselId: scheduledWork[0].vesselId || '',
        patternType: 'maintenance',
        description: `Scheduled maintenance adherence at ${adherenceRate.toFixed(1)}% with average completion time of ${avgCompletionTime} hours`,
        frequency: scheduledWork.length,
        confidence: adherenceRate > 80 ? 0.9 : 0.6,
        firstObserved: new Date(scheduledWork[scheduledWork.length - 1].createdAt),
        lastObserved: new Date(scheduledWork[0].createdAt),
        affectedEquipment: [...new Set(scheduledWork.map(wo => wo.equipmentId))],
        correlatedMetrics: ['maintenance_schedule_adherence', 'completion_time'],
        recommendedActions: adherenceRate < 80 ? 
          ['Improve maintenance scheduling', 'Review resource allocation', 'Consider predictive maintenance'] :
          ['Continue current maintenance practices', 'Optimize scheduling based on patterns']
      });
    }

    return patterns;
  }

  /**
   * Analyze operational patterns from telemetry data
   */
  private async analyzeOperationalPatterns(
    telemetry: EquipmentTelemetry[],
    equipment: any[]
  ): Promise<VesselLearnings['operationalInsights']> {
    const hourlyLoad = new Map<number, number[]>();
    telemetry.forEach(t => {
      const hour = new Date(t.ts).getHours();
      if (!hourlyLoad.has(hour)) {
        hourlyLoad.set(hour, []);
      }
      hourlyLoad.get(hour)!.push(t.value);
    });

    const peakLoadTimes: string[] = [];
    const avgLoads: [number, number][] = [];
    
    hourlyLoad.forEach((values, hour) => {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      avgLoads.push([hour, avg]);
    });

    avgLoads.sort((a, b) => b[1] - a[1]);
    peakLoadTimes.push(...avgLoads.slice(0, 3).map(([hour]) => `${hour}:00-${hour+1}:00`));

    const efficiencyTrends = this.calculateEfficiencyTrends(telemetry);
    const environmentalFactors = this.identifyEnvironmentalFactors(telemetry);

    return {
      peakLoadTimes,
      efficiencyTrends,
      environmentalFactors
    };
  }

  /**
   * Analyze cost trends and drivers
   */
  private async analyzeCosts(workOrders: WorkOrder[]): Promise<VesselLearnings['costAnalysis']> {
    const ordersWithCost = workOrders.filter(wo => wo.estimatedCost && wo.estimatedCost > 0);
    const totalCost = ordersWithCost.reduce((sum, wo) => sum + (wo.estimatedCost || 0), 0);
    const avgCost = ordersWithCost.length > 0 ? totalCost / ordersWithCost.length : 0;

    const costByType = new Map<string, number>();
    ordersWithCost.forEach(wo => {
      const type = wo.type || 'other';
      costByType.set(type, (costByType.get(type) || 0) + (wo.estimatedCost || 0));
    });

    const costDrivers = Array.from(costByType.entries()).map(([category, cost]) => ({
      category,
      percentage: (cost / totalCost) * 100
    })).sort((a, b) => b.percentage - a.percentage);

    const costTrend = this.determineCostTrend(ordersWithCost);

    return {
      averageMaintenanceCost: avgCost,
      costTrend,
      costDrivers
    };
  }

  /**
   * Identify predictive indicators from telemetry and work orders
   */
  private async identifyPredictiveIndicators(
    telemetry: EquipmentTelemetry[],
    workOrders: WorkOrder[]
  ): Promise<VesselLearnings['predictiveIndicators']> {
    const indicators: VesselLearnings['predictiveIndicators'] = [];

    const telemetryByEquipment = new Map<string, EquipmentTelemetry[]>();
    telemetry.forEach(t => {
      if (!telemetryByEquipment.has(t.equipmentId)) {
        telemetryByEquipment.set(t.equipmentId, []);
      }
      telemetryByEquipment.get(t.equipmentId)!.push(t);
    });

    telemetryByEquipment.forEach((readings, equipmentId) => {
      const failures = workOrders.filter(wo => 
        wo.equipmentId === equipmentId && 
        (wo.priority === 'critical' || wo.type === 'corrective')
      );

      if (failures.length > 0 && readings.length > 20) {
        const sensorTypes = [...new Set(readings.map(r => r.sensorType))];
        
        sensorTypes.forEach(sensorType => {
          const sensorReadings = readings.filter(r => r.sensorType === sensorType);
          const leadTime = this.calculatePredictiveLeadTime(sensorReadings, failures);
          
          if (leadTime > 0) {
            indicators.push({
              indicator: `${sensorType} anomaly detection`,
              leadTime,
              accuracy: Math.min(0.85, 0.6 + (failures.length * 0.05)),
              description: `${sensorType} readings show predictive value ${leadTime} hours before failure`
            });
          }
        });
      }
    });

    return indicators;
  }

  private async getWorkOrdersForVessel(vesselId: string, days?: number): Promise<WorkOrder[]> {
    const allOrders = await storage.getWorkOrders();
    let vesselOrders = allOrders.filter(wo => wo.vesselId === vesselId);
    
    if (days) {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      vesselOrders = vesselOrders.filter(wo => new Date(wo.createdAt) > cutoff);
    }
    
    return vesselOrders;
  }

  private async getTelemetryForVessel(vesselId: string, days: number): Promise<EquipmentTelemetry[]> {
    const equipment = await storage.getEquipmentRegistry();
    const vesselEquipment = equipment.filter(e => e.vesselId === vesselId);
    const equipmentIds = vesselEquipment.map(e => e.id);
    
    const allTelemetry = await storage.getLatestTelemetryReadings();
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    return allTelemetry.filter(t => 
      equipmentIds.includes(t.equipmentId) && 
      new Date(t.ts) > cutoff
    );
  }

  private async getMaintenanceSchedulesForVessel(vesselId: string): Promise<MaintenanceSchedule[]> {
    const allSchedules = await storage.getMaintenanceSchedules();
    return allSchedules.filter(s => s.vesselId === vesselId);
  }

  private calculateOperatingHours(vessel: SelectVessel): number {
    const commissionDate = vessel.commissionDate ? new Date(vessel.commissionDate) : new Date(vessel.createdAt);
    const ageYears = (Date.now() - commissionDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return Math.round(ageYears * 365 * 12);
  }

  private calculateVesselAge(vessel: SelectVessel): number {
    const commissionDate = vessel.commissionDate ? new Date(vessel.commissionDate) : new Date(vessel.createdAt);
    return Math.round((Date.now() - commissionDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  }

  private calculateAverageResolutionTime(workOrders: WorkOrder[]): number {
    const completed = workOrders.filter(wo => wo.status === 'completed' && wo.completedAt);
    if (completed.length === 0) return 0;
    
    const totalHours = completed.reduce((sum, wo) => {
      const start = new Date(wo.createdAt).getTime();
      const end = new Date(wo.completedAt!).getTime();
      return sum + ((end - start) / (60 * 60 * 1000));
    }, 0);
    
    return Math.round(totalHours / completed.length);
  }

  private calculatePerformanceMetrics(workOrders: WorkOrder[], vesselAge: number): HistoricalContext['performanceMetrics'] {
    const emergency = workOrders.filter(wo => wo.priority === 'critical').length;
    const total = workOrders.length;
    
    const availability = total > 0 ? Math.max(0, 100 - (emergency * 10)) : 100;
    const reliability = total > 0 ? ((total - emergency) / total) * 100 : 100;
    const maintainability = this.calculateAverageResolutionTime(workOrders) < 24 ? 90 : 70;
    
    return {
      availability: Math.round(availability),
      reliability: Math.round(reliability),
      maintainability: Math.round(maintainability)
    };
  }

  private analyzeEquipmentHealth(equipment: any[]): HistoricalContext['equipmentHealth'] {
    const health = { critical: 0, warning: 0, normal: 0, excellent: 0 };
    
    equipment.forEach(eq => {
      const healthScore = eq.healthScore || 75;
      if (healthScore >= 90) health.excellent++;
      else if (healthScore >= 70) health.normal++;
      else if (healthScore >= 50) health.warning++;
      else health.critical++;
    });
    
    return health;
  }

  private calculateComplianceScore(workOrders: WorkOrder[], history: HistoricalContext['maintenanceHistory']): number {
    const total = history.scheduled + history.preventive + history.unscheduled;
    if (total === 0) return 100;
    
    const planned = history.scheduled + history.preventive;
    const complianceRate = (planned / total) * 100;
    
    return Math.round(complianceRate);
  }

  private calculateAverageDaysBetween(orders: WorkOrder[]): number {
    if (orders.length < 2) return 0;
    
    const sorted = [...orders].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    let totalDays = 0;
    
    for (let i = 1; i < sorted.length; i++) {
      const days = (new Date(sorted[i].createdAt).getTime() - new Date(sorted[i-1].createdAt).getTime()) / (24 * 60 * 60 * 1000);
      totalDays += days;
    }
    
    return totalDays / (sorted.length - 1);
  }

  private identifyCorrelatedMetrics(telemetry: EquipmentTelemetry[], workOrders: WorkOrder[]): string[] {
    const metrics = new Set<string>();
    
    workOrders.forEach(wo => {
      const beforeFailure = telemetry.filter(t => 
        new Date(t.ts) < new Date(wo.createdAt) &&
        new Date(t.ts) > new Date(new Date(wo.createdAt).getTime() - 48 * 60 * 60 * 1000)
      );
      
      beforeFailure.forEach(t => metrics.add(t.sensorType));
    });
    
    return Array.from(metrics);
  }

  private generateFailureRecommendations(equipmentType: string | undefined, frequency: number, avgDays: number): string[] {
    const recommendations = [];
    
    if (frequency > 3) {
      recommendations.push('Consider equipment replacement or major overhaul');
    }
    
    if (avgDays < 90) {
      recommendations.push('Increase preventive maintenance frequency');
      recommendations.push('Implement condition-based monitoring');
    }
    
    recommendations.push(`Schedule inspection every ${Math.floor(avgDays * 0.7)} days`);
    recommendations.push('Review operating procedures and training');
    
    return recommendations;
  }

  private calculateEfficiencyTrends(telemetry: EquipmentTelemetry[]): VesselLearnings['operationalInsights']['efficiencyTrends'] {
    const trends: VesselLearnings['operationalInsights']['efficiencyTrends'] = [];
    
    const sensorTypes = [...new Set(telemetry.map(t => t.sensorType))];
    
    sensorTypes.forEach(sensorType => {
      const readings = telemetry.filter(t => t.sensorType === sensorType).sort((a, b) => 
        new Date(a.ts).getTime() - new Date(b.ts).getTime()
      );
      
      if (readings.length >= 10) {
        const firstHalf = readings.slice(0, Math.floor(readings.length / 2));
        const secondHalf = readings.slice(Math.floor(readings.length / 2));
        
        const avgFirst = firstHalf.reduce((sum, r) => sum + r.value, 0) / firstHalf.length;
        const avgSecond = secondHalf.reduce((sum, r) => sum + r.value, 0) / secondHalf.length;
        
        const change = ((avgSecond - avgFirst) / avgFirst) * 100;
        
        let trend: 'improving' | 'declining' | 'stable' = 'stable';
        if (Math.abs(change) > 10) {
          trend = change > 0 ? 'improving' : 'declining';
        }
        
        trends.push({
          metric: sensorType,
          trend,
          change: Math.round(change * 10) / 10
        });
      }
    });
    
    return trends;
  }

  private identifyEnvironmentalFactors(telemetry: EquipmentTelemetry[]): VesselLearnings['operationalInsights']['environmentalFactors'] {
    const factors: VesselLearnings['operationalInsights']['environmentalFactors'] = [];
    
    const tempReadings = telemetry.filter(t => t.sensorType.toLowerCase().includes('temp'));
    if (tempReadings.length > 0) {
      const avgTemp = tempReadings.reduce((sum, r) => sum + r.value, 0) / tempReadings.length;
      factors.push({
        factor: 'Temperature',
        impact: avgTemp > 80 ? 'high' : avgTemp > 60 ? 'medium' : 'low',
        description: `Average operating temperature: ${avgTemp.toFixed(1)}°C`
      });
    }
    
    const vibReadings = telemetry.filter(t => t.sensorType.toLowerCase().includes('vib'));
    if (vibReadings.length > 0) {
      const maxVib = Math.max(...vibReadings.map(r => r.value));
      factors.push({
        factor: 'Vibration',
        impact: maxVib > 50 ? 'high' : maxVib > 25 ? 'medium' : 'low',
        description: `Peak vibration levels: ${maxVib.toFixed(2)} mm/s`
      });
    }
    
    return factors;
  }

  private determineCostTrend(ordersWithCost: WorkOrder[]): 'increasing' | 'decreasing' | 'stable' {
    if (ordersWithCost.length < 4) return 'stable';
    
    const sorted = [...ordersWithCost].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    
    const firstQuarter = sorted.slice(0, Math.floor(sorted.length / 4));
    const lastQuarter = sorted.slice(-Math.floor(sorted.length / 4));
    
    const avgFirst = firstQuarter.reduce((sum, wo) => sum + (wo.estimatedCost || 0), 0) / firstQuarter.length;
    const avgLast = lastQuarter.reduce((sum, wo) => sum + (wo.estimatedCost || 0), 0) / lastQuarter.length;
    
    const change = ((avgLast - avgFirst) / avgFirst) * 100;
    
    if (Math.abs(change) < 15) return 'stable';
    return change > 0 ? 'increasing' : 'decreasing';
  }

  private calculatePredictiveLeadTime(readings: EquipmentTelemetry[], failures: WorkOrder[]): number {
    if (failures.length === 0 || readings.length < 10) return 0;
    
    const leadTimes: number[] = [];
    
    failures.forEach(failure => {
      const failureTime = new Date(failure.createdAt).getTime();
      const beforeFailure = readings.filter(r => 
        new Date(r.ts).getTime() < failureTime &&
        new Date(r.ts).getTime() > (failureTime - 168 * 60 * 60 * 1000)
      ).sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
      
      if (beforeFailure.length >= 5) {
        const recentAvg = beforeFailure.slice(0, 5).reduce((sum, r) => sum + r.value, 0) / 5;
        const normalAvg = beforeFailure.slice(-10).reduce((sum, r) => sum + r.value, 0) / 10;
        
        if (Math.abs(recentAvg - normalAvg) / normalAvg > 0.2) {
          const anomalyTime = new Date(beforeFailure[0].ts).getTime();
          const hoursLead = (failureTime - anomalyTime) / (60 * 60 * 1000);
          leadTimes.push(hoursLead);
        }
      }
    });
    
    if (leadTimes.length === 0) return 0;
    return Math.round(leadTimes.reduce((sum, t) => sum + t, 0) / leadTimes.length);
  }
}

export const vesselIntelligence = new VesselIntelligenceService();
