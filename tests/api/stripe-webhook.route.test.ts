import { beforeEach, describe, expect, it, vi } from 'vitest';

const verifyStripeWebhookMock = vi.fn();
const sendBookingEmailMock = vi.fn();

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

vi.mock('@/lib/mail', () => ({
  sendBookingEmail: sendBookingEmailMock,
}));

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      bookingCode: 'EF-2603-X8J2',
      propertyId: 'property_1',
      checkIn,
      checkOut,
      guestEmail: 'guest@example.com',
      totalPrice: 480,
      depositAmount: 120,
      stripeSessionId: 'pending_abc',
      status: 'PENDING',
      property: {
        name: 'Villa Sol',
        smtpHost: 'smtp.owner.local',
        smtpPort: 587,
        smtpUser: 'owner-user',
        smtpPassword: 'owner-pass',
        smtpFromEmail: 'reservas@villa-sol.com',
      },
    });

    bookingUpdateMock.mockResolvedValue({
      id: 'booking_1',
      bookingCode: 'EF-2603-X8J2',
      propertyId: 'property_1',
      checkIn,
      checkOut,
      guestEmail: 'guest@example.com',
      totalPrice: 480,
      depositAmount: 120,
      stripeSessionId: 'cs_live_123',
      status: 'CONFIRMED',
      property: {
        name: 'Villa Sol',
        smtpHost: 'smtp.owner.local',
        smtpPort: 587,
        smtpUser: 'owner-user',
        smtpPassword: 'owner-pass',
        smtpFromEmail: 'reservas@villa-sol.com',
      },
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

    expect(sendBookingEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'guest@example.com',
        subject: 'Reserva confirmada · Villa Sol · EF-2603-X8J2',
        property: {
          smtpHost: 'smtp.owner.local',
          smtpPort: 587,
          smtpUser: 'owner-user',
          smtpPassword: 'owner-pass',
          smtpFromEmail: 'reservas@villa-sol.com',
        },
      })
    );
    const sentPayload = sendBookingEmailMock.mock.calls[0]?.[0];
    expect(sentPayload?.html).toContain('Codigo de reserva:</strong> EF-2603-X8J2');
    expect(sentPayload?.html).toContain('Importe total de la reserva:</strong> 480.00 EUR');
    expect(sentPayload?.text).toContain('Codigo de reserva: EF-2603-X8J2');
    expect(sentPayload?.text).toContain('Importe pendiente por pagar: 360.00 EUR');
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
      bookingCode: 'VL-2603-Z9K4',
      propertyId: 'property_dup',
      checkIn,
      checkOut,
      guestEmail: 'guest2@example.com',
      totalPrice: 600,
      depositAmount: 200,
      stripeSessionId: 'cs_live_dup',
      status: 'CONFIRMED',
      property: {
        name: 'Villa Luna',
        smtpHost: 'smtp.owner.local',
        smtpPort: 587,
        smtpUser: 'owner-user',
        smtpPassword: 'owner-pass',
        smtpFromEmail: 'reservas@villa-luna.com',
      },
    });

    bookingUpdateMock.mockResolvedValue({
      id: 'booking_dup',
      bookingCode: 'VL-2603-Z9K4',
      propertyId: 'property_dup',
      checkIn,
      checkOut,
      guestEmail: 'guest2@example.com',
      totalPrice: 600,
      depositAmount: 200,
      stripeSessionId: 'cs_live_dup',
      status: 'CONFIRMED',
      property: {
        name: 'Villa Luna',
        smtpHost: 'smtp.owner.local',
        smtpPort: 587,
        smtpUser: 'owner-user',
        smtpPassword: 'owner-pass',
        smtpFromEmail: 'reservas@villa-luna.com',
      },
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
      bookingCode: 'VN-2603-W3M7',
      propertyId: 'property_nometa',
      checkIn,
      checkOut,
      guestEmail: 'guest3@example.com',
      totalPrice: 300,
      depositAmount: 95,
      stripeSessionId: 'cs_live_nometa',
      status: 'PENDING',
      property: {
        name: 'Villa Norte',
        smtpHost: null,
        smtpPort: null,
        smtpUser: null,
        smtpPassword: null,
        smtpFromEmail: null,
      },
    });

    bookingUpdateMock.mockResolvedValue({
      id: 'booking_nometa',
      bookingCode: 'VN-2603-W3M7',
      propertyId: 'property_nometa',
      checkIn,
      checkOut,
      guestEmail: 'guest3@example.com',
      totalPrice: 300,
      depositAmount: 95,
      stripeSessionId: 'cs_live_nometa',
      status: 'CONFIRMED',
      property: {
        name: 'Villa Norte',
        smtpHost: null,
        smtpPort: null,
        smtpUser: null,
        smtpPassword: null,
        smtpFromEmail: null,
      },
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
      include: {
        property: {
          select: {
            name: true,
            smtpHost: true,
            smtpPort: true,
            smtpUser: true,
            smtpPassword: true,
            smtpFromEmail: true,
          },
        },
      },
    });
    expect(bookingUpdateMock).toHaveBeenCalledOnce();
    expect(blockedDateCreateMock).toHaveBeenCalledOnce();
  });

  it('does not try to send confirmation email when guest email is missing', async () => {
    const checkIn = new Date('2026-08-10');
    const checkOut = new Date('2026-08-12');

    verifyStripeWebhookMock.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_live_no_email',
          metadata: { bookingId: 'booking_no_email' },
        },
      },
    });

    bookingFindUniqueMock.mockResolvedValue({
      id: 'booking_no_email',
      bookingCode: 'VS-2603-R7P2',
      propertyId: 'property_2',
      checkIn,
      checkOut,
      guestEmail: null,
      totalPrice: 250,
      depositAmount: 100,
      stripeSessionId: 'pending_no_email',
      status: 'PENDING',
      property: {
        name: 'Villa Sur',
        smtpHost: 'smtp.owner.local',
        smtpPort: 587,
        smtpUser: 'owner-user',
        smtpPassword: 'owner-pass',
        smtpFromEmail: 'reservas@villa-sur.com',
      },
    });

    bookingUpdateMock.mockResolvedValue({
      id: 'booking_no_email',
      bookingCode: 'VS-2603-R7P2',
      propertyId: 'property_2',
      checkIn,
      checkOut,
      guestEmail: null,
      totalPrice: 250,
      depositAmount: 100,
      stripeSessionId: 'cs_live_no_email',
      status: 'CONFIRMED',
      property: {
        name: 'Villa Sur',
        smtpHost: 'smtp.owner.local',
        smtpPort: 587,
        smtpUser: 'owner-user',
        smtpPassword: 'owner-pass',
        smtpFromEmail: 'reservas@villa-sur.com',
      },
    });

    blockedDateFindFirstMock.mockResolvedValue(null);
    blockedDateCreateMock.mockResolvedValue({ id: 'blocked_no_email' });

    const { POST } = await import('@/app/api/webhooks/stripe/route');

    const req = {
      headers: { get: () => 'sig_no_email' },
      text: async () => '{"id":"evt_no_email"}',
    } as any;

    const response = await POST(req);
    expect(response.status).toBe(200);
    expect(sendBookingEmailMock).not.toHaveBeenCalled();
  });
});
