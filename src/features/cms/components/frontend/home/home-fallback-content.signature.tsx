'use client';

import React from 'react';
import { Layers, Palette, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ProductCard } from '@/features/products';
import type { ProductWithImages } from '@/shared/contracts/products';
import { UI_GRID_RELAXED_CLASSNAME, UI_STACK_RELAXED_CLASSNAME } from '@/shared/ui';

export function HomeFallbackSignature({
  featuredProducts,
}: {
  featuredProducts: ProductWithImages[];
}): React.JSX.Element {
  const translations = useTranslations('FallbackHome.Signature');
  const impactStats = [
    {
      label: translations('launchKitLabel'),
      value: translations('launchKitValue'),
      description: translations('launchKitDescription'),
      Icon: Layers,
    },
    {
      label: translations('appearanceModesLabel'),
      value: translations('appearanceModesValue'),
      description: translations('appearanceModesDescription'),
      Icon: Palette,
    },
    {
      label: translations('conversionFocusLabel'),
      value: translations('conversionFocusValue'),
      description: translations('conversionFocusDescription'),
      Icon: TrendingUp,
    },
  ];

  return (
    <section id='signature' className='w-full py-12' aria-labelledby='signature-title'>
      <div className='container px-4 md:px-6'>
        <div className='grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center'>
          <div className='space-y-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3'>
            <p className='text-xs font-semibold uppercase tracking-[0.3em] text-[var(--cms-appearance-muted-text)]'>
              {translations('eyebrow')}
            </p>
            <h2
              id='signature-title'
              className='font-heading text-3xl font-semibold tracking-tight sm:text-[2.3rem]'
            >
              {translations('title')}
            </h2>
            <p className='text-sm leading-relaxed text-[var(--cms-appearance-muted-text)] sm:text-base'>
              {translations('description')}
            </p>
            <ul
              className='grid gap-3 sm:grid-cols-3 list-none p-0 m-0'
              aria-label={translations('impactAria')}
            >
              {impactStats.map(({ label, value, description, Icon }) => (
                <li
                  key={label}
                  className='cms-appearance-subtle-surface rounded-2xl border px-4 py-3'
                >
                  <div className='flex items-center justify-between'>
                    <p className='text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cms-appearance-muted-text)]'>
                      {label}
                    </p>
                    <Icon className='size-4 text-[var(--cms-appearance-muted-text)]' aria-hidden='true' />
                  </div>
                  <p className='mt-2 text-lg font-semibold text-[var(--cms-appearance-page-text)]'>
                    {value}
                  </p>
                  <p className='text-xs text-[var(--cms-appearance-muted-text)]'>
                    {description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <ul
            className={`${UI_GRID_RELAXED_CLASSNAME} sm:grid-cols-2 list-none p-0 m-0 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:delay-150`}
            aria-label={translations('featuredProductsAria')}
          >
            {featuredProducts.length ? (
              featuredProducts.map((product) => (
                <li key={product.id} className='h-full'>
                  <ProductCard
                    product={product}
                    className='border-[var(--cms-appearance-page-border)]/60 shadow-sm'
                  />
                </li>
              ))
            ) : (
              <>
                {[translations('curatedSet'), translations('limitedRelease')].map((label) => (
                  <li
                    key={label}
                    className={`cms-appearance-subtle-surface ${UI_STACK_RELAXED_CLASSNAME} rounded-3xl border p-5`}
                  >
                    <div className='rounded-2xl border border-[var(--cms-appearance-page-border)]/60 bg-[color-mix(in srgb,var(--cms-appearance-page-background) 80%, transparent)] p-6 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--cms-appearance-muted-text)]'>
                      {label}
                    </div>
                    <div className='space-y-2'>
                      <div className='h-3 w-3/4 rounded-full bg-[color-mix(in srgb,var(--cms-appearance-page-border) 40%, transparent)]' />
                      <div className='h-3 w-1/2 rounded-full bg-[color-mix(in srgb,var(--cms-appearance-page-border) 30%, transparent)]' />
                    </div>
                  </li>
                ))}
              </>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
