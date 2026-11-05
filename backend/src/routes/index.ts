import { Router } from 'express';
import authRoutes from './auth.routes';
import productRoutes from './product.routes';
import orderRoutes from './order.routes';

const router = Router();

// Root API Health & Diagnostic check
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'Denora Candles Backend API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Mount modules
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);

export default router;
