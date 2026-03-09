'use client';

import React, { useEffect } from 'react';

import { Button } from '@/shared/ui/button';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

const NotesErrorResetContext = React.createContext<(() => void) | null>(null);

function useNotesErrorReset(): () => void {
  const reset = React.useContext(NotesErrorResetContext);
  if (!reset) {
    throw new Error('useNotesErrorReset must be used within NotesErrorResetContext.Provider');
  }
  return reset;
}

function NotesErrorTryAgainButton(): React.JSX.Element {
  const reset = useNotesErrorReset();
  return (
    <Button onClick={reset} className='bg-blue-600 hover:bg-blue-700 text-white'>
      Try Again
    </Button>
  );
}

export default function NotesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logClientError(error, {
      ...(error.digest ? { digest: error.digest } : {}),
      context: { source: 'admin-notes-error-boundary' },
    });
  }, [error]);

  return (
    <div className='flex h-full w-full flex-col items-center justify-center gap-4 rounded-lg bg-gray-900 p-8 text-center text-gray-200 border border-gray-800'>
      <h2 className='text-xl font-bold text-red-400'>Something went wrong!</h2>
      <p className='max-w-md text-sm text-gray-400'>
        {error.message || 'An unexpected error occurred while loading your notes.'}
      </p>
      <div className='flex gap-4'>
        <Button
          onClick={() => window.location.reload()}
          variant='outline'
          className='border-gray-700 hover:bg-gray-800 text-gray-300'
        >
          Reload Page
        </Button>
        <NotesErrorResetContext.Provider value={reset}>
          <NotesErrorTryAgainButton />
        </NotesErrorResetContext.Provider>
      </div>
    </div>
  );
}
