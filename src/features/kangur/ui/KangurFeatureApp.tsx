'use client';

import dynamic from 'next/dynamic';
import { useLocale } from 'next-intl';
import { memo, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

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
import { KangurTopNavigationSkeleton } from '@/features/kangur/ui/components/primary-navigation/KangurTopNavigationSkeleton';

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
import {
  KangurAuthProvider,
  useKangurAuthActions,
  useKangurAuthSessionState,
  useKangurAuthStatusState,
} from '@/features/kangur/ui/context/KangurAuthContext';
import { KangurContextRegistryPageBoundary } from '@/features/kangur/ui/context/KangurContextRegistryPageBoundary';
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
import { KangurFocusProvider } from '@/features/kangur/ui/context/KangurFocusProvider';
import {
  KangurTopNavigationHost,
  KangurTopNavigationProvider,
} from '@/features/kangur/ui/context/KangurTopNavigationContext';
import { createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import { prefetchKangurPageContentStore } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';
import { useKangurDeferredStandaloneHomeReady } from '@/features/kangur/ui/hooks/useKangurDeferredStandaloneHomeReady';
import type { KangurRouteTransitionSkeletonVariant } from '@/features/kangur/ui/routing/route-transition-skeletons';
import {
  useKangurPendingRouteLoadingSnapshot,
} from '@/features/kangur/ui/routing/pending-route-loading-snapshot';
import { useKangurRouteAccess } from '@/features/kangur/ui/routing/useKangurRouteAccess';
import { resolveManagedKangurEmbeddedFromHref } from '@/features/kangur/ui/routing/managed-paths';
import { isKangurSocialBatchCaptureHref } from '@/features/kangur/shared/capture-mode';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { readKangurTopBarHeightCssValue } from '@/features/kangur/ui/utils/readKangurTopBarHeightCssValue';
import { cn } from '@/features/kangur/shared/utils';
import { useSettingsStore, useSettingsStoreLoading } from '@/shared/providers/SettingsStoreProvider';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';
import { KangurDeferredAiTutorProviders } from '@/features/kangur/ui/KangurDeferredAiTutorProviders';
import { KangurDeferredAiTutorWidgetMount } from '@/features/kangur/ui/KangurDeferredAiTutorWidgetMount';

import type { JSX } from 'react';

// Minimum time (ms) the boot skeleton stays visible to avoid a flash when
// theme settings resolve almost immediately.
const BOOT_SKELETON_MIN_VISIBLE_MS = 50;
// Delay (ms) before showing the navigation skeleton during a route transition.
// Set to 0 so the skeleton appears immediately when a transition is triggered
// from a known source (e.g. nav link click).
const NAVIGATION_SKELETON_DELAY_MS = 0;
// Source ID used to identify transitions triggered by the language switcher so
// the skeleton animation can be adjusted accordingly.
const LANGUAGE_SWITCHER_TRANSITION_SOURCE_ID = 'kangur-language-switcher';
// How long to wait (ms) before prefetching AI Tutor page-content during idle
// time after the initial route settles.
const HOT_PAGE_CONTENT_PREFETCH_TIMEOUT_MS = 250;
// Default idle-callback timeout (ms) for hot-route preloads when no per-page
// override is defined.
const HOT_ROUTE_PRELOAD_TIMEOUT_MS = 1_500;
// Per-page overrides for the hot-route preload idle timeout. Game and Lessons
// are preloaded more aggressively because users frequently switch between them.
const HOT_ROUTE_PRELOAD_TIMEOUTS: Readonly<Partial<Record<KangurPreloadPageKey, number>>> =
  Object.freeze({
    Game: 250,
    Lessons: 250,
  });
type KangurPreloadPageKey = Parameters<typeof preloadKangurPage>[0];
// All page keys that are eligible for background preloading once the active
// route has settled.
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

// Bidirectional hot-route preload map: when the user is on the key page, the
// listed pages are preloaded in the background so navigation feels instant.
const HOT_ROUTE_PRELOADS: Readonly<
  Partial<Record<KangurPreloadPageKey, ReadonlyArray<KangurPreloadPageKey>>>
> = Object.freeze({
  Game: ['Lessons'],
  Lessons: ['Game'],
});
const TOP_NAVIGATION_FALLBACK = <KangurTopNavigationSkeleton />;

const KangurRenderedRouteAccessibilityAnnouncer = memo(
  (): JSX.Element => <KangurRouteAccessibilityAnnouncer />
);

// Type guard: checks whether a string is a valid preloadable page key.
const isKangurPreloadPageKey = (value: string | null): value is KangurPreloadPageKey =>
  value !== null && KANGUR_PRELOAD_PAGE_KEYS.includes(value as KangurPreloadPageKey);

// Snapshot of the navigation skeleton state that is latched at the start of a
// transition so the skeleton keeps showing the correct page/variant even after
// the active transition state has been cleared.
type LatchedNavigationSkeletonState = {
  embedded: boolean;
  pageKey: string;
  variant: KangurRouteTransitionSkeletonVariant | null;
};

// Renders the login modal only when it is explicitly open. Keeping this as a
// separate component avoids importing the heavy modal bundle until needed.
const KangurLoginModalMount = memo((): JSX.Element | null => {
  const loginModalState = useKangurLoginModalState();

  if (!loginModalState.isOpen) {
    return null;
  }

  return <KangurLoginModal />;
});

const KangurDeferredSyncEffectsMount = memo((): JSX.Element | null => {
  const isStandaloneHomeReady = useKangurDeferredStandaloneHomeReady();

  if (!isStandaloneHomeReady) {
    return null;
  }

  return (
    <>
      <KangurProgressSyncProvider />
      <KangurScoreSyncProvider />
    </>
  );
});

const KangurPlainResolvedRoutePage = memo(({
  ResolvedPage,
}: {
  ResolvedPage: React.ComponentType;
}): JSX.Element => <ResolvedPage />);

const KangurCmsResolvedRoutePage = memo(({
  pageKey,
  ResolvedPage,
}: {
  pageKey: string;
  ResolvedPage: React.ComponentType;
}): JSX.Element => <KangurCmsRuntimeScreen pageKey={pageKey} fallback={<ResolvedPage />} />);

const KangurRenderedRouteContent = memo(({
  activeTransitionSourceId,
  embedded,
  isNavigationTransitionActive,
  isPendingRouteSnapshotVisible,
  isRouteCaptureReady,
  isRouteContentInteractionBlocked,
  isRouteContentVisuallyHidden,
  isRouteInteractionReady,
  routeContent,
  routeContentMotionProps,
  routeTransitionKey,
  shouldClipRouteContentDuringTransition,
  transitionPhase,
}: {
  activeTransitionSourceId: string | null;
  embedded: boolean;
  isNavigationTransitionActive: boolean;
  isPendingRouteSnapshotVisible: boolean;
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
  >
    {routeContent}
  </LazyMotionDiv>
));

const KangurRenderedTopNavigation = memo(({
  shouldHideTopNavigationDuringBoot,
  shouldRenderTopNavigationHost,
}: {
  shouldHideTopNavigationDuringBoot: boolean;
  shouldRenderTopNavigationHost: boolean;
}): JSX.Element | null => {
  if (shouldHideTopNavigationDuringBoot) {
    return TOP_NAVIGATION_FALLBACK;
  }

  if (!shouldRenderTopNavigationHost) {
    return null;
  }

  return <KangurTopNavigationHost fallback={TOP_NAVIGATION_FALLBACK} />;
});

const KangurRenderedAppLoader = memo(({
  offsetTopBar,
  visible,
}: {
  offsetTopBar: boolean;
  visible: boolean;
}): JSX.Element => <KangurAppLoader offsetTopBar={offsetTopBar} visible={visible} />);

const KangurResolvedRouteContent = memo(({
  resolvedPageKey,
}: {
  resolvedPageKey: string | null;
}): JSX.Element => {
  const settingsStore = useSettingsStore();

  if (resolvedPageKey === null) {
    return <PageNotFound />;
  }

  const ResolvedPage = kangurPages[resolvedPageKey];
  if (!ResolvedPage) {
    return <PageNotFound />;
  }

  const rawCmsProject = settingsStore.get(KANGUR_CMS_PROJECT_SETTING_KEY);
  const shouldUseCmsRuntimeScreen = hasKangurCmsRuntimeScreen(rawCmsProject, resolvedPageKey);

  return shouldUseCmsRuntimeScreen ? (
    <KangurCmsResolvedRoutePage pageKey={resolvedPageKey} ResolvedPage={ResolvedPage} />
  ) : (
    <KangurPlainResolvedRoutePage ResolvedPage={ResolvedPage} />
  );
});

// AuthenticatedApp is the main learner shell. It owns:
//  - Boot and navigation skeleton orchestration
//  - Route content rendering (page components + CMS runtime screen overlay)
//  - Hot-route preloading and AI Tutor page-content prefetching
//  - Auth-error redirects (login redirect, parent-dashboard guard)
//  - Accessibility announcer and top navigation host
const AuthenticatedApp = memo((): JSX.Element | null => {
  const { navigateToLogin } = useKangurAuthActions();
  const { isAuthenticated, hasResolvedAuth = true } = useKangurAuthSessionState();
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useKangurAuthStatusState();
  const { resolvePendingSnapshot } = useKangurRouteAccess();
  const isLoadingSettings = useSettingsStoreLoading();
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
  const queryClient = useQueryClient();
  const routeLocale = normalizeSiteLocale(useLocale());
  const isCoarsePointer = useKangurCoarsePointer();
  const authErrorType = authError?.type;
  const resolvedPageKey = resolveKangurPageKey(pageKey, kangurPages, KANGUR_MAIN_PAGE);
  const homeHref = getKangurHomeHref(basePath);
  // Unauthenticated users who land directly on the parent dashboard are
  // silently redirected to the home page rather than shown an auth error.
  const shouldRedirectToHome =
    !embedded &&
    hasResolvedAuth &&
    !isLoadingAuth &&
    !isAuthenticated &&
    !authErrorType &&
    resolvedPageKey === 'ParentDashboard';
  const prefersReducedMotion = usePrefersReducedMotion();
  const routeContentMotionProps = useMemo(
    () => createKangurPageTransitionMotionProps(prefersReducedMotion),
    [prefersReducedMotion]
  );
  // Stable key for AnimatePresence: changes on every navigation so the
  // outgoing page can animate out before the incoming page mounts.
  const routeTransitionKey = requestedPath || (pageKey ? `page:${pageKey}` : 'page:unknown');
  const currentRequestedHref = requestedHref ?? requestedPath ?? null;
  // Synthetic capture mode is used by the social screenshot pipeline. When
  // active, background preloads and prefetches are suppressed to keep the
  // captured page in a clean, deterministic state.
  const isSyntheticKangurCapture = isKangurSocialBatchCaptureHref(currentRequestedHref);
  const pendingRouteLoadingSnapshot = resolvePendingSnapshot({
    currentHref: currentRequestedHref,
    fallbackPageKey: KANGUR_MAIN_PAGE,
    snapshot: useKangurPendingRouteLoadingSnapshot(),
  });
  // isBootLoading: true while auth or public settings are still resolving.
  // isThemeBootLoading: true while the settings store (theme/appearance) is
  // loading. Kept separate so the boot loader can be shown even after auth
  // resolves if the theme hasn't arrived yet.
  const isBootLoading = isLoadingPublicSettings || isLoadingAuth;
  const isThemeBootLoading = isLoadingSettings;
  // A navigation transition is active during any of the four phases:
  // acknowledging → pending → waiting_for_ready → revealing.
  const isNavigationTransitionActive =
    isRouteAcknowledging || isRoutePending || isRouteWaitingForReady || isRouteRevealing;
  // Language-switcher transitions use a fade-in/out skeleton animation instead
  // of the standard slide skeleton so the locale change feels intentional.
  const isLanguageSwitcherTransition =
    activeTransitionKind === 'locale-switch' ||
    activeTransitionSourceId === LANGUAGE_SWITCHER_TRANSITION_SOURCE_ID;
  // When a transition has a known source (e.g. a nav link), skip the delay
  // before showing the navigation skeleton so feedback is immediate.
  const shouldSkipNavigationSkeletonDelay = activeTransitionSourceId !== null;
  const shouldBlockRouteContent = shouldRedirectToHome;
  const hasRouteContent = authErrorType !== 'auth_required' && !shouldBlockRouteContent;
  const routeContent = useMemo(
    () =>
      hasRouteContent ? <KangurResolvedRouteContent resolvedPageKey={resolvedPageKey} /> : null,
    [hasRouteContent, resolvedPageKey]
  );
  // hasPresentedInteractiveShell: latched to true once the shell has been
  // shown to the user at least once. Prevents the boot loader from re-appearing
  // on subsequent navigations.
  const [hasPresentedInteractiveShell, setHasPresentedInteractiveShell] = useState(false);
  // isRouteInteractionReady: set to true after the first client-side render so
  // pointer events are enabled on the route content.
  const [isRouteInteractionReady, setIsRouteInteractionReady] = useState(false);
  // hasInitialContentSettled: set to true after the first animation frame
  // following mount, ensuring the lazy-loaded main page has painted before the
  // skeleton overlay is removed.
  const [hasInitialContentSettled, setHasInitialContentSettled] = useState(false);
  const shouldShowBootLoader = isThemeBootLoading && !hasPresentedInteractiveShell;
  const [isBootSkeletonVisible, setIsBootSkeletonVisible] = useState<boolean>(shouldShowBootLoader);
  const [isNavigationSkeletonVisible, setIsNavigationSkeletonVisible] = useState<boolean>(false);
  const [latchedNavigationTopBarHeightCssValue, setLatchedNavigationTopBarHeightCssValue] =
    useState<string | null>(null);
  const preloadedHotRoutesRef = useRef<Set<string>>(new Set());
  const prefetchedPageContentLocalesRef = useRef<Set<string>>(new Set());
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
  // Only keep the initial route skeleton around while the route content has
  // not resolved yet. Once the page content exists, leaving this overlay on
  // top of the screen causes the cold `/ -> /[locale]/kangur` redirect path
  // to hide the home actions until a later rerender.
  const isInitialMountSkeletonVisible =
    routeContent === null && !hasInitialContentSettled && !hasPresentedInteractiveShell;
  const isRouteSkeletonVisible =
    shouldShowAcknowledgingNavigationSkeleton ||
    isNavigationSkeletonVisible ||
    isPendingRouteSnapshotVisible ||
    isInitialMountSkeletonVisible;
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
    isNavigationTransitionActive || (isRouteSkeletonVisible && !isInitialMountSkeletonVisible)
      ? readKangurTopBarHeightCssValue()
      : null;
  const visibleTransitionSkeletonTopBarHeightCssValue = isPendingRouteSnapshotVisible
    ? snapshotTransitionTopBarHeightCssValue ?? currentNavigationTopBarHeightCssValue
    : isRouteSkeletonVisible
    ? latchedNavigationTopBarHeightCssValue ?? currentNavigationTopBarHeightCssValue
    : null;
  const shouldPreserveOutgoingRouteContent =
    isPendingRouteSnapshotVisible ||
    (isRouteSkeletonVisible &&
      (transitionPhase === 'acknowledging' || transitionPhase === 'pending'));
  const shouldKeepRouteContentVisibleDuringTransition =
    shouldPreserveOutgoingRouteContent ||
    (isLanguageSwitcherTransition && isRouteSkeletonVisible);
  const shouldClipRouteContentDuringTransition =
    !shouldKeepRouteContentVisibleDuringTransition &&
    (isPendingRouteSnapshotVisible || isRouteSkeletonVisible);
  const isRouteContentVisuallyHidden = !shouldKeepRouteContentVisibleDuringTransition &&
    (transitionPhase === 'waiting_for_ready' ||
      ((transitionPhase === 'pending' ||
        (transitionPhase === 'acknowledging' &&
          shouldShowAcknowledgingNavigationSkeleton)) &&
        isRouteSkeletonVisible) ||
      isPendingRouteSnapshotVisible);
  const isRouteContentInteractionBlocked =
    !isRouteInteractionReady ||
    isPendingRouteSnapshotVisible ||
    (isRouteSkeletonVisible && transitionPhase !== 'revealing');
  const hasVisibleRouteContent = routeContent !== null && !isRouteContentVisuallyHidden;
  // isRouteCaptureReady: data attribute consumed by the social screenshot
  // pipeline to know when the page is fully settled and safe to capture.
  const isRouteCaptureReady =
    routeContent !== null &&
    !isBootLoading &&
    !isThemeBootLoading &&
    !isNavigationTransitionActive &&
    !isPendingRouteSnapshotVisible &&
    !shouldRedirectToHome &&
    authErrorType !== 'auth_required';
  // When the boot loader is blocking navigation, hide the top navigation so
  // the skeleton covers the full viewport without a nav bar peeking through.
  const isBootLoaderBlockingNavigation =
    isBootSkeletonVisible && !isRouteSkeletonVisible && !hasVisibleRouteContent;
  const shouldHideTopNavigationDuringBoot = isBootLoaderBlockingNavigation;
  const shouldKeepShellTopNavigationDuringTransition =
    isRouteSkeletonVisible && isLanguageSwitcherTransition;
  const shouldRenderInlineRouteSkeletonTopNavigation =
    !visibleTransitionSkeletonEmbedded &&
    !shouldHideTopNavigationDuringBoot &&
    isRouteSkeletonVisible &&
    !shouldKeepShellTopNavigationDuringTransition;
  const shouldRenderTopNavigationHost =
    !shouldHideTopNavigationDuringBoot &&
    (!isRouteSkeletonVisible || shouldKeepShellTopNavigationDuringTransition);
  const routeSkeletonMotionProps = prefersReducedMotion
    ? {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        exit: { opacity: 1 },
        transition: { duration: 0 },
      }
    : isLanguageSwitcherTransition
      ? {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
          transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] as const },
        }
      : {
          initial: { opacity: 1 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
          transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const },
        };
  const shouldSkipRouteContentPresence =
    isNavigationTransitionActive || isPendingRouteSnapshotVisible;
  const renderedRouteContent = routeContent ? (
    <KangurRenderedRouteContent
      activeTransitionSourceId={activeTransitionSourceId}
      embedded={embedded}
      isNavigationTransitionActive={isNavigationTransitionActive}
      isPendingRouteSnapshotVisible={isPendingRouteSnapshotVisible}
      isRouteCaptureReady={isRouteCaptureReady}
      isRouteContentInteractionBlocked={isRouteContentInteractionBlocked}
      isRouteContentVisuallyHidden={isRouteContentVisuallyHidden}
      isRouteInteractionReady={isRouteInteractionReady}
      routeContent={routeContent}
      routeContentMotionProps={routeContentMotionProps}
      routeTransitionKey={routeTransitionKey}
      shouldClipRouteContentDuringTransition={shouldClipRouteContentDuringTransition}
      transitionPhase={transitionPhase}
    />
  ) : null;

  // Enable pointer events on the route content after the first client render.
  useEffect(() => {
    setIsRouteInteractionReady(true);
  }, []);

  // Wait one animation frame after mount before marking initial content as
  // settled. This ensures the lazy-loaded main page (Game) has rendered its
  // first meaningful frame before the skeleton overlay is removed.
  useEffect(() => {
    if (hasInitialContentSettled) return;
    const frameId = requestAnimationFrame(() => {
      setHasInitialContentSettled(true);
    });
    return () => cancelAnimationFrame(frameId);
  }, [hasInitialContentSettled]);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      isBootLoading ||
      isThemeBootLoading ||
      isNavigationTransitionActive ||
      isCoarsePointer ||
      isSyntheticKangurCapture ||
      resolvedPageKey === 'Game'
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
    isCoarsePointer,
    isSyntheticKangurCapture,
    isNavigationTransitionActive,
    isThemeBootLoading,
    resolvedPageKey,
  ]);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      isBootLoading ||
      isThemeBootLoading ||
      isNavigationTransitionActive ||
      isCoarsePointer ||
      isSyntheticKangurCapture ||
      resolvedPageKey === 'Game' ||
      prefetchedPageContentLocalesRef.current.has(routeLocale)
    ) {
      return;
    }

    const prefetch = (): void => {
      void prefetchKangurPageContentStore(queryClient, routeLocale).then((didPrefetch) => {
        if (didPrefetch) {
          prefetchedPageContentLocalesRef.current.add(routeLocale);
        }
      });
    };

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(prefetch, {
        timeout: HOT_PAGE_CONTENT_PREFETCH_TIMEOUT_MS,
      });
      return () => {
        window.cancelIdleCallback?.(idleId);
      };
    }

    const timeoutId = window.setTimeout(prefetch, 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    isBootLoading,
    isCoarsePointer,
    isSyntheticKangurCapture,
    isNavigationTransitionActive,
    isThemeBootLoading,
    queryClient,
    resolvedPageKey,
    routeLocale,
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

  // Redirect to login when the server returns an auth_required error (e.g.
  // session expired or invalid token).
  useEffect(() => {
    if (authErrorType === 'auth_required') {
      navigateToLogin();
    }
  }, [authErrorType, navigateToLogin]);

  // Redirect unauthenticated users away from the parent dashboard to the home
  // page. Uses replace so the back button doesn't loop back to the dashboard.
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
  const shouldReserveTopBarOffset = true;

  return (
    <>
      <KangurRenderedRouteAccessibilityAnnouncer />
      <KangurRenderedTopNavigation
        shouldHideTopNavigationDuringBoot={shouldHideTopNavigationDuringBoot}
        shouldRenderTopNavigationHost={shouldRenderTopNavigationHost}
      />
      <KangurRenderedAppLoader
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
              className={cn('pointer-events-none')}
              data-testid='kangur-page-transition-skeleton-motion'
              {...routeSkeletonMotionProps}
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
});

// KangurFeatureApp is the root of the StudiQ learner experience. It composes
// all global context providers in the correct order:
//
//  KangurRouteTransitionProvider  – manages the 4-phase navigation lifecycle
//  KangurAuthProvider             – resolves learner auth session
//  KangurFocusProvider            – owns subject focus, age-group focus, and
//                                   the subject/age-group sync in one scope
//  KangurDeferredSyncEffectsMount – defers progress/score sync mounts on the
//                                   initial standalone home boot so those
//                                   side effects do not subscribe during first
//                                   paint
//  KangurContextRegistryPageBoundary – scopes AI Tutor context to the page
//  KangurDeferredAiTutorProviders – mounts dormant AI Tutor contexts from the
//                                   first render; the heavy runtime still
//                                   activates lazily via the widget bridge
//  KangurLoginModalProvider       – controls the login modal open/close state
//                                   for the routed app, tutor widget, and
//                                   modal mount only
//  KangurGuestPlayerProvider      – tracks unauthenticated guest state for
//                                   routed learner pages only
//  KangurTopNavigationProvider    – owns top-bar visibility and content for
//                                   the routed learner app only
//  KangurDeferredAiTutorWidgetMount – delays the heavy widget only for the
//                                     initial standalone home-route boot
//
// AuthenticatedApp and KangurAiTutorWidget are rendered inside the deferred
// AI Tutor tree so they can access tutor context without blocking first paint.
export function KangurFeatureApp(): JSX.Element {
  return (
    <KangurRouteTransitionProvider>
      <KangurAuthProvider>
        <KangurFocusProvider>
          <KangurDeferredSyncEffectsMount />
          <KangurLoginModalProvider>
            <KangurContextRegistryPageBoundary>
              <KangurDeferredAiTutorProviders>
                <KangurGuestPlayerProvider>
                  <KangurTopNavigationProvider>
                    <AuthenticatedApp />
                  </KangurTopNavigationProvider>
                </KangurGuestPlayerProvider>
                <KangurDeferredAiTutorWidgetMount />
              </KangurDeferredAiTutorProviders>
            </KangurContextRegistryPageBoundary>
            <KangurLoginModalMount />
          </KangurLoginModalProvider>
        </KangurFocusProvider>
      </KangurAuthProvider>
    </KangurRouteTransitionProvider>
  );
}
