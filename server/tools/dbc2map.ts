#!/usr/bin/env node
/**
 * DBC → j1939.map.json converter (subset parser)
 * Converts automotive DBC files to ARUS J1939 mapping format
 * 
 * Supports:
 * - BO_ <pgn> <name>: 8 ... (message definitions)
 * - SG_ <sig> : <start>|<len>@<endian><sign> (<scale>,<offset>) [...] "<unit>" (signal definitions)
 */
import * as fs from "node:fs";
import * as path from "node:path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

type SpnRule = { 
  spn?: number; 
  sig: string; 
  src: string; 
  unit?: string; 
  bytes: number[]; 
  endian?: 'LE' | 'BE'; 
  scale?: number; 
  offset?: number 
};

type PgnRule = { 
  pgn: number; 
  name?: string; 
  spns: SpnRule[] 
};

const argv = yargs(hideBin(process.argv))
  .option("in", { type: "string", demandOption: true, desc: "input .dbc file" })
  .option("out", { type: "string", demandOption: true, desc: "output j1939.map.json" })
  .option("src", { type: "string", default: "ECM", desc: "default source name" })
  .parseSync();

const dbc = fs.readFileSync(argv.in, "utf8").split(/\r?\n/);
const pgns: Record<number, PgnRule> = {};

function bitRangeToBytes(start: number, len: number, endian: 'LE' | 'BE'): number[] {
  // Only supports signals contained within 1..4 bytes (8B frame). Common engine signals fit this.
  const firstByte = Math.floor(start / 8);
  const lastBit = start + len - 1;
  const lastByte = Math.floor(lastBit / 8);
  const bytes: number[] = [];
  
  if (endian === 'LE') {
    for (let b = firstByte; b <= lastByte; b++) bytes.push(b);
  } else {
    for (let b = firstByte; b <= lastByte; b++) bytes.push(b);
  }
  return bytes;
}

let currentPGN: number | null = null;
let currentName = "";

for (const line of dbc) {
  const l = line.trim();
  
  if (l.startsWith("BO_ ")) {
    // BO_ 61444 EEC1: 8 Vector__XXX
    const m = /^BO_\s+(\d+)\s+([A-Za-z0-9_]+)\s*:\s*(\d+)/.exec(l);
    if (m) {
      currentPGN = parseInt(m[1], 10);
      currentName = m[2];
      if (!pgns[currentPGN]) {
        pgns[currentPGN] = { pgn: currentPGN, name: currentName, spns: [] };
      }
    } else {
      currentPGN = null;
    }
    continue;
  }
  
  if (l.startsWith("SG_ ") && currentPGN != null) {
    /* SG_ EngineSpeed : 24|16@1+ (0.125,0) [0|8000] "rpm" ECU */
    const m = /^SG_\s+([A-Za-z0-9_]+)[^:]*:\s*(\d+)\|(\d+)@(\d)([+-])\s*\(([-+]?\d*\.?\d+),\s*([-+]?\d*\.?\d+)\)\s*\[[^\]]*\]\s*"([^"]*)"/
      .exec(l);
    if (!m) continue;
    
    const sig = m[1];
    const start = parseInt(m[2], 10); // start bit
    const len = parseInt(m[3], 10); // length bits
    const isIntel = m[4] === "1"; // 1=intel(LE), 0=motorola(BE)
    const endian = isIntel ? "LE" : "BE";
    const scale = parseFloat(m[6]);
    const offset = parseFloat(m[7]);
    const unit = m[8] || undefined;
    const bytes = bitRangeToBytes(start, len, endian);
    
    // Best-effort SPN extraction from name like SPN190_EngineSpeed
    const spnMatch = /SPN\s*([0-9]+)/i.exec(l) || /SPN([0-9]+)/i.exec(sig);
    const spn = spnMatch ? parseInt(spnMatch[1], 10) : undefined;
    
    pgns[currentPGN].spns.push({ 
      spn, 
      sig, 
      src: argv.src, 
      unit, 
      bytes, 
      endian, 
      scale, 
      offset 
    });
  }
}

const out = {
  schema: "https://arus.app/schemas/j1939-map-v1.json",
  notes: "auto-generated from DBC (subset)",
  signals: Object.values(pgns)
};

fs.writeFileSync(argv.out, JSON.stringify(out, null, 2));
console.log("[dbc2map] wrote", argv.out, "PGNs:", out.signals.length);