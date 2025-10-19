import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  orgId: string;
  user?: {
    id: string;
    orgId: string;
    email: string;
    role: string;
    name?: string;
    isActive: boolean;
  };
}

/**
 * SECURITY: Validates that x-org-id header matches authenticated user's organization
 * This middleware MUST be applied after requireAuthentication middleware
 */
export async function requireOrgId(req: Request, res: Response, next: NextFunction): Promise<void> {
  const orgId = req.headers['x-org-id'] as string;
  
  if (!orgId) {
    res.status(401).json({ 
      error: 'Unauthorized',
      message: 'x-org-id header is required for authentication' 
    });
    return;
  }
  
  if (typeof orgId !== 'string' || orgId.trim() === '') {
    res.status(400).json({ 
      error: 'Bad Request',
      message: 'x-org-id header must be a non-empty string' 
    });
    return;
  }
  
  // SECURITY FIX: Validate user belongs to the requested organization
  const user = (req as AuthenticatedRequest).user;
  
  if (user && user.orgId !== orgId.trim()) {
    // Log security violation for monitoring
    console.warn('[SECURITY] Unauthorized org access attempt', {
      userId: user.id,
      userEmail: user.email,
      userOrg: user.orgId,
      requestedOrg: orgId.trim(),
      endpoint: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
    
    res.status(403).json({ 
      error: 'Forbidden',
      message: 'Access denied: You do not have permission to access this organization',
      code: 'ORG_ACCESS_DENIED'
    });
    return;
  }
  
  (req as AuthenticatedRequest).orgId = orgId.trim();
  next();
}

/**
 * SECURITY: Validates org ID in both header and body, enforces user membership
 * This middleware MUST be applied after requireAuthentication middleware
 */
export async function requireOrgIdAndValidateBody(req: Request, res: Response, next: NextFunction): Promise<void> {
  const headerOrgId = req.headers['x-org-id'] as string;
  
  if (!headerOrgId) {
    res.status(401).json({ 
      error: 'Unauthorized',
      message: 'x-org-id header is required for authentication' 
    });
    return;
  }
  
  if (typeof headerOrgId !== 'string' || headerOrgId.trim() === '') {
    res.status(400).json({ 
      error: 'Bad Request',
      message: 'x-org-id header must be a non-empty string' 
    });
    return;
  }
  
  // SECURITY FIX: Validate user belongs to the requested organization
  const user = (req as AuthenticatedRequest).user;
  
  if (user && user.orgId !== headerOrgId.trim()) {
    console.warn('[SECURITY] Unauthorized org access attempt in body validation', {
      userId: user.id,
      userEmail: user.email,
      userOrg: user.orgId,
      requestedOrg: headerOrgId.trim(),
      endpoint: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
    
    res.status(403).json({ 
      error: 'Forbidden',
      message: 'Access denied: You do not have permission to access this organization',
      code: 'ORG_ACCESS_DENIED'
    });
    return;
  }
  
  // Validate that body.orgId (if present) matches header
  if (req.body && req.body.orgId && req.body.orgId !== headerOrgId.trim()) {
    res.status(403).json({ 
      error: 'Forbidden',
      message: 'Request body orgId does not match authenticated organization' 
    });
    return;
  }
  
  // Inject orgId into request for downstream use
  (req as AuthenticatedRequest).orgId = headerOrgId.trim();
  
  // Override body.orgId with authenticated orgId to prevent spoofing
  if (req.body) {
    req.body.orgId = headerOrgId.trim();
  }
  
  next();
}

/**
 * Optional org ID validation - for endpoints that work with or without org context
 * Still validates user membership if org ID is provided
 */
export async function optionalOrgId(req: Request, res: Response, next: NextFunction): Promise<void> {
  const orgId = req.headers['x-org-id'] as string;
  
  if (orgId && typeof orgId === 'string' && orgId.trim() !== '') {
    // SECURITY FIX: Even for optional org ID, validate user membership if provided
    const user = (req as AuthenticatedRequest).user;
    
    if (user && user.orgId !== orgId.trim()) {
      console.warn('[SECURITY] Unauthorized optional org access attempt', {
        userId: user.id,
        userEmail: user.email,
        userOrg: user.orgId,
        requestedOrg: orgId.trim(),
        endpoint: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      });
      
      res.status(403).json({ 
        error: 'Forbidden',
        message: 'Access denied: You do not have permission to access this organization',
        code: 'ORG_ACCESS_DENIED'
      });
      return;
    }
    
    (req as AuthenticatedRequest).orgId = orgId.trim();
  }
  
  next();
}
