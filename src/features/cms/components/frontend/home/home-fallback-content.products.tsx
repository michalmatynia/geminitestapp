'use client';

import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import React from 'react';

import { ProductCard } from '@/features/products/public';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { useHomeFallback } from './home-fallback-content';
import { UI_GRID_ROOMY_CLASSNAME, UI_STACK_RELAXED_CLASSNAME } from '@/shared/ui/layout';

export function HomeFallbackProducts(): React.JSX.Element {
  const { products } = useHomeFallback();
  const translations = useTranslations('FallbackHome.Products');

  return (
    <section id='products' className='relative w-full py-12' aria-labelledby='products-title'>
      <div
        className='pointer-events-none absolute inset-0 -z-10 opacity-60'
        style={{
          background:
            'radial-gradient(900px circle at 10% 10%, color-mix(in srgb, var(--hero-accent) 10%, transparent) 0%, transparent 60%)',
        }}
        aria-hidden='true'
      />
      <div className='container px-4 md:px-6'>
        <ProductsHeader translations={translations} />
        <div className='mt-7'>
          {products.length > 0 ? (
            <ProductsList products={products} translations={translations} />
          ) : (
            <EmptyProductsState translations={translations} />
          )}
        </div>
      </div>
    </section>
  );
}

import type { Translation } from 'next-intl';

function ProductsHeader({ translations }: { translations: Translation }): React.JSX.Element {
  return (
    <div className={`${UI_STACK_RELAXED_CLASSNAME} md:flex-row md:items-end md:justify-between motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2`}>
      <div className='space-y-2'>
        <p className='text-xs font-semibold uppercase tracking-[0.3em] text-[var(--cms-appearance-muted-text)]'>
          {translations('eyebrow' as any)}
        </p>
        <h2 id='products-title' className='font-heading text-3xl font-semibold tracking-tight'>
          {translations('title' as any)}
        </h2>
        <p className='text-sm leading-relaxed text-[var(--cms-appearance-muted-text)]'>
          {translations('description' as any)}
        </p>
      </div>
      <Link
        href='/admin'
        className='inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--hero-text)]'
        prefetch={false}
      >
        {translations('manageInventory' as any)}
        <ArrowUpRight className='size-4' aria-hidden='true' />
      </Link>
    </div>
  );
}

function ProductsList({ products, translations }: { products: ProductWithImages[]; translations: Translation }): React.JSX.Element {
  return (
    <ul
      className={`${UI_GRID_ROOMY_CLASSNAME} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 list-none p-0 m-0`}
      aria-label={translations('listAria' as any)}
    >
      {products.map((product) => (
        <li key={product.id} className='h-full'>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}

function EmptyProductsState({ translations }: { translations: Translation }): React.JSX.Element {
  return (
    <div className={`cms-appearance-subtle-surface ${UI_STACK_RELAXED_CLASSNAME} items-start rounded-3xl border p-6 text-sm leading-relaxed text-[var(--cms-appearance-muted-text)]`}>
      <p>{translations('emptyDescription' as any)}</p>
      <Link
        href='/admin'
        className='cms-appearance-button-primary inline-flex items-center justify-center rounded-full border px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em]'
        prefetch={false}
      >
        {translations('addProducts' as any)}
      </Link>
    </div>
  );
}

