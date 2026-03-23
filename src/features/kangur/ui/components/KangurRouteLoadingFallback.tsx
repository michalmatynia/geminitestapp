'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import { KangurPageTransitionSkeleton } from '@/features/kangur/ui/components/KangurPageTransitionSkeleton';
import { useKangurPendingRouteLoadingSnapshot } from '@/features/kangur/ui/routing/pending-route-loading-snapshot';
import { resolveKangurRouteTransitionSkeletonVariant } from '@/features/kangur/ui/routing/route-transition-skeletons';
import { readKangurTopBarHeightCssValue } from '@/features/kangur/ui/utils/readKangurTopBarHeightCssValue';

export function KangurRouteLoadingFallback({
  includeTopNavigationSkeleton = true,
}: {
  includeTopNavigationSkeleton?: boolean;
} = {}): React.JSX.Element {
  const pendingRouteLoadingSnapshot = useKangurPendingRouteLoadingSnapshot();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const serializedSearchParams = searchParams?.toString().trim() ?? '';
  const currentHref =
    typeof pathname === 'string' && pathname.trim()
      ? serializedSearchParams
        ? `${pathname}?${serializedSearchParams}`
        : pathname
      : null;
  const href = pendingRouteLoadingSnapshot?.href ?? currentHref;
  const variant = pendingRouteLoadingSnapshot?.skeletonVariant ?? resolveKangurRouteTransitionSkeletonVariant({
    basePath: '/',
    href,
  });
  const topBarHeightCssValue =
    pendingRouteLoadingSnapshot?.topBarHeightCssValue ?? readKangurTopBarHeightCssValue();

  return (
    <KangurPageTransitionSkeleton
      pageKey={pendingRouteLoadingSnapshot?.pageKey}
      reason='navigation'
      renderInlineTopNavigationSkeleton={includeTopNavigationSkeleton}
      topBarHeightCssValue={topBarHeightCssValue}
      variant={variant}
    />
  );
}
