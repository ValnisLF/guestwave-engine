/**
 * Domain types for Property feature
 * Represents business entities and operations
 */

export type Property = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  basePrice: number;
  cleaningFee: number;
  depositPercentage: number;
  amenities?: Record<string, boolean>;
  icalUrlIn?: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string; // Owner
};

export type PropertyInput = {
  name: string;
  slug: string;
  description?: string | null;
  basePrice: number;
  cleaningFee?: number;
  depositPercentage?: number;
  amenities?: Record<string, boolean>;
  icalUrlIn?: string | null;
};

export type PropertyOperationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: PropertyErrorCode };

export enum PropertyErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE_SLUG = 'DUPLICATE_SLUG',
  UNAUTHORIZED = 'UNAUTHORIZED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export type ValidationError = {
  field: string;
  message: string;
};

export type PropertyValidationResult = {
  isValid: boolean;
  errors: ValidationError[];
};
