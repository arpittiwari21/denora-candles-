import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env';
import { connectDB, disconnectDB } from './config/db';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

const app = express();

// 1. Security Headers
app.use(helmet());

// 2. CORS Configuration for Frontend Integration
const allowedOrigins = [
  ...config.ALLOWED_ORIGINS,
  config.FRONTEND_URL,
  'https://denora-candles.vercel.app',
  'https://denoracandles.com',
  'https://www.denoracandles.com',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) return callback(null, true);
      
      const isAllowed =
        allowedOrigins.includes(origin) ||
        origin.endsWith('.denoracandles.com') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1');

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by Denora Candles CORS policy`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-razorpay-signature', 'stripe-signature'],
  })
);

// 3. HTTP Request Logging
app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'));

// 4. Request Body Parsing (captures rawBody for Razorpay & Stripe webhook verification)
app.use(
  express.json({
    limit: '5mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// 5. Root status check
app.get('/', (_req, res) => {
  res.status(200).json({
    service: 'Denora Candles Backend API',
    status: 'online',
    docs: '/api/health',
    version: '1.0.0',
    environment: config.NODE_ENV,
  });
});

// 6. Mount API Routes
app.use('/api', routes);

// 7. 404 & Centralized Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

// 8. Server Lifecycle & Cloud Run Listen (bind to 0.0.0.0 for container ingress)
const server = app.listen(config.PORT, '0.0.0.0', async () => {
  console.log(`🕯️  Denora Candles API running on port ${config.PORT} [${config.NODE_ENV}]`);
  await connectDB();
});

// Graceful container shutdown (Cloud Run SIGTERM signal)
async function gracefulShutdown(signal: string) {
  console.log(`Received ${signal}. Shutting down container gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    await disconnectDB();
    process.exit(0);
  });

  // Force shutdown if connections do not close within 10s
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
