import { Router, type Request, type Response } from "express";
import { enhancedLLM } from './enhanced-llm';
import { vesselIntelligence } from './vessel-intelligence';
import { reportContextBuilder } from './report-context';

const router = Router();

/**
 * POST /api/llm/reports/vessel-health
 * Generate personalized vessel health report
 */
router.post("/reports/vessel-health", async (req: Request, res: Response) => {
  try {
    const { vesselId, audience = 'technical', includeScenarios = false, includeROI = false, modelPreference } = req.body;

    if (!vesselId) {
      return res.status(400).json({ error: "vesselId is required" });
    }

    const validAudiences = ['executive', 'technical', 'maintenance', 'compliance'];
    if (!validAudiences.includes(audience)) {
      return res.status(400).json({ error: `audience must be one of: ${validAudiences.join(', ')}` });
    }

    const report = await enhancedLLM.generateVesselHealthReport(vesselId, audience, {
      includeScenarios,
      includeROI,
      modelPreference
    });

    res.json({
      success: true,
      report
    });
  } catch (error: any) {
    console.error('[Enhanced LLM] Error generating vessel health report:', error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate vessel health report"
    });
  }
});

/**
 * POST /api/llm/reports/fleet-summary
 * Generate personalized fleet summary report
 */
router.post("/reports/fleet-summary", async (req: Request, res: Response) => {
  try {
    const { audience = 'executive', includeScenarios = false, includeROI = false, modelPreference } = req.body;

    const validAudiences = ['executive', 'technical', 'maintenance', 'compliance'];
    if (!validAudiences.includes(audience)) {
      return res.status(400).json({ error: `audience must be one of: ${validAudiences.join(', ')}` });
    }

    const report = await enhancedLLM.generateFleetSummaryReport(audience, {
      includeScenarios,
      includeROI,
      modelPreference
    });

    res.json({
      success: true,
      report
    });
  } catch (error: any) {
    console.error('[Enhanced LLM] Error generating fleet summary report:', error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate fleet summary report"
    });
  }
});

/**
 * POST /api/llm/reports/maintenance
 * Generate personalized maintenance report
 */
router.post("/reports/maintenance", async (req: Request, res: Response) => {
  try {
    const { vesselId, audience = 'maintenance', includeScenarios = false, modelPreference } = req.body;

    const validAudiences = ['executive', 'technical', 'maintenance', 'compliance'];
    if (!validAudiences.includes(audience)) {
      return res.status(400).json({ error: `audience must be one of: ${validAudiences.join(', ')}` });
    }

    const report = await enhancedLLM.generateMaintenanceReport(vesselId, audience, {
      includeScenarios,
      modelPreference
    });

    res.json({
      success: true,
      report
    });
  } catch (error: any) {
    console.error('[Enhanced LLM] Error generating maintenance report:', error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate maintenance report"
    });
  }
});

/**
 * POST /api/llm/reports/compliance
 * Generate personalized compliance report
 */
router.post("/reports/compliance", async (req: Request, res: Response) => {
  try {
    const { vesselId, audience = 'compliance', modelPreference } = req.body;

    const validAudiences = ['executive', 'technical', 'maintenance', 'compliance'];
    if (!validAudiences.includes(audience)) {
      return res.status(400).json({ error: `audience must be one of: ${validAudiences.join(', ')}` });
    }

    const report = await enhancedLLM.generateComplianceReport(vesselId, audience, {
      modelPreference
    });

    res.json({
      success: true,
      report
    });
  } catch (error: any) {
    console.error('[Enhanced LLM] Error generating compliance report:', error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate compliance report"
    });
  }
});

/**
 * GET /api/llm/vessel/:vesselId/intelligence
 * Get vessel intelligence with learned patterns
 */
router.get("/vessel/:vesselId/intelligence", async (req: Request, res: Response) => {
  try {
    const { vesselId } = req.params;
    const { lookbackDays = 365 } = req.query;

    const learnings = await vesselIntelligence.learnVesselPatterns(
      vesselId,
      parseInt(lookbackDays as string)
    );

    const { storage } = await import('./storage');
    const vessel = await storage.getVessel(vesselId);
    if (!vessel) {
      throw new Error('Vessel not found');
    }

    const allPatterns = [...learnings.failurePatterns, ...learnings.maintenancePatterns];
    
    const historicalPatterns = allPatterns.map(p => ({
      pattern: p.description,
      frequency: p.patternType === 'failure' ? `${p.frequency} occurrences` : `${p.frequency} cycles`,
      lastOccurrence: p.lastObserved.toISOString().split('T')[0],
      significance: p.confidence > 0.7 ? 'High' : p.confidence > 0.4 ? 'Medium' : 'Low'
    }));

    const anomalies = learnings.failurePatterns
      .filter(p => p.patternType === 'failure' && p.confidence > 0.6)
      .map(p => ({
        type: p.patternType,
        severity: p.confidence > 0.8 ? 'critical' as const : p.confidence > 0.6 ? 'high' as const : 'medium' as const,
        detectedAt: p.lastObserved.toISOString(),
        description: p.description,
        zScore: p.confidence * 3
      }));

    const seasonalTrends = learnings.maintenancePatterns
      .filter(p => p.patternType === 'seasonal' || p.patternType === 'operational')
      .map(p => ({
        season: p.patternType === 'seasonal' ? 'Seasonal' : 'Operational',
        trend: p.description.includes('increasing') ? 'increasing' : p.description.includes('decreasing') ? 'decreasing' : 'stable',
        impact: p.confidence > 0.7 ? 'High impact on maintenance' : 'Moderate impact'
      }));

    const equipmentCorrelations = learnings.failurePatterns
      .filter(p => p.affectedEquipment.length >= 2)
      .slice(0, 5)
      .map(p => ({
        equipment1: p.affectedEquipment[0] || 'Unknown',
        equipment2: p.affectedEquipment[1] || 'Unknown',
        correlationType: p.patternType,
        strength: p.confidence
      }));

    const failureRisk = Math.round(
      (learnings.failurePatterns.reduce((sum, p) => sum + p.confidence, 0) / 
       Math.max(learnings.failurePatterns.length, 1)) * 100
    );

    const criticalEquipment = learnings.failurePatterns
      .filter(p => p.confidence > 0.7)
      .flatMap(p => p.affectedEquipment)
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 5);

    const nextMaintWindow = learnings.maintenancePatterns.length > 0 
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : 'Not scheduled';

    const overallConfidence = Math.round(
      (allPatterns.reduce((sum, p) => sum + p.confidence, 0) / Math.max(allPatterns.length, 1)) * 100
    );

    const transformedIntelligence = {
      vesselId,
      vesselName: vessel.name,
      patterns: {
        historicalPatterns,
        anomalies,
        seasonalTrends,
        equipmentCorrelations
      },
      predictions: {
        failureRisk,
        nextMaintenanceWindow: nextMaintWindow,
        criticalEquipment
      },
      confidence: overallConfidence
    };

    res.json({
      success: true,
      intelligence: transformedIntelligence
    });
  } catch (error: any) {
    console.error('[Vessel Intelligence] Error learning patterns:', error);
    res.json({
      success: true,
      intelligence: {
        vesselId: req.params.vesselId,
        vesselName: 'Unknown',
        patterns: {
          historicalPatterns: [],
          anomalies: [],
          seasonalTrends: [],
          equipmentCorrelations: []
        },
        predictions: {
          failureRisk: 0,
          nextMaintenanceWindow: 'Not available',
          criticalEquipment: []
        },
        confidence: 0
      }
    });
  }
});

/**
 * GET /api/llm/vessel/:vesselId/historical-context
 * Get historical context for a vessel
 */
router.get("/vessel/:vesselId/historical-context", async (req: Request, res: Response) => {
  try {
    const { vesselId } = req.params;

    const context = await vesselIntelligence.getHistoricalContext(vesselId);

    res.json({
      success: true,
      context
    });
  } catch (error: any) {
    console.error('[Vessel Intelligence] Error getting historical context:', error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get historical context"
    });
  }
});

/**
 * POST /api/llm/context/build
 * Build report context for testing/debugging
 */
router.post("/context/build", async (req: Request, res: Response) => {
  try {
    const { type, vesselId, orgId = 'default-org', timeframeDays = 30 } = req.body;

    if (!type) {
      return res.status(400).json({ error: "context type is required" });
    }

    let context;
    switch (type) {
      case 'health':
        if (!vesselId) {
          return res.status(400).json({ error: "vesselId is required for health context" });
        }
        context = await reportContextBuilder.buildVesselHealthContext(vesselId, orgId, {
          includeIntelligence: true,
          timeframeDays
        });
        break;
      
      case 'fleet':
        context = await reportContextBuilder.buildFleetSummaryContext(orgId, {
          includeIntelligence: true,
          timeframeDays
        });
        break;
      
      case 'maintenance':
        context = await reportContextBuilder.buildMaintenanceContext(vesselId, orgId, {
          includeIntelligence: true,
          timeframeDays
        });
        break;
      
      case 'compliance':
        context = await reportContextBuilder.buildComplianceContext(vesselId, orgId, {
          timeframeDays
        });
        break;
      
      default:
        return res.status(400).json({ error: `Invalid context type: ${type}` });
    }

    res.json({
      success: true,
      context
    });
  } catch (error: any) {
    console.error('[Context Builder] Error building context:', error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to build context"
    });
  }
});

/**
 * GET /api/llm/models
 * Get available LLM models and their configurations
 */
router.get("/models", async (req: Request, res: Response) => {
  res.json({
    success: true,
    models: [
      {
        id: 'gpt-4o',
        provider: 'openai',
        name: 'GPT-4o',
        description: 'Latest OpenAI model with advanced reasoning',
        capabilities: ['text', 'analysis', 'json'],
        recommended: true
      },
      {
        id: 'o1',
        provider: 'openai',
        name: 'OpenAI o1',
        description: 'Advanced reasoning model for complex analysis',
        capabilities: ['deep-reasoning', 'analysis']
      },
      {
        id: 'claude-3-5-sonnet',
        provider: 'anthropic',
        name: 'Claude 3.5 Sonnet',
        description: 'Anthropic\'s most capable model',
        capabilities: ['text', 'analysis', 'json'],
        recommended: false
      }
    ],
    audiences: [
      {
        id: 'executive',
        name: 'Executive',
        description: 'Business-focused insights with financial and strategic analysis'
      },
      {
        id: 'technical',
        name: 'Technical',
        description: 'Detailed engineering analysis with technical specifications'
      },
      {
        id: 'maintenance',
        name: 'Maintenance',
        description: 'Operational guidance with practical execution details'
      },
      {
        id: 'compliance',
        name: 'Compliance',
        description: 'Regulatory assessment with certification and documentation focus'
      }
    ]
  });
});

export default router;
