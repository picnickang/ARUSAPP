import { storage } from './storage';
import * as solver from 'javascript-lp-solver';
import { db } from './db.js';
import { 
  optimizationResults, 
  scheduleOptimizations, 
  resourceConstraints,
  type OptimizationResult as DbOptimizationResult,
  type ScheduleOptimization,
  type ResourceConstraint,
} from '../shared/schema.js';

interface OptimizationConstraints {
  maxDailyWorkHours: number;
  maxConcurrentJobs: number;
  crewAvailability: Array<{
    crewMember: string;
    availableDays: string[];
    maxHoursPerDay: number;
    skillLevel: number;
    hourlyRate: number;
  }>;
  partsBudget: number;
  timeHorizonDays: number;
  priorityWeights: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

interface MaintenanceJob {
  id: string;
  equipmentId: string;
  equipmentName: string;
  maintenanceType: string;
  priority: number;
  estimatedDuration: number; // minutes
  requiredSkillLevel: number;
  parts: Array<{
    partId: string;
    quantity: number;
    unitCost: number;
  }>;
  preferredDate?: Date;
  deadline?: Date;
  dependencies?: string[]; // other job IDs that must complete first
}

interface OptimizationResult {
  success: boolean;
  objectiveValue: number;
  schedule: Array<{
    jobId: string;
    equipmentId: string;
    assignedCrew: string;
    scheduledDate: Date;
    startTime: string;
    duration: number;
    estimatedCost: number;
    priority: number;
  }>;
  resourceUtilization: {
    crewUtilization: Array<{
      crewMember: string;
      totalHours: number;
      utilizationRate: number;
    }>;
    dailyWorkload: Array<{
      date: string;
      totalHours: number;
      jobCount: number;
    }>;
    totalCost: number;
    partsUsedBudget: number;
  };
  constraints: {
    feasible: boolean;
    violations: string[];
  };
  optimizationTime: number;
}

export class LinearProgrammingOptimizer {
  private orgId: string;

  constructor(orgId: string) {
    this.orgId = orgId;
  }

  /**
   * Optimize maintenance scheduling using Linear Programming
   * Minimizes total cost while respecting all constraints
   */
  async optimizeMaintenanceSchedule(
    constraints: OptimizationConstraints
  ): Promise<OptimizationResult> {
    const startTime = Date.now();

    try {
      console.log(`[LP Optimizer] Starting optimization for org ${this.orgId}`);

      // Gather data for optimization
      const jobs = await this.getPendingMaintenanceJobs();
      const crewData = constraints.crewAvailability;
      const partsData = await this.getPartsAvailability();

      if (jobs.length === 0) {
        console.log(`[LP Optimizer] No pending maintenance jobs found`);
        return this.createEmptyResult(Date.now() - startTime);
      }

      // Build LP problem formulation
      const lpProblem = this.formulateLinearProgram(jobs, constraints, partsData);
      
      console.log(`[LP Optimizer] Formulated LP problem with ${jobs.length} jobs and ${crewData.length} crew members`);
      
      // Solve the linear programming problem
      const solution = solver.solve(lpProblem);
      
      if (!solution.feasible) {
        console.log(`[LP Optimizer] Problem infeasible - relaxing constraints`);
        const relaxedProblem = this.relaxConstraints(lpProblem, jobs, constraints);
        const relaxedSolution = solver.solve(relaxedProblem);
        return this.processSolution(relaxedSolution, jobs, constraints, Date.now() - startTime, true);
      }

      const result = this.processSolution(solution, jobs, constraints, Date.now() - startTime, false);
      
      // Persist optimization results to database
      if (result.success) {
        await this.persistOptimizationResults(result, constraints);
      }
      
      return result;

    } catch (error) {
      console.error(`[LP Optimizer] Error during optimization:`, error);
      const errorResult = {
        success: false,
        objectiveValue: 0,
        schedule: [],
        resourceUtilization: {
          crewUtilization: [],
          dailyWorkload: [],
          totalCost: 0,
          partsUsedBudget: 0
        },
        constraints: {
          feasible: false,
          violations: [`Optimization error: ${error.message}`]
        },
        optimizationTime: Date.now() - startTime,
        optimizationId: `error-${Date.now()}`
      };
      
      // Persist error results too for debugging
      await this.persistOptimizationResults(errorResult, constraints);
      return errorResult;
    }
  }

  /**
   * Get pending maintenance jobs that need to be scheduled
   */
  private async getPendingMaintenanceJobs(): Promise<MaintenanceJob[]> {
    try {
      // Get maintenance schedules that are pending
      const schedules = await storage.getMaintenanceSchedules(this.orgId);
      const pendingSchedules = schedules.filter(s => s.status === 'scheduled');

      // Get work orders that need scheduling
      const workOrders = await storage.getWorkOrders();
      const pendingOrders = workOrders.filter(wo => wo.status === 'open');

      // Get equipment data for context
      const equipment = await storage.getEquipmentList(this.orgId);
      const equipmentMap = new Map(equipment.map(eq => [eq.id, eq]));

      // Get parts inventory for cost calculation
      const partsInventory = await storage.getPartsInventory?.(this.orgId) || [];

      const jobs: MaintenanceJob[] = [];

      // Convert maintenance schedules to jobs
      for (const schedule of pendingSchedules) {
        const equip = equipmentMap.get(schedule.equipmentId);
        if (!equip) continue;

        const job: MaintenanceJob = {
          id: schedule.id,
          equipmentId: schedule.equipmentId,
          equipmentName: equip.name,
          maintenanceType: schedule.maintenanceType,
          priority: schedule.priority,
          estimatedDuration: schedule.estimatedDuration || 120, // default 2 hours
          requiredSkillLevel: this.getRequiredSkillLevel(schedule.maintenanceType, equip.type),
          parts: this.estimatePartsRequired(schedule.maintenanceType, equip.type, partsInventory),
          preferredDate: schedule.scheduledDate,
          deadline: new Date(schedule.scheduledDate.getTime() + 7 * 24 * 60 * 60 * 1000) // 1 week deadline
        };

        jobs.push(job);
      }

      // Convert work orders to jobs (if not already scheduled)
      for (const workOrder of pendingOrders) {
        const equip = equipmentMap.get(workOrder.equipmentId);
        if (!equip) continue;

        // Skip if already in maintenance schedules
        if (pendingSchedules.some(s => s.equipmentId === workOrder.equipmentId)) continue;

        const job: MaintenanceJob = {
          id: `wo-${workOrder.id}`,
          equipmentId: workOrder.equipmentId,
          equipmentName: equip.name,
          maintenanceType: 'corrective',
          priority: workOrder.priority,
          estimatedDuration: this.estimateWorkOrderDuration(workOrder.description, workOrder.priority),
          requiredSkillLevel: this.getRequiredSkillLevelFromPriority(workOrder.priority),
          parts: this.estimatePartsFromDescription(workOrder.description, partsInventory),
          deadline: new Date(Date.now() + (workOrder.priority === 1 ? 1 : 3) * 24 * 60 * 60 * 1000)
        };

        jobs.push(job);
      }

      console.log(`[LP Optimizer] Found ${jobs.length} maintenance jobs to optimize`);
      return jobs;

    } catch (error) {
      console.error(`[LP Optimizer] Error getting maintenance jobs:`, error);
      return [];
    }
  }

  /**
   * Formulate the Linear Programming problem with CORRECT javascript-lp-solver format
   * Each decision variable must be an object with constraint coefficients + objective value
   */
  private formulateLinearProgram(
    jobs: MaintenanceJob[],
    constraints: OptimizationConstraints,
    partsData: any[]
  ): any {
    const variables: any = {};
    const constraintDefs: any = {};

    // Create constraint definitions first
    const constraintMap = new Map<string, { min?: number, max?: number }>();

    // Constraint 1: Each job must be assigned exactly once
    for (let jobIdx = 0; jobIdx < jobs.length; jobIdx++) {
      constraintMap.set(`job_assignment_${jobIdx}`, { min: 1, max: 1 });
    }

    // Constraint 2: Crew capacity limits per day
    for (let crewIdx = 0; crewIdx < constraints.crewAvailability.length; crewIdx++) {
      const crew = constraints.crewAvailability[crewIdx];
      for (let day = 0; day < constraints.timeHorizonDays; day++) {
        constraintMap.set(`crew_capacity_c${crewIdx}_d${day}`, { max: crew.maxHoursPerDay });
      }
    }

    // Constraint 3: Daily concurrent job limits (FIXED: covers full job duration)
    for (let day = 0; day < constraints.timeHorizonDays; day++) {
      for (let hour = 8; hour <= 16; hour++) {
        constraintMap.set(`concurrent_limit_d${day}_h${hour}`, { max: constraints.maxConcurrentJobs });
      }
    }

    // Constraint 4: Parts budget constraint
    constraintMap.set('parts_budget', { max: constraints.partsBudget });

    // Convert map to object for solver
    for (const [name, bounds] of constraintMap) {
      constraintDefs[name] = bounds;
    }

    // Decision variables: job_crew_day_hour (binary) with CORRECT format
    // Each variable is an object with constraint coefficients + objective
    
    for (let jobIdx = 0; jobIdx < jobs.length; jobIdx++) {
      const job = jobs[jobIdx];
      
      for (let crewIdx = 0; crewIdx < constraints.crewAvailability.length; crewIdx++) {
        const crew = constraints.crewAvailability[crewIdx];
        
        // Check if crew has required skill level
        if (crew.skillLevel < job.requiredSkillLevel) continue;
        
        for (let day = 0; day < constraints.timeHorizonDays; day++) {
          const dayName = new Date(Date.now() + day * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'long' });
          
          // Check crew availability
          if (!crew.availableDays.includes(dayName)) continue;
          
          const jobDurationHours = job.estimatedDuration / 60;
          
          for (let hour = 8; hour <= 16; hour++) { // 8 AM to 4 PM work hours
            // CRITICAL FIX: Skip infeasible start times where job can't complete within working hours
            if (hour + Math.ceil(jobDurationHours) > 17) {
              console.log(`[LP Optimizer] Skipping infeasible start time: Job ${jobIdx} (${Math.ceil(jobDurationHours)}h) cannot start at hour ${hour} (would exceed working hours)`);
              continue;
            }
            
            const varName = `j${jobIdx}_c${crewIdx}_d${day}_h${hour}`;
            
            // Calculate cost for this assignment
            const laborCost = (job.estimatedDuration / 60) * crew.hourlyRate;
            const partsCost = job.parts.reduce((sum, part) => sum + (part.quantity * part.unitCost), 0);
            const priorityCost = this.getPriorityCost(job.priority, constraints.priorityWeights);
            
            // CORRECT FORMAT: Each variable is an object with all constraint coefficients
            const variableCoeffs: any = {
              objective: laborCost + partsCost + priorityCost
            };

            // Job assignment constraint coefficient
            variableCoeffs[`job_assignment_${jobIdx}`] = 1;

            // Crew capacity constraint coefficient
            variableCoeffs[`crew_capacity_c${crewIdx}_d${day}`] = jobDurationHours;

            // FIXED: Concurrent job constraint coefficient - covers FULL job duration
            // A multi-hour job must block ALL hours it occupies, not just the starting hour
            const jobEndHour = hour + Math.ceil(jobDurationHours); // No need to clamp since we pre-filter
            for (let blockHour = hour; blockHour < jobEndHour; blockHour++) {
              variableCoeffs[`concurrent_limit_d${day}_h${blockHour}`] = 1;
            }

            // Parts budget constraint coefficient
            variableCoeffs['parts_budget'] = partsCost;

            variables[varName] = variableCoeffs;
          }
        }
      }
    }

    console.log(`[LP Optimizer] Formulated problem: ${Object.keys(variables).length} variables, ${Object.keys(constraintDefs).length} constraints`);

    return {
      optimize: 'objective',
      opType: 'min',
      constraints: constraintDefs,
      variables: variables,
      ints: Object.keys(variables).reduce((acc: any, key) => ({ ...acc, [key]: 1 }), {})
    };
  }

  /**
   * Process the LP solution into a readable schedule
   */
  private processSolution(
    solution: any,
    jobs: MaintenanceJob[],
    constraints: OptimizationConstraints,
    optimizationTime: number,
    wasRelaxed: boolean
  ): OptimizationResult {
    const schedule: OptimizationResult['schedule'] = [];
    const crewUtilization: { [key: string]: number } = {};
    const dailyWorkload: { [key: string]: { hours: number; jobs: number } } = {};
    let totalCost = 0;
    let partsUsedBudget = 0;

    // Initialize crew utilization tracking
    constraints.crewAvailability.forEach(crew => {
      crewUtilization[crew.crewMember] = 0;
    });

    if (solution.feasible && solution.result) {
      // Parse solution variables
      for (const [varName, value] of Object.entries(solution.result)) {
        if (value === 1) {
          // Parse variable name: j${jobIdx}_c${crewIdx}_d${day}_h${hour}
          const match = varName.match(/j(\d+)_c(\d+)_d(\d+)_h(\d+)/);
          if (!match) continue;

          const [, jobIdx, crewIdx, day, hour] = match.map(Number);
          const job = jobs[jobIdx];
          const crew = constraints.crewAvailability[crewIdx];

          if (!job || !crew) continue;

          const scheduledDate = new Date(Date.now() + day * 24 * 60 * 60 * 1000);
          const laborCost = (job.estimatedDuration / 60) * crew.hourlyRate;
          const partsCost = job.parts.reduce((sum, part) => sum + (part.quantity * part.unitCost), 0);
          
          schedule.push({
            jobId: job.id,
            equipmentId: job.equipmentId,
            assignedCrew: crew.crewMember,
            scheduledDate,
            startTime: `${hour.toString().padStart(2, '0')}:00`,
            duration: job.estimatedDuration,
            estimatedCost: laborCost + partsCost,
            priority: job.priority
          });

          // Update utilization tracking
          crewUtilization[crew.crewMember] += job.estimatedDuration / 60;
          totalCost += laborCost + partsCost;
          partsUsedBudget += partsCost;

          const dayKey = scheduledDate.toISOString().split('T')[0];
          if (!dailyWorkload[dayKey]) {
            dailyWorkload[dayKey] = { hours: 0, jobs: 0 };
          }
          dailyWorkload[dayKey].hours += job.estimatedDuration / 60;
          dailyWorkload[dayKey].jobs += 1;
        }
      }
    }

    // Calculate resource utilization metrics
    const resourceUtilization = {
      crewUtilization: constraints.crewAvailability.map(crew => ({
        crewMember: crew.crewMember,
        totalHours: crewUtilization[crew.crewMember] || 0,
        utilizationRate: ((crewUtilization[crew.crewMember] || 0) / (crew.maxHoursPerDay * constraints.timeHorizonDays)) * 100
      })),
      dailyWorkload: Object.entries(dailyWorkload).map(([date, workload]) => ({
        date,
        totalHours: workload.hours,
        jobCount: workload.jobs
      })),
      totalCost,
      partsUsedBudget
    };

    const violations: string[] = [];
    if (wasRelaxed) {
      violations.push('Some constraints were relaxed to find a feasible solution');
    }
    if (partsUsedBudget > constraints.partsBudget) {
      violations.push(`Parts budget exceeded by $${(partsUsedBudget - constraints.partsBudget).toFixed(2)}`);
    }

    console.log(`[LP Optimizer] Optimization completed: ${schedule.length} jobs scheduled, total cost: $${totalCost.toFixed(2)}`);

    const result = {
      success: solution.feasible || false,
      objectiveValue: solution.objective || 0,
      schedule,
      resourceUtilization,
      constraints: {
        feasible: solution.feasible && !wasRelaxed,
        violations
      },
      optimizationTime,
      optimizationId: `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    return result;
  }

  /**
   * Helper methods for constraint relaxation and estimation
   */
  private relaxConstraints(lpProblem: any, jobs: MaintenanceJob[], constraints: OptimizationConstraints): any {
    // Relax budget constraint by 20%
    if (lpProblem.constraints.parts_budget) {
      lpProblem.constraints.parts_budget.max *= 1.2;
    }
    
    // Increase crew capacity by 10%
    for (const constraintName in lpProblem.constraints) {
      if (constraintName.includes('crew_capacity_')) {
        lpProblem.constraints[constraintName].max *= 1.1;
      }
    }
    
    return lpProblem;
  }

  private createEmptyResult(optimizationTime: number): OptimizationResult {
    return {
      success: true,
      objectiveValue: 0,
      schedule: [],
      resourceUtilization: {
        crewUtilization: [],
        dailyWorkload: [],
        totalCost: 0,
        partsUsedBudget: 0
      },
      constraints: {
        feasible: true,
        violations: []
      },
      optimizationTime
    };
  }

  private getPriorityCost(priority: number, weights: OptimizationConstraints['priorityWeights']): number {
    const priorityMap = { 1: weights.critical, 2: weights.high, 3: weights.medium, 4: weights.low };
    return priorityMap[priority as keyof typeof priorityMap] || weights.low;
  }

  private getRequiredSkillLevel(maintenanceType: string, equipmentType: string): number {
    if (equipmentType === 'engine' && maintenanceType === 'corrective') return 4;
    if (equipmentType === 'engine') return 3;
    if (maintenanceType === 'corrective') return 3;
    return 2; // preventive maintenance generally requires lower skill
  }

  private getRequiredSkillLevelFromPriority(priority: number): number {
    return priority === 1 ? 4 : priority <= 2 ? 3 : 2;
  }

  private estimateWorkOrderDuration(description: string, priority: number): number {
    const baseTime = priority === 1 ? 240 : 120; // critical jobs take longer
    
    // Keyword-based duration estimation
    const keywords = (description || '').toLowerCase();
    let multiplier = 1;
    
    if (keywords.includes('replace') || keywords.includes('overhaul')) multiplier = 2;
    if (keywords.includes('inspect') || keywords.includes('check')) multiplier = 0.5;
    if (keywords.includes('complex') || keywords.includes('rebuild')) multiplier = 3;
    
    return Math.round(baseTime * multiplier);
  }

  private estimatePartsRequired(maintenanceType: string, equipmentType: string, inventory: any[]): MaintenanceJob['parts'] {
    const parts: MaintenanceJob['parts'] = [];
    
    // Simple parts estimation based on maintenance type
    if (maintenanceType === 'preventive') {
      if (equipmentType === 'engine') {
        parts.push({ partId: 'filter-oil', quantity: 1, unitCost: 25.0 });
        parts.push({ partId: 'oil', quantity: 5, unitCost: 8.0 });
      }
    } else if (maintenanceType === 'corrective') {
      parts.push({ partId: 'spare-parts-general', quantity: 1, unitCost: 100.0 });
    }
    
    return parts;
  }

  private estimatePartsFromDescription(description: string, inventory: any[]): MaintenanceJob['parts'] {
    const parts: MaintenanceJob['parts'] = [];
    const desc = (description || '').toLowerCase();
    
    if (desc.includes('oil')) {
      parts.push({ partId: 'oil', quantity: 5, unitCost: 8.0 });
    }
    if (desc.includes('filter')) {
      parts.push({ partId: 'filter', quantity: 1, unitCost: 25.0 });
    }
    if (desc.includes('belt')) {
      parts.push({ partId: 'belt', quantity: 1, unitCost: 45.0 });
    }
    
    return parts.length > 0 ? parts : [{ partId: 'misc', quantity: 1, unitCost: 50.0 }];
  }

  private async getPartsAvailability(): Promise<any[]> {
    try {
      return await storage.getPartsInventory?.(this.orgId) || [];
    } catch {
      return [];
    }
  }

  /**
   * Persist optimization results to existing database tables
   */
  private async persistOptimizationResults(result: OptimizationResult, constraints: OptimizationConstraints): Promise<string> {
    try {
      // Insert into optimizationResults table
      const optimizationRecord = await db.insert(optimizationResults).values({
        orgId: this.orgId,
        configurationId: 'lp-optimizer-config',
        runStatus: result.success ? 'completed' : 'failed',
        startTime: new Date(Date.now() - result.optimizationTime),
        endTime: new Date(),
        executionTimeMs: result.optimizationTime,
        equipmentScope: JSON.stringify([]), // Will be populated with actual equipment IDs
        timeHorizon: constraints.timeHorizonDays,
        totalSchedules: result.schedule.length,
        totalCostEstimate: result.resourceUtilization.totalCost,
        costSavings: 0, // Could be calculated vs baseline
        resourceUtilization: JSON.stringify(result.resourceUtilization),
        conflictsResolved: 0,
        optimizationScore: result.success ? 85 : 0, // Simple scoring
        algorithmMetrics: JSON.stringify({
          feasible: result.constraints.feasible,
          violations: result.constraints.violations,
          objectiveValue: result.objectiveValue
        }),
        recommendations: JSON.stringify(result.schedule.map(s => ({
          equipmentId: s.equipmentId,
          assignedCrew: s.assignedCrew,
          scheduledDate: s.scheduledDate,
          estimatedCost: s.estimatedCost
        }))),
        appliedToProduction: false
      }).returning({ id: optimizationResults.id });

      const resultId = optimizationRecord[0].id;
      console.log(`[LP Optimizer] Persisted optimization result ${resultId}`);

      // Insert schedule optimizations
      for (const scheduleItem of result.schedule) {
        await db.insert(scheduleOptimizations).values({
          orgId: this.orgId,
          optimizationResultId: resultId,
          equipmentId: scheduleItem.equipmentId,
          recommendedScheduleDate: scheduleItem.scheduledDate,
          recommendedMaintenanceType: 'predictive', // Could be derived from job type
          recommendedPriority: scheduleItem.priority,
          estimatedDuration: scheduleItem.duration,
          estimatedCost: scheduleItem.estimatedCost,
          assignedTechnicianId: scheduleItem.assignedCrew,
          requiredParts: JSON.stringify([]), // Could be populated from job parts
          optimizationReason: `LP optimization assigned to ${scheduleItem.assignedCrew} at ${scheduleItem.startTime}`,
          conflictsWith: JSON.stringify([]),
          priority: scheduleItem.priority * 25, // Convert 1-4 to 0-100 scale
          status: 'pending'
        });
      }

      console.log(`[LP Optimizer] Persisted ${result.schedule.length} schedule optimizations`);
      return resultId;

    } catch (error) {
      console.error(`[LP Optimizer] Error persisting results:`, error);
      return `error-${Date.now()}`;
    }
  }

  /**
   * Retrieve optimization results from database
   */
  public async getOptimizationResults(resultId: string): Promise<any> {
    try {
      // Get optimization result record
      const optimizationRecord = await db
        .select()
        .from(optimizationResults)
        .where(optimizationResults.id.equals(resultId))
        .limit(1);

      if (optimizationRecord.length === 0) {
        throw new Error(`Optimization result ${resultId} not found`);
      }

      const result = optimizationRecord[0];

      // Get associated schedule optimizations
      const scheduleRecords = await db
        .select()
        .from(scheduleOptimizations)
        .where(scheduleOptimizations.optimizationResultId.equals(resultId));

      return {
        success: result.runStatus === 'completed',
        optimizationId: result.id,
        executionTime: result.executionTimeMs,
        totalCost: result.totalCostEstimate,
        totalSchedules: result.totalSchedules,
        optimizationScore: result.optimizationScore,
        resourceUtilization: JSON.parse(result.resourceUtilization || '{}'),
        algorithmMetrics: JSON.parse(result.algorithmMetrics || '{}'),
        recommendations: JSON.parse(result.recommendations || '[]'),
        schedules: scheduleRecords.map(schedule => ({
          equipmentId: schedule.equipmentId,
          scheduledDate: schedule.recommendedScheduleDate,
          maintenanceType: schedule.recommendedMaintenanceType,
          priority: schedule.recommendedPriority,
          duration: schedule.estimatedDuration,
          cost: schedule.estimatedCost,
          assignedTechnician: schedule.assignedTechnicianId,
          reason: schedule.optimizationReason,
          status: schedule.status
        })),
        createdAt: result.createdAt,
        appliedToProduction: result.appliedToProduction
      };

    } catch (error) {
      console.error(`[LP Optimizer] Error retrieving results ${resultId}:`, error);
      throw error;
    }
  }
}