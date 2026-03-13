import { createRef } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KangurActiveLessonHeader } from '@/features/kangur/ui/components/KangurActiveLessonHeader';
import { KangurLessonNavigationWidget } from '@/features/kangur/ui/components/KangurLessonNavigationWidget';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';

import ClockLesson from '../ClockLesson';

const addXpMock = vi.fn();
const loadProgressMock = vi.fn(() => ({
  lessonsCompleted: 0,
  lessonMastery: {},
}));

vi.mock('@/features/kangur/ui/components/ClockTrainingGame', () => ({
  __esModule: true,
  default: ({
    completionPrimaryActionLabel,
    initialMode = 'practice',
    onCompletionPrimaryAction,
    onFinish,
    onPracticeCompleted,
    onPracticeSuccess,
    onChallengeSuccess,
    practiceTasks,
    section,
    showTimeDisplay = true,
  }: {
    completionPrimaryActionLabel?: string;
    initialMode?: 'practice' | 'challenge';
    onCompletionPrimaryAction?: () => void;
    onFinish: () => void;
    onPracticeCompleted?: (result: { correctCount: number; totalCount: number }) => void;
    onPracticeSuccess?: () => void;
    onChallengeSuccess?: (result: {
      correctCount: number;
      medal: 'gold' | 'silver' | 'bronze';
      totalCount: number;
    }) => void;
    practiceTasks?: Array<{ hours: number; minutes: number }>;
    section?: string;
    showTimeDisplay?: boolean;
  }): React.JSX.Element => (
    <div data-testid='mock-clock-training-game'>
      <span data-testid='mock-clock-training-section'>{section ?? 'mixed'}</span>
      <span data-testid='mock-clock-training-mode'>{initialMode}</span>
      <span data-testid='mock-clock-training-show-time-display'>
        {showTimeDisplay ? 'visible' : 'hidden'}
      </span>
      <span data-testid='mock-clock-training-target'>
        {practiceTasks?.[0]
          ? `${practiceTasks[0].hours}:${String(practiceTasks[0].minutes).padStart(2, '0')}`
          : 'random'}
      </span>
      <button
        type='button'
        onClick={() => {
          onPracticeSuccess?.();
          onPracticeCompleted?.({ correctCount: 5, totalCount: 5 });
        }}
      >
        Complete practice
      </button>
      {completionPrimaryActionLabel && initialMode === 'challenge' ? (
        <button type='button' onClick={onCompletionPrimaryAction}>
          {completionPrimaryActionLabel}
        </button>
      ) : null}
      <button
        type='button'
        onClick={() =>
          onChallengeSuccess?.({
            correctCount: 5,
            medal: 'gold',
            totalCount: 5,
          })
        }
      >
        Complete challenge
      </button>
      <button type='button' onClick={onFinish}>
        Finish training
      </button>
    </div>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurLessonNarrator', () => ({
  KangurLessonNarrator: () => <div data-testid='kangur-lesson-narrator' />,
}));

vi.mock('@/features/kangur/ui/services/progress', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/ui/services/progress')>();
  return {
    ...actual,
    addXp: (...args: unknown[]): unknown => addXpMock(...args),
    loadProgress: (): unknown => loadProgressMock(),
    createLessonCompletionReward: vi.fn(() => ({
      xp: 32,
      scorePercent: 100,
      progressUpdates: {},
    })),
  };
});

describe('ClockLesson section hub layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders clock sections as lesson hub cards like Dodawanie', () => {
    render(<ClockLesson />);

    expect(screen.getByTestId('lesson-hub-section-hours')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-section-minutes')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-section-combined')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-section-game_hours')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-section-game_minutes')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-section-game_combined')).toBeInTheDocument();
    expect(screen.getByText('Godziny')).toBeInTheDocument();
    expect(screen.getByText('Minuty')).toBeInTheDocument();
    expect(screen.getByText('Łączenie wskazówek')).toBeInTheDocument();
    expect(screen.getByText('Ćwiczenie: Godziny')).toBeInTheDocument();
    expect(screen.getByText('Ćwiczenie: Minuty')).toBeInTheDocument();
    expect(screen.getByText('Ćwiczenie: Pełny czas')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-progress-hours')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-progress-minutes')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-progress-combined')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-progress-dot-hours-0')).toHaveClass(
      'kangur-step-pill-pending'
    );
    expect(screen.getByTestId('lesson-hub-progress-dot-minutes-0')).toHaveClass(
      'kangur-step-pill-pending'
    );
    expect(screen.getByTestId('lesson-hub-progress-game_hours')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-progress-dot-game_hours-0')).toHaveClass(
      'kangur-step-pill-pending'
    );
    expect(screen.getByTestId('lesson-hub-progress-dot-game_hours-1')).toHaveClass(
      'kangur-step-pill-pending'
    );
    expect(screen.getByTestId('lesson-hub-progress-dot-game_hours-2')).toHaveClass(
      'kangur-step-pill-pending'
    );
  });

  it('opens the selected section and returns to topics', async () => {
    render(<ClockLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-hours'));

    await waitFor(() => {
      expect(screen.getByText('Co pokazuje krótka wskazówka?')).toBeInTheDocument();
    });
    expect(screen.getByTestId('lesson-slide-shell')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lesson-slide-indicator-1'));

    await waitFor(() => {
      expect(screen.getByText('Pełne godziny (:00)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Wróć do tematów' }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-hours')).toBeInTheDocument();
    });
  });

  it('updates hub progress after viewing more slides in a section', async () => {
    render(<ClockLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-hours'));

    await waitFor(() => {
      expect(screen.getByText('Co pokazuje krótka wskazówka?')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('lesson-slide-indicator-2'));

    await waitFor(() => {
      expect(screen.getByText('Szybki test godzin')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Wróć do tematów' }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-hours')).toBeInTheDocument();
    });

    expect(screen.getByTestId('lesson-hub-progress-dot-hours-0')).toHaveClass('bg-indigo-200');
    expect(screen.getByTestId('lesson-hub-progress-dot-hours-1')).toHaveClass('bg-indigo-200');
    expect(screen.getByTestId('lesson-hub-progress-dot-hours-2')).toHaveClass('bg-indigo-200');
    expect(screen.getByTestId('lesson-hub-progress-dot-minutes-0')).toHaveClass(
      'kangur-step-pill-pending'
    );
  });

  it('shows the first hours practice panel as the last step of the Godziny subsection', async () => {
    render(<ClockLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-hours'));

    await waitFor(() => {
      expect(screen.getByText('Co pokazuje krótka wskazówka?')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('lesson-slide-indicator-3'));

    await waitFor(() => {
      expect(screen.getByText('Ćwiczenie: Godziny')).toBeInTheDocument();
    });

    expect(screen.getByTestId('mock-clock-training-game')).toBeInTheDocument();
    expect(screen.getByTestId('mock-clock-training-section')).toHaveTextContent('hours');
    expect(screen.getByTestId('mock-clock-training-mode')).toHaveTextContent('practice');
    expect(screen.getByTestId('mock-clock-training-target')).toHaveTextContent('3:00');
    expect(screen.getByTestId('mock-clock-training-show-time-display')).toHaveTextContent(
      'visible'
    );
  });

  it('shows the first minutes practice panel as the last step of the Minuty subsection', async () => {
    render(<ClockLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-minutes'));

    await waitFor(() => {
      expect(screen.getByText('Co pokazuje długa wskazówka?')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('lesson-slide-indicator-3'));

    await waitFor(() => {
      expect(screen.getByText('Ćwiczenie: Minuty')).toBeInTheDocument();
    });

    expect(screen.getByTestId('mock-clock-training-game')).toBeInTheDocument();
    expect(screen.getByTestId('mock-clock-training-section')).toHaveTextContent('minutes');
    expect(screen.getByTestId('mock-clock-training-mode')).toHaveTextContent('practice');
    expect(screen.getByTestId('mock-clock-training-target')).toHaveTextContent('12:15');
    expect(screen.getByTestId('mock-clock-training-show-time-display')).toHaveTextContent(
      'visible'
    );
  });

  it('keeps the combined section locked until hours and minutes are completed', async () => {
    render(<ClockLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-combined'));

    expect(screen.getByTestId('lesson-hub-section-combined')).toBeDisabled();
    expect(screen.queryByText('Jak łączyć obie wskazówki?')).toBeNull();

    fireEvent.click(screen.getByTestId('lesson-hub-section-hours'));
    await waitFor(() => {
      expect(screen.getByText('Co pokazuje krótka wskazówka?')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('lesson-slide-indicator-3'));
    await waitFor(() => {
      expect(screen.getByText('Ćwiczenie: Godziny')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Wróć do tematów' }));
    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-minutes')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('lesson-hub-section-minutes'));
    await waitFor(() => {
      expect(screen.getByText('Co pokazuje długa wskazówka?')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('lesson-slide-indicator-3'));
    await waitFor(() => {
      expect(screen.getByText('Ćwiczenie: Minuty')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Wróć do tematów' }));
    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-combined')).toBeInTheDocument();
    });

    expect(screen.getByTestId('lesson-hub-section-combined')).not.toBeDisabled();

    fireEvent.click(screen.getByTestId('lesson-hub-section-combined'));

    await waitFor(() => {
      expect(screen.getByText('Jak łączyć obie wskazówki?')).toBeInTheDocument();
    });
  });

  it('opens the dedicated training cards and returns to the hub on finish', async () => {
    render(<ClockLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_minutes'));

    await waitFor(() => {
      expect(screen.getByTestId('clock-lesson-training-shell')).toBeInTheDocument();
    });
    expect(
      within(screen.getByTestId('clock-lesson-training-shell')).queryByText('Ćwiczenie: Minuty')
    ).toBeNull();
    expect(screen.getByTestId('mock-clock-training-game')).toBeInTheDocument();
    expect(screen.getByTestId('mock-clock-training-section')).toHaveTextContent('minutes');
    expect(screen.getByTestId('mock-clock-training-mode')).toHaveTextContent('practice');
    expect(loadProgressMock).not.toHaveBeenCalled();
    expect(addXpMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('clock-lesson-training-panel-learn')).toHaveAttribute(
      'aria-current',
      'step'
    );
    expect(screen.queryByTestId('clock-lesson-training-panel-challenge')).toBeNull();

    fireEvent.click(screen.getByTestId('clock-lesson-training-next-button'));

    await waitFor(() => {
      expect(screen.getByTestId('clock-lesson-training-panel-pick_one')).toHaveAttribute(
        'aria-current',
        'step'
      );
    });
    expect(screen.getByTestId('mock-clock-training-target')).toHaveTextContent('12:35');

    fireEvent.click(screen.getByTestId('clock-lesson-training-prev-button'));

    await waitFor(() => {
      expect(screen.getByTestId('mock-clock-training-mode')).toHaveTextContent('practice');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Finish training' }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-game_minutes')).toBeInTheDocument();
    });
  });

  it('warns before leaving challenge mode back to topics', async () => {
    render(<ClockLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_hours'));

    await waitFor(() => {
      expect(screen.getByTestId('mock-clock-training-mode')).toHaveTextContent('practice');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Complete practice' }));
    await waitFor(() => {
      expect(screen.getByTestId('mock-clock-training-target')).toHaveTextContent('7:00');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Complete practice' }));
    await waitFor(() => {
      expect(screen.getByTestId('mock-clock-training-target')).toHaveTextContent('11:00');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Complete practice' }));

    await waitFor(() => {
      expect(screen.getByTestId('clock-lesson-training-panel-challenge')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Otwórz wyzwanie' })).toBeNull();
    await waitFor(() => {
      expect(screen.getByTestId('mock-clock-training-mode')).toHaveTextContent('challenge');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Wróć do tematów' }));

    expect(screen.getByText('Opuścić wyzwanie?')).toBeInTheDocument();
    expect(
      within(screen.getByRole('alertdialog')).getAllByText(
        'Jeśli opuścisz Tryb Wyzwanie teraz, to wyzwanie zostanie niezaliczone.'
      )
    ).toHaveLength(2);
    expect(screen.getByTestId('clock-lesson-training-shell')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Zostań' }));

    await waitFor(() => {
      expect(screen.queryByText('Opuścić wyzwanie?')).toBeNull();
    });
    expect(screen.getByTestId('mock-clock-training-mode')).toHaveTextContent('challenge');

    fireEvent.click(screen.getByRole('button', { name: 'Wróć do tematów' }));
    fireEvent.click(screen.getByRole('button', { name: 'Opuść wyzwanie' }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-game_hours')).toBeInTheDocument();
    });
  });

  it('auto-advances to the second panel after completing the first practice round', async () => {
    render(<ClockLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_hours'));

    await waitFor(() => {
      expect(screen.getByTestId('mock-clock-training-target')).toHaveTextContent('3:00');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Complete practice' }));

    await waitFor(() => {
      expect(screen.getByTestId('clock-lesson-training-panel-pick_one')).toHaveAttribute(
        'aria-current',
        'step'
      );
    });
    expect(screen.getByTestId('clock-lesson-training-panel-learn')).toHaveClass('bg-indigo-300');
    expect(screen.queryByRole('button', { name: 'Zakończ lekcję ✅' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Następne zadanie' })).toBeNull();
    expect(screen.getByTestId('mock-clock-training-target')).toHaveTextContent('7:00');
  });

  it('auto-advances to the third panel after completing the second practice round', async () => {
    render(<ClockLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_hours'));

    await waitFor(() => {
      expect(screen.getByTestId('mock-clock-training-target')).toHaveTextContent('3:00');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Complete practice' }));

    await waitFor(() => {
      expect(screen.getByTestId('mock-clock-training-target')).toHaveTextContent('7:00');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Complete practice' }));

    await waitFor(() => {
      expect(screen.getByTestId('clock-lesson-training-panel-pick_two')).toHaveAttribute(
        'aria-current',
        'step'
      );
    });
    expect(screen.getByTestId('clock-lesson-training-panel-pick_one')).toHaveClass(
      'bg-indigo-300'
    );
    expect(screen.queryByRole('button', { name: 'Zakończ lekcję ✅' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Następne zadanie' })).toBeNull();
    expect(screen.getByTestId('mock-clock-training-target')).toHaveTextContent('11:00');
  });

  it('hides the blue time readout after the first practice panel and in challenge mode', async () => {
    render(<ClockLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_hours'));

    await waitFor(() => {
      expect(screen.getByTestId('mock-clock-training-show-time-display')).toHaveTextContent(
        'visible'
      );
    });

    fireEvent.click(screen.getByTestId('clock-lesson-training-next-button'));

    await waitFor(() => {
      expect(screen.getByTestId('clock-lesson-training-panel-pick_one')).toHaveAttribute(
        'aria-current',
        'step'
      );
    });
    expect(screen.getByTestId('mock-clock-training-show-time-display')).toHaveTextContent(
      'hidden'
    );

    fireEvent.click(screen.getByTestId('clock-lesson-training-panel-learn'));
    await waitFor(() => {
      expect(screen.getByTestId('clock-lesson-training-panel-learn')).toHaveAttribute(
        'aria-current',
        'step'
      );
    });
    fireEvent.click(screen.getByRole('button', { name: 'Complete practice' }));

    await waitFor(() => {
      expect(screen.getByTestId('clock-lesson-training-panel-pick_one')).toHaveAttribute(
        'aria-current',
        'step'
      );
    });
    fireEvent.click(screen.getByRole('button', { name: 'Complete practice' }));
    await waitFor(() => {
      expect(screen.getByTestId('clock-lesson-training-panel-pick_two')).toHaveAttribute(
        'aria-current',
        'step'
      );
    });
    fireEvent.click(screen.getByRole('button', { name: 'Complete practice' }));

    await waitFor(() => {
      expect(screen.getByTestId('clock-lesson-training-panel-challenge')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Otwórz wyzwanie' })).toBeNull();

    await waitFor(() => {
      expect(screen.getByTestId('mock-clock-training-mode')).toHaveTextContent('challenge');
    });
    expect(screen.getByTestId('mock-clock-training-show-time-display')).toHaveTextContent(
      'hidden'
    );
  });

  it('reveals the challenge pill after winning the third practice panel', async () => {
    render(<ClockLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_hours'));

    await waitFor(() => {
      expect(screen.getByTestId('mock-clock-training-target')).toHaveTextContent('3:00');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Complete practice' }));

    await waitFor(() => {
      expect(screen.getByTestId('mock-clock-training-target')).toHaveTextContent('7:00');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Complete practice' }));

    await waitFor(() => {
      expect(screen.getByTestId('mock-clock-training-target')).toHaveTextContent('11:00');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Complete practice' }));

    await waitFor(() => {
      expect(screen.getByTestId('clock-lesson-training-panel-challenge')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Otwórz wyzwanie' })).toBeNull();
    expect(screen.getByTestId('mock-clock-training-mode')).toHaveTextContent('challenge');
  });

  it('warns before switching away from the challenge panel', async () => {
    render(<ClockLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_hours'));

    await waitFor(() => {
      expect(screen.getByTestId('mock-clock-training-mode')).toHaveTextContent('practice');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Complete practice' }));
    await waitFor(() => {
      expect(screen.getByTestId('mock-clock-training-target')).toHaveTextContent('7:00');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Complete practice' }));
    await waitFor(() => {
      expect(screen.getByTestId('mock-clock-training-target')).toHaveTextContent('11:00');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Complete practice' }));

    await waitFor(() => {
      expect(screen.getByTestId('clock-lesson-training-panel-challenge')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByTestId('mock-clock-training-mode')).toHaveTextContent('challenge');
    });

    fireEvent.click(screen.getByTestId('clock-lesson-training-prev-button'));

    expect(screen.getByText('Opuścić wyzwanie?')).toBeInTheDocument();
    expect(screen.getByTestId('mock-clock-training-mode')).toHaveTextContent('challenge');

    fireEvent.click(screen.getByRole('button', { name: 'Opuść wyzwanie' }));

    await waitFor(() => {
      expect(screen.getByTestId('clock-lesson-training-panel-pick_two')).toHaveAttribute(
        'aria-current',
        'step'
      );
    });
  });

  it('hides lesson-to-lesson navigation while a clock training game is active', async () => {
    render(
      <KangurLessonNavigationProvider onBack={vi.fn()}>
        <ClockLesson />
        <KangurLessonNavigationWidget
          nextLesson={{
            id: 'lesson-calendar',
            emoji: '📅',
            title: 'Nauka kalendarza',
          }}
          onSelectLesson={vi.fn()}
        />
      </KangurLessonNavigationProvider>
    );

    expect(screen.getByRole('button', { name: /Nauka kalendarza/i })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_hours'));

    await waitFor(() => {
      expect(screen.getByTestId('clock-lesson-training-shell')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /Nauka kalendarza/i })).not.toBeInTheDocument();
  });

  it('updates the shared top header when opening a game subsection', async () => {
    const lessonContentRef = createRef<HTMLDivElement>();

    render(
      <KangurLessonNavigationProvider onBack={vi.fn()}>
        <KangurActiveLessonHeader
          backButtonLabel='Wróć do listy lekcji'
          completedChipTestId='clock-header-completed'
          completedActiveLessonAssignment={null}
          headerActionsTestId='clock-header-actions'
          headerTestId='clock-header'
          iconTestId='clock-header-icon'
          lesson={{
            activeBg: 'bg-indigo-500',
            color: 'from-indigo-400 to-purple-500',
            componentId: 'clock',
            contentMode: 'component',
            description: 'Odczytuj godziny z zegara analogowego',
            emoji: '🕐',
            enabled: true,
            id: 'kangur-lesson-clock',
            sortOrder: 1000,
            title: 'Nauka zegara',
          }}
          lessonContentRef={lessonContentRef}
          lessonDocument={{ blocks: [], version: 1 }}
          priorityChipTestId='clock-header-priority'
        />
        <ClockLesson />
      </KangurLessonNavigationProvider>
    );

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_hours'));

    await waitFor(() => {
      expect(screen.getByTestId('clock-lesson-training-shell')).toBeInTheDocument();
    });

    const topHeader = screen.getByTestId('clock-header');

    expect(topHeader).toBeInTheDocument();
    expect(within(topHeader).getByText('Gra')).toBeInTheDocument();
    expect(within(topHeader).getByText('Ćwiczenie: Godziny')).toBeInTheDocument();
    expect(
      within(topHeader).getByText('Trenuj pełne godziny i krótką wskazówkę')
    ).toBeInTheDocument();
    expect(within(topHeader).getByText('🎯')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('clock-lesson-training-shell')).queryByText('Ćwiczenie: Godziny')
    ).toBeNull();
    expect(
      within(screen.getByTestId('clock-lesson-training-shell')).queryByText(
        'Trenuj pełne godziny i krótką wskazówkę'
      )
    ).toBeNull();
  });

  it('does not award lesson completion xp twice when switching training sections', async () => {
    render(<ClockLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_hours'));

    await waitFor(() => {
      expect(screen.getByTestId('mock-clock-training-section')).toHaveTextContent('hours');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Finish training' }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-game_combined')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_combined'));

    await waitFor(() => {
      expect(screen.getByTestId('mock-clock-training-section')).toHaveTextContent('combined');
    });

    expect(addXpMock).not.toHaveBeenCalled();
  });

  it('uses top-right pills only for panels inside the active clock game', async () => {
    render(<ClockLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_hours'));

    await waitFor(() => {
      expect(screen.getByTestId('mock-clock-training-section')).toHaveTextContent('hours');
    });

    expect(screen.getByTestId('clock-lesson-training-panel-learn')).toBeInTheDocument();
    expect(screen.getByTestId('clock-lesson-training-panel-pick_one')).toBeInTheDocument();
    expect(screen.getByTestId('clock-lesson-training-panel-pick_two')).toBeInTheDocument();
    expect(screen.queryByTestId('clock-lesson-training-panel-challenge')).toBeNull();
    expect(screen.queryByTestId('clock-lesson-training-indicator-0')).toBeNull();
    expect(screen.queryByTestId('clock-lesson-training-indicator-1')).toBeNull();
    expect(screen.queryByTestId('clock-lesson-training-indicator-2')).toBeNull();

    fireEvent.click(screen.getByTestId('clock-lesson-training-panel-pick_one'));

    await waitFor(() => {
      expect(screen.getByTestId('clock-lesson-training-panel-pick_one')).toHaveAttribute(
        'aria-current',
        'step'
      );
    });
    expect(screen.getByTestId('mock-clock-training-target')).toHaveTextContent('7:00');
  });

  it('fills the challenge pill only after challenge mode completes successfully', async () => {
    render(<ClockLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_hours'));

    await waitFor(() => {
      expect(screen.getByTestId('mock-clock-training-mode')).toHaveTextContent('practice');
    });

    expect(screen.queryByTestId('clock-lesson-training-panel-challenge')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Complete practice' }));
    await waitFor(() => {
      expect(screen.getByTestId('mock-clock-training-target')).toHaveTextContent('7:00');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Complete practice' }));
    await waitFor(() => {
      expect(screen.getByTestId('mock-clock-training-target')).toHaveTextContent('11:00');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Complete practice' }));

    await waitFor(() => {
      expect(screen.getByTestId('clock-lesson-training-panel-challenge')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Otwórz wyzwanie' })).toBeNull();

    await waitFor(() => {
      expect(screen.getByTestId('mock-clock-training-mode')).toHaveTextContent('challenge');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Complete challenge' }));

    await waitFor(() => {
      expect(screen.getByTestId('clock-lesson-training-panel-challenge')).toHaveClass(
        'bg-yellow-400'
      );
    });

    fireEvent.click(screen.getByTestId('clock-lesson-training-panel-learn'));

    await waitFor(() => {
      expect(screen.getByText('Opuścić wyzwanie?')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Opuść wyzwanie' }));
    await waitFor(() => {
      expect(screen.getByTestId('mock-clock-training-mode')).toHaveTextContent('practice');
    });

    expect(screen.getByTestId('clock-lesson-training-panel-challenge')).toHaveClass(
      'bg-yellow-400'
    );
  });

  it('darkens the first three game pills as panels are completed and reveals challenge only after the third win', async () => {
    render(<ClockLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_hours'));

    await waitFor(() => {
      expect(screen.getByTestId('mock-clock-training-mode')).toHaveTextContent('practice');
    });

    expect(screen.queryByTestId('clock-lesson-training-panel-challenge')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Complete practice' }));

    await waitFor(() => {
      expect(screen.getByTestId('clock-lesson-training-panel-learn')).toHaveClass('bg-indigo-300');
    });
    expect(screen.queryByTestId('clock-lesson-training-panel-challenge')).toBeNull();
    expect(screen.getByTestId('mock-clock-training-target')).toHaveTextContent('7:00');

    fireEvent.click(screen.getByRole('button', { name: 'Complete practice' }));

    await waitFor(() => {
      expect(screen.getByTestId('clock-lesson-training-panel-pick_one')).toHaveClass(
        'bg-indigo-300'
      );
    });
    expect(screen.queryByTestId('clock-lesson-training-panel-challenge')).toBeNull();
    expect(screen.getByTestId('mock-clock-training-target')).toHaveTextContent('11:00');

    fireEvent.click(screen.getByRole('button', { name: 'Complete practice' }));

    await waitFor(() => {
      expect(screen.getByTestId('clock-lesson-training-panel-challenge')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Otwórz wyzwanie' })).toBeNull();

    expect(screen.getByTestId('clock-lesson-training-panel-challenge')).toHaveAttribute(
      'aria-current',
      'step'
    );
    expect(screen.getByTestId('clock-lesson-training-panel-pick_two')).toHaveClass(
      'bg-indigo-300'
    );
  });

  it('does not reveal challenge before the third practice panel is completed', async () => {
    render(<ClockLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_hours'));

    await waitFor(() => {
      expect(screen.getByTestId('mock-clock-training-mode')).toHaveTextContent('practice');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Complete practice' }));

    await waitFor(() => {
      expect(screen.getByTestId('mock-clock-training-target')).toHaveTextContent('7:00');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Complete practice' }));
    await waitFor(() => {
      expect(screen.getByTestId('clock-lesson-training-panel-pick_one')).toHaveClass(
        'bg-indigo-300'
      );
    });
    expect(screen.getByTestId('clock-lesson-training-panel-pick_two')).toHaveAttribute(
      'aria-current',
      'step'
    );
    expect(screen.queryByTestId('clock-lesson-training-panel-challenge')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Otwórz wyzwanie' })).toBeNull();
  });

  it('keeps the orange challenge pill available after unlocking the challenge', async () => {
    render(<ClockLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_hours'));

    await waitFor(() => {
      expect(screen.getByTestId('mock-clock-training-mode')).toHaveTextContent('practice');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Complete practice' }));
    await waitFor(() => {
      expect(screen.getByTestId('mock-clock-training-target')).toHaveTextContent('7:00');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Complete practice' }));
    await waitFor(() => {
      expect(screen.getByTestId('mock-clock-training-target')).toHaveTextContent('11:00');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Complete practice' }));

    expect(screen.getByTestId('clock-lesson-training-panel-challenge')).toBeInTheDocument();
    expect(screen.getByTestId('clock-lesson-training-panel-challenge')).toHaveAttribute(
      'aria-current',
      'step'
    );
    expect(screen.queryByRole('button', { name: 'Otwórz wyzwanie' })).toBeNull();

    await waitFor(() => {
      expect(screen.getByTestId('mock-clock-training-mode')).toHaveTextContent('challenge');
    });
  });

  it('mirrors completed clock game panels in the lesson overview pills', async () => {
    render(<ClockLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_hours'));

    await waitFor(() => {
      expect(screen.getByTestId('mock-clock-training-mode')).toHaveTextContent('practice');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Complete practice' }));
    fireEvent.click(screen.getByRole('button', { name: 'Wróć do tematów' }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-game_hours')).toBeInTheDocument();
    });

    expect(screen.getByTestId('lesson-hub-progress-dot-game_hours-0')).toHaveClass('bg-indigo-200');
    expect(screen.getByTestId('lesson-hub-progress-dot-game_hours-1')).toHaveClass(
      'kangur-step-pill-pending'
    );
    expect(screen.getByTestId('lesson-hub-progress-dot-game_hours-2')).toHaveClass(
      'kangur-step-pill-pending'
    );
  });

  it('does not show a trophy reward in the combined subsection summary slide', async () => {
    render(<ClockLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-hours'));
    await waitFor(() => {
      expect(screen.getByText('Co pokazuje krótka wskazówka?')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('lesson-slide-indicator-3'));
    fireEvent.click(screen.getByRole('button', { name: 'Wróć do tematów' }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-minutes')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('lesson-hub-section-minutes'));
    await waitFor(() => {
      expect(screen.getByText('Co pokazuje długa wskazówka?')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('lesson-slide-indicator-3'));
    fireEvent.click(screen.getByRole('button', { name: 'Wróć do tematów' }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-combined')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('lesson-hub-section-combined'));
    await waitFor(() => {
      expect(screen.getByText('Jak łączyć obie wskazówki?')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('lesson-slide-indicator-2'));

    await waitFor(() => {
      expect(screen.getByText('Gotowy/a na ćwiczenie')).toBeInTheDocument();
    });

    expect(screen.queryByText('🏆')).toBeNull();
    expect(screen.getByText('✨')).toBeInTheDocument();
  });
});
