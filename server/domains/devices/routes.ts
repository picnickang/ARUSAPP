import type { Express } from "express";
import { z } from "zod";
import { insertDeviceSchema } from "@shared/schema";
import { deviceService } from "./service";
import { safeDbOperation } from "../../error-handling";
import { requireOrgId, requireOrgIdAndValidateBody, AuthenticatedRequest } from "../../middleware/auth";

/**
 * Devices Routes
 * Handles HTTP concerns for devices domain
 */
export function registerDeviceRoutes(
  app: Express,
  rateLimit: {
    writeOperationRateLimit: any;
    criticalOperationRateLimit: any;
    generalApiRateLimit: any;
  }
) {
  const { writeOperationRateLimit, criticalOperationRateLimit, generalApiRateLimit } = rateLimit;

  // GET /api/devices
  app.get("/api/devices", requireOrgId, generalApiRateLimit, async (req, res) => {
    try {
      const orgId = (req as AuthenticatedRequest).orgId;
      
      // Enhanced error handling with proper graceful degradation
      const devices = await safeDbOperation(
        () => deviceService.getDevicesWithStatus(orgId),
        'getDevicesWithStatus',
        { defaultValue: [] }
      );
      
      res.json(devices);
    } catch (error) {
      console.error('[GET /api/devices] Error:', error);
      res.status(500).json({ message: "Failed to fetch devices" });
    }
  });

  // GET /api/devices/:id
  app.get("/api/devices/:id", requireOrgId, generalApiRateLimit, async (req, res) => {
    try {
      const orgId = (req as AuthenticatedRequest).orgId;
      const device = await deviceService.getDeviceById(req.params.id, orgId);
      
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      res.json(device);
    } catch (error) {
      console.error(`[GET /api/devices/${req.params.id}] Error:`, error);
      res.status(500).json({ message: "Failed to fetch device" });
    }
  });

  // POST /api/devices
  app.post("/api/devices", requireOrgIdAndValidateBody, writeOperationRateLimit, async (req, res) => {
    try {
      const deviceData = insertDeviceSchema.parse(req.body);
      const device = await deviceService.createDevice(deviceData, req.user?.id);
      
      res.status(201).json(device);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid device data", 
          errors: error.errors 
        });
      }
      console.error('[POST /api/devices] Error:', error);
      res.status(500).json({ 
        message: "Failed to create device",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // PUT /api/devices/:id
  app.put("/api/devices/:id", requireOrgIdAndValidateBody, writeOperationRateLimit, async (req, res) => {
    try {
      const deviceData = insertDeviceSchema.partial().parse(req.body);
      const device = await deviceService.updateDevice(
        req.params.id, 
        deviceData,
        req.user?.id
      );
      
      res.json(device);
    } catch (error) {
      console.error(`[PUT /api/devices/${req.params.id}] Error:`, error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid device data", 
          errors: error.errors 
        });
      }
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update device" });
    }
  });

  // DELETE /api/devices/:id
  app.delete("/api/devices/:id", requireOrgId, criticalOperationRateLimit, async (req, res) => {
    try {
      const orgId = (req as AuthenticatedRequest).orgId;
      await deviceService.deleteDevice(req.params.id, orgId, req.user?.id);
      
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      console.error(`[DELETE /api/devices/${req.params.id}] Error:`, error);
      res.status(500).json({ 
        message: "Failed to delete device",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
}
