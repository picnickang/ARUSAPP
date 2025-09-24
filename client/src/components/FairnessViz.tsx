import React, { useMemo, useState } from "react";

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
  const hh = parseInt(startISO.slice(11, 13), 10);
  return (hh >= 20) || (hh < 6);
}

// deterministic color palette
const PALETTE = [
  "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b",
  "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"
];

function toCSV(rows: any[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = (s: any) => ('' + s).replace(/"/g, '""');
  const lines = [headers.join(',')].concat(
    rows.map(r => headers.map(h => `"${esc(r[h] ?? '')}"`).join(','))
  );
  return lines.join('\n');
}

type ViewMode = "totals" | "role" | "vessel";

export default function FairnessViz({
  scheduled,
  crew
}: {
  scheduled: ScheduleAssignment[];
  crew: Crew[];
}) {
  const [mode, setMode] = useState<ViewMode>("totals"); // totals | role | vessel
  const [showNight, setShowNight] = useState(true);

  const id2name = useMemo(() => {
    const m: Record<string, string> = {};
    crew.forEach(c => { m[c.id] = c.name || c.id; });
    return m;
  }, [crew]);

  // Base aggregates per crew
  const base = useMemo(() => {
    const totals: Record<string, number> = {};
    const nights: Record<string, number> = {};
    scheduled.forEach(a => {
      totals[a.crewId] = (totals[a.crewId] || 0) + 1;
      if (isNight(a.start)) nights[a.crewId] = (nights[a.crewId] || 0) + 1;
    });
    const ids = Array.from(new Set(crew.map(c => c.id))).sort();
    const vals = ids.map(id => totals[id] || 0);
    const maxVal = Math.max(1, ...vals);
    const rows = ids.map(id => ({
      crew_id: id,
      crew: id2name[id] || id,
      total_shifts: totals[id] || 0,
      night_shifts: nights[id] || 0
    }));
    const spread = (Math.max(...vals, 0) - Math.min(...vals, 0));
    return { totals, nights, rows, maxVal, spread, ids };
  }, [scheduled, crew, id2name]);

  // Stacked aggregates by category (role or vessel) per crew
  const stacked = useMemo(() => {
    function build(key: "role" | "vesselId") {
      const perCrewCat: Record<string, Record<string, number>> = {};
      const catTotals: Record<string, number> = {};
      scheduled.forEach(a => {
        const cid = a.crewId;
        const cat = (key === "role" ? (a.role || "(none)") : (a.vesselId || "(none)"));
        perCrewCat[cid] = perCrewCat[cid] || {};
        perCrewCat[cid][cat] = (perCrewCat[cid][cat] || 0) + 1;
        catTotals[cat] = (catTotals[cat] || 0) + 1;
      });
      // choose top categories (keep UI legible)
      const topCats = Object.keys(catTotals).sort((a, b) => (catTotals[b] || 0) - (catTotals[a] || 0)).slice(0, 6);
      const cats = [...topCats, ...(Object.keys(catTotals).length > topCats.length ? ["Other"] : [])];
      const ids = base.ids;
      const stacks: Record<string, number[]> = {};
      let maxSum = 1;
      ids.forEach(id => {
        const pc = perCrewCat[id] || {};
        const row: number[] = cats.map(cat => {
          if (cat === "Other") {
            // sum of the rest
            return Object.keys(pc).filter(k => !topCats.includes(k)).reduce((s, k) => s + (pc[k] || 0), 0);
          }
          return pc[cat] || 0;
        });
        stacks[id] = row;
        const sum = row.reduce((s, n) => s + n, 0);
        if (sum > maxSum) maxSum = sum;
      });
      return { cats, stacks, maxSum };
    }
    return {
      role: build("role"),
      vessel: build("vesselId"),
    };
  }, [scheduled, base.ids]);

  function downloadCSV() {
    if (mode === "totals") {
      const rows = base.rows.map(r => ({
        crew_id: r.crew_id,
        crew: r.crew,
        total_shifts: r.total_shifts,
        night_shifts: r.night_shifts
      }));
      const csv = toCSV(rows);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'crew_totals.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return;
    }
    const pack = (mode === "role" ? stacked.role : stacked.vessel);
    const rows = base.ids.map(id => {
      const row: any = { crew_id: id, crew: id2name[id] || id };
      pack.cats.forEach((c, i) => { row[c] = (pack.stacks[id] || [])[i] || 0; });
      return row;
    });
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (mode === 'role' ? 'crew_by_role.csv' : 'crew_by_vessel.csv');
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // --- Render ---
  const leftPad = 120, topPad = 10, height = 220;
  const barW = (mode === "totals" ? 22 : 24);
  const gap = 10;

  function TotalsChart() {
    const width = leftPad + base.ids.length * (barW * 2 + gap) + 20;
    const scale = (v: number) => (v / (base.maxVal || 1)) * (height - 50);
    return (
      <svg 
        width={width} 
        height={height} 
        className="max-w-full h-auto bg-white border border-gray-300 rounded mt-2"
        style={{ maxWidth: '100%', height: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, marginTop: 8 }}
      >
        <g transform={`translate(60,${topPad})`} fontSize="10" fill="#334155">
          {[0, base.maxVal].map((v, i) => (
            <g key={i} transform={`translate(0,${height - 50 - scale(v)})`}>
              <line x1={60} x2={width - 20} y1={0} y2={0} stroke="#e2e8f0" />
              <text x={40} y={4} textAnchor="end">{v}</text>
            </g>
          ))}
        </g>
        <g transform={`translate(${leftPad},${topPad})`}>
          {base.ids.map((id, i) => {
            const x = i * (barW * 2 + gap);
            const total = (base.totals[id] || 0);
            const night = (base.nights[id] || 0);
            const day = total - night;
            const hT = scale(total);
            const hN = scale(night);
            return (
              <g key={id} transform={`translate(${x},0)`}>
                {/* Total (light) */}
                <rect x={0} y={height - 50 - hT} width={barW} height={hT} fill="#94a3b8" />
                {/* Night (dark) overlay optional */}
                {showNight && <rect x={0} y={height - 50 - hN} width={barW} height={hN} fill="#64748b" />}
                {/* Separate second bar: Day */}
                <rect x={barW + 2} y={height - 50 - scale(day)} width={barW} height={scale(day)} fill="#60a5fa" />
                <text x={barW} y={height - 20} textAnchor="middle" fontSize="10" fill="#334155">{id}</text>
              </g>
            );
          })}
          <text x={-40} y={12} fontSize="10" fill="#334155">shifts</text>
        </g>
        <g transform={`translate(${leftPad},${height - 14})`} fontSize="10" fill="#334155">
          <rect x={0} y={-8} width={10} height={10} fill="#94a3b8" />
          <text x={14} y={0}>Total</text>
          {showNight && (
            <>
              <rect x={60} y={-8} width={10} height={10} fill="#64748b" />
              <text x={74} y={0}>Night</text>
            </>
          )}
          <rect x={130} y={-8} width={10} height={10} fill="#60a5fa" />
          <text x={144} y={0}>Day</text>
        </g>
      </svg>
    );
  }

  function StackedChart({ by }: { by: "role" | "vessel" }) {
    const pack = (by === "role" ? stacked.role : stacked.vessel);
    const width = leftPad + base.ids.length * (barW + gap) + 20;
    const maxSum = Math.max(1, pack.maxSum);
    const scale = (v: number) => (v / maxSum) * (height - 50);
    return (
      <>
        <svg 
          width={width} 
          height={height} 
          className="max-w-full h-auto bg-white border border-gray-300 rounded mt-2"
          style={{ maxWidth: '100%', height: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, marginTop: 8 }}
        >
          <g transform={`translate(60,${topPad})`} fontSize="10" fill="#334155">
            {[0, maxSum].map((v, i) => (
              <g key={i} transform={`translate(0,${height - 50 - scale(v)})`}>
                <line x1={60} x2={width - 20} y1={0} y2={0} stroke="#e2e8f0" />
                <text x={40} y={4} textAnchor="end">{v}</text>
              </g>
            ))}
          </g>
          <g transform={`translate(${leftPad},${topPad})`}>
            {base.ids.map((id, i) => {
              const x = i * (barW + gap);
              const segs = pack.stacks[id] || [];
              let yTop = height - 50;
              return (
                <g key={id} transform={`translate(${x},0)`}>
                  {segs.map((v, k) => {
                    const h = scale(v);
                    yTop -= h;
                    return v > 0 ? <rect key={k} x={0} y={yTop} width={barW} height={h} fill={PALETTE[k % PALETTE.length]} /> : null;
                  })}
                  <text x={barW / 2} y={height - 20} textAnchor="middle" fontSize="10" fill="#334155">{id}</text>
                </g>
              );
            })}
            <text x={-40} y={12} fontSize="10" fill="#334155">shifts</text>
          </g>
        </svg>

        {/* Legend */}
        <div className="flex gap-3 flex-wrap mt-2">
          {pack.cats.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: PALETTE[i % PALETTE.length] }} 
              />
              <span className="text-xs text-gray-700">{c}</span>
            </div>
          ))}
        </div>
      </>
    );
  }

  const tableRows = useMemo(() => {
    if (mode === "totals") return base.rows;
    const pack = (mode === "role" ? stacked.role : stacked.vessel);
    return base.ids.map(id => {
      const row: any = { crew_id: id, crew: id2name[id] || id, total: (pack.stacks[id] || []).reduce((s, n) => s + n, 0) };
      pack.cats.forEach((c, i) => { row[c] = (pack.stacks[id] || [])[i] || 0; });
      return row;
    });
  }, [mode, base.rows, stacked, base.ids, id2name]);

  return (
    <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
      <h3 className="text-lg font-semibold mb-2">Crew Fairness & Workload</h3>
      <div className="flex gap-3 items-center flex-wrap mb-4">
        <label className="text-sm font-medium">View</label>
        <select 
          value={mode} 
          onChange={e => setMode(e.target.value as ViewMode)}
          className="px-2 py-1 border border-gray-300 rounded text-sm"
          data-testid="select-view-mode"
        >
          <option value="totals">Totals</option>
          <option value="role">By Role (stacked)</option>
          <option value="vessel">By Vessel (stacked)</option>
        </select>
        {mode === 'totals' && (
          <label className="flex items-center gap-2 text-sm">
            <input 
              type="checkbox" 
              checked={showNight} 
              onChange={e => setShowNight(e.target.checked)}
              data-testid="checkbox-show-night"
            />
            Show Night overlay
          </label>
        )}
        <button 
          onClick={downloadCSV}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          data-testid="button-export-csv"
        >
          Export CSV
        </button>
        <div className="text-sm">
          <span className="font-medium">Fairness spread</span>: {base.spread} (max − min)
        </div>
      </div>

      {mode === 'totals' && <TotalsChart />}
      {mode === 'role' && <StackedChart by="role" />}
      {mode === 'vessel' && <StackedChart by="vessel" />}

      <div className="overflow-x-auto mt-2">
        <table className="text-xs w-full border-collapse">
          <thead>
            <tr className="border-b">
              {Object.keys(tableRows[0] || { crew: 'crew' }).map(h => (
                <th key={h} className="text-left p-2 capitalize">{h.replace('_', ' ')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((r: any, i: number) => (
              <tr key={i} className="border-b">
                {Object.keys(tableRows[0]).map(h => (
                  <td key={h + i} className="p-2">{r[h]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}