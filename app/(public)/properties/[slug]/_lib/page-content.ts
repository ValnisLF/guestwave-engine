import { prisma } from '@infra/prisma';
import {
  mediaSectionBlockSchema,
  pageContentSchema,
  type MediaSectionBlock,
  type PageContentSectionKey,
} from '@/lib/schemas/property';

type PropertyPublicContent = {
  slug: string;
  name: string;
  imageUrls: string[];
  pageContent: Record<string, unknown> | null;
};

function toSectionRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
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

export function hasSectionContent(section: Record<string, unknown> | null): boolean {
  if (!section) return false;

  const hasAnyText = Object.values(section).some(
    (value) => typeof value === 'string' && value.trim().length > 0
  );

  if (hasAnyText) return true;

  const rawSections = section.sections;
  return Array.isArray(rawSections) && rawSections.length > 0;
}

export function valueOrFallback(value: unknown, fallback = 'Contenido en preparación...') {
  if (typeof value !== 'string') return fallback;
  return value && value.trim().length > 0 ? value : fallback;
}

export function getDynamicSections(section: Record<string, unknown> | null): MediaSectionBlock[] {
  if (!section) return [];

  const rawSections = section.sections;
  if (!Array.isArray(rawSections)) return [];

  return rawSections
    .map((block) => {
      const parsed = mediaSectionBlockSchema.safeParse(block);
      return parsed.success ? parsed.data : null;
    })
    .filter((block): block is MediaSectionBlock => block !== null);
}
