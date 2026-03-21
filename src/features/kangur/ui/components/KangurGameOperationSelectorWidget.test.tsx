/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@/__tests__/test-utils';
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

const { useKangurSubjectFocusMock } = vi.hoisted(() => ({
  useKangurSubjectFocusMock: vi.fn(),
}));

const { localeState } = vi.hoisted(() => ({
  localeState: {
    value: 'pl' as 'de' | 'en' | 'pl',
  },
}));

const lessonsState = vi.hoisted(() => ({
  value: [] as Array<Record<string, unknown>>,
}));

vi.mock('next-intl', () => ({
  useLocale: () => localeState.value,
  useTranslations:
    (namespace?: string) =>
    (key: string) =>
      (
        {
          'KangurGamePage.operationSelector.title': {
            de: "Los geht's!",
            en: "Let's play!",
            pl: 'Grajmy!',
          },
          'KangurGamePage.screens.training.label': {
            de: 'Training einrichten',
            en: 'Training setup',
            pl: 'Konfiguracja treningu',
          },
          'KangurGamePage.screens.training.wordmarkLabel': {
            de: 'Training',
            en: 'Training',
            pl: 'Trening',
          },
        } as const
      )[`${namespace}.${key}`]?.[localeState.value] ?? key,
}));

vi.mock('@/features/kangur/ui/context/KangurGameRuntimeContext', () => ({
  useKangurGameRuntime: useKangurGameRuntimeMock,
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => useKangurSubjectFocusMock(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessons', () => ({
  useKangurLessons: (options: { subject?: string; enabledOnly?: boolean } = {}) => {
    let data = lessonsState.value;
    if (options.enabledOnly) {
      data = data.filter((lesson) => lesson.enabled !== false);
    }
    if (options.subject) {
      data = data.filter((lesson) => (lesson.subject ?? 'maths') === options.subject);
    }
    return {
      data,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
      error: null,
    };
  },
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
  KangurPageIntroCard: ({
    title,
    visualTitle,
  }: {
    title: string;
    visualTitle?: React.ReactNode;
  }) => (
    <div data-testid='mock-operation-intro'>
      <span>{title}</span>
      {visualTitle}
    </div>
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
    localeState.value = 'pl';
    getCurrentKangurDailyQuestMock.mockReturnValue(null);
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject: vi.fn(),
      subjectKey: 'learner-1',
    });
    lessonsState.value = [
      {
        id: 'kangur-lesson-clock',
        componentId: 'clock',
        title: 'Nauka zegara',
        description: 'Odczytuj godziny',
        emoji: '🕐',
        color: 'kangur-gradient-accent-indigo-reverse',
        activeBg: 'bg-indigo-500',
        sortOrder: 1000,
        enabled: true,
        subject: 'maths',
      },
      {
        id: 'kangur-lesson-calendar',
        componentId: 'calendar',
        title: 'Nauka kalendarza',
        description: 'Dni i miesiące',
        emoji: '📅',
        color: 'kangur-gradient-accent-emerald',
        activeBg: 'bg-emerald-500',
        sortOrder: 2000,
        enabled: true,
        subject: 'maths',
      },
      {
        id: 'kangur-lesson-geometry-shapes',
        componentId: 'geometry_shapes',
        title: 'Figury geometryczne',
        description: 'Rozpoznawaj figury',
        emoji: '🔷',
        color: 'kangur-gradient-accent-violet',
        activeBg: 'bg-violet-500',
        sortOrder: 3000,
        enabled: true,
        subject: 'maths',
      },
    ];
  });

  it('recommends the quest-mapped operation and forwards it to the selector cards', () => {
    const progress = buildProgress();
    const runtime = buildRuntime(progress);
    useKangurGameRuntimeMock.mockReturnValue(runtime);
    getCurrentKangurDailyQuestMock.mockReturnValue({
      assignment: {
        title: '➗ Powtórka: Dzielenie',
        description: 'Jedna dobra gra ustabilizuje ten temat.',
        progressLabel: '48% / 75% opanowania',
        questLabel: 'Misja dnia',
        action: {
          label: 'Otwórz lekcję',
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
      '➗ Powtórka: Dzielenie'
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
        title: '➗ Powtórka: Dzielenie',
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
        title: '📅 Powtórka: Kalendarz',
        description: 'Dni i daty potrzebują jeszcze jednej serii.',
        progressLabel: '62% / 75% opanowania',
        questLabel: 'Misja dnia',
        action: {
          label: 'Otwórz lekcję',
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
          title: expect.stringMatching(/^Rozpędź tor:/),
        }),
      })
    );
  });

  it('renders the localized English play wordmark in the operation heading art', () => {
    localeState.value = 'en';
    useKangurGameRuntimeMock.mockReturnValue(buildRuntime(buildProgress()));

    render(<KangurGameOperationSelectorWidget />);

    const art = screen.getByTestId('kangur-grajmy-heading-art');
    const intro = art.closest('[data-testid="mock-operation-intro"]');
    const text = art.querySelector('text');

    expect(intro).not.toBeNull();
    expect(intro).toHaveTextContent("Let's play!");
    expect(text).not.toBeNull();
    expect(text).toHaveTextContent("Let's play!");
    expect(text).toHaveAttribute('font-size', '68');
    expect(text).not.toHaveAttribute('textLength');
    expect(text).not.toHaveAttribute('lengthAdjust');
  });

  it('renders the localized English training wordmark in the training heading art', () => {
    localeState.value = 'en';
    useKangurGameRuntimeMock.mockReturnValue(
      buildRuntime(buildProgress(), {
        screen: 'training',
      })
    );

    render(<KangurGameOperationSelectorWidget />);

    const art = screen.getByTestId('kangur-training-heading-art');
    const intro = art.closest('[data-testid="mock-operation-intro"]');
    const text = art.querySelector('text');

    expect(intro).not.toBeNull();
    expect(intro).toHaveTextContent('Training setup');
    expect(text).not.toBeNull();
    expect(text).toHaveTextContent('Training');
    expect(text).toHaveAttribute('font-size', '68');
    expect(text).not.toHaveAttribute('textLength');
    expect(text).not.toHaveAttribute('lengthAdjust');
  });

  it('renders the localized German play wordmark in the operation heading art', () => {
    localeState.value = 'de';
    useKangurGameRuntimeMock.mockReturnValue(buildRuntime(buildProgress()));

    render(<KangurGameOperationSelectorWidget />);

    const art = screen.getByTestId('kangur-grajmy-heading-art');
    const intro = art.closest('[data-testid="mock-operation-intro"]');
    const text = art.querySelector('text');

    expect(intro).not.toBeNull();
    expect(intro).toHaveTextContent("Los geht's!");
    expect(text).not.toBeNull();
    expect(text).toHaveTextContent("Los geht's!");
    expect(text).toHaveAttribute('font-size', '68');
    expect(text).not.toHaveAttribute('textLength');
    expect(text).not.toHaveAttribute('lengthAdjust');
  });

  it('renders the localized German training wordmark in the training heading art', () => {
    localeState.value = 'de';
    useKangurGameRuntimeMock.mockReturnValue(
      buildRuntime(buildProgress(), {
        screen: 'training',
      })
    );

    render(<KangurGameOperationSelectorWidget />);

    const art = screen.getByTestId('kangur-training-heading-art');
    const intro = art.closest('[data-testid="mock-operation-intro"]');
    const text = art.querySelector('text');

    expect(intro).not.toBeNull();
    expect(intro).toHaveTextContent('Training einrichten');
    expect(text).not.toBeNull();
    expect(text).toHaveTextContent('Training');
    expect(text).toHaveAttribute('font-size', '68');
    expect(text).not.toHaveAttribute('textLength');
    expect(text).not.toHaveAttribute('lengthAdjust');
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

  it('shows English quick practice cards when English lessons are available', () => {
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'english',
      setSubject: vi.fn(),
      subjectKey: 'learner-1',
    });
    lessonsState.value = [
      {
        id: 'kangur-lesson-english-sentence',
        componentId: 'english_sentence_structure',
        title: 'Składnia zdania',
        description: 'Szyk zdania',
        emoji: '🧩',
        color: 'kangur-gradient-accent-violet',
        activeBg: 'bg-violet-500',
        sortOrder: 1000,
        enabled: true,
        subject: 'english',
      },
      {
        id: 'kangur-lesson-english-pos',
        componentId: 'english_parts_of_speech',
        title: 'Części mowy',
        description: 'Zaimki i czasowniki',
        emoji: '🔤',
        color: 'kangur-gradient-accent-sky',
        activeBg: 'bg-sky-500',
        sortOrder: 2000,
        enabled: true,
        subject: 'english',
      },
    ];

    const runtime = buildRuntime(buildProgress());
    useKangurGameRuntimeMock.mockReturnValue(runtime);

    render(<KangurGameOperationSelectorWidget />);

    expect(
      screen.getByTestId('kangur-quick-practice-card-english_sentence_quiz')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('kangur-quick-practice-card-english_parts_of_speech_quiz')
    ).toBeInTheDocument();
  });

  it('hides math-only sections when the subject is English', () => {
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'english',
      setSubject: vi.fn(),
      subjectKey: 'learner-1',
    });
    const runtime = buildRuntime(buildProgress());
    useKangurGameRuntimeMock.mockReturnValue(runtime);

    render(<KangurGameOperationSelectorWidget />);

    expect(screen.queryByTestId('mock-operation-selector')).not.toBeInTheDocument();
    expect(screen.queryByTestId('kangur-game-training-top-section')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Szybkie ćwiczenia' })).toBeInTheDocument();
  });
});
