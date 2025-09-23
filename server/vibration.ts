/**
 * Advanced Vibration Analysis Module
 * Translates Python numpy/FFT algorithms to Node.js
 * Features: FFT analysis, RMS, crest factor, kurtosis, ISO frequency bands
 */

// @ts-ignore - fft-js lacks TypeScript declarations
import { FFT } from 'fft-js';
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
 * Advanced vibration analysis with FFT and statistical features
 * @param values Raw time-domain vibration data
 * @param sampleRate Sampling frequency in Hz
 * @param rpm Equipment RPM (optional, for order analysis)
 * @returns Comprehensive vibration features
 */
export function analyzeVibration(
  values: number[],
  sampleRate: number,
  rpm?: number
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
  const fftResult = FFT(fftInput);
  
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

/**
 * Generate synthetic vibration test data for demonstrations
 * @param options Generation parameters
 * @returns Synthetic vibration signal
 */
export function generateTestVibration(options: {
  duration: number; // seconds
  sampleRate: number; // Hz
  rpm: number; // equipment RPM
  amplitudes?: [number, number, number, number]; // 1x, 2x, 3x, 4x order amplitudes
  noiseLevel?: number; // noise amplitude
}): number[] {
  const {
    duration,
    sampleRate,
    rpm,
    amplitudes = [1.0, 0.5, 0.3, 0.2],
    noiseLevel = 0.1,
  } = options;
  
  const sampleCount = Math.floor(duration * sampleRate);
  const signal: number[] = [];
  const baseFreq = rpm / 60; // Hz
  
  for (let i = 0; i < sampleCount; i++) {
    const t = i / sampleRate;
    let value = 0;
    
    // Add harmonic components (1x, 2x, 3x, 4x orders)
    for (let order = 1; order <= 4; order++) {
      const freq = baseFreq * order;
      const amplitude = amplitudes[order - 1];
      value += amplitude * Math.sin(2 * Math.PI * freq * t);
    }
    
    // Add random noise
    value += noiseLevel * (Math.random() - 0.5) * 2;
    
    signal.push(value);
  }
  
  return signal;
}