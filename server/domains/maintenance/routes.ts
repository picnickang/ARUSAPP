import type { Express } from "express";
import { z } from "zod";
import { 
  insertMaintenanceScheduleSchema,
  insertMaintenanceTemplateSchema
} from "@shared/schema";
import { maintenanceService } from "./service";
import { requireOrgId, requireOrgIdAndValidateBody, AuthenticatedRequest } from "../../middleware/auth";

/**
 * Maintenance Routes
 * Handles HTTP concerns for maintenance domain (schedules and templates)
 */
export function registerMaintenanceRoutes(
  app: Express,
  rateLimit: {
    writeOperationRateLimit: any;
    criticalOperationRateLimit: any;
    generalApiRateLimit: any;
  }
) {
  const { writeOperationRateLimit, criticalOperationRateLimit, generalApiRateLimit } = rateLimit;

  // ========== Maintenance Schedules ==========

  // GET /api/maintenance-schedules
  app.get("/api/maintenance-schedules", generalApiRateLimit, async (req, res) => {
    try {
      const { equipmentId, status } = req.query;
      const schedules = await maintenanceService.listSchedules(
        equipmentId as string | undefined,
        status as string | undefined
      );
      res.json(schedules);
    } catch (error) {
      console.error('[GET /api/maintenance-schedules] Error:', error);
      res.status(500).json({ message: "Failed to fetch maintenance schedules" });
    }
  });

  // GET /api/maintenance-schedules/upcoming
  app.get("/api/maintenance-schedules/upcoming", requireOrgId, generalApiRateLimit, async (req, res) => {
    try {
      const orgId = (req as AuthenticatedRequest).orgId;
      const daysAhead = req.query.daysAhead ? parseInt(req.query.daysAhead as string) : 30;
      
      const schedules = await maintenanceService.getUpcomingSchedules(orgId, daysAhead);
      res.json(schedules);
    } catch (error) {
      console.error('[GET /api/maintenance-schedules/upcoming] Error:', error);
      res.status(500).json({ message: "Failed to fetch upcoming maintenance schedules" });
    }
  });

  // GET /api/maintenance-schedules/:id
  app.get("/api/maintenance-schedules/:id", requireOrgId, generalApiRateLimit, async (req, res) => {
    try {
      const orgId = (req as AuthenticatedRequest).orgId;
      const schedule = await maintenanceService.getScheduleById(req.params.id, orgId);
      
      if (!schedule) {
        return res.status(404).json({ message: "Maintenance schedule not found" });
      }
      
      res.json(schedule);
    } catch (error) {
      console.error(`[GET /api/maintenance-schedules/${req.params.id}] Error:`, error);
      res.status(500).json({ message: "Failed to fetch maintenance schedule" });
    }
  });

  // POST /api/maintenance-schedules
  app.post("/api/maintenance-schedules", requireOrgIdAndValidateBody, writeOperationRateLimit, async (req, res) => {
    try {
      const scheduleData = insertMaintenanceScheduleSchema.parse(req.body);
      const schedule = await maintenanceService.createSchedule(scheduleData, req.user?.id);
      
      res.status(201).json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid maintenance schedule data", 
          errors: error.errors 
        });
      }
      console.error('[POST /api/maintenance-schedules] Error:', error);
      res.status(500).json({ 
        message: "Failed to create maintenance schedule",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // PUT /api/maintenance-schedules/:id
  app.put("/api/maintenance-schedules/:id", requireOrgIdAndValidateBody, writeOperationRateLimit, async (req, res) => {
    try {
      const scheduleData = insertMaintenanceScheduleSchema.partial().parse(req.body);
      const schedule = await maintenanceService.updateSchedule(
        req.params.id,
        scheduleData,
        req.user?.id
      );
      
      res.json(schedule);
    } catch (error) {
      console.error(`[PUT /api/maintenance-schedules/${req.params.id}] Error:`, error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid maintenance schedule data", 
          errors: error.errors 
        });
      }
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update maintenance schedule" });
    }
  });

  // DELETE /api/maintenance-schedules/:id
  app.delete("/api/maintenance-schedules/:id", requireOrgId, criticalOperationRateLimit, async (req, res) => {
    try {
      const orgId = (req as AuthenticatedRequest).orgId;
      await maintenanceService.deleteSchedule(req.params.id, orgId, req.user?.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      console.error(`[DELETE /api/maintenance-schedules/${req.params.id}] Error:`, error);
      res.status(500).json({ 
        message: "Failed to delete maintenance schedule",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // POST /api/maintenance-schedules/auto-schedule/:equipmentId
  app.post("/api/maintenance-schedules/auto-schedule/:equipmentId", requireOrgIdAndValidateBody, writeOperationRateLimit, async (req, res) => {
    try {
      const equipmentId = req.params.equipmentId;
      const { pdmScore } = req.body;
      
      if (pdmScore === undefined || pdmScore === null) {
        return res.status(400).json({ 
          message: "pdmScore is required in request body" 
        });
      }
      
      if (typeof pdmScore !== 'number' || pdmScore < 0 || pdmScore > 100) {
        return res.status(400).json({ 
          message: "pdmScore must be a number between 0 and 100" 
        });
      }
      
      const schedule = await maintenanceService.autoScheduleForEquipment(
        equipmentId, 
        pdmScore,
        req.user?.id
      );
      
      res.status(201).json(schedule);
    } catch (error) {
      console.error(`[POST /api/maintenance-schedules/auto-schedule/${req.params.equipmentId}] Error:`, error);
      res.status(500).json({ 
        message: "Failed to auto-schedule maintenance",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ========== Maintenance Templates ==========

  // GET /api/maintenance-templates
  app.get("/api/maintenance-templates", requireOrgId, generalApiRateLimit, async (req, res) => {
    try {
      const orgId = (req as AuthenticatedRequest).orgId;
      const { equipmentType, isActive } = req.query;
      
      const templates = await maintenanceService.listTemplates(
        orgId,
        equipmentType as string | undefined,
        isActive !== undefined ? isActive === 'true' : undefined
      );
      res.json(templates);
    } catch (error) {
      console.error('[GET /api/maintenance-templates] Error:', error);
      res.status(500).json({ message: "Failed to fetch maintenance templates" });
    }
  });

  // GET /api/maintenance-templates/:id
  app.get("/api/maintenance-templates/:id", requireOrgId, generalApiRateLimit, async (req, res) => {
    try {
      const orgId = (req as AuthenticatedRequest).orgId;
      const template = await maintenanceService.getTemplateById(req.params.id, orgId);
      
      if (!template) {
        return res.status(404).json({ message: "Maintenance template not found" });
      }
      
      res.json(template);
    } catch (error) {
      console.error(`[GET /api/maintenance-templates/${req.params.id}] Error:`, error);
      res.status(500).json({ message: "Failed to fetch maintenance template" });
    }
  });

  // POST /api/maintenance-templates
  app.post("/api/maintenance-templates", requireOrgIdAndValidateBody, writeOperationRateLimit, async (req, res) => {
    try {
      const templateData = insertMaintenanceTemplateSchema.parse(req.body);
      const template = await maintenanceService.createTemplate(templateData, req.user?.id);
      
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid maintenance template data", 
          errors: error.errors 
        });
      }
      console.error('[POST /api/maintenance-templates] Error:', error);
      res.status(500).json({ 
        message: "Failed to create maintenance template",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // PUT /api/maintenance-templates/:id
  app.put("/api/maintenance-templates/:id", requireOrgIdAndValidateBody, writeOperationRateLimit, async (req, res) => {
    try {
      const orgId = (req as AuthenticatedRequest).orgId;
      
      const templateData = insertMaintenanceTemplateSchema.partial().parse(req.body);
      const template = await maintenanceService.updateTemplate(
        req.params.id,
        templateData,
        orgId,
        req.user?.id
      );
      
      res.json(template);
    } catch (error) {
      console.error(`[PUT /api/maintenance-templates/${req.params.id}] Error:`, error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid maintenance template data", 
          errors: error.errors 
        });
      }
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update maintenance template" });
    }
  });

  // DELETE /api/maintenance-templates/:id
  app.delete("/api/maintenance-templates/:id", requireOrgId, criticalOperationRateLimit, async (req, res) => {
    try {
      const orgId = (req as AuthenticatedRequest).orgId;
      
      await maintenanceService.deleteTemplate(req.params.id, orgId, req.user?.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      console.error(`[DELETE /api/maintenance-templates/${req.params.id}] Error:`, error);
      res.status(500).json({ 
        message: "Failed to delete maintenance template",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
}
