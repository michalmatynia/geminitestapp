/**
 * @vitest-environment jsdom
 */

import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createDefaultDuelsLobbyMock,
  renderDuelsScreen,
  resetDuelsScreenMocks,
  useKangurMobileDuelLobbyChatMock,
  useKangurMobileDuelsAssignmentsMock,
  useKangurMobileDuelsBadgesMock,
  useKangurMobileDuelsLessonMasteryMock,
  useKangurMobileDuelsLobbyMock,
  useKangurMobileLessonCheckpointsMock,
} from './KangurDuelsScreen.test-support';

describe('KangurDuelsScreen', () => {
  beforeEach(() => {
    resetDuelsScreenMocks();
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
    useKangurMobileLessonCheckpointsMock.mockReturnValue({
      recentCheckpoints: [
        {
          attempts: 3,
          bestScorePercent: 91,
          componentId: 'clock',
          emoji: '⏰',
          lastCompletedAt: '2026-03-21T08:18:00.000Z',
          lastScorePercent: 84,
          lessonHref: {
            pathname: '/lessons',
            params: { focus: 'clock' },
          },
          masteryPercent: 88,
          practiceHref: {
            pathname: '/practice',
            params: { operation: 'time_compare' },
          },
          title: 'Zegar i czas',
        },
      ],
    });
    useKangurMobileDuelsAssignmentsMock.mockReturnValue({
      assignmentItems: [
        {
          assignment: {
            action: {
              label: 'Open lesson',
              page: 'Lessons',
              query: {
                focus: 'clock',
              },
            },
            description: 'Wroc do zegara i popraw ostatnie luki po grze.',
            id: 'assignment-duels-lobby-1',
            priority: 'high',
            target: '1 lekcja',
            title: 'Domknij zegar',
          },
          href: {
            pathname: '/lessons',
            params: {
              focus: 'clock',
            },
          },
        },
      ],
    });
    useKangurMobileDuelsLessonMasteryMock.mockReturnValue({
      lessonsNeedingPractice: 1,
      masteredLessons: 1,
      strongest: [
        {
          attempts: 4,
          bestScorePercent: 96,
          componentId: 'multiplication',
          emoji: '✖️',
          lastCompletedAt: '2026-03-21T08:24:00.000Z',
          lastScorePercent: 92,
          lessonHref: {
            pathname: '/lessons',
            params: { focus: 'multiplication' },
          },
          masteryPercent: 94,
          practiceHref: {
            pathname: '/practice',
            params: { operation: 'multiplication' },
          },
          title: 'Mnożenie',
        },
      ],
      trackedLessons: 2,
      weakest: [
        {
          attempts: 3,
          bestScorePercent: 78,
          componentId: 'clock',
          emoji: '⏰',
          lastCompletedAt: '2026-03-21T08:18:00.000Z',
          lastScorePercent: 74,
          lessonHref: {
            pathname: '/lessons',
            params: { focus: 'clock' },
          },
          masteryPercent: 68,
          practiceHref: {
            pathname: '/practice',
            params: { operation: 'time_compare' },
          },
          title: 'Zegar i czas',
        },
      ],
    });

    renderDuelsScreen();

    expect(screen.getByText('Pojedynki')).toBeTruthy();
    expect(
      screen.getByText(
        'Stąd uruchomisz szybkie mecze, otworzysz publiczne wyzwania i od razu wrócisz do aktywnych rywali.'
      )
    ).toBeTruthy();
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
    expect(screen.getByText('Ostatnie checkpointy lekcji')).toBeTruthy();
    expect(screen.getByText('Kontynuuj lekcje')).toBeTruthy();
    expect(screen.getByText('Wróć do lekcji: Zegar i czas')).toBeTruthy();
    expect(screen.getByText('Potem trenuj: Zegar i czas')).toBeTruthy();
    expect(screen.getByText('Otwórz lekcje')).toBeTruthy();
    expect(screen.getByText('Opanowanie lekcji')).toBeTruthy();
    expect(screen.getByText('Plan lekcji z lobby')).toBeTruthy();
    expect(screen.getByText('Śledzone 2')).toBeTruthy();
    expect(screen.getByText('Opanowane 1')).toBeTruthy();
    expect(screen.getByText('Do powtórki 1')).toBeTruthy();
    expect(
      screen.getByText(
        'Fokus z lobby: Zegar i czas potrzebuje jeszcze krótkiej powtórki, zanim otworzysz kolejnego rywala.'
      )
    ).toBeTruthy();
    expect(screen.getByText('Skup się: Zegar i czas')).toBeTruthy();
    expect(screen.getByText('Podtrzymaj: Mnożenie')).toBeTruthy();
    expect(screen.getByText('Najmocniejsza lekcja')).toBeTruthy();
    expect(screen.getByText('Próby 4 • ostatni wynik 92%')).toBeTruthy();
    expect(screen.getByText('W lobby')).toBeTruthy();
    expect(screen.getByText('Plan z lobby')).toBeTruthy();
    expect(screen.getByText('Domknij zegar')).toBeTruthy();
    expect(screen.getByText('Priorytet wysoki')).toBeTruthy();
    expect(screen.getByText('Cel: 1 lekcja')).toBeTruthy();
    expect(screen.getAllByText('Otwórz lekcję').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Centrum odznak')).toBeTruthy();
    expect(screen.getByText('#1 Ola')).toBeTruthy();
    expect(screen.getByText('Ola Quiz')).toBeTruthy();
  });

  it('renders German lobby chrome when the locale provider resolves de', () => {
    useKangurMobileDuelsLobbyMock.mockReturnValue({
      ...createDefaultDuelsLobbyMock(),
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
      seriesBestOf: 3,
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
    useKangurMobileDuelsBadgesMock.mockReturnValue({
      recentBadges: [
        {
          emoji: '⚔️',
          id: 'duel_starter',
          name: 'Początek pojedynku',
        },
      ],
      remainingBadges: 8,
      totalBadges: 9,
      unlockedBadges: 1,
    });

    renderDuelsScreen('de');

    expect(screen.getByText('Duelle')).toBeTruthy();
    expect(screen.getByText('Spielbereich')).toBeTruthy();
    expect(screen.getAllByText('Schnelles Match').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Öffentliche Herausforderung')).toBeTruthy();
    expect(screen.getByText('Einladungen')).toBeTruthy();
    expect(screen.getByText('Lobby-Chat')).toBeTruthy();
    expect(screen.getByText('Duellrangliste')).toBeTruthy();
    expect(screen.getByText('Abzeichen')).toBeTruthy();
    expect(screen.getByText('Zuletzt freigeschaltet')).toBeTruthy();
    expect(screen.getByText('⚔️ Początek pojedynku')).toBeTruthy();
    expect(screen.getAllByText('BO3-Serie').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Spiel 2 von 3 · abgeschlossene Spiele: 1')).toBeTruthy();
    expect(screen.getByText('Duell beobachten')).toBeTruthy();
  });

  it('renders a search status chip in the lobby header', () => {
    renderDuelsScreen();

    expect(screen.getByText('Szukaj uczniów')).toBeTruthy();
    expect(screen.getByText('Co najmniej 2 znaki')).toBeTruthy();
  });

  it('shows signed-out guidance for the active learners card', () => {
    useKangurMobileDuelsLobbyMock.mockReturnValue({
      ...createDefaultDuelsLobbyMock(),
      isAuthenticated: false,
    });

    renderDuelsScreen();

    expect(screen.getByText('Zaloguj się, aby grać w pojedynki')).toBeTruthy();
    expect(
      screen.getByText(
        'Goście mogą przeglądać publiczne lobby i ranking. Zaloguj się, aby tworzyć pojedynki lub do nich dołączać.'
      )
    ).toBeTruthy();
    expect(screen.getByText('Aktywni uczniowie')).toBeTruthy();
    expect(screen.getByText('Zaloguj się, aby zobaczyć aktywnych uczniów')).toBeTruthy();
    expect(
      screen.getByText(
        'Po zalogowaniu będziesz też widoczny w lobby i szybciej wrócisz do aktywnych rywali.'
      )
    ).toBeTruthy();
  });

  it('shows signed-out guidance for the lobby chat', () => {
    useKangurMobileDuelLobbyChatMock.mockReturnValue({
      error: null,
      isAuthenticated: false,
      isLoading: false,
      isRestoringAuth: false,
      isSending: false,
      maxMessageLength: 280,
      messages: [],
      refresh: vi.fn(),
      sendMessage: vi.fn(),
    });

    renderDuelsScreen();

    expect(screen.getByText('Czat lobby')).toBeTruthy();
    expect(screen.getByText('Zaloguj się do czatu lobby')).toBeTruthy();
    expect(
      screen.getByText(
        'Po zalogowaniu możesz czytać i wysyłać krótkie wiadomości, aby ustalić szybki mecz albo rewanż.'
      )
    ).toBeTruthy();
  });

  it('shows signed-out guidance for learner search', () => {
    useKangurMobileDuelsLobbyMock.mockReturnValue({
      ...createDefaultDuelsLobbyMock(),
      isAuthenticated: false,
    });

    renderDuelsScreen();

    expect(screen.getByText('Szukaj uczniów')).toBeTruthy();
    expect(screen.getByText('Zaloguj się, aby szukać uczniów')).toBeTruthy();
    expect(
      screen.getByText(
        'Po zalogowaniu znajdziesz ucznia po loginie lub nazwie i od razu wyślesz prywatne wyzwanie.'
      )
    ).toBeTruthy();
  });

  it('shows signed-out guidance for the recent rivals card', () => {
    useKangurMobileDuelsLobbyMock.mockReturnValue({
      ...createDefaultDuelsLobbyMock(),
      isAuthenticated: false,
    });

    renderDuelsScreen();

    expect(screen.getByText('Ostatni przeciwnicy')).toBeTruthy();
    expect(screen.getByText('Ostatni rywale wymagają logowania')).toBeTruthy();
    expect(
      screen.getByText('Po zalogowaniu pojawią się tutaj ostatni rywale i szybkie rewanże.')
    ).toBeTruthy();
  });

  it('shows the empty recent rivals state before the first duel is finished', () => {
    renderDuelsScreen();

    expect(screen.getByText('Ostatni przeciwnicy')).toBeTruthy();
    expect(screen.getByText('Brak jeszcze ostatnich rywali')).toBeTruthy();
    expect(
      screen.getByText(
        'Rozegraj pierwszy pojedynek, aby ta lista wypełniła się automatycznie.'
      )
    ).toBeTruthy();
  });
});
