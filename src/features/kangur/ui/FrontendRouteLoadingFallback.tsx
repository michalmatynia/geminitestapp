'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

import {
  FrontendCmsRouteLoadingFallback,
  type FrontendCmsRouteLoadingVariant,
} from '@/features/kangur/ui/components/FrontendCmsRouteLoadingFallback';
import { KANGUR_MAIN_PAGE_KEY } from '@/features/kangur/config/routing';
import { KangurRouteLoadingFallback } from '@/features/kangur/ui/components/KangurRouteLoadingFallback';
import { useOptionalFrontendPublicOwner } from '@/features/kangur/ui/FrontendPublicOwnerContext';
import {
  useKangurPendingRouteLoadingSnapshot,
} from '@/features/kangur/ui/routing/pending-route-loading-snapshot';
import { resolveManagedKangurEmbeddedFromHref, resolveManagedKangurBasePath } from '@/features/kangur/ui/routing/managed-paths';
import { useKangurRouteAccess } from '@/features/kangur/ui/routing/useKangurRouteAccess';
import {
  getSkeletonContainerAnimationTiming,
} from '@/features/kangur/ui/animations/skeleton-animations';

type PendingRouteLoadingSnapshot =
  ReturnType<typeof useKangurPendingRouteLoadingSnapshot>;
type KangurRouteAccess = ReturnType<typeof useKangurRouteAccess>;

const resolveAutoIncludeTopNavigationSkeleton = ({
  currentHref,
  targetHref,
  hasPendingTransition,
  pageKey,
}: {
  currentHref: string | null;
  targetHref: string | null;
  hasPendingTransition: boolean;
  pageKey: string;
}): boolean => {
  const targetBasePath = resolveManagedKangurBasePath(targetHref);

  if (hasPendingTransition && currentHref !== null && targetHref !== null) {
    const currentEmbedded = resolveManagedKangurEmbeddedFromHref({
      href: currentHref,
      basePath: resolveManagedKangurBasePath(currentHref),
    });
    const targetEmbedded = resolveManagedKangurEmbeddedFromHref({
      href: targetHref,
      basePath: targetBasePath,
    });

    if (currentEmbedded === false || targetEmbedded === false) {
      return true;
    }
  }

  return pageKey !== KANGUR_MAIN_PAGE_KEY;
};

const resolveFrontendRouteLoadingSnapshot = ({
  currentHref,
  resolvePendingSnapshot,
  snapshot,
}: {
  currentHref: string | null;
  resolvePendingSnapshot: KangurRouteAccess['resolvePendingSnapshot'];
  snapshot: PendingRouteLoadingSnapshot;
}) =>
  resolvePendingSnapshot({
    currentHref,
    fallbackPageKey: KANGUR_MAIN_PAGE_KEY,
    snapshot,
  });

const resolveFrontendRouteLoadingTransitionTarget = ({
  pathname,
  pendingRouteLoadingSnapshot,
  resolveTransitionTarget,
}: {
  pathname: string | null;
  pendingRouteLoadingSnapshot: PendingRouteLoadingSnapshot;
  resolveTransitionTarget: KangurRouteAccess['resolveTransitionTarget'];
}) => {
  if (pendingRouteLoadingSnapshot !== null) {
    return null;
  }

  return resolveTransitionTarget({
    basePath: resolveManagedKangurBasePath(pathname ?? null),
    fallbackPageKey: KANGUR_MAIN_PAGE_KEY,
    href: pathname ?? '/',
  });
};

const resolveFrontendRouteLoadingPageKey = ({
  currentTransitionTarget,
  pendingRouteLoadingSnapshot,
}: {
  currentTransitionTarget: ReturnType<
    KangurRouteAccess['resolveTransitionTarget']
  > | null;
  pendingRouteLoadingSnapshot: PendingRouteLoadingSnapshot;
}): string =>
  pendingRouteLoadingSnapshot?.pageKey ??
  currentTransitionTarget?.pageKey ??
  KANGUR_MAIN_PAGE_KEY;

const resolveFrontendRouteLoadingIncludeTopNavigationSkeleton = ({
  accessiblePageKey,
  includeTopNavigationSkeleton,
  pathname,
  pendingRouteLoadingSnapshot,
}: {
  accessiblePageKey: string;
  includeTopNavigationSkeleton: boolean | undefined;
  pathname: string | null;
  pendingRouteLoadingSnapshot: PendingRouteLoadingSnapshot;
}): boolean =>
  includeTopNavigationSkeleton ??
  resolveAutoIncludeTopNavigationSkeleton({
    currentHref: pendingRouteLoadingSnapshot?.fromHref ?? pathname,
    targetHref: pendingRouteLoadingSnapshot?.href ?? pathname,
    hasPendingTransition: pendingRouteLoadingSnapshot !== null,
    pageKey: accessiblePageKey,
  });

const shouldRenderKangurFrontendRouteLoadingFallback = (
  publicOwnerContext: ReturnType<typeof useOptionalFrontendPublicOwner>
): boolean =>
  publicOwnerContext?.publicOwner === 'kangur' ||
  publicOwnerContext?.routeFamily === 'studiq';

export function FrontendRouteLoadingFallback({
  cmsVariant,
  includeTopNavigationSkeleton,
}: {
  cmsVariant?: FrontendCmsRouteLoadingVariant;
  includeTopNavigationSkeleton?: boolean;
} = {}): React.JSX.Element {
  const { resolvePendingSnapshot, resolveTransitionTarget } = useKangurRouteAccess();
  const publicOwnerContext = useOptionalFrontendPublicOwner();
  const pathname = usePathname();
  const skeletonVisibilityStartRef = useRef<number | null>(null);
  // Animation timing is available for future enhancements
  getSkeletonContainerAnimationTiming();

  // Track skeleton visibility timing and enforce minimum display duration
  useEffect(() => {
    if (skeletonVisibilityStartRef.current === null) {
      skeletonVisibilityStartRef.current = performance.now();
    }

    return () => {
      // Reset on unmount (page content loaded)
      skeletonVisibilityStartRef.current = null;
    };
  }, []);

  const pendingRouteLoadingSnapshot = resolveFrontendRouteLoadingSnapshot({
    currentHref: pathname,
    resolvePendingSnapshot,
    snapshot: useKangurPendingRouteLoadingSnapshot(),
  });
  const currentTransitionTarget = resolveFrontendRouteLoadingTransitionTarget({
    pathname,
    pendingRouteLoadingSnapshot,
    resolveTransitionTarget,
  });
  const accessiblePageKey = resolveFrontendRouteLoadingPageKey({
    currentTransitionTarget,
    pendingRouteLoadingSnapshot,
  });
  const resolvedIncludeTopNavigationSkeleton =
    resolveFrontendRouteLoadingIncludeTopNavigationSkeleton({
      accessiblePageKey,
      includeTopNavigationSkeleton,
      pathname,
      pendingRouteLoadingSnapshot,
    });

  if (shouldRenderKangurFrontendRouteLoadingFallback(publicOwnerContext)) {
    return (
      <KangurRouteLoadingFallback
        includeTopNavigationSkeleton={resolvedIncludeTopNavigationSkeleton}
      />
    );
  }

  return <FrontendCmsRouteLoadingFallback pathname={pathname} variant={cmsVariant} />;
}
