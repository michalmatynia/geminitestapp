'use client';

import Link from 'next/link';
import React, { useEffect } from 'react';

import { Button } from '@/shared/ui/button';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

const FrontendErrorResetContext = React.createContext<(() => void) | null>(null);

function useFrontendErrorReset(): () => void {
  const reset = React.useContext(FrontendErrorResetContext);
  if (!reset) {
    throw new Error('useFrontendErrorReset must be used within FrontendErrorResetContext.Provider');
  }
  return reset;
}

function FrontendErrorTryAgainButton(): React.JSX.Element {
  const reset = useFrontendErrorReset();
  return (
    <Button
      onClick={reset}
      className='border-transparent hover:opacity-90'
      style={{
        background:
          'var(--cms-appearance-button-primary-background, var(--kangur-nav-item-active-background, #2563eb))',
        color: 'var(--cms-appearance-button-primary-text, #ffffff)',
      }}
    >
      Try Again
    </Button>
  );
}

export default function FrontendError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logClientError(error, {
      ...(error.digest ? { digest: error.digest } : {}),
      context: { source: 'frontend-error-boundary' },
    });
  }, [error]);

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
      <h2 className='text-xl font-semibold text-red-400'>Something went wrong</h2>
      <p
        className='max-w-md text-sm'
        style={{
          color: 'var(--cms-appearance-muted-text, var(--kangur-page-muted-text, #64748b))',
        }}
      >
        {error.message || 'We hit a snag while loading this page.'}
      </p>
      <div className='flex flex-wrap items-center justify-center gap-3'>
        <FrontendErrorResetContext.Provider value={reset}>
          <FrontendErrorTryAgainButton />
        </FrontendErrorResetContext.Provider>
        <Button
          asChild
          variant='outline'
          className='hover:opacity-90'
          style={{
            borderColor:
              'var(--cms-appearance-page-border, var(--kangur-soft-card-border, rgba(226,232,240,0.92)))',
            color: 'var(--cms-appearance-page-text, var(--kangur-page-text, #334155))',
            background:
              'color-mix(in srgb, var(--cms-appearance-subtle-surface, var(--kangur-soft-card-background, #ffffff)) 84%, transparent)',
          }}
        >
          <Link href='/'>Back to Home</Link>
        </Button>
      </div>
    </div>
  );
}
