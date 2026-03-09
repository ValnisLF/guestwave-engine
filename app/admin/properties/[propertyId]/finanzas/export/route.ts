import { NextRequest, NextResponse } from 'next/server';
import { BookingStatus } from '@prisma/client';
import { prisma } from '@infra/prisma';
import { canManagePropertyByEmail, getAuthenticatedAdminEmail } from '@/lib/admin-auth';

type StatusFilter = 'all' | 'pending' | 'paid';

function isValidMonthKey(value: string | null): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}$/.test(value);
}

function getCurrentMonthKey() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getMonthBounds(monthKey: string) {
  const [yearPart, monthPart] = monthKey.split('-');
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1;

  const monthStart = new Date(Date.UTC(year, monthIndex, 1));
  const monthEndExclusive = new Date(Date.UTC(year, monthIndex + 1, 1));

  return { monthStart, monthEndExclusive };
}

function overlapsMonth(start: Date, end: Date, monthStart: Date, monthEndExclusive: Date) {
  return start < monthEndExclusive && end > monthStart;
}

function formatDate(value: Date | null) {
  if (!value) return '';

  const day = String(value.getUTCDate()).padStart(2, '0');
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const year = value.getUTCFullYear();

  return `${day}/${month}/${year}`;
}

function escapeCsvCell(value: string) {
  const sanitized = value.replace(/"/g, '""');
  return `"${sanitized}"`;
}

function normalizeStatusFilter(raw: string | null): StatusFilter {
  if (raw === 'pending' || raw === 'paid') return raw;
  return 'all';
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ propertyId: string }> | { propertyId: string } }
) {
  const resolvedParams =
    context.params instanceof Promise ? await context.params : context.params;
  const propertyId = resolvedParams.propertyId;

  const email = await getAuthenticatedAdminEmail('component');
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allowed = await canManagePropertyByEmail(email, propertyId);
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const monthParam = request.nextUrl.searchParams.get('month');
  const statusFilter = normalizeStatusFilter(request.nextUrl.searchParams.get('status'));
  const monthKey = isValidMonthKey(monthParam) ? monthParam : getCurrentMonthKey();
  const { monthStart, monthEndExclusive } = getMonthBounds(monthKey);

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      slug: true,
      bookings: {
        where: {
          status: BookingStatus.CONFIRMED,
        },
        orderBy: {
          checkIn: 'desc',
        },
        select: {
          bookingCode: true,
          guestEmail: true,
          checkIn: true,
          checkOut: true,
          totalPrice: true,
          depositPaidAt: true,
          finalBalancePaidAt: true,
          isReconciled: true,
        },
      },
    },
  });

  if (!property) {
    return NextResponse.json({ error: 'Property not found' }, { status: 404 });
  }

  const filtered = property.bookings
    .filter((booking) =>
      overlapsMonth(booking.checkIn, booking.checkOut, monthStart, monthEndExclusive)
    )
    .filter((booking) => {
      if (statusFilter === 'pending') return !booking.isReconciled;
      if (statusFilter === 'paid') return booking.isReconciled;
      return true;
    });

  const header = [
    'ID de Reserva',
    'Cliente',
    'Fecha de Entrada',
    'Total',
    'Estado del Deposito',
    'Fecha Deposito',
    'Estado del Resto',
    'Fecha Resto',
    'Conciliado',
  ];

  const rows = filtered.map((booking) => {
    const total = Number(booking.totalPrice).toFixed(2);

    return [
      booking.bookingCode,
      booking.guestEmail ?? 'Sin email',
      formatDate(booking.checkIn),
      total,
      booking.depositPaidAt ? 'Pagado' : 'Pendiente',
      formatDate(booking.depositPaidAt),
      booking.finalBalancePaidAt ? 'Pagado' : 'Pendiente',
      formatDate(booking.finalBalancePaidAt),
      booking.isReconciled ? 'Si' : 'No',
    ];
  });

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(String(cell))).join(','))
    .join('\n');

  const fileName = `finanzas-${property.slug}-${monthKey}-${statusFilter}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}
