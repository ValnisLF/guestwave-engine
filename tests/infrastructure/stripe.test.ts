import { beforeEach, describe, expect, it, vi } from 'vitest';

const constructEventMock = vi.fn();
const checkoutCreateMock = vi.fn();

vi.mock('stripe', () => {
  class StripeMock {
    checkout = {
      sessions: {
        create: checkoutCreateMock,
      },
    };

    webhooks = {
      constructEvent: constructEventMock,
    };

    constructor() {}
  }

  return {
    default: StripeMock,
  };
});

describe('stripe infrastructure', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';
  });

  it('creates checkout session with correct cents amount and metadata', async () => {
    checkoutCreateMock.mockResolvedValue({ id: 'cs_123', url: 'https://checkout.stripe.com/cs_123' });

    const { createStripeCheckoutSession } = await import('@/src/infrastructure/stripe');

    const session = await createStripeCheckoutSession({
      bookingId: 'booking_1',
      propertyName: 'Casa Azul',
      guestEmail: 'guest@example.com',
      amountDueNow: 123.45,
      successUrl: 'http://localhost:3000/success',
      cancelUrl: 'http://localhost:3000/cancel',
    });

    expect(checkoutCreateMock).toHaveBeenCalledOnce();
    expect(checkoutCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        customer_email: 'guest@example.com',
        success_url: 'http://localhost:3000/success',
        cancel_url: 'http://localhost:3000/cancel',
        metadata: { bookingId: 'booking_1' },
      })
    );

    const callArg = checkoutCreateMock.mock.calls[0][0];
    expect(callArg.line_items[0].price_data.unit_amount).toBe(12345);
    expect(session.id).toBe('cs_123');
  });

  it('verifies webhook signature with configured secret', async () => {
    const fakeEvent = { type: 'checkout.session.completed' };
    constructEventMock.mockReturnValue(fakeEvent);

    const { verifyStripeWebhook } = await import('@/src/infrastructure/stripe');
    const event = verifyStripeWebhook('{"test":true}', 'sig_123');

    expect(constructEventMock).toHaveBeenCalledWith('{"test":true}', 'sig_123', 'whsec_123');
    expect(event).toEqual(fakeEvent);
  });

  it('throws when STRIPE_SECRET_KEY is missing', async () => {
    delete process.env.STRIPE_SECRET_KEY;

    const { createStripeCheckoutSession } = await import('@/src/infrastructure/stripe');

    await expect(
      createStripeCheckoutSession({
        bookingId: 'booking_2',
        propertyName: 'Casa Verde',
        guestEmail: 'guest@example.com',
        amountDueNow: 50,
        successUrl: 'http://localhost:3000/success',
        cancelUrl: 'http://localhost:3000/cancel',
      })
    ).rejects.toThrow('Missing STRIPE_SECRET_KEY');
  });
});
