'use client';

import { AlertCircle, RefreshCcw } from 'lucide-react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';

import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { getLastUserAction } from '@/shared/utils/observability/user-action-tracker';

import { Button } from './button';

function AppErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const errorMessage =
    error instanceof Error ? error.message : 'An unexpected error occurred. Our team has been notified.';

  return (
    <div className="flex min-h-[400px] w-full flex-col items-center justify-center p-6 text-center">
      <div className="mb-4 rounded-full bg-red-100 p-3 text-red-600">
        <AlertCircle className="h-10 w-10" />
      </div>
      <h2 className="mb-2 text-2xl font-bold tracking-tight text-slate-900">
        Something went wrong
      </h2>
      <p className="mb-8 max-w-md text-slate-600">
        {errorMessage}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={resetErrorBoundary}
          className="flex items-center gap-2"
        >
          <RefreshCcw className="h-4 w-4" />
          Try again
        </Button>
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
        >
          Reload page
        </Button>
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
export function AppErrorBoundary({ children, source = 'AppErrorBoundary', onReset }: AppErrorBoundaryProps) {
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
