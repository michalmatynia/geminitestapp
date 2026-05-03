'use client';

import { AlertCircle, RefreshCcw, Info } from 'lucide-react';
import React from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';

import { classifyError, getSuggestedActions } from '@/shared/errors/error-classifier';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { getLastUserAction } from '@/shared/utils/observability/user-action-tracker';

import { Button } from './button';

const {
  Context: AppErrorFallbackResetContext,
  useStrictContext: useAppErrorFallbackReset,
} = createStrictContext<() => void>({
  hookName: 'useAppErrorFallbackReset',
  providerName: 'AppErrorFallbackResetContext.Provider',
  displayName: 'AppErrorFallbackResetContext',
});

function AppErrorFallbackTryAgainButton(): React.JSX.Element {
  const resetErrorBoundary = useAppErrorFallbackReset();
  return (
    <Button onClick={resetErrorBoundary} variant='default' className='flex items-center gap-2'>
      <RefreshCcw className='h-4 w-4' aria-hidden='true' />
      Try again
    </Button>
  );
}

export function AppErrorFallback({
  error,
  resetErrorBoundary,
}: FallbackProps): React.JSX.Element {
  const category = classifyError(error);
  const actions = getSuggestedActions(category, error);
  const errorMessage =
    error instanceof Error
      ? error.message
      : 'An unexpected error occurred. Our team has been notified.';

  return (
    <div className='flex min-h-[400px] w-full items-center justify-center p-6'>
      <div
        className='flex max-w-2xl flex-col items-center rounded-lg border border-border/40 bg-muted/10 p-12 text-center'
        role='alert'
        aria-live='assertive'
        aria-atomic='true'
      >
        <div className='mb-4 rounded-full bg-red-500/10 p-3 text-red-500'>
          <AlertCircle className='h-10 w-10' aria-hidden='true' />
        </div>
        <h2 className='mb-2 text-2xl font-bold tracking-tight text-white'>Something went wrong</h2>
        <p className='mb-6 max-w-md text-gray-400'>{errorMessage}</p>

        {actions.length > 0 && (
          <div className='mb-8 w-full max-w-lg rounded-lg border border-white/10 bg-white/5 p-4 text-left'>
            <div className='mb-2 flex items-center gap-2 font-semibold text-white'>
              <Info className='h-4 w-4 text-blue-400' aria-hidden='true' />
              Suggested Actions
            </div>
            <ul className='space-y-3'>
              {actions.map((action, idx) => (
                <li key={idx} className='text-sm text-gray-300'>
                  <span className='font-medium text-white'>{action.label}:</span>{' '}
                  {action.description}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className='flex flex-col gap-3 sm:flex-row'>
          <AppErrorFallbackResetContext.Provider value={resetErrorBoundary}>
            <AppErrorFallbackTryAgainButton />
          </AppErrorFallbackResetContext.Provider>
          <Button variant='outline' onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </div>
      </div>
    </div>
  );
}

interface AppErrorBoundaryProps {
  children: React.ReactNode;
  source?: string;
  onReset?: () => void;
}

/**
 * A general-purpose Error Boundary for the application.
 * Captures component stacks, current route, and last user action
 * and reports them to the centralized observability pipeline.
 */
export function AppErrorBoundary({
  children,
  source = 'AppErrorBoundary',
  onReset,
}: AppErrorBoundaryProps): React.JSX.Element {
  const resetProps = onReset
    ? {
        onReset: (): void => {
          onReset();
        },
      }
    : {};

  return (
    <ErrorBoundary
      FallbackComponent={AppErrorFallback}
      {...resetProps}
      onError={(error, info) => {
        logClientError(error, {
          componentStack: info.componentStack,
          context: {
            source,
            lastUserAction: getLastUserAction(),
            route: typeof window !== 'undefined' ? window.location.pathname : null,
          },
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
