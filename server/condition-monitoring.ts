import { 
  type OilAnalysis, 
  type InsertOilAnalysis,
  type WearParticleAnalysis,
  type InsertWearParticleAnalysis,
  type ConditionMonitoring,
  type InsertConditionMonitoring,
  type OilChangeRecord,
  type InsertOilChangeRecord
} from "@shared/schema";

/**
 * Advanced Condition-Based Maintenance Engine
 * 
 * Provides comprehensive condition monitoring through:
 * - Oil analysis (tribology, contamination, degradation)
 * - Wear particle analysis (ferrography, morphology)
 * - Integrated condition assessment
 * - Predictive maintenance recommendations
 */

export interface OilConditionAssessment {
  overallScore: number; // 0-100, 100 = excellent condition
  viscosityScore: number;
  contaminationScore: number;
  wearMetalsScore: number;
  additiveScore: number;
  oxidationScore: number;
  condition: 'normal' | 'marginal' | 'critical';
  primaryConcerns: string[];
  recommendations: string[];
  changeRecommended: boolean;
  estimatedRemainingLife: number; // days
}

export interface WearAssessment {
  overallScore: number; // 0-100, 100 = excellent condition
  wearSeverity: 'normal' | 'moderate' | 'high' | 'severe';
  dominantWearMode: 'adhesive' | 'abrasive' | 'fatigue' | 'corrosive' | 'normal';
  affectedComponents: string[];
  wearTrend: 'improving' | 'stable' | 'degrading';
  recommendations: string[];
  inspectionRequired: boolean;
  estimatedComponentLife: number; // days
}

export interface ConditionTrend {
  equipmentId: string;
  timespan: 'last_30_days' | 'last_90_days' | 'last_year';
  oilConditionTrend: 'improving' | 'stable' | 'degrading';
  wearTrend: 'improving' | 'stable' | 'degrading';
  overallTrend: 'improving' | 'stable' | 'degrading';
  trendConfidence: number; // 0-1
  keyIndicators: Array<{
    parameter: string;
    value: number;
    trend: 'improving' | 'stable' | 'degrading';
    significance: 'low' | 'medium' | 'high';
  }>;
}

/**
 * Assess oil condition based on analysis parameters
 */
export function assessOilCondition(oilAnalysis: OilAnalysis): OilConditionAssessment {
  let overallScore = 100;
  let viscosityScore = 100;
  let contaminationScore = 100;
  let wearMetalsScore = 100;
  let additiveScore = 100;
  let oxidationScore = 100;
  
  const primaryConcerns: string[] = [];
  const recommendations: string[] = [];
  let changeRecommended = false;

  // Viscosity assessment (±15% is acceptable)
  if (oilAnalysis.viscosity40C && oilAnalysis.viscosityIndex) {
    if (Math.abs(oilAnalysis.viscosityIndex - 100) > 15) {
      viscosityScore = Math.max(0, 100 - Math.abs(oilAnalysis.viscosityIndex - 100) * 2);
      if (viscosityScore < 70) {
        primaryConcerns.push("Viscosity degradation");
        recommendations.push("Monitor viscosity trend, consider oil change");
      }
    }
  }

  // Contamination assessment
  if (oilAnalysis.waterContent && oilAnalysis.waterContent > 0.05) {
    const waterPenalty = Math.min(50, oilAnalysis.waterContent * 1000);
    contaminationScore -= waterPenalty;
    primaryConcerns.push("Water contamination");
    recommendations.push("Investigate water ingress sources");
    if (oilAnalysis.waterContent > 0.1) changeRecommended = true;
  }

  if (oilAnalysis.fuelDilution && oilAnalysis.fuelDilution > 2.0) {
    const fuelPenalty = Math.min(30, oilAnalysis.fuelDilution * 5);
    contaminationScore -= fuelPenalty;
    primaryConcerns.push("Fuel contamination");
    recommendations.push("Check fuel system for leaks");
    if (oilAnalysis.fuelDilution > 5.0) changeRecommended = true;
  }

  // Wear metals assessment (typical engine limits in ppm)
  const wearMetalLimits = {
    iron: 100,
    chromium: 20,
    aluminum: 30,
    copper: 30,
    lead: 30,
    tin: 20
  };

  let wearMetalExcess = 0;
  Object.entries(wearMetalLimits).forEach(([metal, limit]) => {
    const value = oilAnalysis[metal as keyof typeof wearMetalLimits] as number;
    if (value && value > limit) {
      const excess = (value - limit) / limit;
      wearMetalExcess += excess;
      if (excess > 0.5) {
        primaryConcerns.push(`Elevated ${metal} levels`);
        recommendations.push(`Investigate ${metal} source component wear`);
      }
    }
  });

  wearMetalsScore = Math.max(0, 100 - wearMetalExcess * 20);
  if (wearMetalExcess > 2.0) changeRecommended = true;

  // Additive depletion assessment
  if (oilAnalysis.calcium && oilAnalysis.zinc) {
    // Typical additive levels for marine lubricants
    const calciumDepletion = Math.max(0, (1000 - (oilAnalysis.calcium || 0)) / 1000);
    const zincDepletion = Math.max(0, (800 - (oilAnalysis.zinc || 0)) / 800);
    
    const depletionPenalty = (calciumDepletion + zincDepletion) * 50;
    additiveScore -= depletionPenalty;
    
    if (depletionPenalty > 20) {
      primaryConcerns.push("Additive depletion");
      recommendations.push("Monitor additive levels, plan oil change");
    }
  }

  // Oxidation assessment
  if (oilAnalysis.oxidation && oilAnalysis.oxidation > 20) {
    const oxidationPenalty = Math.min(40, (oilAnalysis.oxidation - 20) / 2);
    oxidationScore -= oxidationPenalty;
    primaryConcerns.push("Oil oxidation");
    recommendations.push("Monitor oxidation trend, improve oil cooling");
    if (oilAnalysis.oxidation > 50) changeRecommended = true;
  }

  // Acid number assessment
  if (oilAnalysis.acidNumber && oilAnalysis.acidNumber > 2.5) {
    const acidPenalty = Math.min(30, (oilAnalysis.acidNumber - 2.5) * 10);
    oxidationScore -= acidPenalty;
    primaryConcerns.push("Elevated acid number");
    recommendations.push("Consider oil change due to acid buildup");
    if (oilAnalysis.acidNumber > 4.0) changeRecommended = true;
  }

  // Calculate overall score
  overallScore = Math.round(
    (viscosityScore * 0.25 + 
     contaminationScore * 0.25 + 
     wearMetalsScore * 0.25 + 
     additiveScore * 0.15 + 
     oxidationScore * 0.10)
  );

  // Determine condition
  let condition: 'normal' | 'marginal' | 'critical';
  if (overallScore >= 80) condition = 'normal';
  else if (overallScore >= 60) condition = 'marginal';
  else condition = 'critical';

  // Estimate remaining oil life
  let estimatedRemainingLife = 365; // Default 1 year
  if (condition === 'critical') estimatedRemainingLife = 30;
  else if (condition === 'marginal') estimatedRemainingLife = 90;
  else if (oilAnalysis.serviceHours && oilAnalysis.serviceHours > 500) {
    // Adjust based on service hours (typical oil change at 1000 hours)
    const hoursRemaining = Math.max(0, 1000 - oilAnalysis.serviceHours);
    estimatedRemainingLife = Math.min(estimatedRemainingLife, hoursRemaining * 0.5); // Assume 0.5 days per hour
  }

  return {
    overallScore,
    viscosityScore: Math.round(viscosityScore),
    contaminationScore: Math.round(contaminationScore),
    wearMetalsScore: Math.round(wearMetalsScore),
    additiveScore: Math.round(additiveScore),
    oxidationScore: Math.round(oxidationScore),
    condition,
    primaryConcerns,
    recommendations,
    changeRecommended,
    estimatedRemainingLife: Math.round(estimatedRemainingLife)
  };
}

/**
 * Assess wear condition based on ferrography analysis
 */
export function assessWearCondition(wearAnalysis: WearParticleAnalysis): WearAssessment {
  let overallScore = 100;
  const affectedComponents: string[] = [];
  const recommendations: string[] = [];
  let inspectionRequired = false;

  // PQ Index assessment (typical limits)
  const pqIndex = wearAnalysis.pqIndex || 0;
  let severityScore = 100;
  
  if (pqIndex > 50) {
    severityScore = Math.max(0, 100 - (pqIndex - 50) * 2);
    if (pqIndex > 100) {
      recommendations.push("High wear particle concentration - immediate investigation required");
      inspectionRequired = true;
    }
  }

  // Wear particle morphology assessment
  let wearModeScore = 100;
  let dominantWearMode: 'adhesive' | 'abrasive' | 'fatigue' | 'corrosive' | 'normal' = 'normal';

  if (wearAnalysis.cuttingParticles && wearAnalysis.cuttingParticles > 30) {
    dominantWearMode = 'abrasive';
    wearModeScore -= (wearAnalysis.cuttingParticles - 30) * 2;
    recommendations.push("High cutting particles indicate abrasive wear - check filtration");
  }

  if (wearAnalysis.fatigueParticles && wearAnalysis.fatigueParticles > 20) {
    dominantWearMode = 'fatigue';
    wearModeScore -= (wearAnalysis.fatigueParticles - 20) * 3;
    recommendations.push("Fatigue particles detected - examine bearing and gear surfaces");
    inspectionRequired = true;
  }

  if (wearAnalysis.slidingParticles && wearAnalysis.slidingParticles > 25) {
    dominantWearMode = 'adhesive';
    wearModeScore -= (wearAnalysis.slidingParticles - 25) * 2;
    recommendations.push("High sliding particles - check lubrication adequacy");
  }

  // Component-specific wear indicators
  if (wearAnalysis.bearingWear && wearAnalysis.bearingWear > 15) {
    affectedComponents.push("Bearings");
    recommendations.push("Elevated bearing wear indicators");
    inspectionRequired = true;
  }

  if (wearAnalysis.gearWear && wearAnalysis.gearWear > 20) {
    affectedComponents.push("Gears");
    recommendations.push("Gear wear particles detected - inspect gear teeth");
    inspectionRequired = true;
  }

  if (wearAnalysis.pumpWear && wearAnalysis.pumpWear > 10) {
    affectedComponents.push("Pump components");
    recommendations.push("Pump wear detected - check impeller and casing");
  }

  if (wearAnalysis.cylinderWear && wearAnalysis.cylinderWear > 25) {
    affectedComponents.push("Engine cylinders");
    recommendations.push("Cylinder wear particles - monitor engine condition");
  }

  // Calculate overall score
  overallScore = Math.round((severityScore + wearModeScore) / 2);

  // Determine wear severity
  let wearSeverity: 'normal' | 'moderate' | 'high' | 'severe';
  if (overallScore >= 85) wearSeverity = 'normal';
  else if (overallScore >= 70) wearSeverity = 'moderate';
  else if (overallScore >= 50) wearSeverity = 'high';
  else wearSeverity = 'severe';

  // Estimate component life
  let estimatedComponentLife = 5 * 365; // Default 5 years
  if (wearSeverity === 'severe') estimatedComponentLife = 180;
  else if (wearSeverity === 'high') estimatedComponentLife = 365;
  else if (wearSeverity === 'moderate') estimatedComponentLife = 2 * 365;

  return {
    overallScore,
    wearSeverity,
    dominantWearMode,
    affectedComponents,
    wearTrend: 'stable', // Would need historical data to determine
    recommendations,
    inspectionRequired,
    estimatedComponentLife
  };
}

/**
 * Generate integrated condition monitoring assessment
 * Task 8: Integrated DTC severity into CBM multi-factor scoring
 */
export function generateConditionAssessment(
  oilAnalysis: OilAnalysis,
  wearAnalysis?: WearParticleAnalysis,
  vibrationScore?: number,
  dtcScore?: number // New: DTC health score (0-100, 100 = no DTCs)
): InsertConditionMonitoring {
  const oilAssessment = assessOilCondition(oilAnalysis);
  const wearAssessment = wearAnalysis ? assessWearCondition(wearAnalysis) : null;

  // Calculate weighted overall score
  let overallScore = oilAssessment.overallScore;
  
  if (wearAssessment && dtcScore !== undefined) {
    // 4-factor scoring: oil (40%) + wear (30%) + vibration (15%) + DTC (15%)
    overallScore = Math.round(
      oilAssessment.overallScore * 0.4 + 
      wearAssessment.overallScore * 0.3 +
      (vibrationScore ?? 100) * 0.15 +
      dtcScore * 0.15
    );
  } else if (wearAssessment) {
    // 3-factor: oil (50%) + wear (35%) + DTC (15%) OR oil (60%) + wear (40%) if no DTC
    if (dtcScore !== undefined) {
      overallScore = Math.round(
        oilAssessment.overallScore * 0.5 + 
        wearAssessment.overallScore * 0.35 + 
        dtcScore * 0.15
      );
    } else {
      overallScore = Math.round(oilAssessment.overallScore * 0.6 + wearAssessment.overallScore * 0.4);
    }
  } else if (dtcScore !== undefined) {
    // 2-factor: oil (70%) + DTC (30%)
    overallScore = Math.round(oilAssessment.overallScore * 0.7 + dtcScore * 0.3);
  }
  
  // Legacy vibration integration (if no DTC score provided)
  if (vibrationScore !== undefined && dtcScore === undefined) {
    overallScore = Math.round(overallScore * 0.8 + vibrationScore * 0.2);
  }

  // Determine failure risk (DTC score heavily influences risk)
  let failureRisk: 'low' | 'medium' | 'high' | 'critical';
  if (dtcScore !== undefined && dtcScore < 30) {
    // Critical DTCs force high/critical risk regardless of other factors
    failureRisk = 'critical';
  } else if (overallScore >= 85) {
    failureRisk = 'low';
  } else if (overallScore >= 70) {
    failureRisk = 'medium';
  } else if (overallScore >= 50) {
    failureRisk = 'high';
  } else {
    failureRisk = 'critical';
  }

  // Determine maintenance action
  let maintenanceAction = 'monitor';
  let maintenanceUrgency: 'routine' | 'urgent' | 'immediate' = 'routine';
  
  if (oilAssessment.changeRecommended || (wearAssessment?.inspectionRequired)) {
    maintenanceAction = 'service';
    maintenanceUrgency = 'urgent';
  }
  
  // DTC-driven urgency escalation
  if (dtcScore !== undefined && dtcScore < 30) {
    maintenanceAction = 'repair';
    maintenanceUrgency = 'immediate';
  } else if (dtcScore !== undefined && dtcScore < 50) {
    maintenanceAction = 'service';
    maintenanceUrgency = 'urgent';
  }
  
  if (failureRisk === 'critical') {
    maintenanceAction = 'repair';
    maintenanceUrgency = 'immediate';
  }

  // Estimate time to failure (DTCs reduce TTF significantly)
  const oilLife = oilAssessment.estimatedRemainingLife;
  const componentLife = wearAssessment?.estimatedComponentLife || 5 * 365;
  let estimatedTtf = Math.min(oilLife, componentLife);
  
  // Critical DTCs dramatically reduce estimated TTF
  if (dtcScore !== undefined && dtcScore < 30) {
    estimatedTtf = Math.min(estimatedTtf, 7); // Max 7 days with critical DTCs
  } else if (dtcScore !== undefined && dtcScore < 50) {
    estimatedTtf = Math.min(estimatedTtf, 30); // Max 30 days with severe DTCs
  }

  // Combine recommendations
  const allRecommendations = [
    ...oilAssessment.recommendations,
    ...(wearAssessment?.recommendations || [])
  ];
  
  // Add DTC-specific recommendations
  if (dtcScore !== undefined && dtcScore < 50) {
    allRecommendations.push('Active diagnostic trouble codes detected - investigate immediately');
  }

  // Build assessment method description
  let assessmentMethod = 'oil';
  if (wearAssessment && dtcScore !== undefined) {
    assessmentMethod = 'combined_with_dtc';
  } else if (wearAssessment) {
    assessmentMethod = 'combined';
  } else if (dtcScore !== undefined) {
    assessmentMethod = 'oil_with_dtc';
  }

  return {
    orgId: oilAnalysis.orgId,
    equipmentId: oilAnalysis.equipmentId,
    assessmentDate: new Date(),
    oilConditionScore: oilAssessment.overallScore,
    wearConditionScore: wearAssessment?.overallScore,
    vibrationScore,
    thermalScore: dtcScore, // Store DTC score in thermalScore field (repurposing existing field)
    overallConditionScore: overallScore,
    trend: 'stable', // Would need historical data
    trendConfidence: dtcScore !== undefined ? 0.9 : 0.8, // Higher confidence with DTC data
    failureRisk,
    estimatedTtf,
    confidenceInterval: 0.2,
    maintenanceAction,
    maintenanceUrgency,
    maintenanceWindow: estimatedTtf * 0.8, // Schedule before failure
    costEstimate: undefined, // Could be calculated based on maintenance type
    lastOilAnalysisId: oilAnalysis.id,
    lastWearAnalysisId: wearAnalysis?.id,
    lastVibrationAnalysisId: undefined,
    assessmentMethod,
    analysisSummary: `Oil condition: ${oilAssessment.condition}${wearAssessment ? `, Wear severity: ${wearAssessment.wearSeverity}` : ''}${dtcScore !== undefined ? `, DTC health: ${dtcScore}/100` : ''}`,
    recommendations: allRecommendations.join('; '),
    analystId: 'system',
    analysisMetadata: {
      oilAssessment,
      wearAssessment,
      dtcScore,
      assessmentTimestamp: new Date().toISOString()
    }
  };
}

/**
 * Oil quality scoring based on marine industry standards
 */
export function calculateOilQualityScore(oilAnalysis: OilAnalysis): number {
  const assessment = assessOilCondition(oilAnalysis);
  return assessment.overallScore;
}

/**
 * Wear severity scoring based on ferrography standards
 */
export function calculateWearScore(wearAnalysis: WearParticleAnalysis): number {
  const assessment = assessWearCondition(wearAnalysis);
  return assessment.overallScore;
}

/**
 * Generate maintenance recommendations based on condition monitoring data
 */
export function generateMaintenanceRecommendations(
  conditionData: ConditionMonitoring[]
): Array<{
  equipmentId: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  action: string;
  reasoning: string;
  estimatedCost: number;
  timeframe: string;
}> {
  return conditionData.map(condition => {
    let priority: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let estimatedCost = 1000; // Base cost
    let timeframe = '30 days';

    if (condition.failureRisk === 'critical') {
      priority = 'critical';
      estimatedCost = 5000;
      timeframe = 'immediate';
    } else if (condition.failureRisk === 'high') {
      priority = 'high';
      estimatedCost = 3000;
      timeframe = '1 week';
    } else if (condition.failureRisk === 'medium') {
      priority = 'medium';
      estimatedCost = 2000;
      timeframe = '2 weeks';
    }

    return {
      equipmentId: condition.equipmentId,
      priority,
      action: condition.maintenanceAction || 'inspect',
      reasoning: condition.recommendations || 'Routine maintenance',
      estimatedCost,
      timeframe
    };
  });
}