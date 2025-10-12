/**
 * Adaptive Training Window Service
 * 
 * Implements tier-based data quality assessment and optimal training window calculation
 * for ML models. Uses all available historical data up to a scientifically-backed maximum,
 * with minimum thresholds to ensure model quality.
 * 
 * Industry Alignment:
 * - IBM Maximo: 6+ months minimum
 * - Azure IoT: 2-3 months minimum, 6-12 months recommended
 * - Marine Predictive Maintenance: 12-24 months ideal
 * - 2024 Research: Diminishing returns beyond 18-24 months
 */

import { IStorage } from './storage.js';

export type DataQualityTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface EquipmentDataRange {
  equipmentType: string;
  oldestTelemetryDate: Date | null;
  availableDays: number;
  failureCount: number;
}

export interface TrainingWindowConfig {
  lookbackDays: number;
  tier: DataQualityTier;
  confidenceMultiplier: number;
  warnings: string[];
  recommendations: string[];
  metadata: {
    availableDays: number;
    usedDays: number;
    failureCount: number;
    equipmentType: string;
    tierThresholds: {
      bronze: number;
      silver: number;
      gold: number;
      platinum: number;
    };
  };
}

export interface EquipmentTypeConfig {
  minDays: number;
  category: 'critical' | 'standard' | 'accessory';
}

// Equipment-specific minimum requirements
const EQUIPMENT_CONFIGS: Record<string, EquipmentTypeConfig> = {
  // Critical equipment - highest standards
  'Engine': { minDays: 180, category: 'critical' },
  'Main Engine': { minDays: 180, category: 'critical' },
  'Auxiliary Engine': { minDays: 180, category: 'critical' },
  'Pump': { minDays: 180, category: 'critical' },
  'Hydraulic Pump': { minDays: 180, category: 'critical' },
  'Generator': { minDays: 180, category: 'critical' },
  'Turbine': { minDays: 180, category: 'critical' },
  
  // Standard equipment
  'Compressor': { minDays: 90, category: 'standard' },
  'Heat Exchanger': { minDays: 90, category: 'standard' },
  'Cooling System': { minDays: 90, category: 'standard' },
  'Motor': { minDays: 90, category: 'standard' },
  'Fan': { minDays: 90, category: 'standard' },
  'Blower': { minDays: 90, category: 'standard' },
  'Valve': { minDays: 90, category: 'standard' },
  
  // Accessories
  'Sensor': { minDays: 60, category: 'accessory' },
  'Gauge': { minDays: 60, category: 'accessory' },
  'Switch': { minDays: 60, category: 'accessory' },
  'Indicator': { minDays: 60, category: 'accessory' },
};

// Default configuration for unknown equipment types
const DEFAULT_CONFIG: EquipmentTypeConfig = { 
  minDays: 90, 
  category: 'standard' 
};

// Global training window constraints
const GLOBAL_CONFIG = {
  ABSOLUTE_MIN_DAYS: 60,      // Absolute minimum for any training
  BRONZE_MIN_DAYS: 90,        // Bronze tier starts here
  SILVER_MIN_DAYS: 180,       // Silver tier (6 months)
  GOLD_MIN_DAYS: 365,         // Gold tier (1 year)
  PLATINUM_MIN_DAYS: 730,     // Platinum tier (2 years)
  MAX_DAYS: 730,              // Cap at 2 years (research-backed)
  MIN_FAILURE_COUNT: 3,       // Minimum failures for viable training
  RECOMMENDED_FAILURE_COUNT: 10, // Recommended for good accuracy
};

/**
 * Determine optimal training window based on available data and equipment type
 */
export async function determineOptimalTrainingWindow(
  storage: IStorage,
  orgId: string,
  equipmentType?: string
): Promise<TrainingWindowConfig> {
  // Get equipment-specific configuration
  const equipConfig = equipmentType 
    ? (EQUIPMENT_CONFIGS[equipmentType] || DEFAULT_CONFIG)
    : DEFAULT_CONFIG;

  // Fetch available data range
  const dataRange = await getEquipmentDataRange(storage, orgId, equipmentType);
  
  const { availableDays, failureCount } = dataRange;
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Calculate optimal lookback days
  let lookbackDays: number;
  let tier: DataQualityTier;
  let confidenceMultiplier: number;

  // Check absolute minimum
  if (availableDays < GLOBAL_CONFIG.ABSOLUTE_MIN_DAYS) {
    warnings.push(`Insufficient data: ${availableDays} days available, ${GLOBAL_CONFIG.ABSOLUTE_MIN_DAYS} days required`);
    recommendations.push(`Collect ${GLOBAL_CONFIG.ABSOLUTE_MIN_DAYS - availableDays} more days of telemetry data before training`);
    
    // Return error configuration
    return {
      lookbackDays: availableDays,
      tier: 'bronze',
      confidenceMultiplier: 0.5,
      warnings,
      recommendations,
      metadata: {
        availableDays,
        usedDays: availableDays,
        failureCount,
        equipmentType: equipmentType || 'all',
        tierThresholds: {
          bronze: GLOBAL_CONFIG.BRONZE_MIN_DAYS,
          silver: GLOBAL_CONFIG.SILVER_MIN_DAYS,
          gold: GLOBAL_CONFIG.GOLD_MIN_DAYS,
          platinum: GLOBAL_CONFIG.PLATINUM_MIN_DAYS,
        },
      },
    };
  }

  // Check equipment-specific minimum
  if (availableDays < equipConfig.minDays) {
    warnings.push(`${equipConfig.category} equipment requires ${equipConfig.minDays} days minimum, ${availableDays} days available`);
    recommendations.push(`Collect ${equipConfig.minDays - availableDays} more days for ${equipConfig.category} equipment standards`);
  }

  // Check failure count
  if (failureCount < GLOBAL_CONFIG.MIN_FAILURE_COUNT) {
    warnings.push(`Only ${failureCount} failure events found, ${GLOBAL_CONFIG.MIN_FAILURE_COUNT} minimum recommended`);
    recommendations.push(`Training will proceed with limited failure examples - expect lower accuracy`);
  } else if (failureCount < GLOBAL_CONFIG.RECOMMENDED_FAILURE_COUNT) {
    recommendations.push(`${failureCount} failures available, ${GLOBAL_CONFIG.RECOMMENDED_FAILURE_COUNT}+ recommended for optimal accuracy`);
  }

  // Determine tier and use maximum available data (up to cap)
  lookbackDays = Math.min(availableDays, GLOBAL_CONFIG.MAX_DAYS);

  if (availableDays >= GLOBAL_CONFIG.PLATINUM_MIN_DAYS) {
    tier = 'platinum';
    confidenceMultiplier = 1.2;
    recommendations.push(`Platinum tier: Exceptional data quality with ${Math.floor(availableDays / 30)} months of history`);
  } else if (availableDays >= GLOBAL_CONFIG.GOLD_MIN_DAYS) {
    tier = 'gold';
    confidenceMultiplier = 1.15;
    recommendations.push(`Gold tier: Excellent data quality - ${Math.floor((GLOBAL_CONFIG.PLATINUM_MIN_DAYS - availableDays) / 30)} more months for Platinum`);
  } else if (availableDays >= GLOBAL_CONFIG.SILVER_MIN_DAYS) {
    tier = 'silver';
    confidenceMultiplier = 1.0;
    recommendations.push(`Silver tier: Good data quality - ${Math.floor((GLOBAL_CONFIG.GOLD_MIN_DAYS - availableDays) / 30)} more months for Gold tier`);
  } else {
    tier = 'bronze';
    confidenceMultiplier = 0.85;
    recommendations.push(`Bronze tier: Basic predictions - ${Math.floor((GLOBAL_CONFIG.SILVER_MIN_DAYS - availableDays) / 30)} more months for Silver tier`);
  }

  // Add data cap information if we're using less than available
  if (availableDays > GLOBAL_CONFIG.MAX_DAYS) {
    recommendations.push(`Using optimal ${GLOBAL_CONFIG.MAX_DAYS} days (2 years) - research shows diminishing returns beyond this`);
  }

  return {
    lookbackDays,
    tier,
    confidenceMultiplier,
    warnings,
    recommendations,
    metadata: {
      availableDays,
      usedDays: lookbackDays,
      failureCount,
      equipmentType: equipmentType || 'all',
      tierThresholds: {
        bronze: GLOBAL_CONFIG.BRONZE_MIN_DAYS,
        silver: GLOBAL_CONFIG.SILVER_MIN_DAYS,
        gold: GLOBAL_CONFIG.GOLD_MIN_DAYS,
        platinum: GLOBAL_CONFIG.PLATINUM_MIN_DAYS,
      },
    },
  };
}

/**
 * Get available data range for equipment type
 */
async function getEquipmentDataRange(
  storage: IStorage,
  orgId: string,
  equipmentType?: string
): Promise<EquipmentDataRange> {
  // Get all work orders to count failures
  const workOrders = await storage.getWorkOrders(orgId);
  
  // Get equipment registry to filter by type
  const equipmentList = await storage.getEquipmentRegistry();
  
  // Filter equipment by type if specified
  const relevantEquipment = equipmentType
    ? equipmentList.filter(eq => eq.type === equipmentType)
    : equipmentList;

  if (relevantEquipment.length === 0) {
    return {
      equipmentType: equipmentType || 'all',
      oldestTelemetryDate: null,
      availableDays: 0,
      failureCount: 0,
    };
  }

  const equipmentIds = relevantEquipment.map(eq => eq.id);

  // Count failure work orders (corrective maintenance)
  const failureCount = workOrders.filter(wo => {
    const isRelevantEquipment = wo.equipmentId && equipmentIds.includes(wo.equipmentId);
    const isFailure = wo.maintenanceType === 'corrective' || 
                      wo.priority === 1 || 
                      wo.priority === 2;
    return isRelevantEquipment && isFailure;
  }).length;

  // Get oldest telemetry date
  // Note: This is a simplified version - in production you'd query the database directly
  let oldestDate: Date | null = null;
  
  try {
    // Try to get telemetry for the equipment
    for (const eq of relevantEquipment.slice(0, 5)) { // Sample first 5 to avoid performance issues
      const telemetry = await storage.getTelemetryHistory(eq.id, orgId, 9999); // Large number to get all
      if (telemetry.length > 0) {
        const equipOldest = new Date(Math.min(...telemetry.map(t => new Date(t.ts).getTime())));
        if (!oldestDate || equipOldest < oldestDate) {
          oldestDate = equipOldest;
        }
      }
    }
  } catch (error) {
    console.error('[Adaptive Training Window] Error fetching telemetry history:', error);
  }

  // Calculate available days
  const availableDays = oldestDate 
    ? Math.floor((Date.now() - oldestDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    equipmentType: equipmentType || 'all',
    oldestTelemetryDate: oldestDate,
    availableDays,
    failureCount,
  };
}

/**
 * Calculate tier and confidence multiplier from lookback days
 * Used to enrich legacy models that don't have tier metadata
 */
export function calculateTierFromLookbackDays(lookbackDays: number): {
  tier: DataQualityTier;
  confidenceMultiplier: number;
} {
  if (lookbackDays >= GLOBAL_CONFIG.PLATINUM_MIN_DAYS) {
    return { tier: 'platinum', confidenceMultiplier: 1.2 };
  } else if (lookbackDays >= GLOBAL_CONFIG.GOLD_MIN_DAYS) {
    return { tier: 'gold', confidenceMultiplier: 1.15 };
  } else if (lookbackDays >= GLOBAL_CONFIG.SILVER_MIN_DAYS) {
    return { tier: 'silver', confidenceMultiplier: 1.0 };
  } else {
    return { tier: 'bronze', confidenceMultiplier: 0.85 };
  }
}

/**
 * Get tier badge configuration for UI display
 */
export function getTierBadgeConfig(tier: DataQualityTier): {
  label: string;
  color: string;
  icon: string;
  description: string;
} {
  switch (tier) {
    case 'platinum':
      return {
        label: 'Platinum',
        color: 'bg-purple-500 text-white',
        icon: '💎',
        description: '730+ days - Exceptional confidence',
      };
    case 'gold':
      return {
        label: 'Gold',
        color: 'bg-yellow-500 text-white',
        icon: '🥇',
        description: '365-730 days - High confidence',
      };
    case 'silver':
      return {
        label: 'Silver',
        color: 'bg-gray-400 text-white',
        icon: '🥈',
        description: '180-365 days - Good confidence',
      };
    case 'bronze':
      return {
        label: 'Bronze',
        color: 'bg-orange-600 text-white',
        icon: '🥉',
        description: '90-180 days - Basic predictions',
      };
  }
}

/**
 * Validate if training should proceed
 */
export function shouldAllowTraining(config: TrainingWindowConfig): {
  allowed: boolean;
  reason?: string;
} {
  if (config.metadata.availableDays < GLOBAL_CONFIG.ABSOLUTE_MIN_DAYS) {
    return {
      allowed: false,
      reason: `Insufficient data: ${config.metadata.availableDays} days available, ${GLOBAL_CONFIG.ABSOLUTE_MIN_DAYS} days required`,
    };
  }

  if (config.metadata.failureCount < GLOBAL_CONFIG.MIN_FAILURE_COUNT) {
    return {
      allowed: false,
      reason: `Insufficient failure examples: ${config.metadata.failureCount} found, ${GLOBAL_CONFIG.MIN_FAILURE_COUNT} required`,
    };
  }

  return { allowed: true };
}
