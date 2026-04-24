'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { LayoutGrid, ShieldCheck, Sparkles } from 'lucide-react';

import { UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/layout';

export function HomeFallbackHighlights(): React.JSX.Element {
  const translations = useTranslations('FallbackHome.Highlights');
  const highlightItems = [
    { title: translations('itemOneTitle'), description: translations('itemOneDescription'), Icon: Sparkles },
    { title: translations('itemTwoTitle'), description: translations('itemTwoDescription'), Icon: ShieldCheck },
    { title: translations('itemThreeTitle'), description: translations('itemThreeDescription'), Icon: LayoutGrid },
  ];

  return (
    <section id='highlights' className='relative w-full py-12' aria-labelledby='highlights-title'>
      <div
        className='pointer-events-none absolute inset-0 -z-10 opacity-50'
        style={{
          background:
            'linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--hero-accent) 10%, transparent) 50%, transparent 100%)',
        }}
        aria-hidden='true'
      />
      <div className='container px-4 md:px-6'>
        <HighlightsHeader translations={translations} />
        <ul className={`${UI_GRID_ROOMY_CLASSNAME} mt-10 md:grid-cols-3 list-none p-0 m-0`}>
          {highlightItems.map((item) => (
            <HighlightItem key={item.title} item={item} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function HighlightsHeader({ translations }: { translations: any }): React.JSX.Element {
  return (
    <div className='flex flex-col gap-3 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2'>
      <p className='text-xs font-semibold uppercase tracking-[0.3em] text-[var(--cms-appearance-muted-text)]'>
        {translations('eyebrow')}
      </p>
      <h2
        id='highlights-title'
        className='font-heading text-3xl font-semibold tracking-tight sm:text-[2.3rem]'
      >
        {translations('title')}
      </h2>
      <p className='mx-auto max-w-2xl text-sm leading-relaxed text-[var(--cms-appearance-muted-text)] sm:text-base'>
        {translations('description')}
      </p>
    </div>
  );
}

function HighlightItem({ item }: { item: { title: string; description: string; Icon: React.ElementType } }): React.JSX.Element {
  return (
    <li
      className='cms-appearance-surface rounded-3xl border p-6 shadow-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4'
    >
      <span className='cms-appearance-subtle-surface inline-flex size-10 items-center justify-center rounded-2xl border'>
        <item.Icon className='size-5' aria-hidden='true' />
      </span>
      <h3 className='mt-4 text-lg font-semibold text-[var(--cms-appearance-page-text)]'>
        {item.title}
      </h3>
      <p className='mt-2 text-sm leading-relaxed text-[var(--cms-appearance-muted-text)]'>
        {item.description}
      </p>
    </li>
  );
}
