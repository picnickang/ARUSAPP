import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { storage } from './storage';
import { reportContextBuilder, type ReportContext } from './report-context';

export interface ModelConfig {
  provider: 'openai' | 'anthropic';
  model: string;
  maxTokens?: number;
  temperature?: number;
  fallbackModel?: ModelConfig;
}

export interface EnhancedAnalysisOutput {
  analysis: string;
  confidence: number;
  scenarios?: {
    scenario: string;
    probability: number;
    impact: 'low' | 'medium' | 'high' | 'critical';
    recommendations: string[];
  }[];
  roi?: {
    estimatedSavings: number;
    investmentRequired: number;
    paybackPeriod: number;
    riskReduction: number;
  };
  citations: {
    source: string;
    relevance: number;
    snippet: string;
  }[];
  metadata: {
    model: string;
    provider: string;
    processingTime: number;
    tokensUsed?: number;
  };
}

export interface PromptTemplate {
  systemPrompt: string;
  userPromptTemplate: string;
  fewShotExamples?: { input: string; output: string }[];
  chainOfThought?: boolean;
}

export class EnhancedLLMService {
  private openaiClient: OpenAI | null = null;
  private anthropicClient: Anthropic | null = null;
  private defaultModels: Record<string, ModelConfig> = {
    'gpt-4o': {
      provider: 'openai',
      model: 'gpt-4o',
      maxTokens: 4000,
      fallbackModel: {
        provider: 'openai',
        model: 'gpt-4o-mini',
        maxTokens: 4000
      }
    },
    'o1': {
      provider: 'openai',
      model: 'o1',
      maxTokens: 8000
    },
    'claude-3-5-sonnet': {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 4000,
      fallbackModel: {
        provider: 'anthropic',
        model: 'claude-3-haiku-20240307',
        maxTokens: 4000
      }
    }
  };

  constructor() {
    this.initializeClients();
  }

  private async initializeClients() {
    try {
      const settings = await storage.getSettings();
      const openaiKey = settings.openaiApiKey || process.env.OPENAI_API_KEY;
      
      if (openaiKey) {
        this.openaiClient = new OpenAI({ 
          apiKey: openaiKey,
          timeout: 60000
        });
        console.log('[Enhanced LLM] OpenAI client initialized');
      }

      if (process.env.ANTHROPIC_API_KEY) {
        this.anthropicClient = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY
        });
        console.log('[Enhanced LLM] Anthropic client initialized');
      }
    } catch (error) {
      console.warn('[Enhanced LLM] Error initializing clients:', error);
    }
  }

  /**
   * Generate personalized vessel health report with advanced analysis
   */
  async generateVesselHealthReport(
    vesselId: string,
    audience: 'executive' | 'technical' | 'maintenance' | 'compliance',
    options: {
      includeScenarios?: boolean;
      includeROI?: boolean;
      modelPreference?: string;
    } = {}
  ): Promise<EnhancedAnalysisOutput> {
    const startTime = Date.now();

    const context = await reportContextBuilder.buildVesselHealthContext(vesselId, 'default-org', {
      includeIntelligence: true,
      includePredictions: true,
      audience,
      timeframeDays: 30
    });

    const promptTemplate = this.getAudiencePromptTemplate(audience, 'health');
    const modelConfig = this.getModelConfig(options.modelPreference);

    const enrichedContext = this.enrichContextWithRAG(context);
    const analysis = await this.generateWithModel(enrichedContext, promptTemplate, modelConfig);

    const scenarios = options.includeScenarios ? 
      await this.generateScenarios(context, modelConfig) : undefined;

    const roi = options.includeROI ? 
      await this.calculateROI(context, scenarios) : undefined;

    const citations = this.buildCitations(context, enrichedContext);

    return {
      analysis,
      confidence: this.calculateConfidence(context, analysis),
      scenarios,
      roi,
      citations,
      metadata: {
        model: modelConfig.model,
        provider: modelConfig.provider,
        processingTime: Date.now() - startTime
      }
    };
  }

  /**
   * Generate personalized fleet summary report
   */
  async generateFleetSummaryReport(
    audience: 'executive' | 'technical' | 'maintenance' | 'compliance',
    options: {
      includeScenarios?: boolean;
      includeROI?: boolean;
      modelPreference?: string;
    } = {}
  ): Promise<EnhancedAnalysisOutput> {
    const startTime = Date.now();

    const context = await reportContextBuilder.buildFleetSummaryContext('default-org', {
      includeIntelligence: true,
      includePredictions: true,
      audience,
      timeframeDays: 30
    });

    const promptTemplate = this.getAudiencePromptTemplate(audience, 'fleet_summary');
    const modelConfig = this.getModelConfig(options.modelPreference);

    const enrichedContext = this.enrichContextWithRAG(context);
    const analysis = await this.generateWithModel(enrichedContext, promptTemplate, modelConfig);

    const scenarios = options.includeScenarios ? 
      await this.generateScenarios(context, modelConfig) : undefined;

    const roi = options.includeROI ? 
      await this.calculateROI(context, scenarios) : undefined;

    const citations = this.buildCitations(context, enrichedContext);

    return {
      analysis,
      confidence: this.calculateConfidence(context, analysis),
      scenarios,
      roi,
      citations,
      metadata: {
        model: modelConfig.model,
        provider: modelConfig.provider,
        processingTime: Date.now() - startTime
      }
    };
  }

  /**
   * Generate personalized maintenance report
   */
  async generateMaintenanceReport(
    vesselId: string | undefined,
    audience: 'executive' | 'technical' | 'maintenance' | 'compliance',
    options: {
      includeScenarios?: boolean;
      modelPreference?: string;
    } = {}
  ): Promise<EnhancedAnalysisOutput> {
    const startTime = Date.now();

    const context = await reportContextBuilder.buildMaintenanceContext(vesselId, 'default-org', {
      includeIntelligence: true,
      audience,
      timeframeDays: 90
    });

    const promptTemplate = this.getAudiencePromptTemplate(audience, 'maintenance');
    const modelConfig = this.getModelConfig(options.modelPreference);

    const enrichedContext = this.enrichContextWithRAG(context);
    const analysis = await this.generateWithModel(enrichedContext, promptTemplate, modelConfig);

    const scenarios = options.includeScenarios ? 
      await this.generateScenarios(context, modelConfig) : undefined;

    const citations = this.buildCitations(context, enrichedContext);

    return {
      analysis,
      confidence: this.calculateConfidence(context, analysis),
      scenarios,
      citations,
      metadata: {
        model: modelConfig.model,
        provider: modelConfig.provider,
        processingTime: Date.now() - startTime
      }
    };
  }

  /**
   * Generate personalized compliance report
   */
  async generateComplianceReport(
    vesselId: string | undefined,
    audience: 'executive' | 'technical' | 'maintenance' | 'compliance',
    options: {
      modelPreference?: string;
    } = {}
  ): Promise<EnhancedAnalysisOutput> {
    const startTime = Date.now();

    const context = await reportContextBuilder.buildComplianceContext(vesselId, 'default-org', {
      audience,
      timeframeDays: 90
    });

    const promptTemplate = this.getAudiencePromptTemplate(audience, 'compliance');
    const modelConfig = this.getModelConfig(options.modelPreference);

    const enrichedContext = this.enrichContextWithRAG(context);
    const analysis = await this.generateWithModel(enrichedContext, promptTemplate, modelConfig);

    const citations = this.buildCitations(context, enrichedContext);

    return {
      analysis,
      confidence: this.calculateConfidence(context, analysis),
      citations,
      metadata: {
        model: modelConfig.model,
        provider: modelConfig.provider,
        processingTime: Date.now() - startTime
      }
    };
  }

  /**
   * Get audience-specific prompt template
   */
  private getAudiencePromptTemplate(
    audience: 'executive' | 'technical' | 'maintenance' | 'compliance',
    reportType: string
  ): PromptTemplate {
    const templates = {
      executive: {
        systemPrompt: `You are a senior maritime operations executive providing strategic insights.
        Focus on: business impact, cost implications, risk management, ROI, and strategic recommendations.
        Use clear, concise language. Avoid technical jargon. Emphasize financial and operational metrics.`,
        
        userPromptTemplate: `Analyze this marine fleet data and provide an executive summary:

Context: {context}

Structure your response:
1. Executive Summary (3-4 key points)
2. Business Impact Analysis
3. Financial Implications
4. Strategic Recommendations
5. Risk Assessment

Keep language non-technical and action-oriented.`,
        
        fewShotExamples: [
          {
            input: 'Vessel with 3 critical work orders and $50k maintenance costs',
            output: 'Executive Summary: Immediate attention required on Vessel Alpha. Three critical issues identified requiring $50k investment. Recommended action: Deploy emergency maintenance team within 24 hours to prevent $200k+ downtime costs.'
          }
        ],
        chainOfThought: false
      },
      
      technical: {
        systemPrompt: `You are a senior marine engineer providing technical analysis.
        Focus on: equipment specifications, failure modes, root cause analysis, technical solutions, and engineering best practices.
        Use precise technical terminology. Include detailed diagnostics and engineering rationale.`,
        
        userPromptTemplate: `Provide detailed technical analysis of this marine equipment data:

Context: {context}

Structure your response:
1. Technical Overview
2. Equipment Status Analysis
3. Failure Mode Analysis
4. Root Cause Assessment
5. Engineering Recommendations
6. Maintenance Procedures

Include technical specifications and diagnostic details.`,
        
        fewShotExamples: [
          {
            input: 'Main engine vibration 45mm/s, temperature 92°C, pressure drop 15%',
            output: 'Technical Analysis: Main engine exhibits abnormal vibration (45mm/s, 80% above baseline). Contributing factors: bearing wear indicated by temperature elevation to 92°C (optimal: 70-80°C), pressure drop suggests impeller degradation. Root cause: Likely bearing failure in stage 2. Recommended: Immediate shutdown, bearing inspection, thermal imaging scan.'
          }
        ],
        chainOfThought: true
      },
      
      maintenance: {
        systemPrompt: `You are a maintenance supervisor providing operational guidance.
        Focus on: work procedures, spare parts, labor requirements, scheduling, and practical execution.
        Use clear, actionable language. Prioritize safety and efficiency.`,
        
        userPromptTemplate: `Provide maintenance-focused analysis and action plan:

Context: {context}

Structure your response:
1. Maintenance Priority List
2. Required Actions
3. Parts & Resources Needed
4. Labor Requirements
5. Estimated Timeline
6. Safety Considerations

Focus on practical execution and safety.`,
        
        fewShotExamples: [
          {
            input: 'Hydraulic pump failure, critical priority',
            output: 'Maintenance Action Plan: Priority 1 - Hydraulic pump replacement. Required: 2 technicians, 6 hours. Parts: Pump assembly (PN: HP-2500), seal kit, hydraulic fluid (20L). Safety: Lockout/tagout, pressure relief, containment. Schedule: Next port call, dock availability required.'
          }
        ],
        chainOfThought: false
      },
      
      compliance: {
        systemPrompt: `You are a maritime compliance officer ensuring regulatory adherence.
        Focus on: regulations, certifications, audit requirements, documentation, and compliance status.
        Use formal language. Reference specific regulations and standards.`,
        
        userPromptTemplate: `Provide compliance assessment and regulatory analysis:

Context: {context}

Structure your response:
1. Compliance Status Overview
2. Regulatory Requirements
3. Certification Status
4. Non-Compliance Issues
5. Remediation Actions
6. Documentation Requirements

Reference specific regulations and standards.`,
        
        fewShotExamples: [
          {
            input: 'Crew rest hours: 8h/24h recorded, STCW requires 10h/24h',
            output: 'Compliance Assessment: NON-COMPLIANT with STCW 2010 Convention, Section A-VIII/1. Crew rest hours (8h/24h) below minimum requirement (10h/24h). Violation severity: HIGH. Immediate action: Adjust crew scheduling, document corrective measures, notify maritime authority. Required: Updated rest hour logs, crew rotation plan, 30-day compliance report.'
          }
        ],
        chainOfThought: false
      }
    };

    return templates[audience] || templates.technical;
  }

  /**
   * Enrich context with RAG (Retrieval Augmented Generation)
   */
  private enrichContextWithRAG(context: ReportContext): ReportContext {
    if (!context.intelligence) {
      context.intelligence = {};
    }

    const knowledgeSnippets: string[] = [];

    if (context.data.workOrders && context.data.workOrders.length > 0) {
      const criticalOrders = context.data.workOrders
        .filter(wo => wo.priority === 'critical' || wo.priority === 'urgent')
        .slice(0, 3);
      
      criticalOrders.forEach(order => {
        knowledgeSnippets.push(
          `Critical Work Order: ${order.title} (${order.status}) - ${order.description || 'No description'}`
        );
      });
    }

    if (context.data.alerts && context.data.alerts.length > 0) {
      const criticalAlerts = context.data.alerts
        .filter(a => a.severity === 'critical')
        .slice(0, 3);
      
      criticalAlerts.forEach(alert => {
        knowledgeSnippets.push(
          `Critical Alert: ${alert.alertType} on ${alert.sensorType} - ${alert.message}`
        );
      });
    }

    if (context.intelligence.vesselLearnings) {
      const learnings = context.intelligence.vesselLearnings;
      learnings.failurePatterns?.slice(0, 2).forEach((pattern: any) => {
        knowledgeSnippets.push(
          `Historical Pattern: ${pattern.description} (confidence: ${(pattern.confidence * 100).toFixed(0)}%)`
        );
      });
    }

    // Add ML model predictions to knowledge base
    if (context.intelligence.predictions && context.intelligence.predictions.length > 0) {
      context.intelligence.predictions.slice(0, 5).forEach(pred => {
        const failureProb = (pred.mlPrediction.failureProbability * 100).toFixed(0);
        const healthScore = pred.mlPrediction.healthScore;
        const remainingDays = pred.mlPrediction.remainingDays;
        const method = pred.mlPrediction.method === 'hybrid' ? 'Hybrid ML' : 
                       pred.mlPrediction.method === 'ml_lstm' ? 'LSTM Neural Network' : 'Random Forest';
        
        knowledgeSnippets.push(
          `ML Prediction for ${pred.equipmentName} (${pred.equipmentType}): ` +
          `${method} model predicts ${failureProb}% failure probability, ` +
          `health score ${healthScore}/100, ` +
          `estimated ${remainingDays} days until maintenance needed. ` +
          `Recommendations: ${pred.mlPrediction.recommendations.slice(0, 2).join('; ')}`
        );
      });
    }

    context.intelligence.knowledgeBase = knowledgeSnippets;

    return context;
  }

  /**
   * Generate analysis using configured model with fallback
   */
  private async generateWithModel(
    context: ReportContext,
    promptTemplate: PromptTemplate,
    modelConfig: ModelConfig
  ): Promise<string> {
    const contextStr = this.serializeContext(context);
    const userPrompt = promptTemplate.userPromptTemplate.replace('{context}', contextStr);

    try {
      if (modelConfig.provider === 'openai') {
        return await this.generateWithOpenAI(promptTemplate.systemPrompt, userPrompt, modelConfig, promptTemplate);
      } else if (modelConfig.provider === 'anthropic') {
        return await this.generateWithAnthropic(promptTemplate.systemPrompt, userPrompt, modelConfig);
      }
      
      throw new Error(`Unsupported provider: ${modelConfig.provider}`);
    } catch (error) {
      console.error(`[Enhanced LLM] Error with ${modelConfig.provider}/${modelConfig.model}:`, error);
      
      if (modelConfig.fallbackModel) {
        console.log('[Enhanced LLM] Attempting fallback model...');
        return await this.generateWithModel(context, promptTemplate, modelConfig.fallbackModel);
      }
      
      return this.generateFallbackAnalysis(context);
    }
  }

  /**
   * Generate using OpenAI with chain-of-thought if requested
   */
  private async generateWithOpenAI(
    systemPrompt: string,
    userPrompt: string,
    modelConfig: ModelConfig,
    promptTemplate: PromptTemplate
  ): Promise<string> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const messages: any[] = [
      { role: 'system', content: systemPrompt }
    ];

    if (promptTemplate.fewShotExamples && promptTemplate.fewShotExamples.length > 0) {
      promptTemplate.fewShotExamples.forEach(example => {
        messages.push({ role: 'user', content: example.input });
        messages.push({ role: 'assistant', content: example.output });
      });
    }

    if (promptTemplate.chainOfThought) {
      messages.push({
        role: 'user',
        content: `${userPrompt}\n\nThink step-by-step:\n1. Analyze the data\n2. Identify key patterns\n3. Assess risks\n4. Formulate recommendations`
      });
    } else {
      messages.push({ role: 'user', content: userPrompt });
    }

    const completion = await this.openaiClient.chat.completions.create({
      model: modelConfig.model,
      messages,
      max_tokens: modelConfig.maxTokens,
      temperature: modelConfig.temperature
    });

    return completion.choices[0]?.message?.content || 'No response generated';
  }

  /**
   * Generate using Anthropic Claude
   */
  private async generateWithAnthropic(
    systemPrompt: string,
    userPrompt: string,
    modelConfig: ModelConfig
  ): Promise<string> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    const message = await this.anthropicClient.messages.create({
      model: modelConfig.model,
      max_tokens: modelConfig.maxTokens || 4000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ]
    });

    const content = message.content[0];
    return content.type === 'text' ? content.text : 'No response generated';
  }

  /**
   * Generate predictive scenarios
   */
  private async generateScenarios(
    context: ReportContext,
    modelConfig: ModelConfig
  ): Promise<EnhancedAnalysisOutput['scenarios']> {
    const scenarios: EnhancedAnalysisOutput['scenarios'] = [];

    const criticalItems = (context.data.workOrders?.filter(wo => wo.priority === 'critical') || []).length;
    const urgentItems = (context.data.workOrders?.filter(wo => wo.priority === 'urgent') || []).length;

    if (criticalItems > 0) {
      scenarios.push({
        scenario: 'Immediate Intervention',
        probability: 0.85,
        impact: 'critical',
        recommendations: [
          'Deploy emergency maintenance team within 24 hours',
          'Prepare spare equipment and parts',
          'Notify stakeholders of potential downtime'
        ]
      });
    }

    if (urgentItems > 2) {
      scenarios.push({
        scenario: 'Preventive Maintenance Acceleration',
        probability: 0.70,
        impact: 'high',
        recommendations: [
          'Schedule maintenance during next port call',
          'Increase monitoring frequency',
          'Review maintenance schedules'
        ]
      });
    }

    scenarios.push({
      scenario: 'Continued Monitoring',
      probability: 0.60,
      impact: 'medium',
      recommendations: [
        'Maintain current monitoring protocols',
        'Schedule routine maintenance as planned',
        'Review performance trends monthly'
      ]
    });

    return scenarios;
  }

  /**
   * Calculate ROI analysis
   */
  private async calculateROI(
    context: ReportContext,
    scenarios?: EnhancedAnalysisOutput['scenarios']
  ): Promise<EnhancedAnalysisOutput['roi']> {
    const workOrders = context.data.workOrders || [];
    const avgCost = workOrders.reduce((sum, wo) => sum + (wo.estimatedCost || 0), 0) / Math.max(workOrders.length, 1);

    const criticalCount = workOrders.filter(wo => wo.priority === 'critical').length;
    const preventiveCost = avgCost * 0.3;
    const failureCost = avgCost * 3;

    const estimatedSavings = criticalCount * (failureCost - preventiveCost);
    const investmentRequired = preventiveCost * workOrders.length;
    const paybackPeriod = investmentRequired > 0 ? investmentRequired / (estimatedSavings / 12) : 0;
    const riskReduction = Math.min(90, criticalCount * 15);

    return {
      estimatedSavings: Math.round(estimatedSavings),
      investmentRequired: Math.round(investmentRequired),
      paybackPeriod: Math.round(paybackPeriod * 10) / 10,
      riskReduction
    };
  }

  /**
   * Calculate confidence score for analysis
   */
  private calculateConfidence(context: ReportContext, analysis: string): number {
    let confidence = 0.5;

    if (context.data.telemetry && context.data.telemetry.length > 100) confidence += 0.15;
    if (context.data.workOrders && context.data.workOrders.length > 10) confidence += 0.15;
    if (context.intelligence?.vesselLearnings) confidence += 0.10;
    if (context.intelligence?.historicalContext) confidence += 0.10;

    return Math.min(0.95, Math.round(confidence * 100) / 100);
  }

  /**
   * Build citations from context
   */
  private buildCitations(
    context: ReportContext,
    enrichedContext: ReportContext
  ): EnhancedAnalysisOutput['citations'] {
    const citations: EnhancedAnalysisOutput['citations'] = [];

    const knowledgeBase = enrichedContext.intelligence?.knowledgeBase || [];
    knowledgeBase.forEach((snippet, index) => {
      citations.push({
        source: `Knowledge Base ${index + 1}`,
        relevance: Math.max(0.6, 1.0 - (index * 0.1)),
        snippet
      });
    });

    return citations.slice(0, 10);
  }

  /**
   * Serialize context for prompt
   */
  private serializeContext(context: ReportContext): string {
    const parts: string[] = [];

    if (context.data.vessels && context.data.vessels.length > 0) {
      parts.push(`Vessels: ${context.data.vessels.map(v => v.name).join(', ')}`);
    }

    if (context.data.workOrders) {
      parts.push(`Work Orders: ${context.data.workOrders.length} total`);
      const byPriority = {
        critical: context.data.workOrders.filter(wo => wo.priority === 'critical').length,
        urgent: context.data.workOrders.filter(wo => wo.priority === 'urgent').length,
        normal: context.data.workOrders.filter(wo => wo.priority === 'normal').length
      };
      parts.push(`  - Critical: ${byPriority.critical}, Urgent: ${byPriority.urgent}, Normal: ${byPriority.normal}`);
    }

    if (context.intelligence?.knowledgeBase) {
      parts.push('\nKey Insights:');
      context.intelligence.knowledgeBase.slice(0, 5).forEach((snippet: string) => {
        parts.push(`  - ${snippet}`);
      });
    }

    return parts.join('\n');
  }

  /**
   * Get model configuration with fallback
   */
  private getModelConfig(preference?: string): ModelConfig {
    if (preference && this.defaultModels[preference]) {
      return this.defaultModels[preference];
    }

    if (this.openaiClient) {
      return this.defaultModels['gpt-4o'];
    }

    if (this.anthropicClient) {
      return this.defaultModels['claude-3-5-sonnet'];
    }

    throw new Error('No LLM providers available');
  }

  /**
   * Generate fallback analysis when LLM unavailable
   */
  private generateFallbackAnalysis(context: ReportContext): string {
    const parts: string[] = ['# System Analysis (Fallback Mode)\n'];

    if (context.data.workOrders) {
      const critical = context.data.workOrders.filter(wo => wo.priority === 'critical').length;
      const urgent = context.data.workOrders.filter(wo => wo.priority === 'urgent').length;
      
      parts.push(`## Work Orders Summary`);
      parts.push(`- Critical: ${critical}`);
      parts.push(`- Urgent: ${urgent}`);
      parts.push(`- Total: ${context.data.workOrders.length}\n`);
    }

    parts.push('Note: Advanced AI analysis unavailable. This is a basic statistical summary.');

    return parts.join('\n');
  }
}

export const enhancedLLM = new EnhancedLLMService();
