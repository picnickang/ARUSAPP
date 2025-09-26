import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
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
    'X-HMAC-Signature'
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

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Observability is initialized automatically via observabilityMiddleware
  
  // Initialize database before setting up routes
  const { initializeDatabase } = await import("./storage");
  await initializeDatabase();
  
  // Initialize background job system for scalability
  startBackgroundJobs();
  
  const server = await registerRoutes(app);

  // Use enhanced error handler (includes security features)
  app.use(enhancedErrorHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
