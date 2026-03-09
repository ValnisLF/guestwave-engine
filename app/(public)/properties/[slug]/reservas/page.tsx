import { prisma } from '@infra/prisma';
import { notFound } from 'next/navigation';
import { PricingCalculator } from '../_components/PricingCalculator';
import { PropertyCalendar } from '../_components/PropertyCalendar';
import { Metadata } from 'next';
import { Heading, Text } from '@/components/ui/typography';
import {
  getPublicPropertySectionBySlug,
  hasSectionContent,
  valueOrFallback,
} from '../_lib/page-content';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  if (!slug) {
    return { title: 'Property Not Found' };
  }

  const property = await prisma.property.findUnique({
    where: { slug },
  });

  if (!property) return { title: 'Property Not Found' };

  return {
    title: `${property.name} · Reservas - GuestWave`,
    description: property.description || 'Book this amazing property',
  };
}

export default async function PropertyReservationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ checkout?: string; bookingCode?: string; bookingId?: string }>;
}) {
  const { slug } = await params;
  const { checkout, bookingCode, bookingId } = await searchParams;
  const publicBookingCode = bookingCode ?? bookingId;

  if (!slug) {
    notFound();
  }

  const property = await prisma.property.findUnique({
    where: { slug },
    include: {
      seasonRates: {
        orderBy: { startDate: 'asc' },
      },
      blockedDates: {
        select: {
          startDate: true,
          endDate: true,
        },
      },
    },
  });

  if (!property) {
    notFound();
  }

  const contentProperty = await getPublicPropertySectionBySlug(slug, 'reservas');
  const section = contentProperty?.pageContent ?? null;
  const hasContent = hasSectionContent(section);

  const unavailableDates = property.blockedDates.map((bd) => ({
    startDate: new Date(bd.startDate),
    endDate: new Date(bd.endDate),
  }));

  return (
    <div className="py-4 text-slate-900">
      {checkout === 'success' && (
        <div className="mb-6 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-700">
          Booking created and payment completed successfully.
          {publicBookingCode ? ` Booking code: ${publicBookingCode}` : ''}
        </div>
      )}

      {checkout === 'cancelled' && (
        <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800">
          Checkout was cancelled. You can try again when ready.
        </div>
      )}

      <div className="mb-8">
        {hasContent ? (
          <>
            <Heading level={2} tone="primary">{valueOrFallback(section?.overlayHeroTitle)}</Heading>
            <Text className="mt-2 text-lg" tone="muted">
              {valueOrFallback(section?.overlayHeroSubtitle)}
            </Text>
            <Heading level={4} className="mt-4">{valueOrFallback(section?.shortBioTitle)}</Heading>
            <Text className="mt-2 whitespace-pre-wrap">{valueOrFallback(section?.shorBioText)}</Text>
            <Text className="mt-2 whitespace-pre-wrap">{valueOrFallback(section?.instructions)}</Text>
          </>
        ) : (
          <Text>Contenido en preparación...</Text>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <div>
            <h3 className="mb-4 text-2xl font-semibold text-slate-900">Availability</h3>
            <PropertyCalendar unavailableDates={unavailableDates} />
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 h-fit rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <div className="mb-1 text-sm text-slate-600">Starting from</div>
              <div className="text-3xl font-bold text-slate-900">
                ${Number(property.basePrice).toFixed(0)}
                <span className="text-lg font-normal text-slate-600">/night</span>
              </div>
              {Number(property.cleaningFee) > 0 && (
                <div className="mt-2 text-sm text-slate-600">
                  Cleaning fee: ${Number(property.cleaningFee).toFixed(0)}
                </div>
              )}
            </div>

            <PricingCalculator
              propertyId={property.id}
              basePrice={Number(property.basePrice)}
              cleaningFee={Number(property.cleaningFee)}
              minimumStay={property.minimumStay}
              depositPercentage={property.depositPercentage}
              unavailableDates={unavailableDates}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
