'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Heading, Text } from '@/components/ui/typography';
import type { MediaSectionBlock } from '@/lib/schemas/property';

type DynamicSectionProps = {
  block: MediaSectionBlock;
};

export function DynamicSection({ block }: DynamicSectionProps) {
  if (block.type === 'text' || block.type === 'text_block') {
    return (
      <article className="rounded-lg border border-slate-200 bg-white p-4">
        {block.title ? <Heading level={4}>{block.title}</Heading> : null}
        <Text className={block.title ? 'mt-2 whitespace-pre-wrap' : 'whitespace-pre-wrap'}>
          {block.content}
        </Text>
      </article>
    );
  }

  if (block.type === 'image') {
    return (
      <figure className="overflow-hidden rounded-lg border border-slate-200 bg-white p-2">
        <div className="relative h-[320px] w-full overflow-hidden rounded-md">
          <Image
            src={block.image}
            alt={block.alt ?? block.caption ?? 'Imagen de la propiedad'}
            fill
            unoptimized
            className="object-cover"
          />
        </div>
        {block.caption ? <figcaption className="px-1 pt-2 text-sm text-slate-600">{block.caption}</figcaption> : null}
      </figure>
    );
  }

  if (block.type === 'carousel' || block.type === 'gallery') {
    return <DynamicCarousel images={block.images} title={block.title} />;
  }

  return null;
}

type DynamicCarouselProps = {
  images: string[];
  title?: string;
};

function DynamicCarousel({ images, title }: DynamicCarouselProps) {
  const [active, setActive] = useState(0);
  const total = images.length;

  if (total === 0) return null;

  const next = () => setActive((prev) => (prev + 1) % total);
  const prev = () => setActive((prev) => (prev - 1 + total) % total);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3">
      {title ? <Heading level={4}>{title}</Heading> : null}

      <div className={title ? 'mt-3' : ''}>
        <div className="relative overflow-hidden rounded-md">
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${active * 100}%)` }}
          >
            {images.map((image, index) => (
              <div key={`${image}-${index}`} className="relative h-[320px] w-full shrink-0">
                <Image
                  src={image}
                  alt={`Slide ${index + 1}`}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            ))}
          </div>

          {total > 1 ? (
            <>
              <button
                type="button"
                onClick={prev}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-2 py-1 text-sm text-white"
                aria-label="Slide anterior"
              >
                {'<'}
              </button>
              <button
                type="button"
                onClick={next}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-2 py-1 text-sm text-white"
                aria-label="Siguiente slide"
              >
                {'>'}
              </button>
            </>
          ) : null}
        </div>

        {total > 1 ? (
          <div className="mt-2 flex justify-center gap-1.5">
            {images.map((image, index) => (
              <button
                key={`${image}-dot-${index}`}
                type="button"
                onClick={() => setActive(index)}
                className={`h-2.5 w-2.5 rounded-full ${index === active ? 'bg-primary' : 'bg-slate-300'}`}
                aria-label={`Ir a slide ${index + 1}`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
