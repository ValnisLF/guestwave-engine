'use client';

import Image from 'next/image';
import { useState, useMemo } from 'react';

interface GalleryItem {
  url: string;
  label?: string;
  alt?: string;
}

interface GalleryFilterProps {
  readonly items: GalleryItem[];
}

export function GalleryFilter({ items }: GalleryFilterProps) {
  const [activeFilter, setActiveFilter] = useState<string>('Todo');

  // Extract unique labels/tags from items
  const tags = useMemo(() => {
    const uniqueTags = new Set<string>();
    items.forEach((item) => {
      if (item.label) {
        item.label.split(',').forEach((tag) => {
          uniqueTags.add(tag.trim());
        });
      }
    });
    return ['Todo', ...Array.from(uniqueTags).sort()];
  }, [items]);

  // Filter items based on active filter
  const filteredItems = useMemo(() => {
    if (activeFilter === 'Todo') {
      return items;
    }
    return items.filter((item) => item.label?.includes(activeFilter));
  }, [items, activeFilter]);

  return (
    <section className="space-y-12">
      {/* Filter buttons */}
      <div className="flex flex-wrap justify-center gap-2">
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveFilter(tag)}
            className={
              activeFilter === tag
                ? 'rounded-full bg-[color:var(--primary)] px-6 py-2 text-sm font-medium text-white transition-colors'
                : 'rounded-full bg-[color:var(--primary)]/10 px-6 py-2 text-sm font-medium text-[color:var(--primary)] transition-colors hover:bg-[color:var(--primary)]/20'
            }
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Masonry grid */}
      <div className="columns-1 gap-4 space-y-4 md:columns-2 lg:columns-3">
        {filteredItems.map((item, idx) => (
          <div key={`${item.url}-${idx}`} className="break-inside-avoid">
            <div className="relative overflow-hidden rounded-xl shadow-md shadow-black/5 transition-opacity hover:opacity-90">
              <Image
                src={item.url}
                alt={item.alt || 'Gallery image'}
                width={600}
                height={600}
                className="w-full object-cover"
                unoptimized
              />
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="py-12 text-center text-slate-500">
          <p>No hay imágenes disponibles para este filtro.</p>
        </div>
      )}
    </section>
  );
}
