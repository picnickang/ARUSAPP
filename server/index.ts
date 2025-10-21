// CRITICAL: Suppress TensorFlow CPU warnings BEFORE any TensorFlow imports
// Must be first line to ensure env var is set before module loading
process.env.TF_CPP_MIN_LOG_LEVEL = '2';

import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { registerRoutes } from "./routes";
import { 
  additionalSecurityHeaders, 
  sanitizeRequestData, 
  detectAttackPatterns,
  secureErrorHandler 
} from "./security";
import { enhancedErrorHandler } from "./error-handling";
import { startBackgroundJobs } from "./job-processors";
import { getLoadBalancerHealth } from "./scalability";
import { metricsMiddleware } from './observability';
// Lazy imports for schedulers and services (moved inside async IIFE to prevent module-load crashes)
import { isLocalMode } from './db-config';

// Environment configuration validation
function validateEnvironment() {
  console.log("\n=== ARUS Environment Configuration ===");
  
  const isReplit = !!(process.env.REPL_ID || process.env.REPL_SLUG || process.env.REPLIT_DB_URL);
  console.log(`Environment: ${isReplit ? 'Replit' : 'External/Self-hosted'}`);
  
  const localMode = process.env.LOCAL_MODE === 'true';
  console.log(`Deployment Mode: ${localMode ? 'VESSEL (Offline-First)' : 'CLOUD (Online)'}`);
  
  // Database configuration (required for cloud mode, optional for local mode)
  if (process.env.DATABASE_URL) {
    console.log("✓ Database: PostgreSQL configured");
  } else if (!localMode) {
    console.error("✗ Database: DATABASE_URL not set (REQUIRED for cloud mode)");
  } else {
    console.log("ℹ Database: Running in local mode (PostgreSQL optional)");
  }
  
  // Local mode sync configuration
  if (localMode) {
    if (process.env.TURSO_SYNC_URL && process.env.TURSO_AUTH_TOKEN) {
      console.log("✓ Sync: Turso cloud sync enabled");
    } else {
      console.warn("⚠ Sync: Running offline-only (no cloud sync configured)");
    }
  }
  
  // Object storage (optional)
  if (isReplit) {
    console.log("✓ Object Storage: Replit GCS available");
  } else {
    console.log("ℹ Object Storage: Disabled (Replit-only feature)");
  }
  
  // OpenAI integration (optional)
  if (process.env.OPENAI_API_KEY) {
    console.log("✓ AI Features: OpenAI API configured");
  } else {
    console.log("ℹ AI Features: OpenAI API key not set (AI reports disabled)");
  }
  
  // Session configuration (recommended)
  if (process.env.SESSION_SECRET) {
    console.log("✓ Security: Session secret configured");
  } else {
    console.warn("⚠ Security: SESSION_SECRET not set (using default - not recommended for production)");
  }
  
  console.log("======================================\n");
  
  return {
    isReplit,
    isLocalMode: localMode,
    hasDatabase: !!process.env.DATABASE_URL || localMode,
    hasObjectStorage: isReplit,
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasSessionSecret: !!process.env.SESSION_SECRET
  };
}

const app = express();

// Trust proxy settings for rate limiting and security headers
app.set('trust proxy', true); // Trust all proxies in Replit's multi-proxy chain

// Security middleware configuration - environment-specific CSP
const isDevelopment = process.env.NODE_ENV === 'development';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: isDevelopment 
        ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"] // Dev mode: allow for hot reload
        : ["'self'"], // Production: strict CSP
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for dev mode
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration for production readiness
const corsOriginFunction = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  // Allow requests with no origin (mobile apps, Postman, etc.)
  if (!origin) return callback(null, true);
  
  if (process.env.NODE_ENV === 'development') {
    return callback(null, true); // Allow all origins in development
  }
  
  // Production: Check against environment variable or Replit defaults
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').filter(Boolean);
  if (allowedOrigins && allowedOrigins.length > 0) {
    // Use explicit allow list if provided
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin.includes('*')) {
        // Support wildcards like *.replit.app
        const regex = new RegExp('^' + allowedOrigin.replace(/\*/g, '.*') + '$');
        return regex.test(origin);
      }
      return origin === allowedOrigin;
    });
    return callback(null, isAllowed);
  }
  
  // Default Replit domain patterns
  const replitDomainPattern = /^https:\/\/[a-zA-Z0-9-]+\.replit\.(app|dev)$/;
  const isReplit = replitDomainPattern.test(origin);
  
  if (!isReplit) {
    console.warn(`🚨 CORS: Blocked origin ${origin}`);
  }
  
  callback(null, isReplit);
};

app.use(cors({
  origin: corsOriginFunction,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'X-Device-Id',
    'X-Equipment-Id',
    'X-HMAC-Signature',
    'x-org-id'
  ],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
}));

// Request size limits for security (generous for telemetry data)
app.use(express.json({ 
  limit: '50mb', // Increased limit for telemetry bulk uploads
  verify: (req, res, buf) => {
    // Store raw body for HMAC validation
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: false, 
  limit: '50mb' 
}));

// Additional security middleware (order matters for validation)
app.use(additionalSecurityHeaders);
app.use(detectAttackPatterns); // Detect attacks before sanitization 
app.use(sanitizeRequestData); // Sanitize after detection but before routes

// Observability middleware for performance monitoring (already added in routes)

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

// Export app for testing (before IIFE)
export { app };

// Application readiness flag for health checks
let isApplicationReady = false;

// Readiness check endpoint - must be available immediately
app.get('/readyz', (req, res) => {
  if (isApplicationReady) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'initializing' });
  }
});

(async () => {
  try {
    // Validate environment configuration
    const envConfig = validateEnvironment();
    
    if (!envConfig.hasDatabase) {
      console.error("❌ FATAL: DATABASE_URL is required. Application cannot start.");
      process.exit(1);
    }
    
    console.log('→ Starting application initialization...');
    
    // CRITICAL FIX: Open port FIRST before heavy initialization to prevent Render timeout
    // We'll set up routes and open the port, then complete initialization in background
    
    // Setup authentication middleware first (required for routes)
    console.log('→ Setting up middleware...');
    const { requireAuthentication } = await import("./security");
    const { requireOrgId } = await import("./middleware/auth");
    const { withDatabaseContext } = await import("./middleware/db-context");
    
    app.use('/api', requireAuthentication);
    app.use('/api', requireOrgId);
    app.use('/api', withDatabaseContext);
    console.log('✓ Middleware configured');
    
    // Register routes and create server
    console.log('→ Registering routes...');
    const server = await registerRoutes(app);
    console.log('✓ Routes registered');
    
    // OPEN PORT IMMEDIATELY - Render needs this within 60 seconds
    const port = parseInt(process.env.PORT || '5000', 10);
    server.listen(port, "0.0.0.0", () => {
      console.log(`✅ Server listening on port ${port} (initialization continuing in background...)`);
    });
    
    // Now do heavy initialization work while server is already accepting connections
    console.log('→ Initializing database...');
    const { initializeDatabase } = await import("./storage");
    await initializeDatabase();
    console.log('✓ Database initialized successfully');
  
  // Start sync manager for local/vessel deployments
  if (isLocalMode) {
    console.log('→ Starting sync services...');
    const { syncManager } = await import('./sync-manager');
    const { telemetryPruningService } = await import('./telemetry-pruning-service');
    const { mqttReliableSync } = await import('./mqtt-reliable-sync');
    
    await syncManager.start();
    
    // Start telemetry pruning service (prevents database bloat)
    await telemetryPruningService.start();
    console.log('✓ Telemetry pruning service started');
    
    // Start MQTT reliable sync for critical data
    await mqttReliableSync.start();
    console.log('✓ MQTT reliable sync ready');
  }
  
  // Initialize background job system for scalability
  console.log('→ Starting background jobs...');
  startBackgroundJobs();
  console.log('✓ Background jobs started');
  
  // Setup insights scheduling
  console.log('→ Setting up schedulers...');
  const { setupInsightsSchedule, setupPredictiveMaintenanceSchedule, setupMLRetrainingSchedule } = await import('./insights-scheduler');
  const { setupVesselSchedules } = await import('./vessel-scheduler');
  const { setupOptimizationCleanupSchedule } = await import('./optimization-cleanup-scheduler');
  const { setupMaterializedViewRefresh } = await import('./materialized-view-scheduler');
  
  setupInsightsSchedule();
  
  // Setup predictive maintenance scheduling
  setupPredictiveMaintenanceSchedule();
  
  // Setup ML model retraining evaluation scheduling
  setupMLRetrainingSchedule();
  
  // Setup vessel operation scheduling
  setupVesselSchedules();
  
  // Setup optimization cleanup scheduling
  setupOptimizationCleanupSchedule();
  
  // Setup materialized view refresh (Performance Optimization Phase 1 - Oct 2025)
  setupMaterializedViewRefresh();
  console.log('✓ Schedulers configured');
  
  // Use enhanced error handler (includes security features)
  app.use(enhancedErrorHandler);

  // Setup Vite or static file serving (server is already listening)
  if (app.get("env") === "development") {
    console.log('→ Setting up Vite dev server...');
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
    console.log('✓ Vite dev server configured');
  } else {
    // Production: serve static files directly without vite
    console.log('→ Setting up production static file serving...');
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const distPath = path.resolve(__dirname, "public");
    
    console.log(`  Checking for build directory: ${distPath}`);
    if (!fs.existsSync(distPath)) {
      console.error(`❌ Build directory not found: ${distPath}`);
      throw new Error(
        `Could not find the build directory: ${distPath}, make sure to build the client first`
      );
    }
    console.log('✓ Build directory found');

    app.use(express.static(distPath));
    app.use("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
    console.log('✓ Static file serving configured');
  }
  
  // Mark application as fully ready
  isApplicationReady = true;
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`✅ ${formattedTime} [express] Application initialization complete`);
  console.log(`🚀 ARUS application is now live!`);
  } catch (error) {
    console.error('\n❌ FATAL ERROR during application initialization:');
    console.error(error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
})();
