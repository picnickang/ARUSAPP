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
- **Production Code Quality Enhancement**: Comprehensive cleanup of debugging logs, improved error handling, centralized export utilities, navigation refactoring, and a plan for large file refactoring.

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

## System Design Choices
- **Database**: PostgreSQL with Drizzle ORM (neon-serverless driver).
- **Schema**: Normalized, UUID primary keys, timestamp tracking.
- **Authentication**: HMAC for edge devices; Admin authentication via `ADMIN_TOKEN` environment variable.
- **Storage Abstraction**: Interface-based layer.
- **Data Integrity**: Comprehensive cascade deletion with transactions, admin authentication, audit logging, and rate limiting.
- **Security**: Improved CSV export injection protection; Uses `VITE_ADMIN_TOKEN` for frontend admin access.
- **Performance Optimizations**: Cache tuning, increased background job concurrency, strategic database indexes, and materialized views.

## Configuration Requirements
- **Admin Token Setup**: The `VITE_ADMIN_TOKEN` environment variable must match the `ADMIN_TOKEN` secret for frontend admin features to work.

# External Dependencies

- **PostgreSQL**: Primary relational database.
- **Neon Database**: Cloud hosting for PostgreSQL.
- **OpenAI**: Used for AI-powered report generation and predictive analytics.
- **TensorFlow.js (@tensorflow/tfjs-node)**: Neural network framework for LSTM time-series forecasting.
- **Edge Devices**: Marine equipment and IoT devices providing telemetry data.