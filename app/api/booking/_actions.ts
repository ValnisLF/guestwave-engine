'use server';

import { isDateRangeAvailable } from '@features/availability/availability';
import { calculatePrice } from '@features/pricing/pricing';
import { prisma } from '@infra/prisma';
import { type SeasonRate } from '@features/pricing/types';

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

    // Convert seasonRates to domain format, converting Decimal to number
    const seasonRates: SeasonRate[] = property.seasonRates.map((sr) => ({
      id: sr.id,
      startDate: sr.startDate,
      endDate: sr.endDate,
      priceMultiplier: Number(sr.priceMultiplier),
      fixedPrice: sr.fixedPrice ? Number(sr.fixedPrice) : null,
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
};

/**
 * Creates a booking (changes to Stripe checkout flow)
 * For MVP: just create the booking record and return a placeholder
 */
export async function createBooking(
  input: CreateBookingInput
): Promise<CreateBookingResponse> {
  try {
    const { propertyId, startDate, endDate, guestEmail, guestName } = input;

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

    // Create booking record (PENDING status)
    const booking = await prisma.booking.create({
      data: {
        propertyId,
        checkIn: startDate,
        checkOut: endDate,
        status: 'PENDING',
        totalPrice: priceEst.total || 0,
        depositAmount: priceEst.deposit || 0,
        guestToken: Math.random().toString(36).substring(2, 12),
        // TODO: Update to real Stripe session ID after checkout
        stripeSessionId: `pending_${Math.random().toString(36).substring(2, 12)}`,
      },
    });

    // TODO: Create Stripe checkout session and redirect
    // For MVP, just return booking ID

    return {
      success: true,
      bookingId: booking.id,
      error: undefined,
    };
  } catch (error) {
    console.error('createBooking error:', error);
    return {
      success: false,
      error: 'Error creating booking',
    };
  }
}
