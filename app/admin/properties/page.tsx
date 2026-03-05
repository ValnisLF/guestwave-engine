import { prisma } from '@infra/prisma';
import { InventoryPricingAdmin } from './_components/InventoryPricingAdmin';

export default async function AdminPropertiesPage() {
  const properties = await prisma.property.findMany({
    include: {
      seasonRates: {
        orderBy: { startDate: 'asc' },
      },
      icalCalendars: {
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const normalizedProperties = properties.map((property) => ({
    id: property.id,
    name: property.name,
    slug: property.slug,
    description: property.description,
    imageUrls: property.imageUrls,
    amenities:
      typeof property.amenities === 'object' && property.amenities
        ? (property.amenities as Record<string, boolean>)
        : {},
    basePrice: Number(property.basePrice),
    cleaningFee: Number(property.cleaningFee),
    minimumStay: property.minimumStay,
    depositPercentage: property.depositPercentage,
    autoSyncEnabled: property.autoSyncEnabled,
    autoSyncIntervalMinutes: property.autoSyncIntervalMinutes,
    autoSyncLastRunAt: property.autoSyncLastRunAt ? property.autoSyncLastRunAt.toISOString() : null,
    seasonRates: property.seasonRates.map((rate) => ({
      id: rate.id,
      startDate: rate.startDate.toISOString(),
      endDate: rate.endDate.toISOString(),
      priceMultiplier: Number(rate.priceMultiplier),
      fixedPrice: rate.fixedPrice ? Number(rate.fixedPrice) : null,
      paymentMode: rate.paymentMode,
      depositPercentage: rate.depositPercentage,
    })),
    icalCalendars: property.icalCalendars.map((calendar) => ({
      id: calendar.id,
      name: calendar.name,
      icalUrl: calendar.icalUrl,
      lastSyncedAt: calendar.lastSyncedAt ? calendar.lastSyncedAt.toISOString() : null,
    })),
  }));

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <h1 className="mb-6 text-3xl font-bold text-slate-900">Admin · Inventory & Pricing</h1>
      <InventoryPricingAdmin initialProperties={normalizedProperties} />
    </div>
  );
}
