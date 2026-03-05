'use server';

import { isDateRangeAvailable } from '@features/availability/availability';
import { calculatePrice } from '@features/pricing/pricing';
import { prisma } from '@infra/prisma';
import { type SeasonRate } from '@features/pricing/types';
import { createStripeCheckoutSession } from '@infra/stripe';
import { sendOwnerPaymentNotification } from '@infra/notifications/resend';

function toUtcDayTimestamp(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function validateBookingDates(startDate: Date, endDate: Date): string | null {
  const today = new Date();
  const todayUtcDay = toUtcDayTimestamp(today);
  const startUtcDay = toUtcDayTimestamp(startDate);
  const endUtcDay = toUtcDayTimestamp(endDate);

  if (startUtcDay < todayUtcDay) {
    return 'Check-in date cannot be in the past';
  }

  if (endUtcDay <= startUtcDay) {
    return 'Check-out date must be after check-in date';
  }

  return null;
}

function isMockCheckoutEnabled() {
  return (
    process.env.E2E_MOCK_CHECKOUT === '1' ||
    process.env.MOCK_CHECKOUT === '1' ||
    process.env.NEXT_PUBLIC_MOCK_CHECKOUT === '1'
  );
}

async function confirmBookingAndBlockDates(payload: {
  bookingId: string;
  stripeSessionId: string;
}) {
  let booking = await prisma.booking.findUnique({
    where: { id: payload.bookingId },
  });

  if (!booking) {
    throw new Error(`Booking not found: ${payload.bookingId}`);
  }

  await prisma.$transaction(async (tx) => {
    booking = await tx.booking.update({
      where: { id: payload.bookingId },
      data: {
        status: 'CONFIRMED',
        stripeSessionId: payload.stripeSessionId,
      },
    });

    const existingBlocked = await tx.blockedDate.findFirst({
      where: { bookingId: payload.bookingId },
      select: { id: true },
    });

    if (!existingBlocked) {
      await tx.blockedDate.create({
        data: {
          propertyId: booking!.propertyId,
          bookingId: booking!.id,
          startDate: booking!.checkIn,
          endDate: booking!.checkOut,
          source: 'BOOKING',
        },
      });
    }
  });

  const ownerEmail = process.env.OWNER_NOTIFICATION_EMAIL;
  if (ownerEmail) {
    try {
      await sendOwnerPaymentNotification({
        toEmail: ownerEmail,
        bookingId: booking.id,
        propertyId: booking.propertyId,
        amountPaid: Number(booking.depositAmount),
      });
    } catch (notificationError) {
      console.error('Owner notification error:', notificationError);
    }
  }

  return booking;
}

export type CheckAvailabilityInput = {
  propertyId: string;
  startDate: Date;
  endDate: Date;
};

export type CheckAvailabilityResponse = {
  success: boolean;
  available: boolean;
  reason?: string;
  blockedDates?: Date[];
};

/**
 * Checks if a property is available for the given date range
 * Considers bookings and manually blocked dates
 */
export async function checkAvailability(
  input: CheckAvailabilityInput
): Promise<CheckAvailabilityResponse> {
  try {
    const { propertyId, startDate, endDate } = input;
    const dateValidationError = validateBookingDates(startDate, endDate);

    if (dateValidationError) {
      return {
        success: false,
        available: false,
        reason: dateValidationError,
      };
    }

    // Fetch property to ensure it exists
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      return {
        success: false,
        available: false,
        reason: 'Property not found',
      };
    }

    // Fetch blocked dates (from bookings and manual blocks)
    const blockedDates = await prisma.blockedDate.findMany({
      where: {
        propertyId,
        OR: [
          // Bookings that overlap with requested range
          {
            booking: {
              property: { id: propertyId },
              status: 'CONFIRMED',
            },
          },
          // Manual blocks
          { source: 'MANUAL' },
          // iCal blocks
          { source: 'ICAL' },
        ],
      },
      select: {
        startDate: true,
        endDate: true,
      },
    });

    // Convert to DateRange format
    const blockedDateRanges = blockedDates.map((bd) => ({
      startDate: new Date(bd.startDate),
      endDate: new Date(bd.endDate),
    }));

    // Check availability using domain logic
    const result = isDateRangeAvailable(
      { startDate, endDate },
      blockedDateRanges
    );

    return {
      success: true,
      available: result.isAvailable,
      reason: result.reason,
      blockedDates: result.blockedDates?.map((r) => r.startDate),
    };
  } catch (error) {
    console.error('checkAvailability error:', error);
    return {
      success: false,
      available: false,
      reason: 'Error checking availability',
    };
  }
}

export type EstimatePriceInput = {
  propertyId: string;
  startDate: Date;
  endDate: Date;
  depositPercentage?: number;
};

export type EstimatePriceResponse = {
  success: boolean;
  total?: number;
  deposit?: number;
  amountDueNow?: number;
  paymentMode?: 'FULL' | 'DEPOSIT';
  minimumStay?: number;
  perNightEffective?: number;
  error?: string;
};

/**
 * Estimates price for a booking including seasonal rates
 */
export async function estimatePrice(
  input: EstimatePriceInput
): Promise<EstimatePriceResponse> {
  try {
    const { propertyId, startDate, endDate, depositPercentage } = input;
    const dateValidationError = validateBookingDates(startDate, endDate);

    if (dateValidationError) {
      return {
        success: false,
        error: dateValidationError,
      };
    }

    // Fetch property with season rates
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        seasonRates: {
          where: {
            OR: [
              // Rates that overlap with booking period
              {
                AND: [
                  { startDate: { lte: endDate } },
                  { endDate: { gte: startDate } },
                ],
              },
            ],
          },
        },
      },
    });

    if (!property) {
      return {
        success: false,
        error: 'Property not found',
      };
    }

    // Calculate nights
    const nights = Math.floor(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (nights < property.minimumStay) {
      return {
        success: false,
        minimumStay: property.minimumStay,
        error: `Minimum stay for this property is ${property.minimumStay} night(s)`,
      };
    }

    // Convert seasonRates to domain format, converting Decimal to number
    const seasonRates: SeasonRate[] = property.seasonRates.map((sr) => ({
      id: sr.id,
      startDate: sr.startDate,
      endDate: sr.endDate,
      priceMultiplier: Number(sr.priceMultiplier),
      fixedPrice: sr.fixedPrice ? Number(sr.fixedPrice) : null,
      paymentMode: sr.paymentMode,
      depositPercentage: sr.depositPercentage,
    }));

    // Calculate price using domain logic
    const pricingResult = calculatePrice({
      basePricePerNight: Number(property.basePrice),
      nights,
      cleaningFee: Number(property.cleaningFee),
      seasonRates: seasonRates.length > 0 ? seasonRates : undefined,
      startDate,
      endDate,
      depositPct: (depositPercentage ?? property.depositPercentage) / 100,
    });

    return {
      success: true,
      total: pricingResult.total,
      deposit: pricingResult.deposit,
      amountDueNow: pricingResult.amountDueNow,
      paymentMode: pricingResult.paymentMode,
      minimumStay: property.minimumStay,
      perNightEffective: pricingResult.perNightEffective,
    };
  } catch (error) {
    console.error('estimatePrice error:', error);
    return {
      success: false,
      error: 'Error estimating price',
    };
  }
}

export type CreateBookingInput = {
  propertyId: string;
  startDate: Date;
  endDate: Date;
  guestEmail: string;
  guestName: string;
};

export type CreateBookingResponse = {
  success: boolean;
  bookingId?: string;
  error?: string;
  stripeSessionId?: string;
  checkoutUrl?: string;
};

export type CreateCheckoutSessionInput = {
  propertyId: string;
  startDate: Date;
  endDate: Date;
  guestEmail: string;
  guestName: string;
};

/**
 * Creates a booking (changes to Stripe checkout flow)
 * For MVP: just create the booking record and return a placeholder
 */
export async function createBooking(
  input: CreateBookingInput
): Promise<CreateBookingResponse> {
  return createCheckoutSession(input);
}

/**
 * Creates pending booking + Stripe Checkout Session
 */
export async function createCheckoutSession(
  input: CreateCheckoutSessionInput
): Promise<CreateBookingResponse> {
  try {
    const { propertyId, startDate, endDate, guestEmail, guestName } = input;
    const isMockCheckout = isMockCheckoutEnabled();

    // Check availability first
    const availCheck = await checkAvailability({
      propertyId,
      startDate,
      endDate,
    });

    if (!availCheck.available) {
      return {
        success: false,
        error: availCheck.reason || 'Property not available for selected dates',
      };
    }

    // Get pricing
    const priceEst = await estimatePrice({
      propertyId,
      startDate,
      endDate,
    });

    if (!priceEst.success || !priceEst.total) {
      return {
        success: false,
        error: 'Error calculating price',
      };
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { name: true, slug: true },
    });

    if (!property) {
      return {
        success: false,
        error: 'Property not found',
      };
    }

    if (isMockCheckout && guestEmail.includes('fail')) {
      return {
        success: false,
        error: 'Mock checkout failure',
      };
    }

    // Create booking record (PENDING status)
    const booking = await prisma.booking.create({
      data: {
        propertyId,
        checkIn: startDate,
        checkOut: endDate,
        status: 'PENDING',
        totalPrice: priceEst.total || 0,
        depositAmount: priceEst.deposit || 0,
        guestEmail,
        guestToken: Math.random().toString(36).substring(2, 12),
        stripeSessionId: `pending_${Math.random().toString(36).substring(2, 12)}`,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    if (isMockCheckout) {
      const mockSessionId = `cs_mock_${Math.random().toString(36).substring(2, 12)}`;

      await confirmBookingAndBlockDates({
        bookingId: booking.id,
        stripeSessionId: mockSessionId,
      });

      return {
        success: true,
        bookingId: booking.id,
        stripeSessionId: mockSessionId,
        checkoutUrl: `${appUrl}/properties/${property.slug}?checkout=success&bookingId=${booking.id}`,
      };
    }

    const stripeSession = await createStripeCheckoutSession({
      bookingId: booking.id,
      propertyName: property.name,
      guestEmail,
      amountDueNow: priceEst.amountDueNow ?? priceEst.total,
      successUrl: `${appUrl}/properties/${property.slug}?checkout=success&bookingId=${booking.id}`,
      cancelUrl: `${appUrl}/properties/${property.slug}?checkout=cancelled`,
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        stripeSessionId: stripeSession.id,
      },
    });

    return {
      success: true,
      bookingId: booking.id,
      stripeSessionId: stripeSession.id,
      checkoutUrl: stripeSession.url ?? undefined,
    };
  } catch (error) {
    console.error('createCheckoutSession error:', error);
    return {
      success: false,
      error: 'Error creating checkout session',
    };
  }
}
