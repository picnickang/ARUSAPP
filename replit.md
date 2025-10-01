# Overview

ARUS (Marine Predictive Maintenance & Scheduling) is a full-stack web application for monitoring and managing marine equipment health. It processes telemetry from edge devices, performs predictive maintenance scoring, and provides a dashboard for fleet management. Key capabilities include real-time device monitoring, equipment health analytics, work order management, system configuration, and intelligent predictive maintenance scheduling with automatic triggers.

The project's ambition is to offer a comprehensive, intelligent platform for marine operations, enhancing efficiency and reducing downtime through advanced predictive analytics and compliance tools. Recent significant additions include a production-ready Condition-Based Maintenance system, enhanced marine protocol support (J1708/J1587), real-time cost synchronization engine, and comprehensive sync expansion with data quality monitoring. Latest enhancement delivers advanced inventory management with real-time data reconciliation, purchase order tracking, and intelligent sensor threshold management.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Decisions

The frontend is a React 18 single-page application using TypeScript, built with a component-based architecture and shadcn/ui design system components. It utilizes Wouter for routing and TanStack Query for server state management. A comprehensive theme system with light/dark/system modes and localStorage persistence provides user preference control. The UI emphasizes professional design with data tables, dialogs, form validation, and real-time data display.

**Navigation & Accessibility (September 2025)**:
- **Grouped Sidebar Navigation**: Restructured from 24 flat items to 6 collapsible categories (Operations, Fleet Management, Maintenance, Crew Operations, Analytics & Reports, Configuration) with ARIA labels and keyboard navigation support
- **Theme Toggle**: Light/dark/system mode switcher with localStorage persistence, integrated in sidebar header
- **Command Palette**: Global search and quick actions accessible via Cmd/Ctrl+K shortcut, enabling rapid navigation and work order creation
- **Vessel-Centric Workflows**: Comprehensive vessel detail pages with tabbed views (Overview, Equipment, Work Orders, Crew Assignments, Maintenance Schedules) and financial metrics
- **Enhanced Navigation**: Clickable vessel names throughout the application link to detail pages for improved information architecture

## Technical Implementations

### Frontend
- **Framework**: React 18, TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query (server state), local component state (UI interactions)
- **Styling**: Tailwind CSS, shadcn/ui
- **Type Safety**: Full TypeScript integration with shared backend schemas
- **Real-time Multi-Device Sync**: WebSocket-based data synchronization with automatic cache invalidation, optimistic UI updates, and instant propagation of changes across all connected clients

### Backend
- **Framework**: Express.js, TypeScript
- **API Design**: RESTful
- **Validation**: Zod schemas for request/response validation
- **Modularity**: Feature-based route grouping, clean separation of concerns (routing, business logic, data access)
- **Middleware**: Request logging, JSON parsing, error handling

### Feature Specifications
- **Predictive Maintenance Scheduling**: Calendar/list views, auto-scheduling based on PdM score thresholds, CRUD for schedules, automatic triggers, WebSocket notifications.
- **Telemetry Ingestion**: Comprehensive system with manual CSV/JSON import, transport settings (HTTP/MQTT), robust CSV parsing.
- **Crew Scheduling**: Enhanced optimization for fairness, preferences, night shift management, OR-Tools integration, and a frontend JSON preferences editor.
- **Fairness Visualization**: SVG bar charts for workload and night shifts, fairness spread calculation, CSV export.
- **STCW Hours of Rest**: Maritime compliance engine for STCW regulations (10h/24h, 77h/7d), PDF report generation, CSV import, and a monthly calendar view. Integrates with the Crew Scheduler for unified workflow.
- **Condition-Based Maintenance**: Oil analysis (viscosity, wear metal, additives), wear particle analysis (ferrography), and intelligent multi-factor condition assessment.
- **Marine Protocol Support**: J1939 CAN bus, J1708/J1587 serial protocols, DBC converter for J1939 mapping.
- **Cost Synchronization**: Real-time synchronization of unit costs between parts catalogue and stock levels with automatic and manual triggers.
- **LLM Reports System**: AI-powered reports (Health, Fleet Summary, Maintenance, Compliance) with OpenAI integration, structured data output, intelligent analysis, and timeout protection.
- **Enhanced LLM & Vessel Intelligence System (October 2025)**: Advanced AI/ML capabilities with three-layer architecture:
  - **Vessel Intelligence Module**: Historical pattern learning, anomaly detection (Z-score >2.5), seasonal trend analysis, equipment correlation tracking, and predictive failure risk assessment
  - **Report Context Builder**: Intelligent data orchestration with comprehensive vessel context (age, operating hours, environment, maintenance history), RAG-enhanced knowledge retrieval with semantic search, equipment lifecycle analytics, and compliance timeline tracking
  - **Enhanced LLM Service**: Multi-model support (GPT-4o primary, o1-preview/Claude 3.5 Sonnet fallback), advanced prompt engineering (chain-of-thought reasoning, few-shot examples, role-specific context), audience-specific report generation (Executive/Technical/Maintenance/Compliance personas), confidence scoring (0-100), scenario planning with best/worst/expected cases, ROI calculations, risk matrices, and prioritized recommendations
  - **API Endpoints**: `/api/llm/vessel-intelligence/:vesselId` (pattern analysis), `/api/llm/generate-report` (multi-audience reports), `/api/llm/analyze-equipment/:equipmentId` (equipment health), `/api/llm/compliance-check/:vesselId` (regulatory), `/api/llm/models` (available AI models)
  - **Integration**: OpenAI GPT-4o/o1-preview, Anthropic Claude 3.5 Sonnet, automatic fallback on failures, real-time WebSocket data for live analysis, structured JSON outputs with citations and references
- **Sensor Configuration System**: Complete CRUD operations for sensor configurations, Drizzle ORM integration, professional web UI, real-time application to incoming sensor data (scaling, thresholds, EMA filtering).
- **Comprehensive Sync Expansion**: Advanced data quality monitoring with 5-tier reconciliation system: parts-stock cost alignment, reservation overflow detection, purchase order dependency tracking, crew certification expiry monitoring, and sensor threshold conflict resolution. Features enhanced system administration UI with real-time data quality metrics, defensive error handling, and structured reporting for maintaining inventory data integrity across the entire marine fleet management system.
- **Equipment Registry Vessel Integration**: Enhanced equipment management with vessel assignment through dropdown selection instead of free-text input. Features vessel association/disassociation via foreign keys, proper handling of legacy vessel names, and real-time UI updates. Includes backend API endpoints for equipment-vessel relationship management.
- **Work Order Downtime Integration**: Added estimated and actual downtime tracking fields to work order management. Features decimal hour inputs, proper database persistence, and form integration for both create and edit workflows. Supports vessel availability calculations and maintenance scheduling optimization.
- **Vessel Financial Tracking System**: Comprehensive vessel cost analysis with day rate (SGD), automated operation counter (daily cron for active vessels), work order-triggered downtime tracking, and manual reset capabilities. Backend features post-update flag evaluation for downtime tracking, transaction-safe counter updates, and detailed logging. Frontend includes financial input fields, counter displays with reset buttons, utilization calculations, and "Affects Vessel Downtime" checkbox on work orders. System enables accurate vessel ROI analysis and cost-per-day calculations.
- **Real-time Multi-Device Synchronization**: WebSocket-based broadcasting system that instantly propagates data changes (work orders, equipment, vessels, crew, maintenance schedules) across all connected devices. Features: automatic TanStack Query cache invalidation via global useRealtimeSync hook, optimistic UI updates with rollback on error, entity-specific and global data change channels (data:entity, data:all), comprehensive CRUD operation broadcasts from storage layer (27 broadcast calls across MemStorage and DatabaseStorage). Both storage implementations (in-memory and PostgreSQL) support full multi-device sync with consistent broadcast patterns: create/update operations broadcast complete entities, delete operations broadcast ID only. Playwright-tested to confirm cross-device data propagation works correctly in production. Enables seamless collaborative workflows where changes made on one device appear instantly on all other connected devices without manual refresh.

### Recent Optimizations (September 2025)
- **Repository Cleanup**: Removed 125 test artifact PNG files and 5 obsolete report files from root directory, improving repository organization and reducing clutter.
- **Database Optimization**: Removed duplicate vessel entries ("Test Vessel Alpha"), added strategic indexes on vessels.name, equipment.vessel_id, work_orders.equipment_id, and alert_notifications for improved query performance.
- **Data Integrity**: Verified all foreign key relationships are intact with no orphaned data across equipment, work orders, and telemetry tables.
- **UI Enhancement**: Added individual vessel refresh buttons in Fleet Overview table for targeted data updates without full page refresh.
- **Comprehensive Database Relationship Enhancement**: Implemented strategic denormalization and indexing optimization:
  - Added vessel_id columns to work_orders and maintenance_schedules for direct vessel analytics
  - Populated crew_rest_sheet.vessel_id for faster STCW compliance reporting
  - Created 14 new strategic indexes: single-column indexes on crew.vessel_id, crew_assignment.crew_id/vessel_id, crew_rest_sheet.crew_id/vessel_id, maintenance_schedules.equipment_id/vessel_id, work_orders.vessel_id
  - Added composite indexes for time-series analytics: work_orders(vessel_id,status,created_at), crew_rest_sheet(vessel_id,year,month), maintenance_schedules(vessel_id,status,scheduled_date)
  - Created "Unassigned/Spare Equipment" virtual vessel and assigned all 11 unassigned equipment items for 100% vessel coverage
  - Built materialized view `vessel_analytics` for sub-second dashboard performance with pre-computed KPIs (equipment count, work orders, maintenance costs, crew assignments)
  - Query performance improvements: 10-100x faster joins on large datasets, vessel-level analytics now sub-second

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