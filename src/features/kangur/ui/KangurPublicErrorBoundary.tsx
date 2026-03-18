'use client';

import { useTranslations } from 'next-intl';
import { type JSX, type ReactNode } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';

import { KangurErrorFallback } from '@/features/kangur/ui/KangurErrorFallback';

type KangurPublicErrorBoundaryProps = {
  children: ReactNode;
  homeHref: string;
};

type KangurBoundaryError = Error & { digest?: string };

const normalizeKangurBoundaryError = (
  error: unknown,
  fallbackMessage: string
): KangurBoundaryError => {
  if (error instanceof Error) {
    return error as KangurBoundaryError;
  }

  return new Error(
    typeof error === 'string' && error.trim().length > 0
      ? error
      : fallbackMessage
  );
};

export function KangurPublicErrorBoundary({
  children,
  homeHref,
}: KangurPublicErrorBoundaryProps): JSX.Element {
  const translations = useTranslations('KangurPublic');
  const errorFallbackHomeHref = homeHref;

  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }: FallbackProps) => (
        <KangurErrorFallback
          error={normalizeKangurBoundaryError(error, translations('errorDescription'))}
          homeHref={errorFallbackHomeHref}
          reset={resetErrorBoundary}
          source='kangur-public-error-boundary'
        />
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
