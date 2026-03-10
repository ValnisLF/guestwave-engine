import { notFound } from 'next/navigation';
import Image from 'next/image';
import { prisma } from '@infra/prisma';
import { Heading, Text } from '@/components/ui/typography';
import { PropertyPageContentSchema, createEmptyPropertyPageContent } from '@/lib/schemas/property';

export default async function PropertyTurismoPage({
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
  const section = content.turismo;

  function renderCards(title: string, cards: Array<{ image: string; title: string; subtitle?: string; link?: string }>) {
    if (cards.length === 0) return null;
    return (
      <section className="space-y-3">
        <Heading level={3}>{title}</Heading>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {cards.map((card, index) => (
            <article key={`${card.title}-${index}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="relative h-44">
                <Image src={card.image} alt={card.title} fill className="object-cover" unoptimized />
              </div>
              <div className="p-4">
                <h4 className="font-semibold text-slate-900">{card.title}</h4>
                {card.subtitle ? <p className="mt-1 text-sm text-slate-600">{card.subtitle}</p> : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 py-6">
      {section.hero.image ? (
        <div className="relative h-[48vh] overflow-hidden rounded-2xl">
          <Image src={section.hero.image} alt={section.hero.title || 'Turismo'} fill className="object-cover" unoptimized />
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <Heading level={1} className="text-white">{section.hero.title || 'Turismo'}</Heading>
          </div>
        </div>
      ) : null}

      {renderCards('Que Hacer', section.queHacer)}
      {renderCards('Que Visitar', section.queVisitar)}
      {renderCards('Que Comer', section.queComer)}

      {section.queHacer.length === 0 && section.queVisitar.length === 0 && section.queComer.length === 0 ? (
        <Text>Contenido en preparación...</Text>
      ) : null}
    </section>
  );
}
