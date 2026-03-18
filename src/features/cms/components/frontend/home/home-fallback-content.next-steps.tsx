'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import React from 'react';

import { UI_STACK_ROOMY_CLASSNAME } from '@/shared/ui';
export function HomeFallbackNextSteps(): React.JSX.Element {
  const translations = useTranslations('FallbackHome.NextSteps');

  return (
    <section className='w-full py-12' aria-labelledby='next-steps-title'>
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
          <div className={`${UI_STACK_ROOMY_CLASSNAME} relative md:flex-row md:items-center md:justify-between`}>
            <div className='space-y-2'>
              <p className='text-xs font-semibold uppercase tracking-[0.3em] text-[var(--cms-appearance-muted-text)]'>
                {translations('eyebrow')}
              </p>
              <h2
                id='next-steps-title'
                className='font-heading text-3xl font-semibold tracking-tight sm:text-[2.3rem]'
              >
                {translations('title')}
              </h2>
              <p className='text-sm leading-relaxed text-[var(--cms-appearance-muted-text)]'>
                {translations('description')}
              </p>
            </div>
            <Link
              href='/admin'
              className='cms-appearance-button-outline inline-flex items-center justify-center rounded-full border px-6 py-3 text-sm font-semibold'
              prefetch={false}
            >
              {translations('cta')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
