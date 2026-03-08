'use client';

import Link from 'next/link';
import { useEffect, type JSX } from 'react';

import { logKangurClientError } from '@/features/kangur/observability/client';

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
      className='kangur-premium-bg flex min-h-screen items-center justify-center p-6'
      data-testid='kangur-error-shell'
    >
      <div className='w-full max-w-lg rounded-3xl border border-indigo-100 bg-white/90 p-8 text-center shadow-2xl'>
        <div className='mb-4 text-4xl font-black text-indigo-500'>K</div>
        <h2 className='text-2xl font-extrabold text-slate-800'>Kangur encountered an error</h2>
        <p className='mt-3 text-sm text-slate-600'>{errorMessage}</p>
        <div className='mt-6 flex items-center justify-center gap-3'>
          <button
            type='button'
            onClick={reset}
            className='rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700'
          >
            Try Again
          </button>
          <Link
            href={homeHref}
            className='rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50'
          >
            Back to Kangur
          </Link>
        </div>
      </div>
    </div>
  );
}
