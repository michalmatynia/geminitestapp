/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const runtimeState = vi.hoisted(() => ({
  value: {
    activeLearner: { id: 'learner-1', displayName: 'Ada' },
    activeTab: 'progress' as 'progress' | 'assign' | 'monitoring' | 'ai-tutor',
    basePath: '/kangur',
    canAccessDashboard: true,
    canManageLearners: true,
    isAuthenticated: true,
    logout: vi.fn(),
  },
}));

const topNavigationPropsMock = vi.hoisted(() => vi.fn());
const routeReadyMock = vi.hoisted(() => vi.fn());
const aiTutorSessionSyncMock = vi.hoisted(() => vi.fn());
const tutorAnchorMock = vi.hoisted(() => vi.fn());
const { disabledDocsTooltipsMock, getDisabledDocsTooltipsMock } = vi.hoisted(() => ({
  disabledDocsTooltipsMock: { enabled: false },
  getDisabledDocsTooltipsMock: vi.fn(),
}));

getDisabledDocsTooltipsMock.mockReturnValue(disabledDocsTooltipsMock);
const authState = vi.hoisted(() => ({
  value: {
    hasResolvedAuth: true,
    isLoadingAuth: false,
  },
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      initial: _initial,
      animate: _animate,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      initial?: unknown;
      animate?: unknown;
    }) => <div {...props}>{children}</div>,
  },
}));

vi.mock('next-intl', () => ({
  useTranslations:
    () =>
    (key: string, values?: Record<string, string | number>) =>
      values && 'tab' in values ? `${key}:${values.tab}` : key,
}));

vi.mock('@/features/kangur/docs/tooltips', () => ({
  useKangurDocsTooltips: getDisabledDocsTooltipsMock,
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContext', () => ({
  useKangurAiTutorSessionSync: (props: unknown) => aiTutorSessionSyncMock(props),
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => authState.value,
  useKangurAuthSessionState: () => ({
    user: null,
    isAuthenticated: false,
    hasResolvedAuth: authState.value.hasResolvedAuth,
    canAccessParentAssignments: false,
  }),
  useKangurAuthStatusState: () => ({
    isLoadingAuth: authState.value.isLoadingAuth,
    isLoadingPublicSettings: false,
    isLoggingOut: false,
    authError: null,
    appPublicSettings: null,
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurGuestPlayerContext', () => ({
  useKangurGuestPlayer: () => ({
    guestPlayerName: 'Guest',
    setGuestPlayerName: vi.fn(),
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurLoginModalContext', () => ({
  useKangurLoginModal: () => ({
    openLoginModal: vi.fn(),
  }),
  useKangurLoginModalActions: () => ({
    openLoginModal: vi.fn(),
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurParentDashboardRuntimeContext', () => ({
  KangurParentDashboardRuntimeBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useKangurParentDashboardRuntimeShellActions: () => ({
    logout: runtimeState.value.logout,
  }),
  useKangurParentDashboardRuntimeShellState: () => runtimeState.value,
}));

vi.mock('@/features/kangur/ui/components/KangurStandardPageLayout', () => ({
  KangurStandardPageLayout: ({
    children,
    navigation,
    containerProps,
  }: {
    children: React.ReactNode;
    navigation?: React.ReactNode;
    containerProps?: Record<string, unknown>;
  }) => {
    const { as: _as, ...restContainerProps } = containerProps ?? {};
    return (
      <div data-testid='parent-dashboard-layout'>
        {navigation ?? null}
        <div {...restContainerProps}>{children}</div>
      </div>
    );
  },
}));

vi.mock('@/features/kangur/ui/components/primary-navigation/KangurTopNavigationController', () => ({
  KangurTopNavigationController: ({ navigation }: { navigation: unknown }) => {
    topNavigationPropsMock(navigation);
    return <div data-testid='parent-dashboard-top-navigation' />;
  },
}));

vi.mock('@/features/kangur/ui/hooks/useKangurRoutePageReady', () => ({
  useKangurRoutePageReady: (props: unknown) => routeReadyMock(props),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurTutorAnchor', () => ({
  useKangurTutorAnchor: (props: unknown) => tutorAnchorMock(props),
}));

vi.mock('@/features/kangur/ui/components/parent-dashboard/KangurParentDashboardHeroWidget', () => ({
  KangurParentDashboardHeroWidget: () => <div data-testid='parent-dashboard-hero-widget' />,
}));

vi.mock('@/features/kangur/ui/components/parent-dashboard/KangurParentDashboardTabsWidget', () => ({
  KangurParentDashboardTabsWidget: () => <div data-testid='parent-dashboard-tabs-widget' />,
  getParentDashboardTabIds: (tabId: string) => ({
    tabId: `parent-dashboard-tab-${tabId}`,
    panelId: `parent-dashboard-panel-${tabId}`,
  }),
}));

vi.mock('@/features/kangur/ui/components/parent-dashboard/KangurParentDashboardProgressWidget', () => ({
  KangurParentDashboardProgressWidget: ({ displayMode }: { displayMode?: string }) =>
    displayMode === 'active-tab' && runtimeState.value.activeTab !== 'progress' ? null : (
      <div data-testid='parent-dashboard-progress-widget' />
    ),
}));

vi.mock('@/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAssignmentsWidget', () => ({
  KangurParentDashboardAssignmentsWidget: ({ displayMode }: { displayMode?: string }) =>
    displayMode === 'active-tab' && runtimeState.value.activeTab !== 'assign' ? null : (
      <div data-testid='parent-dashboard-assignments-widget' />
    ),
}));

vi.mock('@/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAssignmentsMonitoringWidget', () => ({
  KangurParentDashboardAssignmentsMonitoringWidget: ({ displayMode }: { displayMode?: string }) =>
    displayMode === 'active-tab' && runtimeState.value.activeTab !== 'monitoring' ? null : (
      <div data-testid='parent-dashboard-monitoring-widget' />
    ),
}));

vi.mock('@/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget', () => ({
  KangurParentDashboardAiTutorWidget: ({ displayMode }: { displayMode?: string }) =>
    displayMode === 'active-tab' && runtimeState.value.activeTab !== 'ai-tutor' ? null : (
      <div data-testid='parent-dashboard-ai-tutor-widget' />
    ),
}));

import ParentDashboard from './ParentDashboard';

describe('ParentDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDisabledDocsTooltipsMock.mockReturnValue(disabledDocsTooltipsMock);
    authState.value = {
      hasResolvedAuth: true,
      isLoadingAuth: false,
    };
    runtimeState.value = {
      activeLearner: { id: 'learner-1', displayName: 'Ada' },
      activeTab: 'progress',
      basePath: '/kangur',
      canAccessDashboard: true,
      canManageLearners: true,
      isAuthenticated: true,
      logout: vi.fn(),
    };
  });

  it('renders the progress tab shell for an authenticated parent with an active learner', () => {
    render(<ParentDashboard />);

    expect(screen.getByTestId('parent-dashboard-layout')).toBeInTheDocument();
    expect(screen.getByTestId('parent-dashboard-top-navigation')).toBeInTheDocument();
    expect(screen.getByTestId('parent-dashboard-hero-widget')).toBeInTheDocument();
    expect(screen.getByTestId('parent-dashboard-tabs-widget')).toBeInTheDocument();
    expect(screen.getByTestId('parent-dashboard-progress-widget')).toBeInTheDocument();
    expect(screen.queryByTestId('parent-dashboard-monitoring-widget')).toBeNull();
    expect(routeReadyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pageKey: 'ParentDashboard',
        ready: true,
      })
    );
    expect(aiTutorSessionSyncMock).toHaveBeenLastCalledWith({
      learnerId: null,
      sessionContext: null,
    });
    expect(topNavigationPropsMock).toHaveBeenCalled();
  });

  it('switches the shell to the monitoring tab when monitoring is active', () => {
    runtimeState.value = {
      ...runtimeState.value,
      activeTab: 'monitoring',
    };

    render(<ParentDashboard />);

    expect(screen.getByTestId('parent-dashboard-monitoring-widget')).toBeInTheDocument();
    expect(screen.queryByTestId('parent-dashboard-progress-widget')).toBeNull();
  });

  it('registers the AI tutor session only when the ai-tutor tab is active', () => {
    runtimeState.value = {
      ...runtimeState.value,
      activeTab: 'ai-tutor',
    };

    render(<ParentDashboard />);

    expect(screen.getByTestId('parent-dashboard-ai-tutor-widget')).toBeInTheDocument();
    expect(aiTutorSessionSyncMock).toHaveBeenLastCalledWith({
      learnerId: 'learner-1',
      sessionContext: {
        contentId: 'parent-dashboard:learner-1:ai-tutor',
        description: 'page.sessionDescriptionAuthenticated',
        surface: 'parent_dashboard',
        title: 'page.dashboardTitle:page.tabs.aiTutor',
      },
    });
  });

  it('renders the restricted guest shell when dashboard access is unavailable', () => {
    runtimeState.value = {
      ...runtimeState.value,
      canAccessDashboard: false,
      activeLearner: null,
    };

    render(<ParentDashboard />);

    expect(screen.getByTestId('parent-dashboard-layout')).toBeInTheDocument();
    expect(screen.getByTestId('parent-dashboard-hero-widget')).toBeInTheDocument();
    expect(screen.queryByTestId('parent-dashboard-tabs-widget')).toBeNull();
    expect(screen.queryByTestId('parent-dashboard-progress-widget')).toBeNull();
    expect(screen.queryByTestId('parent-dashboard-monitoring-widget')).toBeNull();
  });

  it('keeps the guest shell hidden while parent auth is still loading', () => {
    authState.value = {
      hasResolvedAuth: false,
      isLoadingAuth: true,
    };
    runtimeState.value = {
      ...runtimeState.value,
      canAccessDashboard: false,
      activeLearner: null,
      isAuthenticated: false,
    };

    render(<ParentDashboard />);

    expect(screen.getByTestId('parent-dashboard-auth-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('parent-dashboard-hero-widget')).toBeNull();
    expect(screen.queryByTestId('parent-dashboard-tabs-widget')).toBeNull();
  });

  it('keeps the guest shell hidden when auth timed out softly but has not resolved yet', () => {
    authState.value = {
      hasResolvedAuth: false,
      isLoadingAuth: false,
    };
    runtimeState.value = {
      ...runtimeState.value,
      canAccessDashboard: false,
      activeLearner: null,
      isAuthenticated: false,
    };

    render(<ParentDashboard />);

    expect(screen.getByTestId('parent-dashboard-auth-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('parent-dashboard-hero-widget')).toBeNull();
  });
});
