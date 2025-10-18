import type {
  SelectCrew,
  InsertCrew,
  SelectSkill,
  InsertSkill,
  SelectCrewSkill,
  InsertCrewSkill,
  SelectCrewLeave,
  InsertCrewLeave,
  SelectCrewAssignment,
  InsertCrewAssignment,
  SelectCrewCertification,
  InsertCrewCertification
} from "@shared/schema";
import { storage } from "../../storage";

/**
 * Crew Repository
 * Handles all data access for crew domain
 */
export class CrewRepository {
  
  // ========== Crew Members ==========
  
  async findAllCrew(orgId?: string, vesselId?: string): Promise<SelectCrew[]> {
    const crewWithSkills = await storage.getCrew(orgId, vesselId);
    return crewWithSkills.map(c => ({
      id: c.id,
      orgId: c.orgId,
      name: c.name,
      rank: c.rank,
      vesselId: c.vesselId,
      maxHours7d: c.maxHours7d,
      minRestH: c.minRestH,
      active: c.active,
      onDuty: c.onDuty,
      notes: c.notes,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    }));
  }
  
  async findCrewById(id: string, orgId?: string): Promise<SelectCrew | undefined> {
    return storage.getCrewMember(id, orgId);
  }
  
  async createCrew(crewData: InsertCrew): Promise<SelectCrew> {
    return storage.createCrew(crewData);
  }
  
  async updateCrew(id: string, crewData: Partial<InsertCrew>): Promise<SelectCrew> {
    return storage.updateCrew(id, crewData);
  }
  
  async deleteCrew(id: string): Promise<void> {
    return storage.deleteCrew(id);
  }
  
  // ========== Skills ==========
  
  async findAllSkills(orgId: string): Promise<SelectSkill[]> {
    return storage.getSkills(orgId);
  }
  
  async createSkill(skillData: InsertSkill): Promise<SelectSkill> {
    return storage.createSkill(skillData);
  }
  
  async updateSkill(id: string, skillData: Partial<InsertSkill>): Promise<SelectSkill> {
    return storage.updateSkill(id, skillData);
  }
  
  async deleteSkill(id: string): Promise<void> {
    return storage.deleteSkill(id);
  }
  
  // ========== Crew Skills (Assignment) ==========
  
  async assignSkill(crewId: string, skill: string, level: number): Promise<SelectCrewSkill> {
    return storage.setCrewSkill(crewId, skill, level);
  }
  
  async removeSkill(crewId: string, skill: string): Promise<void> {
    return storage.deleteCrewSkill(crewId, skill);
  }
  
  async getCrewSkills(crewId: string): Promise<SelectCrewSkill[]> {
    return storage.getCrewSkills(crewId);
  }
  
  // ========== Crew Leave ==========
  
  async findAllLeave(crewId?: string, startDate?: Date, endDate?: Date): Promise<SelectCrewLeave[]> {
    return storage.getCrewLeave(crewId, startDate, endDate);
  }
  
  async createLeave(leaveData: InsertCrewLeave): Promise<SelectCrewLeave> {
    return storage.createCrewLeave(leaveData);
  }
  
  async updateLeave(id: string, leaveData: Partial<InsertCrewLeave>): Promise<SelectCrewLeave> {
    return storage.updateCrewLeave(id, leaveData);
  }
  
  async deleteLeave(id: string): Promise<void> {
    return storage.deleteCrewLeave(id);
  }
  
  // ========== Crew Assignments ==========
  
  async findAllAssignments(date?: string, crewId?: string, vesselId?: string): Promise<SelectCrewAssignment[]> {
    return storage.getCrewAssignments(date, crewId, vesselId);
  }
  
  async createAssignment(assignmentData: InsertCrewAssignment): Promise<SelectCrewAssignment> {
    return storage.createCrewAssignment(assignmentData);
  }
  
  async updateAssignment(id: string, assignmentData: Partial<InsertCrewAssignment>): Promise<SelectCrewAssignment> {
    return storage.updateCrewAssignment(id, assignmentData);
  }
  
  async deleteAssignment(id: string): Promise<void> {
    return storage.deleteCrewAssignment(id);
  }
  
  // ========== Crew Certifications ==========
  
  async findAllCertifications(crewId?: string): Promise<SelectCrewCertification[]> {
    return storage.getCrewCertifications(crewId);
  }
  
  async createCertification(certData: InsertCrewCertification): Promise<SelectCrewCertification> {
    return storage.createCrewCertification(certData);
  }
  
  async updateCertification(id: string, certData: Partial<InsertCrewCertification>): Promise<SelectCrewCertification> {
    return storage.updateCrewCertification(id, certData);
  }
  
  async deleteCertification(id: string): Promise<void> {
    return storage.deleteCrewCertification(id);
  }
}

// Export singleton instance
export const crewRepository = new CrewRepository();
