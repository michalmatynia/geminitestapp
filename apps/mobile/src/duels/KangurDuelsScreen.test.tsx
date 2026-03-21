/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useLocalSearchParamsMock,
  useRouterMock,
  useKangurMobileAuthMock,
  useKangurMobileDuelLobbyChatMock,
  useKangurMobileDuelsLobbyMock,
  useKangurMobileDuelSessionMock,
} = vi.hoisted(() => ({
  useLocalSearchParamsMock: vi.fn(),
  useRouterMock: vi.fn(),
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

import { KangurDuelsScreen } from './KangurDuelsScreen';

describe('KangurDuelsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLocalSearchParamsMock.mockReturnValue({});
    useRouterMock.mockReturnValue({
      replace: vi.fn(),
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
      setDifficulty: vi.fn(),
      setModeFilter: vi.fn(),
      setOperation: vi.fn(),
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
      leaveSession: vi.fn(),
      player: null,
      refresh: vi.fn(),
      sendReaction: vi.fn(),
      session: null,
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
      setDifficulty: vi.fn(),
      setModeFilter: vi.fn(),
      setOperation: vi.fn(),
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

    render(<KangurDuelsScreen />);

    expect(screen.getByText('Pojedynki')).toBeTruthy();
    expect(screen.getByText('Panel gry')).toBeTruthy();
    expect(screen.getAllByText('Szybki mecz').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Publiczne wyzwanie')).toBeTruthy();
    expect(screen.getByText('Zaproszenia')).toBeTruthy();
    expect(screen.getByText('Ada Mentor')).toBeTruthy();
    expect(screen.getByText('Aktywni uczniowie')).toBeTruthy();
    expect(screen.getByText('Jan Mistrz')).toBeTruthy();
    expect(screen.getByText('Czat lobby')).toBeTruthy();
    expect(screen.getByText('Maja Sprint')).toBeTruthy();
    expect(screen.getByText('Szukam meczu z mnozeniem.')).toBeTruthy();
    expect(screen.getByText('Wyniki dueli')).toBeTruthy();
    expect(screen.getByText('#1 Ola')).toBeTruthy();
    expect(screen.getByText('Ola Quiz')).toBeTruthy();
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
        startedAt: null,
        status: 'waiting',
        timePerQuestionSec: 15,
        updatedAt: '2026-03-21T08:02:00.000Z',
        visibility: 'private',
      },
      sendReaction: vi.fn(),
      submitAnswer: vi.fn(),
    });

    render(<KangurDuelsScreen />);

    expect(screen.getByText('Pojedynek')).toBeTruthy();
    expect(screen.getByText('Sesja duel-1')).toBeTruthy();
    expect(screen.getByText('Poczekalnia pojedynku')).toBeTruthy();
    expect(screen.getByText('Ada')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.getByText('Reakcje')).toBeTruthy();
    expect(screen.getByText('Wyślij szybką reakcję bez opuszczania pojedynku.')).toBeTruthy();
    expect(screen.getByText('Minimalna liczba graczy do startu: 2')).toBeTruthy();
    expect(screen.getByText('Opuść pojedynek')).toBeTruthy();
  });
});
