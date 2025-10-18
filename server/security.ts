/**
 * Enhanced Security Middleware and Utilities
 * Provides additional security measures beyond basic rate limiting and HMAC validation
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { storage } from './storage';

// Extend Request interface to include user context
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name?: string;
        role: string;
        orgId: string;
        isActive: boolean;
      };
    }
  }
}

/**
 * Additional input sanitization beyond Zod validation
 * More conservative for telemetry endpoints
 */
export function sanitizeInput(input: string, skipLengthLimit = false): string {
  if (typeof input !== 'string') return input;
  
  // Remove null bytes and other control characters
  let sanitized = input.replace(/\0/g, '');
  
  // Remove excessive whitespace (but preserve structure for JSON/data)
  sanitized = sanitized.trim();
  
  // Only limit length for non-telemetry data to prevent truncation of legitimate payloads
  if (!skipLengthLimit) {
    const maxLength = 10000;
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
  }
  
  return sanitized;
}

/**
 * Enhanced SQL injection prevention beyond Zod validation
 */
export function validateDatabaseIdentifier(identifier: string): boolean {
  // Allow only alphanumeric characters, underscores, and hyphens
  const pattern = /^[a-zA-Z0-9_-]+$/;
  return pattern.test(identifier) && identifier.length <= 100;
}

/**
 * XSS protection for output data
 */
export function sanitizeForHTML(input: string): string {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * NoSQL injection prevention for MongoDB-style queries
 */
export function sanitizeMongoQuery(query: any): any {
  if (typeof query !== 'object' || query === null) return query;
  
  const sanitized = Array.isArray(query) ? [] : {};
  
  for (const [key, value] of Object.entries(query)) {
    // Remove dangerous MongoDB operators
    if (key.startsWith('$')) {
      continue; // Skip MongoDB operators
    }
    
    if (typeof value === 'object' && value !== null) {
      (sanitized as any)[key] = sanitizeMongoQuery(value);
    } else if (typeof value === 'string') {
      (sanitized as any)[key] = sanitizeInput(value);
    } else {
      (sanitized as any)[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Middleware to add security headers beyond Helmet
 */
export function additionalSecurityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Referrer policy for privacy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Feature policy to restrict dangerous features
  res.setHeader('Permissions-Policy', 
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()');
  
  // Cache control for sensitive endpoints
  if (req.path.includes('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
}

/**
 * Request sanitization middleware
 * Skip aggressive sanitization for telemetry endpoints
 */
export function sanitizeRequestData(req: Request, res: Response, next: NextFunction) {
  // Skip aggressive sanitization for telemetry endpoints to preserve data integrity
  const isTelemetryEndpoint = req.path.includes('/telemetry') || 
                              req.path.includes('/import') ||
                              req.path.includes('/edge/heartbeat');
  
  // Sanitize query parameters
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        req.query[key] = sanitizeInput(value, isTelemetryEndpoint);
      } else if (Array.isArray(value)) {
        req.query[key] = value.map(v => typeof v === 'string' ? sanitizeInput(v, isTelemetryEndpoint) : v) as any;
      }
    }
  }
  
  // Sanitize URL parameters
  if (req.params) {
    for (const [key, value] of Object.entries(req.params)) {
      if (typeof value === 'string') {
        req.params[key] = sanitizeInput(value, isTelemetryEndpoint);
      }
    }
  }
  
  // Sanitize body for string fields (but preserve structured data for telemetry)
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeRequestBody(req.body, isTelemetryEndpoint);
  }
  
  next();
}

/**
 * Recursively sanitize request body while preserving data types
 */
function sanitizeRequestBody(obj: any, skipLengthLimit = false): any {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeRequestBody(item, skipLengthLimit));
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeInput(value, skipLengthLimit);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeRequestBody(value, skipLengthLimit);
      } else {
        sanitized[key] = value; // Preserve numbers, booleans, etc.
      }
    }
    return sanitized;
  }
  
  if (typeof obj === 'string') {
    return sanitizeInput(obj, skipLengthLimit);
  }
  
  return obj; // Numbers, booleans, etc.
}

/**
 * Vulnerability scanner for common attack patterns
 * Tuned to reduce false positives in production
 */
export function detectAttackPatterns(req: Request, res: Response, next: NextFunction) {
  // Skip pattern detection for certain safe paths
  const skipPaths = ['/api/healthz', '/api/readyz', '/api/metrics', '/favicon.ico'];
  if (skipPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  const suspicious = [
    // SQL injection patterns (more specific)
    /(\bunion\s+select\b|\bselect\s+.*\s+from\s+|\binsert\s+into\b|\bupdate\s+.*\s+set\b|\bdelete\s+from\b|\bdrop\s+table\b)/i,
    
    // XSS patterns (more specific)
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:\s*[^;]/i,
    /on(load|error|click|focus|blur)\s*=/i,
    
    // Path traversal (more specific)
    /\.\.[\/\\].*[\/\\]/,
    
    // Command injection (in query params and body only)
    /[;&|`$]\s*(rm|cat|ls|wget|curl|nc|bash|sh)\b/i,
  ];
  
  // Only check query params and body for most patterns (not headers)
  const sensitiveData = JSON.stringify({
    query: req.query,
    params: req.params,
    body: req.body
  });
  
  for (const pattern of suspicious) {
    if (pattern.test(sensitiveData)) {
      // Log security event without exposing sensitive data
      console.warn(`🚨 Potential security threat detected from ${req.ip} on ${req.method} ${req.path} - Pattern: ${pattern.source.substring(0, 20)}...`);
      
      // In production, increment security metrics and consider rate limiting
      if (process.env.NODE_ENV === 'production') {
        // TODO: Implement security alerting and rate limiting for flagged IPs
      }
      break;
    }
  }
  
  next();
}

/**
 * Enhanced error handler that doesn't leak sensitive information
 */
export function secureErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // Log full error details for debugging
  console.error('Security Error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  
  // Return generic error message to client
  const status = err.status || err.statusCode || 500;
  
  const safeMessage = status < 500 
    ? err.message || 'Request validation failed'
    : 'Internal server error';
  
  res.status(status).json({ 
    error: safeMessage,
    code: err.code || 'UNKNOWN_ERROR',
    timestamp: new Date().toISOString()
  });
}

/**
 * Authentication middleware - validates credentials for admin endpoints
 * Requires proper authorization header with a valid admin token
 */
export async function requireAuthentication(req: Request, res: Response, next: NextFunction) {
  try {
    // Development mode bypass - automatically authenticate as admin
    if (process.env.NODE_ENV === 'development') {
      const mockOrgId = 'default-org-id';
      req.user = {
        id: 'dev-admin-user',
        orgId: mockOrgId,
        email: 'admin@example.com',
        role: 'admin',
        name: 'Development Admin'
      };
      return next();
    }
    
    // Extract authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'Authorization header required', 
        code: 'MISSING_AUTH_HEADER',
        message: 'Admin endpoints require authentication. Provide Authorization header.' 
      });
    }
    
    // Check for Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Invalid authorization format', 
        code: 'INVALID_AUTH_FORMAT',
        message: 'Authorization header must be in format: Bearer <token>' 
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return res.status(401).json({ 
        error: 'No token provided', 
        code: 'MISSING_TOKEN',
        message: 'Bearer token is required for admin access' 
      });
    }
    
    // Require ADMIN_TOKEN environment variable to be set - fail closed if not configured
    const validAdminToken = process.env.ADMIN_TOKEN;
    
    if (!validAdminToken) {
      console.error('ADMIN_TOKEN environment variable is not configured. Admin endpoints disabled for security.');
      return res.status(503).json({ 
        error: 'Admin service unavailable', 
        code: 'ADMIN_SERVICE_DISABLED',
        message: 'Admin authentication is not configured. Contact system administrator.' 
      });
    }
    
    // Validate token against the configured secret
    if (token !== validAdminToken) {
      return res.status(401).json({ 
        error: 'Invalid token', 
        code: 'INVALID_TOKEN',
        message: 'Provided token is invalid or expired' 
      });
    }
    
    // Token is valid - look up or create admin user
    const mockOrgId = 'default-org-id';
    let user = await storage.getUserByEmail('admin@example.com', mockOrgId);
    
    // Only create admin user if token is valid (one-time setup)
    if (!user) {
      user = await storage.createUser({
        orgId: mockOrgId,
        email: 'admin@example.com',
        name: 'System Administrator',
        role: 'admin',
        isActive: true
      });
    }
    
    if (!user.isActive) {
      return res.status(401).json({ 
        error: 'User account is disabled', 
        code: 'ACCOUNT_DISABLED' 
      });
    }
    
    // Set authenticated user context
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
      isActive: user.isActive
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication service unavailable', code: 'AUTH_ERROR' });
  }
}

/**
 * Authorization middleware - requires admin role for admin endpoints
 */
export function requireAdminRole(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Admin access required', 
      code: 'INSUFFICIENT_PRIVILEGES',
      requiredRole: 'admin',
      userRole: req.user.role
    });
  }
  
  next();
}

/**
 * Organization scoping middleware - ensures user can only access their org data
 */
export function validateOrganizationAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' });
  }
  
  // Extract orgId from various possible locations
  const requestedOrgId = req.params.orgId || req.query.orgId || req.body?.orgId;
  
  // If orgId is specified in the request, validate it matches user's org
  if (requestedOrgId && requestedOrgId !== req.user.orgId) {
    return res.status(403).json({ 
      error: 'Organization access denied', 
      code: 'ORG_ACCESS_DENIED',
      message: 'You can only access data from your own organization'
    });
  }
  
  // If orgId not specified in request, set it to user's org to ensure scoping
  if (!requestedOrgId) {
    if (req.method === 'GET' && req.query) {
      req.query.orgId = req.user.orgId;
    } else if (req.body && typeof req.body === 'object') {
      req.body.orgId = req.user.orgId;
    }
  }
  
  next();
}

/**
 * Combined admin authentication middleware - requires auth + admin role + org validation
 */
export const requireAdminAuth = [requireAuthentication, requireAdminRole, validateOrganizationAccess];

/**
 * Audit logging middleware for admin operations
 */
export function auditAdminAction(action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.user) {
      try {
        // TODO: Implement createAdminAuditEvent in storage interface
        // Log admin action for audit trail (development only - implement proper audit logging for production)
        if (process.env.NODE_ENV === 'development') {
          console.log('[AUDIT]', action, 'by user:', req.user.id, 'org:', req.user.orgId);
        }
      } catch (error) {
        console.error('Failed to log admin audit event:', error);
        // Don't fail the request if audit logging fails
      }
    }
    next();
  };
}