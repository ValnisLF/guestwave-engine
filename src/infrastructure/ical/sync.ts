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

export async function syncPropertyIcal(propertyId: string) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, icalUrlIn: true },
  });

  if (!property) {
    throw new Error('Property not found');
  }

  if (!property.icalUrlIn) {
    return { propertyId, synced: 0, skipped: true, reason: 'No icalUrlIn configured' };
  }

  const response = await fetch(property.icalUrlIn, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Unable to fetch iCal: ${response.status}`);
  }

  const icsRaw = await response.text();
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

  await prisma.$transaction(async (tx) => {
    await tx.blockedDate.deleteMany({
      where: {
        propertyId,
        source: 'ICAL',
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

  return { propertyId, synced: ranges.length, skipped: false };
}

export async function syncAllIcalInputs() {
  const properties = await prisma.property.findMany({
    where: { icalUrlIn: { not: null } },
    select: { id: true },
  });

  const results: Array<{ propertyId: string; synced?: number; skipped?: boolean; reason?: string; error?: string }> = [];

  for (const property of properties) {
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
