import type { Express } from "express";
import { z } from "zod";
import { 
  insertAlertConfigSchema,
  insertAlertNotificationSchema,
  insertAlertCommentSchema,
  insertAlertSuppressionSchema
} from "@shared/schema";
import { alertsService } from "./service";

/**
 * Alerts Routes
 * Handles HTTP concerns for alerts domain (configurations, notifications, suppressions, comments)
 */
export function registerAlertsRoutes(
  app: Express,
  rateLimit: {
    writeOperationRateLimit: any;
    criticalOperationRateLimit: any;
    generalApiRateLimit: any;
  },
  wsServerInstance?: any
) {
  const { writeOperationRateLimit, criticalOperationRateLimit, generalApiRateLimit } = rateLimit;

  // ========== Alert Configurations ==========

  // GET /api/alerts/configurations
  app.get("/api/alerts/configurations", generalApiRateLimit, async (req, res) => {
    try {
      const { equipmentId } = req.query;
      const configurations = await alertsService.listConfigurations(equipmentId as string);
      res.json(configurations);
    } catch (error) {
      console.error('[GET /api/alerts/configurations] Error:', error);
      res.status(500).json({ message: "Failed to fetch alert configurations" });
    }
  });

  // POST /api/alerts/configurations
  app.post("/api/alerts/configurations", writeOperationRateLimit, async (req, res) => {
    try {
      const configData = insertAlertConfigSchema.parse(req.body);
      const configuration = await alertsService.createConfiguration(configData, req.user?.id);
      res.status(201).json(configuration);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid configuration data", 
          errors: error.errors 
        });
      }
      // Check for PostgreSQL unique constraint violation
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        return res.status(409).json({ 
          message: "An alert configuration already exists for this equipment and sensor type combination" 
        });
      }
      console.error('[POST /api/alerts/configurations] Error:', error);
      res.status(500).json({ 
        message: "Failed to create alert configuration",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // PUT /api/alerts/configurations/:id
  app.put("/api/alerts/configurations/:id", writeOperationRateLimit, async (req, res) => {
    try {
      const configData = insertAlertConfigSchema.partial().parse(req.body);
      const configuration = await alertsService.updateConfiguration(
        req.params.id,
        configData,
        req.user?.id
      );
      res.json(configuration);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid configuration data", 
          errors: error.errors 
        });
      }
      console.error(`[PUT /api/alerts/configurations/${req.params.id}] Error:`, error);
      res.status(500).json({ 
        message: "Failed to update alert configuration",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // DELETE /api/alerts/configurations/:id
  app.delete("/api/alerts/configurations/:id", criticalOperationRateLimit, async (req, res) => {
    try {
      await alertsService.deleteConfiguration(req.params.id, req.user?.id);
      res.status(204).send();
    } catch (error) {
      console.error(`[DELETE /api/alerts/configurations/${req.params.id}] Error:`, error);
      res.status(500).json({ 
        message: "Failed to delete alert configuration",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ========== Alert Notifications ==========

  // GET /api/alerts/notifications
  app.get("/api/alerts/notifications", generalApiRateLimit, async (req, res) => {
    try {
      const { acknowledged } = req.query;
      const ackParam = acknowledged === "true" ? true : acknowledged === "false" ? false : undefined;
      const notifications = await alertsService.listNotifications(ackParam);
      res.json(notifications);
    } catch (error) {
      console.error('[GET /api/alerts/notifications] Error:', error);
      res.status(500).json({ message: "Failed to fetch alert notifications" });
    }
  });

  // POST /api/alerts/notifications
  app.post("/api/alerts/notifications", writeOperationRateLimit, async (req, res) => {
    try {
      const notificationData = insertAlertNotificationSchema.parse(req.body);
      const notification = await alertsService.createNotification(
        notificationData,
        req.user?.id,
        wsServerInstance
      );
      res.status(201).json(notification);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid notification data", 
          errors: error.errors 
        });
      }
      console.error('[POST /api/alerts/notifications] Error:', error);
      res.status(500).json({ 
        message: "Failed to create alert notification",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // PATCH /api/alerts/notifications/:id/acknowledge
  app.patch("/api/alerts/notifications/:id/acknowledge", writeOperationRateLimit, async (req, res) => {
    try {
      const { acknowledgedBy } = req.body;
      if (!acknowledgedBy) {
        return res.status(400).json({ message: "acknowledgedBy is required" });
      }
      
      const notification = await alertsService.acknowledgeNotification(
        req.params.id,
        acknowledgedBy,
        req.user?.id,
        wsServerInstance
      );
      
      res.json(notification);
    } catch (error) {
      console.error(`[PATCH /api/alerts/notifications/${req.params.id}/acknowledge] Error:`, error);
      res.status(500).json({ 
        message: "Failed to acknowledge alert",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ========== Alert Comments ==========

  // POST /api/alerts/notifications/:id/comment
  app.post("/api/alerts/notifications/:id/comment", writeOperationRateLimit, async (req, res) => {
    try {
      const commentData = insertAlertCommentSchema.parse({
        alertId: req.params.id,
        comment: req.body.comment,
        commentedBy: req.body.commentedBy
      });
      
      const result = await alertsService.addComment(commentData, req.user?.id);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: error.errors 
        });
      }
      console.error(`[POST /api/alerts/notifications/${req.params.id}/comment] Error:`, error);
      res.status(500).json({ 
        message: "Failed to add comment",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // GET /api/alerts/notifications/:id/comments
  app.get("/api/alerts/notifications/:id/comments", generalApiRateLimit, async (req, res) => {
    try {
      const comments = await alertsService.getComments(req.params.id);
      res.json(comments);
    } catch (error) {
      console.error(`[GET /api/alerts/notifications/${req.params.id}/comments] Error:`, error);
      res.status(500).json({ 
        message: "Failed to get comments",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ========== Alert Suppressions ==========

  // POST /api/alerts/suppress
  app.post("/api/alerts/suppress", writeOperationRateLimit, async (req, res) => {
    try {
      const suppressionData = insertAlertSuppressionSchema.parse(req.body);
      const result = await alertsService.createSuppression(
        suppressionData,
        req.user?.id,
        wsServerInstance
      );
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: error.errors 
        });
      }
      console.error('[POST /api/alerts/suppress] Error:', error);
      res.status(500).json({ 
        message: "Failed to create alert suppression",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // GET /api/alerts/suppressions
  app.get("/api/alerts/suppressions", generalApiRateLimit, async (req, res) => {
    try {
      const suppressions = await alertsService.listSuppressions();
      res.json(suppressions);
    } catch (error) {
      console.error('[GET /api/alerts/suppressions] Error:', error);
      res.status(500).json({ 
        message: "Failed to get suppressions",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // DELETE /api/alerts/suppressions/:id
  app.delete("/api/alerts/suppressions/:id", criticalOperationRateLimit, async (req, res) => {
    try {
      await alertsService.deleteSuppression(req.params.id, req.user?.id);
      res.json({ message: "Suppression removed" });
    } catch (error) {
      console.error(`[DELETE /api/alerts/suppressions/${req.params.id}] Error:`, error);
      res.status(500).json({ 
        message: "Failed to remove suppression",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ========== Special Operations ==========

  // POST /api/alerts/notifications/:id/escalate - Escalate alert to work order
  app.post("/api/alerts/notifications/:id/escalate", writeOperationRateLimit, async (req, res) => {
    try {
      // Validate escalation input
      const escalationSchema = z.object({
        reason: z.string().optional(),
        priority: z.number().min(1).max(3).optional(),
        description: z.string().optional()
      });
      
      const escalationData = escalationSchema.parse(req.body);
      
      // Import storage to create work order
      const { storage } = await import('../../storage');
      
      // Create work order function to pass to service
      const createWorkOrderFn = async (data: any) => {
        const workOrder = await storage.createWorkOrder(data);
        
        // Broadcast work order creation if WebSocket is available
        if (wsServerInstance) {
          wsServerInstance.broadcastWorkOrderCreated(workOrder);
        }
        
        return workOrder;
      };
      
      const workOrder = await alertsService.escalateNotification(
        req.params.id,
        escalationData,
        createWorkOrderFn,
        req.user?.id
      );
      
      res.json(workOrder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: error.errors 
        });
      }
      if (error instanceof Error && error.message === "Alert not found") {
        return res.status(404).json({ message: error.message });
      }
      console.error(`[POST /api/alerts/notifications/${req.params.id}/escalate] Error:`, error);
      res.status(500).json({ 
        message: "Failed to escalate alert",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // DELETE /api/alerts/all - Clear all alerts and notifications
  app.delete("/api/alerts/all", criticalOperationRateLimit, async (req, res) => {
    try {
      await alertsService.deleteAllNotifications(req.user?.id, wsServerInstance);
      res.json({ message: "All alerts and notifications cleared successfully" });
    } catch (error) {
      console.error('[DELETE /api/alerts/all] Error:', error);
      res.status(500).json({ 
        message: "Failed to clear alerts",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
}
