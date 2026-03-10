import { notFound } from 'next/navigation';
import Image from 'next/image';
import { prisma } from '@infra/prisma';
import { Heading, Text } from '@/components/ui/typography';
import { PropertyPageContentSchema, createEmptyPropertyPageContent } from '@/lib/schemas/property';

export default async function PropertyContactoPage({
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
  const section = content.contacto;

  return (
    <section className="space-y-6 py-6">
      {section.hero.image ? (
        <div className="relative h-[42vh] overflow-hidden rounded-2xl">
          <Image src={section.hero.image} alt={section.hero.title || 'Contacto'} fill className="object-cover" unoptimized />
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <Heading level={1} className="text-white">{section.hero.title || 'Contacto'}</Heading>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <Heading level={3}>{section.intro.title || 'Estamos para ayudarte'}</Heading>
        <Text className="whitespace-pre-wrap">{section.intro.paragraph || ''}</Text>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <Heading level={4}>Telefono</Heading>
          <Text className="mt-2">{section.phone || '-'}</Text>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <Heading level={4}>Email</Heading>
          <Text className="mt-2">{section.email || '-'}</Text>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <Heading level={4}>Direccion</Heading>
          <Text className="mt-2">{section.address || '-'}</Text>
        </article>
      </div>
    </section>
  );
}
