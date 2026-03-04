'use server';

import { prisma } from '@infra/prisma';
import { syncAllIcalInputs, syncPropertyIcal, syncPropertyIcalCalendar } from '@infra/ical/sync';
import { PropertyService } from '@features/properties/property.service';
import { createPropertySchema, updatePropertySchema } from '@/lib/schemas/property';
import { ZodError } from 'zod';

const propertyService = new PropertyService();

export type CreatePropertyInput = {
  name: string;
  slug: string;
  description?: string | null;
  imageUrls?: string[];
  basePrice: number;
  cleaningFee?: number;
  minimumStay?: number;
  depositPercentage?: number;
  amenities?: Record<string, boolean>;
  icalUrlIn?: string | null;
};

export type PropertyResponse = {
  success: boolean;
  data?: any;
  error?: string;
};

function toPlainProperty(property: any) {
  return {
    id: property.id,
    name: property.name,
    slug: property.slug,
    description: property.description,
    imageUrls: property.imageUrls,
    amenities: property.amenities,
    basePrice: Number(property.basePrice),
    cleaningFee: Number(property.cleaningFee),
    minimumStay: property.minimumStay,
    depositPercentage: property.depositPercentage,
    icalUrlIn: property.icalUrlIn,
    createdAt: property.createdAt instanceof Date ? property.createdAt.toISOString() : property.createdAt,
    updatedAt: property.updatedAt instanceof Date ? property.updatedAt.toISOString() : property.updatedAt,
  };
}

function toPlainSeasonRate(rate: any) {
  return {
    id: rate.id,
    propertyId: rate.propertyId,
    startDate: rate.startDate instanceof Date ? rate.startDate.toISOString() : rate.startDate,
    endDate: rate.endDate instanceof Date ? rate.endDate.toISOString() : rate.endDate,
    priceMultiplier: Number(rate.priceMultiplier),
    fixedPrice: rate.fixedPrice === null ? null : Number(rate.fixedPrice),
    paymentMode: rate.paymentMode,
    depositPercentage: rate.depositPercentage,
    createdAt: rate.createdAt instanceof Date ? rate.createdAt.toISOString() : rate.createdAt,
    updatedAt: rate.updatedAt instanceof Date ? rate.updatedAt.toISOString() : rate.updatedAt,
  };
}

function toPlainIcalCalendar(calendar: any) {
  return {
    id: calendar.id,
    propertyId: calendar.propertyId,
    name: calendar.name,
    icalUrl: calendar.icalUrl,
    lastSyncedAt:
      calendar.lastSyncedAt instanceof Date
        ? calendar.lastSyncedAt.toISOString()
        : calendar.lastSyncedAt,
    createdAt:
      calendar.createdAt instanceof Date
        ? calendar.createdAt.toISOString()
        : calendar.createdAt,
    updatedAt:
      calendar.updatedAt instanceof Date
        ? calendar.updatedAt.toISOString()
        : calendar.updatedAt,
  };
}

/**
 * Creates a new property for the authenticated admin user
 * TODO: Add authentication to verify admin ownership and link to user
 */
export async function createProperty(
  input: CreatePropertyInput,
  userId?: string
): Promise<PropertyResponse> {
  try {
    // Validate input using Zod
    const validated = createPropertySchema.parse(input);

    // Additional validation using domain service
    const validation = propertyService.validateProperty(validated);
    if (!validation.isValid) {
      const errorMsg = validation.errors
        .map((e) => `${e.field}: ${e.message}`)
        .join('; ');
      return {
        success: false,
        error: errorMsg,
      };
    }

    // Check for slug uniqueness
    const existing = await prisma.property.findUnique({
      where: { slug: validated.slug },
    });

    if (existing) {
      return {
        success: false,
        error: 'Slug already exists. Please choose a unique slug.',
      };
    }

    // Create property
    const property = await prisma.property.create({
      data: {
        name: validated.name,
        slug: validated.slug,
        description: validated.description,
        imageUrls: validated.imageUrls ?? [],
        basePrice: validated.basePrice,
        cleaningFee: validated.cleaningFee ?? 0,
        minimumStay: validated.minimumStay ?? 1,
        depositPercentage: validated.depositPercentage ?? 0,
        amenities: validated.amenities ?? {},
        icalUrlIn: validated.icalUrlIn,
        // TODO: Link to userId once authentication is implemented
      },
    });

    return {
      success: true,
      data: toPlainProperty(property),
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const errorMsg = error.issues?.map((e) => e.message).join('; ') || 'Validation error';
      return {
        success: false,
        error: errorMsg,
      };
    }

    console.error('createProperty error:', error);
    return {
      success: false,
      error: 'Error creating property',
    };
  }
}

export type UpdatePropertyInput = Partial<CreatePropertyInput>;

/**
 * Updates an existing property
 * TODO: Add authentication to verify ownership
 */
export async function updateProperty(
  propertyId: string,
  input: UpdatePropertyInput,
  userId?: string
): Promise<PropertyResponse> {
  try {
    // Fetch property to verify existence
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      return {
        success: false,
        error: 'Property not found',
      };
    }

    // TODO: Add userId check once authentication is implemented
    // if (property.userId !== userId) {
    //   return {
    //     success: false,
    //     error: 'Unauthorized: You do not own this property',
    //   };
    // }

    // Validate partial input
    const validated = updatePropertySchema.parse(input);

    // Additional validation using domain service
    const validation = propertyService.validateProperty(validated as any);
    if (!validation.isValid) {
      const errorMsg = validation.errors
        .map((e) => `${e.field}: ${e.message}`)
        .join('; ');
      return {
        success: false,
        error: errorMsg,
      };
    }

    // Check if new slug is unique (if slug is being updated)
    if (validated.slug && validated.slug !== property.slug) {
      const existing = await prisma.property.findUnique({
        where: { slug: validated.slug },
      });
      if (existing) {
        return {
          success: false,
          error: 'Slug already exists. Please choose a unique slug.',
        };
      }
    }

    // Update property
    const updated = await prisma.property.update({
      where: { id: propertyId },
      data: validated,
    });

    return {
      success: true,
      data: toPlainProperty(updated),
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const errorMsg = error.issues?.map((e) => e.message).join('; ') || 'Validation error';
      return {
        success: false,
        error: errorMsg,
      };
    }

    console.error('updateProperty error:', error);
    return {
      success: false,
      error: 'Error updating property',
    };
  }
}

/**
 * Deletes a property (soft delete - mark as archived)
 * TODO: Add authentication to verify ownership
 */
export async function deleteProperty(
  propertyId: string,
  userId?: string
): Promise<PropertyResponse> {
  try {
    // Fetch property to verify existence
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      return {
        success: false,
        error: 'Property not found',
      };
    }

    // TODO: Add userId check once authentication is implemented
    // if (property.userId !== userId) {
    //   return {
    //     success: false,
    //     error: 'Unauthorized: You do not own this property',
    //   };
    // }

    // Check for active bookings
    const activeBookings = await prisma.booking.count({
      where: {
        propertyId,
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
      },
    });

    if (activeBookings > 0) {
      return {
        success: false,
        error: 'Cannot delete property with active bookings',
      };
    }

    // Delete property
    // TODO: Implement soft delete with 'deleted' flag if needed
    await prisma.property.delete({
      where: { id: propertyId },
    });

    return {
      success: true,
      data: { id: propertyId },
    };
  } catch (error) {
    console.error('deleteProperty error:', error);
    return {
      success: false,
      error: 'Error deleting property',
    };
  }
}

/**
 * Fetches a single property by slug (for public listing)
 */
export async function getPropertyBySlug(slug: string): Promise<PropertyResponse> {
  try {
    const property = await prisma.property.findUnique({
      where: { slug },
      include: {
        seasonRates: {
          orderBy: { startDate: 'asc' },
        },
      },
    });

    if (!property) {
      return {
        success: false,
        error: 'Property not found',
      };
    }

    return {
      success: true,
      data: {
        ...toPlainProperty(property),
        seasonRates: property.seasonRates.map((rate) => toPlainSeasonRate(rate)),
      },
    };
  } catch (error) {
    console.error('getPropertyBySlug error:', error);
    return {
      success: false,
      error: 'Error fetching property',
    };
  }
}

export type CreateSeasonRateInput = {
  propertyId: string;
  startDate: Date;
  endDate: Date;
  priceMultiplier?: number;
  fixedPrice?: number | null;
  paymentMode?: 'FULL' | 'DEPOSIT';
  depositPercentage?: number | null;
};

export async function createSeasonRate(
  input: CreateSeasonRateInput
): Promise<PropertyResponse> {
  try {
    if (input.startDate >= input.endDate) {
      return {
        success: false,
        error: 'startDate must be before endDate',
      };
    }

    if (!input.fixedPrice && !input.priceMultiplier) {
      return {
        success: false,
        error: 'Either fixedPrice or priceMultiplier is required',
      };
    }

    if (input.paymentMode === 'DEPOSIT') {
      if (input.depositPercentage === null || input.depositPercentage === undefined) {
        return {
          success: false,
          error: 'depositPercentage is required for DEPOSIT mode',
        };
      }
      if (input.depositPercentage < 0 || input.depositPercentage > 100) {
        return {
          success: false,
          error: 'depositPercentage must be between 0 and 100',
        };
      }
    }

    const created = await prisma.seasonRate.create({
      data: {
        propertyId: input.propertyId,
        startDate: input.startDate,
        endDate: input.endDate,
        priceMultiplier: input.priceMultiplier ?? 1,
        fixedPrice: input.fixedPrice,
        paymentMode: input.paymentMode,
        depositPercentage: input.depositPercentage,
      },
    });

    return { success: true, data: toPlainSeasonRate(created) };
  } catch (error) {
    console.error('createSeasonRate error:', error);
    return { success: false, error: 'Error creating season rate' };
  }
}

export async function deleteSeasonRate(seasonRateId: string): Promise<PropertyResponse> {
  try {
    await prisma.seasonRate.delete({ where: { id: seasonRateId } });
    return { success: true, data: { id: seasonRateId } };
  } catch (error) {
    console.error('deleteSeasonRate error:', error);
    return { success: false, error: 'Error deleting season rate' };
  }
}

export async function syncPropertyCalendar(propertyId: string): Promise<PropertyResponse> {
  try {
    const result = await syncPropertyIcal(propertyId);
    return { success: true, data: result };
  } catch (error) {
    console.error('syncPropertyCalendar error:', error);
    return { success: false, error: 'Error syncing iCal for property' };
  }
}

export async function syncAllCalendars(): Promise<PropertyResponse> {
  try {
    const result = await syncAllIcalInputs();
    return { success: true, data: result };
  } catch (error) {
    console.error('syncAllCalendars error:', error);
    return { success: false, error: 'Error syncing iCal calendars' };
  }
}

export type CreatePropertyIcalCalendarInput = {
  propertyId: string;
  name: string;
  icalUrl: string;
};

export async function createPropertyIcalCalendar(
  input: CreatePropertyIcalCalendarInput
): Promise<PropertyResponse> {
  try {
    const name = input.name.trim();
    const icalUrl = input.icalUrl.trim();

    if (!name || !icalUrl) {
      return { success: false, error: 'Name and iCal URL are required' };
    }

    try {
      new URL(icalUrl);
    } catch {
      return { success: false, error: 'Invalid iCal URL' };
    }

    const property = await prisma.property.findUnique({ where: { id: input.propertyId } });
    if (!property) {
      return { success: false, error: 'Property not found' };
    }

    const created = await prisma.propertyIcalCalendar.create({
      data: {
        propertyId: input.propertyId,
        name,
        icalUrl,
      },
    });

    return { success: true, data: toPlainIcalCalendar(created) };
  } catch (error) {
    console.error('createPropertyIcalCalendar error:', error);
    return { success: false, error: 'Error creating iCal calendar' };
  }
}

export type UpdatePropertyIcalCalendarInput = {
  calendarId: string;
  name: string;
  icalUrl: string;
};

export async function updatePropertyIcalCalendar(
  input: UpdatePropertyIcalCalendarInput
): Promise<PropertyResponse> {
  try {
    const name = input.name.trim();
    const icalUrl = input.icalUrl.trim();

    if (!name || !icalUrl) {
      return { success: false, error: 'Name and iCal URL are required' };
    }

    try {
      new URL(icalUrl);
    } catch {
      return { success: false, error: 'Invalid iCal URL' };
    }

    const updated = await prisma.propertyIcalCalendar.update({
      where: { id: input.calendarId },
      data: { name, icalUrl },
    });

    return { success: true, data: toPlainIcalCalendar(updated) };
  } catch (error) {
    console.error('updatePropertyIcalCalendar error:', error);
    return { success: false, error: 'Error updating iCal calendar' };
  }
}

export async function syncPropertyIcalCalendarAction(calendarId: string): Promise<PropertyResponse> {
  try {
    const result = await syncPropertyIcalCalendar(calendarId);
    return { success: true, data: result };
  } catch (error) {
    console.error('syncPropertyIcalCalendarAction error:', error);
    return { success: false, error: 'Error syncing iCal calendar' };
  }
}

export async function deletePropertyIcalCalendar(calendarId: string): Promise<PropertyResponse> {
  try {
    const calendar = await prisma.propertyIcalCalendar.findUnique({
      where: { id: calendarId },
      select: { id: true, propertyId: true },
    });

    if (!calendar) {
      return { success: false, error: 'Calendar not found' };
    }

    await prisma.$transaction(async (tx) => {
      await tx.blockedDate.deleteMany({
        where: {
          propertyId: calendar.propertyId,
          source: 'ICAL',
          icalCalendarId: calendar.id,
        },
      });

      await tx.propertyIcalCalendar.delete({
        where: { id: calendar.id },
      });
    });

    return { success: true, data: { id: calendar.id } };
  } catch (error) {
    console.error('deletePropertyIcalCalendar error:', error);
    return { success: false, error: 'Error deleting iCal calendar' };
  }
}
