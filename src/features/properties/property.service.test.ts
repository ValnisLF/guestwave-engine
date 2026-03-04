import { describe, it, expect } from 'vitest';
import { PropertyService } from './property.service';
import { PropertyErrorCode } from './types';

describe('PropertyService', () => {
  describe('validateProperty', () => {
    it('validates a valid property input', () => {
      const service = new PropertyService();
      const result = service.validateProperty({
        name: 'Beautiful Beach House',
        slug: 'beach-house',
        basePrice: 150,
        cleaningFee: 50,
        depositPercentage: 30,
        amenities: { wifi: true, kitchen: true },
        description: 'A stunning beachfront property',
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects property with short name', () => {
      const service = new PropertyService();
      const result = service.validateProperty({
        name: 'Ab',
        slug: 'ab',
        basePrice: 100,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'name' })
      );
    });

    it('rejects property with invalid slug format', () => {
      const service = new PropertyService();
      const result = service.validateProperty({
        name: 'Valid Name',
        slug: 'Invalid_Slug!',
        basePrice: 100,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'slug' })
      );
    });

    it('rejects property with invalid basePrice', () => {
      const service = new PropertyService();
      const result = service.validateProperty({
        name: 'Valid Name',
        slug: 'valid-slug',
        basePrice: -50,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'basePrice' })
      );
    });

    it('rejects property with invalid deposit percentage', () => {
      const service = new PropertyService();
      const result = service.validateProperty({
        name: 'Valid Name',
        slug: 'valid-slug',
        basePrice: 100,
        depositPercentage: 150, // > 100
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'depositPercentage' })
      );
    });

    it('rejects property with invalid iCal URL', () => {
      const service = new PropertyService();
      const result = service.validateProperty({
        name: 'Valid Name',
        slug: 'valid-slug',
        basePrice: 100,
        icalUrlIn: 'not-a-valid-url',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'icalUrlIn' })
      );
    });

    it('accepts optional fields', () => {
      const service = new PropertyService();
      const result = service.validateProperty({
        name: 'Minimal Property',
        slug: 'minimal',
        basePrice: 100,
        // No description, amenities, depositPercentage, icalUrlIn
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('calculateNightly', () => {
    it('calculates nightly price with multiplier', () => {
      const service = new PropertyService();
      const price = service.calculateNightly({
        basePrice: 100,
        seasonMultiplier: 1.5,
      });

      expect(price).toBe(150);
    });

    it('uses basePrice when no multiplier provided', () => {
      const service = new PropertyService();
      const price = service.calculateNightly({
        basePrice: 100,
      });

      expect(price).toBe(100);
    });

    it('handles fractional multipliers', () => {
      const service = new PropertyService();
      const price = service.calculateNightly({
        basePrice: 100,
        seasonMultiplier: 0.8,
      });

      expect(price).toBe(80);
    });
  });

  describe('calculateMinimumStay', () => {
    it('returns 1 night as default minimum', () => {
      const service = new PropertyService();
      const minNights = service.calculateMinimumStay({
        basePrice: 100,
        cleaningFee: 50,
        depositPercentage: 30,
      });

      expect(minNights).toBe(1);
    });

    it('recommends 2+ nights for low price-to-cleaning-fee ratio', () => {
      const service = new PropertyService();
      // High cleaning fee relative to nightly price
      const minNights = service.calculateMinimumStay({
        basePrice: 50, // Low price
        cleaningFee: 100, // High fee
        depositPercentage: 20,
      });

      expect(minNights).toBeGreaterThanOrEqual(2);
    });

    it('suggests lower minimum for high nightly rates', () => {
      const service = new PropertyService();
      // Low cleaning fee relative to nightly price
      const minNights = service.calculateMinimumStay({
        basePrice: 500, // High price
        cleaningFee: 50, // Low relative fee
        depositPercentage: 20,
      });

      expect(minNights).toEqual(1);
    });
  });
});
