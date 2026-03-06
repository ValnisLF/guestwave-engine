import ICAL from 'ical.js';
import { prisma } from '@infra/prisma';

function toDate(value: ICAL.Time | Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (value instanceof ICAL.Time) {
    const jsDate = value.toJSDate();
    return Number.isNaN(jsDate.getTime()) ? null : jsDate;
  }
  return null;
}

function parseIcalRanges(icsRaw: string): Array<{ startDate: Date; endDate: Date }> {
  const jcalData = ICAL.parse(icsRaw);
  const component = new ICAL.Component(jcalData);
  const events = component.getAllSubcomponents('vevent');

  const ranges: Array<{ startDate: Date; endDate: Date }> = [];

  for (const eventComponent of events) {
    const event = new ICAL.Event(eventComponent);
    const start = toDate(event.startDate);
    const end = toDate(event.endDate);

    if (!start || !end) continue;
    if (start >= end) continue;

    ranges.push({ startDate: start, endDate: end });
  }

  return ranges;
}

async function fetchIcalRanges(icalUrl: string) {
  const response = await fetch(icalUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Unable to fetch iCal: ${response.status}`);
  }

  const icsRaw = await response.text();
  return parseIcalRanges(icsRaw);
}

export async function syncPropertyIcalCalendar(calendarId: string) {
  const calendar = await prisma.propertyIcalCalendar.findUnique({
    where: { id: calendarId },
    select: {
      id: true,
      propertyId: true,
      name: true,
      icalUrl: true,
    },
  });

  if (!calendar) {
    throw new Error('Calendar not found');
  }

  const ranges = await fetchIcalRanges(calendar.icalUrl);

  await prisma.$transaction(async (tx) => {
    await tx.blockedDate.deleteMany({
      where: {
        propertyId: calendar.propertyId,
        source: 'ICAL',
        icalCalendarId: calendar.id,
      },
    });

    if (ranges.length > 0) {
      await tx.blockedDate.createMany({
        data: ranges.map((range) => ({
          propertyId: calendar.propertyId,
          startDate: range.startDate,
          endDate: range.endDate,
          source: 'ICAL',
          icalCalendarId: calendar.id,
        })),
      });
    }

    await tx.propertyIcalCalendar.update({
      where: { id: calendar.id },
      data: {
        lastSyncedAt: new Date(),
        lastSyncSuccessAt: new Date(),
      },
    });
  });

  return {
    propertyId: calendar.propertyId,
    calendarId: calendar.id,
    calendarName: calendar.name,
    synced: ranges.length,
    skipped: false,
  };
}

async function syncLegacyPropertyIcal(propertyId: string, icalUrlIn: string) {
  const ranges = await fetchIcalRanges(icalUrlIn);

  await prisma.$transaction(async (tx) => {
    await tx.blockedDate.deleteMany({
      where: {
        propertyId,
        source: 'ICAL',
        icalCalendarId: null,
      },
    });

    if (ranges.length > 0) {
      await tx.blockedDate.createMany({
        data: ranges.map((range) => ({
          propertyId,
          startDate: range.startDate,
          endDate: range.endDate,
          source: 'ICAL',
        })),
      });
    }
  });

  return {
    propertyId,
    synced: ranges.length,
    skipped: false,
    legacy: true,
  };
}

export async function syncPropertyIcal(propertyId: string) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      icalUrlIn: true,
      icalCalendars: {
        select: { id: true },
      },
    },
  });

  if (!property) {
    throw new Error('Property not found');
  }

  if (property.icalCalendars.length > 0) {
    const calendarResults: Array<{
      propertyId: string;
      calendarId: string;
      calendarName: string;
      synced?: number;
      skipped?: boolean;
      error?: string;
    }> = [];

    for (const calendar of property.icalCalendars) {
      try {
        const result = await syncPropertyIcalCalendar(calendar.id);
        calendarResults.push(result);
      } catch (error) {
        calendarResults.push({
          propertyId,
          calendarId: calendar.id,
          calendarName: 'Unknown',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const synced = calendarResults.reduce((acc, item) => acc + (item.synced ?? 0), 0);

    return {
      propertyId,
      synced,
      skipped: false,
      calendars: calendarResults,
    };
  }

  if (!property.icalUrlIn) {
    return { propertyId, synced: 0, skipped: true, reason: 'No iCal calendars configured' };
  }

  return syncLegacyPropertyIcal(propertyId, property.icalUrlIn);
}

export async function syncAllIcalInputs() {
  const properties = await prisma.property.findMany({
    select: {
      id: true,
      icalUrlIn: true,
      icalCalendars: {
        select: { id: true },
      },
    },
  });

  const results: Array<{ propertyId: string; synced?: number; skipped?: boolean; reason?: string; error?: string }> = [];

  for (const property of properties) {
    const hasCalendars = property.icalCalendars.length > 0;
    const hasLegacy = Boolean(property.icalUrlIn);

    if (!hasCalendars && !hasLegacy) {
      continue;
    }

    try {
      const result = await syncPropertyIcal(property.id);
      results.push(result);
    } catch (error) {
      results.push({
        propertyId: property.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}
