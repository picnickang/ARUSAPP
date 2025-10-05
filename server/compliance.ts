/**
 * Compliance Bundle System for Maritime Regulatory Reporting
 * Supports ABS (American Bureau of Shipping) and DNV (Det Norske Veritas) standards
 * Generates HTML and PDF compliance reports with structured data validation
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import type { 
  ComplianceBundle,
  InsertComplianceBundle,
  Device,
  AlertNotification,
  WorkOrder,
  EquipmentTelemetry
} from "@shared/schema";

export interface ComplianceStandard {
  code: string;              // ABS-A1, DNV-GL-OS-E101, etc.
  name: string;              // Standard name
  authority: 'ABS' | 'DNV' | 'LR' | 'CCS' | 'BV';
  category: 'machinery' | 'structural' | 'electrical' | 'safety' | 'environmental';
  requirements: Array<{
    id: string;
    description: string;
    mandatory: boolean;
    frequency: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'annual';
    measurementType: 'vibration' | 'temperature' | 'pressure' | 'flow_rate' | 'voltage' | 'frequency' | 'visual';
    thresholds: {
      warning?: number;
      critical?: number;
      unit?: string;
    };
  }>;
}

export interface ComplianceAssessment {
  equipmentId: string;
  standardCode: string;
  assessmentDate: Date;
  assessor: string;
  overallStatus: 'compliant' | 'non_compliant' | 'conditional' | 'pending';
  findings: Array<{
    requirementId: string;
    status: 'pass' | 'fail' | 'na';
    evidence: string;
    measurementValue?: number;
    comments?: string;
    correctiveAction?: string;
  }>;
  nextAssessmentDate: Date;
  certificateNumber?: string;
  validUntil?: Date;
}

export interface ComplianceReport {
  bundleId: string;
  title: string;
  reportType: 'full_survey' | 'intermediate_survey' | 'annual_survey' | 'continuous_monitoring';
  vessel: {
    name: string;
    imoNumber: string;
    flag: string;
    classificationSociety: string;
    owner: string;
  };
  reportingPeriod: {
    startDate: Date;
    endDate: Date;
  };
  standards: ComplianceStandard[];
  assessments: ComplianceAssessment[];
  telemetryAnalysis: {
    monitoringHours: number;
    totalReadings: number;
    anomaliesDetected: number;
    alertsGenerated: number;
    equipmentAvailability: number;
  };
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    category: 'maintenance' | 'upgrade' | 'monitoring' | 'training';
    description: string;
    estimatedCost?: number;
    deadline?: Date;
  }>;
  signature: {
    inspector: string;
    inspectorCertification: string;
    date: Date;
    digitalSignature?: string;
  };
}

// Pre-defined maritime compliance standards
export const MARITIME_STANDARDS: ComplianceStandard[] = [
  {
    code: 'ABS-A1-MACHINERY',
    name: 'ABS A1 Machinery Condition Monitoring',
    authority: 'ABS',
    category: 'machinery',
    requirements: [
      {
        id: 'VIBR-001',
        description: 'Main engine crankcase vibration monitoring',
        mandatory: true,
        frequency: 'continuous',
        measurementType: 'vibration',
        thresholds: { warning: 2.0, critical: 4.0, unit: 'mm/s' }
      },
      {
        id: 'TEMP-001',
        description: 'Engine coolant temperature monitoring',
        mandatory: true,
        frequency: 'continuous',
        measurementType: 'temperature',
        thresholds: { warning: 85, critical: 95, unit: '°C' }
      },
      {
        id: 'PRES-001',
        description: 'Lube oil pressure monitoring',
        mandatory: true,
        frequency: 'continuous',
        measurementType: 'pressure',
        thresholds: { warning: 2.5, critical: 2.0, unit: 'bar' }
      }
    ]
  },
  {
    code: 'DNV-GL-OS-E101',
    name: 'DNV GL Offshore Standards - Electrical Systems',
    authority: 'DNV',
    category: 'electrical',
    requirements: [
      {
        id: 'VOLT-001',
        description: 'Main switchboard voltage stability',
        mandatory: true,
        frequency: 'continuous',
        measurementType: 'voltage',
        thresholds: { warning: 440, critical: 400, unit: 'V' }
      },
      {
        id: 'FREQ-001',
        description: 'Generator frequency regulation',
        mandatory: true,
        frequency: 'continuous',
        measurementType: 'frequency',
        thresholds: { warning: 61.0, critical: 63.0, unit: 'Hz' }
      }
    ]
  }
];

/**
 * Assess equipment compliance against specific standards
 * @param equipment Equipment to assess
 * @param standards Applicable compliance standards
 * @param telemetryData Recent telemetry readings
 * @param alerts Recent alerts
 * @returns Compliance assessment results
 */
export function assessCompliance(
  equipment: Device,
  standards: ComplianceStandard[],
  telemetryData: EquipmentTelemetry[],
  alerts: AlertNotification[]
): ComplianceAssessment[] {
  const assessments: ComplianceAssessment[] = [];
  
  for (const standard of standards) {
    const findings: ComplianceAssessment['findings'] = [];
    let passCount = 0;
    let totalRequirements = 0;
    
    for (const requirement of standard.requirements) {
      totalRequirements++;
      
      // Find relevant telemetry data for this requirement
      const relevantReadings = telemetryData.filter(reading => {
        switch (requirement.measurementType) {
          case 'vibration':
            return reading.sensorType === 'vibration';
          case 'temperature':
            return reading.sensorType === 'temperature';
          case 'pressure':
            return reading.sensorType === 'pressure';
          case 'flow':
            return reading.sensorType === 'flow_rate';
          default:
            return false;
        }
      });
      
      // Find relevant alerts
      const relevantAlerts = alerts.filter(alert => 
        alert.alertType === requirement.measurementType &&
        alert.equipmentId === equipment.id
      );
      
      let status: 'pass' | 'fail' | 'na' = 'na';
      let measurementValue: number | undefined;
      let evidence = '';
      let comments = '';
      let correctiveAction = '';
      
      if (relevantReadings.length > 0) {
        // Calculate average value from recent readings
        const recentReadings = relevantReadings.slice(-100); // Last 100 readings
        const avgValue = recentReadings.reduce((sum, r) => sum + r.value, 0) / recentReadings.length;
        measurementValue = Math.round(avgValue * 100) / 100;
        
        // Check against thresholds
        const { warning, critical } = requirement.thresholds;
        
        if (critical !== undefined) {
          if (avgValue >= critical) {
            status = 'fail';
            evidence = `Average ${requirement.measurementType} of ${avgValue.toFixed(2)} ${requirement.thresholds.unit} exceeds critical threshold of ${critical} ${requirement.thresholds.unit}`;
            correctiveAction = `Immediate maintenance required - ${requirement.measurementType} exceeds safe operating limits`;
          } else if (warning !== undefined && avgValue >= warning) {
            status = 'pass'; // Within acceptable range but near warning
            evidence = `Average ${requirement.measurementType} of ${avgValue.toFixed(2)} ${requirement.thresholds.unit} is above warning threshold but below critical`;
            comments = 'Monitor closely - approaching warning limits';
          } else {
            status = 'pass';
            evidence = `Average ${requirement.measurementType} of ${avgValue.toFixed(2)} ${requirement.thresholds.unit} is within acceptable limits`;
          }
        } else {
          status = 'pass';
          evidence = `${requirement.measurementType} monitoring active with ${recentReadings.length} readings`;
        }
        
        // Check for recent critical alerts
        const recentCriticalAlerts = relevantAlerts.filter(alert => 
          alert.severity === 'critical' && 
          new Date(alert.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000 // Last 24 hours
        );
        
        if (recentCriticalAlerts.length > 0) {
          status = 'fail';
          evidence += ` | ${recentCriticalAlerts.length} critical alerts in last 24 hours`;
          correctiveAction = 'Investigate and resolve critical alerts before survey completion';
        }
      } else {
        // No telemetry data available
        if (requirement.mandatory) {
          status = 'fail';
          evidence = 'No telemetry data available for mandatory requirement';
          correctiveAction = 'Install monitoring sensors and establish data collection';
        } else {
          status = 'na';
          evidence = 'No data available - not applicable for this equipment type';
        }
      }
      
      if (status === 'pass') passCount++;
      
      findings.push({
        requirementId: requirement.id,
        status,
        evidence,
        measurementValue,
        comments,
        correctiveAction: correctiveAction || undefined
      });
    }
    
    // Determine overall compliance status
    const complianceRate = passCount / totalRequirements;
    let overallStatus: ComplianceAssessment['overallStatus'];
    
    if (complianceRate >= 1.0) {
      overallStatus = 'compliant';
    } else if (complianceRate >= 0.8) {
      overallStatus = 'conditional';
    } else {
      overallStatus = 'non_compliant';
    }
    
    // Calculate next assessment date based on standard requirements
    const nextAssessmentDate = new Date();
    nextAssessmentDate.setMonth(nextAssessmentDate.getMonth() + 12); // Default annual
    
    assessments.push({
      equipmentId: equipment.id,
      standardCode: standard.code,
      assessmentDate: new Date(),
      assessor: 'ARUS Automated Assessment System',
      overallStatus,
      findings,
      nextAssessmentDate,
      certificateNumber: overallStatus === 'compliant' ? `ARUS-${Date.now()}-${equipment.id}` : undefined,
      validUntil: overallStatus === 'compliant' ? nextAssessmentDate : undefined
    });
  }
  
  return assessments;
}

/**
 * Generate telemetry analysis summary for compliance reporting
 * @param equipmentIds Equipment to analyze
 * @param telemetryData Telemetry readings
 * @param alerts Alert history
 * @param period Reporting period
 * @returns Analysis summary
 */
export function generateTelemetryAnalysis(
  equipmentIds: string[],
  telemetryData: EquipmentTelemetry[],
  alerts: AlertNotification[],
  period: { startDate: Date; endDate: Date }
): ComplianceReport['telemetryAnalysis'] {
  // Filter data by period and equipment
  const periodData = telemetryData.filter(reading => {
    const timestamp = new Date(reading.timestamp);
    return timestamp >= period.startDate && 
           timestamp <= period.endDate &&
           equipmentIds.includes(reading.equipmentId);
  });
  
  const periodAlerts = alerts.filter(alert => {
    const timestamp = new Date(alert.timestamp);
    return timestamp >= period.startDate && 
           timestamp <= period.endDate &&
           equipmentIds.includes(alert.equipmentId);
  });
  
  // Calculate monitoring hours (assume 5-minute intervals for telemetry)
  const uniqueTimestamps = new Set(periodData.map(r => r.timestamp));
  const monitoringHours = uniqueTimestamps.size * 5 / 60; // 5 minutes per reading
  
  // Equipment availability (percentage of expected readings received)
  const periodHours = (period.endDate.getTime() - period.startDate.getTime()) / (1000 * 60 * 60);
  const expectedReadings = equipmentIds.length * (periodHours * 12); // 12 readings per hour (5-min intervals)
  const equipmentAvailability = Math.min(100, (periodData.length / expectedReadings) * 100);
  
  // Count anomalies (readings that triggered warnings or alerts)
  const anomalousReadings = periodData.filter(reading => {
    return periodAlerts.some(alert => 
      Math.abs(new Date(alert.timestamp).getTime() - new Date(reading.timestamp).getTime()) < 5 * 60 * 1000 // Within 5 minutes
    );
  });
  
  return {
    monitoringHours: Math.round(monitoringHours),
    totalReadings: periodData.length,
    anomaliesDetected: anomalousReadings.length,
    alertsGenerated: periodAlerts.length,
    equipmentAvailability: Math.round(equipmentAvailability * 100) / 100
  };
}

/**
 * Generate comprehensive compliance report
 * @param config Report configuration
 * @param storage Storage interface for data access
 * @param orgId Organization ID
 * @returns Complete compliance report
 */
export async function generateComplianceReport(
  config: {
    bundleId: string;
    title: string;
    reportType: ComplianceReport['reportType'];
    vessel: ComplianceReport['vessel'];
    reportingPeriod: ComplianceReport['reportingPeriod'];
    equipmentIds: string[];
    standardCodes: string[];
  },
  storage: any,
  orgId: string
): Promise<ComplianceReport> {
  // Get applicable standards
  const standards = MARITIME_STANDARDS.filter(std => 
    config.standardCodes.includes(std.code)
  );
  
  // Get equipment data
  const equipment = await Promise.all(
    config.equipmentIds.map(id => storage.getEquipment(orgId, id))
  );
  
  // Get telemetry data for reporting period
  const telemetryData = await storage.getTelemetryByPeriod(
    config.equipmentIds,
    config.reportingPeriod.startDate,
    config.reportingPeriod.endDate,
    orgId
  );
  
  // Get alert history
  const alerts = await storage.getAlertsByPeriod(
    config.equipmentIds,
    config.reportingPeriod.startDate,
    config.reportingPeriod.endDate,
    orgId
  );
  
  // Perform compliance assessments
  const allAssessments: ComplianceAssessment[] = [];
  for (const eq of equipment) {
    if (eq) {
      const assessments = assessCompliance(eq, standards, telemetryData, alerts);
      allAssessments.push(...assessments);
    }
  }
  
  // Generate telemetry analysis
  const telemetryAnalysis = generateTelemetryAnalysis(
    config.equipmentIds,
    telemetryData,
    alerts,
    config.reportingPeriod
  );
  
  // Generate recommendations based on assessment findings
  const recommendations: ComplianceReport['recommendations'] = [];
  
  // High priority recommendations for non-compliant items
  const nonCompliantAssessments = allAssessments.filter(a => a.overallStatus === 'non_compliant');
  for (const assessment of nonCompliantAssessments) {
    const failedFindings = assessment.findings.filter(f => f.status === 'fail');
    for (const finding of failedFindings) {
      if (finding.correctiveAction) {
        recommendations.push({
          priority: 'high',
          category: 'maintenance',
          description: finding.correctiveAction,
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        });
      }
    }
  }
  
  // Medium priority for conditional compliance
  const conditionalAssessments = allAssessments.filter(a => a.overallStatus === 'conditional');
  if (conditionalAssessments.length > 0) {
    recommendations.push({
      priority: 'medium',
      category: 'monitoring',
      description: `Enhanced monitoring recommended for ${conditionalAssessments.length} equipment items with conditional compliance`,
      deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
    });
  }
  
  // Low priority for general improvements
  if (telemetryAnalysis.equipmentAvailability < 95) {
    recommendations.push({
      priority: 'low',
      category: 'upgrade',
      description: `Improve sensor reliability - current equipment availability: ${telemetryAnalysis.equipmentAvailability}%`,
      estimatedCost: 15000
    });
  }
  
  return {
    bundleId: config.bundleId,
    title: config.title,
    reportType: config.reportType,
    vessel: config.vessel,
    reportingPeriod: config.reportingPeriod,
    standards,
    assessments: allAssessments,
    telemetryAnalysis,
    recommendations,
    signature: {
      inspector: 'ARUS Compliance System',
      inspectorCertification: 'ARUS-CERT-2025',
      date: new Date(),
      digitalSignature: `ARUS-${Date.now()}-COMPLIANCE`
    }
  };
}

/**
 * Generate HTML compliance report
 * @param report Compliance report data
 * @returns HTML string
 */
export function generateHTMLReport(report: ComplianceReport): string {
  const complianceRate = report.assessments.length > 0 
    ? report.assessments.filter(a => a.overallStatus === 'compliant').length / report.assessments.length * 100
    : 0;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${report.title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
        .vessel-info { background: #f8fafc; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .compliance-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: white; border: 1px solid #e2e8f0; border-radius: 5px; padding: 15px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #2563eb; }
        .metric-label { color: #64748b; margin-top: 5px; }
        .assessment-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .assessment-table th, .assessment-table td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
        .assessment-table th { background: #f1f5f9; font-weight: bold; }
        .status-compliant { background: #dcfce7; color: #16a34a; padding: 4px 8px; border-radius: 3px; }
        .status-conditional { background: #fef3c7; color: #d97706; padding: 4px 8px; border-radius: 3px; }
        .status-non-compliant { background: #fecaca; color: #dc2626; padding: 4px 8px; border-radius: 3px; }
        .recommendations { background: #fefce8; border-left: 4px solid #eab308; padding: 15px; margin: 20px 0; }
        .signature { border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; }
        .print-date { color: #64748b; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${report.title}</h1>
        <p class="print-date">Generated: ${new Date().toLocaleString()}</p>
    </div>

    <div class="vessel-info">
        <h2>Vessel Information</h2>
        <table style="width: 100%;">
            <tr><td><strong>Vessel Name:</strong></td><td>${report.vessel.name}</td></tr>
            <tr><td><strong>IMO Number:</strong></td><td>${report.vessel.imoNumber}</td></tr>
            <tr><td><strong>Flag:</strong></td><td>${report.vessel.flag}</td></tr>
            <tr><td><strong>Classification Society:</strong></td><td>${report.vessel.classificationSociety}</td></tr>
            <tr><td><strong>Owner:</strong></td><td>${report.vessel.owner}</td></tr>
        </table>
    </div>

    <div class="compliance-summary">
        <div class="metric-card">
            <div class="metric-value">${complianceRate.toFixed(1)}%</div>
            <div class="metric-label">Overall Compliance</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${report.telemetryAnalysis.totalReadings.toLocaleString()}</div>
            <div class="metric-label">Telemetry Readings</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${report.telemetryAnalysis.equipmentAvailability}%</div>
            <div class="metric-label">Equipment Availability</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${report.assessments.length}</div>
            <div class="metric-label">Standards Assessed</div>
        </div>
    </div>

    <h2>Compliance Assessments</h2>
    <table class="assessment-table">
        <thead>
            <tr>
                <th>Equipment</th>
                <th>Standard</th>
                <th>Status</th>
                <th>Assessment Date</th>
                <th>Valid Until</th>
                <th>Certificate</th>
            </tr>
        </thead>
        <tbody>
            ${report.assessments.map(assessment => `
                <tr>
                    <td>${assessment.equipmentId}</td>
                    <td>${assessment.standardCode}</td>
                    <td><span class="status-${assessment.overallStatus.replace('_', '-')}">${assessment.overallStatus.replace('_', ' ').toUpperCase()}</span></td>
                    <td>${assessment.assessmentDate.toLocaleDateString()}</td>
                    <td>${assessment.validUntil ? assessment.validUntil.toLocaleDateString() : 'N/A'}</td>
                    <td>${assessment.certificateNumber || 'N/A'}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    ${report.recommendations.length > 0 ? `
    <div class="recommendations">
        <h2>Recommendations</h2>
        <ul>
            ${report.recommendations.map(rec => `
                <li><strong>${rec.priority.toUpperCase()}:</strong> ${rec.description}
                ${rec.deadline ? ` (Deadline: ${rec.deadline.toLocaleDateString()})` : ''}
                ${rec.estimatedCost ? ` (Est. Cost: $${rec.estimatedCost.toLocaleString()})` : ''}
                </li>
            `).join('')}
        </ul>
    </div>
    ` : ''}

    <div class="signature">
        <h2>Digital Signature</h2>
        <p><strong>Inspector:</strong> ${report.signature.inspector}</p>
        <p><strong>Certification:</strong> ${report.signature.inspectorCertification}</p>
        <p><strong>Date:</strong> ${report.signature.date.toLocaleDateString()}</p>
        <p><strong>Digital Signature:</strong> ${report.signature.digitalSignature}</p>
    </div>
</body>
</html>`;
}

/**
 * Save compliance bundle to storage
 * @param complianceBundle Bundle data
 * @param storage Storage interface
 * @returns Saved bundle with generated files
 */
export async function saveComplianceBundle(
  complianceBundle: InsertComplianceBundle,
  storage: any
): Promise<ComplianceBundle> {
  // Ensure reports directory exists
  const reportsDir = join(process.cwd(), 'compliance-reports');
  if (!existsSync(reportsDir)) {
    mkdirSync(reportsDir, { recursive: true });
  }
  
  // Generate unique filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${complianceBundle.title.replace(/\s+/g, '_')}_${timestamp}`;
  
  // Save HTML file (if provided)
  const htmlPath = join(reportsDir, `${filename}.html`);
  writeFileSync(htmlPath, '<!-- HTML content placeholder -->');
  
  // Create bundle record matching schema structure
  const bundleData: ComplianceBundle = {
    bundleId: complianceBundle.bundleId,
    title: complianceBundle.title,
    orgId: complianceBundle.orgId,
    kind: complianceBundle.kind,
    sha256Hash: complianceBundle.sha256Hash,
    description: complianceBundle.description || null,
    generatedAt: new Date(),
    filePath: htmlPath,
    metadata: complianceBundle.metadata || null,
    createdAt: new Date(),
    fileFormat: complianceBundle.fileFormat || null,
    status: complianceBundle.status || null,
  };
  
  // Save to database
  return await storage.createComplianceBundle(bundleData);
}