import { Router } from "express";
import { beastModeManager, type BeastModeFeature, DEFAULT_ORG_ID } from "./beast-mode-config.js";
import { vibrationAnalyzer } from "./vibration-analysis.js";
import { storage } from "./storage.js";
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

/**
 * POST /api/beast/vibration/analyze/:equipmentId - Trigger vibration analysis
 */
router.post("/vibration/analyze/:equipmentId", async (req, res) => {
  try {
    const { equipmentId } = req.params;
    const orgId = req.query.orgId as string || DEFAULT_ORG_ID;
    
    // Check if vibration analysis is enabled
    const isEnabled = await beastModeManager.isFeatureEnabled(orgId, 'vibration_analysis');
    if (!isEnabled) {
      return res.status(403).json({
        success: false,
        error: "Vibration analysis feature is disabled for this organization",
        feature: "vibration_analysis",
        enabled: false
      });
    }

    // Trigger vibration analysis
    const analysis = await vibrationAnalyzer.analyzeVibration(equipmentId, orgId);
    
    if (!analysis) {
      return res.status(400).json({
        success: false,
        error: "Unable to perform vibration analysis - insufficient data or system error",
        equipmentId
      });
    }

    res.json({
      success: true,
      equipmentId,
      analysis: {
        id: analysis.id,
        timestamp: analysis.timestamp,
        dominantFrequency: analysis.dominantFrequency,
        dominantMagnitude: analysis.dominantMagnitude,
        anomalyScore: analysis.anomalyScore,
        anomalyType: analysis.anomalyType,
        healthScore: analysis.healthScore,
        isAnomalous: analysis.isAnomalous,
        confidence: analysis.confidence
      },
      message: analysis.isAnomalous ? 
        `ANOMALY DETECTED: ${analysis.anomalyType} (score: ${analysis.anomalyScore.toFixed(2)})` :
        `Equipment operating normally (health score: ${analysis.healthScore}%)`
    });

  } catch (error) {
    console.error(`[Beast Mode API] Error analyzing vibration for ${req.params.equipmentId}:`, error);
    res.status(500).json({
      success: false,
      error: "Failed to perform vibration analysis",
      equipmentId: req.params.equipmentId
    });
  }
});

/**
 * GET /api/beast/vibration/history/:equipmentId - Get vibration analysis history
 */
router.get("/vibration/history/:equipmentId", async (req, res) => {
  try {
    const { equipmentId } = req.params;
    const orgId = req.query.orgId as string || DEFAULT_ORG_ID;
    const limit = parseInt(req.query.limit as string) || 50;
    
    // Check if vibration analysis is enabled
    const isEnabled = await beastModeManager.isFeatureEnabled(orgId, 'vibration_analysis');
    if (!isEnabled) {
      return res.status(403).json({
        success: false,
        error: "Vibration analysis feature is disabled for this organization",
        feature: "vibration_analysis",
        enabled: false
      });
    }

    const history = await vibrationAnalyzer.getAnalysisHistory(equipmentId, orgId, limit);

    res.json({
      success: true,
      equipmentId,
      orgId,
      count: history.length,
      history: history.map(analysis => ({
        id: analysis.id,
        timestamp: analysis.timestamp,
        dominantFrequency: analysis.dominantFrequency,
        dominantMagnitude: analysis.dominantMagnitude,
        anomalyScore: analysis.anomalyScore,
        anomalyType: analysis.anomalyType,
        healthScore: analysis.healthScore,
        isAnomalous: analysis.isAnomalous,
        confidence: analysis.confidence
      }))
    });

  } catch (error) {
    console.error(`[Beast Mode API] Error getting vibration history for ${req.params.equipmentId}:`, error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve vibration analysis history",
      equipmentId: req.params.equipmentId
    });
  }
});

/**
 * POST /api/beast/vibration/batch-analyze - Batch analyze multiple equipment units
 */
router.post("/vibration/batch-analyze", async (req, res) => {
  try {
    const orgId = req.query.orgId as string || DEFAULT_ORG_ID;
    const { equipmentIds } = req.body;
    
    if (!Array.isArray(equipmentIds) || equipmentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "equipmentIds must be a non-empty array"
      });
    }

    if (equipmentIds.length > 10) {
      return res.status(400).json({
        success: false,
        error: "Maximum 10 equipment units can be analyzed in a single batch"
      });
    }

    // Check if vibration analysis is enabled
    const isEnabled = await beastModeManager.isFeatureEnabled(orgId, 'vibration_analysis');
    if (!isEnabled) {
      return res.status(403).json({
        success: false,
        error: "Vibration analysis feature is disabled for this organization",
        feature: "vibration_analysis",
        enabled: false
      });
    }

    const results = await vibrationAnalyzer.batchAnalyze(equipmentIds, orgId);

    const summary = {
      total: equipmentIds.length,
      analyzed: results.length,
      anomalies: results.filter(r => r.isAnomalous).length,
      avgHealthScore: results.length > 0 ? 
        Math.round(results.reduce((sum, r) => sum + r.healthScore, 0) / results.length) : 0
    };

    res.json({
      success: true,
      orgId,
      summary,
      results: results.map(analysis => ({
        equipmentId: analysis.equipmentId,
        id: analysis.id,
        timestamp: analysis.timestamp,
        dominantFrequency: analysis.dominantFrequency,
        anomalyScore: analysis.anomalyScore,
        anomalyType: analysis.anomalyType,
        healthScore: analysis.healthScore,
        isAnomalous: analysis.isAnomalous,
        confidence: analysis.confidence
      }))
    });

  } catch (error) {
    console.error(`[Beast Mode API] Error in batch vibration analysis:`, error);
    res.status(500).json({
      success: false,
      error: "Failed to perform batch vibration analysis"
    });
  }
});

export { router as beastModeRouter };