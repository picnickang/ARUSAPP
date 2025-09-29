import { storage } from './storage.js';
import { Equipment, SensorConfiguration, InsertSensorConfiguration } from '../shared/schema.js';

/**
 * Equipment-Analytics Integration Service
 * Bridges gaps between equipment registry and analytics systems
 */
export class EquipmentAnalyticsService {
  /**
   * Equipment type sensor templates for automatic configuration
   */
  private static readonly EQUIPMENT_SENSOR_TEMPLATES: Record<string, Array<{
    sensorType: string;
    defaultThresholds: {
      warnLo?: number;
      warnHi?: number;
      critLo?: number;
      critHi?: number;
    };
    targetUnit: string;
    sampleRateHz?: number;
    enabled: boolean;
  }>> = {
    'engine': [
      {
        sensorType: 'temperature',
        defaultThresholds: { warnHi: 85, critHi: 95 },
        targetUnit: '°C',
        sampleRateHz: 1,
        enabled: true
      },
      {
        sensorType: 'oil_pressure',
        defaultThresholds: { warnLo: 2.0, critLo: 1.5 },
        targetUnit: 'bar',
        sampleRateHz: 1,
        enabled: true
      },
      {
        sensorType: 'rpm',
        defaultThresholds: { warnHi: 2100, critHi: 2300 },
        targetUnit: 'rpm',
        sampleRateHz: 10,
        enabled: true
      },
      {
        sensorType: 'vibration',
        defaultThresholds: { warnHi: 10, critHi: 15 },
        targetUnit: 'mm/s',
        sampleRateHz: 1000,
        enabled: true
      }
    ],
    'pump': [
      {
        sensorType: 'flow_rate',
        defaultThresholds: { warnLo: 80, critLo: 60 },
        targetUnit: 'L/min',
        sampleRateHz: 1,
        enabled: true
      },
      {
        sensorType: 'pressure',
        defaultThresholds: { warnLo: 2.5, critLo: 2.0, warnHi: 8.0, critHi: 10.0 },
        targetUnit: 'bar',
        sampleRateHz: 1,
        enabled: true
      },
      {
        sensorType: 'vibration',
        defaultThresholds: { warnHi: 8, critHi: 12 },
        targetUnit: 'mm/s',
        sampleRateHz: 1000,
        enabled: true
      },
      {
        sensorType: 'current',
        defaultThresholds: { warnHi: 45, critHi: 50 },
        targetUnit: 'A',
        sampleRateHz: 1,
        enabled: true
      }
    ],
    'compressor': [
      {
        sensorType: 'pressure',
        defaultThresholds: { warnHi: 12, critHi: 15 },
        targetUnit: 'bar',
        sampleRateHz: 1,
        enabled: true
      },
      {
        sensorType: 'temperature',
        defaultThresholds: { warnHi: 80, critHi: 90 },
        targetUnit: '°C',
        sampleRateHz: 1,
        enabled: true
      },
      {
        sensorType: 'vibration',
        defaultThresholds: { warnHi: 12, critHi: 18 },
        targetUnit: 'mm/s',
        sampleRateHz: 1000,
        enabled: true
      }
    ],
    'generator': [
      {
        sensorType: 'voltage',
        defaultThresholds: { warnLo: 220, critLo: 200, warnHi: 250, critHi: 260 },
        targetUnit: 'V',
        sampleRateHz: 1,
        enabled: true
      },
      {
        sensorType: 'frequency',
        defaultThresholds: { warnLo: 59, critLo: 58, warnHi: 61, critHi: 62 },
        targetUnit: 'Hz',
        sampleRateHz: 1,
        enabled: true
      },
      {
        sensorType: 'temperature',
        defaultThresholds: { warnHi: 75, critHi: 85 },
        targetUnit: '°C',
        sampleRateHz: 1,
        enabled: true
      },
      {
        sensorType: 'load',
        defaultThresholds: { warnHi: 90, critHi: 95 },
        targetUnit: '%',
        sampleRateHz: 1,
        enabled: true
      }
    ],
    'hvac': [
      {
        sensorType: 'temperature',
        defaultThresholds: { warnLo: 18, critLo: 15, warnHi: 26, critHi: 30 },
        targetUnit: '°C',
        sampleRateHz: 0.1,
        enabled: true
      },
      {
        sensorType: 'humidity',
        defaultThresholds: { warnLo: 30, critLo: 20, warnHi: 70, critHi: 80 },
        targetUnit: '%',
        sampleRateHz: 0.1,
        enabled: true
      }
    ],
    'boiler': [
      {
        sensorType: 'pressure',
        defaultThresholds: { warnHi: 8, critHi: 10 },
        targetUnit: 'bar',
        sampleRateHz: 1,
        enabled: true
      },
      {
        sensorType: 'temperature',
        defaultThresholds: { warnHi: 85, critHi: 95 },
        targetUnit: '°C',
        sampleRateHz: 1,
        enabled: true
      },
      {
        sensorType: 'water_level',
        defaultThresholds: { warnLo: 20, critLo: 10 },
        targetUnit: '%',
        sampleRateHz: 1,
        enabled: true
      }
    ]
  };

  /**
   * Setup analytics monitoring for new equipment
   * Called when equipment is created or updated
   */
  async setupEquipmentAnalytics(equipment: Equipment): Promise<void> {
    console.log(`[Equipment Analytics] Setting up analytics for ${equipment.type} equipment: ${equipment.name}`);

    try {
      // 1. Create default sensor configurations based on equipment type
      await this.createDefaultSensorConfigurations(equipment);

      // 2. Setup alert configurations for the equipment
      await this.createDefaultAlertConfigurations(equipment);

      // 3. Initialize analytics monitoring
      await this.initializeAnalyticsMonitoring(equipment);

      console.log(`[Equipment Analytics] Analytics setup completed for equipment ${equipment.id}`);
    } catch (error) {
      console.error(`[Equipment Analytics] Failed to setup analytics for equipment ${equipment.id}:`, error);
      throw error;
    }
  }

  /**
   * Create default sensor configurations based on equipment type
   */
  private async createDefaultSensorConfigurations(equipment: Equipment): Promise<void> {
    const templates = EquipmentAnalyticsService.EQUIPMENT_SENSOR_TEMPLATES[equipment.type.toLowerCase()];
    
    if (!templates) {
      console.log(`[Equipment Analytics] No sensor templates found for equipment type: ${equipment.type}`);
      return;
    }

    const configs: InsertSensorConfiguration[] = templates.map(template => ({
      orgId: equipment.orgId,
      equipmentId: equipment.id,
      sensorType: template.sensorType,
      enabled: template.enabled,
      sampleRateHz: template.sampleRateHz || null,
      gain: 1.0,
      offset: 0.0,
      deadband: 0.0,
      minValid: null,
      maxValid: null,
      warnLo: template.defaultThresholds.warnLo || null,
      warnHi: template.defaultThresholds.warnHi || null,
      critLo: template.defaultThresholds.critLo || null,
      critHi: template.defaultThresholds.critHi || null,
      hysteresis: 0.5,
      emaAlpha: 0.1,
      targetUnit: template.targetUnit,
      notes: `Auto-generated configuration for ${equipment.type} equipment`
    }));

    for (const config of configs) {
      try {
        // Check if configuration already exists
        const existing = await storage.getSensorConfiguration(
          config.equipmentId, 
          config.sensorType, 
          config.orgId
        );

        if (!existing) {
          await storage.createSensorConfiguration(config);
          console.log(`[Equipment Analytics] Created sensor config: ${config.sensorType} for equipment ${equipment.id}`);
        } else {
          console.log(`[Equipment Analytics] Sensor config already exists: ${config.sensorType} for equipment ${equipment.id}`);
        }
      } catch (error) {
        console.error(`[Equipment Analytics] Failed to create sensor config ${config.sensorType}:`, error);
      }
    }
  }

  /**
   * Create default alert configurations
   */
  private async createDefaultAlertConfigurations(equipment: Equipment): Promise<void> {
    const templates = EquipmentAnalyticsService.EQUIPMENT_SENSOR_TEMPLATES[equipment.type.toLowerCase()];
    
    if (!templates) return;

    for (const template of templates) {
      try {
        // Check if alert configuration already exists
        const existingAlerts = await storage.getAlertConfigurations(equipment.id);
        const existingAlert = existingAlerts.find(alert => 
          alert.sensorType === template.sensorType
        );

        if (!existingAlert) {
          await storage.createAlertConfiguration({
            orgId: equipment.orgId,
            equipmentId: equipment.id,
            sensorType: template.sensorType,
            warningThreshold: template.defaultThresholds.warnHi || template.defaultThresholds.warnLo || null,
            criticalThreshold: template.defaultThresholds.critHi || template.defaultThresholds.critLo || null,
            enabled: true,
            notifyEmail: false,
            notifyInApp: true
          });
          console.log(`[Equipment Analytics] Created alert config: ${template.sensorType} for equipment ${equipment.id}`);
        }
      } catch (error) {
        console.error(`[Equipment Analytics] Failed to create alert config ${template.sensorType}:`, error);
      }
    }
  }

  /**
   * Initialize analytics monitoring for equipment
   */
  private async initializeAnalyticsMonitoring(equipment: Equipment): Promise<void> {
    // Setup predictive maintenance baseline if equipment has appropriate sensors
    const sensorConfigs = await storage.getSensorConfigurations(equipment.orgId, equipment.id);
    const hasVibrationSensor = sensorConfigs.some(config => config.sensorType === 'vibration');
    const hasFlowSensor = sensorConfigs.some(config => config.sensorType === 'flow_rate');

    // Initialize PdM baselines based on equipment type and available sensors
    if (hasVibrationSensor && ['engine', 'pump', 'compressor'].includes(equipment.type.toLowerCase())) {
      console.log(`[Equipment Analytics] Vibration monitoring enabled for ${equipment.type}: ${equipment.id}`);
      // PdM baseline will be established automatically when first telemetry data arrives
    }

    if (hasFlowSensor && equipment.type.toLowerCase() === 'pump') {
      console.log(`[Equipment Analytics] Pump performance monitoring enabled for: ${equipment.id}`);
    }

    // Setup anomaly detection monitoring
    console.log(`[Equipment Analytics] Anomaly detection monitoring enabled for equipment: ${equipment.id}`);
  }

  /**
   * Validate that equipment exists before accepting telemetry
   */
  async validateEquipmentExists(equipmentId: string, orgId?: string): Promise<boolean> {
    try {
      const equipment = await storage.getEquipment(equipmentId, orgId);
      return !!equipment;
    } catch (error) {
      console.error(`[Equipment Analytics] Failed to validate equipment ${equipmentId}:`, error);
      return false;
    }
  }

  /**
   * Validate that sensor is configured for equipment before accepting telemetry
   */
  async validateSensorConfiguration(equipmentId: string, sensorType: string, orgId?: string): Promise<boolean> {
    try {
      const config = await storage.getSensorConfiguration(equipmentId, sensorType, orgId);
      return !!config && config.enabled;
    } catch (error) {
      console.error(`[Equipment Analytics] Failed to validate sensor config for ${equipmentId}/${sensorType}:`, error);
      return false;
    }
  }

  /**
   * Get expected sensors for an equipment type
   */
  getExpectedSensors(equipmentType: string): string[] {
    const templates = EquipmentAnalyticsService.EQUIPMENT_SENSOR_TEMPLATES[equipmentType.toLowerCase()];
    return templates ? templates.map(t => t.sensorType) : [];
  }

  /**
   * Check if equipment has all expected sensors configured
   */
  async validateEquipmentSensorCoverage(equipmentId: string, equipmentType: string, orgId?: string): Promise<{
    isComplete: boolean;
    missingSensors: string[];
    configuredSensors: string[];
  }> {
    const expectedSensors = this.getExpectedSensors(equipmentType);
    const sensorConfigs = await storage.getSensorConfigurations(orgId, equipmentId);
    const configuredSensors = sensorConfigs.map(config => config.sensorType);
    
    const missingSensors = expectedSensors.filter(sensor => !configuredSensors.includes(sensor));
    
    return {
      isComplete: missingSensors.length === 0,
      missingSensors,
      configuredSensors
    };
  }

  /**
   * Setup missing sensor configurations for equipment
   */
  async setupMissingSensorConfigurations(equipmentId: string, orgId: string): Promise<void> {
    const equipment = await storage.getEquipment(equipmentId, orgId);
    if (!equipment) {
      throw new Error(`Equipment ${equipmentId} not found`);
    }

    const coverage = await this.validateEquipmentSensorCoverage(equipmentId, equipment.type, orgId);
    
    if (coverage.missingSensors.length > 0) {
      console.log(`[Equipment Analytics] Setting up ${coverage.missingSensors.length} missing sensor configurations for equipment ${equipmentId}`);
      await this.createDefaultSensorConfigurations(equipment);
    }
  }
}

// Export singleton instance
export const equipmentAnalyticsService = new EquipmentAnalyticsService();