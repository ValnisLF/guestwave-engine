import { describe, expect, it } from 'vitest';
import { BOOKING_CODE_SAFE_ALPHABET, generateBookingCode } from './ids';

describe('generateBookingCode', () => {
  it("starts with 'FER-' when prefix is FER", () => {
    const code = generateBookingCode('FER');

    expect(code.startsWith('FER-')).toBe(true);
  });

  it('supports a 3-char prefix like ABC', () => {
    const code = generateBookingCode('ABC');

    expect(code).toMatch(/^ABC-\d{4}-[2-9A-HJ-NP-Z]{4}$/);
  });

  it('supports a 2-char prefix like XY', () => {
    const code = generateBookingCode('XY');

    expect(code).toMatch(/^XY-\d{4}-[2-9A-HJ-NP-Z]{4}$/);
  });

  it('normalizes lowercase prefix to uppercase', () => {
    const code = generateBookingCode('ab');

    expect(code.startsWith('AB-')).toBe(true);
  });

  it('throws when prefix has more than 3 characters', () => {
    expect(() => generateBookingCode('FERJ')).toThrow('booking prefix cannot exceed 3 characters');
  });

  it('uses only safe alphabet characters in random suffix', () => {
    const code = generateBookingCode('EF');
    const suffix = code.split('-')[2] ?? '';

    expect(suffix).toHaveLength(4);
    for (const char of suffix) {
      expect(BOOKING_CODE_SAFE_ALPHABET.includes(char)).toBe(true);
    }
  });
});
