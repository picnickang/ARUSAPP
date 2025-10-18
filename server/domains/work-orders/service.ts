import type { 
  WorkOrder, 
  InsertWorkOrder,
  WorkOrderCompletion,
  InsertWorkOrderCompletion 
} from "@shared/schema";
import { workOrderRepository } from "./repository";
import { recordAndPublish } from "../../sync-events";
import { mqttReliableSync } from "../../mqtt-reliable-sync";
import { incrementWorkOrder } from "../../observability";

/**
 * Work Orders Service
 * Handles business logic, orchestration, and event publishing
 */
export class WorkOrderService {
  
  async listWorkOrders(equipmentId?: string, orgId?: string): Promise<WorkOrder[]> {
    return workOrderRepository.findAll(equipmentId, orgId);
  }
  
  async getWorkOrderById(id: string, orgId: string): Promise<WorkOrder | undefined> {
    return workOrderRepository.findById(id, orgId);
  }
  
  async createWorkOrder(
    data: InsertWorkOrder,
    userId?: string
  ): Promise<WorkOrder> {
    // Generate work order number
    const woNumber = await workOrderRepository.generateWorkOrderNumber(data.orgId);
    
    // Create work order
    const workOrder = await workOrderRepository.create({ ...data, woNumber });
    
    // Record metrics
    const priorityString = workOrder.priority ? 
      ['critical', 'high', 'medium', 'low', 'lowest'][workOrder.priority - 1] || 'medium' : 
      'medium';
    incrementWorkOrder(workOrder.status || 'open', priorityString, workOrder.vesselId);
    
    // Publish events
    await recordAndPublish('work_order', workOrder.id, 'create', workOrder, userId);
    
    mqttReliableSync.publishWorkOrderChange('create', workOrder).catch(err => {
      console.error('[Work Orders Service] Failed to publish to MQTT:', err);
    });
    
    return workOrder;
  }
  
  async createWorkOrderWithSuggestions(
    data: InsertWorkOrder,
    orgId: string,
    userId?: string
  ): Promise<{
    workOrder: WorkOrder;
    suggestedParts: any[];
    sensorIssues: any[];
    hasSensorIssues: boolean;
    totalSuggestedParts: number;
  }> {
    // Create work order
    const workOrder = await this.createWorkOrder(data, userId);
    
    // Analyze sensor issues and suggest parts if equipment is specified
    let suggestedParts: any[] = [];
    let sensorIssues: any[] = [];
    
    if (workOrder.equipmentId) {
      try {
        // Get sensor states for this equipment
        const equipmentWithIssues = await workOrderRepository.getEquipmentWithSensorIssues(orgId);
        const equipmentIssue = equipmentWithIssues.find(e => e.equipment.id === workOrder.equipmentId);
        
        if (equipmentIssue && equipmentIssue.sensors.length > 0) {
          sensorIssues = equipmentIssue.sensors;
          
          // Get suggested parts for each sensor issue
          const partsPromises = equipmentIssue.sensors.map(sensor =>
            workOrderRepository.suggestPartsForSensorIssue(
              workOrder.equipmentId!,
              sensor.sensorType,
              orgId
            )
          );
          
          const partsResults = await Promise.all(partsPromises);
          suggestedParts = partsResults.flat();
        }
      } catch (error) {
        console.error('[Work Orders Service] Failed to analyze sensor issues:', error);
        // Continue without suggestions rather than failing the work order creation
      }
    }
    
    return {
      workOrder,
      suggestedParts,
      sensorIssues,
      hasSensorIssues: sensorIssues.length > 0,
      totalSuggestedParts: suggestedParts.length
    };
  }
  
  async updateWorkOrder(
    id: string,
    data: Partial<InsertWorkOrder>,
    userId?: string
  ): Promise<WorkOrder> {
    // Check if status is changing to "cancelled" to release parts
    if (data.status === 'cancelled') {
      try {
        await workOrderRepository.releasePartsFromWorkOrder(id);
      } catch (error) {
        console.error('[Work Orders Service] Failed to release parts:', error);
        // Continue with status update even if release fails
      }
    }
    
    // Update work order
    const workOrder = await workOrderRepository.update(id, data);
    
    // Publish events
    await recordAndPublish('work_order', workOrder.id, 'update', workOrder, userId);
    
    return workOrder;
  }
  
  async deleteWorkOrder(
    id: string,
    orgId: string,
    userId?: string
  ): Promise<void> {
    // Get work order data before deletion for event
    const workOrder = await workOrderRepository.findById(id, orgId);
    
    // Delete work order
    await workOrderRepository.delete(id);
    
    // Publish delete event
    if (workOrder) {
      await recordAndPublish('work_order', id, 'delete', workOrder, userId);
    }
  }
  
  async completeWorkOrder(
    workOrderId: string,
    completion: InsertWorkOrderCompletion,
    orgId: string
  ): Promise<WorkOrderCompletion> {
    // Fetch work order to validate it exists
    const workOrder = await workOrderRepository.findById(workOrderId, orgId);
    if (!workOrder) {
      throw new Error("Work order not found");
    }
    
    // Complete the work order (atomic operation)
    const completionRecord = await workOrderRepository.complete(workOrderId, completion);
    
    // Calculate and save cost savings asynchronously
    setImmediate(async () => {
      try {
        const { processWorkOrderCompletion } = await import('../../cost-savings-engine');
        const result = await processWorkOrderCompletion(workOrderId, orgId);
        if (result.saved) {
          console.log(`[Work Orders Service] Cost savings calculated: $${result.savings?.totalSavings.toFixed(2)}`);
        }
      } catch (error) {
        console.error(`[Work Orders Service] Failed to calculate cost savings:`, error);
      }
    });
    
    return completionRecord;
  }
  
  async getCompletions(filters: {
    equipmentId?: string;
    vesselId?: string;
    startDate?: Date;
    endDate?: Date;
    orgId: string;
  }): Promise<WorkOrderCompletion[]> {
    return workOrderRepository.getCompletions(filters);
  }
}

// Export singleton instance
export const workOrderService = new WorkOrderService();
