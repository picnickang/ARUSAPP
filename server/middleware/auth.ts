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

export function optionalOrgId(req: Request, res: Response, next: NextFunction): void {
  const orgId = req.headers['x-org-id'] as string;
  
  if (orgId && typeof orgId === 'string' && orgId.trim() !== '') {
    (req as AuthenticatedRequest).orgId = orgId.trim();
  }
  
  next();
}
