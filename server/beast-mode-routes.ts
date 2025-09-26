import { Router } from "express";
import { beastModeManager, type BeastModeFeature, DEFAULT_ORG_ID } from "./beast-mode-config.js";
import { vibrationAnalyzer } from "./vibration-analysis.js";
import { WeibullRULAnalyzer } from "./weibull-rul.js";
import { LinearProgrammingOptimizer } from "./lp-optimizer.js";
import { enhancedTrendsAnalyzer } from "./enhanced-trends.js";
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

/**
 * LP Optimizer - Maintenance scheduling optimization
 * POST /api/beast/lp/optimize - Run maintenance optimization
 * GET /api/beast/lp/results/:resultId - Get optimization results
 */

router.post("/lp/optimize", async (req, res) => {
  try {
    // Check if LP optimizer is enabled
    const orgId = req.query.orgId as string || DEFAULT_ORG_ID;
    const config = await beastModeManager.getFeatureConfig(orgId, 'lp_optimizer');
    
    if (!config.enabled) {
      return res.status(403).json({
        success: false,
        error: "LP Optimizer feature is not enabled for this organization",
        feature: 'lp_optimizer',
      });
    }

    console.log(`[Beast Mode API] Starting LP optimization for org ${orgId}`);

    // Validate request body
    const optimizationConstraintsSchema = z.object({
      maxDailyWorkHours: z.number().min(1).max(24).default(8),
      maxConcurrentJobs: z.number().min(1).max(10).default(3),
      crewAvailability: z.array(z.object({
        crewMember: z.string(),
        availableDays: z.array(z.string()),
        maxHoursPerDay: z.number().min(1).max(16),
        skillLevel: z.number().min(1).max(5),
        hourlyRate: z.number().min(10).max(200)
      })),
      partsBudget: z.number().min(100).max(100000).default(5000),
      timeHorizonDays: z.number().min(1).max(90).default(14),
      priorityWeights: z.object({
        critical: z.number().default(100),
        high: z.number().default(50),
        medium: z.number().default(20),
        low: z.number().default(10)
      }).default({
        critical: 100,
        high: 50,
        medium: 20,
        low: 10
      })
    });

    const constraints = optimizationConstraintsSchema.parse(req.body);

    // Run optimization
    const optimizer = new LinearProgrammingOptimizer(orgId);
    const result = await optimizer.optimizeMaintenanceSchedule(constraints);

    res.json({
      success: result.success,
      optimizationId: result.optimizationId, // FIXED: Use real ID from result
      result,
      message: `Optimization completed in ${result.optimizationTime}ms - ${result.schedule.length} jobs scheduled`,
    });

  } catch (error) {
    console.error("[Beast Mode API] Error running LP optimization:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to run maintenance optimization",
    });
  }
});

router.get("/lp/results/:resultId", async (req, res) => {
  try {
    const { resultId } = req.params;
    const orgId = req.query.orgId as string || DEFAULT_ORG_ID;

    // Check if LP optimizer is enabled
    const config = await beastModeManager.getFeatureConfig(orgId, 'lp_optimizer');
    
    if (!config.enabled) {
      return res.status(403).json({
        success: false,
        error: "LP Optimizer feature is not enabled for this organization",
      });
    }

    console.log(`[Beast Mode API] Retrieving optimization result ${resultId} for org ${orgId}`);

    // FIXED: Use real database retrieval instead of TODO stub
    const optimizer = new LinearProgrammingOptimizer(orgId);
    const optimizationData = await optimizer.getOptimizationResults(resultId);

    res.json({
      success: true,
      resultId,
      data: optimizationData,
      message: `Retrieved optimization with ${optimizationData.totalSchedules} scheduled jobs, score: ${optimizationData.optimizationScore}/100`
    });

  } catch (error) {
    console.error(`[Beast Mode API] Error retrieving optimization result ${req.params.resultId}:`, error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: `Optimization result ${req.params.resultId} not found`,
        resultId: req.params.resultId
      });
    }
    
    res.status(500).json({
      success: false,
      error: "Failed to retrieve optimization results",
      resultId: req.params.resultId
    });
  }
});

/**
 * POST /api/beast/weibull/analyze/:equipmentId - Trigger Weibull RUL analysis
 */
router.post("/weibull/analyze/:equipmentId", async (req, res) => {
  try {
    const { equipmentId } = req.params;
    const orgId = req.query.orgId as string || DEFAULT_ORG_ID;
    
    // Check if weibull_rul is enabled
    const isEnabled = await beastModeManager.isFeatureEnabled(orgId, 'weibull_rul');
    if (!isEnabled) {
      return res.status(403).json({
        success: false,
        error: "Weibull RUL analysis feature is disabled for this organization",
        feature: "weibull_rul",
        enabled: false
      });
    }

    const analyzer = new WeibullRULAnalyzer();
    const prediction = await analyzer.analyzeEquipmentRUL(equipmentId, orgId);
    
    res.json({
      success: true,
      prediction: {
        equipmentId: prediction.equipmentId,
        currentAge: prediction.currentAge,
        predictedRUL: prediction.predictedRUL,
        reliability: prediction.reliability,
        recommendation: prediction.maintenanceRecommendation,
        confidenceInterval: prediction.confidenceInterval,
        failureProbability: prediction.failureProbability,
        weibullParams: prediction.weibullParams
      },
      message: `RUL analysis: ${Math.round(prediction.predictedRUL)}h remaining, ${(prediction.reliability*100).toFixed(1)}% reliable, ${prediction.maintenanceRecommendation} maintenance`
    });

  } catch (error: any) {
    console.error(`[Beast Mode API] Error analyzing RUL for ${req.params.equipmentId}:`, error);
    res.status(400).json({
      success: false,
      error: error.message,
      equipmentId: req.params.equipmentId
    });
  }
});

/**
 * GET /api/beast/weibull/history/:equipmentId - Get Weibull RUL history
 */
router.get("/weibull/history/:equipmentId", async (req, res) => {
  try {
    const { equipmentId } = req.params;
    const orgId = req.query.orgId as string || DEFAULT_ORG_ID;
    const limit = parseInt(req.query.limit as string) || 50;
    
    // Check if weibull_rul is enabled
    const isEnabled = await beastModeManager.isFeatureEnabled(orgId, 'weibull_rul');
    if (!isEnabled) {
      return res.status(403).json({
        success: false,
        error: "Weibull RUL analysis feature is disabled for this organization",
        feature: "weibull_rul",
        enabled: false
      });
    }

    const analyzer = new WeibullRULAnalyzer();
    const history = await analyzer.getRULHistory(equipmentId, orgId, limit);

    res.json({
      success: true,
      equipmentId,
      orgId,
      count: history.length,
      history: history.map(analysis => ({
        id: analysis.id,
        analysisTimestamp: analysis.createdAt,
        currentAge: analysis.currentAgeDays,
        predictedRUL: analysis.predictedRUL,
        reliability: analysis.reliability,
        recommendation: analysis.recommendation,
        weibullShape: analysis.weibullShape,
        weibullScale: analysis.weibullScale,
        failureProb30d: analysis.failureProb30d,
        failureProb90d: analysis.failureProb90d,
        failureProb365d: analysis.failureProb365d
      }))
    });

  } catch (error: any) {
    console.error(`[Beast Mode API] Error getting RUL history for ${req.params.equipmentId}:`, error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve Weibull RUL analysis history",
      equipmentId: req.params.equipmentId
    });
  }
});

/**
 * POST /api/beast/weibull/batch-analyze - Batch analyze multiple equipment units for RUL
 */
router.post("/weibull/batch-analyze", async (req, res) => {
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

    // Check if weibull_rul is enabled
    const isEnabled = await beastModeManager.isFeatureEnabled(orgId, 'weibull_rul');
    if (!isEnabled) {
      return res.status(403).json({
        success: false,
        error: "Weibull RUL analysis feature is disabled for this organization",
        feature: "weibull_rul",
        enabled: false
      });
    }

    const analyzer = new WeibullRULAnalyzer();
    const results = await analyzer.batchAnalyzeRUL(equipmentIds, orgId);

    const summary = {
      total: equipmentIds.length,
      successful: results.success.length,
      failed: results.failed.length,
      avgRUL: results.success.length > 0 ? 
        Math.round(results.success.reduce((sum, r) => sum + r.predictedRUL, 0) / results.success.length) : 0,
      avgReliability: results.success.length > 0 ? 
        Math.round((results.success.reduce((sum, r) => sum + r.reliability, 0) / results.success.length) * 100) : 0,
      immediateAction: results.success.filter(r => r.maintenanceRecommendation === 'immediate').length,
      urgentAction: results.success.filter(r => r.maintenanceRecommendation === 'urgent').length
    };

    res.json({
      success: true,
      orgId,
      summary,
      results: results.success.map(prediction => ({
        equipmentId: prediction.equipmentId,
        currentAge: prediction.currentAge,
        predictedRUL: prediction.predictedRUL,
        reliability: prediction.reliability,
        recommendation: prediction.maintenanceRecommendation,
        failureProb30d: prediction.failureProbability.next30days,
        failureProb90d: prediction.failureProbability.next90days
      })),
      failed: results.failed
    });

  } catch (error: any) {
    console.error(`[Beast Mode API] Error in batch Weibull RUL analysis:`, error);
    res.status(500).json({
      success: false,
      error: "Failed to perform batch Weibull RUL analysis"
    });
  }
});

/**
 * ==============================================
 * ENHANCED TRENDS POD ROUTES
 * ==============================================
 */

/**
 * POST /api/beast/trends/analyze/:equipmentId/:sensorType - Analyze equipment sensor trends
 */
router.post("/trends/analyze/:equipmentId/:sensorType", async (req, res) => {
  try {
    const orgId = req.query.orgId as string || DEFAULT_ORG_ID;
    const { equipmentId, sensorType } = req.params;
    const { hours = 168 } = req.body; // Default 7 days

    // Validate hours parameter
    if (typeof hours !== 'number' || hours < 1 || hours > 8760) { // Max 1 year
      return res.status(400).json({
        success: false,
        error: "Hours must be between 1 and 8760"
      });
    }

    // Check if enhanced_trends is enabled
    const isEnabled = await beastModeManager.isFeatureEnabled(orgId, 'enhanced_trends');
    if (!isEnabled) {
      return res.status(403).json({
        success: false,
        error: "Enhanced trends analysis feature is disabled for this organization",
        feature: "enhanced_trends",
        enabled: false
      });
    }

    console.log(`[Beast Mode API] Enhanced trends analysis for ${equipmentId}:${sensorType} over ${hours}h`);

    const analysis = await enhancedTrendsAnalyzer.analyzeEquipmentTrends(
      orgId,
      equipmentId,
      sensorType,
      hours
    );

    // Store analysis results in database
    await storage.storeAnalysisResult({
      orgId,
      equipmentId,
      analysisType: 'enhanced_trends',
      results: analysis,
      metadata: {
        sensorType,
        timeRangeHours: hours,
        timestamp: new Date()
      }
    });

    res.json({
      success: true,
      equipmentId,
      sensorType,
      orgId,
      timeRange: analysis.timeRange,
      analysis: {
        statisticalSummary: {
          count: analysis.statisticalSummary.count,
          mean: analysis.statisticalSummary.mean,
          standardDeviation: analysis.statisticalSummary.standardDeviation,
          trend: analysis.statisticalSummary.trend,
          distribution: analysis.statisticalSummary.distribution
        },
        anomalyDetection: {
          method: analysis.anomalyDetection.method,
          totalAnomalies: analysis.anomalyDetection.summary.totalAnomalies,
          anomalyRate: analysis.anomalyDetection.summary.anomalyRate,
          severity: analysis.anomalyDetection.summary.severity,
          recommendation: analysis.anomalyDetection.summary.recommendation,
          recentAnomalies: analysis.anomalyDetection.anomalies.slice(-5) // Last 5 anomalies
        },
        forecasting: {
          method: analysis.forecasting.method,
          confidence: analysis.forecasting.confidence,
          horizon: analysis.forecasting.horizon,
          nextValues: analysis.forecasting.predictions.slice(0, 24), // Next 24 hours
          recommendation: analysis.forecasting.recommendation
        },
        seasonality: analysis.seasonality,
        correlations: analysis.correlations.slice(0, 5) // Top 5 correlations
      },
      message: "Enhanced trends analysis completed successfully"
    });

  } catch (error: any) {
    console.error(`[Beast Mode API] Error in enhanced trends analysis:`, error);
    
    if (error.message && error.message.includes('Insufficient data')) {
      return res.status(400).json({
        success: false,
        error: error.message,
        hint: "Equipment needs at least 10 telemetry data points for statistical analysis"
      });
    }
    
    res.status(500).json({
      success: false,
      error: "Failed to perform enhanced trends analysis"
    });
  }
});

/**
 * POST /api/beast/trends/fleet-analyze - Analyze fleet-wide trends
 */
router.post("/trends/fleet-analyze", async (req, res) => {
  try {
    const orgId = req.query.orgId as string || DEFAULT_ORG_ID;
    const { equipmentIds, hours = 168 } = req.body;

    // Validate equipment IDs
    if (!Array.isArray(equipmentIds) || equipmentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "equipmentIds must be a non-empty array"
      });
    }

    if (equipmentIds.length > 20) { // Fleet analysis limit
      return res.status(400).json({
        success: false,
        error: "Maximum 20 equipment units can be analyzed in fleet analysis"
      });
    }

    // Validate hours parameter
    if (typeof hours !== 'number' || hours < 1 || hours > 8760) {
      return res.status(400).json({
        success: false,
        error: "Hours must be between 1 and 8760"
      });
    }

    // Check if enhanced_trends is enabled
    const isEnabled = await beastModeManager.isFeatureEnabled(orgId, 'enhanced_trends');
    if (!isEnabled) {
      return res.status(403).json({
        success: false,
        error: "Enhanced trends analysis feature is disabled for this organization",
        feature: "enhanced_trends",
        enabled: false
      });
    }

    console.log(`[Beast Mode API] Fleet trends analysis for ${equipmentIds.length} units over ${hours}h`);

    const fleetAnalysis = await enhancedTrendsAnalyzer.analyzeFleetTrends(
      orgId,
      equipmentIds,
      hours
    );

    // Store fleet analysis results
    await storage.storeAnalysisResult({
      orgId,
      equipmentId: 'fleet-analysis',
      analysisType: 'enhanced_trends_fleet',
      results: fleetAnalysis,
      metadata: {
        equipmentCount: equipmentIds.length,
        timeRangeHours: hours,
        timestamp: new Date()
      }
    });

    res.json({
      success: true,
      fleetId: fleetAnalysis.fleetId,
      equipmentCount: fleetAnalysis.equipmentCount,
      orgId,
      timeRange: fleetAnalysis.timeRange,
      analysis: {
        aggregatedMetrics: fleetAnalysis.aggregatedMetrics,
        equipmentRankings: fleetAnalysis.equipmentRankings.slice(0, 10), // Top 10 by risk
        recommendations: fleetAnalysis.recommendations,
        sensorTypes: fleetAnalysis.sensorTypes
      },
      message: "Fleet trends analysis completed successfully"
    });

  } catch (error: any) {
    console.error(`[Beast Mode API] Error in fleet trends analysis:`, error);
    res.status(500).json({
      success: false,
      error: "Failed to perform fleet trends analysis"
    });
  }
});

/**
 * GET /api/beast/trends/correlations/:equipmentId - Get cross-sensor correlations
 */
router.get("/trends/correlations/:equipmentId", async (req, res) => {
  try {
    const orgId = req.query.orgId as string || DEFAULT_ORG_ID;
    const { equipmentId } = req.params;
    const hours = parseInt(req.query.hours as string) || 168;
    const minCorrelation = parseFloat(req.query.minCorrelation as string) || 0.3;

    // Validate parameters
    if (hours < 1 || hours > 8760) {
      return res.status(400).json({
        success: false,
        error: "Hours must be between 1 and 8760"
      });
    }

    if (minCorrelation < 0 || minCorrelation > 1) {
      return res.status(400).json({
        success: false,
        error: "minCorrelation must be between 0 and 1"
      });
    }

    // Check if enhanced_trends is enabled
    const isEnabled = await beastModeManager.isFeatureEnabled(orgId, 'enhanced_trends');
    if (!isEnabled) {
      return res.status(403).json({
        success: false,
        error: "Enhanced trends analysis feature is disabled for this organization",
        feature: "enhanced_trends",
        enabled: false
      });
    }

    // Get equipment sensor types with proper org scoping
    const sensorTypes = await storage.getEquipmentSensorTypes(orgId, equipmentId);
    if (sensorTypes.length < 2) {
      return res.status(400).json({
        success: false,
        error: "Equipment must have at least 2 sensor types for correlation analysis",
        availableSensors: sensorTypes
      });
    }

    console.log(`[Beast Mode API] Correlation analysis for ${equipmentId} with ${sensorTypes.length} sensors`);

    // Analyze correlations for the primary sensor (first one)
    const primarySensor = sensorTypes[0];
    const correlations = await enhancedTrendsAnalyzer.analyzeCorrelations(
      orgId,
      equipmentId,
      primarySensor,
      hours
    );

    // Filter by minimum correlation strength
    const significantCorrelations = correlations.filter(c => 
      Math.abs(c.correlation) >= minCorrelation
    );

    res.json({
      success: true,
      equipmentId,
      primarySensor,
      orgId,
      timeRangeHours: hours,
      minCorrelationThreshold: minCorrelation,
      correlations: significantCorrelations.map(corr => ({
        targetSensor: corr.targetSensor,
        correlatedSensor: corr.correlatedSensor,
        correlation: corr.correlation,
        strength: corr.strength,
        relationship: corr.relationship,
        lagHours: corr.lagHours,
        causality: corr.causality,
        significance: corr.significance
      })),
      summary: {
        totalCorrelations: correlations.length,
        significantCorrelations: significantCorrelations.length,
        strongCorrelations: significantCorrelations.filter(c => c.strength === 'strong' || c.strength === 'very_strong').length,
        leadingIndicators: significantCorrelations.filter(c => c.lagHours > 0).length,
        laggingIndicators: significantCorrelations.filter(c => c.lagHours < 0).length
      },
      message: "Cross-sensor correlation analysis completed successfully"
    });

  } catch (error: any) {
    console.error(`[Beast Mode API] Error in correlation analysis:`, error);
    res.status(500).json({
      success: false,
      error: "Failed to perform correlation analysis"
    });
  }
});

/**
 * GET /api/beast/trends/forecast/:equipmentId/:sensorType - Get sensor value forecasting
 */
router.get("/trends/forecast/:equipmentId/:sensorType", async (req, res) => {
  try {
    const orgId = req.query.orgId as string || DEFAULT_ORG_ID;
    const { equipmentId, sensorType } = req.params;
    const hours = parseInt(req.query.hours as string) || 168; // Historical data range
    const forecastHours = parseInt(req.query.forecastHours as string) || 24; // Forecast horizon

    // Validate parameters
    if (hours < 24 || hours > 8760) {
      return res.status(400).json({
        success: false,
        error: "Historical hours must be between 24 and 8760"
      });
    }

    if (forecastHours < 1 || forecastHours > 168) { // Max 1 week forecast
      return res.status(400).json({
        success: false,
        error: "Forecast hours must be between 1 and 168"
      });
    }

    // Check if enhanced_trends is enabled
    const isEnabled = await beastModeManager.isFeatureEnabled(orgId, 'enhanced_trends');
    if (!isEnabled) {
      return res.status(403).json({
        success: false,
        error: "Enhanced trends analysis feature is disabled for this organization",
        feature: "enhanced_trends",
        enabled: false
      });
    }

    console.log(`[Beast Mode API] Forecasting ${equipmentId}:${sensorType} for ${forecastHours}h`);

    // Perform trend analysis to get forecasting
    const analysis = await enhancedTrendsAnalyzer.analyzeEquipmentTrends(
      orgId,
      equipmentId,
      sensorType,
      hours
    );

    // Filter forecast to requested horizon
    const forecast = {
      ...analysis.forecasting,
      predictions: analysis.forecasting.predictions.slice(0, forecastHours)
    };

    res.json({
      success: true,
      equipmentId,
      sensorType,
      orgId,
      historicalHours: hours,
      forecastHours,
      forecast: {
        method: forecast.method,
        confidence: forecast.confidence,
        metrics: forecast.metrics,
        predictions: forecast.predictions.map(pred => ({
          timestamp: pred.timestamp,
          predictedValue: pred.predictedValue,
          confidenceInterval: pred.confidenceInterval,
          probability: pred.probability
        })),
        recommendation: forecast.recommendation
      },
      historicalContext: {
        mean: analysis.statisticalSummary.mean,
        trend: analysis.statisticalSummary.trend,
        volatility: analysis.statisticalSummary.standardDeviation,
        seasonality: analysis.seasonality.hasSeasonality
      },
      message: "Sensor value forecasting completed successfully"
    });

  } catch (error: any) {
    console.error(`[Beast Mode API] Error in forecasting:`, error);

    if (error.message && error.message.includes('Insufficient data')) {
      return res.status(400).json({
        success: false,
        error: error.message,
        hint: "Equipment needs sufficient historical data for reliable forecasting"
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to perform sensor forecasting"
    });
  }
});

export { router as beastModeRouter };