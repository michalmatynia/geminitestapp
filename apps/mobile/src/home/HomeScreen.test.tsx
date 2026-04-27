
/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  loadProgressMock,
  persistedHeroRecentScoresBootSnapshot,
  persistedHeroTrainingFocusBootSnapshot,
  persistedLessonCheckpointBootSnapshot,
  renderHomeScreen,
  replaceMock,
  setupHomeScreenTest,
  shareKangurDuelInviteMock,
  subscribeToProgressMock,
  useHomeScreenBootStateMock,
  useHomeScreenDeferredPanelsMock,
  useKangurMobileAuthMock,
  useKangurMobileHomeAssignmentsMock,
  useKangurMobileHomeBadgesMock,
  useKangurMobileHomeDuelsInvitesMock,
  useKangurMobileHomeDuelsLeaderboardMock,
  useKangurMobileHomeDuelsPresenceMock,
  useKangurMobileHomeDuelsRematchesMock,
  useKangurMobileHomeDuelsSpotlightMock,
  useKangurMobileHomeLessonCheckpointsMock,
  useKangurMobileHomeLessonMasteryMock,
  useKangurMobileRecentResultsMock,
  useKangurMobileRuntimeMock,
  useKangurMobileTrainingFocusMock,
} from './HomeScreen.test-support';

describe('HomeScreen', () => {
  setupHomeScreenTest();

it('shows the parent dashboard link for parent accounts', () => {
  useKangurMobileAuthMock.mockReturnValue({
    authError: null,
    authMode: 'learner-session',
    developerAutoSignInEnabled: false,
    hasAttemptedDeveloperAutoSignIn: false,
    isLoadingAuth: false,
    session: {
      status: 'authenticated',
      user: {
        activeLearner: {
          displayName: 'Maja Uczennica',
          id: 'learner-1',
        },
        actorType: 'parent',
        canManageLearners: true,
        full_name: 'Ada Rodzic',
      },
    },
    signIn: vi.fn(),
    signInWithLearnerCredentials: vi.fn(),
    signOut: vi.fn(),
    supportsLearnerCredentials: true,
  });

  renderHomeScreen();

  expect(screen.getByText('Panel rodzica')).toBeTruthy();
});

it('shows duel standing fallbacks when the learner is not yet visible on home', () => {
  useKangurMobileAuthMock.mockReturnValue({
    authError: null,
    authMode: 'learner-session',
    developerAutoSignInEnabled: false,
    hasAttemptedDeveloperAutoSignIn: false,
    isLoadingAuth: false,
    session: {
      status: 'authenticated',
      user: {
        activeLearner: {
          displayName: 'Ada Learner',
          id: 'leader-2',
        },
        actorType: 'learner',
        full_name: 'Ada Learner',
      },
    },
    signIn: vi.fn(),
    signInWithLearnerCredentials: vi.fn(),
    signOut: vi.fn(),
    supportsLearnerCredentials: true,
  });
  useKangurMobileHomeDuelsPresenceMock.mockReturnValue({
    actionError: null,
    createPrivateChallenge: vi.fn(),
    entries: [
      {
        displayName: 'Iga Lobby',
        lastSeenAt: '2026-03-21T08:10:30.000Z',
        learnerId: 'learner-11',
      },
    ],
    error: null,
    isActionPending: false,
    isAuthenticated: true,
    isLoading: false,
    isRestoringAuth: false,
    pendingLearnerId: null,
    refresh: vi.fn(),
  });
  useKangurMobileHomeDuelsLeaderboardMock.mockReturnValue({
    entries: [
      {
        displayName: 'Maja Sprint',
        lastPlayedAt: '2026-03-21T08:03:00.000Z',
        learnerId: 'leader-1',
        losses: 1,
        matches: 4,
        ties: 0,
        winRate: 0.75,
        wins: 3,
      },
    ],
    error: null,
    isLoading: false,
    refresh: vi.fn(),
  });

  renderHomeScreen();

  expect(screen.getByText('Aktywni rywale w lobby')).toBeTruthy();
  expect(
    screen.getByText(
      'To aktywni rywale z lobby pojedynków. Otwórz lobby pojedynków, aby inni zobaczyli tu również Ciebie.',
    ),
  ).toBeTruthy();
  expect(screen.getByText('Iga Lobby')).toBeTruthy();
  expect(screen.getByText('Wyzwij: Iga Lobby')).toBeTruthy();
  expect(screen.getByText('Ranking pojedynków')).toBeTruthy();
  expect(
    screen.getByText(
      'Twojego konta nie widać jeszcze w tym stanie pojedynków. Rozegraj kolejny pojedynek albo otwórz lobby, aby pojawiła się tutaj Twoja pozycja.',
    ),
  ).toBeTruthy();
  expect(screen.getByText(/#1 Maja Sprint/)).toBeTruthy();
  expect(screen.getByText('Pełny ranking pojedynków')).toBeTruthy();
});

it('shows the empty results hub when an authenticated learner has no synced results yet', () => {
  useKangurMobileAuthMock.mockReturnValue({
    authError: null,
    authMode: 'learner-session',
    developerAutoSignInEnabled: false,
    hasAttemptedDeveloperAutoSignIn: false,
    isLoadingAuth: false,
    session: {
      status: 'authenticated',
      user: {
        activeLearner: {
          displayName: 'Ada Learner',
          id: 'leader-2',
        },
        actorType: 'learner',
        full_name: 'Ada Learner',
      },
    },
    signIn: vi.fn(),
    signInWithLearnerCredentials: vi.fn(),
    signOut: vi.fn(),
    supportsLearnerCredentials: true,
  });
  useKangurMobileTrainingFocusMock.mockReturnValue({
    error: null,
    isEnabled: true,
    isLoading: false,
    isRestoringAuth: false,
    refresh: vi.fn(),
    recentResults: [],
    strongestLessonFocus: null,
    strongestOperation: null,
    weakestLessonFocus: null,
    weakestOperation: null,
  });

  renderHomeScreen();

  expect(screen.getByText('Centrum wyników')).toBeTruthy();
  expect(screen.getByText('Nie ma tu jeszcze wyników.')).toBeTruthy();
});

it('renders authenticated focus cards and recent results after the shell settles', async () => {
  const createPresenceChallengeMock = vi.fn().mockResolvedValue('duel-presence-1');
  const createRematchMock = vi.fn().mockResolvedValue('duel-rematch-1');

  useKangurMobileAuthMock.mockReturnValue({
    authError: null,
    authMode: 'learner-session',
    developerAutoSignInEnabled: false,
    hasAttemptedDeveloperAutoSignIn: false,
    isLoadingAuth: false,
    session: {
      status: 'authenticated',
      user: {
        activeLearner: {
          displayName: 'Ada Learner',
          id: 'leader-2',
        },
        actorType: 'learner',
        full_name: 'Ada Learner',
      },
    },
    signIn: vi.fn(),
    signInWithLearnerCredentials: vi.fn(),
    signOut: vi.fn(),
    supportsLearnerCredentials: true,
  });
  useKangurMobileRecentResultsMock.mockReturnValue({
    error: null,
    isEnabled: true,
    isLoading: false,
    isRestoringAuth: false,
    refresh: vi.fn(),
    results: [
      {
        id: 'score-1',
        operation: 'clock',
        correct_answers: 7,
        total_questions: 8,
      },
    ],
  });
  useKangurMobileHomeDuelsInvitesMock.mockReturnValue({
    error: null,
    invites: [
      {
        createdAt: '2026-03-21T08:00:00.000Z',
        difficulty: 'medium',
        host: {
          bonusPoints: 0,
          currentQuestionIndex: 0,
          displayName: 'Leo Mentor',
          joinedAt: '2026-03-21T08:00:00.000Z',
          learnerId: 'learner-2',
          score: 0,
          status: 'ready',
        },
        mode: 'challenge',
        operation: 'multiplication',
        questionCount: 5,
        series: {
          bestOf: 3,
          completedGames: 1,
          gameIndex: 2,
          id: 'invite-series-1',
          isComplete: false,
          leaderLearnerId: 'learner-2',
          winsByPlayer: {
            'learner-2': 1,
          },
        },
        sessionId: 'invite-1',
        status: 'waiting',
        timePerQuestionSec: 15,
        updatedAt: '2026-03-21T08:05:00.000Z',
        visibility: 'private',
      },
    ],
    isDeferred: false,
    isAuthenticated: true,
    isLoading: false,
    isRestoringAuth: false,
    outgoingChallenges: [
      {
        createdAt: '2026-03-21T08:00:00.000Z',
        difficulty: 'easy',
        host: {
          bonusPoints: 0,
          currentQuestionIndex: 0,
          displayName: 'Ada Learner',
          joinedAt: '2026-03-21T08:00:00.000Z',
          learnerId: 'learner-1',
          score: 0,
          status: 'ready',
        },
        mode: 'challenge',
        operation: 'addition',
        questionCount: 5,
        series: {
          bestOf: 5,
          completedGames: 2,
          gameIndex: 3,
          id: 'outgoing-series-1',
          isComplete: false,
          leaderLearnerId: 'learner-1',
          winsByPlayer: {
            'learner-1': 2,
          },
        },
        sessionId: 'outgoing-home-1',
        status: 'waiting',
        timePerQuestionSec: 15,
        updatedAt: '2026-03-21T08:06:00.000Z',
        visibility: 'private',
      },
    ],
    refresh: vi.fn(),
  });
  useKangurMobileHomeDuelsRematchesMock.mockReturnValue({
    actionError: null,
    createRematch: createRematchMock,
    error: null,
    isActionPending: false,
    isAuthenticated: true,
    isLoading: false,
    isRestoringAuth: false,
    opponents: [
      {
        displayName: 'Nina Turbo',
        lastPlayedAt: '2026-03-21T08:04:00.000Z',
        learnerId: 'learner-8',
      },
    ],
    refresh: vi.fn(),
  });
  useKangurMobileHomeDuelsLeaderboardMock.mockReturnValue({
    entries: [
      {
        displayName: 'Ola',
        lastPlayedAt: '2026-03-21T08:03:00.000Z',
        learnerId: 'leader-1',
        losses: 1,
        matches: 4,
        ties: 0,
        winRate: 0.75,
        wins: 3,
      },
      {
        displayName: 'Ada Learner',
        lastPlayedAt: '2026-03-21T08:01:00.000Z',
        learnerId: 'leader-2',
        losses: 2,
        matches: 5,
        ties: 0,
        winRate: 0.6,
        wins: 3,
      },
    ],
    error: null,
    isLoading: false,
    refresh: vi.fn(),
  });
  useKangurMobileHomeDuelsPresenceMock.mockReturnValue({
    actionError: null,
    createPrivateChallenge: createPresenceChallengeMock,
    entries: [
      {
        displayName: 'Iga Lobby',
        lastSeenAt: '2026-03-21T08:10:30.000Z',
        learnerId: 'learner-11',
      },
      {
        displayName: 'Ada Learner',
        lastSeenAt: '2026-03-21T08:09:30.000Z',
        learnerId: 'leader-2',
      },
    ],
    error: null,
    isActionPending: false,
    isAuthenticated: true,
    isLoading: false,
    isRestoringAuth: false,
    pendingLearnerId: null,
    refresh: vi.fn(),
  });
  useKangurMobileHomeAssignmentsMock.mockReturnValue({
    assignmentItems: [
      {
        assignment: {
          action: {
            label: 'Open lesson',
            page: 'Lessons',
            query: {
              focus: 'adding',
            },
          },
          description:
            'To jeden z najsłabszych obszarów (58%). Potrzebna jest szybka powtórka i kolejna próba.',
          id: 'lesson-retry-adding',
          priority: 'high',
          target: '1 powtórka + wynik min. 75%',
          title: '➕ Powtórka: Dodawanie',
        },
        href: {
          pathname: '/lessons',
          params: {
            focus: 'adding',
          },
        },
      },
      {
        assignment: {
          action: {
            label: 'Practice now',
            page: 'Game',
            query: {
              operation: 'addition',
            },
          },
          description:
            'Po powtórkach uruchom trening celowany, aby od razu sprawdzić najsłabszy obszar w praktyce.',
          id: 'mixed-practice',
          priority: 'medium',
          target: '8 pytań',
          title: 'Trening celowany',
        },
        href: {
          pathname: '/practice',
          params: {
            operation: 'addition',
          },
        },
      },
    ],
  });
  useKangurMobileHomeLessonCheckpointsMock.mockReturnValue({
    recentCheckpoints: [
      {
        attempts: 3,
        bestScorePercent: 72,
        componentId: 'adding',
        emoji: '➕',
        lastCompletedAt: '2026-03-21T08:12:00.000Z',
        lastScorePercent: 70,
        lessonHref: {
          pathname: '/lessons',
          params: {
            focus: 'adding',
          },
        },
        masteryPercent: 68,
        practiceHref: {
          pathname: '/practice',
          params: {
            operation: 'addition',
          },
        },
        title: 'Dodawanie',
      },
      {
        attempts: 5,
        bestScorePercent: 100,
        componentId: 'clock',
        emoji: '🕒',
        lastCompletedAt: '2026-03-21T08:10:00.000Z',
        lastScorePercent: 100,
        lessonHref: {
          pathname: '/lessons',
          params: {
            focus: 'clock',
          },
        },
        masteryPercent: 96,
        practiceHref: {
          pathname: '/practice',
          params: {
            operation: 'clock',
          },
        },
        title: 'Zegar',
      },
    ],
  });
  useKangurMobileHomeBadgesMock.mockReturnValue({
    recentBadges: [
      {
        emoji: '🕐',
        id: 'clock_master',
        name: 'Mistrz zegara',
      },
      {
        emoji: '📚',
        id: 'lesson_hero',
        name: 'Bohater lekcji',
      },
    ],
    remainingBadges: 7,
    totalBadges: 9,
    unlockedBadges: 2,
  });
  useKangurMobileHomeLessonMasteryMock.mockReturnValue({
    lessonsNeedingPractice: 1,
    masteredLessons: 1,
    strongest: [
      {
        attempts: 5,
        bestScorePercent: 100,
        componentId: 'clock',
        emoji: '🕒',
        lastCompletedAt: '2026-03-21T08:06:00.000Z',
        lastScorePercent: 100,
        lessonHref: {
          pathname: '/lessons',
          params: {
            focus: 'clock',
          },
        },
        masteryPercent: 96,
        practiceHref: {
          pathname: '/practice',
          params: {
            operation: 'clock',
          },
        },
        title: 'Zegar',
      },
    ],
    trackedLessons: 2,
    weakest: [
      {
        attempts: 3,
        bestScorePercent: 72,
        componentId: 'adding',
        emoji: '➕',
        lastCompletedAt: '2026-03-21T08:02:00.000Z',
        lastScorePercent: 70,
        lessonHref: {
          pathname: '/lessons',
          params: {
            focus: 'adding',
          },
        },
        masteryPercent: 68,
        practiceHref: {
          pathname: '/practice',
          params: {
            operation: 'addition',
          },
        },
        title: 'Dodawanie',
      },
    ],
  });
  useKangurMobileTrainingFocusMock.mockReturnValue({
    error: null,
    isEnabled: true,
    isLoading: false,
    isRestoringAuth: false,
    recentResults: [
      {
        id: 'score-1',
        operation: 'clock',
        correct_answers: 7,
        total_questions: 8,
      },
    ],
    refresh: vi.fn(),
    strongestLessonFocus: 'clock',
    strongestOperation: {
      averageAccuracyPercent: 94,
      operation: 'clock',
      sessions: 4,
    },
    weakestLessonFocus: 'adding',
    weakestOperation: {
      averageAccuracyPercent: 52,
      operation: 'addition',
      sessions: 3,
    },
  });
  useKangurMobileHomeDuelsSpotlightMock.mockReturnValue({
    entries: [
      {
        createdAt: '2026-03-21T08:00:00.000Z',
        difficulty: 'hard',
        host: {
          bonusPoints: 0,
          currentQuestionIndex: 2,
          displayName: 'Maja Sprint',
          joinedAt: '2026-03-21T08:00:00.000Z',
          learnerId: 'learner-4',
          score: 4,
          status: 'playing',
        },
        mode: 'quick_match',
        operation: 'division',
        questionCount: 6,
        series: {
          bestOf: 3,
          completedGames: 1,
          gameIndex: 2,
          id: 'spotlight-series-1',
          isComplete: false,
          leaderLearnerId: 'learner-4',
          winsByPlayer: {
            'learner-4': 1,
          },
        },
        sessionId: 'public-live-1',
        status: 'in_progress',
        timePerQuestionSec: 12,
        updatedAt: '2026-03-21T08:09:00.000Z',
        visibility: 'public',
      },
    ],
    error: null,
    isLoading: false,
    refresh: vi.fn(),
  });

  renderHomeScreen();

  expect(
    screen.getByText(
      'Witaj ponownie, Ada Learner. Zacznij od fokusu treningowego, wróć do ostatniej lekcji albo od razu otwórz plan dnia.',
    ),
  ).toBeTruthy();
  expect(screen.getByText('Wyniki 1')).toBeTruthy();
  expect(screen.getByText('Ostatni wynik 7/8')).toBeTruthy();
  expect(screen.getByText('Ostatnia lekcja Dodawanie')).toBeTruthy();
  expect(screen.getByText('Fokus treningowy: Dodawanie')).toBeTruthy();
  expect(screen.getByText('Ostatnia lekcja: Dodawanie')).toBeTruthy();
  expect(screen.getByText('Plan dnia teraz')).toBeTruthy();
  expect(screen.getByText('Status: zalogowany')).toBeTruthy();
  expect(screen.getByText('Użytkownik: Ada Learner (uczen)')).toBeTruthy();
  expect(screen.getAllByText('Do powtórki').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('Najmocniejszy tryb')).toBeTruthy();
  expect(screen.getByText('Historia trybu: Dodawanie')).toBeTruthy();
  expect(screen.getAllByText('Historia trybu: Zegar').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('Plan lekcji ze startu')).toBeTruthy();
  expect(screen.getByText('Śledzone 2')).toBeTruthy();
  expect(screen.getByText('Opanowane 1')).toBeTruthy();
  expect(screen.getAllByText('Do powtórki').length).toBeGreaterThanOrEqual(2);
  expect(screen.getByText('Najmocniejsza lekcja')).toBeTruthy();
  expect(screen.getAllByText('➕ Dodawanie').length).toBeGreaterThanOrEqual(2);
  expect(screen.getAllByText('🕒 Zegar').length).toBeGreaterThanOrEqual(2);
  expect(screen.getAllByText('Otwórz lekcję: Dodawanie').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('Trenuj: Dodawanie')).toBeTruthy();
  expect(screen.getByText('Centrum odznak')).toBeTruthy();
  expect(screen.getByText('Odblokowane 2/9')).toBeTruthy();
  expect(screen.getByText('Do zdobycia 7')).toBeTruthy();
  expect(screen.getByText('Ostatnio odblokowane')).toBeTruthy();
  expect(screen.getByText('🕐 Mistrz zegara')).toBeTruthy();
  expect(screen.getByText('📚 Bohater lekcji')).toBeTruthy();
  expect(screen.getByText('Otwórz profil i odznaki')).toBeTruthy();
  expect(screen.getByText('Powrót do ostatnich lekcji')).toBeTruthy();
  expect(screen.getByText('Ostatni wynik 70% • opanowanie 68%')).toBeTruthy();
  expect(screen.getByText('Najlepszy wynik 72% • próby 3')).toBeTruthy();
  expect(screen.getByText('Wróć do lekcji: Dodawanie')).toBeTruthy();
  expect(screen.getByText('Potem trenuj: Dodawanie')).toBeTruthy();
  expect(screen.getByText('Otwórz wszystkie lekcje')).toBeTruthy();
  expect(screen.getByText('Plan z ekranu głównego')).toBeTruthy();
  expect(
    screen.getByText(
      'Zamień postęp i zapisane lekcje bezpośrednio w kolejne kroki.',
    ),
  ).toBeTruthy();
  expect(screen.getByText('➕ Powtórka: Dodawanie')).toBeTruthy();
  expect(screen.getByText('Priorytet wysoki')).toBeTruthy();
  expect(screen.getByText('Cel: 1 powtórka + wynik min. 75%')).toBeTruthy();
  expect(screen.getByText('Trening celowany')).toBeTruthy();
  expect(screen.getByText('Trenuj teraz')).toBeTruthy();
  expect(screen.getByText('Otwórz pełny plan dnia')).toBeTruthy();
  expect(screen.getByText('Centrum wyników')).toBeTruthy();
  expect(
    screen.getByText(
      'Ostatnie wyniki są tutaj pod ręką, aby od razu wrócić do treningu albo pełnej historii.',
    ),
  ).toBeTruthy();
  expect(screen.getByText('7/8 poprawnych')).toBeTruthy();
  expect(screen.getByText('Pojedynki')).toBeTruthy();
  expect(screen.getByText('Zaproszenia do pojedynków')).toBeTruthy();
  expect(screen.getByText('Leo Mentor')).toBeTruthy();
  expect(screen.getByText('Dołącz: Leo Mentor')).toBeTruthy();
  expect(
    screen.getAllByText('Seria BO3 • gra 2 z 3 • ukończone: 1').length,
  ).toBeGreaterThanOrEqual(2);
  expect(screen.getByText('Wysłane wyzwania')).toBeTruthy();
  expect(screen.getByText('Prywatne wyzwanie')).toBeTruthy();
  expect(screen.getByText('Udostępnij link')).toBeTruthy();
  expect(screen.getByText('Seria BO5 • gra 3 z 5 • ukończone: 2')).toBeTruthy();
  expect(screen.getByText('Aktywni rywale w lobby')).toBeTruthy();
  expect(screen.getByText('Iga Lobby')).toBeTruthy();
  expect(screen.getByText('Ada Learner · Ty')).toBeTruthy();
  expect(screen.getByText('Wyzwij: Iga Lobby')).toBeTruthy();
  expect(screen.getByText('Na żywo w pojedynkach')).toBeTruthy();
  expect(screen.getByText('Maja Sprint')).toBeTruthy();
  expect(screen.getByText('Obserwuj na żywo')).toBeTruthy();
  expect(screen.getByText('Ostatni rywale')).toBeTruthy();
  expect(screen.getByText('Nina Turbo')).toBeTruthy();
  expect(screen.getByText('Ranking pojedynków')).toBeTruthy();
  expect(screen.getByText('TWÓJ WYNIK W POJEDYNKACH')).toBeTruthy();
  expect(screen.getByText('#1 Ola')).toBeTruthy();
  expect(screen.getByText('#2 Ada Learner')).toBeTruthy();
  expect(screen.getByText('#2 Ada Learner · Ty')).toBeTruthy();
  expect(screen.getByText('Wygrane 3 • Porażki 1 • Remisy 0')).toBeTruthy();
  expect(screen.getByText('Pełny ranking pojedynków')).toBeTruthy();
  expect(screen.getByText('Otwórz pełną historię')).toBeTruthy();

  fireEvent.click(screen.getByText('Udostępnij link'));

  await waitFor(() => {
    expect(shareKangurDuelInviteMock).toHaveBeenCalledWith({
      sessionId: 'outgoing-home-1',
      sharerDisplayName: 'Ada Learner',
    });
  });

  fireEvent.click(screen.getByText('Wyzwij: Iga Lobby'));

  await waitFor(() => {
    expect(createPresenceChallengeMock).toHaveBeenCalledWith('learner-11');
  });
  await waitFor(() => {
    expect(replaceMock).toHaveBeenCalledWith({
      pathname: '/duels',
      params: {
        sessionId: 'duel-presence-1',
      },
    });
  });

  expect(screen.getByText('Szybki rewanż')).toBeTruthy();

  fireEvent.click(screen.getByText('Szybki rewanż'));

  await waitFor(() => {
    expect(createRematchMock).toHaveBeenCalledWith('learner-8');
  });
  await waitFor(() => {
    expect(replaceMock).toHaveBeenCalledWith({
      pathname: '/duels',
      params: {
        sessionId: 'duel-rematch-1',
      },
    });
  });
});

it('renders German mobile chrome when the locale provider resolves de', () => {
  useKangurMobileAuthMock.mockReturnValue({
    authError: null,
    authMode: 'learner-session',
    developerAutoSignInEnabled: false,
    hasAttemptedDeveloperAutoSignIn: false,
    isLoadingAuth: false,
    session: {
      status: 'anonymous',
      user: null,
    },
    signIn: vi.fn(),
    signInWithLearnerCredentials: vi.fn(),
    signOut: vi.fn(),
    supportsLearnerCredentials: true,
  });
  useKangurMobileTrainingFocusMock.mockReturnValue({
    error: null,
    isEnabled: true,
    isLoading: false,
    isRestoringAuth: false,
    recentResults: [],
    refresh: vi.fn(),
    strongestLessonFocus: null,
    strongestOperation: null,
    weakestLessonFocus: null,
    weakestOperation: null,
  });

  renderHomeScreen('de');

  expect(screen.getByText('Kangur mobil')).toBeTruthy();
  expect(screen.getByText('Ergebnisse 0')).toBeTruthy();
  expect(screen.getByText('Trainingsfokus: Gemischtes Training')).toBeTruthy();
  expect(screen.getByText('Status: anonym')).toBeTruthy();
  expect(screen.getByText('Schuler-Login')).toBeTruthy();
  expect(screen.getByText('Anmelden')).toBeTruthy();
  expect(screen.getByText('Duelleinladungen')).toBeTruthy();
  expect(screen.getByText('Gesendete Herausforderungen')).toBeTruthy();
  expect(screen.getByText('Aktive Rivalen in der Lobby')).toBeTruthy();
  expect(screen.getByText('Live-Duelle')).toBeTruthy();
  expect(screen.getByText('Duell-Rangliste')).toBeTruthy();
  expect(screen.getByText('Lektionsplan zum Start')).toBeTruthy();
  expect(screen.getByText('Abzeichen-Zentrale')).toBeTruthy();
  expect(screen.getByText('Zurück zu den letzten Lektionen')).toBeTruthy();
  expect(screen.getByText('Plan zum Start')).toBeTruthy();
  expect(
    screen.getByText(
      'Verwandle Fortschritt und gespeicherte Lektionen direkt in die nächsten Schritte.',
    ),
  ).toBeTruthy();
  expect(screen.getByText('Ergebniszentrale')).toBeTruthy();
  expect(
    screen.getByText(
      'Wir bereiten die aktualisierte Ergebnisübersicht für den nächsten Startschritt vor.',
    ),
  ).toBeTruthy();
  expect(
    screen.getByText(
      'Die letzten Ergebnisse bleiben hier griffbereit, damit du direkt wieder ins Training oder in den vollständigen Verlauf springen kannst.',
    ),
  ).toBeTruthy();
  expect(
    screen.getByText(
      'Von hier aus kannst du Lektionen, Training, Ergebnisse und Duelle durchsuchen. Nach der Anmeldung siehst du hier auch Ergebnisse und den Tagesplan.',
    ),
  ).toBeTruthy();
});

it('shows the demo CTA when learner credentials are unavailable on home', () => {
  useKangurMobileAuthMock.mockReturnValue({
    authError: null,
    authMode: 'demo',
    developerAutoSignInEnabled: false,
    hasAttemptedDeveloperAutoSignIn: false,
    isLoadingAuth: false,
    session: {
      status: 'anonymous',
      user: null,
    },
    signIn: vi.fn(),
    signInWithLearnerCredentials: vi.fn(),
    signOut: vi.fn(),
    supportsLearnerCredentials: false,
  });

  renderHomeScreen('de');

  expect(screen.getByText('Demo starten')).toBeTruthy();
});

});
