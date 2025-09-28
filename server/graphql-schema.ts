import { gql } from 'graphql-tag';

export const typeDefs = gql`
  scalar Date
  scalar JSON

  type Query {
    # Core Fleet Management
    vessels: [Vessel!]!
    vessel(id: ID!): Vessel
    equipment(vesselId: ID): [Equipment!]!
    
    # Telemetry & Analytics
    telemetryReadings(
      vesselId: ID
      equipmentId: ID
      sensorType: String
      limit: Int = 50
      startDate: Date
      endDate: Date
    ): [TelemetryReading!]!
    
    # Advanced Analytics (Phase 1-3)
    mqttStatus: MQTTStatus!
    mlAnalytics(equipmentId: ID!): MLAnalytics
    digitalTwin(vesselId: ID!): DigitalTwin
    
    # External Integrations (Phase 4)
    marineWeather(lat: Float!, lon: Float!): WeatherData
    vesselTracking(imo: String!): VesselTrackingData
    portInformation(locode: String!): PortData
    
    # Unified Dashboard
    dashboardData(vesselId: ID): DashboardData!
  }

  type Mutation {
    # Telemetry Operations
    ingestTelemetry(data: TelemetryInput!): TelemetryReading!
    
    # Work Order Management
    createWorkOrder(input: WorkOrderInput!): WorkOrder!
    updateWorkOrder(id: ID!, input: WorkOrderUpdateInput!): WorkOrder!
    
    # Advanced Operations
    startMLAnalysis(equipmentId: ID!): MLAnalysisJob!
    createDigitalTwin(input: DigitalTwinInput!): DigitalTwin!
    
    # External System Webhooks
    processWebhook(source: String!, payload: JSON!): WebhookResponse!
  }

  type Subscription {
    # Real-time Updates
    telemetryUpdates(vesselId: ID): TelemetryReading!
    alertUpdates: Alert!
    dashboardUpdates(vesselId: ID): DashboardData!
    
    # Advanced Analytics Updates
    mlAnalysisUpdates: MLAnalysisResult!
    digitalTwinUpdates(vesselId: ID!): DigitalTwinState!
  }

  # Core Types
  type Vessel {
    id: ID!
    name: String!
    vesselType: String
    imo: String
    equipment: [Equipment!]!
    location: Location
    status: VesselStatus!
    lastUpdate: Date
  }

  type Equipment {
    id: ID!
    vesselId: ID!
    name: String!
    type: String!
    status: EquipmentStatus!
    sensors: [Sensor!]!
    healthScore: Float
    lastMaintenance: Date
  }

  type TelemetryReading {
    id: ID!
    vesselId: String!
    equipmentId: String!
    sensorType: String!
    value: Float!
    unit: String
    timestamp: Date!
    quality: String
  }

  # Advanced Analytics Types
  type MQTTStatus {
    service: String!
    status: String!
    activeStreams: Int!
    totalBufferedPoints: Int!
    features: [String!]!
  }

  type MLAnalytics {
    equipmentId: ID!
    anomalyScore: Float!
    predictedFailureDate: Date
    confidenceLevel: Float!
    recommendations: [String!]!
    patterns: [AnalysisPattern!]!
  }

  type DigitalTwin {
    id: ID!
    vesselId: ID!
    state: DigitalTwinState!
    simulations: [Simulation!]!
    realTimeSync: Boolean!
  }

  # External Integration Types
  type WeatherData {
    location: Location!
    current: CurrentWeather!
    forecast: [WeatherForecast!]!
    marine: MarineConditions!
    alerts: [WeatherAlert!]!
  }

  type VesselTrackingData {
    imo: String!
    mmsi: String
    name: String!
    position: Location!
    course: Float
    speed: Float
    destination: String
    eta: Date
    status: String!
  }

  type PortData {
    locode: String!
    name: String!
    country: String!
    location: Location!
    facilities: [PortFacility!]!
    services: [PortService!]!
    restrictions: [PortRestriction!]!
  }

  # Supporting Types
  type Location {
    latitude: Float!
    longitude: Float!
    accuracy: Float
  }

  type CurrentWeather {
    temperature: Float!
    humidity: Float!
    pressure: Float!
    windSpeed: Float!
    windDirection: Float!
    visibility: Float!
    conditions: String!
  }

  type MarineConditions {
    waveHeight: Float!
    swellHeight: Float!
    swellDirection: Float!
    seaTemperature: Float!
    tideHeight: Float!
    currentSpeed: Float!
    currentDirection: Float!
  }

  type DashboardData {
    activeDevices: Int!
    fleetHealth: Float!
    openWorkOrders: Int!
    criticalAlerts: Int!
    vessels: [VesselSummary!]!
    analytics: AnalyticsSummary!
  }

  # Input Types
  input TelemetryInput {
    vesselId: String!
    equipmentId: String!
    sensorType: String!
    value: Float!
    unit: String
    timestamp: Date
  }

  input WorkOrderInput {
    title: String!
    description: String!
    equipmentId: String!
    priority: String!
    scheduledDate: Date
  }

  input WorkOrderUpdateInput {
    title: String
    description: String
    status: String
    priority: String
    scheduledDate: Date
  }

  input DigitalTwinInput {
    vesselId: ID!
    configuration: JSON!
  }

  # Enums
  enum VesselStatus {
    ACTIVE
    INACTIVE
    MAINTENANCE
    EMERGENCY
  }

  enum EquipmentStatus {
    OPERATIONAL
    WARNING
    CRITICAL
    OFFLINE
  }

  # Additional Types
  type Sensor {
    id: ID!
    type: String!
    unit: String!
    lastReading: Float
    lastUpdate: Date
  }

  type AnalysisPattern {
    type: String!
    confidence: Float!
    description: String!
    impact: String!
  }

  type DigitalTwinState {
    position: Location!
    speed: Float!
    heading: Float!
    fuel: Float!
    engineStatus: JSON!
    environmentalData: JSON!
    lastSync: Date!
  }

  type Simulation {
    id: ID!
    name: String!
    type: String!
    status: String!
    results: JSON
    createdAt: Date!
  }

  type WeatherForecast {
    time: Date!
    temperature: Float!
    conditions: String!
    windSpeed: Float!
    waveHeight: Float!
  }

  type WeatherAlert {
    type: String!
    severity: String!
    description: String!
    validFrom: Date!
    validTo: Date!
  }

  type PortFacility {
    type: String!
    description: String!
    available: Boolean!
  }

  type PortService {
    name: String!
    provider: String
    contact: String
  }

  type PortRestriction {
    type: String!
    description: String!
    effective: Date
  }

  type VesselSummary {
    id: ID!
    name: String!
    status: VesselStatus!
    healthScore: Float!
    location: Location
    lastUpdate: Date!
  }

  type AnalyticsSummary {
    totalTelemetryPoints: Int!
    anomaliesDetected: Int!
    predictiveInsights: Int!
    mlModelsActive: Int!
  }

  type MLAnalysisJob {
    id: ID!
    equipmentId: ID!
    status: String!
    startedAt: Date!
  }

  type MLAnalysisResult {
    jobId: ID!
    equipmentId: ID!
    results: MLAnalytics!
    completedAt: Date!
  }

  type WebhookResponse {
    success: Boolean!
    message: String!
    processedAt: Date!
  }

  type Alert {
    id: ID!
    type: String!
    severity: String!
    message: String!
    vesselId: String
    equipmentId: String
    timestamp: Date!
  }
`;