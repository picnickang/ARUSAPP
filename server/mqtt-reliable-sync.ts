/**
 * MQTT Reliable Sync Service
 * Provides persistent, guaranteed-delivery sync for critical data using MQTT
 * 
 * Why MQTT instead of WebSocket for critical sync:
 * - Message persistence (retained messages)
 * - Quality of Service (QoS) levels for guaranteed delivery
 * - Automatic message replay on reconnect
 * - Durable subscriptions
 * - Better for unreliable networks (common on vessels)
 * 
 * This replaces WebSocket for safety-critical data (work orders, alerts, equipment changes)
 * while keeping WebSocket for nice-to-have dashboard updates.
 */

import { EventEmitter } from 'events';
import mqtt from 'mqtt';
import { db } from './db';
import { workOrders, alertNotifications, equipment, crew, maintenanceSchedules } from '@shared/schema';
import { gte } from 'drizzle-orm';
import {
  updateMqttMetrics,
  setMqttConnectionStatus,
  incrementMqttReconnectionAttempts,
  incrementMqttQueueFlushes
} from './observability';

interface MqttMessage {
  topic: string;
  payload: any;
  qos: 0 | 1 | 2;  // Quality of Service level
  retain: boolean;   // Whether to retain message for late joiners
}

interface ReliableSyncConfig {
  brokerUrl: string;
  clientIdPrefix: string;
  reconnectPeriod: number;
  qosLevel: 0 | 1 | 2;
  maxQueueSize: number;
  enableTls: boolean;
}

/**
 * MQTT Reliable Sync Service
 * Handles critical data synchronization with guaranteed delivery
 */
export class MqttReliableSyncService extends EventEmitter {
  private client: mqtt.MqttClient | null = null;
  private config: ReliableSyncConfig;
  private isConnected: boolean = false;
  private messageQueue: MqttMessage[] = [];
  private subscriptions: Map<string, Set<(payload: any) => void>> = new Map();
  private reconnectAttempts: number = 0;
  
  // Metrics for monitoring
  private metrics = {
    messagesPublished: 0,
    messagesQueued: 0,
    messagesDropped: 0,
    publishFailures: 0,
    reconnectionAttempts: 0,
    queueFlushes: 0
  };

  // Topic structure for organized sync
  private readonly topics = {
    // Critical entities (QoS 1 - at least once delivery)
    workOrders: 'vessel/sync/work_orders',
    alerts: 'vessel/sync/alerts',
    equipment: 'vessel/sync/equipment',
    crew: 'vessel/sync/crew',
    maintenance: 'vessel/sync/maintenance',
    
    // System events (QoS 1)
    system: 'vessel/sync/system',
    conflicts: 'vessel/sync/conflicts',
    
    // Catchup messages for reconnecting clients
    catchup: 'vessel/sync/catchup/#'  // Wildcard for all catchup topics
  };

  constructor(config: Partial<ReliableSyncConfig> = {}) {
    super();
    
    this.config = {
      brokerUrl: config.brokerUrl || process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
      clientIdPrefix: config.clientIdPrefix || 'arus_sync',
      reconnectPeriod: config.reconnectPeriod || 5000,
      qosLevel: config.qosLevel || 1,  // Default to QoS 1 (at least once)
      maxQueueSize: config.maxQueueSize || parseInt(process.env.MQTT_MAX_QUEUE_SIZE || '10000'),
      enableTls: config.enableTls ?? (process.env.MQTT_BROKER_URL?.startsWith('mqtts://') || false)
    };

    console.log('[MQTT Reliable Sync] Service initialized');
    console.log(`  Broker: ${this.config.brokerUrl}`);
    console.log(`  QoS Level: ${this.config.qosLevel}`);
    console.log(`  Max Queue Size: ${this.config.maxQueueSize}`);
    console.log(`  TLS Enabled: ${this.config.enableTls}`);
  }

  /**
   * Start MQTT client and connect to broker
   * Gracefully handles broker unavailability
   */
  async start() {
    console.log('[MQTT Reliable Sync] Starting...');
    console.log(`  Connecting to broker: ${this.config.brokerUrl}`);
    
    try {
      // Connect to MQTT broker with durable session
      this.client = mqtt.connect(this.config.brokerUrl, {
        clientId: `${this.config.clientIdPrefix}_${Date.now()}`,
        clean: false,  // Durable session - broker remembers subscriptions
        reconnectPeriod: this.config.reconnectPeriod,
        connectTimeout: 10 * 1000,  // 10 seconds
        keepalive: 60,  // Send ping every 60 seconds
        will: {
          topic: `${this.topics.system}/status`,
          payload: JSON.stringify({ status: 'offline', timestamp: new Date().toISOString() }),
          qos: 1,
          retain: true
        }
      });

      // Set up event handlers
      this.setupEventHandlers();

      // Wait for connection with timeout
      return new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          console.warn('[MQTT Reliable Sync] ⚠ Broker connection timeout - running in offline mode');
          console.warn('  Messages will be queued for delivery when broker becomes available');
          console.warn('  To enable MQTT, configure MQTT_BROKER_URL environment variable');
          // Don't reject - allow service to continue in offline mode
          resolve();
        }, 10000);

        this.client?.once('connect', () => {
          clearTimeout(timeout);
          console.log('[MQTT Reliable Sync] ✓ Connected to broker');
          resolve();
        });

        this.client?.once('error', (err) => {
          // Don't reject on error - we'll retry in background
          console.error('[MQTT Reliable Sync] Connection error:', err.message);
        });
      });
    } catch (error) {
      console.error('[MQTT Reliable Sync] Failed to start:', error);
      console.warn('[MQTT Reliable Sync] Continuing in offline mode');
      // Don't throw - allow server to continue
    }
  }

  /**
   * Set up MQTT event handlers
   */
  private setupEventHandlers() {
    if (!this.client) return;

    this.client.on('connect', () => {
      console.log('[MQTT Reliable Sync] ✓ Connected to broker');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Update Prometheus metrics
      setMqttConnectionStatus(true);

      // Publish online status
      this.client?.publish(
        `${this.topics.system}/status`,
        JSON.stringify({ status: 'online', timestamp: new Date().toISOString() }),
        { qos: 1, retain: true }
      );

      // Resubscribe to all active subscriptions
      this.resubscribeAll();

      // Flush queued messages
      this.flushMessageQueue();

      this.emit('connected');
    });

    this.client.on('disconnect', () => {
      console.log('[MQTT Reliable Sync] Disconnected from broker');
      this.isConnected = false;
      
      // Update Prometheus metrics
      setMqttConnectionStatus(false);
      
      this.emit('disconnected');
    });

    this.client.on('reconnect', () => {
      this.reconnectAttempts++;
      this.metrics.reconnectionAttempts++;
      
      // Update Prometheus metrics
      incrementMqttReconnectionAttempts();
      
      // Log reconnection attempts with exponential backoff to avoid log spam
      // Log every attempt for first 10, then every 10th, then every 100th
      const shouldLog = this.reconnectAttempts <= 10 || 
                       (this.reconnectAttempts <= 100 && this.reconnectAttempts % 10 === 0) ||
                       (this.reconnectAttempts % 100 === 0);
      
      if (shouldLog) {
        console.log(`[MQTT Reliable Sync] Reconnecting... (attempt ${this.reconnectAttempts}, queue: ${this.messageQueue.length})`);
      }
      
      // Never force disconnect - allow indefinite retries for vessel reliability
      // Vessel networks can be unstable for extended periods
    });

    this.client.on('error', (error) => {
      console.error('[MQTT Reliable Sync] Error:', error.message);
      this.emit('error', error);
    });

    this.client.on('message', (topic, payload) => {
      try {
        const message = JSON.parse(payload.toString());
        this.handleIncomingMessage(topic, message);
      } catch (error) {
        console.error('[MQTT Reliable Sync] Failed to parse message:', error);
      }
    });

    this.client.on('offline', () => {
      console.log('[MQTT Reliable Sync] Client offline');
      this.isConnected = false;
      
      // Update Prometheus metrics
      setMqttConnectionStatus(false);
    });
  }

  /**
   * Handle incoming MQTT message
   */
  private handleIncomingMessage(topic: string, message: any) {
    // Call all callbacks registered for this topic
    const callbacks = this.subscriptions.get(topic);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(message);
        } catch (error) {
          console.error('[MQTT Reliable Sync] Callback error:', error);
        }
      });
    }

    // Also check for wildcard subscriptions
    this.subscriptions.forEach((callbacks, subscribedTopic) => {
      if (subscribedTopic.includes('#') || subscribedTopic.includes('+')) {
        if (this.topicMatches(subscribedTopic, topic)) {
          callbacks.forEach(callback => {
            try {
              callback(message);
            } catch (error) {
              console.error('[MQTT Reliable Sync] Callback error:', error);
            }
          });
        }
      }
    });

    this.emit('message', { topic, message });
  }

  /**
   * Check if a topic matches a subscription pattern
   */
  private topicMatches(pattern: string, topic: string): boolean {
    const patternParts = pattern.split('/');
    const topicParts = topic.split('/');

    if (patternParts.length > topicParts.length) return false;

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === '#') return true;  // Multi-level wildcard
      if (patternParts[i] === '+') continue;     // Single-level wildcard
      if (patternParts[i] !== topicParts[i]) return false;
    }

    return patternParts.length === topicParts.length;
  }

  /**
   * Resubscribe to all active subscriptions after reconnect
   */
  private resubscribeAll() {
    if (!this.client || !this.isConnected) return;

    console.log(`[MQTT Reliable Sync] Resubscribing to ${this.subscriptions.size} topics`);
    
    this.subscriptions.forEach((_, topic) => {
      this.client?.subscribe(topic, { qos: 1 }, (error) => {
        if (error) {
          console.error(`[MQTT Reliable Sync] Failed to resubscribe to ${topic}:`, error);
        }
      });
    });
  }

  /**
   * Stop MQTT client
   */
  async stop() {
    if (this.client) {
      // Publish offline status before disconnecting
      if (this.isConnected) {
        await new Promise<void>((resolve) => {
          this.client?.publish(
            `${this.topics.system}/status`,
            JSON.stringify({ status: 'offline', timestamp: new Date().toISOString() }),
            { qos: 1, retain: true },
            () => resolve()
          );
        });
      }

      this.client.end();
      this.isConnected = false;
    }
    console.log('[MQTT Reliable Sync] Stopped');
  }

  /**
   * Publish critical data change with guaranteed delivery
   * 
   * @param entityType - Type of entity (work_order, alert, equipment, etc.)
   * @param operation - Operation performed (create, update, delete)
   * @param data - The entity data
   * @param options - Publishing options (QoS, retain)
   */
  async publishDataChange(
    entityType: string,
    operation: 'create' | 'update' | 'delete',
    data: any,
    options: { qos?: 0 | 1 | 2; retain?: boolean } = {}
  ) {
    const topic = this.getTopicForEntity(entityType);
    const message = {
      type: 'data_change',
      entity: entityType,
      operation,
      data,
      timestamp: new Date().toISOString(),
      messageId: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    const qos = options.qos ?? this.config.qosLevel;
    const retain = options.retain ?? true;  // Retain by default for late joiners

    // Serialize message with error handling
    let payload: string;
    try {
      payload = JSON.stringify(message);
    } catch (error) {
      console.error(`[MQTT Reliable Sync] Failed to serialize ${operation} for ${entityType}:`, error);
      this.metrics.publishFailures++;
      throw new Error(`Message serialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    if (this.isConnected && this.client) {
      // Publish message with QoS and retain settings
      return new Promise<void>((resolve, reject) => {
        this.client?.publish(
          topic,
          payload,
          { qos, retain },
          (error) => {
            if (error) {
              console.error(`[MQTT Reliable Sync] Failed to publish ${operation} for ${entityType}:`, error);
              this.metrics.publishFailures++;
              // Queue for retry
              this.queueMessage({ topic, payload: message, qos, retain });
              reject(error);
            } else {
              console.log(`[MQTT Reliable Sync] ✓ Published ${operation} for ${entityType} (QoS ${qos})`);
              this.metrics.messagesPublished++;
              this.emit('message_published', { topic, message, qos });
              resolve();
            }
          }
        );
      });
    } else {
      // Queue message for delivery when connection restored
      this.queueMessage({
        topic,
        payload: message,
        qos,
        retain
      });
      console.log(`[MQTT Reliable Sync] Queued ${operation} for ${entityType} (offline, queue size: ${this.messageQueue.length})`);
      this.emit('message_queued', { topic, message, qos });
    }
  }

  /**
   * Subscribe to entity changes with automatic catchup
   * 
   * @param entityType - Entity to subscribe to
   * @param callback - Function called when messages arrive
   * @param enableCatchup - Whether to receive missed messages
   */
  async subscribe(
    entityType: string,
    callback: (payload: any) => void,
    enableCatchup: boolean = true
  ) {
    const topic = this.getTopicForEntity(entityType);
    
    // Track subscription
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }
    this.subscriptions.get(topic)!.add(callback);

    if (this.client && this.isConnected) {
      // Subscribe to main topic
      return new Promise<void>((resolve, reject) => {
        this.client?.subscribe(topic, { qos: 1 }, (error) => {
          if (error) {
            console.error(`[MQTT Reliable Sync] Failed to subscribe to ${entityType}:`, error);
            reject(error);
          } else {
            console.log(`[MQTT Reliable Sync] ✓ Subscribed to ${entityType}`);
            
            // If catchup enabled, also subscribe to catchup topic
            if (enableCatchup) {
              const catchupTopic = `${topic}/catchup`;
              this.client?.subscribe(catchupTopic, { qos: 1 }, (catchupError) => {
                if (catchupError) {
                  console.error(`[MQTT Reliable Sync] Failed to subscribe to catchup topic:`, catchupError);
                } else {
                  console.log(`[MQTT Reliable Sync] ✓ Subscribed to ${entityType} catchup`);
                }
              });
            }
            
            resolve();
          }
        });
      });
    } else {
      console.log(`[MQTT Reliable Sync] Subscription tracked for ${entityType} (will subscribe when connected)`);
    }
  }

  /**
   * Unsubscribe from entity changes
   */
  async unsubscribe(entityType: string, callback: (payload: any) => void) {
    const topic = this.getTopicForEntity(entityType);
    
    if (this.subscriptions.has(topic)) {
      this.subscriptions.get(topic)!.delete(callback);
      
      if (this.subscriptions.get(topic)!.size === 0) {
        this.subscriptions.delete(topic);
        
        if (this.client && this.isConnected) {
          return new Promise<void>((resolve, reject) => {
            this.client?.unsubscribe(topic, (error) => {
              if (error) {
                console.error(`[MQTT Reliable Sync] Failed to unsubscribe from ${entityType}:`, error);
                reject(error);
              } else {
                console.log(`[MQTT Reliable Sync] ✓ Unsubscribed from ${entityType}`);
                resolve();
              }
            });
          });
        }
      }
    }

    console.log(`[MQTT Reliable Sync] Removed callback for ${entityType}`);
  }

  /**
   * Publish catchup messages for a specific entity
   * Called when a client reconnects after being offline
   * 
   * @param entityType - Entity type to catchup
   * @param since - Timestamp to catchup from
   * @param limit - Max number of messages to send
   */
  async publishCatchupMessages(
    entityType: string,
    since: Date,
    limit: number = 100
  ) {
    console.log(`[MQTT Reliable Sync] Publishing catchup for ${entityType} since ${since.toISOString()}`);
    
    try {
      let changes: any[] = [];
      
      // Query database for changes since timestamp
      switch (entityType) {
        case 'work_orders':
          changes = await db.select()
            .from(workOrders)
            .where(gte(workOrders.updatedAt, since))
            .limit(limit);
          break;
          
        case 'alerts':
          changes = await db.select()
            .from(alertNotifications)
            .where(gte(alertNotifications.createdAt, since))
            .limit(limit);
          break;
          
        case 'equipment':
          changes = await db.select()
            .from(equipment)
            .where(gte(equipment.updatedAt, since))
            .limit(limit);
          break;
          
        case 'crew':
          changes = await db.select()
            .from(crew)
            .where(gte(crew.updatedAt, since))
            .limit(limit);
          break;
          
        case 'maintenance_schedules':
        case 'maintenance':
          changes = await db.select()
            .from(maintenanceSchedules)
            .where(gte(maintenanceSchedules.updatedAt, since))
            .limit(limit);
          break;
          
        default:
          console.warn(`[MQTT Reliable Sync] Unknown entity type for catchup: ${entityType}`);
          return;
      }

      console.log(`[MQTT Reliable Sync] Found ${changes.length} changes for ${entityType}`);

      // Publish each change to catchup topic
      const catchupTopic = `${this.getTopicForEntity(entityType)}/catchup`;
      
      for (let i = 0; i < changes.length; i++) {
        const change = changes[i];
        const message = {
          type: 'catchup',
          entity: entityType,
          operation: 'update',
          data: change,
          timestamp: new Date().toISOString(),
          messageId: `catchup_${Date.now()}_${i}`,
          sequence: i,
          total: changes.length
        };

        if (this.client && this.isConnected) {
          await new Promise<void>((resolve, reject) => {
            this.client?.publish(
              catchupTopic,
              JSON.stringify(message),
              { qos: 1, retain: false },  // Don't retain catchup messages
              (error) => {
                if (error) {
                  console.error(`[MQTT Reliable Sync] Failed to publish catchup message ${i + 1}/${changes.length}:`, error);
                  reject(error);
                } else {
                  resolve();
                }
              }
            );
          });
        }
      }

      console.log(`[MQTT Reliable Sync] ✓ Published ${changes.length} catchup messages for ${entityType}`);
      this.emit('catchup_published', { entityType, since, limit, count: changes.length });
      
    } catch (error) {
      console.error(`[MQTT Reliable Sync] Failed to publish catchup for ${entityType}:`, error);
      throw error;
    }
  }

  /**
   * Get MQTT topic for an entity type
   */
  private getTopicForEntity(entityType: string): string {
    const topicMap: Record<string, string> = {
      work_orders: this.topics.workOrders,
      alerts: this.topics.alerts,
      equipment: this.topics.equipment,
      crew: this.topics.crew,
      maintenance_schedules: this.topics.maintenance,
      maintenance: this.topics.maintenance
    };

    return topicMap[entityType] || `vessel/sync/${entityType}`;
  }

  /**
   * Queue a message with size limit enforcement
   */
  private queueMessage(message: MqttMessage) {
    // Check queue size limit
    if (this.messageQueue.length >= this.config.maxQueueSize) {
      // Queue full - drop oldest message to make room
      const dropped = this.messageQueue.shift();
      this.metrics.messagesDropped++;
      console.warn(`[MQTT Reliable Sync] Queue full (${this.config.maxQueueSize}), dropped oldest message`);
      this.emit('message_dropped', { dropped });
    }
    
    this.messageQueue.push(message);
    this.metrics.messagesQueued++;
  }

  /**
   * Flush queued messages when connection restored
   */
  private async flushMessageQueue() {
    if (!this.client || !this.isConnected) return;

    const queueSize = this.messageQueue.length;
    if (queueSize === 0) return;

    console.log(`[MQTT Reliable Sync] Flushing ${queueSize} queued messages`);

    let successCount = 0;
    let failureCount = 0;

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        try {
          await new Promise<void>((resolve, reject) => {
            this.client?.publish(
              message.topic,
              JSON.stringify(message.payload),
              { qos: message.qos, retain: message.retain },
              (error) => {
                if (error) {
                  failureCount++;
                  // Put failed message back in queue
                  this.messageQueue.push(message);
                  reject(error);
                } else {
                  successCount++;
                  resolve();
                }
              }
            );
          });
        } catch (error) {
          console.error('[MQTT Reliable Sync] Failed to flush message:', error);
        }
      }
    }

    console.log(`[MQTT Reliable Sync] Queue flush complete: ${successCount} sent, ${failureCount} failed`);
    
    if (successCount > 0) {
      this.metrics.queueFlushes++;
      
      // Update Prometheus metrics
      incrementMqttQueueFlushes();
      
      this.emit('queue_flushed', { sent: successCount, failed: failureCount });
    }
    
    // Update queue depth metrics after flush
    updateMqttMetrics({
      currentQueueSize: this.messageQueue.length,
      queueUtilization: (this.messageQueue.length / this.config.maxQueueSize) * 100
    });
  }

  /**
   * Get service metrics for monitoring
   */
  getMetrics() {
    return {
      ...this.metrics,
      currentQueueSize: this.messageQueue.length,
      maxQueueSize: this.config.maxQueueSize,
      queueUtilization: (this.messageQueue.length / this.config.maxQueueSize) * 100,
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  /**
   * Reset metrics (useful for testing or periodic resets)
   */
  resetMetrics() {
    this.metrics = {
      messagesPublished: 0,
      messagesQueued: 0,
      messagesDropped: 0,
      publishFailures: 0,
      reconnectionAttempts: 0,
      queueFlushes: 0
    };
    console.log('[MQTT Reliable Sync] Metrics reset');
  }

  /**
   * Get service health status
   */
  getHealthStatus() {
    return {
      status: this.isConnected ? 'connected' : 'disconnected',
      broker: this.config.brokerUrl,
      qosLevel: this.config.qosLevel,
      queuedMessages: this.messageQueue.length,
      maxQueueSize: this.config.maxQueueSize,
      queueUtilization: ((this.messageQueue.length / this.config.maxQueueSize) * 100).toFixed(1) + '%',
      activeSubscriptions: this.subscriptions.size,
      topics: Object.keys(this.topics).length,
      reconnectAttempts: this.reconnectAttempts,
      tlsEnabled: this.config.enableTls,
      metrics: this.getMetrics()
    };
  }

  /**
   * Convenience methods for specific entities
   */
  
  async publishWorkOrderChange(operation: 'create' | 'update' | 'delete', workOrder: any) {
    return this.publishDataChange('work_orders', operation, workOrder, { qos: 1, retain: true });
  }

  async publishAlertChange(operation: 'create' | 'update', alert: any) {
    return this.publishDataChange('alerts', operation, alert, { qos: 2, retain: true });  // QoS 2 for alerts!
  }

  async publishEquipmentChange(operation: 'create' | 'update' | 'delete', equipment: any) {
    return this.publishDataChange('equipment', operation, equipment, { qos: 1, retain: true });
  }

  async publishCrewChange(operation: 'create' | 'update' | 'delete', crew: any) {
    return this.publishDataChange('crew', operation, crew, { qos: 1, retain: true });
  }

  async publishMaintenanceChange(operation: 'create' | 'update' | 'delete', schedule: any) {
    return this.publishDataChange('maintenance_schedules', operation, schedule, { qos: 1, retain: true });
  }
}

// Export singleton instance
export const mqttReliableSync = new MqttReliableSyncService();
