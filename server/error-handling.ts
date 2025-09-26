import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { structuredLog, trackError } from './observability';

// Circuit breaker state management
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  successCount: number;
}

const circuitBreakers = new Map<string, CircuitBreakerState>();

// Configuration for error handling
const ERROR_HANDLING_CONFIG = {
  CIRCUIT_BREAKER: {
    FAILURE_THRESHOLD: 5,
    TIMEOUT_MS: 60000, // 1 minute
    SUCCESS_THRESHOLD: 3 // For half-open to closed
  },
  RETRY: {
    MAX_ATTEMPTS: 3,
    BASE_DELAY_MS: 1000,
    MAX_DELAY_MS: 5000,
    BACKOFF_MULTIPLIER: 2
  },
  TIMEOUT: {
    DATABASE_MS: 10000,
    EXTERNAL_API_MS: 15000,
    FILE_OPERATION_MS: 5000
  }
};

// Standard error types for consistent handling
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public context?: Record<string, any>,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 400, 'VALIDATION_ERROR', context);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 500, 'DATABASE_ERROR', context);
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 503, 'EXTERNAL_SERVICE_ERROR', context);
  }
}

export class CircuitBreakerError extends AppError {
  constructor(service: string) {
    super(`Circuit breaker is open for service: ${service}`, 503, 'CIRCUIT_BREAKER_OPEN', { service });
  }
}

// Circuit breaker implementation
export class CircuitBreaker {
  private getState(serviceName: string): CircuitBreakerState {
    if (!circuitBreakers.has(serviceName)) {
      circuitBreakers.set(serviceName, {
        failures: 0,
        lastFailureTime: 0,
        state: 'CLOSED',
        successCount: 0
      });
    }
    return circuitBreakers.get(serviceName)!;
  }

  private updateState(serviceName: string, state: Partial<CircuitBreakerState>) {
    const current = this.getState(serviceName);
    circuitBreakers.set(serviceName, { ...current, ...state });
  }

  async execute<T>(
    serviceName: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const state = this.getState(serviceName);
    const now = Date.now();

    // Check if circuit is open
    if (state.state === 'OPEN') {
      if (now - state.lastFailureTime > ERROR_HANDLING_CONFIG.CIRCUIT_BREAKER.TIMEOUT_MS) {
        // Transition to half-open
        this.updateState(serviceName, { state: 'HALF_OPEN', successCount: 0 });
        structuredLog('info', `Circuit breaker transitioning to HALF_OPEN for ${serviceName}`);
      } else {
        // Circuit is still open, use fallback or throw error
        if (fallback) {
          structuredLog('warn', `Circuit breaker OPEN for ${serviceName}, using fallback`);
          return await fallback();
        }
        throw new CircuitBreakerError(serviceName);
      }
    }

    try {
      const result = await operation();
      
      // Success: reset or move towards closed state
      if (state.state === 'HALF_OPEN') {
        const newSuccessCount = state.successCount + 1;
        if (newSuccessCount >= ERROR_HANDLING_CONFIG.CIRCUIT_BREAKER.SUCCESS_THRESHOLD) {
          this.updateState(serviceName, { 
            state: 'CLOSED', 
            failures: 0, 
            successCount: 0 
          });
          structuredLog('info', `Circuit breaker CLOSED for ${serviceName}`);
        } else {
          this.updateState(serviceName, { successCount: newSuccessCount });
        }
      } else {
        // Reset failures on success
        this.updateState(serviceName, { failures: 0 });
      }

      return result;
    } catch (error) {
      // Failure: increment counter and potentially open circuit
      const newFailures = state.failures + 1;
      this.updateState(serviceName, { 
        failures: newFailures, 
        lastFailureTime: now 
      });

      if (newFailures >= ERROR_HANDLING_CONFIG.CIRCUIT_BREAKER.FAILURE_THRESHOLD) {
        this.updateState(serviceName, { state: 'OPEN' });
        structuredLog('error', `Circuit breaker OPEN for ${serviceName}`, {
          operation: 'circuit_breaker',
          metadata: { failures: newFailures, serviceName }
        });
      }

      // Use fallback if available
      if (fallback && state.state === 'OPEN') {
        structuredLog('warn', `Using fallback for failed ${serviceName}`);
        return await fallback();
      }

      throw error;
    }
  }

  getStatus(serviceName: string) {
    return this.getState(serviceName);
  }
}

export const circuitBreaker = new CircuitBreaker();

// Retry mechanism with exponential backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxAttempts: number = ERROR_HANDLING_CONFIG.RETRY.MAX_ATTEMPTS
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await operation();
      
      if (attempt > 1) {
        structuredLog('info', `${operationName} succeeded after ${attempt} attempts`);
      }
      
      return result;
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        structuredLog('error', `${operationName} failed after ${maxAttempts} attempts`, {
          operation: 'retry_failed',
          metadata: { attempts: maxAttempts, operationName }
        });
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        ERROR_HANDLING_CONFIG.RETRY.BASE_DELAY_MS * Math.pow(ERROR_HANDLING_CONFIG.RETRY.BACKOFF_MULTIPLIER, attempt - 1),
        ERROR_HANDLING_CONFIG.RETRY.MAX_DELAY_MS
      );

      structuredLog('warn', `${operationName} failed, retrying in ${delay}ms (attempt ${attempt}/${maxAttempts})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// Timeout wrapper
export function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new AppError(
          `Operation ${operationName} timed out after ${timeoutMs}ms`,
          408,
          'TIMEOUT_ERROR',
          { timeoutMs, operationName }
        ));
      }, timeoutMs);
    })
  ]);
}

// Database operation wrapper with error handling
export async function safeDbOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  fallback?: () => Promise<T>
): Promise<T> {
  return circuitBreaker.execute(
    'database',
    () => withTimeout(
      () => withRetry(operation, `db_${operationName}`),
      ERROR_HANDLING_CONFIG.TIMEOUT.DATABASE_MS,
      `db_${operationName}`
    ),
    fallback
  );
}

// External API operation wrapper
export async function safeExternalOperation<T>(
  serviceName: string,
  operation: () => Promise<T>,
  fallback?: () => Promise<T>
): Promise<T> {
  return circuitBreaker.execute(
    serviceName,
    () => withTimeout(
      operation,
      ERROR_HANDLING_CONFIG.TIMEOUT.EXTERNAL_API_MS,
      serviceName
    ),
    fallback
  );
}

// Graceful degradation helpers
export const gracefulFallbacks = {
  // Return cached or default data when live data fails
  withCachedFallback: <T>(
    operation: () => Promise<T>,
    cachedData: T,
    operationName: string
  ): Promise<T> => {
    return operation().catch(error => {
      structuredLog('warn', `${operationName} failed, using cached data`, {
        operation: 'graceful_degradation',
        metadata: { operationName, fallbackType: 'cached' }
      });
      return cachedData;
    });
  },

  // Return partial data when full data fails
  withPartialFallback: <T>(
    operation: () => Promise<T>,
    partialData: T,
    operationName: string
  ): Promise<T> => {
    return operation().catch(error => {
      structuredLog('warn', `${operationName} failed, using partial data`, {
        operation: 'graceful_degradation',
        metadata: { operationName, fallbackType: 'partial' }
      });
      return partialData;
    });
  },

  // Return default/empty state when operation fails
  withDefaultFallback: <T>(
    operation: () => Promise<T>,
    defaultValue: T,
    operationName: string
  ): Promise<T> => {
    return operation().catch(error => {
      structuredLog('warn', `${operationName} failed, using default value`, {
        operation: 'graceful_degradation',
        metadata: { operationName, fallbackType: 'default' }
      });
      return defaultValue;
    });
  }
};

// Enhanced error handling middleware
export function enhancedErrorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  const requestId = (req as any).requestId;
  
  // Log the error with context
  trackError(err, {
    requestId,
    operation: 'request_handling',
    metadata: {
      method: req.method,
      path: req.path,
      userAgent: req.headers['user-agent'],
      ip: req.ip
    }
  });

  // Handle different error types
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code,
        requestId,
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && { context: err.context })
      }
    });
  }

  // Handle Zod validation errors
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        requestId,
        timestamp: new Date().toISOString(),
        details: err.errors
      }
    });
  }

  // Handle database errors
  if (err.message.includes('database') || err.message.includes('connection')) {
    return res.status(503).json({
      error: {
        message: 'Database service temporarily unavailable',
        code: 'DATABASE_UNAVAILABLE',
        requestId,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Default error response
  const isDevelopment = process.env.NODE_ENV === 'development';
  res.status(500).json({
    error: {
      message: isDevelopment ? err.message : 'Internal server error',
      code: 'INTERNAL_ERROR',
      requestId,
      timestamp: new Date().toISOString(),
      ...(isDevelopment && { stack: err.stack })
    }
  });
}

// Health check for error handling systems
export function getErrorHandlingHealth() {
  const circuitBreakerStates = Array.from(circuitBreakers.entries()).map(([service, state]) => ({
    service,
    state: state.state,
    failures: state.failures,
    lastFailureTime: state.lastFailureTime ? new Date(state.lastFailureTime).toISOString() : null
  }));

  return {
    circuitBreakers: circuitBreakerStates,
    configuration: ERROR_HANDLING_CONFIG,
    status: circuitBreakerStates.some(cb => cb.state === 'OPEN') ? 'degraded' : 'healthy'
  };
}