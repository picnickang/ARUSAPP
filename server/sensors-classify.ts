export type Classified = { sig: string; kind: string; unit?: string; confidence: number };

const NAME_HINTS: { re: RegExp; kind: string; unit?: string; score: number }[] = [
  { re: /rpm|engine[_-]?speed|shaft[_-]?rpm/i, kind: "rpm", unit: "rpm", score: 0.95 },
  { re: /coolant|water[_-]?temp|temp.*engine/i, kind: "temperature", unit: "C", score: 0.9 },
  { re: /oil[_-]?press|lube[_-]?press|pressure/i, kind: "pressure", unit: "kPa", score: 0.85 },
  { re: /fuel[_-]?rate|consumption|lph|gph/i, kind: "flow", unit: "L/h", score: 0.85 },
  { re: /vib|vibration|mm\/s|ips|accel|g[_-]?rms/i, kind: "vibration", unit: "mm/s", score: 0.8 },
  { re: /volt|battery|bus[_-]?v/i, kind: "voltage", unit: "V", score: 0.85 },
  { re: /amp|current|bus[_-]?a/i, kind: "current", unit: "A", score: 0.85 },
  { re: /freq|hz/i, kind: "frequency", unit: "Hz", score: 0.8 },
  { re: /flow|l\/h|lph|gpm/i, kind: "flow", unit: "L/h", score: 0.75 },
  { re: /level|tank/i, kind: "level", unit: "%", score: 0.7 },
];

const UNIT_HINTS: Record<string, { kind: string; unit: string; score: number }> = {
  "rpm": { kind: "rpm", unit: "rpm", score: 0.9 },
  "°c": { kind: "temperature", unit: "C", score: 0.85 },
  "c": { kind: "temperature", unit: "C", score: 0.75 },
  "f": { kind: "temperature", unit: "C", score: 0.6 },
  "kpa": { kind: "pressure", unit: "kPa", score: 0.85 },
  "bar": { kind: "pressure", unit: "bar", score: 0.85 },
  "psi": { kind: "pressure", unit: "kPa", score: 0.8 },
  "l/h": { kind: "flow", unit: "L/h", score: 0.85 },
  "gph": { kind: "flow", unit: "L/h", score: 0.75 },
  "v": { kind: "voltage", unit: "V", score: 0.9 },
  "a": { kind: "current", unit: "A", score: 0.9 },
  "hz": { kind: "frequency", unit: "Hz", score: 0.9 },
  "%": { kind: "level", unit: "%", score: 0.9 },
  "mm/s": { kind: "vibration", unit: "mm/s", score: 0.9 },
};

export function classifySignal(params: { sig: string; unit?: string; spn?: number; pid?: number }): Classified {
  const sig = params.sig || "";
  const unit = (params.unit || "").toLowerCase();
  let best: Classified = { sig, kind: "unknown", unit: params.unit, confidence: 0.0 };

  // Check name hints
  for (const h of NAME_HINTS) {
    if (h.re.test(sig)) {
      if (h.score > best.confidence) {
        best = { sig, kind: h.kind, unit: h.unit || params.unit, confidence: h.score };
      }
    }
  }

  // Check unit hints
  if (unit && UNIT_HINTS[unit]) {
    const u = UNIT_HINTS[unit];
    if (u.score > best.confidence) {
      best = { sig, kind: u.kind, unit: u.unit, confidence: u.score };
    }
  }

  // SPN/PID shortcuts (common engine params)
  if (params.spn === 190) { return { sig, kind: "rpm", unit: "rpm", confidence: 0.99 }; }
  if (params.pid === 190) { return { sig, kind: "rpm", unit: "rpm", confidence: 0.99 }; }
  if (params.spn === 110 || params.pid === 110) { return { sig, kind: "temperature", unit: "C", confidence: 0.95 }; }
  if (params.spn === 100 || params.pid === 100) { return { sig, kind: "pressure", unit: "kPa", confidence: 0.9 }; }
  if (params.spn === 183 || params.pid === 183) { return { sig, kind: "flow", unit: "L/h", confidence: 0.9 }; }

  return best;
}