import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Heading, Text } from '@/components/ui/typography';
import {
  getDynamicSections,
  getPublicPropertySectionBySlug,
  hasSectionContent,
  valueOrFallback,
} from './_lib/page-content';
import { DynamicSection } from './_components/DynamicSection';

export default async function PropertyHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = await getPublicPropertySectionBySlug(slug, 'homePage');

  if (!property) notFound();

  const section = property.pageContent;
  const isEmpty = !hasSectionContent(section);
  const dynamicSections = getDynamicSections(section);

  return (
    <section className="space-y-6 py-6">
      {isEmpty ? (
        <Text>Contenido en preparación...</Text>
      ) : (
        <>
          <Heading level={1} tone="primary">{valueOrFallback(section?.overlayHeroTitle)}</Heading>
          <Text className="text-lg" tone="muted">{valueOrFallback(section?.overlayHeroSubtitle)}</Text>
          <Heading level={3}>{valueOrFallback(section?.shortBioTitle)}</Heading>
          <Text className="whitespace-pre-wrap">{valueOrFallback(section?.shorBioText)}</Text>
          <Heading level={3}>{valueOrFallback(section?.amenitiesTitle)}</Heading>
          <Text className="whitespace-pre-wrap">{valueOrFallback(section?.amenitiesText)}</Text>

          {dynamicSections.length > 0 ? (
            <div className="space-y-4">
              {dynamicSections.map((block, index) => (
                <DynamicSection key={`home-block-${index}`} block={block} />
              ))}
            </div>
          ) : null}
        </>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/properties/${slug}/reservas`}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Reservar ahora
        </Link>
        <Link
          href={`/properties/${slug}/la-propiedad`}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-primary hover:text-primary"
        >
          Ver detalles
        </Link>
      </div>
    </section>
  );
}
