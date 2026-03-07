'use client';

import { useEffect } from 'react';

import { logClientError } from '@/shared/utils/observability/client-error-logger';

export default function RootGlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logClientError(error, {
      ...(error.digest ? { digest: error.digest } : {}),
      context: { source: 'root-global-error-boundary' },
    });
  }, [error]);

  return (
    <html lang='en'>
      <body className='m-0 bg-[#0b0d12] text-[#e7edf3]'>
        <main
          id='app-content'
          tabIndex={-1}
          className='mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 p-6 text-center focus:outline-none'
        >
          <h1 className='text-2xl font-semibold'>Something went wrong</h1>
          <p className='text-sm text-[#9aa7b6]'>
            {error.message || 'An unexpected error occurred while rendering the application.'}
          </p>
          <button
            type='button'
            onClick={() => reset()}
            className='rounded-md border border-[#2f3a47] bg-[#162030] px-4 py-2 text-sm font-medium text-white hover:bg-[#1f2d42]'
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
