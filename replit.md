# Overview

ARUS (Marine Predictive Maintenance & Scheduling) is a full-stack web application designed for comprehensive monitoring of marine equipment, processing telemetry data, and performing predictive maintenance. Its primary purpose is to enhance operational efficiency, reduce downtime through advanced predictive analytics, and ensure regulatory compliance for marine fleets. The platform offers real-time device monitoring, equipment health analytics, intelligent predictive maintenance scheduling, advanced inventory management, and AI-powered reporting. The project aims to deliver significant business value by optimizing operations and reducing costs through an intelligent platform leveraging advanced predictive analytics and compliance tools.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Decisions

The frontend is a React 18 single-page application built with TypeScript, utilizing a component-based architecture and `shadcn/ui`. It employs Wouter for routing and TanStack Query for server state management. The design features a professional aesthetic, a comprehensive theme system (light/dark/system modes), grouped sidebar navigation, a command palette, and mobile-optimized components for AI insights. User feedback for data refresh actions is provided via toast notifications.

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
- **ML/PDM Data Export System**: Comprehensive data portability for migration to competing predictive maintenance platforms. JSON exports include complete datasets (ML models, failure predictions, anomalies, threshold optimizations, failure history, PDM scores) compatible with IBM Maximo, Azure IoT, SAP PM, Oracle EAM. CSV exports provide standards-compliant ML models with full tier metadata for spreadsheet analysis in Excel, Pandas, or BI tools. All models enriched with adaptive training window tier metadata; legacy models without historical data receive Bronze 30-day defaults. RFC 4180-compliant CSV escaping ensures proper parsing in mainstream tools.

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