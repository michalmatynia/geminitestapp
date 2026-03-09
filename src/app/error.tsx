'use client';
import Link from 'next/link';
import React, { useEffect } from 'react';

import { Button } from '@/shared/ui/button';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

const GlobalErrorResetContext = React.createContext<(() => void) | null>(null);

function useGlobalErrorReset(): () => void {
  const reset = React.useContext(GlobalErrorResetContext);
  if (!reset) {
    throw new Error('useGlobalErrorReset must be used within GlobalErrorResetContext.Provider');
  }
  return reset;
}

function GlobalErrorTryAgainButton(): React.JSX.Element {
  const reset = useGlobalErrorReset();
  return (
    <Button onClick={reset} className='bg-blue-600 text-white hover:bg-blue-700'>
      Try Again
    </Button>
  );
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logClientError(error, {
      ...(error.digest ? { digest: error.digest } : {}),
    });
  }, [error]);

  return (
    <div className='flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 rounded-lg border border-gray-800 bg-gray-900 p-8 text-center text-gray-200'>
      <h2 className='text-xl font-semibold text-red-400'>Something went wrong</h2>
      <p className='max-w-md text-sm text-gray-400'>
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <div className='flex flex-wrap items-center justify-center gap-3'>
        <GlobalErrorResetContext.Provider value={reset}>
          <GlobalErrorTryAgainButton />
        </GlobalErrorResetContext.Provider>
        <Button
          asChild
          variant='outline'
          className='border-gray-700 text-gray-300 hover:bg-gray-800'
        >
          <Link href='/'>Go Home</Link>
        </Button>
      </div>
    </div>
  );
}
