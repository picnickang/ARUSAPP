import type { Express } from "express";
import { z } from "zod";
import { inventoryService } from "./service";
import { insertPartsInventorySchema } from "@shared/schema";
import { requireOrgId, requireOrgIdAndValidateBody, AuthenticatedRequest } from "../../middleware/auth";

/**
 * Inventory (Parts) Routes
 * Handles HTTP concerns for inventory domain (parts catalog and inventory)
 */
export function registerInventoryRoutes(
  app: Express,
  rateLimit: {
    writeOperationRateLimit: any;
    criticalOperationRateLimit: any;
    generalApiRateLimit: any;
  }
) {
  const { writeOperationRateLimit, criticalOperationRateLimit, generalApiRateLimit } = rateLimit;

  // ========== Parts (Enhanced Catalog) Endpoints ==========

  // GET /api/parts - List all parts
  app.get("/api/parts", requireOrgId, generalApiRateLimit, async (req, res) => {
    try {
      const orgId = (req as AuthenticatedRequest).orgId;
      const parts = await inventoryService.listParts(orgId);
      res.json(parts);
    } catch (error) {
      console.error('[GET /api/parts] Error:', error);
      res.status(500).json({ message: "Failed to fetch parts" });
    }
  });

  // DELETE /api/parts/:id - Delete part
  app.delete("/api/parts/:id", requireOrgId, criticalOperationRateLimit, async (req, res) => {
    try {
      const orgId = (req as AuthenticatedRequest).orgId;
      await inventoryService.deletePart(req.params.id, orgId, req.user?.id);
      res.status(204).send();
    } catch (error) {
      console.error(`[DELETE /api/parts/${req.params.id}] Error:`, error);
      res.status(500).json({ 
        message: "Failed to delete part",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // POST /api/parts/availability - Check part availability
  app.post("/api/parts/availability", requireOrgId, generalApiRateLimit, async (req, res) => {
    try {
      const { partId, quantity } = req.body;
      const orgId = (req as AuthenticatedRequest).orgId;
      
      if (!partId || !quantity) {
        return res.status(400).json({ 
          message: "partId and quantity are required" 
        });
      }
      
      const availability = await inventoryService.checkAvailability(partId, quantity, orgId);
      res.json(availability);
    } catch (error) {
      console.error('[POST /api/parts/availability] Error:', error);
      res.status(500).json({ message: "Failed to check part availability" });
    }
  });

  // POST /api/parts/:id/sync-costs - Sync part costs to stock
  app.post("/api/parts/:id/sync-costs", writeOperationRateLimit, async (req, res) => {
    try {
      await inventoryService.syncPartCosts(req.params.id, req.user?.id);
      res.json({ 
        message: "Part costs synchronized successfully",
        partId: req.params.id
      });
    } catch (error) {
      console.error(`[POST /api/parts/${req.params.id}/sync-costs] Error:`, error);
      res.status(500).json({ 
        message: "Failed to sync part costs",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // GET /api/parts/:partId/compatible-equipment - Get compatible equipment for part
  app.get("/api/parts/:partId/compatible-equipment", requireOrgId, generalApiRateLimit, async (req, res) => {
    try {
      const orgId = (req as AuthenticatedRequest).orgId;
      const equipment = await inventoryService.getCompatibleEquipment(req.params.partId, orgId);
      res.json(equipment);
    } catch (error) {
      console.error(`[GET /api/parts/${req.params.partId}/compatible-equipment] Error:`, error);
      res.status(500).json({ message: "Failed to fetch compatible equipment" });
    }
  });

  // PATCH /api/parts/:partId/compatibility - Update part compatibility
  app.patch("/api/parts/:partId/compatibility", requireOrgIdAndValidateBody, writeOperationRateLimit, async (req, res) => {
    try {
      const orgId = (req as AuthenticatedRequest).orgId;
      const { equipmentIds } = req.body;
      
      if (!Array.isArray(equipmentIds)) {
        return res.status(400).json({ 
          message: "equipmentIds must be an array" 
        });
      }
      
      const part = await inventoryService.updateCompatibility(
        req.params.partId,
        equipmentIds,
        orgId,
        req.user?.id
      );
      res.json(part);
    } catch (error) {
      console.error(`[PATCH /api/parts/${req.params.partId}/compatibility] Error:`, error);
      res.status(500).json({ 
        message: "Failed to update part compatibility",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ========== Parts Inventory (CMMS-lite) Endpoints ==========

  // GET /api/parts-inventory - List all parts inventory
  app.get("/api/parts-inventory", requireOrgId, generalApiRateLimit, async (req, res) => {
    try {
      const orgId = (req as AuthenticatedRequest).orgId;
      const { category, search, sortBy, sortOrder } = req.query;
      
      const inventory = await inventoryService.listPartsInventory(
        category as string | undefined,
        orgId,
        search as string | undefined,
        sortBy as string | undefined,
        sortOrder as 'asc' | 'desc' | undefined
      );
      
      res.json(inventory);
    } catch (error) {
      console.error('[GET /api/parts-inventory] Error:', error);
      res.status(500).json({ message: "Failed to fetch parts inventory" });
    }
  });

  // POST /api/parts-inventory - Create new inventory item
  app.post("/api/parts-inventory", requireOrgIdAndValidateBody, writeOperationRateLimit, async (req, res) => {
    try {
      const orgId = (req as AuthenticatedRequest).orgId;
      
      // Validate request body
      const validationResult = insertPartsInventorySchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid parts inventory data",
          errors: validationResult.error.errors
        });
      }
      
      const item = await inventoryService.createInventoryItem(
        validationResult.data,
        req.user?.id
      );
      
      res.status(201).json(item);
    } catch (error) {
      console.error('[POST /api/parts-inventory] Error:', error);
      res.status(500).json({ 
        message: "Failed to create parts inventory item",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // PUT /api/parts-inventory/:id - Update inventory item
  app.put("/api/parts-inventory/:id", requireOrgIdAndValidateBody, writeOperationRateLimit, async (req, res) => {
    try {
      // Validate request body
      const validationResult = insertPartsInventorySchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid parts inventory data",
          errors: validationResult.error.errors
        });
      }
      
      const item = await inventoryService.updateInventoryItem(
        req.params.id,
        validationResult.data,
        req.user?.id
      );
      
      res.json(item);
    } catch (error) {
      console.error(`[PUT /api/parts-inventory/${req.params.id}] Error:`, error);
      
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      
      res.status(500).json({ 
        message: "Failed to update parts inventory item",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // PATCH /api/parts-inventory/:id/cost - Update part cost
  app.patch("/api/parts-inventory/:id/cost", requireOrgIdAndValidateBody, writeOperationRateLimit, async (req, res) => {
    try {
      const { unitCost, supplier } = req.body;
      
      if (unitCost === undefined || !supplier) {
        return res.status(400).json({ 
          message: "unitCost and supplier are required" 
        });
      }
      
      if (typeof unitCost !== 'number' || unitCost < 0) {
        return res.status(400).json({ 
          message: "unitCost must be a non-negative number" 
        });
      }
      
      const item = await inventoryService.updatePartCost(
        req.params.id,
        { unitCost, supplier },
        req.user?.id
      );
      
      res.json(item);
    } catch (error) {
      console.error(`[PATCH /api/parts-inventory/${req.params.id}/cost] Error:`, error);
      
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      
      res.status(500).json({ 
        message: "Failed to update part cost",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // PATCH /api/parts-inventory/:id/stock - Update part stock quantities
  app.patch("/api/parts-inventory/:id/stock", requireOrgIdAndValidateBody, writeOperationRateLimit, async (req, res) => {
    try {
      const { quantityOnHand, quantityReserved, minStockLevel, maxStockLevel } = req.body;
      
      // Build update data object
      const updateData: any = {};
      if (quantityOnHand !== undefined) updateData.quantityOnHand = quantityOnHand;
      if (quantityReserved !== undefined) updateData.quantityReserved = quantityReserved;
      if (minStockLevel !== undefined) updateData.minStockLevel = minStockLevel;
      if (maxStockLevel !== undefined) updateData.maxStockLevel = maxStockLevel;
      
      // Validate at least one field is provided
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ 
          message: "At least one stock field must be provided (quantityOnHand, quantityReserved, minStockLevel, maxStockLevel)" 
        });
      }
      
      // Validate numeric values
      for (const [key, value] of Object.entries(updateData)) {
        if (typeof value !== 'number' || value < 0) {
          return res.status(400).json({ 
            message: `${key} must be a non-negative number` 
          });
        }
      }
      
      const item = await inventoryService.updatePartStock(
        req.params.id,
        updateData,
        req.user?.id
      );
      
      res.json(item);
    } catch (error) {
      console.error(`[PATCH /api/parts-inventory/${req.params.id}/stock] Error:`, error);
      
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      
      res.status(500).json({ 
        message: "Failed to update part stock",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
}
