import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  orgId: string;
}

export function requireOrgId(req: Request, res: Response, next: NextFunction): void {
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
  
  (req as AuthenticatedRequest).orgId = orgId.trim();
  next();
}

export function requireOrgIdAndValidateBody(req: Request, res: Response, next: NextFunction): void {
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

export function optionalOrgId(req: Request, res: Response, next: NextFunction): void {
  const orgId = req.headers['x-org-id'] as string;
  
  if (orgId && typeof orgId === 'string' && orgId.trim() !== '') {
    (req as AuthenticatedRequest).orgId = orgId.trim();
  }
  
  next();
}
