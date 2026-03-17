import Link from 'next/link';
import React from 'react';

import {
  UI_CENTER_ROW_CLASSNAME,
  UI_STACK_RELAXED_CLASSNAME,
  UI_STACK_SPACED_CLASSNAME,
} from '@/shared/ui';
export type SocialLink = {
  id: string;
  label: string;
  href: string;
  Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  fallback: string;
};

export function HomeFallbackFooter({
  socialLinks,
}: {
  socialLinks: SocialLink[];
}): React.JSX.Element {
  return (
    <footer className='flex w-full shrink-0 flex-col gap-6 border-t border-[var(--cms-appearance-page-border)] px-4 py-8 md:px-6'>
      <div className={`${UI_STACK_RELAXED_CLASSNAME} md:flex-row md:items-center md:justify-between`}>
        <div className='space-y-2'>
          <p className='font-heading text-lg'>Storefront</p>
          <p className='cms-appearance-muted-text text-xs'>
            Curated commerce powered by your CMS appearance settings.
          </p>
        </div>
        <div className={`${UI_STACK_SPACED_CLASSNAME} md:flex-row md:items-center`}>
          <nav className='flex flex-wrap gap-4 text-xs font-medium uppercase tracking-[0.2em]'>
            <Link href='#signature' className='hover:underline' prefetch={false}>
              Signature
            </Link>
            <Link href='#highlights' className='hover:underline' prefetch={false}>
              Highlights
            </Link>
            <Link href='#collections' className='hover:underline' prefetch={false}>
              Collections
            </Link>
            <Link href='#products' className='hover:underline' prefetch={false}>
              Products
            </Link>
            <Link href='/admin' className='hover:underline' prefetch={false}>
              Admin
            </Link>
          </nav>
          {socialLinks.length ? (
            <nav className={UI_CENTER_ROW_CLASSNAME} aria-label='Social media'>
              {socialLinks.map((link) => {
                const Icon = link.Icon;
                return (
                  <a
                    key={link.id}
                    href={link.href}
                    className='cms-appearance-subtle-surface cms-appearance-muted-text inline-flex size-9 items-center justify-center rounded-full border transition hover:text-[var(--cms-appearance-page-text)]'
                    target='_blank'
                    rel='noopener noreferrer'
                    aria-label={link.label}
                  >
                    {Icon ? (
                      <Icon className='size-4' aria-hidden='true' />
                    ) : (
                      <span className='text-[10px] font-semibold' aria-hidden='true'>
                        {link.fallback}
                      </span>
                    )}
                    <span className='sr-only'>{link.label}</span>
                  </a>
                );
              })}
            </nav>
          ) : null}
        </div>
      </div>
      <p className='cms-appearance-muted-text text-xs'>
        &copy; 2024 Acme Inc. All rights reserved.
      </p>
    </footer>
  );
}
