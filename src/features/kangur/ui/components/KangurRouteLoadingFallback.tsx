'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import { KANGUR_BASE_PATH } from '@/features/kangur/config/routing';
import { KangurPageTransitionSkeleton } from '@/features/kangur/ui/components/KangurPageTransitionSkeleton';
import { useKangurPendingRouteLoadingSnapshot } from '@/features/kangur/ui/routing/pending-route-loading-snapshot';
import { resolveKangurRouteTransitionSkeletonVariant } from '@/features/kangur/ui/routing/route-transition-skeletons';
import {
  normalizeManagedKangurPathname,
  resolveManagedKangurEmbeddedFromHref,
} from '@/features/kangur/ui/routing/managed-paths';
import { readKangurTopBarHeightCssValue } from '@/features/kangur/ui/utils/readKangurTopBarHeightCssValue';

const resolveKangurBasePath = (href: string | null): string => {
  const normalizedPathname = normalizeManagedKangurPathname(href);

  if (!normalizedPathname) {
    return '/';
  }

  return normalizedPathname === KANGUR_BASE_PATH ||
    normalizedPathname.startsWith(`${KANGUR_BASE_PATH}/`)
    ? KANGUR_BASE_PATH
    : '/';
};

const resolveTransitionEmbeddedOverride = ({
  currentHref,
  targetHref,
}: {
  currentHref: string | null;
  targetHref: string | null;
}): boolean | null => {
  const currentEmbedded =
    currentHref === null
      ? null
      : resolveManagedKangurEmbeddedFromHref({
          href: currentHref,
          basePath: resolveKangurBasePath(currentHref),
        });
  const targetEmbedded =
    targetHref === null
      ? null
      : resolveManagedKangurEmbeddedFromHref({
          href: targetHref,
          basePath: resolveKangurBasePath(targetHref),
        });

  if (currentEmbedded === null) {
    return targetEmbedded;
  }

  if (targetEmbedded === null) {
    return currentEmbedded;
  }

  return currentEmbedded && targetEmbedded;
};

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
  const basePath = resolveKangurBasePath(href);
  const variant = pendingRouteLoadingSnapshot?.skeletonVariant ?? resolveKangurRouteTransitionSkeletonVariant({
    basePath,
    href,
  });
  const topBarHeightCssValue =
    pendingRouteLoadingSnapshot?.topBarHeightCssValue ?? readKangurTopBarHeightCssValue();
  const embeddedOverride = resolveTransitionEmbeddedOverride({
    currentHref,
    targetHref: href,
  });

  return (
    <KangurPageTransitionSkeleton
      embeddedOverride={embeddedOverride}
      pageKey={pendingRouteLoadingSnapshot?.pageKey}
      reason='navigation'
      renderInlineTopNavigationSkeleton={includeTopNavigationSkeleton}
      topBarHeightCssValue={topBarHeightCssValue}
      variant={variant}
    />
  );
}
