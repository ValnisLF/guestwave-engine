import { notFound } from 'next/navigation';
import Image from 'next/image';
import { prisma } from '@infra/prisma';
import { Heading, Text } from '@/components/ui/typography';
import { PropertyPageContentSchema, createEmptyPropertyPageContent } from '@/lib/schemas/property';

export default async function PropertyLaPropiedadPage({
  params,
}: Readonly<{
  params: Promise<{ slug: string }> | { slug: string };
}>) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const property = await prisma.property.findUnique({
    where: { slug: resolvedParams.slug },
    select: { pageContent: true },
  });

  if (!property) notFound();

  const parsed = PropertyPageContentSchema.safeParse(property.pageContent);
  const content = parsed.success ? parsed.data : createEmptyPropertyPageContent();
  const section = content.laPropiedad;

  return (
    <section className="space-y-6 py-6">
      {section.hero.image ? (
        <div className="relative h-[55vh] overflow-hidden rounded-2xl">
          <Image src={section.hero.image} alt={section.hero.title || 'La propiedad'} fill className="object-cover" unoptimized />
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute inset-0 flex items-center justify-center text-center text-white">
            <Heading level={1} className="text-white">{section.hero.title || 'La Propiedad'}</Heading>
          </div>
        </div>
      ) : null}

      {section.intro.title ? <Heading level={3}>{section.intro.title}</Heading> : null}
      {section.intro.paragraph ? <Text className="whitespace-pre-wrap">{section.intro.paragraph}</Text> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <Heading level={4}>{section.groundFloor.title || 'Planta baja'}</Heading>
          {section.groundFloor.paragraph ? <Text className="mt-2 whitespace-pre-wrap">{section.groundFloor.paragraph}</Text> : null}
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <Heading level={4}>{section.firstFloor.title || 'Primera planta'}</Heading>
          {section.firstFloor.paragraph ? <Text className="mt-2 whitespace-pre-wrap">{section.firstFloor.paragraph}</Text> : null}
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <Heading level={4}>{section.exterior.title || 'Exterior'}</Heading>
          {section.exterior.paragraph ? <Text className="mt-2 whitespace-pre-wrap">{section.exterior.paragraph}</Text> : null}
        </article>
      </div>

      {section.gallery.length > 0 ? (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {section.gallery.map((image, index) => (
            <figure key={`${image.url}-${index}`} className="mb-4 overflow-hidden rounded-xl border border-slate-200">
              <div className="relative aspect-[4/3]">
                <Image src={image.url} alt={image.alt ?? image.label ?? 'Galeria'} fill className="object-cover" unoptimized />
              </div>
            </figure>
          ))}
        </div>
      ) : null}
    </section>
  );
}
