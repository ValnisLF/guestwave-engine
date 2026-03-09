import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const propertyFindUniqueMock = vi.fn();

vi.mock('@infra/prisma', () => ({
  prisma: {
    property: {
      findUnique: propertyFindUniqueMock,
    },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const redirectMock = vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
});

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

describe('property finance page integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T12:00:00.000Z'));
  });

  it('renders summary cards and filters table by month and pending status', async () => {
    propertyFindUniqueMock.mockResolvedValueOnce({
      id: 'prop_1',
      name: 'Villa Sol',
      bookings: [
        {
          id: 'booking_1',
          bookingCode: 'EF-2603-A1B2',
          guestEmail: 'guest1@example.com',
          checkIn: new Date('2026-03-05T00:00:00.000Z'),
          checkOut: new Date('2026-03-10T00:00:00.000Z'),
          totalPrice: 500,
          depositAmount: 150,
          depositPaidAt: new Date('2026-03-01T09:00:00.000Z'),
          finalBalancePaidAt: null,
          isReconciled: false,
        },
        {
          id: 'booking_2',
          bookingCode: 'EF-2603-C3D4',
          guestEmail: 'guest2@example.com',
          checkIn: new Date('2026-03-12T00:00:00.000Z'),
          checkOut: new Date('2026-03-18T00:00:00.000Z'),
          totalPrice: 600,
          depositAmount: 200,
          depositPaidAt: new Date('2026-02-25T11:00:00.000Z'),
          finalBalancePaidAt: new Date('2026-03-13T11:00:00.000Z'),
          isReconciled: true,
        },
        {
          id: 'booking_3',
          bookingCode: 'EF-2604-E5F6',
          guestEmail: 'guest3@example.com',
          checkIn: new Date('2026-04-01T00:00:00.000Z'),
          checkOut: new Date('2026-04-03T00:00:00.000Z'),
          totalPrice: 300,
          depositAmount: 90,
          depositPaidAt: null,
          finalBalancePaidAt: null,
          isReconciled: false,
        },
      ],
    });

    const { default: PropertyFinancePage } = await import(
      '@/app/admin/properties/[propertyId]/finanzas/page'
    );

    const page = await PropertyFinancePage({
      params: { propertyId: 'prop_1' },
      searchParams: { month: '2026-03', status: 'pending' },
    });

    const html = renderToStaticMarkup(page);

    expect(html).toContain('Finanzas');
    expect(html).toContain('Reservas y Cobros');

    expect(html).toContain('Mostrando: Pendiente de cobro');

    expect(html).toContain('EF-2603-A1B2');
    expect(html).not.toContain('EF-2603-C3D4');
    expect(html).not.toContain('EF-2604-E5F6');

    expect(html).toContain('35.5%');
    expect(html).toContain('550');
    expect(html).toContain('>2<');
  });

  it('applies month filter to rows when status is all', async () => {
    propertyFindUniqueMock.mockResolvedValueOnce({
      id: 'prop_1',
      name: 'Villa Sol',
      bookings: [
        {
          id: 'booking_1',
          bookingCode: 'EF-2603-A1B2',
          guestEmail: 'guest1@example.com',
          checkIn: new Date('2026-03-05T00:00:00.000Z'),
          checkOut: new Date('2026-03-10T00:00:00.000Z'),
          totalPrice: 500,
          depositAmount: 150,
          depositPaidAt: null,
          finalBalancePaidAt: null,
          isReconciled: false,
        },
        {
          id: 'booking_3',
          bookingCode: 'EF-2604-E5F6',
          guestEmail: 'guest3@example.com',
          checkIn: new Date('2026-04-01T00:00:00.000Z'),
          checkOut: new Date('2026-04-03T00:00:00.000Z'),
          totalPrice: 300,
          depositAmount: 90,
          depositPaidAt: null,
          finalBalancePaidAt: null,
          isReconciled: false,
        },
      ],
    });

    const { default: PropertyFinancePage } = await import(
      '@/app/admin/properties/[propertyId]/finanzas/page'
    );

    const page = await PropertyFinancePage({
      params: Promise.resolve({ propertyId: 'prop_1' }),
      searchParams: Promise.resolve({ month: '2026-04', status: 'all' }),
    });

    const html = renderToStaticMarkup(page);

    expect(html).not.toContain('EF-2603-A1B2');
    expect(html).toContain('EF-2604-E5F6');
    expect(html).toContain('Mostrando: Todos');
  });
});
