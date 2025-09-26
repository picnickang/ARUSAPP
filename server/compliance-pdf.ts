/**
 * Beast Mode: Compliance PDF Pod
 * 
 * Maritime compliance report generation using pdf-lib
 * Leverages existing compliance infrastructure in server/compliance.ts
 * 
 * Features:
 * - Equipment compliance certification reports
 * - Maintenance compliance summaries  
 * - Regulatory compliance documentation
 * - Fleet-wide compliance overviews
 * - Multi-tenant organization scoping
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { 
  ComplianceReport, 
  ComplianceAssessment, 
  ComplianceStandard,
  Device,
  WorkOrder,
  EquipmentHealth
} from '@shared/schema';
import type { IStorage } from './storage.js';
import { 
  generateComplianceReport, 
  MARITIME_STANDARDS, 
  assessCompliance 
} from './compliance.js';

/**
 * Compliance PDF Generator for maritime regulatory reports
 */
export class CompliancePDFGenerator {
  constructor(private storage: IStorage) {}

  /**
   * Generate a comprehensive equipment compliance certification PDF
   */
  async generateEquipmentCompliancePDF(
    orgId: string,
    equipmentIds: string[],
    standardCodes: string[],
    reportingPeriod: { startDate: Date; endDate: Date },
    options: {
      vesselName: string;
      imoNumber: string;
      flag: string;
      reportType: 'inspection' | 'certification' | 'audit';
      inspector: string;
    }
  ): Promise<Uint8Array> {
    console.log(`[Compliance PDF] Generating equipment compliance report for ${equipmentIds.length} units`);

    // Generate comprehensive compliance report using existing infrastructure
    const complianceReport = await generateComplianceReport({
      bundleId: `COMP-${Date.now()}-${orgId}`,
      title: `Equipment Compliance ${options.reportType.toUpperCase()} Report`,
      reportType: options.reportType,
      vessel: {
        name: options.vesselName,
        imoNumber: options.imoNumber,
        flag: options.flag,
        vesselType: 'commercial',
        operator: orgId
      },
      reportingPeriod,
      equipmentIds,
      standardCodes
    }, this.storage, orgId);

    return await this.renderComplianceReportPDF(complianceReport, options.inspector);
  }

  /**
   * Generate maintenance compliance summary PDF
   */
  async generateMaintenanceCompliancePDF(
    orgId: string,
    vesselId: string,
    period: { startDate: Date; endDate: Date },
    options: {
      vesselName: string;
      includeWorkOrders: boolean;
      includeHealthMetrics: boolean;
    }
  ): Promise<Uint8Array> {
    console.log(`[Compliance PDF] Generating maintenance compliance report for vessel: ${vesselId}`);

    // Get maintenance data
    const workOrders = await this.storage.getWorkOrders(orgId);
    const equipmentHealth = await this.storage.getEquipmentHealth(orgId);
    
    // Filter by vessel name and period - equipment has vesselName field, not ID prefix
    // First, find equipment matching the vessel name
    const vesselEquipment = equipmentHealth.filter(eq => 
      eq.vessel === vesselId || eq.vessel?.includes(vesselId)
    );
    
    const vesselEquipmentIds = new Set(vesselEquipment.map(eq => eq.id));
    
    // Filter work orders by equipment that belongs to this vessel
    const vesselWorkOrders = workOrders.filter(wo => 
      wo.equipmentId && vesselEquipmentIds.has(wo.equipmentId) &&
      wo.createdAt >= period.startDate &&
      wo.createdAt <= period.endDate
    );

    return await this.renderMaintenanceCompliancePDF(
      vesselWorkOrders, 
      vesselEquipment, 
      period, 
      options
    );
  }

  /**
   * Generate regulatory compliance documentation PDF
   */
  async generateRegulatoryCompliancePDF(
    orgId: string,
    regulatoryFramework: 'IMO' | 'ABS' | 'DNV' | 'USCG',
    equipmentIds: string[],
    period: { startDate: Date; endDate: Date }
  ): Promise<Uint8Array> {
    console.log(`[Compliance PDF] Generating regulatory compliance for framework: ${regulatoryFramework}`);

    // Map regulatory frameworks to standard codes
    const frameworkStandards: Record<string, string[]> = {
      'IMO': ['ABS-A1-MACHINERY'], // IMO typically uses classification society standards
      'ABS': ['ABS-A1-MACHINERY'],
      'DNV': ['DNV-GL-OS-E101'],
      'USCG': ['ABS-A1-MACHINERY', 'DNV-GL-OS-E101'] // USCG accepts multiple standards
    };

    const standardCodes = frameworkStandards[regulatoryFramework] || ['ABS-A1-MACHINERY'];

    const complianceReport = await generateComplianceReport({
      bundleId: `REG-${regulatoryFramework}-${Date.now()}`,
      title: `${regulatoryFramework} Regulatory Compliance Report`,
      reportType: 'certification',
      vessel: {
        name: 'Fleet Compliance',
        imoNumber: 'FLEET-WIDE',
        flag: 'International',
        vesselType: 'commercial',
        operator: orgId
      },
      reportingPeriod: period,
      equipmentIds,
      standardCodes
    }, this.storage, orgId);

    return await this.renderRegulatoryCompliancePDF(complianceReport, regulatoryFramework);
  }

  /**
   * Generate fleet-wide compliance overview PDF
   */
  async generateFleetComplianceOverviewPDF(
    orgId: string,
    period: { startDate: Date; endDate: Date }
  ): Promise<Uint8Array> {
    console.log(`[Compliance PDF] Generating fleet compliance overview for org: ${orgId}`);

    // Get all equipment for organization
    const equipmentHealth = await this.storage.getEquipmentHealth(orgId);
    const equipmentIds = equipmentHealth.map(eq => eq.id);

    // Generate compliance assessment for all standards
    const standardCodes = MARITIME_STANDARDS.map(std => std.code);
    
    const fleetComplianceReport = await generateComplianceReport({
      bundleId: `FLEET-${Date.now()}-${orgId}`,
      title: 'Fleet Compliance Overview',
      reportType: 'audit',
      vessel: {
        name: 'Fleet Operations',
        imoNumber: 'FLEET-OVERVIEW',
        flag: 'Multi-Flag',
        vesselType: 'fleet',
        operator: orgId
      },
      reportingPeriod: period,
      equipmentIds,
      standardCodes
    }, this.storage, orgId);

    return await this.renderFleetOverviewPDF(fleetComplianceReport);
  }

  /**
   * Render compliance report to PDF using pdf-lib
   */
  private async renderComplianceReportPDF(
    report: ComplianceReport, 
    inspector: string
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Add first page
    let page = pdfDoc.addPage([595, 842]); // A4 size
    let yPosition = 800;
    
    // Title and header
    page.drawText(report.title, {
      x: 50,
      y: yPosition,
      size: 20,
      font: boldFont,
      color: rgb(0, 0, 0)
    });
    yPosition -= 40;

    // Vessel information
    page.drawText('VESSEL INFORMATION', {
      x: 50,
      y: yPosition,
      size: 14,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.8)
    });
    yPosition -= 25;

    const vesselInfo = [
      `Vessel Name: ${report.vessel.name}`,
      `IMO Number: ${report.vessel.imoNumber}`,
      `Flag State: ${report.vessel.flag}`,
      `Report Period: ${report.reportingPeriod.startDate.toLocaleDateString()} - ${report.reportingPeriod.endDate.toLocaleDateString()}`,
      `Report Type: ${report.reportType.toUpperCase()}`,
      `Generated: ${new Date().toLocaleString()}`
    ];

    for (const info of vesselInfo) {
      page.drawText(info, {
        x: 50,
        y: yPosition,
        size: 10,
        font: font
      });
      yPosition -= 20;
    }

    yPosition -= 20;

    // Compliance summary
    const compliantCount = report.assessments.filter(a => a.overallStatus === 'compliant').length;
    const totalAssessments = report.assessments.length;
    const complianceRate = totalAssessments > 0 ? (compliantCount / totalAssessments * 100).toFixed(1) : '0.0';

    page.drawText('COMPLIANCE SUMMARY', {
      x: 50,
      y: yPosition,
      size: 14,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.8)
    });
    yPosition -= 25;

    page.drawText(`Overall Compliance Rate: ${complianceRate}% (${compliantCount}/${totalAssessments})`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: complianceRate === '100.0' ? rgb(0, 0.6, 0) : rgb(0.8, 0.4, 0)
    });
    yPosition -= 30;

    // Telemetry analysis
    if (report.telemetryAnalysis) {
      page.drawText('MONITORING STATISTICS', {
        x: 50,
        y: yPosition,
        size: 14,
        font: boldFont,
        color: rgb(0.2, 0.2, 0.8)
      });
      yPosition -= 25;

      const telemetryStats = [
        `Monitoring Hours: ${report.telemetryAnalysis.monitoringHours}`,
        `Total Readings: ${report.telemetryAnalysis.totalReadings.toLocaleString()}`,
        `Anomalies Detected: ${report.telemetryAnalysis.anomaliesDetected}`,
        `Alerts Generated: ${report.telemetryAnalysis.alertsGenerated}`,
        `Equipment Availability: ${report.telemetryAnalysis.equipmentAvailability}%`
      ];

      for (const stat of telemetryStats) {
        page.drawText(stat, {
          x: 50,
          y: yPosition,
          size: 10,
          font: font
        });
        yPosition -= 18;
      }
      yPosition -= 20;
    }

    // Standards compliance details
    page.drawText('STANDARDS COMPLIANCE', {
      x: 50,
      y: yPosition,
      size: 14,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.8)
    });
    yPosition -= 25;

    for (const standard of report.standards) {
      if (yPosition < 100) {
        page = pdfDoc.addPage([595, 842]);
        yPosition = 800;
      }

      page.drawText(`${standard.name} (${standard.code})`, {
        x: 50,
        y: yPosition,
        size: 11,
        font: boldFont
      });
      yPosition -= 20;

      page.drawText(`Authority: ${standard.authority} | Category: ${standard.category.toUpperCase()}`, {
        x: 50,
        y: yPosition,
        size: 9,
        font: font,
        color: rgb(0.4, 0.4, 0.4)
      });
      yPosition -= 25;
    }

    // Assessment details
    page.drawText('ASSESSMENT RESULTS', {
      x: 50,
      y: yPosition,
      size: 14,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.8)
    });
    yPosition -= 25;

    for (const assessment of report.assessments) {
      if (yPosition < 150) {
        page = pdfDoc.addPage([595, 842]);
        yPosition = 800;
      }

      // Equipment ID and overall status
      const statusColor = assessment.overallStatus === 'compliant' ? rgb(0, 0.6, 0) : 
                         assessment.overallStatus === 'conditional' ? rgb(0.8, 0.6, 0) : 
                         rgb(0.8, 0, 0);

      page.drawText(`Equipment: ${assessment.equipmentId} - ${assessment.overallStatus.toUpperCase()}`, {
        x: 50,
        y: yPosition,
        size: 11,
        font: boldFont,
        color: statusColor
      });
      yPosition -= 20;

      page.drawText(`Standard: ${assessment.standardCode} | Next Assessment: ${assessment.nextAssessmentDate.toLocaleDateString()}`, {
        x: 50,
        y: yPosition,
        size: 9,
        font: font,
        color: rgb(0.4, 0.4, 0.4)
      });
      yPosition -= 20;

      // Certificate information if compliant
      if (assessment.certificateNumber) {
        page.drawText(`Certificate: ${assessment.certificateNumber} (Valid until: ${assessment.validUntil?.toLocaleDateString()})`, {
          x: 50,
          y: yPosition,
          size: 9,
          font: font,
          color: rgb(0, 0.4, 0)
        });
        yPosition -= 15;
      }

      yPosition -= 10;
    }

    // Recommendations
    if (report.recommendations && report.recommendations.length > 0) {
      if (yPosition < 200) {
        page = pdfDoc.addPage([595, 842]);
        yPosition = 800;
      }

      page.drawText('RECOMMENDATIONS', {
        x: 50,
        y: yPosition,
        size: 14,
        font: boldFont,
        color: rgb(0.8, 0.2, 0.2)
      });
      yPosition -= 25;

      for (const rec of report.recommendations) {
        if (yPosition < 100) {
          page = pdfDoc.addPage([595, 842]);
          yPosition = 800;
        }

        const priorityColor = rec.priority === 'high' ? rgb(0.8, 0, 0) : 
                             rec.priority === 'medium' ? rgb(0.8, 0.6, 0) : 
                             rgb(0.4, 0.4, 0.4);

        page.drawText(`${rec.priority.toUpperCase()}: ${rec.description}`, {
          x: 50,
          y: yPosition,
          size: 10,
          font: font,
          color: priorityColor
        });
        yPosition -= 15;

        page.drawText(`Deadline: ${rec.deadline.toLocaleDateString()} | Category: ${rec.category}`, {
          x: 50,
          y: yPosition,
          size: 8,
          font: font,
          color: rgb(0.4, 0.4, 0.4)
        });
        yPosition -= 20;
      }
    }

    // Digital signature
    if (yPosition < 150) {
      page = pdfDoc.addPage([595, 842]);
      yPosition = 800;
    }

    yPosition = 150; // Position signature at bottom

    page.drawText('DIGITAL CERTIFICATION', {
      x: 50,
      y: yPosition,
      size: 14,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.8)
    });
    yPosition -= 25;

    const signatureInfo = [
      `Inspector: ${inspector}`,
      `System: ${report.signature.inspector}`,
      `Certification: ${report.signature.inspectorCertification}`,
      `Date: ${report.signature.date.toLocaleString()}`,
      `Digital Signature: ${report.signature.digitalSignature}`
    ];

    for (const info of signatureInfo) {
      page.drawText(info, {
        x: 50,
        y: yPosition,
        size: 9,
        font: font
      });
      yPosition -= 15;
    }

    return pdfDoc.save();
  }

  /**
   * Render maintenance compliance PDF
   */
  private async renderMaintenanceCompliancePDF(
    workOrders: WorkOrder[],
    equipmentHealth: EquipmentHealth[],
    period: { startDate: Date; endDate: Date },
    options: { vesselName: string; includeWorkOrders: boolean; includeHealthMetrics: boolean }
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const page = pdfDoc.addPage([595, 842]);
    let yPosition = 800;
    
    // Title
    page.drawText('MAINTENANCE COMPLIANCE REPORT', {
      x: 50,
      y: yPosition,
      size: 18,
      font: boldFont
    });
    yPosition -= 40;

    // Vessel info
    page.drawText(`Vessel: ${options.vesselName}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: font
    });
    yPosition -= 20;

    page.drawText(`Period: ${period.startDate.toLocaleDateString()} - ${period.endDate.toLocaleDateString()}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: font
    });
    yPosition -= 40;

    // Work orders summary
    if (options.includeWorkOrders) {
      const completedOrders = workOrders.filter(wo => wo.status === 'completed').length;
      const totalOrders = workOrders.length;

      page.drawText('MAINTENANCE ACTIVITIES', {
        x: 50,
        y: yPosition,
        size: 14,
        font: boldFont,
        color: rgb(0.2, 0.2, 0.8)
      });
      yPosition -= 25;

      page.drawText(`Total Work Orders: ${totalOrders}`, {
        x: 50,
        y: yPosition,
        size: 11,
        font: font
      });
      yPosition -= 18;

      page.drawText(`Completed: ${completedOrders} (${totalOrders > 0 ? (completedOrders/totalOrders*100).toFixed(1) : 0}%)`, {
        x: 50,
        y: yPosition,
        size: 11,
        font: font,
        color: completedOrders === totalOrders ? rgb(0, 0.6, 0) : rgb(0.8, 0.4, 0)
      });
      yPosition -= 30;
    }

    // Equipment health summary
    if (options.includeHealthMetrics) {
      const avgHealth = equipmentHealth.reduce((sum, eq) => sum + eq.healthScore, 0) / equipmentHealth.length || 0;

      page.drawText('EQUIPMENT HEALTH', {
        x: 50,
        y: yPosition,
        size: 14,
        font: boldFont,
        color: rgb(0.2, 0.2, 0.8)
      });
      yPosition -= 25;

      page.drawText(`Equipment Units: ${equipmentHealth.length}`, {
        x: 50,
        y: yPosition,
        size: 11,
        font: font
      });
      yPosition -= 18;

      page.drawText(`Average Health Score: ${avgHealth.toFixed(1)}%`, {
        x: 50,
        y: yPosition,
        size: 11,
        font: font,
        color: avgHealth >= 80 ? rgb(0, 0.6, 0) : avgHealth >= 60 ? rgb(0.8, 0.6, 0) : rgb(0.8, 0, 0)
      });
      yPosition -= 30;
    }

    return pdfDoc.save();
  }

  /**
   * Render regulatory compliance PDF
   */
  private async renderRegulatoryCompliancePDF(
    report: ComplianceReport,
    framework: string
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const page = pdfDoc.addPage([595, 842]);
    let yPosition = 800;
    
    // Title with regulatory framework
    page.drawText(`${framework} REGULATORY COMPLIANCE CERTIFICATE`, {
      x: 50,
      y: yPosition,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0.8)
    });
    yPosition -= 50;

    // Compliance status
    const compliantCount = report.assessments.filter(a => a.overallStatus === 'compliant').length;
    const totalAssessments = report.assessments.length;
    const complianceRate = totalAssessments > 0 ? (compliantCount / totalAssessments * 100) : 0;

    const certificationStatus = complianceRate === 100 ? 'CERTIFIED' : 
                               complianceRate >= 80 ? 'CONDITIONAL' : 'NON-COMPLIANT';

    page.drawText(`CERTIFICATION STATUS: ${certificationStatus}`, {
      x: 50,
      y: yPosition,
      size: 14,
      font: boldFont,
      color: certificationStatus === 'CERTIFIED' ? rgb(0, 0.6, 0) : 
             certificationStatus === 'CONDITIONAL' ? rgb(0.8, 0.6, 0) : rgb(0.8, 0, 0)
    });
    yPosition -= 30;

    page.drawText(`Compliance Rate: ${complianceRate.toFixed(1)}%`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: font
    });
    yPosition -= 40;

    // Framework-specific information
    page.drawText(`This certificate confirms compliance with ${framework} regulatory requirements`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font
    });
    yPosition -= 20;

    page.drawText(`for the reporting period ${report.reportingPeriod.startDate.toLocaleDateString()} to ${report.reportingPeriod.endDate.toLocaleDateString()}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font
    });

    return pdfDoc.save();
  }

  /**
   * Render fleet overview PDF
   */
  private async renderFleetOverviewPDF(report: ComplianceReport): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const page = pdfDoc.addPage([595, 842]);
    let yPosition = 800;
    
    // Title
    page.drawText('FLEET COMPLIANCE OVERVIEW', {
      x: 50,
      y: yPosition,
      size: 18,
      font: boldFont,
      color: rgb(0, 0, 0.8)
    });
    yPosition -= 50;

    // Fleet statistics
    const compliantEquipment = report.assessments.filter(a => a.overallStatus === 'compliant').length;
    const conditionalEquipment = report.assessments.filter(a => a.overallStatus === 'conditional').length;
    const nonCompliantEquipment = report.assessments.filter(a => a.overallStatus === 'non_compliant').length;
    const totalEquipment = report.assessments.length;

    page.drawText('FLEET STATISTICS', {
      x: 50,
      y: yPosition,
      size: 14,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.8)
    });
    yPosition -= 25;

    const fleetStats = [
      `Total Equipment Units: ${totalEquipment}`,
      `Compliant Units: ${compliantEquipment} (${totalEquipment > 0 ? (compliantEquipment/totalEquipment*100).toFixed(1) : 0}%)`,
      `Conditional Units: ${conditionalEquipment} (${totalEquipment > 0 ? (conditionalEquipment/totalEquipment*100).toFixed(1) : 0}%)`,
      `Non-Compliant Units: ${nonCompliantEquipment} (${totalEquipment > 0 ? (nonCompliantEquipment/totalEquipment*100).toFixed(1) : 0}%)`
    ];

    for (const stat of fleetStats) {
      page.drawText(stat, {
        x: 50,
        y: yPosition,
        size: 11,
        font: font
      });
      yPosition -= 20;
    }

    return pdfDoc.save();
  }
}

/**
 * PDF export utilities and types
 */
export interface CompliancePDFOptions {
  reportType: 'equipment' | 'maintenance' | 'regulatory' | 'fleet';
  vesselName?: string;
  imoNumber?: string;
  flag?: string;
  inspector?: string;
  regulatoryFramework?: 'IMO' | 'ABS' | 'DNV' | 'USCG';
  includeWorkOrders?: boolean;
  includeHealthMetrics?: boolean;
}

/**
 * PDF report generation results
 */
export interface CompliancePDFResult {
  success: boolean;
  pdfData?: Uint8Array;
  filename: string;
  reportType: string;
  generatedAt: Date;
  error?: string;
}