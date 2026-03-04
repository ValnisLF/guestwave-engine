import { Property, SeasonRate } from '@prisma/client';
import { DollarSign, MapPin } from 'lucide-react';

export function PropertyCard({
  property,
}: {
  property: Property & { seasonRates: SeasonRate[] };
}) {
  // Get the minimum price from season rates or use base price
  const minPrice = property.seasonRates.length > 0
    ? Math.min(
        ...property.seasonRates
          .map(sr => sr.fixedPrice || (Number(sr.priceMultiplier) * Number(property.basePrice)))
          .filter((p): p is number => p !== null),
        Number(property.basePrice)
      )
    : Number(property.basePrice);

  const firstImage = property.imageUrls?.[0];

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow">
      {/* Property Image */}
      <div className="h-48 bg-gradient-to-br from-blue-100 to-blue-50 overflow-hidden">
        {firstImage ? (
          <img
            src={firstImage}
            alt={property.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-blue-300 text-6xl">🏠</div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
          {property.name}
        </h3>

        {property.description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {property.description}
          </p>
        )}

        {/* Amenities */}
        {property.amenities && Object.keys(property.amenities).length > 0 && (
          <div className="flex gap-2 mb-3 flex-wrap">
            {Object.entries(property.amenities)
              .filter(([, value]) => value)
              .slice(0, 3)
              .map(([key]) => (
                <span
                  key={key}
                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                >
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </span>
              ))}
            {Object.entries(property.amenities).filter(([, value]) => value)
              .length > 3 && (
              <span className="text-xs text-gray-600 px-2 py-1">
                +{Object.entries(property.amenities).filter(([, value]) => value).length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Pricing */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <div className="flex items-center gap-1 text-gray-600">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">from</span>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-gray-900">
              ${minPrice.toFixed(0)}/night
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
