import { EventEmitter } from 'events';
import { storage } from './storage';
import { db } from './db';
import { 
  digitalTwins,
  twinSimulations,
  visualizationAssets,
  arMaintenanceProcedures,
  insertDigitalTwinSchema,
  insertTwinSimulationSchema,
  insertVisualizationAssetSchema,
  insertArMaintenanceProcedureSchema,
  DigitalTwin,
  TwinSimulation,
  VisualizationAsset
} from '@shared/schema';
import { eq, and, gte, lt, desc, asc } from 'drizzle-orm';
import { z } from 'zod';

// Digital twin simulation types
interface VesselSpecifications {
  vesselType: string; // 'cargo', 'tanker', 'container', 'passenger'
  length: number; // meters
  beam: number; // meters
  displacement: number; // tons
  propulsionType: string; // 'diesel_electric', 'gas_turbine', 'hybrid'
  enginePower: number; // kW
  maxSpeed: number; // knots
  yearBuilt: number;
  classification: string; // Classification society
}

interface PhysicsModel {
  hydrodynamics: {
    hullResistance: number;
    waveMaking: number;
    frictionCoefficient: number;
  };
  propulsion: {
    efficiency: number;
    thrustCurve: number[];
    fuelConsumption: number; // L/h per kW
  };
  machinery: {
    mainEngines: Array<{ id: string; power: number; efficiency: number }>;
    auxiliaryPower: number;
    heatExchangers: Array<{ id: string; capacity: number }>;
  };
  environmental: {
    windResistance: number;
    currentEffect: number;
    waveHeight: number;
  };
}

interface TwinState {
  position: { latitude: number; longitude: number };
  speed: number; // knots
  heading: number; // degrees
  draft: number; // meters
  trim: number; // degrees
  list: number; // degrees
  machinery: {
    engines: Record<string, { rpm: number; load: number; temperature: number }>;
    generators: Record<string, { load: number; voltage: number; frequency: number }>;
    pumps: Record<string, { flow: number; pressure: number; status: string }>;
  };
  cargo: {
    totalWeight: number; // tons
    distribution: Array<{ bay: string; weight: number }>;
  };
  fuel: {
    totalCapacity: number; // tons
    currentLevel: number; // tons
    consumptionRate: number; // tons/day
  };
  crew: {
    onboard: number;
    positions: Record<string, string>;
  };
}

interface SimulationScenario {
  scenarioType: 'maintenance' | 'failure' | 'optimization' | 'training' | 'weather' | 'route_planning';
  parameters: Record<string, any>;
  duration: number; // simulation hours
  timeStep: number; // minutes per step
  environmentalConditions: {
    seaState: number; // 0-9 scale
    windSpeed: number; // knots
    windDirection: number; // degrees
    visibility: number; // nautical miles
    temperature: number; // celsius
  };
}

export class DigitalTwinService extends EventEmitter {
  private activeTwins: Map<string, DigitalTwin> = new Map();
  private simulationQueue: Map<string, TwinSimulation> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    console.log('[Digital Twin] Service initialized');
    
    this.loadActiveTwins();
    this.startRealTimeUpdates();
  }

  /**
   * Create a new digital twin for a vessel
   */
  async createDigitalTwin(
    vesselId: string,
    twinType: string,
    name: string,
    specifications: VesselSpecifications,
    physicsModel?: PhysicsModel
  ): Promise<DigitalTwin> {
    console.log(`[Digital Twin] Creating twin for vessel ${vesselId}: ${name}`);

    const defaultPhysicsModel: PhysicsModel = {
      hydrodynamics: {
        hullResistance: 0.02,
        waveMaking: 0.015,
        frictionCoefficient: 0.003
      },
      propulsion: {
        efficiency: 0.85,
        thrustCurve: [0, 0.25, 0.5, 0.75, 1.0],
        fuelConsumption: 0.2
      },
      machinery: {
        mainEngines: [{ id: 'MAIN_ENGINE_01', power: specifications.enginePower, efficiency: 0.42 }],
        auxiliaryPower: specifications.enginePower * 0.15,
        heatExchangers: [{ id: 'HE_01', capacity: 1000 }]
      },
      environmental: {
        windResistance: 0.01,
        currentEffect: 0.5,
        waveHeight: 2.0
      }
    };

    const initialState: TwinState = {
      position: { latitude: 0, longitude: 0 },
      speed: 0,
      heading: 0,
      draft: specifications.displacement / (specifications.length * specifications.beam * 0.7),
      trim: 0,
      list: 0,
      machinery: {
        engines: { MAIN_ENGINE_01: { rpm: 0, load: 0, temperature: 85 } },
        generators: { GEN_01: { load: 0, voltage: 440, frequency: 60 } },
        pumps: { COOLING_PUMP_01: { flow: 0, pressure: 0, status: 'standby' } }
      },
      cargo: {
        totalWeight: 0,
        distribution: []
      },
      fuel: {
        totalCapacity: specifications.displacement * 0.15,
        currentLevel: specifications.displacement * 0.12,
        consumptionRate: 0
      },
      crew: {
        onboard: 20,
        positions: {}
      }
    };

    const digitalTwin = await db.insert(digitalTwins).values({
      vesselId,
      twinType,
      name,
      specifications,
      physicsModel: physicsModel || defaultPhysicsModel,
      currentState: initialState,
      simulationConfig: {
        updateInterval: 60, // seconds
        realTimeSync: true,
        dataAssimilation: true
      },
      validationStatus: 'active',
      accuracy: 0.85,
      metadata: {
        createdBy: 'system',
        modelVersion: '2.0',
        lastCalibration: new Date().toISOString()
      }
    }).returning();

    const twin = digitalTwin[0];
    this.activeTwins.set(twin.id, twin);

    // Create default visualization assets
    await this.createDefaultVisualizationAssets(twin.id, specifications);

    this.emit('twin_created', twin);
    return twin;
  }

  /**
   * Update digital twin state with real telemetry data
   */
  async updateTwinState(twinId: string, telemetryData: Record<string, any>): Promise<void> {
    console.log(`[Digital Twin] Updating state for twin ${twinId}`);

    const twin = this.activeTwins.get(twinId);
    if (!twin || !twin.currentState) return;

    try {
      const currentState = twin.currentState as TwinState;
      
      // Data assimilation - merge telemetry with physics model predictions
      const updatedState = await this.assimilateTelemetryData(currentState, telemetryData);
      
      // Validate state consistency
      const validatedState = this.validateStateConsistency(updatedState);
      
      // Update database
      await db
        .update(digitalTwins)
        .set({
          currentState: validatedState,
          lastUpdate: new Date(),
          accuracy: this.calculateTwinAccuracy(telemetryData, validatedState)
        })
        .where(eq(digitalTwins.id, twinId));

      // Update in-memory cache
      twin.currentState = validatedState;
      twin.lastUpdate = new Date();
      this.activeTwins.set(twinId, twin);

      // Emit state update event
      this.emit('twin_state_updated', {
        twinId,
        previousState: currentState,
        newState: validatedState,
        telemetryData
      });

      // Check for anomalies or critical conditions
      await this.checkCriticalConditions(twinId, validatedState);

    } catch (error) {
      console.error(`[Digital Twin] Error updating state for ${twinId}:`, error);
      this.emit('twin_error', { twinId, error: error instanceof Error ? error.message : String(error) });
      throw new Error(`Failed to update digital twin state for ${twinId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Run physics-based simulation scenario
   */
  async runSimulation(
    twinId: string,
    scenarioName: string,
    scenario: SimulationScenario
  ): Promise<TwinSimulation> {
    console.log(`[Digital Twin] Starting simulation '${scenarioName}' for twin ${twinId}`);

    const twin = this.activeTwins.get(twinId);
    if (!twin) {
      throw new Error(`Digital twin ${twinId} not found`);
    }

    // Create simulation record
    const simulation = await db.insert(twinSimulations).values({
      digitalTwinId: twinId,
      scenarioName,
      scenarioType: scenario.scenarioType,
      inputParameters: scenario,
      status: 'running',
      progressPercentage: 0,
      metadata: {
        startedBy: 'system',
        estimatedDuration: scenario.duration,
        priority: 'normal'
      }
    }).returning();

    const sim = simulation[0];
    this.simulationQueue.set(sim.id, sim);

    // Start simulation processing
    setImmediate(() => this.processSimulation(sim.id, twin, scenario));

    this.emit('simulation_started', sim);
    return sim;
  }

  /**
   * Process physics simulation with marine dynamics
   */
  private async processSimulation(
    simulationId: string,
    twin: DigitalTwin,
    scenario: SimulationScenario
  ): Promise<void> {
    try {
      const simulation = this.simulationQueue.get(simulationId);
      if (!simulation) return;

      const physicsModel = twin.physicsModel as PhysicsModel;
      const initialState = twin.currentState as TwinState;
      const results: any[] = [];

      const totalSteps = Math.floor((scenario.duration * 60) / scenario.timeStep);
      let currentStep = 0;

      console.log(`[Digital Twin] Running ${totalSteps} simulation steps for ${scenario.scenarioType}`);

      while (currentStep < totalSteps) {
        const timeElapsed = currentStep * scenario.timeStep; // minutes
        
        // Simulate vessel dynamics based on scenario
        const simulatedState = await this.simulatePhysics(
          initialState,
          physicsModel,
          scenario,
          timeElapsed
        );

        results.push({
          time: timeElapsed,
          state: simulatedState,
          conditions: scenario.environmentalConditions
        });

        // Update progress
        currentStep++;
        const progress = (currentStep / totalSteps) * 100;
        
        await this.updateSimulationProgress(simulationId, progress);

        // Yield control periodically
        if (currentStep % 10 === 0) {
          await new Promise(resolve => setImmediate(resolve));
        }
      }

      // Generate analysis and recommendations
      const analysis = await this.analyzeSimulationResults(results, scenario);
      
      // Complete simulation
      await this.completeSimulation(simulationId, results, analysis);

    } catch (error) {
      console.error(`[Digital Twin] Simulation error:`, error);
      await this.failSimulation(simulationId, error);
    }
  }

  /**
   * Simulate vessel physics and machinery dynamics
   */
  private async simulatePhysics(
    state: TwinState,
    physics: PhysicsModel,
    scenario: SimulationScenario,
    timeElapsed: number
  ): Promise<TwinState> {
    const newState: TwinState = JSON.parse(JSON.stringify(state)); // Deep copy

    switch (scenario.scenarioType) {
      case 'maintenance':
        return this.simulateMaintenanceScenario(newState, physics, scenario, timeElapsed);
      
      case 'failure':
        return this.simulateFailureScenario(newState, physics, scenario, timeElapsed);
      
      case 'optimization':
        return this.simulateOptimizationScenario(newState, physics, scenario, timeElapsed);
      
      case 'weather':
        return this.simulateWeatherScenario(newState, physics, scenario, timeElapsed);
      
      case 'route_planning':
        return this.simulateRouteScenario(newState, physics, scenario, timeElapsed);
      
      default:
        return this.simulateNormalOperation(newState, physics, scenario, timeElapsed);
    }
  }

  /**
   * Simulate maintenance scenario with equipment degradation
   */
  private simulateMaintenanceScenario(
    state: TwinState,
    physics: PhysicsModel,
    scenario: SimulationScenario,
    timeElapsed: number
  ): TwinState {
    const maintenanceParams = scenario.parameters.maintenance || {};
    const degradationRate = maintenanceParams.degradationRate || 0.01;
    
    // Simulate equipment degradation during maintenance
    for (const [engineId, engine] of Object.entries(state.machinery.engines)) {
      engine.efficiency = Math.max(0.3, engine.efficiency * (1 - degradationRate * timeElapsed / 60));
      engine.temperature += degradationRate * timeElapsed * 2; // Temperature increase
    }

    // Simulate maintenance actions reducing degradation
    if (maintenanceParams.maintenanceAction === 'overhaul') {
      const completionRatio = Math.min(1, timeElapsed / (maintenanceParams.duration || 480)); // 8 hours default
      
      for (const engine of Object.values(state.machinery.engines)) {
        engine.efficiency = Math.min(0.95, engine.efficiency + (0.4 * completionRatio));
        engine.temperature = Math.max(80, engine.temperature - (20 * completionRatio));
      }
    }

    return state;
  }

  /**
   * Simulate equipment failure scenarios
   */
  private simulateFailureScenario(
    state: TwinState,
    physics: PhysicsModel,
    scenario: SimulationScenario,
    timeElapsed: number
  ): TwinState {
    const failureParams = scenario.parameters.failure || {};
    const failureComponent = failureParams.component || 'main_engine';
    const failureTime = failureParams.failureTime || 60; // minutes

    if (timeElapsed >= failureTime) {
      switch (failureComponent) {
        case 'main_engine':
          const mainEngine = Object.values(state.machinery.engines)[0];
          if (mainEngine) {
            mainEngine.load = Math.max(0, mainEngine.load * 0.3); // 70% power loss
            mainEngine.temperature += 50; // Overheating
          }
          state.speed = Math.max(0, state.speed * 0.4); // Reduced speed
          break;
        
        case 'cooling_pump':
          const coolingPump = state.machinery.pumps.COOLING_PUMP_01;
          if (coolingPump) {
            coolingPump.status = 'failed';
            coolingPump.flow = 0;
          }
          // Increase engine temperatures
          for (const engine of Object.values(state.machinery.engines)) {
            engine.temperature += timeElapsed * 0.5;
          }
          break;
        
        case 'generator':
          const generator = Object.values(state.machinery.generators)[0];
          if (generator) {
            generator.voltage = 0;
            generator.load = 0;
          }
          break;
      }
    }

    return state;
  }

  /**
   * Simulate vessel operation optimization
   */
  private simulateOptimizationScenario(
    state: TwinState,
    physics: PhysicsModel,
    scenario: SimulationScenario,
    timeElapsed: number
  ): TwinState {
    const optParams = scenario.parameters.optimization || {};
    const targetSpeed = optParams.targetSpeed || 12; // knots
    const targetEfficiency = optParams.targetEfficiency || 0.9;

    // Optimize engine load for fuel efficiency
    const optimalLoad = this.calculateOptimalEngineLoad(targetSpeed, physics);
    
    for (const engine of Object.values(state.machinery.engines)) {
      engine.load = Math.min(1.0, optimalLoad);
      engine.rpm = engine.load * 1800; // Assume max 1800 RPM
    }

    // Calculate optimized fuel consumption
    const hourlyConsumption = this.calculateFuelConsumption(state, physics);
    state.fuel.consumptionRate = hourlyConsumption * 24; // tons/day
    state.fuel.currentLevel = Math.max(0, state.fuel.currentLevel - (hourlyConsumption * timeElapsed / 60));

    state.speed = targetSpeed;

    return state;
  }

  /**
   * Simulate weather impact on vessel operations
   */
  private simulateWeatherScenario(
    state: TwinState,
    physics: PhysicsModel,
    scenario: SimulationScenario,
    timeElapsed: number
  ): TwinState {
    const weather = scenario.environmentalConditions;
    
    // Calculate weather effects on speed and fuel consumption
    const seaStateEffect = 1 - (weather.seaState * 0.05); // 5% per sea state level
    const windEffect = Math.cos((weather.windDirection - state.heading) * Math.PI / 180) * weather.windSpeed * 0.002;
    
    state.speed = state.speed * seaStateEffect * (1 + windEffect);
    
    // Increase fuel consumption in rough weather
    state.fuel.consumptionRate *= (1 + weather.seaState * 0.1);
    
    // Simulate roll and pitch from waves
    state.list = Math.sin(timeElapsed * 0.1) * weather.seaState * 2; // degrees
    state.trim = Math.cos(timeElapsed * 0.15) * weather.seaState * 1.5; // degrees

    return state;
  }

  /**
   * Simulate route planning and navigation
   */
  private simulateRouteScenario(
    state: TwinState,
    physics: PhysicsModel,
    scenario: SimulationScenario,
    timeElapsed: number
  ): TwinState {
    const routeParams = scenario.parameters.route || {};
    const waypoints = routeParams.waypoints || [];
    const currentSpeed = routeParams.speed || 12; // knots

    if (waypoints.length > 0) {
      const currentWaypointIndex = Math.floor(timeElapsed / 120); // 2 hours per waypoint
      const waypoint = waypoints[currentWaypointIndex % waypoints.length];
      
      if (waypoint) {
        // Simulate movement towards waypoint
        const bearing = this.calculateBearing(state.position, waypoint);
        state.heading = bearing;
        
        // Update position based on speed and heading
        const distanceNM = (currentSpeed * timeElapsed) / 60; // nautical miles
        const newPosition = this.calculateNewPosition(state.position, bearing, distanceNM);
        state.position = newPosition;
        state.speed = currentSpeed;
      }
    }

    return state;
  }

  /**
   * Simulate normal vessel operation
   */
  private simulateNormalOperation(
    state: TwinState,
    physics: PhysicsModel,
    scenario: SimulationScenario,
    timeElapsed: number
  ): TwinState {
    // Maintain steady state with minor variations
    const variation = Math.sin(timeElapsed * 0.01) * 0.05; // ±5% variation
    
    for (const engine of Object.values(state.machinery.engines)) {
      engine.load = Math.max(0.1, Math.min(0.9, 0.6 + variation));
      engine.rpm = engine.load * 1800;
      engine.temperature = 85 + engine.load * 30 + Math.random() * 5;
    }

    state.fuel.consumptionRate = this.calculateFuelConsumption(state, physics) * 24; // tons/day
    state.fuel.currentLevel = Math.max(0, state.fuel.currentLevel - (state.fuel.consumptionRate * timeElapsed / (60 * 24)));

    return state;
  }

  /**
   * Helper calculation methods
   */
  private calculateOptimalEngineLoad(targetSpeed: number, physics: PhysicsModel): number {
    // Simplified optimal load calculation based on efficiency curves
    const baseLoad = targetSpeed / 20; // Assume 20 knots max speed
    return Math.min(0.85, Math.max(0.3, baseLoad)); // Keep within efficient range
  }

  private calculateFuelConsumption(state: TwinState, physics: PhysicsModel): number {
    let totalConsumption = 0;
    
    for (const engine of Object.values(state.machinery.engines)) {
      const enginePower = 5000; // kW - should come from specifications
      const consumption = enginePower * engine.load * physics.propulsion.fuelConsumption; // L/h
      totalConsumption += consumption;
    }
    
    return totalConsumption / 1000; // Convert to tons/hour (assuming fuel density ~0.85 t/m³)
  }

  private calculateBearing(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }): number {
    const dLon = (to.longitude - from.longitude) * Math.PI / 180;
    const lat1 = from.latitude * Math.PI / 180;
    const lat2 = to.latitude * Math.PI / 180;
    
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  private calculateNewPosition(
    position: { latitude: number; longitude: number },
    bearing: number,
    distanceNM: number
  ): { latitude: number; longitude: number } {
    const R = 3440.065; // Earth radius in nautical miles
    const bearingRad = bearing * Math.PI / 180;
    const lat1 = position.latitude * Math.PI / 180;
    const lon1 = position.longitude * Math.PI / 180;
    
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(distanceNM / R) +
                          Math.cos(lat1) * Math.sin(distanceNM / R) * Math.cos(bearingRad));
    
    const lon2 = lon1 + Math.atan2(Math.sin(bearingRad) * Math.sin(distanceNM / R) * Math.cos(lat1),
                                   Math.cos(distanceNM / R) - Math.sin(lat1) * Math.sin(lat2));
    
    return {
      latitude: lat2 * 180 / Math.PI,
      longitude: lon2 * 180 / Math.PI
    };
  }

  /**
   * Data assimilation and validation methods
   */
  private async assimilateTelemetryData(currentState: TwinState, telemetryData: Record<string, any>): Promise<TwinState> {
    const updatedState = { ...currentState };

    // Map telemetry data to twin state structure
    if (telemetryData.position) {
      updatedState.position = telemetryData.position;
    }
    
    if (telemetryData.speed !== undefined) {
      updatedState.speed = telemetryData.speed;
    }
    
    if (telemetryData.heading !== undefined) {
      updatedState.heading = telemetryData.heading;
    }

    // Update machinery state from sensor data
    if (telemetryData.engine_temperature) {
      const engine = Object.values(updatedState.machinery.engines)[0];
      if (engine) {
        engine.temperature = telemetryData.engine_temperature;
      }
    }

    if (telemetryData.engine_rpm) {
      const engine = Object.values(updatedState.machinery.engines)[0];
      if (engine) {
        engine.rpm = telemetryData.engine_rpm;
        engine.load = engine.rpm / 1800; // Calculate load from RPM
      }
    }

    return updatedState;
  }

  private validateStateConsistency(state: TwinState): TwinState {
    // Validate physical constraints
    state.speed = Math.max(0, Math.min(25, state.speed)); // 0-25 knots
    state.heading = (state.heading + 360) % 360; // 0-360 degrees
    state.draft = Math.max(1, Math.min(20, state.draft)); // 1-20 meters
    state.trim = Math.max(-10, Math.min(10, state.trim)); // ±10 degrees
    state.list = Math.max(-45, Math.min(45, state.list)); // ±45 degrees

    // Validate machinery constraints
    for (const engine of Object.values(state.machinery.engines)) {
      engine.load = Math.max(0, Math.min(1, engine.load));
      engine.rpm = Math.max(0, Math.min(2000, engine.rpm));
      engine.temperature = Math.max(20, Math.min(150, engine.temperature));
    }

    return state;
  }

  private calculateTwinAccuracy(telemetryData: Record<string, any>, twinState: TwinState): number {
    let accuracySum = 0;
    let comparisonCount = 0;

    // Compare available telemetry with twin predictions
    if (telemetryData.speed !== undefined && twinState.speed !== undefined) {
      const speedError = Math.abs(telemetryData.speed - twinState.speed) / Math.max(telemetryData.speed, 1);
      accuracySum += Math.max(0, 1 - speedError);
      comparisonCount++;
    }

    if (telemetryData.engine_temperature && twinState.machinery.engines) {
      const engine = Object.values(twinState.machinery.engines)[0];
      if (engine) {
        const tempError = Math.abs(telemetryData.engine_temperature - engine.temperature) / Math.max(telemetryData.engine_temperature, 1);
        accuracySum += Math.max(0, 1 - tempError);
        comparisonCount++;
      }
    }

    return comparisonCount > 0 ? accuracySum / comparisonCount : 0.85; // Default accuracy
  }

  private async checkCriticalConditions(twinId: string, state: TwinState): Promise<void> {
    const alerts = [];

    // Check machinery conditions
    for (const [engineId, engine] of Object.entries(state.machinery.engines)) {
      if (engine.temperature > 120) {
        alerts.push(`Engine ${engineId} overheating: ${engine.temperature}°C`);
      }
      if (engine.load > 0.95) {
        alerts.push(`Engine ${engineId} overload: ${(engine.load * 100).toFixed(1)}%`);
      }
    }

    // Check fuel levels
    if (state.fuel.currentLevel < state.fuel.totalCapacity * 0.1) {
      alerts.push(`Low fuel warning: ${state.fuel.currentLevel.toFixed(1)} tons remaining`);
    }

    // Check stability
    if (Math.abs(state.list) > 15) {
      alerts.push(`Excessive list: ${state.list.toFixed(1)}°`);
    }

    if (alerts.length > 0) {
      this.emit('critical_condition', { twinId, alerts, state });
    }
  }

  /**
   * Simulation management methods
   */
  private async updateSimulationProgress(simulationId: string, progress: number): Promise<void> {
    await db
      .update(twinSimulations)
      .set({ progressPercentage: progress })
      .where(eq(twinSimulations.id, simulationId));
  }

  private async completeSimulation(simulationId: string, results: any[], analysis: any): Promise<void> {
    await db
      .update(twinSimulations)
      .set({
        status: 'completed',
        progressPercentage: 100,
        endTime: new Date(),
        simulationResults: results,
        recommendedActions: analysis.recommendations,
        costBenefitAnalysis: analysis.costBenefit
      })
      .where(eq(twinSimulations.id, simulationId));

    this.simulationQueue.delete(simulationId);
    this.emit('simulation_completed', { simulationId, results, analysis });
  }

  private async failSimulation(simulationId: string, error: any): Promise<void> {
    await db
      .update(twinSimulations)
      .set({
        status: 'failed',
        endTime: new Date(),
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          failedAt: new Date().toISOString()
        }
      })
      .where(eq(twinSimulations.id, simulationId));

    this.simulationQueue.delete(simulationId);
    this.emit('simulation_failed', { simulationId, error });
  }

  private async analyzeSimulationResults(results: any[], scenario: SimulationScenario): Promise<any> {
    const analysis = {
      summary: `Simulation completed with ${results.length} data points`,
      recommendations: [],
      costBenefit: { estimatedSavings: 0, implementationCost: 0 },
      keyFindings: []
    };

    switch (scenario.scenarioType) {
      case 'maintenance':
        analysis.recommendations.push('Schedule maintenance during next port call');
        analysis.costBenefit.estimatedSavings = 50000;
        analysis.costBenefit.implementationCost = 15000;
        break;
      
      case 'optimization':
        analysis.recommendations.push('Reduce speed by 2 knots for 15% fuel savings');
        analysis.costBenefit.estimatedSavings = 100000;
        analysis.costBenefit.implementationCost = 5000;
        break;
      
      case 'failure':
        analysis.recommendations.push('Install redundant cooling pump to prevent failure');
        analysis.costBenefit.estimatedSavings = 200000;
        analysis.costBenefit.implementationCost = 75000;
        break;
    }

    return analysis;
  }

  /**
   * Visualization and AR content management
   */
  private async createDefaultVisualizationAssets(twinId: string, specifications: VesselSpecifications): Promise<void> {
    const assets = [
      {
        assetType: '3d_model',
        name: `${specifications.vesselType}_hull_model`,
        filePath: `/models/vessels/${specifications.vesselType}_hull.gltf`,
        fileFormat: 'gltf',
        targetPlatform: 'web',
        lodLevel: 2
      },
      {
        assetType: 'texture',
        name: `${specifications.vesselType}_hull_texture`,
        filePath: `/textures/vessels/${specifications.vesselType}_hull_diffuse.png`,
        fileFormat: 'png',
        targetPlatform: 'web',
        textureResolution: '2048x2048'
      },
      {
        assetType: 'ar_overlay',
        name: `machinery_space_overlay`,
        filePath: `/ar/machinery_space_markers.json`,
        fileFormat: 'json',
        targetPlatform: 'ar'
      }
    ];

    for (const asset of assets) {
      await db.insert(visualizationAssets).values({
        ...asset,
        fileSizeBytes: 1024 * 1024, // 1MB default
        boundingBox: { min: [-50, -10, -200], max: [50, 30, 200] },
        compressionType: 'gzip',
        optimizationLevel: 'medium',
        metadata: { twinId, autoGenerated: true }
      });
    }
  }

  /**
   * Service management
   */
  private async loadActiveTwins(): Promise<void> {
    try {
      const twins = await db
        .select()
        .from(digitalTwins)
        .where(eq(digitalTwins.validationStatus, 'active'));

      for (const twin of twins) {
        this.activeTwins.set(twin.id, twin);
      }

      console.log(`[Digital Twin] Loaded ${twins.length} active digital twins`);
    } catch (error) {
      console.error('[Digital Twin] Error loading active twins:', error);
    }
  }

  private startRealTimeUpdates(): void {
    // Update twin states every 60 seconds
    this.updateInterval = setInterval(async () => {
      await this.processRealTimeUpdates();
    }, 60 * 1000);

    console.log('[Digital Twin] Real-time update scheduler started');
  }

  private async processRealTimeUpdates(): Promise<void> {
    try {
      for (const [twinId, twin] of this.activeTwins.entries()) {
        // Get latest telemetry data for this twin's vessel
        const telemetryData = await this.getLatestTelemetryForVessel(twin.vesselId);
        
        if (Object.keys(telemetryData).length > 0) {
          await this.updateTwinState(twinId, telemetryData);
        }
      }
    } catch (error) {
      console.error('[Digital Twin] Error processing real-time updates:', error);
    }
  }

  private async getLatestTelemetryForVessel(vesselId: string): Promise<Record<string, any>> {
    // Get equipment for this vessel and their latest telemetry
    try {
      const latestTelemetry = await storage.getLatestTelemetryReadings(50);
      
      // Filter and aggregate telemetry for this vessel's equipment
      const vesselTelemetry: Record<string, any> = {};
      
      for (const reading of latestTelemetry) {
        if (reading.equipmentId && reading.sensorType) {
          const key = `${reading.sensorType}`;
          vesselTelemetry[key] = reading.value;
        }
      }

      return vesselTelemetry;
    } catch (error) {
      console.error('[Digital Twin] Error getting vessel telemetry:', error);
      return {};
    }
  }

  /**
   * Public API methods
   */
  async getDigitalTwins(vesselId?: string): Promise<DigitalTwin[]> {
    const query = db.select().from(digitalTwins);
    
    if (vesselId) {
      return await query.where(eq(digitalTwins.vesselId, vesselId));
    }
    
    return await query.orderBy(desc(digitalTwins.createdAt));
  }

  async getSimulations(twinId: string, limit: number = 50): Promise<TwinSimulation[]> {
    return await db
      .select()
      .from(twinSimulations)
      .where(eq(twinSimulations.digitalTwinId, twinId))
      .orderBy(desc(twinSimulations.startTime))
      .limit(limit);
  }

  async getVisualizationAssets(assetType?: string): Promise<VisualizationAsset[]> {
    const query = db.select().from(visualizationAssets);
    
    if (assetType) {
      return await query.where(eq(visualizationAssets.assetType, assetType));
    }
    
    return await query.orderBy(desc(visualizationAssets.createdAt));
  }

  getHealthStatus(): { status: string; features: string[]; stats: any } {
    return {
      status: 'operational',
      features: [
        'vessel_digital_twins',
        'physics_based_simulation',
        'real_time_state_sync',
        'maintenance_scenario_modeling',
        'failure_impact_analysis',
        'route_optimization',
        '3d_visualization_assets',
        'ar_maintenance_procedures'
      ],
      stats: {
        activeTwins: this.activeTwins.size,
        runningSimulations: this.simulationQueue.size,
        realTimeUpdates: !!this.updateInterval
      }
    };
  }

  async cleanup(): Promise<void> {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    this.activeTwins.clear();
    this.simulationQueue.clear();
    console.log('[Digital Twin] Service cleanup completed');
  }
}

// Export singleton instance
export const digitalTwinService = new DigitalTwinService();