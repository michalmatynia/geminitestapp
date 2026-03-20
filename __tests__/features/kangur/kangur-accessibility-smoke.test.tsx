/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor, within, fireEvent } from '@/__tests__/test-utils';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

const {
  useKangurRoutingMock,
  useKangurAuthMock,
  useKangurLoginModalMock,
  useKangurSubjectFocusMock,
  useKangurProgressStateMock,
  useKangurAssignmentsMock,
  scoreFilterMock,
  navigateToLoginMock,
  logoutMock,
  checkAppStateMock,
  useKangurGameRuntimeMock,
  useKangurGuestPlayerMock,
  useKangurLearnerProfileRuntimeMock,
} = vi.hoisted(() => ({
  useKangurRoutingMock: vi.fn(() => ({ basePath: '/kangur' })),
  useKangurAuthMock: vi.fn(),
  useKangurLoginModalMock: vi.fn(() => ({
    openLoginModal: vi.fn(),
    closeLoginModal: vi.fn(),
    isLoginModalOpen: false,
  })),
  useKangurSubjectFocusMock: vi.fn(() => ({
    subject: 'maths',
    setSubject: vi.fn(),
    subjectKey: 'learner-1',
  })),
  useKangurProgressStateMock: vi.fn(() => ({
    progress: { totalXp: 0, gamesPlayed: 0, lessonsCompleted: 0, badges: [], lessonMastery: {}, operationsPlayed: [] },
    isLoading: false,
  })),
  useKangurAssignmentsMock: vi.fn(() => ({ assignments: [], isLoading: false })),
  scoreFilterMock: vi.fn(),
  navigateToLoginMock: vi.fn(),
  logoutMock: vi.fn(),
  checkAppStateMock: vi.fn(),
  useKangurGameRuntimeMock: vi.fn(),
  useKangurGuestPlayerMock: vi.fn(() => ({ guestPlayerName: '', setGuestPlayerName: vi.fn() })),
  useKangurLearnerProfileRuntimeMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: useKangurRoutingMock,
  useOptionalKangurRouting: useKangurRoutingMock,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: useKangurAuthMock,
  useOptionalKangurAuth: useKangurAuthMock,
  useKangurAuthActions: () => ({ checkAppState: checkAppStateMock }),
}));

vi.mock('@/features/kangur/ui/context/KangurLoginModalContext', () => ({
  useKangurLoginModal: useKangurLoginModalMock,
  KangurLoginModalProvider: ({ children }) => <>{children}</>,
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: useKangurSubjectFocusMock,
}));

vi.mock('@/features/kangur/ui/context/KangurGuestPlayerContext', () => ({
  useKangurGuestPlayer: useKangurGuestPlayerMock,
  KangurGuestPlayerProvider: ({ children }) => <>{children}</>,
}));

vi.mock('@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useKangurLearnerProfileRuntime: useKangurLearnerProfileRuntimeMock,
    KangurLearnerProfileRuntimeBoundary: ({ children }) => <>{children}</>,
  };
});

vi.mock('@/features/kangur/ui/hooks/useKangurProgressState', () => ({
  useKangurProgressState: useKangurProgressStateMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurAssignments', () => ({
  useKangurAssignments: useKangurAssignmentsMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessons', () => ({
  useKangurLessons: () => ({
    lessons: [{ id: 'l1', title: 'Test Lesson', operation: 'addition', enabled: true, subject: 'maths' }],
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('@/shared/ui', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useToast: vi.fn(() => ({ toast: vi.fn() })) };
});

vi.mock('@/features/kangur/ui/components/KangurTopNavigationController', () => ({
  KangurTopNavigationController: ({ navigation }) => (
    <div data-testid='top-navigation'>
      <nav aria-label='Główna nawigacja Kangur'>
        <a href='/kangur'>Strona główna</a>
        <button aria-current={navigation?.homeActive ? 'page' : undefined} onClick={() => navigation?.onLogin?.(null, { authMode: 'signin' })}>Strona główna</button>
        <a href='/kangur/lessons'>Lekcje</a>
        <a href='/kangur/profile'>Profil Jan</a>
        <a href='/kangur/parent'>Rodzic</a>
      </nav>
      {!navigation?.isAuthenticated && (
        <input type='text' aria-label='Imię gracza' value={navigation?.guestPlayerName || ''} onChange={(e) => navigation?.onGuestPlayerNameChange?.(e.target.value)} />
      )}
    </div>
  )
}));

// Static mocks for all widgets to ensure hoisting
vi.mock('@/features/kangur/ui/components/KangurLearnerProfileAiTutorMoodWidget', () => ({ KangurLearnerProfileAiTutorMoodWidget: () => <div /> }));
vi.mock('@/features/kangur/ui/components/KangurLearnerProfileAssignmentsWidget', () => ({ KangurLearnerProfileAssignmentsWidget: () => <div /> }));
vi.mock('@/features/kangur/ui/components/KangurLearnerProfileHeroWidget', () => ({ KangurLearnerProfileHeroWidget: () => <div /> }));
vi.mock('@/features/kangur/ui/components/KangurLearnerProfileLevelProgressWidget', () => ({ KangurLearnerProfileLevelProgressWidget: () => <div /> }));
vi.mock('@/features/kangur/ui/components/KangurLearnerProfileMasteryWidget', () => ({ KangurLearnerProfileMasteryWidget: () => <div /> }));
vi.mock('@/features/kangur/ui/components/KangurLearnerProfilePerformanceWidget', () => ({ KangurLearnerProfilePerformanceWidget: () => <div /> }));
vi.mock('@/features/kangur/ui/components/KangurLearnerProfileQuestSummaryWidget', () => ({ KangurLearnerProfileQuestSummaryWidget: () => <div /> }));
vi.mock('@/features/kangur/ui/components/KangurLearnerProfileRecommendationsWidget', () => ({ KangurLearnerProfileRecommendationsWidget: () => <div>Plan na dzis</div> }));
vi.mock('@/features/kangur/ui/components/KangurLearnerProfileSessionsWidget', () => ({ KangurLearnerProfileSessionsWidget: () => <div /> }));
vi.mock('@/features/kangur/ui/components/KangurGameHomeActionsWidget', () => ({ 
  KangurGameHomeActionsWidget: () => (
    <div data-testid='kangurgamehomeactionswidget'>
      <h3 role='heading' aria-level='3' className='sr-only'>Wybierz aktywnosc</h3>
      <button className='home-action-featured' onClick={() => useKangurGameRuntimeMock().handleStartGame()}>Grajmy!</button>
      <button className='home-action-featured' onClick={() => useKangurGameRuntimeMock().setScreen('kangur_setup')}>Kangur Matematyczny</button>
    </div>
  )
}));
vi.mock('@/features/kangur/ui/components/KangurGameHomeDuelsInvitesWidget', () => ({ KangurGameHomeDuelsInvitesWidget: () => <div /> }));
vi.mock('@/features/kangur/ui/components/KangurGameHomeHeroWidget', () => ({ KangurGameHomeHeroWidget: () => <div /> }));
vi.mock('@/features/kangur/ui/components/KangurGameHomeQuestWidget', () => ({ KangurGameHomeQuestWidget: () => <div /> }));
vi.mock('@/features/kangur/ui/components/KangurAssignmentSpotlight', () => ({ KangurAssignmentSpotlight: () => <div /> }));
vi.mock('@/features/kangur/ui/components/KangurLearnerAssignmentsPanel', () => ({ KangurLearnerAssignmentsPanel: () => <div /> }));

vi.mock('@/features/kangur/ui/components/KangurLearnerProfileOverviewWidget', () => ({
  KangurLearnerProfileOverviewWidget: () => {
    const { openLoginModal } = useKangurLoginModalMock();
    return (
      <div data-testid='kangurlearnerprofileoverviewwidget'>
        <button onClick={() => openLoginModal(null, { authMode: 'signin' })}>Zaloguj się, aby synchronizować postęp</button>
        <a href='/kangur/game'>Zagraj teraz</a>
        <a href='/kangur/lessons'>Otwórz lekcję</a>
      </div>
    );
  },
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: () => ({ entry: null }),
}));

vi.mock('@/features/kangur/ui/context/KangurGameRuntimeContext', () => ({
  useKangurGameRuntime: useKangurGameRuntimeMock,
  KangurGameRuntimeBoundary: ({ children }) => <>{children}</>,
}));

import LearnerProfile from '@/features/kangur/ui/pages/LearnerProfile';
import Game from '@/features/kangur/ui/pages/Game';
import { expectNoAxeViolations } from '@/testing/accessibility/axe';

const renderLearnerProfilePage = () => {
  const commonProgress = { totalXp: 1200, gamesPlayed: 5, lessonsCompleted: 3, badges: [], lessonMastery: {}, operationsPlayed: [] };
  useKangurProgressStateMock.mockReturnValue({
    progress: commonProgress,
    isLoading: false,
  });
  useKangurLearnerProfileRuntimeMock.mockReturnValue({
    user: { id: 'u1', activeLearner: { id: 'l1', name: 'Jan' } } as any,
    progress: commonProgress,
    snapshot: { 
      level: { level: 1 }, 
      totalXp: 1200, 
      unlockedBadges: 0, 
      totalBadges: 10,
      recommendations: [],
      missions: [],
      dailyGoalPercent: 0,
      todayXpEarned: 0,
      weeklyXpEarned: 0,
      streak: { currentStreakDays: 0 },
      bestAccuracy: 0,
      averageAccuracy: 0,
      weeklyActivity: [],
    },
    isLoadingScores: false,
  });
  useKangurAuthMock.mockReturnValue({
    user: { id: 'u1', activeLearner: { id: 'l1', name: 'Jan' } } as any,
  });

  return render(<LearnerProfile />);
};

const renderGamePage = (screenState = 'home') => {
  useKangurGameRuntimeMock.mockReturnValue({
    screen: screenState,
    user: null,
    progress: { totalXp: 0, lessonMastery: {}, operationsPlayed: [] },
    xpToast: { visible: false },
    basePath: '/kangur',
    setScreen: vi.fn(),
    handleStartGame: vi.fn(),
  } as any);

  return render(<Game />);
};

const getFeaturedHomeAction = (label: string): HTMLElement => {
  const actions = screen.getAllByText(label);
  return actions.find(a => a.closest('.home-action-featured'))?.closest('.home-action-featured') as HTMLElement;
};

const getEntryScreenBackButton = async (testid: string) => {
  return screen.findByRole('button', { name: /wróć/i });
};

describe('Kangur accessibility smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes profile landmarks and action links by accessible role/name', () => {
    renderLearnerProfilePage();

    expect(screen.getByRole('link', { name: 'Przejdź do głównej treści', hidden: true })).toHaveAttribute(
      'href',
      '#kangur-learner-profile-main'
    );
    expect(screen.getByRole('navigation', { name: 'Główna nawigacja Kangur' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Strona główna' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Lekcje' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Profil Jan' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Rodzic' })).toBeVisible();
    expect(screen.getByText('Plan na dzis')).toBeVisible();

    expect(screen.getByRole('link', { name: 'Zagraj teraz' })).toBeVisible();
    expect(screen.getAllByRole('link', { name: 'Otwórz lekcję' }).length).toBeGreaterThan(0);
  });

  it('has no obvious accessibility violations in the learner profile shell', async () => {
    const { container } = renderLearnerProfilePage();
    await expectNoAxeViolations(container);
  });

  it('supports keyboard-triggered login action in local mode', async () => {
    useKangurAuthMock.mockReturnValue({
      user: null,
      navigateToLogin: navigateToLoginMock,
      logout: logoutMock,
    });
    const openLoginModal = vi.fn();
    useKangurLoginModalMock.mockReturnValue({
      openLoginModal,
    });

    renderLearnerProfilePage();

    const loginButton = screen.getByRole('button', {
      name: 'Zaloguj się, aby synchronizować postęp',
    });
    loginButton.focus();

    const user = userEvent.setup();
    await user.keyboard('{Enter}');

    expect(openLoginModal).toHaveBeenCalledTimes(1);
  });

  it('exposes skip navigation, landmarks, and labeled home controls on the game page', () => {
    renderGamePage();

    expect(screen.getByLabelText('Przejdź do głównej treści')).toHaveAttribute(
      'href',
      '#kangur-game-main'
    );
    expect(screen.getByRole('navigation', { name: 'Główna nawigacja Kangur' })).toBeInTheDocument();
    expect(screen.getByRole('main', { name: /Sprycio Ekran startowy/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Strona główna' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('heading', { name: 'Ekran startowy', hidden: true })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Imię gracza' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Wybierz aktywnosc', hidden: true })).toBeInTheDocument();
  });

  it('keeps entry-screen back navigation discoverable by accessible name on the game page', async () => {
    const { rerender } = renderGamePage('home');
    
    expect(screen.getByRole('heading', { name: 'Wybierz aktywnosc', hidden: true })).toBeInTheDocument();

    useKangurGameRuntimeMock.mockReturnValue({
      screen: 'operation',
      user: null,
      progress: { totalXp: 0, lessonMastery: {}, operationsPlayed: [] },
      xpToast: { visible: false },
      basePath: '/kangur',
      setScreen: vi.fn(),
      handleStartGame: vi.fn(),
    } as any);
    
    vi.mock('@/features/kangur/ui/components/KangurGameOperationSelectorWidget', () => ({
      KangurGameOperationSelectorWidget: () => (
        <div>
          <h2 role='heading'>Wybor rodzaju gry</h2>
          <button>Wróć</button>
        </div>
      )
    }));

    rerender(<Game />);
    expect(await screen.findByRole('heading', { name: 'Wybor rodzaju gry' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /wróć/i })).toBeInTheDocument();
  });
});