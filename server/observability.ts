import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

// Prometheus metrics
const httpRequestsTotal = new client.Counter({
  name: 'arus_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status_code']
});

const httpRequestDuration = new client.Histogram({
  name: 'arus_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const databaseConnectionsTotal = new client.Gauge({
  name: 'arus_database_connections_active',
  help: 'Active database connections'
});

// Middleware for request tracking
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  // Track when response finishes
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const labels = {
      method: req.method,
      path: req.route?.path || req.path,
      status_code: res.statusCode.toString()
    };
    
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, duration);
  });
  
  next();
}

// Health check endpoints
export function healthzEndpoint(req: Request, res: Response) {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}

export async function readyzEndpoint(req: Request, res: Response) {
  try {
    // Check database connectivity (using your existing storage)
    const { storage } = await import('./storage');
    await storage.getDevices(); // Simple health check query
    
    res.json({ 
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ok'
      }
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'not ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'error'
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function metricsEndpoint(req: Request, res: Response) {
  try {
    res.set('Content-Type', client.register.contentType);
    const metrics = await client.register.metrics();
    res.send(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
}

// Initialize default metrics collection
export function initializeMetrics() {
  // Collect default Node.js metrics
  client.collectDefaultMetrics({
    prefix: 'arus_',
    gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
  });
  
  console.log('Observability metrics initialized');
}