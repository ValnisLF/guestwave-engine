import { prisma } from '@infra/prisma';
import { pageContentSchema, type PageContentSectionKey } from '@/lib/schemas/property';

type PropertyPublicContent = {
  slug: string;
  name: string;
  imageUrls: string[];
  pageContent: Record<string, string> | null;
};

function toSectionRecord(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    out[key] = typeof raw === 'string' ? raw : '';
  }
  return out;
}

export async function getPublicPropertySectionBySlug(
  slug: string,
  section: PageContentSectionKey
): Promise<PropertyPublicContent | null> {
  const property = await prisma.property.findUnique({
    where: { slug },
    select: {
      slug: true,
      name: true,
      imageUrls: true,
      pageContent: true,
    },
  });

  if (!property) return null;

  const parsed = pageContentSchema.partial().safeParse(property.pageContent);
  const sectionData = parsed.success ? parsed.data[section] ?? null : null;

  return {
    slug: property.slug,
    name: property.name,
    imageUrls: property.imageUrls,
    pageContent: toSectionRecord(sectionData),
  };
}

export function hasSectionContent(section: Record<string, string> | null): boolean {
  if (!section) return false;
  return Object.values(section).some((value) => value.trim().length > 0);
}

export function valueOrFallback(value: string | undefined, fallback = 'Contenido en preparación...') {
  return value && value.trim().length > 0 ? value : fallback;
}
