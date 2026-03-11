'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';

type PropertyPublicHeaderProps = {
  slug: string;
  title?: string;
  logoUrl?: string;
};

const navItems = [
  { href: '', label: 'Home' },
  { href: '/la-propiedad', label: 'La Propiedad' },
  { href: '/turismo', label: 'Turismo' },
  { href: '/tarifas', label: 'Tarifas' },
  { href: '/contacto', label: 'Contacto' },
];

export function PropertyPublicHeader({ slug, title, logoUrl }: Readonly<PropertyPublicHeaderProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname() ?? '';

  const links = useMemo(
    () => navItems.map((item) => ({ ...item, fullHref: `/properties/${slug}${item.href}` })),
    [slug]
  );

  return (
    <header className="sticky top-0 left-0 right-0 z-50 border-b border-[color:var(--primary-color)]/15 bg-[color:var(--cream,#fdfaf6)]/90 backdrop-blur-md">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href={`/properties/${slug}`} className="flex items-center gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={title || 'Logo'}
              className="h-10 w-10 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--primary-color)]/15 text-[color:var(--primary-color)]">
              EG
            </span>
          )}
          <span className="text-xl font-semibold tracking-tight text-[color:var(--primary-color)]">
            {title || 'GuestWave'}
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
          {links.map((item) => {
            const isActive = pathname === item.fullHref;
            return (
              <Link
                key={item.label}
                href={item.fullHref}
                className={isActive ? 'text-[color:var(--primary-color)]' : 'text-slate-700 transition-colors hover:text-[color:var(--primary-color)]'}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:block">
          <Link
            href={`/properties/${slug}/reservas`}
            className="rounded-full bg-[color:var(--terracotta,#b25e41)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Reservar Ahora
          </Link>
        </div>

        <button
          type="button"
          aria-label="Abrir menu"
          className="rounded-md border border-slate-300 p-2 md:hidden"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>

      {isOpen ? (
        <nav className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-2">
            {links.map((item) => {
              const isActive = pathname === item.fullHref;
              return (
                <Link
                  key={item.label}
                  href={item.fullHref}
                  onClick={() => setIsOpen(false)}
                  className={isActive ? 'rounded-md bg-slate-100 px-3 py-2 text-[color:var(--primary-color)]' : 'rounded-md px-3 py-2 text-slate-700'}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href={`/properties/${slug}/reservas`}
              onClick={() => setIsOpen(false)}
              className="mt-1 rounded-md bg-[color:var(--terracotta,#b25e41)] px-3 py-2 text-center font-semibold text-white"
            >
              Reservar Ahora
            </Link>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
