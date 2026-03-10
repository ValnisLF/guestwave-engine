'use server';

import { prisma } from '@infra/prisma';
import { createClient } from '@supabase/supabase-js';
import { syncPropertyIcal, syncPropertyIcalCalendar } from '@infra/ical/sync';
import { refundStripePayment } from '@infra/stripe';
import { PropertyService } from '@features/properties/property.service';
import {
  photoAssignmentTargetSchema,
  type PhotoAssignmentTarget,
} from '@/lib/page-content-targets';
import {
  PropertyPageContentSchema,
  createEmptyPropertyPageContent,
  createPropertySchema,
  pageContentSchema,
  pageContentSectionSchemas,
  type PageContentSectionKey,
  updatePropertySchema,
} from '@/lib/schemas/property';
import {
  canManagePropertyByEmail,
  ensureAppUserByEmail,
  getAuthenticatedAdminEmail,
  isSystemAdminByEmail,
} from '@/lib/admin-auth';
import { sendBookingEmail } from '@/lib/mail';
import { sendAdminInviteEmail } from '@infra/notifications/resend';
import { randomUUID } from 'crypto';
import { z, ZodError } from 'zod';

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

export type UpdatePropertySmtpInput = {
  propertyId: string;
  bookingPrefix: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword?: string;
  smtpFromEmail: string;
};

export type TestPropertySmtpInput = UpdatePropertySmtpInput & {
  testToEmail?: string;
};

export type UpdatePropertyBookingPrefixInput = {
  propertyId: string;
  bookingPrefix: string;
};

export type UpdatePropertySettingsInput = {
  propertyId: string;
  primaryColor: string;
  accentColor?: string | null;
  fontFamily?: string | null;
  pageContent?: unknown;
};

export type UpdatePropertyPageContentSectionInput = {
  propertyId: string;
  section: PageContentSectionKey;
  sectionData: unknown;
};

export type UpdatePropertyContentInput = {
  propertyId: string;
  pageContent: unknown;
};

export type UploadPropertyPhotoInput = {
  propertyId: string;
  file: File;
};

export type AssignPhotoToPageContentInput = {
  propertyId: string;
  imageUrl: string;
  target: PhotoAssignmentTarget;
};

const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'property-media';

const bookingPrefixSchema = z
  .string()
  .trim()
  .min(2, 'Booking prefix must have at least 2 characters')
  .max(3, 'Booking prefix must have at most 3 characters')
  .regex(/^[A-Za-z]+$/, 'Booking prefix must contain only letters')
  .transform((value) => value.toUpperCase());

const updatePropertySmtpSchema = z.object({
  propertyId: z.string().min(1, 'Property id is required'),
  bookingPrefix: bookingPrefixSchema,
  smtpHost: z.string().trim().min(1, 'SMTP host is required'),
  smtpPort: z.number().int().min(1).max(65535),
  smtpUser: z.string().trim().min(1, 'SMTP user is required'),
  smtpPassword: z.string().optional(),
  smtpFromEmail: z.string().trim().email('Invalid from email'),
});

const updatePropertyBookingPrefixSchema = z.object({
  propertyId: z.string().min(1, 'Property id is required'),
  bookingPrefix: bookingPrefixSchema,
});

const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'Primary color must be a valid hex color')
  .transform((value) => value.toUpperCase());

const optionalHexColorSchema = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  },
  hexColorSchema.nullable().optional()
);

const optionalTextSchema = (max: number) =>
  z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  },
  z.string().max(max).nullable().optional()
);

const updatePropertySettingsSchema = z.object({
  propertyId: z.string().min(1, 'Property id is required'),
  primaryColor: hexColorSchema,
  accentColor: optionalHexColorSchema,
  fontFamily: optionalTextSchema(120),
  pageContent: pageContentSchema.optional(),
});

function createSupabaseStorageClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function inferFileExtension(file: File) {
  const filename = file.name || '';
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex >= 0 && dotIndex < filename.length - 1) {
    return filename.slice(dotIndex + 1).toLowerCase();
  }

  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/gif') return 'gif';
  return 'jpg';
}

function resolvePhotoTarget(target: PhotoAssignmentTarget): {
  section: PageContentSectionKey;
  title: string;
} {
  const [section, slot] = target.split(':') as [PageContentSectionKey, string];

  const titleMap: Record<string, string> = {
    hero: 'Hero',
    amenities: 'Amenities',
    groundFloor: 'Planta baja',
    firstFloor: 'Primera planta',
    exterior: 'Exterior',
    queHacer: 'Que hacer',
    queVisitar: 'Que visitar',
    queComer: 'Que comer',
    instructions: 'Instrucciones',
    temporadaAlta: 'Temporada alta',
    temporadaMedia: 'Temporada media',
    temporadaBaja: 'Temporada baja',
    politicas: 'Politicas',
    general: 'General',
  };

  return {
    section,
    title: titleMap[slot] ?? slot,
  };
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asSections(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export async function uploadPropertyPhoto(
  input: UploadPropertyPhotoInput,
  userId?: string
): Promise<PropertyResponse> {
  try {
    const propertyId = z.string().min(1, 'Property id is required').parse(input.propertyId);
    const file = input.file;

    if (!(file instanceof File)) {
      return {
        success: false,
        error: 'No se encontro el archivo a subir',
      };
    }

    if (!file.type.startsWith('image/')) {
      return {
        success: false,
        error: 'Solo se permiten imagenes',
      };
    }

    if (file.size <= 0) {
      return {
        success: false,
        error: 'El archivo esta vacio',
      };
    }

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      return {
        success: false,
        error: 'Tamano maximo de imagen: 10MB',
      };
    }

    const access = await requirePropertyAccess(propertyId, userId);
    if (!access.ok) return access.response;

    const supabase = createSupabaseStorageClient();
    if (!supabase) {
      return {
        success: false,
        error: 'Configura NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY para subir imagenes',
      };
    }

    const extension = inferFileExtension(file);
    const filePath = `properties/${propertyId}/${Date.now()}-${randomUUID()}.${extension}`;

    const upload = await supabase.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (upload.error) {
      return {
        success: false,
        error: `No se pudo subir la imagen: ${upload.error.message}`,
      };
    }

    const publicUrl = supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(filePath).data.publicUrl;

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { imageUrls: true },
    });

    if (!property) {
      return {
        success: false,
        error: 'Property not found',
      };
    }

    const nextUrls = Array.from(new Set([...(property.imageUrls ?? []), publicUrl]));

    await prisma.property.update({
      where: { id: propertyId },
      data: {
        imageUrls: nextUrls,
      },
    });

    return {
      success: true,
      data: {
        url: publicUrl,
        bucket: SUPABASE_STORAGE_BUCKET,
      },
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const issue = error.issues?.[0];
      const path = issue?.path?.join('.') ?? '';
      return {
        success: false,
        error: path ? `${path}: ${issue?.message ?? 'Validation error'}` : issue?.message ?? 'Validation error',
      };
    }

    console.error('uploadPropertyPhoto error:', error);
    return {
      success: false,
      error: 'Error subiendo imagen',
    };
  }
}

export async function assignPhotoToPageContent(
  input: AssignPhotoToPageContentInput,
  userId?: string
): Promise<PropertyResponse> {
  try {
    const propertyId = z.string().min(1, 'Property id is required').parse(input.propertyId);
    const imageUrl = z.string().url('Image URL must be valid').parse(input.imageUrl);
    const target = photoAssignmentTargetSchema.parse(input.target);

    const access = await requirePropertyAccess(propertyId, userId);
    if (!access.ok) return access.response;

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { pageContent: true },
    });

    if (!property) {
      return {
        success: false,
        error: 'Property not found',
      };
    }

    const parsed = PropertyPageContentSchema.safeParse(property.pageContent);
    const nextContent = parsed.success ? parsed.data : createEmptyPropertyPageContent();
    const { title } = resolvePhotoTarget(target);

    switch (target) {
      case 'homePage:hero':
        nextContent.homepage.hero.image = imageUrl;
        break;
      case 'homePage:amenities':
        nextContent.homepage.amenities.image = imageUrl;
        break;
      case 'laPropiedad:groundFloor':
        nextContent.laPropiedad.groundFloor.image = imageUrl;
        break;
      case 'laPropiedad:firstFloor':
        nextContent.laPropiedad.firstFloor.image = imageUrl;
        break;
      case 'laPropiedad:exterior':
        nextContent.laPropiedad.exterior.image = imageUrl;
        break;
      case 'turismo:queHacer':
        nextContent.turismo.queHacer.push({ image: imageUrl, title });
        break;
      case 'turismo:queVisitar':
        nextContent.turismo.queVisitar.push({ image: imageUrl, title });
        break;
      case 'turismo:queComer':
        nextContent.turismo.queComer.push({ image: imageUrl, title });
        break;
      case 'reservas:instructions':
        nextContent.reservas.hero.image = imageUrl;
        break;
      case 'tarifas:temporadaAlta':
      case 'tarifas:temporadaMedia':
      case 'tarifas:temporadaBaja':
      case 'tarifas:politicas':
        nextContent.tarifas.offers.push({ image: imageUrl, title });
        break;
      case 'contacto:general':
        nextContent.contacto.hero.image = imageUrl;
        break;
    }

    const validatedPageContent = PropertyPageContentSchema.parse(nextContent);

    await prisma.property.update({
      where: { id: propertyId },
      data: {
        pageContent: validatedPageContent,
      },
    });

    return {
      success: true,
      data: {
        target,
      },
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: error.issues?.[0]?.message ?? 'Validation error',
      };
    }

    console.error('assignPhotoToPageContent error:', error);
    return {
      success: false,
      error: 'Error asignando imagen a pageContent',
    };
  }
}

export async function updatePropertySettings(
  input: UpdatePropertySettingsInput,
  userId?: string
): Promise<PropertyResponse> {
  try {
    const validated = updatePropertySettingsSchema.parse(input);

    const access = await requirePropertyAccess(validated.propertyId, userId);
    if (!access.ok) return access.response;

    await prisma.property.update({
      where: { id: validated.propertyId },
      data: {
        primaryColor: validated.primaryColor,
        accentColor: validated.accentColor ?? null,
        fontFamily: validated.fontFamily ?? null,
        ...(validated.pageContent !== undefined ? { pageContent: validated.pageContent } : {}),
      },
    });

    return { success: true };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: error.issues?.[0]?.message ?? 'Validation error',
      };
    }

    console.error('updatePropertySettings error:', error);
    return {
      success: false,
      error: 'Error updating property settings',
    };
  }
}

export async function updatePropertyPageContentSection(
  input: UpdatePropertyPageContentSectionInput,
  userId?: string
): Promise<PropertyResponse> {
  try {
    const propertyId = z.string().min(1, 'Property id is required').parse(input.propertyId);
    const section = z
      .enum(['homePage', 'laPropiedad', 'turismo', 'reservas', 'tarifas', 'contacto'])
      .parse(input.section) as PageContentSectionKey;

    const sectionSchema = pageContentSectionSchemas[section];
    const validatedSectionData = sectionSchema.parse(input.sectionData);

    const access = await requirePropertyAccess(propertyId, userId);
    if (!access.ok) return access.response;

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { pageContent: true },
    });

    if (!property) {
      return {
        success: false,
        error: 'Property not found',
      };
    }

    const currentPageContent =
      property.pageContent && typeof property.pageContent === 'object' && !Array.isArray(property.pageContent)
        ? (property.pageContent as Record<string, unknown>)
        : {};

    const mergedPageContent = {
      ...currentPageContent,
      [section]: validatedSectionData,
    };

    // Validate as partial so owners can save one section at a time.
    const validatedPageContent = pageContentSchema.partial().parse(mergedPageContent);

    await prisma.property.update({
      where: { id: propertyId },
      data: {
        pageContent: validatedPageContent,
      },
    });

    return { success: true, data: { section } };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: error.issues?.[0]?.message ?? 'Validation error',
      };
    }

    console.error('updatePropertyPageContentSection error:', error);
    return {
      success: false,
      error: 'Error updating page content section',
    };
  }
}

export async function updatePropertyContent(
  input: UpdatePropertyContentInput,
  userId?: string
): Promise<PropertyResponse> {
  try {
    const propertyId = z.string().min(1, 'Property id is required').parse(input.propertyId);
    const validatedPageContent = PropertyPageContentSchema.parse(input.pageContent);

    const access = await requirePropertyAccess(propertyId, userId);
    if (!access.ok) return access.response;

    await prisma.property.update({
      where: { id: propertyId },
      data: {
        pageContent: validatedPageContent,
      },
    });

    return { success: true };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: error.issues?.[0]?.message ?? 'Validation error',
      };
    }

    console.error('updatePropertyContent error:', error);
    return {
      success: false,
      error: 'Error updating property content',
    };
  }
}

export async function updatePropertyBookingPrefix(
  input: UpdatePropertyBookingPrefixInput,
  userId?: string
): Promise<PropertyResponse> {
  try {
    const validated = updatePropertyBookingPrefixSchema.parse(input);

    const access = await requirePropertyAccess(validated.propertyId, userId);
    if (!access.ok) return access.response;

    await prisma.property.update({
      where: { id: validated.propertyId },
      data: {
        bookingPrefix: validated.bookingPrefix,
      },
    });

    return { success: true };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: error.issues?.[0]?.message ?? 'Validation error',
      };
    }

    console.error('updatePropertyBookingPrefix error:', error);
    return {
      success: false,
      error: 'Error updating booking prefix',
    };
  }
}

export async function updatePropertySmtpSettings(
  input: UpdatePropertySmtpInput,
  userId?: string
): Promise<PropertyResponse> {
  try {
    const validated = updatePropertySmtpSchema.parse(input);

    const access = await requirePropertyAccess(validated.propertyId, userId);
    if (!access.ok) return access.response;

    const property = await prisma.property.findUnique({
      where: { id: validated.propertyId },
      select: {
        id: true,
        smtpPassword: true,
      },
    });

    if (!property) {
      return {
        success: false,
        error: 'Property not found',
      };
    }

    const nextPassword = validated.smtpPassword?.trim() ? validated.smtpPassword.trim() : property.smtpPassword;

    if (!nextPassword) {
      return {
        success: false,
        error: 'SMTP password is required',
      };
    }

    await prisma.property.update({
      where: { id: validated.propertyId },
      data: {
        bookingPrefix: validated.bookingPrefix,
        smtpHost: validated.smtpHost.trim(),
        smtpPort: validated.smtpPort,
        smtpUser: validated.smtpUser.trim(),
        smtpPassword: nextPassword,
        smtpFromEmail: validated.smtpFromEmail.trim(),
      },
    });

    return { success: true };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: error.issues?.[0]?.message ?? 'Validation error',
      };
    }

    console.error('updatePropertySmtpSettings error:', error);
    return {
      success: false,
      error: 'Error updating SMTP settings',
    };
  }
}

export async function testPropertySmtpConnection(
  input: TestPropertySmtpInput,
  userId?: string
): Promise<PropertyResponse> {
  try {
    const access = await requirePropertyAccess(input.propertyId, userId);
    if (!access.ok) return access.response;

    const property = await prisma.property.findUnique({
      where: { id: input.propertyId },
      select: {
        smtpPassword: true,
      },
    });

    const toEmail = input.testToEmail?.trim() || access.email;
    const smtpPassword = input.smtpPassword?.trim() || property?.smtpPassword || '';

    if (!smtpPassword) {
      return {
        success: false,
        error: 'SMTP password is required to send a test email',
      };
    }

    if (!toEmail) {
      return {
        success: false,
        error: 'No test recipient email available',
      };
    }

    await sendBookingEmail({
      to: toEmail,
      subject: 'GuestWave · Test SMTP',
      html: '<p>Conexion SMTP OK desde GuestWave.</p>',
      text: 'Conexion SMTP OK desde GuestWave.',
      property: {
        smtpHost: input.smtpHost,
        smtpPort: input.smtpPort,
        smtpUser: input.smtpUser,
        smtpPassword,
        smtpFromEmail: input.smtpFromEmail,
      },
    });

    return {
      success: true,
      data: {
        recipient: toEmail,
      },
    };
  } catch (error) {
    console.error('testPropertySmtpConnection error:', error);
    return {
      success: false,
      error: 'No se pudo enviar el email de prueba con estos datos SMTP',
    };
  }
}

export async function deleteBookingAndRefund(
  bookingId: string,
  userId?: string
): Promise<PropertyResponse> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        propertyId: true,
        stripeSessionId: true,
        totalPrice: true,
        guestEmail: true,
      },
    });

    if (!booking) {
      return { success: false, error: 'Booking not found' };
    }

    const access = await requirePropertyAccess(booking.propertyId, userId);
    if (!access.ok) return access.response;

    const actor = await ensureAppUserByEmail(access.email);

    if (!booking.stripeSessionId) {
      return {
        success: false,
        error: 'Booking cannot be refunded: missing Stripe session id',
      };
    }

    const refund = await refundStripePayment({
      stripeSessionId: booking.stripeSessionId,
      amount: Number(booking.totalPrice),
      reason: 'requested_by_customer',
    });

    if (refund.status !== 'succeeded') {
      return {
        success: false,
        error: 'Stripe refund could not be confirmed',
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.blockedDate.deleteMany({ where: { bookingId: booking.id } });
      await tx.booking.delete({ where: { id: booking.id } });
      await (tx as any).bookingRefundAudit.create({
        data: {
          bookingId: booking.id,
          propertyId: booking.propertyId,
          performedByUserId: actor.id,
          guestEmail: booking.guestEmail,
          amount: booking.totalPrice,
          refundId: refund.id,
          refundStatus: refund.status,
        },
      });
    });

    return {
      success: true,
      data: {
        id: booking.id,
        refundId: refund.id,
      },
    };
  } catch (error) {
    console.error('deleteBookingAndRefund error:', error);
    return {
      success: false,
      error: 'Error deleting booking and issuing refund',
    };
  }
}

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
