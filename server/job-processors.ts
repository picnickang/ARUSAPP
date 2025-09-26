/**
 * Job Processors for Background Operations
 * Implements processors for computationally intensive tasks
 */

import { jobQueue, JOB_TYPES } from './background-jobs';
import { computeInsights, persistSnapshot } from './insights-engine';
import { storage } from './storage';

/**
 * AI Analysis Processors
 */
async function processEquipmentAnalysis(data: {
  equipmentId: string;
  telemetryData: any[];
  equipmentType?: string;
}): Promise<any> {
  const { analyzeEquipmentHealth } = await import('./openai');
  return await analyzeEquipmentHealth(
    data.telemetryData,
    data.equipmentId,
    data.equipmentType
  );
}

async function processFleetAnalysis(data: {
  equipmentHealthData: any[];
  telemetryData: any[];
}): Promise<any> {
  const { analyzeFleetHealth } = await import('./openai');
  return await analyzeFleetHealth(
    data.equipmentHealthData,
    data.telemetryData
  );
}

/**
 * Report Generation Processors
 */
async function processPDFGeneration(data: {
  reportData: any;
  options: any;
}): Promise<{ buffer: Buffer; filename: string }> {
  const PDFDocument = await import('pdfkit');
  const { reportData, options } = data;
  
  const doc = new PDFDocument.default();
  const chunks: Buffer[] = [];
  
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  
  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const filename = `report_${options.type || 'general'}_${new Date().toISOString().split('T')[0]}.pdf`;
      resolve({ buffer, filename });
    });
    
    doc.on('error', reject);
    
    // Generate PDF content
    doc.fontSize(20).text(options.title || 'ARUS Marine Report', 100, 100);
    doc.fontSize(12).text(`Generated: ${new Date().toISOString()}`, 100, 140);
    
    // Add equipment health data
    if (reportData.equipmentHealth) {
      doc.fontSize(16).text('Equipment Health Summary', 100, 180);
      let y = 210;
      
      reportData.equipmentHealth.slice(0, 10).forEach((equipment: any) => {
        doc.fontSize(10)
           .text(`${equipment.id}: Health ${equipment.healthIndex}%`, 100, y)
           .text(`Status: ${equipment.status}`, 300, y);
        y += 20;
      });
    }
    
    // Add work orders summary
    if (reportData.workOrders) {
      doc.fontSize(16).text('Work Orders Summary', 100, y + 20);
      y += 50;
      
      reportData.workOrders.slice(0, 5).forEach((order: any) => {
        doc.fontSize(10)
           .text(`${order.title}`, 100, y)
           .text(`Priority: ${order.priority}`, 300, y)
           .text(`Status: ${order.status}`, 400, y);
        y += 20;
      });
    }
    
    doc.end();
  });
}

async function processCSVGeneration(data: {
  reportData: any;
  options: any;
}): Promise<{ csv: string; filename: string }> {
  const { reportData, options } = data;
  
  const csvRows: string[] = [];
  csvRows.push('Section,Type,ID,Value,Details,Timestamp');
  
  const sanitizeCSV = (value: any): string => {
    const str = String(value || '');
    if (str.match(/^[=+\-@]/)) {
      return `'${str}`;
    }
    return str.replace(/"/g, '""');
  };
  
  const timestamp = new Date().toISOString();
  
  // Add equipment health data
  if (reportData.equipmentHealth) {
    reportData.equipmentHealth.forEach((equipment: any) => {
      csvRows.push([
        'Equipment Health',
        'Health Index',
        sanitizeCSV(equipment.id),
        equipment.healthIndex,
        `Vessel: ${sanitizeCSV(equipment.vessel)}, Status: ${equipment.status}`,
        timestamp
      ].join(','));
    });
  }
  
  // Add work orders
  if (reportData.workOrders) {
    reportData.workOrders.forEach((order: any) => {
      csvRows.push([
        'Work Orders',
        'Maintenance Task',
        sanitizeCSV(order.id),
        sanitizeCSV(order.title),
        `Priority: ${order.priority}, Status: ${order.status}`,
        timestamp
      ].join(','));
    });
  }
  
  const csv = csvRows.join('\n');
  const filename = `report_${options.type || 'general'}_${new Date().toISOString().split('T')[0]}.csv`;
  
  return { csv, filename };
}

async function processHTMLGeneration(data: {
  reportData: any;
  options: any;
}): Promise<{ html: string; filename: string }> {
  const { reportData, options } = data;
  
  const escapeHtml = (text: any) => {
    if (text === null || text === undefined) return '';
    const str = String(text);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };
  
  const timestamp = new Date().toISOString();
  const formattedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(options.title || 'ARUS Marine Report')}</title>
    <style>
        body { font-family: system-ui, sans-serif; line-height: 1.6; max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
        .section { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: 600; }
        .status-critical { color: #dc2626; font-weight: bold; }
        .status-warning { color: #ea580c; font-weight: bold; }
        .status-normal { color: #16a34a; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${escapeHtml(options.title || 'ARUS Marine Predictive Maintenance Report')}</h1>
        <p>Generated on ${formattedDate}</p>
    </div>
    
    ${reportData.equipmentHealth ? `
    <div class="section">
        <h2>Equipment Health Summary</h2>
        <table>
            <thead>
                <tr>
                    <th>Equipment ID</th>
                    <th>Vessel</th>
                    <th>Health Index</th>
                    <th>Status</th>
                    <th>Due Days</th>
                </tr>
            </thead>
            <tbody>
                ${reportData.equipmentHealth.slice(0, 20).map((equipment: any) => `
                    <tr>
                        <td>${escapeHtml(equipment.id)}</td>
                        <td>${escapeHtml(equipment.vessel)}</td>
                        <td>${equipment.healthIndex}%</td>
                        <td class="status-${equipment.status === 'critical' ? 'critical' : equipment.status === 'warning' ? 'warning' : 'normal'}">
                            ${escapeHtml(equipment.status)}
                        </td>
                        <td>${equipment.predictedDueDays || 'N/A'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}
    
    ${reportData.workOrders ? `
    <div class="section">
        <h2>Work Orders Summary</h2>
        <table>
            <thead>
                <tr>
                    <th>Title</th>
                    <th>Equipment</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Due Date</th>
                </tr>
            </thead>
            <tbody>
                ${reportData.workOrders.slice(0, 15).map((order: any) => `
                    <tr>
                        <td>${escapeHtml(order.title)}</td>
                        <td>${escapeHtml(order.equipmentId)}</td>
                        <td class="status-${order.priority === 'critical' ? 'critical' : order.priority === 'high' ? 'warning' : 'normal'}">
                            ${escapeHtml(order.priority)}
                        </td>
                        <td>${escapeHtml(order.status)}</td>
                        <td>${order.dueDate ? new Date(order.dueDate).toLocaleDateString() : 'N/A'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}
</body>
</html>`;
  
  const filename = `report_${options.type || 'general'}_${new Date().toISOString().split('T')[0]}.html`;
  
  return { html, filename };
}

/**
 * Insights Snapshot Processor
 */
async function processInsightsSnapshotGeneration(data: {
  orgId: string;
  scope?: string;
}): Promise<any> {
  try {
    const { orgId, scope = 'fleet' } = data;
    
    console.log(`[Insights] Generating snapshot for org: ${orgId}, scope: ${scope}`);
    
    // Compute insights using existing data
    const insights = await computeInsights(orgId, scope);
    
    // Persist snapshot
    const snapshot = await persistSnapshot(orgId, scope, insights);
    
    console.log(`[Insights] Snapshot generated successfully: ${snapshot.id}`);
    
    return {
      snapshotId: snapshot.id,
      scope,
      kpis: insights.kpis,
      riskFactors: insights.riskFactors,
      summary: insights.summary
    };
  } catch (error) {
    console.error('[Insights] Snapshot generation failed:', error);
    throw error;
  }
}

/**
 * Crew Scheduling Processor
 */
async function processCrewScheduling(data: {
  days: string[];
  shifts: any[];
  crew: any[];
  leaves: any[];
  options: any;
}): Promise<any> {
  const { scheduleWithORTools } = await import('./crew-scheduler-ortools');
  return scheduleWithORTools(
    data.days,
    data.shifts,
    data.crew,
    data.leaves,
    [], // portCalls
    [], // drydocks
    {}, // certifications
    data.options.preferences
  );
}

/**
 * Maintenance Scheduling Processor
 */
async function processMaintenanceScheduling(data: {
  equipmentId: string;
  pdmScore: number;
}): Promise<any> {
  const { storage } = await import('./storage');
  return await storage.autoScheduleMaintenance(data.equipmentId, data.pdmScore);
}

/**
 * Telemetry Processing Processor
 */
async function processTelemetryProcessing(data: {
  telemetryReading: any;
}): Promise<{ alerts: any[]; schedules: any[]; insights: any }> {
  const { checkAndCreateAlerts } = await import('./alerts');
  const { checkAndScheduleAutomaticMaintenance } = await import('./maintenance-scheduler');
  
  const results = {
    alerts: [] as any[],
    schedules: [] as any[],
    insights: null as any
  };
  
  try {
    // Process alerts
    const alerts = await checkAndCreateAlerts(data.telemetryReading);
    results.alerts = Array.isArray(alerts) ? alerts : alerts ? [alerts] : [];
  } catch (error) {
    console.warn('Alert processing failed in background job:', error);
  }
  
  try {
    // Process automatic maintenance scheduling
    const schedule = await checkAndScheduleAutomaticMaintenance(data.telemetryReading);
    results.schedules = schedule ? [schedule] : [];
  } catch (error) {
    console.warn('Maintenance scheduling failed in background job:', error);
  }
  
  try {
    // Process AI insights if enabled
    const { storage } = await import('./storage');
    const settings = await storage.getSettings();
    
    if (settings.llmEnabled) {
      const { generateAIInsights } = await import('./ai-insights');
      results.insights = await generateAIInsights(data.telemetryReading);
    }
  } catch (error) {
    console.warn('AI insights failed in background job:', error);
  }
  
  return results;
}

/**
 * Register all job processors
 */
export function registerJobProcessors(): void {
  // AI Analysis processors
  jobQueue.registerProcessor(JOB_TYPES.AI_EQUIPMENT_ANALYSIS, processEquipmentAnalysis);
  jobQueue.registerProcessor(JOB_TYPES.AI_FLEET_ANALYSIS, processFleetAnalysis);
  
  // Report generation processors  
  jobQueue.registerProcessor(JOB_TYPES.REPORT_GENERATION_PDF, processPDFGeneration);
  jobQueue.registerProcessor(JOB_TYPES.REPORT_GENERATION_CSV, processCSVGeneration);
  jobQueue.registerProcessor(JOB_TYPES.REPORT_GENERATION_HTML, processHTMLGeneration);
  
  // Scheduling processors
  jobQueue.registerProcessor(JOB_TYPES.CREW_SCHEDULING, processCrewScheduling);
  jobQueue.registerProcessor(JOB_TYPES.MAINTENANCE_SCHEDULING, processMaintenanceScheduling);
  
  // Telemetry processing
  jobQueue.registerProcessor(JOB_TYPES.TELEMETRY_PROCESSING, processTelemetryProcessing);
  
  // Insights processing
  jobQueue.registerProcessor(JOB_TYPES.INSIGHTS_SNAPSHOT_GENERATION, processInsightsSnapshotGeneration);
  
  console.log('[Background Jobs] All processors registered successfully');
}

/**
 * Start the background job system
 */
export function startBackgroundJobs(): void {
  registerJobProcessors();
  jobQueue.start();
  console.log('[Background Jobs] Job queue started');
}