export type PricingInput = {
  basePricePerNight: number;
  nights: number;
  cleaningFee?: number;
  seasonMultiplier?: number; // default 1
  depositPct?: number; // 0..1
};

export type PricingResult = {
  total: number;
  deposit: number;
  perNightEffective: number;
};

export function calculatePrice(input: PricingInput): PricingResult {
  const base = input.basePricePerNight;
  const nights = Math.max(0, Math.floor(input.nights));
  const multiplier = input.seasonMultiplier ?? 1;
  const cleaning = input.cleaningFee ?? 0;
  const subtotal = base * multiplier * nights;
  const total = Math.round((subtotal + cleaning) * 100) / 100;
  const depositPct = input.depositPct ?? 0;
  const deposit = Math.round(total * depositPct * 100) / 100;
  const perNightEffective = nights > 0 ? Math.round((subtotal / nights) * 100) / 100 : 0;

  return { total, deposit, perNightEffective };
}

export default calculatePrice;
