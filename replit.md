# Overview

ARUS (Marine Predictive Maintenance & Scheduling) is a full-stack web application designed for monitoring and managing marine equipment health through predictive maintenance analytics. The system processes telemetry data from edge devices deployed on vessels, performs predictive maintenance scoring, and provides a comprehensive dashboard for fleet management. The application features real-time device monitoring, equipment health analytics, work order management, and system configuration capabilities.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client-side is built as a single-page application using React 18 with TypeScript, employing a component-based architecture with shadcn/ui design system components. The application uses Wouter for lightweight client-side routing and TanStack Query for server state management with automatic caching and synchronization. The UI follows a dark theme design pattern with CSS custom properties for consistent styling across components.

The frontend is organized into feature-based modules with shared components, hooks, and utilities. Key architectural decisions include:
- **State Management**: TanStack Query handles server state while local component state manages UI interactions
- **Styling**: Tailwind CSS with shadcn/ui components provides a consistent design system
- **Type Safety**: Full TypeScript integration with shared schema types between frontend and backend
- **Real-time Updates**: Automatic query refetching at configurable intervals for live data updates

## Backend Architecture
The server-side follows a RESTful API design using Express.js with TypeScript, implementing a clean separation between routing, business logic, and data access layers. The application uses a modular structure with dedicated route handlers for different feature domains (devices, health monitoring, work orders, settings).

Key backend architectural patterns:
- **Route Organization**: Feature-based route grouping with centralized error handling
- **Data Validation**: Zod schemas for request/response validation with shared types
- **Storage Abstraction**: Interface-based storage layer enabling different database implementations
- **Middleware Pipeline**: Request logging, JSON parsing, and error handling middleware

## Data Storage Solutions
The application uses PostgreSQL as the primary database with Drizzle ORM for type-safe database operations. The database schema is designed to handle:
- **Device Management**: Edge device registration and configuration
- **Telemetry Data**: Heartbeat and sensor data from edge devices
- **Predictive Analytics**: PdM scores and equipment health metrics
- **Work Orders**: Maintenance task management and tracking
- **System Configuration**: Application settings and preferences

Database design principles include:
- **Normalized Schema**: Separate tables for different data domains
- **UUID Primary Keys**: Consistent identifier strategy across entities
- **Timestamp Tracking**: Automatic creation and update time tracking
- **JSON Storage**: Flexible configuration and context data storage

## Authentication and Authorization
The current implementation appears to have placeholders for authentication mechanisms but doesn't include a fully implemented auth system. The architecture supports HMAC-based request validation for edge device communications and includes session storage configuration for future authentication implementation.

## External Service Integrations
The system is designed to integrate with:
- **Neon Database**: Cloud PostgreSQL hosting with serverless capabilities
- **Edge Devices**: HMAC-authenticated data ingestion from marine equipment
- **LLM Services**: Configurable AI/ML integration for predictive analytics (feature flag controlled)

The architecture supports additional integrations through environment variable configuration and modular service interfaces.