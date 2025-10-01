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

    const intelligence = await vesselIntelligence.learnVesselPatterns(
      vesselId,
      parseInt(lookbackDays as string)
    );

    res.json({
      success: true,
      intelligence
    });
  } catch (error: any) {
    console.error('[Vessel Intelligence] Error learning patterns:', error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to analyze vessel patterns"
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
