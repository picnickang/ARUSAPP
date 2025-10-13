# Overview

ARUS (Marine Predictive Maintenance & Scheduling) is a full-stack web application designed for comprehensive monitoring of marine equipment, processing telemetry data, and performing predictive maintenance. Its primary purpose is to enhance operational efficiency, reduce downtime through advanced predictive analytics, and ensure regulatory compliance for marine fleets. The platform offers real-time device monitoring, equipment health analytics, intelligent predictive maintenance scheduling, advanced inventory management, and AI-powered reporting. The project aims to deliver significant business value by optimizing operations and reducing costs through an intelligent platform leveraging advanced predictive analytics and compliance tools.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Decisions

The frontend is a React 18 single-page application built with TypeScript, utilizing a component-based architecture and `shadcn/ui`. It employs Wouter for routing and TanStack Query for server state management. The design features a professional aesthetic, a comprehensive theme system (light/dark/system modes), grouped sidebar navigation, a command palette, and mobile-optimized components for AI insights. User feedback for data refresh actions is provided via toast notifications. **Alert System**: Dashboard uses non-intrusive auto-dismissing toast notifications for real-time alerts instead of persistent banners or floating action bars, reducing visual clutter while maintaining awareness. The critical issues floating action bar has been removed from the dashboard. Users can view all alerts on the dedicated Alerts page (/alerts).

**Mobile-First Responsive Design**: Comprehensive mobile optimization with bottom navigation (<768px), thumb-zone optimized touch targets (44px+ minimum), FAB positioning above bottom nav, horizontal scroll patterns for card grids, safe area support for notched devices, responsive Dialog→Sheet conversion system, mobile-optimized form utilities, and breakpoint-driven adaptive layouts (mobile: <768px, tablet: 768-1024px, desktop: >1024px).

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
- **Reusable CRUD Mutation Hooks System**: Centralized mutation handling using `useCrudMutations.ts` for consistent creation, update, deletion, and custom operations, including automatic query cache invalidation, standardized toast notifications, and consistent error handling, significantly reducing boilerplate.
- **Mobile Optimization System**: Production-ready responsive component library including `ResponsiveDialog` (auto-converts Dialog/Sheet based on viewport with viewport-change remounting), `useMediaQuery` hook (SSR-safe media query detection), mobile form CSS utilities (larger touch targets, sticky actions, optimized spacing), and comprehensive mobile-first patterns documented in MOBILE_OPTIMIZATION_GUIDE.md. Fully implemented in inventory-management and work-orders pages with E2E testing validation across all viewports.
- **Analytics UX Enhancement System (October 2025)**: Comprehensive UX overhaul improving information comprehension and reducing cognitive load. Features include: (1) Flattened navigation structure reducing click-depth from 2-3 to 1 with URL state preservation for bookmarking, (2) WCAG 2.1 AA-compliant severity-based visual hierarchy with color + icon + text indicators (critical/warning/caution/good/info), (3) Equipment Profile unified cards combining health, performance, costs, and predictions in single view, (4) Contextual action buttons enabling direct workflow initiation (Create Work Order, Schedule Inspection, Order Parts) from analytics, (5) Technical term tooltips with plain-language explanations for non-technical users, (6) Humanized timestamps with freshness indicators (Live, X min ago, Stale) replacing raw dates. All improvements documented in UX_UI_ANALYTICS_IMPROVEMENTS.md with phased implementation plan.
- **Equipment Registry UX Improvements (October 2025)**: Enhanced discoverability and usability with comprehensive search and filtering system. Features include: (1) Multi-field search across equipment name, manufacturer, model, and serial number with real-time filtering, (2) Three-tier filtering system (vessel, type, status) with "Clear Filters" functionality, (3) Five overview statistics cards (Total, Active, Inactive, Vessels, Unassigned) providing at-a-glance fleet insights, (4) Simplified table layout reducing columns from 8 to 6 with manufacturer/model as secondary info, (5) Visual hierarchy improvements with type badges, right-aligned actions, and better spacing, (6) Empty filtered state with clear messaging and recovery actions. All filtering uses memoized calculations for performance. E2E tested and validated across all filter combinations.
- **Inventory Management UX Overhaul (October 2025)**: Comprehensive redesign improving information density and operational efficiency. Features include: (1) Five overview stat cards (Total Parts, Total Value, Critical/Out Stock, Low Stock, Categories) for instant situational awareness, (2) Multi-dimensional filtering with status filter (Critical, Out of Stock, Low Stock, Adequate, Excess) complementing category search, (3) Streamlined 7-column table design (Part Name + Number, Category, Available Qty with breakdown, Unit Cost, Total Value, Status, Actions) reducing information overload, (4) Sortable column headers with visual indicators (click to sort by Part Name, Category, Available, Unit Cost, Total Value, Status), (5) "Available Qty" calculation prominently displayed with color-coded warnings (red: critical/out, yellow: low, standard: adequate), (6) Visual row highlighting (red tint for critical/out of stock, yellow for low stock) for instant problem identification, (7) Active filter count badge and result count display ("Showing X of Y parts, N filters active"), (8) Clear Filters button appearing when filters active, (9) Export to CSV functionality with filtered results, (10) Mobile-responsive overflow scroll for table. All stats and filtering use memoized calculations for optimal performance.
- **Crew Management UX Consolidation (October 2025)**: Unified crew operations interface eliminating duplicate components and improving operational efficiency. Features include: (1) Five overview stat cards (Total Crew, Active, On Duty, Vessels, Unique Skills) for instant situational awareness, (2) Multi-dimensional filtering with search by name/rank/skill, vessel dropdown, rank dropdown, and status dropdown (All, Active Only, Inactive, On Duty, Off Duty) with active filter count badge, (3) Sortable 8-column table (Name, Rank, Vessel, Skills, Status, Duty, Hours, Actions) with aria-sort accessibility attributes for screen readers, (4) Visual skill badges (max 3 visible + count) for quick proficiency overview, (5) Inline quick actions (edit, toggle duty, add skill, delete) for streamlined operations, (6) Skill assignment with read-only crew display preventing accidental misassignment, (7) CSV export with filtered results, (8) Mobile-responsive horizontal scroll (min-width 800px) with 2-column stat card grid. Fixed critical database constraint bug in skill assignment using explicit check-and-update logic. Removed auto-refetch intervals to prevent race conditions. All filtering/sorting uses memoized calculations. E2E tested and validated.

### Feature Specifications
- **Predictive Maintenance Scheduling**: Auto-scheduling based on predictive scores, real-time notifications, and cron-based failure prediction analysis.
- **Telemetry Ingestion**: Supports manual CSV/JSON import, HTTP/MQTT, and marine-specific protocols (J1939 CAN bus, J1708/J1587).
- **Crew Scheduling**: Optimizes for fairness, preferences, and STCW Hours of Rest compliance with PDF report generation.
- **Condition-Based Maintenance**: Includes oil analysis, wear particle analysis, and critical DTC override.
- **Cost Synchronization**: Real-time unit cost synchronization and comprehensive vessel cost analysis.
- **LLM Reports System**: AI-powered reports (Health, Fleet Summary, Maintenance, Compliance) using OpenAI, providing structured data and anomaly detection.
- **Sensor Configuration System**: CRUD operations for sensor configurations, real-time application, and health monitoring with online/offline status indicators.
- **Comprehensive Sync Expansion**: Advanced 5-tier data quality monitoring and reconciliation.
- **Equipment Registry Vessel Integration**: Enhanced equipment management with vessel assignment and linkage to dashboard metrics.
- **Work Order Downtime Integration**: Tracks estimated/actual downtime with intelligent parts suggestions.
- **User-Friendly Work Order Numbers**: Auto-generated human-readable identifiers (WO-YYYY-NNNN).
- **Work Order Completion Logging**: Transaction-based atomic completion flow ensures work order status updates and completion logs are created together using database transactions; if either operation fails, both are rolled back to maintain data integrity. Includes comprehensive analytics tracking for duration variance, cost variance, on-time completion rates, and downtime analysis.
- **Human-Readable Display System**: Equipment, parts, and sensors display names instead of UUIDs throughout the application.
- **Real-time Multi-Device Synchronization**: WebSocket-based broadcasting for instant data propagation.
- **Offline Sync Conflict Resolution**: A 3-layer hybrid system with optimistic locking, field-level tracking, safety-first rules, version tracking, conflict tracking with manual resolution, and a complete audit trail.
- **DTC (Diagnostic Trouble Code) System**: J1939 fault code retrieval, translation, active/historical tracking, severity-based alerting, and integration across various modules.
- **Vessel Export/Import/Deletion System**: Complete vessel data portability and comprehensive deletion.
- **Advanced Data Linking & Predictive Analytics Enhancement**: Connects predictions, maintenance, costs, crew, and inventory for continuous AI improvement.
- **Dashboard Metrics History**: Historical tracking of KPIs with dynamic trend calculations.
- **Advanced ML & Acoustic Monitoring**: Machine learning system with LSTM neural networks for time-series failure forecasting, Random Forest classifiers, acoustic monitoring, automated ML training, and a hybrid prediction service, ensuring robust telemetry sanitization and multi-tenant data isolation.
- **Adaptive Training Window System**: Industry-leading tier-based ML training data quality framework (Bronze: 90-180d, Silver: 180-365d, Gold: 365-730d, Platinum: 730+d) with equipment-specific minimums (critical: 180d, standard: 90d, accessory: 60d), automatic optimal window calculation, tier-based confidence multipliers (Bronze: 0.85x, Silver: 1.0x, Gold: 1.15x, Platinum: 1.2x), and science-backed 730-day maximum cap preventing model degradation. Aligns with IBM Maximo (6+ months), Azure IoT (2-3 months minimum), and 2024 LSTM research showing diminishing returns beyond 12-18 months. **Legacy Model Enrichment**: API automatically enriches legacy ML models with tier metadata on-the-fly; models with lookbackDays calculate tier dynamically, while models lacking hyperparameters default to 30-day Bronze tier (0.85x) with isLegacy flag for backward compatibility.
- **ML-LLM Integration**: Seamless integration between ML predictions and LLM report generation to enrich report contexts.
- **ML/PDM Data Export System**: Comprehensive data portability for migration to competing predictive maintenance platforms. JSON exports include complete org-scoped datasets (raw telemetry, ML models, failure predictions, anomalies, threshold optimizations, PDM scores) compatible with IBM Maximo, Azure IoT, SAP PM, Oracle EAM. Raw telemetry data (org-filtered via vessel join) enables competing platforms to train their own predictive models from scratch using actual sensor readings. CSV exports provide standards-compliant ML models with full tier metadata for spreadsheet analysis in Excel, Pandas, or BI tools. All models enriched with adaptive training window tier metadata; legacy models without historical data receive Bronze 30-day defaults. RFC 4180-compliant CSV escaping ensures proper parsing in mainstream tools. Multi-tenant security enforced through vessel-based org filtering.

## System Design Choices
- **Database**: PostgreSQL with Drizzle ORM (neon-serverless driver).
- **Schema**: Normalized, UUID primary keys, timestamp tracking.
- **Authentication**: HMAC for edge device communication.
- **Storage Abstraction**: Interface-based layer.
- **Data Integrity**: Comprehensive cascade deletion with transactions, admin authentication, audit logging, and rate limiting.
- **Security**: Improved CSV export injection protection.
- **Performance Optimizations**: Implemented cache tuning (TanStack Query), increased background job concurrency, added strategic database indexes (composite, covering hot paths), and utilized materialized views for pre-computed aggregations. These optimizations resulted in a ~60-70% overall performance improvement across telemetry ingestion, real-time dashboards, and ML workloads.

# External Dependencies

- **PostgreSQL**: Primary relational database.
- **Neon Database**: Cloud hosting for PostgreSQL.
- **OpenAI**: Used for AI-powered report generation and predictive analytics.
- **TensorFlow.js (@tensorflow/tfjs-node)**: Neural network framework for LSTM time-series forecasting.
- **Edge Devices**: Marine equipment and IoT devices providing telemetry data.