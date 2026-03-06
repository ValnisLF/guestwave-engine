import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derivedKey}`;
}

export function verifyPassword(password: string, storedHash: string | null | undefined): boolean {
  if (!storedHash) return false;

  const [algorithm, salt, expectedHex] = storedHash.split('$');
  if (algorithm !== 'scrypt' || !salt || !expectedHex) return false;

  const derivedBuffer = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expectedHex, 'hex');

  if (derivedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(derivedBuffer, expectedBuffer);
}
