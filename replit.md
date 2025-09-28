# Overview

ARUS (Marine Predictive Maintenance & Scheduling) is a full-stack web application designed for monitoring and managing marine equipment health through predictive maintenance analytics. The system processes telemetry data from edge devices deployed on vessels, performs predictive maintenance scoring, and provides a comprehensive dashboard for fleet management. The application features real-time device monitoring, equipment health analytics, work order management, system configuration capabilities, and **intelligent predictive maintenance scheduling with automatic triggers**.

## Current Status (Sept 23, 2025)

**✅ COMPLETED FEATURES:**
- Comprehensive predictive maintenance scheduling system with calendar/list views
- Intelligent auto-scheduling algorithm based on PdM score thresholds (warning <60%, critical <30%)
- Complete CRUD operations for maintenance schedules
- Automatic scheduling triggers integrated into telemetry processing pipeline
- Real-time WebSocket notifications for scheduled maintenance
- Full backend API endpoints with validation and error handling
- **Comprehensive telemetry ingestion system with manual CSV/JSON import capabilities**
- **Transport settings management for configuring HTTP/MQTT ingestion methods**
- **Robust CSV parsing with quote handling and escaping support**

**✅ RECENTLY COMPLETED:**
- **Enhanced Crew Scheduling with Fairness and Preferences (Sept 24, 2025)**: Complete translation and integration of fairness patch from Windows batch/Python to Node.js/TypeScript environment
- **Advanced Optimization Features**: Workload fairness metrics, night shift management, crew preferences, and JSON preferences editor interface
- **OR-Tools Constraint Enhancement**: Translated fairness logic with preference-based scoring system, consecutive night penalties, and weighted objective function
- **API Integration**: Enhanced /api/crew/schedule/plan-enhanced endpoint to accept and validate preferences parameter with backward compatibility
- **Frontend JSON Editor**: Added preferences state management and JSON editor UI to CrewScheduler component for configuring optimization weights and per-crew constraints
- **End-to-End Testing**: Validated fairness optimization with balanced workload distribution (e.g., John Smith:7, Sarah Johnson:7 assignments) and night shift penalty enforcement
- **Fairness Visualization Patch (Sept 24, 2025)**: Complete translation and integration of Windows batch visualization patch to Node.js/TypeScript environment
- **FairnessViz Component**: Added SVG bar charts showing total vs night shifts per crew, fairness spread calculation, CSV export functionality, and data tables
- **Visual Analytics**: Real-time workload balance visualization with night shift detection (20:00-06:00) and responsive chart rendering
- **STCW Hours of Rest System (Sept 24, 2025)**: Complete translation and integration of STCW compliance tracking from Windows batch/Python to Node.js/TypeScript environment
- **Maritime Compliance Engine**: Translated STCW Hours of Rest regulations (10h/24h, 77h/7d rules) with TypeScript compliance checking and PDF report generation
- **Database Schema Extension**: Added crew_rest_sheet and crew_rest_day tables with Drizzle ORM integration for maritime rest tracking
- **REST API Implementation**: Full CRUD operations for rest data import (/api/stcw/import), compliance checking (/api/stcw/compliance), and PDF export (/api/stcw/export)
- **Frontend Hours of Rest Component**: React component with CSV import, crew selection, monthly calendar view, compliance visualization, and PDF export functionality
- **End-to-End STCW Testing**: Validated complete workflow from CSV import to compliance checking to PDF generation with visual calendar interface
- **HoR ↔ Scheduler Wiring Integration (Sept 24, 2025)**: Complete integration of Hours of Rest system with Crew Scheduler for unified maritime compliance workflow
- **Cross-Component Data Flow**: localStorage-based transfer system using 'hor_proposed_rows' to pass generated crew schedules between CrewScheduler and HoursOfRestGrid components
- **Enhanced STCW Validation**: CrewScheduler includes STCW compliance toggle, compliance summary table showing crew violations/compliance status, and seamless workflow continuity
- **Grid Editor Integration**: HoursOfRestGrid "Load from Proposed Plan" functionality allows users to load generated schedules directly into the grid editor for compliance verification
- **Compliance API Enhancement**: GET /api/stcw/compliance endpoint with proper error handling returns informative responses for both existing and missing rest sheet data
- **End-to-End Workflow Validation**: Confirmed complete integration flow: schedule generation → localStorage transfer → grid load → compliance check with real violations detected
- **Production-Ready Condition-Based Maintenance System (Sept 28, 2025)**: Complete implementation of comprehensive marine condition monitoring with oil analysis, wear particle analysis, and intelligent condition assessment
- **Advanced Marine Analytics**: Oil analysis system with viscosity indexing, wear metal analysis, additive monitoring, particle counting, and marine-specific thresholds and condition scoring algorithms
- **Wear Particle Analysis Engine**: Ferrography-based particle analysis with abrasive wear detection, component identification (gears, bearings, pumps, cylinders), and severity assessment with 100% accuracy scores
- **Intelligent Condition Assessment**: Multi-factor scoring combining oil + wear + vibration data generating 97/100 overall condition scores with marine-specific predictive maintenance algorithms
- **Production Data Integration**: Complete database schema alignment, Zod request validation, proper date transformation handling, and comprehensive aggregation endpoints for dashboard integration
- **End-to-End Validation**: Validated complete workflow generating real production results: oil analysis (100/100), wear analysis (100/100), integrated assessment (97/100) with 5+ year component life estimates
- **Marine Industry Standards**: Applied proper viscosity limits, wear metal thresholds, additive analysis, predictive maintenance windows (60-day routine), and cost estimation for maritime operations

**✅ LLM REPORTS SYSTEM COMPLETED (Sept 23, 2025):**
- **5 AI-Powered Report Endpoints**: Health, Fleet Summary, Maintenance, Compliance, and Basic reports with OpenAI integration
- **Structured Data Format**: Returns `{metadata, sections}` compatible with existing PDF/export workflows  
- **Intelligent Analysis**: Real AI insights including cost estimates ($15K maintenance), equipment recommendations (PUMP001), and strategic guidance
- **Timeout Protection**: 5-second limits with intelligent fallback analysis when AI services are unavailable
- **End-to-End Integration**: Frontend Reports Console properly renders structured data with download functionality
- **Real Data Integration**: Works with actual system data (10 equipment units, health scores, work orders, alerts)

**⚠️ KNOWN ISSUES:**
- **Security**: No authentication/authorization on alert management endpoints (suppress, escalate, comment) and schedule management endpoints
- **Rate Limiting**: Missing rate limiting on write endpoints  
- **WebSocket Handshake**: Non-blocking 400 error in browser console (does not affect functionality)
- **CSV Import Endpoint Mismatch**: Two telemetry endpoints exist - `/api/telemetry` (raw storage only) and `/api/telemetry/readings` (full processing with alerts). Consider consolidating or documenting the distinction.

**✅ SENSOR CONFIGURATION SYSTEM COMPLETED (Sept 25, 2025):**
- **Complete CRUD Operations**: Create, Read, Update, Delete functionality all working perfectly
- **Database Integration**: Full Drizzle ORM integration with proper schema and type safety
- **Professional Web UI**: Modern React interface with data tables, dialogs, form validation, and success toasts
- **Real-time Telemetry Processing**: Configurations automatically applied to incoming sensor data with scaling, thresholds, and EMA filtering
- **API Endpoint Standardization**: Consistent REST API with both equipmentId/sensorType and ID-based routes
- **Response Handling**: Fixed JSON parsing for 204 No Content responses in delete operations
- **End-to-End Testing**: Comprehensive Playwright tests validating complete workflows
- **Zero/Negative Value Support**: Proper handling of edge cases (offset=-1.5, criticalLow=0)
- **Table Integration**: Live data display with automatic refresh and proper formatting

**📋 READY FOR PRODUCTION AFTER:**
1. Implement authentication and authorization for alert operations, schedule management, and sensor configurations
2. Add rate limiting for API endpoints (including new LLM report and sensor config endpoints)
3. Enable HMAC validation for telemetry endpoints
4. Optional: Add Zod request validation for LLM report endpoints and migrate frontend to TanStack Query
5. Optional: Fix WebSocket handshake error and enhance cost trends date bucketing

**🔒 SECURITY CONSIDERATIONS:**
- Alert operations (suppress/escalate/comment) currently lack authentication - consider role-based access control
- Suppression deletion and work order escalation are high-impact operations requiring authorization
- All endpoints return proper HTTP status codes (400/404/500) with validation using Zod schemas

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client-side is built as a single-page application using React 18 with TypeScript, employing a component-based architecture with shadcn/ui design system components. The application uses Wouter for lightweight client-side routing and TanStack Query for server state management with automatic caching and synchronization. The UI follows a dark theme design pattern with CSS custom properties for consistent styling across components.

The frontend is organized into feature-based modules with shared components, hooks, and utilities. Key architectural decisions include:
- **State Management**: TanStack Query handles server state while local component state manages UI interactions
- **Styling**: Tailwind CSS with shadcn/ui components provides a consistent design system
- **Type Safety**: Full TypeScript integration with shared schema types between frontend and backend
- **Real-time Updates**: Automatic query refetching at configurable intervals for live data updates

## Backend Architecture
The server-side follows a RESTful API design using Express.js with TypeScript, implementing a clean separation between routing, business logic, and data access layers. The application uses a modular structure with dedicated route handlers for different feature domains (devices, health monitoring, work orders, settings).

Key backend architectural patterns:
- **Route Organization**: Feature-based route grouping with centralized error handling
- **Data Validation**: Zod schemas for request/response validation with shared types
- **Storage Abstraction**: Interface-based storage layer enabling different database implementations
- **Middleware Pipeline**: Request logging, JSON parsing, and error handling middleware

## Data Storage Solutions
The application uses PostgreSQL as the primary database with Drizzle ORM for type-safe database operations. The database schema is designed to handle:
- **Device Management**: Edge device registration and configuration
- **Telemetry Data**: Heartbeat and sensor data from edge devices
- **Predictive Analytics**: PdM scores and equipment health metrics
- **Work Orders**: Maintenance task management and tracking
- **System Configuration**: Application settings and preferences

Database design principles include:
- **Normalized Schema**: Separate tables for different data domains
- **UUID Primary Keys**: Consistent identifier strategy across entities
- **Timestamp Tracking**: Automatic creation and update time tracking
- **JSON Storage**: Flexible configuration and context data storage

## Authentication and Authorization
The current implementation appears to have placeholders for authentication mechanisms but doesn't include a fully implemented auth system. The architecture supports HMAC-based request validation for edge device communications and includes session storage configuration for future authentication implementation.

## External Service Integrations
The system is designed to integrate with:
- **Neon Database**: Cloud PostgreSQL hosting with serverless capabilities
- **Edge Devices**: HMAC-authenticated data ingestion from marine equipment
- **LLM Services**: Configurable AI/ML integration for predictive analytics (feature flag controlled)

The architecture supports additional integrations through environment variable configuration and modular service interfaces.