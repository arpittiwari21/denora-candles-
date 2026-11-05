import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Cannot find ${req.method} ${req.originalUrl} on this server.`,
  });
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  const message = err.message || 'Internal Server Error';

  if (config.NODE_ENV !== 'production') {
    console.error('🔥 Server Error:', err);
  } else if (statusCode >= 500) {
    console.error(`[ERROR 500] ${req.method} ${req.originalUrl}:`, err.message);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(config.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
