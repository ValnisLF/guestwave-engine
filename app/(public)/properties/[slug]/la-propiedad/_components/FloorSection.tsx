'use client';

import Image from 'next/image';
import { Reveal } from '@/components/public/Reveal';

interface FloorSectionProps {
  readonly title: string;
  readonly paragraph?: string;
  readonly image?: string;
  readonly items?: string[];
  readonly isReversed?: boolean;
  readonly backgroundColor?: boolean;
  readonly iconType?: 'check' | 'bed' | 'bath' | 'air' | 'pool' | 'nature' | 'deck';
}

const iconMap: Record<string, string> = {
  check: 'check_circle',
  bed: 'bed',
  bath: 'bathtub',
  air: 'air',
  pool: 'pool',
  nature: 'nature',
  deck: 'deck',
};

function getIconForItem(index: number, iconType: string): string {
  if (iconType === 'check') return iconMap.check;
  if (iconType === 'bed') return index === 0 ? iconMap.bed : index === 1 ? iconMap.bath : iconMap.air;
  if (iconType === 'pool') return index === 0 ? iconMap.pool : index === 1 ? iconMap.nature : iconMap.deck;
  return iconMap.check;
}

export function FloorSection({
  title,
  paragraph,
  image,
  items,
  isReversed = false,
  backgroundColor = false,
  iconType = 'check',
}: FloorSectionProps) {
  const bgClass = backgroundColor ? 'bg-[color:var(--primary)]/5' : '';
  const containerClass = backgroundColor ? 'mt-20 w-full py-12 md:py-24' : 'mt-20 w-full py-12 md:py-24';

  return (
    <section className={`${bgClass} ${containerClass}`}>
      <div className="mx-auto grid max-w-7xl gap-12 px-6 md:grid-cols-2 md:items-center">
        {/* Left content */}
        {!isReversed ? (
          <Reveal>
            <div className="space-y-6">
              <h3 className="font-[var(--font-display)] text-2xl font-semibold leading-tight md:text-4xl">
                {title}
              </h3>
              {paragraph ? (
                <p className="whitespace-pre-wrap leading-relaxed text-slate-700">{paragraph}</p>
              ) : null}
              {items && items.length > 0 ? (
                <ul className="space-y-4">
                  {items.map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[color:var(--primary-color)]">
                        {getIconForItem(items.indexOf(item), iconType)}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </Reveal>
        ) : null}

        {/* Image */}
        {image ? (
          <Reveal delay={isReversed ? 0 : 0.1}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl shadow-xl">
              <Image
                src={image}
                alt={title}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          </Reveal>
        ) : null}

        {/* Right content (reversed) */}
        {isReversed ? (
          <Reveal delay={0.1}>
            <div className="space-y-6">
              <h3 className="font-[var(--font-display)] text-2xl font-semibold leading-tight md:text-4xl">
                {title}
              </h3>
              {paragraph ? (
                <p className="whitespace-pre-wrap leading-relaxed text-slate-700">{paragraph}</p>
              ) : null}
              {items && items.length > 0 ? (
                <ul className="space-y-4">
                  {items.map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[color:var(--primary-color)]">
                        {getIconForItem(items.indexOf(item), iconType)}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
