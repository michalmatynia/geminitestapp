import Link from 'next/link';
import { JSX } from 'react';

import { Button } from '@/shared/ui/button';

export default function FrontendNotFound(): JSX.Element {
  return (
    <div
      className='flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 rounded-lg border p-8 text-center'
      style={{
        background:
          'var(--cms-appearance-subtle-surface, var(--kangur-soft-card-background, rgba(255,255,255,0.92)))',
        borderColor:
          'var(--cms-appearance-page-border, var(--kangur-soft-card-border, rgba(226,232,240,0.92)))',
        color: 'var(--cms-appearance-page-text, var(--kangur-page-text, #334155))',
      }}
    >
      <h1
        className='text-2xl font-semibold'
        style={{ color: 'var(--cms-appearance-page-text, var(--kangur-page-text, #334155))' }}
      >
        Page not found
      </h1>
      <p
        className='max-w-md text-sm'
        style={{
          color: 'var(--cms-appearance-muted-text, var(--kangur-page-muted-text, #64748b))',
        }}
      >
        We couldn&apos;t find what you&apos;re looking for.
      </p>
      <Button
        asChild
        className='border-transparent hover:opacity-90'
        style={{
          background:
            'var(--cms-appearance-button-primary-background, var(--kangur-nav-item-active-background, #2563eb))',
          color: 'var(--cms-appearance-button-primary-text, #ffffff)',
        }}
      >
        <Link href='/'>Back to Home</Link>
      </Button>
    </div>
  );
}
