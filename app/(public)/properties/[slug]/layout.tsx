import { notFound } from 'next/navigation';
import { prisma } from '@infra/prisma';
import { PreviewThemeOverrides } from './_components/PreviewThemeOverrides';

const DEFAULT_PRIMARY = '#2563EB';
const DEFAULT_ACCENT = '#0F766E';

const fontFamilyMap: Record<string, string> = {
  Inter: "'Inter', Arial, Helvetica, sans-serif",
  Lora: "'Lora', Georgia, serif",
  Montserrat: "'Montserrat', Arial, Helvetica, sans-serif",
  Poppins: "'Poppins', Arial, Helvetica, sans-serif",
  'Playfair Display': "'Playfair Display', Georgia, serif",
};

function sanitizeHexColor(color: string | null | undefined, fallback: string) {
  if (!color) return fallback;
  const trimmed = color.trim();
  return /^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(trimmed) ? trimmed : fallback;
}

function resolvePropertyFont(fontFamily: string | null | undefined) {
  if (!fontFamily) return null;
  return fontFamilyMap[fontFamily.trim()] ?? null;
}

type PropertyLayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{ slug: string }> | { slug: string };
}>;

export default async function PropertyPublicLayout({ children, params }: PropertyLayoutProps) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const { slug } = resolvedParams;

  const property = await prisma.property.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      primaryColor: true,
      accentColor: true,
      fontFamily: true,
      pageContent: true,
    },
  });

  if (!property) {
    notFound();
  }

  const pageTheme =
    property.pageContent && typeof property.pageContent === 'object' && !Array.isArray(property.pageContent)
      ? ((property.pageContent as Record<string, unknown>).theme as Record<string, unknown> | undefined)
      : undefined;

  const themePrimary = typeof pageTheme?.primaryColor === 'string' ? pageTheme.primaryColor : null;
  const themeAccent = typeof pageTheme?.accentColor === 'string' ? pageTheme.accentColor : null;

  const primary = sanitizeHexColor(themePrimary ?? property.primaryColor, DEFAULT_PRIMARY);
  const accent = sanitizeHexColor(themeAccent ?? property.accentColor, DEFAULT_ACCENT);
  const font = resolvePropertyFont(property.fontFamily);
  const propertyFontVar = font ? `--property-font:${font};` : '';

  return (
    <div className="space-y-4 py-6">
      <style>{`:root{--primary:${primary};--accent:${accent};--primary-color:${primary};--accent-color:${accent};${propertyFontVar}}body{--primary:${primary};--accent:${accent};--primary-color:${primary};--accent-color:${accent};${propertyFontVar}}`}</style>
      <PreviewThemeOverrides />
      {children}
    </div>
  );
}
