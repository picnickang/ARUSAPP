import { eq, and, desc, inArray } from "drizzle-orm";
import { 
  pdmBaseline, 
  pdmAlerts, 
  PdmBaseline, 
  PdmAlert, 
  InsertPdmBaseline, 
  InsertPdmAlert 
} from "../shared/schema.js";
import { IStorage } from "./storage.js";
import { 
  extractBearingFeatures, 
  extractPumpFeatures, 
  zScore, 
  severityFromZ, 
  clampSigma,
  BearingFeatures,
  PumpFeatures 
} from "./pdm-features.js";

/**
 * PdM Pack v1 - Service Layer
 * Comprehensive predictive maintenance with statistical baseline monitoring
 */

export interface BaselinePoint {
  vesselName: string;
  assetId: string;
  assetClass: 'bearing' | 'pump';
  features: Record<string, number>;
}

export interface AnalysisResult {
  features: Record<string, number>;
  scores: Record<string, number>; // Z-scores
  severity: 'info' | 'warn' | 'high';
  worstZ: number;
  explanation: any;
}

export interface AlertRecord {
  vesselName: string;
  assetId: string;
  assetClass: 'bearing' | 'pump';
  features: Record<string, number>;
  scores: Record<string, number>;
  severity: 'info' | 'warn' | 'high';
  explanation: any;
}

export class PdmPackService {
  constructor(private storage: IStorage) {}

  /**
   * Upsert baseline point using Welford's online algorithm
   * Maintains statistical accuracy without storing all historical data
   */
  async upsertBaselinePoint(orgId: string, point: BaselinePoint): Promise<void> {
    console.log(`[PdM Service] Upserting baseline for ${point.assetClass} ${point.assetId} with ${Object.keys(point.features).length} features`);

    const db = (this.storage as any).db;
    if (!db) {
      throw new Error("Database not available for PdM operations");
    }

    // Process each feature individually with Welford's algorithm
    for (const [feature, value] of Object.entries(point.features)) {
      if (!isFinite(value)) continue; // Skip invalid values

      // Get existing baseline
      const existing = await db
        .select()
        .from(pdmBaseline)
        .where(
          and(
            eq(pdmBaseline.orgId, orgId),
            eq(pdmBaseline.vesselName, point.vesselName),
            eq(pdmBaseline.assetId, point.assetId),
            eq(pdmBaseline.feature, feature)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        // First data point - initialize baseline
        await db.insert(pdmBaseline).values({
          orgId,
          vesselName: point.vesselName,
          assetId: point.assetId,
          assetClass: point.assetClass,
          feature,
          mu: value,
          sigma: 0,
          n: 1
        });
      } else {
        // Update using Welford's algorithm for numerical stability
        const current = existing[0];
        const n0 = current.n;
        const mu0 = current.mu;
        const sigma0 = current.sigma;
        
        // Online update formulas
        const n = n0 + 1;
        const mu = mu0 + (value - mu0) / n;
        
        // Update variance using Welford's algorithm
        const sigma = n0 > 0 
          ? Math.sqrt(((n0 - 1) * Math.pow(sigma0, 2) + (value - mu0) * (value - mu)) / Math.max(1, n - 1))
          : 0;

        await db
          .update(pdmBaseline)
          .set({ mu, sigma, n, updatedAt: new Date() })
          .where(eq(pdmBaseline.id, current.id));
      }
    }
  }

  /**
   * Evaluate features against established baselines
   * Returns Z-scores and severity assessment
   */
  async evaluateAgainstBaseline(
    orgId: string,
    vesselName: string,
    assetId: string,
    assetClass: 'bearing' | 'pump',
    features: Record<string, number>
  ): Promise<AnalysisResult> {
    const db = (this.storage as any).db;
    if (!db) {
      throw new Error("Database not available for PdM operations");
    }

    const featureNames = Object.keys(features);
    console.log(`[PdM Service] Evaluating ${featureNames.length} features against baseline for ${assetClass} ${assetId}`);

    // Get baselines for all features
    const baselines = await db
      .select()
      .from(pdmBaseline)
      .where(
        and(
          eq(pdmBaseline.orgId, orgId),
          eq(pdmBaseline.vesselName, vesselName),
          eq(pdmBaseline.assetId, assetId),
          inArray(pdmBaseline.feature, featureNames)
        )
      );

    const baselineMap = new Map(baselines.map(b => [b.feature, b]));
    const scores: Record<string, number> = {};

    // Calculate Z-scores for features with baselines
    for (const [feature, value] of Object.entries(features)) {
      const baseline = baselineMap.get(feature);
      if (baseline) {
        const z = clampSigma(zScore(baseline.mu, baseline.sigma, value));
        scores[feature] = z;
      }
    }

    // Determine overall severity from worst Z-score
    const worstZ = Object.values(scores).reduce((max, z) => Math.max(max, Math.abs(z)), 0);
    const severity = severityFromZ(worstZ);

    return {
      features,
      scores,
      severity,
      worstZ,
      explanation: {
        type: assetClass,
        baseline_features: baselines.length,
        total_features: featureNames.length,
        analysis_method: 'Statistical baseline μ±kσ with Welford updates'
      }
    };
  }

  /**
   * Analyze bearing vibration data and compare against baselines
   */
  async analyzeBearing(params: {
    orgId: string;
    vesselName: string;
    assetId: string;
    fs: number;           // sampling frequency
    rpm?: number;         // shaft RPM
    series: number[];     // vibration time series
    spectrum?: {          // optional pre-computed spectrum
      freq: number[];
      mag: number[];
    };
    autoBaseline?: boolean; // automatically update baseline if analysis looks good
  }): Promise<AnalysisResult> {
    const { orgId, vesselName, assetId, fs, rpm, series, spectrum, autoBaseline = false } = params;
    
    console.log(`[PdM Service] Analyzing bearing ${assetId} with ${series.length} samples at ${fs}Hz`);

    // Extract comprehensive bearing features
    const bearingFeatures = extractBearingFeatures({ fs, rpm, series, spectrum });
    
    // Convert to generic feature map
    const features = {
      rms: bearingFeatures.rms,
      kurtosis: bearingFeatures.kurtosis,
      env_rms: bearingFeatures.env_rms,
      iso_10_100: bearingFeatures.iso_10_100,
      order_1x: bearingFeatures.order_1x,
      order_2x: bearingFeatures.order_2x
    };

    // Evaluate against existing baselines
    const analysis = await this.evaluateAgainstBaseline(
      orgId, vesselName, assetId, 'bearing', features
    );

    // Auto-baseline if requested and analysis looks good (low Z-scores)
    if (autoBaseline && analysis.worstZ < 2.0) {
      await this.upsertBaselinePoint(orgId, {
        vesselName,
        assetId,
        assetClass: 'bearing',
        features
      });
      console.log(`[PdM Service] Auto-baseline updated for bearing ${assetId}`);
    }

    // Record alert if severity is elevated
    if (analysis.severity !== 'info') {
      await this.recordAlert(orgId, {
        vesselName,
        assetId,
        assetClass: 'bearing',
        features,
        scores: analysis.scores,
        severity: analysis.severity,
        explanation: {
          ...analysis.explanation,
          rpm,
          fs,
          samples: series.length,
          trigger: 'bearing_vibration_analysis'
        }
      });
    }

    return analysis;
  }

  /**
   * Analyze pump process parameters and compare against baselines
   */
  async analyzePump(params: {
    orgId: string;
    vesselName: string;
    assetId: string;
    flow?: number[];        // flow measurements
    pressure?: number[];    // pressure measurements
    current?: number[];     // current measurements
    fs?: number;           // sampling frequency for vibration
    vibSeries?: number[];  // vibration data for cavitation detection
    autoBaseline?: boolean; // automatically update baseline
  }): Promise<AnalysisResult> {
    const { 
      orgId, vesselName, assetId, flow, pressure, current, 
      fs, vibSeries, autoBaseline = false 
    } = params;

    const sampleCount = Math.max(
      flow?.length || 0,
      pressure?.length || 0,
      current?.length || 0,
      vibSeries?.length || 0
    );

    console.log(`[PdM Service] Analyzing pump ${assetId} with ${sampleCount} process samples`);

    // Extract pump health features
    const pumpFeatures = extractPumpFeatures({
      flow,
      pressure,
      current,
      fs,
      vib_series: vibSeries
    });

    // Convert to generic feature map (filter out NaN values)
    const features: Record<string, number> = {};
    Object.entries(pumpFeatures).forEach(([key, value]) => {
      if (isFinite(value)) {
        features[key] = value;
      }
    });

    if (Object.keys(features).length === 0) {
      throw new Error("No valid pump features extracted from provided data");
    }

    // Evaluate against existing baselines
    const analysis = await this.evaluateAgainstBaseline(
      orgId, vesselName, assetId, 'pump', features
    );

    // Auto-baseline if requested and analysis looks good
    if (autoBaseline && analysis.worstZ < 2.0) {
      await this.upsertBaselinePoint(orgId, {
        vesselName,
        assetId,
        assetClass: 'pump',
        features
      });
      console.log(`[PdM Service] Auto-baseline updated for pump ${assetId}`);
    }

    // Record alert if severity is elevated
    if (analysis.severity !== 'info') {
      await this.recordAlert(orgId, {
        vesselName,
        assetId,
        assetClass: 'pump',
        features,
        scores: analysis.scores,
        severity: analysis.severity,
        explanation: {
          ...analysis.explanation,
          data_sources: {
            flow: flow?.length || 0,
            pressure: pressure?.length || 0,
            current: current?.length || 0,
            vibration: vibSeries?.length || 0
          },
          trigger: 'pump_process_analysis'
        }
      });
    }

    return analysis;
  }

  /**
   * Record PdM alert to database
   */
  async recordAlert(orgId: string, alert: AlertRecord): Promise<void> {
    const db = (this.storage as any).db;
    if (!db) {
      throw new Error("Database not available for PdM operations");
    }

    console.log(`[PdM Service] Recording ${alert.severity} alert for ${alert.assetClass} ${alert.assetId}`);

    // For now, record one alert per analysis with the primary feature
    const primaryFeature = Object.keys(alert.features)[0];
    const primaryValue = alert.features[primaryFeature];
    const primaryScore = alert.scores[primaryFeature] || 0;

    await db.insert(pdmAlerts).values({
      orgId,
      vesselName: alert.vesselName,
      assetId: alert.assetId,
      assetClass: alert.assetClass,
      feature: primaryFeature,
      value: primaryValue,
      scoreZ: primaryScore,
      severity: alert.severity,
      explain: alert.explanation
    });
  }

  /**
   * Get recent PdM alerts for organization
   */
  async getRecentAlerts(orgId: string, limit: number = 200): Promise<PdmAlert[]> {
    const db = (this.storage as any).db;
    if (!db) {
      throw new Error("Database not available for PdM operations");
    }

    const alerts = await db
      .select()
      .from(pdmAlerts)
      .where(eq(pdmAlerts.orgId, orgId))
      .orderBy(desc(pdmAlerts.at))
      .limit(limit);

    return alerts;
  }

  /**
   * Get baseline statistics for asset
   */
  async getBaselineStats(
    orgId: string,
    vesselName: string,
    assetId: string
  ): Promise<PdmBaseline[]> {
    const db = (this.storage as any).db;
    if (!db) {
      throw new Error("Database not available for PdM operations");
    }

    const baselines = await db
      .select()
      .from(pdmBaseline)
      .where(
        and(
          eq(pdmBaseline.orgId, orgId),
          eq(pdmBaseline.vesselName, vesselName),
          eq(pdmBaseline.assetId, assetId)
        )
      );

    return baselines;
  }

  /**
   * Health check for PdM service
   */
  async healthCheck(): Promise<{ status: string; features: string[] }> {
    return {
      status: 'operational',
      features: [
        'statistical_baselines',
        'bearing_vibration_analysis',
        'pump_process_monitoring',
        'z_score_alerting',
        'welford_updates'
      ]
    };
  }
}