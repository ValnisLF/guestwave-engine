import Link from 'next/link';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@infra/prisma';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const property = await prisma.property.findUnique({
    where: { slug },
    select: {
      name: true,
      homeHeroTitle: true,
      homeHeroSubtitle: true,
      homeDescription: true,
      description: true,
    },
  });

  if (!property) {
    return { title: 'Property Not Found' };
  }

  return {
    title: `${property.name} - GuestWave`,
    description: property.homeDescription || property.description || 'Book this amazing property',
  };
}

export default async function PropertyHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const property = await prisma.property.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      description: true,
      imageUrls: true,
      homeHeroTitle: true,
      homeHeroSubtitle: true,
      homeDescription: true,
    },
  });

  if (!property) {
    notFound();
  }

  const heroTitle = property.homeHeroTitle || property.name;
  const heroSubtitle =
    property.homeHeroSubtitle || 'Tu estancia ideal empieza aqui, con reserva directa y segura.';
  const homeDescription =
    property.homeDescription ||
    property.description ||
    'Descubre una propiedad cuidada al detalle para una experiencia comoda y memorable.';

  const mainImage = property.imageUrls[0] ?? null;

  return (
    <section className="py-6 text-slate-900">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Home</p>
          <h1 className="text-4xl font-bold text-slate-900">{heroTitle}</h1>
          <p className="text-lg text-slate-600">{heroSubtitle}</p>
          <p className="whitespace-pre-wrap text-slate-700">{homeDescription}</p>

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
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {mainImage ? (
            <img src={mainImage} alt={property.name} className="h-full min-h-[320px] w-full object-cover" />
          ) : (
            <div className="flex min-h-[320px] items-center justify-center bg-slate-100 text-6xl text-slate-400">
              🏡
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
