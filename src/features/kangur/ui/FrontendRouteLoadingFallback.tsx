'use client';

import { usePathname } from 'next/navigation';

import { KANGUR_MAIN_PAGE_KEY } from '@/features/kangur/config/routing';
import { KangurRouteLoadingFallback } from '@/features/kangur/ui/components/KangurRouteLoadingFallback';
import { useOptionalFrontendPublicOwner } from '@/features/kangur/ui/FrontendPublicOwnerContext';
import {
  useKangurPendingRouteLoadingSnapshot,
} from '@/features/kangur/ui/routing/pending-route-loading-snapshot';
import {
  resolveManagedKangurEmbeddedFromHref,
  resolveManagedKangurBasePath,
} from '@/features/kangur/ui/routing/managed-paths';
import { useKangurRouteAccess } from '@/features/kangur/ui/routing/useKangurRouteAccess';

type PendingRouteLoadingSnapshot =
  ReturnType<typeof useKangurPendingRouteLoadingSnapshot>;
type KangurRouteAccess = ReturnType<typeof useKangurRouteAccess>;

const GenericFrontendLoadingFallback = (): React.JSX.Element => (
  <div
    className='min-h-screen w-full animate-pulse bg-[radial-gradient(circle_at_top,_#ffffff_0%,_#f5f7fb_46%,_#eef2f8_100%)]'
    data-testid='frontend-route-loading-fallback'
  >
    <div className='mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-16'>
      <div className='h-14 w-56 rounded-full bg-white/80 shadow-[0_20px_40px_-30px_rgba(90,104,150,0.24)]' />
      <div className='grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]'>
        <div className='min-h-[18rem] rounded-[32px] bg-white/78 shadow-[0_30px_70px_-38px_rgba(87,101,149,0.24)]' />
        <div className='flex min-h-[18rem] flex-col gap-4 rounded-[32px] bg-white/74 p-6 shadow-[0_28px_64px_-38px_rgba(87,101,149,0.22)]'>
          <div className='h-8 w-36 rounded-full bg-slate-200/70' />
          <div className='h-4 w-full rounded-full bg-slate-200/70' />
          <div className='h-4 w-4/5 rounded-full bg-slate-200/70' />
          <div className='h-4 w-2/3 rounded-full bg-slate-200/70' />
        </div>
      </div>
    </div>
  </div>
);

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
): boolean => publicOwnerContext?.publicOwner === 'kangur';

export function FrontendRouteLoadingFallback({
  includeTopNavigationSkeleton,
}: {
  includeTopNavigationSkeleton?: boolean;
} = {}): React.JSX.Element {
  const { resolvePendingSnapshot, resolveTransitionTarget } = useKangurRouteAccess();
  const publicOwnerContext = useOptionalFrontendPublicOwner();
  const pathname = usePathname();
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

  return <GenericFrontendLoadingFallback />;
}
