'use client';

import { motion } from 'framer-motion';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { KangurDocsTooltipEnhancer, useKangurDocsTooltips } from '@/features/kangur/docs/tooltips';
import { KangurParentDashboardAiTutorWidget } from '@/features/kangur/ui/components/KangurParentDashboardAiTutorWidget';
import { KangurParentDashboardAssignmentsWidget } from '@/features/kangur/ui/components/KangurParentDashboardAssignmentsWidget';
import { KangurParentDashboardHeroWidget } from '@/features/kangur/ui/components/KangurParentDashboardHeroWidget';
import { KangurParentDashboardLearnerManagementWidget } from '@/features/kangur/ui/components/KangurParentDashboardLearnerManagementWidget';
import { KangurParentDashboardProgressWidget } from '@/features/kangur/ui/components/KangurParentDashboardProgressWidget';
import { KangurParentDashboardScoresWidget } from '@/features/kangur/ui/components/KangurParentDashboardScoresWidget';
import { KangurParentDashboardTabsWidget } from '@/features/kangur/ui/components/KangurParentDashboardTabsWidget';
import { KangurTopNavigationController } from '@/features/kangur/ui/components/KangurTopNavigationController';
import { useKangurAiTutorSessionSync } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { useKangurGuestPlayer } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import {
  KangurParentDashboardRuntimeBoundary,
  type KangurParentDashboardTabId,
  useKangurParentDashboardRuntime,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import {
  KangurPageContainer,
  KangurPageShell,
} from '@/features/kangur/ui/design/primitives';
import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';

const PARENT_TAB_LABELS: Record<KangurParentDashboardTabId, string> = {
  progress: 'Postep ucznia',
  scores: 'Wyniki ucznia',
  assign: 'Zadania ucznia',
  'ai-tutor': 'Tutor-AI dla rodzica',
};

function ParentDashboardContent(): React.JSX.Element {
  const {
    activeLearner,
    activeTab,
    basePath,
    canAccessDashboard,
    canManageLearners,
    isAuthenticated,
    logout,
    navigateToLogin,
  } = useKangurParentDashboardRuntime();
  useKangurRoutePageReady({
    pageKey: 'ParentDashboard',
    ready: true,
  });
  const { guestPlayerName, setGuestPlayerName } = useKangurGuestPlayer();
  const { enabled: docsTooltipsEnabled } = useKangurDocsTooltips('parentDashboard');
  const tabPanelsRef = useRef<HTMLDivElement | null>(null);
  const tabPanelsContentRef = useRef<HTMLDivElement | null>(null);
  const guestHeroAnchorRef = useRef<HTMLDivElement | null>(null);
  const heroAnchorRef = useRef<HTMLDivElement | null>(null);
  const learnerManagementAnchorRef = useRef<HTMLDivElement | null>(null);
  const tabsAnchorRef = useRef<HTMLDivElement | null>(null);
  const progressAnchorRef = useRef<HTMLDivElement | null>(null);
  const scoresAnchorRef = useRef<HTMLDivElement | null>(null);
  const assignmentsAnchorRef = useRef<HTMLDivElement | null>(null);
  const aiTutorAnchorRef = useRef<HTMLDivElement | null>(null);
  const knownTabPanelHeightsRef = useRef<Partial<Record<KangurParentDashboardTabId, number>>>({});
  const pendingScrollSnapshotRef = useRef<number | null>(null);
  const restoreScrollAnimationFrameRef = useRef<number | null>(null);
  const [reservedTabPanelHeight, setReservedTabPanelHeight] = useState<number | null>(null);
  const activeLearnerId = activeLearner?.id?.trim() || null;
  const dashboardContentId = canAccessDashboard
    ? `parent-dashboard:${activeLearnerId ?? 'none'}:${activeTab}`
    : 'parent-dashboard:guest';
  const dashboardTitle = canAccessDashboard
    ? `Panel rodzica: ${PARENT_TAB_LABELS[activeTab]}`
    : 'Panel rodzica bez dostepu';

  useKangurAiTutorSessionSync({
    learnerId: activeLearnerId,
    sessionContext: {
      surface: 'parent_dashboard',
      contentId: dashboardContentId,
      title: dashboardTitle,
      description: canAccessDashboard
        ? 'Dashboard rodzica z postepem ucznia, wynikami, zadaniami i wsparciem Tutor-AI.'
        : 'Widok ograniczonego dostepu do panelu rodzica.',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-parent-dashboard-guest-hero',
    kind: 'hero',
    ref: guestHeroAnchorRef,
    surface: 'parent_dashboard',
    enabled: !canAccessDashboard,
    priority: 90,
    metadata: {
      contentId: dashboardContentId,
      label: 'Hero dashboardu rodzica bez dostepu',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-parent-dashboard-hero',
    kind: 'hero',
    ref: heroAnchorRef,
    surface: 'parent_dashboard',
    enabled: canAccessDashboard,
    priority: 88,
    metadata: {
      contentId: dashboardContentId,
      label: 'Hero dashboardu rodzica',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-parent-dashboard-learner-management',
    kind: 'screen',
    ref: learnerManagementAnchorRef,
    surface: 'parent_dashboard',
    enabled: canAccessDashboard,
    priority: 86,
    metadata: {
      contentId: dashboardContentId,
      label: 'Zarzadzanie uczniami',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-parent-dashboard-tabs',
    kind: 'navigation',
    ref: tabsAnchorRef,
    surface: 'parent_dashboard',
    enabled: canAccessDashboard,
    priority: 84,
    metadata: {
      contentId: dashboardContentId,
      label: 'Zakladki dashboardu rodzica',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-parent-dashboard-progress',
    kind: 'progress',
    ref: progressAnchorRef,
    surface: 'parent_dashboard',
    enabled: canAccessDashboard && activeTab === 'progress',
    priority: 82,
    metadata: {
      contentId: dashboardContentId,
      label: 'Postep ucznia',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-parent-dashboard-scores',
    kind: 'summary',
    ref: scoresAnchorRef,
    surface: 'parent_dashboard',
    enabled: canAccessDashboard && activeTab === 'scores',
    priority: 80,
    metadata: {
      contentId: dashboardContentId,
      label: 'Wyniki ucznia',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-parent-dashboard-assignments',
    kind: 'assignment',
    ref: assignmentsAnchorRef,
    surface: 'parent_dashboard',
    enabled: canAccessDashboard && activeTab === 'assign',
    priority: 78,
    metadata: {
      contentId: dashboardContentId,
      label: 'Zadania ucznia',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-parent-dashboard-ai-tutor',
    kind: 'screen',
    ref: aiTutorAnchorRef,
    surface: 'parent_dashboard',
    enabled: canAccessDashboard && activeTab === 'ai-tutor',
    priority: 76,
    metadata: {
      contentId: dashboardContentId,
      label: 'Tutor-AI dla rodzica',
    },
  });

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
        <motion.div
          ref={guestHeroAnchorRef}
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className='w-full max-w-lg'
        >
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
        <motion.div ref={heroAnchorRef} initial={false} animate={{ opacity: 1, y: 0 }}>
          <KangurParentDashboardHeroWidget showActions={false} />
        </motion.div>

        <div ref={learnerManagementAnchorRef}>
          <KangurParentDashboardLearnerManagementWidget />
        </div>
        <div ref={tabsAnchorRef}>
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
            <div ref={progressAnchorRef}>
              <KangurParentDashboardProgressWidget displayMode='active-tab' />
            </div>
            <div ref={scoresAnchorRef}>
              <KangurParentDashboardScoresWidget displayMode='active-tab' />
            </div>
            <div ref={assignmentsAnchorRef}>
              <KangurParentDashboardAssignmentsWidget displayMode='active-tab' />
            </div>
            <div ref={aiTutorAnchorRef}>
              <KangurParentDashboardAiTutorWidget displayMode='active-tab' />
            </div>
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
