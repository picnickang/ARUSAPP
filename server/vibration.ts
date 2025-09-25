/**
 * Advanced Vibration Analysis Module
 * Translates Python numpy/FFT algorithms to Node.js
 * Features: FFT analysis, RMS, crest factor, kurtosis, ISO frequency bands
 */

// @ts-ignore - fft-js lacks TypeScript declarations
import { fft } from 'fft-js';
import { mean, standardDeviation } from 'simple-statistics';

export interface VibrationFeatures {
  rms: number;
  crestFactor: number;
  kurtosis: number;
  peakFrequency: number;
  bands: [number, number, number, number]; // 1x, 2x, 3x, 4x order bands
  rawDataLength: number;
  sampleRate: number;
  analysisMetadata?: {
    noiseFloor: number;
    spectralCentroid: number;
    totalPower: number;
  };
  isoAssessment?: ISO10816Assessment;
  bearingFaults?: BearingFaultFrequencies;
}

export interface ISO10816Assessment {
  severityZone: 'A' | 'B' | 'C' | 'D';
  velocityRms: number; // mm/s RMS
  machineClass: ISO10816MachineClass;
  thresholds: {
    zoneALimit: number;
    zoneBLimit: number;
    zoneCLimit: number;
  };
  assessment: string;
}

export type ISO10816MachineClass = 'I' | 'II' | 'III' | 'IV';

export interface BearingGeometry {
  innerRaceDiameter: number; // mm
  outerRaceDiameter: number; // mm
  ballDiameter: number; // mm
  numberOfBalls: number;
  contactAngle: number; // degrees
}

export interface BearingFaultFrequencies {
  bpfo: number; // Ball pass frequency outer race
  bpfi: number; // Ball pass frequency inner race
  ftf: number;  // Fundamental train frequency (cage)
  bsf: number;  // Ball spin frequency
  rpm: number;
  geometry: BearingGeometry;
}

/**
 * Generate ISO frequency bands around equipment orders (1x-4x RPM)
 * @param rpm Equipment RPM
 * @returns Array of [lowHz, highHz] tuples for each order
 */
function getISOBands(rpm: number): Array<[number, number]> {
  const baseFreq = rpm / 60.0; // Convert RPM to Hz
  return [
    [0.8 * baseFreq, 1.2 * baseFreq], // 1x order ±20%
    [1.8 * baseFreq, 2.2 * baseFreq], // 2x order ±10%
    [2.8 * baseFreq, 3.2 * baseFreq], // 3x order ±7%
    [3.8 * baseFreq, 4.2 * baseFreq], // 4x order ±5%
  ];
}

/**
 * Calculate power in a specific frequency band using trapezoidal integration
 * @param frequencies Frequency array from FFT
 * @param powerSpectrum Power spectral density
 * @param lowHz Band lower frequency
 * @param highHz Band upper frequency
 * @returns Integrated power in the band
 */
function calculateBandPower(
  frequencies: number[],
  powerSpectrum: number[],
  lowHz: number,
  highHz: number
): number {
  // Find indices within the frequency band
  const indices: number[] = [];
  const values: number[] = [];
  
  for (let i = 0; i < frequencies.length; i++) {
    if (frequencies[i] >= lowHz && frequencies[i] <= highHz) {
      indices.push(i);
      values.push(powerSpectrum[i]);
    }
  }
  
  if (indices.length === 0) return 0.0;
  
  // Trapezoidal integration
  let integral = 0;
  for (let i = 0; i < indices.length - 1; i++) {
    const dx = frequencies[indices[i + 1]] - frequencies[indices[i]];
    const avgHeight = (values[i] + values[i + 1]) / 2;
    integral += dx * avgHeight;
  }
  
  return integral;
}

/**
 * Calculate kurtosis (fourth moment) of signal distribution
 * @param values Time domain signal
 * @returns Kurtosis value (3.0 = normal distribution)
 */
function calculateKurtosis(values: number[]): number {
  if (values.length < 4) return 0;
  
  const meanVal = mean(values);
  const stdVal = standardDeviation(values);
  
  if (stdVal === 0) return 0;
  
  // Fourth moment calculation
  const fourthMoment = values.reduce((sum, x) => {
    const normalized = (x - meanVal) / stdVal;
    return sum + Math.pow(normalized, 4);
  }, 0) / values.length;
  
  return fourthMoment;
}

/**
 * Generate frequency array for FFT results
 * @param sampleCount Number of samples
 * @param sampleRate Sampling frequency (Hz)
 * @returns Frequency array for positive frequencies
 */
function generateFrequencyArray(sampleCount: number, sampleRate: number): number[] {
  const nyquist = sampleRate / 2;
  const freqStep = nyquist / (sampleCount / 2);
  const frequencies: number[] = [];
  
  for (let i = 0; i <= sampleCount / 2; i++) {
    frequencies.push(i * freqStep);
  }
  
  return frequencies;
}

/**
 * Get ISO 10816 severity zone thresholds based on machine class
 * @param machineClass ISO machine classification
 * @returns Threshold values in mm/s RMS
 */
function getISO10816Thresholds(machineClass: ISO10816MachineClass): { zoneALimit: number; zoneBLimit: number; zoneCLimit: number } {
  switch (machineClass) {
    case 'I': // Small machines < 15 kW
      return { zoneALimit: 0.71, zoneBLimit: 1.8, zoneCLimit: 4.5 };
    case 'II': // Medium machines 15-75 kW or up to 300 kW on special foundations
      return { zoneALimit: 1.12, zoneBLimit: 2.8, zoneCLimit: 7.1 };
    case 'III': // Large machines > 75 kW with rigid foundations
      return { zoneALimit: 1.8, zoneBLimit: 4.5, zoneCLimit: 11.2 };
    case 'IV': // Large machines > 75 kW with soft foundations
      return { zoneALimit: 2.8, zoneBLimit: 7.1, zoneCLimit: 18.0 };
    default:
      return { zoneALimit: 1.8, zoneBLimit: 4.5, zoneCLimit: 11.2 };
  }
}

/**
 * Assess vibration severity according to ISO 10816 standard
 * @param velocityRms RMS velocity in mm/s
 * @param machineClass ISO machine classification
 * @returns ISO assessment result
 */
export function assessISO10816(velocityRms: number, machineClass: ISO10816MachineClass): ISO10816Assessment {
  const thresholds = getISO10816Thresholds(machineClass);
  
  let severityZone: 'A' | 'B' | 'C' | 'D';
  let assessment: string;
  
  if (velocityRms <= thresholds.zoneALimit) {
    severityZone = 'A';
    assessment = 'Good - Newly commissioned machines in excellent condition';
  } else if (velocityRms <= thresholds.zoneBLimit) {
    severityZone = 'B';
    assessment = 'Satisfactory - Machines considered acceptable for unrestricted long-term operation';
  } else if (velocityRms <= thresholds.zoneCLimit) {
    severityZone = 'C';
    assessment = 'Unsatisfactory - Machines where action should be taken to reduce vibration';
  } else {
    severityZone = 'D';
    assessment = 'Unacceptable - Machines where urgent action is required to prevent damage';
  }
  
  return {
    severityZone,
    velocityRms,
    machineClass,
    thresholds,
    assessment
  };
}

/**
 * Convert acceleration to velocity using integration approximation
 * @param accelerationRms RMS acceleration in m/s²
 * @param dominantFrequency Dominant frequency in Hz
 * @returns Velocity RMS in mm/s
 */
export function accelerationToVelocity(accelerationRms: number, dominantFrequency: number): number {
  if (dominantFrequency === 0) return 0;
  // v = a / (2πf), then convert to mm/s
  return (accelerationRms / (2 * Math.PI * dominantFrequency)) * 1000;
}

/**
 * Calculate bearing fault frequencies based on geometry
 * @param geometry Bearing geometric parameters
 * @param rpm Shaft rotation speed in RPM
 * @returns Calculated fault frequencies in Hz
 */
export function calculateBearingFaultFrequencies(
  geometry: BearingGeometry, 
  rpm: number
): BearingFaultFrequencies {
  const {
    innerRaceDiameter,
    outerRaceDiameter,
    ballDiameter,
    numberOfBalls,
    contactAngle
  } = geometry;
  
  // Calculate pitch diameter
  const pitchDiameter = (innerRaceDiameter + outerRaceDiameter) / 2;
  
  // Convert RPM to Hz
  const shaftFreq = rpm / 60;
  
  // Convert contact angle to radians
  const contactAngleRad = (contactAngle * Math.PI) / 180;
  
  // Calculate fundamental frequencies
  const cosContactAngle = Math.cos(contactAngleRad);
  
  // Ball Pass Frequency Outer Race (BPFO)
  const bpfo = (numberOfBalls / 2) * shaftFreq * (1 - (ballDiameter * cosContactAngle) / pitchDiameter);
  
  // Ball Pass Frequency Inner Race (BPFI)
  const bpfi = (numberOfBalls / 2) * shaftFreq * (1 + (ballDiameter * cosContactAngle) / pitchDiameter);
  
  // Fundamental Train Frequency (cage frequency)
  const ftf = (shaftFreq / 2) * (1 - (ballDiameter * cosContactAngle) / pitchDiameter);
  
  // Ball Spin Frequency (BSF)
  const bsf = (pitchDiameter / ballDiameter) * shaftFreq * 
             (1 - Math.pow((ballDiameter * cosContactAngle) / pitchDiameter, 2)) / 2;
  
  return {
    bpfo,
    bpfi,
    ftf,
    bsf,
    rpm,
    geometry
  };
}

/**
 * Detect bearing fault frequencies in vibration spectrum
 * @param frequencies Frequency array from FFT
 * @param powerSpectrum Power spectral density
 * @param bearingFreqs Expected bearing fault frequencies
 * @param tolerance Frequency tolerance (±%)
 * @returns Detection results with amplitudes
 */
export function detectBearingFaults(
  frequencies: number[],
  powerSpectrum: number[],
  bearingFreqs: BearingFaultFrequencies,
  tolerance: number = 0.05
): {
  bpfoDetected: boolean;
  bpfiDetected: boolean;
  ftfDetected: boolean;
  bsfDetected: boolean;
  amplitudes: {
    bpfo: number;
    bpfi: number;
    ftf: number;
    bsf: number;
  };
} {
  const findPeakAmplitude = (targetFreq: number): number => {
    const freqTolerance = targetFreq * tolerance;
    const minFreq = targetFreq - freqTolerance;
    const maxFreq = targetFreq + freqTolerance;
    
    let maxAmplitude = 0;
    for (let i = 0; i < frequencies.length; i++) {
      if (frequencies[i] >= minFreq && frequencies[i] <= maxFreq) {
        maxAmplitude = Math.max(maxAmplitude, powerSpectrum[i]);
      }
    }
    return Math.sqrt(maxAmplitude); // Convert power to amplitude
  };
  
  const amplitudes = {
    bpfo: findPeakAmplitude(bearingFreqs.bpfo),
    bpfi: findPeakAmplitude(bearingFreqs.bpfi),
    ftf: findPeakAmplitude(bearingFreqs.ftf),
    bsf: findPeakAmplitude(bearingFreqs.bsf)
  };
  
  // Simple threshold-based detection (can be enhanced with more sophisticated algorithms)
  const noiseFloor = powerSpectrum.slice(1).reduce((min, power) => Math.min(min, power), powerSpectrum[1] || 0);
  const detectionThreshold = Math.sqrt(noiseFloor) * 3; // 3x noise floor
  
  return {
    bpfoDetected: amplitudes.bpfo > detectionThreshold,
    bpfiDetected: amplitudes.bpfi > detectionThreshold,
    ftfDetected: amplitudes.ftf > detectionThreshold,
    bsfDetected: amplitudes.bsf > detectionThreshold,
    amplitudes
  };
}

/**
 * Advanced vibration analysis with FFT and statistical features
 * @param values Raw time-domain vibration data
 * @param sampleRate Sampling frequency in Hz
 * @param rpm Equipment RPM (optional, for order analysis)
 * @returns Comprehensive vibration features
 */
export function analyzeVibration(
  values: number[],
  sampleRate: number,
  rpm?: number,
  machineClass?: ISO10816MachineClass,
  bearingGeometry?: BearingGeometry
): VibrationFeatures {
  const n = values.length;
  
  // Handle edge cases
  if (n < 8) {
    return {
      rms: 0,
      crestFactor: 0,
      kurtosis: 0,
      peakFrequency: 0,
      bands: [0, 0, 0, 0],
      rawDataLength: n,
      sampleRate,
    };
  }
  
  // Remove DC component (mean)
  const meanVal = mean(values);
  const acValues = values.map(x => x - meanVal);
  
  // Calculate RMS (Root Mean Square)
  const rms = Math.sqrt(mean(acValues.map(x => x * x)));
  
  // Calculate crest factor (Peak/RMS ratio)
  const peakValue = Math.max(...acValues.map(Math.abs));
  const crestFactor = rms > 0 ? peakValue / rms : 0;
  
  // Calculate kurtosis
  const kurtosis = calculateKurtosis(acValues);
  
  // Perform FFT analysis
  const fftInput = acValues.map(x => [x, 0]); // [real, imaginary] pairs
  const fftResult = fft(fftInput);
  
  // Calculate power spectral density
  const powerSpectrum = fftResult.slice(0, Math.floor(n / 2) + 1).map((complex: [number, number]) => {
    const [real, imag] = complex;
    return (real * real + imag * imag) / n;
  });
  
  // Generate frequency array
  const frequencies = generateFrequencyArray(n, sampleRate);
  
  // Find peak frequency
  let maxPowerIndex = 0;
  let maxPower = powerSpectrum[0];
  for (let i = 1; i < powerSpectrum.length; i++) {
    if (powerSpectrum[i] > maxPower) {
      maxPower = powerSpectrum[i];
      maxPowerIndex = i;
    }
  }
  const peakFrequency = frequencies[maxPowerIndex];
  
  // Calculate ISO frequency band powers
  const bands: [number, number, number, number] = [0, 0, 0, 0];
  if (rpm && rpm > 0) {
    const isoBands = getISOBands(rpm);
    for (let i = 0; i < 4; i++) {
      const [lowHz, highHz] = isoBands[i];
      bands[i] = calculateBandPower(frequencies, powerSpectrum, lowHz, highHz);
    }
  }
  
  // Calculate additional analysis metadata
  const totalPower = powerSpectrum.reduce((sum: number, power: number) => sum + power, 0);
  const noiseFloor = powerSpectrum.slice(1).reduce((min: number, power: number) => Math.min(min, power), powerSpectrum[1] || 0);
  
  // Spectral centroid (center of mass of spectrum)
  let weightedSum = 0;
  let powerSum = 0;
  for (let i = 0; i < frequencies.length; i++) {
    weightedSum += frequencies[i] * powerSpectrum[i];
    powerSum += powerSpectrum[i];
  }
  const spectralCentroid = powerSum > 0 ? weightedSum / powerSum : 0;
  
  // ISO 10816 Assessment (if machine class provided)
  let isoAssessment: ISO10816Assessment | undefined;
  if (machineClass && peakFrequency > 0) {
    // Convert acceleration RMS to velocity RMS (approximate)
    const velocityRms = accelerationToVelocity(rms, peakFrequency);
    isoAssessment = assessISO10816(velocityRms, machineClass);
  }
  
  // Bearing fault frequency analysis (if geometry and RPM provided)
  let bearingFaults: BearingFaultFrequencies | undefined;
  if (bearingGeometry && rpm && rpm > 0) {
    bearingFaults = calculateBearingFaultFrequencies(bearingGeometry, rpm);
  }
  
  return {
    rms,
    crestFactor,
    kurtosis,
    peakFrequency,
    bands,
    rawDataLength: n,
    sampleRate,
    analysisMetadata: {
      noiseFloor,
      spectralCentroid,
      totalPower,
    },
    isoAssessment,
    bearingFaults,
  };
}

/**
 * Analyze multiple vibration signals simultaneously
 * @param signals Array of signal objects with values and metadata
 * @returns Array of vibration features for each signal
 */
export function analyzeBatchVibration(
  signals: Array<{
    values: number[];
    sampleRate: number;
    rpm?: number;
    equipmentId: string;
    timestamp?: Date;
  }>
): Array<VibrationFeatures & { equipmentId: string; timestamp?: Date }> {
  return signals.map(signal => ({
    ...analyzeVibration(signal.values, signal.sampleRate, signal.rpm),
    equipmentId: signal.equipmentId,
    timestamp: signal.timestamp,
  }));
}

// Synthetic data generation functions removed for production deployment