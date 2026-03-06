'use server';

import { prisma } from '@infra/prisma';
import { syncPropertyIcal, syncPropertyIcalCalendar } from '@infra/ical/sync';
import { PropertyService } from '@features/properties/property.service';
import { createPropertySchema, updatePropertySchema } from '@/lib/schemas/property';
import {
  canManagePropertyByEmail,
  ensureAppUserByEmail,
  getAuthenticatedAdminEmail,
  isSystemAdminByEmail,
} from '@/lib/admin-auth';
import { sendAdminInviteEmail } from '@infra/notifications/resend';
import { randomUUID } from 'crypto';
import { ZodError } from 'zod';

const propertyService = new PropertyService();

async function resolveActorEmail(userId?: string) {
  if (userId && userId.includes('@')) {
    return userId.trim().toLowerCase();
  }

  const email = await getAuthenticatedAdminEmail('action');
  return email?.toLowerCase() ?? null;
}

async function requireAuthenticatedAdminEmail(userId?: string) {
  const email = await resolveActorEmail(userId);
  if (!email) {
    return {
      ok: false as const,
      response: {
        success: false,
        error: 'Unauthorized: please log in to manage properties',
      } as PropertyResponse,
    };
  }

  return { ok: true as const, email };
}

async function requirePropertyAccess(propertyId: string, userId?: string) {
  const auth = await requireAuthenticatedAdminEmail(userId);
  if (!auth.ok) return auth;

  const allowed = await canManagePropertyByEmail(auth.email, propertyId);
  if (!allowed) {
    return {
      ok: false as const,
      response: {
        success: false,
        error: 'Unauthorized: you do not have access to this property',
      } as PropertyResponse,
    };
  }

  return { ok: true as const, email: auth.email };
}

async function requireSystemAdmin(userId?: string) {
  const auth = await requireAuthenticatedAdminEmail(userId);
  if (!auth.ok) return auth;

  const isAdmin = await isSystemAdminByEmail(auth.email);
  if (!isAdmin) {
    return {
      ok: false as const,
      response: {
        success: false,
        error: 'Unauthorized: ADMIN role required',
      } as PropertyResponse,
    };
  }

  return auth;
}

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

export type CreateManualBlockedDateInput = {
  propertyId: string;
  startDate: Date;
  endDate: Date;
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
    lastSyncSuccessAt:
      calendar.lastSyncSuccessAt instanceof Date
        ? calendar.lastSyncSuccessAt.toISOString()
        : calendar.lastSyncSuccessAt,
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
    const auth = await requireSystemAdmin(userId);
    if (!auth.ok) return auth.response;

    const actor = await ensureAppUserByEmail(auth.email, 'ADMIN');

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

    // Create property and grant creator OWNER membership atomically.
    const property = await prisma.$transaction(async (tx) => {
      const created = await tx.property.create({
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
        },
      });

      await (tx as any).propertyMembership.create({
        data: {
          userId: actor.id,
          propertyId: created.id,
          role: 'OWNER',
        },
      });

      return created;
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
    const access = await requirePropertyAccess(propertyId, userId);
    if (!access.ok) return access.response;

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
    const access = await requirePropertyAccess(propertyId, userId);
    if (!access.ok) return access.response;

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
  input: CreateSeasonRateInput,
  userId?: string
): Promise<PropertyResponse> {
  try {
    const access = await requirePropertyAccess(input.propertyId, userId);
    if (!access.ok) return access.response;

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

export async function deleteSeasonRate(
  seasonRateId: string,
  userId?: string
): Promise<PropertyResponse> {
  try {
    const seasonRate = await prisma.seasonRate.findUnique({
      where: { id: seasonRateId },
      select: { id: true, propertyId: true },
    });

    if (!seasonRate) {
      return { success: false, error: 'Season rate not found' };
    }

    const access = await requirePropertyAccess(seasonRate.propertyId, userId);
    if (!access.ok) return access.response;

    await prisma.seasonRate.delete({ where: { id: seasonRateId } });
    return { success: true, data: { id: seasonRateId } };
  } catch (error) {
    console.error('deleteSeasonRate error:', error);
    return { success: false, error: 'Error deleting season rate' };
  }
}

export async function syncPropertyCalendar(
  propertyId: string,
  userId?: string
): Promise<PropertyResponse> {
  try {
    const access = await requirePropertyAccess(propertyId, userId);
    if (!access.ok) return access.response;

    const result = await syncPropertyIcal(propertyId);
    return { success: true, data: result };
  } catch (error) {
    console.error('syncPropertyCalendar error:', error);
    return { success: false, error: 'Error syncing iCal for property' };
  }
}

export async function createManualBlockedDate(
  input: CreateManualBlockedDateInput,
  userId?: string
): Promise<PropertyResponse> {
  try {
    const access = await requirePropertyAccess(input.propertyId, userId);
    if (!access.ok) return access.response;

    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return { success: false, error: 'Invalid manual block date range' };
    }

    if (endDate <= startDate) {
      return {
        success: false,
        error: 'End date must be after start date',
      };
    }

    const actor = await ensureAppUserByEmail(access.email);

    const overlaps = await prisma.blockedDate.findFirst({
      where: {
        propertyId: input.propertyId,
        startDate: { lt: endDate },
        endDate: { gt: startDate },
      },
      select: { id: true },
    });

    if (overlaps) {
      return {
        success: false,
        error: 'This range overlaps with an existing occupied period',
      };
    }

    const blockedDate = await prisma.blockedDate.create({
      data: {
        propertyId: input.propertyId,
        startDate,
        endDate,
        source: 'MANUAL',
        createdByUserId: actor.id,
      },
    });

    return {
      success: true,
      data: {
        id: blockedDate.id,
      },
    };
  } catch (error) {
    console.error('createManualBlockedDate error:', error);
    return {
      success: false,
      error: 'Error creating manual blocked date',
    };
  }
}

export async function syncAllCalendars(userId?: string): Promise<PropertyResponse> {
  try {
    const auth = await requireAuthenticatedAdminEmail(userId);
    if (!auth.ok) return auth.response;

    const actor = await ensureAppUserByEmail(auth.email);
    const memberships = await (prisma as any).propertyMembership.findMany({
      where: { userId: actor.id },
      select: { propertyId: true },
    });
    const authIds: string[] = [];
    for (const membership of memberships as Array<{ propertyId: string }>) {
      authIds.push(String(membership.propertyId));
    }

    if (authIds.length === 0) {
      return {
        success: true,
        data: {
          synced: 0,
          createdBlocks: 0,
          removedBlocks: 0,
          details: [],
        },
      };
    }

    const summary = {
      synced: 0,
      createdBlocks: 0,
      removedBlocks: 0,
      details: [] as Array<{ propertyId: string; result?: any; error?: string }>,
    };

    for (const propertyId of authIds) {
      try {
        const result: any = await syncPropertyIcal(propertyId);
        summary.synced += 1;
        summary.createdBlocks += Number(result.createdBlocks ?? 0);
        summary.removedBlocks += Number(result.removedBlocks ?? 0);
        summary.details.push({ propertyId, result });
      } catch (error) {
        summary.details.push({
          propertyId,
          error: error instanceof Error ? error.message : 'Unknown sync error',
        });
      }
    }

    const result = summary;
    return { success: true, data: result };
  } catch (error) {
    console.error('syncAllCalendars error:', error);
    return { success: false, error: 'Error syncing iCal calendars' };
  }
}

export async function updatePropertyAutoSyncSettings(input: {
  propertyId: string;
  autoSyncEnabled: boolean;
  autoSyncIntervalMinutes: number;
}, userId?: string): Promise<PropertyResponse> {
  try {
    const access = await requirePropertyAccess(input.propertyId, userId);
    if (!access.ok) return access.response;

    if (input.autoSyncIntervalMinutes < 5 || input.autoSyncIntervalMinutes > 1440) {
      return {
        success: false,
        error: 'Auto-sync interval must be between 5 and 1440 minutes',
      };
    }

    const property = await prisma.property.findUnique({ where: { id: input.propertyId } });
    if (!property) {
      return {
        success: false,
        error: 'Property not found',
      };
    }

    const updated = await prisma.property.update({
      where: { id: input.propertyId },
      data: {
        autoSyncEnabled: input.autoSyncEnabled,
        autoSyncIntervalMinutes: input.autoSyncIntervalMinutes,
      },
    } as any);

    return {
      success: true,
      data: toPlainProperty(updated),
    };
  } catch (error) {
    console.error('updatePropertyAutoSyncSettings error:', error);
    return {
      success: false,
      error: 'Error updating auto-sync settings',
    };
  }
}

export type CreatePropertyIcalCalendarInput = {
  propertyId: string;
  name: string;
  icalUrl: string;
};

export async function createPropertyIcalCalendar(
  input: CreatePropertyIcalCalendarInput,
  userId?: string
): Promise<PropertyResponse> {
  try {
    const access = await requirePropertyAccess(input.propertyId, userId);
    if (!access.ok) return access.response;

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
  input: UpdatePropertyIcalCalendarInput,
  userId?: string
): Promise<PropertyResponse> {
  try {
    const existing = await prisma.propertyIcalCalendar.findUnique({
      where: { id: input.calendarId },
      select: { propertyId: true },
    });

    if (!existing) {
      return { success: false, error: 'Calendar not found' };
    }

    const access = await requirePropertyAccess(existing.propertyId, userId);
    if (!access.ok) return access.response;

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

export async function syncPropertyIcalCalendarAction(
  calendarId: string,
  userId?: string
): Promise<PropertyResponse> {
  try {
    const calendar = await prisma.propertyIcalCalendar.findUnique({
      where: { id: calendarId },
      select: { propertyId: true },
    });

    if (!calendar) {
      return { success: false, error: 'Calendar not found' };
    }

    const access = await requirePropertyAccess(calendar.propertyId, userId);
    if (!access.ok) return access.response;

    const result = await syncPropertyIcalCalendar(calendarId);
    return { success: true, data: result };
  } catch (error) {
    console.error('syncPropertyIcalCalendarAction error:', error);
    return { success: false, error: 'Error syncing iCal calendar' };
  }
}

export async function deletePropertyIcalCalendar(
  calendarId: string,
  userId?: string
): Promise<PropertyResponse> {
  try {
    const calendar = await prisma.propertyIcalCalendar.findUnique({
      where: { id: calendarId },
      select: { id: true, propertyId: true },
    });

    if (!calendar) {
      return { success: false, error: 'Calendar not found' };
    }

    const access = await requirePropertyAccess(calendar.propertyId, userId);
    if (!access.ok) return access.response;

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

export type CreatePropertyInviteInput = {
  propertyId: string;
  email: string;
  role?: 'OWNER';
  expiresInDays?: number;
};

export async function createPropertyInvite(
  input: CreatePropertyInviteInput,
  userId?: string
): Promise<PropertyResponse> {
  try {
    const auth = await requireSystemAdmin(userId);
    if (!auth.ok) return auth.response;

    const inviteEmail = input.email.trim().toLowerCase();
    if (!inviteEmail || !inviteEmail.includes('@')) {
      return { success: false, error: 'Valid invite email is required' };
    }

    const role = 'OWNER';
    const inviter = await ensureAppUserByEmail(auth.email, 'ADMIN');

    const property = await prisma.property.findUnique({
      where: { id: input.propertyId },
      select: { id: true, name: true },
    });

    if (!property) {
      return { success: false, error: 'Property not found' };
    }

    const token = randomUUID();
    const expiresInDays = Math.min(Math.max(input.expiresInDays ?? 7, 1), 30);
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const invite = await (prisma as any).propertyInvite.create({
      data: {
        token,
        email: inviteEmail,
        propertyId: property.id,
        role,
        invitedByUserId: inviter.id,
        expiresAt,
      },
    });

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const acceptUrl = `${appUrl}/admin/invite/${token}`;

    let emailStatus: 'sent' | 'failed' = 'sent';
    let emailError: string | null = null;

    try {
      await sendAdminInviteEmail({
        toEmail: inviteEmail,
        invitedByEmail: auth.email,
        propertyName: property.name,
        acceptUrl,
      });
    } catch (emailError) {
      emailStatus = 'failed';
      emailError = emailError instanceof Error ? emailError.message : 'Unknown email error';
      console.error('sendAdminInviteEmail error:', emailError);
    }

    return {
      success: true,
      data: {
        id: invite.id,
        token: invite.token,
        propertyId: invite.propertyId,
        email: invite.email,
        role: invite.role,
        acceptUrl,
        emailStatus,
        emailError,
        expiresAt:
          invite.expiresAt instanceof Date ? invite.expiresAt.toISOString() : invite.expiresAt,
      },
    };
  } catch (error) {
    console.error('createPropertyInvite error:', error);
    return { success: false, error: 'Error creating property invite' };
  }
}
