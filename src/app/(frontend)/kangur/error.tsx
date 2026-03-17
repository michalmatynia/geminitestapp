'use client';

import { type JSX } from 'react';

import { KangurErrorFallback } from '@/features/kangur/ui/KangurErrorFallback';

type KangurErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: KangurErrorPageProps): JSX.Element {
  return (
    <KangurErrorFallback
      error={error}
      reset={reset}
      homeHref='/kangur'
      source='kangur-error-page'
    />
  );
}
