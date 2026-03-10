import { notFound } from 'next/navigation';
import { Heading, Text } from '@/components/ui/typography';
import {
  getDynamicSections,
  getPublicPropertySectionBySlug,
  hasSectionContent,
  valueOrFallback,
} from '../_lib/page-content';
import { DynamicSection } from '../_components/DynamicSection';

export default async function PropertyContactoPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const property = await getPublicPropertySectionBySlug(resolvedParams.slug, 'contacto');

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

          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-lg border border-slate-200 bg-white p-4">
              <Heading level={4}>Telefono</Heading>
              <Text className="mt-2">{valueOrFallback(section?.telefono)}</Text>
            </article>
            <article className="rounded-lg border border-slate-200 bg-white p-4">
              <Heading level={4}>Email</Heading>
              <Text className="mt-2">{valueOrFallback(section?.email)}</Text>
            </article>
            <article className="rounded-lg border border-slate-200 bg-white p-4">
              <Heading level={4}>Direccion</Heading>
              <Text className="mt-2">{valueOrFallback(section?.direccion)}</Text>
            </article>
          </div>

          {dynamicSections.length > 0 ? (
            <div className="space-y-4">
              {dynamicSections.map((block, index) => (
                <DynamicSection key={`contacto-block-${index}`} block={block} />
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
