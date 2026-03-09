import { prisma } from '@infra/prisma';
import { notFound } from 'next/navigation';
import { PricingCalculator } from './_components/PricingCalculator';
import { PropertyCalendar } from './_components/PropertyCalendar';
import { Metadata } from 'next';

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
    title: `${property.name} - GuestWave`,
    description: property.description || 'Book this amazing property',
  };
}

export default async function PropertyDetailPage({
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

  // Fetch property with all related data
  const property = await prisma.property.findUnique({
    where: { slug },
    include: {
      seasonRates: {
        orderBy: { startDate: 'asc' },
      },
      bookings: {
        where: { status: 'CONFIRMED' },
        select: {
          checkIn: true,
          checkOut: true,
        },
      },
      blockedDates: {
        select: {
          startDate: true,
          endDate: true,
          source: true,
        },
      },
    },
  });

  if (!property) {
    notFound();
  }

  // Combine blocked dates
  const unavailableDates = property.blockedDates.map((bd) => ({
    startDate: new Date(bd.startDate),
    endDate: new Date(bd.endDate),
  }));
  const mainImage = property.imageUrls?.[0];

  return (
    <div className="py-8 text-slate-900">
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

      {/* Property Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">
          {property.name}
        </h1>

        {property.description && (
          <p className="text-slate-600 text-lg max-w-2xl">
            {property.description}
          </p>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Property Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Property Image */}
          <div className="h-96 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg overflow-hidden">
            {mainImage ? (
              <img
                src={mainImage}
                alt={property.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-blue-300 text-8xl">🏠</div>
              </div>
            )}
          </div>

          {property.imageUrls.length > 1 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {property.imageUrls.slice(1, 5).map((url, index) => (
                <div key={`${url}-${index}`} className="h-24 rounded-md overflow-hidden bg-gray-100">
                  <img src={url} alt={`${property.name} ${index + 2}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {/* Amenities */}
          {property.amenities && Object.keys(property.amenities).length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Amenities
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(property.amenities).map(([key, value]) => (
                  <div
                    key={key}
                    className={`p-3 rounded-lg ${
                      value
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-gray-50 text-gray-400'
                    }`}
                  >
                    <span className="text-sm font-medium">
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Availability Calendar */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Availability
            </h2>
            <PropertyCalendar unavailableDates={unavailableDates} />
          </div>
        </div>

        {/* Right Column - Booking Widget */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-lg p-6 sticky top-24 h-fit shadow-sm">
            <div className="mb-6">
              <div className="text-sm text-slate-600 mb-1">Starting from</div>
              <div className="text-3xl font-bold text-slate-900">
                ${Number(property.basePrice).toFixed(0)}
                <span className="text-lg font-normal text-slate-600">/night</span>
              </div>
              {Number(property.cleaningFee) > 0 && (
                <div className="text-sm text-slate-600 mt-2">
                  Cleaning fee: ${Number(property.cleaningFee).toFixed(0)}
                </div>
              )}
            </div>

            {/* Pricing Calculator */}
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
