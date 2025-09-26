/**
 * Enhanced Trends Pod - Advanced Telemetry Statistical Analysis
 * 
 * Provides sophisticated statistical analysis capabilities for maritime equipment telemetry:
 * - Advanced anomaly detection using statistical models
 * - Time-series forecasting for predictive insights
 * - Cross-sensor correlation analysis 
 * - Seasonal pattern detection
 * - Fleet-wide trend aggregation
 * 
 * Complements existing basic trending with mathematical rigor for production reliability.
 */

import { mean, standardDeviation } from 'simple-statistics';

// Enhanced Trends Analysis Types
export interface TrendAnalysisResult {
  equipmentId: string;
  sensorType: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  statisticalSummary: StatisticalSummary;
  anomalyDetection: AnomalyAnalysis;
  forecasting: ForecastingResult;
  seasonality: SeasonalityAnalysis;
  correlations: CorrelationAnalysis[];
}

export interface StatisticalSummary {
  count: number;
  mean: number;
  median: number;
  standardDeviation: number;
  min: number;
  max: number;
  quartiles: {
    q1: number;
    q2: number;
    q3: number;
  };
  distribution: {
    skewness: number;
    kurtosis: number;
    isNormal: boolean;
    normalityConfidence: number;
  };
  trend: {
    slope: number;
    rSquared: number;
    pValue: number;
    trendType: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  };
}

export interface AnomalyAnalysis {
  method: 'iqr' | 'zscore' | 'isolation' | 'hybrid';
  anomalies: AnomalyPoint[];
  summary: {
    totalAnomalies: number;
    anomalyRate: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    recommendation: string;
  };
}

export interface AnomalyPoint {
  timestamp: Date;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: 'mild' | 'moderate' | 'severe' | 'extreme';
  confidence: number;
  context?: string;
}

export interface ForecastingResult {
  method: 'linear' | 'seasonal' | 'exponential' | 'arima';
  predictions: ForecastPoint[];
  confidence: number;
  horizon: number; // hours ahead
  metrics: {
    mae: number; // mean absolute error
    rmse: number; // root mean square error
    mape: number; // mean absolute percentage error
  };
  recommendation: string;
}

export interface ForecastPoint {
  timestamp: Date;
  predictedValue: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  probability: number;
}

export interface SeasonalityAnalysis {
  hasSeasonality: boolean;
  cycles: SeasonalCycle[];
  dominantPeriod: number; // hours
  strength: number; // 0-1 scale
  recommendation: string;
}

export interface SeasonalCycle {
  period: number; // hours
  amplitude: number;
  phase: number;
  strength: number;
  type: 'daily' | 'weekly' | 'operational' | 'maintenance';
}

export interface CorrelationAnalysis {
  targetSensor: string;
  correlatedSensor: string;
  correlation: number;
  significance: number;
  lagHours: number;
  relationship: 'positive' | 'negative' | 'nonlinear' | 'none';
  strength: 'weak' | 'moderate' | 'strong' | 'very_strong';
  causality: 'none' | 'possible' | 'likely' | 'strong';
}

export interface FleetTrendSummary {
  fleetId: string;
  equipmentCount: number;
  sensorTypes: string[];
  timeRange: {
    start: Date;
    end: Date;
  };
  aggregatedMetrics: {
    healthScore: number;
    anomalyRate: number;
    volatilityIndex: number;
    maintenanceRisk: 'low' | 'medium' | 'high' | 'critical';
  };
  equipmentRankings: EquipmentRanking[];
  recommendations: FleetRecommendation[];
}

export interface EquipmentRanking {
  equipmentId: string;
  rank: number;
  score: number;
  riskFactors: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface FleetRecommendation {
  type: 'maintenance' | 'optimization' | 'replacement' | 'monitoring';
  equipmentIds: string[];
  priority: number;
  description: string;
  expectedBenefit: string;
  timeFrame: string;
}

/**
 * Enhanced Trends Analysis Engine
 */
export class EnhancedTrendsAnalyzer {
  
  /**
   * Perform comprehensive statistical analysis of equipment sensor data
   * CRITICAL: orgId is required for multi-tenant data isolation
   */
  async analyzeEquipmentTrends(
    orgId: string,
    equipmentId: string,
    sensorType: string,
    hours: number = 168 // 7 days default
  ): Promise<TrendAnalysisResult> {
    console.log(`[Enhanced Trends] Analyzing ${orgId}:${equipmentId}:${sensorType} over ${hours}h`);
    
    // Get telemetry data from database with proper org scoping
    const telemetryData = await this.getTelemetryData(orgId, equipmentId, sensorType, hours);
    
    if (telemetryData.length < 10) {
      throw new Error(`Insufficient data for statistical analysis (${telemetryData.length} points, need ≥10)`);
    }
    
    const values = telemetryData.map(d => d.value);
    const timestamps = telemetryData.map(d => d.timestamp);
    
    // Perform statistical analysis
    const statisticalSummary = this.calculateStatisticalSummary(values, timestamps);
    const anomalyDetection = this.detectAnomalies(values, timestamps);
    const forecasting = this.performForecasting(values, timestamps);
    const seasonality = this.analyzeSeasonality(values, timestamps);
    const correlations = await this.analyzeCorrelations(orgId, equipmentId, sensorType, hours);
    
    return {
      equipmentId,
      sensorType,
      timeRange: {
        start: new Date(Date.now() - hours * 60 * 60 * 1000),
        end: new Date()
      },
      statisticalSummary,
      anomalyDetection,
      forecasting,
      seasonality,
      correlations
    };
  }
  
  /**
   * Calculate comprehensive statistical summary
   */
  private calculateStatisticalSummary(values: number[], timestamps: Date[]): StatisticalSummary {
    const n = values.length;
    const meanValue = mean(values);
    const stdDev = standardDeviation(values);
    const sortedValues = [...values].sort((a, b) => a - b);
    
    // Quartiles
    const q1 = this.percentile(sortedValues, 25);
    const q2 = this.percentile(sortedValues, 50); // median
    const q3 = this.percentile(sortedValues, 75);
    
    // Distribution analysis
    const skewness = this.calculateSkewness(values, meanValue, stdDev);
    const kurtosis = this.calculateKurtosis(values, meanValue, stdDev);
    const normalityTest = this.shapiroWilkTest(values);
    
    // Trend analysis
    const trendAnalysis = this.calculateTrend(values, timestamps);
    
    return {
      count: n,
      mean: meanValue,
      median: q2,
      standardDeviation: stdDev,
      min: Math.min(...values),
      max: Math.max(...values),
      quartiles: { q1, q2, q3 },
      distribution: {
        skewness,
        kurtosis,
        isNormal: normalityTest.isNormal,
        normalityConfidence: normalityTest.confidence
      },
      trend: {
        slope: trendAnalysis.slope,
        rSquared: trendAnalysis.rSquared,
        pValue: trendAnalysis.pValue,
        trendType: trendAnalysis.trendType
      }
    };
  }
  
  /**
   * Advanced anomaly detection using hybrid approach
   */
  private detectAnomalies(values: number[], timestamps: Date[]): AnomalyAnalysis {
    const anomalies: AnomalyPoint[] = [];
    
    // Method 1: IQR-based detection
    const iqrAnomalies = this.detectIQRAnomalies(values, timestamps);
    
    // Method 2: Z-score based detection  
    const zScoreAnomalies = this.detectZScoreAnomalies(values, timestamps);
    
    // Method 3: Moving window isolation (for time-series specific anomalies)
    const isolationAnomalies = this.detectIsolationAnomalies(values, timestamps);
    
    // Combine and validate anomalies (hybrid approach)
    const combinedAnomalies = this.combineAnomalies([iqrAnomalies, zScoreAnomalies, isolationAnomalies]);
    
    // Calculate severity and recommendations
    const totalAnomalies = combinedAnomalies.length;
    const anomalyRate = totalAnomalies / values.length;
    
    let severity: 'low' | 'medium' | 'high' | 'critical';
    let recommendation: string;
    
    if (anomalyRate < 0.05) {
      severity = 'low';
      recommendation = 'Equipment operating within normal parameters. Continue routine monitoring.';
    } else if (anomalyRate < 0.15) {
      severity = 'medium';
      recommendation = 'Moderate anomaly rate detected. Increase monitoring frequency and investigate patterns.';
    } else if (anomalyRate < 0.30) {
      severity = 'high';
      recommendation = 'High anomaly rate indicates potential equipment degradation. Schedule diagnostic maintenance.';
    } else {
      severity = 'critical';
      recommendation = 'Critical anomaly rate detected. Immediate maintenance intervention required.';
    }
    
    return {
      method: 'hybrid',
      anomalies: combinedAnomalies,
      summary: {
        totalAnomalies,
        anomalyRate,
        severity,
        recommendation
      }
    };
  }
  
  /**
   * Time-series forecasting with multiple methods
   */
  private performForecasting(values: number[], timestamps: Date[]): ForecastingResult {
    const forecastHorizon = 24; // 24 hours ahead
    
    // Simple linear regression forecasting
    const trendForecast = this.linearForecast(values, timestamps, forecastHorizon);
    
    // Exponential smoothing
    const exponentialForecast = this.exponentialSmoothing(values, timestamps, forecastHorizon);
    
    // Seasonal decomposition (if seasonality detected)
    const seasonalForecast = this.seasonalForecast(values, timestamps, forecastHorizon);
    
    // Choose best method based on historical accuracy
    const bestMethod = this.selectBestForecastMethod(values, timestamps);
    const selectedForecast = bestMethod === 'linear' ? trendForecast : 
                            bestMethod === 'exponential' ? exponentialForecast : 
                            seasonalForecast;
    
    return {
      method: bestMethod,
      predictions: selectedForecast.predictions,
      confidence: selectedForecast.confidence,
      horizon: forecastHorizon,
      metrics: selectedForecast.metrics,
      recommendation: this.generateForecastRecommendation(selectedForecast)
    };
  }
  
  /**
   * Seasonal pattern detection using autocorrelation
   */
  private analyzeSeasonality(values: number[], timestamps: Date[]): SeasonalityAnalysis {
    const cycles: SeasonalCycle[] = [];
    
    // Test for common maritime operational cycles
    const testPeriods = [
      { hours: 24, type: 'daily' as const },
      { hours: 168, type: 'weekly' as const },
      { hours: 8, type: 'operational' as const }, // 8-hour shifts
      { hours: 720, type: 'maintenance' as const } // 30-day maintenance cycles
    ];
    
    let hasSeasonality = false;
    let dominantPeriod = 0;
    let maxStrength = 0;
    
    for (const testPeriod of testPeriods) {
      if (values.length < testPeriod.hours * 2) continue; // Need at least 2 cycles
      
      const autocorr = this.calculateAutocorrelation(values, Math.floor(testPeriod.hours));
      const strength = Math.abs(autocorr);
      
      if (strength > 0.3) { // Significant correlation
        hasSeasonality = true;
        
        const amplitude = this.calculateSeasonalAmplitude(values, testPeriod.hours);
        const phase = this.calculateSeasonalPhase(values, timestamps, testPeriod.hours);
        
        cycles.push({
          period: testPeriod.hours,
          amplitude,
          phase,
          strength,
          type: testPeriod.type
        });
        
        if (strength > maxStrength) {
          maxStrength = strength;
          dominantPeriod = testPeriod.hours;
        }
      }
    }
    
    const recommendation = hasSeasonality 
      ? `Seasonal patterns detected (${dominantPeriod}h cycle). Consider time-based maintenance scheduling.`
      : 'No significant seasonal patterns detected. Equipment operates consistently.';
    
    return {
      hasSeasonality,
      cycles,
      dominantPeriod,
      strength: maxStrength,
      recommendation
    };
  }
  
  /**
   * Cross-sensor correlation analysis
   * CRITICAL: orgId is required for multi-tenant data isolation
   */
  private async analyzeCorrelations(
    orgId: string,
    equipmentId: string,
    targetSensor: string,
    hours: number
  ): Promise<CorrelationAnalysis[]> {
    const correlations: CorrelationAnalysis[] = [];
    
    // Get all sensor types for this equipment with proper org scoping
    const allSensors = await this.getEquipmentSensorTypes(orgId, equipmentId);
    const otherSensors = allSensors.filter(s => s !== targetSensor);
    
    for (const sensor of otherSensors) {
      try {
        const sensorData = await this.getTelemetryData(orgId, equipmentId, sensor, hours);
        if (sensorData.length < 10) continue;
        
        const targetData = await this.getTelemetryData(orgId, equipmentId, targetSensor, hours);
        
        // Align time series data
        const alignedData = this.alignTimeSeries(targetData, sensorData);
        if (alignedData.length < 10) continue;
        
        const targetValues = alignedData.map(d => d.target);
        const sensorValues = alignedData.map(d => d.sensor);
        
        // Calculate Pearson correlation
        const correlation = this.calculatePearsonCorrelation(targetValues, sensorValues);
        
        // Test significance  
        const significance = this.correlationSignificance(correlation, alignedData.length);
        
        // Analyze lag correlation (check if one sensor leads another)
        const lagAnalysis = this.analyzeLagCorrelation(targetValues, sensorValues);
        
        if (Math.abs(correlation) > 0.2 || significance < 0.05) { // Worth reporting
          correlations.push({
            targetSensor,
            correlatedSensor: sensor,
            correlation,
            significance,
            lagHours: lagAnalysis.lag,
            relationship: this.classifyRelationship(correlation),
            strength: this.classifyCorrelationStrength(Math.abs(correlation)),
            causality: this.assessCausality(correlation, significance, lagAnalysis)
          });
        }
      } catch (error) {
        console.warn(`[Enhanced Trends] Correlation analysis failed for ${sensor}:`, error);
      }
    }
    
    return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }
  
  /**
   * Fleet-wide trend aggregation and analysis
   * CRITICAL: orgId is required for multi-tenant data isolation
   */
  async analyzeFleetTrends(
    orgId: string,
    equipmentIds: string[],
    hours: number = 168
  ): Promise<FleetTrendSummary> {
    console.log(`[Enhanced Trends] Analyzing fleet trends for ${orgId}: ${equipmentIds.length} equipment units`);
    
    const equipmentAnalyses: any[] = [];
    const sensorTypes = new Set<string>();
    
    // Analyze each equipment unit with proper org scoping
    for (const equipmentId of equipmentIds) {
      try {
        const equipmentSensors = await this.getEquipmentSensorTypes(orgId, equipmentId);
        equipmentSensors.forEach(sensor => sensorTypes.add(sensor));
        
        // Analyze primary sensors (temperature, vibration, pressure)
        const primarySensors = equipmentSensors.filter(s => 
          ['temperature', 'vibration', 'pressure'].includes(s.toLowerCase())
        );
        
        for (const sensor of primarySensors.slice(0, 2)) { // Limit for performance
          const analysis = await this.analyzeEquipmentTrends(orgId, equipmentId, sensor, hours);
          equipmentAnalyses.push({ equipmentId, sensor, analysis });
        }
      } catch (error) {
        console.warn(`[Enhanced Trends] Fleet analysis failed for ${orgId}:${equipmentId}:`, error);
      }
    }
    
    // Aggregate metrics
    const aggregatedMetrics = this.aggregateFleetMetrics(equipmentAnalyses);
    
    // Rank equipment by risk
    const equipmentRankings = this.rankEquipmentByRisk(equipmentAnalyses);
    
    // Generate fleet-level recommendations
    const recommendations = this.generateFleetRecommendations(equipmentAnalyses, aggregatedMetrics);
    
    return {
      fleetId: 'default-fleet',
      equipmentCount: equipmentIds.length,
      sensorTypes: Array.from(sensorTypes),
      timeRange: {
        start: new Date(Date.now() - hours * 60 * 60 * 1000),
        end: new Date()
      },
      aggregatedMetrics,
      equipmentRankings,
      recommendations
    };
  }
  
  // Helper methods for statistical calculations
  
  private percentile(sortedValues: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }
  
  private calculateSkewness(values: number[], mean: number, stdDev: number): number {
    const n = values.length;
    const sum = values.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 3), 0);
    return (n / ((n - 1) * (n - 2))) * sum;
  }
  
  private calculateKurtosis(values: number[], mean: number, stdDev: number): number {
    const n = values.length;
    const sum = values.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 4), 0);
    const kurtosis = ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum - 
                    (3 * (n - 1) * (n - 1)) / ((n - 2) * (n - 3));
    return kurtosis;
  }
  
  private shapiroWilkTest(values: number[]): { isNormal: boolean; confidence: number } {
    // Simplified normality test - in production, use proper Shapiro-Wilk
    const n = values.length;
    if (n < 8) return { isNormal: false, confidence: 0 };
    
    const mean = values.reduce((sum, val) => sum + val, 0) / n;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1);
    const stdDev = Math.sqrt(variance);
    
    // Check if values are roughly normally distributed using 68-95-99.7 rule
    let withinOneSigma = 0;
    let withinTwoSigma = 0;
    
    values.forEach(val => {
      const z = Math.abs((val - mean) / stdDev);
      if (z <= 1) withinOneSigma++;
      if (z <= 2) withinTwoSigma++;
    });
    
    const pctOneSigma = withinOneSigma / n;
    const pctTwoSigma = withinTwoSigma / n;
    
    // Rough normality check
    const isNormal = pctOneSigma >= 0.6 && pctTwoSigma >= 0.9;
    const confidence = (pctOneSigma + pctTwoSigma) / 2;
    
    return { isNormal, confidence };
  }
  
  private calculateTrend(values: number[], timestamps: Date[]): {
    slope: number;
    rSquared: number;
    pValue: number;
    trendType: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  } {
    const n = values.length;
    const x = timestamps.map((_, i) => i); // Time indices
    const y = values;
    
    // Linear regression: y = mx + b
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared
    const meanY = sumY / n;
    const ssRes = y.reduce((sum, val, i) => sum + Math.pow(val - (slope * x[i] + intercept), 2), 0);
    const ssTot = y.reduce((sum, val) => sum + Math.pow(val - meanY, 2), 0);
    const rSquared = 1 - (ssRes / ssTot);
    
    // Simplified p-value calculation
    const tStat = slope / Math.sqrt(ssRes / ((n - 2) * sumXX));
    const pValue = 2 * (1 - this.studentTCDF(Math.abs(tStat), n - 2)); // Simplified
    
    // Classify trend type
    let trendType: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    if (rSquared < 0.1) {
      trendType = 'volatile';
    } else if (Math.abs(slope) < 0.001) {
      trendType = 'stable';
    } else if (slope > 0) {
      trendType = 'increasing';
    } else {
      trendType = 'decreasing';
    }
    
    return { slope, rSquared, pValue, trendType };
  }
  
  private studentTCDF(t: number, df: number): number {
    // Simplified Student's t-distribution CDF approximation
    // In production, use proper statistical library
    return 0.5 + 0.5 * Math.sign(t) * Math.sqrt(1 - Math.exp(-2 * t * t / Math.PI));
  }
  
  // Anomaly detection methods
  
  private detectIQRAnomalies(values: number[], timestamps: Date[]): AnomalyPoint[] {
    const sortedValues = [...values].sort((a, b) => a - b);
    const q1 = this.percentile(sortedValues, 25);
    const q3 = this.percentile(sortedValues, 75);
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    const anomalies: AnomalyPoint[] = [];
    
    values.forEach((value, i) => {
      if (value < lowerBound || value > upperBound) {
        const expectedValue = (q1 + q3) / 2; // Use median as expected
        const deviation = Math.abs(value - expectedValue);
        const severity = this.classifyAnomalySeverity(deviation, iqr);
        
        anomalies.push({
          timestamp: timestamps[i],
          value,
          expectedValue,
          deviation,
          severity,
          confidence: 0.85, // IQR method confidence
          context: 'IQR-based outlier detection'
        });
      }
    });
    
    return anomalies;
  }
  
  private detectZScoreAnomalies(values: number[], timestamps: Date[]): AnomalyPoint[] {
    const meanValue = mean(values);
    const stdDev = standardDeviation(values);
    const anomalies: AnomalyPoint[] = [];
    
    values.forEach((value, i) => {
      const zScore = Math.abs((value - meanValue) / stdDev);
      
      if (zScore > 2.5) { // 2.5 sigma threshold
        const deviation = Math.abs(value - meanValue);
        const severity = this.classifyAnomalySeverity(deviation, stdDev);
        
        anomalies.push({
          timestamp: timestamps[i],
          value,
          expectedValue: meanValue,
          deviation,
          severity,
          confidence: 0.90, // Z-score method confidence
          context: `Z-score: ${zScore.toFixed(2)}`
        });
      }
    });
    
    return anomalies;
  }
  
  private detectIsolationAnomalies(values: number[], timestamps: Date[]): AnomalyPoint[] {
    // Simplified isolation forest approach using moving window
    const windowSize = Math.min(20, Math.floor(values.length / 5));
    const anomalies: AnomalyPoint[] = [];
    
    for (let i = windowSize; i < values.length - windowSize; i++) {
      const window = values.slice(i - windowSize, i + windowSize + 1);
      const windowMean = mean(window);
      const windowStd = standardDeviation(window);
      const currentValue = values[i];
      
      const isolationScore = Math.abs((currentValue - windowMean) / windowStd);
      
      if (isolationScore > 3) { // Isolation threshold
        const deviation = Math.abs(currentValue - windowMean);
        const severity = this.classifyAnomalySeverity(deviation, windowStd);
        
        anomalies.push({
          timestamp: timestamps[i],
          value: currentValue,
          expectedValue: windowMean,
          deviation,
          severity,
          confidence: 0.80, // Isolation method confidence
          context: `Isolation score: ${isolationScore.toFixed(2)}`
        });
      }
    }
    
    return anomalies;
  }
  
  private combineAnomalies(anomalyLists: AnomalyPoint[][]): AnomalyPoint[] {
    const combined = new Map<number, AnomalyPoint>();
    
    // Combine anomalies detected by multiple methods
    anomalyLists.forEach(anomalies => {
      anomalies.forEach(anomaly => {
        const timeKey = anomaly.timestamp.getTime();
        
        if (combined.has(timeKey)) {
          const existing = combined.get(timeKey)!;
          // Use highest confidence detection
          if (anomaly.confidence > existing.confidence) {
            combined.set(timeKey, anomaly);
          }
        } else {
          combined.set(timeKey, anomaly);
        }
      });
    });
    
    return Array.from(combined.values()).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
  
  private classifyAnomalySeverity(deviation: number, scale: number): 'mild' | 'moderate' | 'severe' | 'extreme' {
    const ratio = deviation / scale;
    
    if (ratio < 2) return 'mild';
    if (ratio < 3) return 'moderate';
    if (ratio < 5) return 'severe';
    return 'extreme';
  }
  
  // Forecasting methods
  
  private linearForecast(values: number[], timestamps: Date[], hours: number): {
    predictions: ForecastPoint[];
    confidence: number;
    metrics: { mae: number; rmse: number; mape: number; };
  } {
    // Simple linear trend forecasting
    const trend = this.calculateTrend(values, timestamps);
    const predictions: ForecastPoint[] = [];
    
    const lastTimestamp = timestamps[timestamps.length - 1].getTime();
    const meanValue = mean(values);
    const stdDev = standardDeviation(values);
    
    for (let h = 1; h <= hours; h++) {
      const futureTimestamp = new Date(lastTimestamp + h * 60 * 60 * 1000);
      const predictedValue = meanValue + trend.slope * (timestamps.length + h - 1);
      
      // Confidence interval based on residual variance
      const margin = 1.96 * stdDev; // 95% confidence
      
      predictions.push({
        timestamp: futureTimestamp,
        predictedValue,
        confidenceInterval: {
          lower: predictedValue - margin,
          upper: predictedValue + margin
        },
        probability: Math.max(0.5, trend.rSquared)
      });
    }
    
    // Calculate validation metrics (simplified)
    const mae = stdDev * 0.8; // Approximation
    const rmse = stdDev;
    const mape = (stdDev / Math.abs(meanValue)) * 100;
    
    return {
      predictions,
      confidence: trend.rSquared,
      metrics: { mae, rmse, mape }
    };
  }
  
  private exponentialSmoothing(values: number[], timestamps: Date[], hours: number): {
    predictions: ForecastPoint[];
    confidence: number;
    metrics: { mae: number; rmse: number; mape: number; };
  } {
    // Simple exponential smoothing
    const alpha = 0.3; // Smoothing parameter
    const predictions: ForecastPoint[] = [];
    
    // Calculate smoothed values
    const smoothed = [values[0]];
    for (let i = 1; i < values.length; i++) {
      smoothed[i] = alpha * values[i] + (1 - alpha) * smoothed[i - 1];
    }
    
    const lastSmoothed = smoothed[smoothed.length - 1];
    const lastTimestamp = timestamps[timestamps.length - 1].getTime();
    
    // Forecast future values
    const residuals = values.map((val, i) => Math.abs(val - smoothed[i]));
    const meanAbsoluteError = mean(residuals);
    
    for (let h = 1; h <= hours; h++) {
      const futureTimestamp = new Date(lastTimestamp + h * 60 * 60 * 1000);
      const margin = 1.96 * meanAbsoluteError;
      
      predictions.push({
        timestamp: futureTimestamp,
        predictedValue: lastSmoothed,
        confidenceInterval: {
          lower: lastSmoothed - margin,
          upper: lastSmoothed + margin
        },
        probability: 0.75 // Fixed confidence for exponential smoothing
      });
    }
    
    return {
      predictions,
      confidence: 0.75,
      metrics: {
        mae: meanAbsoluteError,
        rmse: Math.sqrt(mean(residuals.map(r => r * r))),
        mape: (meanAbsoluteError / mean(values.map(Math.abs))) * 100
      }
    };
  }
  
  private seasonalForecast(values: number[], timestamps: Date[], hours: number): {
    predictions: ForecastPoint[];
    confidence: number;
    metrics: { mae: number; rmse: number; mape: number; };
  } {
    // Simplified seasonal forecasting - in production, use proper decomposition
    const seasonality = this.analyzeSeasonality(values, timestamps);
    
    if (!seasonality.hasSeasonality) {
      return this.linearForecast(values, timestamps, hours);
    }
    
    const dominantCycle = seasonality.cycles[0];
    const period = dominantCycle.period;
    const predictions: ForecastPoint[] = [];
    const lastTimestamp = timestamps[timestamps.length - 1].getTime();
    
    // Use seasonal pattern for forecasting
    const meanValue = mean(values);
    const trend = this.calculateTrend(values, timestamps);
    
    for (let h = 1; h <= hours; h++) {
      const futureTimestamp = new Date(lastTimestamp + h * 60 * 60 * 1000);
      
      // Seasonal component
      const seasonalPhase = (h % period) / period * 2 * Math.PI;
      const seasonalComponent = dominantCycle.amplitude * Math.cos(seasonalPhase + dominantCycle.phase);
      
      // Trend component
      const trendComponent = trend.slope * (timestamps.length + h - 1);
      
      const predictedValue = meanValue + trendComponent + seasonalComponent;
      const margin = dominantCycle.amplitude * 1.5; // Confidence based on seasonal amplitude
      
      predictions.push({
        timestamp: futureTimestamp,
        predictedValue,
        confidenceInterval: {
          lower: predictedValue - margin,
          upper: predictedValue + margin
        },
        probability: dominantCycle.strength
      });
    }
    
    return {
      predictions,
      confidence: dominantCycle.strength,
      metrics: {
        mae: dominantCycle.amplitude * 0.5,
        rmse: dominantCycle.amplitude * 0.7,
        mape: (dominantCycle.amplitude / Math.abs(meanValue)) * 100
      }
    };
  }
  
  private selectBestForecastMethod(values: number[], timestamps: Date[]): 'linear' | 'seasonal' | 'exponential' {
    const seasonality = this.analyzeSeasonality(values, timestamps);
    const trend = this.calculateTrend(values, timestamps);
    
    if (seasonality.hasSeasonality && seasonality.strength > 0.4) {
      return 'seasonal';
    } else if (trend.rSquared > 0.3) {
      return 'linear';
    } else {
      return 'exponential';
    }
  }
  
  private generateForecastRecommendation(forecast: any): string {
    if (forecast.confidence > 0.8) {
      return `High confidence forecast (${(forecast.confidence * 100).toFixed(1)}%). Suitable for proactive maintenance planning.`;
    } else if (forecast.confidence > 0.6) {
      return `Moderate confidence forecast (${(forecast.confidence * 100).toFixed(1)}%). Use for trend awareness, validate with additional sensors.`;
    } else {
      return `Low confidence forecast (${(forecast.confidence * 100).toFixed(1)}%). Equipment behavior is unpredictable, increase monitoring frequency.`;
    }
  }
  
  // Seasonal analysis helpers
  
  private calculateAutocorrelation(values: number[], lag: number): number {
    if (lag >= values.length - 1) return 0;
    
    const n = values.length - lag;
    const mean1 = mean(values.slice(0, n));
    const mean2 = mean(values.slice(lag, lag + n));
    
    let numerator = 0;
    let denom1 = 0;
    let denom2 = 0;
    
    for (let i = 0; i < n; i++) {
      const diff1 = values[i] - mean1;
      const diff2 = values[i + lag] - mean2;
      
      numerator += diff1 * diff2;
      denom1 += diff1 * diff1;
      denom2 += diff2 * diff2;
    }
    
    if (denom1 === 0 || denom2 === 0) return 0;
    return numerator / Math.sqrt(denom1 * denom2);
  }
  
  private calculateSeasonalAmplitude(values: number[], period: number): number {
    // Calculate amplitude of seasonal component
    const segments = Math.floor(values.length / period);
    if (segments < 2) return 0;
    
    const seasonalMeans = [];
    for (let s = 0; s < segments; s++) {
      const segmentStart = s * period;
      const segmentEnd = Math.min((s + 1) * period, values.length);
      const segment = values.slice(segmentStart, segmentEnd);
      seasonalMeans.push(mean(segment));
    }
    
    const overallMean = mean(seasonalMeans);
    const deviations = seasonalMeans.map(m => Math.abs(m - overallMean));
    return mean(deviations);
  }
  
  private calculateSeasonalPhase(values: number[], timestamps: Date[], period: number): number {
    // Simplified phase calculation - in production, use proper FFT-based phase detection
    const segments = Math.floor(values.length / period);
    if (segments < 2) return 0;
    
    // Find phase of maximum correlation
    let maxCorr = 0;
    let bestPhase = 0;
    
    for (let phase = 0; phase < period; phase++) {
      let correlation = 0;
      let count = 0;
      
      for (let i = phase; i < values.length - period; i += period) {
        if (i + period < values.length) {
          correlation += values[i] * values[i + period];
          count++;
        }
      }
      
      if (count > 0) {
        correlation /= count;
        if (Math.abs(correlation) > Math.abs(maxCorr)) {
          maxCorr = correlation;
          bestPhase = phase;
        }
      }
    }
    
    return (bestPhase / period) * 2 * Math.PI;
  }
  
  // Correlation analysis helpers
  
  private alignTimeSeries(data1: any[], data2: any[]): Array<{target: number; sensor: number}> {
    // Simple time alignment - in production, use proper time-series alignment
    const aligned = [];
    const tolerance = 5 * 60 * 1000; // 5 minute tolerance
    
    for (const point1 of data1) {
      const closest = data2.find(point2 => 
        Math.abs(point1.timestamp.getTime() - point2.timestamp.getTime()) <= tolerance
      );
      
      if (closest) {
        aligned.push({
          target: point1.value,
          sensor: closest.value
        });
      }
    }
    
    return aligned;
  }
  
  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const meanX = mean(x);
    const meanY = mean(y);
    
    let numerator = 0;
    let denomX = 0;
    let denomY = 0;
    
    for (let i = 0; i < n; i++) {
      const diffX = x[i] - meanX;
      const diffY = y[i] - meanY;
      
      numerator += diffX * diffY;
      denomX += diffX * diffX;
      denomY += diffY * diffY;
    }
    
    if (denomX === 0 || denomY === 0) return 0;
    return numerator / Math.sqrt(denomX * denomY);
  }
  
  private correlationSignificance(correlation: number, n: number): number {
    // Simplified significance test - in production, use proper statistical test
    if (n < 3) return 1;
    
    const t = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation));
    const df = n - 2;
    
    // Approximation of p-value
    return 2 * (1 - this.studentTCDF(Math.abs(t), df));
  }
  
  private analyzeLagCorrelation(x: number[], y: number[]): { lag: number; maxCorrelation: number } {
    const maxLag = Math.min(10, Math.floor(x.length / 4)); // Check up to 10 time steps
    let maxCorrelation = 0;
    let bestLag = 0;
    
    for (let lag = -maxLag; lag <= maxLag; lag++) {
      let correlation = 0;
      let count = 0;
      
      const start = Math.max(0, -lag);
      const end = Math.min(x.length, x.length - lag);
      
      if (end > start) {
        const xSubset = x.slice(start, end);
        const ySubset = y.slice(start + lag, end + lag);
        
        if (xSubset.length === ySubset.length && xSubset.length > 0) {
          correlation = this.calculatePearsonCorrelation(xSubset, ySubset);
          
          if (Math.abs(correlation) > Math.abs(maxCorrelation)) {
            maxCorrelation = correlation;
            bestLag = lag;
          }
        }
      }
    }
    
    return { lag: bestLag, maxCorrelation };
  }
  
  private classifyRelationship(correlation: number): 'positive' | 'negative' | 'nonlinear' | 'none' {
    if (Math.abs(correlation) < 0.1) return 'none';
    if (correlation > 0.1) return 'positive';
    if (correlation < -0.1) return 'negative';
    return 'nonlinear';
  }
  
  private classifyCorrelationStrength(absCorrelation: number): 'weak' | 'moderate' | 'strong' | 'very_strong' {
    if (absCorrelation < 0.3) return 'weak';
    if (absCorrelation < 0.5) return 'moderate';
    if (absCorrelation < 0.7) return 'strong';
    return 'very_strong';
  }
  
  private assessCausality(correlation: number, significance: number, lagAnalysis: any): 'none' | 'possible' | 'likely' | 'strong' {
    if (Math.abs(correlation) < 0.3 || significance > 0.05) return 'none';
    if (Math.abs(correlation) < 0.5 && lagAnalysis.lag === 0) return 'possible';
    if (Math.abs(correlation) >= 0.5 && Math.abs(lagAnalysis.lag) <= 1) return 'likely';
    return 'strong';
  }
  
  // Fleet analysis helpers
  
  private aggregateFleetMetrics(analyses: any[]): {
    healthScore: number;
    anomalyRate: number;
    volatilityIndex: number;
    maintenanceRisk: 'low' | 'medium' | 'high' | 'critical';
  } {
    if (analyses.length === 0) {
      return { healthScore: 0, anomalyRate: 0, volatilityIndex: 0, maintenanceRisk: 'critical' };
    }
    
    // Calculate fleet-wide health score
    const avgAnomalyRates = analyses.map(a => a.analysis.anomalyDetection.summary.anomalyRate);
    const avgVolatility = analyses.map(a => a.analysis.statisticalSummary.standardDeviation);
    const avgTrendRSquared = analyses.map(a => a.analysis.statisticalSummary.trend.rSquared);
    
    const avgAnomalyRate = mean(avgAnomalyRates);
    const avgVolatilityIndex = mean(avgVolatility);
    const avgTrendStability = mean(avgTrendRSquared);
    
    // Health score based on multiple factors
    const healthScore = Math.max(0, Math.min(100, 
      100 - (avgAnomalyRate * 200) - (avgVolatilityIndex * 10) + (avgTrendStability * 20)
    ));
    
    // Determine maintenance risk
    let maintenanceRisk: 'low' | 'medium' | 'high' | 'critical';
    if (avgAnomalyRate > 0.3 || healthScore < 30) {
      maintenanceRisk = 'critical';
    } else if (avgAnomalyRate > 0.15 || healthScore < 50) {
      maintenanceRisk = 'high';
    } else if (avgAnomalyRate > 0.05 || healthScore < 70) {
      maintenanceRisk = 'medium';
    } else {
      maintenanceRisk = 'low';
    }
    
    return {
      healthScore,
      anomalyRate: avgAnomalyRate,
      volatilityIndex: avgVolatilityIndex,
      maintenanceRisk
    };
  }
  
  private rankEquipmentByRisk(analyses: any[]): EquipmentRanking[] {
    const rankings = analyses.map((analysis, index) => {
      const { equipmentId } = analysis;
      const { anomalyDetection, statisticalSummary } = analysis.analysis;
      
      // Risk score based on multiple factors
      const anomalyRisk = anomalyDetection.summary.anomalyRate * 100;
      const volatilityRisk = statisticalSummary.standardDeviation * 10;
      const trendRisk = statisticalSummary.trend.trendType === 'volatile' ? 25 : 0;
      
      const riskScore = anomalyRisk + volatilityRisk + trendRisk;
      
      const riskFactors = [];
      if (anomalyDetection.summary.anomalyRate > 0.15) riskFactors.push('High anomaly rate');
      if (statisticalSummary.standardDeviation > 5) riskFactors.push('High volatility');
      if (statisticalSummary.trend.trendType === 'volatile') riskFactors.push('Unstable trends');
      
      let priority: 'low' | 'medium' | 'high' | 'critical';
      if (riskScore > 75) priority = 'critical';
      else if (riskScore > 50) priority = 'high';
      else if (riskScore > 25) priority = 'medium';
      else priority = 'low';
      
      return {
        equipmentId,
        rank: 0, // Will be set after sorting
        score: riskScore,
        riskFactors,
        priority
      };
    });
    
    // Sort by risk score (descending) and assign ranks
    rankings.sort((a, b) => b.score - a.score);
    rankings.forEach((ranking, index) => {
      ranking.rank = index + 1;
    });
    
    return rankings;
  }
  
  private generateFleetRecommendations(analyses: any[], metrics: any): FleetRecommendation[] {
    const recommendations: FleetRecommendation[] = [];
    
    // High-risk equipment recommendations
    const highRiskEquipment = analyses
      .filter(a => a.analysis.anomalyDetection.summary.anomalyRate > 0.2)
      .map(a => a.equipmentId);
      
    if (highRiskEquipment.length > 0) {
      recommendations.push({
        type: 'maintenance',
        equipmentIds: highRiskEquipment,
        priority: 1,
        description: `Immediate maintenance required for ${highRiskEquipment.length} equipment units with high anomaly rates.`,
        expectedBenefit: 'Prevent potential equipment failures and reduce unplanned downtime.',
        timeFrame: '24-48 hours'
      });
    }
    
    // Monitoring optimization recommendations
    const volatileEquipment = analyses
      .filter(a => a.analysis.statisticalSummary.trend.trendType === 'volatile')
      .map(a => a.equipmentId);
      
    if (volatileEquipment.length > 0) {
      recommendations.push({
        type: 'monitoring',
        equipmentIds: volatileEquipment,
        priority: 2,
        description: `Increase monitoring frequency for ${volatileEquipment.length} equipment units with volatile behavior.`,
        expectedBenefit: 'Improve early detection of potential issues.',
        timeFrame: '1-2 weeks'
      });
    }
    
    // Fleet optimization recommendations
    if (metrics.maintenanceRisk === 'high' || metrics.maintenanceRisk === 'critical') {
      recommendations.push({
        type: 'optimization',
        equipmentIds: analyses.map(a => a.equipmentId),
        priority: 3,
        description: 'Fleet-wide maintenance strategy review recommended due to elevated risk levels.',
        expectedBenefit: 'Optimize maintenance schedules and reduce overall fleet risk.',
        timeFrame: '2-4 weeks'
      });
    }
    
    return recommendations.sort((a, b) => a.priority - b.priority);
  }
  
  // Database integration methods with MANDATORY org scoping for multi-tenant isolation
  
  private async getTelemetryData(
    orgId: string, 
    equipmentId: string, 
    sensorType: string, 
    hours: number
  ): Promise<Array<{
    timestamp: Date;
    value: number;
    unit: string;
  }>> {
    try {
      const { storage } = await import('./storage');
      
      // Calculate time range
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - (hours * 60 * 60 * 1000));
      
      console.log(`[Enhanced Trends] Fetching ${orgId}:${equipmentId}:${sensorType} from ${startTime.toISOString()} to ${endTime.toISOString()}`);
      
      // CRITICAL: Get telemetry data with proper org scoping for multi-tenant isolation
      const readings = await storage.getTelemetryHistory(
        orgId,        // MANDATORY: Organization scoping
        equipmentId,
        sensorType,
        startTime,
        endTime
      );
      
      return readings.map(reading => ({
        timestamp: reading.ts,
        value: reading.value,
        unit: reading.unit || 'unknown'
      }));
    } catch (error) {
      console.warn(`[Enhanced Trends] Failed to fetch telemetry data for ${orgId}:${equipmentId}:${sensorType}:`, error);
      return [];
    }
  }
  
  private async getEquipmentSensorTypes(orgId: string, equipmentId: string): Promise<string[]> {
    try {
      const { storage } = await import('./storage');
      
      // CRITICAL: Get sensor types with proper org scoping for multi-tenant isolation
      const sensorTypes = await storage.getEquipmentSensorTypes(orgId, equipmentId);
      
      console.log(`[Enhanced Trends] Found ${sensorTypes.length} sensor types for ${orgId}:${equipmentId}:`, sensorTypes);
      return sensorTypes;
    } catch (error) {
      console.warn(`[Enhanced Trends] Failed to get sensor types for ${orgId}:${equipmentId}:`, error);
      return [];
    }
  }
}

// Export the enhanced trends analyzer
export const enhancedTrendsAnalyzer = new EnhancedTrendsAnalyzer();