import { randomInt } from 'crypto';

const SAFE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const RANDOM_PART_LENGTH = 4;

function buildRandomPart(length: number): string {
  let out = '';

  for (let i = 0; i < length; i += 1) {
    out += SAFE_ALPHABET[randomInt(0, SAFE_ALPHABET.length)];
  }

  return out;
}

export function generateBookingCode(prefix: string): string {
  const normalizedPrefix = prefix.trim().toUpperCase();

  if (!normalizedPrefix) {
    throw new Error('booking prefix is required');
  }

  if (normalizedPrefix.length > 3) {
    throw new Error('booking prefix cannot exceed 3 characters');
  }

  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const randomPart = buildRandomPart(RANDOM_PART_LENGTH);

  return `${normalizedPrefix}-${year}${month}-${randomPart}`;
}

export const BOOKING_CODE_SAFE_ALPHABET = SAFE_ALPHABET;
