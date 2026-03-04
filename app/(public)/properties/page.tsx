import { prisma } from '@infra/prisma';
import Link from 'next/link';
import { PropertyCard } from './_components/PropertyCard';

export const metadata = {
  title: 'Available Properties - GuestWave',
  description: 'Browse our collection of premium rental properties',
};

export default async function PropertiesPage() {
  // Fetch all properties with their season rates
  const properties = await prisma.property.findMany({
    include: {
      seasonRates: {
        orderBy: { startDate: 'asc' },
        take: 2, // Show upcoming seasons
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (properties.length === 0) {
    return (
      <div className="text-center py-12 text-slate-900">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          No properties available
        </h1>
        <p className="text-slate-600 text-lg">
          Check back soon for amazing vacation rentals
        </p>
      </div>
    );
  }

  return (
    <div className="py-12 text-slate-900">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">
          Discover Our Properties
        </h1>
        <p className="text-slate-600 text-lg">
          Find the perfect place for your next getaway
        </p>
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {properties.map((property) => (
          <Link
            key={property.id}
            href={`/properties/${property.slug}`}
            className="group"
          >
            <PropertyCard property={property} />
          </Link>
        ))}
      </div>
    </div>
  );
}
