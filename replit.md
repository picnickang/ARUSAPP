# Overview

ARUS (Marine Predictive Maintenance & Scheduling) is a full-stack web application for monitoring and managing marine equipment health. It processes telemetry from edge devices, performs predictive maintenance scoring, and provides a dashboard for fleet management. Key capabilities include real-time device monitoring, equipment health analytics, work order management, system configuration, and intelligent predictive maintenance scheduling with automatic triggers.

The project's ambition is to offer a comprehensive, intelligent platform for marine operations, enhancing efficiency and reducing downtime through advanced predictive analytics and compliance tools. Recent significant additions include a production-ready Condition-Based Maintenance system, enhanced marine protocol support (J1708/J1587), real-time cost synchronization engine, and comprehensive sync expansion with data quality monitoring. Latest enhancement delivers advanced inventory management with real-time data reconciliation, purchase order tracking, and intelligent sensor threshold management.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Decisions

The frontend is a React 18 single-page application using TypeScript, built with a component-based architecture and shadcn/ui design system components. It utilizes Wouter for routing and TanStack Query for server state management. A dark theme design pattern is applied with CSS custom properties for consistent styling. The UI emphasizes professional design with data tables, dialogs, form validation, and real-time data display.

## Technical Implementations

### Frontend
- **Framework**: React 18, TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query (server state), local component state (UI interactions)
- **Styling**: Tailwind CSS, shadcn/ui
- **Type Safety**: Full TypeScript integration with shared backend schemas
- **Real-time**: Automatic query refetching

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
- **Sensor Configuration System**: Complete CRUD operations for sensor configurations, Drizzle ORM integration, professional web UI, real-time application to incoming sensor data (scaling, thresholds, EMA filtering).
- **Comprehensive Sync Expansion**: Advanced data quality monitoring with 5-tier reconciliation system: parts-stock cost alignment, reservation overflow detection, purchase order dependency tracking, crew certification expiry monitoring, and sensor threshold conflict resolution. Features enhanced system administration UI with real-time data quality metrics, defensive error handling, and structured reporting for maintaining inventory data integrity across the entire marine fleet management system.
- **Equipment Registry Vessel Integration**: Enhanced equipment management with vessel assignment through dropdown selection instead of free-text input. Features vessel association/disassociation via foreign keys, proper handling of legacy vessel names, and real-time UI updates. Includes backend API endpoints for equipment-vessel relationship management.
- **Work Order Downtime Integration**: Added estimated and actual downtime tracking fields to work order management. Features decimal hour inputs, proper database persistence, and form integration for both create and edit workflows. Supports vessel availability calculations and maintenance scheduling optimization.

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