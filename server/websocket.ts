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
    // Simulate live telemetry data every 5 seconds
    this.telemetryInterval = setInterval(() => {
      this.generateAndBroadcastTelemetry();
    }, 5000);
  }

  private async generateAndBroadcastTelemetry() {
    const equipmentIds = ['ENG1', 'ENG2', 'GEN1', 'PUMP1', 'COMP1'];
    const sensorTypes = ['temperature', 'pressure', 'voltage', 'current', 'rpm'];
    
    for (const equipmentId of equipmentIds) {
      const sensorType = sensorTypes[Math.floor(Math.random() * sensorTypes.length)];
      const baseValue = this.getBaseValue(sensorType);
      const variation = (Math.random() - 0.5) * 0.2; // ±10% variation
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
        await storage.createTelemetryReading(telemetryReading);
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

  private getBaseValue(sensorType: string): number {
    const baseValues: Record<string, number> = {
      temperature: 75, // °C
      pressure: 2.5,   // bar
      voltage: 24.0,   // V
      current: 15.2,   // A
      rpm: 1800        // RPM
    };
    return baseValues[sensorType] || 50;
  }

  private getThreshold(sensorType: string): number {
    const thresholds: Record<string, number> = {
      temperature: 85,
      pressure: 3.0,
      voltage: 28.0,
      current: 20.0,
      rpm: 2000
    };
    return thresholds[sensorType] || 100;
  }

  private getUnit(sensorType: string): string {
    const units: Record<string, string> = {
      temperature: '°C',
      pressure: 'bar',
      voltage: 'V',
      current: 'A',
      rpm: 'RPM'
    };
    return units[sensorType] || 'units';
  }

  private determineStatus(value: number, threshold: number, sensorType: string): string {
    const ratio = value / threshold;
    if (ratio >= 0.95) return 'critical';
    if (ratio >= 0.8) return 'warning';
    return 'normal';
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