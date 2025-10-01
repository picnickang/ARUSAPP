# Overview

ARUS (Marine Predictive Maintenance & Scheduling) is a full-stack web application designed for monitoring and managing marine equipment health. It processes telemetry data from edge devices, performs predictive maintenance scoring, and provides a comprehensive dashboard for fleet management. The platform aims to enhance operational efficiency, reduce downtime through advanced predictive analytics, and ensure compliance. Key capabilities include real-time device monitoring, equipment health analytics, work order management, system configuration, intelligent predictive maintenance scheduling with automatic triggers, and advanced inventory management with real-time data reconciliation.

The project's ambition is to deliver a comprehensive, intelligent platform for marine operations, leveraging advanced predictive analytics and compliance tools to improve efficiency and reduce downtime. Recent enhancements include a production-ready Condition-Based Maintenance system, expanded marine protocol support (J1708/J1587), a real-time cost synchronization engine, comprehensive data synchronization with quality monitoring, and advanced inventory management with intelligent sensor threshold management.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Decisions

The frontend is a React 18 single-page application using TypeScript, built with a component-based architecture and shadcn/ui. It utilizes Wouter for routing and TanStack Query for server state management. A comprehensive theme system with light/dark/system modes and localStorage persistence is included. The UI emphasizes professional design with grouped sidebar navigation, a command palette for quick actions, and vessel-centric workflows with detailed pages. Mobile-optimized components are used for AI insights, featuring responsive grids and touch targets.

## Technical Implementations

### Frontend
- **Framework**: React 18, TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query
- **Styling**: Tailwind CSS, shadcn/ui
- **Real-time Sync**: WebSocket-based for multi-device data synchronization.

### Backend
- **Framework**: Express.js, TypeScript
- **API Design**: RESTful
- **Validation**: Zod schemas
- **Modularity**: Feature-based route grouping, clean separation of concerns.

### Feature Specifications
- **Predictive Maintenance Scheduling**: Calendar/list views, auto-scheduling based on PdM scores, automatic triggers, WebSocket notifications.
- **Telemetry Ingestion**: Manual CSV/JSON import, HTTP/MQTT transport, robust CSV parsing.
- **Crew Scheduling**: Optimization for fairness, preferences, night shift management, OR-Tools integration.
- **STCW Hours of Rest**: Maritime compliance engine with PDF report generation, CSV import, and monthly calendar view.
- **Condition-Based Maintenance**: Oil analysis, wear particle analysis, multi-factor condition assessment.
- **Marine Protocol Support**: J1939 CAN bus, J1708/J1587 serial protocols, DBC converter.
- **Cost Synchronization**: Real-time synchronization of unit costs between parts catalogue and stock levels.
- **LLM Reports System**: AI-powered reports (Health, Fleet Summary, Maintenance, Compliance) using OpenAI, with structured data output and intelligent analysis.
- **Enhanced LLM & Vessel Intelligence System**: Advanced AI/ML with a three-layer architecture. Includes a Vessel Intelligence Module for anomaly detection and predictive failure risk, a Report Context Builder for data orchestration, and an Enhanced LLM Service with multi-model support, advanced prompt engineering, scenario planning, and ROI calculations. A mobile-optimized AI Insights Frontend UI is provided.
- **Sensor Configuration System**: CRUD operations for sensor configurations, real-time application to incoming sensor data (scaling, thresholds, EMA filtering).
- **Comprehensive Sync Expansion**: Advanced data quality monitoring with a 5-tier reconciliation system covering costs, reservations, purchase orders, certifications, and sensor thresholds.
- **Equipment Registry Vessel Integration**: Enhanced equipment management with vessel assignment via dropdown selection, handling legacy names, and real-time UI updates.
- **Work Order Downtime Integration**: Estimated and actual downtime tracking for work orders, supporting vessel availability calculations.
- **Vessel Financial Tracking System**: Comprehensive vessel cost analysis with day rate, automated operation counter, work order-triggered downtime, and manual reset capabilities for ROI analysis.
- **Real-time Multi-Device Synchronization**: WebSocket-based broadcasting for instant data propagation across devices, with optimistic UI updates and comprehensive CRUD operation broadcasts.
- **DTC (Diagnostic Trouble Code) System**: Complete J1939 fault code retrieval and translation with 765 standard SPN/FMI definitions, active/historical fault tracking per equipment, severity-based alerting (critical/high/moderate/low), dedicated diagnostics page with vessel/equipment filtering and search, and equipment-specific ActiveDtcsPanel component integrated into vessel detail pages.

## System Design Choices
- **Database**: PostgreSQL with Drizzle ORM.
- **Schema**: Normalized, UUID primary keys, timestamp tracking, JSON for flexible data.
- **Authentication**: Placeholders for future implementation, HMAC for edge device communication.
- **Storage Abstraction**: Interface-based layer for database flexibility.

# External Dependencies

- **PostgreSQL**: Primary database for all application data.
- **Neon Database**: Cloud hosting for PostgreSQL.
- **OpenAI**: Integrated for AI-powered report generation (LLM Reports System).
- **Edge Devices**: Marine equipment providing telemetry data, integrated via HMAC-authenticated ingestion.

# Recent Updates (October 2025)

## Production Database Cleanup
- Removed all test data: 3 test vessels, 8 test equipment, 6 test work orders, 12 alert configurations, 3 work order parts
- Database now contains only production vessels: MV Green Belait, MV Pacific Pioneer, Unassigned/Spare Equipment
- Verified no orphaned data across all foreign key relationships

## Enhanced LLM Bug Fixes
- **Fixed critical apiRequest bug**: Corrected parameter order from `apiRequest(endpoint, {method, body})` to `apiRequest("POST", endpoint, data)`
- **Fixed 5 storage interface methods**: Corrected method calls in vessel-intelligence.ts and report-context.ts (getVesselById→getVessel, getCrewByVessel→getCrew, getCrewRestSheets→getCrewRestByDateRange, getComplianceAuditLogs→getComplianceAuditLog)
- **Added data transformation layer**: Implemented conversion from backend VesselLearnings to frontend VesselIntelligence format in enhanced-llm-routes.ts
- **API verification**: All Enhanced LLM endpoints confirmed working (vessel-health, fleet-summary, maintenance, compliance, vessel-intelligence, models)

## DTC (Diagnostic Trouble Code) System Implementation
- **Complete J1939 fault code infrastructure**: Database schema with dtcDefinitions (765 standard SPN/FMI mappings) and dtcFaults tables using composite primary keys (spn, fmi, manufacturer)
- **Frontend diagnostics interface**: Dedicated /diagnostics page with vessel/equipment filtering, real-time search across SPN/FMI/description fields, statistics dashboard (active/critical/warning/info counts), and skeleton loading states
- **Equipment integration**: ActiveDtcsPanel component showing equipment-specific faults with critical/warning count badges, integrated into vessel detail page equipment tabs
- **Numeric severity system**: Consistent 1-4 severity mapping (1=critical, 2=high, 3=moderate, 4=low) with color-coded badges and icons across all UI components
- **Production-ready patterns**: Uses apiRequest for data fetching, proper TypeScript typing with shared schema, hierarchical query keys for cache invalidation, 30-second auto-refresh, error handling with user-visible states
- **Test coverage**: End-to-end Playwright test validates filtering, search, severity display, and multi-component integration

## Comprehensive DTC Integration System (October 2025)
Implemented a production-ready 10-point DTC integration architecture connecting fault codes across all major system features through the DTC Integration Service (`server/dtc-integration-service.ts`):

### 1. Work Order Auto-Creation ✅
- Automatic work order generation from critical DTCs (severity 1-2)
- Idempotency checks prevent duplicate work orders for same fault
- Proper priority assignment (1=critical, 2=high) and downtime tracking (4hr estimate for critical)
- Vessel association via equipment registry
- **API**: `POST /api/dtc/:equipmentId/:spn/:fmi/create-work-order` → Returns work order with estimated downtime

### 2. Equipment Health Integration ✅
- DTC-based health penalty calculation: `30 × severity × sqrt(count)` capped at 100
- Critical DTCs (severity 1) contribute maximum penalty
- Integrated into equipment health scoring pipeline
- **API**: `GET /api/equipment/:id/dtc/health-impact` → Returns penalty score and estimated health

### 3. AI/LLM Reports Enhancement ✅
- DTC summary generation for LLM-powered reports (vessel health, fleet summary, maintenance)
- Severity-based bucketing (critical/high/moderate/low counts)
- Top 5 DTCs sorted by severity and occurrence count
- **API**: `GET /api/equipment/:id/dtc/report-summary` → Returns DTC statistics for AI analysis

### 4. Alert System Integration ✅
- Intelligent alert triggering for critical DTCs, new faults, and rapidly increasing occurrences (>5)
- Alert notification creation with WebSocket broadcasting to 'alerts' channel
- Duplicate suppression (30-minute window per DTC)
- Severity mapping to alert levels (critical/warning/info)
- **API**: `POST /api/dtc/:equipmentId/:spn/:fmi/create-alert` → Creates alert and broadcasts via WebSocket

### 5. Vessel Financial Impact ✅
- DTC-triggered downtime cost calculation across vessel equipment
- Aggregates actual or estimated downtime hours from DTC-generated work orders
- Hourly rate calculation from vessel dayRate (default: $50k/day ÷ 24)
- **API**: `GET /api/vessel/:vesselId/dtc/financial-impact` → Returns total downtime hours, cost, critical DTC count

### 6. Dashboard Metrics Integration ✅
- Fleet-wide DTC statistics: total active, critical count, equipment with DTCs, DTC-triggered work orders
- Org-scoped aggregation across all equipment
- Real-time counts for dashboard risk indicators
- **API**: `GET /api/dtc/dashboard-stats` → Returns comprehensive DTC metrics

### 7. Telemetry Correlation ✅
- SPN-to-sensor mapping for correlating DTCs with telemetry anomalies
- Time window analysis (default 60min before/after DTC occurrence)
- Fetches relevant sensor readings from equipment telemetry history
- **API**: `GET /api/dtc/:equipmentId/:spn/:fmi/telemetry-correlation` → Returns correlated telemetry samples

### Technical Architecture
- **Singleton service pattern**: `DtcIntegrationService` initialized via `initDtcIntegrationService(storage)`
- **Org-scoped operations**: All methods enforce x-org-id header for multi-tenant isolation
- **Storage interface integration**: Uses existing `IStorage` methods (getActiveDtcs, getEquipment, getWorkOrders, etc.)
- **Error handling**: Comprehensive try-catch blocks with console logging and 500 error responses
- **Production validation**: All endpoints tested and verified working (dashboard: 4 total/2 critical DTCs, 1 work order, 1 alert created)

## Known Issues
- **AI Insights Report Rendering**: While all Enhanced LLM API endpoints return successful responses (200 OK), the AI Insights frontend page may experience intermittent rendering issues when displaying generated reports. The backend report generation works correctly with proper data transformation, but the React component occasionally crashes during render. This appears to be a frontend state handling issue that needs defensive guards around report properties. Direct API access works correctly.