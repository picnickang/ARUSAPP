import { eq, desc, and, gte, lte, sql, or } from "drizzle-orm";
import { db } from "./db";
import { 
  vessels,
  complianceItems,
  regulatoryReports,
  emissions,
  vesselCertificates,
  inspections,
  type ComplianceItem,
  type RegulatoryReport,
  type Emission,
  type VesselCertificate,
  type Inspection
} from "@shared/schema";

/**
 * Regulatory Compliance & Reporting Service
 * Manages IMO compliance, environmental reporting, and certificate tracking
 */
export class ComplianceService {
  /**
   * Get compliance overview for all vessels or specific vessel
   */
  async getComplianceOverview(vesselId?: string): Promise<{
    complianceRate: number;
    overdueItems: number;
    expiringCertificates: number;
    pendingReports: number;
    recentInspections: number;
    summary: any;
  }> {
    const oneMonthFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();

    // Build query conditions
    const vesselCondition = vesselId ? eq(complianceItems.vesselId, vesselId) : undefined;
    const certCondition = vesselId ? eq(vesselCertificates.vesselId, vesselId) : undefined;
    const reportCondition = vesselId ? eq(regulatoryReports.vesselId, vesselId) : undefined;
    const inspectionCondition = vesselId ? eq(inspections.vesselId, vesselId) : undefined;

    // Get compliance items
    const complianceQuery = db.select().from(complianceItems);
    const allItems = vesselCondition ? 
      await complianceQuery.where(vesselCondition) : 
      await complianceQuery;

    const overdueItems = allItems.filter(item => 
      item.nextDue && item.nextDue < now && item.status !== 'completed'
    ).length;

    const complianceRate = allItems.length > 0 ? 
      ((allItems.length - overdueItems) / allItems.length) * 100 : 100;

    // Get expiring certificates
    const certQuery = db.select().from(vesselCertificates);
    const certificates = certCondition ? 
      await certQuery.where(certCondition) : 
      await certQuery;

    const expiringCertificates = certificates.filter(cert => 
      cert.expiryDate && cert.expiryDate <= oneMonthFromNow && cert.status === 'valid'
    ).length;

    // Get pending reports
    const reportQuery = db.select().from(regulatoryReports);
    const reports = reportCondition ? 
      await reportQuery.where(reportCondition) : 
      await reportQuery;

    const pendingReports = reports.filter(report => report.status === 'draft').length;

    // Get recent inspections (last 6 months)
    const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);
    const inspectionQuery = db.select().from(inspections)
      .where(gte(inspections.inspectionDate, sixMonthsAgo));
    
    const recentInspections = inspectionCondition ? 
      await inspectionQuery.where(inspectionCondition) : 
      await inspectionQuery;

    const summary = {
      totalItems: allItems.length,
      compliantItems: allItems.length - overdueItems,
      totalCertificates: certificates.length,
      validCertificates: certificates.filter(c => c.status === 'valid').length,
      totalReports: reports.length,
      submittedReports: reports.filter(r => r.status === 'submitted').length,
      inspectionCount: recentInspections.length,
      satisfactoryInspections: recentInspections.filter(i => i.result === 'satisfactory').length
    };

    return {
      complianceRate: Math.round(complianceRate),
      overdueItems,
      expiringCertificates,
      pendingReports,
      recentInspections: recentInspections.length,
      summary
    };
  }

  /**
   * Create compliance item for vessel
   */
  async createComplianceItem(itemData: {
    vesselId: string;
    regulation: string;
    requirement: string;
    title: string;
    description?: string;
    frequency?: string;
    nextDue?: Date;
    authority?: string;
    criticality?: string;
    documents?: any;
  }): Promise<string> {
    const [item] = await db
      .insert(complianceItems)
      .values({
        ...itemData,
        status: "pending"
      })
      .returning({ id: complianceItems.id });

    console.log(`[Compliance] Created compliance item: ${item.id}`);
    return item.id;
  }

  /**
   * Update compliance item status
   */
  async updateComplianceStatus(itemId: string, status: string, completionData?: {
    lastCompleted?: Date;
    nextDue?: Date;
    documents?: any;
  }): Promise<void> {
    await db
      .update(complianceItems)
      .set({
        status,
        ...completionData,
        updatedAt: new Date()
      })
      .where(eq(complianceItems.id, itemId));

    console.log(`[Compliance] Updated item ${itemId} status to ${status}`);
  }

  /**
   * Generate automated regulatory report
   */
  async generateRegulatoryReport(reportData: {
    vesselId: string;
    reportType: string;
    regulation: string;
    reportingPeriod: string;
    authority: string;
    submissionDeadline?: Date;
  }): Promise<string> {
    // Generate report data based on type
    const reportContent = await this.generateReportContent(reportData);

    const [report] = await db
      .insert(regulatoryReports)
      .values({
        ...reportData,
        reportData: reportContent,
        status: "draft"
      })
      .returning({ id: regulatoryReports.id });

    console.log(`[Compliance] Generated regulatory report: ${report.id}`);
    return report.id;
  }

  /**
   * Generate report content based on type
   */
  private async generateReportContent(reportData: any): Promise<any> {
    const { vesselId, reportType, reportingPeriod } = reportData;

    switch (reportType) {
      case "emissions":
        return await this.generateEmissionsReport(vesselId, reportingPeriod);
      case "ballast_water":
        return await this.generateBallastWaterReport(vesselId, reportingPeriod);
      case "waste":
        return await this.generateWasteReport(vesselId, reportingPeriod);
      case "port_state_control":
        return await this.generatePortStateControlReport(vesselId, reportingPeriod);
      default:
        return { summary: "Generic compliance report", data: {} };
    }
  }

  /**
   * Generate emissions report data
   */
  private async generateEmissionsReport(vesselId: string, period: string): Promise<any> {
    // Parse period (e.g., "2024-Q1", "2024-03")
    const { startDate, endDate } = this.parsePeriod(period);

    const emissionsData = await db
      .select()
      .from(emissions)
      .where(
        and(
          eq(emissions.vesselId, vesselId),
          gte(emissions.ts, startDate),
          lte(emissions.ts, endDate)
        )
      )
      .orderBy(emissions.ts);

    // Calculate totals
    const totals = emissionsData.reduce(
      (acc, record) => ({
        co2: acc.co2 + (record.co2 || 0),
        nox: acc.nox + (record.nox || 0),
        sox: acc.sox + (record.sox || 0),
        pm: acc.pm + (record.pm || 0),
        fuelConsumed: acc.fuelConsumed + (record.fuelConsumed || 0)
      }),
      { co2: 0, nox: 0, sox: 0, pm: 0, fuelConsumed: 0 }
    );

    // Calculate efficiency metrics
    const efficiency = totals.fuelConsumed > 0 ? {
      co2PerTonFuel: totals.co2 / totals.fuelConsumed,
      noxPerTonFuel: totals.nox / totals.fuelConsumed,
      soxPerTonFuel: totals.sox / totals.fuelConsumed
    } : { co2PerTonFuel: 0, noxPerTonFuel: 0, soxPerTonFuel: 0 };

    return {
      period,
      totals,
      efficiency,
      recordCount: emissionsData.length,
      complianceStatus: this.assessEmissionsCompliance(totals),
      recommendations: this.generateEmissionsRecommendations(totals, efficiency)
    };
  }

  /**
   * Assess emissions compliance against IMO regulations
   */
  private assessEmissionsCompliance(totals: any): string {
    // Simplified compliance check - in production, this would use actual vessel specifications
    const co2Limit = 1000000; // Example: 1000 tons CO2 per quarter
    const noxLimit = 50000;   // Example: 50 tons NOx per quarter
    const soxLimit = 10000;   // Example: 10 tons SOx per quarter

    if (totals.co2 > co2Limit || totals.nox > noxLimit || totals.sox > soxLimit) {
      return "non_compliant";
    } else if (totals.co2 > co2Limit * 0.8 || totals.nox > noxLimit * 0.8) {
      return "approaching_limits";
    }
    return "compliant";
  }

  /**
   * Generate emissions reduction recommendations
   */
  private generateEmissionsRecommendations(totals: any, efficiency: any): string[] {
    const recommendations = [];

    if (efficiency.co2PerTonFuel > 3.2) {
      recommendations.push("High CO2 emissions per fuel unit - consider engine optimization");
    }

    if (efficiency.noxPerTonFuel > 0.1) {
      recommendations.push("NOx emissions elevated - review SCR system performance");
    }

    if (efficiency.soxPerTonFuel > 0.02) {
      recommendations.push("High SOx emissions - switch to low sulfur fuel or install scrubbers");
    }

    if (totals.fuelConsumed > 500) {
      recommendations.push("High fuel consumption - implement fuel efficiency measures");
    }

    if (recommendations.length === 0) {
      recommendations.push("Emissions within acceptable ranges - maintain current practices");
    }

    return recommendations;
  }

  /**
   * Generate ballast water report
   */
  private async generateBallastWaterReport(vesselId: string, period: string): Promise<any> {
    // Simulate ballast water treatment data
    return {
      period,
      treatmentSystems: [
        {
          system: "UV + Electrochlorination",
          operationalHours: 1200,
          volumeTreated: 15000, // m3
          complianceRate: 98.5
        }
      ],
      dischargeOperations: 24,
      complianceTests: 20,
      passedTests: 19,
      complianceStatus: "compliant",
      recommendations: ["Schedule system maintenance", "Update treatment logs"]
    };
  }

  /**
   * Generate waste report
   */
  private async generateWasteReport(vesselId: string, period: string): Promise<any> {
    return {
      period,
      wasteTypes: {
        plastics: { generated: 150, disposed: 150, unit: "kg" },
        food: { generated: 2400, disposed: 2400, unit: "kg" },
        oil: { generated: 80, disposed: 80, unit: "liters" },
        chemicals: { generated: 25, disposed: 25, unit: "kg" }
      },
      disposalMethods: [
        { method: "port_reception", percentage: 85 },
        { method: "incineration", percentage: 15 }
      ],
      complianceStatus: "compliant",
      recommendations: ["Implement waste segregation training", "Reduce plastic consumption"]
    };
  }

  /**
   * Generate port state control report
   */
  private async generatePortStateControlReport(vesselId: string, period: string): Promise<any> {
    const { startDate, endDate } = this.parsePeriod(period);

    const inspectionsData = await db
      .select()
      .from(inspections)
      .where(
        and(
          eq(inspections.vesselId, vesselId),
          gte(inspections.inspectionDate, startDate),
          lte(inspections.inspectionDate, endDate),
          eq(inspections.inspectionType, "port_state_control")
        )
      );

    return {
      period,
      inspectionCount: inspectionsData.length,
      satisfactoryInspections: inspectionsData.filter(i => i.result === "satisfactory").length,
      deficienciesFound: inspectionsData.reduce((sum, i) => {
        const deficiencies = i.deficiencies as any[] || [];
        return sum + deficiencies.length;
      }, 0),
      detentions: inspectionsData.filter(i => i.result === "detention").length,
      complianceRate: inspectionsData.length > 0 ? 
        (inspectionsData.filter(i => i.result === "satisfactory").length / inspectionsData.length) * 100 : 100,
      topDeficiencies: this.analyzeDeficiencies(inspectionsData),
      recommendations: this.generatePSCRecommendations(inspectionsData)
    };
  }

  /**
   * Analyze common deficiencies from inspections
   */
  private analyzeDeficiencies(inspectionsData: any[]): any[] {
    const deficiencyMap = new Map();

    inspectionsData.forEach(inspection => {
      const deficiencies = inspection.deficiencies as any[] || [];
      deficiencies.forEach(def => {
        const key = def.code || def.description || "Unknown";
        deficiencyMap.set(key, (deficiencyMap.get(key) || 0) + 1);
      });
    });

    return Array.from(deficiencyMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([deficiency, count]) => ({ deficiency, count }));
  }

  /**
   * Generate PSC recommendations
   */
  private generatePSCRecommendations(inspectionsData: any[]): string[] {
    const recommendations = [];
    const recentInspections = inspectionsData.slice(-3);

    if (recentInspections.some(i => i.result === "detention")) {
      recommendations.push("Address detention issues immediately - implement corrective action plan");
    }

    if (recentInspections.some(i => i.result === "deficiencies")) {
      recommendations.push("Focus on recurring deficiency areas during self-audits");
    }

    const avgDeficiencies = recentInspections.reduce((sum, i) => {
      const deficiencies = i.deficiencies as any[] || [];
      return sum + deficiencies.length;
    }, 0) / Math.max(recentInspections.length, 1);

    if (avgDeficiencies > 3) {
      recommendations.push("High deficiency rate - enhance onboard maintenance procedures");
    }

    if (recommendations.length === 0) {
      recommendations.push("Good PSC performance - maintain current standards");
    }

    return recommendations;
  }

  /**
   * Parse reporting period string into date range
   */
  private parsePeriod(period: string): { startDate: Date; endDate: Date } {
    const year = parseInt(period.substring(0, 4));
    
    if (period.includes("-Q")) {
      // Quarterly period (e.g., "2024-Q1")
      const quarter = parseInt(period.split("-Q")[1]);
      const startMonth = (quarter - 1) * 3;
      return {
        startDate: new Date(year, startMonth, 1),
        endDate: new Date(year, startMonth + 3, 0)
      };
    } else if (period.includes("-")) {
      // Monthly period (e.g., "2024-03")
      const month = parseInt(period.split("-")[1]) - 1; // 0-indexed
      return {
        startDate: new Date(year, month, 1),
        endDate: new Date(year, month + 1, 0)
      };
    } else {
      // Annual period (e.g., "2024")
      return {
        startDate: new Date(year, 0, 1),
        endDate: new Date(year, 11, 31)
      };
    }
  }

  /**
   * Submit regulatory report to authority
   */
  async submitRegulatoryReport(reportId: string, submissionData?: {
    confirmationNumber?: string;
    attachments?: any;
  }): Promise<void> {
    await db
      .update(regulatoryReports)
      .set({
        status: "submitted",
        submittedAt: new Date(),
        ...submissionData,
        updatedAt: new Date()
      })
      .where(eq(regulatoryReports.id, reportId));

    console.log(`[Compliance] Submitted regulatory report: ${reportId}`);
  }

  /**
   * Track vessel certificate
   */
  async addVesselCertificate(certificateData: {
    vesselId: string;
    certificateType: string;
    certificateName: string;
    issuer: string;
    issueDate?: Date;
    expiryDate?: Date;
    regulation?: string;
    scope?: string;
    documentPath?: string;
  }): Promise<string> {
    const [certificate] = await db
      .insert(vesselCertificates)
      .values({
        ...certificateData,
        status: "valid"
      })
      .returning({ id: vesselCertificates.id });

    console.log(`[Compliance] Added certificate: ${certificate.id}`);
    return certificate.id;
  }

  /**
   * Get expiring certificates
   */
  async getExpiringCertificates(days: number = 30, vesselId?: string): Promise<VesselCertificate[]> {
    const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    
    let query = db
      .select()
      .from(vesselCertificates)
      .where(
        and(
          lte(vesselCertificates.expiryDate, futureDate),
          eq(vesselCertificates.status, "valid")
        )
      );

    if (vesselId) {
      query = query.where(eq(vesselCertificates.vesselId, vesselId));
    }

    return await query.orderBy(vesselCertificates.expiryDate);
  }

  /**
   * Record inspection
   */
  async recordInspection(inspectionData: {
    vesselId: string;
    inspectionType: string;
    inspector: string;
    authority: string;
    port?: string;
    inspectionDate: Date;
    scope?: string;
    result: string;
    deficiencies?: any[];
    correctiveActions?: any[];
    reportNumber?: string;
  }): Promise<string> {
    const [inspection] = await db
      .insert(inspections)
      .values({
        ...inspectionData,
        deficiencies: inspectionData.deficiencies || [],
        correctiveActions: inspectionData.correctiveActions || [],
        status: "open",
        followUpRequired: (inspectionData.deficiencies || []).length > 0
      })
      .returning({ id: inspections.id });

    console.log(`[Compliance] Recorded inspection: ${inspection.id}`);
    return inspection.id;
  }

  /**
   * Update inspection status and corrective actions
   */
  async updateInspection(inspectionId: string, updateData: {
    status?: string;
    correctiveActions?: any[];
    followUpDate?: Date;
  }): Promise<void> {
    await db
      .update(inspections)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(inspections.id, inspectionId));

    console.log(`[Compliance] Updated inspection: ${inspectionId}`);
  }

  /**
   * Record emissions data
   */
  async recordEmissions(emissionData: {
    vesselId: string;
    co2?: number;
    nox?: number;
    sox?: number;
    pm?: number;
    fuelConsumed?: number;
    fuelType?: string;
    voyageSegment?: string;
    calculationMethod?: string;
  }): Promise<string> {
    const [emission] = await db
      .insert(emissions)
      .values({
        ...emissionData,
        ts: new Date(),
        verificationStatus: "unverified"
      })
      .returning({ id: emissions.id });

    console.log(`[Compliance] Recorded emissions data: ${emission.id}`);
    return emission.id;
  }

  /**
   * Get compliance dashboard data
   */
  async getComplianceDashboard(vesselId?: string): Promise<{
    overview: any;
    upcomingDeadlines: any[];
    recentActivity: any[];
    riskAreas: any[];
  }> {
    const overview = await this.getComplianceOverview(vesselId);
    
    // Get upcoming deadlines
    const oneMonthFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    let deadlinesQuery = db
      .select({
        id: complianceItems.id,
        vesselId: complianceItems.vesselId,
        title: complianceItems.title,
        nextDue: complianceItems.nextDue,
        criticality: complianceItems.criticality,
        regulation: complianceItems.regulation
      })
      .from(complianceItems)
      .where(
        and(
          lte(complianceItems.nextDue, oneMonthFromNow),
          or(
            eq(complianceItems.status, "pending"),
            eq(complianceItems.status, "overdue")
          )
        )
      );

    if (vesselId) {
      deadlinesQuery = deadlinesQuery.where(eq(complianceItems.vesselId, vesselId));
    }

    const upcomingDeadlines = await deadlinesQuery
      .orderBy(complianceItems.nextDue)
      .limit(10);

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let activityQuery = db
      .select({
        id: inspections.id,
        type: sql`'inspection'`.as("type"),
        date: inspections.inspectionDate,
        description: sql`CONCAT('Inspection by ', ${inspections.authority}, ' at ', ${inspections.port})`.as("description"),
        status: inspections.result
      })
      .from(inspections)
      .where(gte(inspections.inspectionDate, thirtyDaysAgo));

    if (vesselId) {
      activityQuery = activityQuery.where(eq(inspections.vesselId, vesselId));
    }

    const recentActivity = await activityQuery
      .orderBy(desc(inspections.inspectionDate))
      .limit(10);

    // Identify risk areas
    const riskAreas = await this.identifyRiskAreas(vesselId);

    return {
      overview,
      upcomingDeadlines,
      recentActivity,
      riskAreas
    };
  }

  /**
   * Identify compliance risk areas
   */
  private async identifyRiskAreas(vesselId?: string): Promise<any[]> {
    const risks = [];

    // Check for overdue items
    const overdueQuery = db
      .select()
      .from(complianceItems)
      .where(
        and(
          lte(complianceItems.nextDue, new Date()),
          eq(complianceItems.status, "pending")
        )
      );

    const overdueItems = vesselId ? 
      await overdueQuery.where(eq(complianceItems.vesselId, vesselId)) : 
      await overdueQuery;

    if (overdueItems.length > 0) {
      risks.push({
        area: "Overdue Compliance Items",
        severity: "high",
        count: overdueItems.length,
        description: `${overdueItems.length} compliance items are overdue`
      });
    }

    // Check for expiring certificates
    const oneMonthFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const expiringCerts = await this.getExpiringCertificates(30, vesselId);

    if (expiringCerts.length > 0) {
      risks.push({
        area: "Expiring Certificates",
        severity: "medium",
        count: expiringCerts.length,
        description: `${expiringCerts.length} certificates expire within 30 days`
      });
    }

    // Check for recent inspection deficiencies
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    let recentInspectionsQuery = db
      .select()
      .from(inspections)
      .where(
        and(
          gte(inspections.inspectionDate, threeMonthsAgo),
          eq(inspections.result, "deficiencies")
        )
      );

    const recentDeficiencies = vesselId ? 
      await recentInspectionsQuery.where(eq(inspections.vesselId, vesselId)) : 
      await recentInspectionsQuery;

    if (recentDeficiencies.length > 0) {
      risks.push({
        area: "Recent Inspection Deficiencies",
        severity: "medium",
        count: recentDeficiencies.length,
        description: `${recentDeficiencies.length} inspections with deficiencies in last 3 months`
      });
    }

    return risks;
  }
}

export const complianceService = new ComplianceService();