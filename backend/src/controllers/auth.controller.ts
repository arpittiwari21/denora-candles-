import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/db';
import { config } from '../config/env';
import { AuthRequest } from '../models/types';
import { AppError } from '../middleware/error.middleware';

// Validation Schemas
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['CUSTOMER', 'ADMIN']).optional().default('CUSTOMER'),
});

export const loginSchema = z.object({
  email: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

function generateToken(userId: string, email: string, role: string): string {
  return jwt.sign({ userId, email, role }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as any,
  });
}

/**
 * Register a new user
 * POST /api/auth/register
 */
export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, email, password, role } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new AppError('An account with this email already exists.', 400);
    }

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Create user in PostgreSQL
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password_hash,
        role: role || 'CUSTOMER',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
      },
    });

    const token = generateToken(user.id, user.email, user.role);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      access_token: token,
      token, // compatibility
      token_type: 'bearer',
      user,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Login user
 * POST /api/auth/login
 */
export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;
    const normalizedIdentifier = email.toLowerCase().trim();

    // Find user by email
    const user = await prisma.user.findFirst({
      where: {
        email: normalizedIdentifier,
      },
    });

    if (!user) {
      throw new AppError('Invalid email or password.', 401);
    }

    // Compare passwords
    const isPasswordMatch = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordMatch) {
      throw new AppError('Invalid email or password.', 401);
    }

    const token = generateToken(user.id, user.email, user.role);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      access_token: token,
      token,
      token_type: 'bearer',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get current authenticated user profile
 * GET /api/auth/me
 */
export async function getMe(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
}
