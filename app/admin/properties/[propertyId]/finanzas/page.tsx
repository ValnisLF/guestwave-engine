import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { BookingStatus } from '@prisma/client';
import { prisma } from '@infra/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Select } from '@/components/ui/select';
import { reconcileBookingPayment, type ReconcileBookingPaymentType } from '@/app/lib/actions/finance';

type FinancePageProps = {
  params: Promise<{ propertyId: string }> | { propertyId: string };
  searchParams?: Promise<{ month?: string; status?: string }> | { month?: string; status?: string };
};

type FinanceRow = {
  bookingId: string;
  bookingCode: string;
  client: string;
  checkIn: Date;
  total: number;
  depositPaidAt: Date | null;
  finalBalancePaidAt: Date | null;
  isReconciled: boolean;
  nextPaymentType: ReconcileBookingPaymentType | null;
};

const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
});

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('es-ES').format(value);
}

function isInsideMonth(date: Date | null, monthStart: Date, monthEndExclusive: Date) {
  if (!date) return false;
  return date >= monthStart && date < monthEndExclusive;
}

function getMonthBounds(monthKey: string) {
  const [yearPart, monthPart] = monthKey.split('-');
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1;

  const monthStart = new Date(Date.UTC(year, monthIndex, 1));
  const monthEndExclusive = new Date(Date.UTC(year, monthIndex + 1, 1));

  return { monthStart, monthEndExclusive };
}

function getCurrentMonthKey() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function isValidMonthKey(value?: string) {
  return typeof value === 'string' && /^\d{4}-\d{2}$/.test(value);
}

function overlapsMonth(start: Date, end: Date, monthStart: Date, monthEndExclusive: Date) {
  return start < monthEndExclusive && end > monthStart;
}

function getOverlappedDays(start: Date, end: Date, monthStart: Date, monthEndExclusive: Date) {
  const overlapStart = new Date(Math.max(start.getTime(), monthStart.getTime()));
  const overlapEnd = new Date(Math.min(end.getTime(), monthEndExclusive.getTime()));

  if (overlapEnd <= overlapStart) return 0;

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / MS_PER_DAY);
}

function getStatusFilterLabel(value: string) {
  if (value === 'pending') return 'Pendiente de cobro';
  if (value === 'paid') return 'Cobrado';
  return 'Todos';
}

export default async function PropertyFinancePage({ params, searchParams }: FinancePageProps) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const resolvedSearchParams = searchParams instanceof Promise ? await searchParams : searchParams;

  const propertyId = resolvedParams.propertyId;
  const monthKey = isValidMonthKey(resolvedSearchParams?.month)
    ? (resolvedSearchParams?.month as string)
    : getCurrentMonthKey();
  const statusFilter = resolvedSearchParams?.status === 'pending' || resolvedSearchParams?.status === 'paid'
    ? resolvedSearchParams.status
    : 'all';

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      name: true,
      bookings: {
        where: {
          status: BookingStatus.CONFIRMED,
        },
        orderBy: {
          checkIn: 'desc',
        },
        select: {
          id: true,
          bookingCode: true,
          guestEmail: true,
          checkIn: true,
          checkOut: true,
          totalPrice: true,
          depositAmount: true,
          depositPaidAt: true,
          finalBalancePaidAt: true,
          isReconciled: true,
        },
      },
    },
  });

  if (!property) {
    redirect('/admin');
  }

  async function handleReconcile(formData: FormData) {
    'use server';

    const bookingId = String(formData.get('bookingId') ?? '').trim();
    const paymentType = String(formData.get('paymentType') ?? '').trim();

    if (!bookingId || (paymentType !== 'DEPOSIT' && paymentType !== 'FULL')) {
      return;
    }

    await reconcileBookingPayment({
      bookingId,
      paymentType,
    });

    revalidatePath(`/admin/properties/${propertyId}/finanzas`);
  }

  const { monthStart, monthEndExclusive } = getMonthBounds(monthKey);
  const currentMonthBounds = getMonthBounds(getCurrentMonthKey());

  const rows: FinanceRow[] = property.bookings
    .filter((booking) => overlapsMonth(booking.checkIn, booking.checkOut, monthStart, monthEndExclusive))
    .filter((booking) => {
      if (statusFilter === 'pending') return !booking.isReconciled;
      if (statusFilter === 'paid') return booking.isReconciled;
      return true;
    })
    .map((booking) => ({
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      client: booking.guestEmail ?? 'Sin email',
      checkIn: booking.checkIn,
      total: Number(booking.totalPrice),
      depositPaidAt: booking.depositPaidAt,
      finalBalancePaidAt: booking.finalBalancePaidAt,
      isReconciled: booking.isReconciled,
      nextPaymentType: !booking.depositPaidAt ? 'DEPOSIT' : !booking.finalBalancePaidAt ? 'FULL' : null,
    }));

  const totalIngresadoEsteMes = property.bookings.reduce((acc, booking) => {
    let total = acc;

    if (
      isInsideMonth(
        booking.depositPaidAt,
        currentMonthBounds.monthStart,
        currentMonthBounds.monthEndExclusive
      )
    ) {
      total += Number(booking.depositAmount);
    }

    if (
      isInsideMonth(
        booking.finalBalancePaidAt,
        currentMonthBounds.monthStart,
        currentMonthBounds.monthEndExclusive
      )
    ) {
      total += Math.max(0, Number(booking.totalPrice) - Number(booking.depositAmount));
    }

    return total;
  }, 0);

  const pendientesDeCobro = property.bookings.filter((booking) => !booking.isReconciled).length;

  const daysInCurrentMonth =
    (currentMonthBounds.monthEndExclusive.getTime() - currentMonthBounds.monthStart.getTime()) /
    (24 * 60 * 60 * 1000);

  const reservedDaysThisMonth = property.bookings.reduce((acc, booking) => {
    return (
      acc +
      getOverlappedDays(
        booking.checkIn,
        booking.checkOut,
        currentMonthBounds.monthStart,
        currentMonthBounds.monthEndExclusive
      )
    );
  }, 0);

  const occupancyRate = daysInCurrentMonth > 0 ? (reservedDaysThisMonth / daysInCurrentMonth) * 100 : 0;

  const columns: Array<DataTableColumn<FinanceRow>> = [
    {
      id: 'bookingCode',
      header: 'ID de Reserva',
      cell: (row) => <span className="font-medium text-slate-900">{row.bookingCode}</span>,
    },
    {
      id: 'client',
      header: 'Cliente',
      cell: (row) => row.client,
    },
    {
      id: 'checkIn',
      header: 'Fecha de Entrada',
      cell: (row) => formatDate(row.checkIn),
    },
    {
      id: 'total',
      header: 'Total',
      cell: (row) => currencyFormatter.format(row.total),
      cellClassName: 'font-medium text-slate-900',
    },
    {
      id: 'deposit',
      header: 'Estado del Deposito',
      cell: (row) => (
        <span className={row.depositPaidAt ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>
          {row.depositPaidAt ? 'Pagado' : 'Pendiente'}
        </span>
      ),
    },
    {
      id: 'remaining',
      header: 'Estado del Resto',
      cell: (row) => (
        <span
          className={row.finalBalancePaidAt ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}
        >
          {row.finalBalancePaidAt ? 'Pagado' : 'Pendiente'}
        </span>
      ),
    },
    {
      id: 'action',
      header: 'Accion',
      cell: (row) => (
        <form action={handleReconcile}>
          <input type="hidden" name="bookingId" value={row.bookingId} />
          <input type="hidden" name="paymentType" value={row.nextPaymentType ?? ''} />
          <Button type="submit" size="sm" disabled={!row.nextPaymentType}>
            {row.nextPaymentType ? 'Conciliar' : 'Conciliado'}
          </Button>
        </form>
      ),
    },
  ];

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Finanzas</h1>
        <p className="mt-1 text-sm text-slate-600">Control de cobros y conciliacion de reservas para {property.name}.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Ingresado este mes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-900">{currencyFormatter.format(totalIngresadoEsteMes)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pendiente de Cobro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-900">{pendientesDeCobro}</p>
            <p className="text-xs text-slate-500">Reservas confirmadas sin conciliacion completa.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasa de Ocupacion</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-900">{occupancyRate.toFixed(1)}%</p>
            <p className="text-xs text-slate-500">{reservedDaysThisMonth} dias reservados de {daysInCurrentMonth} dias.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle>Reservas y Cobros</CardTitle>
          <form className="grid gap-3 md:grid-cols-[1fr_220px_160px]" method="get">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500" htmlFor="month-filter">
                Mes
              </label>
              <input
                id="month-filter"
                name="month"
                type="month"
                defaultValue={monthKey}
                className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm text-slate-900 shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500" htmlFor="status-filter">
                Estado
              </label>
              <Select id="status-filter" name="status" defaultValue={statusFilter}>
                <option value="all">Todos</option>
                <option value="pending">Pendiente de cobro</option>
                <option value="paid">Cobrado</option>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" variant="outline">Filtrar</Button>
              <Button asChild variant="ghost">
                <a href={`/admin/properties/${propertyId}/finanzas`}>Limpiar</a>
              </Button>
            </div>
          </form>
          <p className="text-xs text-slate-500">Mostrando: {getStatusFilterLabel(statusFilter)} · Mes {monthKey}</p>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={rows} emptyMessage="No hay reservas para los filtros seleccionados." />
        </CardContent>
      </Card>
    </section>
  );
}
