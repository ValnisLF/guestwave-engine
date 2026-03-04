import { describe, it, expect } from 'vitest';
import {
  isDateRangeAvailable,
  getBlockedDateRanges,
  hasDateCollision,
} from './availability';
import type { DateRange } from './types';

describe('availability.isDateRangeAvailable', () => {
  const mockBlockedDates: DateRange[] = [
    {
      startDate: new Date('2026-03-10'),
      endDate: new Date('2026-03-15'),
    },
  ];

  it('should return true when requested range does not collide with blocked dates', () => {
    const requestedRange: DateRange = {
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-03-09'),
    };
    const result = isDateRangeAvailable(requestedRange, mockBlockedDates);
    expect(result.isAvailable).toBe(true);
  });

  it('should return false when requested range overlaps with a blocked date', () => {
    const requestedRange: DateRange = {
      startDate: new Date('2026-03-14'),
      endDate: new Date('2026-03-16'),
    };
    const result = isDateRangeAvailable(requestedRange, mockBlockedDates);
    expect(result.isAvailable).toBe(false);
  });

  it('should return false when requested range is completely within a blocked date', () => {
    const requestedRange: DateRange = {
      startDate: new Date('2026-03-11'),
      endDate: new Date('2026-03-13'),
    };
    const result = isDateRangeAvailable(requestedRange, mockBlockedDates);
    expect(result.isAvailable).toBe(false);
  });

  it('should return false when requested range exactly matches a blocked date', () => {
    const requestedRange: DateRange = {
      startDate: new Date('2026-03-10'),
      endDate: new Date('2026-03-15'),
    };
    const result = isDateRangeAvailable(requestedRange, mockBlockedDates);
    expect(result.isAvailable).toBe(false);
  });

  it('should handle multiple blocked date ranges', () => {
    const multipleBlocked: DateRange[] = [
      {
        startDate: new Date('2026-03-10'),
        endDate: new Date('2026-03-15'),
      },
      {
        startDate: new Date('2026-03-20'),
        endDate: new Date('2026-03-25'),
      },
    ];
    const requestedRange: DateRange = {
      startDate: new Date('2026-03-16'),
      endDate: new Date('2026-03-19'),
    };
    const result = isDateRangeAvailable(requestedRange, multipleBlocked);
    expect(result.isAvailable).toBe(true);
  });

  it('should return blocked dates when unavailable', () => {
    const requestedRange: DateRange = {
      startDate: new Date('2026-03-14'),
      endDate: new Date('2026-03-16'),
    };
    const result = isDateRangeAvailable(requestedRange, mockBlockedDates);
    expect(result.blockedDates).toHaveLength(1);
    expect(result.blockedDates[0].startDate).toEqual(new Date('2026-03-10'));
  });
});

describe('availability.getBlockedDateRanges', () => {
  it('should return empty array when no blocked dates provided', () => {
    const result = getBlockedDateRanges([]);
    expect(result).toEqual([]);
  });

  it('should return sorted blocked date ranges', () => {
    const blocked: DateRange[] = [
      { startDate: new Date('2026-03-20'), endDate: new Date('2026-03-25') },
      { startDate: new Date('2026-03-10'), endDate: new Date('2026-03-15') },
    ];
    const result = getBlockedDateRanges(blocked);
    expect(result[0].startDate).toEqual(new Date('2026-03-10'));
    expect(result[1].startDate).toEqual(new Date('2026-03-20'));
  });
});

describe('availability.hasDateCollision', () => {
  const range1: DateRange = {
    startDate: new Date('2026-03-10'),
    endDate: new Date('2026-03-15'),
  };

  it('should return false when ranges do not overlap', () => {
    const range2: DateRange = {
      startDate: new Date('2026-03-20'),
      endDate: new Date('2026-03-25'),
    };
    const result = hasDateCollision(range1, range2);
    expect(result.hasCollision).toBe(false);
  });

  it('should return true when ranges overlap', () => {
    const range2: DateRange = {
      startDate: new Date('2026-03-14'),
      endDate: new Date('2026-03-20'),
    };
    const result = hasDateCollision(range1, range2);
    expect(result.hasCollision).toBe(true);
  });

  it('should detect collision when ranges touch at boundary', () => {
    const range2: DateRange = {
      startDate: new Date('2026-03-15'),
      endDate: new Date('2026-03-20'),
    };
    // En propiedades de alquiler, la salida de uno es la entrada del otro
    // Por eso ranges que tocan limítrofes son considerados overlapping
    const result = hasDateCollision(range1, range2);
    expect(result.hasCollision).toBe(true);
  });
});
