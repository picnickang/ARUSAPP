import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { createServer } from 'http';
import type { Express } from 'express';
import cors from 'cors';
import { json } from 'express';

import { typeDefs } from './graphql-schema';
import { resolvers } from './graphql-resolvers';

export async function createGraphQLServer(app: Express, httpServer: any) {
  // Create Apollo Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [
      // Proper shutdown for the HTTP server
      ApolloServerPluginDrainHttpServer({ httpServer }),
    ],
    // Enhanced introspection and playground for development
    introspection: process.env.NODE_ENV === 'development',
    formatError: (err) => {
      // Log the error for debugging
      console.error('GraphQL Error:', err);
      
      // Return a formatted error
      return {
        message: err.message,
        code: err.extensions?.code,
        path: err.path,
        locations: err.locations,
        // Don't expose internal errors in production
        ...(process.env.NODE_ENV === 'development' && {
          stack: err.stack,
          source: err.source
        })
      };
    }
  });

  // Start the server
  await server.start();

  // Apply the Apollo GraphQL middleware
  app.use(
    '/graphql',
    cors<cors.CorsRequest>({
      origin: process.env.NODE_ENV === 'development' 
        ? ['http://localhost:5000', 'https://studio.apollographql.com']
        : process.env.ALLOWED_ORIGINS?.split(',') || [],
      credentials: true
    }),
    json({ limit: '50mb' }), // Increase limit for large telemetry batches
    expressMiddleware(server, {
      context: async ({ req, res }) => {
        // Context that will be available in all resolvers
        return {
          req,
          res,
          // Add user context here when authentication is implemented
          user: null,
          // Request tracking for observability
          requestId: req.headers['x-request-id'] || `gql-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          startTime: Date.now()
        };
      },
    }),
  );

  console.log('🚀 GraphQL Server ready at /graphql');
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🎯 GraphQL Playground available at http://localhost:5000/graphql');
    console.log('📊 Apollo Studio: https://studio.apollographql.com/sandbox/explorer');
  }

  return server;
}

// GraphQL Schema documentation
export const GRAPHQL_FEATURES = {
  'Core Fleet Management': [
    'vessels - Get all vessels in the fleet',
    'vessel(id) - Get specific vessel details',
    'equipment - Get equipment by vessel or all equipment'
  ],
  'Telemetry & Analytics': [
    'telemetryReadings - Query telemetry data with filters',
    'ingestTelemetry - Add new telemetry readings'
  ],
  'Advanced Analytics (Phase 1-3)': [
    'mqttStatus - Real-time MQTT service status',
    'mlAnalytics - Machine learning insights for equipment',
    'digitalTwin - Digital twin simulation data',
    'startMLAnalysis - Trigger ML analysis jobs'
  ],
  'External Integrations (Phase 4)': [
    'marineWeather - Weather data for maritime operations',
    'vesselTracking - Real-time vessel position tracking',
    'portInformation - Port facilities and services data',
    'processWebhook - Handle external system webhooks'
  ],
  'Real-time Subscriptions': [
    'telemetryUpdates - Live telemetry data stream',
    'alertUpdates - Real-time system alerts',
    'mlAnalysisUpdates - ML analysis completion events',
    'digitalTwinUpdates - Digital twin state changes'
  ]
};