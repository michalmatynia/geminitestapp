import { Check, ChevronDown, Sparkles } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import type { CmsAppearanceTone } from '@/features/cms/components/frontend/CmsStorefrontAppearance';

type HomeFallbackHeroProps = {
  appearanceTone?: CmsAppearanceTone;
  setupSteps: string[];
  collectionCount: number;
};

export function HomeFallbackHero({
  appearanceTone,
  setupSteps,
  collectionCount,
}: HomeFallbackHeroProps): React.JSX.Element {
  const appearanceToneValue = appearanceTone;
  const heroStyle = {
    '--hero-accent': appearanceToneValue?.accent ?? 'var(--cms-appearance-page-text)',
    '--hero-border': appearanceToneValue?.border ?? 'var(--cms-appearance-page-border)',
    '--hero-text': appearanceToneValue?.text ?? 'var(--cms-appearance-page-text)',
  } as React.CSSProperties;
  const heroGlowStyle: React.CSSProperties = {
    backgroundImage:
      'radial-gradient(1200px circle at 0% 0%, color-mix(in srgb, var(--hero-accent) 28%, transparent) 0%, transparent 60%), radial-gradient(900px circle at 100% 12%, color-mix(in srgb, var(--hero-accent) 18%, transparent) 0%, transparent 55%)',
  };
  const heroGridStyle: React.CSSProperties = {
    backgroundImage:
      'linear-gradient(to right, color-mix(in srgb, var(--hero-border) 32%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--hero-border) 32%, transparent) 1px, transparent 1px)',
    backgroundSize: '42px 42px',
  };

  return (
    <section className='relative overflow-hidden' style={heroStyle}>
      <div className='pointer-events-none absolute inset-0 -z-10'>
        <div className='absolute inset-0 opacity-80' style={heroGlowStyle} aria-hidden='true' />
        <div
          className='absolute inset-0 opacity-40 mix-blend-multiply'
          style={heroGridStyle}
          aria-hidden='true'
        />
      </div>
      <div className='container grid gap-8 px-4 py-14 md:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-20'>
        <div className='flex flex-col justify-center gap-5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4'>
          <span className='cms-appearance-subtle-surface inline-flex w-fit items-center gap-2 rounded-full border border-[var(--cms-appearance-page-border)] px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--hero-text)]'>
            Launch-ready
          </span>
          <div className='space-y-3'>
            <h1 className='font-heading text-4xl font-semibold leading-[1.06] tracking-[-0.02em] sm:text-5xl lg:text-6xl'>
              A modern storefront that feels tailored{' '}
              <span className='relative inline-flex'>
                from the first visit
                <span
                  className='absolute inset-x-0 -bottom-2 h-3 rounded-full opacity-60'
                  style={{
                    background:
                      'linear-gradient(90deg, color-mix(in srgb, var(--hero-accent) 24%, transparent), color-mix(in srgb, var(--hero-accent) 8%, transparent))',
                  }}
                  aria-hidden='true'
                />
              </span>
              .
            </h1>
            <p className='max-w-xl text-sm leading-relaxed text-[var(--cms-appearance-muted-text)] sm:text-base'>
              Highlight your best products, give every collection a story, and keep the look
              aligned with your CMS theme without extra layout work.
            </p>
          </div>
          <div className='flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--cms-appearance-muted-text)]'>
            {['Story-led', 'Fast setup', 'Theme aware'].map((pill) => (
              <span
                key={pill}
                className='rounded-full border border-[var(--cms-appearance-page-border)] px-3 py-1 transition hover:-translate-y-0.5 hover:text-[var(--cms-appearance-page-text)]'
              >
                {pill}
              </span>
            ))}
          </div>
          <div className='flex flex-wrap gap-3'>
            <Link
              href='#products'
              className='cms-appearance-button-primary inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg'
              prefetch={false}
            >
              Explore the catalog
            </Link>
            <Link
              href='/admin'
              className='cms-appearance-button-outline inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5'
              prefetch={false}
            >
              Open admin
            </Link>
          </div>
          <div className='flex flex-wrap gap-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--cms-appearance-muted-text)]'>
            {[
              { label: 'Launch kit', value: `${setupSteps.length} steps` },
              { label: 'Edits ready', value: `${collectionCount} edits` },
              { label: 'Theme modes', value: '4' },
            ].map((stat) => (
              <div key={stat.label} className='flex items-baseline gap-2'>
                <span className='text-[var(--cms-appearance-page-text)]'>{stat.value}</span>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
          <div className='grid gap-3 sm:grid-cols-3'>
            {setupSteps.map((step) => (
              <div
                key={step}
                className='cms-appearance-subtle-surface flex items-start gap-2 rounded-2xl border px-3.5 py-2.5 text-sm text-[var(--cms-appearance-page-text)]'
              >
                <span className='mt-0.5 inline-flex size-6 items-center justify-center rounded-full border'>
                  <Check className='size-4' aria-hidden='true' />
                </span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
        <div className='flex flex-col gap-5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:delay-150'>
          <div className='cms-appearance-subtle-surface rounded-3xl border p-6 shadow-sm'>
            <div className='flex items-center gap-3'>
              <span className='cms-appearance-surface inline-flex size-10 items-center justify-center rounded-2xl border'>
                <Sparkles className='size-5' aria-hidden='true' />
              </span>
              <div>
                <p className='text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cms-appearance-muted-text)]'>
                  Featured stack
                </p>
                <p className='text-lg font-semibold text-[var(--cms-appearance-page-text)]'>
                  Curate collections with confidence.
                </p>
              </div>
            </div>
            <p className='mt-4 text-sm leading-relaxed text-[var(--cms-appearance-muted-text)]'>
              Use the CMS appearance controls to keep each section consistent, then spotlight
              the products that deserve attention.
            </p>
            <div className='mt-6 flex flex-wrap gap-2'>
              {['Lookbook', 'Studio picks', 'Seasonal edit'].map((tag) => (
                <span
                  key={tag}
                  className='rounded-full border border-[var(--cms-appearance-page-border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]'
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className='cms-appearance-surface rounded-3xl border p-6 shadow-sm'>
            <p className='text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cms-appearance-muted-text)]'>
              Storefront focus
            </p>
            <p className='mt-2 text-2xl font-semibold leading-tight text-[var(--cms-appearance-page-text)]'>
              Design for discovery, then let the catalog do the rest.
            </p>
            <p className='mt-3 text-sm leading-relaxed text-[var(--cms-appearance-muted-text)]'>
              Pair editorial sections with product cards to guide visitors toward what you want
              to sell most.
            </p>
          </div>
        </div>
      </div>
      <div className='flex justify-center pb-6'>
        <Link
          href='#signature'
          prefetch={false}
          className='inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--cms-appearance-muted-text)] transition hover:text-[var(--cms-appearance-page-text)]'
        >
          Scroll
          <ChevronDown className='size-4' aria-hidden='true' />
        </Link>
      </div>
    </section>
  );
}
