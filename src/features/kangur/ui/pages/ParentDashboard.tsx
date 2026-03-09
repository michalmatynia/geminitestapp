'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';

import { KangurDocsTooltipEnhancer, useKangurDocsTooltips } from '@/features/kangur/docs/tooltips';
import { KangurParentDashboardAssignmentsWidget } from '@/features/kangur/ui/components/KangurParentDashboardAssignmentsWidget';
import { KangurParentDashboardAiTutorWidget } from '@/features/kangur/ui/components/KangurParentDashboardAiTutorWidget';
import { KangurParentDashboardHeroWidget } from '@/features/kangur/ui/components/KangurParentDashboardHeroWidget';
import { KangurParentDashboardLearnerManagementWidget } from '@/features/kangur/ui/components/KangurParentDashboardLearnerManagementWidget';
import { KangurParentDashboardProgressWidget } from '@/features/kangur/ui/components/KangurParentDashboardProgressWidget';
import { KangurParentDashboardScoresWidget } from '@/features/kangur/ui/components/KangurParentDashboardScoresWidget';
import { KangurParentDashboardTabsWidget } from '@/features/kangur/ui/components/KangurParentDashboardTabsWidget';
import { KangurTopNavigationController } from '@/features/kangur/ui/components/KangurTopNavigationController';
import {
  KangurPageContainer,
  KangurPageShell,
} from '@/features/kangur/ui/design/primitives';
import { useKangurGuestPlayer } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import {
  KangurParentDashboardRuntimeBoundary,
  type KangurParentDashboardTabId,
  useKangurParentDashboardRuntime,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';

function ParentDashboardContent(): React.JSX.Element {
  const {
    activeTab,
    basePath,
    canAccessDashboard,
    canManageLearners,
    isAuthenticated,
    logout,
    navigateToLogin,
  } = useKangurParentDashboardRuntime();
  const { guestPlayerName, setGuestPlayerName } = useKangurGuestPlayer();
  const { enabled: docsTooltipsEnabled } = useKangurDocsTooltips('parentDashboard');
  const tabPanelsRef = useRef<HTMLDivElement | null>(null);
  const tabPanelsContentRef = useRef<HTMLDivElement | null>(null);
  const knownTabPanelHeightsRef = useRef<Partial<Record<KangurParentDashboardTabId, number>>>({});
  const pendingScrollSnapshotRef = useRef<number | null>(null);
  const restoreScrollAnimationFrameRef = useRef<number | null>(null);
  const [reservedTabPanelHeight, setReservedTabPanelHeight] = useState<number | null>(null);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const tabPanelsContent = tabPanelsContentRef.current;
    if (!tabPanelsContent) {
      return;
    }

    const syncKnownHeight = (): void => {
      const measuredHeight = Math.ceil(tabPanelsContent.getBoundingClientRect().height);
      if (measuredHeight <= 0) {
        return;
      }
      knownTabPanelHeightsRef.current[activeTab] = measuredHeight;
    };

    syncKnownHeight();

    const observer = new ResizeObserver(() => {
      syncKnownHeight();
    });
    observer.observe(tabPanelsContent);

    return () => {
      observer.disconnect();
    };
  }, [activeTab]);

  useEffect(() => {
    if (reservedTabPanelHeight === null) {
      return;
    }

    const tabPanelsContent = tabPanelsContentRef.current;
    if (!tabPanelsContent) {
      return;
    }

    const releaseReserveIfSafe = (): void => {
      const actualContentHeight = Math.ceil(tabPanelsContent.getBoundingClientRect().height);
      if (actualContentHeight <= 0) {
        return;
      }

      if (reservedTabPanelHeight <= actualContentHeight) {
        setReservedTabPanelHeight(null);
        return;
      }

      const hypotheticalDocumentHeight =
        document.documentElement.scrollHeight - (reservedTabPanelHeight - actualContentHeight);
      if (window.scrollY + window.innerHeight <= hypotheticalDocumentHeight + 1) {
        setReservedTabPanelHeight(null);
      }
    };

    releaseReserveIfSafe();

    window.addEventListener('scroll', releaseReserveIfSafe, { passive: true });
    window.addEventListener('resize', releaseReserveIfSafe);

    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
          releaseReserveIfSafe();
        });
    observer?.observe(tabPanelsContent);

    return () => {
      window.removeEventListener('scroll', releaseReserveIfSafe);
      window.removeEventListener('resize', releaseReserveIfSafe);
      observer?.disconnect();
    };
  }, [reservedTabPanelHeight]);

  useLayoutEffect(() => {
    const previousScrollY = pendingScrollSnapshotRef.current;
    if (previousScrollY === null) {
      return;
    }

    pendingScrollSnapshotRef.current = null;
    window.scrollTo({ top: previousScrollY, left: 0 });

    if (restoreScrollAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(restoreScrollAnimationFrameRef.current);
    }

    restoreScrollAnimationFrameRef.current = window.requestAnimationFrame(() => {
      window.scrollTo({ top: previousScrollY, left: 0 });
      restoreScrollAnimationFrameRef.current = null;
    });
  }, [activeTab]);

  useEffect(
    () => () => {
      if (restoreScrollAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(restoreScrollAnimationFrameRef.current);
      }
    },
    []
  );

  const reservePanelHeightBeforeTabChange = useCallback(
    (nextTab: KangurParentDashboardTabId): void => {
      pendingScrollSnapshotRef.current = window.scrollY;
      const panelRect = tabPanelsRef.current?.getBoundingClientRect() ?? null;
      const currentHeight = Math.ceil(
        tabPanelsContentRef.current?.getBoundingClientRect().height ?? panelRect?.height ?? 0
      );
      const nextKnownHeight = knownTabPanelHeightsRef.current[nextTab] ?? 0;
      const viewportSupportHeight = panelRect
        ? Math.ceil(Math.max(0, window.innerHeight - panelRect.top))
        : 0;
      const reservedHeight = Math.max(currentHeight, nextKnownHeight, viewportSupportHeight);

      if (reservedHeight > 0) {
        setReservedTabPanelHeight(reservedHeight);
      }
    },
    []
  );
  const navigation = useMemo(
    () => ({
      basePath,
      canManageLearners,
      currentPage: 'ParentDashboard' as const,
      guestPlayerName: isAuthenticated ? undefined : guestPlayerName,
      isAuthenticated,
      onCreateAccount: () => navigateToLogin({ authMode: 'create-account' }),
      onGuestPlayerNameChange: isAuthenticated ? undefined : setGuestPlayerName,
      onLogin: navigateToLogin,
      onLogout: () => logout(false),
    }),
    [
      basePath,
      canManageLearners,
      guestPlayerName,
      isAuthenticated,
      logout,
      navigateToLogin,
      setGuestPlayerName,
    ]
  );

  if (!canAccessDashboard) {
    return (
      <KangurPageShell
        tone='dashboard'
        className='justify-center px-4'
        id='kangur-parent-dashboard-page'
      >
        <KangurDocsTooltipEnhancer
          enabled={docsTooltipsEnabled}
          rootId='kangur-parent-dashboard-page'
        />
        <motion.div initial={false} animate={{ opacity: 1, y: 0 }} className='w-full max-w-lg'>
          <KangurParentDashboardHeroWidget />
        </motion.div>
      </KangurPageShell>
    );
  }

  return (
    <KangurPageShell
      tone='dashboard'
      id='kangur-parent-dashboard-page'
      skipLinkTargetId='kangur-parent-dashboard-main'
    >
      <KangurDocsTooltipEnhancer
        enabled={docsTooltipsEnabled}
        rootId='kangur-parent-dashboard-page'
      />
      <KangurTopNavigationController navigation={navigation} />

      <KangurPageContainer
        id='kangur-parent-dashboard-main'
        className='max-w-2xl flex flex-col gap-6'
      >
        <motion.div initial={false} animate={{ opacity: 1, y: 0 }}>
          <KangurParentDashboardHeroWidget showActions={false} />
        </motion.div>

        <KangurParentDashboardLearnerManagementWidget />
        <div>
          <KangurParentDashboardTabsWidget onBeforeTabChange={reservePanelHeightBeforeTabChange} />
        </div>

        <div
          ref={tabPanelsRef}
          style={
            reservedTabPanelHeight !== null
              ? { minHeight: `${reservedTabPanelHeight}px` }
              : undefined
          }
        >
          <div ref={tabPanelsContentRef}>
            <KangurParentDashboardProgressWidget displayMode='active-tab' />
            <KangurParentDashboardScoresWidget displayMode='active-tab' />
            <KangurParentDashboardAssignmentsWidget displayMode='active-tab' />
            <KangurParentDashboardAiTutorWidget displayMode='active-tab' />
          </div>
        </div>
      </KangurPageContainer>
    </KangurPageShell>
  );
}

export default function ParentDashboard(): React.JSX.Element {
  return (
    <KangurParentDashboardRuntimeBoundary enabled>
      <ParentDashboardContent />
    </KangurParentDashboardRuntimeBoundary>
  );
}
