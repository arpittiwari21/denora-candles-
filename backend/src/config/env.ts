import dotenv from 'dotenv';
import path from 'path';

// Load .env file from current working directory or backend root
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '8080', 10),
  
  // Database
  DATABASE_URL: process.env.DATABASE_URL || '',
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production_denora_candles_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  // Frontend URLs for CORS
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173')
    .split(',')
    .map((o) => o.trim()),

  // Payments
  PAYMENT_GATEWAY: (process.env.PAYMENT_GATEWAY || 'razorpay') as 'razorpay' | 'stripe',
  
  // Razorpay
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_id',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_placeholder_secret',
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || '',

  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  STRIPE_SUCCESS_URL: process.env.STRIPE_SUCCESS_URL || 'http://localhost:5173/checkout/success',
  STRIPE_CANCEL_URL: process.env.STRIPE_CANCEL_URL || 'http://localhost:5173/cart',
};

// Simple sanity check warning for production
if (config.NODE_ENV === 'production') {
  if (!config.DATABASE_URL) {
    console.warn('[SECURITY WARNING] DATABASE_URL is not set in production!');
  }
  if (config.JWT_SECRET.includes('dev_jwt_secret')) {
    console.warn('[SECURITY WARNING] Default JWT_SECRET is being used in production. Change it immediately!');
  }
}
