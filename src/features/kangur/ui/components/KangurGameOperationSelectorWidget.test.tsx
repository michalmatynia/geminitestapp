/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { KangurProgressState } from '@/features/kangur/ui/types';

const {
  getCurrentKangurDailyQuestMock,
  operationSelectorPropsMock,
  useKangurGameRuntimeMock,
} = vi.hoisted(() => ({
  getCurrentKangurDailyQuestMock: vi.fn(),
  operationSelectorPropsMock: vi.fn(),
  useKangurGameRuntimeMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurGameRuntimeContext', () => ({
  useKangurGameRuntime: useKangurGameRuntimeMock,
}));

vi.mock('@/features/kangur/ui/services/daily-quests', () => ({
  getCurrentKangurDailyQuest: getCurrentKangurDailyQuestMock,
}));

vi.mock('@/features/kangur/ui/components/OperationSelector', () => ({
  default: (props: unknown) => {
    operationSelectorPropsMock(props);
    return <div data-testid='mock-operation-selector'>mock-operation-selector</div>;
  },
}));

vi.mock('@/features/kangur/ui/components/KangurPageIntroCard', () => ({
  KangurPageIntroCard: ({ title }: { title: string }) => (
    <div data-testid='mock-operation-intro'>{title}</div>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurPracticeAssignmentBanner', () => ({
  default: () => <div data-testid='mock-practice-assignment-banner'>assignment-banner</div>,
}));

import { KangurGameOperationSelectorWidget } from '@/features/kangur/ui/components/KangurGameOperationSelectorWidget';

const buildProgress = (
  overrides: Partial<KangurProgressState> = {}
): KangurProgressState => ({
  totalXp: 420,
  gamesPlayed: 8,
  perfectGames: 2,
  lessonsCompleted: 3,
  clockPerfect: 0,
  calendarPerfect: 0,
  geometryPerfect: 0,
  badges: ['first_game'],
  operationsPlayed: ['division', 'clock'],
  lessonMastery: {
    division: {
      attempts: 3,
      completions: 3,
      masteryPercent: 88,
      bestScorePercent: 94,
      lastScorePercent: 90,
      lastCompletedAt: '2026-03-10T09:00:00.000Z',
    },
  },
  totalCorrectAnswers: 24,
  totalQuestionsAnswered: 30,
  currentWinStreak: 3,
  bestWinStreak: 4,
  dailyQuestsCompleted: 1,
  activityStats: {
    'game:clock': {
      sessionsPlayed: 4,
      perfectSessions: 1,
      totalXpEarned: 180,
      totalCorrectAnswers: 16,
      totalQuestionsAnswered: 20,
      bestScorePercent: 100,
      currentStreak: 2,
      bestStreak: 3,
    },
  },
  ...overrides,
});

const buildRuntime = (progress: KangurProgressState, overrides: Record<string, unknown> = {}) => ({
  activePracticeAssignment: null,
  basePath: '/kangur',
  handleHome: vi.fn(),
  handleSelectOperation: vi.fn(),
  practiceAssignmentsByOperation: {},
  progress,
  screen: 'operation',
  setScreen: vi.fn(),
  ...overrides,
});

describe('KangurGameOperationSelectorWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentKangurDailyQuestMock.mockReturnValue(null);
  });

  it('recommends the quest-mapped operation and forwards it to the selector cards', () => {
    const progress = buildProgress();
    const runtime = buildRuntime(progress);
    useKangurGameRuntimeMock.mockReturnValue(runtime);
    getCurrentKangurDailyQuestMock.mockReturnValue({
      assignment: {
        title: '➗ Powtorka: Dzielenie',
        description: 'Jedna dobra gra ustabilizuje ten temat.',
        progressLabel: '48% / 75% opanowania',
        questLabel: 'Misja dnia',
        action: {
          label: 'Otworz lekcje',
          page: 'Lessons',
          query: {
            focus: 'division',
          },
        },
      },
      progress: {
        current: 48,
        percent: 64,
        status: 'in_progress',
        summary: '48% / 75% opanowania',
        target: 75,
      },
    });

    render(<KangurGameOperationSelectorWidget />);

    expect(screen.getByTestId('kangur-operation-recommendation-title')).toHaveTextContent(
      '➗ Powtorka: Dzielenie'
    );
    expect(screen.getByTestId('kangur-operation-recommendation-title')).toHaveClass(
      '[color:var(--kangur-page-text)]'
    );
    expect(screen.getByTestId('kangur-operation-recommendation-description')).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );
    expect(operationSelectorPropsMock.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        recommendedLabel: 'Misja dnia',
        recommendedOperation: 'division',
      })
    );

    fireEvent.click(screen.getByTestId('kangur-operation-recommendation-action'));

    expect(runtime.handleSelectOperation).toHaveBeenCalledWith('division', 'medium', {
      recommendation: {
        description: '48% / 75% opanowania',
        label: 'Misja dnia',
        source: 'operation_selector',
        title: '➗ Powtorka: Dzielenie',
      },
    });
    expect(runtime.setScreen).not.toHaveBeenCalled();
  });

  it('recommends quick calendar practice when the quest points to calendar learning', () => {
    const progress = buildProgress();
    const runtime = buildRuntime(progress);
    useKangurGameRuntimeMock.mockReturnValue(runtime);
    getCurrentKangurDailyQuestMock.mockReturnValue({
      assignment: {
        title: '📅 Powtorka: Kalendarz',
        description: 'Dni i daty potrzebuja jeszcze jednej serii.',
        progressLabel: '62% / 75% opanowania',
        questLabel: 'Misja dnia',
        action: {
          label: 'Otworz lekcje',
          page: 'Lessons',
          query: {
            focus: 'calendar',
          },
        },
      },
      progress: {
        current: 62,
        percent: 83,
        status: 'in_progress',
        summary: '62% / 75% opanowania',
        target: 75,
      },
    });

    render(<KangurGameOperationSelectorWidget />);

    expect(operationSelectorPropsMock.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        recommendedLabel: 'Misja dnia',
        recommendedOperation: null,
      })
    );
    expect(
      screen.getByTestId('kangur-quick-practice-recommendation-calendar_quiz')
    ).toHaveTextContent('Misja dnia');

    fireEvent.click(screen.getByTestId('kangur-operation-recommendation-action'));

    expect(runtime.setScreen).toHaveBeenCalledWith('calendar_quiz');
    expect(runtime.handleSelectOperation).not.toHaveBeenCalled();
  });

  it('falls back to the weakest lesson when there is no active quest', () => {
    const progress = buildProgress({
      lessonMastery: {
        geometry_shapes: {
          attempts: 2,
          completions: 2,
          masteryPercent: 42,
          bestScorePercent: 60,
          lastScorePercent: 48,
          lastCompletedAt: '2026-03-10T09:00:00.000Z',
        },
      },
    });
    const runtime = buildRuntime(progress);
    useKangurGameRuntimeMock.mockReturnValue(runtime);

    render(<KangurGameOperationSelectorWidget />);

    expect(screen.getByTestId('kangur-operation-recommendation-title')).toHaveTextContent(
      'Najpierw popraw: Figury geometryczne'
    );
    expect(
      screen.getByTestId('kangur-quick-practice-recommendation-geometry_quiz')
    ).toHaveTextContent('Nadrabiamy lekcje');

    fireEvent.click(screen.getByTestId('kangur-operation-recommendation-action'));

    expect(runtime.setScreen).toHaveBeenCalledWith('geometry_quiz');
  });

  it('falls back to the hottest badge-track lane when lessons are stable', () => {
    const progress = buildProgress({
      lessonMastery: {
        division: {
          attempts: 3,
          completions: 3,
          masteryPercent: 92,
          bestScorePercent: 98,
          lastScorePercent: 96,
          lastCompletedAt: '2026-03-10T09:00:00.000Z',
        },
      },
      totalCorrectAnswers: 19,
      totalQuestionsAnswered: 20,
      currentWinStreak: 4,
      activityStats: {
        'game:clock': {
          sessionsPlayed: 4,
          perfectSessions: 2,
          totalXpEarned: 210,
          totalCorrectAnswers: 19,
          totalQuestionsAnswered: 20,
          bestScorePercent: 100,
          currentStreak: 3,
          bestStreak: 4,
        },
      },
    });
    const runtime = buildRuntime(progress);
    useKangurGameRuntimeMock.mockReturnValue(runtime);

    render(<KangurGameOperationSelectorWidget />);

    expect(screen.getByTestId('kangur-operation-recommendation-label')).toHaveTextContent(
      'Tor odznak'
    );
    expect(operationSelectorPropsMock.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        recommendedOperation: 'clock',
      })
    );

    fireEvent.click(screen.getByTestId('kangur-operation-recommendation-action'));

    expect(runtime.handleSelectOperation).toHaveBeenCalledWith(
      'clock',
      'hard',
      expect.objectContaining({
        recommendation: expect.objectContaining({
          label: 'Tor odznak',
          source: 'operation_selector',
          title: expect.stringMatching(/^Rozpedz tor:/),
        }),
      })
    );
  });

  it('prioritizes guided momentum before the generic badge-track push', () => {
    const progress = buildProgress({
      lessonMastery: {
        division: {
          attempts: 3,
          completions: 3,
          masteryPercent: 92,
          bestScorePercent: 98,
          lastScorePercent: 96,
          lastCompletedAt: '2026-03-10T09:00:00.000Z',
        },
      },
      recommendedSessionsCompleted: 2,
      totalCorrectAnswers: 19,
      totalQuestionsAnswered: 20,
      currentWinStreak: 4,
      activityStats: {
        'game:clock': {
          sessionsPlayed: 4,
          perfectSessions: 2,
          totalXpEarned: 210,
          totalCorrectAnswers: 19,
          totalQuestionsAnswered: 20,
          bestScorePercent: 100,
          currentStreak: 3,
          bestStreak: 4,
        },
      },
    });
    const runtime = buildRuntime(progress);
    useKangurGameRuntimeMock.mockReturnValue(runtime);

    render(<KangurGameOperationSelectorWidget />);

    expect(screen.getByTestId('kangur-operation-recommendation-label')).toHaveTextContent(
      'Polecony kierunek'
    );
    expect(screen.getByTestId('kangur-operation-recommendation-title')).toHaveTextContent(
      'Dopnij: Trzymam kierunek'
    );
    expect(operationSelectorPropsMock.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        recommendedOperation: 'clock',
      })
    );

    fireEvent.click(screen.getByTestId('kangur-operation-recommendation-action'));

    expect(runtime.handleSelectOperation).toHaveBeenCalledWith(
      'clock',
      'hard',
      expect.objectContaining({
        recommendation: expect.objectContaining({
          label: 'Polecony kierunek',
          source: 'operation_selector',
          title: 'Dopnij: Trzymam kierunek',
        }),
      })
    );
  });
});
