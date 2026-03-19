'use client';

import { usePathname } from 'next/navigation';

import { KangurPageTransitionSkeleton } from '@/features/kangur/ui/components/KangurPageTransitionSkeleton';
import { resolveKangurRouteTransitionSkeletonVariant } from '@/features/kangur/ui/routing/route-transition-skeletons';

export function KangurRouteLoadingFallback(): React.JSX.Element {
  const pathname = usePathname();
  const variant = resolveKangurRouteTransitionSkeletonVariant({
    basePath: '/',
    href: pathname,
  });

  return <KangurPageTransitionSkeleton reason='navigation' variant={variant} />;
}
