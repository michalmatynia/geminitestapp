'use client';

import { ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

export function HomeFallbackCollections(): React.JSX.Element {
  const translations = useTranslations('FallbackHome.Collections');
  const collections = [
    {
      title: translations('seasonalEditTitle'),
      description: translations('seasonalEditDescription'),
      emphasis: translations('seasonalEditEmphasis'),
    },
    {
      title: translations('essentialsTitle'),
      description: translations('essentialsDescription'),
      emphasis: translations('essentialsEmphasis'),
    },
    {
      title: translations('studioPicksTitle'),
      description: translations('studioPicksDescription'),
      emphasis: translations('studioPicksEmphasis'),
    },
    {
      title: translations('limitedReleaseTitle'),
      description: translations('limitedReleaseDescription'),
      emphasis: translations('limitedReleaseEmphasis'),
    },
    {
      title: translations('newArrivalsTitle'),
      description: translations('newArrivalsDescription'),
      emphasis: translations('newArrivalsEmphasis'),
    },
  ];

  return (
    <section id='collections' className='w-full py-12' aria-labelledby='collections-title'>
      <div className='container px-4 md:px-6'>
        <div className='flex flex-col gap-3 md:flex-row md:items-end md:justify-between motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2'>
          <div className='space-y-2'>
            <p className='text-xs font-semibold uppercase tracking-[0.3em] text-[var(--cms-appearance-muted-text)]'>
              {translations('eyebrow')}
            </p>
            <h2 id='collections-title' className='font-heading text-3xl font-semibold tracking-tight'>
              {translations('title')}
            </h2>
            <p className='text-sm leading-relaxed text-[var(--cms-appearance-muted-text)]'>
              {translations('description')}
            </p>
          </div>
          <a
            href='#products'
            className='inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--hero-text)]'
          >
            {translations('viewAllProducts')}
            <ArrowUpRight className='size-4' aria-hidden='true' />
          </a>
        </div>
        <div
          className='mt-7 overflow-x-auto pb-3 pt-1 scroll-smooth snap-x snap-mandatory'
          role='region'
          aria-label={translations('listAria')}
          tabIndex={0}
        >
          <ul className='flex gap-4 list-none p-0 m-0'>
            {collections.map((collection, index) => {
              const tint = 12 + index * 6;
              return (
                <li
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
                  <a
                    href='#products'
                    className='mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--hero-text)]'
                    aria-label={translations('exploreAria', { title: collection.title })}
                  >
                    {translations('explore')}
                    <ArrowUpRight className='size-3' aria-hidden='true' />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
