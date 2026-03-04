'use server';

import { prisma } from '@infra/prisma';
import { PropertyService } from '@features/properties/property.service';
import { createPropertySchema, updatePropertySchema } from '@/lib/schemas/property';
import { ZodError } from 'zod';

const propertyService = new PropertyService();

export type CreatePropertyInput = {
  name: string;
  slug: string;
  description?: string | null;
  basePrice: number;
  cleaningFee?: number;
  depositPercentage?: number;
  amenities?: Record<string, boolean>;
  icalUrlIn?: string | null;
};

export type PropertyResponse = {
  success: boolean;
  data?: any;
  error?: string;
};

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
        basePrice: validated.basePrice,
        cleaningFee: validated.cleaningFee ?? 0,
        depositPercentage: validated.depositPercentage ?? 0,
        amenities: validated.amenities ?? {},
        icalUrlIn: validated.icalUrlIn,
        // TODO: Link to userId once authentication is implemented
      },
    });

    return {
      success: true,
      data: property,
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
      data: updated,
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
      data: property,
    };
  } catch (error) {
    console.error('getPropertyBySlug error:', error);
    return {
      success: false,
      error: 'Error fetching property',
    };
  }
}
