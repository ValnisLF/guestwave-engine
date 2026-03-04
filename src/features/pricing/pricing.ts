import { PricingInput, PricingResult, SeasonRate } from './types';

/**
 * Finds matching season rate(s) for a given date range.
 * Assumes: booking dates are [startDate, endDate) where endDate is exclusive (checkout day)
 *          season dates are [startDate, endDate] where endDate is inclusive (last day of season)
 */
function findMatchingSeasons(
  startDate: Date,
  endDate: Date,
  seasonRates: SeasonRate[],
): Array<{
  rate: SeasonRate;
  nightsInSeason: number;
  overlapStart: Date;
  overlapEnd: Date;
}> {
  const results: Array<{
    rate: SeasonRate;
    nightsInSeason: number;
    overlapStart: Date;
    overlapEnd: Date;
  }> = [];

  for (const rate of seasonRates) {
    // Convert season endDate to exclusive (add 1 day to make it exclusive like booking endDate)
    const seasonEndExclusive = new Date(rate.endDate.getTime() + 1000 * 60 * 60 * 24);

    // Check if season overlaps with booking
    if (rate.startDate < endDate && seasonEndExclusive > startDate) {
      // Calculate overlap period (both exclusive end)
      const overlapStart = new Date(Math.max(startDate.getTime(), rate.startDate.getTime()));
      const overlapEnd = new Date(Math.min(endDate.getTime(), seasonEndExclusive.getTime()));

      // Calculate nights: (exclusive end - start) / msPerDay
      const nightsInSeason = Math.floor(
        (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24),
      );

      results.push({
        rate,
        nightsInSeason: Math.max(0, nightsInSeason),
        overlapStart,
        overlapEnd,
      });
    }
  }

  return results.sort((a, b) => a.overlapStart.getTime() - b.overlapStart.getTime());
}

/**
 * Calculates the nightly rate for a season.
 * Prefers fixedPrice over (basePrice * priceMultiplier)
 */
function getNightlyRate(basePricePerNight: number, season: SeasonRate): number {
  if (season.fixedPrice !== null && season.fixedPrice !== undefined) {
    return season.fixedPrice;
  }
  const multiplier = season.priceMultiplier ?? 1;
  return basePricePerNight * multiplier;
}

/**
 * Calculates pricing with optional seasonal rate adjustments.
 * If seasonRates are provided with startDate/endDate, applies proportional pricing.
 * Otherwise falls back to seasonMultiplier parameter.
 */
export function calculatePrice(input: PricingInput): PricingResult {
  const base = input.basePricePerNight;
  const nights = Math.max(0, Math.floor(input.nights));
  const cleaning = input.cleaningFee ?? 0;
  const depositPct = input.depositPct ?? 0;
  let effectivePaymentMode: 'FULL' | 'DEPOSIT' = input.paymentMode ?? (depositPct > 0 ? 'DEPOSIT' : 'FULL');
  let effectiveDepositPct = depositPct;

  let subtotal = 0;
  let perNightEffective = 0;

  // Case 1: SeasonRates provided with valid date range
  if (
    input.seasonRates &&
    input.seasonRates.length > 0 &&
    input.startDate &&
    input.endDate
  ) {
    const matchingSeasons = findMatchingSeasons(
      input.startDate,
      input.endDate,
      input.seasonRates,
    );

    if (matchingSeasons.length > 0) {
      // Calculate proportional pricing across seasons
      for (const { rate, nightsInSeason } of matchingSeasons) {
        const nightlyRate = getNightlyRate(base, rate);
        subtotal += nightlyRate * nightsInSeason;
      }

      const dominantSeason = [...matchingSeasons].sort(
        (a, b) => b.nightsInSeason - a.nightsInSeason,
      )[0]?.rate;
      if (dominantSeason?.paymentMode) {
        effectivePaymentMode = dominantSeason.paymentMode;
      }
      if (dominantSeason?.depositPercentage !== null && dominantSeason?.depositPercentage !== undefined) {
        effectiveDepositPct = dominantSeason.depositPercentage / 100;
      }

      perNightEffective = nights > 0 ? subtotal / nights : 0;
    } else {
      // No matching seasons, use basePrice as fallback
      subtotal = base * nights;
      perNightEffective = base;
    }
  } else {
    // Case 2: Use seasonMultiplier (original behavior)
    const multiplier = input.seasonMultiplier ?? 1;
    subtotal = base * multiplier * nights;
    perNightEffective = nights > 0 ? base * multiplier : 0;
  }

  const total = Math.round((subtotal + cleaning) * 100) / 100;
  const deposit = Math.round(total * effectiveDepositPct * 100) / 100;
  const amountDueNow = effectivePaymentMode === 'FULL' ? total : deposit;
  perNightEffective = Math.round(perNightEffective * 100) / 100;

  return {
    total,
    deposit,
    amountDueNow,
    paymentMode: effectivePaymentMode,
    perNightEffective,
    breakdown: {
      nights,
      subtotal,
      cleaningFee: cleaning,
    },
  };
}

export default calculatePrice;
