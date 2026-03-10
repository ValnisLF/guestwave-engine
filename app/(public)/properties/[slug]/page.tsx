import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@infra/prisma';
import Image from 'next/image';
import { Text } from '@/components/ui/typography';
import {
  PropertyPageContentSchema,
  createEmptyPropertyPageContent,
} from '@/lib/schemas/property';

export default async function PropertyHomePage({
  params,
}: Readonly<{
  params: Promise<{ slug: string }>;
}>) {
  const { slug } = await params;
  const property = await prisma.property.findUnique({
    where: { slug },
    select: {
      slug: true,
      pageContent: true,
    },
  });

  if (!property) notFound();

  const parsed = PropertyPageContentSchema.safeParse(property.pageContent);
  const pageContent = parsed.success ? parsed.data : createEmptyPropertyPageContent();
  const homepage = pageContent.homepage;

  const themeVars: React.CSSProperties = {
    ['--primary-color' as string]: pageContent.theme?.primaryColor ?? 'var(--primary)',
    ['--accent-color' as string]: pageContent.theme?.accentColor ?? 'var(--accent)',
  };

  return (
    <section className="space-y-6 py-6" style={themeVars}>
      <section className="relative h-[70vh] overflow-hidden rounded-2xl">
        {homepage.hero.image ? (
          <Image src={homepage.hero.image} alt={homepage.hero.title || 'Hero'} fill className="object-cover" unoptimized />
        ) : null}
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center text-white">
          <h1 className="text-4xl font-semibold md:text-6xl">{homepage.hero.title || 'Tu proxima escapada'}</h1>
          {homepage.hero.subtitle ? <p className="mt-3 max-w-2xl text-lg text-white/90">{homepage.hero.subtitle}</p> : null}
        </div>
      </section>

      <section className="mx-auto max-w-3xl space-y-3">
        {homepage.intro.title ? <h2 className="text-2xl font-semibold text-primary">{homepage.intro.title}</h2> : null}
        {homepage.intro.paragraph ? <Text className="whitespace-pre-wrap text-slate-700">{homepage.intro.paragraph}</Text> : null}
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-xl font-semibold text-primary">{homepage.amenities.title || 'Amenities'}</h3>
          {homepage.amenities.paragraph ? <Text className="mt-2 whitespace-pre-wrap">{homepage.amenities.paragraph}</Text> : null}
          {homepage.amenities.items && homepage.amenities.items.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-700">
              {homepage.amenities.items.map((item, idx) => (
                <li key={`${item}-${idx}`}>{item}</li>
              ))}
            </ul>
          ) : null}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-xl font-semibold text-primary">{homepage.availability.title || 'Disponibilidad'}</h3>
          {homepage.availability.paragraph ? <Text className="mt-2 whitespace-pre-wrap">{homepage.availability.paragraph}</Text> : null}
        </article>
      </section>

      {homepage.areaCarousel.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-2xl font-semibold text-primary">La Zona</h3>
          <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {homepage.areaCarousel.map((item, idx) => (
              <article key={`${item.url}-${idx}`} className="w-[320px] shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="relative h-48">
                  <Image src={item.url} alt={item.title ?? 'Zona'} fill className="object-cover" unoptimized />
                </div>
                <div className="p-4">
                  {item.title ? <h4 className="font-semibold text-slate-900">{item.title}</h4> : null}
                  {item.subtitle ? <p className="mt-1 text-sm text-slate-600">{item.subtitle}</p> : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

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
