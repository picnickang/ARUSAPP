import { mean, standardDeviation } from "simple-statistics";

/**
 * PdM Pack v1 - Feature Extraction
 * Sophisticated statistical functions for bearing and pump health monitoring
 */

export type Series = number[];

export interface Band {
  name: string;
  value: number;
}

/**
 * Root Mean Square (RMS) - Core vibration analysis metric
 */
export function rms(x: Series): number {
  if (!x.length) return 0;
  const sumOfSquares = x.reduce((sum, val) => sum + val * val, 0);
  return Math.sqrt(sumOfSquares / x.length);
}

/**
 * Kurtosis - Statistical measure of distribution "tailedness" 
 * Indicates spiky vs smooth signals (fault detection)
 */
export function kurtosis(x: Series): number {
  if (x.length < 2) return 0;
  
  const m = mean(x);
  const n = x.length;
  const variance = x.reduce((sum, val) => sum + (val - m) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance) || 1e-9; // prevent division by zero
  
  const fourthMoment = x.reduce((sum, val) => sum + ((val - m) / stdDev) ** 4, 0) / n;
  return fourthMoment - 3; // excess kurtosis (normal distribution = 0)
}

/**
 * Absolute Envelope - Fast rectified envelope proxy for bearing fault detection
 * Detects impulse patterns typical in bearing defects
 */
export function absEnvelope(x: Series): number[] {
  if (!x.length) return [];
  
  const rectified = x.map(val => Math.abs(val));
  const windowSize = 5;
  const envelope: number[] = [];
  
  for (let i = 0; i < rectified.length; i++) {
    let sum = 0;
    let count = 0;
    
    for (let j = i - windowSize; j <= i + windowSize; j++) {
      if (j >= 0 && j < rectified.length) {
        sum += rectified[j];
        count++;
      }
    }
    
    envelope.push(sum / Math.max(1, count));
  }
  
  return envelope;
}

/**
 * Clamp Z-score to reasonable bounds to prevent numerical issues
 */
export function clampSigma(z: number): number {
  if (!isFinite(z)) return 0;
  return Math.max(-10, Math.min(10, z));
}

/**
 * Band RMS Analysis - Frequency domain energy in specific bands
 * Critical for ISO 10816 compliance and fault frequency analysis
 */
export function bandRMS(
  freq: number[], 
  mag: number[], 
  bands: { lo: number; hi: number; name: string }[]
): Band[] {
  return bands.map(band => {
    let energySum = 0;
    let count = 0;
    
    for (let i = 0; i < freq.length; i++) {
      const f = freq[i];
      if (f >= band.lo && f < band.hi) {
        const magnitude = mag[i] || 0;
        energySum += magnitude * magnitude;
        count++;
      }
    }
    
    return {
      name: band.name,
      value: Math.sqrt(energySum / Math.max(1, count))
    };
  });
}

/**
 * Z-Score calculation for baseline comparison
 */
export function zScore(mu: number, sigma: number, x: number): number {
  const safeSigma = sigma || 1e-6; // prevent division by zero
  return (x - mu) / safeSigma;
}

/**
 * Convert Z-score to severity level for alert classification
 */
export function severityFromZ(z: number): 'info' | 'warn' | 'high' {
  const absZ = Math.abs(z);
  if (absZ >= 3) return 'high';    // 3-sigma rule: 99.7% confidence
  if (absZ >= 2) return 'warn';    // 2-sigma rule: 95% confidence  
  return 'info';
}

/**
 * Bearing Feature Extraction - Complete vibration analysis suite
 * Includes time domain, ISO bands, and fault order analysis
 */
export interface BearingFeatures {
  rms: number;           // Overall vibration level
  kurtosis: number;      // Fault detection (spikiness)
  env_rms: number;       // Envelope RMS (bearing defects)
  iso_10_100: number;    // ISO 10816 low frequency band
  order_1x: number;      // 1x shaft order (unbalance)
  order_2x: number;      // 2x shaft order (misalignment)
}

export function extractBearingFeatures(params: {
  fs: number;           // sampling frequency
  rpm?: number;         // shaft RPM for order analysis
  series: number[];     // vibration time series
  spectrum?: {          // optional pre-computed spectrum
    freq: number[];
    mag: number[];
  };
}): BearingFeatures {
  const { fs, rpm, series, spectrum } = params;
  
  // Time domain features
  const overallRMS = rms(series);
  const kurtosisValue = kurtosis(series);
  
  // Envelope analysis for bearing fault detection
  const envelope = absEnvelope(series);
  const envelopeRMS = rms(envelope);
  
  // If spectrum provided, extract frequency domain features
  let iso_10_100 = 0;
  let order_1x = 0;
  let order_2x = 0;
  
  if (spectrum) {
    // ISO 10816 standard bands
    const isoBands = bandRMS(spectrum.freq, spectrum.mag, [
      { lo: 10, hi: 100, name: '10-100Hz' }
    ]);
    iso_10_100 = isoBands.find(b => b.name === '10-100Hz')?.value || 0;
    
    // Shaft order analysis (requires RPM)
    if (rpm && rpm > 0) {
      const shaftFreq = rpm / 60; // convert RPM to Hz
      const orderBands = bandRMS(spectrum.freq, spectrum.mag, [
        { lo: shaftFreq * 0.9, hi: shaftFreq * 1.1, name: '1x' },
        { lo: shaftFreq * 1.9, hi: shaftFreq * 2.1, name: '2x' }
      ]);
      
      order_1x = orderBands.find(b => b.name === '1x')?.value || 0;
      order_2x = orderBands.find(b => b.name === '2x')?.value || 0;
    }
  }
  
  return {
    rms: overallRMS,
    kurtosis: kurtosisValue,
    env_rms: envelopeRMS,
    iso_10_100,
    order_1x,
    order_2x
  };
}

/**
 * Pump Health Feature Extraction - Process parameter analysis
 * Includes efficiency estimation and cavitation detection
 */
export interface PumpFeatures {
  flow_eff: number;      // Flow-pressure correlation efficiency proxy
  cav_index: number;     // Cavitation severity index
  current_rms: number;   // Motor current RMS
  pressure_mean: number; // Average discharge pressure
}

export function extractPumpFeatures(params: {
  flow?: number[];        // flow measurements
  pressure?: number[];    // pressure measurements  
  current?: number[];     // current measurements
  fs?: number;           // sampling frequency for vibration
  vib_series?: number[]; // vibration data for cavitation detection
}): PumpFeatures {
  const { flow, pressure, current, fs = 0, vib_series } = params;
  
  // Get longest array length for safe processing
  const maxLength = Math.max(
    flow?.length || 0,
    pressure?.length || 0, 
    current?.length || 0,
    vib_series?.length || 0
  );
  
  // Ensure arrays are same length (fill with NaN if needed)
  const safeArray = (arr?: number[]) => {
    if (arr && arr.length) return arr;
    return Array.from({ length: maxLength }, () => NaN);
  };
  
  const flowArray = safeArray(flow);
  const pressureArray = safeArray(pressure);
  const currentArray = safeArray(current);
  
  // Flow efficiency proxy using correlation analysis
  const flowEfficiency = (() => {
    const validFlow = flowArray.filter(x => isFinite(x));
    const validPressure = pressureArray.filter(x => isFinite(x));
    
    if (!validFlow.length || !validPressure.length) return NaN;
    
    const flowMean = mean(validFlow);
    const pressureMean = mean(validPressure);
    
    // Calculate covariance
    const covariance = validFlow.reduce((sum, f, i) => {
      const p = validPressure[i];
      if (isFinite(p)) {
        return sum + (f - flowMean) * (p - pressureMean);
      }
      return sum;
    }, 0) / Math.max(1, validFlow.length);
    
    // Calculate correlation coefficient as efficiency proxy
    const flowStd = standardDeviation(validFlow) || 1e-6;
    const pressureStd = standardDeviation(validPressure) || 1e-6;
    
    const correlation = covariance / (flowStd * pressureStd);
    return Math.max(0, Math.min(1, correlation)); // clamp to 0-1 range
  })();
  
  // Cavitation detection using high-frequency vibration analysis
  let cavitationIndex = 0;
  if (vib_series && fs > 0) {
    // Simple heuristic: high frequency energy relative to low frequency
    // This would ideally use the vibration analysis from Beast Mode
    const vibRMS = rms(vib_series);
    
    // For now, use a placeholder - in full implementation this would:
    // 1. Compute FFT spectrum
    // 2. Calculate high-freq (1-3kHz) vs low-freq (10-100Hz) ratio
    // 3. Higher ratios indicate potential cavitation
    cavitationIndex = vibRMS; // Simplified proxy
  }
  
  // Process current and pressure statistics
  const validCurrent = currentArray.filter(x => isFinite(x));
  const validPressure = pressureArray.filter(x => isFinite(x));
  
  const currentRMS = validCurrent.length ? rms(validCurrent) : NaN;
  const pressureMean = validPressure.length ? mean(validPressure) : NaN;
  
  return {
    flow_eff: flowEfficiency,
    cav_index: cavitationIndex,
    current_rms: currentRMS,
    pressure_mean: pressureMean
  };
}