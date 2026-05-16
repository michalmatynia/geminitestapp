'use client';
'use memo';

import { useLocale } from 'next-intl';
import { useEffect, useMemo, useRef } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { KANGUR_CMS_PROJECT_SETTING_KEY } from '@/features/kangur/cms-builder/project-contracts';
import { KANGUR_MAIN_PAGE, kangurPages } from '@/features/kangur/config/pages';
import { getKangurHomeHref, resolveKangurPageKey } from '@/features/kangur/config/routing';
import { createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import {
  KangurAuthProvider,
  useKangurAuthActions,
  useKangurAuthSessionState,
  useKangurAuthStatusState,
} from '@/features/kangur/ui/context/KangurAuthContext';
import { KangurContextRegistryPageBoundary } from '@/features/kangur/ui/context/KangurContextRegistryPageBoundary';
import {
  KangurFocusProvider,
  useKangurAgeGroupFocus,
  useKangurSubjectFocus,
} from '@/features/kangur/ui/context/KangurFocusProvider';
import { KangurGuestPlayerProvider } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import { KangurLoginModalProvider } from '@/features/kangur/ui/context/KangurLoginModalContext';
import {
  KangurRouteTransitionProvider,
  useKangurRouteTransitionState,
} from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  KangurTopNavigationProvider,
  useOptionalKangurTopNavigationState,
} from '@/features/kangur/ui/context/KangurTopNavigationContext';
import { useKangurRouteAccess } from '@/features/kangur/ui/routing/useKangurRouteAccess';
import { resolveManagedKangurEmbeddedFromHref } from '@/features/kangur/ui/routing/managed-paths';
import { isSocialPublishingBatchCaptureHref } from '@/features/kangur/shared/capture-mode';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';
import { readKangurTopBarHeightCssValue } from '@/features/kangur/ui/utils/readKangurTopBarHeightCssValue';
import { useKangurBootOrchestrator } from '@/features/kangur/ui/hooks/useKangurBootOrchestrator';
import { useKangurNavigationSkeleton } from '@/features/kangur/ui/hooks/useKangurNavigationSkeleton';
import { useKangurPreloadEffects } from '@/features/kangur/ui/hooks/useKangurPreloadEffects';
import { useKangurSkeletonOverlayState } from '@/features/kangur/ui/hooks/useKangurSkeletonOverlayState';
import { useKangurDeferredStandaloneHomeReady } from '@/features/kangur/ui/hooks/useKangurDeferredStandaloneHomeReady';
import { useKangurPendingRouteLoadingSnapshot } from '@/features/kangur/ui/routing/pending-route-loading-snapshot';
import { useSettingsStore, useSettingsStoreLoading } from '@/shared/providers/SettingsStoreProvider';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';
import { LazyAnimatePresence, usePrefersReducedMotion } from '@/features/kangur/ui/components/LazyAnimatePresence';
import { KangurDeferredAiTutorProviders } from '@/features/kangur/ui/KangurDeferredAiTutorProviders';
import { KangurDeferredAiTutorWidgetMount } from '@/features/kangur/ui/KangurDeferredAiTutorWidgetMount';
import {
  KangurDeferredSyncEffectsMount,
  KangurLoginModalMount,
  KangurRenderedAppLoader,
  KangurRenderedRouteAccessibilityAnnouncer,
  KangurRenderedRouteContent,
  KangurRenderedRouteSkeletonOverlay,
  KangurRenderedRouteWithSuspense,
  KangurRenderedTopNavigation,
  KangurResolvedRouteContent,
  UserNotRegisteredError,
} from '@/features/kangur/ui/KangurFeatureApp.components';

import type { JSX } from 'react';

const LANGUAGE_SWITCHER_TRANSITION_SOURCE_ID = 'kangur-language-switcher';

const AuthenticatedApp = (): JSX.Element | null => {
  const { navigateToLogin } = useKangurAuthActions();
  const { hasResolvedAuth = true, isAuthenticated } = useKangurAuthSessionState();
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useKangurAuthStatusState();
  const { resolvePendingSnapshot } = useKangurRouteAccess();
  const isLoadingSettings = useSettingsStoreLoading();
  const {
    isRouteAcknowledging, isRoutePending, isRouteWaitingForReady, isRouteRevealing,
    transitionPhase, activeTransitionSourceId, activeTransitionKind, pendingPageKey,
    activeTransitionPageKey, activeTransitionRequestedHref, activeTransitionSkeletonVariant,
  } = useKangurRouteTransitionState();
  const routeNavigator = useKangurRouteNavigator();
  const { pageKey, embedded, requestedPath, requestedHref, basePath } = useKangurRouting();
  const queryClient = useQueryClient();
  const settingsStore = useSettingsStore();
  const topNavigationState = useOptionalKangurTopNavigationState();
  const routeLocale = normalizeSiteLocale(useLocale());
  const isCoarsePointer = useKangurCoarsePointer();
  const prefersReducedMotion = usePrefersReducedMotion();
  const isStandaloneHomeDeferredReady = useKangurDeferredStandaloneHomeReady();
  const { subject } = useKangurSubjectFocus();
  const { ageGroup } = useKangurAgeGroupFocus();

  const authErrorType = authError?.type;
  const resolvedPageKey = resolveKangurPageKey(pageKey, kangurPages, KANGUR_MAIN_PAGE);
  const rawCmsProject = settingsStore.get(KANGUR_CMS_PROJECT_SETTING_KEY);
  const homeHref = getKangurHomeHref(basePath);
  const shouldRedirectToHome =
    !embedded && hasResolvedAuth && !isLoadingAuth && !isAuthenticated &&
    !authErrorType && resolvedPageKey === 'ParentDashboard';
  const routeContentMotionProps = useMemo(
    () => createKangurPageTransitionMotionProps(prefersReducedMotion),
    [prefersReducedMotion]
  );
  const routeTransitionKey = requestedPath || (pageKey ? `page:${pageKey}` : 'page:unknown');
  const currentRequestedHref = requestedHref ?? requestedPath ?? null;
  const isSyntheticKangurCapture = isSocialPublishingBatchCaptureHref(currentRequestedHref);
  const pendingRouteLoadingSnapshot = resolvePendingSnapshot({
    currentHref: currentRequestedHref,
    fallbackPageKey: KANGUR_MAIN_PAGE,
    snapshot: useKangurPendingRouteLoadingSnapshot(),
  });
  const isBootLoading = isLoadingPublicSettings || isLoadingAuth;
  const isThemeBootLoading = isLoadingSettings;
  const isSettingsRefresh = Boolean(settingsStore.isFetching);
  const isStandaloneHomeRoute = !embedded && resolvedPageKey === KANGUR_MAIN_PAGE;
  const hasStandaloneHomeTopNavigationRegistration =
    !isStandaloneHomeRoute || topNavigationState?.visibleRegistration !== null;
  const isNavigationTransitionActive =
    isRouteAcknowledging || isRoutePending || isRouteWaitingForReady || isRouteRevealing;
  const isLanguageSwitcherTransition =
    activeTransitionKind === 'locale-switch' ||
    activeTransitionSourceId === LANGUAGE_SWITCHER_TRANSITION_SOURCE_ID;
  const shouldSkipNavigationSkeletonDelay = activeTransitionSourceId !== null;
  const hasRouteContent = authErrorType !== 'auth_required' && !shouldRedirectToHome;
  const routeContent = useMemo(
    () =>
      hasRouteContent
        ? <KangurResolvedRouteContent rawCmsProject={rawCmsProject} resolvedPageKey={resolvedPageKey} />
        : null,
    [hasRouteContent, rawCmsProject, resolvedPageKey]
  );
  const transitionPageKey =
    pendingPageKey ?? activeTransitionPageKey ?? resolvedPageKey ?? KANGUR_MAIN_PAGE;
  const transitionEmbedded =
    resolveManagedKangurEmbeddedFromHref({ href: activeTransitionRequestedHref, basePath }) ?? embedded;
  const isPendingRouteSnapshotVisible =
    !isNavigationTransitionActive &&
    pendingRouteLoadingSnapshot !== null &&
    pendingRouteLoadingSnapshot.href !== null &&
    pendingRouteLoadingSnapshot.href !== currentRequestedHref;
  const hasCommittedTargetRoute =
    (activeTransitionRequestedHref !== null && activeTransitionRequestedHref !== currentRequestedHref) ||
    (activeTransitionPageKey !== null && activeTransitionPageKey !== resolvedPageKey) ||
    (pendingPageKey !== null && pendingPageKey !== resolvedPageKey);
  const shouldShowAcknowledgingNavigationSkeleton =
    isRouteAcknowledging && (isLanguageSwitcherTransition || hasCommittedTargetRoute);

  const navSkeletonVisibleRef = useRef(false);
  const boot = useKangurBootOrchestrator({
    embedded, isBootLoading, isThemeBootLoading, isSettingsRefresh,
    isStandaloneHomeRoute, basePath, hasStandaloneHomeTopNavigationRegistration,
    routeContent, isNavigationTransitionActive, isPendingRouteSnapshotVisible,
    isNavigationSkeletonVisible: navSkeletonVisibleRef.current,
    shouldShowAcknowledgingNavigationSkeleton, transitionPhase, isLanguageSwitcherTransition,
  });

  const currentNavigationTopBarHeightCssValue =
    isNavigationTransitionActive || (boot.isRouteSkeletonVisible && !boot.isInitialMountSkeletonVisible)
      ? readKangurTopBarHeightCssValue() : null;

  const navSkeleton = useKangurNavigationSkeleton({
    embedded, isBootLoading, isLanguageSwitcherTransition, isNavigationTransitionActive,
    isRouteAcknowledging, isRoutePending, isRouteWaitingForReady, isRouteRevealing,
    isRouteSkeletonVisible: boot.isRouteSkeletonVisible,
    shouldSkipNavigationSkeletonDelay, shouldShowAcknowledgingNavigationSkeleton,
    currentNavigationTopBarHeightCssValue, pendingPageKey, activeTransitionPageKey,
    activeTransitionSkeletonVariant, transitionPageKey, transitionEmbedded,
  });
  navSkeletonVisibleRef.current = navSkeleton.isNavigationSkeletonVisible;

  const effectiveIsRouteSkeletonVisible =
    boot.isRouteSkeletonVisible || navSkeleton.isNavigationSkeletonVisible;
  const shouldBlockInitialHomePreloads =
    isStandaloneHomeRoute && boot.shouldRunInitialHomeBoot;
  const shouldLoadRouteMotion =
    !isStandaloneHomeRoute || isStandaloneHomeDeferredReady;

  useKangurPreloadEffects({
    ageGroup,
    isBootLoading: isBootLoading || shouldBlockInitialHomePreloads,
    isThemeBootLoading,
    isNavigationTransitionActive,
    isCoarsePointer, isSyntheticKangurCapture, resolvedPageKey, queryClient, routeLocale,
    subject,
  });

  const skeletonOverlay = useKangurSkeletonOverlayState({
    activeTransitionSkeletonVariant, basePath, currentNavigationTopBarHeightCssValue,
    embedded, isLanguageSwitcherTransition, isPendingRouteSnapshotVisible,
    isRouteSkeletonVisible: effectiveIsRouteSkeletonVisible, navSkeleton,
    pendingRouteLoadingSnapshot, prefersReducedMotion, resolvedPageKey,
    transitionEmbedded, transitionPageKey,
  });

  const {
    isRouteContentVisuallyHidden, isInitialHomeLoaderPhase,
    isInitialHomeSkeletonPhase, isBootSkeletonVisible, isRouteInteractionReady,
    shouldKeepRouteContentVisibleDuringTransition,
  } = boot;
  const isRouteSkeletonVisible = effectiveIsRouteSkeletonVisible;
  // Guard: never re-show the full-screen loader once past the 'loader' phase and route content
  // is available. Without this, a state-lag race between isBootSkeletonVisible (async state) and
  // isRouteSkeletonVisible (synchronous derived) causes a one-render flash when routeContent
  // transitions from null → non-null during the 'page-skeleton' phase.
  const isBootLoaderBlockingNavigation =
    isBootSkeletonVisible &&
    !isRouteSkeletonVisible &&
    (isInitialHomeLoaderPhase || routeContent === null);
  const hasVisibleRouteBlockingOverlay =
    isBootLoaderBlockingNavigation || isRouteSkeletonVisible || isPendingRouteSnapshotVisible;
  const effectiveIsRouteContentVisuallyHidden =
    routeContent !== null && !hasVisibleRouteBlockingOverlay
      ? false
      : isRouteContentVisuallyHidden;
  // Keep the real nav bar mounted during all route transitions so it doesn't
  // visually flash/remount. The skeleton overlay positions itself below the nav
  // (top: topBarHeightCssValue) and doesn't need an inline nav skeleton.
  const shouldKeepShellTopNavigationDuringTransition = isRouteSkeletonVisible;
  const shouldClipRouteContentDuringTransition =
    !shouldKeepRouteContentVisibleDuringTransition &&
    (isPendingRouteSnapshotVisible || isRouteSkeletonVisible);
  const isRouteContentInteractionBlocked =
    !isRouteInteractionReady || isPendingRouteSnapshotVisible ||
    (isRouteSkeletonVisible && transitionPhase !== 'revealing');
  const isRouteCaptureReady =
    routeContent !== null && !isInitialHomeLoaderPhase && !isInitialHomeSkeletonPhase &&
    !isBootLoading && !isThemeBootLoading && !isNavigationTransitionActive &&
    !isPendingRouteSnapshotVisible && !shouldRedirectToHome && authErrorType !== 'auth_required';
  const shouldRenderInlineRouteSkeletonTopNavigation =
    !transitionEmbedded && !isBootLoaderBlockingNavigation &&
    isRouteSkeletonVisible && !shouldKeepShellTopNavigationDuringTransition;
  const shouldRenderTopNavigationHost =
    !isBootLoaderBlockingNavigation &&
    (!isRouteSkeletonVisible || shouldKeepShellTopNavigationDuringTransition);
  const shouldSkipRouteContentPresence =
    isNavigationTransitionActive || isPendingRouteSnapshotVisible;
  const renderedRouteContent = routeContent ? (
    <KangurRenderedRouteContent
      activeTransitionSourceId={activeTransitionSourceId}
      embedded={embedded}
      isNavigationTransitionActive={isNavigationTransitionActive}
      isPendingRouteSnapshotVisible={isPendingRouteSnapshotVisible}
      loadMotion={shouldLoadRouteMotion}
      isRouteCaptureReady={isRouteCaptureReady}
      isRouteContentInteractionBlocked={isRouteContentInteractionBlocked}
      isRouteContentVisuallyHidden={effectiveIsRouteContentVisuallyHidden}
      isRouteInteractionReady={isRouteInteractionReady}
      routeContent={routeContent}
      routeContentMotionProps={routeContentMotionProps}
      routeTransitionKey={routeTransitionKey}
      shouldClipRouteContentDuringTransition={shouldClipRouteContentDuringTransition}
      transitionPhase={transitionPhase}
    />
  ) : null;

  useEffect(() => {
    if (authErrorType === 'auth_required') navigateToLogin();
  }, [authErrorType, navigateToLogin]);

  useEffect(() => {
    if (!shouldRedirectToHome) return;
    routeNavigator.replace(homeHref, {
      pageKey: KANGUR_MAIN_PAGE,
      sourceId: 'kangur-auth:redirect-parent-dashboard',
    });
  }, [homeHref, routeNavigator, shouldRedirectToHome]);

  if (authErrorType === 'user_not_registered') return <UserNotRegisteredError />;

  return (
    <>
      <KangurRenderedRouteAccessibilityAnnouncer />
      <KangurRenderedTopNavigation
        shouldHideTopNavigationDuringBoot={isBootLoaderBlockingNavigation}
        shouldRenderTopNavigationHost={shouldRenderTopNavigationHost}
      />
      <KangurRenderedAppLoader offsetTopBar={false} visible={isBootLoaderBlockingNavigation} />
      <KangurRenderedRouteWithSuspense
        isInitialHomeLoaderPhase={isInitialHomeLoaderPhase}
        isInitialHomeSkeletonPhase={isInitialHomeSkeletonPhase}
        loadMotion={shouldLoadRouteMotion}
        resolvedPageKey={resolvedPageKey}
        shouldSkipRouteContentPresence={shouldSkipRouteContentPresence}
        renderedRouteContent={renderedRouteContent}
      />
      <LazyAnimatePresence loadMotion={shouldLoadRouteMotion}>
        <KangurRenderedRouteSkeletonOverlay
          isLanguageSwitcherTransition={isLanguageSwitcherTransition}
          isRouteSkeletonVisible={isRouteSkeletonVisible}
          loadMotion={shouldLoadRouteMotion}
          routeSkeletonMotionProps={skeletonOverlay.routeSkeletonMotionProps}
          shouldRenderInlineRouteSkeletonTopNavigation={shouldRenderInlineRouteSkeletonTopNavigation}
          topBarHeightCssValue={skeletonOverlay.visibleTransitionSkeletonTopBarHeightCssValue}
          variant={skeletonOverlay.visibleTransitionSkeletonVariant}
          visibleTransitionSkeletonEmbedded={skeletonOverlay.visibleTransitionSkeletonEmbedded}
          visibleTransitionSkeletonPageKey={skeletonOverlay.visibleTransitionSkeletonPageKey}
        />
      </LazyAnimatePresence>
    </>
  );
};

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
