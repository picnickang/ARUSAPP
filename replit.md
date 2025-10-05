# Overview

ARUS (Marine Predictive Maintenance & Scheduling) is a full-stack web application for monitoring and managing marine equipment health. It processes telemetry data, performs predictive maintenance, and offers a comprehensive dashboard for fleet management. The platform aims to enhance operational efficiency, reduce downtime through advanced predictive analytics, and ensure compliance. Key capabilities include real-time device monitoring, equipment health analytics, work order management, system configuration, intelligent predictive maintenance scheduling, and advanced inventory management. The project's ambition is to deliver a comprehensive, intelligent platform leveraging advanced predictive analytics and compliance tools.

# Recent Changes

**2025-10-05 (Latest)**: Fixed vessel deletion with equipment - COMPLETE ✅

**Critical Fixes Applied:**
1. **Database Schema**: Changed `crew.vessel_id` from NOT NULL to nullable to allow crew unassignment during vessel deletion
2. **Drizzle + TimescaleDB Incompatibility**: Identified that Drizzle query builder generates malformed SQL for TimescaleDB hypertables with composite primary keys `(org_id, ts, id)`, causing "syntax error at or near '='" failures
3. **Solution**: Converted ALL equipment-related cascade deletions to raw SQL using `tx.execute(sql`DELETE FROM table WHERE equipment_id = ${equipmentId}`)` to bypass Drizzle query builder issues
4. **Table Structure Discoveries**:
   - `twin_simulations` table doesn't exist in database (skipped deletion)
   - `insight_reports` and `insight_snapshots` don't have `equipment_id` columns - organized by scope, not equipment (skipped deletion)
5. **Raw SQL Deletions**: Applied to 14 tables (sensor_configurations, sensor_states, equipment_telemetry, pdm_score_logs, anomaly_detections, failure_predictions, vibration_features, vibration_analysis, condition_monitoring, oil_analysis, wear_particle_analysis, dtc_faults, work_orders, maintenance_schedules, alert_configurations, equipment)
6. **Test Results**: Vessel deletion with equipment now works correctly (HTTP 204), all related data properly cascaded

**2025-10-05 (Earlier)**: Made ARUS deployable outside Replit servers with environment-aware configuration:

**External Deployment Support:**
1. **Object Storage**: GCS client now lazy-initialized with environment detection - only initializes when Replit environment variables detected (REPL_ID, REPL_SLUG, REPLIT_DB_URL)
2. **Graceful Degradation**: All object storage methods check for client availability before use, returning clear error messages when features unavailable
3. **Environment Validation**: Added startup validation function that checks and reports status of all services (database, object storage, AI, session secret)
4. **Required Services**: Only DATABASE_URL is required - app exits on startup if missing
5. **Optional Services**: OpenAI API, object storage, and session secret are optional with informative warnings
6. **Status Endpoint**: `/api/storage/app-storage/status` now reports environment type (replit/external) and feature availability

**Deployment Requirements:**
- **Required**: DATABASE_URL (PostgreSQL connection string)
- **Optional**: OPENAI_API_KEY (for AI reports), SESSION_SECRET (for secure sessions)
- **Replit-only**: Object storage features (GCS) - disabled automatically when running externally

**Earlier Today - Sensor Configuration Fixes:**

Fixed critical sensor configuration system bugs preventing proper telemetry processing:

**Critical Bug Fixes:**
1. **Database Schema**: Added missing unique constraints `UNIQUE (equipment_id, sensor_type, org_id)` to `sensor_states` and `sensor_configurations` tables - required for upsert operations to work correctly
2. **Parameter Order Bug**: Fixed `createTelemetryReading` calling `getEquipment(equipmentId, orgId)` instead of correct order `getEquipment(orgId, equipmentId)` - was causing false "equipment not found" errors
3. **OrgId Handling**: Fixed telemetry endpoint to prioritize `readingData.orgId` from request body before falling back to header - was breaking sensor config lookup

**Complete Data Flow Verified:**
- HTTP POST → applySensorConfiguration → storage + events (processed values) ✓
- J1939 → HTTP POST → applySensorConfiguration → storage + events (processed values) ✓
- J1708 → HTTP POST → applySensorConfiguration → storage + events (processed values) ✓
- MQTT → applySensorConfiguration → storage + events (processed values) ✓

**End-to-End Test Confirmed:**
- Raw value 50 with gain=2.0, offset=5.0 correctly transforms to processed value 105
- Processed values stored in database and sensor states updated with EMA
- All ingestion paths apply sensor configurations consistently

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Decisions

The frontend is a React 18 single-page application using TypeScript, built with a component-based architecture and shadcn/ui. It uses Wouter for routing and TanStack Query for server state management. It features a comprehensive theme system (light/dark/system modes) and a professional design with grouped sidebar navigation and a command palette. Mobile-optimized components are used for AI insights.

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
- **Condition-Based Maintenance**: Oil analysis, wear particle analysis, multi-factor condition assessment, and critical DTC override for urgent intervention.
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
- **DTC (Diagnostic Trouble Code) System**: Complete J1939 fault code retrieval and translation with 765 standard SPN/FMI definitions, active/historical fault tracking per equipment, severity-based alerting (1=critical, 2=high, 3=moderate, 4=low), dedicated diagnostics page with vessel/equipment filtering and search, and equipment-specific ActiveDtcsPanel component integrated into vessel detail pages. Comprehensive 10-point integration architecture:
  1. **Work Order Auto-Creation**: Automatic generation from critical DTCs (severity 1-2) with idempotency checks, priority assignment, and 4hr downtime estimates
  2. **Equipment Health Integration**: DTC-based health penalties using formula `30 × severity × sqrt(count)` capped at 100
  3. **AI/LLM Reports Enhancement**: DTC summaries with severity bucketing and top 5 DTCs for intelligent analysis
  4. **Alert System Integration**: Intelligent triggering for critical DTCs with WebSocket broadcasting and 30-min duplicate suppression
  5. **Vessel Financial Impact**: DTC-triggered downtime cost calculation using vessel day rates
  6. **Dashboard Metrics Integration**: Fleet-wide stats (total active, critical count, equipment with DTCs, triggered work orders) with real-time 30s refresh
  7. **Telemetry Correlation**: SPN-to-sensor mapping with 60min time window analysis
  8. **Condition-Based Maintenance Integration**: 4-factor CBM scoring (Oil 40% + Wear 30% + Vibration 15% + DTC 15%) with critical DTC override forcing risk=critical and TTF ≤7 days
  9. **Frontend UI Updates**: Dashboard DTC metric card showing total active and critical DTCs with 5-column grid layout
  10. **Comprehensive Testing**: End-to-end Playwright validation (planned)
- **Vessel Export/Import/Deletion System**: Complete vessel data portability with comprehensive backup and restoration capabilities:
  - **Export**: JSON export of vessel with all related data (equipment, crew with skills/certifications/leave, telemetry last 30 days, work orders, schedules, DTCs, analytics, port calls, drydock windows) - crew assignments intentionally excluded
  - **Import**: Full vessel reconstruction with UUID regeneration, relationship preservation, and org-scoped operations
  - **Deletion Behavior**: Vessel deletion always deletes all associated equipment (including sensors, telemetry, work orders, and related data) and unassigns crew members (sets vesselId to null) without deleting crew records
  - **Security**: All operations protected with admin authentication (requireAdminAuth), audit logging (auditAdminAction), critical rate limiting (criticalOperationRateLimit), and org-scoping from authenticated user context (req.user.orgId)
  - **Transaction Safety**: Import and deletion operations wrapped in database transactions with automatic rollback on failure
  - **Frontend UI**: Export/Import buttons in vessel management toolbar, streamlined deletion confirmation dialog with clear warnings about equipment deletion and crew unassignment
- **Advanced Data Linking & Predictive Analytics Enhancement**: Comprehensive data linking system connecting predictions, maintenance, costs, crew, and inventory for continuous AI improvement:
  - **Prediction Feedback Loop**: Outcome labeling system tracks prediction accuracy (true/false positives) with confusion matrix metrics, enables ML models to learn from fleet-wide data, tracks resolvedByWorkOrderId linkage before and after completion
  - **Downtime Tracking** (downtimeEvents table): Links work orders, equipment, vessels to track downtime costs, revenue impact, opportunity costs, preventability analysis with time-bounded queries
  - **Part Failure History** (partFailureHistory table): Tracks part failures to calculate supplier defect rates, warranty status, root cause analysis, enables supplier quality scoring and part substitution recommendations
  - **Industry Benchmarks** (industryBenchmarks table): MTBF/MTTR data for equipment performance comparison, typical failure modes, recommended maintenance intervals by equipment type/manufacturer/model
  - **Enhanced Work Orders**: Crew assignment with skill validation, port call and drydock window scheduling integration, labor hours and cost tracking, maintenance window optimization (JSON field for optimal time/location)
  - **Enhanced Work Order Parts**: Supplier linkage with delivery tracking, estimated vs actual cost comparison, inventory movement integration for stock management
  - **Supplier Quality Metrics**: Defect rate tracking (% defective parts), on-time delivery performance, enables best supplier recommendations based on quality + cost + reliability
  - **Smart Scheduling**: Finds optimal maintenance windows considering port calls, drydock availability, crew skills, inventory availability, minimizes vessel downtime
  - **Cost Intelligence**: Comprehensive work order cost calculation (parts + labor + downtime + revenue impact), ROI tracking, downtime cost models using vessel day rates
  - **Inventory Management**: Part availability checks with reservation system (prevents race conditions), part substitution suggestions, estimated lead times, alternative supplier recommendations
  - **Crew Skill Validation**: Validates crew has required skills for work orders, finds qualified crew by skills/vessel/availability, tracks skill proficiency levels
  - **Continuous AI Improvement**: Prediction accuracy tracked with explicit horizons (e.g., 30d), F1-score and confusion matrix for model performance, outcome labels feed back into ML training pipeline

## System Design Choices
- **Database**: PostgreSQL with Drizzle ORM (neon-serverless driver with WebSocket support for transactions).
- **Schema**: Normalized, UUID primary keys, timestamp tracking.
- **Authentication**: HMAC for edge device communication.
- **Storage Abstraction**: Interface-based layer.
- **Data Integrity**: Comprehensive cascade deletion system with transaction support:
  - Equipment deletion cascades to 16 related tables (sensors, telemetry, analytics, predictions, vibrations, DTCs, insights)
  - Crew deletion cascades to all related records (skills, certifications, leave, assignments, rest sheets)
  - Vessel data wipe provides org-scoped telemetry/analytics cleanup with transaction atomicity
  - All destructive operations wrapped in database transactions for atomicity
  - Admin authentication, audit logging, and rate limiting on critical operations
  - Reliable deletion counting using .returning().length pattern

# External Dependencies

- **PostgreSQL**: Primary database.
- **Neon Database**: Cloud hosting for PostgreSQL.
- **OpenAI**: Integrated for AI-powered report generation (LLM Reports System).
- **Edge Devices**: Marine equipment providing telemetry data.