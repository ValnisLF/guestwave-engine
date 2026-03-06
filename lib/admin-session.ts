import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from '@infra/prisma';
import { ADMIN_SESSION_COOKIE } from '@/lib/auth-constants';

const SESSION_DURATION_DAYS = 30;

function getSessionExpiryDate(): Date {
  return new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
}

export async function createAdminSession(userId: string) {
  const token = randomUUID();
  const expiresAt = getSessionExpiryDate();

  await (prisma as any).adminSession.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (token) {
    await (prisma as any).adminSession.deleteMany({ where: { token } });
  }

  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function getAuthenticatedAdminUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!token) return null;

  const session = await (prisma as any).adminSession.findUnique({
    where: { token },
    include: {
      user: true,
    },
  });

  if (!session) return null;

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    await (prisma as any).adminSession.deleteMany({ where: { token } });
    cookieStore.delete(ADMIN_SESSION_COOKIE);
    return null;
  }

  return session.user as { id: string; email: string; role: 'ADMIN' | 'OWNER' };
}
