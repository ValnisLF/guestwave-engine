import { prisma } from '@infra/prisma';
import { getAuthenticatedAdminUser } from '@/lib/admin-session';

export async function getAuthenticatedAdminEmail(_source: 'component' | 'action' = 'component') {
  const user = await getAuthenticatedAdminUser();
  return user?.email ?? null;
}

export async function getAuthenticatedAdminIdentity() {
  return getAuthenticatedAdminUser() as Promise<
    | { id: string; email: string; role: 'ADMIN' | 'OWNER' }
    | null
  >;
}

export async function ensureAppUserByEmail(email: string, role: 'ADMIN' | 'OWNER' = 'OWNER') {
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) return existing;

  return prisma.user.create({
    data: {
      email: normalizedEmail,
      role,
    },
  });
}

export async function getAuthorizedPropertiesByEmail(
  email: string
): Promise<Array<{ id: string; name: string; slug: string }>> {
  const user = await (prisma as any).user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      memberships: {
        include: {
          property: true,
        },
      },
    },
  });

  if (!user) return [];

  return user.memberships.map((membership: any) => ({
    id: membership.property.id,
    name: membership.property.name,
    slug: membership.property.slug,
  }));
}

export async function canManagePropertyByEmail(email: string, propertyId: string) {
  const user = await (prisma as any).user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, role: true },
  });

  if (!user) return false;

  if (user.role === 'ADMIN') return true;

  const membership = await (prisma as any).propertyMembership.findUnique({
    where: {
      userId_propertyId: {
        userId: user.id,
        propertyId,
      },
    },
    select: { id: true },
  });

  return Boolean(membership);
}

export async function isSystemAdminByEmail(email: string) {
  const user = await (prisma as any).user.findUnique({
    where: { email: email.toLowerCase() },
    select: { role: true },
  });

  return user?.role === 'ADMIN';
}

export async function hasAnyAdminUser() {
  const count = await prisma.user.count();
  return count > 0;
}
