'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import { KangurPageTransitionSkeleton } from '@/features/kangur/ui/components/KangurPageTransitionSkeleton';
import { KangurTopNavigationSkeleton } from '@/features/kangur/ui/components/KangurTopNavigationSkeleton';
import { resolveKangurRouteTransitionSkeletonVariant } from '@/features/kangur/ui/routing/route-transition-skeletons';

export function KangurRouteLoadingFallback({
  includeTopNavigationSkeleton = true,
}: {
  includeTopNavigationSkeleton?: boolean;
} = {}): React.JSX.Element {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const serializedSearchParams = searchParams?.toString().trim() ?? '';
  const href =
    typeof pathname === 'string' && pathname.trim()
      ? serializedSearchParams
        ? `${pathname}?${serializedSearchParams}`
        : pathname
      : null;
  const variant = resolveKangurRouteTransitionSkeletonVariant({
    basePath: '/',
    href,
  });

  const pageSkeleton = (
    <KangurPageTransitionSkeleton
      reason='navigation'
      renderInlineTopNavigationSkeleton={!includeTopNavigationSkeleton}
      variant={variant}
    />
  );

  if (!includeTopNavigationSkeleton) {
    return pageSkeleton;
  }

  return (
    <>
      <KangurTopNavigationSkeleton />
      {pageSkeleton}
    </>
  );
}
