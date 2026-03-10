'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const propertyNavItems = [
  { href: '', label: 'Home' },
  { href: '/la-propiedad', label: 'La Propiedad' },
  { href: '/turismo', label: 'Turismo' },
  { href: '/tarifas', label: 'Tarifas' },
  { href: '/contacto', label: 'Contacto' },
  { href: '/reservas', label: 'Reservas' },
] as const;

export function PublicHeaderNav() {
  const pathname = usePathname() ?? '';
  const [isOpen, setIsOpen] = useState(false);
  const navContainerRef = useRef<HTMLDivElement | null>(null);
  const segments = pathname.split('/').filter(Boolean);

  const isPropertyRoute = segments[0] === 'properties' && Boolean(segments[1]);
  const propertySlug = isPropertyRoute ? segments[1] : null;

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      if (!navContainerRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen]);

  if (propertySlug) {
    const links = propertyNavItems.map((item) => {
      const href = `/properties/${propertySlug}${item.href}`;
      const isActive = pathname === href;

      return { href, label: item.label, isActive };
    });

    return (
      <div ref={navContainerRef} className="relative">
        <nav className="hidden md:flex flex-wrap gap-2">
          {links.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                item.isActive
                  ? 'border-primary text-primary'
                  : 'border-slate-200 text-slate-600 hover:border-primary hover:text-primary'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          aria-label="Abrir menu de navegacion"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center justify-center rounded-md border border-slate-300 p-2 text-slate-700 transition-colors hover:border-primary hover:text-primary md:hidden"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

        {isOpen && (
          <nav className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-lg md:hidden">
            {links.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                  item.isActive
                    ? 'bg-slate-100 text-primary'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-primary'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    );
  }

  const isPropertiesActive = pathname.startsWith('/properties');

  return (
    <div ref={navContainerRef} className="relative">
      <nav className="hidden md:flex gap-8">
        <Link
          href="/properties"
          className={`transition-colors ${isPropertiesActive ? 'text-primary' : 'text-slate-600 hover:text-primary'}`}
        >
          Properties
        </Link>
      </nav>

      <button
        type="button"
        aria-label="Abrir menu de navegacion"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center justify-center rounded-md border border-slate-300 p-2 text-slate-700 transition-colors hover:border-primary hover:text-primary md:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {isOpen && (
        <nav className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-slate-200 bg-white p-2 shadow-lg md:hidden">
          <Link
            href="/properties"
            className={`block rounded-md px-3 py-2 text-sm transition-colors ${
              isPropertiesActive
                ? 'bg-slate-100 text-primary'
                : 'text-slate-700 hover:bg-slate-50 hover:text-primary'
            }`}
          >
            Properties
          </Link>
        </nav>
      )}
    </div>
  );
}