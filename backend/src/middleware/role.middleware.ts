import { Response, NextFunction } from 'express';
import { AuthRequest, UserRole } from '../models/types';

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required before checking permissions.',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden. This action requires one of the following roles: [${allowedRoles.join(', ')}]`,
      });
      return;
    }

    next();
  };
}

export const requireAdmin = requireRole(['ADMIN']);
