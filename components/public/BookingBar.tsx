'use client';

import Link from 'next/link';
import { useState } from 'react';

type BookingBarProps = {
  slug: string;
};

export function BookingBar({ slug }: Readonly<BookingBarProps>) {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');

  const reservasHref = {
    pathname: `/properties/${slug}/reservas`,
    query: {
      ...(checkIn ? { checkIn } : {}),
      ...(checkOut ? { checkOut } : {}),
    },
  };

  return (
    <div className="relative z-30 mx-auto -mt-16 w-full max-w-5xl px-4">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl md:flex-nowrap">
        <div className="min-w-[180px] flex-1">
          <label htmlFor="booking-checkin" className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Check-in</label>
          <input
            id="booking-checkin"
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </div>

        <div className="min-w-[180px] flex-1">
          <label htmlFor="booking-checkout" className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Check-out</label>
          <input
            id="booking-checkout"
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </div>

        <Link
          href={reservasHref}
          className="w-full rounded-lg bg-[color:var(--primary-color)] px-6 py-3 text-center text-sm font-semibold text-white md:w-auto"
        >
          Disponibilidad
        </Link>
      </div>
    </div>
  );
}
