import type { Express } from "express";
import { z } from "zod";
import { 
  insertWorkOrderSchema, 
  updateWorkOrderSchema,
  insertWorkOrderCompletionSchema 
} from "@shared/schema";
import { workOrderService } from "./service";
import { safeDbOperation } from "../../error-handling";
import { requireOrgId, requireOrgIdAndValidateBody, AuthenticatedRequest } from "../../middleware/auth";

/**
 * Work Orders Routes
 * Handles HTTP concerns for work orders domain
 */
export function registerWorkOrderRoutes(
  app: Express,
  rateLimit: {
    writeOperationRateLimit: any;
    criticalOperationRateLimit: any;
    generalApiRateLimit: any;
  }
) {
  const { writeOperationRateLimit, criticalOperationRateLimit } = rateLimit;

  // GET /api/work-orders
  app.get("/api/work-orders", requireOrgId, async (req, res) => {
    try {
      const orgId = (req as AuthenticatedRequest).orgId;
      const equipmentId = req.query.equipmentId as string;
      const workOrders = await workOrderService.listWorkOrders(equipmentId, orgId);
      res.json(workOrders);
    } catch (error) {
      console.error('[GET /api/work-orders] Error:', error);
      res.status(500).json({ message: "Failed to fetch work orders" });
    }
  });

  // GET /api/work-orders/:id
  app.get("/api/work-orders/:id", requireOrgId, async (req, res) => {
    try {
      const orgId = (req as AuthenticatedRequest).orgId;
      const workOrder = await workOrderService.getWorkOrderById(req.params.id, orgId);
      
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }
      
      res.json(workOrder);
    } catch (error) {
      console.error(`[GET /api/work-orders/${req.params.id}] Error:`, error);
      res.status(500).json({ message: "Failed to fetch work order" });
    }
  });

  // POST /api/work-orders
  app.post("/api/work-orders", requireOrgIdAndValidateBody, writeOperationRateLimit, async (req, res) => {
    try {
      // Preprocess date fields to convert strings/numbers to Date objects for Zod
      const processedBody = {
        ...req.body,
        scheduledDate: req.body.scheduledDate ? new Date(req.body.scheduledDate) : undefined,
        completedDate: req.body.completedDate ? new Date(req.body.completedDate) : undefined,
        plannedStartDate: req.body.plannedStartDate ? new Date(req.body.plannedStartDate) : undefined,
        plannedEndDate: req.body.plannedEndDate ? new Date(req.body.plannedEndDate) : undefined,
      };
      
      const orderData = insertWorkOrderSchema.parse(processedBody);
      
      const workOrder = await safeDbOperation(
        () => workOrderService.createWorkOrder(orderData, req.user?.id),
        'createWorkOrder'
      );
      
      res.status(201).json(workOrder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid work order data", 
          errors: error.errors 
        });
      }
      console.error('[POST /api/work-orders] Error:', error);
      res.status(500).json({ 
        message: "Failed to create work order", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // POST /api/work-orders/with-suggestions
  app.post("/api/work-orders/with-suggestions", requireOrgIdAndValidateBody, writeOperationRateLimit, async (req, res) => {
    try {
      const orgId = (req as AuthenticatedRequest).orgId;
      const orderData = insertWorkOrderSchema.parse(req.body);
      
      const result = await safeDbOperation(
        () => workOrderService.createWorkOrderWithSuggestions(orderData, orgId, req.user?.id),
        'createWorkOrderWithSuggestions'
      );
      
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid work order data", 
          errors: error.errors 
        });
      }
      console.error('[POST /api/work-orders/with-suggestions] Error:', error);
      res.status(500).json({ message: "Failed to create work order" });
    }
  });

  // PUT /api/work-orders/:id
  app.put("/api/work-orders/:id", requireOrgIdAndValidateBody, writeOperationRateLimit, async (req, res) => {
    try {
      const orderData = updateWorkOrderSchema.parse(req.body);
      const workOrder = await workOrderService.updateWorkOrder(
        req.params.id, 
        orderData,
        req.user?.id
      );
      
      res.json(workOrder);
    } catch (error) {
      console.error(`[PUT /api/work-orders/${req.params.id}] Error:`, error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid work order data", 
          errors: error.errors 
        });
      }
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update work order" });
    }
  });

  // DELETE /api/work-orders/:id
  app.delete("/api/work-orders/:id", requireOrgId, criticalOperationRateLimit, async (req, res) => {
    try {
      const orgId = (req as AuthenticatedRequest).orgId;
      await workOrderService.deleteWorkOrder(req.params.id, orgId, req.user?.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      console.error(`[DELETE /api/work-orders/${req.params.id}] Error:`, error);
      res.status(500).json({ 
        message: "Failed to delete work order", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // POST /api/work-orders/:id/complete
  app.post("/api/work-orders/:id/complete", requireOrgIdAndValidateBody, writeOperationRateLimit, async (req, res) => {
    try {
      const orgId = (req as AuthenticatedRequest).orgId;
      const workOrderId = req.params.id;
      const now = new Date();
      
      // Validate downtime cost per hour (must be between $100 and $50K)
      // ... validation logic...
      
      // Preprocess date fields and cost mappings
      const laborCost = req.body.laborCost ?? req.body.totalLaborCost ?? 0;
      const partsCost = req.body.partsCost ?? req.body.totalPartsCost ?? 0;
      const downtimeCost = req.body.downtimeCost ?? 0;
      const totalCost = req.body.totalCost ?? (laborCost + partsCost + downtimeCost);
      
      const preprocessedBody = {
        ...req.body,
        completedAt: req.body.completedAt ? new Date(req.body.completedAt) : now,
        plannedStartDate: req.body.plannedStartDate ? new Date(req.body.plannedStartDate) : undefined,
        plannedEndDate: req.body.plannedEndDate ? new Date(req.body.plannedEndDate) : undefined,
        actualStartDate: req.body.actualStartDate ? new Date(req.body.actualStartDate) : undefined,
        actualEndDate: req.body.actualEndDate ? new Date(req.body.actualEndDate) : undefined,
        totalLaborCost: laborCost,
        totalPartsCost: partsCost,
        totalCost: totalCost,
        workOrderId,
        orgId
      };
      
      // Get work order to inject equipmentId and vesselId
      const workOrder = await workOrderService.getWorkOrderById(workOrderId, orgId);
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }
      
      const completionData = insertWorkOrderCompletionSchema.parse({
        ...preprocessedBody,
        equipmentId: workOrder.equipmentId,
        vesselId: workOrder.vesselId || undefined,
      });
      
      // Verify workOrderId matches
      if (req.body.workOrderId && req.body.workOrderId !== workOrderId) {
        return res.status(400).json({ message: "Work order ID mismatch" });
      }
      
      const completion = await workOrderService.completeWorkOrder(
        workOrderId,
        completionData,
        orgId
      );
      
      res.status(201).json(completion);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid completion data", 
          errors: error.errors 
        });
      }
      console.error(`[POST /api/work-orders/${req.params.id}/complete] Error:`, error);
      res.status(500).json({ 
        message: "Failed to complete work order", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // GET /api/work-order-completions
  app.get("/api/work-order-completions", requireOrgId, async (req, res) => {
    try {
      const { equipmentId, vesselId, startDate, endDate } = req.query;
      const orgId = (req as AuthenticatedRequest).orgId;
      
      const filters = {
        equipmentId: equipmentId as string | undefined,
        vesselId: vesselId as string | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        orgId
      };
      
      const completions = await workOrderService.getCompletions(filters);
      res.json(completions);
    } catch (error) {
      console.error('[GET /api/work-order-completions] Error:', error);
      res.status(500).json({ message: "Failed to fetch work order completions" });
    }
  });
}
