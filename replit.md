# Overview

ARUS (Marine Predictive Maintenance & Scheduling) is a full-stack web application designed for monitoring marine equipment health, processing telemetry data, and performing predictive maintenance. Its core purpose is to enhance operational efficiency, reduce downtime through advanced predictive analytics, and ensure regulatory compliance for marine fleets. Key capabilities include real-time device monitoring, equipment health analytics, intelligent predictive maintenance scheduling, and advanced inventory management. The project aims to deliver a comprehensive, intelligent platform leveraging advanced predictive analytics and compliance tools to improve fleet management.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Changes

## October 6, 2025 - Sensor-Equipment-Inventory Linkage System
- **Comprehensive Linkage Architecture**: Implemented intelligent connection between sensor management, sensor configuration, and inventory systems to enable equipment-aware parts recommendations
  - **Storage Interface Methods** (server/storage.ts):
    - `getPartsForEquipment`: Retrieves all parts compatible with specific equipment (via `compatibleEquipment` array)
    - `getEquipmentForPart`: Retrieves all equipment compatible with a specific part
    - `suggestPartsForSensorIssue`: Intelligent parts suggestion based on equipment sensor issues with keyword matching
    - `getEquipmentWithSensorIssues`: Identifies all equipment with sensor threshold violations (warning/critical)
    - `updatePartCompatibility`: Updates equipment compatibility list for a part
  - **Implementation**: Both MemStorage and DatabaseStorage support all linkage methods
  - **API Endpoints** (server/routes.ts):
    - `GET /api/equipment/:equipmentId/compatible-parts` - Fetch compatible parts
    - `GET /api/parts/:partId/compatible-equipment` - Fetch compatible equipment
    - `GET /api/equipment/:equipmentId/suggested-parts?sensorType=X` - Sensor-based suggestions
    - `GET /api/equipment/sensor-issues?severity=X` - Equipment with sensor issues
    - `PATCH /api/parts/:partId/compatibility` - Update compatibility
    - `POST /api/work-orders/with-suggestions` - Work order creation with automatic sensor-based parts suggestions
- **Intelligent Parts Recommendation Logic**:
  - Filters parts by equipment compatibility FIRST (critical requirement)
  - Then applies sensor-type keyword matching (temperature → cooling/thermostat, pressure → pump/valve, etc.)
  - Ensures only compatible parts are suggested, maintaining data integrity
  - Returns all compatible parts if no keyword matches found
- **Linkage Chain**: Sensors → Sensor Configuration → Equipment → Parts (via compatibleEquipment) → Work Orders → Work Order Parts
- **Schema Usage**: Uses existing `parts` table with `compatibleEquipment` text array field for equipment-to-parts relationships

## October 5, 2025 - Data Handling, LLM Intelligence & Processing Improvements
- **Enhanced OpenAI Integration Resilience**:
  - Added safe JSON parsing with try-catch blocks to all 3 LLM response handlers (equipment analysis, fleet analysis, maintenance recommendations)
  - Implemented exponential backoff retry mechanism with intelligent error handling
  - Added automatic model fallback: gpt-4o → gpt-4o-mini on rate limits and overload errors
  - Rate limit detection now handles multiple patterns: "rate limit", "rate_limit", "rate-limit", plus OpenAI error codes
  - Dynamic token allocation based on input size (scales from base tokens to 4096 max)
- **Security Enhancements**:
  - Improved CSV export injection protection with comprehensive sanitization (=, +, -, @, tabs, newlines, pipes)
  - Protects against Excel formula injection attacks
- **Performance & Resource Management**:
  - Reduced AI insights throttling from 5 to 2 minutes (configurable via `system_settings.ai_insights_throttle_minutes`)
  - Added buffer size limits: J1939 collector (5000 max), MQTT ingestion (1000 max) to prevent memory issues
  - Emergency buffer trimming when flush operations fail
  - Configurable timestamp validation tolerance (default 5 minutes via `system_settings.timestamp_tolerance_minutes`)
- **System Configuration**:
  - All timing and tolerance settings now stored in database for runtime configurability
  - Applied timestamp tolerance across all telemetry endpoints (HTTP, MQTT, J1939)

## October 5, 2025 - Enhanced Frontend Error Handling & WebSocket Fixes
- Enhanced JavaScript error handling in Advanced Analytics page query handlers
  - Added comprehensive try-catch blocks to all data queries to catch any fetch or JSON parsing errors
  - All data queries properly check `res.ok` before parsing JSON
  - Return empty arrays on any error (API errors, network errors, JSON parsing errors)
  - Prevents "X.map is not a function" errors from propagating to the UI
  - Applied to all queries: ML Models, Anomaly Detections, Failure Predictions, Threshold Optimizations, Digital Twins, and Insight Snapshots
  - Added error logging to console for debugging while maintaining graceful degradation
- Improved date formatting in Advanced Analytics page
  - Enhanced `formatDate` function to handle invalid, undefined, or null timestamps
  - Displays "N/A" instead of "Invalid Date" when timestamps are malformed
  - Prevents UI rendering issues with date fields
- Removed noisy WebSocket error logging from client
  - WebSocket error events don't provide useful information (just `{isTrusted: true}`)
  - Error handling still in place (sets `isConnecting` to false)
  - Automatic reconnection logic preserved

## October 5, 2025 - Database Schema Fix
- Fixed critical database schema mismatch causing API failures on Advanced Analytics page
- Added missing outcome tracking columns to `anomaly_detections` table:
  - `outcome_verified_at`, `outcome_verified_by`, `actual_failure_occurred`, `resolved_by_work_order_id`
- Added missing outcome tracking columns to `failure_predictions` table:
  - `outcome_verified_at`, `outcome_verified_by`, `actual_failure_date`, `actual_failure_mode`, `prediction_accuracy`, `time_to_failure_error`, `resolved_by_work_order_id`
- Both `/api/analytics/anomaly-detections` and `/api/analytics/failure-predictions` endpoints now return valid arrays

# System Architecture

## UI/UX Decisions

The frontend is a React 18 single-page application built with TypeScript, featuring a component-based architecture and `shadcn/ui`. It uses Wouter for routing and TanStack Query for server state management. The design includes a comprehensive theme system (light/dark/system modes), a professional aesthetic with grouped sidebar navigation, and a command palette. Mobile-optimized components are utilized for AI insights.

## Technical Implementations

### Frontend
- **Framework**: React 18, TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query
- **Styling**: Tailwind CSS, shadcn/ui
- **Real-time Sync**: WebSocket-based.

### Backend
- **Framework**: Express.js, TypeScript
- **API Design**: RESTful
- **Validation**: Zod schemas.

### Feature Specifications
- **Predictive Maintenance Scheduling**: Calendar/list views, auto-scheduling based on PdM scores, automatic triggers, WebSocket notifications.
- **Telemetry Ingestion**: Manual CSV/JSON import, HTTP/MQTT transport, robust CSV parsing.
- **Crew Scheduling**: Optimization for fairness and preferences.
- **STCW Hours of Rest**: Maritime compliance engine with PDF report generation.
- **Condition-Based Maintenance**: Oil analysis, wear particle analysis, multi-factor condition assessment, and critical DTC override.
- **Marine Protocol Support**: J1939 CAN bus, J1708/J1587 serial protocols.
- **Cost Synchronization**: Real-time synchronization of unit costs.
- **LLM Reports System**: AI-powered reports (Health, Fleet Summary, Maintenance, Compliance) using OpenAI, with structured data output.
- **Enhanced LLM & Vessel Intelligence System**: Advanced AI/ML with anomaly detection, predictive failure risk, report context building, and multi-model support.
- **Sensor Configuration System**: CRUD operations for sensor configurations, real-time application to incoming sensor data.
- **Comprehensive Sync Expansion**: Advanced data quality monitoring with a 5-tier reconciliation system.
- **Equipment Registry Vessel Integration**: Enhanced equipment management with vessel assignment.
- **Work Order Downtime Integration**: Estimated and actual downtime tracking for work orders.
- **Vessel Financial Tracking System**: Comprehensive vessel cost analysis.
- **Real-time Multi-Device Synchronization**: WebSocket-based broadcasting for instant data propagation.
- **DTC (Diagnostic Trouble Code) System**: J1939 fault code retrieval and translation, active/historical fault tracking, severity-based alerting, dedicated diagnostics page. Integrates with work order auto-creation, equipment health penalties, AI/LLM reports, alert system, financial impact, dashboard metrics, telemetry correlation, and condition-based maintenance.
- **Vessel Export/Import/Deletion System**: Complete vessel data portability with JSON export/import and comprehensive deletion of associated data. Operations are secured with admin authentication, audit logging, rate limiting, and org-scoping, wrapped in database transactions.
- **Advanced Data Linking & Predictive Analytics Enhancement**: Comprehensive system for connecting predictions, maintenance, costs, crew, and inventory for continuous AI improvement. Includes prediction feedback loops, downtime tracking, part failure history, industry benchmarks, enhanced work orders (crew skills, scheduling, cost tracking), enhanced work order parts (supplier linkage, inventory), supplier quality metrics, smart scheduling, cost intelligence, inventory management, and crew skill validation.

## System Design Choices
- **Database**: PostgreSQL with Drizzle ORM (neon-serverless driver).
- **Schema**: Normalized, UUID primary keys, timestamp tracking.
- **Authentication**: HMAC for edge device communication.
- **Storage Abstraction**: Interface-based layer.
- **Data Integrity**: Comprehensive cascade deletion system with transaction support for atomicity, admin authentication, audit logging, and rate limiting on critical operations.

# External Dependencies

- **PostgreSQL**: Primary database.
- **Neon Database**: Cloud hosting for PostgreSQL.
- **OpenAI**: Integrated for AI-powered report generation (LLM Reports System).
- **Edge Devices**: Marine equipment providing telemetry data.