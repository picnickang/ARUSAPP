import type { Express } from "express";
import type { IStorage } from "../storage";
import { 
  insertCrewSchema,
  insertCrewSkillSchema,
  insertSkillSchema,
  insertCrewLeaveSchema,
  insertShiftTemplateSchema,
  insertCrewAssignmentSchema,
  insertCrewCertificationSchema,
  insertPortCallSchema,
  insertDrydockWindowSchema,
  insertCrewRestSheetSchema,
  rangeQuerySchema
} from "@shared/schema";
import { z } from "zod";
import { normalizeRestDays, checkMonthCompliance, type RestDay } from "../stcw-compliance";
import { renderRestPdf, generatePdfFilename } from "../stcw-pdf-generator";
import { planShifts } from "../crew-scheduler";
import { planWithEngine, type ConstraintScheduleRequest, ENGINE_GREEDY } from "../crew-scheduler-ortools";
import {
  incrementHorImport,
  incrementHorPdfExport,
  incrementIdempotencyHit,
  incrementRangeQuery,
  recordRangeQueryDuration
} from "../observability";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { crewRestSheet, crewRestDay } from "@shared/schema";

// Helper function to get organization ID from request
function getOrgIdFromRequest(req: any): string {
  return req.headers['x-org-id'] || req.user?.orgId || 'default-org-id';
}

export function registerCrewRoutes(
  app: Express,
  storage: IStorage,
  rateLimits: {
    crewOperationRateLimit: any;
    writeOperationRateLimit: any;
    criticalOperationRateLimit: any;
    generalApiRateLimit: any;
  }
) {
  const { crewOperationRateLimit, writeOperationRateLimit, criticalOperationRateLimit, generalApiRateLimit } = rateLimits;

  // ===== CREW MANAGEMENT API ROUTES =====

  // Crew CRUD operations
  app.get("/api/crew", async (req, res) => {
    try {
      const { vessel_id, role } = req.query;
      let crew = await storage.getCrew(undefined, vessel_id as string | undefined);
      
      // Filter by role if specified
      if (role) {
        const roleFilter = (role as string).toLowerCase();
        crew = crew.filter(c => c.rank?.toLowerCase().includes(roleFilter) || c.position?.toLowerCase().includes(roleFilter));
      }
      
      res.json(crew);
    } catch (error) {
      console.error("Failed to fetch crew:", error);
      res.status(500).json({ error: "Failed to fetch crew" });
    }
  });

  app.post("/api/crew", crewOperationRateLimit, async (req, res) => {
    try {
      // Validate request body first
      const crewData = insertCrewSchema.parse({
        ...req.body,
        orgId: getOrgIdFromRequest(req)
      });
      
      const crew = await storage.createCrew(crewData);
      res.status(201).json(crew);
    } catch (error) {
      console.error("Failed to create crew member:", error);
      
      // Handle specific vessel validation errors
      if (error instanceof Error) {
        if (error.message === 'vessel_id is required for crew creation') {
          return res.status(400).json({ ok: false, error: 'vessel_id required' });
        }
        if (error.message === 'vessel not found') {
          return res.status(400).json({ ok: false, error: 'vessel not found' });
        }
        // Handle Zod validation errors
        if (error.name === 'ZodError') {
          return res.status(400).json({ ok: false, error: 'validation failed', details: error.message });
        }
      }
      
      res.status(400).json({ ok: false, error: "Failed to create crew member" });
    }
  });

  // ===== CREW EXTENSIONS: CERTIFICATIONS =====
  // NOTE: Specific routes like /certifications must come BEFORE parameterized routes like /:id

  // Crew Certifications management  
  app.get("/api/crew/certifications", async (req, res) => {
    try {
      const { crew_id } = req.query;
      const certifications = await storage.getCrewCertifications(crew_id as string | undefined);
      res.json(certifications);
    } catch (error) {
      console.error("Failed to fetch crew certifications:", error);
      res.status(500).json({ error: "Failed to fetch crew certifications" });
    }
  });

  app.post("/api/crew/certifications", crewOperationRateLimit, async (req, res) => {
    try {
      const certData = insertCrewCertificationSchema.parse(req.body);
      const certification = await storage.createCrewCertification(certData);
      res.json(certification);
    } catch (error) {
      console.error("Failed to create crew certification:", error);
      res.status(400).json({ error: "Failed to create crew certification" });
    }
  });

  app.put("/api/crew/certifications/:id", async (req, res) => {
    try {
      const certData = insertCrewCertificationSchema.partial().parse(req.body);
      const certification = await storage.updateCrewCertification(req.params.id, certData);
      res.json(certification);
    } catch (error) {
      console.error("Failed to update crew certification:", error);
      res.status(400).json({ error: "Failed to update crew certification" });
    }
  });

  app.delete("/api/crew/certifications/:id", criticalOperationRateLimit, async (req, res) => {
    try {
      await storage.deleteCrewCertification(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete crew certification:", error);
      res.status(500).json({ error: "Failed to delete crew certification" });
    }
  });

  // Crew Leave management - Must be before parameterized routes
  app.get("/api/crew/leave", async (req, res) => {
    try {
      const { crew_id, start_date, end_date } = req.query;
      const leaves = await storage.getCrewLeave(
        crew_id as string | undefined,
        start_date ? new Date(start_date as string) : undefined,
        end_date ? new Date(end_date as string) : undefined
      );
      res.json(leaves);
    } catch (error) {
      console.error("Failed to fetch crew leave:", error);
      res.status(500).json({ error: "Failed to fetch crew leave" });
    }
  });

  app.post("/api/crew/leave", async (req, res) => {
    try {
      const leaveData = insertCrewLeaveSchema.parse(req.body);
      const leave = await storage.createCrewLeave(leaveData);
      res.json(leave);
    } catch (error) {
      console.error("Failed to create crew leave:", error);
      res.status(400).json({ error: "Failed to create crew leave" });
    }
  });

  app.put("/api/crew/leave/:id", async (req, res) => {
    try {
      const leaveData = insertCrewLeaveSchema.partial().parse(req.body);
      const leave = await storage.updateCrewLeave(req.params.id, leaveData);
      res.json(leave);
    } catch (error) {
      console.error("Failed to update crew leave:", error);
      res.status(400).json({ error: "Failed to update crew leave" });
    }
  });

  app.delete("/api/crew/leave/:id", async (req, res) => {
    try {
      await storage.deleteCrewLeave(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete crew leave:", error);
      res.status(500).json({ error: "Failed to delete crew leave" });
    }
  });

  app.get("/api/crew/:id", async (req, res) => {
    try {
      const crew = await storage.getCrewMember(req.params.id);
      if (!crew) {
        return res.status(404).json({ error: "Crew member not found" });
      }
      res.json(crew);
    } catch (error) {
      console.error("Failed to fetch crew member:", error);
      res.status(500).json({ error: "Failed to fetch crew member" });
    }
  });

  app.put("/api/crew/:id", crewOperationRateLimit, async (req, res) => {
    try {
      const crewData = insertCrewSchema.partial().parse(req.body);
      const crew = await storage.updateCrew(req.params.id, crewData);
      res.json(crew);
    } catch (error) {
      console.error("Failed to update crew member:", error);
      res.status(400).json({ error: "Failed to update crew member" });
    }
  });

  app.patch("/api/crew/:id", crewOperationRateLimit, async (req, res) => {
    try {
      const crewData = insertCrewSchema.partial().parse(req.body);
      const crew = await storage.updateCrew(req.params.id, crewData);
      res.json(crew);
    } catch (error) {
      console.error("Failed to update crew member:", error);
      res.status(400).json({ error: "Failed to update crew member" });
    }
  });

  app.delete("/api/crew/:id", criticalOperationRateLimit, async (req, res) => {
    try {
      await storage.deleteCrew(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete crew member:", error);
      res.status(500).json({ error: "Failed to delete crew member" });
    }
  });

  // Toggle crew duty status (from Windows batch patch integration)
  app.post("/api/crew/:id/toggle-duty", crewOperationRateLimit, async (req, res) => {
    try {
      const crew = await storage.getCrewMember(req.params.id);
      if (!crew) {
        return res.status(404).json({ error: "Crew member not found" });
      }
      
      // Toggle the duty status
      const newDutyStatus = !crew.onDuty;
      const updatedCrew = await storage.updateCrew(req.params.id, { 
        onDuty: newDutyStatus 
      });
      
      res.json({ 
        success: true, 
        crew: updatedCrew,
        message: `${crew.name} is now ${newDutyStatus ? 'on duty' : 'off duty'}` 
      });
    } catch (error) {
      console.error("Failed to toggle crew duty status:", error);
      res.status(500).json({ error: "Failed to toggle duty status" });
    }
  });

  // ===== SKILLS MASTER CATALOG API ROUTES =====
  
  // Get all skills in the catalog
  app.get("/api/skills", async (req, res) => {
    try {
      const skills = await storage.getSkills();
      res.json(skills);
    } catch (error) {
      console.error("Failed to fetch skills:", error);
      res.status(500).json({ error: "Failed to fetch skills" });
    }
  });

  // Create a new skill
  app.post("/api/skills", crewOperationRateLimit, async (req, res) => {
    try {
      const skillData = insertSkillSchema.parse({
        ...req.body,
        orgId: getOrgIdFromRequest(req)
      });
      const skill = await storage.createSkill(skillData);
      res.status(201).json(skill);
    } catch (error) {
      console.error("Failed to create skill:", error);
      if (error instanceof Error) {
        if (error.message.includes('unique constraint')) {
          return res.status(400).json({ error: "Skill name already exists" });
        }
      }
      res.status(400).json({ error: "Failed to create skill" });
    }
  });

  // Update a skill
  app.put("/api/skills/:id", crewOperationRateLimit, async (req, res) => {
    try {
      const skillData = insertSkillSchema.partial().parse(req.body);
      const skill = await storage.updateSkill(req.params.id, skillData);
      res.json(skill);
    } catch (error) {
      console.error("Failed to update skill:", error);
      res.status(400).json({ error: "Failed to update skill" });
    }
  });

  // Delete a skill
  app.delete("/api/skills/:id", criticalOperationRateLimit, async (req, res) => {
    try {
      await storage.deleteSkill(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete skill:", error);
      res.status(500).json({ error: "Failed to delete skill" });
    }
  });

  // Crew Skills management
  app.post("/api/crew/skills", async (req, res) => {
    try {
      const { crewId, skill, level = 1 } = req.body;
      const crewSkill = await storage.setCrewSkill(crewId, skill, level);
      res.json(crewSkill);
    } catch (error) {
      console.error("Failed to set crew skill:", error);
      res.status(400).json({ error: "Failed to set crew skill" });
    }
  });

  app.get("/api/crew/:id/skills", async (req, res) => {
    try {
      const skills = await storage.getCrewSkills(req.params.id);
      res.json(skills);
    } catch (error) {
      console.error("Failed to fetch crew skills:", error);
      res.status(500).json({ error: "Failed to fetch crew skills" });
    }
  });

  app.delete("/api/crew/:crewId/skills/:skill", async (req, res) => {
    try {
      await storage.deleteCrewSkill(req.params.crewId, req.params.skill);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete crew skill:", error);
      res.status(500).json({ error: "Failed to delete crew skill" });
    }
  });


  // Shift Templates management
  app.get("/api/shifts", async (req, res) => {
    try {
      const { vessel_id } = req.query;
      const shifts = await storage.getShiftTemplates(vessel_id as string | undefined);
      res.json(shifts);
    } catch (error) {
      console.error("Failed to fetch shift templates:", error);
      res.status(500).json({ error: "Failed to fetch shift templates" });
    }
  });

  app.post("/api/shifts", async (req, res) => {
    try {
      const shiftData = insertShiftTemplateSchema.parse(req.body);
      const shift = await storage.createShiftTemplate(shiftData);
      res.json(shift);
    } catch (error) {
      console.error("Failed to create shift template:", error);
      res.status(400).json({ error: "Failed to create shift template" });
    }
  });

  app.put("/api/shifts/:id", async (req, res) => {
    try {
      const shiftData = insertShiftTemplateSchema.partial().parse(req.body);
      const shift = await storage.updateShiftTemplate(req.params.id, shiftData);
      res.json(shift);
    } catch (error) {
      console.error("Failed to update shift template:", error);
      res.status(400).json({ error: "Failed to update shift template" });
    }
  });

  app.delete("/api/shifts/:id", async (req, res) => {
    try {
      await storage.deleteShiftTemplate(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete shift template:", error);
      res.status(500).json({ error: "Failed to delete shift template" });
    }
  });

  // Crew Assignments
  app.get("/api/crew/assignments", async (req, res) => {
    try {
      const { date, crew_id, vessel_id } = req.query;
      const assignments = await storage.getCrewAssignments(
        date as string | undefined,
        crew_id as string | undefined,
        vessel_id as string | undefined
      );
      res.json(assignments);
    } catch (error) {
      console.error("Failed to fetch crew assignments:", error);
      res.status(500).json({ error: "Failed to fetch crew assignments" });
    }
  });

  app.post("/api/crew/assignments", async (req, res) => {
    try {
      const assignmentData = insertCrewAssignmentSchema.parse(req.body);
      const assignment = await storage.createCrewAssignment(assignmentData);
      res.json(assignment);
    } catch (error) {
      console.error("Failed to create crew assignment:", error);
      res.status(400).json({ error: "Failed to create crew assignment" });
    }
  });

  // Smart Crew Scheduling - The main scheduling algorithm
  app.post("/api/crew/schedule/plan", crewOperationRateLimit, async (req, res) => {
    try {
      const { days, shifts, crew, leaves, existing = [] } = req.body;
      
      // Validate input
      if (!Array.isArray(days) || !Array.isArray(shifts) || !Array.isArray(crew)) {
        return res.status(400).json({ 
          error: "Invalid input: days, shifts, and crew must be arrays" 
        });
      }

      // Run the intelligent scheduling algorithm
      const { scheduled, unfilled } = planShifts(days, shifts, crew, leaves || [], existing);
      
      // Persist scheduled assignments to database
      if (scheduled.length > 0) {
        const assignments = scheduled.map(assignment => ({
          date: assignment.date,
          shiftId: assignment.shiftId,
          crewId: assignment.crewId,
          vesselId: assignment.vesselId || null,
          start: new Date(assignment.start),
          end: new Date(assignment.end),
          role: assignment.role || null,
          status: "scheduled" as const
        }));

        await storage.createBulkCrewAssignments(assignments);
      }

      res.json({ 
        scheduled: scheduled.length,
        assignments: scheduled,
        unfilled,
        message: `Successfully scheduled ${scheduled.length} shifts${unfilled.length > 0 ? `, ${unfilled.length} positions remain unfilled` : ""}`
      });
    } catch (error) {
      console.error("Failed to plan crew schedule:", error);
      res.status(500).json({ error: "Failed to plan crew schedule" });
    }
  });


  // Port Calls management (vessel constraints)
  app.get("/api/port-calls", async (req, res) => {
    try {
      const { vessel_id } = req.query;
      const portCalls = await storage.getPortCalls(vessel_id as string | undefined);
      res.json(portCalls);
    } catch (error) {
      console.error("Failed to fetch port calls:", error);
      res.status(500).json({ error: "Failed to fetch port calls" });
    }
  });

  app.post("/api/port-calls", async (req, res) => {
    try {
      // Transform date strings to Date objects before validation
      const requestData = {
        ...req.body,
        start: req.body.start ? new Date(req.body.start) : undefined,
        end: req.body.end ? new Date(req.body.end) : undefined,
      };
      
      const portCallData = insertPortCallSchema.parse(requestData);
      const portCall = await storage.createPortCall(portCallData);
      res.json(portCall);
    } catch (error) {
      console.error("Failed to create port call:", error);
      res.status(400).json({ error: "Failed to create port call" });
    }
  });

  app.put("/api/port-calls/:id", async (req, res) => {
    try {
      const portCallData = insertPortCallSchema.partial().parse(req.body);
      const portCall = await storage.updatePortCall(req.params.id, portCallData);
      res.json(portCall);
    } catch (error) {
      console.error("Failed to update port call:", error);
      res.status(400).json({ error: "Failed to update port call" });
    }
  });

  app.delete("/api/port-calls/:id", async (req, res) => {
    try {
      await storage.deletePortCall(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete port call:", error);
      res.status(500).json({ error: "Failed to delete port call" });
    }
  });

  // Drydock Windows management (vessel constraints)
  app.get("/api/drydock-windows", async (req, res) => {
    try {
      const { vessel_id } = req.query;
      const drydockWindows = await storage.getDrydockWindows(vessel_id as string | undefined);
      res.json(drydockWindows);
    } catch (error) {
      console.error("Failed to fetch drydock windows:", error);
      res.status(500).json({ error: "Failed to fetch drydock windows" });
    }
  });

  app.post("/api/drydock-windows", async (req, res) => {
    try {
      // Transform date strings to Date objects before validation
      const requestData = {
        ...req.body,
        start: req.body.start ? new Date(req.body.start) : undefined,
        end: req.body.end ? new Date(req.body.end) : undefined,
      };
      
      const drydockData = insertDrydockWindowSchema.parse(requestData);
      const drydockWindow = await storage.createDrydockWindow(drydockData);
      res.json(drydockWindow);
    } catch (error) {
      console.error("Failed to create drydock window:", error);
      res.status(400).json({ error: "Failed to create drydock window" });
    }
  });

  app.put("/api/drydock-windows/:id", async (req, res) => {
    try {
      const drydockData = insertDrydockWindowSchema.partial().parse(req.body);
      const drydockWindow = await storage.updateDrydockWindow(req.params.id, drydockData);
      res.json(drydockWindow);
    } catch (error) {
      console.error("Failed to update drydock window:", error);
      res.status(400).json({ error: "Failed to update drydock window" });
    }
  });

  app.delete("/api/drydock-windows/:id", async (req, res) => {
    try {
      await storage.deleteDrydockWindow(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete drydock window:", error);
      res.status(500).json({ error: "Failed to delete drydock window" });
    }
  });

  // Enhanced Crew Scheduling with OR-Tools and constraint support
  app.post("/api/crew/schedule/plan-enhanced", crewOperationRateLimit, async (req, res) => {
    try {
      const { 
        engine = ENGINE_GREEDY, 
        days, 
        shifts, 
        crew, 
        leaves = [], 
        portCalls = [], 
        drydocks = [], 
        certifications = {},
        preferences = {},
        validate_stcw = false
      } = req.body;
      
      // Validate input
      if (!Array.isArray(days) || !Array.isArray(shifts) || !Array.isArray(crew)) {
        return res.status(400).json({ 
          error: "Invalid input: days, shifts, and crew must be arrays" 
        });
      }

      // Prepare constraint schedule request
      const scheduleRequest: ConstraintScheduleRequest = {
        engine,
        days,
        shifts,
        crew,
        leaves,
        portCalls,
        drydocks,
        certifications,
        preferences
      };

      // Run the enhanced scheduling algorithm
      const { scheduled, unfilled } = planWithEngine(scheduleRequest);
      
      // Initialize compliance result
      let compliance = {
        overall_ok: true,
        per_crew: [] as any[],
        rows_by_crew: {} as { [crewId: string]: RestDay[] }
      };
      
      // If STCW validation is requested, build HoR rows and check compliance
      if (validate_stcw) {
        try {
          const { mergeHistoryWithPlan, summarizeHoRContext } = await import("../hor-plan-utils");
          const { checkMonthCompliance } = await import("../stcw-compliance");
          
          // Get planning date range
          const startDate = days[0];
          const endDate = days[days.length - 1];
          
          // Helper function to get historical rest data
          const getHistoryRows = async (crewId: string): Promise<RestDay[]> => {
            try {
              const startPlanDate = new Date(startDate);
              const results: RestDay[] = [];
              
              // Get rest data from a few months back to establish context
              const historyStart = new Date(startPlanDate);
              historyStart.setMonth(historyStart.getMonth() - 1);
              
              let current = new Date(historyStart.getFullYear(), historyStart.getMonth(), 1);
              const endLimit = new Date(startPlanDate.getFullYear(), startPlanDate.getMonth(), 1);
              
              while (current <= endLimit) {
                const year = current.getFullYear();
                const month = current.getMonth() + 1;
                
                try {
                  const restData = await storage.getCrewRestMonth(crewId, year, month);
                  if (restData.days && restData.days.length > 0) {
                    results.push(...restData.days);
                  }
                } catch (error) {
                  // No historical data available - that's OK
                }
                current.setMonth(current.getMonth() + 1);
              }
              
              return results;
            } catch (error) {
              console.warn(`Failed to get history for crew ${crewId}:`, error);
              return [];
            }
          };
          
          // Process each crew member
          for (const crewMember of crew) {
            const crewId = crewMember.id;
            
            // Get historical data
            const historyRows = await getHistoryRows(crewId);
            
            // Convert scheduled assignments to HoR format
            const crewAssignments = scheduled
              .filter(a => a.crewId === crewId)
              .map(a => ({
                date: a.date,
                start: a.start,
                end: a.end,
                crewId: a.crewId,
                shiftId: a.shiftId,
                vesselId: a.vesselId
              }));
            
            // Merge history with planned assignments
            const mergedRows = mergeHistoryWithPlan(
              historyRows,
              crewAssignments,
              startDate,
              endDate
            );
            
            // Check compliance for the merged data
            const crewCompliance = checkMonthCompliance(mergedRows);
            const context = summarizeHoRContext(historyRows);
            
            // Store rows for potential frontend use
            compliance.rows_by_crew[crewId] = mergedRows;
            
            // Add crew compliance info
            compliance.per_crew.push({
              crew_id: crewId,
              name: crewMember.name || crewId,
              compliant: crewCompliance.ok,
              violations: crewCompliance.ok ? [] : crewCompliance.rolling7d?.filter((r: any) => !r.ok) || [],
              context: context
            });
            
            if (!crewCompliance.ok) {
              compliance.overall_ok = false;
            }
          }
        } catch (error) {
          console.error("Failed to validate STCW compliance:", error);
          compliance.overall_ok = false;
          compliance.per_crew.push({
            error: "Failed to validate STCW compliance",
            details: error.message
          });
        }
      }
      
      res.json({
        engine: engine,
        scheduled: scheduled,
        unfilled: unfilled,
        compliance: compliance,
        summary: {
          totalShifts: shifts.length * days.length,
          scheduledAssignments: scheduled.length,
          unfilledPositions: unfilled.reduce((sum, u) => sum + u.need, 0),
          coverage: scheduled.length / (shifts.length * days.length) * 100
        }
      });
    } catch (error) {
      console.error("Failed to run enhanced crew scheduling:", error);
      res.status(500).json({ error: "Failed to run enhanced crew scheduling" });
    }
  });

  // ===== STCW HOURS OF REST API ROUTES =====
  
  // Import STCW rest data (JSON or CSV format) - Enhanced with idempotency and metrics
  app.post("/api/crew/rest/import", async (req, res) => {
    const startTime = Date.now();
    
    try {
      // Idempotency handling
      const idempotencyKey = req.header('Idempotency-Key');
      if (idempotencyKey) {
        const isDuplicate = await storage.checkIdempotency(idempotencyKey, '/api/crew/rest/import');
        if (isDuplicate) {
          incrementIdempotencyHit('/api/crew/rest/import');
          return res.json({ 
            ok: true, 
            duplicate: true,
            message: "Request already processed - idempotent response" 
          });
        }
      }
      
      let rows: RestDay[] = [];
      const format = req.body.csv ? 'csv' : 'json';
      
      // Handle CSV format
      if (req.body.csv) {
        const lines = req.body.csv.trim().split('\n');
        const headers = lines[0].split(',');
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          const row: any = { date: values[0] };
          
          // Map h0-h23 columns
          for (let h = 0; h < 24; h++) {
            const headerIndex = headers.indexOf(`h${h}`);
            if (headerIndex >= 0) {
              row[`h${h}`] = parseInt(values[headerIndex] || '0');
            }
          }
          rows.push(row);
        }
      } else if (req.body.rows) {
        rows = req.body.rows;
      }
      
      // Normalize the data
      rows = normalizeRestDays(rows);
      
      // Create or update rest sheet
      const sheetData = insertCrewRestSheetSchema.parse({
        ...req.body.sheet,
        crewId: req.body.sheet?.crewId || req.body.sheet?.crew_id
      });
      
      const sheet = await storage.createCrewRestSheet(sheetData);
      
      // Upsert rest day data
      let rowCount = 0;
      for (const dayData of rows) {
        await storage.upsertCrewRestDay(sheet.id, dayData);
        rowCount++;
      }
      
      // Record idempotency if key provided
      if (idempotencyKey) {
        await storage.recordIdempotency(idempotencyKey, '/api/crew/rest/import');
      }
      
      // Record metrics
      incrementHorImport(sheetData.crewId, format, rowCount);
      
      const processingTime = Date.now() - startTime;
      
      res.json({ 
        ok: true, 
        sheet_id: sheet.id, 
        rows: rowCount,
        processing_time_ms: processingTime
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error("Failed to import STCW rest data:", error);
      res.status(400).json({ 
        error: "Failed to import STCW rest data",
        processing_time_ms: processingTime,
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Check STCW compliance for a crew member's rest data
  app.post("/api/crew/rest/check", async (req, res) => {
    try {
      let rows: RestDay[] = [];
      
      // Use inline rows if provided
      if (req.body.rows) {
        rows = normalizeRestDays(req.body.rows);
      } else {
        // Fetch from database
        const { crew_id, year, month } = req.body;
        if (!crew_id || !year || !month) {
          return res.status(400).json({ 
            error: "crew_id, year, and month are required" 
          });
        }
        
        const restData = await storage.getCrewRestMonth(crew_id, parseInt(year), month);
        if (!restData.sheet) {
          return res.status(404).json({ 
            ok: false, 
            error: "No rest sheet found for this crew member and month" 
          });
        }
        
        rows = restData.days;
      }
      
      // Run compliance check
      const compliance = checkMonthCompliance(rows);
      res.json(compliance);
    } catch (error) {
      console.error("Failed to check STCW compliance:", error);
      res.status(500).json({ error: "Failed to check STCW compliance" });
    }
  });

  // Check STCW compliance for a crew member's rest data (GET endpoint)
  app.get("/api/stcw/compliance/:crewId/:year/:month", async (req, res) => {
    try {
      const { crewId, year, month } = req.params;
      
      if (!crewId || !year || !month) {
        return res.status(400).json({ 
          error: "crewId, year, and month are required" 
        });
      }
      
      // Fetch from database
      const restData = await storage.getCrewRestMonth(crewId, parseInt(year), month);
      if (!restData.sheet) {
        // If no rest sheet in database, return a compliance result indicating no data
        return res.status(200).json({ 
          ok: false,
          error: "No rest sheet found",
          message: "Upload or import rest data first to check compliance",
          days: [],
          rolling7d: []
        });
      }
      
      // Run compliance check
      const compliance = checkMonthCompliance(restData.days);
      res.json(compliance);
    } catch (error) {
      console.error("Failed to check STCW compliance:", error);
      res.status(500).json({ error: "Failed to check STCW compliance" });
    }
  });

  // STCW Import endpoint for FormData file uploads (frontend compatibility) - Enhanced with idempotency and metrics
  app.post("/api/stcw/import", async (req, res) => {
    const startTime = Date.now();
    
    try {
      // Idempotency handling
      const idempotencyKey = req.header('Idempotency-Key');
      if (idempotencyKey) {
        const isDuplicate = await storage.checkIdempotency(idempotencyKey, '/api/stcw/import');
        if (isDuplicate) {
          incrementIdempotencyHit('/api/stcw/import');
          return res.json({ 
            success: true, 
            duplicate: true,
            message: "Request already processed - idempotent response" 
          });
        }
      }

      // Handle FormData file upload - parse CSV data
      let csvText = '';
      let crewId = '';
      let vessel = '';
      let year = new Date().getFullYear();
      let month = 'AUGUST';

      // Extract data from FormData (multipart/form-data)
      if (req.body && req.body.constructor === Object) {
        // Handle JSON body fallback
        csvText = req.body.csv || '';
        crewId = req.body.crewId || req.body.crew_id || '';
        vessel = req.body.vessel || 'Unknown';
        year = req.body.year || new Date().getFullYear();
        month = req.body.month || 'AUGUST';
      }

      if (!csvText && req.body) {
        // Try to extract from potential file content
        const bodyStr = req.body.toString();
        if (bodyStr.includes('date,h0,h1')) {
          csvText = bodyStr;
        }
      }

      if (!csvText) {
        return res.status(400).json({ 
          success: false,
          error: "No CSV data provided - include 'csv' field with CSV content" 
        });
      }

      // Parse CSV into rows format for crew rest import
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) {
        return res.status(400).json({ 
          success: false,
          error: "Invalid CSV format - must have header and data rows" 
        });
      }

      const headers = lines[0].split(',');
      const rows: any[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const row: any = { date: values[0] };
        
        // Map h0-h23 columns
        for (let h = 0; h < 24; h++) {
          const headerIndex = headers.indexOf(`h${h}`);
          if (headerIndex >= 0) {
            row[`h${h}`] = parseInt(values[headerIndex] || '0');
          }
        }
        rows.push(row);
      }

      if (rows.length === 0) {
        return res.status(400).json({ 
          success: false,
          error: "No valid data rows found in CSV" 
        });
      }

      // Validate crew and vessel relationship (vessel-first enforcement)
      if (!crewId || !vessel) {
        return res.status(400).json({ 
          success: false,
          error: "crew_id and vessel_id are required" 
        });
      }

      // Validate that crew exists and belongs to the selected vessel
      const crewMember = await storage.getCrewMember(crewId);
      if (!crewMember) {
        return res.status(400).json({ 
          success: false,
          error: "crew not found" 
        });
      }
      
      if (crewMember.vesselId !== vessel) {
        return res.status(400).json({ 
          success: false,
          error: "crew not assigned to selected vessel" 
        });
      }

      // Validate that vessel exists
      const vesselExists = await storage.getVessel(vessel);
      if (!vesselExists) {
        return res.status(400).json({ 
          success: false,
          error: "vessel not found" 
        });
      }

      // Delegate to enhanced crew rest import logic
      const normalizedRows = normalizeRestDays(rows);
      
      // Delete any existing sheet for this crew/month/year to prevent duplicates
      const existingData = await storage.getCrewRestMonth(crewId, year, month);
      if (existingData.sheet) {
        // Delete existing days first (foreign key constraint)
        await db.delete(crewRestDay).where(eq(crewRestDay.sheetId, existingData.sheet.id));
        // Then delete the sheet
        await db.delete(crewRestSheet).where(eq(crewRestSheet.id, existingData.sheet.id));
      }
      
      // Create or update rest sheet
      const sheetData = insertCrewRestSheetSchema.parse({
        crewId,
        crewName: crewMember.name,
        vessel,
        month,
        year
      });
      
      const sheet = await storage.createCrewRestSheet(sheetData);
      
      // Upsert rest day data
      let rowCount = 0;
      for (const dayData of normalizedRows) {
        await storage.upsertCrewRestDay(sheet.id, dayData);
        rowCount++;
      }

      // Record idempotency if key provided
      if (idempotencyKey) {
        await storage.recordIdempotency(idempotencyKey, '/api/stcw/import');
      }
      
      // Record metrics
      incrementHorImport(sheetData.crewId, 'csv', rowCount);
      
      const processingTime = Date.now() - startTime;
      
      res.json({ 
        success: true,
        sheet_id: sheet.id, 
        rows_imported: rowCount,
        processing_time_ms: processingTime,
        message: `Successfully imported ${rowCount} days of rest data`
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error("Failed to import STCW data via file upload:", error);
      res.status(400).json({ 
        success: false,
        error: "Failed to import STCW data",
        processing_time_ms: processingTime,
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get rest data for a crew member's specific month (for loading in grid editor)
  app.get("/api/stcw/rest/:crewId/:year/:month", async (req, res) => {
    try {
      const { crewId, year, month } = req.params;
      
      if (!crewId || !year || !month) {
        return res.status(400).json({ 
          error: "crewId, year, and month are required" 
        });
      }
      
      // Fetch rest data from database
      const restData = await storage.getCrewRestMonth(crewId, parseInt(year), month);
      
      if (!restData.sheet) {
        return res.status(404).json({ 
          error: "No rest sheet found for this crew member and month" 
        });
      }
      
      res.json(restData);
    } catch (error) {
      console.error("Failed to fetch rest data:", error);
      res.status(500).json({ error: "Failed to fetch rest data" });
    }
  });

  // STCW Export endpoint with path parameters (frontend compatibility) - Enhanced with metrics
  app.get("/api/stcw/export/:crewId/:year/:month", async (req, res) => {
    try {
      const { crewId, year, month } = req.params;
      
      if (!crewId || !year || !month) {
        return res.status(400).json({ 
          error: "crewId, year, and month are required" 
        });
      }

      // Fetch rest data from database
      const restData = await storage.getCrewRestMonth(crewId, parseInt(year), month);
      
      if (!restData.sheet) {
        return res.status(404).json({ 
          error: "No rest sheet found for this crew member and month" 
        });
      }

      // Generate PDF filename
      const pdfPath = generatePdfFilename(crewId, parseInt(year), month);
      
      // Render PDF
      await renderRestPdf(restData.sheet, restData.days, { 
        outputPath: pdfPath,
        title: `STCW Hours of Rest - ${restData.sheet.crewName}`
      });

      // Record PDF export metric
      incrementHorPdfExport(crewId, month, parseInt(year));
      
      // Send file download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="stcw_rest_${crewId}_${year}_${month}.pdf"`);
      
      const fs = await import('fs');
      const pdfBuffer = fs.readFileSync(pdfPath);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Failed to export STCW PDF:", error);
      res.status(500).json({ 
        error: "Failed to export STCW PDF",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Export STCW rest data as PDF
  app.get("/api/crew/rest/export_pdf", async (req, res) => {
    try {
      const { crew_id, year, month } = req.query;
      
      if (!crew_id || !year || !month) {
        return res.status(400).json({ 
          error: "crew_id, year, and month are required" 
        });
      }
      
      // Fetch rest data from database
      const restData = await storage.getCrewRestMonth(
        crew_id as string, 
        parseInt(year as string), 
        month as string
      );
      
      if (!restData.sheet) {
        return res.status(404).json({ 
          ok: false, 
          error: "No rest sheet found for this crew member and month" 
        });
      }
      
      // Generate PDF
      const pdfPath = generatePdfFilename(
        crew_id as string, 
        parseInt(year as string), 
        month as string
      );
      
      await renderRestPdf(restData.sheet, restData.days, { 
        outputPath: pdfPath,
        title: `STCW Hours of Rest - ${restData.sheet.crewName}`
      });
      
      res.json({ 
        ok: true, 
        path: pdfPath 
      });
    } catch (error) {
      console.error("Failed to export STCW rest PDF:", error);
      res.status(500).json({ error: "Failed to export STCW rest PDF" });
    }
  });

  // Get rest sheet data for a crew member
  app.get("/api/crew/rest/sheet", async (req, res) => {
    try {
      const { crew_id, year, month } = req.query;
      
      if (!crew_id || !year || !month) {
        return res.status(400).json({ 
          error: "crew_id, year, and month are required" 
        });
      }
      
      const restData = await storage.getCrewRestMonth(
        crew_id as string, 
        parseInt(year as string), 
        month as string
      );
      
      if (!restData.sheet) {
        return res.status(404).json({ 
          error: "No rest sheet found for this crew member and month" 
        });
      }
      
      res.json(restData);
    } catch (error) {
      console.error("Failed to fetch STCW rest sheet:", error);
      res.status(500).json({ error: "Failed to fetch STCW rest sheet" });
    }
  });

  // Prepare HoR context for crew scheduling planning
  app.post("/api/crew/rest/prepare_for_plan", async (req, res) => {
    try {
      const { crew, range } = req.body;
      
      if (!crew || !range || !range.start || !range.end) {
        return res.status(400).json({ 
          ok: false, 
          error: "Missing crew or range parameters" 
        });
      }
      
      const { prepareCrewHoRContext } = await import("../hor-plan-utils");
      
      // Extract crew IDs from request
      const crewIds = crew.map((c: { id: string }) => c.id);
      
      // Helper function to get historical rest data for a crew member
      const getHistoryRows = async (crewId: string, start: string, end: string): Promise<RestDay[]> => {
        try {
          // Parse start and end dates to get year/month range
          const startDate = new Date(start);
          const endDate = new Date(end);
          
          const results: RestDay[] = [];
          
          // Iterate through months in the range
          let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
          const endLimit = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
          
          while (current <= endLimit) {
            const year = current.getFullYear();
            const month = current.getMonth() + 1;
            
            try {
              const restData = await storage.getCrewRestMonth(crewId, year, month);
              if (restData.days && restData.days.length > 0) {
                // Filter to date range
                const filteredDays = restData.days.filter(day => {
                  const dayDate = new Date(day.date);
                  return dayDate >= startDate && dayDate <= endDate;
                });
                results.push(...filteredDays);
              }
            } catch (error) {
              console.warn(`No rest data found for crew ${crewId} in ${year}-${month}`);
            }
            
            current.setMonth(current.getMonth() + 1);
          }
          
          return results;
        } catch (error) {
          console.error(`Failed to get history for crew ${crewId}:`, error);
          return [];
        }
      };
      
      // Prepare context for all crew members
      const contexts = await prepareCrewHoRContext(
        crewIds,
        range.start,
        range.end,
        getHistoryRows
      );
      
      res.json({
        ok: true,
        contexts: contexts.map(ctx => ({
          crew_id: ctx.crew_id,
          context: ctx.context,
          history_available: ctx.history_rows.length > 0
        }))
      });
    } catch (error) {
      console.error("Failed to prepare HoR context for planning:", error);
      res.status(500).json({ 
        ok: false, 
        error: "Failed to prepare HoR context for planning" 
      });
    }
  });

  // ===== ENHANCED RANGE FETCHING ENDPOINTS =====
  
  // Get crew rest data across a date range (multiple months/years)
  app.get("/api/stcw/rest/range/:crewId/:startDate/:endDate", async (req, res) => {
    const startTime = Date.now();
    try {
      const { crewId, startDate, endDate } = req.params;
      
      if (!crewId || !startDate || !endDate) {
        return res.status(400).json({ 
          error: "Missing required parameters: crewId, startDate, endDate" 
        });
      }
      
      // Record range query metric
      incrementRangeQuery('crew_range');
      
      const result = await storage.getCrewRestRange(crewId, startDate, endDate);
      
      // Record query duration
      recordRangeQueryDuration('crew_range', Date.now() - startTime);
      
      res.json(result);
    } catch (error) {
      console.error("Failed to fetch crew rest range:", error);
      res.status(500).json({ error: "Failed to fetch crew rest range" });
    }
  });
  
  // Get rest data for multiple crew members in the same month
  app.post("/api/stcw/rest/multiple", async (req, res) => {
    const startTime = Date.now();
    try {
      const { crewIds, year, month } = req.body;
      
      if (!crewIds || !Array.isArray(crewIds) || !year || !month) {
        return res.status(400).json({ 
          error: "Missing required parameters: crewIds (array), year, month" 
        });
      }
      
      // Parse year to integer to match database schema
      const yearInt = parseInt(year, 10);
      if (isNaN(yearInt)) {
        return res.status(400).json({ 
          error: "Invalid year parameter: must be a valid integer" 
        });
      }
      
      // Record range query metric
      incrementRangeQuery('multi_crew');
      
      const result = await storage.getMultipleCrewRest(crewIds, yearInt, month);
      
      // Record query duration
      recordRangeQueryDuration('multi_crew', Date.now() - startTime);
      
      res.json(result);
    } catch (error) {
      console.error("Failed to fetch multiple crew rest data:", error);
      res.status(500).json({ error: "Failed to fetch multiple crew rest data" });
    }
  });
  
  // Get rest data for all crew members on a vessel in a specific month
  app.get("/api/stcw/rest/vessel/:vesselId/:year/:month", async (req, res) => {
    const startTime = Date.now();
    try {
      const { vesselId, year, month } = req.params;
      
      if (!vesselId || !year || !month) {
        return res.status(400).json({ 
          error: "Missing required parameters: vesselId, year, month" 
        });
      }
      
      // Record range query metric
      incrementRangeQuery('vessel_crew', vesselId);
      
      const result = await storage.getVesselCrewRest(vesselId, parseInt(year), month);
      
      // Record query duration
      recordRangeQueryDuration('vessel_crew', Date.now() - startTime);
      
      res.json(result);
    } catch (error) {
      console.error("Failed to fetch vessel crew rest data:", error);
      res.status(500).json({ error: "Failed to fetch vessel crew rest data" });
    }
  });
  
  // Advanced range query with optional filters
  app.get("/api/stcw/rest/search", async (req, res) => {
    const startTime = Date.now();
    try {
      // Enhanced query validation
      const queryValidation = rangeQuerySchema.parse(req.query);
      const { vesselId, startDate, endDate, complianceFilter } = queryValidation;
      
      // Record range query metric
      incrementRangeQuery('advanced_search', vesselId);
      
      const result = await storage.getCrewRestByDateRange(
        vesselId,
        startDate,
        endDate,
        complianceFilter
      );
      
      // Record query duration
      recordRangeQueryDuration('advanced_search', Date.now() - startTime);
      
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid query parameters", 
          errors: error.errors,
          code: "VALIDATION_ERROR"
        });
      }
      console.error("Failed to search crew rest data:", error);
      res.status(500).json({ error: "Failed to search crew rest data" });
    }
  });

  // Get all shift templates
  app.get("/api/shift-templates", async (req, res) => {
    try {
      const templates = await storage.getShiftTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Failed to get shift templates:", error);
      res.status(500).json({ error: "Failed to get shift templates" });
    }
  });

  // Create shift template
  app.post("/api/shift-templates", async (req, res) => {
    try {
      const template = await storage.createShiftTemplate(req.body);
      res.json(template);
    } catch (error) {
      console.error("Failed to create shift template:", error);
      res.status(500).json({ error: "Failed to create shift template" });
    }
  });

  // Delete shift template
  app.delete("/api/shift-templates/:id", async (req, res) => {
    try {
      await storage.deleteShiftTemplate(req.params.id);
      res.json({ 
        ok: true, 
        message: "Shift template deleted successfully" 
      });
    } catch (error) {
      console.error("Failed to delete shift template:", error);
      res.status(500).json({ error: "Failed to delete shift template" });
    }
  });

  // Deprecated crew-assignments routes (maintain for backward compatibility)
  app.get("/api/crew-assignments", async (req, res) => {
    try {
      const { date, crew_id, vessel_id } = req.query;
      const assignments = await storage.getCrewAssignments(
        date as string | undefined,
        crew_id as string | undefined,
        vessel_id as string | undefined
      );
      res.json(assignments);
    } catch (error) {
      console.error("Failed to fetch crew assignments:", error);
      res.status(500).json({ error: "Failed to fetch crew assignments" });
    }
  });

  app.post("/api/crew-assignments", async (req, res) => {
    try {
      const assignmentData = insertCrewAssignmentSchema.parse(req.body);
      const assignment = await storage.createCrewAssignment(assignmentData);
      res.json(assignment);
    } catch (error) {
      console.error("Failed to create crew assignment:", error);
      res.status(400).json({ error: "Failed to create crew assignment" });
    }
  });

  app.delete("/api/crew-assignments/:id", async (req, res) => {
    try {
      await storage.deleteCrewAssignment(req.params.id);
      res.json({ ok: true, message: "Assignment deleted successfully" });
    } catch (error) {
      console.error("Failed to delete crew assignment:", error);
      res.status(500).json({ error: "Failed to delete crew assignment" });
    }
  });

  // Update crew labor rate (from Windows batch patch - moved to more appropriate location)
  app.patch("/api/crew/:id/rate", writeOperationRateLimit, async (req, res) => {
    try {
      const { currentRate, overtimeMultiplier, effectiveDate } = req.body;
      
      if (currentRate === undefined || overtimeMultiplier === undefined || !effectiveDate) {
        return res.status(400).json({ 
          error: "currentRate, overtimeMultiplier, and effectiveDate are required" 
        });
      }
      
      const updatedCrew = await storage.updateCrewRate(req.params.id, {
        currentRate: parseFloat(currentRate),
        overtimeMultiplier: parseFloat(overtimeMultiplier),
        effectiveDate: new Date(effectiveDate)
      });
      
      res.json(updatedCrew);
    } catch (error) {
      console.error("Failed to update crew rate:", error);
      res.status(400).json({ error: "Failed to update crew rate" });
    }
  });
}
