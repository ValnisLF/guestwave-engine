import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

function getStripeClient() {
  if (stripeClient) return stripeClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }

  stripeClient = new Stripe(secretKey);
  return stripeClient;
}

export type CreateCheckoutPayload = {
  bookingId: string;
  propertyName: string;
  guestEmail: string;
  amountDueNow: number;
  currency?: string;
  successUrl: string;
  cancelUrl: string;
};

export async function createStripeCheckoutSession(payload: CreateCheckoutPayload) {
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: payload.guestEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: payload.currency ?? 'eur',
          unit_amount: Math.round(payload.amountDueNow * 100),
          product_data: {
            name: `Reserva · ${payload.propertyName}`,
            description: `Pago inicial reserva ${payload.bookingId}`,
          },
        },
      },
    ],
    metadata: {
      bookingId: payload.bookingId,
    },
    success_url: payload.successUrl,
    cancel_url: payload.cancelUrl,
  });

  return session;
}

export function verifyStripeWebhook(rawBody: string, signature: string) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('Missing STRIPE_WEBHOOK_SECRET');
  }

  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}

export type RefundStripePaymentPayload = {
  stripeSessionId: string;
  amount: number;
  reason?: 'requested_by_customer' | 'duplicate' | 'fraudulent';
};

export async function refundStripePayment(payload: RefundStripePaymentPayload) {
  // Stripe refund integration is intentionally mocked for now.
  // This keeps manual cancellation/reimbursement flow testable before full payment_intent mapping is added.
  return {
    id: `re_mock_${payload.stripeSessionId}`,
    status: 'succeeded' as const,
    amount: payload.amount,
    reason: payload.reason ?? 'requested_by_customer',
  };
}

export default getStripeClient;
