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
