/**
 * @vitest-environment jsdom
 */

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createDefaultDuelsLobbyMock,
  renderDuelsScreen,
  resetDuelsScreenMocks,
  shareKangurDuelInviteMock,
  useKangurMobileDuelsAssignmentsMock,
  useKangurMobileDuelsBadgesMock,
  useKangurMobileDuelsLessonMasteryMock,
  useKangurMobileDuelsLobbyMock,
  useKangurMobileDuelSessionMock,
  useKangurMobileLessonCheckpointsMock,
  useLocalSearchParamsMock,
} from './KangurDuelsScreen.test-support';

describe('KangurDuelsScreen session states', () => {
  beforeEach(() => {
    resetDuelsScreenMocks();
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
      sendReaction: vi.fn(),
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
      spectatorCount: 1,
      submitAnswer: vi.fn(),
    });
    useKangurMobileLessonCheckpointsMock.mockReturnValue({
      recentCheckpoints: [
        {
          attempts: 2,
          bestScorePercent: 78,
          componentId: 'addition',
          emoji: '➕',
          lastCompletedAt: '2026-03-21T08:20:00.000Z',
          lastScorePercent: 75,
          lessonHref: {
            pathname: '/lessons',
            params: { focus: 'addition' },
          },
          masteryPercent: 76,
          practiceHref: {
            pathname: '/practice',
            params: { operation: 'addition' },
          },
          title: 'Dodawanie w pamięci',
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
                focus: 'addition',
              },
            },
            description: 'Wroc do dodawania i zamknij lokalny plan po pojedynku.',
            id: 'assignment-duels-session-1',
            priority: 'high',
            target: '1 lekcja',
            title: 'Domknij dodawanie',
          },
          href: {
            pathname: '/lessons',
            params: {
              focus: 'addition',
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
          attempts: 5,
          bestScorePercent: 95,
          componentId: 'addition',
          emoji: '➕',
          lastCompletedAt: '2026-03-21T08:28:00.000Z',
          lastScorePercent: 93,
          lessonHref: {
            pathname: '/lessons',
            params: { focus: 'addition' },
          },
          masteryPercent: 91,
          practiceHref: {
            pathname: '/practice',
            params: { operation: 'addition' },
          },
          title: 'Dodawanie w pamięci',
        },
      ],
      trackedLessons: 2,
      weakest: [
        {
          attempts: 2,
          bestScorePercent: 78,
          componentId: 'clock',
          emoji: '⏰',
          lastCompletedAt: '2026-03-21T08:20:00.000Z',
          lastScorePercent: 72,
          lessonHref: {
            pathname: '/lessons',
            params: { focus: 'clock' },
          },
          masteryPercent: 69,
          practiceHref: {
            pathname: '/practice',
            params: { operation: 'time_compare' },
          },
          title: 'Zegar i czas',
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

    renderDuelsScreen();

    expect(screen.getByText('Pojedynek')).toBeTruthy();
    expect(
      screen.getByText(
        'Tutaj możesz zostać w poczekalni, śledzić postęp graczy i sprawdzać stan rundy bez wychodzenia z pojedynku.'
      )
    ).toBeTruthy();
    expect(screen.getByText('Sesja duel-1')).toBeTruthy();
    expect(screen.getByText('Poczekalnia pojedynku')).toBeTruthy();
    expect(
      screen.getByText(
        'Czekamy, aż wszyscy gracze dołączą. Gdy druga osoba pojawi się w lobby, pojedynek wystartuje automatycznie.'
      )
    ).toBeTruthy();
    expect(screen.getByText('Ada')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.getAllByText('Seria BO3').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Gra 2 z 3')).toBeTruthy();
    expect(screen.getByText('Prowadzi Ada 1:0.')).toBeTruthy();
    expect(screen.getByText('Wygrane gry w serii: 1')).toBeTruthy();
    expect(screen.getByText('Wygrane gry w serii: 0')).toBeTruthy();
    expect(screen.getAllByText('Wynik 0').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('0/5 pytań').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Reakcje')).toBeTruthy();
    expect(screen.getByText('Wyślij szybką reakcję bez opuszczania pojedynku.')).toBeTruthy();
    expect(screen.getByText('Minimalna liczba graczy do startu: 2')).toBeTruthy();
    expect(screen.getByText('Oś sesji')).toBeTruthy();
    expect(screen.getByText(/Utworzono/)).toBeTruthy();
    expect(screen.getByText(/Ostatnia aktualizacja/)).toBeTruthy();
    expect(screen.getByText('Ostatnie checkpointy lekcji')).toBeTruthy();
    expect(screen.getByText('Wróć do lekcji: Dodawanie w pamięci')).toBeTruthy();
    expect(screen.getByText('Potem trenuj: Dodawanie w pamięci')).toBeTruthy();
    expect(screen.getByText('Opanowanie lekcji')).toBeTruthy();
    expect(screen.getByText('Plan lekcji obok pojedynku')).toBeTruthy();
    expect(screen.getByText('Śledzone 2')).toBeTruthy();
    expect(screen.getByText('Opanowane 1')).toBeTruthy();
    expect(screen.getByText('Do powtórki 1')).toBeTruthy();
    expect(
      screen.getByText(
        'Fokus obok pojedynku: Zegar i czas potrzebuje jeszcze krótkiej powtórki, gdy ta sesja się skończy.'
      )
    ).toBeTruthy();
    expect(screen.getByText('Skup się: Zegar i czas')).toBeTruthy();
    expect(screen.getByText('Podtrzymaj: Dodawanie w pamięci')).toBeTruthy();
    expect(screen.getByText('Najmocniejsza lekcja')).toBeTruthy();
    expect(screen.getByText('Próby 5 • ostatni wynik 93%')).toBeTruthy();
    expect(screen.getByText('Odznaki')).toBeTruthy();
    expect(screen.getByText('Centrum odznak')).toBeTruthy();
    expect(screen.getByText('Odblokowane 2/9')).toBeTruthy();
    expect(screen.getByText('Do zdobycia 7')).toBeTruthy();
    expect(screen.getByText('Ostatnio odblokowane')).toBeTruthy();
    expect(screen.getByText('⚔️ Początek pojedynku')).toBeTruthy();
    expect(screen.getByText('📚 Bohater lekcji')).toBeTruthy();
    expect(screen.getByText('Otwórz profil i odznaki')).toBeTruthy();
    expect(screen.getByText('W pojedynku')).toBeTruthy();
    expect(screen.getByText('Plan obok pojedynku')).toBeTruthy();
    expect(screen.getByText('Domknij dodawanie')).toBeTruthy();
    expect(screen.getByText('Cel: 1 lekcja')).toBeTruthy();
    expect(screen.getAllByText('Otwórz lekcję').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Anuluj pojedynek')).toBeTruthy();
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
        'Wyślij bezpośredni link do Bob, aby prywatny pojedynek otworzył się od razu bez szukania go w lobby.'
      )
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

  it('toggles the auto refresh chip and re-enables polling when enabled', async () => {
    const mockRefresh = vi.fn();
    useKangurMobileDuelsLobbyMock.mockReturnValue({
      ...createDefaultDuelsLobbyMock(),
      refresh: mockRefresh,
    });

    renderDuelsScreen('pl');
    const autoRefreshChip = await screen.findByText('Auto odświeżanie (Włączone)');
    mockRefresh.mockClear();

    fireEvent.click(autoRefreshChip);
    await waitFor(() =>
      expect(screen.getByText('Auto odświeżanie (Wyłączone)')).toBeTruthy()
    );
    expect(mockRefresh).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Auto odświeżanie (Wyłączone)'));
    await waitFor(() =>
      expect(screen.getByText('Auto odświeżanie (Włączone)')).toBeTruthy()
    );
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('shows a share error when invite-link sharing fails', async () => {
    shareKangurDuelInviteMock.mockRejectedValueOnce(
      new Error('System share sheet unavailable.')
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
      expect(screen.getByText('Nie udało się udostępnić zaproszenia')).toBeTruthy();
    });
    expect(screen.getByText('System share sheet unavailable.')).toBeTruthy();
  });
});
