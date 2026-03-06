'use client';

import { useState, useEffect } from 'react';
import { createCheckoutSession, estimatePrice } from '@/app/api/booking/_actions';
import { Calendar, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

interface PricingCalculatorProps {
  propertyId: string;
  basePrice: number;
  cleaningFee: number;
  minimumStay: number;
  depositPercentage: number;
  unavailableDates: Array<{ startDate: Date; endDate: Date }>;
}

type EstimatePriceResult = {
  success: boolean;
  total?: number;
  deposit?: number;
  amountDueNow?: number;
  paymentMode?: 'FULL' | 'DEPOSIT';
  minimumStay?: number;
  perNightEffective?: number;
  error?: string;
};

export function PricingCalculator({
  propertyId,
  basePrice,
  cleaningFee,
  minimumStay,
  depositPercentage,
  unavailableDates,
}: PricingCalculatorProps) {
  const isMockCheckoutEnabled = process.env.NEXT_PUBLIC_MOCK_CHECKOUT === '1';
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [pricing, setPricing] = useState<EstimatePriceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  const toLocalDayTimestamp = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  };

  const isPastDate = (date: Date): boolean => {
    const today = new Date();
    return toLocalDayTimestamp(date) < toLocalDayTimestamp(today);
  };

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

    const startTime = toLocalDayTimestamp(new Date(start));
    const endTime = toLocalDayTimestamp(new Date(end));

    return !unavailableDates.some((range) => {
      const rangeStart = toLocalDayTimestamp(range.startDate);
      const rangeEnd = toLocalDayTimestamp(range.endDate);
      return startTime < rangeEnd && endTime > rangeStart;
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

    if (isPastDate(new Date(startDate))) {
      setError('Check-in date cannot be in the past');
      setPricing(null);
      return;
    }

    const requestedNights = Math.floor(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (requestedNights < minimumStay) {
      setError(`Minimum stay is ${minimumStay} night(s)`);
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

      const result: EstimatePriceResult = await estimatePrice({
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
  }, [startDate, endDate, propertyId, depositPercentage, minimumStay]);

  useEffect(() => {
    const onCalendarDateRangeSelected = (
      event: Event
    ) => {
      const customEvent = event as CustomEvent<{ startDate?: string; endDate?: string }>;
      const nextStartDate = customEvent.detail?.startDate ?? '';
      const nextEndDate = customEvent.detail?.endDate ?? '';

      setStartDate(nextStartDate);
      setEndDate(nextEndDate);
    };

    window.addEventListener('guestwave:date-range-selected', onCalendarDateRangeSelected);

    return () => {
      window.removeEventListener('guestwave:date-range-selected', onCalendarDateRangeSelected);
    };
  }, []);

  const nights = startDate && endDate
    ? Math.floor(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  const handleCheckout = async () => {
    if (!pricing || !startDate || !endDate) return;
    if (!guestName.trim() || !guestEmail.trim()) {
      setError('Please enter your name and email to continue');
      return;
    }

    setCheckoutLoading(true);
    setError('');

    const result = await createCheckoutSession({
      propertyId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      guestName: guestName.trim(),
      guestEmail: guestEmail.trim(),
    });

    if (!result.success || !result.checkoutUrl) {
      setCheckoutLoading(false);
      setError(result.error || 'Unable to start checkout');
      return;
    }

    window.location.href = result.checkoutUrl;
  };

  return (
    <div className="space-y-4 text-slate-900">
      {/* Date Inputs */}
      <div className="space-y-3">
        <div className="text-xs text-slate-500">
          Minimum stay: {minimumStay} night{minimumStay > 1 ? 's' : ''}
        </div>
        <div>
          <Label htmlFor="check-in" className="mb-1 block">Check-in</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              id="check-in"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={getMinDate()}
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="check-out" className="mb-1 block">Check-out</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              id="check-out"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || getMinDate()}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive" className="flex gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </Alert>
      )}

      <div className="space-y-3">
        <div>
          <Label htmlFor="guest-name" className="mb-1 block">Guest name</Label>
          <Input
            id="guest-name"
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Your full name"
          />
        </div>
        <div>
          <Label htmlFor="guest-email" className="mb-1 block">Email</Label>
          <Input
            id="guest-email"
            type="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            placeholder="you@email.com"
          />
        </div>
      </div>

      {/* Price Breakdown */}
      {pricing && nights > 0 && !loading && (
        <div className="space-y-3 pt-4 border-t border-slate-200">
          {(() => {
            const nightlyPrice = pricing.perNightEffective ?? basePrice;
            const nightsSubtotal = nightlyPrice * nights;
            const hasSeasonAdjustment = Math.abs(nightlyPrice - basePrice) > 0.009;

            return (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">
                    ${nightlyPrice.toFixed(0)} × {nights} night{nights > 1 ? 's' : ''}
                    {hasSeasonAdjustment ? ' (season adjusted)' : ''}
                  </span>
                  <span className="font-medium">
                    ${nightsSubtotal.toFixed(0)}
                  </span>
                </div>

                {hasSeasonAdjustment && (
                  <div className="text-xs text-slate-500">
                    Base nightly price: ${basePrice.toFixed(0)}
                  </div>
                )}
              </>
            );
          })()}

          {cleaningFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Cleaning fee</span>
              <span className="font-medium">${cleaningFee.toFixed(0)}</span>
            </div>
          )}

          <div className="flex justify-between font-semibold pt-3 border-t border-slate-200">
            <span>Total</span>
            <span className="text-lg text-blue-600">
              ${pricing.total?.toFixed(0) || '-'}
            </span>
          </div>

          {depositPercentage > 0 && pricing.deposit && (
            <div className="flex justify-between text-sm text-slate-600">
              <span>Deposit ({depositPercentage}%)</span>
              <span>${pricing.deposit?.toFixed(0)}</span>
            </div>
          )}

          {pricing.amountDueNow !== undefined && (
            <div className="flex justify-between text-sm text-slate-700">
              <span>
                Due now ({pricing.paymentMode === 'FULL' ? '100%' : 'Deposit'})
              </span>
              <span className="font-semibold">${pricing.amountDueNow.toFixed(0)}</span>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-2">
          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-slate-600 ml-2">Calculating...</span>
        </div>
      )}

      {/* CTA Button */}
      <Button
        onClick={handleCheckout}
        disabled={!pricing || loading || checkoutLoading || startDate === '' || endDate === ''}
        className="mt-4 w-full"
      >
        {loading
          ? 'Calculating...'
          : checkoutLoading
            ? isMockCheckoutEnabled
              ? 'Confirming booking...'
              : 'Redirecting to Stripe...'
            : isMockCheckoutEnabled
              ? 'Book Now (Test Mode)'
              : 'Book Now'}
                  </Button>

      <p className="text-xs text-slate-500 text-center">
        {isMockCheckoutEnabled
          ? 'Test mode active: payment is simulated and no Stripe checkout is used.'
          : "You won't be charged until next step"}
      </p>
    </div>
  );
}
