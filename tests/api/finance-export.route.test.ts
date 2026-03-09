import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAuthenticatedAdminEmailMock = vi.fn();
const canManagePropertyByEmailMock = vi.fn();
const propertyFindUniqueMock = vi.fn();

vi.mock('@/lib/admin-auth', () => ({
  getAuthenticatedAdminEmail: getAuthenticatedAdminEmailMock,
  canManagePropertyByEmail: canManagePropertyByEmailMock,
}));

vi.mock('@infra/prisma', () => ({
  prisma: {
    property: {
      findUnique: propertyFindUniqueMock,
    },
  },
}));

describe('GET /admin/properties/[propertyId]/finanzas/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T12:00:00.000Z'));
  });

  it('returns 401 when user is not authenticated', async () => {
    getAuthenticatedAdminEmailMock.mockResolvedValueOnce(null);

    const { GET } = await import('@/app/admin/properties/[propertyId]/finanzas/export/route');

    const request = {
      nextUrl: {
        searchParams: new URLSearchParams(),
      },
    } as any;

    const response = await GET(request, { params: { propertyId: 'prop_1' } } as any);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 403 when user cannot manage property', async () => {
    getAuthenticatedAdminEmailMock.mockResolvedValueOnce('owner@example.com');
    canManagePropertyByEmailMock.mockResolvedValueOnce(false);

    const { GET } = await import('@/app/admin/properties/[propertyId]/finanzas/export/route');

    const request = {
      nextUrl: {
        searchParams: new URLSearchParams(),
      },
    } as any;

    const response = await GET(request, { params: { propertyId: 'prop_1' } } as any);
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error).toBe('Forbidden');
  });

  it('returns downloadable CSV with active filters, readable dates, and 2-decimal amounts', async () => {
    getAuthenticatedAdminEmailMock.mockResolvedValueOnce('owner@example.com');
    canManagePropertyByEmailMock.mockResolvedValueOnce(true);

    propertyFindUniqueMock.mockResolvedValueOnce({
      slug: 'villa-sol',
      bookings: [
        {
          bookingCode: 'EF-2603-A1B2',
          guestEmail: 'guest1@example.com',
          checkIn: new Date('2026-03-05T00:00:00.000Z'),
          checkOut: new Date('2026-03-10T00:00:00.000Z'),
          totalPrice: 500,
          depositPaidAt: new Date('2026-03-01T10:00:00.000Z'),
          finalBalancePaidAt: null,
          isReconciled: false,
        },
        {
          bookingCode: 'EF-2603-C3D4',
          guestEmail: 'guest2@example.com',
          checkIn: new Date('2026-03-12T00:00:00.000Z'),
          checkOut: new Date('2026-03-18T00:00:00.000Z'),
          totalPrice: 620.5,
          depositPaidAt: new Date('2026-03-02T10:00:00.000Z'),
          finalBalancePaidAt: new Date('2026-03-13T10:00:00.000Z'),
          isReconciled: true,
        },
      ],
    });

    const { GET } = await import('@/app/admin/properties/[propertyId]/finanzas/export/route');

    const request = {
      nextUrl: {
        searchParams: new URLSearchParams('month=2026-03&status=pending'),
      },
    } as any;

    const response = await GET(request, { params: { propertyId: 'prop_1' } } as any);
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/csv');
    expect(response.headers.get('content-disposition')).toContain(
      'attachment; filename="finanzas-villa-sol-2026-03-pending.csv"'
    );

    expect(csv).toContain('"ID de Reserva","Cliente","Fecha de Entrada","Total"');
    expect(csv).toContain('"EF-2603-A1B2","guest1@example.com","05/03/2026","500.00"');
    expect(csv).not.toContain('EF-2603-C3D4');
    expect(csv).toContain('"Pagado","01/03/2026","Pendiente","","No"');
  });
});
