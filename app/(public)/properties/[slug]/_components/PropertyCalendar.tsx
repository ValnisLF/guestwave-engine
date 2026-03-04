'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function PropertyCalendar({
  unavailableDates,
}: {
  unavailableDates: Array<{ startDate: Date; endDate: Date }>;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedStart, setSelectedStart] = useState<Date | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<Date | null>(null);

  const isDateUnavailable = (date: Date): boolean => {
    return unavailableDates.some((range) => {
      const dateTime = date.getTime();
      return (
        dateTime >= range.startDate.getTime() &&
        dateTime <= range.endDate.getTime()
      );
    });
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
      const unavailable = isDateUnavailable(date);
      const selected = isDateSelected(date);

      days.push(
        <button
          key={day}
          onClick={() => {
            if (!selectedStart || (selectedStart && selectedEnd)) {
              setSelectedStart(date);
              setSelectedEnd(null);
            } else if (date > selectedStart) {
              setSelectedEnd(date);
            } else {
              setSelectedStart(date);
              setSelectedEnd(null);
            }
          }}
          disabled={unavailable}
          className={`p-2 rounded text-sm font-medium transition-colors ${
            unavailable
              ? 'bg-red-100 text-red-500 cursor-not-allowed'
              : selected
                ? 'bg-blue-600 text-white'
                : 'hover:bg-blue-100'
          }`}
        >
          {day}
        </button>
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
    <div className="space-y-4">
      {/* Calendar */}
      <div className="border rounded-lg p-4 bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-900">{monthYear}</h3>
          <div className="flex gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-gray-600 p-2">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {renderCalendarDays()}
        </div>
      </div>

      {/* Selected dates summary */}
      {selectedStart && (
        <div className="text-sm text-gray-600">
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
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 rounded"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 rounded"></div>
          <span>Unavailable</span>
        </div>
      </div>
    </div>
  );
}
