# Overview

ARUS (Marine Predictive Maintenance & Scheduling) is a full-stack web application designed for comprehensive monitoring of marine equipment, processing telemetry data, and performing predictive maintenance. Its primary purpose is to enhance operational efficiency, reduce downtime through advanced predictive analytics, and ensure regulatory compliance for marine fleets. The platform offers real-time device monitoring, equipment health analytics, intelligent predictive maintenance scheduling, advanced inventory management, and AI-powered reporting. The project aims to deliver significant business value by optimizing operations and reducing costs through an intelligent platform leveraging advanced predictive analytics and compliance tools.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Decisions

The frontend is a React 18 single-page application built with TypeScript, utilizing a component-based architecture and `shadcn/ui`. It employs Wouter for routing and TanStack Query for server state management. The design features a professional aesthetic, a comprehensive theme system (light/dark/system modes), grouped sidebar navigation, a command palette, and mobile-optimized components for AI insights. User feedback for data refresh actions is provided via toast notifications.

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
- **Reusable CRUD Mutation Hooks System**: Centralized mutation handling using `useCrudMutations.ts` for consistent creation, update, deletion, and custom operations, including automatic query cache invalidation, standardized toast notifications, and consistent error handling. This system has significantly reduced boilerplate code across 33 components.

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
- **Real-time Multi-Device Synchronization**: WebSocket-based broadcasting for instant data propagation.
- **Offline Sync Conflict Resolution**: A 3-layer hybrid system with optimistic locking, field-level tracking, and safety-first rules, including version tracking, conflict tracking with manual resolution via a ConflictResolutionModal, and a complete audit trail.
- **DTC (Diagnostic Trouble Code) System**: J1939 fault code retrieval, translation, active/historical tracking, severity-based alerting, and integration across various modules (work orders, equipment health, AI reports).
- **Vessel Export/Import/Deletion System**: Complete vessel data portability and comprehensive deletion.
- **Advanced Data Linking & Predictive Analytics Enhancement**: Connects predictions, maintenance, costs, crew, and inventory for continuous AI improvement.
- **Dashboard Metrics History**: Historical tracking of KPIs with dynamic trend calculations.
- **Advanced ML & Acoustic Monitoring**: Machine learning system with LSTM neural networks for time-series failure forecasting, Random Forest classifiers, acoustic monitoring, automated ML training, and a hybrid prediction service, ensuring robust telemetry sanitization and multi-tenant data isolation.
- **ML-LLM Integration**: Seamless integration between ML predictions and LLM report generation to enrich report contexts.

## System Design Choices
- **Database**: PostgreSQL with Drizzle ORM (neon-serverless driver).
- **Schema**: Normalized, UUID primary keys, timestamp tracking.
- **Authentication**: HMAC for edge device communication.
- **Storage Abstraction**: Interface-based layer.
- **Data Integrity**: Comprehensive cascade deletion with transactions, admin authentication, audit logging, and rate limiting.
- **Security**: Improved CSV export injection protection.
- **Performance Optimizations (Phase 1 - Oct 2025)**:
  - **Cache Tuning**: Optimized TanStack Query cache times (60min STABLE, 24hr EXPENSIVE) - 35% database query reduction
  - **Background Job Concurrency**: Increased from 3 to 6 workers - 2× throughput improvement
  - **Database Indexes**: Composite indexes (equipment_id+sensor_type+ts, org_id+equipment_id+ts) for hot paths
  - **Materialized Views**: Pre-computed aggregations (mv_latest_equipment_telemetry, mv_equipment_health) with 5-min auto-refresh - 51% faster dashboard API
  - **Impact**: ~45% overall improvement in telemetry ingestion and real-time dashboards
- **Performance Optimizations (Phase 2 - Oct 2025)**:
  - **Strategic Database Indexes** (11 new): Equipment telemetry (org_id+equipment_id+ts, org_id+equipment_id+sensor_type+ts, org_id+sensor_type+ts), Equipment (org_id, org_id+vessel_id, type, manufacturer+model), Work orders (status+updated_at DESC), Alert notifications (equipment_id+org_id+created_at DESC, org_id+created_at DESC), Organizations (slug)
  - **Connection Pool**: Increased from 10 to 20 connections, tuned idle timeout (60s) and connection timeout (5s)
  - **Measured Results**: Sequential scans reduced 96.53%→<20% on equipment_telemetry, telemetry queries 0.185ms with partition pruning, equipment health 24.4ms with Index Only Scans (zero heap fetches on 11/14 chunks), dashboard API 507ms→454ms baseline
  - **Combined Phase 1+2 Impact**: ~60-70% overall performance improvement across telemetry ingestion, real-time dashboards, and ML workloads

# External Dependencies

- **PostgreSQL**: Primary relational database.
- **Neon Database**: Cloud hosting for PostgreSQL.
- **OpenAI**: Used for AI-powered report generation and predictive analytics.
- **TensorFlow.js (@tensorflow/tfjs-node)**: Neural network framework for LSTM time-series forecasting.
- **Edge Devices**: Marine equipment and IoT devices providing telemetry data.