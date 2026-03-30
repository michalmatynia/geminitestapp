/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const {
  aiTutorSessionSyncMock,
  disabledDocsTooltipsMock,
  getDisabledDocsTooltipsMock,
  useKangurLearnerProfileRuntimeMock,
  useKangurAuthMock,
  pushMock,
  openLoginModalMock,
  logoutMock,
} = vi.hoisted(() => ({
  aiTutorSessionSyncMock: vi.fn(),
  disabledDocsTooltipsMock: { enabled: false },
  getDisabledDocsTooltipsMock: vi.fn(),
  useKangurLearnerProfileRuntimeMock: vi.fn(),
  useKangurAuthMock: vi.fn(),
  pushMock: vi.fn(),
  openLoginModalMock: vi.fn(),
  logoutMock: vi.fn(),
}));

getDisabledDocsTooltipsMock.mockReturnValue(disabledDocsTooltipsMock);

vi.mock('@/features/kangur/docs/tooltips', () => ({
  KangurDocsTooltipEnhancer: () => null,
  useKangurDocsTooltips: getDisabledDocsTooltipsMock,
}));

vi.mock('@/features/kangur/ui/components/KangurLearnerProfileAiTutorMoodWidget', () => ({
  KangurLearnerProfileAiTutorMoodWidget: () => <div data-testid='ai-mood-widget' />,
}));

vi.mock('@/features/kangur/ui/components/learner-profile/KangurLearnerProfileAssignmentsWidget', () => ({
  KangurLearnerProfileAssignmentsWidget: () => <div data-testid='assignments-widget' />,
}));

vi.mock('@/features/kangur/ui/components/learner-profile/KangurLearnerProfileHeroWidget', () => ({
  KangurLearnerProfileHeroWidget: () => <div data-testid='hero-widget' />,
}));

vi.mock('@/features/kangur/ui/components/learner-profile/KangurLearnerProfileLevelProgressWidget', () => ({
  KangurLearnerProfileLevelProgressWidget: () => <div data-testid='level-progress-widget' />,
}));

vi.mock('@/features/kangur/ui/components/learner-profile/KangurLearnerProfileMasteryWidget', () => ({
  KangurLearnerProfileMasteryWidget: () => <div data-testid='mastery-widget' />,
}));

vi.mock('@/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget', () => ({
  KangurLearnerProfileOverviewWidget: () => <div data-testid='overview-widget' />,
}));

vi.mock('@/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget', () => ({
  KangurLearnerProfilePerformanceWidget: () => <div data-testid='performance-widget' />,
}));

vi.mock('@/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget', () => ({
  KangurLearnerProfileQuestSummaryWidget: () => <div data-testid='quest-summary-widget' />,
}));

vi.mock('@/features/kangur/ui/components/learner-profile/KangurLearnerProfileRecommendationsWidget', () => ({
  KangurLearnerProfileRecommendationsWidget: () => <div data-testid='recommendations-widget' />,
}));

vi.mock('@/features/kangur/ui/components/learner-profile/KangurLearnerProfileResultsWidget', () => ({
  KangurLearnerProfileResultsWidget: () => <div data-testid='results-widget' />,
}));

vi.mock('@/features/kangur/ui/components/learner-profile/KangurLearnerProfileSessionsWidget', () => ({
  KangurLearnerProfileSessionsWidget: () => <div data-testid='sessions-widget' />,
}));

vi.mock('@/features/kangur/ui/components/primary-navigation/KangurTopNavigationController', () => ({
  KangurTopNavigationController: () => <div data-testid='top-navigation' />,
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContext', () => ({
  useKangurAiTutorSessionSync: (props: unknown) => aiTutorSessionSyncMock(props),
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
  KangurButton: React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }
  >(({ children, onClick, ...props }, ref) => (
    <button ref={ref} type='button' onClick={onClick} {...props}>
      {children}
    </button>
  )),
  KangurPageContainer: ({
    children,
    as: _as,
    embeddedOverride: _embeddedOverride,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & {
    as?: React.ElementType;
    children: React.ReactNode;
    embeddedOverride?: boolean;
  }) => (
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
    aiTutorSessionSyncMock.mockReset();
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

    expect(screen.getByText('Statystyki ucznia')).toBeInTheDocument();
    expect(screen.getByRole('tablist', { name: 'Profil ucznia' })).toBeInTheDocument();
    expect(screen.getByText('Profil ucznia')).toBeInTheDocument();
    expect(screen.getByText('Relacja z AI Tutorem')).toBeInTheDocument();
    expect(screen.getByTestId('results-widget')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-mood-widget')).not.toBeInTheDocument();
    expect(aiTutorSessionSyncMock).toHaveBeenLastCalledWith({
      learnerId: null,
      sessionContext: null,
    });
    expect(document.getElementById('learner-profile-root')).toHaveClass('w-full');
    expect(document.getElementById('learner-profile-root')).not.toHaveClass('max-w-[900px]');
  });

  it('keeps the learner profile shell visible while score history is still loading', () => {
    useKangurLearnerProfileRuntimeMock.mockReturnValue({
      isLoadingScores: true,
      user: {
        activeLearner: { id: 'learner-1' },
      },
    });

    render(<LearnerProfilePage />);

    expect(screen.getByText('Statystyki ucznia')).toBeInTheDocument();
    expect(screen.getByRole('tablist', { name: 'Profil ucznia' })).toBeInTheDocument();
    expect(screen.getByTestId('results-widget')).toBeInTheDocument();
    expect(
      screen.queryByRole('progressbar', { hidden: true })
    ).not.toBeInTheDocument();
  });

  it('supports keyboard tab navigation and tabpanel relationships', async () => {
    render(<LearnerProfilePage />);

    const [overviewTab, aiMoodTab] = screen.getAllByRole('tab');

    expect(overviewTab).toHaveAttribute('aria-selected', 'true');
    expect(overviewTab).toHaveAttribute(
      'aria-controls',
      'kangur-learner-profile-panel-overview'
    );
    expect(aiMoodTab).toHaveAttribute(
      'aria-controls',
      'kangur-learner-profile-panel-ai-mood'
    );
    expect(screen.getByRole('tabpanel')).toHaveAttribute(
      'id',
      'kangur-learner-profile-panel-overview'
    );

    overviewTab.focus();
    fireEvent.keyDown(overviewTab, { key: 'ArrowRight' });

    await waitFor(() => {
      expect(aiMoodTab).toHaveFocus();
    });
    expect(aiMoodTab).toHaveAttribute('aria-selected', 'true');
    expect(aiTutorSessionSyncMock).toHaveBeenLastCalledWith({
      learnerId: 'learner-1',
      sessionContext: { surface: 'profile' },
    });
    expect(screen.getByRole('tabpanel')).toHaveAttribute(
      'id',
      'kangur-learner-profile-panel-ai-mood'
    );
    expect(screen.getByTestId('ai-mood-widget')).toBeInTheDocument();
  });

  it('routes back to the localized base path when the learner profile fails to load', () => {
    useKangurLearnerProfileRuntimeMock.mockReturnValue({
      isLoadingScores: false,
      user: null,
    });

    render(<LearnerProfilePage />);

    expect(screen.getByText('Nie udało się załadować profilu.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Wróć do strony głównej' }));

    expect(pushMock).toHaveBeenCalledWith('/pl/kangur');
  });
});
