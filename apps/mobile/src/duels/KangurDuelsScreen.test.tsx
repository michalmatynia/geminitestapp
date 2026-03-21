/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KangurMobileI18nProvider } from '../i18n/kangurMobileI18n';

const {
  useLocalSearchParamsMock,
  useRouterMock,
  replaceMock,
  shareKangurDuelInviteMock,
  useKangurMobileAuthMock,
  useKangurMobileDuelLobbyChatMock,
  useKangurMobileDuelsLobbyMock,
  useKangurMobileDuelSessionMock,
} = vi.hoisted(() => ({
  useLocalSearchParamsMock: vi.fn(),
  useRouterMock: vi.fn(),
  replaceMock: vi.fn(),
  shareKangurDuelInviteMock: vi.fn(),
  useKangurMobileAuthMock: vi.fn(),
  useKangurMobileDuelLobbyChatMock: vi.fn(),
  useKangurMobileDuelsLobbyMock: vi.fn(),
  useKangurMobileDuelSessionMock: vi.fn(),
}));

vi.mock('expo-router', () => ({
  Link: ({ children }: React.PropsWithChildren) => children,
  useLocalSearchParams: useLocalSearchParamsMock,
  useRouter: useRouterMock,
}));

vi.mock('../auth/KangurMobileAuthContext', () => ({
  useKangurMobileAuth: useKangurMobileAuthMock,
}));

vi.mock('./useKangurMobileDuelsLobby', () => ({
  useKangurMobileDuelsLobby: useKangurMobileDuelsLobbyMock,
}));

vi.mock('./useKangurMobileDuelLobbyChat', () => ({
  useKangurMobileDuelLobbyChat: useKangurMobileDuelLobbyChatMock,
}));

vi.mock('./useKangurMobileDuelSession', () => ({
  useKangurMobileDuelSession: useKangurMobileDuelSessionMock,
}));

vi.mock('./duelInviteShare', () => ({
  shareKangurDuelInvite: shareKangurDuelInviteMock,
}));

import { KangurDuelsScreen } from './KangurDuelsScreen';

const renderDuelsScreen = (locale: 'pl' | 'en' | 'de' = 'pl') =>
  render(
    <KangurMobileI18nProvider locale={locale}>
      <KangurDuelsScreen />
    </KangurMobileI18nProvider>,
  );

describe('KangurDuelsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shareKangurDuelInviteMock.mockResolvedValue(undefined);
    useLocalSearchParamsMock.mockReturnValue({});
    useRouterMock.mockReturnValue({
      replace: replaceMock,
    });
    useKangurMobileAuthMock.mockReturnValue({
      isLoadingAuth: false,
      session: {
        status: 'authenticated',
        user: {
          activeLearner: {
            id: 'learner-1',
          },
          id: 'user-1',
        },
      },
      signIn: vi.fn(),
      supportsLearnerCredentials: true,
    });
    useKangurMobileDuelLobbyChatMock.mockReturnValue({
      error: null,
      isAuthenticated: true,
      isLoading: false,
      isRestoringAuth: false,
      isSending: false,
      maxMessageLength: 280,
      messages: [],
      refresh: vi.fn(),
      sendMessage: vi.fn(),
    });
    useKangurMobileDuelsLobbyMock.mockReturnValue({
      actionError: null,
      createPrivateChallenge: vi.fn(),
      createPublicChallenge: vi.fn(),
      createQuickMatch: vi.fn(),
      difficulty: 'easy',
      inviteEntries: [],
      isActionPending: false,
      isAuthenticated: true,
      isLoadingAuth: false,
      isLobbyLoading: false,
      isOpponentsLoading: false,
      isPresenceLoading: false,
      isRestoringAuth: false,
      isSearchLoading: false,
      joinDuel: vi.fn(),
      leaderboardEntries: [],
      leaderboardError: null,
      lobbyError: null,
      modeFilter: 'all',
      operation: 'addition',
      opponents: [],
      presenceEntries: [],
      presenceError: null,
      publicEntries: [],
      refresh: vi.fn(),
      searchError: null,
      searchQuery: '',
      searchResults: [],
      searchSubmittedQuery: '',
      seriesBestOf: 1,
      setDifficulty: vi.fn(),
      setModeFilter: vi.fn(),
      setOperation: vi.fn(),
      setSeriesBestOf: vi.fn(),
      setSearchQuery: vi.fn(),
      submitSearch: vi.fn(),
      clearSearch: vi.fn(),
      visiblePublicEntries: [],
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
      player: null,
      refresh: vi.fn(),
      sendReaction: vi.fn(),
      session: null,
      spectatorCount: 0,
      submitAnswer: vi.fn(),
    });
  });

  it('renders the duels lobby shell with play actions and leaderboard data', () => {
    useKangurMobileDuelsLobbyMock.mockReturnValue({
      actionError: null,
      createPrivateChallenge: vi.fn(),
      createPublicChallenge: vi.fn(),
      createQuickMatch: vi.fn(),
      difficulty: 'easy',
      inviteEntries: [
        {
          createdAt: '2026-03-21T08:00:00.000Z',
          difficulty: 'easy',
          host: {
            displayName: 'Ada Mentor',
            learnerId: 'learner-1',
            status: 'ready',
            score: 0,
            bonusPoints: 0,
            currentQuestionIndex: 0,
            joinedAt: '2026-03-21T08:00:00.000Z',
          },
          mode: 'challenge',
          operation: 'addition',
          questionCount: 5,
          sessionId: 'invite-1',
          status: 'waiting',
          timePerQuestionSec: 15,
          updatedAt: '2026-03-21T08:02:00.000Z',
          visibility: 'private',
        },
      ],
      isActionPending: false,
      isAuthenticated: true,
      isLoadingAuth: false,
      isLobbyLoading: false,
      isOpponentsLoading: false,
      isPresenceLoading: false,
      isRestoringAuth: false,
      isSearchLoading: false,
      joinDuel: vi.fn(),
      leaderboardEntries: [
        {
          displayName: 'Ola',
          lastPlayedAt: '2026-03-21T08:10:00.000Z',
          learnerId: 'leader-1',
          losses: 1,
          matches: 4,
          ties: 0,
          winRate: 0.75,
          wins: 3,
        },
      ],
      leaderboardError: null,
      lobbyError: null,
      modeFilter: 'all',
      operation: 'addition',
      opponents: [],
      presenceEntries: [
        {
          displayName: 'Jan Mistrz',
          lastSeenAt: '2026-03-21T08:15:00.000Z',
          learnerId: 'presence-1',
        },
      ],
      presenceError: null,
      publicEntries: [
        {
          createdAt: '2026-03-21T08:00:00.000Z',
          difficulty: 'medium',
          host: {
            displayName: 'Leo',
            learnerId: 'learner-2',
            status: 'ready',
            score: 0,
            bonusPoints: 0,
            currentQuestionIndex: 0,
            joinedAt: '2026-03-21T08:00:00.000Z',
          },
          mode: 'quick_match',
          operation: 'multiplication',
          questionCount: 5,
          series: {
            bestOf: 3,
            completedGames: 1,
            gameIndex: 2,
            id: 'series-1',
            isComplete: false,
            leaderLearnerId: 'learner-2',
            winsByPlayer: {
              'learner-2': 1,
            },
          },
          sessionId: 'public-1',
          status: 'waiting',
          timePerQuestionSec: 15,
          updatedAt: '2026-03-21T08:03:00.000Z',
          visibility: 'public',
        },
      ],
      refresh: vi.fn(),
      searchError: null,
      searchQuery: 'ola',
      searchResults: [
        {
          displayName: 'Ola Quiz',
          learnerId: 'search-1',
          loginName: 'ola.quiz',
        },
      ],
      searchSubmittedQuery: 'ola',
      seriesBestOf: 3,
      setDifficulty: vi.fn(),
      setModeFilter: vi.fn(),
      setOperation: vi.fn(),
      setSeriesBestOf: vi.fn(),
      setSearchQuery: vi.fn(),
      submitSearch: vi.fn(),
      clearSearch: vi.fn(),
      visiblePublicEntries: [
        {
          createdAt: '2026-03-21T08:00:00.000Z',
          difficulty: 'medium',
          host: {
            displayName: 'Leo',
            learnerId: 'learner-2',
            status: 'ready',
            score: 0,
            bonusPoints: 0,
            currentQuestionIndex: 0,
            joinedAt: '2026-03-21T08:00:00.000Z',
          },
          mode: 'quick_match',
          operation: 'multiplication',
          questionCount: 5,
          series: {
            bestOf: 3,
            completedGames: 1,
            gameIndex: 2,
            id: 'series-1',
            isComplete: false,
            leaderLearnerId: 'learner-2',
            winsByPlayer: {
              'learner-2': 1,
            },
          },
          sessionId: 'public-1',
          status: 'waiting',
          timePerQuestionSec: 15,
          updatedAt: '2026-03-21T08:03:00.000Z',
          visibility: 'public',
        },
      ],
    });
    useKangurMobileDuelLobbyChatMock.mockReturnValue({
      error: null,
      isAuthenticated: true,
      isLoading: false,
      isRestoringAuth: false,
      isSending: false,
      maxMessageLength: 280,
      messages: [
        {
          createdAt: '2026-03-21T08:12:00.000Z',
          id: 'chat-1',
          lobbyId: 'duels_lobby',
          message: 'Szukam meczu z mnozeniem.',
          senderAvatarId: null,
          senderId: 'learner-3',
          senderName: 'Maja Sprint',
        },
      ],
      refresh: vi.fn(),
      sendMessage: vi.fn(),
    });

    renderDuelsScreen();

    expect(screen.getByText('Pojedynki')).toBeTruthy();
    expect(screen.getByText('Panel gry')).toBeTruthy();
    expect(screen.getAllByText('Szybki mecz').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Publiczne wyzwanie')).toBeTruthy();
    expect(screen.getByText('Format')).toBeTruthy();
    expect(screen.getByText('Nowe wyzwania utworzą Seria BO3.')).toBeTruthy();
    expect(screen.getByText('Zaproszenia')).toBeTruthy();
    expect(screen.getByText('Ada Mentor')).toBeTruthy();
    expect(screen.getByText('Aktywni uczniowie')).toBeTruthy();
    expect(screen.getByText('Jan Mistrz')).toBeTruthy();
    expect(screen.getByText('Czat lobby')).toBeTruthy();
    expect(screen.getByText('Maja Sprint')).toBeTruthy();
    expect(screen.getByText('Szukam meczu z mnozeniem.')).toBeTruthy();
    expect(screen.getAllByText('Seria BO3').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Gra 2 z 3 · ukończone gry: 1')).toBeTruthy();
    expect(screen.getByText('Obserwuj pojedynek')).toBeTruthy();
    expect(screen.getByText('Wyniki dueli')).toBeTruthy();
    expect(screen.getByText('#1 Ola')).toBeTruthy();
    expect(screen.getByText('Ola Quiz')).toBeTruthy();
  });

  it('renders German lobby chrome when the locale provider resolves de', () => {
    useKangurMobileDuelsLobbyMock.mockReturnValue({
      actionError: null,
      createPrivateChallenge: vi.fn(),
      createPublicChallenge: vi.fn(),
      createQuickMatch: vi.fn(),
      difficulty: 'easy',
      inviteEntries: [
        {
          createdAt: '2026-03-21T08:00:00.000Z',
          difficulty: 'easy',
          host: {
            displayName: 'Ada Mentor',
            learnerId: 'learner-1',
            status: 'ready',
            score: 0,
            bonusPoints: 0,
            currentQuestionIndex: 0,
            joinedAt: '2026-03-21T08:00:00.000Z',
          },
          mode: 'challenge',
          operation: 'addition',
          questionCount: 5,
          sessionId: 'invite-1',
          status: 'waiting',
          timePerQuestionSec: 15,
          updatedAt: '2026-03-21T08:02:00.000Z',
          visibility: 'private',
        },
      ],
      isActionPending: false,
      isAuthenticated: true,
      isLoadingAuth: false,
      isLobbyLoading: false,
      isOpponentsLoading: false,
      isPresenceLoading: false,
      isRestoringAuth: false,
      isSearchLoading: false,
      joinDuel: vi.fn(),
      leaderboardEntries: [
        {
          displayName: 'Ola',
          lastPlayedAt: '2026-03-21T08:10:00.000Z',
          learnerId: 'leader-1',
          losses: 1,
          matches: 4,
          ties: 0,
          winRate: 0.75,
          wins: 3,
        },
      ],
      leaderboardError: null,
      lobbyError: null,
      modeFilter: 'all',
      operation: 'addition',
      opponents: [],
      presenceEntries: [],
      presenceError: null,
      publicEntries: [],
      refresh: vi.fn(),
      searchError: null,
      searchQuery: '',
      searchResults: [],
      searchSubmittedQuery: '',
      seriesBestOf: 3,
      setDifficulty: vi.fn(),
      setModeFilter: vi.fn(),
      setOperation: vi.fn(),
      setSeriesBestOf: vi.fn(),
      setSearchQuery: vi.fn(),
      submitSearch: vi.fn(),
      clearSearch: vi.fn(),
      visiblePublicEntries: [
        {
          createdAt: '2026-03-21T08:00:00.000Z',
          difficulty: 'medium',
          host: {
            displayName: 'Leo',
            learnerId: 'learner-2',
            status: 'ready',
            score: 0,
            bonusPoints: 0,
            currentQuestionIndex: 0,
            joinedAt: '2026-03-21T08:00:00.000Z',
          },
          mode: 'quick_match',
          operation: 'multiplication',
          questionCount: 5,
          series: {
            bestOf: 3,
            completedGames: 1,
            gameIndex: 2,
            id: 'series-1',
            isComplete: false,
            leaderLearnerId: 'learner-2',
            winsByPlayer: {
              'learner-2': 1,
            },
          },
          sessionId: 'public-1',
          status: 'waiting',
          timePerQuestionSec: 15,
          updatedAt: '2026-03-21T08:03:00.000Z',
          visibility: 'public',
        },
      ],
    });

    renderDuelsScreen('de');

    expect(screen.getByText('Duelle')).toBeTruthy();
    expect(screen.getByText('Spielbereich')).toBeTruthy();
    expect(screen.getAllByText('Schnelles Match').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Öffentliche Herausforderung')).toBeTruthy();
    expect(screen.getByText('Einladungen')).toBeTruthy();
    expect(screen.getByText('Lobby-Chat')).toBeTruthy();
    expect(screen.getByText('Duellrangliste')).toBeTruthy();
    expect(screen.getAllByText('BO3-Serie').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Spiel 2 von 3 · abgeschlossene Spiele: 1')).toBeTruthy();
    expect(screen.getByText('Duell beobachten')).toBeTruthy();
  });

  it('renders the waiting-room session shell for an active duel route', () => {
    useLocalSearchParamsMock.mockReturnValue({
      sessionId: 'duel-1',
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
        status: 'ready',
        score: 0,
        bonusPoints: 0,
        currentQuestionIndex: 0,
        joinedAt: '2026-03-21T08:00:00.000Z',
      },
      refresh: vi.fn(),
      session: {
        createdAt: '2026-03-21T08:00:00.000Z',
        currentQuestionIndex: 0,
        difficulty: 'easy',
        endedAt: null,
        id: 'duel-1',
        invitedLearnerId: null,
        invitedLearnerName: null,
        maxPlayers: 2,
        minPlayersToStart: 2,
        mode: 'challenge',
        operation: 'addition',
        players: [
          {
            displayName: 'Ada',
            learnerId: 'learner-1',
            status: 'ready',
            score: 0,
            bonusPoints: 0,
            currentQuestionIndex: 0,
            joinedAt: '2026-03-21T08:00:00.000Z',
          },
          {
            displayName: 'Bob',
            learnerId: 'learner-2',
            status: 'ready',
            score: 0,
            bonusPoints: 0,
            currentQuestionIndex: 0,
            joinedAt: '2026-03-21T08:01:00.000Z',
          },
        ],
        questionCount: 5,
        questions: [],
        recentReactions: [
          {
            createdAt: '2026-03-21T08:01:30.000Z',
            displayName: 'Bob',
            id: 'reaction-1',
            learnerId: 'learner-2',
            type: 'cheer',
          },
        ],
        series: {
          bestOf: 3,
          completedGames: 1,
          gameIndex: 2,
          id: 'series-ada-bob',
          isComplete: false,
          leaderLearnerId: 'learner-1',
          winsByPlayer: {
            'learner-1': 1,
            'learner-2': 0,
          },
        },
        startedAt: null,
        status: 'waiting',
        timePerQuestionSec: 15,
        updatedAt: '2026-03-21T08:02:00.000Z',
        visibility: 'private',
      },
      sendReaction: vi.fn(),
      spectatorCount: 1,
      submitAnswer: vi.fn(),
    });

    renderDuelsScreen();

    expect(screen.getByText('Pojedynek')).toBeTruthy();
    expect(screen.getByText('Sesja duel-1')).toBeTruthy();
    expect(screen.getByText('Poczekalnia pojedynku')).toBeTruthy();
    expect(screen.getByText('Ada')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.getAllByText('Seria BO3').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Gra 2 z 3')).toBeTruthy();
    expect(screen.getByText('Prowadzi Ada 1:0.')).toBeTruthy();
    expect(screen.getByText('Wygrane gry w serii: 1')).toBeTruthy();
    expect(screen.getByText('Wygrane gry w serii: 0')).toBeTruthy();
    expect(screen.getByText('Reakcje')).toBeTruthy();
    expect(screen.getByText('Wyślij szybką reakcję bez opuszczania pojedynku.')).toBeTruthy();
    expect(screen.getByText('Minimalna liczba graczy do startu: 2')).toBeTruthy();
    expect(screen.getByText('Opuść pojedynek')).toBeTruthy();
  });

  it('shares a private waiting-room invite link for the missing player', async () => {
    useLocalSearchParamsMock.mockReturnValue({
      sessionId: 'duel-share-1',
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
        status: 'ready',
        score: 0,
        bonusPoints: 0,
        currentQuestionIndex: 0,
        joinedAt: '2026-03-21T08:00:00.000Z',
      },
      refresh: vi.fn(),
      sendReaction: vi.fn(),
      session: {
        createdAt: '2026-03-21T08:00:00.000Z',
        currentQuestionIndex: 0,
        difficulty: 'easy',
        endedAt: null,
        id: 'duel-share-1',
        invitedLearnerId: 'learner-2',
        invitedLearnerName: 'Bob',
        maxPlayers: 2,
        minPlayersToStart: 2,
        mode: 'challenge',
        operation: 'addition',
        players: [
          {
            displayName: 'Ada',
            learnerId: 'learner-1',
            status: 'ready',
            score: 0,
            bonusPoints: 0,
            currentQuestionIndex: 0,
            joinedAt: '2026-03-21T08:00:00.000Z',
          },
        ],
        questionCount: 5,
        questions: [],
        recentReactions: [],
        startedAt: null,
        status: 'waiting',
        timePerQuestionSec: 15,
        updatedAt: '2026-03-21T08:02:00.000Z',
        visibility: 'private',
      },
      spectatorCount: 0,
      submitAnswer: vi.fn(),
    });

    renderDuelsScreen();

    expect(screen.getByText('Udostępnij zaproszenie')).toBeTruthy();
    expect(
      screen.getByText(
        'Wyślij bezpośredni link do Bob, aby otworzyć prywatny pojedynek na telefonie bez szukania go w lobby.',
      ),
    ).toBeTruthy();

    fireEvent.click(screen.getByText('Udostępnij link zaproszenia'));

    await waitFor(() => {
      expect(shareKangurDuelInviteMock).toHaveBeenCalledWith({
        locale: 'pl',
        sessionId: 'duel-share-1',
        sharerDisplayName: 'Ada',
      });
    });
  });

  it('shows a share error when invite-link sharing fails', async () => {
    shareKangurDuelInviteMock.mockRejectedValueOnce(
      new Error('System share sheet unavailable.'),
    );

    useLocalSearchParamsMock.mockReturnValue({
      sessionId: 'duel-share-error-1',
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
        status: 'ready',
        score: 0,
        bonusPoints: 0,
        currentQuestionIndex: 0,
        joinedAt: '2026-03-21T08:00:00.000Z',
      },
      refresh: vi.fn(),
      sendReaction: vi.fn(),
      session: {
        createdAt: '2026-03-21T08:00:00.000Z',
        currentQuestionIndex: 0,
        difficulty: 'easy',
        endedAt: null,
        id: 'duel-share-error-1',
        invitedLearnerId: 'learner-2',
        invitedLearnerName: 'Bob',
        maxPlayers: 2,
        minPlayersToStart: 2,
        mode: 'challenge',
        operation: 'addition',
        players: [
          {
            displayName: 'Ada',
            learnerId: 'learner-1',
            status: 'ready',
            score: 0,
            bonusPoints: 0,
            currentQuestionIndex: 0,
            joinedAt: '2026-03-21T08:00:00.000Z',
          },
        ],
        questionCount: 5,
        questions: [],
        recentReactions: [],
        startedAt: null,
        status: 'waiting',
        timePerQuestionSec: 15,
        updatedAt: '2026-03-21T08:02:00.000Z',
        visibility: 'private',
      },
      spectatorCount: 0,
      submitAnswer: vi.fn(),
    });

    renderDuelsScreen();

    fireEvent.click(screen.getByText('Udostępnij link zaproszenia'));

    await waitFor(() => {
      expect(
        screen.getByText('Nie udało się udostępnić zaproszenia'),
      ).toBeTruthy();
    });
    expect(screen.getByText('System share sheet unavailable.')).toBeTruthy();
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

    expect(screen.getByText('Podgląd pojedynku')).toBeTruthy();
    expect(screen.getByText('Tryb obserwatora')).toBeTruthy();
    expect(
      screen.getByText(
        'Obserwujesz publiczny stan pojedynku. Zaloguj sesję ucznia, jeśli chcesz wysyłać reakcje.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Widownia 3')).toBeTruthy();
    expect(screen.getByText('Podgląd pytania')).toBeTruthy();
    expect(screen.getByText('Opcja 1: 4')).toBeTruthy();
    expect(screen.getByText('Odśwież podgląd pojedynku')).toBeTruthy();
  });

  it('auto-joins an invite route and replaces the route with the active session id', async () => {
    const joinDuelMock = vi.fn().mockResolvedValue('duel-joined-1');

    useLocalSearchParamsMock.mockReturnValue({
      join: 'invite-join-1',
    });
    useKangurMobileDuelsLobbyMock.mockReturnValue({
      actionError: null,
      createPrivateChallenge: vi.fn(),
      createPublicChallenge: vi.fn(),
      createQuickMatch: vi.fn(),
      difficulty: 'easy',
      inviteEntries: [],
      isActionPending: false,
      isAuthenticated: true,
      isLoadingAuth: false,
      isLobbyLoading: false,
      isOpponentsLoading: false,
      isPresenceLoading: false,
      isRestoringAuth: false,
      isSearchLoading: false,
      joinDuel: joinDuelMock,
      leaderboardEntries: [],
      leaderboardError: null,
      lobbyError: null,
      modeFilter: 'all',
      operation: 'addition',
      opponents: [],
      presenceEntries: [],
      presenceError: null,
      publicEntries: [],
      refresh: vi.fn(),
      searchError: null,
      searchQuery: '',
      searchResults: [],
      searchSubmittedQuery: '',
      seriesBestOf: 1,
      setDifficulty: vi.fn(),
      setModeFilter: vi.fn(),
      setOperation: vi.fn(),
      setSeriesBestOf: vi.fn(),
      setSearchQuery: vi.fn(),
      submitSearch: vi.fn(),
      clearSearch: vi.fn(),
      visiblePublicEntries: [],
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
    const createPrivateChallengeMock = vi
      .fn()
      .mockResolvedValue('duel-rematch-1');

    useLocalSearchParamsMock.mockReturnValue({
      sessionId: 'duel-complete-1',
    });
    useKangurMobileDuelsLobbyMock.mockReturnValue({
      actionError: null,
      createPrivateChallenge: createPrivateChallengeMock,
      createPublicChallenge: vi.fn(),
      createQuickMatch: vi.fn(),
      difficulty: 'easy',
      inviteEntries: [],
      isActionPending: false,
      isAuthenticated: true,
      isLoadingAuth: false,
      isLobbyLoading: false,
      isOpponentsLoading: false,
      isPresenceLoading: false,
      isRestoringAuth: false,
      isSearchLoading: false,
      joinDuel: vi.fn(),
      leaderboardEntries: [],
      leaderboardError: null,
      lobbyError: null,
      modeFilter: 'all',
      operation: 'addition',
      opponents: [],
      presenceEntries: [],
      presenceError: null,
      publicEntries: [],
      refresh: vi.fn(),
      searchError: null,
      searchQuery: '',
      searchResults: [],
      searchSubmittedQuery: '',
      seriesBestOf: 1,
      setDifficulty: vi.fn(),
      setModeFilter: vi.fn(),
      setOperation: vi.fn(),
      setSeriesBestOf: vi.fn(),
      setSearchQuery: vi.fn(),
      submitSearch: vi.fn(),
      clearSearch: vi.fn(),
      visiblePublicEntries: [],
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
      screen.getByText(
        'Rewanż zachowa ten sam tryb, działanie, poziom i format serii.',
      ),
    ).toBeTruthy();

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
