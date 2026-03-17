import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import ProductCard from '@/features/products/components/ProductCard';
import type { ProductWithImages } from '@/shared/contracts/products';

export function HomeFallbackProducts({
  products,
}: {
  products: ProductWithImages[];
}): React.JSX.Element {
  const hasProducts = products.length > 0;

  return (
    <section id='products' className='relative w-full py-12'>
      <div
        className='pointer-events-none absolute inset-0 -z-10 opacity-60'
        style={{
          background:
            'radial-gradient(900px circle at 10% 10%, color-mix(in srgb, var(--hero-accent) 10%, transparent) 0%, transparent 60%)',
        }}
        aria-hidden='true'
      />
      <div className='container px-4 md:px-6'>
        <div className='flex flex-col gap-4 md:flex-row md:items-end md:justify-between motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2'>
          <div className='space-y-2'>
            <p className='text-xs font-semibold uppercase tracking-[0.3em] text-[var(--cms-appearance-muted-text)]'>
              Products
            </p>
            <h2 className='font-heading text-3xl font-semibold tracking-tight'>
              Featured catalog
            </h2>
            <p className='text-sm leading-relaxed text-[var(--cms-appearance-muted-text)]'>
              Keep your best items front and center with a clean, image-first grid.
            </p>
          </div>
          <Link
            href='/admin'
            className='inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--hero-text)]'
            prefetch={false}
          >
            Manage inventory
            <ArrowUpRight className='size-4' aria-hidden='true' />
          </Link>
        </div>
        <div className='mt-7'>
          {hasProducts ? (
            <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
              {products.map((product: ProductWithImages) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className='cms-appearance-subtle-surface flex flex-col items-start gap-4 rounded-3xl border p-6 text-sm leading-relaxed text-[var(--cms-appearance-muted-text)]'>
              <p>
                Your products will appear here once you add them in the admin panel. Start by
                creating a few featured items and uploading imagery.
              </p>
              <Link
                href='/admin'
                className='cms-appearance-button-primary inline-flex items-center justify-center rounded-full border px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em]'
                prefetch={false}
              >
                Add products
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
