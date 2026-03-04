import { describe, it, expect } from 'vitest';
import {
  createPropertySchema,
  updatePropertySchema,
} from '@/lib/schemas/property';

describe('Property Validation Schema', () => {
  describe('createPropertySchema', () => {
    it('should accept valid property data', () => {
      const validData = {
        name: 'Casa frente al mar',
        slug: 'casa-frente-al-mar',
        description: 'Hermosa casa con vistas al océano',
        amenities: {
          wifi: true,
          parking: false,
          pool: true,
          kitchen: true,
        },
        basePrice: 100.5,
        cleaningFee: 50.0,
        depositPercentage: 30,
      };

      const result = createPropertySchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe(validData.name);
      }
    });

    it('should require name field', () => {
      const invalidData = {
        slug: 'casa-test',
        description: 'Test',
        amenities: {},
        basePrice: 100,
        cleaningFee: 50,
        depositPercentage: 30,
      };

      const result = createPropertySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should require unique slug', () => {
      const validData = {
        name: 'Casa Test',
        slug: 'casa-test',
        description: 'Test',
        amenities: {},
        basePrice: 100,
        cleaningFee: 50,
        depositPercentage: 30,
      };

      const result = createPropertySchema.safeParse(validData);
      expect(result.success).toBe(true);
      // Slug debería ser lowercase y sin espacios
      if (result.success) {
        expect(result.data.slug).toMatch(/^[a-z0-9-]+$/);
      }
    });

    it('should validate basePrice > 0', () => {
      const invalidData = {
        name: 'Casa Test',
        slug: 'casa-test',
        description: 'Test',
        amenities: {},
        basePrice: -10,
        cleaningFee: 50,
        depositPercentage: 30,
      };

      const result = createPropertySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate cleaningFee >= 0', () => {
      const invalidData = {
        name: 'Casa Test',
        slug: 'casa-test',
        description: 'Test',
        amenities: {},
        basePrice: 100,
        cleaningFee: -5,
        depositPercentage: 30,
      };

      const result = createPropertySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate depositPercentage between 0-100', () => {
      const testCases = [
        { depositPercentage: -1, should: 'fail' },
        { depositPercentage: 0, should: 'pass' },
        { depositPercentage: 50, should: 'pass' },
        { depositPercentage: 100, should: 'pass' },
        { depositPercentage: 101, should: 'fail' },
      ];

      const baseData = {
        name: 'Casa Test',
        slug: 'casa-test',
        description: 'Test',
        amenities: {},
        basePrice: 100,
        cleaningFee: 50,
      };

      testCases.forEach(({ depositPercentage, should }) => {
        const result = createPropertySchema.safeParse({
          ...baseData,
          depositPercentage,
        });
        expect(result.success).toBe(should === 'pass');
      });
    });

    it('should validate amenities is an object', () => {
      const validData = {
        name: 'Casa Test',
        slug: 'casa-test',
        description: 'Test',
        amenities: {
          wifi: true,
          pool: true,
          kitchen: true,
        },
        basePrice: 100,
        cleaningFee: 50,
        depositPercentage: 30,
      };

      const result = createPropertySchema.safeParse(validData);
      if (!result.success) {
        console.log('Validation errors:', result.error.issues);
      }
      expect(result.success).toBe(true);
    });

    it('should make description optional', () => {
      const validData = {
        name: 'Casa Test',
        slug: 'casa-test',
        amenities: {},
        basePrice: 100,
        cleaningFee: 50,
        depositPercentage: 30,
      };

      const result = createPropertySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept optional icalUrlIn', () => {
      const validData = {
        name: 'Casa Test',
        slug: 'casa-test',
        description: 'Test',
        amenities: {},
        basePrice: 100,
        cleaningFee: 50,
        depositPercentage: 30,
        icalUrlIn: 'https://example.com/calendar.ics',
      };

      const result = createPropertySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate icalUrlIn is a valid URL if provided', () => {
      const invalidData = {
        name: 'Casa Test',
        slug: 'casa-test',
        description: 'Test',
        amenities: {},
        basePrice: 100,
        cleaningFee: 50,
        depositPercentage: 30,
        icalUrlIn: 'not-a-url',
      };

      const result = createPropertySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('updatePropertySchema', () => {
    it('should allow partial updates', () => {
      const updateData = {
        name: 'Casa actualizada',
      };

      const result = updatePropertySchema.safeParse(updateData);
      expect(result.success).toBe(true);
    });

    it('should validate all fields if provided during update', () => {
      const updateData = {
        basePrice: -50,
      };

      const result = updatePropertySchema.safeParse(updateData);
      expect(result.success).toBe(false);
    });

    it('should not allow empty updates', () => {
      const updateData = {};

      const result = updatePropertySchema.safeParse(updateData);
      expect(result.success).toBe(false);
    });
  });
});
