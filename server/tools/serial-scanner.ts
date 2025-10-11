/**
 * ARUS Serial Scanner
 * Auto-detects serial ports, probes baud rates, and identifies protocol types
 * 
 * Features:
 * - Auto-discovery of serial ports (/dev/ttyUSB*, /dev/ttyS*, COM*)
 * - Baud rate probing (9600-115200) with hardware error detection
 * - Protocol detection from frame patterns (J1939, J1708, NMEA, Modbus)
 */

import { SerialPort } from 'serialport';

export interface SerialPortInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  pnpId?: string;
  locationId?: string;
  vendorId?: string;
  productId?: string;
}

export interface BaudRateProbeResult {
  baudRate: number;
  success: boolean;
  frameErrorRate: number;
  bytesReceived: number;
}

export interface ProtocolDetectionResult {
  protocol: 'J1939' | 'J1708' | 'NMEA0183' | 'NMEA2000' | 'Modbus' | 'Unknown';
  confidence: number; // 0-1
  patterns: string[];
  sampleData: Buffer;
}

export interface ScanResult {
  portPath: string;
  detectedBaudRate: number;
  protocol: ProtocolDetectionResult;
  portInfo: SerialPortInfo;
  timestamp: Date;
}

export class SerialScanner {
  private readonly baudRates = [9600, 19200, 38400, 57600, 115200];
  private readonly probeTimeoutMs = 2000; // Time to listen on each baud rate
  private readonly minBytesForDetection = 10; // Minimum bytes needed for protocol detection

  /**
   * Scan for all available serial ports on the system
   */
  async scanPorts(): Promise<SerialPortInfo[]> {
    try {
      const ports = await SerialPort.list();
      console.log(`[SerialScanner] Found ${ports.length} serial ports`);
      
      // Filter for likely serial devices (USB, built-in serial)
      const filtered = ports.filter(port => {
        const path = port.path.toLowerCase();
        return (
          path.includes('ttyusb') ||
          path.includes('ttys') ||
          path.includes('ttyacm') ||
          path.includes('com') ||
          path.includes('tty.usb')
        );
      });

      console.log(`[SerialScanner] Filtered to ${filtered.length} candidate ports`);
      return filtered;
    } catch (error) {
      console.error('[SerialScanner] Error scanning ports:', error);
      return [];
    }
  }

  /**
   * Probe a specific port to find the correct baud rate
   */
  async probeBaudRate(portPath: string): Promise<BaudRateProbeResult | null> {
    console.log(`[SerialScanner] Probing baud rates for ${portPath}`);

    for (const baudRate of this.baudRates) {
      try {
        const result = await this.testBaudRate(portPath, baudRate);
        
        // Consider successful if we received data and frame error rate is low
        if (result.bytesReceived > 0 && result.frameErrorRate < 0.1) {
          console.log(`[SerialScanner] Found working baud rate: ${baudRate} for ${portPath}`);
          return result;
        }
      } catch (error) {
        console.warn(`[SerialScanner] Error testing baud rate ${baudRate}:`, error);
      }
    }

    console.warn(`[SerialScanner] No working baud rate found for ${portPath}`);
    return null;
  }

  /**
   * Test a specific baud rate on a port
   */
  private async testBaudRate(portPath: string, baudRate: number): Promise<BaudRateProbeResult> {
    return new Promise((resolve, reject) => {
      let bytesReceived = 0;
      let frameErrors = 0;
      let totalFrames = 0;
      let fatalError = false;

      const port = new SerialPort({
        path: portPath,
        baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
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
          baudRate,
          success: bytesReceived > 0 && !fatalError,
          frameErrorRate: totalFrames > 0 ? frameErrors / totalFrames : 1,
          bytesReceived
        });
      }, this.probeTimeoutMs);

      port.on('data', (data: Buffer) => {
        bytesReceived += data.length;
        totalFrames++;
        // Frame errors tracked via error events below
      });

      port.on('error', (error: any) => {
        // Track hardware frame/parity errors without aborting probe
        // This allows us to measure error rate over the probe duration
        const errorMsg = error.message ? error.message.toLowerCase() : '';
        
        if (errorMsg.includes('frame') || 
            errorMsg.includes('framing') ||
            errorMsg.includes('parity') ||
            errorMsg.includes('overrun')) {
          // Recoverable hardware errors - count them but continue probe
          frameErrors++;
        } else {
          // Fatal errors (device disconnected, permission denied, etc.)
          fatalError = true;
          clearTimeout(timeout);
          cleanup();
          reject(error);
        }
      });

      port.open((error) => {
        if (error) {
          // Open failure is fatal
          clearTimeout(timeout);
          cleanup();
          reject(error);
        }
      });
    });
  }

  /**
   * Detect the protocol type from received data patterns
   */
  detectProtocol(data: Buffer): ProtocolDetectionResult {
    const patterns: string[] = [];
    let protocol: ProtocolDetectionResult['protocol'] = 'Unknown';
    let confidence = 0;

    // J1939 CAN detection (look for typical CAN frame patterns)
    // J1939 uses 29-bit identifier with priority, PGN, source address
    if (this.containsJ1939Pattern(data)) {
      patterns.push('J1939 CAN frame structure');
      protocol = 'J1939';
      confidence = 0.8;
    }

    // J1708 detection (MID, PID structure)
    // Typical: 0x80-0x8F message ID, followed by PID and data
    if (this.containsJ1708Pattern(data)) {
      patterns.push('J1708 MID/PID structure');
      if (protocol === 'Unknown') {
        protocol = 'J1708';
        confidence = 0.75;
      }
    }

    // NMEA 0183 detection (ASCII sentences starting with $)
    if (this.containsNMEA0183Pattern(data)) {
      patterns.push('NMEA 0183 sentence format');
      protocol = 'NMEA0183';
      confidence = 0.9;
    }

    // NMEA 2000 detection (CAN-based, similar to J1939)
    if (this.containsNMEA2000Pattern(data)) {
      patterns.push('NMEA 2000 PGN structure');
      protocol = 'NMEA2000';
      confidence = 0.85;
    }

    // Modbus detection (typical Modbus RTU frame)
    if (this.containsModbusPattern(data)) {
      patterns.push('Modbus RTU frame');
      if (protocol === 'Unknown') {
        protocol = 'Modbus';
        confidence = 0.7;
      }
    }

    return {
      protocol,
      confidence,
      patterns,
      sampleData: data.slice(0, 32) // Keep first 32 bytes as sample
    };
  }

  /**
   * Perform full auto-discovery and protocol detection
   */
  async autoDiscover(): Promise<ScanResult[]> {
    console.log('[SerialScanner] Starting auto-discovery...');
    
    const ports = await this.scanPorts();
    const results: ScanResult[] = [];

    for (const portInfo of ports) {
      try {
        console.log(`[SerialScanner] Scanning ${portInfo.path}...`);

        // Probe baud rate
        const baudResult = await this.probeBaudRate(portInfo.path);
        
        if (!baudResult || !baudResult.success) {
          console.log(`[SerialScanner] Skipping ${portInfo.path} - no valid baud rate found`);
          continue;
        }

        // Collect sample data for protocol detection
        const sampleData = await this.collectSampleData(portInfo.path, baudResult.baudRate);
        
        // Detect protocol
        const protocol = this.detectProtocol(sampleData);

        results.push({
          portPath: portInfo.path,
          detectedBaudRate: baudResult.baudRate,
          protocol,
          portInfo,
          timestamp: new Date()
        });

        console.log(`[SerialScanner] ✓ ${portInfo.path}: ${baudResult.baudRate} baud, ${protocol.protocol} (${Math.round(protocol.confidence * 100)}% confidence)`);

      } catch (error) {
        console.error(`[SerialScanner] Error scanning ${portInfo.path}:`, error);
      }
    }

    console.log(`[SerialScanner] Auto-discovery complete. Found ${results.length} configured ports.`);
    return results;
  }

  /**
   * Collect sample data from a port for protocol detection
   */
  private async collectSampleData(portPath: string, baudRate: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let totalBytes = 0;

      const port = new SerialPort({
        path: portPath,
        baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        autoOpen: false
      });

      const timeout = setTimeout(() => {
        port.close();
        resolve(Buffer.concat(chunks));
      }, 3000); // Collect for 3 seconds

      port.on('data', (data: Buffer) => {
        chunks.push(data);
        totalBytes += data.length;

        // Stop early if we have enough data
        if (totalBytes >= 100) {
          clearTimeout(timeout);
          port.close();
          resolve(Buffer.concat(chunks));
        }
      });

      port.on('error', (error) => {
        clearTimeout(timeout);
        port.close();
        reject(error);
      });

      port.open((error) => {
        if (error) {
          clearTimeout(timeout);
          reject(error);
        }
      });
    });
  }

  // Protocol pattern detection methods

  private containsJ1939Pattern(data: Buffer): boolean {
    // J1939 uses CAN extended frames (29-bit ID)
    // Look for typical J1939 PGN ranges and patterns
    for (let i = 0; i < data.length - 3; i++) {
      // Check for typical J1939 priority (0-7 in top 3 bits)
      const firstByte = data[i];
      if ((firstByte & 0xE0) <= 0xE0) {
        // Check for common J1939 PGNs (0xF000-0xFFFF, 0xEF00-0xEFFF)
        const pgn = (data[i + 1] << 8) | data[i + 2];
        if (pgn >= 0xEF00 || (pgn >= 0xF000 && pgn <= 0xFFFF)) {
          return true;
        }
      }
    }
    return false;
  }

  private containsJ1708Pattern(data: Buffer): boolean {
    // J1708/J1587 frame: [MID][PID][Data bytes...][Checksum]
    // MID (Message ID): 0x80-0xFF (high bit always set)
    // PID (Parameter ID): 0x00-0xFF
    // No explicit length field - data continues until checksum
    
    for (let i = 0; i < data.length - 3; i++) {
      const mid = data[i];
      
      // Check for valid MID (high bit set, indicating message start)
      if ((mid & 0x80) === 0x80) {
        const pid = data[i + 1];
        
        // Verify PID is in valid range and not another MID
        if (pid <= 0xFF && (pid & 0x80) === 0x00) {
          // J1708 typically has 1-6 data bytes before checksum
          // Simple heuristic: if we see MID, PID, and some data, likely J1708
          return true;
        }
      }
    }
    return false;
  }

  private containsNMEA0183Pattern(data: Buffer): boolean {
    // NMEA 0183 sentences start with $ and are ASCII
    const str = data.toString('ascii');
    
    // Look for typical NMEA sentence patterns: $GPGGA, $GPRMC, etc.
    const nmeaPatterns = [
      /\$GP[A-Z]{3}/,
      /\$GL[A-Z]{3}/,
      /\$GN[A-Z]{3}/,
      /\$II[A-Z]{3}/, // Integrated Instrumentation
      /\$IN[A-Z]{3}/  // Integrated Navigation
    ];

    return nmeaPatterns.some(pattern => pattern.test(str));
  }

  private containsNMEA2000Pattern(data: Buffer): boolean {
    // NMEA 2000 is CAN-based with specific PGN ranges
    // PGNs: 59392-61439 (0xE800-0xEFFF) for fast packet
    for (let i = 0; i < data.length - 3; i++) {
      const pgn = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
      if (pgn >= 59392 && pgn <= 61439) {
        return true;
      }
    }
    return false;
  }

  private containsModbusPattern(data: Buffer): boolean {
    // Modbus RTU frame: [Address][Function][Data...][CRC]
    // Address: 1-247, Function: 1-127
    for (let i = 0; i < data.length - 4; i++) {
      const address = data[i];
      const func = data[i + 1];
      
      // Valid Modbus address and function code
      if (address >= 1 && address <= 247 && func >= 1 && func <= 127) {
        return true;
      }
    }
    return false;
  }
}

// Export singleton instance
export const serialScanner = new SerialScanner();
