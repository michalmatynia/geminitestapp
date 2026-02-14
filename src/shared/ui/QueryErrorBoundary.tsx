'use client';

import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { RefreshCcw } from 'lucide-react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';

import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { getLastUserAction } from '@/shared/utils/observability/user-action-tracker';

import { Button } from './button';
import { SectionPanel } from './section-panel';

function QueryErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className='flex min-h-[400px] w-full items-center justify-center p-8'>
      <SectionPanel variant='subtle' className='flex max-w-lg flex-col items-center p-12 text-center'>
        <h2 className='text-xl font-bold text-red-500'>Something went wrong</h2>
        <p className='mt-2 mb-6 text-sm text-gray-400'>
          {(error as Error)?.message || 'An unexpected error occurred while loading data.'}
        </p>
        <Button
          onClick={resetErrorBoundary}
          variant='default'
          className='flex items-center gap-2'
        >
          <RefreshCcw className='h-4 w-4' />
          Try again
        </Button>
      </SectionPanel>
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
          context: {
            source: 'QueryErrorBoundary',
            lastUserAction: getLastUserAction(),
            route: typeof window !== 'undefined' ? window.location.pathname : null,
          },
        });
      }}
      resetKeys={[]}
    >
      {children}
    </ErrorBoundary>
  );
}
