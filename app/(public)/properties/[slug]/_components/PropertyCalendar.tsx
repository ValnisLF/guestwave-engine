'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function PropertyCalendar({
  unavailableDates,
}: {
  unavailableDates: Array<{ startDate: Date; endDate: Date }>;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedStart, setSelectedStart] = useState<Date | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<Date | null>(null);

  const toLocalDayTimestamp = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  };

  const toDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const emitSelectedRange = (start: Date | null, end: Date | null) => {
    if (typeof window === 'undefined') return;

    window.dispatchEvent(
      new CustomEvent('guestwave:date-range-selected', {
        detail: {
          startDate: start ? toDateKey(start) : '',
          endDate: end ? toDateKey(end) : '',
        },
      })
    );
  };

  const isDateUnavailable = (date: Date): boolean => {
    return unavailableDates.some((range) => {
      const dateTime = toLocalDayTimestamp(date);
      const rangeStart = toLocalDayTimestamp(range.startDate);
      const rangeEnd = toLocalDayTimestamp(range.endDate);

      return (
        dateTime >= rangeStart &&
        dateTime < rangeEnd
      );
    });
  };

  const isPastDate = (date: Date): boolean => {
    const today = new Date();
    return toLocalDayTimestamp(date) < toLocalDayTimestamp(today);
  };

  const isDateSelected = (date: Date): boolean => {
    if (!selectedStart || !selectedEnd) return false;
    return (
      date.getTime() >= selectedStart.getTime() &&
      date.getTime() <= selectedEnd.getTime()
    );
  };

  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="p-2 text-sm text-gray-300"></div>
      );
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        day
      );
      const dateKey = toDateKey(date);
      const unavailable = isDateUnavailable(date);
      const pastDate = isPastDate(date);
      const selected = isDateSelected(date);
      const disabled = unavailable || pastDate;

      days.push(
        <Button
          key={day}
          data-date={dateKey}
          aria-label={dateKey}
          variant="ghost"
          size="sm"
          onClick={() => {
            if (!selectedStart || (selectedStart && selectedEnd)) {
              setSelectedStart(date);
              setSelectedEnd(null);
              emitSelectedRange(date, null);
            } else if (date > selectedStart) {
              setSelectedEnd(date);
              emitSelectedRange(selectedStart, date);
            } else {
              setSelectedStart(date);
              setSelectedEnd(null);
              emitSelectedRange(date, null);
            }
          }}
          disabled={disabled}
          className={`p-2 rounded text-sm font-medium transition-colors ${
            disabled
              ? 'bg-red-100 text-red-500 cursor-not-allowed'
              : selected
                ? 'bg-blue-600 text-white'
                : 'hover:bg-blue-100'
          }`}
        >
          {day}
        </Button>
      );
    }

    return days;
  };

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const monthYear = currentDate.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-4 text-slate-900">
      {/* Calendar */}
      <Card>
        <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-slate-900">{monthYear}</h3>
          <div className="flex gap-2">
            <Button
              onClick={handlePrevMonth}
              aria-label="Previous month"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-700"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              onClick={handleNextMonth}
              aria-label="Next month"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-700"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-slate-600 p-2">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {renderCalendarDays()}
        </div>
        </CardContent>
      </Card>

      {/* Selected dates summary */}
      {selectedStart && (
        <div className="text-sm text-slate-600">
          <p>
            Check-in: {selectedStart.toLocaleDateString()}
          </p>
          {selectedEnd && (
            <p>
              Check-out: {selectedEnd.toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-2 text-slate-700">
          <div className="w-4 h-4 bg-blue-100 rounded"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2 text-slate-700">
          <div className="w-4 h-4 bg-red-100 rounded"></div>
          <span>Unavailable</span>
        </div>
      </div>
    </div>
  );
}
