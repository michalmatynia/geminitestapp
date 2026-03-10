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

vi.mock('@/features/kangur/ui/context/KangurGameRuntimeContext', () => ({
  useKangurGameRuntime: useKangurGameRuntimeMock,
}));

vi.mock('@/features/kangur/ui/components/OperationSelector', () => ({
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

vi.mock('@/features/kangur/ui/components/KangurGameSetupMomentumCard', () => ({
  __esModule: true,
  default: ({ mode }: { mode: string }) => (
    <div data-testid={`mock-game-setup-momentum-${mode}`}>Mock setup momentum {mode}</div>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurPracticeAssignmentBanner', () => ({
  __esModule: true,
  default: () => <div data-testid='mock-practice-assignment-banner'>Mock assignment banner</div>,
}));

import { KangurGameKangurSetupWidget } from '@/features/kangur/ui/components/KangurGameKangurSetupWidget';
import { KangurGameOperationSelectorWidget } from '@/features/kangur/ui/components/KangurGameOperationSelectorWidget';
import { KangurGameTrainingSetupWidget } from '@/features/kangur/ui/components/KangurGameTrainingSetupWidget';

describe('Kangur game entry top sections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      'border-white/78',
      'bg-white/68',
      'text-center'
    );
    expect(screen.getByRole('heading', { name: 'Grajmy!' })).toHaveClass('text-3xl');
    expect(screen.getByTestId('kangur-grajmy-heading-art')).toBeInTheDocument();
    expect(
      screen.getByText('Wybierz rodzaj gry i przejdz od razu do matematycznej zabawy.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wróć do poprzedniej strony' })).toBeInTheDocument();
    expect(screen.getByTestId('mock-operation-selector')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Szybkie ćwiczenia' })).toBeInTheDocument();
    expect(screen.queryByText(/Cześć,/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Wróć do poprzedniej strony' }));

    expect(handleHome).toHaveBeenCalledTimes(1);
  });

  it('renders the shared top section for the Trening flow', () => {
    const handleHome = vi.fn();

    useKangurGameRuntimeMock.mockReturnValue({
      activePracticeAssignment: null,
      basePath: '/kangur',
      handleHome,
      handleStartTraining: vi.fn(),
      progress: {},
      screen: 'training',
    });

    render(<KangurGameTrainingSetupWidget />);

    expect(screen.getByTestId('kangur-game-training-top-section')).toHaveClass(
      'glass-panel',
      'border-white/78',
      'bg-white/68',
      'text-center'
    );
    expect(screen.getByRole('heading', { name: 'Trening' })).toHaveClass('text-3xl');
    expect(screen.getByTestId('kangur-training-heading-art')).toBeInTheDocument();
    expect(
      screen.getByText('Dobierz poziom, kategorie i liczbe pytan do jednej sesji.')
    ).toBeInTheDocument();
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

    expect(useKangurGameRuntimeMock.mock.results.at(-1)?.value.handleStartTraining).toHaveBeenCalledWith(
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

    fireEvent.click(screen.getByRole('button', { name: 'Wróć do poprzedniej strony' }));

    expect(handleHome).toHaveBeenCalledTimes(1);
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
      'border-white/78',
      'bg-white/68',
      'text-center'
    );
    expect(screen.getByRole('heading', { name: 'Kangur' })).toHaveClass('text-3xl');
    expect(screen.getByTestId('kangur-kangur-heading-art')).toBeInTheDocument();
    expect(
      screen.getByText('Wybierz edycje konkursu i zestaw zadan do rozwiazania.')
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
            'Latwiejszy zestaw treningowy pozwoli wejsc w formule Kangura bez zbyt ostrego progu trudnosci.',
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
