'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { useKangurDocsTooltips } from '@/features/kangur/docs/tooltips';
import { KangurParentDashboardAiTutorWidget } from '@/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget';
import { KangurParentDashboardAssignmentsWidget } from '@/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAssignmentsWidget';
import { KangurParentDashboardAssignmentsMonitoringWidget } from '@/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAssignmentsMonitoringWidget';
import { KangurParentDashboardHeroWidget } from '@/features/kangur/ui/components/parent-dashboard/KangurParentDashboardHeroWidget';
import { KangurParentDashboardProgressWidget } from '@/features/kangur/ui/components/parent-dashboard/KangurParentDashboardProgressWidget';
import {
  KangurParentDashboardTabsWidget,
  getParentDashboardTabIds,
} from '@/features/kangur/ui/components/parent-dashboard/KangurParentDashboardTabsWidget';
import { KangurTopNavigationController } from '@/features/kangur/ui/components/primary-navigation/KangurTopNavigationController';
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

type ParentDashboardTranslations = ReturnType<typeof useTranslations>;

type ParentDashboardAnchorRefs = {
  aiTutorAnchorRef: React.RefObject<HTMLDivElement | null>;
  assignmentsAnchorRef: React.RefObject<HTMLDivElement | null>;
  guestHeroAnchorRef: React.RefObject<HTMLDivElement | null>;
  heroAnchorRef: React.RefObject<HTMLDivElement | null>;
  learnerManagementAnchorRef: React.RefObject<HTMLDivElement | null>;
  monitoringAnchorRef: React.RefObject<HTMLDivElement | null>;
  progressAnchorRef: React.RefObject<HTMLDivElement | null>;
  tabsAnchorRef: React.RefObject<HTMLDivElement | null>;
};

type ParentDashboardPanelRefs = {
  tabPanelsContentRef: React.RefObject<HTMLDivElement | null>;
  tabPanelsRef: React.RefObject<HTMLDivElement | null>;
};

const resolveParentDashboardActiveLearnerId = (
  activeLearner: { id?: string | null } | null | undefined
): string | null => activeLearner?.id?.trim() || null;

const resolveParentDashboardSessionContentId = ({
  activeLearnerId,
  activeTab,
  canAccessDashboard,
}: {
  activeLearnerId: string | null;
  activeTab: KangurParentDashboardTabId;
  canAccessDashboard: boolean;
}): string =>
  canAccessDashboard ? `parent-dashboard:${activeLearnerId ?? 'none'}:${activeTab}` : 'parent-dashboard:guest';

const resolveParentDashboardSessionTitle = ({
  activeTab,
  canAccessDashboard,
  parentTabLabels,
  translations,
}: {
  activeTab: KangurParentDashboardTabId;
  canAccessDashboard: boolean;
  parentTabLabels: Record<KangurParentDashboardTabId, string>;
  translations: ParentDashboardTranslations;
}): string =>
  canAccessDashboard
    ? translations('page.dashboardTitle', { tab: parentTabLabels[activeTab] })
    : translations('page.dashboardTitleRestricted');

const resolveParentDashboardSessionSyncInput = ({
  activeLearnerId,
  activeTab,
  canAccessDashboard,
  dashboardContentId,
  dashboardTitle,
  hasActiveLearner,
  translations,
}: {
  activeLearnerId: string | null;
  activeTab: KangurParentDashboardTabId;
  canAccessDashboard: boolean;
  dashboardContentId: string;
  dashboardTitle: string;
  hasActiveLearner: boolean;
  translations: ParentDashboardTranslations;
}): Parameters<typeof useKangurAiTutorSessionSync>[0] => {
  const isAiTutorTabActive = canAccessDashboard && hasActiveLearner && activeTab === 'ai-tutor';

  return {
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
  };
};

const createParentDashboardAnchorConfig = ({
  dashboardContentId,
  enabled,
  id,
  kind,
  label,
  priority,
}: {
  dashboardContentId: string;
  enabled: boolean;
  id: string;
  kind: 'assignment' | 'hero' | 'navigation' | 'progress' | 'screen';
  label: string;
  priority: number;
}) => ({
  enabled,
  id,
  kind,
  label,
  metadata: {
    contentId: dashboardContentId,
    label,
  },
  priority,
  surface: 'parent_dashboard' as const,
});

const resolveParentDashboardHasLearnerAccess = ({
  canAccessDashboard,
  hasActiveLearner,
}: {
  canAccessDashboard: boolean;
  hasActiveLearner: boolean;
}): boolean => canAccessDashboard && hasActiveLearner;

const resolveParentDashboardActiveTabAnchorEnabled = ({
  activeTab,
  canAccessDashboard,
  hasActiveLearner,
  tabId,
}: {
  activeTab: KangurParentDashboardTabId;
  canAccessDashboard: boolean;
  hasActiveLearner: boolean;
  tabId: KangurParentDashboardTabId;
}): boolean =>
  resolveParentDashboardHasLearnerAccess({
    canAccessDashboard,
    hasActiveLearner,
  }) && activeTab === tabId;

function useParentDashboardAnchors(input: {
  activeTab: KangurParentDashboardTabId;
  canAccessDashboard: boolean;
  dashboardContentId: string;
  hasActiveLearner: boolean;
  refs: ParentDashboardAnchorRefs;
  translations: ParentDashboardTranslations;
}): void {
  useKangurTutorAnchor({
    ...createParentDashboardAnchorConfig({
      dashboardContentId: input.dashboardContentId,
      enabled: !input.canAccessDashboard,
      id: 'kangur-parent-dashboard-guest-hero',
      kind: 'hero',
      label: input.translations('page.anchors.heroGuest'),
      priority: 90,
    }),
    ref: input.refs.guestHeroAnchorRef,
  });
  useKangurTutorAnchor({
    ...createParentDashboardAnchorConfig({
      dashboardContentId: input.dashboardContentId,
      enabled: input.canAccessDashboard,
      id: 'kangur-parent-dashboard-hero',
      kind: 'hero',
      label: input.translations('page.anchors.hero'),
      priority: 88,
    }),
    ref: input.refs.heroAnchorRef,
  });
  useKangurTutorAnchor({
    ...createParentDashboardAnchorConfig({
      dashboardContentId: input.dashboardContentId,
      enabled: input.canAccessDashboard,
      id: 'kangur-parent-dashboard-learner-management',
      kind: 'screen',
      label: input.translations('page.anchors.learnerManagement'),
      priority: 86,
    }),
    ref: input.refs.learnerManagementAnchorRef,
  });
  useKangurTutorAnchor({
    ...createParentDashboardAnchorConfig({
      dashboardContentId: input.dashboardContentId,
      enabled: resolveParentDashboardHasLearnerAccess({
        canAccessDashboard: input.canAccessDashboard,
        hasActiveLearner: input.hasActiveLearner,
      }),
      id: 'kangur-parent-dashboard-tabs',
      kind: 'navigation',
      label: input.translations('page.anchors.tabs'),
      priority: 84,
    }),
    ref: input.refs.tabsAnchorRef,
  });
  useKangurTutorAnchor({
    ...createParentDashboardAnchorConfig({
      dashboardContentId: input.dashboardContentId,
      enabled: resolveParentDashboardActiveTabAnchorEnabled({
        activeTab: input.activeTab,
        canAccessDashboard: input.canAccessDashboard,
        hasActiveLearner: input.hasActiveLearner,
        tabId: 'progress',
      }),
      id: 'kangur-parent-dashboard-progress',
      kind: 'progress',
      label: input.translations('page.anchors.progress'),
      priority: 82,
    }),
    ref: input.refs.progressAnchorRef,
  });
  useKangurTutorAnchor({
    ...createParentDashboardAnchorConfig({
      dashboardContentId: input.dashboardContentId,
      enabled: resolveParentDashboardActiveTabAnchorEnabled({
        activeTab: input.activeTab,
        canAccessDashboard: input.canAccessDashboard,
        hasActiveLearner: input.hasActiveLearner,
        tabId: 'assign',
      }),
      id: 'kangur-parent-dashboard-assignments',
      kind: 'assignment',
      label: input.translations('page.anchors.assignments'),
      priority: 78,
    }),
    ref: input.refs.assignmentsAnchorRef,
  });
  useKangurTutorAnchor({
    ...createParentDashboardAnchorConfig({
      dashboardContentId: input.dashboardContentId,
      enabled: resolveParentDashboardActiveTabAnchorEnabled({
        activeTab: input.activeTab,
        canAccessDashboard: input.canAccessDashboard,
        hasActiveLearner: input.hasActiveLearner,
        tabId: 'monitoring',
      }),
      id: 'kangur-parent-dashboard-monitoring',
      kind: 'assignment',
      label: input.translations('page.anchors.monitoring'),
      priority: 77,
    }),
    ref: input.refs.monitoringAnchorRef,
  });
  useKangurTutorAnchor({
    ...createParentDashboardAnchorConfig({
      dashboardContentId: input.dashboardContentId,
      enabled: resolveParentDashboardActiveTabAnchorEnabled({
        activeTab: input.activeTab,
        canAccessDashboard: input.canAccessDashboard,
        hasActiveLearner: input.hasActiveLearner,
        tabId: 'ai-tutor',
      }),
      id: 'kangur-parent-dashboard-ai-tutor',
      kind: 'screen',
      label: input.translations('page.anchors.aiTutor'),
      priority: 76,
    }),
    ref: input.refs.aiTutorAnchorRef,
  });
}

const resolveParentDashboardCurrentPanelHeight = ({
  panelRectHeight,
  tabPanelsContentHeight,
}: {
  panelRectHeight: number | null;
  tabPanelsContentHeight: number | null;
}): number => Math.ceil(tabPanelsContentHeight ?? panelRectHeight ?? 0);

const resolveParentDashboardReservedPanelHeight = ({
  currentHeight,
  nextKnownHeight,
  viewportSupportHeight,
}: {
  currentHeight: number;
  nextKnownHeight: number;
  viewportSupportHeight: number;
}): number => Math.max(currentHeight, nextKnownHeight, viewportSupportHeight);

const shouldReleaseParentDashboardPanelReserve = ({
  actualContentHeight,
  reservedTabPanelHeight,
}: {
  actualContentHeight: number;
  reservedTabPanelHeight: number;
}): boolean => reservedTabPanelHeight <= actualContentHeight;

const resolveParentDashboardViewportSupportHeight = (panelRect: DOMRect | null): number =>
  panelRect ? Math.ceil(Math.max(0, window.innerHeight - panelRect.top)) : 0;

const resolveParentDashboardReserveMetrics = ({
  nextTab,
  refs,
  knownTabPanelHeights,
}: {
  nextTab: KangurParentDashboardTabId;
  refs: ParentDashboardPanelRefs;
  knownTabPanelHeights: Partial<Record<KangurParentDashboardTabId, number>>;
}): {
  currentHeight: number;
  nextKnownHeight: number;
  viewportSupportHeight: number;
} => {
  const panelRect = refs.tabPanelsRef.current?.getBoundingClientRect() ?? null;

  return {
    currentHeight: resolveParentDashboardCurrentPanelHeight({
      panelRectHeight: panelRect?.height ?? null,
      tabPanelsContentHeight: refs.tabPanelsContentRef.current?.getBoundingClientRect().height ?? null,
    }),
    nextKnownHeight: knownTabPanelHeights[nextTab] ?? 0,
    viewportSupportHeight: resolveParentDashboardViewportSupportHeight(panelRect),
  };
};

function useParentDashboardPanelReserve(input: {
  activeTab: KangurParentDashboardTabId;
  refs: ParentDashboardPanelRefs;
}): {
  reservePanelHeightBeforeTabChange: (nextTab: KangurParentDashboardTabId) => void;
  reservedTabPanelHeight: number | null;
} {
  const { activeTab, refs } = input;
  const knownTabPanelHeightsRef = useRef<Partial<Record<KangurParentDashboardTabId, number>>>({});
  const pendingScrollSnapshotRef = useRef<number | null>(null);
  const restoreScrollAnimationFrameRef = useRef<number | null>(null);
  const [reservedTabPanelHeight, setReservedTabPanelHeight] = useState<number | null>(null);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const tabPanelsContent = refs.tabPanelsContentRef.current;
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
  }, [activeTab, refs.tabPanelsContentRef]);

  useEffect(() => {
    if (reservedTabPanelHeight === null) {
      return;
    }

    const tabPanelsContent = refs.tabPanelsContentRef.current;
    if (!tabPanelsContent) {
      return;
    }

    const releaseReserveIfSafe = (): void => {
      const actualContentHeight = Math.ceil(tabPanelsContent.getBoundingClientRect().height);
      if (actualContentHeight <= 0) {
        return;
      }

      if (
        shouldReleaseParentDashboardPanelReserve({
          actualContentHeight,
          reservedTabPanelHeight,
        })
      ) {
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
  }, [refs.tabPanelsContentRef, reservedTabPanelHeight]);

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

  const reservePanelHeightBeforeTabChange = useCallback((nextTab: KangurParentDashboardTabId): void => {
    const { currentHeight, nextKnownHeight, viewportSupportHeight } =
      resolveParentDashboardReserveMetrics({
        nextTab,
        refs,
        knownTabPanelHeights: knownTabPanelHeightsRef.current,
      });

    pendingScrollSnapshotRef.current = window.scrollY;
    const reservedHeight = resolveParentDashboardReservedPanelHeight({
      currentHeight,
      nextKnownHeight,
      viewportSupportHeight,
    });

    if (reservedHeight > 0) {
      setReservedTabPanelHeight(reservedHeight);
    }
  }, [refs.tabPanelsContentRef, refs.tabPanelsRef]);

  return {
    reservePanelHeightBeforeTabChange,
    reservedTabPanelHeight,
  };
}

function ParentDashboardTabPanel(props: {
  activeTab: KangurParentDashboardTabId;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
  tabId: KangurParentDashboardTabId;
}): React.JSX.Element {
  const { activeTab, anchorRef, children, tabId } = props;
  const tabIds = getParentDashboardTabIds(tabId);
  const isActive = activeTab === tabId;

  return (
    <div
      ref={anchorRef}
      id={tabIds.panelId}
      role='tabpanel'
      aria-labelledby={tabIds.tabId}
      hidden={!isActive}
      tabIndex={isActive ? 0 : -1}
    >
      {isActive ? children : null}
    </div>
  );
}

function ParentDashboardGuestShell(props: {
  docsTooltipsEnabled: boolean;
  guestHeroAnchorRef: React.RefObject<HTMLDivElement | null>;
}): React.JSX.Element {
  const { docsTooltipsEnabled, guestHeroAnchorRef } = props;

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
      <div ref={guestHeroAnchorRef} className='w-full max-w-lg'>
        <KangurParentDashboardHeroWidget />
      </div>
    </KangurStandardPageLayout>
  );
}

function ParentDashboardActivePanels(props: {
  activeTab: KangurParentDashboardTabId;
  aiTutorAnchorRef: React.RefObject<HTMLDivElement | null>;
  assignmentsAnchorRef: React.RefObject<HTMLDivElement | null>;
  monitoringAnchorRef: React.RefObject<HTMLDivElement | null>;
  progressAnchorRef: React.RefObject<HTMLDivElement | null>;
  tabPanelsContentRef: React.RefObject<HTMLDivElement | null>;
}): React.JSX.Element {
  const {
    activeTab,
    aiTutorAnchorRef,
    assignmentsAnchorRef,
    monitoringAnchorRef,
    progressAnchorRef,
    tabPanelsContentRef,
  } = props;

  return (
    <div ref={tabPanelsContentRef}>
      <ParentDashboardTabPanel activeTab={activeTab} anchorRef={progressAnchorRef} tabId='progress'>
        <KangurParentDashboardProgressWidget displayMode='active-tab' />
      </ParentDashboardTabPanel>
      <ParentDashboardTabPanel activeTab={activeTab} anchorRef={assignmentsAnchorRef} tabId='assign'>
        <KangurParentDashboardAssignmentsWidget displayMode='active-tab' />
      </ParentDashboardTabPanel>
      <ParentDashboardTabPanel
        activeTab={activeTab}
        anchorRef={monitoringAnchorRef}
        tabId='monitoring'
      >
        <KangurParentDashboardAssignmentsMonitoringWidget displayMode='active-tab' />
      </ParentDashboardTabPanel>
      <ParentDashboardTabPanel activeTab={activeTab} anchorRef={aiTutorAnchorRef} tabId='ai-tutor'>
        <KangurParentDashboardAiTutorWidget displayMode='active-tab' />
      </ParentDashboardTabPanel>
    </div>
  );
}

function ParentDashboardAuthenticatedShell(props: {
  aiTutorAnchorRef: React.RefObject<HTMLDivElement | null>;
  assignmentsAnchorRef: React.RefObject<HTMLDivElement | null>;
  docsTooltipsEnabled: boolean;
  hasActiveLearner: boolean;
  heroAnchorRef: React.RefObject<HTMLDivElement | null>;
  learnerManagementAnchorRef: React.RefObject<HTMLDivElement | null>;
  monitoringAnchorRef: React.RefObject<HTMLDivElement | null>;
  navigation: {
    basePath: string;
    canManageLearners: boolean;
    currentPage: 'ParentDashboard';
    guestPlayerName?: string;
    isAuthenticated: boolean;
    onGuestPlayerNameChange?: (value: string) => void;
    onLogin: () => void;
    onLogout: () => void;
  };
  progressAnchorRef: React.RefObject<HTMLDivElement | null>;
  reservePanelHeightBeforeTabChange: (nextTab: KangurParentDashboardTabId) => void;
  reservedTabPanelHeight: number | null;
  tabPanelsContentRef: React.RefObject<HTMLDivElement | null>;
  tabPanelsRef: React.RefObject<HTMLDivElement | null>;
  tabsAnchorRef: React.RefObject<HTMLDivElement | null>;
  activeTab: KangurParentDashboardTabId;
}): React.JSX.Element {
  const {
    activeTab,
    aiTutorAnchorRef,
    assignmentsAnchorRef,
    docsTooltipsEnabled,
    hasActiveLearner,
    heroAnchorRef,
    learnerManagementAnchorRef,
    monitoringAnchorRef,
    navigation,
    progressAnchorRef,
    reservePanelHeightBeforeTabChange,
    reservedTabPanelHeight,
    tabPanelsContentRef,
    tabPanelsRef,
    tabsAnchorRef,
  } = props;

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
            <KangurParentDashboardTabsWidget onBeforeTabChange={reservePanelHeightBeforeTabChange} />
          </div>

          <div
            ref={tabPanelsRef}
            style={reservedTabPanelHeight !== null ? { minHeight: `${reservedTabPanelHeight}px` } : undefined}
          >
            <ParentDashboardActivePanels
              activeTab={activeTab}
              aiTutorAnchorRef={aiTutorAnchorRef}
              assignmentsAnchorRef={assignmentsAnchorRef}
              monitoringAnchorRef={monitoringAnchorRef}
              progressAnchorRef={progressAnchorRef}
              tabPanelsContentRef={tabPanelsContentRef}
            />
          </div>
        </>
      ) : null}
    </KangurStandardPageLayout>
  );
}

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
  const activeLearnerId = resolveParentDashboardActiveLearnerId(activeLearner);
  const hasActiveLearner = Boolean(activeLearnerId);
  const parentTabLabels = useMemo<Record<KangurParentDashboardTabId, string>>(
    () => ({
      progress: translations('page.tabs.progress'),
      assign: translations('page.tabs.assign'),
      monitoring: translations('page.tabs.monitoring'),
      'ai-tutor': translations('page.tabs.aiTutor'),
    }),
    [translations]
  );
  const dashboardContentId = resolveParentDashboardSessionContentId({
    activeLearnerId,
    activeTab,
    canAccessDashboard,
  });
  const dashboardTitle = resolveParentDashboardSessionTitle({
    activeTab,
    canAccessDashboard,
    parentTabLabels,
    translations,
  });
  const { reservePanelHeightBeforeTabChange, reservedTabPanelHeight } =
    useParentDashboardPanelReserve({
      activeTab,
      refs: {
        tabPanelsContentRef,
        tabPanelsRef,
      },
    });

  useKangurAiTutorSessionSync(
    resolveParentDashboardSessionSyncInput({
      activeLearnerId,
      activeTab,
      canAccessDashboard,
      dashboardContentId,
      dashboardTitle,
      hasActiveLearner,
      translations,
    })
  );
  useParentDashboardAnchors({
    activeTab,
    canAccessDashboard,
    dashboardContentId,
    hasActiveLearner,
    refs: {
      aiTutorAnchorRef,
      assignmentsAnchorRef,
      guestHeroAnchorRef,
      heroAnchorRef,
      learnerManagementAnchorRef,
      monitoringAnchorRef,
      progressAnchorRef,
      tabsAnchorRef,
    },
    translations,
  });
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
      <ParentDashboardGuestShell
        docsTooltipsEnabled={docsTooltipsEnabled}
        guestHeroAnchorRef={guestHeroAnchorRef}
      />
    );
  }

  return (
    <ParentDashboardAuthenticatedShell
      activeTab={activeTab}
      aiTutorAnchorRef={aiTutorAnchorRef}
      assignmentsAnchorRef={assignmentsAnchorRef}
      docsTooltipsEnabled={docsTooltipsEnabled}
      hasActiveLearner={hasActiveLearner}
      heroAnchorRef={heroAnchorRef}
      learnerManagementAnchorRef={learnerManagementAnchorRef}
      monitoringAnchorRef={monitoringAnchorRef}
      navigation={navigation}
      progressAnchorRef={progressAnchorRef}
      reservePanelHeightBeforeTabChange={reservePanelHeightBeforeTabChange}
      reservedTabPanelHeight={reservedTabPanelHeight}
      tabPanelsContentRef={tabPanelsContentRef}
      tabPanelsRef={tabPanelsRef}
      tabsAnchorRef={tabsAnchorRef}
    />
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
