import type { Express } from "express";
import { z } from "zod";
import { equipmentService } from "./service";
import { insertEquipmentSchema } from "@shared/schema";
import { db } from "../../db";
import { requireOrgId, AuthenticatedRequest } from "../../middleware/auth";

/**
 * Register Equipment routes
 */
export function registerEquipmentRoutes(
  app: Express,
  rateLimiters: {
    writeOperationRateLimit: any;
    criticalOperationRateLimit: any;
    generalApiRateLimit: any;
  }
) {
  const { writeOperationRateLimit, criticalOperationRateLimit, generalApiRateLimit } = rateLimiters;

  // GET all equipment
  app.get("/api/equipment", requireOrgId, generalApiRateLimit, async (req, res) => {
    try {
      const orgId = (req as AuthenticatedRequest).orgId;
      const equipment = await equipmentService.listEquipment(orgId);
      res.json(equipment);
    } catch (error) {
      console.error("Failed to fetch equipment registry:", error);
      res.status(500).json({ message: "Failed to fetch equipment registry" });
    }
  });

  // GET equipment health - must come before /:id route to avoid routing conflicts
  app.get("/api/equipment/health", requireOrgId, generalApiRateLimit, async (req, res) => {
    try {
      const orgId = (req as AuthenticatedRequest).orgId;
      let vesselId = req.query.vesselId as string | undefined;
      
      // Validate vesselId is a proper string, not an object stringification
      if (vesselId && (vesselId === '[object Object]' || vesselId.startsWith('[object'))) {
        vesselId = undefined;
      }
      
      const health = await equipmentService.getEquipmentHealth(orgId, vesselId);
      res.json(health);
    } catch (error) {
      console.error("Equipment health API error:", error);
      res.status(500).json({ 
        message: "Failed to fetch equipment health", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // GET equipment with sensor issues
  app.get("/api/equipment/sensor-issues", requireOrgId, generalApiRateLimit, async (req, res) => {
    try {
      const orgId = (req as AuthenticatedRequest).orgId;
      const equipment = await equipmentService.getEquipmentWithSensorIssues(orgId);
      res.json(equipment);
    } catch (error) {
      console.error("Failed to fetch equipment with sensor issues:", error);
      res.status(500).json({ message: "Failed to fetch equipment with sensor issues" });
    }
  });

  // RUL Prediction - single equipment
  app.get("/api/equipment/:id/rul", requireOrgId, generalApiRateLimit, async (req, res) => {
    try {
      const orgId = (req as AuthenticatedRequest).orgId;
      const equipmentId = req.params.id;
      
      const { RulEngine } = await import("../../rul-engine.js");
      const rulEngine = new RulEngine(db);
      
      const prediction = await rulEngine.calculateRul(equipmentId, orgId);
      
      if (!prediction) {
        return res.status(404).json({ 
          message: "No RUL prediction available for this equipment",
          hint: "Ensure equipment has degradation data or ML predictions"
        });
      }
      
      res.json(prediction);
    } catch (error) {
      console.error("RUL prediction error:", error);
      res.status(500).json({ 
        message: "Failed to calculate RUL prediction",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Batch RUL predictions
  app.post("/api/equipment/rul/batch", requireOrgId, generalApiRateLimit, async (req, res) => {
    try {
      const orgId = (req as AuthenticatedRequest).orgId;
      const { equipmentIds } = req.body;
      
      if (!Array.isArray(equipmentIds) || equipmentIds.length === 0) {
        return res.status(400).json({ message: "equipmentIds array is required" });
      }
      
      const { RulEngine } = await import("../../rul-engine.js");
      const rulEngine = new RulEngine(db);
      
      const predictions = await rulEngine.calculateBatchRul(equipmentIds, orgId);
      const result = Object.fromEntries(predictions);
      
      res.json(result);
    } catch (error) {
      console.error("Batch RUL prediction error:", error);
      res.status(500).json({ 
        message: "Failed to calculate batch RUL predictions",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Record component degradation
  app.post("/api/equipment/:id/degradation", requireOrgId, writeOperationRateLimit, async (req, res) => {
    try {
      const orgId = (req as AuthenticatedRequest).orgId;
      const equipmentId = req.params.id;
      
      const { 
        componentType,
        degradationMetric,
        vibrationLevel,
        temperature,
        oilCondition,
        acousticSignature,
        wearParticleCount,
        operatingHours,
        cycleCount,
        loadFactor
      } = req.body;
      
      if (!componentType || degradationMetric === undefined) {
        return res.status(400).json({ 
          message: "componentType and degradationMetric are required" 
        });
      }
      
      const { RulEngine } = await import("../../rul-engine.js");
      const rulEngine = new RulEngine(db);
      
      await rulEngine.recordDegradation(orgId, equipmentId, componentType, {
        degradationMetric,
        vibrationLevel,
        temperature,
        oilCondition,
        acousticSignature,
        wearParticleCount,
        operatingHours,
        cycleCount,
        loadFactor
      });
      
      res.status(201).json({ 
        message: "Degradation recorded successfully",
        equipmentId,
        componentType
      });
    } catch (error) {
      console.error("Record degradation error:", error);
      res.status(500).json({ 
        message: "Failed to record degradation",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // GET single equipment by ID
  app.get("/api/equipment/:id", requireOrgId, generalApiRateLimit, async (req, res) => {
    try {
      const orgId = (req as AuthenticatedRequest).orgId;
      
      const equipment = await equipmentService.getEquipmentById(req.params.id, orgId);
      if (!equipment) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      
      res.json(equipment);
    } catch (error) {
      console.error("Failed to fetch equipment:", error);
      res.status(500).json({ message: "Failed to fetch equipment" });
    }
  });

  // POST create equipment
  app.post("/api/equipment", requireOrgId, writeOperationRateLimit, async (req, res) => {
    try {
      const orgId = (req as AuthenticatedRequest).orgId;
      
      const validationResult = insertEquipmentSchema.safeParse({
        ...req.body,
        orgId,
      });
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid equipment data", 
          errors: validationResult.error.errors 
        });
      }
      
      const equipment = await equipmentService.createEquipment(validationResult.data);
      res.status(201).json(equipment);
    } catch (error) {
      console.error("Failed to create equipment:", error);
      res.status(500).json({ message: "Failed to create equipment" });
    }
  });

  // PUT update equipment
  app.put("/api/equipment/:id", requireOrgId, writeOperationRateLimit, async (req, res) => {
    try {
      const orgId = (req as AuthenticatedRequest).orgId;
      
      // Strip orgId and other immutable fields from update payload
      const { orgId: _, id: __, createdAt: ___, updatedAt: ____, ...safeUpdateData } = req.body;
      
      const validationResult = insertEquipmentSchema.partial().safeParse(safeUpdateData);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid equipment data", 
          errors: validationResult.error.errors 
        });
      }
      
      const equipment = await equipmentService.updateEquipment(
        req.params.id, 
        validationResult.data, 
        orgId
      );
      
      res.json(equipment);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      console.error("Failed to update equipment:", error);
      res.status(500).json({ message: "Failed to update equipment" });
    }
  });

  // DELETE disassociate equipment from vessel
  app.delete("/api/equipment/:id/disassociate-vessel", requireOrgId, writeOperationRateLimit, async (req, res) => {
    try {
      const orgId = (req as AuthenticatedRequest).orgId;
      
      await equipmentService.disassociateVessel(req.params.id, orgId);
      res.json({ message: "Equipment successfully disassociated from vessel" });
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      console.error("Failed to disassociate equipment from vessel:", error);
      res.status(500).json({ message: "Failed to disassociate equipment from vessel" });
    }
  });

  // DELETE equipment
  app.delete("/api/equipment/:id", requireOrgId, criticalOperationRateLimit, async (req, res) => {
    try {
      const orgId = (req as AuthenticatedRequest).orgId;
      
      await equipmentService.deleteEquipment(req.params.id, orgId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      console.error("Failed to delete equipment:", error);
      res.status(500).json({ message: "Failed to delete equipment" });
    }
  });

  // GET equipment sensor coverage
  app.get("/api/equipment/:id/sensor-coverage", requireOrgId, generalApiRateLimit, async (req, res) => {
    try {
      const equipmentId = req.params.id;
      const orgId = (req as AuthenticatedRequest).orgId;
      
      const coverage = await equipmentService.getSensorCoverage(equipmentId, orgId);
      res.json(coverage);
    } catch (error) {
      console.error("Failed to analyze equipment sensor coverage:", error);
      res.status(500).json({ message: "Failed to analyze equipment sensor coverage" });
    }
  });

  // POST setup missing sensor configurations
  app.post("/api/equipment/:id/setup-sensors", requireOrgId, criticalOperationRateLimit, async (req, res) => {
    try {
      const equipmentId = req.params.id;
      const orgId = (req as AuthenticatedRequest).orgId;
      
      const result = await equipmentService.setupSensors(equipmentId, orgId);
      res.json(result);
    } catch (error) {
      console.error("Failed to setup missing sensor configurations:", error);
      res.status(500).json({ message: "Failed to setup missing sensor configurations" });
    }
  });

  // GET compatible parts for equipment
  app.get("/api/equipment/:equipmentId/compatible-parts", requireOrgId, generalApiRateLimit, async (req, res) => {
    try {
      const equipmentId = req.params.equipmentId;
      const orgId = (req as AuthenticatedRequest).orgId;
      
      const parts = await equipmentService.getCompatibleParts(equipmentId, orgId);
      res.json(parts);
    } catch (error) {
      console.error("Failed to fetch compatible parts:", error);
      res.status(500).json({ message: "Failed to fetch compatible parts" });
    }
  });

  // GET suggested parts for equipment
  app.get("/api/equipment/:equipmentId/suggested-parts", requireOrgId, generalApiRateLimit, async (req, res) => {
    try {
      const equipmentId = req.params.equipmentId;
      const orgId = (req as AuthenticatedRequest).orgId;
      
      const parts = await equipmentService.getSuggestedParts(equipmentId, orgId);
      res.json(parts);
    } catch (error) {
      console.error("Failed to fetch suggested parts:", error);
      res.status(500).json({ message: "Failed to fetch suggested parts" });
    }
  });
}
