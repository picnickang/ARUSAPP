/**
 * Shared WebSocket broadcasting utilities
 * Centralizes real-time data synchronization logic
 */

import { mqttReliableSync } from '../mqtt-reliable-sync';

export interface BroadcastOptions {
  mqttTopic?: string;
  skipMqtt?: boolean;
  skipWebSocket?: boolean;
}

/**
 * Broadcast entity change to MQTT and WebSocket clients
 * Provides consistent real-time sync across all domains
 */
export async function broadcastChange(
  entityType: string,
  action: 'create' | 'update' | 'delete',
  data: any,
  options: BroadcastOptions = {}
): Promise<void> {
  // Publish to MQTT for vessel sync
  if (!options.skipMqtt) {
    try {
      const mqttMethod = getMqttPublishMethod(entityType, action);
      if (mqttMethod) {
        await mqttMethod(data);
      }
    } catch (error) {
      console.error(`[Broadcast] MQTT publish failed for ${entityType}:`, error);
    }
  }
  
  // WebSocket broadcast handled by storage layer automatically
  // No explicit action needed here
}

/**
 * Get the appropriate MQTT publish method for entity type
 */
function getMqttPublishMethod(entityType: string, action: string): ((data: any) => Promise<void>) | null {
  const methodMap: Record<string, (data: any) => Promise<void>> = {
    'work_order': (data) => mqttReliableSync.publishWorkOrderChange(action as any, data),
    'equipment': (data) => mqttReliableSync.publishEquipmentChange(action as any, data),
    'vessel': (data) => mqttReliableSync.publishVesselChange(action as any, data),
    'device': (data) => mqttReliableSync.publishDeviceChange(action as any, data),
    'telemetry': (data) => mqttReliableSync.publishTelemetryReading(data),
  };
  
  return methodMap[entityType] || null;
}
