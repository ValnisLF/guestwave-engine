import type { DateRange, AvailabilityCheckResult, CollisionCheck } from './types';

/**
 * Verifica si un rango de fechas (check-in a check-out) está disponible
 * dadas las fechas bloqueadas
 */
export function isDateRangeAvailable(
  requestedRange: DateRange,
  blockedDates: DateRange[]
): AvailabilityCheckResult {
  const collidingRanges = blockedDates.filter((blocked) =>
    hasDateCollision(requestedRange, blocked).hasCollision
  );

  if (collidingRanges.length === 0) {
    return { isAvailable: true, blockedDates: [] };
  }

  return {
    isAvailable: false,
    blockedDates: collidingRanges,
    reason: `El rango solicitado colisiona con ${collidingRanges.length} fecha(s) bloqueada(s)`,
  };
}

/**
 * Retorna las fechas bloqueadas ordenadas por fecha de inicio
 */
export function getBlockedDateRanges(blockedDates: DateRange[]): DateRange[] {
  return [...blockedDates].sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime()
  );
}

/**
 * Detecta si dos rangos de fechas colisionan (overlappan)
 * Nota: Dos rangos que se tocan en los límites también se consideran colisionados
 * (check-out en fecha X es entrada del siguiente huésped en fecha X)
 */
export function hasDateCollision(
  range1: DateRange,
  range2: DateRange
): CollisionCheck {
  const { startDate: start1, endDate: end1 } = range1;
  const { startDate: start2, endDate: end2 } = range2;

  // Collisión ocurre si una no termina antes de que la otra empiece
  const hasCollision = start1 <= end2 && end1 >= start2;

  if (hasCollision) {
    return {
      hasCollision: true,
      collidingRange: {
        startDate: new Date(Math.max(start1.getTime(), start2.getTime())),
        endDate: new Date(Math.min(end1.getTime(), end2.getTime())),
      },
    };
  }

  return { hasCollision: false };
}

/**
 * Calcula el número de noches entre dos fechas
 */
export function calculateNights(startDate: Date, endDate: Date): number {
  const diffTime = endDate.getTime() - startDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}
