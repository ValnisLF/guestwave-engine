import { describe, it, expect } from 'vitest';
import { calculatePrice } from './pricing';

describe('pricing.calculatePrice', () => {
  it('calculates total without multiplier and deposit', () => {
    const res = calculatePrice({ basePricePerNight: 100, nights: 3, cleaningFee: 50 });
    expect(res.total).toBe(350);
    expect(res.deposit).toBe(0);
    expect(res.perNightEffective).toBe(100);
  });

  it('applies season multiplier and deposit percentage', () => {
    const res = calculatePrice({ basePricePerNight: 80, nights: 4, cleaningFee: 20, seasonMultiplier: 1.25, depositPct: 0.25 });
    // subtotal = 80 * 1.25 * 4 = 400
    // total = 400 + 20 = 420
    expect(res.total).toBe(420);
    expect(res.deposit).toBe(105);
    expect(res.perNightEffective).toBe(100);
  });

  it('handles zero nights gracefully', () => {
    const res = calculatePrice({ basePricePerNight: 100, nights: 0, cleaningFee: 10 });
    expect(res.total).toBe(10);
    expect(res.perNightEffective).toBe(0);
  });
});

describe('pricing.calculatePrice with SeasonRates', () => {
  const startDate = new Date('2025-03-01');
  const endDate = new Date('2025-03-04');

  it('applies seasonRate multiplier when all nights fall in one season', () => {
    // March 1-3 (3 nights) all in high season (1.5x multiplier)
    const seasonRates = [
      {
        id: 's1',
        startDate: new Date('2025-03-01'),
        endDate: new Date('2025-03-31'),
        priceMultiplier: 1.5,
      },
    ];

    const res = calculatePrice({
      basePricePerNight: 100,
      nights: 3,
      cleaningFee: 50,
      seasonRates,
      startDate,
      endDate,
      depositPct: 0.2,
    });

    // subtotal = 100 * 1.5 * 3 = 450
    // total = 450 + 50 = 500
    expect(res.total).toBe(500);
    expect(res.deposit).toBe(100);
    expect(res.perNightEffective).toBe(150);
  });

  it('applies fixedPrice from seasonRate when present', () => {
    // Booking entirely within a fixed-price season (e.g., $85/night override)
    const seasonRates = [
      {
        id: 's1',
        startDate: new Date('2025-03-01'),
        endDate: new Date('2025-03-31'),
        fixedPrice: 85,
      },
    ];

    const res = calculatePrice({
      basePricePerNight: 100,
      nights: 3,
      cleaningFee: 30,
      seasonRates,
      startDate,
      endDate,
    });

    // subtotal = 85 * 3 = 255 (fixedPrice overrides basePrice)
    // total = 255 + 30 = 285
    expect(res.total).toBe(285);
    expect(res.perNightEffective).toBe(85);
  });

  it('calculates proportional price when booking spans multiple seasons', () => {
    // High season March 1-15 (1.5x), Low season March 16-31 (0.8x)
    // Booking: March 10-17 means:
    //   - March 10-15: 6 nights at 1.5x = 100*1.5*6 = 900
    //   - March 16-17: 1 night at 0.8x = 100*0.8*1 = 80
    //   - Total: 980

    const seasonRates = [
      {
        id: 'high',
        startDate: new Date('2025-03-01'),
        endDate: new Date('2025-03-15'),
        priceMultiplier: 1.5,
      },
      {
        id: 'low',
        startDate: new Date('2025-03-16'),
        endDate: new Date('2025-03-31'),
        priceMultiplier: 0.8,
      },
    ];

    const res = calculatePrice({
      basePricePerNight: 100,
      nights: 7,
      cleaningFee: 50,
      seasonRates,
      startDate: new Date('2025-03-10'),
      endDate: new Date('2025-03-17'),
    });

    // 6 nights @ 150 = 900 + 1 night @ 80 = 80, subtotal = 980
    // total = 980 + 50 = 1030
    expect(res.total).toBe(1030);
    expect(res.perNightEffective).toBeCloseTo(140, 1); // 980/7 ≈ 140
  });

  it('falls back to seasonMultiplier when no seasonRates match', () => {
    // No seasons defined, should fall back to seasonMultiplier
    const res = calculatePrice({
      basePricePerNight: 100,
      nights: 3,
      seasonMultiplier: 1.2,
      cleaningFee: 50,
    });

    // subtotal = 100 * 1.2 * 3 = 360
    // total = 360 + 50 = 410
    expect(res.total).toBe(410);
  });

  it('uses basePrice as fallback when no matching seasonRate', () => {
    // Booking outside season range, should use basePrice
    const seasonRates = [
      {
        id: 's1',
        startDate: new Date('2025-04-01'),
        endDate: new Date('2025-04-30'),
        priceMultiplier: 2.0,
      },
    ];

    const res = calculatePrice({
      basePricePerNight: 100,
      nights: 3,
      cleaningFee: 50,
      seasonRates,
      startDate: new Date('2025-03-01'),
      endDate: new Date('2025-03-04'),
    });

    // No matching season, use basePrice
    // subtotal = 100 * 1 * 3 = 300
    // total = 300 + 50 = 350
    expect(res.total).toBe(350);
    expect(res.perNightEffective).toBe(100);
  });
});
