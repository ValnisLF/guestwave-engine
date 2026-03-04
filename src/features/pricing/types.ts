export type SeasonRate = {
  id: string;
  startDate: Date;
  endDate: Date;
  priceMultiplier?: number;
  fixedPrice?: number | null;
  paymentMode?: 'FULL' | 'DEPOSIT' | null;
  depositPercentage?: number | null;
};

export type DailyRate = {
  date: Date;
  basePricePerNight: number;
  seasonMultiplier?: number;
  fixedPrice?: number | null;
};

export type PricingInput = {
  basePricePerNight: number;
  nights: number;
  cleaningFee?: number;
  seasonMultiplier?: number; // default 1, used if no seasonRates
  depositPct?: number; // 0..1
  paymentMode?: 'FULL' | 'DEPOSIT';
  seasonRates?: SeasonRate[]; // optional seasonal rates
  startDate?: Date; // required if seasonRates provided
  endDate?: Date; // required if seasonRates provided
};

export type PricingResult = {
  total: number;
  deposit: number;
  amountDueNow: number;
  paymentMode: 'FULL' | 'DEPOSIT';
  perNightEffective: number;
  breakdown?: {
    nights: number;
    subtotal: number;
    cleaningFee: number;
  };
};
