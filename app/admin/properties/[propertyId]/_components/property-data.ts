import { prisma } from '@infra/prisma';

export async function getOwnerWorkspaceProperty(propertyId: string) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      seasonRates: {
        orderBy: { startDate: 'asc' },
      },
      bookings: {
        orderBy: { createdAt: 'desc' },
      },
      icalCalendars: {
        orderBy: { createdAt: 'asc' },
      },
      blockedDates: {
        orderBy: { startDate: 'asc' },
        include: {
          createdBy: {
            select: {
              email: true,
            },
          },
          icalCalendar: {
            select: {
              id: true,
              name: true,
            },
          },
          booking: {
            select: {
              id: true,
            },
          },
        },
      },
      memberships: {
        where: { role: 'OWNER' },
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!property) return null;

  return {
    id: property.id,
    name: property.name,
    slug: property.slug,
    description: property.description,
    imageUrls: property.imageUrls,
    amenities:
      typeof property.amenities === 'object' && property.amenities
        ? (property.amenities as Record<string, boolean>)
        : {},
    basePrice: Number(property.basePrice),
    cleaningFee: Number(property.cleaningFee),
    minimumStay: property.minimumStay,
    depositPercentage: property.depositPercentage,
    autoSyncEnabled: property.autoSyncEnabled,
    autoSyncIntervalMinutes: property.autoSyncIntervalMinutes,
    autoSyncLastRunAt: property.autoSyncLastRunAt ? property.autoSyncLastRunAt.toISOString() : null,
    seasonRates: property.seasonRates.map((rate) => ({
      id: rate.id,
      startDate: rate.startDate.toISOString(),
      endDate: rate.endDate.toISOString(),
      priceMultiplier: Number(rate.priceMultiplier),
      fixedPrice: rate.fixedPrice ? Number(rate.fixedPrice) : null,
      paymentMode: rate.paymentMode,
      depositPercentage: rate.depositPercentage,
    })),
    bookings: property.bookings.map((booking) => ({
      id: booking.id,
      status: booking.status,
      checkIn: booking.checkIn.toISOString(),
      checkOut: booking.checkOut.toISOString(),
      stripeSessionId: booking.stripeSessionId,
      guestEmail: booking.guestEmail,
      totalPrice: Number(booking.totalPrice),
      depositAmount: Number(booking.depositAmount),
      createdAt: booking.createdAt.toISOString(),
    })),
    icalCalendars: property.icalCalendars.map((calendar) => ({
      id: calendar.id,
      name: calendar.name,
      icalUrl: calendar.icalUrl,
      lastSyncedAt: calendar.lastSyncedAt ? calendar.lastSyncedAt.toISOString() : null,
      lastSyncSuccessAt: calendar.lastSyncSuccessAt
        ? calendar.lastSyncSuccessAt.toISOString()
        : null,
    })),
    blockedDates: property.blockedDates.map((blockedDate) => ({
      id: blockedDate.id,
      startDate: blockedDate.startDate.toISOString(),
      endDate: blockedDate.endDate.toISOString(),
      source: blockedDate.source,
      createdByEmail: blockedDate.createdBy?.email ?? null,
      icalCalendarName: blockedDate.icalCalendar?.name ?? null,
      bookingId: blockedDate.booking?.id ?? null,
    })),
    ownerEmails: property.memberships.map((membership) => membership.user.email),
  };
}
