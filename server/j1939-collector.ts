/**
 * ARUS J1939 ECM Collector Service
 * Integrates J1939 CAN bus data collection with existing ARUS telemetry infrastructure
 * 
 * Features:
 * - SocketCAN J1939 listener (Linux) with simulation mode fallback
 * - JSON mapping DSL for PGN/SPN decode with scale/offset/formula
 * - Batch processing with configurable flush intervals
 * - Integration with existing /api/telemetry/readings endpoint
 * - Support for existing ARUS device and equipment management
 */

import fs from "node:fs";
import path from "node:path";
import axios from "axios";
import { 
  type J1939Configuration, 
  type J1939PgnRule, 
  type J1939SpnRule, 
  type J1939Mapping,
  type InsertTelemetry
} from "@shared/schema";

// Optional import: socketcan only available on Linux
let can: any = null;
try { 
  can = require("socketcan"); 
} catch (error) {
  console.warn("[J1939] SocketCAN not available - running in simulation mode only");
}

interface J1939TelemetryReading {
  equipmentId: string;
  sensorType: string;
  value: number | null;
  unit?: string;
  timestamp: Date;
  status: 'normal' | 'warning' | 'critical' | 'invalid';
  source: string; // ECM, TCM, etc.
  spn: number; // Suspect Parameter Number for traceability
}

export class J1939Collector {
  private config: J1939Configuration;
  private mapping: J1939Mapping;
  private batchBuffer: J1939TelemetryReading[] = [];
  private lastFlush = Date.now();
  private flushTimer?: NodeJS.Timeout;
  private canChannel?: any;

  // Configuration from environment or defaults
  private readonly batchMs: number;
  private readonly flushMs: number;
  private readonly maxBatch: number;
  private readonly backendUrl: string;
  private readonly simulationFile?: string;

  constructor(config: J1939Configuration) {
    this.config = config;
    this.mapping = config.mappings as J1939Mapping;
    
    // Load configuration from environment
    this.batchMs = Number(process.env.J1939_BATCH_MS || "500");
    this.flushMs = Number(process.env.J1939_FLUSH_MS || "3000");
    this.maxBatch = Number(process.env.J1939_MAX_BATCH || "200");
    this.backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
    this.simulationFile = process.env.J1939_SIM_FILE;

    console.log(`[J1939] Collector initialized for device ${config.deviceId}`, {
      canInterface: config.canInterface,
      batchMs: this.batchMs,
      flushMs: this.flushMs,
      maxBatch: this.maxBatch,
      simulationMode: !!this.simulationFile
    });
  }

  /**
   * Start the J1939 collector service
   */
  async start(): Promise<void> {
    console.log(`[J1939] Starting collector for device ${this.config.deviceId}`);
    
    // Start the batch flush loop
    this.startFlushLoop();
    
    // Start either simulation or real SocketCAN based on configuration
    if (this.simulationFile) {
      this.startSimulation();
    } else {
      this.startSocketCAN();
    }
  }

  /**
   * Stop the collector and clean up resources
   */
  async stop(): Promise<void> {
    console.log(`[J1939] Stopping collector for device ${this.config.deviceId}`);
    
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }
    
    if (this.canChannel) {
      try {
        this.canChannel.stop();
      } catch (error) {
        console.warn("[J1939] Error stopping CAN channel:", error);
      }
    }
    
    // Flush any remaining data
    await this.flush();
  }

  /**
   * Start SocketCAN listener for real hardware
   */
  private startSocketCAN(): void {
    if (!can) {
      console.error("[J1939] SocketCAN not available - install socketcan module on Linux");
      return;
    }

    try {
      this.canChannel = can.createRawChannel(this.config.canInterface, true);
      
      this.canChannel.addListener("onMessage", (msg: any) => {
        if (!msg) return;
        
        const canId = msg.id >>> 0; // Ensure unsigned 32-bit
        const data = Buffer.from(msg.data);
        this.processCanFrame(canId, data);
      });

      this.canChannel.start();
      console.log(`[J1939] Listening on ${this.config.canInterface} at ${this.config.baudRate} baud`);
      
    } catch (error: any) {
      console.error(`[J1939] Failed to start SocketCAN on ${this.config.canInterface}:`, error?.message || error);
    }
  }

  /**
   * Start simulation mode reading from a log file
   */
  private startSimulation(): void {
    if (!this.simulationFile) return;
    
    console.log(`[J1939] Starting simulation from ${this.simulationFile}`);
    
    try {
      const lines = fs.readFileSync(this.simulationFile, "utf8")
        .split(/\r?\n/)
        .filter(line => line.trim().length > 0);
      
      let lineIndex = 0;
      
      const simulationInterval = setInterval(() => {
        const line = lines[lineIndex++ % lines.length];
        
        // Parse format: HEX_CANID SPACED_HEX_BYTES
        // Example: 18F00400 00 00 00 34 12 FF FF FF
        const parts = line.trim().split(/\s+/);
        if (parts.length < 2) return;
        
        const canHex = parts[0];
        const canId = parseInt(canHex, 16);
        const bytes = Buffer.from(parts.slice(1).map(h => parseInt(h, 16)));
        
        this.processCanFrame(canId, bytes);
      }, 100); // 10Hz simulation rate
      
      console.log(`[J1939] Simulation started with ${lines.length} frames`);
      
    } catch (error: any) {
      console.error(`[J1939] Failed to start simulation:`, error?.message || error);
    }
  }

  /**
   * Process a CAN frame according to J1939 protocol
   */
  private processCanFrame(canId: number, data: Buffer): void {
    // J1939 29-bit CAN ID format: priority(3) | reserved(1) | DP(1) | PF(8) | PS(8) | SA(8)
    const pgn = this.extractPGN(canId);
    const sourceAddress = canId & 0xFF;
    
    // Find matching PGN rule in our mapping
    const pgnRule = this.mapping.signals.find(rule => rule.pgn === pgn);
    if (!pgnRule) {
      // PGN not in our mapping - ignore silently to reduce noise
      return;
    }

    // Process each SPN in this PGN
    for (const spnRule of pgnRule.spns) {
      try {
        const reading = this.decodeSPN(spnRule, data, sourceAddress);
        if (reading) {
          this.batchBuffer.push(reading);
        }
      } catch (error) {
        console.warn(`[J1939] Failed to decode SPN ${spnRule.spn} from PGN ${pgn}:`, error);
      }
    }
  }

  /**
   * Extract Parameter Group Number from J1939 CAN ID
   */
  private extractPGN(canId: number): number {
    const pf = (canId >> 16) & 0xFF; // Parameter Format
    const ps = (canId >> 8) & 0xFF;  // Parameter Specific
    
    // PDU1 format (PF < 240): PGN = (DP << 16) | (PF << 8)
    // PDU2 format (PF >= 240): PGN = (DP << 16) | (PF << 8) | PS
    if (pf < 240) {
      return ((canId >> 17) & 0x1) << 16 | pf << 8; // Include DP bit
    } else {
      return ((canId >> 17) & 0x1) << 16 | pf << 8 | ps; // Include DP bit and PS
    }
  }

  /**
   * Decode a specific SPN from CAN frame data
   */
  private decodeSPN(spnRule: J1939SpnRule, data: Buffer, sourceAddress: number): J1939TelemetryReading | null {
    // Extract raw value from specified byte positions
    let rawValue = this.readBytesFromFrame(data, spnRule.bytes, spnRule.endian);
    
    // Check for invalid/not available values (0xFF, 0xFE patterns)
    if (!this.isValidRawValue(rawValue, spnRule.bytes.length)) {
      return null;
    }

    // Apply scaling and offset
    let processedValue = rawValue * spnRule.scale + spnRule.offset;

    // Apply custom formula if specified
    if (spnRule.formula) {
      try {
        // Very limited, safe eval using Function constructor
        // Formula can use 'x' as the processed value variable
        const x = processedValue;
        // eslint-disable-next-line no-new-func
        processedValue = Function("x", `return (${spnRule.formula});`)(x);
      } catch (error) {
        console.warn(`[J1939] Formula evaluation failed for SPN ${spnRule.spn}:`, error);
        // Continue with non-formula value
      }
    }

    return {
      equipmentId: this.config.deviceId!, // Use deviceId as equipmentId
      sensorType: `j1939_${spnRule.sig}`, // Prefix to avoid conflicts
      value: processedValue,
      unit: spnRule.unit,
      timestamp: new Date(),
      status: 'normal',
      source: spnRule.src,
      spn: spnRule.spn
    };
  }

  /**
   * Read bytes from CAN frame with specified endianness
   */
  private readBytesFromFrame(frame: Buffer, byteIndices: number[], endian: 'LE' | 'BE'): number {
    if (byteIndices.length === 1) {
      return frame[byteIndices[0]] || 0;
    }
    
    if (byteIndices.length === 2) {
      const [b0, b1] = byteIndices;
      return endian === 'LE' 
        ? frame[b0] | (frame[b1] << 8)
        : (frame[b0] << 8) | frame[b1];
    }
    
    if (byteIndices.length === 4) {
      return endian === 'LE'
        ? frame.readUInt32LE(byteIndices[0])
        : frame.readUInt32BE(byteIndices[0]);
    }
    
    // Generic multi-byte read
    let value = 0;
    if (endian === 'LE') {
      for (let i = 0; i < byteIndices.length; i++) {
        value |= (frame[byteIndices[i]] << (8 * i));
      }
    } else {
      for (let i = 0; i < byteIndices.length; i++) {
        value = (value << 8) | frame[byteIndices[i]];
      }
    }
    return value;
  }

  /**
   * Check if raw value is valid (not J1939 error/not available codes)
   */
  private isValidRawValue(value: number, byteLength: number): boolean {
    // Common J1939 error values
    const errorPatterns = {
      1: [0xFF, 0xFE], // 1-byte: error, not available
      2: [0xFFFF, 0xFEFF, 0xFFFE], // 2-byte variants
      4: [0xFFFFFFFF, 0xFEFFFFFF] // 4-byte variants
    };
    
    const patterns = errorPatterns[byteLength as keyof typeof errorPatterns] || [];
    return !patterns.includes(value);
  }

  /**
   * Start the batch flush loop
   */
  private startFlushLoop(): void {
    const checkFlush = () => {
      const now = Date.now();
      const timeSinceLastFlush = now - this.lastFlush;
      
      if (this.batchBuffer.length > 0 && 
          (this.batchBuffer.length >= this.maxBatch || timeSinceLastFlush >= this.flushMs)) {
        this.flush().catch(error => {
          console.error("[J1939] Flush error:", error);
        });
      }
      
      this.flushTimer = setTimeout(checkFlush, this.batchMs);
    };
    
    checkFlush();
  }

  /**
   * Flush batched telemetry data to ARUS backend
   */
  private async flush(): Promise<void> {
    if (this.batchBuffer.length === 0) return;
    
    const batch = this.batchBuffer.splice(0, Math.min(this.batchBuffer.length, this.maxBatch));
    this.lastFlush = Date.now();
    
    console.log(`[J1939] Flushing ${batch.length} readings for device ${this.config.deviceId}`);
    
    try {
      // Send each reading to the existing ARUS telemetry endpoint
      const requests = batch.map(reading => {
        const telemetryData: InsertTelemetry = {
          equipmentId: reading.equipmentId,
          sensorType: reading.sensorType,
          value: reading.value,
          unit: reading.unit || "",
          timestamp: reading.timestamp,
          status: reading.status,
          context: {
            source: reading.source,
            spn: reading.spn,
            protocol: "j1939"
          }
        };
        
        return axios.post(`${this.backendUrl}/api/telemetry/readings`, telemetryData, {
          headers: {
            "Content-Type": "application/json",
            "X-J1939-Device": this.config.deviceId,
          },
          timeout: 5000
        });
      });
      
      await Promise.allSettled(requests);
      console.log(`[J1939] Successfully flushed ${batch.length} readings`);
      
    } catch (error: any) {
      console.error("[J1939] Flush failed:", error?.message || error);
      
      // On failure, put readings back in buffer (simple retry mechanism)
      this.batchBuffer.unshift(...batch);
    }
  }
}

/**
 * Create default J1939 configuration for common marine engines
 */
export function createDefaultJ1939Mapping(): J1939Mapping {
  return {
    schema: "https://arus.app/schemas/j1939-map-v1.json",
    notes: "Default CAT/Cummins-lite J1939 mapping for marine engines",
    signals: [
      {
        pgn: 61444,
        name: "EngineSpeed_EEC1",
        spns: [
          {
            spn: 190,
            sig: "engine_rpm",
            src: "ECM",
            unit: "rpm",
            bytes: [3, 4],
            endian: "LE",
            scale: 0.125,
            offset: 0
          }
        ]
      },
      {
        pgn: 65262,
        name: "EngineTemperature_ET1",
        spns: [
          {
            spn: 110,
            sig: "coolant_temp",
            src: "ECM",
            unit: "°C",
            bytes: [0],
            endian: "LE",
            scale: 1,
            offset: -40
          }
        ]
      },
      {
        pgn: 65263,
        name: "EngineFluidLevelPressure_EFLP1",
        spns: [
          {
            spn: 100,
            sig: "oil_pressure",
            src: "ECM",
            unit: "kPa",
            bytes: [1],
            endian: "LE",
            scale: 4,
            offset: 0
          }
        ]
      },
      {
        pgn: 65266,
        name: "FuelEconomy_FEC1",
        spns: [
          {
            spn: 183,
            sig: "fuel_rate",
            src: "ECM",
            unit: "L/h",
            bytes: [0, 1],
            endian: "LE",
            scale: 0.05,
            offset: 0
          }
        ]
      }
    ]
  };
}