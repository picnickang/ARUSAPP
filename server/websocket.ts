import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { log } from "./vite";
import { storage } from "./storage";
import { setWebSocketConnections, incrementWebSocketMessage, incrementWebSocketReconnection } from "./observability";

interface WebSocketClient {
  ws: WebSocket;
  id: string;
  subscriptions: Set<string>;
}

class TelemetryWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocketClient> = new Map();

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
      
      // Update connection metrics (enhanced observability)
      setWebSocketConnections(this.clients.size);
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connection',
        clientId,
        timestamp: new Date().toISOString()
      }));
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          // Track message metrics (enhanced observability)
          incrementWebSocketMessage(message.type || 'unknown');
          
          this.handleMessage(client, message);
        } catch (error) {
          log(`WebSocket parse error: ${error}`);
          incrementWebSocketMessage('parse_error');
        }
      });
      
      ws.on('close', () => {
        this.clients.delete(clientId);
        log(`WebSocket client disconnected: ${clientId}`);
        
        // Update connection metrics (enhanced observability)
        setWebSocketConnections(this.clients.size);
      });
      
      ws.on('error', (error) => {
        log(`WebSocket error for client ${clientId}: ${error}`);
        this.clients.delete(clientId);
        
        // Update connection metrics and track reconnection (enhanced observability)
        setWebSocketConnections(this.clients.size);
        incrementWebSocketReconnection('error');
      });
    });
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
    this.clients.forEach(client => {
      client.ws.close();
    });
    this.clients.clear();
    
    this.wss.close();
  }
}

export { TelemetryWebSocketServer };