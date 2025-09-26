import { Router } from "express";
import { beastModeManager, type BeastModeFeature, DEFAULT_ORG_ID } from "./beast-mode-config.js";
import { z } from "zod";

/**
 * Beast Mode API Routes - Phase 1 Feature Flag Management
 * All features are disabled by default for safety
 */

const router = Router();

// Schema for feature toggle request
const toggleFeatureSchema = z.object({
  feature: z.enum(['vibration_analysis', 'weibull_rul', 'lp_optimizer', 'enhanced_trends', 'inventory_risk', 'compliance_pdf']),
  enabled: z.boolean(),
  configuration: z.any().optional(),
});

/**
 * GET /api/beast/config - Get all Beast Mode feature configurations
 */
router.get("/config", async (req, res) => {
  try {
    const orgId = req.query.orgId as string || DEFAULT_ORG_ID;
    const configs = await beastModeManager.getAllFeatureConfigs(orgId);
    
    res.json({
      success: true,
      orgId,
      features: configs,
      message: "Beast Mode features are disabled by default for safety",
    });
  } catch (error) {
    console.error("[Beast Mode API] Error getting configs:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve Beast Mode configurations",
    });
  }
});

/**
 * GET /api/beast/config/:feature - Get specific feature configuration
 */
router.get("/config/:feature", async (req, res) => {
  try {
    const { feature } = req.params;
    const orgId = req.query.orgId as string || DEFAULT_ORG_ID;
    
    // Validate feature name
    if (!isValidBeastModeFeature(feature)) {
      return res.status(400).json({
        success: false,
        error: `Invalid feature name: ${feature}`,
        validFeatures: ['vibration_analysis', 'weibull_rul', 'lp_optimizer', 'enhanced_trends', 'inventory_risk', 'compliance_pdf'],
      });
    }

    const config = await beastModeManager.getFeatureConfig(orgId, feature);
    
    res.json({
      success: true,
      feature,
      config,
      orgId,
    });
  } catch (error) {
    console.error(`[Beast Mode API] Error getting config for ${req.params.feature}:`, error);
    res.status(500).json({
      success: false,
      error: `Failed to retrieve configuration for ${req.params.feature}`,
    });
  }
});

/**
 * POST /api/beast/config/:feature/toggle - Enable/disable a Beast Mode feature
 * CAUTION: Only for development/testing. Production deployments should use environment-based config.
 */
router.post("/config/:feature/toggle", async (req, res) => {
  try {
    const { feature } = req.params;
    const orgId = req.query.orgId as string || DEFAULT_ORG_ID;
    
    // Validate feature name
    if (!isValidBeastModeFeature(feature)) {
      return res.status(400).json({
        success: false,
        error: `Invalid feature name: ${feature}`,
        validFeatures: ['vibration_analysis', 'weibull_rul', 'lp_optimizer', 'enhanced_trends', 'inventory_risk', 'compliance_pdf'],
      });
    }

    // Validate request body
    const validation = toggleFeatureSchema.safeParse({ ...req.body, feature });
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid request body",
        details: validation.error.format(),
      });
    }

    const { enabled, configuration } = validation.data;
    const lastModifiedBy = req.headers['x-user-id'] as string || 'api';

    let result: boolean;
    if (enabled) {
      result = await beastModeManager.enableFeature(orgId, feature, configuration, lastModifiedBy);
    } else {
      result = await beastModeManager.disableFeature(orgId, feature, lastModifiedBy);
    }

    if (result) {
      res.json({
        success: true,
        feature,
        enabled,
        orgId,
        message: `Feature ${feature} ${enabled ? 'enabled' : 'disabled'} successfully`,
      });
    } else {
      res.status(500).json({
        success: false,
        error: `Failed to ${enabled ? 'enable' : 'disable'} feature ${feature}`,
      });
    }
  } catch (error) {
    console.error(`[Beast Mode API] Error toggling ${req.params.feature}:`, error);
    res.status(500).json({
      success: false,
      error: `Failed to toggle feature ${req.params.feature}`,
    });
  }
});

/**
 * GET /api/beast/health - Beast Mode system health check
 */
router.get("/health", async (req, res) => {
  try {
    const orgId = req.query.orgId as string || DEFAULT_ORG_ID;
    
    // Test database connectivity
    const configs = await beastModeManager.getAllFeatureConfigs(orgId);
    const enabledFeatures = Object.entries(configs).filter(([_, config]) => config.enabled).map(([feature, _]) => feature);
    
    res.json({
      success: true,
      status: "Beast Mode system operational",
      database: "connected",
      totalFeatures: 6,
      enabledFeatures: enabledFeatures.length,
      enabledList: enabledFeatures,
      orgId,
      phase: "Phase 1 - Safe Enablement Complete",
    });
  } catch (error) {
    console.error("[Beast Mode API] Health check failed:", error);
    res.status(500).json({
      success: false,
      status: "Beast Mode system error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Helper function to validate Beast Mode feature names
function isValidBeastModeFeature(feature: string): feature is BeastModeFeature {
  return ['vibration_analysis', 'weibull_rul', 'lp_optimizer', 'enhanced_trends', 'inventory_risk', 'compliance_pdf']
    .includes(feature);
}

export { router as beastModeRouter };