import { beforeEach, describe, expect, it, vi } from 'vitest';

const verifyStripeWebhookMock = vi.fn();
const sendOwnerPaymentNotificationMock = vi.fn();

const bookingFindUniqueMock = vi.fn();
const bookingUpdateMock = vi.fn();
const blockedDateFindFirstMock = vi.fn();
const blockedDateCreateMock = vi.fn();

const prismaMock = {
  booking: {
    findUnique: bookingFindUniqueMock,
  },
  blockedDate: {
    findFirst: blockedDateFindFirstMock,
    create: blockedDateCreateMock,
  },
  $transaction: vi.fn(async (callback: any) =>
    callback({
      booking: {
        update: bookingUpdateMock,
      },
      blockedDate: {
        findFirst: blockedDateFindFirstMock,
        create: blockedDateCreateMock,
      },
    })
  ),
};

vi.mock('@infra/stripe', () => ({
  verifyStripeWebhook: verifyStripeWebhookMock,
}));

vi.mock('@infra/prisma', () => ({
  prisma: prismaMock,
}));

vi.mock('@infra/notifications/resend', () => ({
  sendOwnerPaymentNotification: sendOwnerPaymentNotificationMock,
}));

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OWNER_NOTIFICATION_EMAIL = 'owner@example.com';
  });

  it('returns 400 when signature header is missing', async () => {
    const { POST } = await import('@/app/api/webhooks/stripe/route');

    const req = {
      headers: { get: () => null },
      text: async () => '',
    } as any;

    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe('Missing stripe-signature');
  });

  it('confirms booking and blocks dates on checkout.session.completed', async () => {
    const checkIn = new Date('2026-05-10');
    const checkOut = new Date('2026-05-14');

    verifyStripeWebhookMock.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_live_123',
          metadata: { bookingId: 'booking_1' },
        },
      },
    });

    bookingFindUniqueMock.mockResolvedValue({
      id: 'booking_1',
      propertyId: 'property_1',
      checkIn,
      checkOut,
      depositAmount: 120,
      stripeSessionId: 'pending_abc',
      status: 'PENDING',
    });

    bookingUpdateMock.mockResolvedValue({
      id: 'booking_1',
      propertyId: 'property_1',
      checkIn,
      checkOut,
      depositAmount: 120,
      stripeSessionId: 'cs_live_123',
      status: 'CONFIRMED',
    });

    blockedDateFindFirstMock.mockResolvedValue(null);
    blockedDateCreateMock.mockResolvedValue({ id: 'blocked_1' });

    const { POST } = await import('@/app/api/webhooks/stripe/route');

    const req = {
      headers: { get: () => 'sig_123' },
      text: async () => '{"id":"evt_1"}',
    } as any;

    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.received).toBe(true);
    expect(bookingUpdateMock).toHaveBeenCalledWith({
      where: { id: 'booking_1' },
      data: {
        status: 'CONFIRMED',
        stripeSessionId: 'cs_live_123',
      },
    });

    expect(blockedDateCreateMock).toHaveBeenCalledWith({
      data: {
        propertyId: 'property_1',
        bookingId: 'booking_1',
        startDate: checkIn,
        endDate: checkOut,
        source: 'BOOKING',
      },
    });

    expect(sendOwnerPaymentNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        toEmail: 'owner@example.com',
        bookingId: 'booking_1',
      })
    );
  });

  it('ignores completed checkout when booking is not found', async () => {
    verifyStripeWebhookMock.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_live_404', metadata: { bookingId: 'missing' } } },
    });

    bookingFindUniqueMock.mockResolvedValue(null);

    const { POST } = await import('@/app/api/webhooks/stripe/route');

    const req = {
      headers: { get: () => 'sig_404' },
      text: async () => '{"id":"evt_404"}',
    } as any;

    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ignored).toBe(true);
    expect(bookingUpdateMock).not.toHaveBeenCalled();
    expect(blockedDateCreateMock).not.toHaveBeenCalled();
  });

  it('is idempotent for duplicated checkout events (does not create blocked date twice)', async () => {
    const checkIn = new Date('2026-06-01');
    const checkOut = new Date('2026-06-05');

    verifyStripeWebhookMock.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_live_dup',
          metadata: { bookingId: 'booking_dup' },
        },
      },
    });

    bookingFindUniqueMock.mockResolvedValue({
      id: 'booking_dup',
      propertyId: 'property_dup',
      checkIn,
      checkOut,
      depositAmount: 200,
      stripeSessionId: 'cs_live_dup',
      status: 'CONFIRMED',
    });

    bookingUpdateMock.mockResolvedValue({
      id: 'booking_dup',
      propertyId: 'property_dup',
      checkIn,
      checkOut,
      depositAmount: 200,
      stripeSessionId: 'cs_live_dup',
      status: 'CONFIRMED',
    });

    blockedDateFindFirstMock.mockResolvedValue({ id: 'blocked_existing' });

    const { POST } = await import('@/app/api/webhooks/stripe/route');

    const req = {
      headers: { get: () => 'sig_dup' },
      text: async () => '{"id":"evt_dup"}',
    } as any;

    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.received).toBe(true);
    expect(bookingUpdateMock).toHaveBeenCalledOnce();
    expect(blockedDateFindFirstMock).toHaveBeenCalledOnce();
    expect(blockedDateCreateMock).not.toHaveBeenCalled();
  });

  it('finds booking by stripeSessionId when metadata.bookingId is missing', async () => {
    const checkIn = new Date('2026-07-10');
    const checkOut = new Date('2026-07-13');

    verifyStripeWebhookMock.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_live_nometa',
          metadata: {},
        },
      },
    });

    bookingFindUniqueMock.mockResolvedValueOnce({
      id: 'booking_nometa',
      propertyId: 'property_nometa',
      checkIn,
      checkOut,
      depositAmount: 95,
      stripeSessionId: 'cs_live_nometa',
      status: 'PENDING',
    });

    bookingUpdateMock.mockResolvedValue({
      id: 'booking_nometa',
      propertyId: 'property_nometa',
      checkIn,
      checkOut,
      depositAmount: 95,
      stripeSessionId: 'cs_live_nometa',
      status: 'CONFIRMED',
    });

    blockedDateFindFirstMock.mockResolvedValue(null);
    blockedDateCreateMock.mockResolvedValue({ id: 'blocked_nometa' });

    const { POST } = await import('@/app/api/webhooks/stripe/route');

    const req = {
      headers: { get: () => 'sig_nometa' },
      text: async () => '{"id":"evt_nometa"}',
    } as any;

    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.received).toBe(true);
    expect(bookingFindUniqueMock).toHaveBeenCalledTimes(1);
    expect(bookingFindUniqueMock).toHaveBeenNthCalledWith(1, {
      where: { stripeSessionId: 'cs_live_nometa' },
    });
    expect(bookingUpdateMock).toHaveBeenCalledOnce();
    expect(blockedDateCreateMock).toHaveBeenCalledOnce();
  });
});
