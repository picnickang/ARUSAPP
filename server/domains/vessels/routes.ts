import type { Express } from "express";
import { z } from "zod";
import { vesselsService } from "./service";
import { insertVesselSchema } from "@shared/schema";
import { requireAdminAuth, auditAdminAction } from "../../security";

/**
 * Helper to extract organization ID from request
 */
function getOrgIdFromRequest(req: any): string {
  return req.headers['x-org-id'] as string || req.user?.orgId || 'default-org-id';
}

/**
 * Register Vessels routes
 */
export function registerVesselsRoutes(
  app: Express,
  rateLimiters: {
    writeOperationRateLimit: any;
    criticalOperationRateLimit: any;
    generalApiRateLimit: any;
  }
) {
  const { writeOperationRateLimit, criticalOperationRateLimit, generalApiRateLimit } = rateLimiters;

  // GET all vessels
  app.get("/api/vessels", generalApiRateLimit, async (req, res) => {
    try {
      const { org_id } = req.query;
      const vessels = await vesselsService.listVessels(org_id as string | undefined);
      res.json(vessels);
    } catch (error) {
      console.error("Failed to fetch vessels:", error);
      res.status(500).json({ error: "Failed to fetch vessels" });
    }
  });

  // POST create vessel
  app.post("/api/vessels", writeOperationRateLimit, async (req, res) => {
    try {
      const validationResult = insertVesselSchema.safeParse({
        ...req.body,
        orgId: getOrgIdFromRequest(req)
      });
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid vessel data", 
          errors: validationResult.error.errors 
        });
      }
      
      const vessel = await vesselsService.createVessel(validationResult.data);
      res.status(201).json(vessel);
    } catch (error) {
      console.error("Failed to create vessel:", error);
      res.status(500).json({ message: "Failed to create vessel" });
    }
  });

  // GET single vessel
  app.get("/api/vessels/:id", generalApiRateLimit, async (req, res) => {
    try {
      const vessel = await vesselsService.getVesselById(req.params.id);
      if (!vessel) {
        return res.status(404).json({ error: "Vessel not found" });
      }
      res.json(vessel);
    } catch (error) {
      console.error("Failed to fetch vessel:", error);
      res.status(500).json({ error: "Failed to fetch vessel" });
    }
  });

  // PUT update vessel
  app.put("/api/vessels/:id", writeOperationRateLimit, async (req, res) => {
    try {
      const validationResult = insertVesselSchema.partial().safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid vessel data", 
          errors: validationResult.error.errors 
        });
      }
      
      const vessel = await vesselsService.updateVessel(req.params.id, validationResult.data);
      res.json(vessel);
    } catch (error) {
      console.error("Failed to update vessel:", error);
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ error: "Vessel not found" });
      }
      res.status(500).json({ message: "Failed to update vessel" });
    }
  });

  // DELETE vessel (admin only)
  app.delete("/api/vessels/:id", 
    ...requireAdminAuth,
    auditAdminAction('delete_vessel'),
    criticalOperationRateLimit,
    async (req, res) => {
      try {
        const orgId = req.user?.orgId;
        if (!orgId) {
          return res.status(401).json({ message: "Authentication required" });
        }
        
        await vesselsService.deleteVessel(req.params.id, true, orgId);
        res.status(204).send();
      } catch (error) {
        console.error("Failed to delete vessel:", error);
        if (error instanceof Error && error.message.includes("not found")) {
          return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: "Failed to delete vessel" });
      }
  });

  // GET export vessel data (admin only)
  app.get("/api/vessels/:id/export", 
    ...requireAdminAuth,
    auditAdminAction('export_vessel'),
    criticalOperationRateLimit,
    async (req, res) => {
      try {
        const orgId = req.user?.orgId;
        if (!orgId) {
          return res.status(401).json({ message: "Authentication required" });
        }
        
        const exportData = await vesselsService.exportVessel(req.params.id, orgId);
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="vessel-${req.params.id}-export.json"`);
        res.json(exportData);
      } catch (error) {
        console.error("Failed to export vessel:", error);
        if (error instanceof Error && error.message.includes("not found")) {
          return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: "Failed to export vessel" });
      }
  });

  // POST import vessel data (admin only)
  app.post("/api/vessels/import", 
    ...requireAdminAuth,
    auditAdminAction('import_vessel'),
    criticalOperationRateLimit,
    async (req, res) => {
      try {
        const orgId = req.user?.orgId;
        if (!orgId) {
          return res.status(401).json({ message: "Authentication required" });
        }
        
        const result = await vesselsService.importVessel(req.body, orgId);
        res.status(201).json(result);
      } catch (error) {
        console.error("Failed to import vessel:", error);
        res.status(500).json({ 
          message: "Failed to import vessel",
          error: error instanceof Error ? error.message : String(error)
        });
      }
  });

  // POST reset vessel downtime
  app.post("/api/vessels/:id/reset-downtime", writeOperationRateLimit, async (req, res) => {
    try {
      const orgId = getOrgIdFromRequest(req);
      const result = await vesselsService.resetDowntime(req.params.id, orgId);
      res.json(result);
    } catch (error) {
      console.error("Failed to reset vessel downtime:", error);
      res.status(500).json({ message: "Failed to reset vessel downtime" });
    }
  });

  // POST reset vessel operation
  app.post("/api/vessels/:id/reset-operation", writeOperationRateLimit, async (req, res) => {
    try {
      const orgId = getOrgIdFromRequest(req);
      const result = await vesselsService.resetOperation(req.params.id, orgId);
      res.json(result);
    } catch (error) {
      console.error("Failed to reset vessel operation:", error);
      res.status(500).json({ message: "Failed to reset vessel operation" });
    }
  });

  // POST wipe vessel data (admin only)
  app.post("/api/vessels/:id/wipe-data", 
    ...requireAdminAuth,
    auditAdminAction('wipe_vessel_data'),
    criticalOperationRateLimit,
    async (req, res) => {
      try {
        const orgId = req.user?.orgId;
        if (!orgId) {
          return res.status(401).json({ message: "Authentication required" });
        }
        
        const result = await vesselsService.wipeData(req.params.id, orgId);
        res.json(result);
      } catch (error) {
        console.error("Failed to wipe vessel data:", error);
        res.status(500).json({ 
          message: "Failed to wipe vessel data",
          error: error instanceof Error ? error.message : String(error)
        });
      }
  });

  // GET vessel equipment
  app.get("/api/vessels/:id/equipment", generalApiRateLimit, async (req, res) => {
    try {
      const orgId = getOrgIdFromRequest(req);
      const equipment = await vesselsService.getVesselEquipment(req.params.id, orgId);
      res.json(equipment);
    } catch (error) {
      console.error("Failed to fetch vessel equipment:", error);
      res.status(500).json({ message: "Failed to fetch vessel equipment" });
    }
  });

  // POST assign equipment to vessel
  app.post("/api/vessels/:vesselId/equipment/:equipmentId", writeOperationRateLimit, async (req, res) => {
    try {
      const orgId = getOrgIdFromRequest(req);
      const { vesselId, equipmentId } = req.params;
      
      const result = await vesselsService.assignEquipment(vesselId, equipmentId, orgId);
      res.json(result);
    } catch (error) {
      console.error("Failed to assign equipment to vessel:", error);
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to assign equipment to vessel" });
    }
  });

  // DELETE unassign equipment from vessel
  app.delete("/api/vessels/:vesselId/equipment/:equipmentId", writeOperationRateLimit, async (req, res) => {
    try {
      const orgId = getOrgIdFromRequest(req);
      const { vesselId, equipmentId } = req.params;
      
      const result = await vesselsService.unassignEquipment(vesselId, equipmentId, orgId);
      res.json(result);
    } catch (error) {
      console.error("Failed to unassign equipment from vessel:", error);
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to unassign equipment from vessel" });
    }
  });
}
