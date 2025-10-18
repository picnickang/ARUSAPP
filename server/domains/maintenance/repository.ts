import type { 
  MaintenanceSchedule, 
  InsertMaintenanceSchedule,
  MaintenanceTemplate,
  InsertMaintenanceTemplate
} from "@shared/schema";
import { storage } from "../../storage";

/**
 * Maintenance Repository
 * Handles all data access for maintenance domain (schedules and templates)
 */
export class MaintenanceRepository {
  
  // ========== Maintenance Schedules ==========
  
  /**
   * Get all maintenance schedules with optional filtering
   */
  async findAllSchedules(equipmentId?: string, status?: string): Promise<MaintenanceSchedule[]> {
    return storage.getMaintenanceSchedules(equipmentId, status);
  }
  
  /**
   * Get single maintenance schedule by ID
   */
  async findScheduleById(id: string, orgId?: string): Promise<MaintenanceSchedule | undefined> {
    const schedules = await storage.getMaintenanceSchedules();
    const schedule = schedules.find(s => s.id === id);
    
    // Validate org ownership if orgId provided
    if (schedule && orgId && schedule.orgId !== orgId) {
      return undefined;
    }
    
    return schedule;
  }
  
  /**
   * Create a new maintenance schedule
   */
  async createSchedule(schedule: InsertMaintenanceSchedule): Promise<MaintenanceSchedule> {
    return storage.createMaintenanceSchedule(schedule);
  }
  
  /**
   * Update an existing maintenance schedule
   */
  async updateSchedule(id: string, updates: Partial<InsertMaintenanceSchedule>): Promise<MaintenanceSchedule> {
    return storage.updateMaintenanceSchedule(id, updates);
  }
  
  /**
   * Delete a maintenance schedule
   */
  async deleteSchedule(id: string): Promise<void> {
    return storage.deleteMaintenanceSchedule(id);
  }
  
  /**
   * Find upcoming maintenance schedules
   */
  async findUpcomingSchedules(orgId: string, daysAhead: number = 30): Promise<MaintenanceSchedule[]> {
    const schedules = await storage.getMaintenanceSchedules(undefined, 'scheduled');
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    return schedules.filter(s => 
      s.orgId === orgId &&
      s.scheduledDate >= now && 
      s.scheduledDate <= futureDate
    ).sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  }
  
  /**
   * Auto-schedule maintenance for equipment based on PdM score
   */
  async autoScheduleForEquipment(equipmentId: string, pdmScore: number): Promise<MaintenanceSchedule> {
    return storage.autoScheduleMaintenance(equipmentId, pdmScore);
  }
  
  // ========== Maintenance Templates ==========
  
  /**
   * Get all maintenance templates with optional filtering
   */
  async findAllTemplates(
    orgId?: string, 
    equipmentType?: string, 
    isActive?: boolean
  ): Promise<MaintenanceTemplate[]> {
    return storage.getMaintenanceTemplates(orgId, equipmentType, isActive);
  }
  
  /**
   * Get single maintenance template by ID
   */
  async findTemplateById(id: string, orgId?: string): Promise<MaintenanceTemplate | undefined> {
    return storage.getMaintenanceTemplate(id, orgId);
  }
  
  /**
   * Create a new maintenance template
   */
  async createTemplate(template: InsertMaintenanceTemplate): Promise<MaintenanceTemplate> {
    return storage.createMaintenanceTemplate(template);
  }
  
  /**
   * Update an existing maintenance template
   */
  async updateTemplate(
    id: string, 
    updates: Partial<InsertMaintenanceTemplate>, 
    orgId?: string
  ): Promise<MaintenanceTemplate> {
    return storage.updateMaintenanceTemplate(id, updates, orgId);
  }
  
  /**
   * Delete a maintenance template
   */
  async deleteTemplate(id: string, orgId?: string): Promise<void> {
    return storage.deleteMaintenanceTemplate(id, orgId);
  }
}

// Export singleton instance
export const maintenanceRepository = new MaintenanceRepository();
