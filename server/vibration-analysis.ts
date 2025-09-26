import * as fftjs from 'fft-js';
const FFT = fftjs.fft;
import { storage } from './storage';
import { beastModeManager } from './beast-mode-config';
import type { VibrationAnalysis } from '@shared/schema';

export interface VibrationData {
  timestamp: Date;
  value: number;
  equipmentId: string;
  sensorType: string;
}

export interface FFTResult {
  frequencies: number[];
  magnitudes: number[];
  dominantFreq: number;
  dominantMagnitude: number;
  harmonics: Array<{ freq: number; magnitude: number; }>;
}

export interface AnomalyDetection {
  isAnomalous: boolean;
  anomalyScore: number;
  anomalyType: 'bearing_fault' | 'imbalance' | 'misalignment' | 'looseness' | 'normal';
  confidence: number;
}

/**
 * Vibration Analysis Pod - FFT-based equipment anomaly detection
 * 
 * This module provides:
 * - FFT processing of vibration signals
 * - Frequency domain analysis 
 * - Bearing fault detection
 * - Mechanical anomaly identification
 * - Feature flag controlled operation
 */
export class VibrationAnalyzer {
  private readonly sampleRate = 1000; // Hz - configurable based on sensor capabilities
  private readonly windowSize = 512; // FFT window size - power of 2 for efficiency
  
  /**
   * Process vibration data for a specific equipment unit
   */
  async analyzeVibration(equipmentId: string, orgId: string = 'default-org-id'): Promise<VibrationAnalysis | null> {
    try {
      // Check if vibration analysis is enabled for this organization
      const isEnabled = await beastModeManager.isFeatureEnabled(orgId, 'vibration_analysis');
      if (!isEnabled) {
        console.log(`[Vibration Analysis] Feature disabled for org: ${orgId}`);
        return null;
      }

      // Retrieve recent vibration data for analysis
      const vibrationData = await this.getVibrationData(equipmentId, orgId);
      if (!vibrationData || vibrationData.length < this.windowSize) {
        console.log(`[Vibration Analysis] Insufficient data for ${equipmentId} (${vibrationData?.length || 0} samples, need ${this.windowSize})`);
        return null;
      }

      // Perform FFT analysis
      const fftResult = this.performFFT(vibrationData);
      
      // Detect anomalies based on frequency patterns
      const anomalyDetection = this.detectAnomalies(fftResult);
      
      // Calculate overall equipment health score
      const healthScore = this.calculateHealthScore(fftResult, anomalyDetection);
      
      // Store analysis results - match vibrationAnalysis schema exactly
      const analysis: Omit<VibrationAnalysis, 'id' | 'createdAt'> = {
        orgId,
        equipmentId,
        sampleRate: this.sampleRate,
        shaftRpm: null, // Could be calculated from dominant frequency if known gear ratio
        windowType: 'hann',
        rawData: JSON.stringify(vibrationData.slice(-this.windowSize).map(d => d.value)),
        spectrumData: JSON.stringify({
          frequencies: fftResult.frequencies,
          magnitudes: fftResult.magnitudes
        }),
        isoBands: JSON.stringify(this.calculateISOBands(fftResult)),
        faultBands: JSON.stringify(this.calculateFaultBands(fftResult, anomalyDetection)),
        dominantFrequency: fftResult.dominantFreq,
        dominantMagnitude: fftResult.dominantMagnitude,
        harmonics: JSON.stringify(fftResult.harmonics),
        anomalyScore: anomalyDetection.anomalyScore,
        anomalyType: anomalyDetection.anomalyType,
        healthScore,
        isAnomalous: anomalyDetection.isAnomalous,
        confidence: anomalyDetection.confidence,
        analysisConfig: JSON.stringify({
          sampleRate: this.sampleRate,
          windowSize: this.windowSize,
          dataPoints: vibrationData.length,
          algorithm: 'FFT-based anomaly detection v1.0'
        }),
        timestamp: new Date()
      };

      const savedAnalysis = await storage.createVibrationAnalysis(analysis);
      
      console.log(`[Vibration Analysis] Analysis completed for ${equipmentId}: ${anomalyDetection.isAnomalous ? 'ANOMALY DETECTED' : 'NORMAL'} (score: ${anomalyDetection.anomalyScore.toFixed(2)})`);
      
      return savedAnalysis;
      
    } catch (error) {
      console.error(`[Vibration Analysis] Error analyzing ${equipmentId}:`, error);
      return null;
    }
  }

  /**
   * Retrieve recent vibration telemetry data for analysis
   */
  private async getVibrationData(equipmentId: string, orgId: string): Promise<VibrationData[]> {
    try {
      // Get last 1000 vibration readings for this equipment
      // Get telemetry data for vibration analysis - honor the requested orgId
      const allTelemetry = await storage.getLatestTelemetry(orgId, 1000);
      const telemetryData = allTelemetry.filter(t => 
        t.equipmentId === equipmentId && 
        t.sensorType === 'vibration'
      );

      return telemetryData
        .map(reading => ({
          timestamp: reading.ts,
          value: reading.value,
          equipmentId: reading.equipmentId,
          sensorType: reading.sensorType
        }))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
    } catch (error) {
      console.error(`[Vibration Analysis] Error retrieving data for ${equipmentId}:`, error);
      return [];
    }
  }

  /**
   * Perform FFT on vibration signal
   */
  private performFFT(data: VibrationData[]): FFTResult {
    // Extract just the signal values and ensure power-of-2 window
    const signal = data.slice(-this.windowSize).map(d => d.value);
    
    // Apply Hanning window to reduce spectral leakage
    const windowedSignal = this.applyHanningWindow(signal);
    
    // Compute FFT
    const fftOutput = FFT(windowedSignal);
    
    // Calculate frequency bins
    const frequencies: number[] = [];
    const magnitudes: number[] = [];
    
    const nyquist = this.sampleRate / 2;
    const frequencyResolution = nyquist / (this.windowSize / 2);
    
    // Process only positive frequencies (first half of FFT output)
    // Note: fft-js returns array of [real, imag] tuples, not interleaved array
    for (let i = 0; i < this.windowSize / 2; i++) {
      const real = fftOutput[i][0];  // Real part of complex number
      const imag = fftOutput[i][1];  // Imaginary part of complex number
      const magnitude = Math.sqrt(real * real + imag * imag);
      
      frequencies.push(i * frequencyResolution);
      magnitudes.push(magnitude);
    }
    
    // Find dominant frequency
    const maxMagnitudeIndex = magnitudes.indexOf(Math.max(...magnitudes));
    const dominantFreq = frequencies[maxMagnitudeIndex];
    const dominantMagnitude = magnitudes[maxMagnitudeIndex];
    
    // Extract harmonics (peaks in frequency spectrum)
    const harmonics = this.extractHarmonics(frequencies, magnitudes, dominantFreq);
    
    return {
      frequencies,
      magnitudes,
      dominantFreq,
      dominantMagnitude,
      harmonics
    };
  }

  /**
   * Apply Hanning window to reduce spectral leakage
   */
  private applyHanningWindow(signal: number[]): number[] {
    return signal.map((value, index) => {
      const windowValue = 0.5 * (1 - Math.cos(2 * Math.PI * index / (signal.length - 1)));
      return value * windowValue;
    });
  }

  /**
   * Extract harmonic components from frequency spectrum
   */
  private extractHarmonics(frequencies: number[], magnitudes: number[], fundamental: number): Array<{ freq: number; magnitude: number; }> {
    const harmonics = [];
    const tolerance = 5; // Hz tolerance for harmonic detection
    
    // Look for harmonics up to the 10th harmonic
    for (let harmonic = 2; harmonic <= 10; harmonic++) {
      const targetFreq = fundamental * harmonic;
      
      // Find closest frequency bin to target harmonic
      const closestIndex = frequencies.findIndex(freq => Math.abs(freq - targetFreq) < tolerance);
      
      if (closestIndex !== -1) {
        harmonics.push({
          freq: frequencies[closestIndex],
          magnitude: magnitudes[closestIndex]
        });
      }
    }
    
    return harmonics.sort((a, b) => b.magnitude - a.magnitude).slice(0, 5); // Top 5 harmonics
  }

  /**
   * Detect mechanical anomalies based on frequency patterns
   */
  private detectAnomalies(fftResult: FFTResult): AnomalyDetection {
    const { dominantFreq, dominantMagnitude, harmonics } = fftResult;
    
    let anomalyScore = 0;
    let anomalyType: AnomalyDetection['anomalyType'] = 'normal';
    let confidence = 0.5;
    
    // Bearing fault detection (typically 1-10x shaft frequency)
    if (dominantFreq >= 10 && dominantFreq <= 500) {
      // Check for bearing defect frequencies
      const bearingFreqs = this.getBearingDefectFrequencies(dominantFreq);
      
      for (const defectFreq of bearingFreqs) {
        if (Math.abs(dominantFreq - defectFreq.freq) < 5) {
          anomalyScore = Math.min(1.0, dominantMagnitude / 100); // Normalize
          anomalyType = 'bearing_fault';
          confidence = 0.8;
          break;
        }
      }
    }
    
    // Imbalance detection (typically at 1x shaft frequency)
    if (dominantFreq >= 5 && dominantFreq <= 100) {
      const imbalanceScore = dominantMagnitude / 50; // Normalize
      if (imbalanceScore > anomalyScore) {
        anomalyScore = Math.min(1.0, imbalanceScore);
        anomalyType = 'imbalance';
        confidence = 0.7;
      }
    }
    
    // Misalignment detection (typically at 2x shaft frequency)
    const secondHarmonic = harmonics.find(h => h.freq >= dominantFreq * 1.8 && h.freq <= dominantFreq * 2.2);
    if (secondHarmonic && secondHarmonic.magnitude > dominantMagnitude * 0.5) {
      const misalignmentScore = secondHarmonic.magnitude / 75;
      if (misalignmentScore > anomalyScore) {
        anomalyScore = Math.min(1.0, misalignmentScore);
        anomalyType = 'misalignment';
        confidence = 0.75;
      }
    }
    
    // Looseness detection (multiple harmonics of similar magnitude)
    const strongHarmonics = harmonics.filter(h => h.magnitude > dominantMagnitude * 0.3);
    if (strongHarmonics.length >= 3) {
      const loosenessScore = strongHarmonics.length / 10;
      if (loosenessScore > anomalyScore) {
        anomalyScore = Math.min(1.0, loosenessScore);
        anomalyType = 'looseness';
        confidence = 0.6;
      }
    }
    
    const isAnomalous = anomalyScore > 0.3; // Threshold for anomaly detection
    
    return {
      isAnomalous,
      anomalyScore,
      anomalyType,
      confidence
    };
  }

  /**
   * Calculate bearing defect frequencies for common bearing types
   */
  private getBearingDefectFrequencies(shaftFreq: number): Array<{ type: string; freq: number; }> {
    // Typical bearing geometry ratios for common bearings
    const ballPassFreqOuter = shaftFreq * 3.5; // BPFO
    const ballPassFreqInner = shaftFreq * 5.5; // BPFI  
    const ballSpinFreq = shaftFreq * 2.3; // BSF
    const cageFreq = shaftFreq * 0.4; // FTF
    
    return [
      { type: 'BPFO', freq: ballPassFreqOuter },
      { type: 'BPFI', freq: ballPassFreqInner },
      { type: 'BSF', freq: ballSpinFreq },
      { type: 'FTF', freq: cageFreq }
    ];
  }

  /**
   * Calculate overall equipment health score from vibration analysis
   */
  private calculateHealthScore(fftResult: FFTResult, anomaly: AnomalyDetection): number {
    let healthScore = 100; // Start with perfect health
    
    // Reduce score based on anomaly severity
    healthScore -= (anomaly.anomalyScore * 50 * anomaly.confidence);
    
    // Consider overall vibration energy (RMS)
    const rmsValue = Math.sqrt(fftResult.magnitudes.reduce((sum, mag) => sum + mag * mag, 0) / fftResult.magnitudes.length);
    const energyPenalty = Math.min(30, rmsValue / 10); // Cap penalty at 30 points
    healthScore -= energyPenalty;
    
    // Consider harmonic content (more harmonics = more wear)
    const harmonicPenalty = Math.min(20, fftResult.harmonics.length * 2);
    healthScore -= harmonicPenalty;
    
    return Math.max(0, Math.round(healthScore)); // Ensure 0-100 range
  }

  /**
   * Get vibration analysis history for equipment
   */
  async getAnalysisHistory(equipmentId: string, orgId: string = 'default-org-id', limit: number = 50): Promise<VibrationAnalysis[]> {
    try {
      const isEnabled = await beastModeManager.isFeatureEnabled(orgId, 'vibration_analysis');
      if (!isEnabled) {
        return [];
      }

      return await storage.getVibrationAnalysisHistory(orgId, equipmentId, limit);
    } catch (error) {
      console.error(`[Vibration Analysis] Error getting history for ${equipmentId}:`, error);
      return [];
    }
  }

  /**
   * Calculate ISO frequency bands for standardized vibration analysis
   */
  private calculateISOBands(fftResult: FFTResult): Record<string, number> {
    const { frequencies, magnitudes } = fftResult;
    
    // ISO 10816 frequency bands
    const bands = {
      '2-10Hz': { min: 2, max: 10 },
      '10-100Hz': { min: 10, max: 100 },
      '100-1000Hz': { min: 100, max: 1000 }
    };
    
    const isoBands: Record<string, number> = {};
    
    for (const [bandName, range] of Object.entries(bands)) {
      let bandEnergy = 0;
      let bandCount = 0;
      
      for (let i = 0; i < frequencies.length; i++) {
        if (frequencies[i] >= range.min && frequencies[i] <= range.max) {
          bandEnergy += magnitudes[i] * magnitudes[i];
          bandCount++;
        }
      }
      
      // RMS value for the band
      isoBands[bandName] = bandCount > 0 ? Math.sqrt(bandEnergy / bandCount) : 0;
    }
    
    return isoBands;
  }

  /**
   * Calculate fault-specific frequency bands
   */
  private calculateFaultBands(fftResult: FFTResult, anomaly: AnomalyDetection): Record<string, number> {
    const faultBands: Record<string, number> = {};
    
    // Bearing fault bands based on detected anomaly type
    if (anomaly.anomalyType === 'bearing_fault') {
      const shaftFreq = fftResult.dominantFreq;
      const bearingFreqs = this.getBearingDefectFrequencies(shaftFreq);
      
      for (const defect of bearingFreqs) {
        const energy = this.calculateBandEnergy(fftResult, defect.freq - 2, defect.freq + 2);
        faultBands[defect.type] = energy;
      }
    }
    
    // Gear mesh frequencies (if applicable)
    faultBands['gear_mesh'] = this.calculateBandEnergy(fftResult, 200, 800);
    
    // High-frequency bearing/lubrication issues
    faultBands['hf_bearing'] = this.calculateBandEnergy(fftResult, 1000, 5000);
    
    return faultBands;
  }

  /**
   * Calculate energy in a specific frequency band
   */
  private calculateBandEnergy(fftResult: FFTResult, minFreq: number, maxFreq: number): number {
    const { frequencies, magnitudes } = fftResult;
    let energy = 0;
    let count = 0;
    
    for (let i = 0; i < frequencies.length; i++) {
      if (frequencies[i] >= minFreq && frequencies[i] <= maxFreq) {
        energy += magnitudes[i] * magnitudes[i];
        count++;
      }
    }
    
    return count > 0 ? Math.sqrt(energy / count) : 0;
  }

  /**
   * Batch analyze vibration for multiple equipment units
   */
  async batchAnalyze(equipmentIds: string[], orgId: string = 'default-org-id'): Promise<VibrationAnalysis[]> {
    const results: VibrationAnalysis[] = [];
    
    for (const equipmentId of equipmentIds) {
      const analysis = await this.analyzeVibration(equipmentId, orgId);
      if (analysis) {
        results.push(analysis);
      }
    }
    
    return results;
  }
}

// Export singleton instance
export const vibrationAnalyzer = new VibrationAnalyzer();