# Overview

ARUS (Marine Predictive Maintenance & Scheduling) is a full-stack web application for monitoring marine equipment, processing telemetry data, and performing predictive maintenance. Its core purpose is to enhance operational efficiency, reduce downtime through advanced predictive analytics, and ensure regulatory compliance for marine fleets. The platform offers real-time device monitoring, equipment health analytics, intelligent predictive maintenance scheduling, advanced inventory management, and AI-powered reporting. The project aims to optimize operations and reduce costs through an intelligent platform leveraging predictive analytics and compliance tools.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Decisions

The frontend is a React 18 single-page application built with TypeScript, `shadcn/ui`, Wouter for routing, and TanStack Query for server state management. It features a professional aesthetic, a comprehensive theme system, grouped sidebar navigation, a command palette, and mobile-optimized components. Alerts are managed via non-intrusive auto-dismissing toast notifications. The design is mobile-first responsive with bottom navigation, thumb-zone optimized touch targets, and adaptive layouts for various screen sizes.

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

### Code Quality & Architecture
- **Reusable CRUD Mutation Hooks System**: Centralized handling for CRUD and custom operations with automatic query cache invalidation, standardized toast notifications, and consistent error handling.
- **Mobile Optimization System**: Production-ready responsive component library including `ResponsiveDialog` and `useMediaQuery` hook, with comprehensive mobile-first patterns.
- **Analytics UX Enhancement System**: Improves information comprehension through flattened navigation, WCAG 2.1 AA-compliant severity-based visual hierarchy, unified equipment profile cards, contextual action buttons, technical term tooltips, and humanized timestamps.
- **Equipment Registry UX Improvements**: Enhanced discoverability with multi-field search and filtering, five overview statistics cards, a simplified table layout, and visual hierarchy improvements.
- **Inventory Management UX Overhaul**: Redesigned for information density and efficiency, featuring five overview stat cards, multi-dimensional filtering, a streamlined 7-column table, sortable headers, prominent 'Available Qty' with color-coded warnings, visual row highlighting, and CSV export.
- **Crew Management UX Consolidation**: Unified interface with five overview stat cards, multi-dimensional filtering, a sortable 8-column table, visual skill badges, inline quick actions, and CSV export.
- **Maintenance UX Decluttering**: Optimizes maintenance interfaces by replacing large stat cards with a compact horizontal bar, integrating filters into the header, and condensing equipment rows for improved density.
- **Analytics & Reports UX Overhaul**: Comprehensive optimization achieving 60-70% reduction in visual clutter across analytics, reports, and AI insights pages. Analytics page features compact stat bar (70% vertical space savings) with real-time telemetry display. AI Insights consolidated filters from stacked dropdowns to single compact row, removed sticky header, added collapsible report sections (analysis, scenarios, ROI, citations) with progressive disclosure. Reports page unified export buttons (CSV, JSON, PDF, Backup) into single dropdown menu. InsightsOverview component converted from 3-card grid to compact inline stats with separators. All optimizations maintain full accessibility (aria-labels, data-testids) and mobile responsiveness.
- **Reports Page UUID Elimination**: Replaced cluttered dual-card layout (Equipment Health Summary & Recent Work Orders) with compact tabbed interface. Backend enhanced to join equipment/vessels tables in work orders API, returning equipmentName and vesselName. Auto-generates woNumber (WO-YYYY-NNNN format) for legacy work orders. Frontend displays human-readable names exclusively: equipment.name (not UUID), woNumber (not work order UUID), equipmentName (not equipment UUID). Compact metrics row shows Total Equipment, Critical, Open Orders. Each tab limited to 5 most critical items with intelligent sorting (equipment by health, work orders by status). Achieved 60% vertical space reduction while completely eliminating user-facing UUIDs.

### Feature Specifications
- **Predictive Maintenance Scheduling**: Auto-scheduling based on predictive scores, real-time notifications, and cron-based failure prediction.
- **Telemetry Ingestion**: Supports manual CSV/JSON import, HTTP/MQTT, and marine protocols (J1939 CAN bus, J1708/J1587).
- **Crew Scheduling**: Optimizes for fairness, preferences, and STCW Hours of Rest compliance with PDF reports.
- **Condition-Based Maintenance**: Includes oil analysis, wear particle analysis, and critical DTC override.
- **Cost Synchronization**: Real-time unit cost synchronization and comprehensive vessel cost analysis.
- **LLM Reports System**: AI-powered reports (Health, Fleet Summary, Maintenance, Compliance) using OpenAI for structured data and anomaly detection.
- **Sensor Configuration System**: CRUD operations for sensor configurations, real-time application, and health monitoring.
- **Comprehensive Sync Expansion**: Advanced 5-tier data quality monitoring and reconciliation.
- **Equipment Registry Vessel Integration**: Enhanced equipment management with vessel assignment and linkage to dashboard metrics.
- **Work Order Downtime Integration**: Tracks estimated/actual downtime with intelligent parts suggestions.
- **User-Friendly Work Order Numbers**: Auto-generated human-readable identifiers (WO-YYYY-NNNN).
- **Work Order Completion Logging**: Transaction-based atomic completion flow with comprehensive analytics tracking.
- **Human-Readable Display System**: Uses display names instead of UUIDs for equipment, parts, and sensors.
- **Real-time Multi-Device Synchronization**: WebSocket-based broadcasting for instant data propagation.
- **Offline Sync Conflict Resolution**: A 3-layer hybrid system with optimistic locking, field-level tracking, and conflict resolution.
- **DTC (Diagnostic Trouble Code) System**: J1939 fault code retrieval, translation, tracking, and severity-based alerting.
- **Vessel Export/Import/Deletion System**: Complete vessel data portability and comprehensive deletion.
- **Advanced Data Linking & Predictive Analytics Enhancement**: Connects predictions, maintenance, costs, crew, and inventory for continuous AI improvement.
- **Dashboard Metrics History**: Historical tracking of KPIs with dynamic trend calculations.
- **Advanced ML & Acoustic Monitoring**: Machine learning system with LSTM neural networks for time-series failure forecasting, Random Forest classifiers, acoustic monitoring, automated ML training, and a hybrid prediction service with multi-tenant data isolation.
- **Adaptive Training Window System**: Tier-based ML training data quality framework with equipment-specific minimums, automatic optimal window calculation, and tier-based confidence multipliers.
- **ML-LLM Integration**: Seamless integration between ML predictions and LLM report generation.
- **ML/PDM Data Export System**: Comprehensive data portability for migration, including JSON exports for complete org-scoped datasets and CSV exports for standards-compliant ML models with full tier metadata.

## System Design Choices
- **Database**: PostgreSQL with Drizzle ORM (neon-serverless driver).
- **Schema**: Normalized, UUID primary keys, timestamp tracking.
- **Authentication**: HMAC for edge device communication.
- **Storage Abstraction**: Interface-based layer.
- **Data Integrity**: Comprehensive cascade deletion with transactions, admin authentication, audit logging, and rate limiting.
- **Security**: Improved CSV export injection protection.
- **Performance Optimizations**: Implemented cache tuning, increased background job concurrency, added strategic database indexes, and utilized materialized views for pre-computed aggregations, resulting in significant performance improvements.

# External Dependencies

- **PostgreSQL**: Primary relational database.
- **Neon Database**: Cloud hosting for PostgreSQL.
- **OpenAI**: Used for AI-powered report generation and predictive analytics.
- **TensorFlow.js (@tensorflow/tfjs-node)**: Neural network framework for LSTM time-series forecasting.
- **Edge Devices**: Marine equipment and IoT devices providing telemetry data.