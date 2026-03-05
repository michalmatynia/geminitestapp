'use client';
import Link from 'next/link';
import React, { useEffect } from 'react';

import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { Button } from '@/shared/ui/button';

const AdminErrorResetContext = React.createContext<(() => void) | null>(null);

function useAdminErrorReset(): () => void {
  const reset = React.useContext(AdminErrorResetContext);
  if (!reset) {
    throw new Error('useAdminErrorReset must be used within AdminErrorResetContext.Provider');
  }
  return reset;
}

function AdminErrorTryAgainButton(): React.JSX.Element {
  const reset = useAdminErrorReset();
  return (
    <Button onClick={reset} className='bg-blue-600 text-white hover:bg-blue-700'>
      Try Again
    </Button>
  );
}

export default function AdminError({
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
      <h2 className='text-xl font-semibold text-red-400'>Admin page error</h2>
      <p className='max-w-md text-sm text-gray-400'>
        {error.message || 'Something went wrong while loading this admin page.'}
      </p>
      <div className='flex flex-wrap items-center justify-center gap-3'>
        <AdminErrorResetContext.Provider value={reset}>
          <AdminErrorTryAgainButton />
        </AdminErrorResetContext.Provider>
        <Button
          asChild
          variant='outline'
          className='border-gray-700 text-gray-300 hover:bg-gray-800'
        >
          <Link href='/admin'>Back to Admin</Link>
        </Button>
      </div>
    </div>
  );
}
