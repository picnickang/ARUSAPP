#!/usr/bin/env node
/**
 * ARUS Edge Diagnostics CLI
 * Unified edge device diagnostic and auto-fix tool
 * 
 * Usage: npm run edge:diagnose [options]
 * 
 * Features:
 * - Auto-discovery of serial ports
 * - Baud rate and protocol detection
 * - Configuration validation
 * - PGN/address conflict resolution
 * - Automated fixes and remediation
 * - Hot-plug detection and monitoring
 * - Real-time diagnostic reporting
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { SerialScanner } from './serial-scanner';
import { ConfigValidator } from './config-validator';
import { AutoFixService } from '../auto-fix-service';
import { storage } from '../storage';
import type { SensorConfiguration } from '@shared/schema';
import { SerialPort } from 'serialport';

interface DiagnosticOptions {
  orgId: string;
  autoFix: boolean;
  watch: boolean;
  portPath?: string;
  verbose: boolean;
}

class EdgeDiagnosticsCLI {
  private scanner: SerialScanner;
  private validator: ConfigValidator;
  private autoFix: AutoFixService;
  private orgId: string;
  private verbose: boolean;

  constructor(options: DiagnosticOptions) {
    this.orgId = options.orgId;
    this.verbose = options.verbose;
    this.scanner = new SerialScanner();
    this.validator = new ConfigValidator(storage, this.orgId);
    this.autoFix = new AutoFixService(this.orgId, {
      enableMqttHttpFallback: options.autoFix,
      enable401CredentialRefresh: options.autoFix,
      enablePortRestart: options.autoFix,
      enableStaleSensorRecovery: options.autoFix
    });
  }

  private log(message: string, level: 'info' | 'warn' | 'error' | 'success' = 'info') {
    const colors = {
      info: '\x1b[36m',    // Cyan
      warn: '\x1b[33m',    // Yellow
      error: '\x1b[31m',   // Red
      success: '\x1b[32m'  // Green
    };
    const reset = '\x1b[0m';
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'success' ? '✅' : 'ℹ️';
    console.log(`${colors[level]}${prefix} ${message}${reset}`);
  }

  private verboseLog(message: string) {
    if (this.verbose) {
      console.log(`   ${message}`);
    }
  }

  /**
   * Run comprehensive edge diagnostics
   */
  async runDiagnostics(portPath?: string): Promise<void> {
    this.log('🚀 Starting ARUS Edge Diagnostics...', 'info');
    console.log('═'.repeat(60));

    try {
      // Step 1: Port Discovery
      if (!portPath) {
        this.log('🔍 Scanning for serial ports...', 'info');
        const ports = await this.scanner.scanPorts();
        
        if (ports.length === 0) {
          this.log('No serial ports found. Please connect edge devices.', 'warn');
          return;
        }

        this.log(`Found ${ports.length} serial port(s)`, 'success');
        ports.forEach((port, idx) => {
          console.log(`   ${idx + 1}. ${port.path}`);
          if (port.manufacturer) this.verboseLog(`      Manufacturer: ${port.manufacturer}`);
          if (port.serialNumber) this.verboseLog(`      Serial: ${port.serialNumber}`);
        });

        console.log();

        // Auto-scan all discovered ports
        for (const port of ports) {
          await this.diagnoseSinglePort(port.path);
        }
      } else {
        // Diagnose specific port
        await this.diagnoseSinglePort(portPath);
      }

    } catch (error: any) {
      this.log(`Diagnostic failed: ${error.message}`, 'error');
      if (this.verbose) {
        console.error(error);
      }
    }
  }

  /**
   * Diagnose a single port
   */
  private async diagnoseSinglePort(portPath: string): Promise<void> {
    console.log(`\n${'─'.repeat(60)}`);
    this.log(`Diagnosing: ${portPath}`, 'info');
    console.log(`${'─'.repeat(60)}`);

    try {
      // Step 2: Baud Rate Detection
      this.log('📊 Probing baud rates...', 'info');
      const baudResult = await this.scanner.probeBaudRate(portPath);
      
      if (!baudResult || !baudResult.success) {
        this.log('Could not detect valid baud rate. Port may be offline or misconfigured.', 'warn');
        return;
      }

      this.log(`Detected baud rate: ${baudResult.baudRate}`, 'success');
      this.verboseLog(`Frame error rate: ${(baudResult.frameErrorRate * 100).toFixed(2)}%`);
      this.verboseLog(`Bytes received: ${baudResult.bytesReceived}`);

      // Step 3: Protocol Detection
      this.log('🔬 Detecting protocol...', 'info');
      const scanResult = await this.scanner.autoScan(portPath);
      
      if (!scanResult) {
        this.log('Protocol detection failed', 'warn');
        return;
      }

      this.log(`Protocol: ${scanResult.protocol.protocol} (${(scanResult.protocol.confidence * 100).toFixed(0)}% confidence)`, 'success');
      if (scanResult.protocol.patterns.length > 0) {
        this.verboseLog(`Patterns: ${scanResult.protocol.patterns.join(', ')}`);
      }

      // Step 4: Load and Validate Sensor Configurations
      this.log('🔧 Validating sensor configurations...', 'info');
      const sensorConfigs = await storage.getSensorConfigurations(this.orgId);
      const portConfigs = sensorConfigs.filter(c => c.portPath === portPath);

      if (portConfigs.length === 0) {
        this.log(`No sensor configurations found for ${portPath}`, 'warn');
        this.log('💡 Suggested configuration:', 'info');
        console.log(`   Port: ${portPath}`);
        console.log(`   Baud Rate: ${scanResult.detectedBaudRate}`);
        console.log(`   Protocol: ${scanResult.protocol.protocol}`);
        return;
      }

      // Validate each configuration
      for (const config of portConfigs) {
        await this.validateAndFix(config);
      }

      // Step 5: Check for PGN/Address Conflicts
      this.log('🔍 Checking for protocol conflicts...', 'info');
      const summary = await this.validator.validateAllConfigs();
      
      if (summary.criticalIssues > 0) {
        this.log(`Found ${summary.criticalIssues} critical issue(s)`, 'error');
      } else if (summary.warnings > 0) {
        this.log(`Found ${summary.warnings} warning(s)`, 'warn');
      } else {
        this.log('No conflicts detected', 'success');
      }

    } catch (error: any) {
      this.log(`Port diagnostic failed: ${error.message}`, 'error');
      if (this.verbose) {
        console.error(error);
      }
    }
  }

  /**
   * Validate a sensor configuration and apply auto-fixes if enabled
   */
  private async validateAndFix(config: SensorConfiguration): Promise<void> {
    console.log(`\n   📌 Sensor: ${config.sensorType || 'Unknown'} (${config.id})`);
    
    const result = await this.validator.validateSensorConfig(config);
    
    // Display metrics
    this.verboseLog(`Frame errors: ${(result.metrics.frameErrorRate * 100).toFixed(2)}%`);
    this.verboseLog(`Traffic: ${result.metrics.trafficDetected ? 'Yes' : 'No'}`);
    this.verboseLog(`Bytes: ${result.metrics.bytesReceived}`);

    // Display issues
    if (result.issues.length === 0) {
      this.log('   Configuration valid', 'success');
      return;
    }

    for (const issue of result.issues) {
      const severity = issue.severity === 'critical' ? 'error' : 'warn';
      this.log(`   ${issue.type}: ${issue.description}`, severity);

      // Apply auto-fix if enabled
      if (issue.suggestedFix) {
        this.log(`   Suggested fix: ${issue.suggestedFix.action}`, 'info');
        
        if (process.argv.includes('--auto-fix')) {
          await this.applyAutoFix(issue, config);
        }
      }
    }
  }

  /**
   * Apply automatic fix based on validation issue
   */
  private async applyAutoFix(issue: any, config: SensorConfiguration): Promise<void> {
    try {
      switch (issue.suggestedFix.action) {
        case 'restart_port':
          this.log('   🔄 Restarting port...', 'info');
          await this.autoFix.handlePortRestart(
            config.portPath,
            config.equipmentId,
            config.id,
            'Configuration validation failed'
          );
          this.log('   Port restarted', 'success');
          break;

        case 'fix_permission':
          this.log('   🔐 Port permission issue detected', 'error');
          this.log(`   Run: sudo chmod 666 ${config.portPath}`, 'info');
          break;

        case 'check_port':
          this.log('   🔌 Port appears disconnected', 'error');
          this.log('   Check physical connection and try hot-plug detection with --watch', 'info');
          break;

        case 'change_baud':
          this.log(`   📊 Suggested baud rate: ${issue.suggestedFix.parameters.suggestedBaudRate}`, 'info');
          break;

        case 'remap_pgn':
          this.log(`   🔄 PGN conflict: Consider using SA ${issue.suggestedFix.parameters.suggestedSourceAddresses?.[0]}`, 'info');
          break;

        default:
          this.log(`   ℹ️  Manual intervention required for: ${issue.suggestedFix.action}`, 'info');
      }
    } catch (error: any) {
      this.log(`   Auto-fix failed: ${error.message}`, 'error');
    }
  }

  /**
   * Watch for hot-plug events (new devices connected/disconnected)
   */
  async watchForHotPlug(): Promise<void> {
    this.log('👁️  Watching for hot-plug events (Ctrl+C to exit)...', 'info');
    console.log('═'.repeat(60));

    let previousPorts = await this.scanner.scanPorts();
    
    const checkInterval = setInterval(async () => {
      try {
        const currentPorts = await this.scanner.scanPorts();
        
        // Detect new ports
        const newPorts = currentPorts.filter(
          cp => !previousPorts.some(pp => pp.path === cp.path)
        );

        // Detect removed ports
        const removedPorts = previousPorts.filter(
          pp => !currentPorts.some(cp => cp.path === pp.path)
        );

        if (newPorts.length > 0) {
          for (const port of newPorts) {
            this.log(`🔌 Device connected: ${port.path}`, 'success');
            await this.diagnoseSinglePort(port.path);
          }
        }

        if (removedPorts.length > 0) {
          for (const port of removedPorts) {
            this.log(`🔌 Device disconnected: ${port.path}`, 'warn');
          }
        }

        previousPorts = currentPorts;
      } catch (error: any) {
        this.log(`Hot-plug detection error: ${error.message}`, 'error');
      }
    }, 3000); // Check every 3 seconds

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      clearInterval(checkInterval);
      this.log('\n👋 Stopping hot-plug detection...', 'info');
      process.exit(0);
    });
  }

  /**
   * Display diagnostic summary
   */
  async displaySummary(): Promise<void> {
    console.log('\n' + '═'.repeat(60));
    this.log('📊 Diagnostic Summary', 'info');
    console.log('═'.repeat(60));

    const configs = await storage.getSensorConfigurations(this.orgId);
    const summary = await this.validator.validateAllConfigs();

    console.log(`\n   Total Sensors: ${configs.length}`);
    console.log(`   Valid Configs: ${summary.validConfigs}`);
    console.log(`   Invalid Configs: ${summary.invalidConfigs}`);
    console.log(`   Critical Issues: ${summary.criticalIssues}`);
    console.log(`   Warnings: ${summary.warnings}`);

    // Get recent diagnostic logs
    const logs = await storage.getEdgeDiagnosticLogs(this.orgId, 10);
    
    if (logs.length > 0) {
      console.log(`\n   Recent Diagnostic Events:`);
      logs.slice(0, 5).forEach((log, idx) => {
        const timestamp = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Unknown';
        const severity = log.severity === 'critical' ? '🔴' : log.severity === 'error' ? '🟠' : '🟡';
        console.log(`   ${idx + 1}. ${severity} [${timestamp}] ${log.eventType}: ${log.message}`);
      });
    }

    console.log('\n' + '═'.repeat(60));
  }
}

// CLI Entry Point
async function main() {
  const argv = await yargs(hideBin(process.argv))
    .usage('Usage: $0 [options]')
    .option('org-id', {
      alias: 'o',
      type: 'string',
      description: 'Organization ID',
      default: 'default-org-id'
    })
    .option('port', {
      alias: 'p',
      type: 'string',
      description: 'Specific port to diagnose (e.g., /dev/ttyUSB0)'
    })
    .option('auto-fix', {
      alias: 'f',
      type: 'boolean',
      description: 'Automatically apply fixes',
      default: false
    })
    .option('watch', {
      alias: 'w',
      type: 'boolean',
      description: 'Watch for hot-plug events',
      default: false
    })
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
      description: 'Verbose output',
      default: false
    })
    .help()
    .alias('help', 'h')
    .example('$0', 'Run diagnostics on all ports')
    .example('$0 --port /dev/ttyUSB0', 'Diagnose specific port')
    .example('$0 --auto-fix', 'Run diagnostics with auto-fix')
    .example('$0 --watch', 'Watch for hot-plug events')
    .argv;

  const cli = new EdgeDiagnosticsCLI({
    orgId: argv['org-id'] as string,
    autoFix: argv['auto-fix'] as boolean,
    watch: argv['watch'] as boolean,
    portPath: argv['port'] as string | undefined,
    verbose: argv['verbose'] as boolean
  });

  try {
    if (argv['watch']) {
      // Hot-plug mode
      await cli.watchForHotPlug();
    } else {
      // One-time diagnostic
      await cli.runDiagnostics(argv['port'] as string | undefined);
      await cli.displaySummary();
    }
  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    if (argv['verbose']) {
      console.error(error);
    }
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { EdgeDiagnosticsCLI };
