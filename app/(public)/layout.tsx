import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { prisma } from '@infra/prisma';

export const metadata: Metadata = {
  title: 'GuestWave - Premium Property Rentals',
  description: 'Find and book beautiful properties for your next vacation',
};

const DEFAULT_PRIMARY = '#2563EB';
const DEFAULT_ACCENT = '#0F766E';

function extractSlugFromPath(pathname: string | null): string | null {
  if (!pathname) return null;

  const match = pathname.match(/^\/properties\/([^/?#]+)/);
  if (!match) return null;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function sanitizeHexColor(color: string | null | undefined, fallback: string) {
  if (!color) return fallback;
  const trimmed = color.trim();
  return /^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(trimmed) ? trimmed : fallback;
}

async function getPublicPropertyThemeBySlug(slug: string | null) {
  if (!slug) {
    return {
      primaryColor: DEFAULT_PRIMARY,
      accentColor: DEFAULT_ACCENT,
    };
  }

  const property = await prisma.property.findUnique({
    where: { slug },
    select: {
      primaryColor: true,
      accentColor: true,
    },
  });

  return {
    primaryColor: property?.primaryColor ?? DEFAULT_PRIMARY,
    accentColor: property?.accentColor ?? DEFAULT_ACCENT,
  };
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerStore = await headers();
  const pathname =
    headerStore.get('x-pathname') ??
    headerStore.get('x-invoke-path') ??
    headerStore.get('next-url') ??
    null;
  const slug = extractSlugFromPath(pathname);
  const theme = await getPublicPropertyThemeBySlug(slug);
  const primary = sanitizeHexColor(theme.primaryColor, DEFAULT_PRIMARY);
  const accent = sanitizeHexColor(theme.accentColor, DEFAULT_ACCENT);

  return (
    <>
      <style>{`body{--primary:${primary};--accent:${accent};}`}</style>
      <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <a href="/" className="text-2xl font-bold text-primary">
              GuestWave
            </a>
            <nav className="hidden md:flex space-x-8">
              <a href="/properties" className="text-slate-600 hover:text-primary transition-colors">
                Properties
              </a>
              <a href="/about" className="text-slate-600 hover:text-primary transition-colors">
                About
              </a>
              <a href="/contact" className="text-slate-600 hover:text-primary transition-colors">
                Contact
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-slate-900">
        {children}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-slate-600 text-sm">
            © 2026 GuestWave. All rights reserved.
          </p>
        </div>
      </footer>
      </div>
    </>
  );
}
