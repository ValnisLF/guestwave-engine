import { prisma } from '@infra/prisma';

export type PropertyDynamicPageKey = 'laPropiedad' | 'turismo' | 'tarifas' | 'contacto';

type DynamicSection = {
  title?: string;
  text: string;
  imageUrl?: string;
};

export type DynamicPageData = {
  propertyName: string;
  title: string;
  subtitle: string;
  description: string;
  heroImageUrl?: string;
  gallery: string[];
  sections: DynamicSection[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function resolvePageNode(content: unknown, key: PropertyDynamicPageKey) {
  const root = asRecord(content);
  if (!root) return null;

  const keyVariants: string[] =
    key === 'laPropiedad'
      ? ['laPropiedad', 'la-propiedad', 'la_propiedad', 'property']
      : key === 'turismo'
        ? ['turismo', 'tourism']
        : key === 'tarifas'
          ? ['tarifas', 'pricing', 'rates']
          : ['contacto', 'contact', 'contactoPage'];

  for (const candidate of keyVariants) {
    const node = asRecord(root[candidate]);
    if (node) return node;
  }

  return null;
}

function resolveSections(node: Record<string, unknown> | null): DynamicSection[] {
  if (!node) return [];

  const rawSections = node.sections;
  if (!Array.isArray(rawSections)) return [];

  return rawSections.reduce<DynamicSection[]>((acc, item) => {
      const section = asRecord(item);
      if (!section) return acc;

      const text =
        asString(section.text) ??
        asString(section.description) ??
        asString(section.body) ??
        asString(section.content);

      if (!text) return acc;

      acc.push({
        title: asString(section.title) ?? undefined,
        text,
        imageUrl: asString(section.imageUrl) ?? asString(section.image) ?? undefined,
      });

      return acc;
    }, []);
}

export async function getPropertyDynamicPageData(
  slug: string,
  key: PropertyDynamicPageKey,
  defaults: {
    title: string;
    subtitle: string;
    description: string;
  }
): Promise<DynamicPageData | null> {
  const property = await prisma.property.findUnique({
    where: { slug },
    select: {
      name: true,
      description: true,
      imageUrls: true,
      pageContent: true,
    },
  });

  if (!property) return null;

  const pageNode = resolvePageNode(property.pageContent, key);
  const gallery = asStringArray(pageNode?.gallery) || [];

  return {
    propertyName: property.name,
    title: asString(pageNode?.title) ?? defaults.title,
    subtitle: asString(pageNode?.subtitle) ?? defaults.subtitle,
    description:
      asString(pageNode?.description) ?? asString(property.description) ?? defaults.description,
    heroImageUrl:
      asString(pageNode?.heroImageUrl) ??
      asString(pageNode?.imageUrl) ??
      asString(pageNode?.heroImage) ??
      property.imageUrls[0] ??
      undefined,
    gallery: gallery.length > 0 ? gallery : property.imageUrls.slice(1, 5),
    sections: resolveSections(pageNode),
  };
}
