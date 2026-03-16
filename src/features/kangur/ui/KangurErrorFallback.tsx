'use client';

import Link from 'next/link';
import { useEffect, type JSX } from 'react';

import { logKangurClientError } from '@/features/kangur/observability/client';
import { KangurPageContainer } from '@/features/kangur/ui/design/primitives';

type KangurErrorFallbackProps = {
  error: unknown;
  homeHref: string;
  reset: () => void;
  source?: string;
};

const getKangurErrorDigest = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || !error || !('digest' in error)) {
    return undefined;
  }

  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === 'string' && digest.trim().length > 0 ? digest : undefined;
};

const getKangurErrorMessage = (error: unknown): string =>
  error instanceof Error && error.message.trim().length > 0
    ? error.message
    : 'Something went wrong while loading the Kangur application.';

export function KangurErrorFallback({
  error,
  homeHref,
  reset,
  source = 'kangur-error-boundary',
}: KangurErrorFallbackProps): JSX.Element {
  const digest = getKangurErrorDigest(error);
  const errorMessage = getKangurErrorMessage(error);

  useEffect(() => {
    logKangurClientError(error, {
      source,
      action: 'render',
      homeHref,
      ...(digest ? { digest } : {}),
    });
  }, [digest, error, homeHref, source]);

  return (
    <div
      className='kangur-premium-bg flex min-h-screen min-h-[100svh] min-h-[100dvh] items-center justify-center p-6'
      data-kangur-appearance='default'
      data-testid='kangur-error-shell'
      id='kangur-error-page'
    >
      <a
        href='#kangur-error-main'
        className='sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:rounded-full focus:bg-white/96 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-indigo-700 focus:shadow-[0_18px_40px_-28px_rgba(79,99,216,0.6)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/70'
      >
        Przejdź do głównej treści
      </a>
      <KangurPageContainer
        as='main'
        className='flex w-full flex-1 items-center justify-center'
        data-kangur-route-main='true'
        id='kangur-error-main'
      >
        <div
          className='glass-panel w-full max-w-lg rounded-3xl p-8 text-center shadow-2xl'
          role='alert'
          aria-live='assertive'
          aria-atomic='true'
        >
          <div className='mb-4 text-4xl font-black text-indigo-500' aria-hidden='true'>
            K
          </div>
          <h1 className='text-2xl font-extrabold [color:var(--kangur-page-text)]'>
            Kangur encountered an error
          </h1>
          <p className='mt-3 text-sm [color:var(--kangur-page-muted-text)]'>{errorMessage}</p>
          <div className='mt-6 flex items-center justify-center kangur-panel-gap'>
            <button
              type='button'
              onClick={reset}
              className='rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white'
            >
              Try Again
            </button>
            <Link
              href={homeHref}
              className='soft-card rounded-xl border px-4 py-2 font-semibold [color:var(--kangur-page-text)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white'
            >
              Back to Kangur
            </Link>
          </div>
        </div>
      </KangurPageContainer>
    </div>
  );
}
