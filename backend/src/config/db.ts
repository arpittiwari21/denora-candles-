import { PrismaClient } from '@prisma/client';
import { config } from './env';

// Prevent multiple instances of Prisma Client in development with hot reload
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Ensure Prisma has a valid DATABASE_URL in environment if not already loaded
if (!process.env.DATABASE_URL && config.DATABASE_URL) {
  process.env.DATABASE_URL = config.DATABASE_URL;
}

export const prisma =
  global.__prisma ||
  new PrismaClient({
    datasourceUrl: config.DATABASE_URL || undefined,
    log: config.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (config.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export async function connectDB(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL database connected successfully via Prisma');
  } catch (error) {
    console.error('❌ Database connection error:', error);
    // In production container on Cloud Run, keep running or fail fast based on configuration
  }
}

export async function disconnectDB(): Promise<void> {
  await prisma.$disconnect();
  console.log('PostgreSQL database disconnected');
}
