'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { logKangurClientError } from '@/features/kangur/observability/client';

export default function KangurErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  useEffect(() => {
    logKangurClientError(error, {
      source: 'kangur-error-boundary',
      action: 'render',
      ...(error.digest ? { digest: error.digest } : {}),
    });
  }, [error]);

  return (
    <div
      className='kangur-premium-bg min-h-screen flex items-center justify-center p-6'
      data-testid='kangur-error-shell'
    >
      <div className='w-full max-w-lg rounded-3xl bg-white/90 shadow-2xl border border-indigo-100 p-8 text-center'>
        <div className='text-5xl mb-4'>🦘</div>
        <h2 className='text-2xl font-extrabold text-slate-800'>Kangur encountered an error</h2>
        <p className='mt-3 text-sm text-slate-600'>
          {error.message || 'Something went wrong while loading the Kangur application.'}
        </p>
        <div className='mt-6 flex items-center justify-center gap-3'>
          <button
            type='button'
            onClick={reset}
            className='px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition'
          >
            Try Again
          </button>
          <Link
            href='/kangur'
            className='px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition'
          >
            Back to Kangur
          </Link>
        </div>
      </div>
    </div>
  );
}
