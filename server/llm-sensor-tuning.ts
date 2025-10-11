import OpenAI from "openai";
import { db } from "./db";
import { equipment, sensorConfigurations } from "@shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * LLM-Based Sensor Parameter Tuning Service
 * Uses AI to provide equipment-specific sensor configuration recommendations
 */

interface EquipmentContext {
  type: string;
  manufacturer?: string;
  model?: string;
  location?: string;
  operatingHours?: number;
}

interface SensorParameterRecommendation {
  sensorType: string;
  parameters: {
    gain?: number;
    offset?: number;
    emaAlpha?: number;
    hysteresis?: number;
    warnLo?: number;
    warnHi?: number;
    critLo?: number;
    critHi?: number;
  };
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
  sources: string[];
}

export class LLMSensorTuningService {
  private client: OpenAI | null;
  private apiKeyConfigured: boolean;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    this.apiKeyConfigured = !!apiKey;
    
    if (!this.apiKeyConfigured) {
      console.warn('[LLM Sensor Tuning] OpenAI API key not configured - AI recommendations will not be available');
      this.client = null;
    } else {
      this.client = new OpenAI({ apiKey });
    }
  }

  /**
   * Get AI-powered sensor parameter recommendations for equipment
   */
  async getRecommendations(
    equipmentId: string,
    orgId: string
  ): Promise<SensorParameterRecommendation[]> {
    // Check if OpenAI is configured
    if (!this.apiKeyConfigured || !this.client) {
      throw new Error('AI_SERVICE_UNAVAILABLE');
    }

    // Get equipment details
    const [equip] = await db
      .select()
      .from(equipment)
      .where(and(eq(equipment.id, equipmentId), eq(equipment.orgId, orgId)))
      .limit(1);

    if (!equip) {
      throw new Error('Equipment not found');
    }

    // Get current sensor configurations
    const configs = await db
      .select()
      .from(sensorConfigurations)
      .where(
        and(
          eq(sensorConfigurations.equipmentId, equipmentId),
          eq(sensorConfigurations.orgId, orgId)
        )
      );

    const context: EquipmentContext = {
      type: equip.type,
      manufacturer: equip.manufacturer || undefined,
      model: equip.model || undefined,
      location: equip.location || undefined,
      operatingHours: equip.operatingHours || undefined,
    };

    // Build prompt for LLM
    const prompt = this.buildPrompt(context, configs);

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert marine equipment engineer specializing in sensor calibration and predictive maintenance. 
Your task is to recommend optimal sensor parameters (gain, offset, thresholds, EMA alpha, hysteresis) based on equipment type, manufacturer specifications, and industry best practices.

Provide recommendations in JSON format with detailed reasoning.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from LLM');
      }

      const recommendations = JSON.parse(content);
      return this.parseRecommendations(recommendations);
    } catch (error) {
      console.error('[LLM Sensor Tuning] Error:', error);
      throw error;
    }
  }

  /**
   * Build LLM prompt with equipment context
   */
  private buildPrompt(context: EquipmentContext, currentConfigs: any[]): string {
    const configSummary = currentConfigs.map(c => ({
      sensorType: c.sensorType,
      current: {
        gain: c.gain,
        offset: c.offset,
        emaAlpha: c.emaAlpha,
        warnLo: c.warnLo,
        warnHi: c.warnHi,
        critLo: c.critLo,
        critHi: c.critHi,
      }
    }));

    return `Equipment Details:
- Type: ${context.type}
- Manufacturer: ${context.manufacturer || 'Unknown'}
- Model: ${context.model || 'Unknown'}
- Location: ${context.location || 'Unknown'}
- Operating Hours: ${context.operatingHours || 'Unknown'}

Current Sensor Configurations:
${JSON.stringify(configSummary, null, 2)}

Task: Provide optimal sensor parameter recommendations for this ${context.type} equipment. Consider:

1. **Gain & Offset**: Sensor calibration values for accurate readings
2. **EMA Alpha**: Exponential moving average smoothing (0.0-1.0, higher = less smoothing)
3. **Hysteresis**: Deadband to prevent alert flapping (typically 5-10% of threshold)
4. **Thresholds**: Warning and critical levels based on:
   - Equipment manufacturer specifications
   - Industry standards (ISO, IMO, classification societies)
   - Marine operating conditions
   - Equipment type and criticality

Provide recommendations for each sensor type with:
- Specific numeric values
- Clear reasoning referencing standards/specifications
- Confidence level (high/medium/low)
- Information sources

Response format:
{
  "recommendations": [
    {
      "sensorType": "temperature",
      "parameters": {
        "gain": 1.0,
        "offset": 0,
        "emaAlpha": 0.3,
        "hysteresis": 3,
        "warnLo": null,
        "warnHi": 85,
        "critLo": null,
        "critHi": 95
      },
      "reasoning": "For ${context.manufacturer || 'marine'} ${context.type} engines, typical operating temperature is 70-80°C. Warning at 85°C allows time for intervention before critical 95°C shutdown threshold (per manufacturer spec).",
      "confidence": "high",
      "sources": ["Manufacturer specification", "ISO 8217 fuel standards", "Class society guidelines"]
    }
  ]
}`;
  }

  /**
   * Parse and validate LLM response
   */
  private parseRecommendations(response: any): SensorParameterRecommendation[] {
    if (!response.recommendations || !Array.isArray(response.recommendations)) {
      throw new Error('Invalid LLM response format');
    }

    return response.recommendations.map((rec: any) => ({
      sensorType: rec.sensorType,
      parameters: {
        gain: rec.parameters?.gain,
        offset: rec.parameters?.offset,
        emaAlpha: rec.parameters?.emaAlpha,
        hysteresis: rec.parameters?.hysteresis,
        warnLo: rec.parameters?.warnLo,
        warnHi: rec.parameters?.warnHi,
        critLo: rec.parameters?.critLo,
        critHi: rec.parameters?.critHi,
      },
      reasoning: rec.reasoning || 'No reasoning provided',
      confidence: rec.confidence || 'medium',
      sources: rec.sources || [],
    }));
  }

  /**
   * Get recommendation for specific sensor type
   */
  async getSensorRecommendation(
    equipmentId: string,
    sensorType: string,
    orgId: string
  ): Promise<SensorParameterRecommendation | null> {
    const recommendations = await this.getRecommendations(equipmentId, orgId);
    return recommendations.find(r => r.sensorType === sensorType) || null;
  }

  /**
   * Compare current configuration with AI recommendation
   */
  async compareConfiguration(
    equipmentId: string,
    sensorType: string,
    orgId: string
  ) {
    const [config] = await db
      .select()
      .from(sensorConfigurations)
      .where(
        and(
          eq(sensorConfigurations.equipmentId, equipmentId),
          eq(sensorConfigurations.sensorType, sensorType),
          eq(sensorConfigurations.orgId, orgId)
        )
      )
      .limit(1);

    const recommendation = await this.getSensorRecommendation(equipmentId, sensorType, orgId);

    if (!recommendation) {
      return null;
    }

    return {
      current: {
        gain: config?.gain || 1.0,
        offset: config?.offset || 0,
        emaAlpha: config?.emaAlpha || 0.3,
        hysteresis: config?.hysteresis || 5,
        warnLo: config?.warnLo,
        warnHi: config?.warnHi,
        critLo: config?.critLo,
        critHi: config?.critHi,
      },
      recommended: recommendation.parameters,
      reasoning: recommendation.reasoning,
      confidence: recommendation.confidence,
      sources: recommendation.sources,
      differences: this.calculateDifferences(config, recommendation.parameters),
    };
  }

  /**
   * Calculate parameter differences
   */
  private calculateDifferences(current: any, recommended: any) {
    const diffs: any = {};

    const params = ['gain', 'offset', 'emaAlpha', 'hysteresis', 'warnLo', 'warnHi', 'critLo', 'critHi'];
    
    for (const param of params) {
      const curr = current?.[param];
      const rec = recommended[param];
      
      if (curr !== rec && rec !== undefined && rec !== null) {
        diffs[param] = {
          current: curr,
          recommended: rec,
          change: typeof curr === 'number' && typeof rec === 'number' 
            ? ((rec - curr) / curr * 100).toFixed(1) + '%'
            : 'N/A'
        };
      }
    }

    return diffs;
  }
}

export const llmSensorTuningService = new LLMSensorTuningService();
