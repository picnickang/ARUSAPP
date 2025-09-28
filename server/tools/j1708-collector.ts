/**
 * ARUS J1708/J1587 Serial Collector
 * Collects telemetry from marine engines via J1708/J1587 serial protocol
 * 
 * Features:
 * - Serial port communication with configurable parameters
 * - PID-based parameter mapping (vs PGN/SPN for J1939)
 * - Simulation mode for testing
 * - Integration with existing ARUS telemetry endpoints
 */
import fs from "node:fs";
import path from "node:path";
import { SerialPort } from "serialport";

type MapRow = { 
  mid: number; 
  pid: number; 
  sig: string; 
  src: string; 
  unit?: string; 
  bytes: number[]; 
  endian?: 'LE' | 'BE'; 
  scale?: number; 
  offset?: number 
};

type MapDoc = { signals: MapRow[] };

interface J1708TelemetryReading {
  equipmentId: string;
  sensorType: string;
  value: number | null;
  unit?: string;
  timestamp: Date;
  status: 'normal' | 'warning' | 'critical' | 'invalid';
  source: string;
  mid: number; // Message Identifier for traceability
  pid: number; // Parameter Identifier for traceability
}

export class J1708Collector {
  private equipmentId: string;
  private backendUrl: string;
  private serialPath: string;
  private baudRate: number;
  private mapFile: string;
  private simLogFile?: string;
  private flushMs: number;
  private maxBatch: number;
  
  private rules: MapDoc = { signals: [] };
  private batchBuffer: J1708TelemetryReading[] = [];
  private lastFlush = Date.now();
  private serialPort?: SerialPort;
  private flushTimer?: NodeJS.Timeout;

  constructor() {
    this.equipmentId = process.env.EQUIPMENT_ID || "ENG001";
    this.backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
    this.serialPath = process.env.J1708_TTY || (process.platform === 'win32' ? "COM3" : "/dev/ttyUSB0");
    this.baudRate = Number(process.env.J1708_BAUD || "9600");
    this.mapFile = process.env.J1587_MAP_PATH || path.join(process.cwd(), "server", "config", "j1587.map.json");
    this.simLogFile = process.env.SIM_J1708LOG;
    this.flushMs = Number(process.env.FLUSH_MS || "2000");
    this.maxBatch = Number(process.env.MAX_BATCH || "200");

    console.log(`[J1708] Collector initialized for equipment ${this.equipmentId}`, {
      serialPath: this.serialPath,
      baudRate: this.baudRate,
      mapFile: this.mapFile,
      simulationMode: !!this.simLogFile
    });
  }

  async start(): Promise<void> {
    console.log(`[J1708] Starting collector for equipment ${this.equipmentId}`);
    
    this.loadRules();
    this.startFlushLoop();
    
    if (this.simLogFile) {
      this.startSimulation();
    } else {
      this.startSerial();
    }
  }

  async stop(): Promise<void> {
    console.log(`[J1708] Stopping collector for equipment ${this.equipmentId}`);
    
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }
    
    if (this.serialPort && this.serialPort.isOpen) {
      this.serialPort.close();
    }
    
    // Flush any remaining data
    await this.flush();
  }

  private loadRules(): void {
    try {
      this.rules = JSON.parse(fs.readFileSync(this.mapFile, 'utf8'));
      console.log("[J1708] Loaded mapping:", this.mapFile, "signals:", this.rules.signals.length);
    } catch (error) {
      console.error("[J1708] Failed to load mapping file:", error);
      throw error;
    }
  }

  private readLE(bytes: number[]): number {
    if (bytes.length === 1) return bytes[0];
    if (bytes.length === 2) return bytes[0] | (bytes[1] << 8);
    let v = 0;
    for (let i = 0; i < bytes.length; i++) {
      v |= bytes[i] << (8 * i);
    }
    return v;
  }

  private readBE(bytes: number[]): number {
    if (bytes.length === 1) return bytes[0];
    if (bytes.length === 2) return (bytes[0] << 8) | bytes[1];
    let v = 0;
    for (let i = 0; i < bytes.length; i++) {
      v = (v << 8) | bytes[i];
    }
    return v;
  }

  private handleFrame(mid: number, pid: number, data: number[]): void {
    const matchingRules = this.rules.signals.filter(r => r.mid === mid && r.pid === pid);
    if (!matchingRules.length) return;

    for (const rule of matchingRules) {
      try {
        const slice = rule.bytes.map(ix => data[ix] ?? 0xFF);
        
        // Check for J1708 error/not available values
        if (slice.some(b => b === 0xFF || b === 0xFE)) continue;
        
        let val = (rule.endian === 'BE') ? this.readBE(slice) : this.readLE(slice);
        if (rule.scale) val = val * rule.scale;
        if (rule.offset) val = val + rule.offset;

        const reading: J1708TelemetryReading = {
          equipmentId: this.equipmentId,
          sensorType: `j1708_${rule.sig}`, // Prefix to avoid conflicts
          value: val,
          unit: rule.unit,
          timestamp: new Date(),
          status: 'normal',
          source: rule.src,
          mid,
          pid
        };

        this.batchBuffer.push(reading);
      } catch (error) {
        console.warn(`[J1708] Failed to decode MID ${mid} PID ${pid}:`, error);
      }
    }
  }

  private startSerial(): void {
    try {
      this.serialPort = new SerialPort({ 
        path: this.serialPath, 
        baudRate: this.baudRate 
      });
      
      let accumulator = "";
      
      this.serialPort.on("data", (chunk: Buffer) => {
        accumulator += chunk.toString("utf8");
        let idx;
        while ((idx = accumulator.indexOf("\n")) >= 0) {
          const line = accumulator.slice(0, idx).trim();
          accumulator = accumulator.slice(idx + 1);
          this.parseLine(line);
        }
      });

      this.serialPort.on("error", (error) => {
        console.error("[J1708] Serial port error:", error);
      });
      
      console.log(`[J1708] Serial listening on ${this.serialPath} @ ${this.baudRate} baud`);
      
    } catch (error) {
      console.error(`[J1708] Failed to open serial port ${this.serialPath}:`, error);
      throw error;
    }
  }

  private parseLine(line: string): void {
    // Expect lines like: "80 BE 00 34 12" -> MID=0x80, PID=0xBE(190), data=[0x00,0x34,0x12...]
    if (!line || line.startsWith(";")) return;
    
    const parts = line.trim().split(/\s+/).map(p => parseInt(p, 16));
    if (parts.length < 2 || parts.some(n => Number.isNaN(n))) return;
    
    const mid = parts[0];
    const pid = parts[1];
    const data = parts.slice(2);
    
    this.handleFrame(mid, pid, data);
  }

  private startSimulation(): void {
    if (!this.simLogFile) return;
    
    console.log(`[J1708] Starting simulation from ${this.simLogFile}`);
    
    try {
      const lines = fs.readFileSync(this.simLogFile, "utf8")
        .split(/\r?\n/)
        .filter(line => line.trim().length > 0);
      
      let lineIndex = 0;
      
      const simulationInterval = setInterval(() => {
        const line = lines[lineIndex++ % lines.length];
        this.parseLine(line);
      }, 80); // ~12.5Hz simulation rate
      
      console.log(`[J1708] Simulation started with ${lines.length} frames`);
      
    } catch (error) {
      console.error(`[J1708] Failed to start simulation:`, error);
      throw error;
    }
  }

  private startFlushLoop(): void {
    const checkFlush = () => {
      const now = Date.now();
      const timeSinceLastFlush = now - this.lastFlush;
      
      if (this.batchBuffer.length > 0 && 
          (this.batchBuffer.length >= this.maxBatch || timeSinceLastFlush >= this.flushMs)) {
        this.flush().catch(error => {
          console.error("[J1708] Flush error:", error);
        });
      }
      
      this.flushTimer = setTimeout(checkFlush, 250);
    };
    
    checkFlush();
  }

  private async flush(): Promise<void> {
    if (this.batchBuffer.length === 0) return;
    
    const batch = this.batchBuffer.splice(0, Math.min(this.batchBuffer.length, this.maxBatch));
    this.lastFlush = Date.now();
    
    console.log(`[J1708] Flushing ${batch.length} readings for equipment ${this.equipmentId}`);
    
    try {
      // Send each reading to the existing ARUS telemetry endpoint
      const requests = batch.map(reading => {
        const telemetryData = {
          equipmentId: reading.equipmentId,
          sensorType: reading.sensorType,
          value: reading.value,
          unit: reading.unit || "",
          timestamp: reading.timestamp,
          status: reading.status,
          context: {
            source: reading.source,
            mid: reading.mid,
            pid: reading.pid,
            protocol: "j1708"
          }
        };
        
        return fetch(`${this.backendUrl}/api/telemetry/readings`, {
          method: 'POST',
          headers: {
            "Content-Type": "application/json",
            "X-J1708-Equipment": this.equipmentId,
          },
          body: JSON.stringify(telemetryData),
          signal: AbortSignal.timeout(5000)
        });
      });
      
      await Promise.allSettled(requests);
      console.log(`[J1708] Successfully flushed ${batch.length} readings`);
      
    } catch (error: any) {
      console.error("[J1708] Flush failed:", error?.message || error);
      
      // On failure, put readings back in buffer (simple retry mechanism)
      this.batchBuffer.unshift(...batch);
    }
  }
}

// CLI entry point
export async function main(): Promise<void> {
  const collector = new J1708Collector();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n[J1708] Received SIGINT, shutting down gracefully...');
    await collector.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n[J1708] Received SIGTERM, shutting down gracefully...');
    await collector.stop();
    process.exit(0);
  });
  
  await collector.start();
}

// ES module entry point check
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('[J1708] Fatal error:', error);
    process.exit(1);
  });
}