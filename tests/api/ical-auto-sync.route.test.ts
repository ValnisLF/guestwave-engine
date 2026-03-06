import { beforeEach, describe, expect, it, vi } from 'vitest';

const propertyFindManyMock = vi.fn();
const propertyUpdateMock = vi.fn();
const propertyIcalCalendarUpdateManyMock = vi.fn();
const syncPropertyIcalMock = vi.fn();

vi.mock('@infra/prisma', () => ({
  prisma: {
    property: {
      findMany: propertyFindManyMock,
      update: propertyUpdateMock,
    },
    propertyIcalCalendar: {
      updateMany: propertyIcalCalendarUpdateManyMock,
    },
  },
}));

vi.mock('@infra/ical/sync', () => ({
  syncPropertyIcal: syncPropertyIcalMock,
}));

describe('GET/POST /api/internal/ical/auto-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-06T12:00:00.000Z'));

    delete process.env.ICAL_AUTO_SYNC_TOKEN;
    delete process.env.CRON_SECRET;
    process.env.NODE_ENV = 'test';
  });

  it('returns 401 in production when no auth headers are provided', async () => {
    process.env.NODE_ENV = 'production';

    const { GET } = await import('@/app/api/internal/ical/auto-sync/route');

    const req = {
      headers: {
        get: () => null,
      },
    } as any;

    const response = await GET(req);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
    expect(propertyFindManyMock).not.toHaveBeenCalled();
  });

  it('syncs only due properties and updates attempt + property heartbeat', async () => {
    process.env.ICAL_AUTO_SYNC_TOKEN = 'secret-token';

    propertyFindManyMock.mockResolvedValue([
      {
        id: 'prop_due',
        autoSyncIntervalMinutes: 5,
        autoSyncLastRunAt: new Date('2026-03-06T11:54:00.000Z'),
        icalUrlIn: null,
        icalCalendars: [{ id: 'cal_1' }],
      },
      {
        id: 'prop_not_due',
        autoSyncIntervalMinutes: 10,
        autoSyncLastRunAt: new Date('2026-03-06T11:55:00.000Z'),
        icalUrlIn: null,
        icalCalendars: [{ id: 'cal_2' }],
      },
      {
        id: 'prop_no_source',
        autoSyncIntervalMinutes: 5,
        autoSyncLastRunAt: null,
        icalUrlIn: null,
        icalCalendars: [],
      },
    ]);

    syncPropertyIcalMock.mockResolvedValue({
      propertyId: 'prop_due',
      synced: 2,
      skipped: false,
    });

    const { POST } = await import('@/app/api/internal/ical/auto-sync/route');

    const req = {
      headers: {
        get: (key: string) => (key === 'x-ical-auto-sync-token' ? 'secret-token' : null),
      },
    } as any;

    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.scanned).toBe(3);
    expect(json.due).toBe(1);
    expect(json.synced).toBe(1);
    expect(json.failed).toBe(0);

    expect(propertyIcalCalendarUpdateManyMock).toHaveBeenCalledTimes(1);
    expect(propertyIcalCalendarUpdateManyMock).toHaveBeenCalledWith({
      where: { propertyId: 'prop_due' },
      data: { lastSyncedAt: new Date('2026-03-06T12:00:00.000Z') },
    });

    expect(syncPropertyIcalMock).toHaveBeenCalledTimes(1);
    expect(syncPropertyIcalMock).toHaveBeenCalledWith('prop_due');

    expect(propertyUpdateMock).toHaveBeenCalledTimes(1);
    expect(propertyUpdateMock).toHaveBeenCalledWith({
      where: { id: 'prop_due' },
      data: { autoSyncLastRunAt: new Date('2026-03-06T12:00:00.000Z') },
    });
  });

  it('increments failed when sync throws and does not update property autoSyncLastRunAt', async () => {
    process.env.ICAL_AUTO_SYNC_TOKEN = 'secret-token';

    propertyFindManyMock.mockResolvedValue([
      {
        id: 'prop_due_fail',
        autoSyncIntervalMinutes: 5,
        autoSyncLastRunAt: null,
        icalUrlIn: null,
        icalCalendars: [{ id: 'cal_fail' }],
      },
    ]);

    syncPropertyIcalMock.mockRejectedValue(new Error('boom sync'));

    const { GET } = await import('@/app/api/internal/ical/auto-sync/route');

    const req = {
      headers: {
        get: (key: string) => (key === 'x-ical-auto-sync-token' ? 'secret-token' : null),
      },
    } as any;

    const response = await GET(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.due).toBe(1);
    expect(json.synced).toBe(0);
    expect(json.failed).toBe(1);
    expect(json.results[0]).toEqual(
      expect.objectContaining({
        propertyId: 'prop_due_fail',
        error: 'boom sync',
      })
    );

    expect(propertyIcalCalendarUpdateManyMock).toHaveBeenCalledTimes(1);
    expect(propertyUpdateMock).not.toHaveBeenCalled();
  });
});
