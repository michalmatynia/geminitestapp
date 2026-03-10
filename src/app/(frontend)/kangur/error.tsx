'use client';

import { KangurErrorFallback } from '@/features/kangur/ui/KangurErrorFallback';

export default function KangurErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  const boundaryError = error;
  const handleReset = (): void => {
    reset();
  };

  return <KangurErrorFallback error={boundaryError} homeHref='/kangur' reset={handleReset} />;
}
