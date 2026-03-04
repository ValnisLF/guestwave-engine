/**
 * Types para lógica de disponibilidad
 */

export type DateRange = {
  startDate: Date;
  endDate: Date;
};

export type AvailabilityCheckResult = {
  isAvailable: boolean;
  blockedDates: DateRange[];
  reason?: string;
};

export type CollisionCheck = {
  hasCollision: boolean;
  collidingRange?: DateRange;
};
