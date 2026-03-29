import type { CSSProperties } from 'react';

const PRODUCT_SHELL_SURFACE_STYLE: CSSProperties = {
  backgroundColor: 'var(--cms-appearance-page-background, #f8fafc)',
  color: 'var(--cms-appearance-page-text, #0f172a)',
};

const PRODUCT_PRIMARY_BLOCK_STYLE: CSSProperties = {
  backgroundColor:
    'color-mix(in srgb, var(--cms-appearance-page-text, #0f172a) 11%, transparent)',
};

const PRODUCT_SOFT_BLOCK_STYLE: CSSProperties = {
  backgroundColor:
    'color-mix(in srgb, var(--cms-appearance-page-text, #0f172a) 7%, transparent)',
};

const PRODUCT_ACCENT_BLOCK_STYLE: CSSProperties = {
  backgroundColor:
    'color-mix(in srgb, var(--cms-appearance-page-accent, #6366f1) 18%, transparent)',
};

function ProductSkeletonBlock({
  className,
  style,
}: {
  className: string;
  style?: CSSProperties;
}): React.JSX.Element {
  return (
    <div
      className={`animate-pulse rounded-[24px] ${className}`}
      style={style ?? PRODUCT_PRIMARY_BLOCK_STYLE}
    />
  );
}

export function ProductRouteLoadingFallback(): React.JSX.Element {
  return (
    <div
      className='min-h-screen w-full'
      data-testid='product-route-loading-fallback'
      role='status'
      aria-live='polite'
      aria-atomic='true'
      aria-label='Loading product page'
      style={PRODUCT_SHELL_SURFACE_STYLE}
    >
      <div className='border-b px-4 py-4 md:px-6' style={PRODUCT_SOFT_BLOCK_STYLE}>
        <div className='mx-auto flex w-full max-w-6xl items-center justify-between gap-4'>
          <div className='flex items-center gap-3'>
            <ProductSkeletonBlock
              className='h-11 w-11 rounded-full'
              style={PRODUCT_ACCENT_BLOCK_STYLE}
            />
            <ProductSkeletonBlock className='h-6 w-32 rounded-full' />
          </div>
          <div className='hidden items-center gap-3 md:flex'>
            <ProductSkeletonBlock className='h-10 w-24 rounded-full' />
            <ProductSkeletonBlock className='h-10 w-28 rounded-full' />
            <ProductSkeletonBlock className='h-10 w-20 rounded-full' />
          </div>
        </div>
      </div>
      <div data-testid='product-route-loading-fallback-content'>
        <div className='mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-6 lg:py-12'>
          <div className='flex items-center gap-3'>
            <ProductSkeletonBlock className='h-5 w-24 rounded-full' />
            <ProductSkeletonBlock className='h-5 w-3 rounded-full' style={PRODUCT_SOFT_BLOCK_STYLE} />
            <ProductSkeletonBlock className='h-5 w-40 rounded-full' />
          </div>
          <div className='grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)]'>
            <div className='space-y-4'>
              <ProductSkeletonBlock className='aspect-[4/3] w-full rounded-[36px]' />
              <div className='grid grid-cols-4 gap-3'>
                <ProductSkeletonBlock className='aspect-square w-full rounded-[24px]' />
                <ProductSkeletonBlock className='aspect-square w-full rounded-[24px]' />
                <ProductSkeletonBlock className='aspect-square w-full rounded-[24px]' />
                <ProductSkeletonBlock className='aspect-square w-full rounded-[24px]' />
              </div>
            </div>
            <div className='space-y-4'>
              <div className='flex gap-2'>
                <ProductSkeletonBlock
                  className='h-9 w-24 rounded-full'
                  style={PRODUCT_ACCENT_BLOCK_STYLE}
                />
                <ProductSkeletonBlock className='h-9 w-20 rounded-full' />
              </div>
              <ProductSkeletonBlock className='h-16 w-4/5 rounded-[28px]' />
              <ProductSkeletonBlock className='h-10 w-40 rounded-[24px]' />
              <ProductSkeletonBlock className='h-24 w-full rounded-[28px]' />
              <div className='grid gap-3 sm:grid-cols-2'>
                <ProductSkeletonBlock className='h-20 w-full rounded-[24px]' />
                <ProductSkeletonBlock className='h-20 w-full rounded-[24px]' />
                <ProductSkeletonBlock className='h-20 w-full rounded-[24px]' />
                <ProductSkeletonBlock className='h-20 w-full rounded-[24px]' />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
