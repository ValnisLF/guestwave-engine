'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import {
  createManualBlockedDate,
  createPropertyInvite,
  createPropertyIcalCalendar,
  createSeasonRate,
  deleteBookingAndRefund,
  deletePropertyIcalCalendar,
  deleteSeasonRate,
  syncPropertyCalendar,
  syncPropertyIcalCalendarAction,
  testPropertySmtpConnection,
  updateProperty,
  updatePropertyAutoSyncSettings,
  updatePropertyIcalCalendar,
  updatePropertySmtpSettings,
} from '@/app/admin/properties/_actions';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AvailabilityCalendarView } from './AvailabilityCalendarView';

type SeasonRateView = {
  id: string;
  startDate: string;
  endDate: string;
  priceMultiplier: number;
  fixedPrice: number | null;
  paymentMode: 'FULL' | 'DEPOSIT' | null;
  depositPercentage: number | null;
};

type BookingView = {
  id: string;
  status: string;
  checkIn: string;
  checkOut: string;
  stripeSessionId: string;
  guestEmail: string | null;
  totalPrice: number;
  depositAmount: number;
  createdAt: string;
};

type PropertyView = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrls: string[];
  amenities: Record<string, boolean>;
  basePrice: number;
  cleaningFee: number;
  minimumStay: number;
  depositPercentage: number;
  autoSyncEnabled: boolean;
  autoSyncIntervalMinutes: number;
  autoSyncLastRunAt: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPassword: string | null;
  smtpFromEmail: string | null;
  seasonRates: SeasonRateView[];
  bookings: BookingView[];
  icalCalendars: {
    id: string;
    name: string;
    icalUrl: string;
    lastSyncedAt: string | null;
    lastSyncSuccessAt: string | null;
  }[];
  blockedDates: {
    id: string;
    startDate: string;
    endDate: string;
    source: 'BOOKING' | 'ICAL' | 'MANUAL';
    createdByEmail: string | null;
    icalCalendarName: string | null;
    bookingId: string | null;
  }[];
  ownerEmails: string[];
};

type SectionKey =
  | 'overview'
  | 'datos'
  | 'calendario'
  | 'tarifas'
  | 'reservas'
  | 'fotos'
  | 'contenidos'
  | 'ia'
  | 'ajuste';

const AMENITIES_CATALOG = [
  'wifi',
  'airConditioning',
  'heating',
  'kitchen',
  'washer',
  'dryer',
  'tv',
  'workspace',
  'parking',
  'pool',
  'hotTub',
  'bbq',
  'patio',
  'garden',
  'fireplace',
  'beachAccess',
  'petsAllowed',
  'selfCheckIn',
  'smokeAlarm',
  'firstAidKit',
] as const;

export function OwnerPropertyWorkspace({
  property,
  section,
}: {
  property: PropertyView;
  section: SectionKey;
}) {
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [setupDraft, setSetupDraft] = useState({
    name: property.name,
    slug: property.slug,
    description: property.description ?? '',
    imageUrlsText: property.imageUrls.join('\n'),
    basePrice: String(property.basePrice),
    cleaningFee: String(property.cleaningFee),
    minimumStay: String(property.minimumStay),
    depositPercentage: String(property.depositPercentage),
    amenities: { ...property.amenities },
  });

  const [savingSetup, setSavingSetup] = useState(false);

  const [seasonStartDate, setSeasonStartDate] = useState('');
  const [seasonEndDate, setSeasonEndDate] = useState('');
  const [seasonFixedPrice, setSeasonFixedPrice] = useState('');
  const [seasonMultiplier, setSeasonMultiplier] = useState('1');
  const [seasonPaymentMode, setSeasonPaymentMode] = useState<'FULL' | 'DEPOSIT'>('DEPOSIT');
  const [seasonDepositPercentage, setSeasonDepositPercentage] = useState('30');
  const [savingSeason, setSavingSeason] = useState(false);

  const [syncing, setSyncing] = useState(false);
  const [savingAutoSync, setSavingAutoSync] = useState(false);
  const [autoSyncInterval, setAutoSyncInterval] = useState(String(property.autoSyncIntervalMinutes));
  const [newCalendarName, setNewCalendarName] = useState('');
  const [newCalendarUrl, setNewCalendarUrl] = useState('');
  const [savingCalendar, setSavingCalendar] = useState(false);
  const [editingCalendarId, setEditingCalendarId] = useState<string | null>(null);
  const [editCalendarName, setEditCalendarName] = useState('');
  const [editCalendarUrl, setEditCalendarUrl] = useState('');
  const [savingCalendarEdit, setSavingCalendarEdit] = useState(false);

  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [refundingBookingId, setRefundingBookingId] = useState<string | null>(null);
  const [bookingPendingRefund, setBookingPendingRefund] = useState<BookingView | null>(null);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [smtpConnectionTested, setSmtpConnectionTested] = useState(false);

  const [manualBlockStartDate, setManualBlockStartDate] = useState('');
  const [manualBlockEndDate, setManualBlockEndDate] = useState('');
  const [savingManualBlock, setSavingManualBlock] = useState(false);

  type SmtpFormValues = {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    smtpFromEmail: string;
    testToEmail: string;
  };

  const smtpForm = useForm<SmtpFormValues>({
    defaultValues: {
      smtpHost: property.smtpHost ?? '',
      smtpPort: property.smtpPort ?? 587,
      smtpUser: property.smtpUser ?? '',
      smtpPassword: '',
      smtpFromEmail: property.smtpFromEmail ?? '',
      testToEmail: '',
    },
  });

  const smtpDirty = smtpForm.formState.isDirty;

  const toDisplayName = (email: string | null | undefined): string => {
    if (!email) return 'Propietario';

    const localPart = email.split('@')[0] ?? email;
    return localPart
      .split(/[._-]+/)
      .filter(Boolean)
      .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
      .join(' ');
  };

  const occupiedRanges = useMemo(
    () =>
      property.blockedDates.map((blockedDate) => {
        if (blockedDate.source === 'BOOKING') {
          return {
            id: blockedDate.id,
            startDate: blockedDate.startDate,
            endDate: blockedDate.endDate,
            source: 'BOOKING' as const,
            label: 'Directa',
          };
        }

        if (blockedDate.source === 'ICAL') {
          return {
            id: blockedDate.id,
            startDate: blockedDate.startDate,
            endDate: blockedDate.endDate,
            source: 'ICAL' as const,
            label: blockedDate.icalCalendarName ? blockedDate.icalCalendarName : 'iCal',
          };
        }

        return {
          id: blockedDate.id,
          startDate: blockedDate.startDate,
          endDate: blockedDate.endDate,
          source: 'MANUAL' as const,
          label: `Manual: ${toDisplayName(blockedDate.createdByEmail ?? property.ownerEmails[0])}`,
        };
      }),
    [property.blockedDates, property.ownerEmails]
  );

  const parseImageUrls = (raw: string) =>
    raw
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);

  const isValidIcalUrl = (value: string) => {
    try {
      const url = new URL(value.trim());
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const onSaveSetup = async () => {
    setSavingSetup(true);
    setError(null);
    setSuccess(null);

    const result = await updateProperty(property.id, {
      name: setupDraft.name.trim(),
      slug: setupDraft.slug.trim(),
      description: setupDraft.description.trim() || null,
      imageUrls: parseImageUrls(setupDraft.imageUrlsText),
      basePrice: Number(setupDraft.basePrice),
      cleaningFee: Number(setupDraft.cleaningFee),
      minimumStay: Number(setupDraft.minimumStay),
      depositPercentage: Number(setupDraft.depositPercentage),
      amenities: setupDraft.amenities,
    });

    setSavingSetup(false);

    if (!result.success) {
      setError(result.error ?? 'Error updating property setup');
      return;
    }

    setSuccess('Property setup updated');
    router.refresh();
  };

  const onCreateSeasonRate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingSeason(true);
    setError(null);
    setSuccess(null);

    const result = await createSeasonRate({
      propertyId: property.id,
      startDate: new Date(seasonStartDate),
      endDate: new Date(seasonEndDate),
      fixedPrice: seasonFixedPrice ? Number(seasonFixedPrice) : null,
      priceMultiplier: seasonMultiplier ? Number(seasonMultiplier) : undefined,
      paymentMode: seasonPaymentMode,
      depositPercentage: seasonPaymentMode === 'DEPOSIT' ? Number(seasonDepositPercentage) : null,
    });

    setSavingSeason(false);

    if (!result.success) {
      setError(result.error ?? 'Error creating season rate');
      return;
    }

    setSuccess('Season rate created');
    setSeasonStartDate('');
    setSeasonEndDate('');
    setSeasonFixedPrice('');
    setSeasonMultiplier('1');
    router.refresh();
  };

  const onDeleteSeasonRate = async (seasonRateId: string) => {
    setError(null);
    setSuccess(null);

    const result = await deleteSeasonRate(seasonRateId);
    if (!result.success) {
      setError(result.error ?? 'Error deleting season rate');
      return;
    }

    setSuccess('Season rate deleted');
    router.refresh();
  };

  const onSyncPropertyCalendars = async () => {
    setSyncing(true);
    setError(null);
    setSuccess(null);

    const result = await syncPropertyCalendar(property.id);
    setSyncing(false);

    if (!result.success) {
      setError(result.error ?? 'Error syncing calendars');
      return;
    }

    setSuccess('Property calendars synced');
    router.refresh();
  };

  const onSaveAutoSync = async (enabled: boolean) => {
    const interval = Number(autoSyncInterval);

    if (!Number.isFinite(interval) || interval < 5 || interval > 1440) {
      setError('Auto-sync interval must be between 5 and 1440 minutes');
      return;
    }

    setSavingAutoSync(true);
    setError(null);
    setSuccess(null);

    const result = await updatePropertyAutoSyncSettings({
      propertyId: property.id,
      autoSyncEnabled: enabled,
      autoSyncIntervalMinutes: interval,
    });

    setSavingAutoSync(false);

    if (!result.success) {
      setError(result.error ?? 'Error updating auto-sync settings');
      return;
    }

    setSuccess(enabled ? 'Auto-sync enabled' : 'Auto-sync disabled');
    router.refresh();
  };

  const onAddCalendar = async () => {
    const name = newCalendarName.trim();
    const url = newCalendarUrl.trim();
    if (!name || !url) return;

    setSavingCalendar(true);
    setError(null);
    setSuccess(null);

    const result = await createPropertyIcalCalendar({
      propertyId: property.id,
      name,
      icalUrl: url,
    });

    setSavingCalendar(false);

    if (!result.success) {
      setError(result.error ?? 'Error adding calendar');
      return;
    }

    setNewCalendarName('');
    setNewCalendarUrl('');
    setSuccess('Calendar linked');
    router.refresh();
  };

  const onStartEditCalendar = (calendar: { id: string; name: string; icalUrl: string }) => {
    setEditingCalendarId(calendar.id);
    setEditCalendarName(calendar.name);
    setEditCalendarUrl(calendar.icalUrl);
  };

  const onSaveCalendarEdit = async () => {
    if (!editingCalendarId) return;

    setSavingCalendarEdit(true);
    setError(null);
    setSuccess(null);

    const result = await updatePropertyIcalCalendar({
      calendarId: editingCalendarId,
      name: editCalendarName,
      icalUrl: editCalendarUrl,
    });

    setSavingCalendarEdit(false);

    if (!result.success) {
      setError(result.error ?? 'Error updating calendar');
      return;
    }

    setEditingCalendarId(null);
    setEditCalendarName('');
    setEditCalendarUrl('');
    setSuccess('Calendar updated');
    router.refresh();
  };

  const onSyncSingleCalendar = async (calendarId: string) => {
    setSyncing(true);
    setError(null);
    setSuccess(null);

    const result = await syncPropertyIcalCalendarAction(calendarId);
    setSyncing(false);

    if (!result.success) {
      setError(result.error ?? 'Error syncing calendar');
      return;
    }

    setSuccess('Calendar synced');
    router.refresh();
  };

  const onDeleteSingleCalendar = async (calendarId: string) => {
    setError(null);
    setSuccess(null);

    const result = await deletePropertyIcalCalendar(calendarId);
    if (!result.success) {
      setError(result.error ?? 'Error deleting calendar');
      return;
    }

    setSuccess('Calendar unlinked');
    router.refresh();
  };

  const onCreateManualBlock = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!manualBlockStartDate || !manualBlockEndDate) {
      setError('Selecciona fecha de inicio y fin para el bloqueo manual');
      return;
    }

    setSavingManualBlock(true);
    setError(null);
    setSuccess(null);

    const result = await createManualBlockedDate({
      propertyId: property.id,
      startDate: new Date(manualBlockStartDate),
      endDate: new Date(manualBlockEndDate),
    });

    setSavingManualBlock(false);

    if (!result.success) {
      setError(result.error ?? 'Error creando bloqueo manual');
      return;
    }

    setManualBlockStartDate('');
    setManualBlockEndDate('');
    setSuccess('Bloqueo manual creado');
    router.refresh();
  };

  const onInviteOwner = async (event: React.FormEvent) => {
    event.preventDefault();
    setSendingInvite(true);
    setError(null);
    setSuccess(null);

    const result = await createPropertyInvite({
      propertyId: property.id,
      email: inviteEmail.trim(),
      role: 'OWNER',
    });

    setSendingInvite(false);

    if (!result.success) {
      setError(result.error ?? 'Error sending invite');
      return;
    }

    setInviteEmail('');

    const emailStatus = result.data?.emailStatus as string | undefined;
    const acceptUrl = result.data?.acceptUrl as string | undefined;

    if (emailStatus === 'sent') {
      setSuccess('Invite sent by email successfully');
    } else if (acceptUrl) {
      setSuccess(`Invite created. Email failed. Manual link: ${acceptUrl}`);
    } else {
      setSuccess('Invite created');
    }
  };

  const onTestSmtp = async () => {
    const isValid = await smtpForm.trigger([
      'smtpHost',
      'smtpPort',
      'smtpUser',
      'smtpFromEmail',
    ]);

    if (!isValid) {
      setError('Revisa los campos SMTP antes de enviar el email de prueba');
      return;
    }

    setTestingSmtp(true);
    setError(null);
    setSuccess(null);

    const values = smtpForm.getValues();

    const result = await testPropertySmtpConnection({
      propertyId: property.id,
      smtpHost: values.smtpHost,
      smtpPort: Number(values.smtpPort),
      smtpUser: values.smtpUser,
      smtpPassword: values.smtpPassword,
      smtpFromEmail: values.smtpFromEmail,
      testToEmail: values.testToEmail,
    });

    setTestingSmtp(false);

    if (!result.success) {
      setSmtpConnectionTested(false);
      setError(result.error ?? 'No se pudo completar el test SMTP');
      return;
    }

    setSmtpConnectionTested(true);
    setSuccess(`Email de prueba enviado a ${result.data?.recipient ?? 'destino configurado'}`);
  };

  const onSaveSmtp = async () => {
    const isValid = await smtpForm.trigger([
      'smtpHost',
      'smtpPort',
      'smtpUser',
      'smtpFromEmail',
    ]);

    if (!isValid) {
      setError('Revisa los campos SMTP antes de guardar');
      return;
    }

    if (!smtpConnectionTested) {
      setError('Debes enviar un email de prueba antes de guardar los cambios SMTP');
      return;
    }

    setSavingSmtp(true);
    setError(null);
    setSuccess(null);

    const values = smtpForm.getValues();
    const result = await updatePropertySmtpSettings({
      propertyId: property.id,
      smtpHost: values.smtpHost,
      smtpPort: Number(values.smtpPort),
      smtpUser: values.smtpUser,
      smtpPassword: values.smtpPassword,
      smtpFromEmail: values.smtpFromEmail,
    });

    setSavingSmtp(false);

    if (!result.success) {
      setError(result.error ?? 'No se pudieron guardar los datos SMTP');
      return;
    }

    smtpForm.reset({
      ...values,
      smtpPassword: '',
    });
    setSmtpConnectionTested(false);
    setSuccess('Configuracion SMTP guardada');
    router.refresh();
  };

  const onDeleteBookingAndRefund = async () => {
    if (!bookingPendingRefund) return;

    setRefundingBookingId(bookingPendingRefund.id);
    setError(null);
    setSuccess(null);

    const result = await deleteBookingAndRefund(bookingPendingRefund.id);

    setRefundingBookingId(null);

    if (!result.success) {
      setError(result.error ?? 'Error deleting booking and issuing refund');
      return;
    }

    setBookingPendingRefund(null);
    setSuccess('Reserva eliminada y reembolso emitido correctamente');
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {error ? <Alert variant="destructive">{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}

      {section === 'overview' ? (
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700">Estamos trabajando en ello</p>
          </CardContent>
        </Card>
      ) : null}

      {section === 'datos' ? (
        <Card>
          <CardHeader>
            <CardTitle>Datos de la Propiedad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Nombre"
                value={setupDraft.name}
                onChange={(e) => setSetupDraft((p) => ({ ...p, name: e.target.value }))}
              />
              <Input
                placeholder="Slug"
                value={setupDraft.slug}
                onChange={(e) => setSetupDraft((p) => ({ ...p, slug: e.target.value }))}
              />

              <Textarea
                className="md:col-span-2"
                rows={3}
                placeholder="Descripción"
                value={setupDraft.description}
                onChange={(e) => setSetupDraft((p) => ({ ...p, description: e.target.value }))}
              />

              <Textarea
                className="md:col-span-2"
                rows={3}
                placeholder="URLs de fotos (coma o salto de línea)"
                value={setupDraft.imageUrlsText}
                onChange={(e) => setSetupDraft((p) => ({ ...p, imageUrlsText: e.target.value }))}
              />

              <Input
                type="number"
                min={1}
                step="0.01"
                placeholder="Precio base"
                value={setupDraft.basePrice}
                onChange={(e) => setSetupDraft((p) => ({ ...p, basePrice: e.target.value }))}
              />
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Limpieza"
                value={setupDraft.cleaningFee}
                onChange={(e) => setSetupDraft((p) => ({ ...p, cleaningFee: e.target.value }))}
              />

              <Input
                type="number"
                min={1}
                step={1}
                placeholder="Estancia mínima"
                value={setupDraft.minimumStay}
                onChange={(e) => setSetupDraft((p) => ({ ...p, minimumStay: e.target.value }))}
              />
              <Input
                type="number"
                min={0}
                max={100}
                step={1}
                placeholder="Depósito %"
                value={setupDraft.depositPercentage}
                onChange={(e) =>
                  setSetupDraft((p) => ({ ...p, depositPercentage: e.target.value }))
                }
              />

              <div className="md:col-span-2">
                <div className="mb-2 text-sm font-medium text-slate-700">Amenities</div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {AMENITIES_CATALOG.map((amenityKey) => (
                    <label key={amenityKey} className="flex items-center gap-2 text-sm text-slate-800">
                      <Checkbox
                        checked={Boolean(setupDraft.amenities[amenityKey])}
                        onChange={() =>
                          setSetupDraft((p) => ({
                            ...p,
                            amenities: {
                              ...p.amenities,
                              [amenityKey]: !p.amenities[amenityKey],
                            },
                          }))
                        }
                      />
                      <span>{amenityKey}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <Button className="mt-4" onClick={onSaveSetup} disabled={savingSetup}>
              {savingSetup ? 'Guardando...' : 'Guardar setup'}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {section === 'calendario' ? (
        <Card>
          <CardHeader>
            <CardTitle>Calendario y Sincronizacion</CardTitle>
          </CardHeader>
          <CardContent>
            <AvailabilityCalendarView occupiedRanges={occupiedRanges} />

            <div className="mt-4 rounded border border-slate-200 p-3">
              <div className="text-sm font-semibold">Bloqueo manual</div>
              <form onSubmit={onCreateManualBlock} className="mt-2 grid gap-2 md:grid-cols-3">
                <Input
                  type="date"
                  value={manualBlockStartDate}
                  onChange={(e) => setManualBlockStartDate(e.target.value)}
                  required
                />
                <Input
                  type="date"
                  value={manualBlockEndDate}
                  onChange={(e) => setManualBlockEndDate(e.target.value)}
                  required
                />
                <Button type="submit" disabled={savingManualBlock}>
                  {savingManualBlock ? 'Guardando...' : 'Bloquear fechas'}
                </Button>
              </form>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" onClick={onSyncPropertyCalendars} disabled={syncing}>
                {syncing ? 'Sincronizando...' : 'Sincronizar todos los calendarios'}
              </Button>
            </div>

            <div className="mt-4 rounded border border-slate-200 p-3">
              <div className="text-sm font-semibold">Auto-sync</div>
              <div className="mt-2 flex items-end gap-2">
                <label className="text-xs text-slate-700">
                  Intervalo (min)
                  <Input
                    className="mt-1 h-8 w-28"
                    type="number"
                    min={5}
                    max={1440}
                    value={autoSyncInterval}
                    onChange={(e) => setAutoSyncInterval(e.target.value)}
                  />
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={savingAutoSync}
                  onClick={() => onSaveAutoSync(true)}
                >
                  Activar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={savingAutoSync}
                  onClick={() => onSaveAutoSync(false)}
                >
                  Desactivar
                </Button>
              </div>
              <div className="mt-2 text-xs text-slate-600">
                Estado: {property.autoSyncEnabled ? 'Activo' : 'Inactivo'} · cada {property.autoSyncIntervalMinutes} min
                {property.autoSyncLastRunAt
                  ? ` · ultima ejecucion: ${new Date(property.autoSyncLastRunAt).toLocaleString()}`
                  : ''}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {property.icalCalendars.map((calendar) => (
                <div key={calendar.id} className="rounded border border-slate-200 p-3">
                  {editingCalendarId === calendar.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editCalendarName}
                        onChange={(e) => setEditCalendarName(e.target.value)}
                      />
                      <Input
                        value={editCalendarUrl}
                        onChange={(e) => setEditCalendarUrl(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={onSaveCalendarEdit}
                          disabled={savingCalendarEdit || !isValidIcalUrl(editCalendarUrl)}
                        >
                          Guardar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingCalendarId(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-medium">{calendar.name}</div>
                      <div className="text-xs text-slate-600 break-all">{calendar.icalUrl}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Ultimo intento:{' '}
                        {calendar.lastSyncedAt
                          ? new Date(calendar.lastSyncedAt).toLocaleString('es-ES')
                          : 'Nunca'}
                      </div>
                      <div className="text-xs text-slate-500">
                        Ultimo exito:{' '}
                        {calendar.lastSyncSuccessAt
                          ? new Date(calendar.lastSyncSuccessAt).toLocaleString('es-ES')
                          : 'Nunca'}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => onSyncSingleCalendar(calendar.id)}>
                          Sync
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onStartEditCalendar(calendar)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => onDeleteSingleCalendar(calendar.id)}>
                          Desvincular
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-3">
              <Input
                className="md:col-span-1"
                placeholder="Nombre calendario"
                value={newCalendarName}
                onChange={(e) => setNewCalendarName(e.target.value)}
              />
              <Input
                className="md:col-span-2"
                placeholder="https://.../calendar.ics"
                value={newCalendarUrl}
                onChange={(e) => setNewCalendarUrl(e.target.value)}
              />
            </div>
            <Button
              className="mt-2"
              onClick={onAddCalendar}
              disabled={savingCalendar || !isValidIcalUrl(newCalendarUrl)}
            >
              {savingCalendar ? 'Anadiendo...' : 'Anadir calendario'}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {section === 'tarifas' ? (
        <Card>
          <CardHeader>
            <CardTitle>Tarifas por Temporada</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCreateSeasonRate} className="grid gap-3 md:grid-cols-3">
              <Input type="date" value={seasonStartDate} onChange={(e) => setSeasonStartDate(e.target.value)} required />
              <Input type="date" value={seasonEndDate} onChange={(e) => setSeasonEndDate(e.target.value)} required />
              <Input
                type="number"
                min={0.1}
                step="0.01"
                placeholder="Multiplicador"
                value={seasonMultiplier}
                onChange={(e) => setSeasonMultiplier(e.target.value)}
              />
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Precio fijo"
                value={seasonFixedPrice}
                onChange={(e) => setSeasonFixedPrice(e.target.value)}
              />
              <Select
                value={seasonPaymentMode}
                onChange={(e) => setSeasonPaymentMode(e.target.value as 'FULL' | 'DEPOSIT')}
              >
                <option value="DEPOSIT">Pago con deposito</option>
                <option value="FULL">Pago 100%</option>
              </Select>
              <Input
                type="number"
                min={0}
                max={100}
                step={1}
                disabled={seasonPaymentMode === 'FULL'}
                placeholder="Deposito %"
                value={seasonDepositPercentage}
                onChange={(e) => setSeasonDepositPercentage(e.target.value)}
              />
              <Button type="submit" className="md:col-span-3" disabled={savingSeason}>
                {savingSeason ? 'Guardando...' : 'Crear temporada'}
              </Button>
            </form>

            <div className="mt-4 space-y-2">
              {property.seasonRates.length === 0 ? (
                <p className="text-sm text-slate-500">Sin temporadas configuradas</p>
              ) : (
                property.seasonRates.map((rate) => (
                  <div key={rate.id} className="flex items-center justify-between rounded border border-slate-200 p-2 text-sm">
                    <span>
                      {new Date(rate.startDate).toLocaleDateString()} - {new Date(rate.endDate).toLocaleDateString()} · mult: {rate.priceMultiplier} · fixed: {rate.fixedPrice ?? '-'}
                    </span>
                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => onDeleteSeasonRate(rate.id)}>
                      Eliminar
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {section === 'reservas' ? (
        <Card>
          <CardHeader>
            <CardTitle>Reservas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-600">
                    <th className="py-2 pr-3">ID</th>
                    <th className="py-2 pr-3">Estado</th>
                    <th className="py-2 pr-3">Check-in</th>
                    <th className="py-2 pr-3">Check-out</th>
                    <th className="py-2 pr-3">Huesped</th>
                    <th className="py-2 pr-3">Total</th>
                    <th className="py-2 pr-3">Deposito</th>
                    <th className="py-2 pr-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {property.bookings.length === 0 ? (
                    <tr>
                      <td className="py-3 text-slate-500" colSpan={8}>
                        No hay reservas para esta propiedad.
                      </td>
                    </tr>
                  ) : (
                    property.bookings.map((booking) => (
                      <tr key={booking.id} className="border-b border-slate-100">
                        <td className="py-2 pr-3">{booking.id.slice(0, 8)}...</td>
                        <td className="py-2 pr-3">{booking.status}</td>
                        <td className="py-2 pr-3">{new Date(booking.checkIn).toLocaleDateString()}</td>
                        <td className="py-2 pr-3">{new Date(booking.checkOut).toLocaleDateString()}</td>
                        <td className="py-2 pr-3">{booking.guestEmail ?? '-'}</td>
                        <td className="py-2 pr-3">{booking.totalPrice.toFixed(2)} EUR</td>
                        <td className="py-2 pr-3">{booking.depositAmount.toFixed(2)} EUR</td>
                        <td className="py-2 pr-3">
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={refundingBookingId === booking.id || !booking.stripeSessionId}
                            onClick={() => setBookingPendingRefund(booking)}
                          >
                            {bookingPendingRefund?.id === booking.id
                              ? 'Pendiente de confirmacion'
                              : 'Eliminar y emitir reembolso'}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {section === 'fotos' ? (
        <Card>
          <CardHeader>
            <CardTitle>Fotos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700">Estamos trabajando en ello</p>
          </CardContent>
        </Card>
      ) : null}

      {section === 'contenidos' ? (
        <Card>
          <CardHeader>
            <CardTitle>Contenidos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700">Estamos trabajando en ello</p>
          </CardContent>
        </Card>
      ) : null}

      {section === 'ia' ? (
        <Card>
          <CardHeader>
            <CardTitle>IA</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700">Estamos trabajando en ello</p>
          </CardContent>
        </Card>
      ) : null}

      {section === 'ajuste' ? (
        <Card>
          <CardHeader>
            <CardTitle>Ajuste · SMTP e Invitar colaboradores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="rounded border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Configuracion SMTP de la propiedad</h3>
                <p className="mt-1 text-xs text-slate-600">
                  Envia un email de prueba antes de guardar. Si dejas la contrasena vacia, se mantiene la actual.
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs text-slate-700">SMTP Host</span>
                    <Input
                      placeholder="smtp.tu-proveedor.com"
                      {...smtpForm.register('smtpHost', {
                        required: 'SMTP Host es obligatorio',
                        onChange: () => setSmtpConnectionTested(false),
                      })}
                    />
                    {smtpForm.formState.errors.smtpHost ? (
                      <span className="text-xs text-red-600">{smtpForm.formState.errors.smtpHost.message}</span>
                    ) : null}
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs text-slate-700">SMTP Port</span>
                    <Input
                      type="number"
                      min={1}
                      max={65535}
                      {...smtpForm.register('smtpPort', {
                        valueAsNumber: true,
                        required: 'SMTP Port es obligatorio',
                        min: { value: 1, message: 'Puerto invalido' },
                        max: { value: 65535, message: 'Puerto invalido' },
                        onChange: () => setSmtpConnectionTested(false),
                      })}
                    />
                    {smtpForm.formState.errors.smtpPort ? (
                      <span className="text-xs text-red-600">{smtpForm.formState.errors.smtpPort.message}</span>
                    ) : null}
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs text-slate-700">SMTP User</span>
                    <Input
                      placeholder="usuario-smtp"
                      {...smtpForm.register('smtpUser', {
                        required: 'SMTP User es obligatorio',
                        onChange: () => setSmtpConnectionTested(false),
                      })}
                    />
                    {smtpForm.formState.errors.smtpUser ? (
                      <span className="text-xs text-red-600">{smtpForm.formState.errors.smtpUser.message}</span>
                    ) : null}
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs text-slate-700">SMTP Password (encriptada en BD)</span>
                    <Input
                      type="password"
                      placeholder="********"
                      {...smtpForm.register('smtpPassword', {
                        onChange: () => setSmtpConnectionTested(false),
                      })}
                    />
                  </label>

                  <label className="space-y-1 md:col-span-2">
                    <span className="text-xs text-slate-700">Email remitente (From)</span>
                    <Input
                      type="email"
                      placeholder="reservas@tu-dominio.com"
                      {...smtpForm.register('smtpFromEmail', {
                        required: 'Email remitente obligatorio',
                        pattern: {
                          value: /^\S+@\S+\.\S+$/,
                          message: 'Email remitente invalido',
                        },
                        onChange: () => setSmtpConnectionTested(false),
                      })}
                    />
                    {smtpForm.formState.errors.smtpFromEmail ? (
                      <span className="text-xs text-red-600">{smtpForm.formState.errors.smtpFromEmail.message}</span>
                    ) : null}
                  </label>

                  <label className="space-y-1 md:col-span-2">
                    <span className="text-xs text-slate-700">Email de prueba (opcional)</span>
                    <Input
                      type="email"
                      placeholder="owner@example.com"
                      {...smtpForm.register('testToEmail')}
                    />
                    <span className="text-xs text-slate-500">
                      Si lo dejas vacio, se enviara al email del usuario autenticado.
                    </span>
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={onTestSmtp} disabled={testingSmtp}>
                    {testingSmtp ? 'Enviando...' : 'Enviar email de prueba'}
                  </Button>
                  <Button
                    type="button"
                    onClick={onSaveSmtp}
                    disabled={savingSmtp || testingSmtp || !smtpConnectionTested || !smtpDirty}
                  >
                    {savingSmtp ? 'Guardando...' : 'Guardar configuracion SMTP'}
                  </Button>
                </div>

                <p className="mt-2 text-xs text-slate-600">
                  Estado test SMTP: {smtpConnectionTested ? 'Validado en esta sesion' : 'Pendiente'}
                </p>
              </div>

              <div className="rounded border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Invitar colaboradores</h3>
                <form onSubmit={onInviteOwner} className="mt-3 space-y-3">
                  <Input
                    type="email"
                    placeholder="owner@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                  <Select value="OWNER" disabled>
                    <option value="OWNER">OWNER</option>
                  </Select>
                  <Button type="submit" disabled={sendingInvite}>
                    {sendingInvite ? 'Enviando...' : 'Invitar OWNER'}
                  </Button>
                </form>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {bookingPendingRefund ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-rose-200 bg-white p-4 shadow-xl">
            <p className="text-sm font-semibold text-rose-800">Confirmar eliminacion y reembolso</p>
            <p className="mt-2 text-sm text-slate-700">
              Huesped: {bookingPendingRefund.guestEmail ?? 'Sin email'}
            </p>
            <p className="text-sm text-slate-700">
              Importe a reembolsar: {bookingPendingRefund.totalPrice.toFixed(2)} EUR
            </p>
            <p className="mt-2 text-xs text-slate-600">
              Esta accion eliminara la reserva y sus fechas bloqueadas solo si Stripe confirma el reembolso.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBookingPendingRefund(null)}
                disabled={refundingBookingId === bookingPendingRefund.id}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={onDeleteBookingAndRefund}
                disabled={refundingBookingId === bookingPendingRefund.id}
              >
                {refundingBookingId === bookingPendingRefund.id
                  ? 'Procesando...'
                  : 'Confirmar reembolso y eliminar'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
