import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AvailabilityCalendarView } from '@/app/admin/properties/[propertyId]/_components/AvailabilityCalendarView';

function isoAtUtcMidnight(year: number, month1: number, day: number): string {
  return new Date(Date.UTC(year, month1 - 1, day)).toISOString();
}

describe('AvailabilityCalendarView', () => {
  it('renders occupied blocks with source labels and date ranges', () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const html = renderToStaticMarkup(
      <AvailabilityCalendarView
        occupiedRanges={[
          {
            id: 'b1',
            startDate: isoAtUtcMidnight(year, month, 10),
            endDate: isoAtUtcMidnight(year, month, 12),
            label: 'Directa',
            source: 'BOOKING',
          },
          {
            id: 'b2',
            startDate: isoAtUtcMidnight(year, month, 14),
            endDate: isoAtUtcMidnight(year, month, 16),
            label: 'Airbnb',
            source: 'ICAL',
          },
          {
            id: 'b3',
            startDate: isoAtUtcMidnight(year, month, 18),
            endDate: isoAtUtcMidnight(year, month, 19),
            label: 'Manual: Owner',
            source: 'MANUAL',
          },
        ]}
      />
    );

    expect(html).toContain('Bloques ocupados en este mes');
    expect(html).toContain('Directa');
    expect(html).toContain('Airbnb');
    expect(html).toContain('Manual: Owner');
  });

  it('uses half-open interval [start, end) so checkout day remains free', () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const html = renderToStaticMarkup(
      <AvailabilityCalendarView
        occupiedRanges={[
          {
            id: 'half-open',
            startDate: isoAtUtcMidnight(year, month, 20),
            endDate: isoAtUtcMidnight(year, month, 21),
            label: 'Directa',
            source: 'BOOKING',
          },
        ]}
      />
    );

    const occupiedTitleOccurrences = html.match(/title="Ocupado por: Directa"/g) ?? [];
    expect(occupiedTitleOccurrences).toHaveLength(1);
  });
});
