import { beforeEach, describe, expect, it, vi } from 'vitest';

const findUniqueMock = vi.fn();
const findManyMock = vi.fn();
const calendarFindUniqueMock = vi.fn();
const calendarUpdateMock = vi.fn();
const deleteManyMock = vi.fn();
const createManyMock = vi.fn();

const prismaMock = {
  property: {
    findUnique: findUniqueMock,
    findMany: findManyMock,
  },
  propertyIcalCalendar: {
    findUnique: calendarFindUniqueMock,
  },
  $transaction: vi.fn(async (callback: any) =>
    callback({
      blockedDate: {
        deleteMany: deleteManyMock,
        createMany: createManyMock,
      },
      propertyIcalCalendar: {
        update: calendarUpdateMock,
      },
    })
  ),
};

vi.mock('@infra/prisma', () => ({ prisma: prismaMock }));

describe('ical sync infrastructure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns skipped when property has no icalUrlIn', async () => {
    findUniqueMock.mockResolvedValue({ id: 'property_1', icalUrlIn: null, icalCalendars: [] });

    const { syncPropertyIcal } = await import('@/src/infrastructure/ical/sync');
    const result = await syncPropertyIcal('property_1');

    expect(result).toEqual({
      propertyId: 'property_1',
      synced: 0,
      skipped: true,
      reason: 'No iCal calendars configured',
    });
    expect(deleteManyMock).not.toHaveBeenCalled();
    expect(createManyMock).not.toHaveBeenCalled();
  });

  it('imports VEVENT ranges and rewrites ICAL blocked dates', async () => {
    calendarFindUniqueMock.mockResolvedValue({
      id: 'calendar_1',
      propertyId: 'property_1',
      name: 'Booking',
      icalUrl: 'https://example.com/calendar.ics',
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:20260510T120000Z
DTEND:20260512T120000Z
SUMMARY:Reserved
END:VEVENT
END:VCALENDAR`,
      })
    );

    const { syncPropertyIcalCalendar } = await import('@/src/infrastructure/ical/sync');
    const result = await syncPropertyIcalCalendar('calendar_1');

    expect(result.propertyId).toBe('property_1');
    expect(result.calendarId).toBe('calendar_1');
    expect(result.synced).toBe(1);
    expect(result.skipped).toBe(false);

    expect(deleteManyMock).toHaveBeenCalledWith({
      where: {
        propertyId: 'property_1',
        source: 'ICAL',
        icalCalendarId: 'calendar_1',
      },
    });

    expect(createManyMock).toHaveBeenCalledOnce();
    const createArg = createManyMock.mock.calls[0][0];
    expect(createArg.data).toHaveLength(1);
    expect(createArg.data[0]).toEqual(
      expect.objectContaining({
        propertyId: 'property_1',
        source: 'ICAL',
        icalCalendarId: 'calendar_1',
      })
    );

    expect(calendarUpdateMock).toHaveBeenCalledOnce();

    vi.unstubAllGlobals();
  });

  it('aggregates syncAll results and keeps failures per property', async () => {
    findManyMock.mockResolvedValue([
      { id: 'ok_1', icalUrlIn: null, icalCalendars: [{ id: 'cal_ok_1' }] },
      { id: 'err_1', icalUrlIn: null, icalCalendars: [{ id: 'cal_err_1' }] },
    ]);

    const calendarSequence = [
      {
        id: 'cal_ok_1',
        propertyId: 'ok_1',
        name: 'Ok',
        icalUrl: 'https://example.com/ok.ics',
      },
      null,
    ];

    calendarFindUniqueMock.mockImplementation(async () => calendarSequence.shift());

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:20260510T120000Z
DTEND:20260512T120000Z
SUMMARY:Reserved
END:VEVENT
END:VCALENDAR`,
      })
    );

    const { syncAllIcalInputs } = await import('@/src/infrastructure/ical/sync');
    const results = await syncAllIcalInputs();

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual(
      expect.objectContaining({
        propertyId: 'ok_1',
      })
    );
    expect(results[1]).toEqual(
      expect.objectContaining({
        propertyId: 'err_1',
        synced: 0,
      })
    );

    vi.unstubAllGlobals();
  });
});
