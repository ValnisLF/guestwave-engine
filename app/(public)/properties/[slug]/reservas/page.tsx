import { prisma } from '@infra/prisma';
import { notFound } from 'next/navigation';
import { PricingCalculator } from '../_components/PricingCalculator';
import { PropertyCalendar } from '../_components/PropertyCalendar';
import { Metadata } from 'next';
import Image from 'next/image';
import { Heading, Text } from '@/components/ui/typography';
import { PropertyPageContentSchema, createEmptyPropertyPageContent } from '@/lib/schemas/property';

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
}: Readonly<{
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ checkout?: string; bookingCode?: string; bookingId?: string }>;
}>) {
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

  const parsed = PropertyPageContentSchema.safeParse(property.pageContent);
  const content = parsed.success ? parsed.data : createEmptyPropertyPageContent();
  const section = content.reservas;

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

      <div className="mb-8 space-y-4">
        {section.hero.image ? (
          <div className="relative h-[46vh] overflow-hidden rounded-2xl">
            <Image src={section.hero.image} alt={section.hero.title || 'Reservas'} fill className="object-cover" unoptimized />
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <Heading level={2} className="text-white">{section.hero.title || 'Reservas'}</Heading>
            </div>
          </div>
        ) : null}

        {section.intro.title ? <Heading level={4}>{section.intro.title}</Heading> : null}
        {section.intro.paragraph ? <Text className="whitespace-pre-wrap">{section.intro.paragraph}</Text> : null}

        {section.instructions.title ? <Heading level={4}>{section.instructions.title}</Heading> : null}
        {section.instructions.paragraph ? <Text className="whitespace-pre-wrap">{section.instructions.paragraph}</Text> : null}
        {section.instructions.items && section.instructions.items.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-slate-700">
            {section.instructions.items.map((item, idx) => (
              <li key={`${item}-${idx}`}>{item}</li>
            ))}
          </ul>
        ) : null}
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
