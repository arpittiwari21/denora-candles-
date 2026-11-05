import { Router } from 'express';
import {
  handleCreateCheckoutSession,
  handleWebhook,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  checkoutSchema,
  updateOrderStatusSchema,
} from '../controllers/order.controller';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import { validateBody } from '../middleware/validation.middleware';

const router = Router();

// Checkout Session (allows registered users or guest checkout)
router.post(
  '/create-checkout-session',
  optionalAuthenticate,
  validateBody(checkoutSchema),
  handleCreateCheckoutSession
);

// Payment Gateway Webhook (Razorpay / Stripe)
router.post('/webhook', handleWebhook);

// Customer order history
router.get('/my-orders', authenticate, getMyOrders);

// Admin-only order management
router.get('/', authenticate, requireAdmin, getAllOrders);
router.put(
  '/:id/status',
  authenticate,
  requireAdmin,
  validateBody(updateOrderStatusSchema),
  updateOrderStatus
);

export default router;
