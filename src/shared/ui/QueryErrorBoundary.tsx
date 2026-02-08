'use client';

import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';

import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { Button } from './button';

function QueryErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className='flex min-h-[400px] flex-col items-center justify-center space-y-4 p-8'>
      <div className='text-center'>
        <h2 className='text-lg font-semibold text-red-600'>Something went wrong</h2>
        <p className='mt-2 text-sm text-gray-600'>
          {(error as Error)?.message || 'An unexpected error occurred while loading data.'}
        </p>
      </div>
      <Button
        onClick={resetErrorBoundary}
        variant='outline'
        className='flex items-center gap-2'
      >
        <RefreshCw className='h-4 w-4' />
        Try again
      </Button>
    </div>
  );
}

interface QueryErrorBoundaryProps {
  children: React.ReactNode;
}

export function QueryErrorBoundary({ children }: QueryErrorBoundaryProps) {
  const { reset } = useQueryErrorResetBoundary();

  return (
    <ErrorBoundary
      FallbackComponent={QueryErrorFallback}
      onReset={reset}
      onError={(error, info) => {
        logClientError(error, {
          componentStack: info.componentStack,
          context: { source: 'QueryErrorBoundary' },
        });
      }}
      resetKeys={[]}
    >
      {children}
    </ErrorBoundary>
  );
}
