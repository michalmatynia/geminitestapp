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
    <Button onClick={reset} className='bg-blue-600 text-white hover:bg-blue-700'>
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
    <div className='flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 rounded-lg border border-gray-800 bg-gray-900 p-8 text-center text-gray-200'>
      <h2 className='text-xl font-semibold text-red-400'>Something went wrong</h2>
      <p className='max-w-md text-sm text-gray-400'>
        {error.message || 'We hit a snag while loading this page.'}
      </p>
      <div className='flex flex-wrap items-center justify-center gap-3'>
        <FrontendErrorResetContext.Provider value={reset}>
          <FrontendErrorTryAgainButton />
        </FrontendErrorResetContext.Provider>
        <Button
          asChild
          variant='outline'
          className='border-gray-700 text-gray-300 hover:bg-gray-800'
        >
          <Link href='/'>Back to Home</Link>
        </Button>
      </div>
    </div>
  );
}
