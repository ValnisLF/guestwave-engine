'use client';

import { useState, useEffect } from 'react';
import { estimatePrice } from '@/app/api/booking/_actions';
import { Calendar, DollarSign, AlertCircle } from 'lucide-react';

interface PricingCalculatorProps {
  propertyId: string;
  basePrice: number;
  cleaningFee: number;
  depositPercentage: number;
  unavailableDates: Array<{ startDate: Date; endDate: Date }>;
}

export function PricingCalculator({
  propertyId,
  basePrice,
  cleaningFee,
  depositPercentage,
  unavailableDates,
}: PricingCalculatorProps) {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [pricing, setPricing] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Format date to YYYY-MM-DD for input
  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Get min date (tomorrow)
  const getMinDate = (): string => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateForInput(tomorrow);
  };

  // Check if date range is available
  const isDateRangeAvailable = (start: string, end: string): boolean => {
    if (!start || !end) return true;

    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();

    return !unavailableDates.some((range) => {
      const rangeStart = range.startDate.getTime();
      const rangeEnd = range.endDate.getTime();
      return startTime <= rangeEnd && endTime >= rangeStart;
    });
  };

  // Calculate pricing
  useEffect(() => {
    if (!startDate || !endDate) {
      setPricing(null);
      setError('');
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      setError('End date must be after start date');
      setPricing(null);
      return;
    }

    if (!isDateRangeAvailable(startDate, endDate)) {
      setError('Some dates are unavailable. Please select different dates.');
      setPricing(null);
      return;
    }

    const calculateAsync = async () => {
      setLoading(true);
      setError('');

      const result = await estimatePrice({
        propertyId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        depositPercentage,
      });

      if (result.success) {
        setPricing(result);
      } else {
        setError(result.error || 'Error calculating price');
      }

      setLoading(false);
    };

    calculateAsync();
  }, [startDate, endDate, propertyId, depositPercentage]);

  const nights = startDate && endDate
    ? Math.floor(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  return (
    <div className="space-y-4">
      {/* Date Inputs */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Check-in
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={getMinDate()}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Check-out
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || getMinDate()}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Price Breakdown */}
      {pricing && nights > 0 && !loading && (
        <div className="space-y-3 pt-4 border-t border-gray-200">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              ${basePrice.toFixed(0)} × {nights} night{nights > 1 ? 's' : ''}
            </span>
            <span className="font-medium">
              ${(basePrice * nights).toFixed(0)}
            </span>
          </div>

          {cleaningFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Cleaning fee</span>
              <span className="font-medium">${cleaningFee.toFixed(0)}</span>
            </div>
          )}

          <div className="flex justify-between font-semibold pt-3 border-t border-gray-200">
            <span>Total</span>
            <span className="text-lg text-blue-600">
              ${pricing.total?.toFixed(0) || '-'}
            </span>
          </div>

          {depositPercentage > 0 && pricing.deposit && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>Deposit ({depositPercentage}%)</span>
              <span>${pricing.deposit?.toFixed(0)}</span>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-2">
          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600 ml-2">Calculating...</span>
        </div>
      )}

      {/* CTA Button */}
      <button
        disabled={!pricing || loading || startDate === '' || endDate === ''}
        className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed mt-4"
      >
        {loading ? 'Calculating...' : 'Book Now'}
      </button>

      <p className="text-xs text-gray-500 text-center">
        You won't be charged until next step
      </p>
    </div>
  );
}
