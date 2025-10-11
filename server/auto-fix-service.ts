/**
 * AutoFixService: Intelligent edge device auto-recovery system
 * 
 * Handles automatic failover, credential refresh, port restarts, and sensor recovery
 * for marine telemetry edge devices.
 */

import axios, { AxiosError } from 'axios';
import { storage } from './storage';
import type { 
  InsertEdgeDiagnosticLog, 
  InsertTransportFailover,
  InsertSerialPortState 
} from '@shared/schema';

export interface AutoFixConfig {
  enableMqttHttpFallback: boolean;
  enable401CredentialRefresh: boolean;
  enablePortRestart: boolean;
  enableStaleSensorRecovery: boolean;
  staleSensorThresholdSeconds: number;
  maxPortRestartAttempts: number;
  credentialRefreshUrl?: string;
}

export class AutoFixService {
  private config: AutoFixConfig;
  private orgId: string;

  constructor(orgId: string, config: Partial<AutoFixConfig> = {}) {
    this.orgId = orgId;
    this.config = {
      enableMqttHttpFallback: true,
      enable401CredentialRefresh: true,
      enablePortRestart: true,
      enableStaleSensorRecovery: true,
      staleSensorThresholdSeconds: 300, // 5 minutes
      maxPortRestartAttempts: 3,
      credentialRefreshUrl: process.env.CREDENTIAL_REFRESH_URL,
      ...config
    };
  }

  /**
   * MQTT→HTTP Fallback: Automatically switch to HTTP when MQTT fails
   */
  async handleMqttFailover(
    deviceId: string,
    reason: string,
    pendingReadings: number
  ): Promise<{ success: boolean; httpUrl: string | null }> {
    if (!this.config.enableMqttHttpFallback) {
      return { success: false, httpUrl: null };
    }

    try {
      // Log diagnostic event
      await this.logDiagnostic({
        orgId: this.orgId,
        deviceId,
        eventType: 'mqtt_failover',
        severity: 'warning',
        status: 'in_progress',
        message: `MQTT connection failed: ${reason}. Initiating HTTP fallback.`,
        details: { reason, pendingReadings },
        autoFixApplied: true,
        autoFixAction: 'switch_to_http'
      });

      // Create failover record
      await storage.createTransportFailover({
        orgId: this.orgId,
        deviceId,
        fromTransport: 'mqtt',
        toTransport: 'http',
        reason,
        readingsPending: pendingReadings,
        isActive: true
      });

      // Get HTTP ingestion URL
      const httpUrl = process.env.BACKEND_URL || 'http://localhost:5000';
      const ingestUrl = `${httpUrl}/api/telemetry/readings`;

      // Mark failover as resolved
      await this.logDiagnostic({
        orgId: this.orgId,
        deviceId,
        eventType: 'mqtt_failover',
        severity: 'info',
        status: 'success',
        message: `Successfully switched to HTTP ingestion: ${ingestUrl}`,
        details: { httpUrl: ingestUrl }
      });

      return { success: true, httpUrl: ingestUrl };
    } catch (error: any) {
      await this.logDiagnostic({
        orgId: this.orgId,
        deviceId,
        eventType: 'mqtt_failover',
        severity: 'error',
        status: 'failed',
        message: `MQTT failover failed: ${error.message}`,
        details: { error: error.message }
      });
      return { success: false, httpUrl: null };
    }
  }

  /**
   * Credential Refresh: Handle 401 errors by refreshing credentials
   */
  async handleCredentialRefresh(
    deviceId: string,
    error: AxiosError
  ): Promise<{ success: boolean; newToken?: string }> {
    if (!this.config.enable401CredentialRefresh) {
      return { success: false };
    }

    if (error.response?.status !== 401) {
      return { success: false };
    }

    try {
      await this.logDiagnostic({
        orgId: this.orgId,
        deviceId,
        eventType: 'credential_refresh',
        severity: 'warning',
        status: 'in_progress',
        message: '401 Unauthorized detected. Attempting credential refresh.',
        details: { originalError: error.message },
        autoFixApplied: true,
        autoFixAction: 'refresh_credentials'
      });

      // Try to get credentials from environment
      const apiKey = process.env.TELEMETRY_API_KEY;
      const hmacKey = process.env.DEVICE_HMAC_KEY;

      if (apiKey && hmacKey) {
        // Credentials found in environment
        await this.logDiagnostic({
          orgId: this.orgId,
          deviceId,
          eventType: 'credential_refresh',
          severity: 'info',
          status: 'success',
          message: 'Credentials refreshed from environment variables.',
          details: { source: 'env' }
        });

        return { success: true, newToken: apiKey };
      }

      // Try external credential refresh URL if configured
      if (this.config.credentialRefreshUrl) {
        const response = await axios.post(this.config.credentialRefreshUrl, {
          deviceId,
          orgId: this.orgId
        });

        const newToken = response.data.apiKey || response.data.token;

        // CRITICAL: Only return success if we actually got credentials
        if (!newToken) {
          await this.logDiagnostic({
            orgId: this.orgId,
            deviceId,
            eventType: 'credential_refresh',
            severity: 'error',
            status: 'failed',
            message: 'External API returned no credentials.',
            details: { source: 'api', response: response.data }
          });

          return { success: false };
        }

        await this.logDiagnostic({
          orgId: this.orgId,
          deviceId,
          eventType: 'credential_refresh',
          severity: 'info',
          status: 'success',
          message: 'Credentials refreshed from external API.',
          details: { source: 'api' }
        });

        return { success: true, newToken };
      }

      // No credentials available - prompt user (would be done in CLI)
      await this.logDiagnostic({
        orgId: this.orgId,
        deviceId,
        eventType: 'credential_refresh',
        severity: 'error',
        status: 'failed',
        message: 'No credentials available. User intervention required.',
        details: { action: 'prompt_user' }
      });

      return { success: false };
    } catch (error: any) {
      await this.logDiagnostic({
        orgId: this.orgId,
        deviceId,
        eventType: 'credential_refresh',
        severity: 'error',
        status: 'failed',
        message: `Credential refresh failed: ${error.message}`,
        details: { error: error.message }
      });
      return { success: false };
    }
  }

  /**
   * Port Restart: Restart serial/CAN port when it stops responding
   */
  async handlePortRestart(
    deviceId: string,
    portPath: string,
    portType: 'serial' | 'can',
    restartCallback: () => Promise<boolean>
  ): Promise<{ success: boolean; restartCount: number }> {
    if (!this.config.enablePortRestart) {
      return { success: false, restartCount: 0 };
    }

    try {
      // Get current port state
      const portState = await storage.getSerialPortState(deviceId, portPath);
      const currentRestartCount = portState?.restartCount || 0;

      if (currentRestartCount >= this.config.maxPortRestartAttempts) {
        await this.logDiagnostic({
          orgId: this.orgId,
          deviceId,
          eventType: 'port_restart',
          severity: 'critical',
          status: 'failed',
          message: `Port ${portPath} restart limit reached (${this.config.maxPortRestartAttempts} attempts). Manual intervention required.`,
          details: { portPath, portType, restartCount: currentRestartCount }
        });
        return { success: false, restartCount: currentRestartCount };
      }

      await this.logDiagnostic({
        orgId: this.orgId,
        deviceId,
        eventType: 'port_restart',
        severity: 'warning',
        status: 'in_progress',
        message: `Restarting ${portType} port: ${portPath} (attempt ${currentRestartCount + 1}/${this.config.maxPortRestartAttempts})`,
        details: { portPath, portType, restartAttempt: currentRestartCount + 1 },
        autoFixApplied: true,
        autoFixAction: 'restart_port'
      });

      // Execute restart callback
      const restartSuccess = await restartCallback();
      const newRestartCount = currentRestartCount + 1;

      if (restartSuccess) {
        // CRITICAL: Reset restartCount to 0 on successful restart
        // Only track consecutive failures, not total restarts
        await storage.upsertSerialPortState({
          orgId: this.orgId,
          deviceId,
          portPath,
          portType,
          status: 'online',
          restartCount: 0,
          lastRestartAt: new Date()
        });

        await this.logDiagnostic({
          orgId: this.orgId,
          deviceId,
          eventType: 'port_restart',
          severity: 'info',
          status: 'success',
          message: `Port ${portPath} restarted successfully. Reset restart counter.`,
          details: { portPath, portType, previousRestartCount: newRestartCount }
        });

        return { success: true, restartCount: 0 };
      } else {
        // CRITICAL: Update port state even on failed restart to persist restartCount
        await storage.upsertSerialPortState({
          orgId: this.orgId,
          deviceId,
          portPath,
          portType,
          status: 'error',
          restartCount: newRestartCount,
          lastRestartAt: new Date()
        });

        await this.logDiagnostic({
          orgId: this.orgId,
          deviceId,
          eventType: 'port_restart',
          severity: 'error',
          status: 'failed',
          message: `Port ${portPath} restart failed.`,
          details: { portPath, portType, restartCount: newRestartCount }
        });

        return { success: false, restartCount: newRestartCount };
      }
    } catch (error: any) {
      await this.logDiagnostic({
        orgId: this.orgId,
        deviceId,
        eventType: 'port_restart',
        severity: 'error',
        status: 'failed',
        message: `Port restart error: ${error.message}`,
        details: { error: error.message, portPath, portType }
      });
      return { success: false, restartCount: 0 };
    }
  }

  /**
   * Stale Sensor Recovery: Restart polling when sensor data stops flowing
   */
  async handleStaleSensorRecovery(
    deviceId: string,
    equipmentId: string,
    sensorType: string,
    lastDataTimestamp: Date,
    restartCallback: () => Promise<boolean>
  ): Promise<{ success: boolean; staleDurationSeconds: number }> {
    if (!this.config.enableStaleSensorRecovery) {
      return { success: false, staleDurationSeconds: 0 };
    }

    const staleDuration = (Date.now() - lastDataTimestamp.getTime()) / 1000;

    if (staleDuration < this.config.staleSensorThresholdSeconds) {
      return { success: false, staleDurationSeconds: staleDuration };
    }

    try {
      await this.logDiagnostic({
        orgId: this.orgId,
        deviceId,
        equipmentId,
        eventType: 'port_restart',
        severity: 'warning',
        status: 'in_progress',
        message: `Sensor ${sensorType} stale for ${staleDuration.toFixed(0)}s. Restarting polling process.`,
        details: { 
          sensorType, 
          staleDurationSeconds: staleDuration,
          lastDataTimestamp: lastDataTimestamp.toISOString()
        },
        autoFixApplied: true,
        autoFixAction: 'restart_polling'
      });

      const restartSuccess = await restartCallback();

      if (restartSuccess) {
        await this.logDiagnostic({
          orgId: this.orgId,
          deviceId,
          equipmentId,
          eventType: 'port_restart',
          severity: 'info',
          status: 'success',
          message: `Sensor ${sensorType} polling restarted successfully.`,
          details: { sensorType }
        });

        return { success: true, staleDurationSeconds: staleDuration };
      } else {
        await this.logDiagnostic({
          orgId: this.orgId,
          deviceId,
          equipmentId,
          eventType: 'port_restart',
          severity: 'error',
          status: 'failed',
          message: `Sensor ${sensorType} polling restart failed.`,
          details: { sensorType }
        });

        return { success: false, staleDurationSeconds: staleDuration };
      }
    } catch (error: any) {
      await this.logDiagnostic({
        orgId: this.orgId,
        deviceId,
        equipmentId,
        eventType: 'port_restart',
        severity: 'error',
        status: 'failed',
        message: `Stale sensor recovery error: ${error.message}`,
        details: { error: error.message, sensorType }
      });
      return { success: false, staleDurationSeconds: staleDuration };
    }
  }

  /**
   * Log diagnostic event to database
   */
  private async logDiagnostic(event: InsertEdgeDiagnosticLog): Promise<void> {
    try {
      await storage.createEdgeDiagnosticLog(event);
    } catch (error) {
      console.error('[AutoFix] Failed to log diagnostic:', error);
    }
  }

  /**
   * Mark failover as recovered
   */
  async markFailoverRecovered(deviceId: string, readingsFlushed: number): Promise<void> {
    try {
      const activeFailovers = await storage.getActiveTransportFailovers(deviceId);
      
      for (const failover of activeFailovers) {
        await storage.updateTransportFailover(failover.id, {
          recoveredAt: new Date(),
          readingsFlushed,
          isActive: false
        });

        await this.logDiagnostic({
          orgId: this.orgId,
          deviceId,
          eventType: 'mqtt_failover',
          severity: 'info',
          status: 'success',
          message: `Transport failover recovered. Flushed ${readingsFlushed} pending readings.`,
          details: { 
            fromTransport: failover.fromTransport,
            toTransport: failover.toTransport,
            readingsFlushed 
          }
        });
      }
    } catch (error) {
      console.error('[AutoFix] Failed to mark failover recovered:', error);
    }
  }
}
