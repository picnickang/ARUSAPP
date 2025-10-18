import type { 
  Equipment, 
  InsertEquipment,
  EquipmentHealth
} from "@shared/schema";
import { equipmentRepository } from "./repository";
import { recordAndPublish } from "../../sync-events";
import { mqttReliableSync } from "../../mqtt-reliable-sync";
import { 
  recordPdmScore, 
  updateEquipmentHealthStatus 
} from "../../observability";

/**
 * Equipment Service
 * Handles business logic, orchestration, and event publishing
 */
export class EquipmentService {
  
  async listEquipment(orgId: string): Promise<Equipment[]> {
    return equipmentRepository.findAll(orgId);
  }
  
  async getEquipmentById(equipmentId: string, orgId: string): Promise<Equipment | undefined> {
    return equipmentRepository.findById(equipmentId, orgId);
  }
  
  async createEquipment(data: InsertEquipment, userId?: string): Promise<Equipment> {
    const equipment = await equipmentRepository.create(data);
    
    // Publish events
    await recordAndPublish('equipment', equipment.id, 'create', equipment, userId);
    
    mqttReliableSync.publishEquipmentChange('create', equipment).catch(err => {
      console.error('[Equipment Service] Failed to publish to MQTT:', err);
    });
    
    return equipment;
  }
  
  async updateEquipment(
    id: string, 
    data: Partial<InsertEquipment>, 
    orgId: string,
    userId?: string
  ): Promise<Equipment> {
    const equipment = await equipmentRepository.update(id, data, orgId);
    
    // Publish events
    await recordAndPublish('equipment', equipment.id, 'update', equipment, userId);
    
    mqttReliableSync.publishEquipmentChange('update', equipment).catch(err => {
      console.error('[Equipment Service] Failed to publish to MQTT:', err);
    });
    
    return equipment;
  }
  
  async deleteEquipment(id: string, orgId: string, userId?: string): Promise<void> {
    const equipment = await equipmentRepository.findById(id, orgId);
    if (!equipment) {
      throw new Error("Equipment not found");
    }
    
    await equipmentRepository.delete(id, orgId);
    
    // Publish events
    await recordAndPublish('equipment', id, 'delete', { id }, userId);
    
    mqttReliableSync.publishEquipmentChange('delete', { id } as Equipment).catch(err => {
      console.error('[Equipment Service] Failed to publish to MQTT:', err);
    });
  }
  
  async getEquipmentHealth(orgId: string, vesselId?: string): Promise<EquipmentHealth[]> {
    const health = await equipmentRepository.getHealth(orgId, vesselId);
    
    // Update equipment health metrics per vessel (enhanced observability)
    const vesselHealthCounts: Record<string, Record<string, number>> = {};
    
    health.forEach(equipment => {
      const vesselId = equipment.vessel || 'unknown';
      const status = equipment.healthIndex >= 75 ? 'healthy' : 
                    equipment.healthIndex >= 50 ? 'warning' : 'critical';
      
      // Initialize vessel counts if not exist
      if (!vesselHealthCounts[vesselId]) {
        vesselHealthCounts[vesselId] = { healthy: 0, warning: 0, critical: 0 };
      }
      
      vesselHealthCounts[vesselId][status]++;
      
      // Record PdM score for this equipment
      recordPdmScore(equipment.id, equipment.healthIndex, equipment.vessel);
    });
    
    // Update health status distribution metrics per vessel
    Object.entries(vesselHealthCounts).forEach(([vesselId, counts]) => {
      updateEquipmentHealthStatus('healthy', counts.healthy, vesselId);
      updateEquipmentHealthStatus('warning', counts.warning, vesselId);
      updateEquipmentHealthStatus('critical', counts.critical, vesselId);
    });
    
    return health;
  }
  
  async disassociateVessel(equipmentId: string, orgId: string, userId?: string): Promise<void> {
    await equipmentRepository.disassociateVessel(equipmentId, orgId);
    
    const equipment = await equipmentRepository.findById(equipmentId, orgId);
    if (equipment) {
      await recordAndPublish('equipment', equipmentId, 'update', equipment, userId);
    }
  }
  
  async getSensorCoverage(equipmentId: string, orgId: string) {
    return equipmentRepository.getSensorCoverage(equipmentId, orgId);
  }
  
  async setupSensors(equipmentId: string, orgId: string) {
    return equipmentRepository.setupSensors(equipmentId, orgId);
  }
  
  async getCompatibleParts(equipmentId: string, orgId: string) {
    return equipmentRepository.getCompatibleParts(equipmentId, orgId);
  }
  
  async getSuggestedParts(equipmentId: string, orgId: string) {
    return equipmentRepository.getSuggestedParts(equipmentId, orgId);
  }
  
  async getEquipmentWithSensorIssues(orgId: string) {
    return equipmentRepository.getEquipmentWithSensorIssues(orgId);
  }
}

// Export singleton instance
export const equipmentService = new EquipmentService();
