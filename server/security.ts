/**
 * Enhanced Security Middleware and Utilities
 * Provides additional security measures beyond basic rate limiting and HMAC validation
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

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
        req.query[key] = value.map(v => typeof v === 'string' ? sanitizeInput(v, isTelemetryEndpoint) : v);
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