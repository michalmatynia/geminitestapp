'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import { KangurPageTransitionSkeleton } from '@/features/kangur/ui/components/KangurPageTransitionSkeleton';
import { resolveKangurRouteTransitionSkeletonVariant } from '@/features/kangur/ui/routing/route-transition-skeletons';

export function KangurRouteLoadingFallback(): React.JSX.Element {
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

  return <KangurPageTransitionSkeleton reason='navigation' variant={variant} />;
}
