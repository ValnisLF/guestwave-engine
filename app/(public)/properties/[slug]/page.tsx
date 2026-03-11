import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@infra/prisma';
import { BookingBar } from '@/components/public/BookingBar';
import { Reveal } from '@/components/public/Reveal';
import {
  PropertyPageContentSchema,
  createEmptyPropertyPageContent,
} from '@/lib/schemas/property';

function getAmenityIconLabel(item: string) {
  const normalized = item.toLowerCase();
  if (normalized.includes('wifi')) return 'Wi-Fi';
  if (normalized.includes('piscina')) return 'Piscina';
  if (normalized.includes('parking')) return 'Parking';
  if (normalized.includes('bbq') || normalized.includes('barbacoa')) return 'BBQ';
  return item.slice(0, 2).toUpperCase();
}

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
    ...(pageContent.theme?.primaryColor ? { ['--primary' as string]: pageContent.theme.primaryColor } : {}),
  };

  return (
    <div style={themeVars} className="w-full bg-[color:var(--cream)] pb-16 text-slate-900">
      <section className="relative min-h-[88vh] w-full overflow-hidden">
        {homepage.hero.image ? (
          <Image
            src={homepage.hero.image}
            alt={homepage.hero.title || 'Hero'}
            fill
            className="object-cover"
            unoptimized
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#2f3f1d] to-[#546a2f]" />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/55" />

        <div className="relative z-10 mx-auto flex min-h-[88vh] w-full max-w-6xl flex-col items-center justify-center px-6 text-center">
          <Reveal>
            <h1 className="max-w-4xl font-[var(--font-display)] text-4xl font-semibold leading-tight text-white md:text-6xl">
              {homepage.hero.title || 'Tu hogar en la naturaleza'}
            </h1>
          </Reveal>
          {homepage.hero.subtitle ? (
            <Reveal delay={0.1}>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/90 md:text-xl">
                {homepage.hero.subtitle}
              </p>
            </Reveal>
          ) : null}
        </div>
      </section>

      <BookingBar slug={slug} />

      <section className="mx-auto mt-24 w-full max-w-4xl px-6 text-center">
        <Reveal>
          {homepage.intro.title ? (
            <h2 className="font-[var(--font-display)] text-3xl font-semibold leading-tight text-[color:var(--primary-color)] md:text-4xl">
              {homepage.intro.title}
            </h2>
          ) : null}
          {homepage.intro.paragraph ? (
            <p className="mx-auto mt-5 max-w-3xl whitespace-pre-wrap text-base leading-relaxed text-slate-700 md:text-lg">
              {homepage.intro.paragraph}
            </p>
          ) : null}
        </Reveal>
      </section>

      <section className="mx-auto mt-20 grid w-full max-w-7xl gap-10 px-6 md:grid-cols-2 md:items-center">
        <Reveal>
          <div className="space-y-6">
            <h3 className="font-[var(--font-display)] text-3xl font-semibold leading-tight md:text-4xl">
              {homepage.amenities.title || 'Equipamiento y confort'}
            </h3>
            {homepage.amenities.paragraph ? (
              <p className="whitespace-pre-wrap text-slate-700">{homepage.amenities.paragraph}</p>
            ) : null}
            {homepage.amenities.items?.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {homepage.amenities.items.map((item, idx) => (
                  <article
                    key={`${item}-${idx}`}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4"
                  >
                    <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-[color:var(--primary-color)]/10 text-xs font-bold text-[color:var(--primary-color)]">
                      {getAmenityIconLabel(item)}
                    </span>
                    <span className="text-sm font-medium text-slate-800">{item}</span>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="relative aspect-square overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
            {homepage.amenities.image ? (
              <Image
                src={homepage.amenities.image}
                alt={homepage.amenities.title || 'Amenities'}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-100" />
            )}
          </div>
        </Reveal>
      </section>

      {homepage.availability.title || homepage.availability.paragraph ? (
        <section className="mx-auto mt-20 w-full max-w-4xl rounded-3xl border border-slate-200 bg-white px-6 py-10 text-center shadow-md shadow-black/5">
          <Reveal>
            {homepage.availability.title ? (
              <h3 className="font-[var(--font-display)] text-2xl font-semibold text-[color:var(--primary-color)] md:text-3xl">
                {homepage.availability.title}
              </h3>
            ) : null}
            {homepage.availability.paragraph ? (
              <p className="mx-auto mt-3 max-w-2xl whitespace-pre-wrap text-slate-600">
                {homepage.availability.paragraph}
              </p>
            ) : null}
            <Link
              href={`/properties/${slug}/reservas`}
              className="mt-6 inline-flex rounded-lg bg-[color:var(--primary-color)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Ver disponibilidad completa
            </Link>
          </Reveal>
        </section>
      ) : null}

      {homepage.areaCarousel.length > 0 ? (
        <section className="mx-auto mt-20 w-full max-w-7xl px-6">
          <Reveal>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <h3 className="font-[var(--font-display)] text-3xl font-semibold text-[color:var(--primary-color)] md:text-4xl">La Zona</h3>
              <Link
                href={`/properties/${slug}/turismo`}
                className="text-sm font-semibold text-[color:var(--primary-color)] hover:underline"
              >
                Ver guia completa
              </Link>
            </div>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-3">
            {homepage.areaCarousel.map((item, idx) => (
              <Reveal key={`${item.url}-${idx}`} delay={idx * 0.08}>
                <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md shadow-black/5">
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <Image
                      src={item.url}
                      alt={item.title || 'Zona'}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  </div>
                  <div className="min-h-24 space-y-1 p-4">
                    {item.title ? <h4 className="font-[var(--font-display)] font-semibold text-slate-900">{item.title}</h4> : null}
                    {item.subtitle ? <p className="text-sm text-slate-600">{item.subtitle}</p> : null}
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mx-auto mt-16 flex w-full max-w-7xl flex-wrap gap-3 px-6">
        <Link
          href={`/properties/${slug}/reservas`}
          className="rounded-md bg-[color:var(--primary-color)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Reservar ahora
        </Link>
        <Link
          href={`/properties/${slug}/la-propiedad`}
          className="rounded-md border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[color:var(--primary-color)] hover:text-[color:var(--primary-color)]"
        >
          Ver detalles
        </Link>
      </div>
    </div>
  );
}
