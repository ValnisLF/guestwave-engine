import { beforeEach, describe, expect, it, vi } from 'vitest';

const isDateRangeAvailableMock = vi.fn();
const calculatePriceMock = vi.fn();
const createStripeCheckoutSessionMock = vi.fn();
const sendBookingEmailMock = vi.fn();

const propertyFindUniqueMock = vi.fn();
const blockedDateFindManyMock = vi.fn();
const blockedDateFindFirstMock = vi.fn();
const blockedDateCreateMock = vi.fn();
const bookingCreateMock = vi.fn();
const bookingFindUniqueMock = vi.fn();
const bookingUpdateMock = vi.fn();

vi.mock('@features/availability/availability', () => ({
  isDateRangeAvailable: isDateRangeAvailableMock,
}));

vi.mock('@features/pricing/pricing', () => ({
  calculatePrice: calculatePriceMock,
}));

vi.mock('@infra/stripe', () => ({
  createStripeCheckoutSession: createStripeCheckoutSessionMock,
}));

vi.mock('@/lib/mail', () => ({
  sendBookingEmail: sendBookingEmailMock,
}));

vi.mock('@infra/prisma', () => ({
  prisma: {
    property: {
      findUnique: propertyFindUniqueMock,
    },
    blockedDate: {
      findMany: blockedDateFindManyMock,
      findFirst: blockedDateFindFirstMock,
      create: blockedDateCreateMock,
    },
    booking: {
      create: bookingCreateMock,
      findUnique: bookingFindUniqueMock,
      update: bookingUpdateMock,
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
  },
}));

describe('booking actions checkout flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MOCK_CHECKOUT = '1';
    process.env.E2E_MOCK_CHECKOUT = '0';
    process.env.NEXT_PUBLIC_MOCK_CHECKOUT = '0';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

    isDateRangeAvailableMock.mockReturnValue({
      isAvailable: true,
      reason: undefined,
      blockedDates: [],
    });

    calculatePriceMock.mockReturnValue({
      total: 500,
      deposit: 150,
      amountDueNow: 150,
      paymentMode: 'DEPOSIT',
      perNightEffective: 160,
    });

    blockedDateFindManyMock.mockResolvedValue([]);
    sendBookingEmailMock.mockResolvedValue({ success: true, messageId: 'msg_1' });
  });

  it('confirms mock checkout and sends booking confirmation email with property SMTP settings', async () => {
    const checkIn = new Date('2026-10-12T00:00:00.000Z');
    const checkOut = new Date('2026-10-15T00:00:00.000Z');

    propertyFindUniqueMock
      .mockResolvedValueOnce({ id: 'prop_1' })
      .mockResolvedValueOnce({
        id: 'prop_1',
        basePrice: 120,
        cleaningFee: 35,
        minimumStay: 1,
        depositPercentage: 30,
        seasonRates: [],
      })
      .mockResolvedValueOnce({
        name: 'Villa Sol',
        slug: 'villa-sol',
      });

    bookingCreateMock.mockResolvedValue({
      id: 'booking_1',
      propertyId: 'prop_1',
      checkIn,
      checkOut,
      depositAmount: 150,
      guestEmail: 'guest@example.com',
      stripeSessionId: 'pending_123',
    });

    bookingFindUniqueMock.mockResolvedValue({
      id: 'booking_1',
      propertyId: 'prop_1',
      checkIn,
      checkOut,
      totalPrice: 500,
      depositAmount: 150,
      guestEmail: 'guest@example.com',
      stripeSessionId: 'pending_123',
      property: {
        name: 'Villa Sol',
        smtpHost: 'smtp.owner.local',
        smtpPort: 587,
        smtpUser: 'owner-user',
        smtpPassword: 'owner-pass',
        smtpFromEmail: 'reservas@villa-sol.com',
      },
    });

    bookingUpdateMock.mockResolvedValue({ id: 'booking_1', status: 'CONFIRMED' });
    blockedDateFindFirstMock.mockResolvedValue(null);
    blockedDateCreateMock.mockResolvedValue({ id: 'blocked_1' });

    const { createCheckoutSession } = await import('@/app/api/booking/_actions');

    const result = await createCheckoutSession({
      propertyId: 'prop_1',
      startDate: checkIn,
      endDate: checkOut,
      guestEmail: 'guest@example.com',
      guestName: 'Guest Name',
    });

    expect(result.success).toBe(true);
    expect(result.bookingId).toBe('booking_1');
    expect(result.stripeSessionId).toMatch(/^cs_mock_/);
    expect(createStripeCheckoutSessionMock).not.toHaveBeenCalled();

    expect(bookingUpdateMock).toHaveBeenCalledWith({
      where: { id: 'booking_1' },
      data: {
        status: 'CONFIRMED',
        stripeSessionId: expect.stringMatching(/^cs_mock_/),
      },
    });

    expect(sendBookingEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'guest@example.com',
        subject: 'Reserva confirmada · Villa Sol',
        html: expect.stringContaining('Importe total de la reserva:</strong> 500.00 EUR'),
        text: expect.stringContaining('Importe pendiente por pagar: 350.00 EUR'),
        property: {
          smtpHost: 'smtp.owner.local',
          smtpPort: 587,
          smtpUser: 'owner-user',
          smtpPassword: 'owner-pass',
          smtpFromEmail: 'reservas@villa-sol.com',
        },
      })
    );
  });

  it('does not create duplicate blocked dates on mock checkout confirmation', async () => {
    const checkIn = new Date('2026-11-12T00:00:00.000Z');
    const checkOut = new Date('2026-11-15T00:00:00.000Z');

    propertyFindUniqueMock
      .mockResolvedValueOnce({ id: 'prop_2' })
      .mockResolvedValueOnce({
        id: 'prop_2',
        basePrice: 150,
        cleaningFee: 40,
        minimumStay: 1,
        depositPercentage: 30,
        seasonRates: [],
      })
      .mockResolvedValueOnce({
        name: 'Villa Luna',
        slug: 'villa-luna',
      });

    bookingCreateMock.mockResolvedValue({
      id: 'booking_2',
      propertyId: 'prop_2',
      checkIn,
      checkOut,
      totalPrice: 180,
      depositAmount: 180,
      guestEmail: 'guest2@example.com',
      stripeSessionId: 'pending_456',
    });

    bookingFindUniqueMock.mockResolvedValue({
      id: 'booking_2',
      propertyId: 'prop_2',
      checkIn,
      checkOut,
      totalPrice: 180,
      depositAmount: 180,
      guestEmail: 'guest2@example.com',
      stripeSessionId: 'pending_456',
      property: {
        name: 'Villa Luna',
        smtpHost: null,
        smtpPort: null,
        smtpUser: null,
        smtpPassword: null,
        smtpFromEmail: null,
      },
    });

    bookingUpdateMock.mockResolvedValue({ id: 'booking_2', status: 'CONFIRMED' });
    blockedDateFindFirstMock.mockResolvedValue({ id: 'blocked_existing' });

    const { createCheckoutSession } = await import('@/app/api/booking/_actions');

    const result = await createCheckoutSession({
      propertyId: 'prop_2',
      startDate: checkIn,
      endDate: checkOut,
      guestEmail: 'guest2@example.com',
      guestName: 'Guest 2',
    });

    expect(result.success).toBe(true);
    expect(blockedDateFindFirstMock).toHaveBeenCalledOnce();
    expect(blockedDateCreateMock).not.toHaveBeenCalled();
    expect(sendBookingEmailMock).toHaveBeenCalledOnce();
  });
});
