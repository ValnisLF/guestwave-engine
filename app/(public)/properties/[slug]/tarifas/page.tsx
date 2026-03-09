import { notFound } from 'next/navigation';
import { Heading, Text } from '@/components/ui/typography';
import {
  getPublicPropertySectionBySlug,
  hasSectionContent,
  valueOrFallback,
} from '../_lib/page-content';

export default async function PropertyTarifasPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const property = await getPublicPropertySectionBySlug(resolvedParams.slug, 'tarifas');

  if (!property) notFound();

  const section = property.pageContent;
  const isEmpty = !hasSectionContent(section);

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

          <div className="grid gap-4 md:grid-cols-2">
            <article className="rounded-lg border border-slate-200 bg-white p-4">
              <Heading level={4}>Temporada Alta</Heading>
              <Text className="mt-2 whitespace-pre-wrap">{valueOrFallback(section?.temporadaAlta)}</Text>
            </article>
            <article className="rounded-lg border border-slate-200 bg-white p-4">
              <Heading level={4}>Temporada Media</Heading>
              <Text className="mt-2 whitespace-pre-wrap">{valueOrFallback(section?.temporadaMedia)}</Text>
            </article>
            <article className="rounded-lg border border-slate-200 bg-white p-4">
              <Heading level={4}>Temporada Baja</Heading>
              <Text className="mt-2 whitespace-pre-wrap">{valueOrFallback(section?.temporadaBaja)}</Text>
            </article>
            <article className="rounded-lg border border-slate-200 bg-white p-4">
              <Heading level={4}>Politicas</Heading>
              <Text className="mt-2 whitespace-pre-wrap">{valueOrFallback(section?.politicas)}</Text>
            </article>
          </div>
        </>
      )}
    </section>
  );
}
