import { EventEmitter } from 'events';
import { storage } from './storage';
import { db } from './db';
import { applySensorConfiguration } from './routes';
import { 
  mqttDevices, 
  telemetryAggregates, 
  dataQualityMetrics,
  insertMqttDeviceSchema,
  insertTelemetryAggregateSchema,
  insertDataQualityMetricSchema,
  MqttDevice,
  TelemetryAggregate
} from '@shared/schema';
import { eq, and, gte, lt, desc } from 'drizzle-orm';
import { z } from 'zod';

// MQTT message validation schema
const mqttTelemetrySchema = z.object({
  equipmentId: z.string().min(1),
  sensorType: z.string().min(1),
  value: z.number().finite(),
  timestamp: z.string().datetime().optional(),
  quality: z.number().min(0).max(1).optional(),
  metadata: z.record(z.any()).optional()
});

// Data quality assessment results
interface DataQualityResult {
  completenessScore: number;
  consistencyScore: number;
  timelinessScore: number;
  accuracyScore: number;
  overallQuality: number;
  issuesDetected: string[];
  recommendedActions: string[];
}

// Stream processing window configuration
interface WindowConfig {
  windowSize: string; // '1m', '5m', '15m', '1h', '6h', '1d'
  windowSizeMs: number;
  aggregationFunction: 'avg' | 'min' | 'max' | 'sum' | 'count';
}

export class MqttIngestionService extends EventEmitter {
  private readonly windowConfigs: WindowConfig[] = [
    { windowSize: '1m', windowSizeMs: 60 * 1000, aggregationFunction: 'avg' },
    { windowSize: '5m', windowSizeMs: 5 * 60 * 1000, aggregationFunction: 'avg' },
    { windowSize: '15m', windowSizeMs: 15 * 60 * 1000, aggregationFunction: 'avg' },
    { windowSize: '1h', windowSizeMs: 60 * 60 * 1000, aggregationFunction: 'avg' },
    { windowSize: '6h', windowSizeMs: 6 * 60 * 60 * 1000, aggregationFunction: 'avg' },
    { windowSize: '1d', windowSizeMs: 24 * 60 * 60 * 1000, aggregationFunction: 'avg' }
  ];

  private dataBuffer: Map<string, Array<{ value: number; timestamp: Date; quality?: number }>> = new Map();
  private lastProcessedTime: Map<string, Date> = new Map();

  constructor() {
    super();
    console.log('[MQTT Ingestion] Service initialized');
    
    // Start background processing for stream aggregation
    this.startStreamProcessing();
  }

  /**
   * Register a new MQTT device for sensor data ingestion
   */
  async registerMqttDevice(deviceData: {
    deviceId: string;
    mqttClientId: string;
    brokerEndpoint: string;
    topicPrefix: string;
    qosLevel?: number;
    credentials?: any;
    metadata?: any;
  }): Promise<MqttDevice> {
    console.log(`[MQTT Ingestion] Registering device: ${deviceData.mqttClientId}`);

    const mqttDevice = await db.insert(mqttDevices).values({
      deviceId: deviceData.deviceId,
      mqttClientId: deviceData.mqttClientId,
      brokerEndpoint: deviceData.brokerEndpoint,
      topicPrefix: deviceData.topicPrefix,
      qosLevel: deviceData.qosLevel || 1,
      credentials: deviceData.credentials,
      metadata: deviceData.metadata,
      connectionStatus: 'registered'
    }).returning();

    this.emit('device_registered', mqttDevice[0]);
    return mqttDevice[0];
  }

  /**
   * Process incoming MQTT telemetry data with real-time validation and quality assessment
   */
  async processTelemetryMessage(clientId: string, topic: string, payload: any): Promise<void> {
    try {
      // Validate MQTT message format
      const telemetryData = mqttTelemetrySchema.parse(payload);
      const timestamp = telemetryData.timestamp ? new Date(telemetryData.timestamp) : new Date();

      console.log(`[MQTT Ingestion] Processing telemetry from ${clientId}: ${telemetryData.equipmentId}/${telemetryData.sensorType}`);

      // Update device last seen status
      await this.updateDeviceStatus(clientId, 'connected');

      // Perform real-time data quality validation
      const qualityResult = await this.validateDataQuality(telemetryData);

      // Apply sensor configuration processing (gain, offset, deadband, validation, filtering)
      // Extract orgId from metadata or use default
      const orgId = (telemetryData.metadata?.orgId as string) || 'default-org-id';
      const configResult = await applySensorConfiguration(
        telemetryData.equipmentId,
        telemetryData.sensorType,
        telemetryData.value,
        telemetryData.metadata?.unit as string || null,
        orgId
      );

      // Skip storage if sensor configuration filtering indicates we shouldn't keep this reading
      if (!configResult.shouldKeep) {
        console.log(`[MQTT Ingestion] Telemetry reading filtered by sensor configuration: ${telemetryData.equipmentId}/${telemetryData.sensorType}`, {
          flags: configResult.flags,
          originalValue: telemetryData.value,
          processedValue: configResult.processedValue
        });
        return; // Exit early - don't store or process filtered readings
      }

      // Store telemetry data with processed value from sensor configuration
      await storage.createTelemetryReading({
        equipmentId: telemetryData.equipmentId,
        sensorType: telemetryData.sensorType,
        value: configResult.processedValue, // Use processed value (after gain/offset)
        timestamp: timestamp,
        metadata: {
          ...telemetryData.metadata,
          mqttClientId: clientId,
          mqttTopic: topic,
          qualityScore: qualityResult.overallQuality,
          sensorConfigFlags: configResult.flags, // Record sensor config processing flags
          ema: configResult.ema // Record EMA if calculated
        }
      });

      // Add to stream processing buffer (use processed value)
      await this.addToStreamBuffer(telemetryData.equipmentId, telemetryData.sensorType, {
        value: configResult.processedValue,
        timestamp: timestamp,
        quality: qualityResult.overallQuality
      });

      // Record data quality metrics
      await this.recordDataQualityMetrics(telemetryData.equipmentId, telemetryData.sensorType, qualityResult);

      // Emit real-time events for downstream processing (use processed value)
      this.emit('telemetry_received', {
        equipmentId: telemetryData.equipmentId,
        sensorType: telemetryData.sensorType,
        value: configResult.processedValue, // Use processed value after gain/offset
        timestamp: timestamp,
        quality: qualityResult.overallQuality,
        clientId: clientId,
        sensorConfigFlags: configResult.flags, // Include flags for downstream analysis
        ema: configResult.ema
      });

      // Trigger anomaly detection if quality is sufficient (use processed value)
      if (qualityResult.overallQuality >= 0.7) {
        this.emit('trigger_anomaly_detection', {
          equipmentId: telemetryData.equipmentId,
          sensorType: telemetryData.sensorType,
          value: configResult.processedValue, // Use processed value for anomaly detection
          timestamp: timestamp,
          ema: configResult.ema // Include EMA for better anomaly detection
        });
      }

    } catch (error) {
      console.error(`[MQTT Ingestion] Error processing telemetry from ${clientId}:`, error);
      
      // Record processing error
      await this.recordProcessingError(clientId, topic, error);
      
      this.emit('ingestion_error', {
        clientId,
        topic,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Real-time data quality validation with marine industry standards
   */
  private async validateDataQuality(telemetryData: z.infer<typeof mqttTelemetrySchema>): Promise<DataQualityResult> {
    const issues: string[] = [];
    const actions: string[] = [];

    // Completeness check (always 1.0 for real-time single readings)
    const completenessScore = 1.0;

    // Consistency check - validate sensor ranges and patterns
    let consistencyScore = 1.0;
    const sensorLimits = this.getSensorLimits(telemetryData.sensorType);
    
    if (sensorLimits) {
      if (telemetryData.value < sensorLimits.min || telemetryData.value > sensorLimits.max) {
        consistencyScore *= 0.3; // Severe penalty for out-of-range values
        issues.push(`Value ${telemetryData.value} outside expected range [${sensorLimits.min}, ${sensorLimits.max}]`);
        actions.push('Verify sensor calibration and check for hardware malfunction');
      }
    }

    // Timeliness check - ensure data arrives within expected window
    const now = new Date();
    const dataTimestamp = telemetryData.timestamp ? new Date(telemetryData.timestamp) : now;
    const ageMs = now.getTime() - dataTimestamp.getTime();
    const maxAgeMs = 5 * 60 * 1000; // 5 minutes max age
    
    let timelinessScore = Math.max(0, 1 - (ageMs / maxAgeMs));
    if (ageMs > maxAgeMs) {
      issues.push(`Data is ${Math.round(ageMs / 1000)}s old, exceeding ${maxAgeMs / 1000}s threshold`);
      actions.push('Check network connectivity and MQTT broker performance');
    }

    // Accuracy check using cross-validation with historical patterns
    const accuracyScore = await this.validateAccuracy(telemetryData.equipmentId, telemetryData.sensorType, telemetryData.value);

    // Overall quality score (weighted average)
    const overallQuality = (
      completenessScore * 0.2 +
      consistencyScore * 0.3 +
      timelinessScore * 0.2 +
      accuracyScore * 0.3
    );

    return {
      completenessScore,
      consistencyScore,
      timelinessScore,
      accuracyScore,
      overallQuality,
      issuesDetected: issues,
      recommendedActions: actions
    };
  }

  /**
   * Get sensor-specific validation limits based on marine industry standards
   */
  private getSensorLimits(sensorType: string): { min: number; max: number } | null {
    const limits: Record<string, { min: number; max: number }> = {
      'temperature': { min: -40, max: 150 }, // Celsius
      'pressure': { min: 0, max: 1000 }, // Bar
      'vibration': { min: 0, max: 50 }, // mm/s RMS
      'flow_rate': { min: 0, max: 10000 }, // L/min
      'current': { min: 0, max: 1000 }, // Amperes
      'voltage': { min: 0, max: 690 }, // Volts
      'rpm': { min: 0, max: 10000 }, // Revolutions per minute
      'oil_pressure': { min: 0, max: 100 }, // Bar
      'fuel_consumption': { min: 0, max: 1000 } // L/h
    };

    return limits[sensorType] || null;
  }

  /**
   * Validate data accuracy using statistical analysis of historical patterns
   */
  private async validateAccuracy(equipmentId: string, sensorType: string, value: number): Promise<number> {
    try {
      // Get recent historical data for comparison
      const recentAggregates = await db
        .select()
        .from(telemetryAggregates)
        .where(
          and(
            eq(telemetryAggregates.equipmentId, equipmentId),
            eq(telemetryAggregates.sensorType, sensorType),
            gte(telemetryAggregates.windowStart, new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
          )
        )
        .orderBy(desc(telemetryAggregates.windowStart))
        .limit(20);

      if (recentAggregates.length < 3) {
        return 0.8; // Moderate confidence for new sensors
      }

      // Calculate statistical parameters
      const values = recentAggregates.map(a => a.avgValue).filter(v => v !== null) as number[];
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      // Z-score based validation (similar to PdM Pack approach)
      const zScore = stdDev > 0 ? Math.abs((value - mean) / stdDev) : 0;

      if (zScore <= 2) return 1.0; // Within 2 sigma - excellent
      if (zScore <= 3) return 0.8; // Within 3 sigma - good
      if (zScore <= 4) return 0.6; // Suspicious but acceptable
      return 0.3; // Highly anomalous

    } catch (error) {
      console.error('[MQTT Ingestion] Error validating accuracy:', error);
      return 0.7; // Default moderate confidence
    }
  }

  /**
   * Add telemetry data to stream processing buffer for real-time aggregation
   */
  private async addToStreamBuffer(equipmentId: string, sensorType: string, dataPoint: {
    value: number;
    timestamp: Date;
    quality?: number;
  }): Promise<void> {
    const bufferKey = `${equipmentId}:${sensorType}`;
    
    if (!this.dataBuffer.has(bufferKey)) {
      this.dataBuffer.set(bufferKey, []);
    }

    const buffer = this.dataBuffer.get(bufferKey)!;
    buffer.push(dataPoint);

    // Keep buffer size manageable (last 1000 points per sensor)
    if (buffer.length > 1000) {
      buffer.splice(0, buffer.length - 1000);
    }

    this.dataBuffer.set(bufferKey, buffer);
  }

  /**
   * Start background stream processing for time-series aggregation
   */
  private startStreamProcessing(): void {
    // Process aggregations every 30 seconds
    setInterval(async () => {
      await this.processStreamAggregations();
    }, 30 * 1000);

    console.log('[MQTT Ingestion] Stream processing started');
  }

  /**
   * Process time-series aggregations for all active data streams
   */
  private async processStreamAggregations(): Promise<void> {
    try {
      for (const [bufferKey, dataPoints] of this.dataBuffer.entries()) {
        const [equipmentId, sensorType] = bufferKey.split(':');
        
        if (dataPoints.length === 0) continue;

        // Process each time window
        for (const windowConfig of this.windowConfigs) {
          await this.createTimeWindowAggregate(equipmentId, sensorType, dataPoints, windowConfig);
        }
      }
    } catch (error) {
      console.error('[MQTT Ingestion] Error processing stream aggregations:', error);
    }
  }

  /**
   * Create time-windowed aggregates with anomaly scoring
   */
  private async createTimeWindowAggregate(
    equipmentId: string,
    sensorType: string,
    dataPoints: Array<{ value: number; timestamp: Date; quality?: number }>,
    windowConfig: WindowConfig
  ): Promise<void> {
    const now = new Date();
    const windowStart = new Date(Math.floor(now.getTime() / windowConfig.windowSizeMs) * windowConfig.windowSizeMs);
    const windowEnd = new Date(windowStart.getTime() + windowConfig.windowSizeMs);

    // Filter data points within this time window
    const windowData = dataPoints.filter(dp => 
      dp.timestamp >= windowStart && dp.timestamp < windowEnd
    );

    if (windowData.length === 0) return;

    // Calculate aggregate statistics
    const values = windowData.map(dp => dp.value);
    const avgValue = values.reduce((sum, v) => sum + v, 0) / values.length;
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avgValue, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Calculate quality scores
    const qualityScores = windowData.map(dp => dp.quality || 1.0);
    const avgQuality = qualityScores.reduce((sum, q) => sum + q, 0) / qualityScores.length;

    // Check if this aggregate already exists
    const existingAggregate = await db
      .select()
      .from(telemetryAggregates)
      .where(
        and(
          eq(telemetryAggregates.equipmentId, equipmentId),
          eq(telemetryAggregates.sensorType, sensorType),
          eq(telemetryAggregates.timeWindow, windowConfig.windowSize),
          eq(telemetryAggregates.windowStart, windowStart)
        )
      )
      .limit(1);

    if (existingAggregate.length > 0) return; // Already processed

    // Create new aggregate record
    await db.insert(telemetryAggregates).values({
      equipmentId,
      sensorType,
      timeWindow: windowConfig.windowSize,
      windowStart,
      windowEnd,
      avgValue,
      minValue,
      maxValue,
      stdDev,
      sampleCount: windowData.length,
      anomalyScore: null, // Will be filled by ML analytics service
      qualityScore: avgQuality,
      metadata: {
        windowSizeMs: windowConfig.windowSizeMs,
        aggregationMethod: windowConfig.aggregationFunction,
        variance: variance
      }
    });

    // Emit aggregation event for downstream processing
    this.emit('aggregate_created', {
      equipmentId,
      sensorType,
      timeWindow: windowConfig.windowSize,
      windowStart,
      avgValue,
      sampleCount: windowData.length,
      qualityScore: avgQuality
    });
  }

  /**
   * Update MQTT device connection status
   */
  private async updateDeviceStatus(clientId: string, status: string): Promise<void> {
    try {
      await db
        .update(mqttDevices)
        .set({
          connectionStatus: status,
          lastSeen: new Date(),
          updatedAt: new Date()
        })
        .where(eq(mqttDevices.mqttClientId, clientId));
    } catch (error) {
      console.error(`[MQTT Ingestion] Error updating device status for ${clientId}:`, error);
    }
  }

  /**
   * Record data quality validation results
   */
  private async recordDataQualityMetrics(
    equipmentId: string, 
    sensorType: string, 
    qualityResult: DataQualityResult
  ): Promise<void> {
    try {
      await db.insert(dataQualityMetrics).values({
        equipmentId,
        sensorType,
        completenessScore: qualityResult.completenessScore,
        consistencyScore: qualityResult.consistencyScore,
        timelinessScore: qualityResult.timelinessScore,
        accuracyScore: qualityResult.accuracyScore,
        overallQuality: qualityResult.overallQuality,
        issuesDetected: qualityResult.issuesDetected,
        recommendedActions: qualityResult.recommendedActions,
        metadata: {
          validationTimestamp: new Date().toISOString(),
          processingLatency: 'real-time'
        }
      });
    } catch (error) {
      console.error('[MQTT Ingestion] Error recording data quality metrics:', error);
    }
  }

  /**
   * Record processing errors for monitoring and debugging
   */
  private async recordProcessingError(clientId: string, topic: string, error: any): Promise<void> {
    try {
      await db.insert(dataQualityMetrics).values({
        equipmentId: 'unknown',
        sensorType: 'processing_error',
        completenessScore: 0,
        consistencyScore: 0,
        timelinessScore: 0,
        accuracyScore: 0,
        overallQuality: 0,
        issuesDetected: [`Processing error: ${error instanceof Error ? error.message : String(error)}`],
        recommendedActions: ['Review MQTT message format and payload structure'],
        metadata: {
          clientId,
          topic,
          errorType: 'ingestion_error',
          errorDetails: error instanceof Error ? error.stack : String(error)
        }
      });
    } catch (dbError) {
      console.error('[MQTT Ingestion] Error recording processing error:', dbError);
    }
  }

  /**
   * Get MQTT device configuration and connection info
   */
  async getMqttDevices(orgId: string = 'default-org-id'): Promise<MqttDevice[]> {
    return await db
      .select()
      .from(mqttDevices)
      .orderBy(desc(mqttDevices.createdAt));
  }

  /**
   * Get recent telemetry aggregates for analytics
   */
  async getRecentAggregates(
    equipmentId: string,
    sensorType: string,
    timeWindow: string = '1h',
    limit: number = 100
  ): Promise<TelemetryAggregate[]> {
    return await db
      .select()
      .from(telemetryAggregates)
      .where(
        and(
          eq(telemetryAggregates.equipmentId, equipmentId),
          eq(telemetryAggregates.sensorType, sensorType),
          eq(telemetryAggregates.timeWindow, timeWindow)
        )
      )
      .orderBy(desc(telemetryAggregates.windowStart))
      .limit(limit);
  }

  /**
   * Health check for MQTT ingestion service
   */
  getHealthStatus(): { status: string; features: string[]; stats: any } {
    return {
      status: 'operational',
      features: [
        'real_time_mqtt_ingestion',
        'data_quality_validation',
        'stream_processing',
        'time_series_aggregation',
        'anomaly_trigger_events',
        'marine_sensor_validation'
      ],
      stats: {
        activeStreams: this.dataBuffer.size,
        totalBufferedPoints: Array.from(this.dataBuffer.values()).reduce((sum, buf) => sum + buf.length, 0),
        lastProcessed: this.lastProcessedTime.size
      }
    };
  }
}

// Export singleton instance
export const mqttIngestionService = new MqttIngestionService();