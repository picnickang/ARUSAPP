import React, { useMemo } from "react";

interface ScheduleAssignment {
  date: string;
  shiftId?: string;
  crewId: string;
  start: string;
  end: string;
  role?: string;
  vesselId?: string;
}

interface Crew {
  id: string;
  name?: string;
  rank?: string;
}

function isNight(startISO: string): boolean {
  // night if shift start hour >= 20 or < 6
  const hh = parseInt(startISO.slice(11, 13), 10);
  return (hh >= 20) || (hh < 6);
}

function toCSV(rows: any[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = (s: any) => ('' + s).replace(/"/g, '""');
  const lines = [headers.join(',')].concat(
    rows.map(r => headers.map(h => `"${esc(r[h] ?? '')}"`).join(','))
  );
  return lines.join('\n');
}

export default function FairnessViz({
  scheduled,
  crew
}: {
  scheduled: ScheduleAssignment[];
  crew: Crew[];
}) {
  const { totals, nights, spread, rows, maxVal } = useMemo(() => {
    const id2name: Record<string, string> = {};
    crew.forEach(c => { id2name[c.id] = c.name || c.id; });
    
    const t: Record<string, number> = {};
    const n: Record<string, number> = {};
    
    scheduled.forEach(a => {
      t[a.crewId] = (t[a.crewId] || 0) + 1;
      if (isNight(a.start)) n[a.crewId] = (n[a.crewId] || 0) + 1;
    });
    
    const ids = Array.from(new Set(crew.map(c => c.id))).sort();
    const vals = ids.map(id => t[id] || 0);
    const maxVal = Math.max(1, ...vals);
    
    const rows = ids.map(id => ({
      crew_id: id,
      crew: id2name[id] || id,
      total_shifts: t[id] || 0,
      night_shifts: n[id] || 0
    }));
    
    const nonZero = vals.length ? vals : [0];
    const spread = (Math.max(...nonZero) - Math.min(...nonZero));
    
    return { totals: t, nights: n, spread, rows, maxVal };
  }, [scheduled, crew]);

  function downloadCSV() {
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'crew_schedule.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // Simple responsive SVG bar chart
  const barW = 22, gap = 10, leftPad = 120, topPad = 10, height = 180;
  const ids = crew.map(c => c.id);
  const width = leftPad + ids.length * (barW * 2 + gap) + 20;
  const scale = (v: number) => (v / (maxVal || 1)) * (height - 40);

  return (
    <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
      <h3 className="text-lg font-semibold mb-2">Crew Fairness & Workload</h3>
      <div className="flex gap-3 items-center flex-wrap mb-4">
        <div>
          <span className="font-medium">Fairness spread</span>: {spread} (max total − min total)
        </div>
        <button 
          onClick={downloadCSV}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          data-testid="button-export-csv"
        >
          Export CSV
        </button>
      </div>

      <svg 
        width={width} 
        height={height} 
        className="max-w-full h-auto bg-white dark:bg-gray-50 border border-gray-300 rounded mb-4"
        style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6 }}
      >
        {/* Y-axis ticks */}
        <g transform={`translate(60,${topPad})`} fontSize="10" fill="#334155">
          {[0, maxVal].map((v, i) => (
            <g key={i} transform={`translate(0,${height - 40 - scale(v)})`}>
              <line x1={60} x2={width - 20} y1={0} y2={0} stroke="#e2e8f0" />
              <text x={40} y={4} textAnchor="end">{v}</text>
            </g>
          ))}
        </g>
        
        {/* Bars */}
        <g transform={`translate(${leftPad},${topPad})`}>
          {ids.map((id, i) => {
            const x = i * (barW * 2 + gap);
            const total = (totals[id] || 0);
            const night = (nights[id] || 0);
            const hT = scale(total);
            const hN = scale(night);
            return (
              <g key={id} transform={`translate(${x},0)`}>
                {/* Total bar */}
                <rect x={0} y={height - 40 - hT} width={barW} height={hT} fill="#94a3b8" />
                {/* Night bar */}
                <rect x={barW + 2} y={height - 40 - hN} width={barW} height={hN} fill="#64748b" />
                {/* Labels */}
                <text x={barW} y={height - 20} textAnchor="middle" fontSize="10" fill="#334155">
                  {id}
                </text>
              </g>
            );
          })}
          <text x={-40} y={12} fontSize="10" fill="#334155">shifts</text>
        </g>
        
        {/* Legend */}
        <g transform={`translate(${leftPad},${height - 14})`} fontSize="10" fill="#334155">
          <rect x={0} y={-8} width={10} height={10} fill="#94a3b8" />
          <text x={14} y={0}>Total</text>
          <rect x={60} y={-8} width={10} height={10} fill="#64748b" />
          <text x={74} y={0}>Night</text>
        </g>
      </svg>

      <div className="overflow-x-auto">
        <table className="text-xs w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Crew</th>
              <th className="text-left p-2">Total Shifts</th>
              <th className="text-left p-2">Night Shifts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.crew_id} className="border-b">
                <td className="p-2">{r.crew}</td>
                <td className="p-2">{r.total_shifts}</td>
                <td className="p-2">{r.night_shifts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}