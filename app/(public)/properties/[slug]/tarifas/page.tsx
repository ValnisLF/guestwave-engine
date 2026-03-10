import { notFound } from 'next/navigation';
import Image from 'next/image';
import { prisma } from '@infra/prisma';
import { Heading, Text } from '@/components/ui/typography';
import { PropertyPageContentSchema, createEmptyPropertyPageContent } from '@/lib/schemas/property';

export default async function PropertyTarifasPage({
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
  const section = content.tarifas;

  return (
    <section className="space-y-6 py-6">
      {section.hero.image ? (
        <div className="relative h-[46vh] overflow-hidden rounded-2xl">
          <Image src={section.hero.image} alt={section.hero.title || 'Tarifas'} fill className="object-cover" unoptimized />
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <Heading level={1} className="text-white">{section.hero.title || 'Tarifas'}</Heading>
          </div>
        </div>
      ) : null}

      {section.intro.title ? <Heading level={3}>{section.intro.title}</Heading> : null}
      {section.intro.paragraph ? <Text className="whitespace-pre-wrap">{section.intro.paragraph}</Text> : null}

      <div className="grid gap-4 md:grid-cols-3">
        {section.offers.map((offer, idx) => (
          <article key={`${offer.title}-${idx}`} className="rounded-lg border border-slate-200 bg-white p-4">
            <Heading level={4}>{offer.title}</Heading>
            {offer.subtitle ? <Text className="mt-2 whitespace-pre-wrap">{offer.subtitle}</Text> : null}
          </article>
        ))}
      </div>

      {section.rules && section.rules.length > 0 ? (
        <div>
          <Heading level={4}>Reglas</Heading>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
            {section.rules.map((rule, idx) => (
              <li key={`${rule}-${idx}`}>{rule}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {section.policy && section.policy.length > 0 ? (
        <div>
          <Heading level={4}>Politica</Heading>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
            {section.policy.map((rule, idx) => (
              <li key={`${rule}-${idx}`}>{rule}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
