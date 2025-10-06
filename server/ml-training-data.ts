/**
 * ML Training Data Collection and Preparation
 * Collects historical failure data from work orders and telemetry
 * Prepares training datasets for LSTM and Random Forest models
 */

import { IStorage } from "./storage.js";
import type { WorkOrder, EquipmentTelemetry } from "@shared/schema";

/**
 * Sanitize telemetry data by filtering out records with invalid timestamps
 */
function sanitizeTelemetry(telemetry: EquipmentTelemetry[]): EquipmentTelemetry[] {
  return telemetry.filter(t => {
    if (!t.ts || !(t.ts instanceof Date)) {
      console.warn(`[ML Training] Filtering out telemetry with invalid ts:`, t);
      return false;
    }
    return true;
  });
}

export interface FailureEvent {
  equipmentId: string;
  equipmentType: string;
  failureDate: Date;
  failureType: string; // from work order reason/description
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  downtimeHours: number;
  repairCost: number;
  workOrderId: string;
}

export interface TimeSeriesFeatures {
  equipmentId: string;
  timestamp: Date;
  features: {
    temperature?: number;
    vibration?: number;
    pressure?: number;
    flow_rate?: number;
    current?: number;
    voltage?: number;
    oil_pressure?: number;
    rpm?: number;
    [key: string]: number | undefined;
  };
  normalizedFeatures: {
    [key: string]: number;
  };
  label: 0 | 1; // 0 = healthy, 1 = failure imminent
  daysToFailure?: number;
}

export interface TrainingDataset {
  timeSeries: TimeSeriesFeatures[];
  failures: FailureEvent[];
  equipmentType: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  statistics: {
    totalSamples: number;
    failureSamples: number;
    healthySamples: number;
    sensorTypes: string[];
    failureRate: number;
  };
}

export interface ClassificationFeatures {
  equipmentId: string;
  equipmentType: string;
  features: {
    avgTemperature: number;
    maxTemperature: number;
    stdTemperature: number;
    avgVibration: number;
    maxVibration: number;
    stdVibration: number;
    avgPressure: number;
    minPressure: number;
    operatingHours: number;
    cycleCount: number;
    maintenanceAge: number; // days since last maintenance
    failureHistory: number; // number of past failures
    [key: string]: number;
  };
  label: 'healthy' | 'warning' | 'critical';
  failureRisk: number; // 0-1
}

/**
 * Extract failure events from work orders
 */
export async function extractFailureEvents(
  storage: IStorage,
  orgId: string,
  startDate?: Date,
  endDate?: Date
): Promise<FailureEvent[]> {
  const workOrders = await storage.getWorkOrders(orgId);
  
  const failureEvents: FailureEvent[] = [];
  
  for (const wo of workOrders) {
    // Filter by date range if provided
    if (startDate && wo.createdAt < startDate) continue;
    if (endDate && wo.createdAt > endDate) continue;
    
    // Only include corrective/failure work orders
    const isFailure = 
      wo.status === 'completed' &&
      (wo.priority === 4 || wo.priority === 5 || // urgent/critical
       wo.reason?.toLowerCase().includes('failure') ||
       wo.reason?.toLowerCase().includes('breakdown') ||
       wo.description?.toLowerCase().includes('failed'));
    
    if (!isFailure) continue;
    
    // Determine severity from priority and downtime
    let severity: 'minor' | 'moderate' | 'major' | 'critical' = 'moderate';
    if (wo.priority === 5) severity = 'critical';
    else if (wo.priority === 4) severity = 'major';
    else if (wo.actualDowntimeHours && wo.actualDowntimeHours > 24) severity = 'major';
    else if (wo.actualDowntimeHours && wo.actualDowntimeHours > 8) severity = 'moderate';
    else severity = 'minor';
    
    const equipment = await storage.getEquipment(wo.equipmentId, orgId);
    
    failureEvents.push({
      equipmentId: wo.equipmentId,
      equipmentType: equipment?.type || 'unknown',
      failureDate: wo.actualStartDate || wo.createdAt,
      failureType: wo.reason || 'unknown',
      severity,
      downtimeHours: wo.actualDowntimeHours || 0,
      repairCost: wo.totalCost || 0,
      workOrderId: wo.id
    });
  }
  
  return failureEvents.sort((a, b) => a.failureDate.getTime() - b.failureDate.getTime());
}

/**
 * Collect telemetry data leading up to a failure event
 */
export async function collectPreFailureTelemetry(
  storage: IStorage,
  equipmentId: string,
  failureDate: Date,
  lookbackDays: number = 30,
  orgId: string = 'default-org-id'
): Promise<EquipmentTelemetry[]> {
  const startDate = new Date(failureDate.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
  
  // Get all telemetry for this equipment in the lookback period
  const telemetry = await storage.getTelemetryByEquipmentAndDateRange(
    equipmentId,
    startDate,
    failureDate,
    orgId
  );
  
  return telemetry;
}

/**
 * Prepare time-series training data for LSTM
 */
export async function prepareTimeSeriesDataset(
  storage: IStorage,
  orgId: string,
  equipmentType?: string,
  lookbackDays: number = 30,
  windowDays: number = 7 // days before failure to mark as "failure imminent"
): Promise<TrainingDataset> {
  // Get all failure events
  const failures = await extractFailureEvents(storage, orgId);
  
  // Filter by equipment type if specified
  const filteredFailures = equipmentType 
    ? failures.filter(f => f.equipmentType === equipmentType)
    : failures;
  
  const timeSeries: TimeSeriesFeatures[] = [];
  const sensorTypesSet = new Set<string>();
  
  // For each failure, collect pre-failure telemetry
  for (const failure of filteredFailures) {
    const rawTelemetry = await collectPreFailureTelemetry(
      storage,
      failure.equipmentId,
      failure.failureDate,
      lookbackDays,
      orgId
    );
    
    // Sanitize telemetry to ensure all timestamps are valid
    const telemetry = sanitizeTelemetry(rawTelemetry);
    
    // Group telemetry by timestamp (aggregate multiple sensors per timestamp)
    const timeGroups = new Map<string, EquipmentTelemetry[]>();
    for (const t of telemetry) {
      const timeKey = t.ts.toISOString();
      if (!timeGroups.has(timeKey)) {
        timeGroups.set(timeKey, []);
      }
      timeGroups.get(timeKey)!.push(t);
      sensorTypesSet.add(t.sensorType);
    }
    
    // Create features for each time point
    for (const [timeKey, readings] of timeGroups.entries()) {
      const timestamp = new Date(timeKey);
      const daysToFailure = (failure.failureDate.getTime() - timestamp.getTime()) / (24 * 60 * 60 * 1000);
      
      // Aggregate sensor readings into features
      const features: Record<string, number> = {};
      for (const reading of readings) {
        features[reading.sensorType] = reading.value;
      }
      
      // Normalize features (simple min-max, will be improved with actual stats)
      const normalizedFeatures: Record<string, number> = {};
      for (const [key, value] of Object.entries(features)) {
        normalizedFeatures[key] = value; // TODO: actual normalization
      }
      
      // Label: 1 if within window days of failure, 0 otherwise
      const label = daysToFailure <= windowDays ? 1 : 0;
      
      timeSeries.push({
        equipmentId: failure.equipmentId,
        timestamp,
        features,
        normalizedFeatures,
        label: label as 0 | 1,
        daysToFailure
      });
    }
  }
  
  // Also collect healthy operation data (no failures)
  const allEquipment = await storage.getEquipmentRegistry(orgId);
  const failedEquipmentIds = new Set(filteredFailures.map(f => f.equipmentId));
  
  for (const eq of allEquipment) {
    if (failedEquipmentIds.has(eq.id)) continue;
    if (equipmentType && eq.type !== equipmentType) continue;
    
    // Get recent telemetry for healthy equipment
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
    
    const rawTelemetry = await storage.getTelemetryByEquipmentAndDateRange(
      eq.id,
      startDate,
      endDate,
      orgId
    );
    
    // Sanitize and sample healthy data
    const sanitizedTelemetry = sanitizeTelemetry(rawTelemetry);
    const sampledTelemetry = sanitizedTelemetry.filter((_, idx) => idx % 10 === 0);
    
    const timeGroups = new Map<string, EquipmentTelemetry[]>();
    for (const t of sampledTelemetry) {
      const timeKey = t.ts.toISOString();
      if (!timeGroups.has(timeKey)) {
        timeGroups.set(timeKey, []);
      }
      timeGroups.get(timeKey)!.push(t);
      sensorTypesSet.add(t.sensorType);
    }
    
    for (const [timeKey, readings] of timeGroups.entries()) {
      const timestamp = new Date(timeKey);
      const features: Record<string, number> = {};
      
      for (const reading of readings) {
        features[reading.sensorType] = reading.value;
      }
      
      const normalizedFeatures: Record<string, number> = {};
      for (const [key, value] of Object.entries(features)) {
        normalizedFeatures[key] = value;
      }
      
      timeSeries.push({
        equipmentId: eq.id,
        timestamp,
        features,
        normalizedFeatures,
        label: 0,
        daysToFailure: undefined
      });
    }
  }
  
  // Calculate statistics
  const failureSamples = timeSeries.filter(t => t.label === 1).length;
  const healthySamples = timeSeries.filter(t => t.label === 0).length;
  
  const dateRange = {
    start: new Date(Math.min(...timeSeries.map(t => t.timestamp.getTime()))),
    end: new Date(Math.max(...timeSeries.map(t => t.timestamp.getTime())))
  };
  
  return {
    timeSeries: timeSeries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
    failures: filteredFailures,
    equipmentType: equipmentType || 'all',
    dateRange,
    statistics: {
      totalSamples: timeSeries.length,
      failureSamples,
      healthySamples,
      sensorTypes: Array.from(sensorTypesSet),
      failureRate: failureSamples / timeSeries.length
    }
  };
}

/**
 * Prepare classification features for Random Forest
 */
export async function prepareClassificationDataset(
  storage: IStorage,
  orgId: string,
  equipmentType?: string
): Promise<ClassificationFeatures[]> {
  const features: ClassificationFeatures[] = [];
  
  const failures = await extractFailureEvents(storage, orgId);
  const allEquipment = await storage.getEquipmentRegistry(orgId);
  
  for (const eq of allEquipment) {
    if (equipmentType && eq.type !== equipmentType) continue;
    
    // Get telemetry stats for last 30 days
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const telemetry = await storage.getTelemetryByEquipmentAndDateRange(
      eq.id,
      startDate,
      endDate,
      orgId
    );
    
    // Calculate aggregate features
    const tempReadings = telemetry.filter(t => t.sensorType.toLowerCase().includes('temp')).map(t => t.value);
    const vibReadings = telemetry.filter(t => t.sensorType.toLowerCase().includes('vib')).map(t => t.value);
    const pressureReadings = telemetry.filter(t => t.sensorType.toLowerCase().includes('pressure')).map(t => t.value);
    
    const avgTemperature = tempReadings.length > 0 
      ? tempReadings.reduce((a, b) => a + b, 0) / tempReadings.length 
      : 0;
    const maxTemperature = tempReadings.length > 0 ? Math.max(...tempReadings) : 0;
    const stdTemperature = calculateStd(tempReadings);
    
    const avgVibration = vibReadings.length > 0 
      ? vibReadings.reduce((a, b) => a + b, 0) / vibReadings.length 
      : 0;
    const maxVibration = vibReadings.length > 0 ? Math.max(...vibReadings) : 0;
    const stdVibration = calculateStd(vibReadings);
    
    const avgPressure = pressureReadings.length > 0 
      ? pressureReadings.reduce((a, b) => a + b, 0) / pressureReadings.length 
      : 0;
    const minPressure = pressureReadings.length > 0 ? Math.min(...pressureReadings) : 0;
    
    // Get failure history
    const equipmentFailures = failures.filter(f => f.equipmentId === eq.id);
    const recentFailure = equipmentFailures.length > 0 
      ? equipmentFailures[equipmentFailures.length - 1]
      : null;
    
    // Determine label based on current health and recent failures
    let label: 'healthy' | 'warning' | 'critical' = 'healthy';
    let failureRisk = 0;
    
    if (recentFailure) {
      const daysSinceFailure = (Date.now() - recentFailure.failureDate.getTime()) / (24 * 60 * 60 * 1000);
      if (daysSinceFailure < 30) {
        label = 'critical';
        failureRisk = 0.8;
      } else if (daysSinceFailure < 90) {
        label = 'warning';
        failureRisk = 0.5;
      }
    }
    
    // Check current telemetry status
    const criticalReadings = telemetry.filter(t => t.status === 'critical').length;
    const warningReadings = telemetry.filter(t => t.status === 'warning').length;
    
    if (criticalReadings > telemetry.length * 0.1) {
      label = 'critical';
      failureRisk = Math.max(failureRisk, 0.7);
    } else if (warningReadings > telemetry.length * 0.2) {
      label = 'warning';
      failureRisk = Math.max(failureRisk, 0.4);
    }
    
    features.push({
      equipmentId: eq.id,
      equipmentType: eq.type,
      features: {
        avgTemperature,
        maxTemperature,
        stdTemperature,
        avgVibration,
        maxVibration,
        stdVibration,
        avgPressure,
        minPressure,
        operatingHours: 0, // TODO: get from equipment
        cycleCount: 0, // TODO: get from equipment
        maintenanceAge: 30, // TODO: calculate from maintenance records
        failureHistory: equipmentFailures.length
      },
      label,
      failureRisk
    });
  }
  
  return features;
}

/**
 * Calculate standard deviation
 */
function calculateStd(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Split dataset into training and validation sets
 */
export function splitDataset<T>(
  data: T[],
  trainRatio: number = 0.8
): { train: T[]; validation: T[] } {
  const shuffled = [...data].sort(() => Math.random() - 0.5);
  const splitIndex = Math.floor(shuffled.length * trainRatio);
  
  return {
    train: shuffled.slice(0, splitIndex),
    validation: shuffled.slice(splitIndex)
  };
}
