/**
 * Acoustic Monitoring Module
 * Analyzes acoustic emissions from equipment to detect mechanical faults
 * Features: FFT analysis, spectral analysis, fault detection, noise profiling
 */

// @ts-ignore - fft-js lacks TypeScript declarations
import { fft } from 'fft-js';
import { mean, standardDeviation } from 'simple-statistics';

export interface AcousticFeatures {
  rms: number;
  peakAmplitude: number;
  spectralCentroid: number;
  spectralRolloff: number;
  zeroCrossingRate: number;
  dominantFrequency: number;
  harmonicRatio: number;
  noiseFloor: number;
  snr: number; // Signal to Noise Ratio
  frequencyBands: {
    lowFreq: number;    // 0-500 Hz (bearing/structural)
    midFreq: number;    // 500-2000 Hz (gears/mechanical)
    highFreq: number;   // 2000-10000 Hz (cavitation/leaks)
    ultrasonic: number; // 10000+ Hz (friction/electrical)
  };
  faultIndicators: AcousticFaultIndicators;
}

export interface AcousticFaultIndicators {
  bearingFault: {
    detected: boolean;
    confidence: number;
    frequency: number | null;
  };
  gearFault: {
    detected: boolean;
    confidence: number;
    frequency: number | null;
  };
  cavitation: {
    detected: boolean;
    confidence: number;
    intensity: number;
  };
  leakage: {
    detected: boolean;
    confidence: number;
    location: 'possible' | 'likely' | 'unknown';
  };
  imbalance: {
    detected: boolean;
    confidence: number;
  };
}

export interface AcousticAnalysisResult {
  features: AcousticFeatures;
  severity: 'normal' | 'warning' | 'critical';
  primaryIssues: string[];
  recommendations: string[];
  healthScore: number; // 0-100
}

/**
 * Calculate zero crossing rate (indicator of frequency content)
 */
function calculateZeroCrossingRate(values: number[]): number {
  let crossings = 0;
  for (let i = 1; i < values.length; i++) {
    if ((values[i] >= 0 && values[i - 1] < 0) || (values[i] < 0 && values[i - 1] >= 0)) {
      crossings++;
    }
  }
  return crossings / values.length;
}

/**
 * Calculate spectral centroid (center of mass of spectrum)
 */
function calculateSpectralCentroid(frequencies: number[], magnitudes: number[]): number {
  let weightedSum = 0;
  let totalMagnitude = 0;
  
  for (let i = 0; i < frequencies.length; i++) {
    weightedSum += frequencies[i] * magnitudes[i];
    totalMagnitude += magnitudes[i];
  }
  
  return totalMagnitude > 0 ? weightedSum / totalMagnitude : 0;
}

/**
 * Calculate spectral rolloff (frequency below which 85% of energy is contained)
 */
function calculateSpectralRolloff(frequencies: number[], magnitudes: number[]): number {
  const totalEnergy = magnitudes.reduce((sum, mag) => sum + mag, 0);
  const threshold = 0.85 * totalEnergy;
  
  let cumulativeEnergy = 0;
  for (let i = 0; i < magnitudes.length; i++) {
    cumulativeEnergy += magnitudes[i];
    if (cumulativeEnergy >= threshold) {
      return frequencies[i];
    }
  }
  
  return frequencies[frequencies.length - 1];
}

/**
 * Calculate harmonic ratio (harmonic energy vs total energy)
 */
function calculateHarmonicRatio(magnitudes: number[], dominantIdx: number): number {
  if (dominantIdx === 0) return 0;
  
  const totalEnergy = magnitudes.reduce((sum, mag) => sum + mag, 0);
  
  // Sum energy at fundamental and harmonics (2f, 3f, 4f)
  let harmonicEnergy = magnitudes[dominantIdx];
  const harmonicIndices = [dominantIdx * 2, dominantIdx * 3, dominantIdx * 4];
  
  for (const idx of harmonicIndices) {
    if (idx < magnitudes.length) {
      harmonicEnergy += magnitudes[idx];
    }
  }
  
  return totalEnergy > 0 ? harmonicEnergy / totalEnergy : 0;
}

/**
 * Detect bearing faults from acoustic signature
 */
function detectBearingFault(
  frequencies: number[],
  magnitudes: number[],
  rpm?: number
): { detected: boolean; confidence: number; frequency: number | null } {
  if (!rpm || rpm <= 0) {
    return { detected: false, confidence: 0, frequency: null };
  }
  
  const rotationFreq = rpm / 60;
  
  // Typical bearing fault frequencies are 2-10x rotation frequency
  const bearingBandLow = rotationFreq * 2;
  const bearingBandHigh = rotationFreq * 10;
  
  let maxMagnitude = 0;
  let faultFreq = null;
  
  for (let i = 0; i < frequencies.length; i++) {
    if (frequencies[i] >= bearingBandLow && frequencies[i] <= bearingBandHigh) {
      if (magnitudes[i] > maxMagnitude) {
        maxMagnitude = magnitudes[i];
        faultFreq = frequencies[i];
      }
    }
  }
  
  // Calculate average magnitude in band
  const avgMagnitude = magnitudes.reduce((sum, mag) => sum + mag, 0) / magnitudes.length;
  const threshold = avgMagnitude * 3; // 3x average is suspicious
  
  const detected = maxMagnitude > threshold;
  const confidence = detected ? Math.min(1, maxMagnitude / (avgMagnitude * 10)) : 0;
  
  return { detected, confidence, frequency: faultFreq };
}

/**
 * Detect gear faults from acoustic signature
 */
function detectGearFault(
  frequencies: number[],
  magnitudes: number[],
  rpm?: number
): { detected: boolean; confidence: number; frequency: number | null } {
  if (!rpm || rpm <= 0) {
    return { detected: false, confidence: 0, frequency: null };
  }
  
  const rotationFreq = rpm / 60;
  
  // Gear mesh frequencies are typically high multiples of rotation frequency
  const gearBandLow = rotationFreq * 10;
  const gearBandHigh = rotationFreq * 50;
  
  let maxMagnitude = 0;
  let faultFreq = null;
  
  for (let i = 0; i < frequencies.length; i++) {
    if (frequencies[i] >= gearBandLow && frequencies[i] <= gearBandHigh) {
      if (magnitudes[i] > maxMagnitude) {
        maxMagnitude = magnitudes[i];
        faultFreq = frequencies[i];
      }
    }
  }
  
  const avgMagnitude = magnitudes.reduce((sum, mag) => sum + mag, 0) / magnitudes.length;
  const threshold = avgMagnitude * 2.5;
  
  const detected = maxMagnitude > threshold;
  const confidence = detected ? Math.min(1, maxMagnitude / (avgMagnitude * 8)) : 0;
  
  return { detected, confidence, frequency: faultFreq };
}

/**
 * Detect cavitation from high-frequency acoustic signature
 */
function detectCavitation(
  frequencies: number[],
  magnitudes: number[]
): { detected: boolean; confidence: number; intensity: number } {
  // Cavitation produces broadband noise in 2-10 kHz range
  const cavitationBandLow = 2000;
  const cavitationBandHigh = 10000;
  
  let bandEnergy = 0;
  let bandCount = 0;
  
  for (let i = 0; i < frequencies.length; i++) {
    if (frequencies[i] >= cavitationBandLow && frequencies[i] <= cavitationBandHigh) {
      bandEnergy += magnitudes[i];
      bandCount++;
    }
  }
  
  const totalEnergy = magnitudes.reduce((sum, mag) => sum + mag, 0);
  const bandRatio = totalEnergy > 0 ? bandEnergy / totalEnergy : 0;
  
  // Cavitation threshold: >30% of energy in high-freq band
  const detected = bandRatio > 0.3;
  const confidence = Math.min(1, bandRatio * 2);
  const intensity = bandRatio;
  
  return { detected, confidence, intensity };
}

/**
 * Detect leakage from ultrasonic signature
 */
function detectLeakage(
  frequencies: number[],
  magnitudes: number[]
): { detected: boolean; confidence: number; location: 'possible' | 'likely' | 'unknown' } {
  // Leakage produces ultrasonic noise above 10 kHz
  const ultrasonicThreshold = 10000;
  
  let ultrasonicEnergy = 0;
  let ultrasonicCount = 0;
  
  for (let i = 0; i < frequencies.length; i++) {
    if (frequencies[i] >= ultrasonicThreshold) {
      ultrasonicEnergy += magnitudes[i];
      ultrasonicCount++;
    }
  }
  
  const totalEnergy = magnitudes.reduce((sum, mag) => sum + mag, 0);
  const ultrasonicRatio = totalEnergy > 0 ? ultrasonicEnergy / totalEnergy : 0;
  
  const detected = ultrasonicRatio > 0.15;
  const confidence = Math.min(1, ultrasonicRatio * 5);
  
  let location: 'possible' | 'likely' | 'unknown' = 'unknown';
  if (detected) {
    location = ultrasonicRatio > 0.25 ? 'likely' : 'possible';
  }
  
  return { detected, confidence, location };
}

/**
 * Detect imbalance from low-frequency acoustic signature
 */
function detectImbalance(
  frequencies: number[],
  magnitudes: number[],
  rpm?: number
): { detected: boolean; confidence: number } {
  if (!rpm || rpm <= 0) {
    return { detected: false, confidence: 0 };
  }
  
  const rotationFreq = rpm / 60;
  
  // Imbalance shows up at 1x rotation frequency
  const tolerance = rotationFreq * 0.1; // ±10%
  
  let maxMagnitude = 0;
  for (let i = 0; i < frequencies.length; i++) {
    if (Math.abs(frequencies[i] - rotationFreq) < tolerance) {
      maxMagnitude = Math.max(maxMagnitude, magnitudes[i]);
    }
  }
  
  const avgMagnitude = magnitudes.reduce((sum, mag) => sum + mag, 0) / magnitudes.length;
  const threshold = avgMagnitude * 4; // 4x average indicates imbalance
  
  const detected = maxMagnitude > threshold;
  const confidence = detected ? Math.min(1, maxMagnitude / (avgMagnitude * 10)) : 0;
  
  return { detected, confidence };
}

/**
 * Main acoustic analysis function
 */
export function analyzeAcoustic(
  values: number[],
  sampleRate: number,
  rpm?: number
): AcousticFeatures {
  const n = values.length;
  
  // Handle edge cases
  if (n < 8) {
    return createEmptyAcousticFeatures(n, sampleRate);
  }
  
  // Remove DC component
  const meanVal = mean(values);
  const acValues = values.map(x => x - meanVal);
  
  // Calculate RMS
  const rms = Math.sqrt(mean(acValues.map(x => x * x)));
  
  // Calculate peak amplitude
  const peakAmplitude = Math.max(...acValues.map(Math.abs));
  
  // Calculate zero crossing rate
  const zeroCrossingRate = calculateZeroCrossingRate(acValues);
  
  // Perform FFT analysis
  const fftInput = acValues.map(x => [x, 0]); // [real, imaginary] pairs
  const fftResult = fft(fftInput);
  
  // Calculate magnitudes
  const magnitudes = fftResult.slice(0, Math.floor(n / 2) + 1).map((complex: [number, number]) => {
    const [real, imag] = complex;
    return Math.sqrt(real * real + imag * imag) / n;
  });
  
  // Generate frequency array
  const frequencies: number[] = [];
  for (let i = 0; i < magnitudes.length; i++) {
    frequencies.push((i * sampleRate) / n);
  }
  
  // Find dominant frequency
  let maxMagIndex = 0;
  let maxMag = magnitudes[0];
  for (let i = 1; i < magnitudes.length; i++) {
    if (magnitudes[i] > maxMag) {
      maxMag = magnitudes[i];
      maxMagIndex = i;
    }
  }
  const dominantFrequency = frequencies[maxMagIndex];
  
  // Calculate spectral features
  const spectralCentroid = calculateSpectralCentroid(frequencies, magnitudes);
  const spectralRolloff = calculateSpectralRolloff(frequencies, magnitudes);
  const harmonicRatio = calculateHarmonicRatio(magnitudes, maxMagIndex);
  
  // Calculate noise floor (minimum magnitude, excluding DC)
  const noiseFloor = magnitudes.slice(1).reduce((min, mag) => Math.min(min, mag), magnitudes[1] || 0);
  
  // Calculate SNR
  const snr = noiseFloor > 0 ? 20 * Math.log10(maxMag / noiseFloor) : 0;
  
  // Calculate frequency band energies
  const frequencyBands = {
    lowFreq: 0,
    midFreq: 0,
    highFreq: 0,
    ultrasonic: 0
  };
  
  for (let i = 0; i < frequencies.length; i++) {
    const freq = frequencies[i];
    const energy = magnitudes[i];
    
    if (freq < 500) frequencyBands.lowFreq += energy;
    else if (freq < 2000) frequencyBands.midFreq += energy;
    else if (freq < 10000) frequencyBands.highFreq += energy;
    else frequencyBands.ultrasonic += energy;
  }
  
  // Fault detection
  const bearingFault = detectBearingFault(frequencies, magnitudes, rpm);
  const gearFault = detectGearFault(frequencies, magnitudes, rpm);
  const cavitation = detectCavitation(frequencies, magnitudes);
  const leakage = detectLeakage(frequencies, magnitudes);
  const imbalance = detectImbalance(frequencies, magnitudes, rpm);
  
  return {
    rms,
    peakAmplitude,
    spectralCentroid,
    spectralRolloff,
    zeroCrossingRate,
    dominantFrequency,
    harmonicRatio,
    noiseFloor,
    snr,
    frequencyBands,
    faultIndicators: {
      bearingFault,
      gearFault,
      cavitation,
      leakage,
      imbalance
    }
  };
}

/**
 * Perform comprehensive acoustic analysis with health assessment
 */
export function performAcousticAnalysis(
  values: number[],
  sampleRate: number,
  equipmentType?: string,
  rpm?: number
): AcousticAnalysisResult {
  const features = analyzeAcoustic(values, sampleRate, rpm);
  
  const primaryIssues: string[] = [];
  const recommendations: string[] = [];
  let healthScore = 100;
  let severity: 'normal' | 'warning' | 'critical' = 'normal';
  
  // Assess bearing faults
  if (features.faultIndicators.bearingFault.detected) {
    const confidence = features.faultIndicators.bearingFault.confidence;
    healthScore -= confidence * 30;
    
    if (confidence > 0.7) {
      primaryIssues.push(`Critical bearing fault detected at ${features.faultIndicators.bearingFault.frequency?.toFixed(1)} Hz`);
      recommendations.push('Immediate bearing inspection required');
      severity = 'critical';
    } else {
      primaryIssues.push(`Bearing wear detected at ${features.faultIndicators.bearingFault.frequency?.toFixed(1)} Hz`);
      recommendations.push('Schedule bearing inspection within 7 days');
      severity = severity === 'critical' ? 'critical' : 'warning';
    }
  }
  
  // Assess gear faults
  if (features.faultIndicators.gearFault.detected) {
    const confidence = features.faultIndicators.gearFault.confidence;
    healthScore -= confidence * 25;
    
    if (confidence > 0.6) {
      primaryIssues.push(`Gear fault detected at ${features.faultIndicators.gearFault.frequency?.toFixed(1)} Hz`);
      recommendations.push('Inspect gear teeth for wear or damage');
      severity = 'critical';
    } else {
      primaryIssues.push('Early gear wear indicators present');
      recommendations.push('Monitor gear mesh frequency trend');
      severity = severity === 'critical' ? 'critical' : 'warning';
    }
  }
  
  // Assess cavitation
  if (features.faultIndicators.cavitation.detected) {
    const confidence = features.faultIndicators.cavitation.confidence;
    healthScore -= confidence * 35;
    
    if (confidence > 0.6) {
      primaryIssues.push(`Severe cavitation detected (intensity: ${(features.faultIndicators.cavitation.intensity * 100).toFixed(0)}%)`);
      recommendations.push('Check suction conditions and NPSH immediately');
      severity = 'critical';
    } else {
      primaryIssues.push('Cavitation indicators present');
      recommendations.push('Verify pump inlet pressure and flow conditions');
      severity = severity === 'critical' ? 'critical' : 'warning';
    }
  }
  
  // Assess leakage
  if (features.faultIndicators.leakage.detected) {
    const confidence = features.faultIndicators.leakage.confidence;
    healthScore -= confidence * 20;
    
    primaryIssues.push(`Potential leakage detected (${features.faultIndicators.leakage.location})`);
    recommendations.push('Perform ultrasonic leak detection survey');
    severity = severity === 'critical' ? 'critical' : 'warning';
  }
  
  // Assess imbalance
  if (features.faultIndicators.imbalance.detected) {
    const confidence = features.faultIndicators.imbalance.confidence;
    healthScore -= confidence * 15;
    
    if (confidence > 0.7) {
      primaryIssues.push('Significant rotor imbalance detected');
      recommendations.push('Balance rotor or check for mass loss/buildup');
      severity = severity === 'critical' ? 'critical' : 'warning';
    } else {
      primaryIssues.push('Minor imbalance present');
      recommendations.push('Monitor imbalance trend');
    }
  }
  
  // High noise floor assessment
  if (features.noiseFloor > features.rms * 0.5) {
    healthScore -= 10;
    primaryIssues.push('High background noise detected');
    recommendations.push('Check for external noise sources or sensor placement');
  }
  
  // Low SNR assessment
  if (features.snr < 10) {
    healthScore -= 5;
    recommendations.push('Improve signal quality or sensor placement');
  }
  
  healthScore = Math.max(0, Math.min(100, healthScore));
  
  if (primaryIssues.length === 0) {
    primaryIssues.push('No acoustic anomalies detected');
    recommendations.push('Continue routine monitoring');
  }
  
  return {
    features,
    severity,
    primaryIssues,
    recommendations,
    healthScore
  };
}

/**
 * Create empty acoustic features for edge cases
 */
function createEmptyAcousticFeatures(n: number, sampleRate: number): AcousticFeatures {
  return {
    rms: 0,
    peakAmplitude: 0,
    spectralCentroid: 0,
    spectralRolloff: 0,
    zeroCrossingRate: 0,
    dominantFrequency: 0,
    harmonicRatio: 0,
    noiseFloor: 0,
    snr: 0,
    frequencyBands: {
      lowFreq: 0,
      midFreq: 0,
      highFreq: 0,
      ultrasonic: 0
    },
    faultIndicators: {
      bearingFault: { detected: false, confidence: 0, frequency: null },
      gearFault: { detected: false, confidence: 0, frequency: null },
      cavitation: { detected: false, confidence: 0, intensity: 0 },
      leakage: { detected: false, confidence: 0, location: 'unknown' },
      imbalance: { detected: false, confidence: 0 }
    }
  };
}
