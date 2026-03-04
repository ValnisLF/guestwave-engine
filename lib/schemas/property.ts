/**
 * lib/schemas/property.ts
 * Zod schemas para validación de propiedades (Property model)
 * Usado en Server Actions y en el cliente para validación consistente
 */

import { z } from 'zod';

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

  amenities: z.record(z.string(), z.boolean()).optional(),

  basePrice: z.number().gt(0, 'Precio base debe ser mayor a 0'),

  cleaningFee: z.number().gte(0, 'Prima de limpieza no puede ser negativa').default(0),

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
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;

/**
 * Schema para actualizar una propiedad existente
 * Todos los campos son opcionales pero si se proporcionan deben pasar validación
 */
export const updatePropertySchema = createPropertySchema
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
