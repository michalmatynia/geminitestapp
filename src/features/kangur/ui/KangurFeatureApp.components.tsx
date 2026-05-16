'use client';

import dynamic from 'next/dynamic';
import { memo, Suspense } from 'react';

import { hasKangurCmsRuntimeScreen } from '@/features/kangur/cms-builder/runtime-screen-presence';
import { kangurPages } from '@/features/kangur/config/pages';
import { KangurAppLoader } from '@/features/kangur/ui/components/KangurAppLoader';
import { KangurPageTransitionSkeleton } from '@/features/kangur/ui/components/KangurPageTransitionSkeleton';
import { KangurTopNavigationSkeleton } from '@/features/kangur/ui/components/primary-navigation/KangurTopNavigationSkeleton';
import { KangurRouteAccessibilityAnnouncer } from '@/features/kangur/ui/components/KangurRouteAccessibilityAnnouncer';
import {
  KangurTopNavigationHost,
} from '@/features/kangur/ui/context/KangurTopNavigationContext';
import {
  useKangurLoginModalState,
} from '@/features/kangur/ui/context/KangurLoginModalContext';
import { useKangurDeferredStandaloneHomeReady } from '@/features/kangur/ui/hooks/useKangurDeferredStandaloneHomeReady';
import {
  LazyAnimatePresence,
  LazyMotionDiv,
} from '@/features/kangur/ui/components/LazyAnimatePresence';
import { createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import { cn } from '@/features/kangur/shared/utils';

import type { JSX } from 'react';
import type { KangurRouteTransitionSkeletonVariant } from '@/features/kangur/ui/routing/route-transition-skeletons';

const KangurLoginModal = dynamic(
  () => import('@/features/kangur/ui/components/KangurLoginModal').then(m => ({ default: m.KangurLoginModal })),
  { ssr: false }
);
const KangurCmsRuntimeScreen = dynamic(
  () => import('@/features/kangur/cms-builder/KangurCmsRuntimeScreen').then(m => ({ default: m.KangurCmsRuntimeScreen })),
  { ssr: false }
);
const PageNotFound = dynamic(
  () => import('@/features/kangur/ui/components/PageNotFound').then(m => ({ default: m.PageNotFound })),
  { ssr: false }
);
export const UserNotRegisteredError = dynamic(
  () => import('@/features/kangur/ui/components/UserNotRegisteredError'),
  { ssr: false }
);
const KangurDeferredSyncEffectsClient = dynamic(
  () => import('@/features/kangur/ui/KangurDeferredSyncEffectsClient').then(m => ({ default: m.KangurDeferredSyncEffectsClient })),
  { ssr: false }
);

export const TOP_NAVIGATION_FALLBACK = <KangurTopNavigationSkeleton />;

export const KangurRenderedRouteAccessibilityAnnouncer = memo(
  (): JSX.Element => <KangurRouteAccessibilityAnnouncer />
);

export const KangurLoginModalMount = memo((): JSX.Element | null => {
  const loginModalState = useKangurLoginModalState();
  if (!loginModalState.isOpen) return null;
  return <KangurLoginModal />;
});

export const KangurDeferredSyncEffectsMount = memo((): JSX.Element | null => {
  const isStandaloneHomeReady = useKangurDeferredStandaloneHomeReady();
  if (!isStandaloneHomeReady) return null;
  return <KangurDeferredSyncEffectsClient />;
});

const KangurPlainResolvedRoutePage = memo(({ ResolvedPage }: { ResolvedPage: React.ComponentType }): JSX.Element =>
  <ResolvedPage />
);

const KangurCmsResolvedRoutePage = memo(({ pageKey, ResolvedPage }: { pageKey: string; ResolvedPage: React.ComponentType }): JSX.Element =>
  <KangurCmsRuntimeScreen pageKey={pageKey} fallback={<ResolvedPage />} />
);

export function KangurResolvedRouteContent({ rawCmsProject, resolvedPageKey }: {
  rawCmsProject: string | null | undefined;
  resolvedPageKey: string | null;
}): JSX.Element {
  if (resolvedPageKey === null) return <PageNotFound />;
  const ResolvedPage = kangurPages[resolvedPageKey];
  if (!ResolvedPage) return <PageNotFound />;
  return hasKangurCmsRuntimeScreen(rawCmsProject, resolvedPageKey)
    ? <KangurCmsResolvedRoutePage pageKey={resolvedPageKey} ResolvedPage={ResolvedPage} />
    : <KangurPlainResolvedRoutePage ResolvedPage={ResolvedPage} />;
}

export const KangurRenderedRouteContent = memo(({
  activeTransitionSourceId, embedded, isNavigationTransitionActive,
  isPendingRouteSnapshotVisible, loadMotion, isRouteCaptureReady,
  isRouteContentInteractionBlocked, isRouteContentVisuallyHidden,
  isRouteInteractionReady, routeContent, routeContentMotionProps,
  routeTransitionKey, shouldClipRouteContentDuringTransition, transitionPhase,
}: {
  activeTransitionSourceId: string | null;
  embedded: boolean;
  isNavigationTransitionActive: boolean;
  isPendingRouteSnapshotVisible: boolean;
  loadMotion: boolean;
  isRouteCaptureReady: boolean;
  isRouteContentInteractionBlocked: boolean;
  isRouteContentVisuallyHidden: boolean;
  isRouteInteractionReady: boolean;
  routeContent: JSX.Element;
  routeContentMotionProps: ReturnType<typeof createKangurPageTransitionMotionProps>;
  routeTransitionKey: string;
  shouldClipRouteContentDuringTransition: boolean;
  transitionPhase: string;
}): JSX.Element => (
  <LazyMotionDiv
    key={routeTransitionKey}
    {...routeContentMotionProps}
    aria-busy={isNavigationTransitionActive || isPendingRouteSnapshotVisible}
    aria-hidden={isRouteContentVisuallyHidden ? 'true' : undefined}
    className={cn(
      'w-full min-w-0 kangur-shell-viewport-height',
      embedded ? 'min-h-full' : null,
      shouldClipRouteContentDuringTransition ? 'overflow-hidden' : null,
      isRouteContentInteractionBlocked ? 'pointer-events-none' : null,
      isRouteContentVisuallyHidden ? 'pointer-events-none opacity-0' : null
    )}
    data-route-transition-phase={transitionPhase}
    data-route-interactive-ready={isRouteInteractionReady ? 'true' : 'false'}
    data-route-capture-ready={isRouteCaptureReady ? 'true' : 'false'}
    data-route-transition-key={routeTransitionKey}
    data-route-transition-source-id={activeTransitionSourceId ?? undefined}
    data-testid='kangur-route-content'
    loadMotion={loadMotion}
  >
    {routeContent}
  </LazyMotionDiv>
));

export const KangurRenderedTopNavigation = memo(({
  shouldHideTopNavigationDuringBoot, shouldRenderTopNavigationHost,
}: {
  shouldHideTopNavigationDuringBoot: boolean;
  shouldRenderTopNavigationHost: boolean;
}): JSX.Element | null => {
  if (shouldHideTopNavigationDuringBoot) return TOP_NAVIGATION_FALLBACK;
  if (!shouldRenderTopNavigationHost) return null;
  return <KangurTopNavigationHost fallback={TOP_NAVIGATION_FALLBACK} />;
});

export const KangurRenderedAppLoader = memo(({ offsetTopBar, visible }: {
  offsetTopBar: boolean;
  visible: boolean;
}): JSX.Element => <KangurAppLoader offsetTopBar={offsetTopBar} visible={visible} />);

export const KangurSuspenseRouteFallback = memo(({ pageKey }: { pageKey: string | null }): JSX.Element => (
  <KangurPageTransitionSkeleton pageKey={pageKey} reason='navigation' renderInlineTopNavigationSkeleton={false} />
));

export const KangurRenderedRouteSkeletonOverlay = memo(({
  isLanguageSwitcherTransition, isRouteSkeletonVisible, loadMotion,
  routeSkeletonMotionProps, shouldRenderInlineRouteSkeletonTopNavigation,
  topBarHeightCssValue, variant, visibleTransitionSkeletonEmbedded,
  visibleTransitionSkeletonPageKey,
}: {
  isLanguageSwitcherTransition: boolean;
  isRouteSkeletonVisible: boolean;
  loadMotion: boolean;
  routeSkeletonMotionProps: { animate: Record<string, unknown>; exit: Record<string, unknown>; initial: Record<string, unknown>; transition: Record<string, unknown> };
  shouldRenderInlineRouteSkeletonTopNavigation: boolean;
  topBarHeightCssValue: string | null;
  variant: KangurRouteTransitionSkeletonVariant | null;
  visibleTransitionSkeletonEmbedded: boolean;
  visibleTransitionSkeletonPageKey: string;
}): JSX.Element | null => {
  if (!isRouteSkeletonVisible) return null;
  return (
    <LazyMotionDiv
      key='kangur-page-transition-skeleton:navigation'
      className={cn('pointer-events-none')}
      data-testid='kangur-page-transition-skeleton-motion'
      loadMotion={loadMotion}
      {...routeSkeletonMotionProps}
    >
      <KangurPageTransitionSkeleton
        embeddedOverride={visibleTransitionSkeletonEmbedded}
        pageKey={visibleTransitionSkeletonPageKey}
        reason={isLanguageSwitcherTransition ? 'locale-switch' : 'navigation'}
        renderInlineTopNavigationSkeleton={shouldRenderInlineRouteSkeletonTopNavigation}
        topBarHeightCssValue={topBarHeightCssValue}
        variant={variant ?? undefined}
      />
    </LazyMotionDiv>
  );
});

export const KangurRenderedRouteWithSuspense = memo(({
  isInitialHomeLoaderPhase, isInitialHomeSkeletonPhase,
  resolvedPageKey, shouldSkipRouteContentPresence, renderedRouteContent,
}: {
  isInitialHomeLoaderPhase: boolean;
  isInitialHomeSkeletonPhase: boolean;
  resolvedPageKey: string | null;
  shouldSkipRouteContentPresence: boolean;
  renderedRouteContent: JSX.Element | null;
}): JSX.Element => (
  <Suspense
    fallback={
      isInitialHomeLoaderPhase || isInitialHomeSkeletonPhase ? null : (
        <KangurSuspenseRouteFallback pageKey={resolvedPageKey} />
      )
    }
  >
    <LazyAnimatePresence
      loadMotion={true}
      mode={shouldSkipRouteContentPresence ? 'sync' : 'wait'}
    >
      {renderedRouteContent}
    </LazyAnimatePresence>
  </Suspense>
));
