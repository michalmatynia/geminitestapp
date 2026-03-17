import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import { collections } from './home-fallback-content.data';

export function HomeFallbackCollections(): React.JSX.Element {
  return (
    <section id='collections' className='w-full py-12'>
      <div className='container px-4 md:px-6'>
        <div className='flex flex-col gap-3 md:flex-row md:items-end md:justify-between motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2'>
          <div className='space-y-2'>
            <p className='text-xs font-semibold uppercase tracking-[0.3em] text-[var(--cms-appearance-muted-text)]'>
              Collections
            </p>
            <h2 className='font-heading text-3xl font-semibold tracking-tight'>
              Build a narrative around your catalog.
            </h2>
            <p className='text-sm leading-relaxed text-[var(--cms-appearance-muted-text)]'>
              Create small edits and spotlight them with scrollable cards.
            </p>
          </div>
          <Link
            href='#products'
            className='inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--hero-text)]'
            prefetch={false}
          >
            View all products
            <ArrowUpRight className='size-4' aria-hidden='true' />
          </Link>
        </div>
        <div className='mt-7 flex gap-4 overflow-x-auto pb-3 pt-1 scroll-smooth snap-x snap-mandatory'>
          {collections.map((collection, index) => {
            const tint = 12 + index * 6;
            return (
              <div
                key={collection.title}
                className='cms-appearance-subtle-surface w-[230px] shrink-0 snap-start rounded-3xl border p-5 shadow-sm transition-transform duration-200 hover:-translate-y-1 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3'
                style={{
                  backgroundImage: `linear-gradient(135deg, color-mix(in srgb, var(--hero-accent) ${tint}%, transparent), transparent 65%)`,
                }}
              >
                <p className='text-xs font-semibold uppercase tracking-[0.3em] text-[var(--cms-appearance-muted-text)]'>
                  {collection.emphasis}
                </p>
                <h3 className='mt-3 text-lg font-semibold text-[var(--cms-appearance-page-text)]'>
                  {collection.title}
                </h3>
                <p className='mt-2 text-sm leading-relaxed text-[var(--cms-appearance-muted-text)]'>
                  {collection.description}
                </p>
                <Link
                  href='#products'
                  className='mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--hero-text)]'
                  prefetch={false}
                >
                  Explore
                  <ArrowUpRight className='size-3' aria-hidden='true' />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
