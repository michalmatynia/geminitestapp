'use client';

import { usePathname } from 'next/navigation';

import { KANGUR_BASE_PATH, KANGUR_MAIN_PAGE_KEY } from '@/features/kangur/config/routing';
import { KangurRouteLoadingFallback } from '@/features/kangur/ui/components/KangurRouteLoadingFallback';
import { useOptionalFrontendPublicOwner } from '@/features/kangur/ui/FrontendPublicOwnerContext';
import { useOptionalNextAuthSession } from '@/features/kangur/ui/hooks/useOptionalNextAuthSession';
import {
  resolveAccessibleKangurPendingRouteLoadingSnapshot,
  useKangurPendingRouteLoadingSnapshot,
} from '@/features/kangur/ui/routing/pending-route-loading-snapshot';
import {
  normalizeManagedKangurPathname,
  resolveManagedKangurEmbeddedFromHref,
  resolveAccessibleManagedKangurPageKeyFromHref,
} from '@/features/kangur/ui/routing/managed-paths';

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

const resolveKangurBasePath = (pathname: string | null): string => {
  const normalizedPathname = normalizeManagedKangurPathname(pathname);

  if (!normalizedPathname) {
    return '/';
  }

  return normalizedPathname === KANGUR_BASE_PATH ||
    normalizedPathname.startsWith(`${KANGUR_BASE_PATH}/`)
    ? KANGUR_BASE_PATH
    : '/';
};

const resolveAutoIncludeTopNavigationSkeleton = ({
  currentHref,
  fallbackPageKey,
  targetHref,
  hasPendingTransition,
  pageKey,
  session,
}: {
  currentHref: string | null;
  fallbackPageKey: string;
  targetHref: string | null;
  hasPendingTransition: boolean;
  pageKey?: string | null;
  session?: Parameters<typeof resolveAccessibleManagedKangurPageKeyFromHref>[0]['session'];
}): boolean => {
  const targetBasePath = resolveKangurBasePath(targetHref);
  const resolvedPageKey =
    pageKey ??
    resolveAccessibleManagedKangurPageKeyFromHref({
      href: targetHref ?? '/',
      basePath: targetBasePath,
      session,
      fallbackPageKey,
    });

  if (hasPendingTransition && currentHref !== null && targetHref !== null) {
    const currentEmbedded = resolveManagedKangurEmbeddedFromHref({
      href: currentHref,
      basePath: resolveKangurBasePath(currentHref),
    });
    const targetEmbedded = resolveManagedKangurEmbeddedFromHref({
      href: targetHref,
      basePath: targetBasePath,
    });

    if (currentEmbedded === false || targetEmbedded === false) {
      return true;
    }
  }

  return (resolvedPageKey ?? KANGUR_MAIN_PAGE_KEY) !== KANGUR_MAIN_PAGE_KEY;
};

export function FrontendRouteLoadingFallback({
  includeTopNavigationSkeleton,
}: {
  includeTopNavigationSkeleton?: boolean;
} = {}): React.JSX.Element {
  const { data: session } = useOptionalNextAuthSession();
  const publicOwnerContext = useOptionalFrontendPublicOwner();
  const pathname = usePathname();
  const pendingRouteLoadingSnapshot = resolveAccessibleKangurPendingRouteLoadingSnapshot({
    currentHref: pathname,
    fallbackPageKey: KANGUR_MAIN_PAGE_KEY,
    session,
    snapshot: useKangurPendingRouteLoadingSnapshot(),
  });
  const accessiblePageKey =
    pendingRouteLoadingSnapshot?.pageKey ??
    resolveAccessibleManagedKangurPageKeyFromHref({
      href: pendingRouteLoadingSnapshot?.href ?? pathname ?? '/',
      basePath: resolveKangurBasePath(pendingRouteLoadingSnapshot?.href ?? pathname ?? null),
      session,
      fallbackPageKey: KANGUR_MAIN_PAGE_KEY,
    });
  const resolvedIncludeTopNavigationSkeleton =
    includeTopNavigationSkeleton ??
    resolveAutoIncludeTopNavigationSkeleton({
      currentHref: pendingRouteLoadingSnapshot?.fromHref ?? pathname,
      fallbackPageKey: KANGUR_MAIN_PAGE_KEY,
      targetHref: pendingRouteLoadingSnapshot?.href ?? pathname,
      hasPendingTransition: pendingRouteLoadingSnapshot !== null,
      pageKey: accessiblePageKey,
      session,
    });

  if (publicOwnerContext?.publicOwner === 'kangur') {
    return (
      <KangurRouteLoadingFallback
        includeTopNavigationSkeleton={resolvedIncludeTopNavigationSkeleton}
      />
    );
  }

  return <GenericFrontendLoadingFallback />;
}
