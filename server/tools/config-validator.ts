/**
 * ARUS Config Validator
 * Validates serial/CAN configurations and detects common issues
 * 
 * Features:
 * - Wrong baud/parity detection via frame error analysis
 * - No traffic timeout detection
 * - PGN/address conflict detection and auto-remapping
 * - Integration with AutoFixService for automated repairs
 */

import { SerialPort } from 'serialport';
import type { IStorage } from '../storage';
import type { SensorConfiguration } from '@shared/schema';

export interface ValidationIssue {
  type: 'baud_mismatch' | 'parity_error' | 'no_traffic' | 'pgn_conflict' | 'address_conflict' | 'port_offline' | 'port_permission';
  severity: 'warning' | 'error' | 'critical';
  description: string;
  affectedSensor?: string;
  suggestedFix?: {
    action: 'change_baud' | 'change_parity' | 'remap_pgn' | 'remap_address' | 'restart_port' | 'check_port' | 'fix_permission';
    parameters: Record<string, any>;
  };
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  metrics: {
    frameErrorRate: number;
    bytesReceived: number;
    trafficDetected: boolean;
    lastDataTimestamp?: Date;
  };
}

export interface PGNMapping {
  pgn: number;
  sourceAddress: number;
  sensorId: string;
  equipmentId: string;
}

export class ConfigValidator {
  private readonly trafficTimeoutMs = 10000; // 10 seconds without data = no traffic
  private readonly maxFrameErrorRate = 0.15; // 15% frame errors = config issue
  private readonly testDurationMs = 10000; // Test port for 10 seconds (match timeout)

  constructor(private storage: IStorage, private orgId: string) {}

  /**
   * Validate a sensor configuration
   */
  async validateSensorConfig(
    config: SensorConfiguration
  ): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    let frameErrorRate = 0;
    let bytesReceived = 0;
    let trafficDetected = false;
    let lastDataTimestamp: Date | undefined;

    try {
      // Test serial port configuration
      if (config.portPath && config.baudRate) {
        const portTest = await this.testPortConfig(
          config.portPath,
          config.baudRate,
          config.parity || 'none',
          config.dataBits || 8,
          config.stopBits || 1
        );

        frameErrorRate = portTest.frameErrorRate;
        bytesReceived = portTest.bytesReceived;
        trafficDetected = portTest.trafficDetected;
        lastDataTimestamp = portTest.lastDataTimestamp;

        // Check for baud rate mismatch
        if (portTest.frameErrorRate > this.maxFrameErrorRate && portTest.bytesReceived > 0) {
          issues.push({
            type: 'baud_mismatch',
            severity: 'error',
            description: `High frame error rate (${Math.round(portTest.frameErrorRate * 100)}%) suggests incorrect baud rate`,
            affectedSensor: config.id,
            suggestedFix: {
              action: 'change_baud',
              parameters: {
                currentBaud: config.baudRate,
                suggestedBauds: [9600, 19200, 38400, 57600, 115200].filter(b => b !== config.baudRate)
              }
            }
          });
        }

        // Check for parity errors
        if (portTest.parityErrors > 0) {
          issues.push({
            type: 'parity_error',
            severity: 'warning',
            description: `Detected ${portTest.parityErrors} parity errors. Current parity: ${config.parity || 'none'}`,
            affectedSensor: config.id,
            suggestedFix: {
              action: 'change_parity',
              parameters: {
                currentParity: config.parity || 'none',
                suggestedParities: ['none', 'even', 'odd'].filter(p => p !== config.parity)
              }
            }
          });
        }

        // Check for no traffic
        if (!portTest.trafficDetected) {
          issues.push({
            type: 'no_traffic',
            severity: 'critical',
            description: `No data received within ${this.trafficTimeoutMs / 1000}s timeout`,
            affectedSensor: config.id,
            suggestedFix: {
              action: 'restart_port',
              parameters: {
                portPath: config.portPath
              }
            }
          });
        }
      }

      // Check for PGN/address conflicts if J1939
      if (config.protocol === 'J1939' || config.protocol === 'NMEA2000') {
        const conflicts = await this.detectPGNConflicts(config);
        issues.push(...conflicts);
      }

    } catch (error: any) {
      // Categorize port errors correctly for proper remediation
      const errorMsg = error.message ? error.message.toLowerCase() : '';
      
      if (errorMsg.includes('permission') || errorMsg.includes('access denied')) {
        issues.push({
          type: 'port_permission',
          severity: 'critical',
          description: `Port access denied: ${error.message}. Check permissions or user access rights.`,
          affectedSensor: config.id,
          suggestedFix: {
            action: 'fix_permission',
            parameters: { portPath: config.portPath }
          }
        });
      } else if (errorMsg.includes('no such file') || errorMsg.includes('not found') || errorMsg.includes('enoent')) {
        issues.push({
          type: 'port_offline',
          severity: 'critical',
          description: `Port not found: ${error.message}. Device may be disconnected.`,
          affectedSensor: config.id,
          suggestedFix: {
            action: 'check_port',
            parameters: { portPath: config.portPath }
          }
        });
      } else {
        // Generic port error - could be configuration-related
        issues.push({
          type: 'baud_mismatch',
          severity: 'critical',
          description: `Port configuration test failed: ${error.message}`,
          affectedSensor: config.id,
          suggestedFix: {
            action: 'restart_port',
            parameters: { portPath: config.portPath }
          }
        });
      }
    }

    return {
      isValid: issues.filter(i => i.severity === 'critical' || i.severity === 'error').length === 0,
      issues,
      metrics: {
        frameErrorRate,
        bytesReceived,
        trafficDetected,
        lastDataTimestamp
      }
    };
  }

  /**
   * Test a specific port configuration
   */
  private async testPortConfig(
    portPath: string,
    baudRate: number,
    parity: 'none' | 'even' | 'odd',
    dataBits: 5 | 6 | 7 | 8,
    stopBits: 1 | 2
  ): Promise<{
    frameErrorRate: number;
    bytesReceived: number;
    parityErrors: number;
    trafficDetected: boolean;
    lastDataTimestamp?: Date;
  }> {
    return new Promise((resolve, reject) => {
      let bytesReceived = 0;
      let frameErrors = 0;
      let parityErrors = 0;
      let totalFrames = 0;
      let lastDataTimestamp: Date | undefined;

      const port = new SerialPort({
        path: portPath,
        baudRate,
        dataBits,
        stopBits,
        parity,
        autoOpen: false
      });

      const cleanup = () => {
        if (port.isOpen) {
          port.close();
        }
      };

      const timeout = setTimeout(() => {
        cleanup();
        resolve({
          frameErrorRate: totalFrames > 0 ? frameErrors / totalFrames : 0,
          bytesReceived,
          parityErrors,
          trafficDetected: bytesReceived > 0,
          lastDataTimestamp
        });
      }, this.testDurationMs);

      port.on('data', (data: Buffer) => {
        bytesReceived += data.length;
        totalFrames++;
        lastDataTimestamp = new Date();
      });

      port.on('error', (error: any) => {
        const errorMsg = error.message ? error.message.toLowerCase() : '';
        
        if (errorMsg.includes('parity')) {
          parityErrors++;
        }
        if (errorMsg.includes('frame') || errorMsg.includes('framing')) {
          frameErrors++;
        }
      });

      port.open((error) => {
        if (error) {
          // Port open failures should reject so validateSensorConfig can categorize them
          clearTimeout(timeout);
          cleanup();
          reject(error);
        }
      });
    });
  }

  /**
   * Detect PGN/address conflicts in J1939/NMEA2000 configurations
   */
  private async detectPGNConflicts(config: SensorConfiguration): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    try {
      // Get all sensor configurations for this organization
      const allConfigs = await this.storage.getSensorConfigurations(this.orgId);

      // Build PGN mapping
      const pgnMappings: PGNMapping[] = [];
      
      for (const sensorConfig of allConfigs) {
        if (sensorConfig.protocol === 'J1939' || sensorConfig.protocol === 'NMEA2000') {
          // Parse PGN and source address from signal mapping if available
          if (sensorConfig.signalMapping) {
            try {
              const mapping = JSON.parse(sensorConfig.signalMapping);
              const pgn = mapping.pgn || mapping.PGN;
              const sourceAddress = mapping.sourceAddress || mapping.source_address || mapping.sa;

              if (pgn !== undefined && sourceAddress !== undefined) {
                pgnMappings.push({
                  pgn,
                  sourceAddress,
                  sensorId: sensorConfig.id,
                  equipmentId: sensorConfig.equipmentId
                });
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      // Check for conflicts with current config
      if (config.signalMapping) {
        try {
          const currentMapping = JSON.parse(config.signalMapping);
          const currentPGN = currentMapping.pgn || currentMapping.PGN;
          const currentSA = currentMapping.sourceAddress || currentMapping.source_address || currentMapping.sa;

          if (currentPGN !== undefined && currentSA !== undefined) {
            // Check for exact PGN + SA conflicts at BUS LEVEL (org-wide)
            // J1939/NMEA2000 conflicts happen on the physical bus, not per-equipment
            const exactConflicts = pgnMappings.filter(
              m => m.pgn === currentPGN && 
                   m.sourceAddress === currentSA && 
                   m.sensorId !== config.id
              // No equipmentId filter - check entire org/bus
            );

            if (exactConflicts.length > 0) {
              issues.push({
                type: 'pgn_conflict',
                severity: 'critical',
                description: `PGN ${currentPGN} with source address ${currentSA} is already mapped to sensor ${exactConflicts[0].sensorId} on equipment ${exactConflicts[0].equipmentId}. Bus-level conflict detected.`,
                affectedSensor: config.id,
                suggestedFix: {
                  action: 'remap_pgn',
                  parameters: {
                    conflictingSensorId: exactConflicts[0].sensorId,
                    conflictingEquipmentId: exactConflicts[0].equipmentId,
                    currentPGN,
                    currentSourceAddress: currentSA,
                    suggestedSourceAddresses: this.generateAlternativeAddresses(currentSA, pgnMappings)
                  }
                }
              });
            }

            // Check for source address conflicts (same SA, different PGN) at BUS LEVEL
            const addressConflicts = pgnMappings.filter(
              m => m.sourceAddress === currentSA && 
                   m.pgn !== currentPGN &&
                   m.sensorId !== config.id
              // No equipmentId filter - check entire org/bus
            );

            if (addressConflicts.length > 0) {
              issues.push({
                type: 'address_conflict',
                severity: 'warning',
                description: `Source address ${currentSA} is used by multiple PGNs across the bus (equipment: ${addressConflicts[0].equipmentId}). This may cause data corruption.`,
                affectedSensor: config.id,
                suggestedFix: {
                  action: 'remap_address',
                  parameters: {
                    currentSourceAddress: currentSA,
                    conflictingEquipmentId: addressConflicts[0].equipmentId,
                    suggestedSourceAddresses: this.generateAlternativeAddresses(currentSA, pgnMappings)
                  }
                }
              });
            }
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }

    } catch (error) {
      console.error('[ConfigValidator] Error detecting PGN conflicts:', error);
    }

    return issues;
  }

  /**
   * Generate alternative source addresses to avoid conflicts
   */
  private generateAlternativeAddresses(currentAddress: number, existingMappings: PGNMapping[]): number[] {
    const usedAddresses = new Set(existingMappings.map(m => m.sourceAddress));
    const alternatives: number[] = [];

    // J1939 valid source addresses: 0-253 (254 = null, 255 = global)
    for (let addr = 0; addr <= 253; addr++) {
      if (!usedAddresses.has(addr) && addr !== currentAddress) {
        alternatives.push(addr);
        if (alternatives.length >= 5) break; // Return top 5 alternatives
      }
    }

    return alternatives;
  }

  /**
   * Validate all sensor configurations for an organization
   */
  async validateAllConfigs(): Promise<Map<string, ValidationResult>> {
    const results = new Map<string, ValidationResult>();

    try {
      const configs = await this.storage.getSensorConfigurations(this.orgId);

      // Validate each configuration
      for (const config of configs) {
        const result = await this.validateSensorConfig(config);
        results.set(config.id, result);
      }
    } catch (error) {
      console.error('[ConfigValidator] Error validating all configs:', error);
    }

    return results;
  }

  /**
   * Get validation summary for dashboard
   */
  async getValidationSummary(): Promise<{
    totalConfigs: number;
    validConfigs: number;
    invalidConfigs: number;
    criticalIssues: number;
    warnings: number;
  }> {
    const results = await this.validateAllConfigs();
    
    let validConfigs = 0;
    let criticalIssues = 0;
    let warnings = 0;

    for (const [_, result] of results) {
      if (result.isValid) {
        validConfigs++;
      }

      for (const issue of result.issues) {
        if (issue.severity === 'critical' || issue.severity === 'error') {
          criticalIssues++;
        } else if (issue.severity === 'warning') {
          warnings++;
        }
      }
    }

    return {
      totalConfigs: results.size,
      validConfigs,
      invalidConfigs: results.size - validConfigs,
      criticalIssues,
      warnings
    };
  }
}
