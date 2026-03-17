import React from 'react';

import ProductCard from '@/features/products/components/ProductCard';
import type { ProductWithImages } from '@/shared/contracts/products';

import { impactStats } from './home-fallback-content.data';

export function HomeFallbackSignature({
  featuredProducts,
}: {
  featuredProducts: ProductWithImages[];
}): React.JSX.Element {
  return (
    <section id='signature' className='w-full py-12'>
      <div className='container px-4 md:px-6'>
        <div className='grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center'>
          <div className='space-y-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3'>
            <p className='text-xs font-semibold uppercase tracking-[0.3em] text-[var(--cms-appearance-muted-text)]'>
              Signature edit
            </p>
            <h2 className='font-heading text-3xl font-semibold tracking-tight sm:text-[2.3rem]'>
              Bring a sense of direction to every collection.
            </h2>
            <p className='text-sm leading-relaxed text-[var(--cms-appearance-muted-text)] sm:text-base'>
              Use this editorial band to spotlight new releases, seasonal edits, or staff
              picks. It keeps the focus tight while the catalog grows.
            </p>
            <div className='grid gap-3 sm:grid-cols-3'>
              {impactStats.map(({ label, value, description, Icon }) => (
                <div
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
                </div>
              ))}
            </div>
          </div>
          <div className='grid gap-4 sm:grid-cols-2 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:delay-150'>
            {featuredProducts.length ? (
              featuredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  className='border-[var(--cms-appearance-page-border)]/60 shadow-sm'
                />
              ))
            ) : (
              <>
                {['Curated set', 'Limited release'].map((label) => (
                  <div
                    key={label}
                    className='cms-appearance-subtle-surface flex flex-col gap-4 rounded-3xl border p-5'
                  >
                    <div className='rounded-2xl border border-[var(--cms-appearance-page-border)]/60 bg-[color-mix(in srgb,var(--cms-appearance-page-background) 80%, transparent)] p-6 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--cms-appearance-muted-text)]'>
                      {label}
                    </div>
                    <div className='space-y-2'>
                      <div className='h-3 w-3/4 rounded-full bg-[color-mix(in srgb,var(--cms-appearance-page-border) 40%, transparent)]' />
                      <div className='h-3 w-1/2 rounded-full bg-[color-mix(in srgb,var(--cms-appearance-page-border) 30%, transparent)]' />
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
