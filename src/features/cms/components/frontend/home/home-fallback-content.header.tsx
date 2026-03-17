import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import {
  CmsStorefrontAppearanceButtons,
  type CmsAppearanceTone,
} from '@/features/cms/components/frontend/CmsStorefrontAppearance';
import { UI_CENTER_ROW_CLASSNAME, UI_CENTER_ROW_SPACED_CLASSNAME } from '@/shared/ui';

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
    >
      <path d='m8 3 4 8 5-5 5 15H2L8 3z' />
    </svg>
  );
}

export function HomeFallbackHeader({
  appearanceTone,
}: {
  appearanceTone?: CmsAppearanceTone;
}): React.JSX.Element {
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
        <Link href='/' className={UI_CENTER_ROW_SPACED_CLASSNAME} prefetch={false}>
          <span className='cms-appearance-subtle-surface flex size-10 items-center justify-center rounded-full border'>
            <MountainIcon className='size-5' />
          </span>
          <span className='font-heading text-lg tracking-tight'>Storefront</span>
        </Link>
        <nav className='hidden items-center gap-4 text-sm font-medium md:flex' aria-label='Primary'>
          <Link href='#signature' prefetch={false} className='hover:underline'>
            Signature
          </Link>
          <Link href='#highlights' prefetch={false} className='hover:underline'>
            Highlights
          </Link>
          <Link href='#collections' prefetch={false} className='hover:underline'>
            Collections
          </Link>
          <Link href='#products' prefetch={false} className='hover:underline'>
            Products
          </Link>
          <Link href='/admin' prefetch={false} className='hover:underline'>
            Admin
          </Link>
        </nav>
        <div className={UI_CENTER_ROW_SPACED_CLASSNAME}>
          <CmsStorefrontAppearanceButtons
            label='Homepage appearance'
            tone={appearanceToneValue}
          />
          <Link
            href='/admin'
            className='hidden items-center gap-1 rounded-full border border-[var(--cms-appearance-page-border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] md:inline-flex'
            prefetch={false}
          >
            Configure
            <ArrowUpRight className='size-3' aria-hidden='true' />
          </Link>
        </div>
      </div>
      <div className='border-t border-[var(--cms-appearance-page-border)]/60 md:hidden'>
        <nav
          className={`${UI_CENTER_ROW_CLASSNAME} container overflow-x-auto px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em]`}
          aria-label='Section navigation'
        >
          <Link href='#signature' prefetch={false} className='rounded-full border px-3 py-1'>
            Signature
          </Link>
          <Link href='#highlights' prefetch={false} className='rounded-full border px-3 py-1'>
            Highlights
          </Link>
          <Link href='#collections' prefetch={false} className='rounded-full border px-3 py-1'>
            Collections
          </Link>
          <Link href='#products' prefetch={false} className='rounded-full border px-3 py-1'>
            Products
          </Link>
          <Link href='/admin' prefetch={false} className='rounded-full border px-3 py-1'>
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
