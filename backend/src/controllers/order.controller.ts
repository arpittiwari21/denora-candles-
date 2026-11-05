import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { config } from '../config/env';
import {
  createCheckoutSession,
  verifyRazorpaySignature,
  verifyRazorpayWebhookSignature,
  stripeClient,
} from '../config/payment';
import { AuthRequest } from '../models/types';
import { AppError } from '../middleware/error.middleware';

export const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid('Invalid product ID'),
        quantity: z.number().int().positive('Quantity must be at least 1'),
      })
    )
    .min(1, 'Cart cannot be empty'),
  shippingAddress: z.object({
    name: z.string().min(2, 'Recipient name is required'),
    phone: z.string().min(7, 'Phone number is required'),
    street: z.string().min(5, 'Street address is required'),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    postal_code: z.string().min(3, 'Postal code is required'),
    country: z.string().default('India'),
  }),
});

export const updateOrderStatusSchema = z.object({
  order_status: z.enum(['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
});

/**
 * Create checkout session (Razorpay order or Stripe session)
 * POST /api/orders/create-checkout-session
 */
export async function handleCreateCheckoutSession(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { items: cartItems, shippingAddress } = req.body;
    const userId = req.user?.id || null;

    // 1. Fetch products from database to verify stock and price (never trust frontend prices)
    const productIds = cartItems.map((item: any) => item.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (dbProducts.length !== cartItems.length) {
      throw new AppError('One or more products in your cart could not be found.', 400);
    }

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    // Check inventory availability and compute real total
    let totalAmount = 0;
    const validatedItems: Array<{
      productId: string;
      title: string;
      price: number;
      quantity: number;
    }> = [];

    for (const item of cartItems) {
      const dbProduct = productMap.get(item.productId);
      if (!dbProduct) {
        throw new AppError(`Product ${item.productId} not found`, 400);
      }

      if (dbProduct.inventory_stock < item.quantity) {
        throw new AppError(
          `Insufficient stock for "${dbProduct.title}". Requested: ${item.quantity}, Available: ${dbProduct.inventory_stock}`,
          400
        );
      }

      const itemTotal = Number(dbProduct.price) * item.quantity;
      totalAmount += itemTotal;

      validatedItems.push({
        productId: dbProduct.id,
        title: dbProduct.title,
        price: Number(dbProduct.price),
        quantity: item.quantity,
      });
    }

    // 2. Create Order & OrderItems in database (Transaction)
    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          user_id: userId,
          total_amount: Math.round(totalAmount * 100) / 100,
          shipping_address: shippingAddress,
          payment_status: 'PENDING',
          order_status: 'PROCESSING',
          payment_gateway: config.PAYMENT_GATEWAY,
          items: {
            create: validatedItems.map((item) => ({
              product_id: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
        include: {
          items: {
            include: { product: true },
          },
        },
      });
      return createdOrder;
    });

    // 3. Initiate payment gateway session/order
    const sessionResult = await createCheckoutSession({
      orderId: order.id,
      amount: order.total_amount,
      customerName: shippingAddress.name,
      customerEmail: req.user?.email,
      items: validatedItems,
    });

    res.status(201).json({
      success: true,
      message: 'Checkout session created successfully',
      order: {
        id: order.id,
        total_amount: order.total_amount,
        payment_status: order.payment_status,
        order_status: order.order_status,
        items: order.items,
      },
      payment: sessionResult,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Handle payment gateway webhook
 * POST /api/orders/webhook
 */
export async function handleWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const rzpSignature = req.headers['x-razorpay-signature'] as string | undefined;
    const stripeSignature = req.headers['stripe-signature'] as string | undefined;

    let targetOrderId: string | null = null;
    let paymentId: string | null = null;

    // A) Process Razorpay Webhook
    if (rzpSignature || config.PAYMENT_GATEWAY === 'razorpay') {
      if (rzpSignature) {
        const isValid = verifyRazorpayWebhookSignature(rawBody, rzpSignature);
        if (!isValid) {
          console.warn('⚠️ Invalid Razorpay webhook signature');
          res.status(400).json({ success: false, message: 'Invalid webhook signature' });
          return;
        }
      }

      const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const eventType = event.event;

      if (eventType === 'order.paid' || eventType === 'payment.captured') {
        const paymentEntity = event.payload?.payment?.entity;
        targetOrderId = paymentEntity?.notes?.orderId;
        paymentId = paymentEntity?.id || event.payload?.order?.entity?.id;
      }
    }
    // B) Process Stripe Webhook
    else if (stripeSignature && stripeClient && config.STRIPE_WEBHOOK_SECRET) {
      let stripeEvent: any;
      try {
        stripeEvent = stripeClient.webhooks.constructEvent(
          rawBody,
          stripeSignature,
          config.STRIPE_WEBHOOK_SECRET
        );
      } catch (err: any) {
        console.warn('⚠️ Invalid Stripe webhook signature:', err.message);
        res.status(400).json({ success: false, message: `Webhook Error: ${err.message}` });
        return;
      }

      if (stripeEvent.type === 'checkout.session.completed') {
        const session = stripeEvent.data.object;
        targetOrderId = session.client_reference_id || session.metadata?.orderId;
        paymentId = session.payment_intent as string;
      }
    }

    // Direct manual client verification fallback:
    if (!targetOrderId && req.body.orderId && req.body.razorpay_payment_id) {
      const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      if (verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
        targetOrderId = orderId;
        paymentId = razorpay_payment_id;
      }
    }

    if (!targetOrderId) {
      res.status(200).json({ received: true, message: 'Event ignored or non-critical' });
      return;
    }

    // Process order fulfillment & inventory decrement atomically
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: targetOrderId! },
        include: { items: true },
      });

      if (!order) {
        throw new AppError(`Order ${targetOrderId} not found for webhook processing`, 404);
      }

      if (order.payment_status === 'PAID') {
        // Already fulfilled, idempotent return
        return;
      }

      // Mark order paid
      await tx.order.update({
        where: { id: targetOrderId! },
        data: {
          payment_status: 'PAID',
          order_status: 'PROCESSING',
          payment_id: paymentId,
        },
      });

      // Atomically decrement product stock
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.product_id },
          data: {
            inventory_stock: {
              decrement: item.quantity,
            },
          },
        });
      }
    });

    console.log(`✅ Order ${targetOrderId} successfully marked as PAID. Inventory updated.`);
    res.status(200).json({ success: true, message: 'Order payment processed successfully' });
  } catch (error) {
    next(error);
  }
}

/**
 * Get authenticated user's order history
 * GET /api/orders/my-orders
 */
export async function getMyOrders(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required to view orders', 401);
    }

    const orders = await prisma.order.findMany({
      where: { user_id: req.user.id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                price: true,
                image_urls: true,
                scent_notes: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all orders (Admin only)
 * GET /api/orders
 */
export async function getAllOrders(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { payment_status, order_status, page = '1', limit = '20' } = req.query as any;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (payment_status) where.payment_status = payment_status;
    if (order_status) where.order_status = order_status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          items: {
            include: {
              product: {
                select: { id: true, title: true, price: true },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update order status (Admin only)
 * PUT /api/orders/:id/status
 */
export async function updateOrderStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { order_status } = req.body;

    const updated = await prisma.order.update({
      where: { id },
      data: { order_status },
    });

    res.status(200).json({
      success: true,
      message: `Order status updated to ${order_status}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}
