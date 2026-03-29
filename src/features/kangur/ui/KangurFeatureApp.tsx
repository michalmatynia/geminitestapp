'use client';

import dynamic from 'next/dynamic';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';

import {
  LazyAnimatePresence,
  LazyMotionDiv,
  usePrefersReducedMotion,
} from '@/features/kangur/ui/components/LazyAnimatePresence';

import { KANGUR_CMS_PROJECT_SETTING_KEY } from '@/features/kangur/cms-builder/project-contracts';
import { hasKangurCmsRuntimeScreen } from '@/features/kangur/cms-builder/runtime-screen-presence';
import { KANGUR_MAIN_PAGE, kangurPages, preloadKangurPage } from '@/features/kangur/config/pages';
import { getKangurHomeHref, resolveKangurPageKey } from '@/features/kangur/config/routing';
import { KangurAppLoader } from '@/features/kangur/ui/components/KangurAppLoader';
import { KangurPageTransitionSkeleton } from '@/features/kangur/ui/components/KangurPageTransitionSkeleton';
import { KangurTopNavigationSkeleton } from '@/features/kangur/ui/components/KangurTopNavigationSkeleton';

const KangurAiTutorWidget = dynamic(() => import('@/features/kangur/ui/components/KangurAiTutorWidget').then(m => ({ default: m.KangurAiTutorWidget })), { ssr: false });
const KangurLoginModal = dynamic(() => import('@/features/kangur/ui/components/KangurLoginModal').then(m => ({ default: m.KangurLoginModal })), { ssr: false });
const KangurCmsRuntimeScreen = dynamic(
  () =>
    import('@/features/kangur/cms-builder/KangurCmsRuntimeScreen').then((m) => ({
      default: m.KangurCmsRuntimeScreen,
    })),
  { ssr: false }
);
import { KangurRouteAccessibilityAnnouncer } from '@/features/kangur/ui/components/KangurRouteAccessibilityAnnouncer';
const PageNotFound = dynamic(() => import('@/features/kangur/ui/components/PageNotFound').then(m => ({ default: m.PageNotFound })), { ssr: false });
const UserNotRegisteredError = dynamic(() => import('@/features/kangur/ui/components/UserNotRegisteredError'), { ssr: false });
import { KangurAiTutorContentProvider } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { KangurAiTutorDeferredProvider } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { KangurAuthProvider, useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { KangurContextRegistryPageBoundary } from '@/features/kangur/ui/context/KangurContextRegistryPageBoundary';
import { KangurAgeGroupFocusProvider } from '@/features/kangur/ui/context/KangurAgeGroupFocusContext';
import { KangurGuestPlayerProvider } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import {
  KangurLoginModalProvider,
  useKangurLoginModalState,
} from '@/features/kangur/ui/context/KangurLoginModalContext';
import { KangurProgressSyncProvider } from '@/features/kangur/ui/context/KangurProgressSyncProvider';
import {
  KangurRouteTransitionProvider,
  useKangurRouteTransitionState,
} from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { KangurScoreSyncProvider } from '@/features/kangur/ui/context/KangurScoreSyncProvider';
import { KangurSubjectFocusProvider } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import { KangurSubjectAgeGroupSync } from '@/features/kangur/ui/context/KangurSubjectAgeGroupSync';
import {
  KangurTopNavigationHost,
  KangurTopNavigationProvider,
} from '@/features/kangur/ui/context/KangurTopNavigationContext';
import { KangurTutorAnchorProvider } from '@/features/kangur/ui/context/KangurTutorAnchorContext';
import { createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';
import type { KangurRouteTransitionSkeletonVariant } from '@/features/kangur/ui/routing/route-transition-skeletons';
import {
  useKangurPendingRouteLoadingSnapshot,
} from '@/features/kangur/ui/routing/pending-route-loading-snapshot';
import { useKangurRouteAccess } from '@/features/kangur/ui/routing/useKangurRouteAccess';
import { resolveManagedKangurEmbeddedFromHref } from '@/features/kangur/ui/routing/managed-paths';
import { readKangurTopBarHeightCssValue } from '@/features/kangur/ui/utils/readKangurTopBarHeightCssValue';
import { cn } from '@/features/kangur/shared/utils';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

import type { JSX } from 'react';

const BOOT_SKELETON_MIN_VISIBLE_MS = 120;
const NAVIGATION_SKELETON_DELAY_MS = 0;
const LANGUAGE_SWITCHER_TRANSITION_SOURCE_ID = 'kangur-language-switcher';
const HOT_ROUTE_PRELOAD_TIMEOUT_MS = 1_500;
const HOT_ROUTE_PRELOAD_TIMEOUTS: Readonly<Partial<Record<KangurPreloadPageKey, number>>> =
  Object.freeze({
    Game: 250,
    Lessons: 250,
  });
type KangurPreloadPageKey = Parameters<typeof preloadKangurPage>[0];
const KANGUR_PRELOAD_PAGE_KEYS: ReadonlyArray<KangurPreloadPageKey> = [
  'Competition',
  'Game',
  'GamesLibrary',
  'Duels',
  'LearnerProfile',
  'Lessons',
  'ParentDashboard',
  'SocialUpdates',
  'Tests',
];

const HOT_ROUTE_PRELOADS: Readonly<
  Partial<Record<KangurPreloadPageKey, ReadonlyArray<KangurPreloadPageKey>>>
> = Object.freeze({
  Game: ['Lessons'],
  Lessons: ['Game'],
});

const isKangurPreloadPageKey = (value: string | null): value is KangurPreloadPageKey =>
  value !== null && KANGUR_PRELOAD_PAGE_KEYS.includes(value as KangurPreloadPageKey);

type LatchedNavigationSkeletonState = {
  embedded: boolean;
  pageKey: string;
  variant: KangurRouteTransitionSkeletonVariant | null;
};

const KangurLoginModalMount = (): JSX.Element | null => {
  const loginModalState = useKangurLoginModalState();

  if (!loginModalState.isOpen) {
    return null;
  }

  return <KangurLoginModal />;
};

const AuthenticatedApp = (): JSX.Element | null => {
  const {
    isLoadingAuth,
    isLoadingPublicSettings,
    authError,
    navigateToLogin,
    isAuthenticated,
    hasResolvedAuth = true,
  } =
    useKangurAuth();
  const { resolvePendingSnapshot } = useKangurRouteAccess();
  const settingsStore = useSettingsStore();
  const isLoadingSettings = settingsStore.isLoading;
  const rawCmsProject = settingsStore.get(KANGUR_CMS_PROJECT_SETTING_KEY);
  const {
    isRouteAcknowledging,
    isRoutePending,
    isRouteWaitingForReady,
    isRouteRevealing,
    transitionPhase,
    activeTransitionSourceId,
    activeTransitionKind,
    pendingPageKey,
    activeTransitionPageKey,
    activeTransitionRequestedHref,
    activeTransitionSkeletonVariant,
  } = useKangurRouteTransitionState();
  const routeNavigator = useKangurRouteNavigator();
  const { pageKey, embedded, requestedPath, requestedHref, basePath } = useKangurRouting();
  const authErrorType = authError?.type;
  const resolvedPageKey = resolveKangurPageKey(pageKey, kangurPages, KANGUR_MAIN_PAGE);
  const homeHref = getKangurHomeHref(basePath);
  const shouldRedirectToHome =
    !embedded &&
    hasResolvedAuth &&
    !isLoadingAuth &&
    !isAuthenticated &&
    !authErrorType &&
    resolvedPageKey === 'ParentDashboard';
  const prefersReducedMotion = usePrefersReducedMotion();
  const routeContentMotionProps = createKangurPageTransitionMotionProps(prefersReducedMotion);
  const routeTransitionKey = requestedPath || (pageKey ? `page:${pageKey}` : 'page:unknown');
  const currentRequestedHref = requestedHref ?? requestedPath ?? null;
  const pendingRouteLoadingSnapshot = resolvePendingSnapshot({
    currentHref: currentRequestedHref,
    fallbackPageKey: KANGUR_MAIN_PAGE,
    snapshot: useKangurPendingRouteLoadingSnapshot(),
  });
  const isBootLoading = isLoadingPublicSettings || isLoadingAuth;
  const isThemeBootLoading = isLoadingSettings;
  const isNavigationTransitionActive =
    isRouteAcknowledging || isRoutePending || isRouteWaitingForReady || isRouteRevealing;
  const isLanguageSwitcherTransition =
    activeTransitionKind === 'locale-switch' ||
    activeTransitionSourceId === LANGUAGE_SWITCHER_TRANSITION_SOURCE_ID;
  const shouldSkipNavigationSkeletonDelay = activeTransitionSourceId !== null;
  const shouldBlockRouteContent = shouldRedirectToHome;
  const shouldUseCmsRuntimeScreen = hasKangurCmsRuntimeScreen(rawCmsProject, resolvedPageKey);
  const routeContent = useMemo<JSX.Element | null>(() => {
    if (authErrorType === 'auth_required' || shouldBlockRouteContent) {
      return null;
    }

    if (!resolvedPageKey) {
      return <PageNotFound />;
    }

    const ResolvedPage = kangurPages[resolvedPageKey];
    if (!ResolvedPage) {
      return <PageNotFound />;
    }

    return shouldUseCmsRuntimeScreen ? (
      <KangurCmsRuntimeScreen pageKey={resolvedPageKey} fallback={<ResolvedPage />} />
    ) : (
      <ResolvedPage />
    );
  }, [authErrorType, resolvedPageKey, shouldBlockRouteContent, shouldUseCmsRuntimeScreen]);
  const [hasPresentedInteractiveShell, setHasPresentedInteractiveShell] = useState(false);
  const [isRouteInteractionReady, setIsRouteInteractionReady] = useState(false);
  const shouldShowBootLoader = isThemeBootLoading && !hasPresentedInteractiveShell;
  const [isBootSkeletonVisible, setIsBootSkeletonVisible] = useState<boolean>(shouldShowBootLoader);
  const [isNavigationSkeletonVisible, setIsNavigationSkeletonVisible] = useState<boolean>(false);
  const [latchedNavigationTopBarHeightCssValue, setLatchedNavigationTopBarHeightCssValue] =
    useState<string | null>(null);
  const preloadedHotRoutesRef = useRef<Set<string>>(new Set());
  const bootSkeletonShownAtRef = useRef<number | null>(
    shouldShowBootLoader ? Date.now() : null
  );
  const navigationSkeletonShownRef = useRef(false);
  const latchedNavigationSkeletonRef = useRef<LatchedNavigationSkeletonState | null>(null);
  const transitionPageKey =
    pendingPageKey ?? activeTransitionPageKey ?? resolvedPageKey ?? KANGUR_MAIN_PAGE;
  const transitionEmbedded =
    resolveManagedKangurEmbeddedFromHref({
      href: activeTransitionRequestedHref,
      basePath,
    }) ?? embedded;
  const isPendingRouteSnapshotVisible =
    !isNavigationTransitionActive &&
    pendingRouteLoadingSnapshot !== null &&
    pendingRouteLoadingSnapshot.href !== null &&
    pendingRouteLoadingSnapshot.href !== currentRequestedHref;
  const hasCommittedTargetRoute =
    (activeTransitionRequestedHref !== null &&
      activeTransitionRequestedHref !== currentRequestedHref) ||
    (activeTransitionPageKey !== null && activeTransitionPageKey !== resolvedPageKey) ||
    (pendingPageKey !== null && pendingPageKey !== resolvedPageKey);
  const shouldShowAcknowledgingNavigationSkeleton =
    isRouteAcknowledging && (isLanguageSwitcherTransition || hasCommittedTargetRoute);
  const snapshotTransitionPageKey =
    pendingRouteLoadingSnapshot?.pageKey ?? resolvedPageKey ?? KANGUR_MAIN_PAGE;
  const snapshotTransitionEmbedded =
    resolveManagedKangurEmbeddedFromHref({
      href: pendingRouteLoadingSnapshot?.href ?? null,
      basePath,
    }) ?? embedded;
  const snapshotTransitionTopBarHeightCssValue =
    pendingRouteLoadingSnapshot?.topBarHeightCssValue ?? null;
  const isRouteSkeletonVisible =
    shouldShowAcknowledgingNavigationSkeleton ||
    isNavigationSkeletonVisible ||
    isPendingRouteSnapshotVisible;
  const visibleTransitionSkeletonPageKey =
    isPendingRouteSnapshotVisible
      ? snapshotTransitionPageKey
      : isRouteSkeletonVisible
      ? latchedNavigationSkeletonRef.current?.pageKey ?? transitionPageKey
      : transitionPageKey;
  const visibleTransitionSkeletonVariant =
    isPendingRouteSnapshotVisible
      ? pendingRouteLoadingSnapshot?.skeletonVariant ?? activeTransitionSkeletonVariant
      : isRouteSkeletonVisible
      ? latchedNavigationSkeletonRef.current?.variant ?? activeTransitionSkeletonVariant
      : activeTransitionSkeletonVariant;
  const visibleTransitionSkeletonEmbedded = isPendingRouteSnapshotVisible
    ? snapshotTransitionEmbedded
    : isRouteSkeletonVisible
    ? latchedNavigationSkeletonRef.current?.embedded ?? (embedded && transitionEmbedded)
    : embedded;
  const currentNavigationTopBarHeightCssValue =
    isNavigationTransitionActive || isRouteSkeletonVisible
      ? readKangurTopBarHeightCssValue()
      : null;
  const visibleTransitionSkeletonTopBarHeightCssValue = isPendingRouteSnapshotVisible
    ? snapshotTransitionTopBarHeightCssValue ?? currentNavigationTopBarHeightCssValue
    : isRouteSkeletonVisible
    ? latchedNavigationTopBarHeightCssValue ?? currentNavigationTopBarHeightCssValue
    : null;
  const shouldKeepRouteContentVisibleDuringTransition =
    isLanguageSwitcherTransition && isRouteSkeletonVisible;
  const isRouteContentVisuallyHidden =
    isPendingRouteSnapshotVisible ||
    (!shouldKeepRouteContentVisibleDuringTransition &&
    (transitionPhase === 'waiting_for_ready' ||
      ((transitionPhase === 'pending' ||
        (transitionPhase === 'acknowledging' &&
          shouldShowAcknowledgingNavigationSkeleton)) &&
        isRouteSkeletonVisible)));
  const isRouteContentInteractionBlocked =
    !isRouteInteractionReady ||
    isPendingRouteSnapshotVisible ||
    (isRouteSkeletonVisible && transitionPhase !== 'revealing');
  const hasVisibleRouteContent = routeContent !== null && !isRouteContentVisuallyHidden;
  const isBootLoaderBlockingNavigation =
    isBootSkeletonVisible && !isRouteSkeletonVisible && !hasVisibleRouteContent;
  const shouldHideTopNavigationDuringBoot = isBootLoaderBlockingNavigation;
  const shouldRenderInlineRouteSkeletonTopNavigation =
    !visibleTransitionSkeletonEmbedded &&
    !shouldHideTopNavigationDuringBoot &&
    isRouteSkeletonVisible;
  const shouldHideTopNavigationHost =
    !shouldHideTopNavigationDuringBoot && isRouteSkeletonVisible;
  const shouldSkipRouteContentPresence =
    isNavigationTransitionActive || isPendingRouteSnapshotVisible;
  const renderedRouteContent = routeContent ? (
    <LazyMotionDiv
      key={routeTransitionKey}
      {...routeContentMotionProps}
      aria-busy={isNavigationTransitionActive || isPendingRouteSnapshotVisible}
      aria-hidden={isRouteContentVisuallyHidden ? 'true' : undefined}
      className={cn(
        'w-full min-w-0 kangur-shell-viewport-height',
        embedded ? 'min-h-full' : null,
        isRouteContentInteractionBlocked ? 'pointer-events-none' : null,
        isRouteContentVisuallyHidden ? 'pointer-events-none opacity-0' : null
      )}
      data-route-transition-phase={transitionPhase}
      data-route-interactive-ready={isRouteInteractionReady ? 'true' : 'false'}
      data-route-transition-key={routeTransitionKey}
      data-route-transition-source-id={activeTransitionSourceId ?? undefined}
      data-testid='kangur-route-content'
    >
      {routeContent}
    </LazyMotionDiv>
  ) : null;

  useEffect(() => {
    setIsRouteInteractionReady(true);
  }, []);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      isBootLoading ||
      isThemeBootLoading ||
      isNavigationTransitionActive
    ) {
      return;
    }

    if (!isKangurPreloadPageKey(resolvedPageKey)) {
      return;
    }

    const preloadTargets: ReadonlyArray<KangurPreloadPageKey> =
      HOT_ROUTE_PRELOADS[resolvedPageKey] ?? [];
    if (preloadTargets.length === 0) {
      return;
    }

    const nextTargets: KangurPreloadPageKey[] = preloadTargets.filter(
      (target: KangurPreloadPageKey) => !preloadedHotRoutesRef.current.has(target)
    );
    if (nextTargets.length === 0) {
      return;
    }
    const preloadTimeoutMs = HOT_ROUTE_PRELOAD_TIMEOUTS[resolvedPageKey] ?? HOT_ROUTE_PRELOAD_TIMEOUT_MS;

    const preload = (): void => {
      nextTargets.forEach((target: KangurPreloadPageKey) => {
        preloadKangurPage(target);
        preloadedHotRoutesRef.current.add(target);
      });
    };

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(preload, {
        timeout: preloadTimeoutMs,
      });
      return () => {
        window.cancelIdleCallback?.(idleId);
      };
    }

    const timeoutId = window.setTimeout(preload, 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    isBootLoading,
    isNavigationTransitionActive,
    isThemeBootLoading,
    resolvedPageKey,
  ]);

  useEffect(() => {
    if (hasPresentedInteractiveShell) {
      return;
    }

    if (!isThemeBootLoading) {
      setHasPresentedInteractiveShell(true);
      return;
    }

    if (
      isBootLoading ||
      isRouteSkeletonVisible ||
      isRouteContentVisuallyHidden ||
      routeContent === null
    ) {
      return;
    }

    setHasPresentedInteractiveShell(true);
  }, [
    hasPresentedInteractiveShell,
    isBootLoading,
    isRouteContentVisuallyHidden,
    isRouteSkeletonVisible,
    isThemeBootLoading,
    routeContent,
  ]);

  useEffect(() => {
    if (authErrorType === 'auth_required') {
      navigateToLogin();
    }
  }, [authErrorType, navigateToLogin]);

  useEffect(() => {
    if (!shouldRedirectToHome) {
      return;
    }

    routeNavigator.replace(homeHref, {
      pageKey: KANGUR_MAIN_PAGE,
      sourceId: 'kangur-auth:redirect-parent-dashboard',
    });
  }, [homeHref, routeNavigator, shouldRedirectToHome]);

  useEffect(() => {
    if (shouldShowBootLoader) {
      if (bootSkeletonShownAtRef.current === null) {
        bootSkeletonShownAtRef.current = Date.now();
      }
      setIsBootSkeletonVisible(true);
      return;
    }

    const shownAt = bootSkeletonShownAtRef.current;
    if (shownAt === null) {
      setIsBootSkeletonVisible(false);
      return;
    }

    const remainingMs = Math.max(0, BOOT_SKELETON_MIN_VISIBLE_MS - (Date.now() - shownAt));
    const timeoutId = window.setTimeout(() => {
      bootSkeletonShownAtRef.current = null;
      setIsBootSkeletonVisible(false);
    }, remainingMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [shouldShowBootLoader]);

  useEffect(() => {
    if (isNavigationTransitionActive) {
      const nextTransitionPageKey = pendingPageKey ?? activeTransitionPageKey ?? null;
      const nextTransitionSkeletonVariant = activeTransitionSkeletonVariant ?? null;
      const nextTransitionEmbedded = embedded && transitionEmbedded;

      if (
        latchedNavigationSkeletonRef.current === null ||
        nextTransitionPageKey !== null ||
        nextTransitionSkeletonVariant !== null
      ) {
        latchedNavigationSkeletonRef.current = {
          embedded:
            latchedNavigationSkeletonRef.current?.embedded ?? nextTransitionEmbedded,
          pageKey:
            nextTransitionPageKey ??
            latchedNavigationSkeletonRef.current?.pageKey ??
            transitionPageKey,
          variant:
            nextTransitionSkeletonVariant ?? latchedNavigationSkeletonRef.current?.variant ?? null,
        };
      }
      return;
    }

    if (!isRouteSkeletonVisible) {
      latchedNavigationSkeletonRef.current = null;
    }
  }, [
    activeTransitionPageKey,
    activeTransitionSkeletonVariant,
    isNavigationTransitionActive,
    isRouteSkeletonVisible,
    pendingPageKey,
    transitionEmbedded,
    transitionPageKey,
    embedded,
  ]);

  useEffect(() => {
    if (!isNavigationTransitionActive) {
      setLatchedNavigationTopBarHeightCssValue(null);
      return;
    }

    const nextTopBarHeightCssValue =
      currentNavigationTopBarHeightCssValue ?? readKangurTopBarHeightCssValue();
    if (!nextTopBarHeightCssValue) {
      return;
    }

    setLatchedNavigationTopBarHeightCssValue(
      current => current ?? nextTopBarHeightCssValue
    );
  }, [currentNavigationTopBarHeightCssValue, isNavigationTransitionActive]);

  useEffect(() => {
    if (isBootLoading) {
      navigationSkeletonShownRef.current = false;
      setIsNavigationSkeletonVisible(false);
      return;
    }

    if (shouldShowAcknowledgingNavigationSkeleton) {
      navigationSkeletonShownRef.current = true;
      setIsNavigationSkeletonVisible(true);
      return;
    }

    if (isRouteAcknowledging) {
      navigationSkeletonShownRef.current = false;
      setIsNavigationSkeletonVisible(false);
      return;
    }

    if (isRoutePending && shouldSkipNavigationSkeletonDelay) {
      navigationSkeletonShownRef.current = true;
      setIsNavigationSkeletonVisible(true);
      return;
    }

    if (isRoutePending && navigationSkeletonShownRef.current) {
      setIsNavigationSkeletonVisible(true);
      return;
    }

    if (isRoutePending) {
      const timeoutId = window.setTimeout(() => {
        navigationSkeletonShownRef.current = true;
        setIsNavigationSkeletonVisible(true);
      }, NAVIGATION_SKELETON_DELAY_MS);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    if (isRouteWaitingForReady) {
      navigationSkeletonShownRef.current = true;
      setIsNavigationSkeletonVisible(true);
      return;
    }

    if (isRouteRevealing) {
      navigationSkeletonShownRef.current = true;
      setIsNavigationSkeletonVisible(true);
      return;
    }

    if (!isNavigationTransitionActive) {
      navigationSkeletonShownRef.current = false;
      setIsNavigationSkeletonVisible(false);
      return;
    }

    return undefined;
  }, [
    isBootLoading,
    isNavigationTransitionActive,
    isRouteAcknowledging,
    isRoutePending,
    isRouteWaitingForReady,
    isRouteRevealing,
    shouldSkipNavigationSkeletonDelay,
    shouldShowAcknowledgingNavigationSkeleton,
  ]);

  if (authErrorType === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  const topNavigationFallback = <KangurTopNavigationSkeleton />;
  const shouldReserveTopBarOffset = true;

  return (
    <>
      <KangurRouteAccessibilityAnnouncer />
      {shouldHideTopNavigationDuringBoot ? (
        topNavigationFallback
      ) : shouldHideTopNavigationHost ? (
        null
      ) : (
        <KangurTopNavigationHost fallback={topNavigationFallback} />
      )}
      <KangurAppLoader
        offsetTopBar={shouldReserveTopBarOffset}
        visible={isBootLoaderBlockingNavigation}
      />
      <Suspense fallback={
        <KangurPageTransitionSkeleton
          pageKey={resolvedPageKey}
          reason='navigation'
          renderInlineTopNavigationSkeleton={false}
        />
      }>
        <LazyAnimatePresence mode={shouldSkipRouteContentPresence ? 'sync' : 'wait'}>
          {renderedRouteContent}
        </LazyAnimatePresence>
      </Suspense>
      <LazyAnimatePresence>
        {isRouteSkeletonVisible ? (
          <LazyMotionDiv
            key='kangur-page-transition-skeleton:navigation'
            animate={{ opacity: 1 }}
            className={transitionPhase === 'revealing' ? 'pointer-events-none' : undefined}
            exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.1, ease: 'easeOut' }}
          >
            <KangurPageTransitionSkeleton
              embeddedOverride={visibleTransitionSkeletonEmbedded}
              pageKey={visibleTransitionSkeletonPageKey}
              reason={isLanguageSwitcherTransition ? 'locale-switch' : 'navigation'}
              renderInlineTopNavigationSkeleton={shouldRenderInlineRouteSkeletonTopNavigation}
              topBarHeightCssValue={visibleTransitionSkeletonTopBarHeightCssValue}
              variant={visibleTransitionSkeletonVariant ?? undefined}
            />
          </LazyMotionDiv>
        ) : null}
      </LazyAnimatePresence>
    </>
  );
};

export function KangurFeatureApp(): JSX.Element {
  return (
    <KangurRouteTransitionProvider>
      <KangurTopNavigationProvider>
        <KangurGuestPlayerProvider>
          <KangurLoginModalProvider>
            <KangurAuthProvider>
              <KangurSubjectFocusProvider>
                <KangurAgeGroupFocusProvider>
                  <KangurSubjectAgeGroupSync />
                  <KangurProgressSyncProvider />
                  <KangurScoreSyncProvider />
                  <KangurContextRegistryPageBoundary>
                    <KangurAiTutorContentProvider>
                      <KangurAiTutorDeferredProvider>
                        <KangurTutorAnchorProvider>
                          <AuthenticatedApp />
                          <KangurAiTutorWidget />
                          <KangurLoginModalMount />
                        </KangurTutorAnchorProvider>
                      </KangurAiTutorDeferredProvider>
                    </KangurAiTutorContentProvider>
                  </KangurContextRegistryPageBoundary>
                </KangurAgeGroupFocusProvider>
              </KangurSubjectFocusProvider>
            </KangurAuthProvider>
          </KangurLoginModalProvider>
        </KangurGuestPlayerProvider>
      </KangurTopNavigationProvider>
    </KangurRouteTransitionProvider>
  );
}
