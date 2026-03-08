'use client';

import { KangurErrorFallback } from '@/features/kangur/ui/KangurErrorFallback';

export default function KangurErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  return <KangurErrorFallback error={error} homeHref='/kangur' reset={reset} />;
}
