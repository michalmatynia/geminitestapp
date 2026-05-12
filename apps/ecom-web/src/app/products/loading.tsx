import type { JSX } from 'react';

function PulseBlock({ w, h }: { w: string; h: string }): JSX.Element {
  return (
    <div
      className='animate-pulse'
      style={{ width: w, height: h, background: 'rgba(255,255,255,0.05)', borderRadius: 0 }}
    />
  );
}

function ProductCardSkeleton(): JSX.Element {
  return (
    <div>
      <div
        className='w-full mb-2 animate-pulse'
        style={{ aspectRatio: '1/1', background: 'rgba(255,255,255,0.05)' }}
      />
      <PulseBlock w='50%' h='0.5rem' />
      <div style={{ height: '0.4rem' }} />
      <PulseBlock w='80%' h='0.7rem' />
      <div style={{ height: '0.4rem' }} />
      <PulseBlock w='30%' h='0.5rem' />
    </div>
  );
}

export default function ProductsLoading(): JSX.Element {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        paddingTop: 'var(--nav-h)',
      }}
    >
      {/* Nav placeholder */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 'var(--nav-h)',
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
          zIndex: 40,
        }}
      />

      <div className='px-8 md:px-16 py-12'>
        {/* Heading skeleton */}
        <div className='mb-8'>
          <PulseBlock w='200px' h='2rem' />
        </div>

        {/* Filter row skeleton */}
        <div className='flex gap-3 mb-10 overflow-x-auto pb-2'>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className='animate-pulse flex-shrink-0'
              style={{ width: 80, height: 32, background: 'rgba(255,255,255,0.05)' }}
            />
          ))}
        </div>

        {/* Grid */}
        <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-7 md:gap-x-5 md:gap-y-9'>
          {Array.from({ length: 20 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
