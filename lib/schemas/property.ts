/**
 * lib/schemas/property.ts
 * Zod schemas para validación de propiedades (Property model)
 * Usado en Server Actions y en el cliente para validación consistente
 */

import { z } from 'zod';

const urlString = (message?: string) =>
  z.string().refine((value) => URL.canParse(value), {
    message: message ?? 'URL inválida',
  });

const emailString = (message?: string) => z.email(message ? { message } : undefined);
const uuidString = (message?: string) => z.uuid(message ? { message } : undefined);

const MediaItemSchema = z.object({
  url: urlString(),
  label: z.string().optional(),
  alt: z.string().optional(),
});

const CardItemSchema = z.object({
  image: urlString(),
  title: z.string(),
  subtitle: z.string().optional(),
  link: z.string().optional(),
});

export const PropertyPageContentSchema = z.object({
  theme: z
    .object({
      primaryColor: z.string().optional(),
      accentColor: z.string().optional(),
      creamColor: z.string().optional(),
    })
    .optional(),

  header: z.object({
    logoUrl: urlString().optional(),
  }),

  footer: z.object({
    logoUrl: urlString().optional(),
    shortText: z.string().optional(),
    instagramUrl: urlString().optional(),
    googleUrl: urlString().optional(),
    phone: z.string().optional(),
    email: emailString().optional(),
    address: z.string().optional(),
    coordinates: z.string().optional(),
  }),

  homepage: z.object({
    hero: z.object({
      image: urlString().optional(),
      title: z.string(),
      subtitle: z.string().optional(),
    }),
    intro: z.object({
      title: z.string().optional(),
      paragraph: z.string().optional(),
    }),
    amenities: z.object({
      title: z.string(),
      paragraph: z.string().optional(),
      items: z.array(z.string()).optional(),
      image: urlString().optional(),
    }),
    availability: z.object({
      title: z.string().optional(),
      paragraph: z.string().optional(),
    }),
    areaCarousel: z.array(
      z.object({
        url: urlString(),
        title: z.string().optional(),
        subtitle: z.string().optional(),
      })
    ),
  }),

  laPropiedad: z.object({
    hero: z.object({ image: urlString().optional(), title: z.string() }),
    intro: z.object({
      title: z.string().optional(),
      paragraph: z.string().optional(),
    }),
    groundFloor: z.object({
      title: z.string(),
      paragraph: z.string().optional(),
      items: z.array(z.string()).optional(),
      image: urlString().optional(),
    }),
    firstFloor: z.object({
      title: z.string(),
      paragraph: z.string().optional(),
      items: z.array(z.string()).optional(),
      image: urlString().optional(),
    }),
    exterior: z.object({
      title: z.string(),
      paragraph: z.string().optional(),
      items: z.array(z.string()).optional(),
      image: urlString().optional(),
    }),
    gallery: z.array(MediaItemSchema),
  }),

  turismo: z.object({
    hero: z.object({ image: urlString().optional(), title: z.string() }),
    queHacer: z.array(CardItemSchema),
    queVisitar: z.array(CardItemSchema),
    queComer: z.array(CardItemSchema),
  }),

  reservas: z.object({
    hero: z.object({ image: urlString().optional(), title: z.string() }),
    intro: z.object({
      title: z.string().optional(),
      paragraph: z.string().optional(),
    }),
    instructions: z.object({
      title: z.string().optional(),
      paragraph: z.string().optional(),
      items: z.array(z.string()).optional(),
    }),
  }),

  tarifas: z.object({
    hero: z.object({ image: urlString().optional(), title: z.string() }),
    intro: z.object({
      title: z.string().optional(),
      paragraph: z.string().optional(),
    }),
    pricingTable: z.any().optional(),
    offers: z.array(CardItemSchema),
    rules: z.array(z.string()).optional(),
    policy: z.array(z.string()).optional(),
  }),

  contacto: z.object({
    hero: z.object({ image: urlString().optional(), title: z.string() }),
    intro: z.object({ title: z.string(), paragraph: z.string() }),
    phone: z.string().optional(),
    email: emailString().optional(),
    address: z.string().optional(),
  }),
});

export type PropertyPageContent = z.infer<typeof PropertyPageContentSchema>;

export function createEmptyPropertyPageContent(): PropertyPageContent {
  return {
    theme: {},
    header: {},
    footer: {},
    homepage: {
      hero: { image: '', title: '', subtitle: '' },
      intro: { title: '', paragraph: '' },
      amenities: { title: '', paragraph: '', items: [], image: '' },
      availability: { title: '', paragraph: '' },
      areaCarousel: [],
    },
    laPropiedad: {
      hero: { image: '', title: '' },
      intro: { title: '', paragraph: '' },
      groundFloor: { title: '', paragraph: '', items: [], image: '' },
      firstFloor: { title: '', paragraph: '', items: [], image: '' },
      exterior: { title: '', paragraph: '', items: [], image: '' },
      gallery: [],
    },
    turismo: {
      hero: { image: '', title: '' },
      queHacer: [],
      queVisitar: [],
      queComer: [],
    },
    reservas: {
      hero: { image: '', title: '' },
      intro: { title: '', paragraph: '' },
      instructions: { title: '', paragraph: '', items: [] },
    },
    tarifas: {
      hero: { image: '', title: '' },
      intro: { title: '', paragraph: '' },
      pricingTable: undefined,
      offers: [],
      rules: [],
      policy: [],
    },
    contacto: {
      hero: { image: '', title: '' },
      intro: { title: '', paragraph: '' },
      phone: '',
      email: '',
      address: '',
    },
  };
}

// Compatibility exports used by legacy admin actions/files.
export const pageContentSectionSchemas = {
  homePage: PropertyPageContentSchema.shape.homepage,
  laPropiedad: PropertyPageContentSchema.shape.laPropiedad,
  turismo: PropertyPageContentSchema.shape.turismo,
  reservas: PropertyPageContentSchema.shape.reservas,
  tarifas: PropertyPageContentSchema.shape.tarifas,
  contacto: PropertyPageContentSchema.shape.contacto,
} as const;

export const pageContentSchema = PropertyPageContentSchema;
export type PageContentSectionKey = keyof typeof pageContentSectionSchemas;

export const mediaItemSchema = urlString('MediaItem debe ser una URL válida');
export type MediaItem = z.infer<typeof mediaItemSchema>;

export const mediaSectionBlockSchema = z.object({
  type: z.literal('image'),
  title: z.string().optional(),
  image: mediaItemSchema,
});

export type MediaSectionBlock = z.infer<typeof mediaSectionBlockSchema>;

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
    .array(urlString('Cada foto debe ser una URL válida'))
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

  icalUrlIn: z.union([urlString('URL del iCal debe ser válida'), z.null()]).optional(),

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
      .array(urlString('Cada foto debe ser una URL válida'))
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
        code: 'custom',
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
  id: uuidString(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Property = z.infer<typeof propertySchema>;
