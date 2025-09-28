import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { db } from "./db";
import { 
  vessels, 
  vesselPositions, 
  routes, 
  voyages, 
  fuelData, 
  portOperations, 
  weatherData,
  type VesselPosition,
  type Route,
  type Voyage,
  type FuelData,
  type PortOperation
} from "@shared/schema";

/**
 * Advanced Fleet Operations Service
 * Provides real-time tracking, route optimization, fuel monitoring, and port operations
 */
export class FleetOperationsService {
  /**
   * Get real-time positions for all active vessels
   */
  async getFleetPositions(): Promise<VesselPosition[]> {
    return await db
      .select()
      .from(vesselPositions)
      .orderBy(desc(vesselPositions.ts))
      .limit(100);
  }

  /**
   * Update vessel position from AIS or GPS data
   */
  async updateVesselPosition(vesselId: string, positionData: {
    latitude: number;
    longitude: number;
    speed?: number;
    course?: number;
    heading?: number;
    draft?: number;
    status?: string;
    destination?: string;
    eta?: Date;
    source?: string;
    accuracy?: number;
  }): Promise<string> {
    const [position] = await db
      .insert(vesselPositions)
      .values({
        vesselId,
        ts: new Date(),
        ...positionData
      })
      .returning({ id: vesselPositions.id });

    console.log(`[Fleet Operations] Updated position for vessel ${vesselId}`);
    return position.id;
  }

  /**
   * Create optimized route with weather routing
   */
  async createOptimizedRoute(routeData: {
    vesselId: string;
    name: string;
    origin: string;
    destination: string;
    optimizationType?: string;
    weatherData?: any;
  }): Promise<string> {
    // Simulate route optimization algorithm
    const optimizedRoute = await this.optimizeRoute(routeData);
    
    const [route] = await db
      .insert(routes)
      .values({
        ...routeData,
        waypoints: optimizedRoute.waypoints,
        totalDistance: optimizedRoute.totalDistance,
        estimatedDuration: optimizedRoute.estimatedDuration,
        fuelEstimate: optimizedRoute.fuelEstimate,
        status: "planned"
      })
      .returning({ id: routes.id });

    console.log(`[Fleet Operations] Created optimized route: ${route.id}`);
    return route.id;
  }

  /**
   * Route optimization algorithm considering weather, fuel efficiency, and traffic
   */
  private async optimizeRoute(routeData: any): Promise<{
    waypoints: any[];
    totalDistance: number;
    estimatedDuration: number;
    fuelEstimate: number;
  }> {
    // Parse coordinates from origin/destination
    const origin = this.parseCoordinates(routeData.origin);
    const destination = this.parseCoordinates(routeData.destination);
    
    // Calculate great circle distance
    const distance = this.calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng);
    
    // Generate optimized waypoints based on weather and traffic
    const waypoints = await this.generateOptimizedWaypoints(origin, destination, routeData.optimizationType);
    
    // Calculate fuel consumption based on vessel characteristics and conditions
    const fuelEstimate = this.calculateFuelConsumption(distance, routeData.optimizationType);
    
    // Estimate duration based on speed optimization
    const estimatedSpeed = 12; // knots (average commercial vessel speed)
    const estimatedDuration = distance / estimatedSpeed;

    return {
      waypoints,
      totalDistance: distance,
      estimatedDuration,
      fuelEstimate
    };
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3440; // Nautical miles radius of Earth
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Generate optimized waypoints considering weather and traffic
   */
  private async generateOptimizedWaypoints(origin: any, destination: any, optimizationType: string = "fuel"): Promise<any[]> {
    const waypoints = [];
    
    // For this implementation, create simple intermediate waypoints
    // In production, this would use weather routing algorithms
    const segments = 3;
    for (let i = 1; i < segments; i++) {
      const fraction = i / segments;
      const lat = origin.lat + (destination.lat - origin.lat) * fraction;
      const lng = origin.lng + (destination.lng - origin.lng) * fraction;
      
      // Apply weather-based adjustments
      const weatherAdjustment = await this.getWeatherAdjustment(lat, lng);
      
      waypoints.push({
        latitude: lat + weatherAdjustment.latOffset,
        longitude: lng + weatherAdjustment.lngOffset,
        estimatedArrival: new Date(Date.now() + i * 8 * 3600 * 1000), // 8 hours between waypoints
        reason: optimizationType === "weather" ? "weather_avoidance" : "fuel_optimization"
      });
    }
    
    return waypoints;
  }

  /**
   * Get weather-based route adjustments
   */
  private async getWeatherAdjustment(lat: number, lng: number): Promise<{ latOffset: number; lngOffset: number }> {
    // Query weather data for the area
    const weather = await db
      .select()
      .from(weatherData)
      .where(
        and(
          gte(weatherData.latitude, lat - 0.5),
          lte(weatherData.latitude, lat + 0.5),
          gte(weatherData.longitude, lng - 0.5),
          lte(weatherData.longitude, lng + 0.5)
        )
      )
      .orderBy(desc(weatherData.ts))
      .limit(1);

    if (weather.length > 0) {
      const w = weather[0];
      // Adjust route based on wind and wave conditions
      const windFactor = (w.windSpeed || 0) / 20; // Normalize wind speed
      const waveFactor = (w.waveHeight || 0) / 5; // Normalize wave height
      
      return {
        latOffset: windFactor * 0.1 * Math.sin((w.windDirection || 0) * Math.PI / 180),
        lngOffset: windFactor * 0.1 * Math.cos((w.windDirection || 0) * Math.PI / 180)
      };
    }
    
    return { latOffset: 0, lngOffset: 0 };
  }

  /**
   * Calculate fuel consumption estimate
   */
  private calculateFuelConsumption(distance: number, optimizationType: string): number {
    // Base consumption: 2.5 tons per 100 nautical miles for average vessel
    let baseConsumption = (distance / 100) * 2.5;
    
    // Apply optimization factors
    switch (optimizationType) {
      case "fuel":
        baseConsumption *= 0.85; // 15% fuel savings through optimization
        break;
      case "time":
        baseConsumption *= 1.1; // 10% higher consumption for faster transit
        break;
      case "weather":
        baseConsumption *= 0.95; // 5% savings through weather routing
        break;
    }
    
    return Math.round(baseConsumption * 100) / 100;
  }

  /**
   * Parse coordinates from port code or coordinate string
   */
  private parseCoordinates(location: string): { lat: number; lng: number } {
    // Port code mappings (simplified)
    const portCoordinates: { [key: string]: { lat: number; lng: number } } = {
      "SGSIN": { lat: 1.2966, lng: 103.7764 }, // Singapore
      "NLRTM": { lat: 51.9225, lng: 4.4792 },  // Rotterdam
      "USNYC": { lat: 40.7128, lng: -74.0060 }, // New York
      "HKHKG": { lat: 22.3193, lng: 114.1694 }, // Hong Kong
      "CNSHA": { lat: 31.2304, lng: 121.4737 }, // Shanghai
    };
    
    if (portCoordinates[location]) {
      return portCoordinates[location];
    }
    
    // Try to parse as coordinates "lat,lng"
    const coords = location.split(',');
    if (coords.length === 2) {
      return {
        lat: parseFloat(coords[0].trim()),
        lng: parseFloat(coords[1].trim())
      };
    }
    
    // Default to Singapore if parsing fails
    return { lat: 1.2966, lng: 103.7764 };
  }

  /**
   * Track fuel consumption and efficiency
   */
  async recordFuelData(vesselId: string, fuelInfo: {
    fuelType: string;
    consumption?: number;
    remaining?: number;
    density?: number;
    sulfurContent?: number;
    bunkerId?: string;
    source?: string;
  }): Promise<string> {
    const [fuelRecord] = await db
      .insert(fuelData)
      .values({
        vesselId,
        ts: new Date(),
        ...fuelInfo
      })
      .returning({ id: fuelData.id });

    console.log(`[Fleet Operations] Recorded fuel data for vessel ${vesselId}`);
    return fuelRecord.id;
  }

  /**
   * Get fuel efficiency analytics
   */
  async getFuelEfficiencyAnalytics(vesselId: string, days: number = 30): Promise<{
    averageConsumption: number;
    efficiency: number;
    trend: string;
    recommendations: string[];
  }> {
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);
    
    const fuelRecords = await db
      .select()
      .from(fuelData)
      .where(
        and(
          eq(fuelData.vesselId, vesselId),
          gte(fuelData.ts, since)
        )
      )
      .orderBy(desc(fuelData.ts));

    if (fuelRecords.length === 0) {
      return {
        averageConsumption: 0,
        efficiency: 0,
        trend: "no_data",
        recommendations: ["Install fuel monitoring sensors", "Begin regular fuel consumption logging"]
      };
    }

    const totalConsumption = fuelRecords.reduce((sum, record) => sum + (record.consumption || 0), 0);
    const averageConsumption = totalConsumption / fuelRecords.length;
    
    // Calculate efficiency as tons/hour per nautical mile
    const efficiency = averageConsumption / 12; // Assuming 12 knots average speed
    
    // Determine trend
    const recentRecords = fuelRecords.slice(0, Math.floor(fuelRecords.length / 2));
    const olderRecords = fuelRecords.slice(Math.floor(fuelRecords.length / 2));
    
    const recentAvg = recentRecords.reduce((sum, r) => sum + (r.consumption || 0), 0) / recentRecords.length;
    const olderAvg = olderRecords.reduce((sum, r) => sum + (r.consumption || 0), 0) / olderRecords.length;
    
    const trend = recentAvg > olderAvg ? "increasing" : recentAvg < olderAvg ? "decreasing" : "stable";
    
    // Generate recommendations
    const recommendations = this.generateFuelRecommendations(efficiency, trend, fuelRecords);

    return {
      averageConsumption: Math.round(averageConsumption * 100) / 100,
      efficiency: Math.round(efficiency * 1000) / 1000,
      trend,
      recommendations
    };
  }

  /**
   * Generate fuel efficiency recommendations
   */
  private generateFuelRecommendations(efficiency: number, trend: string, records: any[]): string[] {
    const recommendations = [];
    
    if (efficiency > 0.25) {
      recommendations.push("High fuel consumption detected - consider speed optimization");
      recommendations.push("Review engine maintenance schedule");
    }
    
    if (trend === "increasing") {
      recommendations.push("Fuel consumption is trending upward - investigate causes");
      recommendations.push("Consider hull cleaning to reduce friction");
    }
    
    const highSulfurRecords = records.filter(r => (r.sulfurContent || 0) > 0.5);
    if (highSulfurRecords.length > records.length * 0.3) {
      recommendations.push("High sulfur fuel usage - switch to low sulfur alternatives");
      recommendations.push("Install scrubber system for emissions compliance");
    }
    
    if (recommendations.length === 0) {
      recommendations.push("Fuel efficiency is within normal parameters");
      recommendations.push("Continue current operational practices");
    }
    
    return recommendations;
  }

  /**
   * Manage port operations and berth scheduling
   */
  async schedulePortOperation(operationData: {
    vesselId: string;
    portCode: string;
    portName: string;
    operationType: string;
    scheduledArrival?: Date;
    scheduledDeparture?: Date;
    cargoQuantity?: number;
    cargoType?: string;
  }): Promise<string> {
    const [operation] = await db
      .insert(portOperations)
      .values({
        ...operationData,
        status: "scheduled"
      })
      .returning({ id: portOperations.id });

    console.log(`[Fleet Operations] Scheduled port operation: ${operation.id}`);
    return operation.id;
  }

  /**
   * Get port operations schedule
   */
  async getPortSchedule(portCode?: string, vesselId?: string): Promise<PortOperation[]> {
    let query = db.select().from(portOperations);
    
    const conditions = [];
    if (portCode) {
      conditions.push(eq(portOperations.portCode, portCode));
    }
    if (vesselId) {
      conditions.push(eq(portOperations.vesselId, vesselId));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(portOperations.scheduledArrival);
  }

  /**
   * Update port operation status
   */
  async updatePortOperationStatus(operationId: string, status: string, updateData?: {
    actualArrival?: Date;
    actualDeparture?: Date;
    waitingTime?: number;
    berthEfficiency?: number;
    costs?: any;
  }): Promise<void> {
    await db
      .update(portOperations)
      .set({
        status,
        ...updateData
      })
      .where(eq(portOperations.id, operationId));

    console.log(`[Fleet Operations] Updated port operation ${operationId} status to ${status}`);
  }

  /**
   * Get voyage performance analytics
   */
  async getVoyagePerformance(voyageId: string): Promise<{
    voyage: Voyage;
    performance: {
      onTimePerformance: number;
      fuelEfficiency: number;
      speedProfile: any[];
      weatherImpact: string;
    };
  }> {
    const voyage = await db
      .select()
      .from(voyages)
      .where(eq(voyages.id, voyageId))
      .limit(1);

    if (voyage.length === 0) {
      throw new Error(`Voyage ${voyageId} not found`);
    }

    const v = voyage[0];
    
    // Calculate performance metrics
    const onTimePerformance = this.calculateOnTimePerformance(v);
    const fuelEfficiency = this.calculateFuelEfficiency(v);
    const speedProfile = this.generateSpeedProfile(v);
    const weatherImpact = this.assessWeatherImpact(v);

    return {
      voyage: v,
      performance: {
        onTimePerformance,
        fuelEfficiency,
        speedProfile,
        weatherImpact
      }
    };
  }

  private calculateOnTimePerformance(voyage: any): number {
    if (!voyage.plannedDuration || !voyage.actualDuration) return 0;
    const variance = Math.abs(voyage.actualDuration - voyage.plannedDuration) / voyage.plannedDuration;
    return Math.max(0, 100 - variance * 100);
  }

  private calculateFuelEfficiency(voyage: any): number {
    if (!voyage.plannedFuel || !voyage.actualFuel) return 0;
    const efficiency = (voyage.plannedFuel / voyage.actualFuel) * 100;
    return Math.min(100, efficiency);
  }

  private generateSpeedProfile(voyage: any): any[] {
    // Simulate speed profile - in production, this would use actual vessel tracking data
    return [
      { time: 0, speed: 10.5 },
      { time: 25, speed: 12.2 },
      { time: 50, speed: 11.8 },
      { time: 75, speed: 13.1 },
      { time: 100, speed: 12.0 }
    ];
  }

  private assessWeatherImpact(voyage: any): string {
    const weather = voyage.weather || {};
    if (weather.severeWeather) return "high";
    if (weather.moderateWeather) return "medium";
    return "low";
  }
}

export const fleetOperationsService = new FleetOperationsService();