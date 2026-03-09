import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ClockLesson from '../ClockLesson';

const addXpMock = vi.fn();
const loadProgressMock = vi.fn(() => ({
  lessonsCompleted: 0,
  lessonMastery: {},
}));

vi.mock('@/features/kangur/ui/components/ClockTrainingGame', () => ({
  __esModule: true,
  default: ({
    onFinish,
    section,
  }: {
    onFinish: () => void;
    section?: string;
  }): React.JSX.Element => (
    <div data-testid='mock-clock-training-game'>
      <span data-testid='mock-clock-training-section'>{section ?? 'mixed'}</span>
      <button type='button' onClick={onFinish}>
        Finish training
      </button>
    </div>
  ),
}));

vi.mock('@/features/kangur/ui/services/progress', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/ui/services/progress')>();
  return {
    ...actual,
    addXp: (...args: unknown[]): unknown => addXpMock(...args),
    loadProgress: (): unknown => loadProgressMock(),
    XP_REWARDS: {
      lesson_completed: 40,
    },
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
    expect(screen.queryByTestId('lesson-hub-progress-game_hours')).toBeNull();
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

  it('lets learners open the combined section directly from the hub', async () => {
    render(<ClockLesson />);

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
    expect(screen.getByTestId('clock-lesson-training-header')).toBeInTheDocument();
    expect(screen.getByText('Ćwiczenie: Minuty')).toBeInTheDocument();
    expect(screen.getByTestId('mock-clock-training-game')).toBeInTheDocument();
    expect(screen.getByTestId('mock-clock-training-section')).toHaveTextContent('minutes');
    expect(loadProgressMock).toHaveBeenCalledTimes(1);
    expect(addXpMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Finish training' }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-game_minutes')).toBeInTheDocument();
    });
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

    expect(addXpMock).toHaveBeenCalledTimes(1);
  });
});
