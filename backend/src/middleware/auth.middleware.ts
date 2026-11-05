import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { AuthRequest, AuthenticatedUser } from '../models/types';
import { prisma } from '../config/db';

interface JwtPayload {
  userId: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Authentication token is missing or malformed. Format: Bearer <token>',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;

    // Check if user still exists in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'The account associated with this session no longer exists.',
      });
      return;
    }

    req.user = user as AuthenticatedUser;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        message: 'Session token has expired. Please sign in again.',
      });
      return;
    }

    res.status(401).json({
      success: false,
      message: 'Invalid authorization token.',
    });
  }
}

/**
 * Optional authentication: attaches user if token is present and valid,
 * but allows unauthenticated visitors (e.g. for guest checkout).
 */
export async function optionalAuthenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (user) {
      req.user = user as AuthenticatedUser;
    }
  } catch {
    // Silently continue for optional auth
  }

  next();
}
