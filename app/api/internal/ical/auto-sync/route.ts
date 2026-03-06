import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@infra/prisma';
import { syncPropertyIcal } from '@infra/ical/sync';

function isAuthorized(request: NextRequest): boolean {
  const configuredToken = process.env.ICAL_AUTO_SYNC_TOKEN;
  const providedToken = request.headers.get('x-ical-auto-sync-token');

  if (configuredToken && providedToken === configuredToken) {
    return true;
  }

  // Vercel Cron can send: Authorization: Bearer <CRON_SECRET>
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // In local development we allow manual testing without token.
  return process.env.NODE_ENV !== 'production';
}

function isDue(lastRunAt: Date | null, intervalMinutes: number, now: Date): boolean {
  if (!lastRunAt) return true;
  const nextRunAt = new Date(lastRunAt.getTime() + intervalMinutes * 60 * 1000);
  return now >= nextRunAt;
}

async function runAutoSync(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  const properties: any[] = await prisma.property.findMany({
    where: {
      autoSyncEnabled: true,
    },
    select: {
      id: true,
      autoSyncIntervalMinutes: true,
      autoSyncLastRunAt: true,
      icalUrlIn: true,
      icalCalendars: {
        select: { id: true },
      },
    },
  } as any);

  const dueProperties = properties.filter((property: any) => {
    const hasCalendars = property.icalCalendars.length > 0 || Boolean(property.icalUrlIn);
    if (!hasCalendars) return false;
    return isDue(property.autoSyncLastRunAt, property.autoSyncIntervalMinutes, now);
  });

  const summary = {
    scanned: properties.length,
    due: dueProperties.length,
    synced: 0,
    failed: 0,
    results: [] as Array<{ propertyId: string; synced?: number; skipped?: boolean; error?: string }>,
  };

  for (const property of dueProperties) {
    // Keep a per-calendar heartbeat so owners can confirm cron attempts are running.
    // This is updated on every due cron execution, independently of sync success/failure.
    await prisma.propertyIcalCalendar.updateMany({
      where: { propertyId: property.id },
      data: { lastSyncedAt: now },
    } as any);

    try {
      const result = await syncPropertyIcal(property.id);

      await prisma.property.update({
        where: { id: property.id },
        data: { autoSyncLastRunAt: now },
      } as any);

      summary.synced += 1;
      summary.results.push({
        propertyId: property.id,
        synced: result.synced,
        skipped: result.skipped,
      });
    } catch (error) {
      summary.failed += 1;
      summary.results.push({
        propertyId: property.id,
        error: error instanceof Error ? error.message : 'Unknown sync error',
      });
    }
  }

  return NextResponse.json(summary);
}

export async function POST(request: NextRequest) {
  return runAutoSync(request);
}

export async function GET(request: NextRequest) {
  return runAutoSync(request);
}
