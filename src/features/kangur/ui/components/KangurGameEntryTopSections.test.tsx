/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { kangurSetupPropsMock, trainingSetupPropsMock, useKangurGameRuntimeMock } = vi.hoisted(() => ({
  kangurSetupPropsMock: vi.fn(),
  trainingSetupPropsMock: vi.fn(),
  useKangurGameRuntimeMock: vi.fn(),
}));

const { useKangurSubjectFocusMock } = vi.hoisted(() => ({
  useKangurSubjectFocusMock: vi.fn(),
}));

const lessonsState = vi.hoisted(() => ({
  value: [] as Array<Record<string, unknown>>,
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

vi.mock('@/features/kangur/ui/components/game-setup/OperationSelector', () => ({
  default: () => <div data-testid='mock-operation-selector'>Mock operation selector</div>,
}));

vi.mock('@/features/kangur/ui/components/TrainingSetup', () => ({
  default: (props: {
    onStart: (selection: {
      categories: ('addition' | 'subtraction')[];
      count: number;
      difficulty: 'easy';
    }) => void;
    suggestedSelection?: {
      categories: ('addition' | 'subtraction')[];
      count: number;
      difficulty: 'easy';
    } | null;
  }) => {
    trainingSetupPropsMock(props);
    return (
      <button
        data-testid='mock-training-setup'
        onClick={() =>
          props.onStart({
            categories: ['addition', 'subtraction'],
            count: 5,
            difficulty: 'easy',
          })
        }
        type='button'
      >
        Mock training setup
      </button>
    );
  },
}));

vi.mock('@/features/kangur/ui/components/KangurSetup', () => ({
  default: (props: { onStart: (mode: string) => void }) => {
    kangurSetupPropsMock(props);
    return (
      <button
        data-testid='mock-kangur-setup'
        onClick={() => props.onStart('training_3pt')}
        type='button'
      >
        Mock Kangur setup
      </button>
    );
  },
}));

vi.mock('@/features/kangur/ui/components/game-setup/KangurGameSetupMomentumCard', () => ({
  __esModule: true,
  default: ({ mode }: { mode: string }) => (
    <div data-testid={`mock-game-setup-momentum-${mode}`}>Mock setup momentum {mode}</div>
  ),
}));

vi.mock('@/features/kangur/ui/components/assignments/KangurPracticeAssignmentBanner', () => ({
  __esModule: true,
  default: () => <div data-testid='mock-practice-assignment-banner'>Mock assignment banner</div>,
}));

import { KangurGameKangurSetupWidget } from '@/features/kangur/ui/components/KangurGameKangurSetupWidget';
import { KangurGameOperationSelectorWidget } from '@/features/kangur/ui/components/game-setup/KangurGameOperationSelectorWidget';

describe('Kangur game entry top sections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('renders the shared top section for the Grajmy flow', () => {
    const handleHome = vi.fn();

    useKangurGameRuntimeMock.mockReturnValue({
      activePracticeAssignment: null,
      basePath: '/kangur',
      handleHome,
      handleSelectOperation: vi.fn(),
      playerName: 'Jan',
      practiceAssignmentsByOperation: {},
      progress: {
        activityStats: {},
        badges: [],
        bestWinStreak: 0,
        calendarPerfect: 0,
        clockPerfect: 0,
        currentWinStreak: 0,
        gamesPlayed: 0,
        geometryPerfect: 0,
        lessonMastery: {},
        lessonsCompleted: 0,
        operationsPlayed: [],
        perfectGames: 0,
        totalCorrectAnswers: 0,
        totalQuestionsAnswered: 0,
        totalXp: 0,
      },
      screen: 'operation',
      setScreen: vi.fn(),
    });

    render(<KangurGameOperationSelectorWidget />);

    expect(screen.getByTestId('kangur-game-operation-top-section')).toHaveClass(
      'glass-panel',
      'kangur-panel-soft',
      'kangur-glass-surface-mist-strong',
      'text-center'
    );
    expect(screen.getByRole('heading', { name: 'Grajmy!' })).toHaveClass(
      'text-2xl',
      'sm:text-3xl'
    );
    expect(screen.getByTestId('kangur-grajmy-heading-art')).toBeInTheDocument();
    expect(
      screen.getByText('Wybierz rodzaj gry i przejdz od razu do matematycznej zabawy.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wróć do poprzedniej strony' })).toBeInTheDocument();
    expect(screen.getByTestId('mock-operation-selector')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Szybkie cwiczenia' })).toBeInTheDocument();
    expect(screen.getByTestId('kangur-game-training-top-section')).toBeInTheDocument();
    expect(screen.getByTestId('mock-training-setup')).toBeInTheDocument();
    expect(screen.queryByText(/Cześć,/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Wróć do poprzedniej strony' }));

    expect(handleHome).toHaveBeenCalledTimes(1);
  });

  it('surfaces the training setup inside Grajmy and forwards the recommended selection', () => {
    const handleStartTraining = vi.fn();

    useKangurGameRuntimeMock.mockReturnValue({
      activePracticeAssignment: null,
      basePath: '/kangur',
      handleHome: vi.fn(),
      handleSelectOperation: vi.fn(),
      handleStartTraining,
      practiceAssignmentsByOperation: {},
      progress: {},
      screen: 'training',
      setScreen: vi.fn(),
    });

    render(<KangurGameOperationSelectorWidget />);

    expect(screen.getByTestId('kangur-game-training-top-section')).toBeInTheDocument();
    expect(screen.getByTestId('mock-game-setup-momentum-training')).toBeInTheDocument();
    expect(screen.getByTestId('mock-training-setup')).toBeInTheDocument();
    expect(trainingSetupPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        suggestedSelection: {
          categories: ['addition', 'subtraction'],
          count: 5,
          difficulty: 'easy',
        },
        suggestionLabel: 'Start',
        suggestionTitle: 'Polecany trening na start',
      })
    );

    fireEvent.click(screen.getByTestId('mock-training-setup'));

    expect(handleStartTraining).toHaveBeenCalledWith(
      {
        categories: ['addition', 'subtraction'],
        count: 5,
        difficulty: 'easy',
      },
      {
        recommendation: {
          description:
            'Lagodny start z dwiema kategoriami pomoze zlapac rytm bez przeciazenia na pierwszej sesji.',
          label: 'Start',
          source: 'training_setup',
          title: 'Polecany trening na start',
        },
      }
    );
  });

  it('renders the shared top section for the Kangur flow', () => {
    const handleHome = vi.fn();

    useKangurGameRuntimeMock.mockReturnValue({
      handleHome,
      handleStartKangur: vi.fn(),
      progress: {},
      screen: 'kangur_setup',
    });

    render(<KangurGameKangurSetupWidget />);

    expect(screen.getByTestId('kangur-game-kangur-setup-top-section')).toHaveClass(
      'glass-panel',
      'kangur-panel-soft',
      'kangur-glass-surface-mist-strong',
      'text-center'
    );
    expect(
      screen.getByRole('heading', { name: 'Konfiguracja sesji StudiQ Matematycznego' })
    ).toHaveClass(
      'text-2xl',
      'sm:text-3xl'
    );
    expect(screen.getByTestId('kangur-kangur-heading-art')).toBeInTheDocument();
    expect(
      screen.getByText('Przygotuj sesję StudiQ Matematycznego.')
    ).toBeInTheDocument();
    expect(screen.getByTestId('mock-game-setup-momentum-kangur')).toBeInTheDocument();
    expect(screen.getByTestId('mock-kangur-setup')).toBeInTheDocument();
    expect(kangurSetupPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        recommendedLabel: 'Lagodny start',
        recommendedMode: 'training_3pt',
        recommendedTitle: 'Polecamy zaczac od treningu 3-punktowego',
      })
    );

    fireEvent.click(screen.getByTestId('mock-kangur-setup'));

    expect(useKangurGameRuntimeMock.mock.results.at(-1)?.value.handleStartKangur).toHaveBeenCalledWith(
      'training_3pt',
      {
        recommendation: {
          description:
            'Latwiejszy zestaw treningowy pozwoli wejsc w formule StudiQ bez zbyt ostrego progu trudnosci.',
          label: 'Lagodny start',
          source: 'kangur_setup',
          title: 'Polecamy zaczac od treningu 3-punktowego',
        },
      }
    );

    fireEvent.click(screen.getByRole('button', { name: 'Wróć do poprzedniej strony' }));

    expect(handleHome).toHaveBeenCalledTimes(1);
  });
});
