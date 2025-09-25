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
  return new OpenAI({ apiKey });
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

export interface FleetAnalysis {
  totalEquipment: number;
  healthyEquipment: number;
  equipmentAtRisk: number;
  criticalEquipment: number;
  topRecommendations: string[];
  costEstimate: number;
  summary: string;
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
  telemetryData: EquipmentTelemetry[] | TelemetryTrend[]
): Promise<FleetAnalysis> {
  try {
    const systemPrompt = `You are a marine fleet management expert analyzing vessel telemetry data across multiple equipment units.
    Provide fleet-wide maintenance insights, cost optimization recommendations, and priority rankings for marine operations.
    
    Focus on:
    - Fleet-wide maintenance scheduling optimization
    - Critical system prioritization for vessel safety
    - Cost-effective maintenance strategies
    - Preventive maintenance recommendations
    - Risk assessment across fleet
    
    Respond with JSON in this exact format:
    {
      "totalEquipment": number,
      "healthyEquipment": number,
      "equipmentAtRisk": number, 
      "criticalEquipment": number,
      "topRecommendations": ["string"],
      "costEstimate": number,
      "summary": "string"
    }`;

    // Format telemetry data for fleet analysis
    const formattedTelemetryData = Array.isArray(telemetryData) && telemetryData.length > 0
      ? ('data' in telemetryData[0]
          ? // TelemetryTrend format - summarize for fleet view
            (telemetryData as TelemetryTrend[]).slice(-10).map(trend => ({
              equipmentId: trend.equipmentId,
              sensorType: trend.sensorType,
              currentValue: trend.currentValue,
              status: trend.status,
              trend: trend.trend,
              changePercent: trend.changePercent
            }))
          : // EquipmentTelemetry format
            (telemetryData as EquipmentTelemetry[]).slice(-10)
        )
      : [];

    const userPrompt = `Analyze this marine fleet data:
    
    Equipment Health Summary:
    ${JSON.stringify(equipmentHealthData, null, 2)}
    
    Recent Fleet Telemetry (overview):
    ${JSON.stringify(formattedTelemetryData, null, 2)}
    
    Provide comprehensive fleet maintenance analysis and cost-optimized recommendations.`;

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
    
    return {
      totalEquipment: analysis.totalEquipment || equipmentHealthData.length,
      healthyEquipment: analysis.healthyEquipment || 0,
      equipmentAtRisk: analysis.equipmentAtRisk || 0,
      criticalEquipment: analysis.criticalEquipment || 0,
      topRecommendations: analysis.topRecommendations || [],
      costEstimate: analysis.costEstimate || 0,
      summary: analysis.summary || "Fleet analysis unavailable"
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