import { createPropertySchema, updatePropertySchema } from '@/lib/schemas/property';
import {
  Property,
  PropertyInput,
  PropertyValidationResult,
  ValidationError,
} from './types';

export class PropertyService {
  /**
   * Validates property input using Zod schema
   */
  validateProperty(input: PropertyInput): PropertyValidationResult {
    const errors: ValidationError[] = [];

    // Validate name
    if (!input.name || input.name.length < 3) {
      errors.push({
        field: 'name',
        message: 'Name must be at least 3 characters',
      });
    }
    if (input.name && input.name.length > 255) {
      errors.push({
        field: 'name',
        message: 'Name cannot exceed 255 characters',
      });
    }

    // Validate slug
    if (!input.slug) {
      errors.push({
        field: 'slug',
        message: 'Slug is required',
      });
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) {
      errors.push({
        field: 'slug',
        message: 'Slug must contain only lowercase letters, numbers, and hyphens',
      });
    }
    if (input.slug && input.slug.length > 255) {
      errors.push({
        field: 'slug',
        message: 'Slug cannot exceed 255 characters',
      });
    }

    // Validate basePrice
    if (typeof input.basePrice !== 'number' || input.basePrice <= 0) {
      errors.push({
        field: 'basePrice',
        message: 'Base price must be greater than 0',
      });
    }

    // Validate cleaningFee
    const cleaningFee = input.cleaningFee ?? 0;
    if (cleaningFee < 0) {
      errors.push({
        field: 'cleaningFee',
        message: 'Cleaning fee cannot be negative',
      });
    }

    // Validate depositPercentage
    const depositPct = input.depositPercentage ?? 0;
    if (depositPct < 0 || depositPct > 100) {
      errors.push({
        field: 'depositPercentage',
        message: 'Deposit percentage must be between 0 and 100',
      });
    }
    if (!Number.isInteger(depositPct)) {
      errors.push({
        field: 'depositPercentage',
        message: 'Deposit percentage must be an integer',
      });
    }

    // Validate icalUrlIn if provided
    if (input.icalUrlIn) {
      try {
        new URL(input.icalUrlIn);
      } catch {
        errors.push({
          field: 'icalUrlIn',
          message: 'Invalid iCal URL format',
        });
      }
    }

    // Validate description length
    if (input.description && input.description.length > 5000) {
      errors.push({
        field: 'description',
        message: 'Description cannot exceed 5000 characters',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculates effective nightly price with season multiplier
   */
  calculateNightly(input: {
    basePrice: number;
    seasonMultiplier?: number;
  }): number {
    const multiplier = input.seasonMultiplier ?? 1;
    return Math.round(input.basePrice * multiplier * 100) / 100;
  }

  /**
   * Suggests minimum stay (nights) based on economics
   * Higher cleaning fees relative to nightly rate → higher minimum stay
   */
  calculateMinimumStay(input: {
    basePrice: number;
    cleaningFee: number;
    depositPercentage: number;
  }): number {
    const cleaningFeeToPriceRatio = input.cleaningFee / input.basePrice;

    // If cleaning fee is >50% of nightly rate, suggest minimum 2 nights
    if (cleaningFeeToPriceRatio > 0.5) {
      return 2;
    }

    // Otherwise default to 1 night
    return 1;
  }

  /**
   * Formats property data for display
   */
  formatForDisplay(property: Property): Property & { displayPrice: string } {
    return {
      ...property,
      displayPrice: `$${property.basePrice.toFixed(2)}`,
    };
  }
}
