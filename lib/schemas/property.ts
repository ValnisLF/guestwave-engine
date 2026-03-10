/**
 * lib/schemas/property.ts
 * Zod schemas para validación de propiedades (Property model)
 * Usado en Server Actions y en el cliente para validación consistente
 */

import { z } from 'zod';

export const mediaItemSchema = z.string().url('MediaItem debe ser una URL válida');
export type MediaItem = z.infer<typeof mediaItemSchema>;

const mediaTextBlockSchema = z.object({
  type: z.enum(['text', 'text_block']),
  title: z.string().optional(),
  content: z.string(),
});

const mediaImageBlockSchema = z.object({
  type: z.literal('image'),
  image: mediaItemSchema,
  alt: z.string().optional(),
  caption: z.string().optional(),
});

const mediaCarouselBlockSchema = z.object({
  type: z.enum(['carousel', 'gallery']),
  layout: z.enum(['carousel']).optional(),
  images: z.array(mediaItemSchema).min(1, 'Carousel requiere al menos una imagen'),
  title: z.string().optional(),
});

export const mediaSectionBlockSchema = z.union([
  mediaTextBlockSchema,
  mediaImageBlockSchema,
  mediaCarouselBlockSchema,
]);

export const mediaReadySectionSchema = z.object({
  sections: z.array(mediaSectionBlockSchema),
});

export type MediaSectionBlock = z.infer<typeof mediaSectionBlockSchema>;
export type MediaReadySection = z.infer<typeof mediaReadySectionSchema>;

const pageBlockSchema = z.object({
  overlayHeroTitle: z.string(),
  overlayHeroSubtitle: z.string(),
  shortBioTitle: z.string(),
  shorBioText: z.string(),
});

export const pageContentSectionSchemas = {
  homePage: z.union([
    pageBlockSchema.extend({
      amenitiesTitle: z.string(),
      amenitiesText: z.string(),
      sections: z.array(mediaSectionBlockSchema).optional(),
    }),
    mediaReadySectionSchema,
  ]),
  laPropiedad: z.union([
    pageBlockSchema.extend({
      groundFloorTitle: z.string(),
      groundFloorText: z.string(),
      firstFloorTitle: z.string(),
      firstFloorText: z.string(),
      exteriorTitle: z.string(),
      exteriorText: z.string(),
      sections: z.array(mediaSectionBlockSchema).optional(),
    }),
    mediaReadySectionSchema,
  ]),
  turismo: z.union([
    pageBlockSchema.extend({
      queHacerTitle: z.string(),
      queVisitarTitle: z.string(),
      queComerTitle: z.string(),
      queHacerText: z.string(),
      queVisitarText: z.string(),
      queComerText: z.string(),
      sections: z.array(mediaSectionBlockSchema).optional(),
    }),
    mediaReadySectionSchema,
  ]),
  reservas: z.union([
    pageBlockSchema.extend({
      instructions: z.string(),
      sections: z.array(mediaSectionBlockSchema).optional(),
    }),
    mediaReadySectionSchema,
  ]),
  tarifas: z.union([
    pageBlockSchema.extend({
      temporadaAlta: z.string(),
      temporadaMedia: z.string(),
      temporadaBaja: z.string(),
      politicas: z.string(),
      sections: z.array(mediaSectionBlockSchema).optional(),
    }),
    mediaReadySectionSchema,
  ]),
  contacto: z.union([
    pageBlockSchema.extend({
      telefono: z.string(),
      email: z.string(),
      direccion: z.string(),
      sections: z.array(mediaSectionBlockSchema).optional(),
    }),
    mediaReadySectionSchema,
  ]),
} as const;

export const pageContentSchema = z.object(pageContentSectionSchemas);
export type PageContent = z.infer<typeof pageContentSchema>;
export type PageContentSectionKey = keyof typeof pageContentSectionSchemas;

/**
 * Schema para crear una nueva propiedad
 * Todos los campos son obligatorios excepto description, amenities e icalUrlIn
 */
export const createPropertySchema = z.object({
  name: z
    .string()
    .min(3, 'Nombre debe tener al menos 3 caracteres')
    .max(255, 'Nombre no puede exceder 255 caracteres'),

  slug: z
    .string()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug debe contener solo letras minúsculas, números y guiones'
    )
    .max(255, 'Slug no puede exceder 255 caracteres'),

  description: z
    .string()
    .max(5000, 'Descripción no puede exceder 5000 caracteres')
    .optional()
    .nullable(),

  imageUrls: z
    .array(z.string().url('Cada foto debe ser una URL válida'))
    .max(20, 'No puede haber más de 20 fotos')
    .optional()
    .default([]),

  amenities: z.record(z.string(), z.boolean()).optional(),

  basePrice: z.number().gt(0, 'Precio base debe ser mayor a 0'),

  cleaningFee: z.number().gte(0, 'Prima de limpieza no puede ser negativa').default(0),

  minimumStay: z
    .number()
    .int('Estancia mínima debe ser un número entero')
    .min(1, 'Estancia mínima debe ser de al menos 1 noche')
    .default(1),

  depositPercentage: z
    .number()
    .int('Depósito debe ser un número entero')
    .min(0, 'Depósito no puede ser menor a 0%')
    .max(100, 'Depósito no puede ser mayor a 100%')
    .default(0),

  icalUrlIn: z
    .string()
    .url('URL del iCal debe ser válida')
    .optional()
    .nullable(),

  pageContent: pageContentSchema.optional(),
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;

/**
 * Schema para actualizar una propiedad existente
 * Todos los campos son opcionales pero si se proporcionan deben pasar validación
 */
export const updatePropertySchema = createPropertySchema
  .omit({
    cleaningFee: true,
    minimumStay: true,
    depositPercentage: true,
    imageUrls: true,
  })
  .extend({
    imageUrls: z
      .array(z.string().url('Cada foto debe ser una URL válida'))
      .max(20, 'No puede haber más de 20 fotos')
      .optional(),
    cleaningFee: z.number().gte(0, 'Prima de limpieza no puede ser negativa').optional(),
    minimumStay: z
      .number()
      .int('Estancia mínima debe ser un número entero')
      .min(1, 'Estancia mínima debe ser de al menos 1 noche')
      .optional(),
    depositPercentage: z
      .number()
      .int('Depósito debe ser un número entero')
      .min(0, 'Depósito no puede ser menor a 0%')
      .max(100, 'Depósito no puede ser mayor a 100%')
      .optional(),
  })
  .partial()
  .superRefine((data, ctx) => {
    if (Object.keys(data).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Al menos un campo debe ser proporcionado para la actualización',
      });
    }
  });

export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;

/**
 * Schema para lectura de propiedad (con ID y timestamps)
 * Usado post-creación
 */
export const propertySchema = createPropertySchema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Property = z.infer<typeof propertySchema>;
