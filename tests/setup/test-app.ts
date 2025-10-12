/**
 * Test Application Setup
 * 
 * Creates a properly configured Express app for integration testing
 * without starting the server or initializing background jobs.
 */

import express from "express";
import helmet from "helmet";
import cors from "cors";
import { registerRoutes } from "../../server/routes";
import { initializeDatabase } from "../../server/storage";

let testApp: any = null;
let initialized = false;

/**
 * Get or create test application instance
 * Singleton pattern to ensure routes are only registered once
 */
export async function getTestApp() {
  if (testApp) {
    return testApp;
  }

  const app = express();

  // Minimal security middleware for testing
  app.use(helmet({
    contentSecurityPolicy: false // Disable CSP for testing
  }));

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Trust proxy for rate limiting
  app.set('trust proxy', true);

  // Initialize database BEFORE registering routes
  if (!initialized) {
    await initializeDatabase();
    initialized = true;
  }

  // Register all routes - THIS ACTUALLY SETS UP THE API ENDPOINTS
  await registerRoutes(app);

  testApp = app;
  return app;
}

/**
 * Reset test app (useful between test suites)
 */
export function resetTestApp() {
  testApp = null;
}
