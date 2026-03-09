import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@infra/prisma';

type PropertyLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }> | { slug: string };
};

const navItems = [
  { href: '', label: 'Home' },
  { href: '/la-propiedad', label: 'La Propiedad' },
  { href: '/turismo', label: 'Turismo' },
  { href: '/tarifas', label: 'Tarifas' },
  { href: '/contacto', label: 'Contacto' },
  { href: '/reservas', label: 'Reservas' },
] as const;

export default async function PropertyPublicLayout({ children, params }: PropertyLayoutProps) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const { slug } = resolvedParams;

  const property = await prisma.property.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true },
  });

  if (!property) {
    notFound();
  }

  return (
    <div className="space-y-4 py-6">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h1 className="text-xl font-semibold text-slate-900">{property.name}</h1>
          <p className="text-sm text-slate-500">/{property.slug}</p>
        </div>

        <nav className="flex flex-wrap gap-2">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={`/properties/${property.slug}${item.href}`}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:border-primary hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      {children}
    </div>
  );
}
