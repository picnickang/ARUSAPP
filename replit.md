# Overview

ARUS (Marine Predictive Maintenance & Scheduling) is a full-stack web application designed for monitoring marine equipment health, processing telemetry data, and performing predictive maintenance. Its core purpose is to enhance operational efficiency, reduce downtime through advanced predictive analytics, and ensure regulatory compliance for marine fleets. Key capabilities include real-time device monitoring, equipment health analytics, intelligent predictive maintenance scheduling, and advanced inventory management. The project aims to deliver a comprehensive, intelligent platform leveraging advanced predictive analytics and compliance tools to improve fleet management.

# Recent Changes

## October 6, 2025: ML-LLM Integration Complete
- ✅ **Integration Achieved**: ML predictions now seamlessly flow into LLM report generation
- ✅ **Critical Bug Fixes**:
  - Fixed timestamp conversion bug (string to Date objects in sanitizeTelemetry)
  - Fixed parameter order bug in storage.getEquipment calls (orgId, equipmentId)
  - Fixed Random Forest feature importances iteration (object to Map conversion)
- ✅ **Enhanced Report Context**: ReportContextBuilder enriches contexts with ML predictions when includePredictions=true
- ✅ **LLM Prompt Enhancement**: EnhancedLLMService explicitly instructs GPT-4 to use ML predictions in analysis
- ✅ **Test Verification**: Integration test confirms 6 predictions successfully included in LLM context with failure probabilities, health scores, and recommendations
- 📊 **ML Models Active**: LSTM (100% accuracy on pumps), Random Forest (50% accuracy on engines), Hybrid predictions combining both

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Decisions

The frontend is a React 18 single-page application built with TypeScript, featuring a component-based architecture and `shadcn/ui`. It uses Wouter for routing and TanStack Query for server state management. The design includes a comprehensive theme system (light/dark/system modes), a professional aesthetic with grouped sidebar navigation, and a command palette. Mobile-optimized components are utilized for AI insights.

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
- **Predictive Maintenance Scheduling**: Calendar/list views, auto-scheduling based on PdM scores, automatic triggers, WebSocket notifications, and automated cron-based analysis for failure predictions.
- **Telemetry Ingestion**: Manual CSV/JSON import, HTTP/MQTT transport, robust CSV parsing, J1939 CAN bus, J1708/J1587 serial protocols.
- **Crew Scheduling**: Optimization for fairness and preferences.
- **STCW Hours of Rest**: Maritime compliance engine with PDF report generation.
- **Condition-Based Maintenance**: Oil analysis, wear particle analysis, multi-factor condition assessment, and critical DTC override.
- **Cost Synchronization**: Real-time synchronization of unit costs, comprehensive vessel cost analysis.
- **LLM Reports System**: AI-powered reports (Health, Fleet Summary, Maintenance, Compliance) using OpenAI, with structured data output and enhanced resilience (retry mechanisms, model fallback).
- **Enhanced LLM & Vessel Intelligence System**: Advanced AI/ML with anomaly detection, predictive failure risk, report context building, and multi-model support.
- **Sensor Configuration System**: CRUD operations for sensor configurations, real-time application to incoming sensor data.
- **Comprehensive Sync Expansion**: Advanced data quality monitoring with a 5-tier reconciliation system.
- **Equipment Registry Vessel Integration**: Enhanced equipment management with vessel assignment and linkage to dashboard metrics.
- **Work Order Downtime Integration**: Estimated and actual downtime tracking for work orders, with intelligent parts suggestions based on sensor issues.
- **Real-time Multi-Device Synchronization**: WebSocket-based broadcasting for instant data propagation.
- **DTC (Diagnostic Trouble Code) System**: J1939 fault code retrieval and translation, active/historical fault tracking, severity-based alerting, dedicated diagnostics page. Integrates with work order auto-creation, equipment health penalties, AI/LLM reports, alert system, financial impact, dashboard metrics, telemetry correlation, and condition-based maintenance.
- **Vessel Export/Import/Deletion System**: Complete vessel data portability with JSON export/import and comprehensive deletion of associated data.
- **Advanced Data Linking & Predictive Analytics Enhancement**: Comprehensive system for connecting predictions, maintenance, costs, crew, and inventory for continuous AI improvement.
- **Dashboard Metrics History**: Comprehensive historical tracking for dashboard KPIs with dynamic trend calculations.
- **Advanced ML & Acoustic Monitoring (October 2025)**: Comprehensive machine learning system with LSTM neural networks for time-series failure forecasting, Random Forest classifiers for health classification, acoustic monitoring with frequency analysis and sound pressure level assessment, automated ML training pipeline with historical failure data collection, hybrid prediction service combining multiple models, and complete REST API for training/prediction/acoustic analysis. Includes robust telemetry sanitization and multi-tenant data isolation.
- **ML-LLM Integration (October 2025)**: Seamless integration between ML prediction service and LLM report generation. ReportContextBuilder now enriches report contexts with ML predictions (failure probabilities, health scores, remaining useful life) when `includePredictions=true`. EnhancedLLMService prompts explicitly instruct GPT-4 to incorporate ML predictions into analysis. Critical bug fixes: timestamp conversion (string to Date objects), parameter ordering in storage access, and Random Forest feature importance iteration.

## System Design Choices
- **Database**: PostgreSQL with Drizzle ORM (neon-serverless driver).
- **Schema**: Normalized, UUID primary keys, timestamp tracking.
- **Authentication**: HMAC for edge device communication.
- **Storage Abstraction**: Interface-based layer.
- **Data Integrity**: Comprehensive cascade deletion system with transaction support for atomicity, admin authentication, audit logging, and rate limiting on critical operations.
- **Security**: Improved CSV export injection protection with comprehensive sanitization.
- **Performance**: Configurable AI insights throttling, buffer size limits for telemetry ingestion, and configurable timestamp validation tolerance.

# External Dependencies

- **PostgreSQL**: Primary database.
- **Neon Database**: Cloud hosting for PostgreSQL.
- **OpenAI**: Integrated for AI-powered report generation and predictive analytics.
- **TensorFlow.js (@tensorflow/tfjs-node)**: Neural network framework for LSTM time-series forecasting.
- **Edge Devices**: Marine equipment providing telemetry data.