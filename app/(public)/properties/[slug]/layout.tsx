import { notFound } from 'next/navigation';
import { Inter, Playfair_Display } from 'next/font/google';
import { prisma } from '@infra/prisma';
import {
  createEmptyPropertyPageContent,
  PropertyPageContentSchema,
} from '@/lib/schemas/property';
import { PropertyPublicFooter } from '@/components/public/PropertyPublicFooter';
import { PropertyPublicHeader } from '@/components/public/PropertyPublicHeader';
import { PreviewThemeOverrides } from './_components/PreviewThemeOverrides';

export const dynamic = 'force-dynamic';

const inter = Inter({ subsets: ['latin'], variable: '--font-body' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-display' });

const DEFAULT_PRIMARY = '#556B2F';
const DEFAULT_ACCENT = '#B25E41';
const DEFAULT_CREAM = '#FDFCF8';

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

  const parsed = PropertyPageContentSchema.safeParse(property.pageContent);
  const pageContent = parsed.success ? parsed.data : createEmptyPropertyPageContent();

  const themePrimary = typeof pageTheme?.primaryColor === 'string' ? pageTheme.primaryColor : null;
  const themeAccent = typeof pageTheme?.accentColor === 'string' ? pageTheme.accentColor : null;
  const themeCream = typeof pageTheme?.creamColor === 'string' ? pageTheme.creamColor : null;

  const primary = sanitizeHexColor(themePrimary ?? property.primaryColor, DEFAULT_PRIMARY);
  const accent = sanitizeHexColor(themeAccent ?? property.accentColor, DEFAULT_ACCENT);
  const cream = sanitizeHexColor(themeCream, DEFAULT_CREAM);
  const font = resolvePropertyFont(property.fontFamily);
  const propertyFontVar = font ? `--property-font:${font};` : '';

  return (
    <div className={`${inter.variable} ${playfair.variable} min-h-screen bg-[color:var(--cream)] text-slate-900`}>
      <style>{`:root{--primary:${primary};--accent:${accent};--primary-color:${primary};--accent-color:${accent};--cream:${cream};--terracotta:${DEFAULT_ACCENT};${propertyFontVar}}body{--primary:${primary};--accent:${accent};--primary-color:${primary};--accent-color:${accent};--cream:${cream};--terracotta:${DEFAULT_ACCENT};font-family:var(--property-font,var(--font-body));${propertyFontVar}}`}</style>
      <PreviewThemeOverrides />

      <PropertyPublicHeader
        slug={property.slug}
        title={property.name}
        logoUrl={pageContent.header.logoUrl}
      />

      <main className="w-full">{children}</main>

      <PropertyPublicFooter
        slug={property.slug}
        title={property.name}
        logoUrl={pageContent.footer.logoUrl}
        shortText={pageContent.footer.shortText}
        instagramUrl={pageContent.footer.instagramUrl}
        googleUrl={pageContent.footer.googleUrl}
        phone={pageContent.footer.phone}
        email={pageContent.footer.email}
        address={pageContent.footer.address}
      />
    </div>
  );
}
