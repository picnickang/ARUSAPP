/**
 * ARUS Insights Engine - Fleet KPI Analysis and Risk Assessment
 * Integrated with existing ARUS data models and architecture
 */

import { mean, standardDeviation } from "simple-statistics";
import { storage } from "./storage";
import type { InsightSnapshot, InsertInsightSnapshot } from "@shared/schema";

// Type definitions for insights
export interface FleetKPI {
  fleet: {
    vessels: number;
    signalsMapped: number;
    signalsDiscovered: number;
    dq7d: number;
    latestGapVessels: string[];
  };
  perVessel: Record<string, {
    lastTs: string | null;
    dq7d: number;
    totalSignals: number;
    stale: boolean;
  }>;
}

export interface InsightBundle {
  kpi: FleetKPI;
  risks: { critical: string[]; warnings: string[] };
  recommendations: string[];
  anomalies: Array<{
    vesselId: string;
    src: string;
    sig: string;
    kind: string;
    severity: string;
    tStart: string;
    tEnd: string;
  }>;
  compliance: { horViolations7d?: number; notes?: string[] };
}

/**
 * Compute comprehensive fleet insights using existing ARUS data
 */
export async function computeInsights(
  scope: "fleet" | string = "fleet",
  orgId: string = "default-org-id"
): Promise<InsightBundle> {
  const now = new Date();
  const since7d = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const since48h = new Date(now.getTime() - 48 * 3600 * 1000);
  const staleCutoff = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes

  try {
    // Fetch data from existing ARUS systems
    const [devices, equipment, alerts, telemetryReadings, sensorMappings] = await Promise.all([
      storage.getDevices(),
      storage.getEquipmentRegistry(),
      storage.getAlertNotifications(),
      storage.getLatestTelemetryReadings(undefined, undefined, undefined, 1000),
      storage.getSensorMappings?.() || [],
    ]);

    // Calculate Fleet KPIs using existing data
    const vessels = new Set(devices.map(d => d.vessel).filter(Boolean)).size;
    const signalsMapped = sensorMappings.length || devices.reduce((sum, d) => sum + (d.sensors?.split(',').length || 0), 0);
    const signalsDiscovered = telemetryReadings.length > 0 ? 
      new Set(telemetryReadings.map(t => `${t.equipmentId}-${t.sensorType}`)).size : 0;
    
    // Data quality analysis from recent alerts
    const recentAlerts = alerts.filter(a => new Date(a.createdAt) > since7d);
    const dq7d = recentAlerts.length;
    
    // Per-vessel analysis using latest telemetry
    const perVessel: FleetKPI["perVessel"] = {};
    const latestGapVessels: string[] = [];
    
    // Group telemetry by vessel/equipment
    const vesselTelemetry = new Map<string, typeof telemetryReadings>();
    telemetryReadings.forEach(t => {
      const vessel = equipment.find(e => e.id === t.equipmentId)?.vesselName || 
                    devices.find(d => d.equipmentId === t.equipmentId)?.vessel || 
                    'Unknown';
      if (!vesselTelemetry.has(vessel)) {
        vesselTelemetry.set(vessel, []);
      }
      vesselTelemetry.get(vessel)!.push(t);
    });

    // Analyze each vessel
    vesselTelemetry.forEach((readings, vesselId) => {
      if (!vesselId || vesselId === 'Unknown') return;
      
      // Find latest reading
      const latestReading = readings
        .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())[0];
      
      const lastTs = latestReading ? latestReading.ts.toISOString() : null;
      const stale = lastTs ? new Date(lastTs) < staleCutoff : true;
      
      if (stale) {
        latestGapVessels.push(vesselId);
      }
      
      // Count DQ issues for this vessel (using alerts as proxy)
      const vesselAlerts = recentAlerts.filter(a => {
        const alertEquipment = equipment.find(e => e.id === a.equipmentId);
        return alertEquipment?.vesselName === vesselId;
      });
      
      // Count total signals for this vessel
      const vesselEquipment = equipment.filter(e => e.vesselName === vesselId);
      const totalSignals = vesselEquipment.reduce((sum, eq) => {
        const eqReadings = readings.filter(r => r.equipmentId === eq.id);
        return sum + new Set(eqReadings.map(r => r.sensorType)).size;
      }, 0);

      perVessel[vesselId] = {
        lastTs,
        dq7d: vesselAlerts.length,
        totalSignals,
        stale
      };
    });

    const kpi: FleetKPI = {
      fleet: { vessels, signalsMapped, signalsDiscovered, dq7d, latestGapVessels },
      perVessel
    };

    // Risk Analysis using explainable logic
    const risks = { critical: [] as string[], warnings: [] as string[] };
    
    if (latestGapVessels.length > 0) {
      risks.critical.push(`Stale telemetry on: ${latestGapVessels.join(", ")} (no updates >30 min)`);
    }
    
    const criticalAlerts = recentAlerts.filter(a => a.alertType === 'critical');
    if (criticalAlerts.length > 0) {
      risks.critical.push(`${criticalAlerts.length} critical alerts in last 7 days`);
    }
    
    const warningAlerts = recentAlerts.filter(a => a.alertType === 'warning');
    if (warningAlerts.length > 0) {
      risks.warnings.push(`${warningAlerts.length} warning alerts in last 7 days`);
    }

    // Equipment health risks
    const equipment_health = await storage.getEquipmentHealth();
    const unhealthyEquipment = equipment_health.filter(eq => eq.healthIndex < 70);
    if (unhealthyEquipment.length > 0) {
      risks.warnings.push(`${unhealthyEquipment.length} equipment units with health <70%`);
    }

    // Actionable Recommendations
    const recommendations: string[] = [];
    
    if (latestGapVessels.length > 0) {
      recommendations.push("Check connectivity/ingest on stale vessels; verify edge device status.");
    }
    
    if (dq7d > 0) {
      recommendations.push("Review alert configurations; investigate sensor threshold settings.");
    }
    
    if (signalsDiscovered > signalsMapped) {
      recommendations.push("Map newly discovered signals to improve sensor coverage and analytics.");
    }
    
    if (unhealthyEquipment.length > 0) {
      recommendations.push("Schedule predictive maintenance for equipment with declining health scores.");
    }

    // Anomalies from recent alerts (adapting alert data structure)
    const anomalies = criticalAlerts.slice(0, 20).map(alert => {
      const alertEquipment = equipment.find(e => e.id === alert.equipmentId);
      return {
        vesselId: alertEquipment?.vesselName || 'Unknown',
        src: alert.equipmentId,
        sig: alert.sensorType,
        kind: 'threshold_breach',
        severity: alert.alertType,
        tStart: alert.createdAt.toISOString(),
        tEnd: alert.acknowledgedAt?.toISOString() || new Date().toISOString()
      };
    });

    // Compliance placeholder (can be extended with HoR violations)
    const compliance = { notes: [] as string[] };
    
    // Check for potential compliance issues
    if (latestGapVessels.length > 0) {
      compliance.notes.push("Data gaps may affect compliance reporting and audit readiness.");
    }

    return { kpi, risks, recommendations, anomalies, compliance };
    
  } catch (error) {
    console.error('Insights computation error:', error);
    
    // Return safe fallback data
    return {
      kpi: {
        fleet: { vessels: 0, signalsMapped: 0, signalsDiscovered: 0, dq7d: 0, latestGapVessels: [] },
        perVessel: {}
      },
      risks: { critical: ['Unable to compute insights'], warnings: [] },
      recommendations: ['Check system connectivity and data availability'],
      anomalies: [],
      compliance: { notes: ['Insights computation failed - verify system status'] }
    };
  }
}

/**
 * Persist insight snapshot to database
 */
export async function persistSnapshot(
  scope: "fleet" | string,
  bundle: InsightBundle,
  orgId: string = "default-org-id"
): Promise<{ id: string; createdAt: Date }> {
  try {
    const insertData: InsertInsightSnapshot = {
      scope,
      kpi: bundle.kpi,
      risks: bundle.risks,
      recommendations: bundle.recommendations,
      anomalies: bundle.anomalies,
      compliance: bundle.compliance
    };

    // Debug logging to identify database constraint issue
    console.log('[Insights] Persisting snapshot with data:', JSON.stringify({
      scope,
      orgId,
      kpi: bundle.kpi,
      risksCount: (bundle.risks?.critical?.length || 0) + (bundle.risks?.warnings?.length || 0),
      recommendationsCount: bundle.recommendations?.length || 0,
      anomaliesCount: bundle.anomalies?.length || 0,
      complianceNotesCount: bundle.compliance?.notes?.length || 0
    }, null, 2));

    const snapshot = await storage.createInsightSnapshot(orgId, insertData);
    return { id: snapshot.id, createdAt: snapshot.createdAt };
    
  } catch (error) {
    console.error('Failed to persist insight snapshot:', error);
    console.error('Bundle data that failed:', JSON.stringify({
      scope,
      orgId,
      bundleStructure: {
        hasKpi: !!bundle.kpi,
        hasRisks: !!bundle.risks,
        hasRecommendations: !!bundle.recommendations,
        hasAnomalies: !!bundle.anomalies,
        hasCompliance: !!bundle.compliance
      }
    }, null, 2));
    throw new Error('Snapshot persistence failed');
  }
}

/**
 * Get latest insight snapshot
 */
export async function getLatestSnapshot(
  scope: "fleet" | string,
  orgId: string = "default-org-id"
): Promise<InsightSnapshot | null> {
  try {
    return await storage.getLatestInsightSnapshot(orgId, scope);
  } catch (error) {
    console.error('Failed to get latest snapshot:', error);
    return null;
  }
}

/**
 * Generate LLM overview using existing OpenAI integration
 * Leverages existing ARUS AI analysis capabilities
 */
export async function llmOverview(bundle: InsightBundle): Promise<string> {
  try {
    // Check if LLM is enabled in system settings
    const settings = await storage.getSystemSettings();
    if (!settings?.llmEnabled) {
      return generateFallbackOverview(bundle);
    }

    // Use existing OpenAI integration
    const { analyzeInsightBundle } = await import('./openai');
    
    // Convert bundle to format expected by existing AI system
    const analysisData = {
      fleet_kpi: bundle.kpi.fleet,
      vessel_metrics: bundle.perVessel,
      risks: bundle.risks,
      recommendations: bundle.recommendations,
      anomalies: bundle.anomalies,
      compliance_notes: bundle.compliance.notes
    };

    const overview = await analyzeInsightBundle(analysisData);
    return overview || generateFallbackOverview(bundle);
    
  } catch (error) {
    console.error('LLM overview generation failed:', error);
    return generateFallbackOverview(bundle);
  }
}

/**
 * Generate fallback overview without LLM
 */
function generateFallbackOverview(bundle: InsightBundle): string {
  const { kpi, risks, recommendations } = bundle;
  
  const staleVessels = kpi.fleet.latestGapVessels.length > 0 
    ? `**Stale telemetry**: ${kpi.fleet.latestGapVessels.join(", ")}` 
    : "No stale telemetry detected.";
  
  return [
    "# Fleet Insights Overview",
    "",
    "## Fleet Status",
    `- Vessels: ${kpi.fleet.vessels}`,
    `- Mapped signals: ${kpi.fleet.signalsMapped}`,
    `- Discovered signals: ${kpi.fleet.signalsDiscovered}`,
    `- Data quality events (7d): ${kpi.fleet.dq7d}`,
    "",
    "## Connectivity Status", 
    staleVessels,
    "",
    "## Risk Assessment",
    ...risks.critical.map(r => `⚠️ **CRITICAL**: ${r}`),
    ...risks.warnings.map(r => `⚠️ Warning: ${r}`),
    "",
    "## Recommendations",
    ...recommendations.map(r => `- ${r}`),
    "",
    `*Analysis generated: ${new Date().toISOString()}*`
  ].join("\n");
}

/**
 * Compute and persist daily fleet snapshot (cron-safe)
 * Integrates with existing background jobs system
 */
export async function generateDailySnapshot(orgId: string = "default-org-id"): Promise<void> {
  try {
    console.log('[Insights] Generating daily fleet snapshot...');
    
    const bundle = await computeInsights("fleet", orgId);
    const snapshot = await persistSnapshot("fleet", bundle, orgId);
    
    console.log(`[Insights] Daily snapshot stored: ${snapshot.id} at ${snapshot.createdAt}`);
    
  } catch (error) {
    console.error('[Insights] Daily snapshot failed:', error);
    throw error;
  }
}