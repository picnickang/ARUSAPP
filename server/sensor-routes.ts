import express from "express";
import fs from "node:fs";
import path from "node:path";
import { classifySignal } from "./sensors-classify.js";

const CFG_DIR = path.join(process.cwd(), "server", "config");
const DATA_DIR = path.join(process.cwd(), "server", "data");
const UNKNOWN_PATH = path.join(CFG_DIR, "unknown_signals.json");
const J1939_MAP = path.join(CFG_DIR, "j1939.map.json");
const J1587_MAP = path.join(CFG_DIR, "j1587.map.json");
const TPL_PATH = path.join(CFG_DIR, "sensor_templates.json");

function readJson<T>(p: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(p: string, obj: any) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}

export function mountSensorRoutes(app: express.Application) {
  // GET unknown queue
  app.get("/api/sensors/unknown", (_req, res) => {
    try {
      const items = readJson<any[]>(UNKNOWN_PATH, []);
      res.json({ items });
    } catch (error) {
      console.error("Failed to get unknown signals:", error);
      res.status(500).json({ error: "Failed to get unknown signals" });
    }
  });

  // POST capture unknown (collector calls this)
  app.post("/api/sensors/unknown", (req, res) => {
    try {
      const body = req.body || {};
      const items = readJson<any[]>(UNKNOWN_PATH, []);
      const key = JSON.stringify({ vessel: body.vessel, sig: body.sig, src: body.src });
      const exists = items.find((x: any) => JSON.stringify({ vessel: x.vessel, sig: x.sig, src: x.src }) === key);
      
      if (!exists) {
        const guess = classifySignal({
          sig: body.sig || "",
          unit: body.unit,
          spn: body.spn,
          pid: body.pid
        });
        items.push({ ...body, guess, timestamp: new Date().toISOString() });
        writeJson(UNKNOWN_PATH, items);
      }
      
      res.json({ ok: true });
    } catch (error) {
      console.error("Failed to capture unknown signal:", error);
      res.status(500).json({ error: "Failed to capture unknown signal" });
    }
  });

  // POST approve unknown -> persist to mapping (J1939 or J1587)
  app.post("/api/sensors/approve", (req, res) => {
    try {
      const { protocol, rule } = req.body || {};
      
      if (!protocol || !rule) {
        return res.status(400).json({ ok: false, error: "protocol and rule required" });
      }

      if (protocol === "j1939") {
        const doc = readJson<any>(J1939_MAP, { signals: [] });
        const ex = doc.signals.find((s: any) => s.pgn === rule.pgn);
        
        if (ex) {
          ex.spns = ex.spns || [];
          ex.spns.push(rule.spnRule);
        } else {
          doc.signals.push({
            pgn: rule.pgn,
            name: rule.name || "Custom",
            spns: [rule.spnRule]
          });
        }
        
        writeJson(J1939_MAP, doc);
      } else if (protocol === "j1708") {
        const doc = readJson<any>(J1587_MAP, { signals: [] });
        doc.signals.push(rule.pidRule);
        writeJson(J1587_MAP, doc);
      } else {
        return res.status(400).json({ ok: false, error: "unknown protocol" });
      }

      // Remove from unknown queue if present
      const items = readJson<any[]>(UNKNOWN_PATH, []);
      const left = items.filter(x => !(x.sig === rule.sig && x.src === rule.src));
      writeJson(UNKNOWN_PATH, left);
      
      return res.json({ ok: true });
    } catch (error) {
      console.error("Failed to approve signal:", error);
      res.status(500).json({ error: "Failed to approve signal" });
    }
  });

  // GET sensor templates
  app.get("/api/sensors/templates", (_req, res) => {
    try {
      const doc = readJson<any>(TPL_PATH, { templates: [] });
      res.json(doc);
    } catch (error) {
      console.error("Failed to get sensor templates:", error);
      res.status(500).json({ error: "Failed to get sensor templates" });
    }
  });

  // POST add template to a device (persist minimal registry in data/sensor_registry.json)
  app.post("/api/sensors/templates/apply", (req, res) => {
    try {
      const { vessel_id, sensor_id, template_id } = req.body || {};
      
      if (!vessel_id || !sensor_id || !template_id) {
        return res.status(400).json({
          ok: false,
          error: "vessel_id, sensor_id, template_id required"
        });
      }

      const regPath = path.join(DATA_DIR, "sensor_registry.json");
      const reg = readJson<any>(regPath, { entries: [] });
      const doc = readJson<any>(TPL_PATH, { templates: [] });
      const tpl = doc.templates.find((t: any) => t.id === template_id);
      
      if (!tpl) {
        return res.status(404).json({ ok: false, error: "template not found" });
      }

      const idx = reg.entries.findIndex((e: any) => e.vessel_id === vessel_id && e.sensor_id === sensor_id);
      const entry = {
        vessel_id,
        sensor_id,
        kind: tpl.kind,
        unit: tpl.unit,
        meta: tpl.fields
      };
      
      if (idx >= 0) {
        reg.entries[idx] = entry;
      } else {
        reg.entries.push(entry);
      }
      
      writeJson(regPath, reg);
      return res.json({ ok: true, entry });
    } catch (error) {
      console.error("Failed to apply sensor template:", error);
      res.status(500).json({ error: "Failed to apply sensor template" });
    }
  });

  // GET sensor registry
  app.get("/api/sensors/registry", (_req, res) => {
    try {
      const regPath = path.join(DATA_DIR, "sensor_registry.json");
      const reg = readJson<any>(regPath, { entries: [] });
      res.json(reg);
    } catch (error) {
      console.error("Failed to get sensor registry:", error);
      res.status(500).json({ error: "Failed to get sensor registry" });
    }
  });

  // DELETE unknown signal
  app.delete("/api/sensors/unknown/:index", (req, res) => {
    try {
      const index = parseInt(req.params.index);
      const items = readJson<any[]>(UNKNOWN_PATH, []);
      
      if (index >= 0 && index < items.length) {
        items.splice(index, 1);
        writeJson(UNKNOWN_PATH, items);
        res.json({ ok: true });
      } else {
        res.status(404).json({ error: "Unknown signal not found" });
      }
    } catch (error) {
      console.error("Failed to delete unknown signal:", error);
      res.status(500).json({ error: "Failed to delete unknown signal" });
    }
  });
}