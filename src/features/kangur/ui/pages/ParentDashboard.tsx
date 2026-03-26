'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { useKangurDocsTooltips } from '@/features/kangur/docs/tooltips';
import { KangurParentDashboardAiTutorWidget } from '@/features/kangur/ui/components/KangurParentDashboardAiTutorWidget';
import { KangurParentDashboardAssignmentsWidget } from '@/features/kangur/ui/components/KangurParentDashboardAssignmentsWidget';
import { KangurParentDashboardAssignmentsMonitoringWidget } from '@/features/kangur/ui/components/KangurParentDashboardAssignmentsMonitoringWidget';
import { KangurParentDashboardHeroWidget } from '@/features/kangur/ui/components/KangurParentDashboardHeroWidget';
import { KangurParentDashboardProgressWidget } from '@/features/kangur/ui/components/KangurParentDashboardProgressWidget';
import {
  KangurParentDashboardTabsWidget,
  getParentDashboardTabIds,
} from '@/features/kangur/ui/components/KangurParentDashboardTabsWidget';
import { KangurTopNavigationController } from '@/features/kangur/ui/components/KangurTopNavigationController';
import { useKangurAiTutorSessionSync } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurGuestPlayer } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import { useKangurLoginModal } from '@/features/kangur/ui/context/KangurLoginModalContext';
import {
  KangurParentDashboardRuntimeBoundary,
  type KangurParentDashboardTabId,
  useKangurParentDashboardRuntimeShellActions,
  useKangurParentDashboardRuntimeShellState,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import { KangurStandardPageLayout } from '@/features/kangur/ui/components/KangurStandardPageLayout';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';

function ParentDashboardResolvedContent({
  docsTooltipsEnabled,
}: {
  docsTooltipsEnabled: boolean;
}): React.JSX.Element {
  const translations = useTranslations('KangurParentDashboard');
  const {
    activeLearner,
    activeTab,
    basePath,
    canAccessDashboard,
    canManageLearners,
    isAuthenticated,
  } = useKangurParentDashboardRuntimeShellState();
  const { logout } = useKangurParentDashboardRuntimeShellActions();
  const { openLoginModal } = useKangurLoginModal();
  const { guestPlayerName, setGuestPlayerName } = useKangurGuestPlayer();
  const tabPanelsRef = useRef<HTMLDivElement | null>(null);
  const tabPanelsContentRef = useRef<HTMLDivElement | null>(null);
  const guestHeroAnchorRef = useRef<HTMLDivElement | null>(null);
  const heroAnchorRef = useRef<HTMLDivElement | null>(null);
  const learnerManagementAnchorRef = useRef<HTMLDivElement | null>(null);
  const tabsAnchorRef = useRef<HTMLDivElement | null>(null);
  const progressAnchorRef = useRef<HTMLDivElement | null>(null);
  const assignmentsAnchorRef = useRef<HTMLDivElement | null>(null);
  const monitoringAnchorRef = useRef<HTMLDivElement | null>(null);
  const aiTutorAnchorRef = useRef<HTMLDivElement | null>(null);
  const knownTabPanelHeightsRef = useRef<Partial<Record<KangurParentDashboardTabId, number>>>({});
  const pendingScrollSnapshotRef = useRef<number | null>(null);
  const restoreScrollAnimationFrameRef = useRef<number | null>(null);
  const [reservedTabPanelHeight, setReservedTabPanelHeight] = useState<number | null>(null);
  const activeLearnerId = activeLearner?.id?.trim() || null;
  const hasActiveLearner = Boolean(activeLearnerId);
  const isAiTutorTabActive = canAccessDashboard && hasActiveLearner && activeTab === 'ai-tutor';
  const progressTabIds = getParentDashboardTabIds('progress');
  const assignmentsTabIds = getParentDashboardTabIds('assign');
  const monitoringTabIds = getParentDashboardTabIds('monitoring');
  const aiTutorTabIds = getParentDashboardTabIds('ai-tutor');
  const parentTabLabels = useMemo<Record<KangurParentDashboardTabId, string>>(
    () => ({
      progress: translations('page.tabs.progress'),
      assign: translations('page.tabs.assign'),
      monitoring: translations('page.tabs.monitoring'),
      'ai-tutor': translations('page.tabs.aiTutor'),
    }),
    [translations]
  );
  const dashboardContentId = canAccessDashboard
    ? `parent-dashboard:${activeLearnerId ?? 'none'}:${activeTab}`
    : 'parent-dashboard:guest';
  const dashboardTitle = canAccessDashboard
    ? translations('page.dashboardTitle', { tab: parentTabLabels[activeTab] })
    : translations('page.dashboardTitleRestricted');
  const progressPanelContent =
    activeTab === 'progress' ? (
      <KangurParentDashboardProgressWidget displayMode='active-tab' />
    ) : null;
  const assignmentsPanelContent =
    activeTab === 'assign' ? (
      <KangurParentDashboardAssignmentsWidget displayMode='active-tab' />
    ) : null;
  const monitoringPanelContent =
    activeTab === 'monitoring' ? (
      <KangurParentDashboardAssignmentsMonitoringWidget displayMode='active-tab' />
    ) : null;
  const aiTutorPanelContent =
    activeTab === 'ai-tutor' ? (
      <KangurParentDashboardAiTutorWidget displayMode='active-tab' />
    ) : null;

  useKangurAiTutorSessionSync({
    learnerId: isAiTutorTabActive ? activeLearnerId : null,
    sessionContext: isAiTutorTabActive
      ? {
          surface: 'parent_dashboard',
          contentId: dashboardContentId,
          title: dashboardTitle,
          description: canAccessDashboard
            ? translations('page.sessionDescriptionAuthenticated')
            : translations('page.sessionDescriptionRestricted'),
        }
      : null,
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
      label: translations('page.anchors.heroGuest'),
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
      label: translations('page.anchors.hero'),
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
      label: translations('page.anchors.learnerManagement'),
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-parent-dashboard-tabs',
    kind: 'navigation',
    ref: tabsAnchorRef,
    surface: 'parent_dashboard',
    enabled: canAccessDashboard && hasActiveLearner,
    priority: 84,
    metadata: {
      contentId: dashboardContentId,
      label: translations('page.anchors.tabs'),
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-parent-dashboard-progress',
    kind: 'progress',
    ref: progressAnchorRef,
    surface: 'parent_dashboard',
    enabled: canAccessDashboard && hasActiveLearner && activeTab === 'progress',
    priority: 82,
    metadata: {
      contentId: dashboardContentId,
      label: translations('page.anchors.progress'),
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-parent-dashboard-assignments',
    kind: 'assignment',
    ref: assignmentsAnchorRef,
    surface: 'parent_dashboard',
    enabled: canAccessDashboard && hasActiveLearner && activeTab === 'assign',
    priority: 78,
    metadata: {
      contentId: dashboardContentId,
      label: translations('page.anchors.assignments'),
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-parent-dashboard-monitoring',
    kind: 'assignment',
    ref: monitoringAnchorRef,
    surface: 'parent_dashboard',
    enabled: canAccessDashboard && hasActiveLearner && activeTab === 'monitoring',
    priority: 77,
    metadata: {
      contentId: dashboardContentId,
      label: translations('page.anchors.monitoring'),
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-parent-dashboard-ai-tutor',
    kind: 'screen',
    ref: aiTutorAnchorRef,
    surface: 'parent_dashboard',
    enabled: canAccessDashboard && hasActiveLearner && activeTab === 'ai-tutor',
    priority: 76,
    metadata: {
      contentId: dashboardContentId,
      label: translations('page.anchors.aiTutor'),
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
      onGuestPlayerNameChange: isAuthenticated ? undefined : setGuestPlayerName,
      onLogin: openLoginModal,
      onLogout: () => logout(false),
    }),
    [
      basePath,
      canManageLearners,
      guestPlayerName,
      isAuthenticated,
      logout,
      openLoginModal,
      setGuestPlayerName,
    ]
  );

  if (!canAccessDashboard) {
    return (
      <KangurStandardPageLayout
        tone='dashboard'
        id='kangur-parent-dashboard-page'
        shellClassName='justify-center px-4'
        skipLinkTargetId='kangur-parent-dashboard-guest-main'
        docsRootId='kangur-parent-dashboard-page'
        docsTooltipsEnabled={docsTooltipsEnabled}
        containerProps={{
          as: 'section',
          id: 'kangur-parent-dashboard-guest-main',
          className: 'flex w-full flex-1 items-center justify-center py-12',
        }}
      >
        <div
          ref={guestHeroAnchorRef}
          className='w-full max-w-lg'
        >
          <KangurParentDashboardHeroWidget />
        </div>
      </KangurStandardPageLayout>
    );
  }

  return (
    <KangurStandardPageLayout
      tone='dashboard'
      id='kangur-parent-dashboard-page'
      skipLinkTargetId='kangur-parent-dashboard-main'
      docsRootId='kangur-parent-dashboard-page'
      docsTooltipsEnabled={docsTooltipsEnabled}
      navigation={<KangurTopNavigationController navigation={navigation} />}
      containerProps={{
        as: 'section',
        id: 'kangur-parent-dashboard-main',
        className: `w-full max-w-2xl flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`,
      }}
    >
      <div ref={heroAnchorRef}>
        <KangurParentDashboardHeroWidget
          showActions={false}
          showLearnerManagement
          learnerManagementAnchorRef={learnerManagementAnchorRef}
        />
      </div>
      {hasActiveLearner ? (
        <>
          <div ref={tabsAnchorRef}>
            <KangurParentDashboardTabsWidget
              onBeforeTabChange={reservePanelHeightBeforeTabChange}
            />
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
              <div
                ref={progressAnchorRef}
                id={progressTabIds.panelId}
                role='tabpanel'
                aria-labelledby={progressTabIds.tabId}
                hidden={activeTab !== 'progress'}
                tabIndex={activeTab === 'progress' ? 0 : -1}
              >
                {progressPanelContent}
              </div>
              <div
                ref={assignmentsAnchorRef}
                id={assignmentsTabIds.panelId}
                role='tabpanel'
                aria-labelledby={assignmentsTabIds.tabId}
                hidden={activeTab !== 'assign'}
                tabIndex={activeTab === 'assign' ? 0 : -1}
              >
                {assignmentsPanelContent}
              </div>
              <div
                ref={monitoringAnchorRef}
                id={monitoringTabIds.panelId}
                role='tabpanel'
                aria-labelledby={monitoringTabIds.tabId}
                hidden={activeTab !== 'monitoring'}
                tabIndex={activeTab === 'monitoring' ? 0 : -1}
              >
                {monitoringPanelContent}
              </div>
              <div
                ref={aiTutorAnchorRef}
                id={aiTutorTabIds.panelId}
                role='tabpanel'
                aria-labelledby={aiTutorTabIds.tabId}
                hidden={activeTab !== 'ai-tutor'}
                tabIndex={activeTab === 'ai-tutor' ? 0 : -1}
              >
                {aiTutorPanelContent}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </KangurStandardPageLayout>
  );
}

function ParentDashboardAuthLoadingState({
  docsTooltipsEnabled,
}: {
  docsTooltipsEnabled: boolean;
}): React.JSX.Element {
  return (
    <KangurStandardPageLayout
      tone='dashboard'
      id='kangur-parent-dashboard-page'
      shellClassName='justify-center px-4'
      skipLinkTargetId='kangur-parent-dashboard-loading-main'
      docsRootId='kangur-parent-dashboard-page'
      docsTooltipsEnabled={docsTooltipsEnabled}
      containerProps={{
        as: 'section',
        id: 'kangur-parent-dashboard-loading-main',
        className: 'flex w-full flex-1 items-center justify-center py-12',
      }}
    >
      <div
        aria-busy='true'
        aria-live='polite'
        className='w-full max-w-2xl animate-pulse'
        data-testid='parent-dashboard-auth-loading'
        role='status'
      >
        <span className='sr-only'>Ladowanie panelu rodzica</span>
        <div className='rounded-[34px] border border-white/80 bg-white/78 p-6 shadow-[0_28px_64px_-36px_rgba(97,108,162,0.24)] backdrop-blur-xl sm:p-7'>
          <div className='h-3 w-28 rounded-full bg-slate-200/80' />
          <div className='mt-4 h-10 w-3/4 rounded-[22px] bg-slate-200/85' />
          <div className='mt-3 h-4 w-full rounded-full bg-slate-200/70' />
          <div className='mt-2 h-4 w-5/6 rounded-full bg-slate-200/65' />
          <div className='mt-6 grid gap-3 sm:grid-cols-2'>
            <div className='rounded-[24px] border border-white/75 bg-white/70 p-4'>
              <div className='h-3 w-20 rounded-full bg-slate-200/75' />
              <div className='mt-3 h-8 w-24 rounded-full bg-slate-200/85' />
              <div className='mt-3 h-3 w-full rounded-full bg-slate-200/65' />
            </div>
            <div className='rounded-[24px] border border-white/75 bg-white/70 p-4'>
              <div className='h-3 w-24 rounded-full bg-slate-200/75' />
              <div className='mt-3 h-8 w-20 rounded-full bg-slate-200/85' />
              <div className='mt-3 h-3 w-4/5 rounded-full bg-slate-200/65' />
            </div>
          </div>
        </div>
      </div>
    </KangurStandardPageLayout>
  );
}

function ParentDashboardContent(): React.JSX.Element {
  const { hasResolvedAuth = true, isLoadingAuth } = useKangurAuth();
  const { canAccessDashboard, isAuthenticated } = useKangurParentDashboardRuntimeShellState();
  const { enabled: docsTooltipsEnabled } = useKangurDocsTooltips('parentDashboard');

  useKangurRoutePageReady({
    pageKey: 'ParentDashboard',
    ready: true,
  });

  if ((!hasResolvedAuth || isLoadingAuth) && !isAuthenticated && !canAccessDashboard) {
    return <ParentDashboardAuthLoadingState docsTooltipsEnabled={docsTooltipsEnabled} />;
  }

  return <ParentDashboardResolvedContent docsTooltipsEnabled={docsTooltipsEnabled} />;
}

export default function ParentDashboard(): React.JSX.Element {
  return (
    <KangurParentDashboardRuntimeBoundary enabled>
      <ParentDashboardContent />
    </KangurParentDashboardRuntimeBoundary>
  );
}
