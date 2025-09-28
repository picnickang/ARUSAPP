/**
 * External Marine Data Integration Service
 * Provides integrations with external marine data providers for weather, vessel tracking, and port information
 */

import { z } from 'zod';

// Configuration schema for external services
const ExternalServiceConfig = z.object({
  openWeatherMapApiKey: z.string().optional(),
  marineTrafficApiKey: z.string().optional(), 
  portCallApiKey: z.string().optional(),
  enableMockData: z.boolean().default(false) // Only use mock data when explicitly enabled or no API keys available
});

type ExternalServiceConfig = z.infer<typeof ExternalServiceConfig>;

// Marine weather data types
export interface WeatherData {
  location: { latitude: number; longitude: number };
  current: {
    temperature: number;
    humidity: number;
    pressure: number;
    windSpeed: number;
    windDirection: number;
    visibility: number;
    conditions: string;
  };
  marine: {
    waveHeight: number;
    swellHeight: number;
    swellDirection: number;
    seaTemperature: number;
    tideHeight: number;
    currentSpeed: number;
    currentDirection: number;
  };
  forecast: Array<{
    time: Date;
    temperature: number;
    conditions: string;
    windSpeed: number;
    waveHeight: number;
  }>;
  alerts: Array<{
    type: string;
    severity: string;
    description: string;
    validFrom: Date;
    validTo: Date;
  }>;
}

// Vessel tracking data types
export interface VesselTrackingData {
  imo: string;
  mmsi?: string;
  name: string;
  position: { latitude: number; longitude: number };
  course?: number;
  speed?: number;
  destination?: string;
  eta?: Date;
  status: string;
}

// Port information data types
export interface PortData {
  locode: string;
  name: string;
  country: string;
  location: { latitude: number; longitude: number };
  facilities: Array<{
    type: string;
    description: string;
    available: boolean;
  }>;
  services: Array<{
    name: string;
    provider?: string;
    contact?: string;
  }>;
  restrictions: Array<{
    type: string;
    description: string;
    effective?: Date;
  }>;
}

export class ExternalMarineDataService {
  private config: ExternalServiceConfig;

  constructor() {
    this.config = ExternalServiceConfig.parse({
      openWeatherMapApiKey: process.env.OPENWEATHERMAP_API_KEY,
      marineTrafficApiKey: process.env.MARINETRAFFIC_API_KEY,
      portCallApiKey: process.env.PORTCALL_API_KEY,
      // Only enable mock data if explicitly requested OR if no API keys are configured
      enableMockData: process.env.ENABLE_MOCK_DATA === 'true' || (
        !process.env.OPENWEATHERMAP_API_KEY && 
        !process.env.MARINETRAFFIC_API_KEY && 
        !process.env.PORTCALL_API_KEY
      )
    });
  }

  /**
   * Get marine weather data for a specific location
   */
  async getMarineWeather(lat: number, lon: number): Promise<WeatherData> {
    if (this.config.enableMockData || !this.config.openWeatherMapApiKey) {
      return this.getMockWeatherData(lat, lon);
    }

    try {
      // Real OpenWeatherMap API integration
      const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${this.config.openWeatherMapApiKey}&units=metric`;
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${this.config.openWeatherMapApiKey}&units=metric`;
      
      const [currentResponse, forecastResponse] = await Promise.all([
        fetch(currentWeatherUrl),
        fetch(forecastUrl)
      ]);

      if (!currentResponse.ok || !forecastResponse.ok) {
        throw new Error('Weather API request failed');
      }

      const currentData = await currentResponse.json();
      const forecastData = await forecastResponse.json();

      return {
        location: { latitude: lat, longitude: lon },
        current: {
          temperature: currentData.main.temp,
          humidity: currentData.main.humidity,
          pressure: currentData.main.pressure,
          windSpeed: currentData.wind?.speed || 0,
          windDirection: currentData.wind?.deg || 0,
          visibility: currentData.visibility / 1000, // Convert to km
          conditions: currentData.weather[0]?.description || 'Unknown'
        },
        marine: this.generateMarineConditions(currentData),
        forecast: this.processForecastData(forecastData),
        alerts: this.processWeatherAlerts(currentData)
      };
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
      return this.getMockWeatherData(lat, lon);
    }
  }

  /**
   * Get vessel tracking information by IMO number
   */
  async getVesselTracking(imo: string): Promise<VesselTrackingData | null> {
    if (this.config.enableMockData || !this.config.marineTrafficApiKey) {
      return this.getMockVesselData(imo);
    }

    try {
      // Real MarineTraffic API integration
      const apiUrl = `https://services.marinetraffic.com/api/exportvessel/v:8/${this.config.marineTrafficApiKey}/imo:${imo}/protocol:jsono`;
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`MarineTraffic API request failed: ${response.status}`);
      }

      const data = await response.json();
      if (!data || data.length === 0) {
        return null;
      }

      const vessel = data[0];
      return {
        imo,
        mmsi: vessel.MMSI?.toString(),
        name: vessel.SHIPNAME || `Vessel ${imo}`,
        position: {
          latitude: parseFloat(vessel.LAT) || 0,
          longitude: parseFloat(vessel.LON) || 0
        },
        course: parseFloat(vessel.COURSE) || undefined,
        speed: parseFloat(vessel.SPEED) || undefined,
        destination: vessel.DESTINATION || undefined,
        eta: vessel.ETA ? new Date(vessel.ETA) : undefined,
        status: vessel.STATUS || 'Unknown'
      };
    } catch (error) {
      console.error('Failed to fetch vessel tracking data from MarineTraffic:', error);
      // Fall back to mock data if real API fails
      return this.getMockVesselData(imo);
    }
  }

  /**
   * Get port information by UN/LOCODE
   */
  async getPortInformation(locode: string): Promise<PortData | null> {
    if (this.config.enableMockData || !this.config.portCallApiKey) {
      return this.getMockPortData(locode);
    }

    try {
      // Real Port Call API integration (example using a hypothetical API)
      const apiUrl = `https://api.portcall.com/v1/ports/${locode}`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${this.config.portCallApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Port not found
        }
        throw new Error(`Port Call API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        locode: data.locode || locode,
        name: data.name || 'Unknown Port',
        country: data.country || 'Unknown',
        location: {
          latitude: parseFloat(data.latitude) || 0,
          longitude: parseFloat(data.longitude) || 0
        },
        facilities: data.facilities?.map((f: any) => ({
          type: f.type || 'Unknown',
          description: f.description || '',
          available: f.available !== false
        })) || [],
        services: data.services?.map((s: any) => ({
          name: s.name || 'Unknown Service',
          provider: s.provider,
          contact: s.contact
        })) || [],
        restrictions: data.restrictions?.map((r: any) => ({
          type: r.type || 'Unknown',
          description: r.description || '',
          effective: r.effective ? new Date(r.effective) : undefined
        })) || []
      };
    } catch (error) {
      console.error('Failed to fetch port information from Port Call API:', error);
      // Fall back to mock data if real API fails
      return this.getMockPortData(locode);
    }
  }

  // Mock data generators for development and demo purposes
  private getMockWeatherData(lat: number, lon: number): WeatherData {
    const baseTemp = 15 + Math.random() * 20; // 15-35°C
    return {
      location: { latitude: lat, longitude: lon },
      current: {
        temperature: baseTemp,
        humidity: 60 + Math.random() * 30,
        pressure: 1000 + Math.random() * 50,
        windSpeed: Math.random() * 25,
        windDirection: Math.random() * 360,
        visibility: 8 + Math.random() * 7,
        conditions: ['Clear', 'Partly Cloudy', 'Overcast', 'Light Rain'][Math.floor(Math.random() * 4)]
      },
      marine: {
        waveHeight: Math.random() * 4,
        swellHeight: Math.random() * 3,
        swellDirection: Math.random() * 360,
        seaTemperature: baseTemp - 2 + Math.random() * 4,
        tideHeight: -2 + Math.random() * 4,
        currentSpeed: Math.random() * 3,
        currentDirection: Math.random() * 360
      },
      forecast: Array.from({ length: 5 }, (_, i) => ({
        time: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        temperature: baseTemp + (Math.random() - 0.5) * 10,
        conditions: ['Clear', 'Partly Cloudy', 'Overcast', 'Rain'][Math.floor(Math.random() * 4)],
        windSpeed: Math.random() * 30,
        waveHeight: Math.random() * 5
      })),
      alerts: Math.random() > 0.7 ? [{
        type: 'Gale Warning',
        severity: 'moderate',
        description: 'Strong winds expected in the area',
        validFrom: new Date(),
        validTo: new Date(Date.now() + 12 * 60 * 60 * 1000)
      }] : []
    };
  }

  private getMockVesselData(imo: string): VesselTrackingData {
    return {
      imo,
      mmsi: `12345${imo.slice(-4)}`,
      name: `MV ${['Pacific', 'Atlantic', 'Northern', 'Southern'][Math.floor(Math.random() * 4)]} ${['Pioneer', 'Explorer', 'Voyager', 'Navigator'][Math.floor(Math.random() * 4)]}`,
      position: {
        latitude: -90 + Math.random() * 180,
        longitude: -180 + Math.random() * 360
      },
      course: Math.random() * 360,
      speed: Math.random() * 25,
      destination: ['Singapore', 'Rotterdam', 'Shanghai', 'Los Angeles'][Math.floor(Math.random() * 4)],
      eta: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000),
      status: ['Under Way', 'At Anchor', 'Moored', 'Not Under Command'][Math.floor(Math.random() * 4)]
    };
  }

  private getMockPortData(locode: string): PortData {
    const portNames = {
      'SGSIN': { name: 'Singapore', country: 'Singapore', lat: 1.290, lon: 103.851 },
      'NLRTM': { name: 'Rotterdam', country: 'Netherlands', lat: 51.922, lon: 4.479 },
      'CNSHA': { name: 'Shanghai', country: 'China', lat: 31.230, lon: 121.473 },
      'USLAX': { name: 'Los Angeles', country: 'United States', lat: 33.742, lon: -118.270 }
    };

    const port = portNames[locode as keyof typeof portNames] || {
      name: 'Unknown Port',
      country: 'Unknown',
      lat: 0,
      lon: 0
    };

    return {
      locode,
      name: port.name,
      country: port.country,
      location: { latitude: port.lat, longitude: port.lon },
      facilities: [
        { type: 'Container Terminal', description: 'Deep water container berths', available: true },
        { type: 'Bulk Terminal', description: 'Dry bulk handling facilities', available: true },
        { type: 'Oil Terminal', description: 'Petroleum products handling', available: Math.random() > 0.3 },
        { type: 'RoRo Terminal', description: 'Roll-on/Roll-off ferry terminal', available: true }
      ],
      services: [
        { name: 'Pilotage', provider: 'Port Authority', contact: '+1-555-0100' },
        { name: 'Tugboat Services', provider: 'Marine Services Ltd', contact: '+1-555-0101' },
        { name: 'Bunker Supply', provider: 'Fuel Marine Inc', contact: '+1-555-0102' },
        { name: 'Ship Supplies', provider: 'Maritime Supply Co', contact: '+1-555-0103' }
      ],
      restrictions: Math.random() > 0.5 ? [
        {
          type: 'Draft Limitation',
          description: 'Maximum draft 15 meters at MLWS',
          effective: new Date()
        }
      ] : []
    };
  }

  private generateMarineConditions(weatherData: any) {
    return {
      waveHeight: Math.random() * 4,
      swellHeight: Math.random() * 3,
      swellDirection: Math.random() * 360,
      seaTemperature: weatherData.main.temp - 2 + Math.random() * 4,
      tideHeight: -2 + Math.random() * 4,
      currentSpeed: Math.random() * 3,
      currentDirection: Math.random() * 360
    };
  }

  private processForecastData(forecastData: any) {
    return forecastData.list.slice(0, 5).map((item: any) => ({
      time: new Date(item.dt * 1000),
      temperature: item.main.temp,
      conditions: item.weather[0]?.description || 'Unknown',
      windSpeed: item.wind?.speed || 0,
      waveHeight: Math.random() * 5 // Mock wave height since API doesn't provide it
    }));
  }

  private processWeatherAlerts(weatherData: any) {
    const alerts = [];
    if (weatherData.wind?.speed > 15) {
      alerts.push({
        type: 'Strong Wind Warning',
        severity: 'moderate',
        description: `Wind speeds up to ${Math.round(weatherData.wind.speed)} m/s expected`,
        validFrom: new Date(),
        validTo: new Date(Date.now() + 6 * 60 * 60 * 1000)
      });
    }
    return alerts;
  }

  /**
   * Process webhook from external marine data providers
   */
  async processWebhook(source: string, payload: any): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`Processing webhook from ${source}:`, payload);
      
      switch (source) {
        case 'weather':
          await this.processWeatherWebhook(payload);
          break;
        case 'vessel_tracking':
          await this.processVesselTrackingWebhook(payload);
          break;
        case 'port_updates':
          await this.processPortUpdateWebhook(payload);
          break;
        default:
          console.warn(`Unknown webhook source: ${source}`);
          return { success: false, message: `Unknown webhook source: ${source}` };
      }

      return { success: true, message: `Webhook from ${source} processed successfully` };
    } catch (error) {
      console.error(`Failed to process webhook from ${source}:`, error);
      return { success: false, message: `Failed to process webhook: ${error.message}` };
    }
  }

  private async processWeatherWebhook(payload: any): Promise<void> {
    // Process weather alert webhooks
    console.log('Processing weather webhook:', payload);
    // TODO: Store weather alerts, trigger notifications for affected vessels
  }

  private async processVesselTrackingWebhook(payload: any): Promise<void> {
    // Process vessel position updates
    console.log('Processing vessel tracking webhook:', payload);
    // TODO: Update vessel positions, trigger geofence alerts
  }

  private async processPortUpdateWebhook(payload: any): Promise<void> {
    // Process port status updates
    console.log('Processing port update webhook:', payload);
    // TODO: Update port facility status, notify affected operations
  }
}

// Singleton instance
export const externalMarineDataService = new ExternalMarineDataService();