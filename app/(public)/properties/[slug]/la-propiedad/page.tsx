import Image from 'next/image';
import { notFound } from 'next/navigation';
import { prisma } from '@infra/prisma';
import { Reveal } from '@/components/public/Reveal';
import {
  PropertyPageContentSchema,
  createEmptyPropertyPageContent,
} from '@/lib/schemas/property';
import { Metadata } from 'next';
import { GalleryFilter } from './_components/GalleryFilter';
import { FloorSection } from './_components/FloorSection';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  if (!slug) {
    return { title: 'Property Not Found' };
  }

  const property = await prisma.property.findUnique({
    where: { slug },
  });

  if (!property) return { title: 'Property Not Found' };

  return {
    title: `${property.name} · La Propiedad - GuestWave`,
    description: property.description || 'Discover this amazing property',
  };
}

export default async function PropertyDetailsPage({
  params,
}: Readonly<{
  params: Promise<{ slug: string }>;
}>) {
  const { slug } = await params;

  if (!slug) {
    notFound();
  }

  const property = await prisma.property.findUnique({
    where: { slug },
    select: {
      slug: true,
      pageContent: true,
    },
  });

  if (!property) {
    notFound();
  }

  const parsed = PropertyPageContentSchema.safeParse(property.pageContent);
  const pageContent = parsed.success ? parsed.data : createEmptyPropertyPageContent();
  const laPropiedad = pageContent.laPropiedad;

  const themeVars: React.CSSProperties = {
    ['--primary-color' as string]: pageContent.theme?.primaryColor ?? 'var(--primary)',
    ['--accent-color' as string]: pageContent.theme?.accentColor ?? 'var(--accent)',
    ...(pageContent.theme?.primaryColor ? { ['--primary' as string]: pageContent.theme.primaryColor } : {}),
  };

  return (
    <div style={themeVars} className="w-full bg-[color:var(--cream)] pb-16 text-slate-900">
      {/* Hero Section */}
      <section className="relative min-h-[50vh] w-full overflow-hidden">
        {laPropiedad.hero.image ? (
          <Image
            src={laPropiedad.hero.image}
            alt={laPropiedad.hero.title || 'La Propiedad'}
            fill
            className="object-cover"
            unoptimized
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#2f3f1d] to-[#546a2f]" />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/55" />

        <div className="relative z-10 mx-auto flex min-h-[50vh] w-full max-w-6xl flex-col items-center justify-center px-6 text-center">
          <Reveal>
            <h1 className="max-w-4xl font-[var(--font-display)] text-5xl font-semibold leading-tight text-white md:text-7xl">
              {laPropiedad.hero.title || 'La Propiedad'}
            </h1>
          </Reveal>
        </div>
      </section>

      {/* Intro Section */}
      {laPropiedad.intro.title || laPropiedad.intro.paragraph ? (
        <section className="mx-auto mt-20 w-full max-w-4xl px-6 text-center">
          <Reveal>
            {laPropiedad.intro.title ? (
              <h2 className="font-[var(--font-display)] text-3xl font-semibold leading-tight text-[color:var(--primary-color)] md:text-4xl">
                {laPropiedad.intro.title}
              </h2>
            ) : null}
            {laPropiedad.intro.paragraph ? (
              <p className="mx-auto mt-5 max-w-3xl whitespace-pre-wrap text-base leading-relaxed text-slate-700 md:text-lg">
                {laPropiedad.intro.paragraph}
              </p>
            ) : null}
          </Reveal>
        </section>
      ) : null}

      {/* Planta Baja Section */}
      {laPropiedad.groundFloor.title ? (
        <FloorSection
          title={laPropiedad.groundFloor.title}
          paragraph={laPropiedad.groundFloor.paragraph}
          image={laPropiedad.groundFloor.image}
          items={laPropiedad.groundFloor.items}
          backgroundColor
          iconType="check"
        />
      ) : null}

      {/* Primera Planta Section */}
      {laPropiedad.firstFloor.title ? (
        <FloorSection
          title={laPropiedad.firstFloor.title}
          paragraph={laPropiedad.firstFloor.paragraph}
          image={laPropiedad.firstFloor.image}
          items={laPropiedad.firstFloor.items}
          isReversed
          iconType="bed"
        />
      ) : null}

      {/* Exteriores Section */}
      {laPropiedad.exterior.title ? (
        <FloorSection
          title={laPropiedad.exterior.title}
          paragraph={laPropiedad.exterior.paragraph}
          image={laPropiedad.exterior.image}
          items={laPropiedad.exterior.items}
          backgroundColor
          iconType="pool"
        />
      ) : null}

      {/* Gallery Section */}
      {laPropiedad.gallery && laPropiedad.gallery.length > 0 ? (
        <section className="mx-auto mt-24 w-full max-w-7xl px-6 lg:px-10">
          <Reveal>
            <div className="mb-12 text-center">
              <h2 className="font-[var(--font-display)] text-3xl font-semibold text-slate-900 md:text-4xl">
                Galería de Imágenes
              </h2>
            </div>
          </Reveal>
          <GalleryFilter items={laPropiedad.gallery} />
        </section>
      ) : null}
    </div>
  );
}
