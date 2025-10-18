import type { 
  WorkOrder, 
  InsertWorkOrder,
  WorkOrderCompletion,
  InsertWorkOrderCompletion 
} from "@shared/schema";
import { storage } from "../../storage";

/**
 * Work Orders Repository
 * Handles all data access for work orders domain
 */
export class WorkOrderRepository {
  
  async findAll(equipmentId?: string): Promise<WorkOrder[]> {
    return storage.getWorkOrders(equipmentId);
  }
  
  async findById(id: string, orgId: string): Promise<WorkOrder | undefined> {
    return storage.getWorkOrderById(id, orgId);
  }
  
  async create(workOrder: InsertWorkOrder & { woNumber?: string }): Promise<WorkOrder> {
    return storage.createWorkOrder(workOrder);
  }
  
  async update(id: string, data: Partial<InsertWorkOrder>): Promise<WorkOrder> {
    return storage.updateWorkOrder(id, data);
  }
  
  async delete(id: string): Promise<void> {
    return storage.deleteWorkOrder(id);
  }
  
  async generateWorkOrderNumber(orgId: string): Promise<string> {
    return storage.generateWorkOrderNumber(orgId);
  }
  
  async complete(workOrderId: string, completion: InsertWorkOrderCompletion): Promise<WorkOrderCompletion> {
    return storage.completeWorkOrder(workOrderId, completion);
  }
  
  async getCompletions(filters: {
    equipmentId?: string;
    vesselId?: string;
    startDate?: Date;
    endDate?: Date;
    orgId: string;
  }): Promise<WorkOrderCompletion[]> {
    return storage.getWorkOrderCompletions(filters);
  }
  
  async releasePartsFromWorkOrder(workOrderId: string): Promise<void> {
    return storage.releasePartsFromWorkOrder(workOrderId);
  }
  
  async getEquipmentWithSensorIssues(orgId: string) {
    return storage.getEquipmentWithSensorIssues(orgId);
  }
  
  async suggestPartsForSensorIssue(equipmentId: string, sensorType: string, orgId: string) {
    return storage.suggestPartsForSensorIssue(equipmentId, sensorType, orgId);
  }
}

// Export singleton instance
export const workOrderRepository = new WorkOrderRepository();
