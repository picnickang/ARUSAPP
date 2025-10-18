/**
 * Standardized error response utilities
 * Ensures consistent error handling across all domains
 */

import { Response } from 'express';
import { z } from 'zod';

export interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
}

/**
 * Send standardized error response
 */
export function sendError(
  res: Response,
  status: number,
  message: string,
  error?: Error | z.ZodError | unknown,
  details?: any
): void {
  const response: ErrorResponse = {
    error: getErrorType(status),
    message,
  };

  if (details) {
    response.details = details;
  } else if (error instanceof z.ZodError) {
    response.details = { validationErrors: error.errors };
  } else if (error instanceof Error && process.env.NODE_ENV === 'development') {
    response.details = { stack: error.stack };
  }

  res.status(status).json(response);
}

/**
 * Get error type from status code
 */
function getErrorType(status: number): string {
  const errorTypes: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Validation Error',
    500: 'Internal Server Error',
    503: 'Service Unavailable',
  };
  
  return errorTypes[status] || 'Error';
}

/**
 * Handle common error patterns
 */
export function handleError(
  error: unknown,
  res: Response,
  operation: string
): void {
  console.error(`[${operation}] Error:`, error);

  if (error instanceof z.ZodError) {
    sendError(res, 400, 'Invalid request data', error);
    return;
  }

  if (error instanceof Error) {
    if (error.message.includes('not found')) {
      sendError(res, 404, error.message);
      return;
    }
    
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      sendError(res, 409, error.message);
      return;
    }
    
    if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
      sendError(res, 401, error.message);
      return;
    }
    
    if (error.message.includes('forbidden') || error.message.includes('permission')) {
      sendError(res, 403, error.message);
      return;
    }
  }

  sendError(res, 500, `Failed to ${operation}`, error as Error);
}

/**
 * Async error wrapper for route handlers
 * Catches errors and sends standardized responses
 */
export function asyncHandler(
  operation: string,
  handler: (req: any, res: any) => Promise<void>
) {
  return async (req: any, res: any) => {
    try {
      await handler(req, res);
    } catch (error) {
      handleError(error, res, operation);
    }
  };
}
