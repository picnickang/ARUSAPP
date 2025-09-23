import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { log } from "./vite";
import { storage } from "./storage";

interface WebSocketClient {
  ws: WebSocket;
  id: string;
  subscriptions: Set<string>;
}

class TelemetryWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocketClient> = new Map();
  private telemetryInterval: NodeJS.Timeout | null = null;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      const client: WebSocketClient = {
        ws,
        id: clientId,
        subscriptions: new Set()
      };
      
      this.clients.set(clientId, client);
      log(`WebSocket client connected: ${clientId}`);
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connection',
        clientId,
        timestamp: new Date().toISOString()
      }));
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(client, message);
        } catch (error) {
          log(`WebSocket parse error: ${error}`);
        }
      });
      
      ws.on('close', () => {
        this.clients.delete(clientId);
        log(`WebSocket client disconnected: ${clientId}`);
      });
      
      ws.on('error', (error) => {
        log(`WebSocket error for client ${clientId}: ${error}`);
        this.clients.delete(clientId);
      });
    });
    
    // Start telemetry simulation
    this.startTelemetrySimulation();
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private handleMessage(client: WebSocketClient, message: any) {
    switch (message.type) {
      case 'subscribe':
        if (message.channel) {
          client.subscriptions.add(message.channel);
          log(`Client ${client.id} subscribed to ${message.channel}`);
          
          // Send initial data for specific channels
          if (message.channel === 'alerts') {
            this.sendLatestAlerts(client);
          }
        }
        break;
      case 'unsubscribe':
        if (message.channel) {
          client.subscriptions.delete(message.channel);
          log(`Client ${client.id} unsubscribed from ${message.channel}`);
        }
        break;
      case 'ping':
        client.ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        break;
    }
  }

  private startTelemetrySimulation() {
    log('Starting telemetry simulation - generating data every 5 seconds');
    // Simulate live telemetry data every 5 seconds
    this.telemetryInterval = setInterval(() => {
      this.generateAndBroadcastTelemetry();
    }, 5000);
  }

  private async generateAndBroadcastTelemetry() {
    const equipmentIds = ['ENG1', 'ENG2', 'GEN1', 'GEN2', 'PUMP1'];
    const sensorTypesByEquipment: Record<string, string[]> = {
      'ENG1': ['temperature', 'vibration', 'rpm'],
      'ENG2': ['temperature', 'vibration', 'rpm'], 
      'GEN1': ['voltage', 'current', 'frequency'],
      'GEN2': ['voltage', 'current', 'frequency'],
      'PUMP1': ['pressure', 'flow_rate', 'vibration']
    };
    
    let generatedCount = 0;
    
    // Generate periodic heartbeat for active devices every few cycles
    if (Math.random() < 0.3) { // 30% chance to generate heartbeats
      await this.generateHeartbeats();
    }
    
    for (const equipmentId of equipmentIds) {
      const availableSensors = sensorTypesByEquipment[equipmentId] || ['temperature', 'pressure'];
      // Generate 1-2 readings per equipment per cycle
      const readingsCount = Math.random() < 0.7 ? 1 : 2;
      
      for (let i = 0; i < readingsCount; i++) {
        const sensorType = availableSensors[Math.floor(Math.random() * availableSensors.length)];
        const baseValue = this.getBaseValue(sensorType);
        const variation = (Math.random() - 0.5) * 0.3; // ±15% variation for more realism
        const value = Math.round((baseValue * (1 + variation)) * 100) / 100;
        
        const threshold = this.getThreshold(sensorType);
        const status = this.determineStatus(value, threshold, sensorType);
        
        const telemetryReading = {
          equipmentId,
          sensorType,
          value,
          unit: this.getUnit(sensorType),
          threshold,
          status
        };

        // Persist to database
        try {
          const reading = await storage.createTelemetryReading(telemetryReading);
          generatedCount++;
          
          // Check for alerts after creating telemetry reading
          try {
            // Import the function dynamically to avoid circular dependency
            const { checkAndCreateAlerts } = await import('./routes');
            await checkAndCreateAlerts(reading);
          } catch (alertError) {
            log(`Failed to check alerts for telemetry reading: ${alertError}`);
          }
        } catch (error) {
          log(`Failed to persist telemetry: ${error}`);
        }
        
        const telemetryData = {
          type: 'telemetry',
          data: {
            ...telemetryReading,
            timestamp: new Date().toISOString()
          }
        };
        
        // Broadcast to subscribed clients
        this.broadcast('telemetry', telemetryData);
      }
    }
    
    log(`Generated ${generatedCount} telemetry readings`);
  }

  private async generateHeartbeats() {
    const deviceIds = ['DEV-001', 'DEV-002', 'DEV-004'];
    let heartbeatCount = 0;
    
    for (const deviceId of deviceIds) {
      if (Math.random() < 0.8) { // 80% chance each device sends heartbeat
        const heartbeatData = {
          deviceId,
          cpuPct: Math.round(Math.random() * 40 + 10), // 10-50%
          memPct: Math.round(Math.random() * 30 + 40), // 40-70%
          diskFreeGb: Math.round((Math.random() * 30 + 30) * 10) / 10, // 30-60 GB
          bufferRows: Math.round(Math.random() * 1000 + 500), // 500-1500
          swVersion: `v2.${Math.floor(Math.random() * 3)}.${Math.floor(Math.random() * 10)}`
        };
        
        try {
          await storage.upsertHeartbeat(heartbeatData);
          heartbeatCount++;
          
          // Broadcast heartbeat to subscribed clients
          this.broadcast('heartbeat', {
            type: 'heartbeat',
            data: heartbeatData,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          log(`Failed to persist heartbeat: ${error}`);
        }
      }
    }
    
    if (heartbeatCount > 0) {
      log(`Generated ${heartbeatCount} device heartbeats`);
    }
  }

  private getBaseValue(sensorType: string): number {
    const baseValues: Record<string, number> = {
      temperature: 75,    // °C
      pressure: 80,       // PSI
      voltage: 480,       // V
      current: 125,       // A
      rpm: 1800,         // RPM
      vibration: 2.1,    // mm/s
      flow_rate: 250,    // GPM
      frequency: 60.0    // Hz
    };
    return baseValues[sensorType] || 50;
  }

  private getThreshold(sensorType: string): number {
    const thresholds: Record<string, number> = {
      temperature: 85,
      pressure: 75,      // PSI - warning threshold (critical is lower)
      voltage: 510,      // V
      current: 150,      // A
      rpm: 2000,
      vibration: 2.5,    // mm/s
      flow_rate: 220,    // GPM - warning threshold (critical is lower)
      frequency: 61.5    // Hz
    };
    return thresholds[sensorType] || 100;
  }

  private getUnit(sensorType: string): string {
    const units: Record<string, string> = {
      temperature: '°C',
      pressure: 'PSI',
      voltage: 'V',
      current: 'A',
      rpm: 'RPM',
      vibration: 'mm/s',
      flow_rate: 'GPM',
      frequency: 'Hz'
    };
    return units[sensorType] || 'units';
  }

  private determineStatus(value: number, threshold: number, sensorType: string): string {
    // Define sensor types where low values indicate problems
    const lowIsBadSensors = new Set(['pressure', 'flow_rate']);
    
    if (lowIsBadSensors.has(sensorType)) {
      // For low-is-bad sensors: critical when value is much below threshold
      const ratio = value / threshold;
      if (ratio <= 0.85) return 'critical';
      if (ratio <= 0.92) return 'warning';
      return 'normal';
    } else {
      // For high-is-bad sensors: critical when value exceeds threshold
      const ratio = value / threshold;
      if (ratio >= 0.95) return 'critical';
      if (ratio >= 0.85) return 'warning';
      return 'normal';
    }
  }

  public broadcast(channel: string, data: any) {
    const message = JSON.stringify(data);
    
    this.clients.forEach(client => {
      if (client.subscriptions.has(channel) && client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(message);
        } catch (error) {
          log(`Failed to send to client ${client.id}: ${error}`);
        }
      }
    });
  }

  public broadcastToAll(data: any) {
    const message = JSON.stringify(data);
    
    this.clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(message);
        } catch (error) {
          log(`Failed to send to client ${client.id}: ${error}`);
        }
      }
    });
  }

  // Send latest alerts to a specific client
  private async sendLatestAlerts(client: WebSocketClient) {
    try {
      const alerts = await storage.getAlertNotifications(false); // Get unacknowledged alerts
      client.ws.send(JSON.stringify({
        type: 'alerts_initial',
        data: alerts,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      log(`Failed to send latest alerts to client ${client.id}: ${error}`);
    }
  }

  // Broadcast new alert to all alert subscribers
  public broadcastAlert(alert: any) {
    this.broadcast('alerts', {
      type: 'alert_new',
      data: alert,
      timestamp: new Date().toISOString()
    });
    log(`Broadcasted new alert: ${alert.message}`);
  }

  // Broadcast alert acknowledgment to all alert subscribers
  public broadcastAlertAcknowledged(alertId: string, acknowledgedBy: string) {
    this.broadcast('alerts', {
      type: 'alert_acknowledged',
      data: { alertId, acknowledgedBy },
      timestamp: new Date().toISOString()
    });
    log(`Broadcasted alert acknowledgment: ${alertId}`);
  }

  // Broadcast dashboard updates
  public broadcastDashboardUpdate(updateType: string, data: any) {
    this.broadcast('dashboard', {
      type: `dashboard_${updateType}`,
      data,
      timestamp: new Date().toISOString()
    });
  }

  public getConnectedClients(): number {
    return this.clients.size;
  }

  public destroy() {
    if (this.telemetryInterval) {
      clearInterval(this.telemetryInterval);
      this.telemetryInterval = null;
    }
    
    this.clients.forEach(client => {
      client.ws.close();
    });
    this.clients.clear();
    
    this.wss.close();
  }
}

export { TelemetryWebSocketServer };