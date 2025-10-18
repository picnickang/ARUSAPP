import type { Express } from "express";
import { z } from "zod";
import { 
  insertCrewSchema,
  insertSkillSchema,
  insertCrewLeaveSchema,
  insertCrewAssignmentSchema,
  insertCrewCertificationSchema
} from "@shared/schema";
import { crewService } from "./service";

/**
 * Crew Routes
 * Handles HTTP concerns for crew domain
 */
export function registerCrewRoutes(
  app: Express,
  rateLimit: {
    writeOperationRateLimit: any;
    criticalOperationRateLimit: any;
    generalApiRateLimit: any;
  }
) {
  const { writeOperationRateLimit, criticalOperationRateLimit, generalApiRateLimit } = rateLimit;

  // ========== Crew Members ==========

  // GET /api/crew
  app.get("/api/crew", generalApiRateLimit, async (req, res) => {
    try {
      const { orgId, vesselId } = req.query;
      const crew = await crewService.listCrew(
        orgId as string | undefined,
        vesselId as string | undefined
      );
      res.json(crew);
    } catch (error) {
      console.error('[GET /api/crew] Error:', error);
      res.status(500).json({ message: "Failed to fetch crew" });
    }
  });

  // POST /api/crew
  app.post("/api/crew", writeOperationRateLimit, async (req, res) => {
    try {
      const crewData = insertCrewSchema.parse(req.body);
      const crew = await crewService.createCrew(crewData, req.user?.id);
      res.status(201).json(crew);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid crew data", 
          errors: error.errors 
        });
      }
      console.error('[POST /api/crew] Error:', error);
      res.status(500).json({ 
        message: "Failed to create crew member",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // GET /api/crew/:id
  app.get("/api/crew/:id", generalApiRateLimit, async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] as string | undefined;
      const crew = await crewService.getCrewById(req.params.id, orgId);
      
      if (!crew) {
        return res.status(404).json({ message: "Crew member not found" });
      }
      
      res.json(crew);
    } catch (error) {
      console.error(`[GET /api/crew/${req.params.id}] Error:`, error);
      res.status(500).json({ message: "Failed to fetch crew member" });
    }
  });

  // PUT /api/crew/:id
  app.put("/api/crew/:id", writeOperationRateLimit, async (req, res) => {
    try {
      const crewData = insertCrewSchema.partial().parse(req.body);
      const crew = await crewService.updateCrew(req.params.id, crewData, req.user?.id);
      res.json(crew);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid crew data", 
          errors: error.errors 
        });
      }
      console.error(`[PUT /api/crew/${req.params.id}] Error:`, error);
      res.status(500).json({ 
        message: "Failed to update crew member",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // DELETE /api/crew/:id
  app.delete("/api/crew/:id", criticalOperationRateLimit, async (req, res) => {
    try {
      await crewService.deleteCrew(req.params.id, req.user?.id);
      res.status(204).send();
    } catch (error) {
      console.error(`[DELETE /api/crew/${req.params.id}] Error:`, error);
      res.status(500).json({ 
        message: "Failed to delete crew member",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ========== Skills ==========

  // GET /api/skills
  app.get("/api/skills", generalApiRateLimit, async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] as string || 'default-org-id';
      const skills = await crewService.listSkills(orgId);
      res.json(skills);
    } catch (error) {
      console.error('[GET /api/skills] Error:', error);
      res.status(500).json({ message: "Failed to fetch skills" });
    }
  });

  // POST /api/skills
  app.post("/api/skills", writeOperationRateLimit, async (req, res) => {
    try {
      const skillData = insertSkillSchema.parse(req.body);
      const skill = await crewService.createSkill(skillData, req.user?.id);
      res.status(201).json(skill);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid skill data", 
          errors: error.errors 
        });
      }
      console.error('[POST /api/skills] Error:', error);
      res.status(500).json({ 
        message: "Failed to create skill",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // DELETE /api/skills/:id
  app.delete("/api/skills/:id", criticalOperationRateLimit, async (req, res) => {
    try {
      await crewService.deleteSkill(req.params.id, req.user?.id);
      res.status(204).send();
    } catch (error) {
      console.error(`[DELETE /api/skills/${req.params.id}] Error:`, error);
      res.status(500).json({ 
        message: "Failed to delete skill",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ========== Crew Skills (Assignment) ==========

  // POST /api/crew/:crewId/skills/:skillId
  app.post("/api/crew/:crewId/skills/:skillId", writeOperationRateLimit, async (req, res) => {
    try {
      const { crewId, skillId } = req.params;
      const { level } = req.body;
      
      if (typeof level !== 'number' || level < 1 || level > 5) {
        return res.status(400).json({ 
          message: "Level must be a number between 1 and 5" 
        });
      }
      
      const crewSkill = await crewService.assignSkillToCrew(crewId, skillId, level, req.user?.id);
      res.status(201).json(crewSkill);
    } catch (error) {
      console.error(`[POST /api/crew/${req.params.crewId}/skills/${req.params.skillId}] Error:`, error);
      res.status(500).json({ 
        message: "Failed to assign skill to crew member",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // DELETE /api/crew/:crewId/skills/:skillId
  app.delete("/api/crew/:crewId/skills/:skillId", criticalOperationRateLimit, async (req, res) => {
    try {
      const { crewId, skillId } = req.params;
      await crewService.removeSkillFromCrew(crewId, skillId, req.user?.id);
      res.status(204).send();
    } catch (error) {
      console.error(`[DELETE /api/crew/${req.params.crewId}/skills/${req.params.skillId}] Error:`, error);
      res.status(500).json({ 
        message: "Failed to remove skill from crew member",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // GET /api/crew/:id/skills
  app.get("/api/crew/:id/skills", generalApiRateLimit, async (req, res) => {
    try {
      const skills = await crewService.getCrewSkills(req.params.id);
      res.json(skills);
    } catch (error) {
      console.error(`[GET /api/crew/${req.params.id}/skills] Error:`, error);
      res.status(500).json({ message: "Failed to fetch crew skills" });
    }
  });

  // ========== Crew Leave ==========

  // GET /api/crew-leave
  app.get("/api/crew-leave", generalApiRateLimit, async (req, res) => {
    try {
      const { crewId, startDate, endDate } = req.query;
      const leave = await crewService.listLeave(
        crewId as string | undefined,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(leave);
    } catch (error) {
      console.error('[GET /api/crew-leave] Error:', error);
      res.status(500).json({ message: "Failed to fetch crew leave" });
    }
  });

  // POST /api/crew-leave
  app.post("/api/crew-leave", writeOperationRateLimit, async (req, res) => {
    try {
      const leaveData = insertCrewLeaveSchema.parse(req.body);
      const leave = await crewService.createLeave(leaveData, req.user?.id);
      res.status(201).json(leave);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid leave data", 
          errors: error.errors 
        });
      }
      console.error('[POST /api/crew-leave] Error:', error);
      res.status(500).json({ 
        message: "Failed to create leave record",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // PUT /api/crew-leave/:id
  app.put("/api/crew-leave/:id", writeOperationRateLimit, async (req, res) => {
    try {
      const leaveData = insertCrewLeaveSchema.partial().parse(req.body);
      const leave = await crewService.updateLeave(req.params.id, leaveData, req.user?.id);
      res.json(leave);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid leave data", 
          errors: error.errors 
        });
      }
      console.error(`[PUT /api/crew-leave/${req.params.id}] Error:`, error);
      res.status(500).json({ 
        message: "Failed to update leave record",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // DELETE /api/crew-leave/:id
  app.delete("/api/crew-leave/:id", criticalOperationRateLimit, async (req, res) => {
    try {
      await crewService.deleteLeave(req.params.id, req.user?.id);
      res.status(204).send();
    } catch (error) {
      console.error(`[DELETE /api/crew-leave/${req.params.id}] Error:`, error);
      res.status(500).json({ 
        message: "Failed to delete leave record",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ========== Crew Assignments ==========

  // GET /api/crew-assignments
  app.get("/api/crew-assignments", generalApiRateLimit, async (req, res) => {
    try {
      const { date, crewId, vesselId } = req.query;
      const assignments = await crewService.listAssignments(
        date as string | undefined,
        crewId as string | undefined,
        vesselId as string | undefined
      );
      res.json(assignments);
    } catch (error) {
      console.error('[GET /api/crew-assignments] Error:', error);
      res.status(500).json({ message: "Failed to fetch crew assignments" });
    }
  });

  // POST /api/crew-assignments
  app.post("/api/crew-assignments", writeOperationRateLimit, async (req, res) => {
    try {
      const assignmentData = insertCrewAssignmentSchema.parse(req.body);
      const assignment = await crewService.createAssignment(assignmentData, req.user?.id);
      res.status(201).json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid assignment data", 
          errors: error.errors 
        });
      }
      console.error('[POST /api/crew-assignments] Error:', error);
      res.status(500).json({ 
        message: "Failed to create crew assignment",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // PUT /api/crew-assignments/:id
  app.put("/api/crew-assignments/:id", writeOperationRateLimit, async (req, res) => {
    try {
      const assignmentData = insertCrewAssignmentSchema.partial().parse(req.body);
      const assignment = await crewService.updateAssignment(req.params.id, assignmentData, req.user?.id);
      res.json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid assignment data", 
          errors: error.errors 
        });
      }
      console.error(`[PUT /api/crew-assignments/${req.params.id}] Error:`, error);
      res.status(500).json({ 
        message: "Failed to update crew assignment",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // DELETE /api/crew-assignments/:id
  app.delete("/api/crew-assignments/:id", criticalOperationRateLimit, async (req, res) => {
    try {
      await crewService.deleteAssignment(req.params.id, req.user?.id);
      res.status(204).send();
    } catch (error) {
      console.error(`[DELETE /api/crew-assignments/${req.params.id}] Error:`, error);
      res.status(500).json({ 
        message: "Failed to delete crew assignment",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ========== Crew Certifications ==========

  // GET /api/crew-certifications
  app.get("/api/crew-certifications", generalApiRateLimit, async (req, res) => {
    try {
      const { crewId } = req.query;
      const certifications = await crewService.listCertifications(crewId as string | undefined);
      res.json(certifications);
    } catch (error) {
      console.error('[GET /api/crew-certifications] Error:', error);
      res.status(500).json({ message: "Failed to fetch crew certifications" });
    }
  });

  // POST /api/crew-certifications
  app.post("/api/crew-certifications", writeOperationRateLimit, async (req, res) => {
    try {
      const certData = insertCrewCertificationSchema.parse(req.body);
      const cert = await crewService.createCertification(certData, req.user?.id);
      res.status(201).json(cert);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid certification data", 
          errors: error.errors 
        });
      }
      console.error('[POST /api/crew-certifications] Error:', error);
      res.status(500).json({ 
        message: "Failed to create certification",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // PUT /api/crew-certifications/:id
  app.put("/api/crew-certifications/:id", writeOperationRateLimit, async (req, res) => {
    try {
      const certData = insertCrewCertificationSchema.partial().parse(req.body);
      const cert = await crewService.updateCertification(req.params.id, certData, req.user?.id);
      res.json(cert);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid certification data", 
          errors: error.errors 
        });
      }
      console.error(`[PUT /api/crew-certifications/${req.params.id}] Error:`, error);
      res.status(500).json({ 
        message: "Failed to update certification",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // DELETE /api/crew-certifications/:id
  app.delete("/api/crew-certifications/:id", criticalOperationRateLimit, async (req, res) => {
    try {
      await crewService.deleteCertification(req.params.id, req.user?.id);
      res.status(204).send();
    } catch (error) {
      console.error(`[DELETE /api/crew-certifications/${req.params.id}] Error:`, error);
      res.status(500).json({ 
        message: "Failed to delete certification",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
}
