/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => ({
    isAuthenticated: true,
    user: { actorType: 'learner', ownerUserId: 'parent-1' },
  }),
}));

import { KangurLessonNavigationWidget } from '@/features/kangur/ui/components/KangurLessonNavigationWidget';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';

import CalendarLesson from '@/features/kangur/ui/components/CalendarLesson';

const addXpMock = vi.fn();
const loadProgressMock = vi.fn(() => ({
  lessonsCompleted: 0,
  lessonMastery: {},
}));

vi.mock('@/features/kangur/ui/components/CalendarInteractiveGame', () => ({
  __esModule: true,
  default: ({
    onFinish,
    section,
  }: {
    onFinish: () => void;
    section?: string;
  }): React.JSX.Element => (
    <div data-testid='mock-calendar-interactive-game'>
      <span data-testid='mock-calendar-interactive-section'>{section ?? 'mixed'}</span>
      <button type='button' onClick={onFinish}>
        Finish calendar training
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
    createLessonCompletionReward: vi.fn(() => ({
      xp: 28,
      scorePercent: 60,
      progressUpdates: {},
    })),
  };
});

describe('CalendarLesson section hub layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders calendar sections as a lesson hub with dedicated training cards', () => {
    render(<CalendarLesson />);

    expect(screen.getByTestId('lesson-hub-section-intro')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-section-dni')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-section-miesiace')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-section-data')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-section-game_days')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-section-game_months')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-section-game_dates')).toBeInTheDocument();
    expect(screen.getByText('Ćwiczenie: Dni tygodnia')).toBeInTheDocument();
    expect(screen.getByText('Ćwiczenie: Miesiące')).toBeInTheDocument();
    expect(screen.getByText('Ćwiczenie: Daty')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-progress-intro')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-progress-dni')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-progress-miesiace')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-progress-data')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-progress-game_days')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-progress-dot-game_days-0')).toHaveClass(
      'kangur-step-pill-pending'
    );
  });

  it('opens a lesson section and returns to topics', async () => {
    render(<CalendarLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-miesiace'));

    await waitFor(() => {
      expect(screen.getByText('12 miesięcy roku')).toBeInTheDocument();
    });
    expect(screen.getByTestId('lesson-slide-shell')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lesson-slide-indicator-1'));

    await waitFor(() => {
      expect(screen.getByText('Ile dni ma miesiąc?')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Wróć do tematów' }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-miesiace')).toBeInTheDocument();
    });
  });

  it('updates hub progress after viewing more slides in a section', async () => {
    render(<CalendarLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-miesiace'));

    await waitFor(() => {
      expect(screen.getByText('12 miesięcy roku')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('lesson-slide-indicator-1'));

    await waitFor(() => {
      expect(screen.getByText('Ile dni ma miesiąc?')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Wróć do tematów' }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-miesiace')).toBeInTheDocument();
    });

    expect(screen.getByTestId('lesson-hub-progress-dot-miesiace-0')).toHaveClass('bg-emerald-200');
    expect(screen.getByTestId('lesson-hub-progress-dot-miesiace-1')).toHaveClass('bg-emerald-200');
    expect(screen.getByTestId('lesson-hub-progress-dot-dni-0')).toHaveClass(
      'kangur-step-pill-pending'
    );
  });

  it('opens dedicated training cards and passes the selected section into the game', async () => {
    render(<CalendarLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_dates'));

    await waitFor(() => {
      expect(screen.getByTestId('calendar-lesson-game-shell')).toBeInTheDocument();
    });

    expect(
      screen
        .getByRole('button', { name: 'Wróć do tematów' })
        .closest('[data-testid="calendar-lesson-game-shell"]')
    ).toBeNull();
    expect(
      within(screen.getByTestId('calendar-lesson-game-shell')).queryByText('Ćwiczenie: Daty')
    ).toBeNull();
    expect(screen.getByTestId('mock-calendar-interactive-game')).toBeInTheDocument();
    expect(screen.getByTestId('mock-calendar-interactive-section')).toHaveTextContent('data');
    expect(loadProgressMock).toHaveBeenCalledTimes(1);
    expect(addXpMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('calendar-lesson-training-prev-button')).toBeNull();
    expect(screen.queryByTestId('calendar-lesson-training-next-button')).toBeNull();
    expect(screen.queryByTestId('calendar-lesson-training-indicator-2')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Finish calendar training' }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-game_dates')).toBeInTheDocument();
    });
  });

  it('hides lesson-to-lesson navigation while a calendar training game is active', async () => {
    render(
      <KangurLessonNavigationProvider onBack={vi.fn()}>
        <CalendarLesson />
        <KangurLessonNavigationWidget
          nextLesson={{
            id: 'lesson-clock',
            emoji: '🕐',
            title: 'Nauka zegara',
          }}
          onSelectLesson={vi.fn()}
        />
      </KangurLessonNavigationProvider>
    );

    expect(screen.getByRole('button', { name: /Nauka zegara/i })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_days'));

    await waitFor(() => {
      expect(screen.getByTestId('calendar-lesson-game-shell')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /Nauka zegara/i })).not.toBeInTheDocument();
  });

  it('does not award lesson completion xp twice when switching calendar training sections', async () => {
    render(<CalendarLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_days'));

    await waitFor(() => {
      expect(screen.getByTestId('mock-calendar-interactive-section')).toHaveTextContent('dni');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Finish calendar training' }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-game_months')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_months'));

    await waitFor(() => {
      expect(screen.getByTestId('mock-calendar-interactive-section')).toHaveTextContent(
        'miesiace'
      );
    });

    expect(addXpMock).toHaveBeenCalledTimes(1);
  });
});
