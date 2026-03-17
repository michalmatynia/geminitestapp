import Link from 'next/link';
import React from 'react';

export function HomeFallbackNextSteps(): React.JSX.Element {
  return (
    <section className='w-full py-12'>
      <div className='container px-4 md:px-6'>
        <div className='cms-appearance-surface relative overflow-hidden rounded-3xl border p-8 shadow-sm'>
          <div
            className='pointer-events-none absolute inset-0 opacity-60'
            style={{
              backgroundImage:
                'radial-gradient(700px circle at 20% 0%, color-mix(in srgb, var(--hero-accent) 12%, transparent) 0%, transparent 65%), radial-gradient(500px circle at 90% 80%, color-mix(in srgb, var(--hero-accent) 10%, transparent) 0%, transparent 60%)',
            }}
            aria-hidden='true'
          />
          <div className='relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between'>
            <div className='space-y-2'>
              <p className='text-xs font-semibold uppercase tracking-[0.3em] text-[var(--cms-appearance-muted-text)]'>
                Next steps
              </p>
              <h2 className='font-heading text-3xl font-semibold tracking-tight sm:text-[2.3rem]'>
                Want a fully custom homepage?
              </h2>
              <p className='text-sm leading-relaxed text-[var(--cms-appearance-muted-text)]'>
                Build a CMS landing page and swap this fallback for bespoke layouts whenever
                you are ready.
              </p>
            </div>
            <Link
              href='/admin'
              className='cms-appearance-button-outline inline-flex items-center justify-center rounded-full border px-6 py-3 text-sm font-semibold'
              prefetch={false}
            >
              Design in CMS
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
