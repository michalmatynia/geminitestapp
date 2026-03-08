'use client';

import { type JSX, type ReactNode } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';

import { KangurErrorFallback } from '@/features/kangur/ui/KangurErrorFallback';

type KangurPublicErrorBoundaryProps = {
  children: ReactNode;
  homeHref: string;
};

type KangurBoundaryError = Error & { digest?: string };

const normalizeKangurBoundaryError = (error: unknown): KangurBoundaryError => {
  if (error instanceof Error) return error as KangurBoundaryError;
  return new Error(
    typeof error === 'string' && error.trim().length > 0
      ? error
      : 'Something went wrong while loading the Kangur application.'
  );
};

function KangurPublicErrorFallback({
  error,
  homeHref,
  resetErrorBoundary,
}: FallbackProps & { homeHref: string }): JSX.Element {
  return (
    <KangurErrorFallback
      error={normalizeKangurBoundaryError(error)}
      homeHref={homeHref}
      reset={resetErrorBoundary}
      source='kangur-public-error-boundary'
    />
  );
}

export function KangurPublicErrorBoundary({
  children,
  homeHref,
}: KangurPublicErrorBoundaryProps): JSX.Element {
  return (
    <ErrorBoundary
      fallbackRender={(props) => <KangurPublicErrorFallback {...props} homeHref={homeHref} />}
    >
      {children}
    </ErrorBoundary>
  );
}
