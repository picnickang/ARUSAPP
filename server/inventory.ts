/**
 * Advanced Inventory Management Engine
 * Features: Parts catalog, supplier management, substitutions, cost planning
 * Enhances existing CMMS-lite functionality with sophisticated inventory control
 */

import type { 
  Part, 
  InsertPart,
  Supplier,
  InsertSupplier,
  Stock,
  InsertStock,
  PartSubstitution,
  InsertPartSubstitution,
  WorkOrder
} from "@shared/schema";

export interface PartAvailability {
  partNo: string;
  name: string;
  onHand: number;
  reserved: number;
  available: number;
  onOrder: number;
  minStock: number;
  maxStock: number;
  stockStatus: 'adequate' | 'low' | 'critical' | 'excess';
  leadTimeDays: number;
  estimatedRestockDate?: Date;
  locations: Array<{
    location: string;
    quantity: number;
    binLocation?: string;
  }>;
}

export interface SupplierPerformance {
  supplierId: string;
  name: string;
  onTimeDeliveryRate: number;
  qualityRating: number;
  averageLeadTime: number;
  totalOrders: number;
  lastDeliveryDate?: Date;
  performanceScore: number;
  status: 'preferred' | 'active' | 'inactive' | 'blacklisted';
}

export interface CostPlanningResult {
  totalCost: number;
  laborCost: number;
  materialCost: number;
  breakdown: Array<{
    taskId: string;
    description: string;
    partCosts: Array<{
      partNo: string;
      name: string;
      quantity: number;
      unitCost: number;
      totalCost: number;
      availability: 'available' | 'low_stock' | 'out_of_stock' | 'substitute_required';
      leadTime?: number;
    }>;
    laborHours: number;
    laborRate: number;
    taskLaborCost: number;
    taskMaterialCost: number;
    taskTotalCost: number;
  }>;
  recommendations: Array<{
    type: 'substitution' | 'bulk_purchase' | 'expedited_delivery' | 'supplier_change';
    description: string;
    potentialSavings?: number;
    riskLevel: 'low' | 'medium' | 'high';
  }>;
}

export interface InventoryOptimization {
  partNo: string;
  currentStock: number;
  optimalStock: number;
  reorderPoint: number;
  economicOrderQuantity: number;
  annualDemand: number;
  holdingCost: number;
  orderingCost: number;
  stockoutCost: number;
  recommendation: 'increase' | 'decrease' | 'maintain';
  potentialSavings: number;
}

/**
 * Calculate stock status based on current levels vs. min/max thresholds
 * @param onHand Current quantity on hand
 * @param reserved Quantity reserved for work orders
 * @param minStock Minimum stock threshold
 * @param maxStock Maximum stock threshold
 * @returns Stock status classification
 */
function calculateStockStatus(
  onHand: number, 
  reserved: number, 
  minStock: number, 
  maxStock: number
): PartAvailability['stockStatus'] {
  const available = Math.max(0, onHand - reserved);
  
  if (available <= 0) return 'critical';
  if (available < minStock * 0.5) return 'critical';
  if (available < minStock) return 'low';
  if (available > maxStock * 1.2) return 'excess';
  return 'adequate';
}

/**
 * Check parts availability across all locations
 * @param partNumbers Array of part numbers to check
 * @param storage Storage interface for database queries
 * @param orgId Organization ID for multi-tenancy
 * @returns Availability status for each part
 */
export async function checkPartsAvailability(
  partNumbers: string[],
  storage: any, // TODO: Replace with proper storage interface
  orgId: string
): Promise<PartAvailability[]> {
  const availability: PartAvailability[] = [];
  
  for (const partNo of partNumbers) {
    // Get part details
    const part = await storage.getPartByNumber(partNo, orgId);
    if (!part) {
      // Part not found - create placeholder entry
      availability.push({
        partNo,
        name: 'Unknown Part',
        onHand: 0,
        reserved: 0,
        available: 0,
        onOrder: 0,
        minStock: 0,
        maxStock: 0,
        stockStatus: 'critical',
        leadTimeDays: 30,
        locations: [],
      });
      continue;
    }
    
    // Get stock levels across all locations
    const stockRecords = await storage.getStockByPart(partNo, orgId);
    const locations = stockRecords.map((stock: Stock) => ({
      location: stock.location,
      quantity: stock.quantityOnHand,
      binLocation: stock.binLocation,
    }));
    
    const onHand = stockRecords.reduce((sum: number, stock: Stock) => sum + (stock.quantityOnHand || 0), 0);
    const reserved = stockRecords.reduce((sum: number, stock: Stock) => sum + (stock.quantityReserved || 0), 0);
    const onOrder = stockRecords.reduce((sum: number, stock: Stock) => sum + (stock.quantityOnOrder || 0), 0);
    const available = Math.max(0, onHand - reserved);
    
    const stockStatus = calculateStockStatus(onHand, reserved, part.minStockQty, part.maxStockQty);
    
    // Estimate restock date based on lead time
    let estimatedRestockDate: Date | undefined;
    if (onOrder > 0) {
      estimatedRestockDate = new Date();
      estimatedRestockDate.setDate(estimatedRestockDate.getDate() + part.leadTimeDays);
    }
    
    availability.push({
      partNo,
      name: part.name,
      onHand,
      reserved,
      available,
      onOrder,
      minStock: part.minStockQty,
      maxStock: part.maxStockQty,
      stockStatus,
      leadTimeDays: part.leadTimeDays,
      estimatedRestockDate,
      locations,
    });
  }
  
  return availability;
}

/**
 * Find suitable part substitutions when primary parts are unavailable
 * @param partNo Primary part number
 * @param storage Storage interface
 * @param orgId Organization ID
 * @returns Array of substitute parts with availability
 */
export async function findPartSubstitutions(
  partNo: string,
  storage: any,
  orgId: string
): Promise<Array<PartAvailability & { substitutionType: string; notes?: string }>> {
  const substitutions = await storage.getPartSubstitutions(partNo, orgId);
  const substituteParts: string[] = substitutions.map((sub: PartSubstitution) => sub.alternatePartNo);
  
  if (substituteParts.length === 0) return [];
  
  const availability = await checkPartsAvailability(substituteParts, storage, orgId);
  
  return availability.map((avail, index) => ({
    ...avail,
    substitutionType: substitutions[index].substitutionType,
    notes: substitutions[index].notes,
  }));
}

/**
 * Comprehensive cost planning for maintenance tasks
 * @param workOrders Array of work orders to analyze
 * @param storage Storage interface
 * @param orgId Organization ID
 * @returns Detailed cost planning with recommendations
 */
export async function planMaintenanceCosts(
  workOrders: WorkOrder[],
  storage: any,
  orgId: string
): Promise<CostPlanningResult> {
  let totalCost = 0;
  let laborCost = 0;
  let materialCost = 0;
  const breakdown: CostPlanningResult['breakdown'] = [];
  const recommendations: CostPlanningResult['recommendations'] = [];
  
  for (const workOrder of workOrders) {
    // Get work order details and required parts
    const requiredParts = await storage.getWorkOrderParts(workOrder.id, orgId);
    const worklogs = await storage.getWorkOrderWorklogs(workOrder.id);
    
    // Calculate labor costs
    const taskLaborHours = worklogs.reduce((sum: number, log: any) => sum + (log.durationMinutes / 60), 0);
    const averageLaborRate = worklogs.length > 0 
      ? worklogs.reduce((sum: number, log: any) => sum + log.laborCostPerHour, 0) / worklogs.length
      : 75.0; // Default rate
    const taskLaborCost = taskLaborHours * averageLaborRate;
    
    // Calculate material costs
    const partCosts: CostPlanningResult['breakdown'][0]['partCosts'] = [];
    let taskMaterialCost = 0;
    
    for (const requiredPart of requiredParts) {
      const part = await storage.getPartByNumber(requiredPart.partNo, orgId);
      const availability = await checkPartsAvailability([requiredPart.partNo], storage, orgId);
      const partAvail = availability[0];
      
      const quantity = requiredPart.quantity || 1;
      const unitCost = part?.standardCost || 0;
      const totalPartCost = quantity * unitCost;
      
      let availabilityStatus: CostPlanningResult['breakdown'][0]['partCosts'][0]['availability'] = 'available';
      let leadTime: number | undefined;
      
      if (partAvail.available < quantity) {
        if (partAvail.onHand === 0) {
          availabilityStatus = 'out_of_stock';
        } else {
          availabilityStatus = 'low_stock';
        }
        
        // Check for substitutions
        const substitutions = await findPartSubstitutions(requiredPart.partNo, storage, orgId);
        const availableSubstitute = substitutions.find(sub => sub.available >= quantity);
        
        if (availableSubstitute) {
          availabilityStatus = 'substitute_required';
          recommendations.push({
            type: 'substitution',
            description: `Use ${availableSubstitute.partNo} (${availableSubstitute.name}) as substitute for ${requiredPart.partNo}`,
            potentialSavings: Math.abs(unitCost - (part?.standardCost || 0)) * quantity,
            riskLevel: availableSubstitute.substitutionType === 'equivalent' ? 'low' : 'medium',
          });
        } else {
          leadTime = partAvail.leadTimeDays;
          recommendations.push({
            type: 'expedited_delivery',
            description: `Expedite delivery of ${requiredPart.partNo} - current lead time: ${leadTime} days`,
            riskLevel: 'medium',
          });
        }
      }
      
      partCosts.push({
        partNo: requiredPart.partNo,
        name: part?.name || 'Unknown Part',
        quantity,
        unitCost,
        totalCost: totalPartCost,
        availability: availabilityStatus,
        leadTime,
      });
      
      taskMaterialCost += totalPartCost;
    }
    
    const taskTotalCost = taskLaborCost + taskMaterialCost;
    
    breakdown.push({
      taskId: workOrder.id,
      description: workOrder.description || `Work Order ${workOrder.id}`,
      partCosts,
      laborHours: taskLaborHours,
      laborRate: averageLaborRate,
      taskLaborCost,
      taskMaterialCost,
      taskTotalCost,
    });
    
    totalCost += taskTotalCost;
    laborCost += taskLaborCost;
    materialCost += taskMaterialCost;
  }
  
  // Generate bulk purchase recommendations
  const allParts = breakdown.flatMap(task => task.partCosts);
  const partQuantities = allParts.reduce((acc, part) => {
    acc[part.partNo] = (acc[part.partNo] || 0) + part.quantity;
    return acc;
  }, {} as Record<string, number>);
  
  for (const [partNo, totalQuantity] of Object.entries(partQuantities)) {
    if (totalQuantity >= 10) { // Bulk purchase threshold
      recommendations.push({
        type: 'bulk_purchase',
        description: `Consider bulk purchase of ${partNo} (total needed: ${totalQuantity})`,
        potentialSavings: totalQuantity * 0.1, // Assume 10% bulk discount
        riskLevel: 'low',
      });
    }
  }
  
  return {
    totalCost,
    laborCost,
    materialCost,
    breakdown,
    recommendations,
  };
}

/**
 * Calculate Economic Order Quantity (EOQ) for optimal inventory levels
 * @param annualDemand Annual demand for the part
 * @param orderingCost Cost per order
 * @param holdingCost Annual holding cost per unit
 * @returns Optimal order quantity
 */
function calculateEOQ(annualDemand: number, orderingCost: number, holdingCost: number): number {
  if (holdingCost <= 0) return 0;
  return Math.sqrt((2 * annualDemand * orderingCost) / holdingCost);
}

/**
 * Calculate reorder point considering lead time and safety stock
 * @param dailyDemand Average daily demand
 * @param leadTimeDays Lead time in days
 * @param serviceLevel Desired service level (0.95 = 95%)
 * @param demandVariability Coefficient of variation for demand
 * @returns Optimal reorder point
 */
function calculateReorderPoint(
  dailyDemand: number,
  leadTimeDays: number,
  serviceLevel: number = 0.95,
  demandVariability: number = 0.2
): number {
  // Normal approximation for safety stock
  const zScore = serviceLevel === 0.95 ? 1.645 : (serviceLevel === 0.99 ? 2.326 : 1.282);
  const leadTimeDemand = dailyDemand * leadTimeDays;
  const leadTimeDemandStdDev = Math.sqrt(leadTimeDays) * dailyDemand * demandVariability;
  const safetyStock = zScore * leadTimeDemandStdDev;
  
  return Math.ceil(leadTimeDemand + safetyStock);
}

/**
 * Optimize inventory levels for parts based on usage patterns
 * @param parts Array of parts to optimize
 * @param usageHistory Historical usage data
 * @param costs Cost parameters
 * @returns Optimization recommendations
 */
export function optimizeInventoryLevels(
  parts: Part[],
  usageHistory: Array<{ partNo: string; monthlyUsage: number[] }>,
  costs: { orderingCost: number; holdingCostRate: number; stockoutCostRate: number }
): InventoryOptimization[] {
  const optimizations: InventoryOptimization[] = [];
  
  for (const part of parts) {
    const usage = usageHistory.find(h => h.partNo === part.partNo);
    if (!usage || usage.monthlyUsage.length === 0) continue;
    
    // Calculate demand statistics
    const monthlyDemand = usage.monthlyUsage.reduce((sum, m) => sum + m, 0) / usage.monthlyUsage.length;
    const annualDemand = monthlyDemand * 12;
    const dailyDemand = monthlyDemand / 30;
    
    // Calculate demand variability
    const demandVariance = usage.monthlyUsage.reduce((sum, m) => sum + (m - monthlyDemand) ** 2, 0) / usage.monthlyUsage.length;
    const demandVariability = Math.sqrt(demandVariance) / monthlyDemand;
    
    // Calculate optimal parameters
    const holdingCost = (part.standardCost || 0) * costs.holdingCostRate;
    const eoq = calculateEOQ(annualDemand, costs.orderingCost, holdingCost);
    const reorderPoint = calculateReorderPoint(dailyDemand, part.leadTimeDays || 30, 0.95, demandVariability);
    
    // Current stock level from part.minStockQty (simplified)
    const currentStock = part.minStockQty || 0;
    const optimalStock = Math.max(eoq, reorderPoint * 1.2); // 20% buffer above reorder point
    
    // Calculate potential savings
    const currentHoldingCost = currentStock * holdingCost;
    const optimalHoldingCost = optimalStock * holdingCost;
    const potentialSavings = Math.abs(currentHoldingCost - optimalHoldingCost);
    
    let recommendation: InventoryOptimization['recommendation'] = 'maintain';
    if (optimalStock > currentStock * 1.1) {
      recommendation = 'increase';
    } else if (optimalStock < currentStock * 0.9) {
      recommendation = 'decrease';
    }
    
    optimizations.push({
      partNo: part.partNo,
      currentStock,
      optimalStock: Math.round(optimalStock),
      reorderPoint: Math.round(reorderPoint),
      economicOrderQuantity: Math.round(eoq),
      annualDemand,
      holdingCost,
      orderingCost: costs.orderingCost,
      stockoutCost: (part.standardCost || 0) * costs.stockoutCostRate,
      recommendation,
      potentialSavings: Math.round(potentialSavings),
    });
  }
  
  return optimizations.sort((a, b) => b.potentialSavings - a.potentialSavings);
}

/**
 * Evaluate supplier performance based on delivery and quality metrics
 * @param suppliers Array of suppliers to evaluate
 * @param deliveryHistory Historical delivery data
 * @returns Performance evaluation for each supplier
 */
export function evaluateSupplierPerformance(
  suppliers: Supplier[],
  deliveryHistory: Array<{
    supplierId: string;
    orderDate: Date;
    deliveryDate: Date;
    expectedDeliveryDate: Date;
    qualityScore: number; // 1-10 scale
  }>
): SupplierPerformance[] {
  return suppliers.map(supplier => {
    const supplierDeliveries = deliveryHistory.filter(d => d.supplierId === supplier.id);
    
    if (supplierDeliveries.length === 0) {
      return {
        supplierId: supplier.id,
        name: supplier.name,
        onTimeDeliveryRate: 0,
        qualityRating: supplier.qualityRating || 0,
        averageLeadTime: supplier.leadTimeDays || 30,
        totalOrders: 0,
        performanceScore: 0,
        status: 'inactive' as const,
      };
    }
    
    // Calculate on-time delivery rate
    const onTimeDeliveries = supplierDeliveries.filter(d => 
      d.deliveryDate <= d.expectedDeliveryDate
    ).length;
    const onTimeDeliveryRate = onTimeDeliveries / supplierDeliveries.length;
    
    // Calculate average quality rating
    const averageQuality = supplierDeliveries.reduce((sum, d) => sum + d.qualityScore, 0) / supplierDeliveries.length;
    
    // Calculate average lead time
    const leadTimes = supplierDeliveries.map(d => {
      const leadTime = (d.deliveryDate.getTime() - d.orderDate.getTime()) / (1000 * 60 * 60 * 24);
      return leadTime;
    });
    const averageLeadTime = leadTimes.reduce((sum, lt) => sum + lt, 0) / leadTimes.length;
    
    // Calculate overall performance score (weighted average)
    const performanceScore = (
      onTimeDeliveryRate * 0.4 +           // 40% weight on delivery
      (averageQuality / 10) * 0.4 +        // 40% weight on quality
      (1 - Math.min(averageLeadTime / (supplier.leadTimeDays || 30), 2)) * 0.2  // 20% weight on lead time
    ) * 100;
    
    // Determine status
    let status: SupplierPerformance['status'] = 'active';
    if (supplier.isPreferred) {
      status = 'preferred';
    } else if (!supplier.isActive) {
      status = 'inactive';
    } else if (performanceScore < 60) {
      status = 'blacklisted';
    }
    
    const lastDeliveryDate = supplierDeliveries.length > 0 
      ? new Date(Math.max(...supplierDeliveries.map(d => d.deliveryDate.getTime())))
      : undefined;
    
    return {
      supplierId: supplier.id,
      name: supplier.name,
      onTimeDeliveryRate: Math.round(onTimeDeliveryRate * 100) / 100,
      qualityRating: Math.round(averageQuality * 100) / 100,
      averageLeadTime: Math.round(averageLeadTime),
      totalOrders: supplierDeliveries.length,
      lastDeliveryDate,
      performanceScore: Math.round(performanceScore),
      status,
    };
  }).sort((a, b) => b.performanceScore - a.performanceScore);
}