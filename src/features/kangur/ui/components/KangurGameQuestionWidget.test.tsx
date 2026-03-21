/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

const { useKangurGameRuntimeMock } = vi.hoisted(() => ({
  useKangurGameRuntimeMock: vi.fn(),
}));
const getCurrentKangurDailyQuestMock = vi.hoisted(() => vi.fn());
const getNextLockedBadgeMock = vi.hoisted(() => vi.fn());
const getRecommendedSessionProjectionMock = vi.hoisted(() => vi.fn());
const useKangurSubjectFocusMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/kangur/ui/context/KangurGameRuntimeContext', () => ({
  useKangurGameRuntime: useKangurGameRuntimeMock,
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => useKangurSubjectFocusMock(),
}));

vi.mock('@/features/kangur/ui/services/daily-quests', () => ({
  getCurrentKangurDailyQuest: getCurrentKangurDailyQuestMock,
}));

vi.mock('@/features/kangur/ui/services/progress', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/kangur/ui/services/progress')
  >('@/features/kangur/ui/services/progress');

  return {
    ...actual,
    getNextLockedBadge: getNextLockedBadgeMock,
    getRecommendedSessionProjection: getRecommendedSessionProjectionMock,
  };
});

vi.mock('@/features/kangur/ui/components/game', () => ({
  QuestionCard: ({
    questionNumber,
    total,
  }: {
    questionNumber: number;
    total: number;
  }): React.JSX.Element => (
    <div data-testid='mock-question-card'>
      Mock question card {questionNumber}/{total}
    </div>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurPracticeAssignmentBanner', () => ({
  __esModule: true,
  default: (): React.JSX.Element => <div data-testid='mock-assignment-banner'>Assignment banner</div>,
}));

import deMessages from '@/i18n/messages/de.json';
import plMessages from '@/i18n/messages/pl.json';

import { KangurGameQuestionWidget } from '@/features/kangur/ui/components/KangurGameQuestionWidget';

const renderQuestionWidget = (
  locale: 'pl' | 'de',
  messages: typeof plMessages | typeof deMessages,
): ReturnType<typeof render> =>
  render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <KangurGameQuestionWidget />
    </NextIntlClientProvider>
  );

describe('KangurGameQuestionWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject: vi.fn(),
      subjectKey: 'learner-1',
    });
  });

  it('uses the lighter status-strip copy palette while rendering the active question', () => {
    getCurrentKangurDailyQuestMock.mockReturnValue({
      progress: {
        summary: '1/2 runda dzisiaj',
        status: 'in_progress',
      },
    });
    getNextLockedBadgeMock.mockReturnValue({
      summary: '420/500 XP',
    });
    getRecommendedSessionProjectionMock.mockReturnValue({
      current: {
        completedSessions: 2,
        nextBadgeName: 'Trzymam kierunek',
        progressPercent: 67,
        summary: '2/3 rundy',
      },
      projected: {
        completedSessions: 3,
        nextBadgeName: null,
        progressPercent: 100,
        summary: '3/3 rundy',
      },
    });

    useKangurGameRuntimeMock.mockReturnValue({
      activePracticeAssignment: null,
      activeSessionRecommendation: {
        description: 'To teraz najmocniej podbija tempo i kolejną odznakę.',
        label: 'Tor odznak',
        source: 'operation_selector',
        title: 'Rozpędź tor: XP',
      },
      basePath: '/kangur',
      currentQuestion: { question: '2 + 2 = ?', answer: 4, choices: [4, 5, 6, 7] },
      currentQuestionIndex: 1,
      difficulty: 'easy',
      handleAnswer: vi.fn(),
      progress: {
        totalXp: 420,
        gamesPlayed: 8,
        recommendedSessionsCompleted: 2,
        perfectGames: 2,
        lessonsCompleted: 3,
        clockPerfect: 0,
        calendarPerfect: 0,
        geometryPerfect: 0,
        badges: ['first_game'],
        operationsPlayed: ['division'],
        lessonMastery: {},
        totalCorrectAnswers: 32,
        totalQuestionsAnswered: 40,
        currentWinStreak: 2,
        bestWinStreak: 4,
        activityStats: {},
      },
      questionTimeLimit: 20,
      score: 1,
      screen: 'playing',
      totalQuestions: 10,
    });

    renderQuestionWidget('pl', plMessages);

    expect(screen.getByText(/⭐ Wynik:/i)).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );
    expect(screen.getByText(/🟢 Latwy/i)).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );
    expect(screen.getByTestId('kangur-game-question-momentum')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-game-question-accuracy')).toHaveTextContent(
      'Skuteczność rundy: 100%'
    );
    expect(screen.getByTestId('kangur-game-question-perfect-run')).toHaveTextContent(
      'Perfekt w toku'
    );
    expect(screen.getByTestId('kangur-game-question-recommendation')).toHaveTextContent(
      'Polecony kierunek: Rozpędź tor: XP'
    );
    expect(screen.getByTestId('kangur-game-question-guided')).toHaveTextContent(
      'Po tej rundzie: 3/3 rundy'
    );
    expect(screen.getByTestId('kangur-game-question-quest')).toHaveTextContent(
      'Misja dnia: 1/2 runda dzisiaj'
    );
    expect(screen.getByTestId('kangur-game-question-next-badge')).toHaveTextContent(
      'Następna odznaka: 420/500 XP'
    );
    expect(screen.getByTestId('mock-question-card')).toBeInTheDocument();
  });

  it('shows a perfect-run marker when all answered questions so far are correct', () => {
    getCurrentKangurDailyQuestMock.mockReturnValue(null);
    getNextLockedBadgeMock.mockReturnValue(null);
    getRecommendedSessionProjectionMock.mockReturnValue(null);

    useKangurGameRuntimeMock.mockReturnValue({
      activePracticeAssignment: null,
      activeSessionRecommendation: null,
      basePath: '/kangur',
      currentQuestion: { question: '2 + 2 = ?', answer: 4, choices: [4, 5, 6, 7] },
      currentQuestionIndex: 3,
      difficulty: 'medium',
      handleAnswer: vi.fn(),
      progress: {
        totalXp: 420,
        gamesPlayed: 8,
        perfectGames: 2,
        lessonsCompleted: 3,
        clockPerfect: 0,
        calendarPerfect: 0,
        geometryPerfect: 0,
        badges: ['first_game'],
        operationsPlayed: ['division'],
        lessonMastery: {},
        totalCorrectAnswers: 32,
        totalQuestionsAnswered: 40,
        currentWinStreak: 2,
        bestWinStreak: 4,
        activityStats: {},
      },
      questionTimeLimit: 20,
      score: 3,
      screen: 'playing',
      totalQuestions: 10,
    });

    renderQuestionWidget('pl', plMessages);

    expect(screen.getByTestId('kangur-game-question-accuracy')).toHaveTextContent(
      'Skuteczność rundy: 100%'
    );
    expect(screen.getByTestId('kangur-game-question-perfect-run')).toHaveTextContent(
      'Perfekt w toku'
    );
    expect(screen.queryByTestId('kangur-game-question-guided')).toBeNull();
  });

  it('renders German question chrome and passes translators into quest and badge services', () => {
    getCurrentKangurDailyQuestMock.mockReturnValue({
      progress: {
        summary: '1/2 Runde heute',
        status: 'in_progress',
      },
    });
    getNextLockedBadgeMock.mockReturnValue({
      summary: '420/500 XP',
    });
    getRecommendedSessionProjectionMock.mockReturnValue({
      current: {
        completedSessions: 2,
        nextBadgeName: 'Bleib im Rhythmus',
        progressPercent: 67,
        summary: '2/3 Runden',
      },
      projected: {
        completedSessions: 3,
        nextBadgeName: null,
        progressPercent: 100,
        summary: '3/3 Runden',
      },
    });

    useKangurGameRuntimeMock.mockReturnValue({
      activePracticeAssignment: null,
      activeSessionRecommendation: {
        description: 'Das bringt das meiste Tempo.',
        label: 'Abzeichenpfad',
        source: 'operation_selector',
        title: 'Beschleunige den XP-Pfad',
      },
      basePath: '/kangur',
      currentQuestion: { question: '2 + 2 = ?', answer: 4, choices: [4, 5, 6, 7] },
      currentQuestionIndex: 1,
      difficulty: 'easy',
      handleAnswer: vi.fn(),
      progress: {
        totalXp: 420,
        gamesPlayed: 8,
        recommendedSessionsCompleted: 2,
        perfectGames: 2,
        lessonsCompleted: 3,
        clockPerfect: 0,
        calendarPerfect: 0,
        geometryPerfect: 0,
        badges: ['first_game'],
        operationsPlayed: ['division'],
        lessonMastery: {},
        totalCorrectAnswers: 32,
        totalQuestionsAnswered: 40,
        currentWinStreak: 2,
        bestWinStreak: 4,
        activityStats: {},
      },
      questionTimeLimit: 20,
      score: 1,
      screen: 'playing',
      totalQuestions: 10,
    });

    renderQuestionWidget('de', deMessages);

    expect(screen.getByText(/⭐ Ergebnis:/i)).toBeInTheDocument();
    expect(screen.getByText(/🟢 Leicht/i)).toBeInTheDocument();
    expect(screen.getByTestId('kangur-game-question-accuracy')).toHaveTextContent(
      'Genauigkeit der Runde: 100%'
    );
    expect(screen.getByTestId('kangur-game-question-perfect-run')).toHaveTextContent(
      'Perfekte Serie läuft'
    );
    expect(screen.getByTestId('kangur-game-question-recommendation')).toHaveTextContent(
      'Empfohlene Richtung: Beschleunige den XP-Pfad'
    );
    expect(screen.getByTestId('kangur-game-question-guided')).toHaveTextContent(
      'Nach dieser Runde: 3/3 Runden'
    );
    expect(screen.getByTestId('kangur-game-question-quest')).toHaveTextContent(
      'Mission des Tages: 1/2 Runde heute'
    );
    expect(screen.getByTestId('kangur-game-question-next-badge')).toHaveTextContent(
      'Nächstes Abzeichen: 420/500 XP'
    );
    expect(getCurrentKangurDailyQuestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        subject: 'maths',
        translate: expect.any(Function),
      })
    );
    expect(getNextLockedBadgeMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        translate: expect.any(Function),
      })
    );
    expect(getRecommendedSessionProjectionMock).toHaveBeenCalledWith(
      expect.anything(),
      true,
      expect.objectContaining({
        translate: expect.any(Function),
      })
    );
  });
});
