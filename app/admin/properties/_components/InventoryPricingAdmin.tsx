'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createProperty,
  createSeasonRate,
  deleteSeasonRate,
  syncAllCalendars,
  syncPropertyCalendar,
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
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

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

  const properties = useMemo(() => initialProperties, [initialProperties]);

  const handleAmenityToggle = (key: string) => {
    setAmenities((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const parseImageUrls = (raw: string) =>
    raw
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);

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
    setSyncMessage(`iCal synced. Imported ${synced} blocked ranges.`);
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
              <div className="mt-2">
                <button
                  type="button"
                  className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                  disabled={syncing}
                  onClick={() => onSyncProperty(property.id)}
                >
                  Sync iCal for this property
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
