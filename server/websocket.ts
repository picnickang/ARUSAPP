import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { log } from "./vite";
import { storage } from "./storage";
import { parse as parseUrl } from "url";

interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
}

interface WebSocketClient {
  ws: WebSocket;
  id: string;
  user: AuthenticatedUser | null;
  subscriptions: Set<string>;
  isAuthenticated: boolean;
}

class TelemetryWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocketClient> = new Map();
  private telemetryInterval: NodeJS.Timeout | null = null;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    
    this.wss.on('connection', async (ws, req) => {
      const clientId = this.generateClientId();
      let authenticatedUser: AuthenticatedUser | null = null;
      
      // Authenticate the WebSocket connection - CRITICAL SECURITY CHECK
      try {
        authenticatedUser = await this.authenticateConnection(req);
      } catch (error) {
        log(`WebSocket authentication FAILED for ${clientId}: ${error}`);
        ws.close(4401, 'Authentication required for marine fleet access');
        return;
      }
      
      // Double-check authentication
      if (!authenticatedUser) {
        log(`WebSocket connection REJECTED for ${clientId}: No valid authentication`);
        ws.close(4401, 'Authentication required');
        return;
      }
      
      const client: WebSocketClient = {
        ws,
        id: clientId,
        user: authenticatedUser,
        subscriptions: new Set(),
        isAuthenticated: true
      };
      
      this.clients.set(clientId, client);
      log(`WebSocket client AUTHENTICATED: ${clientId} (${authenticatedUser.username}:${authenticatedUser.role})`);
      
      // Send welcome message to authenticated client only
      ws.send(JSON.stringify({
        type: 'connection',
        clientId,
        authenticated: true,
        user: {
          username: authenticatedUser.username,
          role: authenticatedUser.role
        },
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
        log(`WebSocket client disconnected: ${clientId} (${authenticatedUser?.username})`);
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

  // Authenticate WebSocket connection using token from query params or headers
  private async authenticateConnection(req: any): Promise<AuthenticatedUser | null> {
    const url = parseUrl(req.url || '', true);
    const token = url.query.token as string || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error('No authentication token provided');
    }

    try {
      const session = await storage.getSessionByToken(token);
      if (!session) {
        throw new Error('Invalid or expired session');
      }

      // Check if session is expired
      if (session.expiresAt < new Date()) {
        await storage.deleteSession(token);
        throw new Error('Session expired');
      }

      const user = await storage.getUserById(session.userId);
      if (!user || !user.isActive) {
        throw new Error('User account is inactive');
      }

      // Update session activity
      await storage.updateSessionActivity(token);

      return {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive ?? true
      };
    } catch (error) {
      throw new Error(`Authentication failed: ${error}`);
    }
  }

  // Check if user has permission to subscribe to a channel
  private canSubscribeToChannel(user: AuthenticatedUser | null, channel: string): boolean {
    if (!user) return false;

    const roleHierarchy = ['viewer', 'operator', 'manager', 'admin'];
    const userRoleLevel = roleHierarchy.indexOf(user.role);
    
    // Channel access control
    switch (channel) {
      case 'alerts':
      case 'dashboard':
      case 'telemetry':
        return userRoleLevel >= 0; // Any authenticated user (viewer+)
      
      case 'admin':
      case 'system':
        return userRoleLevel >= 3; // Admin only
      
      case 'management':
        return userRoleLevel >= 2; // Manager+
      
      default:
        return userRoleLevel >= 0; // Default: any authenticated user
    }
  }

  private handleMessage(client: WebSocketClient, message: any) {
    switch (message.type) {
      case 'subscribe':
        if (message.channel) {
          // Check authentication and authorization
          if (!client.isAuthenticated || !client.user) {
            client.ws.send(JSON.stringify({
              type: 'error',
              message: 'Authentication required to subscribe to channels',
              timestamp: new Date().toISOString()
            }));
            return;
          }

          // Check role-based permissions
          if (!this.canSubscribeToChannel(client.user, message.channel)) {
            client.ws.send(JSON.stringify({
              type: 'error',
              message: `Access denied: insufficient permissions for channel '${message.channel}'. Required role not met.`,
              timestamp: new Date().toISOString()
            }));
            log(`Client ${client.id} (${client.user.username}:${client.user.role}) denied access to ${message.channel}`);
            return;
          }

          client.subscriptions.add(message.channel);
          log(`Client ${client.id} (${client.user.username}:${client.user.role}) subscribed to ${message.channel}`);
          
          // Send confirmation
          client.ws.send(JSON.stringify({
            type: 'subscribed',
            channel: message.channel,
            timestamp: new Date().toISOString()
          }));
          
          // Send initial data for specific channels
          if (message.channel === 'alerts') {
            this.sendLatestAlerts(client);
          } else if (message.channel === 'dashboard') {
            this.sendDashboardSnapshot(client);
          }
        }
        break;
      case 'unsubscribe':
        if (message.channel) {
          client.subscriptions.delete(message.channel);
          log(`Client ${client.id} unsubscribed from ${message.channel}`);
          client.ws.send(JSON.stringify({
            type: 'unsubscribed',
            channel: message.channel,
            timestamp: new Date().toISOString()
          }));
        }
        break;
      case 'ping':
        client.ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        break;
      default:
        if (client.isAuthenticated) {
          client.ws.send(JSON.stringify({
            type: 'error',
            message: `Unknown message type: ${message.type}`,
            timestamp: new Date().toISOString()
          }));
        }
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

  // Send dashboard snapshot to a specific client
  private async sendDashboardSnapshot(client: WebSocketClient) {
    try {
      const metrics = await storage.getDashboardMetrics();
      client.ws.send(JSON.stringify({
        type: 'dashboard_initial',
        data: metrics,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      log(`Failed to send dashboard snapshot to client ${client.id}: ${error}`);
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