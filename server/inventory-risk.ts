import { IStorage } from './storage.js';

// Inventory Risk Analysis Types
export interface PartRiskScore {
  partId: string;
  partNumber: string;
  partName: string;
  category: string;
  
  // Stock Risk Metrics
  quantityOnHand: number;
  quantityReserved: number;
  availableQuantity: number;
  minStockLevel: number;
  maxStockLevel: number;
  stockoutRisk: number; // 0-100 risk score
  
  // Supply Chain Risk
  leadTimeDays: number;
  supplierName: string | null;
  supplierDependency: number; // 0-100 single supplier risk
  
  // Financial Impact
  unitCost: number;
  totalValue: number;
  reorderCost: number;
  
  // Equipment Impact
  criticalEquipment: string[]; // equipment that depends on this part
  equipmentCount: number;
  
  // Overall Risk Assessment
  overallRisk: number; // 0-100 composite risk score
  riskCategory: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

export interface InventoryRiskSummary {
  totalParts: number;
  activeSuppliers: number;
  totalValue: number;
  
  // Risk Distribution
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  
  // Top Risks
  topRiskParts: PartRiskScore[];
  criticalStockouts: PartRiskScore[];
  highValueRisks: PartRiskScore[];
  supplierConcentration: Array<{
    supplierName: string;
    partCount: number;
    totalValue: number;
    riskScore: number;
  }>;
}

export interface EquipmentPartsRisk {
  equipmentId: string;
  equipmentName: string;
  equipmentType: string;
  
  // Parts Dependencies
  totalParts: number;
  criticalParts: number;
  partsAtRisk: PartRiskScore[];
  
  // Risk Metrics
  maintenanceRisk: number; // 0-100 risk of maintenance delays
  downTimeRisk: number; // 0-100 risk of unplanned downtime
  overallRisk: number; // 0-100 composite equipment risk
  
  // Financial Impact
  estimatedDowntimeCost: number;
  partsValue: number;
  
  recommendations: string[];
}

/**
 * Beast Mode Inventory Risk Analyzer
 * Provides advanced parts availability analysis and risk scoring for maintenance planning
 */
export class InventoryRiskAnalyzer {
  constructor(private storage: IStorage) {}

  /**
   * Analyze inventory risk across the organization
   */
  async analyzeInventoryRisk(
    orgId: string,
    includeInactive: boolean = false
  ): Promise<InventoryRiskSummary> {
    console.log(`[Inventory Risk] Analyzing inventory risk for org: ${orgId}`);
    
    // Get all active parts inventory
    const parts = await this.storage.getPartsInventory(orgId, includeInactive);
    
    if (parts.length === 0) {
      return this.createEmptyRiskSummary();
    }
    
    // Calculate risk scores for each part
    const partRisks: PartRiskScore[] = await Promise.all(
      parts.map(part => this.calculatePartRisk(orgId, part))
    );
    
    // Calculate supplier concentration risk
    const supplierConcentration = await this.calculateSupplierRisk(partRisks);
    
    // Build risk summary
    const riskSummary = this.buildRiskSummary(partRisks, supplierConcentration);
    
    console.log(`[Inventory Risk] Analysis complete - ${partRisks.length} parts, ${riskSummary.riskDistribution.critical} critical risks`);
    
    return riskSummary;
  }

  /**
   * Analyze parts risk for specific equipment
   */
  async analyzeEquipmentPartsRisk(
    orgId: string,
    equipmentId: string
  ): Promise<EquipmentPartsRisk | null> {
    console.log(`[Inventory Risk] Analyzing parts risk for equipment: ${equipmentId}`);
    
    // Get equipment details
    const equipment = await this.storage.getEquipment(orgId, equipmentId);
    if (!equipment) {
      console.log(`[Inventory Risk] Equipment not found: ${equipmentId}`);
      return null;
    }
    
    // Get parts used in work orders for this equipment (as proxy for parts dependency)
    const workOrderParts = await this.storage.getWorkOrderPartsByEquipment(orgId, equipmentId);
    
    if (workOrderParts.length === 0) {
      console.log(`[Inventory Risk] No parts history found for equipment: ${equipmentId}`);
      return this.createEmptyEquipmentRisk(equipment);
    }
    
    // Get unique parts and their current inventory status
    const uniquePartIds = [...new Set(workOrderParts.map(wp => wp.partId))];
    const parts = await Promise.all(
      uniquePartIds.map(partId => this.storage.getPartById(orgId, partId))
    );
    
    const activeParts = parts.filter(p => p && p.isActive);
    
    // Calculate risk for each part
    const partRisks = await Promise.all(
      activeParts.map(part => this.calculatePartRisk(orgId, part))
    );
    
    // Build equipment risk analysis
    const equipmentRisk = this.buildEquipmentRisk(equipment, partRisks, workOrderParts);
    
    console.log(`[Inventory Risk] Equipment analysis complete - ${partRisks.length} parts, risk: ${equipmentRisk.overallRisk}`);
    
    return equipmentRisk;
  }

  /**
   * Get critical parts that need immediate attention
   */
  async getCriticalParts(
    orgId: string,
    riskThreshold: number = 75
  ): Promise<PartRiskScore[]> {
    console.log(`[Inventory Risk] Finding critical parts with risk >= ${riskThreshold}`);
    
    // Get all active parts inventory and analyze each one
    const parts = await this.storage.getPartsInventory(orgId, false);
    
    if (parts.length === 0) {
      console.log(`[Inventory Risk] No parts found for org: ${orgId}`);
      return [];
    }
    
    // Calculate risk scores for each part
    const partRisks: PartRiskScore[] = await Promise.all(
      parts.map(part => this.calculatePartRisk(orgId, part))
    );
    
    // Filter by risk threshold - analyze ALL parts, not just top 10
    const criticalParts = partRisks.filter(
      part => part.overallRisk >= riskThreshold
    );
    
    console.log(`[Inventory Risk] Found ${criticalParts.length} critical parts out of ${partRisks.length} total`);
    
    // Sort by risk for better UX
    return criticalParts.sort((a, b) => b.overallRisk - a.overallRisk);
  }

  /**
   * Calculate risk score for a single part
   */
  private async calculatePartRisk(
    orgId: string, 
    part: any
  ): Promise<PartRiskScore> {
    const availableQuantity = part.quantityOnHand - part.quantityReserved;
    
    // Stock Risk: Based on current stock vs minimum levels
    const stockRatio = part.minStockLevel > 0 ? availableQuantity / part.minStockLevel : 1;
    const stockoutRisk = Math.max(0, Math.min(100, (1 - stockRatio) * 100));
    
    // Lead Time Risk: Longer lead times increase risk
    const leadTimeRisk = Math.min(100, (part.leadTimeDays || 7) * 3); // 3% risk per day
    
    // Supply Chain Risk: Single supplier dependency
    const supplierDependency = part.supplierName ? 70 : 20; // Higher risk with single supplier
    
    // Financial Risk: High-value parts have higher impact
    const totalValue = part.unitCost * part.quantityOnHand;
    const financialRisk = Math.min(100, totalValue / 1000); // $1000 = 100% financial risk
    
    // Equipment Impact: Get equipment that depends on this part
    const criticalEquipment = await this.getEquipmentUsingPart(orgId, part.id);
    const equipmentRisk = criticalEquipment.length * 10; // 10% risk per dependent equipment
    
    // Composite Risk Score (weighted average)
    const overallRisk = (
      stockoutRisk * 0.35 +      // Stock availability is most critical
      leadTimeRisk * 0.25 +      // Lead time affects planning
      supplierDependency * 0.20 + // Supply chain reliability
      Math.min(financialRisk, 50) * 0.10 + // Financial impact (capped)
      Math.min(equipmentRisk, 50) * 0.10   // Equipment dependency (capped)
    );
    
    // Risk Category
    let riskCategory: 'low' | 'medium' | 'high' | 'critical';
    if (overallRisk >= 80) riskCategory = 'critical';
    else if (overallRisk >= 60) riskCategory = 'high';
    else if (overallRisk >= 30) riskCategory = 'medium';
    else riskCategory = 'low';
    
    // Generate recommendations
    const recommendations = this.generatePartRecommendations(
      stockoutRisk,
      leadTimeRisk,
      supplierDependency,
      criticalEquipment.length
    );
    
    return {
      partId: part.id,
      partNumber: part.partNumber,
      partName: part.partName,
      category: part.category,
      
      // Stock metrics
      quantityOnHand: part.quantityOnHand,
      quantityReserved: part.quantityReserved,
      availableQuantity,
      minStockLevel: part.minStockLevel,
      maxStockLevel: part.maxStockLevel,
      stockoutRisk,
      
      // Supply chain
      leadTimeDays: part.leadTimeDays || 7,
      supplierName: part.supplierName,
      supplierDependency,
      
      // Financial
      unitCost: part.unitCost,
      totalValue,
      reorderCost: part.unitCost * (part.maxStockLevel - availableQuantity),
      
      // Equipment impact
      criticalEquipment,
      equipmentCount: criticalEquipment.length,
      
      // Risk assessment
      overallRisk: Math.round(overallRisk),
      riskCategory,
      recommendations
    };
  }

  /**
   * Build risk summary from part risks
   */
  private buildRiskSummary(
    partRisks: PartRiskScore[],
    supplierConcentration: any[]
  ): InventoryRiskSummary {
    const riskDistribution = partRisks.reduce(
      (acc, part) => {
        acc[part.riskCategory]++;
        return acc;
      },
      { low: 0, medium: 0, high: 0, critical: 0 }
    );
    
    // Sort by risk and get top risks
    const sortedRisks = partRisks.sort((a, b) => b.overallRisk - a.overallRisk);
    
    return {
      totalParts: partRisks.length,
      activeSuppliers: supplierConcentration.length,
      totalValue: partRisks.reduce((sum, part) => sum + part.totalValue, 0),
      
      riskDistribution,
      
      topRiskParts: sortedRisks.slice(0, 10),
      criticalStockouts: partRisks.filter(p => p.availableQuantity <= 0),
      highValueRisks: partRisks
        .filter(p => p.totalValue > 5000)
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 5),
      
      supplierConcentration
    };
  }

  /**
   * Calculate supplier concentration risk
   */
  private async calculateSupplierRisk(partRisks: PartRiskScore[]): Promise<any[]> {
    const supplierMap = new Map<string, {
      partCount: number;
      totalValue: number;
      parts: PartRiskScore[];
    }>();
    
    partRisks.forEach(part => {
      const supplier = part.supplierName || 'Unknown Supplier';
      if (!supplierMap.has(supplier)) {
        supplierMap.set(supplier, { partCount: 0, totalValue: 0, parts: [] });
      }
      
      const supplierData = supplierMap.get(supplier)!;
      supplierData.partCount++;
      supplierData.totalValue += part.totalValue;
      supplierData.parts.push(part);
    });
    
    return Array.from(supplierMap.entries()).map(([supplierName, data]) => {
      // Risk increases with concentration (more parts from single supplier)
      const concentrationRisk = Math.min(100, (data.partCount / partRisks.length) * 200);
      
      return {
        supplierName,
        partCount: data.partCount,
        totalValue: data.totalValue,
        riskScore: Math.round(concentrationRisk)
      };
    }).sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * Build equipment-specific risk analysis
   */
  private buildEquipmentRisk(
    equipment: any,
    partRisks: PartRiskScore[],
    workOrderParts: any[]
  ): EquipmentPartsRisk {
    const criticalParts = partRisks.filter(p => p.riskCategory === 'critical' || p.riskCategory === 'high').length;
    const partsAtRisk = partRisks.filter(p => p.overallRisk > 50);
    
    // Calculate equipment-specific risks
    const avgPartRisk = partRisks.reduce((sum, part) => sum + part.overallRisk, 0) / partRisks.length || 0;
    const maintenanceRisk = Math.min(100, avgPartRisk * 1.2); // Slightly higher than part risk
    const downTimeRisk = Math.min(100, criticalParts * 20); // 20% risk per critical part
    const overallRisk = (maintenanceRisk * 0.6 + downTimeRisk * 0.4);
    
    // Estimate financial impact
    const partsValue = partRisks.reduce((sum, part) => sum + part.totalValue, 0);
    const estimatedDowntimeCost = this.calculateDowntimeCost(equipment.type, overallRisk);
    
    const recommendations = this.generateEquipmentRecommendations(
      criticalParts,
      partsAtRisk.length,
      equipment.type
    );
    
    return {
      equipmentId: equipment.id,
      equipmentName: equipment.name,
      equipmentType: equipment.type,
      
      totalParts: partRisks.length,
      criticalParts,
      partsAtRisk,
      
      maintenanceRisk: Math.round(maintenanceRisk),
      downTimeRisk: Math.round(downTimeRisk),
      overallRisk: Math.round(overallRisk),
      
      estimatedDowntimeCost,
      partsValue,
      
      recommendations
    };
  }

  /**
   * Get equipment that depends on a specific part
   */
  private async getEquipmentUsingPart(orgId: string, partId: string): Promise<string[]> {
    try {
      const workOrderParts = await this.storage.getWorkOrderPartsByPartId(orgId, partId);
      const workOrderIds = [...new Set(workOrderParts.map(wp => wp.workOrderId))];
      
      const equipmentIds = [];
      for (const workOrderId of workOrderIds) {
        const workOrder = await this.storage.getWorkOrder(orgId, workOrderId);
        if (workOrder && workOrder.equipmentId) {
          equipmentIds.push(workOrder.equipmentId);
        }
      }
      
      return [...new Set(equipmentIds)];
    } catch (error) {
      console.log(`[Inventory Risk] Error getting equipment for part ${partId}:`, error);
      return [];
    }
  }

  /**
   * Generate recommendations for a part based on risk factors
   */
  private generatePartRecommendations(
    stockoutRisk: number,
    leadTimeRisk: number,
    supplierDependency: number,
    equipmentCount: number
  ): string[] {
    const recommendations: string[] = [];
    
    if (stockoutRisk > 70) {
      recommendations.push("URGENT: Order parts immediately - stock critically low");
    } else if (stockoutRisk > 40) {
      recommendations.push("Monitor stock levels closely and consider reordering");
    }
    
    if (leadTimeRisk > 60) {
      recommendations.push("Consider alternative suppliers with shorter lead times");
    }
    
    if (supplierDependency > 60) {
      recommendations.push("Identify backup suppliers to reduce dependency risk");
    }
    
    if (equipmentCount > 3) {
      recommendations.push("Critical part used by multiple equipment - increase safety stock");
    }
    
    if (recommendations.length === 0) {
      recommendations.push("Part inventory levels are acceptable");
    }
    
    return recommendations;
  }

  /**
   * Generate equipment-specific recommendations
   */
  private generateEquipmentRecommendations(
    criticalParts: number,
    partsAtRisk: number,
    equipmentType: string
  ): string[] {
    const recommendations: string[] = [];
    
    if (criticalParts > 0) {
      recommendations.push(`${criticalParts} critical parts need immediate attention`);
    }
    
    if (partsAtRisk > 5) {
      recommendations.push("Multiple parts at risk - consider comprehensive maintenance review");
    }
    
    if (equipmentType === 'engine' || equipmentType === 'generator') {
      recommendations.push("Mission-critical equipment - maintain higher safety stock levels");
    }
    
    if (recommendations.length === 0) {
      recommendations.push("Parts inventory risk is manageable for this equipment");
    }
    
    return recommendations;
  }

  /**
   * Estimate downtime cost based on equipment type and risk
   */
  private calculateDowntimeCost(equipmentType: string, riskScore: number): number {
    // Base downtime costs per hour by equipment type
    const baseCosts = {
      'engine': 5000,     // Main propulsion
      'generator': 3000,  // Power generation  
      'pump': 1500,       // Fluid systems
      'compressor': 2000, // Air/gas systems
      'hvac': 500,        // Climate control
      'navigation': 2500, // Safety systems
      'winch': 1000,      // Deck operations
      'crane': 2000       // Cargo handling
    };
    
    const baseCost = baseCosts[equipmentType.toLowerCase()] || 1000;
    
    // Risk factor: higher risk = higher potential downtime
    const riskMultiplier = 1 + (riskScore / 100); // 1.0 to 2.0
    
    // Assume 8 hours average downtime for parts-related failures
    return Math.round(baseCost * riskMultiplier * 8);
  }

  /**
   * Create empty risk summary for organizations with no parts
   */
  private createEmptyRiskSummary(): InventoryRiskSummary {
    return {
      totalParts: 0,
      activeSuppliers: 0,
      totalValue: 0,
      riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
      topRiskParts: [],
      criticalStockouts: [],
      highValueRisks: [],
      supplierConcentration: []
    };
  }

  /**
   * Create empty equipment risk for equipment with no parts history
   */
  private createEmptyEquipmentRisk(equipment: any): EquipmentPartsRisk {
    return {
      equipmentId: equipment.id,
      equipmentName: equipment.name,
      equipmentType: equipment.type,
      totalParts: 0,
      criticalParts: 0,
      partsAtRisk: [],
      maintenanceRisk: 10, // Low baseline risk
      downTimeRisk: 10,
      overallRisk: 10,
      estimatedDowntimeCost: 1000, // Minimal estimate
      partsValue: 0,
      recommendations: ["No parts usage history - consider preventive inventory planning"]
    };
  }
}