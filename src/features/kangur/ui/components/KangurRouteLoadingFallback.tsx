'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import { KangurPageTransitionSkeleton } from '@/features/kangur/ui/components/KangurPageTransitionSkeleton';
import { useOptionalNextAuthSession } from '@/features/kangur/ui/hooks/useOptionalNextAuthSession';
import {
  resolveAccessibleKangurPendingRouteLoadingSnapshot,
  useKangurPendingRouteLoadingSnapshot,
} from '@/features/kangur/ui/routing/pending-route-loading-snapshot';
import {
  resolveAccessibleKangurRouteTransitionTarget,
  resolveKangurRouteTransitionSkeletonVariant,
} from '@/features/kangur/ui/routing/route-transition-skeletons';
import {
  resolveManagedKangurBasePath,
  resolveManagedKangurEmbeddedFromHref,
} from '@/features/kangur/ui/routing/managed-paths';
import { readKangurTopBarHeightCssValue } from '@/features/kangur/ui/utils/readKangurTopBarHeightCssValue';

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
          basePath: resolveManagedKangurBasePath(currentHref),
        });
  const targetEmbedded =
    targetHref === null
      ? null
      : resolveManagedKangurEmbeddedFromHref({
          href: targetHref,
          basePath: resolveManagedKangurBasePath(targetHref),
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
  const { data: session } = useOptionalNextAuthSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const serializedSearchParams = searchParams?.toString().trim() ?? '';
  const currentHref =
    typeof pathname === 'string' && pathname.trim()
      ? serializedSearchParams
        ? `${pathname}?${serializedSearchParams}`
        : pathname
      : null;
  const pendingRouteLoadingSnapshot = resolveAccessibleKangurPendingRouteLoadingSnapshot({
    currentHref,
    fallbackPageKey: 'Game',
    session,
    snapshot: useKangurPendingRouteLoadingSnapshot(),
  });
  const href = pendingRouteLoadingSnapshot?.href ?? currentHref;
  const basePath = resolveManagedKangurBasePath(href);
  const transitionTarget =
    pendingRouteLoadingSnapshot === null
      ? resolveAccessibleKangurRouteTransitionTarget({
          basePath,
          fallbackPageKey: 'Game',
          href: href ?? '/',
          session,
        })
      : null;
  const accessiblePageKey =
    pendingRouteLoadingSnapshot?.pageKey ?? transitionTarget?.pageKey ?? 'Game';
  const variant =
    pendingRouteLoadingSnapshot?.skeletonVariant ??
    transitionTarget?.skeletonVariant ??
    resolveKangurRouteTransitionSkeletonVariant({
      basePath,
      fallbackPageKey: 'Game',
      href,
      pageKey: accessiblePageKey,
      session,
    });
  const topBarHeightCssValue =
    pendingRouteLoadingSnapshot?.topBarHeightCssValue ?? readKangurTopBarHeightCssValue();
  const embeddedOverride = resolveTransitionEmbeddedOverride({
    currentHref: pendingRouteLoadingSnapshot?.fromHref ?? currentHref,
    targetHref: href,
  });

  return (
    <KangurPageTransitionSkeleton
      embeddedOverride={embeddedOverride}
      pageKey={accessiblePageKey}
      reason='navigation'
      renderInlineTopNavigationSkeleton={includeTopNavigationSkeleton}
      topBarHeightCssValue={topBarHeightCssValue}
      variant={variant}
    />
  );
}
