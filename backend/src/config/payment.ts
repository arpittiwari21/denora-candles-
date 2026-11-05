import crypto from 'crypto';
import Razorpay from 'razorpay';
import Stripe from 'stripe';
import { config } from './env';

// 1. Initialize Razorpay Client
export const razorpayClient = new Razorpay({
  key_id: config.RAZORPAY_KEY_ID,
  key_secret: config.RAZORPAY_KEY_SECRET,
});

// 2. Initialize Stripe Client (conditional if key is present)
export const stripeClient = config.STRIPE_SECRET_KEY
  ? new Stripe(config.STRIPE_SECRET_KEY, { apiVersion: '2024-10-28.acacia' as any })
  : null;

export interface CreatePaymentSessionParams {
  orderId: string;
  amount: number; // in standard currency units (e.g. INR or USD)
  currency?: string;
  customerName?: string;
  customerEmail?: string;
  items: Array<{
    title: string;
    quantity: number;
    price: number;
  }>;
}

export interface CheckoutSessionResult {
  gateway: 'razorpay' | 'stripe';
  orderId: string;
  checkoutPayload: {
    // Razorpay fields
    razorpayOrderId?: string;
    keyId?: string;
    amount?: number;
    currency?: string;
    // Stripe fields
    stripeSessionId?: string;
    stripeCheckoutUrl?: string | null;
  };
}

/**
 * Creates checkout session or order across Razorpay or Stripe
 */
export async function createCheckoutSession(
  params: CreatePaymentSessionParams
): Promise<CheckoutSessionResult> {
  const currency = params.currency || (config.PAYMENT_GATEWAY === 'razorpay' ? 'INR' : 'USD');
  const amountInSmallestUnit = Math.round(params.amount * 100); // paisa or cents

  if (config.PAYMENT_GATEWAY === 'razorpay') {
    // Create Razorpay Order
    const rzpOrder = await razorpayClient.orders.create({
      amount: amountInSmallestUnit,
      currency: currency.toUpperCase(),
      receipt: `denora_${params.orderId.substring(0, 16)}`,
      notes: {
        orderId: params.orderId,
        customerEmail: params.customerEmail || '',
      },
    });

    return {
      gateway: 'razorpay',
      orderId: params.orderId,
      checkoutPayload: {
        razorpayOrderId: rzpOrder.id,
        keyId: config.RAZORPAY_KEY_ID,
        amount: Number(rzpOrder.amount),
        currency: rzpOrder.currency,
      },
    };
  } else {
    // Create Stripe Checkout Session
    if (!stripeClient) {
      throw new Error('Stripe is not configured. STRIPE_SECRET_KEY is missing.');
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = params.items.map((item) => ({
      price_data: {
        currency: currency.toLowerCase(),
        product_data: {
          name: item.title,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${config.STRIPE_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}&order_id=${params.orderId}`,
      cancel_url: config.STRIPE_CANCEL_URL,
      client_reference_id: params.orderId,
      customer_email: params.customerEmail,
      metadata: {
        orderId: params.orderId,
      },
    });

    return {
      gateway: 'stripe',
      orderId: params.orderId,
      checkoutPayload: {
        stripeSessionId: session.id,
        stripeCheckoutUrl: session.url,
        amount: amountInSmallestUnit,
        currency,
      },
    };
  }
}

/**
 * Verify Razorpay payment signature from client verification payload or webhook
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const secret = config.RAZORPAY_KEY_SECRET;
  const payload = `${orderId}|${paymentId}`;
  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return generatedSignature === signature;
}

/**
 * Verify Razorpay raw webhook signature
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string | Buffer,
  signature: string
): boolean {
  const secret = config.RAZORPAY_WEBHOOK_SECRET || config.RAZORPAY_KEY_SECRET;
  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8'))
    .digest('hex');

  return generatedSignature === signature;
}
