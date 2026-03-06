'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

type OccupiedRange = {
  id: string;
  startDate: string;
  endDate: string;
  label: string;
  source: 'BOOKING' | 'ICAL' | 'MANUAL';
};

const WEEK_DAYS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

function toStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startsBefore(dateA: Date, dateB: Date): boolean {
  return toStartOfDay(dateA).getTime() < toStartOfDay(dateB).getTime();
}

function dateInHalfOpenRange(day: Date, rangeStart: Date, rangeEnd: Date): boolean {
  const dayTs = toStartOfDay(day).getTime();
  const startTs = toStartOfDay(rangeStart).getTime();
  const endTs = toStartOfDay(rangeEnd).getTime();
  return dayTs >= startTs && dayTs < endTs;
}

function monthBounds(cursor: Date): { monthStart: Date; monthEnd: Date } {
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  return { monthStart, monthEnd };
}

function sourceBadgeClass(source: OccupiedRange['source']): string {
  if (source === 'BOOKING') return 'bg-blue-100 text-blue-800 border-blue-200';
  if (source === 'ICAL') return 'bg-violet-100 text-violet-800 border-violet-200';
  return 'bg-amber-100 text-amber-800 border-amber-200';
}

export function AvailabilityCalendarView({ occupiedRanges }: { occupiedRanges: OccupiedRange[] }) {
  const [cursor, setCursor] = useState(() => new Date());

  const normalizedRanges = useMemo(
    () =>
      occupiedRanges
        .map((range) => ({
          ...range,
          start: new Date(range.startDate),
          end: new Date(range.endDate),
        }))
        .filter((range) => range.start < range.end)
        .sort((a, b) => a.start.getTime() - b.start.getTime()),
    [occupiedRanges]
  );

  const { monthStart, monthEnd } = monthBounds(cursor);

  const monthRanges = normalizedRanges.filter((range) => {
    return startsBefore(range.start, monthEnd) && startsBefore(monthStart, range.end);
  });

  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const firstDayOffset = monthStart.getDay();

  const monthTitle = cursor.toLocaleString('es-ES', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold capitalize text-slate-900">{monthTitle}</h3>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            aria-label="Mes siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-600">
        {WEEK_DAYS.map((day) => (
          <div key={day} className="rounded bg-slate-100 py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOffset }).map((_, idx) => (
          <div key={`empty-${idx}`} className="h-16 rounded border border-transparent bg-transparent" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const dayNum = idx + 1;
          const date = new Date(cursor.getFullYear(), cursor.getMonth(), dayNum);
          const overlaps = monthRanges.filter((range) => dateInHalfOpenRange(date, range.start, range.end));
          const occupied = overlaps.length > 0;

          return (
            <div
              key={toDateKey(date)}
              className={`h-16 rounded border p-1 ${
                occupied
                  ? 'border-red-300 bg-red-50 text-red-900'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-900'
              }`}
              title={
                occupied
                  ? `Ocupado por: ${overlaps.map((overlap) => overlap.label).join(', ')}`
                  : 'Libre'
              }
            >
              <div className="text-sm font-semibold">{dayNum}</div>
              <div className="mt-1 text-[10px]">
                {occupied ? (overlaps.length > 1 ? `${overlaps.length} reservas` : 'Ocupada') : 'Libre'}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-slate-700">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded border border-emerald-300 bg-emerald-100" />
          <span>Libre</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded border border-red-300 bg-red-100" />
          <span>Ocupada</span>
        </div>
      </div>

      <div className="rounded border border-slate-200">
        <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
          Bloques ocupados en este mes
        </div>
        {monthRanges.length === 0 ? (
          <p className="px-3 py-3 text-sm text-slate-600">No hay bloques ocupados en este mes.</p>
        ) : (
          <div className="space-y-2 px-3 py-3">
            {monthRanges.map((range) => (
              <div key={range.id} className="rounded border border-slate-200 p-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${sourceBadgeClass(range.source)}`}>
                    {range.label}
                  </span>
                  <span className="text-slate-700">
                    Inicio: {range.start.toLocaleDateString('es-ES')} · Fin: {range.end.toLocaleDateString('es-ES')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
