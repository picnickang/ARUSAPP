import OpenAI from "openai";
import type { EquipmentTelemetry, EquipmentHealth, TelemetryTrend } from "@shared/schema";
import { storage } from "./storage";

/*
Integration note: Using OpenAI blueprint for marine predictive maintenance
- the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
- Using response_format: { type: "json_object" } for structured outputs
- gpt-5 doesn't support temperature parameter
*/

/**
 * Get the effective OpenAI API key from settings or environment
 */
async function getOpenAIApiKey(): Promise<string | undefined> {
  try {
    const settings = await storage.getSettings();
    return settings.openaiApiKey || process.env.OPENAI_API_KEY;
  } catch (error) {
    console.warn('Failed to get API key from settings, falling back to environment:', error);
    return process.env.OPENAI_API_KEY;
  }
}

/**
 * Create OpenAI client with dynamic API key
 */
async function createOpenAIClient(): Promise<OpenAI | null> {
  const apiKey = await getOpenAIApiKey();
  if (!apiKey) {
    console.warn('No OpenAI API key available');
    return null;
  }
  return new OpenAI({ 
    apiKey,
    timeout: 20000 // 20 second timeout for OpenAI API calls
  });
}

export interface MaintenanceInsight {
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendations: string[];
  estimatedCost: number;
  urgency: 'routine' | 'scheduled' | 'urgent' | 'emergency';
  affectedSystems: string[];
  predictedFailureRisk: number; // 0-100
}

export interface EquipmentAnalysis {
  equipmentId: string;
  overallHealth: number; // 0-100
  insights: MaintenanceInsight[];
  summary: string;
  nextMaintenanceDate: string;
  criticalAlerts: string[];
}

export interface EquipmentRisk {
  equipmentId: string;
  failureMode: string;
  probability: number; // 0-100%
  impact: 'Low' | 'Medium' | 'High' | 'Critical';
  riskScore: number; // probability * impact weight
  urgency: 'Immediate' | 'NextPort' | 'Weekly' | 'Monthly';
  complianceRequirement: string;
  linkedWorkOrderId?: string;
}

export interface PrioritizedAction {
  equipmentId: string;
  action: string;
  priority: number; // 1-highest, lower number = higher priority
  riskScore: number;
  businessImpact: 'Safety' | 'Compliance' | 'Operational' | 'Financial';
  timeWindow: string;
  resourceRequirement: string;
  linkedWorkOrderId?: string;
  complianceDeadline?: string;
}

export interface FleetAnalysis {
  totalEquipment: number;
  healthyEquipment: number;
  equipmentAtRisk: number;
  criticalEquipment: number;
  topRecommendations: string[];
  costEstimate: number;
  summary: string;
  riskMatrix: EquipmentRisk[];
  prioritizedActions: PrioritizedAction[];
  systemIntegration: {
    linkedWorkOrders: number;
    pendingComplianceItems: number;
    scheduledMaintenanceOverlap: number;
  };
}

/**
 * Analyzes individual equipment telemetry data using AI to generate predictive maintenance insights
 * Supports both EquipmentTelemetry[] and TelemetryTrend[] input formats
 */
export async function analyzeEquipmentHealth(
  telemetryData: EquipmentTelemetry[] | TelemetryTrend[],
  equipmentId: string,
  equipmentType?: string
): Promise<EquipmentAnalysis> {
  try {
    const systemPrompt = `You are a marine predictive maintenance expert analyzing vessel equipment telemetry data. 
    Analyze the provided telemetry data and generate comprehensive maintenance insights for maritime equipment.
    
    Focus on marine-specific failure patterns:
    - Saltwater corrosion and environmental effects
    - Vibration analysis for engines and pumps
    - Temperature monitoring for cooling systems
    - Pressure monitoring for hydraulic systems
    - Flow rate analysis for fuel and water systems
    
    Respond with JSON in this exact format:
    {
      "equipmentId": "string",
      "overallHealth": number (0-100),
      "insights": [
        {
          "severity": "low|medium|high|critical",
          "title": "string",
          "description": "string", 
          "recommendations": ["string"],
          "estimatedCost": number,
          "urgency": "routine|scheduled|urgent|emergency",
          "affectedSystems": ["string"],
          "predictedFailureRisk": number (0-100)
        }
      ],
      "summary": "string",
      "nextMaintenanceDate": "YYYY-MM-DD",
      "criticalAlerts": ["string"]
    }`;

    // Format telemetry data for AI analysis, handling both data types
    const formattedData = Array.isArray(telemetryData) && telemetryData.length > 0
      ? ('data' in telemetryData[0] 
          ? // TelemetryTrend format
            (telemetryData as TelemetryTrend[]).map(trend => ({
              equipmentId: trend.equipmentId,
              sensorType: trend.sensorType,
              unit: trend.unit,
              currentValue: trend.currentValue,
              threshold: trend.threshold,
              status: trend.status,
              trend: trend.trend,
              changePercent: trend.changePercent,
              recentData: trend.data.slice(-5) // Last 5 data points
            }))
          : // EquipmentTelemetry format
            (telemetryData as EquipmentTelemetry[]).slice(-20)
        )
      : [];

    const userPrompt = `Analyze this marine equipment telemetry data:
    
    Equipment ID: ${equipmentId}
    Equipment Type: ${equipmentType || 'Unknown'}
    
    Recent telemetry readings:
    ${JSON.stringify(formattedData, null, 2)}
    
    Provide detailed predictive maintenance analysis focusing on marine environment challenges.`;

    const openai = await createOpenAIClient();
    if (!openai) {
      throw new Error('OpenAI client not available - API key not configured');
    }

    // Try GPT-5 first, fallback to GPT-4o if not available
    let response;
    try {
      response = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 2048
      });
    } catch (modelError: any) {
      console.warn('GPT-5 not available, falling back to GPT-4o:', modelError.message);
      response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 2048
      });
    }

    const analysis = JSON.parse(response.choices[0].message.content!);
    
    // Validate and set defaults for required fields
    return {
      equipmentId: analysis.equipmentId || equipmentId,
      overallHealth: Math.max(0, Math.min(100, analysis.overallHealth || 50)),
      insights: analysis.insights || [],
      summary: analysis.summary || "No analysis available",
      nextMaintenanceDate: analysis.nextMaintenanceDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      criticalAlerts: analysis.criticalAlerts || []
    };

  } catch (error) {
    console.error(`Equipment analysis failed for ${equipmentId}:`, error);
    
    // Return fallback analysis
    return {
      equipmentId,
      overallHealth: 50,
      insights: [{
        severity: 'medium',
        title: 'Analysis Unavailable',
        description: 'AI analysis service temporarily unavailable',
        recommendations: ['Schedule manual inspection', 'Monitor key parameters'],
        estimatedCost: 0,
        urgency: 'scheduled',
        affectedSystems: ['All Systems'],
        predictedFailureRisk: 50
      }],
      summary: "Unable to complete AI analysis. Manual inspection recommended.",
      nextMaintenanceDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      criticalAlerts: ['AI analysis service unavailable']
    };
  }
}

/**
 * Analyzes fleet-wide telemetry data to provide overall maintenance recommendations
 * Supports both EquipmentTelemetry[] and TelemetryTrend[] input formats
 */
export async function analyzeFleetHealth(
  equipmentHealthData: EquipmentHealth[],
  telemetryData: EquipmentTelemetry[] | TelemetryTrend[],
  storageInstance?: any
): Promise<FleetAnalysis> {
  try {
    console.log(`[Fleet Analysis] Starting enriched analysis with ${equipmentHealthData.length} equipment units and ${telemetryData.length} telemetry records`);
    
    // Use provided storage or fall back to default import for backward compatibility
    const { storage } = await import("./storage");
    const storageToUse = storageInstance ?? storage;
    
    // Build comprehensive equipment dossiers with robust error handling
    const equipmentDossiers = await Promise.all(
      equipmentHealthData.map(async (equipment) => {
        let workOrders = [], alerts = [], pdmHistory = [], maintenanceRecords = [];
        
        // Safely gather contextual data with error handling
        if (storageToUse) {
          try {
            if (typeof storageToUse.getWorkOrders === 'function') {
              workOrders = await storageToUse.getWorkOrders(equipment.id);
            }
          } catch (error) {
            console.warn(`Failed to get work orders for ${equipment.id}:`, error);
          }
          
          try {
            if (typeof storageToUse.getAlertNotifications === 'function') {
              const allAlerts = await storageToUse.getAlertNotifications();
              alerts = allAlerts.filter(a => a.equipmentId === equipment.id).slice(0, 20);
            }
          } catch (error) {
            console.warn(`Failed to get alerts for ${equipment.id}:`, error);
          }
          
          try {
            if (typeof storageToUse.getPdmScores === 'function') {
              pdmHistory = await storageToUse.getPdmScores(equipment.id);
              pdmHistory = pdmHistory.slice(-10);
            }
          } catch (error) {
            console.warn(`Failed to get PdM scores for ${equipment.id}:`, error);
          }
          
          try {
            if (typeof storageToUse.getMaintenanceRecords === 'function') {
              maintenanceRecords = await storageToUse.getMaintenanceRecords(equipment.id);
              maintenanceRecords = maintenanceRecords.slice(-5);
            }
          } catch (error) {
            console.warn(`Failed to get maintenance records for ${equipment.id}:`, error);
          }
        }

        return {
          ...equipment,
          context: {
            workOrderStats: {
              total: workOrders.length,
              openCount: workOrders.filter(wo => wo.status === 'open').length,
              recentReasons: workOrders.slice(-3).map(wo => wo.reason)
            },
            alertPattern: {
              total: alerts.length,
              critical: alerts.filter(a => a.alertType === 'critical').length,
              unacknowledged: alerts.filter(a => !a.acknowledged).length,
              topAlertTypes: [...new Set(alerts.slice(-5).map(a => a.sensorType))]
            },
            pdmTrend: {
              current: equipment.healthIndex,
              degradationRate: pdmHistory.length > 1 
                ? (pdmHistory[pdmHistory.length-1].score - pdmHistory[0].score) / pdmHistory.length 
                : 0,
              hasHistory: pdmHistory.length > 0,
              worstScore: pdmHistory.length > 0 ? Math.min(...pdmHistory.map(p => p.score)) : equipment.healthIndex
            },
            maintenanceSummary: {
              totalRecords: maintenanceRecords.length,
              lastMaintenanceType: maintenanceRecords.length > 0 ? maintenanceRecords[maintenanceRecords.length-1].maintenanceType : null,
              hasRecentMaintenance: maintenanceRecords.length > 0
            }
          }
        };
      })
    );
    const systemPrompt = `Chief Marine Engineer analyzing fleet maintenance for critical business decisions.
    
    For EACH equipment, analyze:
    - Failure probability from degradation patterns and alert clusters
    - Safety/compliance impact (SOLAS, class society requirements)
    - Maintenance window constraints (port calls, weather, crew availability)
    - Cost impact (preventive vs reactive, downtime losses)
    
    Return structured JSON:
    {
      "totalEquipment": number,
      "healthyEquipment": number,
      "equipmentAtRisk": number,
      "criticalEquipment": number,
      "topRecommendations": [
        "EXACT FORMAT: EquipmentID: FailureMode hypothesis (XX%) - SafetyImpact/ComplianceRisk - MaintenanceWindow - ClassRequirement"
      ],
      "costEstimate": number,
      "summary": "Executive summary with risk prioritization and operational impact"
    }`;

    // Format telemetry data as summary for token efficiency  
    const telemetrySummary = Array.isArray(telemetryData) && telemetryData.length > 0
      ? {
          totalReadings: telemetryData.length,
          equipmentTypes: [...new Set(telemetryData.map(t => t.equipmentId))],
          recentIssues: telemetryData
            .filter(t => t.status === 'critical' || t.status === 'warning')
            .slice(-5)
            .map(t => ({ 
              equipment: t.equipmentId, 
              sensor: t.sensorType, 
              status: t.status,
              value: 'currentValue' in t ? t.currentValue : 'value' in t ? t.value : 'N/A'
            }))
        }
      : { totalReadings: 0, equipmentTypes: [], recentIssues: [] };

    const userPrompt = `FLEET ANALYSIS REQUEST:
    
    Equipment: ${equipmentDossiers.slice(0, 3).map(e => 
      `${e.id}(health:${e.healthIndex},alerts:${e.context.alertPattern.total}/${e.context.alertPattern.critical}crit,work-orders:${e.context.workOrderStats.openCount}open,pdm-trend:${e.context.pdmTrend.degradationRate.toFixed(1)}/day)`
    ).join(', ')}
    
    Active Issues: ${telemetrySummary.recentIssues.map(i => `${i.equipment}-${i.sensor}:${i.status}`).join(', ')}
    
    Maintenance Context: ${equipmentDossiers.slice(0, 3).map(e => 
      `${e.id}:recent-maintenance=${e.context.maintenanceSummary.hasRecentMaintenance},alert-sensors=${e.context.alertPattern.topAlertTypes.join('/')}`
    ).join('; ')}
    
    MANDATORY FORMAT EXAMPLES:
    "PUMP001: Bearing failure hypothesis (65%) - Safety critical/SOLAS Ch.II compliance - Next port window (48hrs) - Class survey required"
    "ENG001: Injection pump degradation (40%) - Performance impact/emissions - Weekly maintenance - Manufacturer service bulletin"
    
    MUST INCLUDE for each equipment:
    1. Specific failure mode hypothesis with percentage probability
    2. Safety/compliance impact (SOLAS, MLC, class society)
    3. Maintenance window timing (hours/days/next port)
    4. Required certification or compliance action`;

    const openai = await createOpenAIClient();
    if (!openai) {
      throw new Error('OpenAI client not available - API key not configured');
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // using the latest available OpenAI model
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1500
    });

    const analysis = JSON.parse(response.choices[0].message.content!);
    
    // Process AI recommendations into structured risk matrix and prioritized actions
    const riskMatrix: EquipmentRisk[] = [];
    const prioritizedActions: PrioritizedAction[] = [];
    
    // Parse structured AI recommendations to extract risk and action data
    if (analysis.topRecommendations && analysis.topRecommendations.length > 0) {
      analysis.topRecommendations.forEach((recommendation, index) => {
        const parts = recommendation.split(' - ');
        if (parts.length >= 4) {
          const [equipmentPart, impactPart, timePart, compliancePart] = parts;
          
          // Extract equipment ID and failure mode
          const equipmentMatch = equipmentPart.match(/^(\w+):\s*(.+?)\s*\((\d+)%\)/);
          if (equipmentMatch) {
            const [, equipmentId, failureMode, probabilityStr] = equipmentMatch;
            const probability = parseInt(probabilityStr);
            
            // Determine impact level from keywords
            const impactLevel = impactPart.includes('Safety critical') || impactPart.includes('SOLAS') ? 'Critical' :
                               impactPart.includes('compliance') ? 'High' :
                               impactPart.includes('Performance') ? 'Medium' : 'Low';
            
            // Calculate risk score (probability * impact weight)
            const impactWeight = { 'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4 }[impactLevel];
            const riskScore = probability * impactWeight;
            
            // Determine urgency from time window
            const urgency = timePart.includes('48hrs') || timePart.includes('Immediate') ? 'Immediate' :
                           timePart.includes('port') ? 'NextPort' :
                           timePart.includes('weekly') || timePart.includes('Bi-weekly') ? 'Weekly' : 'Monthly';
            
            // Find linked work order
            const equipmentDossier = equipmentDossiers.find(d => d.id === equipmentId);
            const linkedWorkOrderId = equipmentDossier?.context.workOrderStats.openCount > 0 ? 
              `work-order-${equipmentId}` : undefined;
            
            // Create risk entry
            riskMatrix.push({
              equipmentId,
              failureMode,
              probability,
              impact: impactLevel as 'Low' | 'Medium' | 'High' | 'Critical',
              riskScore,
              urgency: urgency as 'Immediate' | 'NextPort' | 'Weekly' | 'Monthly',
              complianceRequirement: compliancePart,
              linkedWorkOrderId
            });
            
            // Create prioritized action
            const businessImpact = impactPart.includes('Safety') ? 'Safety' :
                                 impactPart.includes('compliance') || impactPart.includes('SOLAS') ? 'Compliance' :
                                 impactPart.includes('Performance') ? 'Operational' : 'Financial';
            
            prioritizedActions.push({
              equipmentId,
              action: `Address ${failureMode.toLowerCase()}`,
              priority: Math.max(1, Math.ceil(riskScore / 100)), // Priority 1-4 based on risk score
              riskScore,
              businessImpact: businessImpact as 'Safety' | 'Compliance' | 'Operational' | 'Financial',
              timeWindow: timePart,
              resourceRequirement: compliancePart.includes('Class') ? 'External survey required' : 'Internal maintenance team',
              linkedWorkOrderId,
              complianceDeadline: timePart.includes('port') ? 'Next port call' : undefined
            });
          }
        }
      });
    }
    
    // Sort prioritized actions by risk score (highest first)
    prioritizedActions.sort((a, b) => b.riskScore - a.riskScore);
    
    // Calculate system integration metrics
    const linkedWorkOrders = equipmentDossiers.reduce((sum, d) => sum + d.context.workOrderStats.openCount, 0);
    const pendingComplianceItems = riskMatrix.filter(r => r.complianceRequirement.includes('Class') || r.complianceRequirement.includes('SOLAS')).length;
    const scheduledMaintenanceOverlap = riskMatrix.filter(r => r.urgency === 'NextPort' || r.urgency === 'Weekly').length;

    return {
      totalEquipment: analysis.totalEquipment || equipmentHealthData.length,
      healthyEquipment: analysis.healthyEquipment || 0,
      equipmentAtRisk: analysis.equipmentAtRisk || 0,
      criticalEquipment: analysis.criticalEquipment || 0,
      topRecommendations: analysis.topRecommendations || [],
      costEstimate: analysis.costEstimate || 0,
      summary: analysis.summary || "Fleet analysis unavailable",
      riskMatrix,
      prioritizedActions,
      systemIntegration: {
        linkedWorkOrders,
        pendingComplianceItems,
        scheduledMaintenanceOverlap
      }
    };

  } catch (error) {
    console.error("Fleet analysis failed:", error);
    
    // Return fallback analysis
    const totalEquipment = equipmentHealthData.length;
    return {
      totalEquipment,
      healthyEquipment: Math.floor(totalEquipment * 0.6),
      equipmentAtRisk: Math.floor(totalEquipment * 0.3),
      criticalEquipment: Math.floor(totalEquipment * 0.1),
      topRecommendations: [
        'AI analysis service temporarily unavailable',
        'Schedule manual fleet inspection',
        'Review equipment maintenance schedules'
      ],
      costEstimate: 0,
      summary: "Fleet analysis service temporarily unavailable. Manual assessment recommended."
    };
  }
}

/**
 * Generates maintenance recommendations based on specific alert conditions
 */
export async function generateMaintenanceRecommendations(
  alertType: string,
  equipmentId: string,
  sensorData: any,
  equipmentType?: string
): Promise<MaintenanceInsight> {
  try {
    const systemPrompt = `You are a marine maintenance specialist providing specific action recommendations for equipment alerts.
    Generate actionable maintenance recommendations for marine equipment based on alert conditions.
    
    Focus on immediate actionable steps, safety considerations, and marine-specific maintenance procedures.
    
    Respond with JSON in this exact format:
    {
      "severity": "low|medium|high|critical",
      "title": "string",
      "description": "string",
      "recommendations": ["string"],
      "estimatedCost": number,
      "urgency": "routine|scheduled|urgent|emergency", 
      "affectedSystems": ["string"],
      "predictedFailureRisk": number (0-100)
    }`;

    const userPrompt = `Generate maintenance recommendations for this marine equipment alert:
    
    Alert Type: ${alertType}
    Equipment ID: ${equipmentId}
    Equipment Type: ${equipmentType || 'Unknown'}
    Sensor Data: ${JSON.stringify(sensorData, null, 2)}
    
    Provide specific, actionable maintenance recommendations for marine operations.`;

    const openai = await createOpenAIClient();
    if (!openai) {
      throw new Error('OpenAI client not available - API key not configured');
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // using the latest available OpenAI model
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    });

    const recommendation = JSON.parse(response.choices[0].message.content!);
    
    return {
      severity: recommendation.severity || 'medium',
      title: recommendation.title || `${alertType} Alert - ${equipmentId}`,
      description: recommendation.description || 'Equipment requires attention',
      recommendations: recommendation.recommendations || ['Schedule inspection'],
      estimatedCost: recommendation.estimatedCost || 0,
      urgency: recommendation.urgency || 'scheduled',
      affectedSystems: recommendation.affectedSystems || [equipmentType || 'Unknown System'],
      predictedFailureRisk: Math.max(0, Math.min(100, recommendation.predictedFailureRisk || 50))
    };

  } catch (error) {
    console.error(`Maintenance recommendation failed for ${alertType}:`, error);
    
    // Return fallback recommendation
    return {
      severity: 'medium',
      title: `${alertType} - Attention Required`,
      description: 'Equipment alert detected. Manual assessment recommended.',
      recommendations: [
        'Schedule equipment inspection',
        'Review recent maintenance history',
        'Monitor equipment parameters closely'
      ],
      estimatedCost: 0,
      urgency: 'scheduled',
      affectedSystems: [equipmentType || 'System'],
      predictedFailureRisk: 50
    };
  }
}