'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createProperty,
  createPropertyIcalCalendar,
  createSeasonRate,
  deleteProperty,
  deletePropertyIcalCalendar,
  deleteSeasonRate,
  syncAllCalendars,
  syncPropertyIcalCalendarAction,
  syncPropertyCalendar,
  updateProperty,
  updatePropertyIcalCalendar,
} from '../_actions';

type SeasonRateView = {
  id: string;
  startDate: string;
  endDate: string;
  priceMultiplier: number;
  fixedPrice: number | null;
  paymentMode: 'FULL' | 'DEPOSIT' | null;
  depositPercentage: number | null;
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
  seasonRates: SeasonRateView[];
  icalCalendars: {
    id: string;
    name: string;
    icalUrl: string;
    lastSyncedAt: string | null;
  }[];
};

type PropertyDraft = {
  name: string;
  slug: string;
  description: string;
  imageUrlsText: string;
  basePrice: string;
  cleaningFee: string;
  minimumStay: string;
  depositPercentage: string;
  amenities: Record<string, boolean>;
};

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

export function InventoryPricingAdmin({
  initialProperties,
}: {
  initialProperties: PropertyView[];
}) {
  const router = useRouter();

  const [savingProperty, setSavingProperty] = useState(false);
  const [savingSeason, setSavingSeason] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [savingCalendar, setSavingCalendar] = useState(false);
  const [deletingPropertyId, setDeletingPropertyId] = useState<string | null>(null);
  const [updatingCalendar, setUpdatingCalendar] = useState(false);
  const [deletingCalendar, setDeletingCalendar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [updatingPropertyId, setUpdatingPropertyId] = useState<string | null>(null);
  const [confirmDeletePropertyId, setConfirmDeletePropertyId] = useState<string | null>(null);
  const [propertyDraftById, setPropertyDraftById] = useState<Record<string, PropertyDraft>>({});
  const [editingCalendarId, setEditingCalendarId] = useState<string | null>(null);
  const [confirmDeleteCalendarId, setConfirmDeleteCalendarId] = useState<string | null>(null);
  const [editCalendarName, setEditCalendarName] = useState('');
  const [editCalendarUrl, setEditCalendarUrl] = useState('');

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrlsText, setImageUrlsText] = useState('');
  const [basePrice, setBasePrice] = useState('120');
  const [cleaningFee, setCleaningFee] = useState('40');
  const [minimumStay, setMinimumStay] = useState('1');
  const [depositPercentage, setDepositPercentage] = useState('30');
  const [amenities, setAmenities] = useState<Record<string, boolean>>({
    wifi: true,
    kitchen: true,
  });

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(
    initialProperties[0]?.id ?? ''
  );
  const [seasonStartDate, setSeasonStartDate] = useState('');
  const [seasonEndDate, setSeasonEndDate] = useState('');
  const [seasonFixedPrice, setSeasonFixedPrice] = useState('');
  const [seasonMultiplier, setSeasonMultiplier] = useState('1');
  const [seasonPaymentMode, setSeasonPaymentMode] = useState<'FULL' | 'DEPOSIT'>('DEPOSIT');
  const [seasonDepositPercentage, setSeasonDepositPercentage] = useState('30');
  const [newCalendarNameByProperty, setNewCalendarNameByProperty] = useState<Record<string, string>>({});
  const [newCalendarUrlByProperty, setNewCalendarUrlByProperty] = useState<Record<string, string>>({});

  const properties = useMemo(() => initialProperties, [initialProperties]);

  const handleAmenityToggle = (key: string) => {
    setAmenities((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const parseImageUrls = (raw: string) =>
    raw
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);

  const getPropertyDraft = (property: PropertyView): PropertyDraft => ({
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

  const onStartEditProperty = (property: PropertyView) => {
    setEditingPropertyId(property.id);
    setPropertyDraftById((prev) => ({
      ...prev,
      [property.id]: getPropertyDraft(property),
    }));
  };

  const onCancelEditProperty = (propertyId: string) => {
    setEditingPropertyId(null);
    setPropertyDraftById((prev) => {
      const next = { ...prev };
      delete next[propertyId];
      return next;
    });
  };

  const onUpdatePropertyDraftField = (
    propertyId: string,
    field: keyof Omit<PropertyDraft, 'amenities'>,
    value: string
  ) => {
    setPropertyDraftById((prev) => ({
      ...prev,
      [propertyId]: {
        ...(prev[propertyId] ?? ({} as PropertyDraft)),
        [field]: value,
      },
    }));
  };

  const onTogglePropertyDraftAmenity = (propertyId: string, amenityKey: string) => {
    setPropertyDraftById((prev) => {
      const draft = prev[propertyId];
      if (!draft) return prev;

      return {
        ...prev,
        [propertyId]: {
          ...draft,
          amenities: {
            ...draft.amenities,
            [amenityKey]: !draft.amenities[amenityKey],
          },
        },
      };
    });
  };

  const onSaveProperty = async (propertyId: string) => {
    const draft = propertyDraftById[propertyId];
    if (!draft) return;

    if (!draft.name.trim() || !draft.slug.trim()) {
      setError('Name and slug are required');
      return;
    }

    setUpdatingPropertyId(propertyId);
    setError(null);

    const result = await updateProperty(propertyId, {
      name: draft.name.trim(),
      slug: draft.slug.trim(),
      description: draft.description.trim() || null,
      imageUrls: parseImageUrls(draft.imageUrlsText),
      basePrice: Number(draft.basePrice),
      cleaningFee: Number(draft.cleaningFee),
      minimumStay: Number(draft.minimumStay),
      depositPercentage: Number(draft.depositPercentage),
      amenities: draft.amenities,
    });

    setUpdatingPropertyId(null);

    if (!result.success) {
      setError(result.error ?? 'Error updating property');
      return;
    }

    setSyncMessage('Property updated successfully');
    onCancelEditProperty(propertyId);
    router.refresh();
  };

  const isValidIcalUrl = (value: string) => {
    try {
      const url = new URL(value.trim());
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const onCreateProperty = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingProperty(true);
    setError(null);

    const result = await createProperty({
      name,
      slug,
      description: description || null,
      imageUrls: parseImageUrls(imageUrlsText),
      basePrice: Number(basePrice),
      cleaningFee: Number(cleaningFee),
      minimumStay: Number(minimumStay),
      depositPercentage: Number(depositPercentage),
      amenities,
    });

    setSavingProperty(false);

    if (!result.success) {
      setError(result.error ?? 'Error creating property');
      return;
    }

    setName('');
    setSlug('');
    setDescription('');
    setImageUrlsText('');
    setAmenities({ wifi: true, kitchen: true });
    router.refresh();
  };

  const onCreateSeasonRate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPropertyId) return;

    setSavingSeason(true);
    setError(null);

    const result = await createSeasonRate({
      propertyId: selectedPropertyId,
      startDate: new Date(seasonStartDate),
      endDate: new Date(seasonEndDate),
      fixedPrice: seasonFixedPrice ? Number(seasonFixedPrice) : null,
      priceMultiplier: seasonMultiplier ? Number(seasonMultiplier) : undefined,
      paymentMode: seasonPaymentMode,
      depositPercentage:
        seasonPaymentMode === 'DEPOSIT' ? Number(seasonDepositPercentage) : null,
    });

    setSavingSeason(false);

    if (!result.success) {
      setError(result.error ?? 'Error creating season rate');
      return;
    }

    setSeasonStartDate('');
    setSeasonEndDate('');
    setSeasonFixedPrice('');
    setSeasonMultiplier('1');
    router.refresh();
  };

  const onDeleteSeasonRate = async (id: string) => {
    const result = await deleteSeasonRate(id);
    if (!result.success) {
      setError(result.error ?? 'Error deleting season rate');
      return;
    }
    router.refresh();
  };

  const onDeleteProperty = async (propertyId: string) => {
    setDeletingPropertyId(propertyId);
    setError(null);
    setSyncMessage(null);

    const result = await deleteProperty(propertyId);

    setDeletingPropertyId(null);

    if (!result.success) {
      setError(result.error ?? 'Error deleting property');
      return;
    }

    if (selectedPropertyId === propertyId) {
      const fallback = properties.find((p) => p.id !== propertyId)?.id ?? '';
      setSelectedPropertyId(fallback);
    }

    if (editingPropertyId === propertyId) {
      onCancelEditProperty(propertyId);
    }

    if (confirmDeletePropertyId === propertyId) {
      setConfirmDeletePropertyId(null);
    }

    setSyncMessage('Property deleted successfully');
    router.refresh();
  };

  const onSyncProperty = async (propertyId: string) => {
    setSyncing(true);
    setError(null);
    setSyncMessage(null);

    const result = await syncPropertyCalendar(propertyId);
    setSyncing(false);

    if (!result.success) {
      setError(result.error ?? 'Error syncing calendar');
      return;
    }

    const synced = result.data?.synced ?? 0;
    setSyncMessage(`iCal synced for property. Imported ${synced} blocked ranges.`);
    router.refresh();
  };

  const onAddCalendar = async (propertyId: string) => {
    const name = (newCalendarNameByProperty[propertyId] ?? '').trim();
    const icalUrl = (newCalendarUrlByProperty[propertyId] ?? '').trim();

    if (!name || !icalUrl) return;

    setSavingCalendar(true);
    setError(null);

    const result = await createPropertyIcalCalendar({ propertyId, name, icalUrl });
    setSavingCalendar(false);

    if (!result.success) {
      setError(result.error ?? 'Error adding iCal calendar');
      return;
    }

    setNewCalendarNameByProperty((prev) => ({ ...prev, [propertyId]: '' }));
    setNewCalendarUrlByProperty((prev) => ({ ...prev, [propertyId]: '' }));
    setSyncMessage('Calendar linked successfully');
    router.refresh();
  };

  const onStartEditCalendar = (calendar: { id: string; name: string; icalUrl: string }) => {
    setEditingCalendarId(calendar.id);
    setEditCalendarName(calendar.name);
    setEditCalendarUrl(calendar.icalUrl);
  };

  const onSaveEditCalendar = async () => {
    if (!editingCalendarId) return;

    setUpdatingCalendar(true);
    setError(null);

    const result = await updatePropertyIcalCalendar({
      calendarId: editingCalendarId,
      name: editCalendarName,
      icalUrl: editCalendarUrl,
    });

    setUpdatingCalendar(false);

    if (!result.success) {
      setError(result.error ?? 'Error updating iCal calendar');
      return;
    }

    setEditingCalendarId(null);
    setEditCalendarName('');
    setEditCalendarUrl('');
    setSyncMessage('Calendar updated successfully');
    router.refresh();
  };

  const onSyncCalendar = async (calendarId: string) => {
    setSyncing(true);
    setError(null);
    setSyncMessage(null);

    const result = await syncPropertyIcalCalendarAction(calendarId);
    setSyncing(false);

    if (!result.success) {
      setError(result.error ?? 'Error syncing iCal calendar');
      return;
    }

    const synced = result.data?.synced ?? 0;
    setSyncMessage(`Calendar synced. Imported ${synced} blocked ranges.`);
    router.refresh();
  };

  const onDeleteCalendar = async (calendarId: string) => {
    setDeletingCalendar(true);
    setError(null);
    setSyncMessage(null);

    const result = await deletePropertyIcalCalendar(calendarId);
    setDeletingCalendar(false);

    if (!result.success) {
      setError(result.error ?? 'Error deleting iCal calendar');
      return;
    }

    if (editingCalendarId === calendarId) {
      setEditingCalendarId(null);
      setEditCalendarName('');
      setEditCalendarUrl('');
    }

    if (confirmDeleteCalendarId === calendarId) {
      setConfirmDeleteCalendarId(null);
    }

    setSyncMessage('Calendar unlinked successfully');
    router.refresh();
  };

  const onSyncAll = async () => {
    setSyncing(true);
    setError(null);
    setSyncMessage(null);

    const result = await syncAllCalendars();
    setSyncing(false);

    if (!result.success) {
      setError(result.error ?? 'Error syncing all calendars');
      return;
    }

    setSyncMessage('All iCal sources synced');
    router.refresh();
  };

  return (
    <div className="space-y-8 text-slate-900">
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {syncMessage && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-700">
          {syncMessage}
        </div>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Alta de Propiedad</h2>

        <form onSubmit={onCreateProperty} className="grid gap-4 md:grid-cols-2">
          <input
            className="rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
            placeholder="slug-ejemplo"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
          />

          <textarea
            className="rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 md:col-span-2"
            placeholder="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />

          <textarea
            className="rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 md:col-span-2"
            placeholder="URLs de fotos (separadas por coma o salto de línea)"
            value={imageUrlsText}
            onChange={(e) => setImageUrlsText(e.target.value)}
            rows={3}
          />

          <input
            className="rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
            type="number"
            min={1}
            step="0.01"
            placeholder="Precio base"
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
            required
          />
          <input
            className="rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
            type="number"
            min={0}
            step="0.01"
            placeholder="Limpieza"
            value={cleaningFee}
            onChange={(e) => setCleaningFee(e.target.value)}
          />

          <input
            className="rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
            type="number"
            min={1}
            step={1}
            placeholder="Estancia mínima"
            value={minimumStay}
            onChange={(e) => setMinimumStay(e.target.value)}
          />
          <input
            className="rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
            type="number"
            min={0}
            max={100}
            step={1}
            placeholder="Depósito por defecto (%)"
            value={depositPercentage}
            onChange={(e) => setDepositPercentage(e.target.value)}
          />

          <div className="md:col-span-2">
            <div className="mb-2 text-sm font-medium text-slate-700">Amenities (checklist)</div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {AMENITIES_CATALOG.map((amenityKey) => (
                <label key={amenityKey} className="flex items-center gap-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={Boolean(amenities[amenityKey])}
                    onChange={() => handleAmenityToggle(amenityKey)}
                  />
                  <span>{amenityKey}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={savingProperty}
            className="rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50 md:col-span-2"
          >
            {savingProperty ? 'Guardando...' : 'Crear propiedad'}
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Gestión de Tarifas por Temporada</h2>

        <div className="mb-4">
          <button
            type="button"
            onClick={onSyncAll}
            disabled={syncing}
            className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {syncing ? 'Syncing calendars...' : 'Sync all iCal calendars'}
          </button>
        </div>

        <form onSubmit={onCreateSeasonRate} className="grid gap-4 md:grid-cols-3">
          <select
            className="rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 md:col-span-3"
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            required
          >
            {properties.length === 0 ? (
              <option value="">No hay propiedades</option>
            ) : (
              properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name} ({property.slug})
                </option>
              ))
            )}
          </select>

          <input
            className="rounded border border-slate-300 bg-white px-3 py-2 text-slate-900"
            type="date"
            value={seasonStartDate}
            onChange={(e) => setSeasonStartDate(e.target.value)}
            required
          />
          <input
            className="rounded border border-slate-300 bg-white px-3 py-2 text-slate-900"
            type="date"
            value={seasonEndDate}
            onChange={(e) => setSeasonEndDate(e.target.value)}
            required
          />
          <input
            className="rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
            type="number"
            min={0.1}
            step="0.01"
            placeholder="Multiplicador (ej: 1.2)"
            value={seasonMultiplier}
            onChange={(e) => setSeasonMultiplier(e.target.value)}
          />

          <input
            className="rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
            type="number"
            min={0}
            step="0.01"
            placeholder="Precio fijo (opcional)"
            value={seasonFixedPrice}
            onChange={(e) => setSeasonFixedPrice(e.target.value)}
          />

          <select
            className="rounded border border-slate-300 bg-white px-3 py-2 text-slate-900"
            value={seasonPaymentMode}
            onChange={(e) => setSeasonPaymentMode(e.target.value as 'FULL' | 'DEPOSIT')}
          >
            <option value="DEPOSIT">Pago con depósito</option>
            <option value="FULL">Pago 100%</option>
          </select>

          <input
            className="rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
            type="number"
            min={0}
            max={100}
            step={1}
            disabled={seasonPaymentMode === 'FULL'}
            placeholder="Depósito %"
            value={seasonDepositPercentage}
            onChange={(e) => setSeasonDepositPercentage(e.target.value)}
          />

          <button
            type="submit"
            disabled={savingSeason || !selectedPropertyId}
            className="rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50 md:col-span-3"
          >
            {savingSeason ? 'Guardando...' : 'Crear temporada'}
          </button>
        </form>

        <div className="mt-6 space-y-4">
          {properties.map((property) => (
            <div key={property.id} className="rounded border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900">{property.name}</h3>
              <p className="text-sm text-slate-600">
                Min stay: {property.minimumStay} · Limpieza: ${property.cleaningFee} · Depósito: {property.depositPercentage}%
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                  onClick={() => onStartEditProperty(property)}
                >
                  Editar propiedad
                </button>
                <button
                  type="button"
                  className="rounded border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                  disabled={Boolean(deletingPropertyId)}
                  onClick={() => setConfirmDeletePropertyId(property.id)}
                >
                  {deletingPropertyId === property.id ? 'Eliminando...' : 'Eliminar propiedad'}
                </button>
              </div>

              {confirmDeletePropertyId === property.id && (
                <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <p>
                    ¿Seguro que deseas eliminar esta propiedad? Esta acción no se puede deshacer.
                  </p>
                  <p className="mt-1">
                    Nota: si hay reservas activas, el sistema bloqueará la eliminación.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className="rounded border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-100 disabled:opacity-50"
                      disabled={deletingPropertyId === property.id}
                      onClick={() => onDeleteProperty(property.id)}
                    >
                      {deletingPropertyId === property.id ? 'Eliminando...' : 'Confirmar eliminar'}
                    </button>
                    <button
                      type="button"
                      className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                      disabled={deletingPropertyId === property.id}
                      onClick={() => setConfirmDeletePropertyId(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-3">
                {editingPropertyId === property.id ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <h4 className="mb-3 text-base font-semibold text-slate-900">Editar propiedad</h4>

                    <div className="grid gap-3 md:grid-cols-2">
                      <input
                        className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                        placeholder="Nombre"
                        value={propertyDraftById[property.id]?.name ?? ''}
                        onChange={(e) =>
                          onUpdatePropertyDraftField(property.id, 'name', e.target.value)
                        }
                      />
                      <input
                        className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                        placeholder="Slug"
                        value={propertyDraftById[property.id]?.slug ?? ''}
                        onChange={(e) =>
                          onUpdatePropertyDraftField(property.id, 'slug', e.target.value)
                        }
                      />

                      <textarea
                        className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 md:col-span-2"
                        rows={3}
                        placeholder="Descripción"
                        value={propertyDraftById[property.id]?.description ?? ''}
                        onChange={(e) =>
                          onUpdatePropertyDraftField(property.id, 'description', e.target.value)
                        }
                      />

                      <textarea
                        className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 md:col-span-2"
                        rows={3}
                        placeholder="URLs de fotos (coma o salto de línea)"
                        value={propertyDraftById[property.id]?.imageUrlsText ?? ''}
                        onChange={(e) =>
                          onUpdatePropertyDraftField(property.id, 'imageUrlsText', e.target.value)
                        }
                      />

                      <input
                        className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                        type="number"
                        min={1}
                        step="0.01"
                        placeholder="Precio base"
                        value={propertyDraftById[property.id]?.basePrice ?? ''}
                        onChange={(e) =>
                          onUpdatePropertyDraftField(property.id, 'basePrice', e.target.value)
                        }
                      />
                      <input
                        className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="Limpieza"
                        value={propertyDraftById[property.id]?.cleaningFee ?? ''}
                        onChange={(e) =>
                          onUpdatePropertyDraftField(property.id, 'cleaningFee', e.target.value)
                        }
                      />

                      <input
                        className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                        type="number"
                        min={1}
                        step={1}
                        placeholder="Estancia mínima"
                        value={propertyDraftById[property.id]?.minimumStay ?? ''}
                        onChange={(e) =>
                          onUpdatePropertyDraftField(property.id, 'minimumStay', e.target.value)
                        }
                      />
                      <input
                        className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        placeholder="Depósito %"
                        value={propertyDraftById[property.id]?.depositPercentage ?? ''}
                        onChange={(e) =>
                          onUpdatePropertyDraftField(property.id, 'depositPercentage', e.target.value)
                        }
                      />

                      <div className="md:col-span-2">
                        <div className="mb-2 text-sm font-medium text-slate-700">Amenities</div>
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                          {AMENITIES_CATALOG.map((amenityKey) => (
                            <label key={`${property.id}-${amenityKey}`} className="flex items-center gap-2 text-sm text-slate-800">
                              <input
                                type="checkbox"
                                checked={Boolean(propertyDraftById[property.id]?.amenities?.[amenityKey])}
                                onChange={() => onTogglePropertyDraftAmenity(property.id, amenityKey)}
                              />
                              <span>{amenityKey}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                        disabled={updatingPropertyId === property.id}
                        onClick={() => onSaveProperty(property.id)}
                      >
                        {updatingPropertyId === property.id ? 'Guardando...' : 'Guardar cambios'}
                      </button>
                      <button
                        type="button"
                        className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => onCancelEditProperty(property.id)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <></>
                )}
              </div>

              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-base font-semibold text-slate-900">Vincular calendarios</h4>

                <div className="mt-3 space-y-3">
                  {property.icalCalendars.length === 0 && (
                    <p className="text-sm text-slate-500">No hay calendarios vinculados</p>
                  )}

                  {property.icalCalendars.map((calendar) => (
                    <div key={calendar.id} className="rounded border border-slate-200 bg-white p-3">
                      {editingCalendarId === calendar.id ? (
                        <div className="space-y-2">
                          <input
                            className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                            value={editCalendarName}
                            onChange={(e) => setEditCalendarName(e.target.value)}
                            placeholder="Nombre del calendario"
                          />
                          <input
                            className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                            value={editCalendarUrl}
                            onChange={(e) => setEditCalendarUrl(e.target.value)}
                            placeholder="https://.../calendar.ics"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={onSaveEditCalendar}
                              disabled={
                                updatingCalendar ||
                                !editCalendarName.trim() ||
                                !editCalendarUrl.trim() ||
                                !isValidIcalUrl(editCalendarUrl)
                              }
                              className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              {updatingCalendar ? 'Guardando...' : 'Guardar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCalendarId(null);
                                setEditCalendarName('');
                                setEditCalendarUrl('');
                              }}
                              className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-sm font-semibold text-slate-900">{calendar.name}</div>
                          <div className="text-xs text-slate-500 break-all">{calendar.icalUrl}</div>
                          <div className="text-xs text-slate-600">
                            Última sincronización:{' '}
                            {calendar.lastSyncedAt
                              ? new Date(calendar.lastSyncedAt).toLocaleString()
                              : 'Nunca'}
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                              disabled={syncing}
                              onClick={() => onSyncCalendar(calendar.id)}
                            >
                              {syncing ? 'Actualizando...' : 'Actualizar'}
                            </button>
                            <button
                              type="button"
                              className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                              onClick={() => onStartEditCalendar(calendar)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="rounded border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                              disabled={deletingCalendar}
                              onClick={() => setConfirmDeleteCalendarId(calendar.id)}
                            >
                              {deletingCalendar ? 'Desvinculando...' : 'Desvincular'}
                            </button>
                          </div>

                          {confirmDeleteCalendarId === calendar.id && (
                            <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                              <p>
                                ¿Seguro que deseas desvincular este calendario? Se eliminarán también sus bloqueos importados.
                              </p>
                              <div className="mt-2 flex gap-2">
                                <button
                                  type="button"
                                  className="rounded border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-100 disabled:opacity-50"
                                  disabled={deletingCalendar}
                                  onClick={() => onDeleteCalendar(calendar.id)}
                                >
                                  {deletingCalendar ? 'Desvinculando...' : 'Confirmar desvincular'}
                                </button>
                                <button
                                  type="button"
                                  className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                                  disabled={deletingCalendar}
                                  onClick={() => setConfirmDeleteCalendarId(null)}
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-2 md:grid-cols-3">
                  <input
                    className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 md:col-span-1"
                    placeholder="Nombre del calendario"
                    value={newCalendarNameByProperty[property.id] ?? ''}
                    onChange={(e) =>
                      setNewCalendarNameByProperty((prev) => ({
                        ...prev,
                        [property.id]: e.target.value,
                      }))
                    }
                  />
                  <input
                    className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 md:col-span-2"
                    placeholder="https://.../calendar.ics"
                    value={newCalendarUrlByProperty[property.id] ?? ''}
                    onChange={(e) =>
                      setNewCalendarUrlByProperty((prev) => ({
                        ...prev,
                        [property.id]: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="mt-2">
                  <button
                    type="button"
                    className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                    disabled={
                      savingCalendar ||
                      !(newCalendarNameByProperty[property.id] ?? '').trim() ||
                      !(newCalendarUrlByProperty[property.id] ?? '').trim() ||
                      !isValidIcalUrl(newCalendarUrlByProperty[property.id] ?? '')
                    }
                    onClick={() => onAddCalendar(property.id)}
                  >
                    {savingCalendar ? 'Añadiendo...' : 'Añadir el calendario'}
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                  disabled={syncing}
                  onClick={() => onSyncProperty(property.id)}
                >
                  Sincronizar todos los calendarios de esta propiedad
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {property.seasonRates.length === 0 && (
                  <p className="text-sm text-slate-500">Sin temporadas configuradas</p>
                )}
                {property.seasonRates.map((rate) => (
                  <div key={rate.id} className="flex flex-wrap items-center justify-between rounded bg-slate-50 px-3 py-2 text-sm text-slate-800">
                    <span>
                      {new Date(rate.startDate).toLocaleDateString()} - {new Date(rate.endDate).toLocaleDateString()} ·
                      {' '}mult: {rate.priceMultiplier} ·
                      {' '}fixed: {rate.fixedPrice ?? '-'} ·
                      {' '}pay: {rate.paymentMode ?? 'DEFAULT'}
                      {rate.paymentMode === 'DEPOSIT' ? ` (${rate.depositPercentage ?? 0}%)` : ''}
                    </span>
                    <button
                      type="button"
                      className="text-red-600"
                      onClick={() => onDeleteSeasonRate(rate.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
