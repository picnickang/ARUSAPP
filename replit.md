# Overview

ARUS (Marine Predictive Maintenance & Scheduling) is a full-stack web application for monitoring and managing marine equipment health. It processes telemetry data, performs predictive maintenance, and offers a comprehensive dashboard for fleet management. The platform aims to enhance operational efficiency, reduce downtime through advanced predictive analytics, and ensure compliance. Key capabilities include real-time device monitoring, equipment health analytics, work order management, system configuration, intelligent predictive maintenance scheduling, and advanced inventory management. The project's ambition is to deliver a comprehensive, intelligent platform leveraging advanced predictive analytics and compliance tools.

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

## System Design Choices
- **Database**: PostgreSQL with Drizzle ORM.
- **Schema**: Normalized, UUID primary keys, timestamp tracking.
- **Authentication**: HMAC for edge device communication.
- **Storage Abstraction**: Interface-based layer.

# External Dependencies

- **PostgreSQL**: Primary database.
- **Neon Database**: Cloud hosting for PostgreSQL.
- **OpenAI**: Integrated for AI-powered report generation (LLM Reports System).
- **Edge Devices**: Marine equipment providing telemetry data.