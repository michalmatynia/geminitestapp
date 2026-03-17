import React from 'react';

import { highlightItems } from './home-fallback-content.data';

export function HomeFallbackHighlights(): React.JSX.Element {
  return (
    <section id='highlights' className='relative w-full py-12'>
      <div
        className='pointer-events-none absolute inset-0 -z-10 opacity-50'
        style={{
          background:
            'linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--hero-accent) 10%, transparent) 50%, transparent 100%)',
        }}
        aria-hidden='true'
      />
      <div className='container px-4 md:px-6'>
        <div className='flex flex-col gap-3 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2'>
          <p className='text-xs font-semibold uppercase tracking-[0.3em] text-[var(--cms-appearance-muted-text)]'>
            Highlights
          </p>
          <h2 className='font-heading text-3xl font-semibold tracking-tight sm:text-[2.3rem]'>
            Everything you need to make the homepage feel complete.
          </h2>
          <p className='mx-auto max-w-2xl text-sm leading-relaxed text-[var(--cms-appearance-muted-text)] sm:text-base'>
            The fallback layout balances storytelling with shopping, so you can launch while
            your CMS pages are still coming together.
          </p>
        </div>
        <div className='mt-10 grid gap-6 md:grid-cols-3'>
          {highlightItems.map(({ title, description, Icon }) => (
            <div
              key={title}
              className='cms-appearance-surface rounded-3xl border p-6 shadow-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4'
            >
              <span className='cms-appearance-subtle-surface inline-flex size-10 items-center justify-center rounded-2xl border'>
                <Icon className='size-5' aria-hidden='true' />
              </span>
              <h3 className='mt-4 text-lg font-semibold text-[var(--cms-appearance-page-text)]'>
                {title}
              </h3>
              <p className='mt-2 text-sm leading-relaxed text-[var(--cms-appearance-muted-text)]'>
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
