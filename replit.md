# Overview

ARUS (Marine Predictive Maintenance & Scheduling) is a full-stack web application designed to enhance operational efficiency, reduce downtime, and ensure regulatory compliance for marine fleets. It achieves this by monitoring marine equipment, processing telemetry data, and performing advanced predictive maintenance. The platform offers real-time device monitoring, equipment health analytics, intelligent maintenance scheduling, advanced inventory management, and AI-powered reporting.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Decisions

The frontend is a React 18 single-page application using TypeScript, `shadcn/ui`, Wouter for routing, and TanStack Query for server state management. It features a professional aesthetic, a comprehensive theme system, grouped sidebar navigation, a command palette, and mobile-optimized components. Alerts are handled via non-intrusive auto-dismissing toast notifications. The design is mobile-first responsive with bottom navigation, thumb-zone optimized touch targets, horizontally scrollable tab headers, and adaptive layouts. UI/UX improvements focus on discoverability, information density, visual hierarchy, and accessibility (WCAG 2.1 AA compliant) across all modules (Analytics, Equipment Registry, Inventory, Crew, Maintenance, Reports). Key enhancements include compact stat displays, consolidated filters, simplified table layouts, contextual actions, humanized timestamps, and a comprehensive tooltip system explaining technical terms. User-facing UUIDs have been eliminated in favor of human-readable names. All ML and AI platform pages (ML Training, Operating Parameters, Maintenance Templates) use horizontally scrollable tabs that prevent text/icon overlapping on mobile devices.

## Technical Implementations

### Frontend
- **Framework**: React 18, TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query
- **Styling**: Tailwind CSS, `shadcn/ui`
- **Real-time Sync**: WebSocket-based.

### Backend
- **Framework**: Express.js, TypeScript
- **API Design**: RESTful
- **Validation**: Zod schemas.

### Code Quality & Architecture
- **Reusable CRUD Mutation Hooks**: Centralized handling for CRUD operations with automatic query cache invalidation, standardized notifications, and error handling.
- **Mobile Optimization**: Production-ready responsive component library and patterns.
- **Analytics UX Enhancement**: Improved comprehension via flattened navigation, WCAG 2.1 AA-compliant visual hierarchy, and contextual elements.
- **Data Display Refinements**: Redesigned interfaces for Equipment Registry, Inventory, Crew Management, Maintenance, Analytics, and Reports to reduce clutter, improve density, and enhance user experience. This includes compact stat displays, unified filtering, streamlined tables, visual cues, and consolidated export options.
- **UUID Elimination**: Replaced UUIDs with human-readable names (e.g., equipment.name, woNumber) across the application, especially in reports and work orders.
- **User-Friendliness Tooltip System**: Implemented 18 `InfoTooltip` components across key pages for explaining technical terminology in plain language, ensuring accessibility.
- **Dialog Accessibility Compliance**: All dialogs use WCAG 2.1 AA-compliant `DialogContent` and `DialogDescription` for screen reader support.
- **Centralized Organization Context**: Standardized organization ID extraction across API endpoints.
- **Production Code Quality Enhancement**: Comprehensive cleanup of debugging logs (removed 181 console.log statements), improved error handling, centralized export utilities, navigation refactoring.
- **Mock Data Cleanup**: All test and mock data removed from production database. Deleted 39K+ telemetry records, 200 anomaly detections, 117 predictions, 32 work orders, 27 equipment, 21 parts inventory items, 12 crew members, and related test data. Seed scripts marked with warnings for development-only use. Only legitimate J1939 DTC definitions (765 records) retained as industry-standard reference data. Application verified to handle empty states gracefully with user-friendly messaging.
- **Vessel Filter ID-Based Architecture**: Dashboard vessel filters now use vessel IDs internally while displaying human-readable names to users. Prevents duplicate vessel name collisions, ensures API compatibility (vessel IDs passed to backend), includes preference migration validation to handle legacy vessel name preferences, and fixes React duplicate key warnings. Telemetry section expanded by default for better UX.
- **AI Sensor Optimization UX Enhancement**: Enhanced sensor optimization page with vessel name column mapping equipment to vessels, formatted sensor names in Title Case (e.g., "Temperature", "Oil Pressure"), and sortable table headers for Equipment, Vessel, Sensor Type, Confidence, and Status columns. Added missing `status` column to threshold_optimizations table with proper schema migration.

### Feature Specifications
- **Predictive Maintenance**: Auto-scheduling based on predictive scores, real-time notifications, and cron-based failure prediction.
- **Telemetry Ingestion**: Supports manual CSV/JSON import, HTTP/MQTT, and marine protocols (J1939 CAN bus, J1708/J1587).
- **Crew Scheduling**: Optimizes for fairness, preferences, and STCW Hours of Rest compliance.
- **Condition-Based Maintenance**: Includes oil analysis, wear particle analysis, and critical DTC override.
- **Cost Synchronization**: Real-time unit cost synchronization and comprehensive vessel cost analysis.
- **LLM Reports System**: AI-powered reports (Health, Fleet Summary, Maintenance, Compliance) using OpenAI for structured data and anomaly detection.
- **Sensor Configuration System**: CRUD operations for sensor configurations with real-time application.
- **Comprehensive Sync Expansion**: 5-tier data quality monitoring and reconciliation.
- **Equipment Registry Vessel Integration**: Enhanced equipment management with vessel assignment.
- **Work Order Downtime Integration**: Tracks estimated/actual downtime with intelligent parts suggestions.
- **User-Friendly Work Order Numbers**: Auto-generated identifiers (WO-YYYY-NNNN).
- **Work Order Completion Logging**: Transaction-based atomic completion flow with analytics tracking.
- **Real-time Multi-Device Synchronization**: WebSocket-based broadcasting for instant data propagation.
- **Offline Sync Conflict Resolution**: 3-layer hybrid system with optimistic locking, field-level tracking, and conflict resolution.
- **DTC System**: J1939 fault code retrieval, translation, tracking, and severity-based alerting.
- **Vessel Data Management**: Export, import, and deletion capabilities for vessel data.
- **Advanced Data Linking & Predictive Analytics**: Connects predictions, maintenance, costs, crew, and inventory for continuous AI improvement.
- **Dashboard Metrics History**: Historical tracking of KPIs with dynamic trend calculations.
- **Advanced ML & Acoustic Monitoring**: Machine learning system with LSTM neural networks for time-series failure forecasting, Random Forest classifiers, acoustic monitoring, automated ML training, and a hybrid prediction service with multi-tenant data isolation.
- **Adaptive Training Window System**: Tier-based ML training data quality framework with equipment-specific minimums.
- **ML-LLM Integration**: Seamless integration between ML predictions and LLM report generation.
- **ML/PDM Data Export System**: Comprehensive data portability for migration, including JSON and CSV exports.
- **Model Performance Tracking System**: Comprehensive validation framework tracking predictions vs actual outcomes, accuracy scoring, and time-to-failure error analysis.
- **Prediction Feedback Loop**: User-driven continuous improvement system allowing operators to rate predictions, submit corrections, verify outcomes, and flag inaccuracies.
- **LLM Cost Tracking**: Real-time monitoring of AI API usage across providers with comprehensive cost analysis.
- **Automated Retraining Triggers**: Intelligent system monitoring model performance degradation, negative feedback, and data availability to automatically flag models for retraining.
- **Work Order Completion → ML Feedback Loop**: Automated prediction validation system that updates ML predictions when work orders complete.
- **LLM Budget Management**: Organization-level budget tracking with configurable limits, alerts, and spending analytics.
- **Auto-validation Record Creation**: ML prediction service automatically creates `model_performance_validations` records for later comparison with actual outcomes.
- **Cost Savings & ROI Tracking System**: Comprehensive financial tracking system that calculates and displays actual cost savings from predictive and preventive maintenance. Features configurable emergency cost multipliers at organization and equipment levels (defaults: 3x labor, 1.5x parts, 3x downtime), automatic savings calculation on work order completion, downtime cost validation ($100-$50K bounds), and real-time dashboard showing total savings, savings by maintenance type, and top equipment contributions. Includes 5 API endpoints with Zod validation, async calculation to prevent blocking, and detailed error logging.

## System Design Choices
- **Database**: Dual-mode deployment supporting both cloud PostgreSQL and local SQLite with sync.
  - **Cloud Mode (Default)**: PostgreSQL with Drizzle ORM (neon-serverless driver) for shore offices and always-online deployments.
  - **Vessel Mode (Offline-First)**: SQLite with libSQL client (Turso) for vessels and remote sites with intermittent connectivity.
  - **Automatic Sync**: Turso embedded replicas provide automatic bi-directional sync every 60 seconds when online.
  - **Offline Capability**: Local SQLite database enables full application functionality without internet connection.
  - **Seamless Switching**: Environment variable `LOCAL_MODE=true/false` switches between modes with no code changes.
- **Schema**: Normalized, UUID primary keys, timestamp tracking, SQLite-compatible data types.
- **Authentication**: HMAC for edge devices; Admin authentication via `ADMIN_TOKEN` environment variable.
- **Storage Abstraction**: Interface-based layer supporting both PostgreSQL and SQLite backends.
- **Data Integrity**: Comprehensive cascade deletion with transactions, admin authentication, audit logging, and rate limiting.
- **Security**: Improved CSV export injection protection; Uses `VITE_ADMIN_TOKEN` for frontend admin access; Optional local database encryption at rest.
- **Performance Optimizations**: Cache tuning, increased background job concurrency, strategic database indexes, and materialized views.
- **Sync Management**: Automated sync manager service handles cloud synchronization, conflict resolution, and audit logging for vessel deployments.

## Configuration Requirements
- **Admin Token Setup**: The `VITE_ADMIN_TOKEN` environment variable must match the `ADMIN_TOKEN` secret for frontend admin features to work.
- **Deployment Mode Configuration**:
  - **Cloud Mode**: Set `LOCAL_MODE=false` (default). Requires `DATABASE_URL` for PostgreSQL connection.
  - **Vessel Mode**: Set `LOCAL_MODE=true`. Requires `TURSO_SYNC_URL` and `TURSO_AUTH_TOKEN` for cloud sync. Optionally set `LOCAL_DB_KEY` for database encryption.
- **Database Setup**:
  - **Shore Office**: Cloud PostgreSQL (Neon, Supabase) via `DATABASE_URL`. Install with `install.bat` → choose option 1 (Cloud Mode).
  - **Vessel PC**: Local SQLite with Turso sync. Install with `install.bat` → choose option 2 (Vessel Mode). Creates local database in `./data/vessel-local.db`.
- **Sync Configuration**: Turso embedded replicas provide automatic sync every 60 seconds when internet is available. Sync manager logs all sync events to `sync_journal` table for audit trail.

# External Dependencies

- **PostgreSQL**: Primary relational database for cloud deployments (shore offices).
- **Neon Database**: Cloud hosting for PostgreSQL.
- **Turso (libSQL)**: Local SQLite database with cloud sync for vessel/offline deployments.
- **OpenAI**: Used for AI-powered report generation and predictive analytics.
- **TensorFlow.js (@tensorflow/tfjs-node)**: Neural network framework for LSTM time-series forecasting.
- **Edge Devices**: Marine equipment and IoT devices providing telemetry data.

# Deployment Architecture

## Cloud Mode (Shore Office)
```
Shore Office PC/Server
│
├─ ARUS Application (Node.js)
│  ├─ Express API Server
│  ├─ React Frontend (Vite)
│  └─ Drizzle ORM
│
└─ PostgreSQL Database (Cloud)
   └─ Neon/Supabase hosted
```

## Vessel Mode (Offline-First)
```
Vessel PC/Server (Windows)
│
├─ ARUS Application (Node.js)
│  ├─ Express API Server
│  ├─ React Frontend (Vite)
│  ├─ Drizzle ORM → SQLite
│  └─ Sync Manager (Auto-sync every 5 min)
│
├─ Local SQLite Database
│  └─ ./data/vessel-local.db (encrypted)
│
└─ Crew Devices (iPad/Laptop)
   └─ Connect via local WiFi
   
   ↕ (Automatic sync when satellite/internet available)
   
Turso Cloud Database
└─ Acts as sync hub and backup
```

## Key Features by Mode

| Feature | Cloud Mode | Vessel Mode |
|---------|------------|-------------|
| **Internet Required** | Always | Optional |
| **Database Type** | PostgreSQL | SQLite + Sync |
| **Read Latency** | 50-200ms | <1ms |
| **Offline Operation** | ❌ | ✅ Full functionality |
| **Auto-sync** | N/A | Every 60s |
| **Multi-device** | ✅ Via cloud | ✅ Via local network |
| **Cost** | Neon free tier | Neon + Turso (~$15/vessel/mo) |
| **Setup** | `install.bat` → Option 1 | `install.bat` → Option 2 |