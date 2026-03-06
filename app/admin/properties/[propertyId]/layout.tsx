import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { prisma } from '@infra/prisma';
import { getAuthenticatedAdminEmail, canManagePropertyByEmail } from '@/lib/admin-auth';

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ propertyId: string }> | { propertyId: string };
};

const menuItems = [
  { key: 'overview', label: 'Overview' },
  { key: 'datos', label: 'Datos' },
  { key: 'calendario', label: 'Calendario' },
  { key: 'tarifas', label: 'Tarifas' },
  { key: 'reservas', label: 'Reservas' },
  { key: 'fotos', label: 'Fotos' },
  { key: 'contenidos', label: 'Contenidos' },
  { key: 'ia', label: 'IA' },
  { key: 'ajuste', label: 'Ajuste' },
] as const;

export default async function PropertyWorkspaceLayout({ children, params }: LayoutProps) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const propertyId = resolvedParams.propertyId;

  const email = await getAuthenticatedAdminEmail('component');
  if (!email) {
    redirect('/admin/login');
  }

  const canManage = await canManagePropertyByEmail(email, propertyId);
  if (!canManage) {
    redirect('/admin');
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, name: true, slug: true },
  });

  if (!property) {
    redirect('/admin');
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 p-6 lg:grid-cols-[260px_1fr]">
        <aside className="sticky top-6 h-fit rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-4 border-b border-slate-100 pb-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">Property</div>
            <div className="font-semibold text-slate-900">{property.name}</div>
            <div className="text-xs text-slate-600">/{property.slug}</div>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.key}
                href={`/admin/properties/${property.id}/${item.key}`}
                className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-4 border-t border-slate-100 pt-3">
            <Link href="/admin" className="text-sm text-slate-600 hover:text-slate-900">
              ← Volver al panel
            </Link>
          </div>
        </aside>

        <main>{children}</main>
      </div>
    </div>
  );
}
