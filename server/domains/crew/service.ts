import type {
  SelectCrew,
  InsertCrew,
  SelectSkill,
  InsertSkill,
  SelectCrewSkill,
  SelectCrewLeave,
  InsertCrewLeave,
  SelectCrewAssignment,
  InsertCrewAssignment,
  SelectCrewCertification,
  InsertCrewCertification
} from "@shared/schema";
import { crewRepository } from "./repository";
import { recordAndPublish } from "../../sync-events";
import { mqttReliableSync } from "../../mqtt-reliable-sync";

/**
 * Crew Service
 * Handles business logic, orchestration, and event publishing
 */
export class CrewService {
  
  // ========== Crew Members ==========
  
  async listCrew(orgId?: string, vesselId?: string): Promise<SelectCrew[]> {
    return crewRepository.findAllCrew(orgId, vesselId);
  }
  
  async getCrewById(id: string, orgId?: string): Promise<SelectCrew | undefined> {
    return crewRepository.findCrewById(id, orgId);
  }
  
  async createCrew(data: InsertCrew, userId?: string): Promise<SelectCrew> {
    const crew = await crewRepository.createCrew(data);
    
    await recordAndPublish('crew', crew.id, 'create', crew, userId);
    
    mqttReliableSync.publishCrewChange('create', crew).catch(err => {
      console.error('[Crew Service] Failed to publish crew create to MQTT:', err);
    });
    
    return crew;
  }
  
  async updateCrew(id: string, data: Partial<InsertCrew>, userId?: string): Promise<SelectCrew> {
    const crew = await crewRepository.updateCrew(id, data);
    
    await recordAndPublish('crew', crew.id, 'update', crew, userId);
    
    mqttReliableSync.publishCrewChange('update', crew).catch(err => {
      console.error('[Crew Service] Failed to publish crew update to MQTT:', err);
    });
    
    return crew;
  }
  
  async deleteCrew(id: string, userId?: string): Promise<void> {
    const crew = await crewRepository.findCrewById(id);
    
    await crewRepository.deleteCrew(id);
    
    if (crew) {
      await recordAndPublish('crew', id, 'delete', crew, userId);
      
      mqttReliableSync.publishCrewChange('delete', crew).catch(err => {
        console.error('[Crew Service] Failed to publish crew delete to MQTT:', err);
      });
    }
  }
  
  // ========== Skills ==========
  
  async listSkills(orgId: string): Promise<SelectSkill[]> {
    return crewRepository.findAllSkills(orgId);
  }
  
  async createSkill(data: InsertSkill, userId?: string): Promise<SelectSkill> {
    const skill = await crewRepository.createSkill(data);
    
    await recordAndPublish('skill', skill.id, 'create', skill, userId);
    
    return skill;
  }
  
  async updateSkill(id: string, data: Partial<InsertSkill>, userId?: string): Promise<SelectSkill> {
    const skill = await crewRepository.updateSkill(id, data);
    
    await recordAndPublish('skill', skill.id, 'update', skill, userId);
    
    return skill;
  }
  
  async deleteSkill(id: string, userId?: string): Promise<void> {
    await crewRepository.deleteSkill(id);
    
    await recordAndPublish('skill', id, 'delete', { id }, userId);
  }
  
  // ========== Crew Skills (Assignment) ==========
  
  async assignSkillToCrew(crewId: string, skill: string, level: number, userId?: string): Promise<SelectCrewSkill> {
    const crewSkill = await crewRepository.assignSkill(crewId, skill, level);
    
    await recordAndPublish('crew_skill', `${crewId}_${skill}`, 'create', crewSkill, userId);
    
    return crewSkill;
  }
  
  async removeSkillFromCrew(crewId: string, skill: string, userId?: string): Promise<void> {
    await crewRepository.removeSkill(crewId, skill);
    
    await recordAndPublish('crew_skill', `${crewId}_${skill}`, 'delete', { crewId, skill }, userId);
  }
  
  async getCrewSkills(crewId: string): Promise<SelectCrewSkill[]> {
    return crewRepository.getCrewSkills(crewId);
  }
  
  // ========== Crew Leave ==========
  
  async listLeave(crewId?: string, startDate?: Date, endDate?: Date): Promise<SelectCrewLeave[]> {
    return crewRepository.findAllLeave(crewId, startDate, endDate);
  }
  
  async createLeave(data: InsertCrewLeave, userId?: string): Promise<SelectCrewLeave> {
    const leave = await crewRepository.createLeave(data);
    
    await recordAndPublish('crew_leave', leave.id, 'create', leave, userId);
    
    return leave;
  }
  
  async updateLeave(id: string, data: Partial<InsertCrewLeave>, userId?: string): Promise<SelectCrewLeave> {
    const leave = await crewRepository.updateLeave(id, data);
    
    await recordAndPublish('crew_leave', leave.id, 'update', leave, userId);
    
    return leave;
  }
  
  async deleteLeave(id: string, userId?: string): Promise<void> {
    await crewRepository.deleteLeave(id);
    
    await recordAndPublish('crew_leave', id, 'delete', { id }, userId);
  }
  
  // ========== Crew Assignments ==========
  
  async listAssignments(date?: string, crewId?: string, vesselId?: string): Promise<SelectCrewAssignment[]> {
    return crewRepository.findAllAssignments(date, crewId, vesselId);
  }
  
  async createAssignment(data: InsertCrewAssignment, userId?: string): Promise<SelectCrewAssignment> {
    const assignment = await crewRepository.createAssignment(data);
    
    await recordAndPublish('crew_assignment', assignment.id, 'create', assignment, userId);
    
    return assignment;
  }
  
  async updateAssignment(id: string, data: Partial<InsertCrewAssignment>, userId?: string): Promise<SelectCrewAssignment> {
    const assignment = await crewRepository.updateAssignment(id, data);
    
    await recordAndPublish('crew_assignment', assignment.id, 'update', assignment, userId);
    
    return assignment;
  }
  
  async deleteAssignment(id: string, userId?: string): Promise<void> {
    await crewRepository.deleteAssignment(id);
    
    await recordAndPublish('crew_assignment', id, 'delete', { id }, userId);
  }
  
  // ========== Crew Certifications ==========
  
  async listCertifications(crewId?: string): Promise<SelectCrewCertification[]> {
    return crewRepository.findAllCertifications(crewId);
  }
  
  async createCertification(data: InsertCrewCertification, userId?: string): Promise<SelectCrewCertification> {
    const cert = await crewRepository.createCertification(data);
    
    await recordAndPublish('crew_certification', cert.id, 'create', cert, userId);
    
    return cert;
  }
  
  async updateCertification(id: string, data: Partial<InsertCrewCertification>, userId?: string): Promise<SelectCrewCertification> {
    const cert = await crewRepository.updateCertification(id, data);
    
    await recordAndPublish('crew_certification', cert.id, 'update', cert, userId);
    
    return cert;
  }
  
  async deleteCertification(id: string, userId?: string): Promise<void> {
    await crewRepository.deleteCertification(id);
    
    await recordAndPublish('crew_certification', id, 'delete', { id }, userId);
  }
}

// Export singleton instance
export const crewService = new CrewService();
