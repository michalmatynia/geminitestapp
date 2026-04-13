'use client';

import { ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import React from 'react';

import { Link as LocaleLink } from '@/i18n/navigation';
import { useHomeFallback } from './home-fallback-content';
import {
  CmsStorefrontAppearanceButtons,
  type CmsAppearanceTone,
} from '@/shared/ui/cms-appearance/CmsStorefrontAppearance';
import {
  UI_CENTER_ROW_CLASSNAME,
  UI_CENTER_ROW_SPACED_CLASSNAME,
} from '@/shared/ui/layout';

function MountainIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns='http://www.w3.org/2000/svg'
      width='24'
      height='24'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
      focusable='false'
    >
      <path d='m8 3 4 8 5-5 5 15H2L8 3z' />
    </svg>
  );
}

export function HomeFallbackHeader(): React.JSX.Element {
  const { appearanceTone } = useHomeFallback();
  const translations = useTranslations('FallbackHome.Header');
  const appearanceToneValue = appearanceTone;
  const headerStyle: React.CSSProperties = {
    backgroundColor:
      'color-mix(in srgb, var(--cms-appearance-page-background) 90%, transparent)',
  };

  return (
    <header
      className='sticky top-0 z-30 border-b border-[var(--cms-appearance-page-border)]/60 backdrop-blur'
      style={headerStyle}
    >
      <div className='container flex h-16 items-center justify-between px-4 md:px-6'>
        <LocaleLink href='/' className={UI_CENTER_ROW_SPACED_CLASSNAME} prefetch={false}>
          <span className='cms-appearance-subtle-surface flex size-10 items-center justify-center rounded-full border'>
            <MountainIcon className='size-5' />
          </span>
          <span className='font-heading text-lg tracking-tight'>{translations('brand')}</span>
        </LocaleLink>
        <nav
          className='hidden items-center gap-4 text-sm font-medium md:flex'
          aria-label={translations('primaryNavAria')}
        >
          <a href='#signature' className='hover:underline'>
            {translations('signature')}
          </a>
          <a href='#highlights' className='hover:underline'>
            {translations('highlights')}
          </a>
          <a href='#collections' className='hover:underline'>
            {translations('collections')}
          </a>
          <a href='#products' className='hover:underline'>
            {translations('products')}
          </a>
          <Link href='/admin' prefetch={false} className='hover:underline'>
            {translations('admin')}
          </Link>
        </nav>
        <div className={UI_CENTER_ROW_SPACED_CLASSNAME}>
          <CmsStorefrontAppearanceButtons
            label={translations('appearance')}
            tone={appearanceToneValue}
          />
          <Link
            href='/admin'
            className='hidden items-center gap-1 rounded-full border border-[var(--cms-appearance-page-border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] md:inline-flex'
            prefetch={false}
          >
            {translations('configure')}
            <ArrowUpRight className='size-3' aria-hidden='true' />
          </Link>
        </div>
      </div>
      <div className='border-t border-[var(--cms-appearance-page-border)]/60 md:hidden'>
        <nav
          className={`${UI_CENTER_ROW_CLASSNAME} container overflow-x-auto px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em]`}
          aria-label={translations('sectionNavAria')}
        >
          <a href='#signature' className='rounded-full border px-3 py-1'>
            {translations('signature')}
          </a>
          <a href='#highlights' className='rounded-full border px-3 py-1'>
            {translations('highlights')}
          </a>
          <a href='#collections' className='rounded-full border px-3 py-1'>
            {translations('collections')}
          </a>
          <a href='#products' className='rounded-full border px-3 py-1'>
            {translations('products')}
          </a>
          <Link href='/admin' prefetch={false} className='rounded-full border px-3 py-1'>
            {translations('admin')}
          </Link>
        </nav>
      </div>
    </header>
  );
}
