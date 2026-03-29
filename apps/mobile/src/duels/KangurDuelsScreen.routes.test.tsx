/**
 * @vitest-environment jsdom
 */

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createDefaultDuelsLobbyMock,
  renderDuelsScreen,
  replaceMock,
  resetDuelsScreenMocks,
  useKangurMobileAuthMock,
  useKangurMobileDuelSessionMock,
  useKangurMobileDuelsLobbyMock,
  useLocalSearchParamsMock,
} from './KangurDuelsScreen.test-support';

describe('KangurDuelsScreen route flows', () => {
  beforeEach(() => {
    resetDuelsScreenMocks();
  });

  it('renders spectator mode for a public duel session route', () => {
    useLocalSearchParamsMock.mockReturnValue({
      sessionId: 'duel-2',
      spectate: '1',
    });
    useKangurMobileAuthMock.mockReturnValue({
      isLoadingAuth: false,
      session: {
        status: 'anonymous',
        user: null,
      },
      signIn: vi.fn(),
      supportsLearnerCredentials: true,
    });
    useKangurMobileDuelSessionMock.mockReturnValue({
      actionError: null,
      currentQuestion: {
        choices: [4, 5, 6],
        id: 'question-1',
        prompt: '2 + 2 = ?',
      },
      error: null,
      isAuthenticated: false,
      isLoading: false,
      isMutating: false,
      isRestoringAuth: false,
      isSpectating: true,
      leaveSession: vi.fn(),
      player: null,
      refresh: vi.fn(),
      sendReaction: vi.fn(),
      session: {
        createdAt: '2026-03-21T08:00:00.000Z',
        currentQuestionIndex: 0,
        difficulty: 'medium',
        endedAt: null,
        id: 'duel-2',
        invitedLearnerId: null,
        invitedLearnerName: null,
        maxPlayers: 2,
        minPlayersToStart: 2,
        mode: 'quick_match',
        operation: 'addition',
        players: [
          {
            displayName: 'Maja',
            learnerId: 'learner-3',
            status: 'playing',
            score: 3,
            bonusPoints: 0,
            currentQuestionIndex: 0,
            joinedAt: '2026-03-21T08:00:00.000Z',
          },
          {
            displayName: 'Leo',
            learnerId: 'learner-4',
            status: 'playing',
            score: 2,
            bonusPoints: 0,
            currentQuestionIndex: 0,
            joinedAt: '2026-03-21T08:00:30.000Z',
          },
        ],
        questionCount: 5,
        questions: [
          {
            choices: [4, 5, 6],
            id: 'question-1',
            prompt: '2 + 2 = ?',
          },
        ],
        recentReactions: [],
        spectatorCount: 3,
        startedAt: '2026-03-21T08:01:00.000Z',
        status: 'in_progress',
        timePerQuestionSec: 15,
        updatedAt: '2026-03-21T08:02:00.000Z',
        visibility: 'public',
      },
      spectatorCount: 3,
      submitAnswer: vi.fn(),
    });

    renderDuelsScreen();

    expect(screen.getByText('Publiczny pojedynek')).toBeTruthy();
    expect(screen.getByText('Tryb obserwatora')).toBeTruthy();
    expect(
      screen.getByText(
        'W trybie obserwatora śledzisz publiczny pojedynek i reakcje bez dołączania jako gracz.'
      )
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Obserwujesz publiczny pojedynek. Zaloguj się, jeśli chcesz wysyłać reakcje.'
      )
    ).toBeTruthy();
    expect(screen.getByText('Widownia 3')).toBeTruthy();
    expect(screen.getByText('Postęp rundy 1/5')).toBeTruthy();
    expect(screen.getByText('Oś sesji')).toBeTruthy();
    expect(screen.getByText(/Rozpoczęto/)).toBeTruthy();
    expect(screen.getByText('Aktualne pytanie')).toBeTruthy();
    expect(screen.getByText('Opcja 1: 4')).toBeTruthy();
    expect(screen.getByText('Odśwież publiczny pojedynek')).toBeTruthy();
  });

  it('renders the public duel loading state for a spectator route', () => {
    useLocalSearchParamsMock.mockReturnValue({
      sessionId: 'duel-loading-1',
      spectate: '1',
    });
    useKangurMobileAuthMock.mockReturnValue({
      isLoadingAuth: false,
      session: {
        status: 'anonymous',
        user: null,
      },
      signIn: vi.fn(),
      supportsLearnerCredentials: true,
    });
    useKangurMobileDuelSessionMock.mockReturnValue({
      actionError: null,
      currentQuestion: null,
      error: null,
      isAuthenticated: false,
      isLoading: true,
      isMutating: false,
      isRestoringAuth: false,
      isSpectating: true,
      leaveSession: vi.fn(),
      player: null,
      refresh: vi.fn(),
      sendReaction: vi.fn(),
      session: null,
      spectatorCount: 0,
      submitAnswer: vi.fn(),
    });

    renderDuelsScreen();

    expect(screen.getByText('Ładujemy publiczny pojedynek')).toBeTruthy();
    expect(
      screen.getByText('Pobieramy publiczny stan rundy, listę graczy i liczbę widzów.')
    ).toBeTruthy();
  });

  it('renders the public duel error state when spectator details are missing', () => {
    useLocalSearchParamsMock.mockReturnValue({
      sessionId: 'duel-missing-1',
      spectate: '1',
    });
    useKangurMobileAuthMock.mockReturnValue({
      isLoadingAuth: false,
      session: {
        status: 'anonymous',
        user: null,
      },
      signIn: vi.fn(),
      supportsLearnerCredentials: true,
    });
    useKangurMobileDuelSessionMock.mockReturnValue({
      actionError: null,
      currentQuestion: null,
      error: null,
      isAuthenticated: false,
      isLoading: false,
      isMutating: false,
      isRestoringAuth: false,
      isSpectating: true,
      leaveSession: vi.fn(),
      player: null,
      refresh: vi.fn(),
      sendReaction: vi.fn(),
      session: null,
      spectatorCount: 0,
      submitAnswer: vi.fn(),
    });

    renderDuelsScreen();

    expect(screen.getByText('Nie udało się otworzyć publicznego pojedynku')).toBeTruthy();
    expect(
      screen.getByText(
        'Brakuje danych publicznego pojedynku. Wróć do lobby i spróbuj jeszcze raz.'
      )
    ).toBeTruthy();
  });

  it('auto-joins an invite route and replaces the route with the active session id', async () => {
    const joinDuelMock = vi.fn().mockResolvedValue('duel-joined-1');

    useLocalSearchParamsMock.mockReturnValue({
      join: 'invite-join-1',
    });
    useKangurMobileDuelsLobbyMock.mockReturnValue({
      ...createDefaultDuelsLobbyMock(),
      joinDuel: joinDuelMock,
    });

    renderDuelsScreen();

    expect(screen.getByText('Dołączanie do zaproszenia')).toBeTruthy();

    await waitFor(() => {
      expect(joinDuelMock).toHaveBeenCalledWith('invite-join-1');
    });
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith({
        pathname: '/duels',
        params: {
          sessionId: 'duel-joined-1',
        },
      });
    });
  });

  it('offers a rematch action after a completed private series duel', async () => {
    const createPrivateChallengeMock = vi.fn().mockResolvedValue('duel-rematch-1');

    useLocalSearchParamsMock.mockReturnValue({
      sessionId: 'duel-complete-1',
    });
    useKangurMobileDuelsLobbyMock.mockReturnValue({
      ...createDefaultDuelsLobbyMock(),
      createPrivateChallenge: createPrivateChallengeMock,
    });
    useKangurMobileDuelSessionMock.mockReturnValue({
      actionError: null,
      currentQuestion: null,
      error: null,
      isAuthenticated: true,
      isLoading: false,
      isMutating: false,
      isRestoringAuth: false,
      isSpectating: false,
      leaveSession: vi.fn(),
      player: {
        displayName: 'Ada',
        learnerId: 'learner-1',
        status: 'completed',
        score: 4,
        bonusPoints: 1,
        currentQuestionIndex: 5,
        joinedAt: '2026-03-21T08:00:00.000Z',
      },
      refresh: vi.fn(),
      sendReaction: vi.fn(),
      session: {
        createdAt: '2026-03-21T08:00:00.000Z',
        currentQuestionIndex: 5,
        difficulty: 'hard',
        endedAt: '2026-03-21T08:10:00.000Z',
        id: 'duel-complete-1',
        invitedLearnerId: 'learner-2',
        invitedLearnerName: 'Leo',
        maxPlayers: 2,
        minPlayersToStart: 2,
        mode: 'challenge',
        operation: 'division',
        players: [
          {
            displayName: 'Ada',
            learnerId: 'learner-1',
            status: 'completed',
            score: 4,
            bonusPoints: 1,
            currentQuestionIndex: 5,
            joinedAt: '2026-03-21T08:00:00.000Z',
          },
          {
            displayName: 'Leo',
            learnerId: 'learner-2',
            status: 'completed',
            score: 3,
            bonusPoints: 0,
            currentQuestionIndex: 5,
            joinedAt: '2026-03-21T08:00:15.000Z',
          },
        ],
        questionCount: 5,
        questions: [],
        recentReactions: [],
        series: {
          bestOf: 5,
          completedGames: 3,
          gameIndex: 4,
          id: 'series-complete-1',
          isComplete: false,
          leaderLearnerId: 'learner-1',
          winsByPlayer: {
            'learner-1': 2,
            'learner-2': 1,
          },
        },
        startedAt: '2026-03-21T08:01:00.000Z',
        status: 'completed',
        timePerQuestionSec: 15,
        updatedAt: '2026-03-21T08:10:00.000Z',
        visibility: 'private',
      },
      spectatorCount: 0,
      submitAnswer: vi.fn(),
    });

    renderDuelsScreen();

    expect(screen.getByText('Podsumowanie')).toBeTruthy();
    expect(
      screen.getByText('Rewanż zachowa ten sam tryb, działanie, poziom i format serii.')
    ).toBeTruthy();
    expect(screen.getAllByText('Wróć do lobby').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('Opuść pojedynek')).toBeNull();
    expect(screen.getByText('Oś sesji')).toBeTruthy();
    expect(screen.getByText(/Rozpoczęto/)).toBeTruthy();
    expect(screen.getByText(/Zakończenie/)).toBeTruthy();

    fireEvent.click(screen.getByText('Zagraj rewanż'));

    await waitFor(() => {
      expect(createPrivateChallengeMock).toHaveBeenCalledWith('learner-2', {
        difficulty: 'hard',
        operation: 'division',
        seriesBestOf: 5,
      });
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
});
