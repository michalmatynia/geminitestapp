/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const {
  useKangurLearnerProfileRuntimeMock,
  useKangurAuthMock,
  pushMock,
  openLoginModalMock,
  logoutMock,
} = vi.hoisted(() => ({
  useKangurLearnerProfileRuntimeMock: vi.fn(),
  useKangurAuthMock: vi.fn(),
  pushMock: vi.fn(),
  openLoginModalMock: vi.fn(),
  logoutMock: vi.fn(),
}));

vi.mock('@/features/kangur/docs/tooltips', () => ({
  KangurDocsTooltipEnhancer: () => null,
  useKangurDocsTooltips: () => ({ enabled: false }),
}));

vi.mock('@/features/kangur/ui/components/KangurLearnerProfileAiTutorMoodWidget', () => ({
  KangurLearnerProfileAiTutorMoodWidget: () => <div data-testid='ai-mood-widget' />,
}));

vi.mock('@/features/kangur/ui/components/KangurLearnerProfileAssignmentsWidget', () => ({
  KangurLearnerProfileAssignmentsWidget: () => <div data-testid='assignments-widget' />,
}));

vi.mock('@/features/kangur/ui/components/KangurLearnerProfileHeroWidget', () => ({
  KangurLearnerProfileHeroWidget: () => <div data-testid='hero-widget' />,
}));

vi.mock('@/features/kangur/ui/components/KangurLearnerProfileLevelProgressWidget', () => ({
  KangurLearnerProfileLevelProgressWidget: () => <div data-testid='level-progress-widget' />,
}));

vi.mock('@/features/kangur/ui/components/KangurLearnerProfileMasteryWidget', () => ({
  KangurLearnerProfileMasteryWidget: () => <div data-testid='mastery-widget' />,
}));

vi.mock('@/features/kangur/ui/components/KangurLearnerProfileOverviewWidget', () => ({
  KangurLearnerProfileOverviewWidget: () => <div data-testid='overview-widget' />,
}));

vi.mock('@/features/kangur/ui/components/KangurLearnerProfilePerformanceWidget', () => ({
  KangurLearnerProfilePerformanceWidget: () => <div data-testid='performance-widget' />,
}));

vi.mock('@/features/kangur/ui/components/KangurLearnerProfileQuestSummaryWidget', () => ({
  KangurLearnerProfileQuestSummaryWidget: () => <div data-testid='quest-summary-widget' />,
}));

vi.mock('@/features/kangur/ui/components/KangurLearnerProfileRecommendationsWidget', () => ({
  KangurLearnerProfileRecommendationsWidget: () => <div data-testid='recommendations-widget' />,
}));

vi.mock('@/features/kangur/ui/components/KangurLearnerProfileSessionsWidget', () => ({
  KangurLearnerProfileSessionsWidget: () => <div data-testid='sessions-widget' />,
}));

vi.mock('@/features/kangur/ui/components/KangurTopNavigationController', () => ({
  KangurTopNavigationController: () => <div data-testid='top-navigation' />,
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContext', () => ({
  useKangurAiTutorSessionSync: () => undefined,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => useKangurAuthMock(),
}));

vi.mock('@/features/kangur/ui/context/KangurLoginModalContext', () => ({
  useKangurLoginModal: () => ({
    openLoginModal: openLoginModalMock,
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext', () => ({
  KangurLearnerProfileRuntimeBoundary: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useKangurLearnerProfileRuntime: useKangurLearnerProfileRuntimeMock,
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: () => ({ basePath: '/pl/kangur' }),
}));

vi.mock('@/features/kangur/ui/design/primitives', () => ({
  KangurButton: ({
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button type='button' onClick={onClick} {...props}>
      {children}
    </button>
  ),
  KangurPageContainer: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) => (
    <div {...props}>{children}</div>
  ),
  KangurPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/features/kangur/ui/design/tokens', () => ({
  KANGUR_PANEL_GAP_CLASSNAME: 'gap-6',
  KANGUR_SEGMENTED_CONTROL_CLASSNAME: 'segmented',
}));

vi.mock('@/features/kangur/ui/hooks/useKangurRouteNavigator', () => ({
  useKangurRouteNavigator: () => ({ push: pushMock }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurRoutePageReady', () => ({
  useKangurRoutePageReady: () => undefined,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurTutorAnchor', () => ({
  useKangurTutorAnchor: () => undefined,
}));

import LearnerProfilePage from '@/features/kangur/ui/pages/LearnerProfile';

describe('LearnerProfile page', () => {
  beforeEach(() => {
    pushMock.mockReset();
    openLoginModalMock.mockReset();
    logoutMock.mockReset();
    useKangurAuthMock.mockReturnValue({
      isAuthenticated: true,
      logout: logoutMock,
      user: {
        activeLearner: { id: 'learner-1' },
        canManageLearners: false,
      },
    });
    useKangurLearnerProfileRuntimeMock.mockReturnValue({
      isLoadingScores: false,
      user: {
        activeLearner: { id: 'learner-1' },
      },
    });
  });

  it('renders translated learner profile headings and tabs', () => {
    render(<LearnerProfilePage />);

    expect(screen.getByText('statsHeading')).toBeInTheDocument();
    expect(screen.getByRole('tablist', { name: 'tabListLabel' })).toBeInTheDocument();
    expect(screen.getByText('tabs.overview')).toBeInTheDocument();
    expect(screen.getByText('tabs.aiMood')).toBeInTheDocument();
  });

  it('routes back to the localized base path when the learner profile fails to load', () => {
    useKangurLearnerProfileRuntimeMock.mockReturnValue({
      isLoadingScores: false,
      user: null,
    });

    render(<LearnerProfilePage />);

    expect(screen.getByText('loadError')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'backToHome' }));

    expect(pushMock).toHaveBeenCalledWith('/pl/kangur');
  });
});
