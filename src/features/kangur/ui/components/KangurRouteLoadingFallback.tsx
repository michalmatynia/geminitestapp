'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import { KangurPageTransitionSkeleton } from '@/features/kangur/ui/components/KangurPageTransitionSkeleton';
import {
  useKangurPendingRouteLoadingSnapshot,
} from '@/features/kangur/ui/routing/pending-route-loading-snapshot';
import { useKangurRouteAccess } from '@/features/kangur/ui/routing/useKangurRouteAccess';
import {
  resolveManagedKangurBasePath,
  resolveManagedKangurEmbeddedFromHref,
} from '@/features/kangur/ui/routing/managed-paths';
import { readKangurTopBarHeightCssValue } from '@/features/kangur/ui/utils/readKangurTopBarHeightCssValue';

type KangurRouteAccessState = ReturnType<typeof useKangurRouteAccess>;
type KangurPendingRouteLoadingSnapshot = ReturnType<KangurRouteAccessState['resolvePendingSnapshot']>;
type KangurTransitionTarget =
  | ReturnType<KangurRouteAccessState['resolveTransitionTarget']>
  | null;

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

const resolveCurrentRouteHref = ({
  pathname,
  searchParams,
}: {
  pathname: string | null;
  searchParams: ReturnType<typeof useSearchParams>;
}): string | null => {
  const serializedSearchParams = searchParams?.toString().trim() ?? '';
  if (typeof pathname !== 'string' || !pathname.trim()) {
    return null;
  }

  return serializedSearchParams ? `${pathname}?${serializedSearchParams}` : pathname;
};

const resolveFallbackTransitionTarget = ({
  basePath,
  href,
  pendingRouteLoadingSnapshot,
  resolveTransitionTarget,
}: {
  basePath: string;
  href: string | null;
  pendingRouteLoadingSnapshot: KangurPendingRouteLoadingSnapshot;
  resolveTransitionTarget: KangurRouteAccessState['resolveTransitionTarget'];
}) =>
  pendingRouteLoadingSnapshot === null
    ? resolveTransitionTarget({
        basePath,
        fallbackPageKey: 'Game',
        href: href ?? '/',
      })
    : null;

const resolveFallbackTransitionVariant = ({
  accessiblePageKey,
  basePath,
  href,
  pendingRouteLoadingSnapshot,
  resolveTransitionSkeletonVariant,
  transitionTarget,
}: {
  accessiblePageKey: string;
  basePath: string;
  href: string | null;
  pendingRouteLoadingSnapshot: KangurPendingRouteLoadingSnapshot;
  resolveTransitionSkeletonVariant: KangurRouteAccessState['resolveTransitionSkeletonVariant'];
  transitionTarget: KangurTransitionTarget;
}) =>
  pendingRouteLoadingSnapshot?.skeletonVariant ??
  transitionTarget?.skeletonVariant ??
  resolveTransitionSkeletonVariant({
    basePath,
    fallbackPageKey: 'Game',
    href,
    pageKey: accessiblePageKey,
  });

const resolvePendingRouteLoadingSnapshotState = ({
  currentHref,
  resolvePendingSnapshot,
  snapshot,
}: {
  currentHref: string | null;
  resolvePendingSnapshot: KangurRouteAccessState['resolvePendingSnapshot'];
  snapshot: ReturnType<typeof useKangurPendingRouteLoadingSnapshot>;
}): KangurPendingRouteLoadingSnapshot =>
  resolvePendingSnapshot({
    currentHref,
    fallbackPageKey: 'Game',
    snapshot,
  });

const resolveFallbackAccessiblePageKey = ({
  pendingRouteLoadingSnapshot,
  transitionTarget,
}: {
  pendingRouteLoadingSnapshot: KangurPendingRouteLoadingSnapshot;
  transitionTarget: KangurTransitionTarget;
}): string => pendingRouteLoadingSnapshot?.pageKey ?? transitionTarget?.pageKey ?? 'Game';

const resolveFallbackTopBarHeightCssValue = (
  pendingRouteLoadingSnapshot: KangurPendingRouteLoadingSnapshot
): string | null =>
  pendingRouteLoadingSnapshot?.topBarHeightCssValue ?? readKangurTopBarHeightCssValue();

const resolveFallbackSnapshotInput = ({
  currentHref,
  resolvePendingSnapshot,
  resolveTransitionTarget,
  resolveTransitionSkeletonVariant,
  snapshot,
}: {
  currentHref: string | null;
  resolvePendingSnapshot: KangurRouteAccessState['resolvePendingSnapshot'];
  resolveTransitionTarget: KangurRouteAccessState['resolveTransitionTarget'];
  resolveTransitionSkeletonVariant: KangurRouteAccessState['resolveTransitionSkeletonVariant'];
  snapshot: ReturnType<typeof useKangurPendingRouteLoadingSnapshot>;
}): {
  accessiblePageKey: string;
  embeddedOverride: boolean | null;
  topBarHeightCssValue: string | null;
  variant: ReturnType<typeof resolveTransitionSkeletonVariant>;
} => {
  const pendingRouteLoadingSnapshot = resolvePendingRouteLoadingSnapshotState({
    currentHref,
    resolvePendingSnapshot,
    snapshot,
  });
  const href = pendingRouteLoadingSnapshot?.href ?? currentHref;
  const basePath = resolveManagedKangurBasePath(href);
  const transitionTarget = resolveFallbackTransitionTarget({
    basePath,
    href,
    pendingRouteLoadingSnapshot,
    resolveTransitionTarget,
  });
  const accessiblePageKey = resolveFallbackAccessiblePageKey({
    pendingRouteLoadingSnapshot,
    transitionTarget,
  });

  return {
    accessiblePageKey,
    embeddedOverride: resolveTransitionEmbeddedOverride({
      currentHref: pendingRouteLoadingSnapshot?.fromHref ?? currentHref,
      targetHref: href,
    }),
    topBarHeightCssValue: resolveFallbackTopBarHeightCssValue(pendingRouteLoadingSnapshot),
    variant: resolveFallbackTransitionVariant({
      accessiblePageKey,
      basePath,
      href,
      pendingRouteLoadingSnapshot,
      resolveTransitionSkeletonVariant,
      transitionTarget,
    }),
  };
};

export function KangurRouteLoadingFallback({
  includeTopNavigationSkeleton = true,
}: {
  includeTopNavigationSkeleton?: boolean;
} = {}): React.JSX.Element {
  const {
    resolvePendingSnapshot,
    resolveTransitionSkeletonVariant,
    resolveTransitionTarget,
  } = useKangurRouteAccess();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentHref = resolveCurrentRouteHref({
    pathname,
    searchParams,
  });
  const snapshotInput = resolveFallbackSnapshotInput({
    currentHref,
    resolvePendingSnapshot,
    resolveTransitionSkeletonVariant,
    resolveTransitionTarget,
    snapshot: useKangurPendingRouteLoadingSnapshot(),
  });

  return (
    <KangurPageTransitionSkeleton
      embeddedOverride={snapshotInput.embeddedOverride}
      pageKey={snapshotInput.accessiblePageKey}
      reason='navigation'
      renderInlineTopNavigationSkeleton={includeTopNavigationSkeleton}
      topBarHeightCssValue={snapshotInput.topBarHeightCssValue}
      variant={snapshotInput.variant}
    />
  );
}
