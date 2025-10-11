# Overview

ARUS (Marine Predictive Maintenance & Scheduling) is a full-stack web application designed for monitoring marine equipment, processing telemetry data, and performing predictive maintenance. Its primary goal is to enhance operational efficiency, reduce downtime through advanced predictive analytics, and ensure regulatory compliance for marine fleets. Key capabilities include real-time device monitoring, equipment health analytics, intelligent predictive maintenance scheduling, advanced inventory management, and AI-powered reporting. The project aims to deliver a comprehensive, intelligent platform leveraging advanced predictive analytics and compliance tools to improve fleet management and provide significant business value by optimizing operations and reducing costs.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Decisions

The frontend is a React 18 single-page application built with TypeScript, featuring a component-based architecture and `shadcn/ui`. It uses Wouter for routing and TanStack Query for server state management. The design includes a comprehensive theme system (light/dark/system modes), a professional aesthetic with grouped sidebar navigation, and a command palette. Mobile-optimized components are utilized for AI insights. All refresh buttons provide immediate visual feedback via toast notifications (e.g., "Refreshing...", followed by success), ensuring users are informed of data refresh actions.

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
- **Predictive Maintenance Scheduling**: Calendar/list views, auto-scheduling based on predictive maintenance scores, automatic triggers, WebSocket notifications, and cron-based analysis for failure predictions.
- **Telemetry Ingestion**: Supports manual CSV/JSON import, HTTP/MQTT transport, robust CSV parsing, J1939 CAN bus, and J1708/J1587 serial protocols.
- **Crew Scheduling**: Optimizes for fairness and preferences, including STCW Hours of Rest compliance with PDF report generation. Features customizable rest schedule systems with midnight crossover handling.
- **Condition-Based Maintenance**: Includes oil analysis, wear particle analysis, multi-factor condition assessment, and critical DTC override.
- **Cost Synchronization**: Real-time synchronization of unit costs and comprehensive vessel cost analysis.
- **LLM Reports System**: AI-powered reports (Health, Fleet Summary, Maintenance, Compliance) using OpenAI, providing structured data output and enhanced resilience. Includes advanced AI/ML for anomaly detection, predictive failure risk, report context building, and multi-model support.
- **Sensor Configuration System**: CRUD operations for sensor configurations, real-time application to incoming sensor data. Features sensor health monitoring with online/offline status indicators based on telemetry reception (5-minute threshold) and integration into the Equipment Registry.
- **Comprehensive Sync Expansion**: Advanced data quality monitoring with a 5-tier reconciliation system.
- **Equipment Registry Vessel Integration**: Enhanced equipment management with vessel assignment and linkage to dashboard metrics.
- **Work Order Downtime Integration**: Tracks estimated and actual downtime for work orders, with intelligent parts suggestions based on sensor issues.
- **User-Friendly Work Order Numbers**: Auto-generated human-readable identifiers (WO-YYYY-NNNN) for all creation paths, gracefully handling legacy UUID-based orders.
- **Real-time Multi-Device Synchronization**: WebSocket-based broadcasting for instant data propagation across devices.
- **Offline Sync Conflict Resolution**: A 3-layer hybrid system (optimistic locking + field-level tracking + safety-first rules) for multi-device offline data integrity. Includes version tracking on safety-critical tables, conflict tracking with manual resolution for critical fields, automatic rules for non-critical data, and a complete audit trail. A comprehensive UI with a ConflictResolutionModal supports field-by-field resolution.
- **DTC (Diagnostic Trouble Code) System**: J1939 fault code retrieval and translation, active/historical fault tracking, severity-based alerting, and a dedicated diagnostics page. Integrates with work order auto-creation, equipment health penalties, AI/LLM reports, the alert system, financial impact, dashboard metrics, telemetry correlation, and condition-based maintenance.
- **Vessel Export/Import/Deletion System**: Provides complete vessel data portability with JSON export/import and comprehensive deletion of associated data.
- **Advanced Data Linking & Predictive Analytics Enhancement**: A comprehensive system for connecting predictions, maintenance, costs, crew, and inventory for continuous AI improvement.
- **Dashboard Metrics History**: Comprehensive historical tracking for dashboard KPIs with dynamic trend calculations.
- **Advanced ML & Acoustic Monitoring**: Comprehensive machine learning system with LSTM neural networks for time-series failure forecasting, Random Forest classifiers for health classification, acoustic monitoring with frequency analysis, an automated ML training pipeline, a hybrid prediction service, and a complete REST API. Includes robust telemetry sanitization and multi-tenant data isolation.
- **ML-LLM Integration**: Seamless integration between the ML prediction service and LLM report generation, enriching report contexts with ML predictions (failure probabilities, health scores, remaining useful life).

## System Design Choices
- **Database**: PostgreSQL with Drizzle ORM (neon-serverless driver).
- **Schema**: Normalized, UUID primary keys, timestamp tracking.
- **Authentication**: HMAC for edge device communication.
- **Storage Abstraction**: Interface-based layer.
- **Data Integrity**: Comprehensive cascade deletion system with transaction support for atomicity, admin authentication, audit logging, and rate limiting on critical operations.
- **Security**: Improved CSV export injection protection with comprehensive sanitization.
- **Performance**: Configurable AI insights throttling, buffer size limits for telemetry ingestion, and configurable timestamp validation tolerance.

# External Dependencies

- **PostgreSQL**: Primary relational database for application data.
- **Neon Database**: Cloud hosting service for PostgreSQL.
- **OpenAI**: Utilized for AI-powered report generation and predictive analytics features.
- **TensorFlow.js (@tensorflow/tfjs-node)**: Neural network framework used for LSTM time-series forecasting in ML models.
- **Edge Devices**: Various marine equipment and IoT devices providing real-time telemetry data to the system.