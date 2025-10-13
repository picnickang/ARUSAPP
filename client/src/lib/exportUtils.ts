/**
 * Centralized data export utility for CSV and JSON exports
 * 
 * @example CSV Export with custom columns and headers
 * ```typescript
 * import { exportToCSV } from '@/lib/exportUtils';
 * 
 * const data = [
 *   { id: '1', name: 'Pump A', status: 'healthy', value: 42.5 },
 *   { id: '2', name: 'Engine B', status: 'warning', value: 85.3 }
 * ];
 * 
 * exportToCSV(data, {
 *   filename: 'equipment-export.csv',
 *   columns: ['id', 'name', 'status', 'value'],
 *   headers: {
 *     id: 'Equipment ID',
 *     name: 'Equipment Name',
 *     status: 'Health Status',
 *     value: 'Reading Value'
 *   }
 * });
 * ```
 * 
 * @example CSV Export with automatic columns
 * ```typescript
 * exportToCSV(vessels, {
 *   filename: `fleet-export-${new Date().toISOString().split('T')[0]}.csv`
 * });
 * ```
 * 
 * @example JSON Export
 * ```typescript
 * import { exportToJSON } from '@/lib/exportUtils';
 * 
 * const reportData = {
 *   metadata: { generatedAt: new Date(), version: '1.0' },
 *   equipment: equipmentList,
 *   summary: { totalCount: 10, avgHealth: 85 }
 * };
 * 
 * exportToJSON(reportData, {
 *   filename: 'marine-report.json'
 * });
 * ```
 */

export interface ExportOptions {
  filename: string;
  columns?: string[];
  headers?: Record<string, string>;
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

export function exportToCSV(data: any[], options: ExportOptions): boolean {
  if (!data || data.length === 0) {
    return false; // Return false to indicate no data, let caller handle messaging
  }

  const columns = options.columns || Object.keys(data[0]);
  const headers = options.headers || {};
  
  const headerRow = columns.map(col => headers[col] || col).map(escapeCSVValue).join(',');
  
  const dataRows = data.map(row => 
    columns.map(col => escapeCSVValue(row[col])).join(',')
  );
  
  const csvContent = [headerRow, ...dataRows].join('\n');
  
  downloadFile(csvContent, options.filename, 'text/csv;charset=utf-8;');
  return true; // Return true on successful export
}

export function exportToJSON(data: any, options: Pick<ExportOptions, 'filename'>): boolean {
  if (!data) {
    return false; // Return false to indicate no data, let caller handle messaging
  }

  const jsonContent = JSON.stringify(data, null, 2);
  
  downloadFile(jsonContent, options.filename, 'application/json;charset=utf-8;');
  return true; // Return true on successful export
}
