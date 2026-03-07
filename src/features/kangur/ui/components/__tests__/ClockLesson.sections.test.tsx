import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ClockLesson from '../ClockLesson';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';

const addXpMock = vi.fn();
const loadProgressMock = vi.fn(() => ({
  lessonsCompleted: 0,
  lessonMastery: {},
}));

vi.mock('@/features/kangur/ui/components/ClockTrainingGame', () => ({
  __esModule: true,
  default: (): React.JSX.Element => (
    <div data-testid='mock-clock-training-game'>Mock Clock Training</div>
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

describe('ClockLesson sectioned structure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderClockLesson = (): ReturnType<typeof render> =>
    render(
      <KangurLessonNavigationProvider onBack={vi.fn()}>
        <ClockLesson />
      </KangurLessonNavigationProvider>
    );

  it('renders three collapsible sections and opens the hours section by default', () => {
    renderClockLesson();

    expect(screen.getByTestId('clock-lesson-section-toggle-hours')).toBeInTheDocument();
    expect(screen.getByTestId('clock-lesson-section-toggle-minutes')).toBeInTheDocument();
    expect(screen.getByTestId('clock-lesson-section-toggle-combined')).toBeInTheDocument();
    expect(screen.getByTestId('clock-lesson-section-toggle-hours')).toHaveClass(
      'soft-card',
      'border-indigo-300'
    );
    expect(screen.getByTestId('clock-lesson-section-divider-hours')).toHaveClass(
      'h-px',
      'w-full',
      'bg-indigo-200'
    );
    expect(screen.getByTestId('clock-lesson-section-slide-hours-0')).toHaveClass(
      'kangur-cta-pill',
      'bg-indigo-500'
    );
    expect(screen.getByTestId('clock-lesson-section-slide-hours-1')).toHaveClass(
      'kangur-cta-pill',
      'soft-cta'
    );
    expect(screen.getByTestId('clock-lesson-section-toggle-minutes')).toHaveClass(
      'soft-card',
      'bg-slate-100/85'
    );

    expect(screen.getByText('Co pokazuje krótka wskazówka?')).toBeInTheDocument();
    expect(screen.queryByText('Co pokazuje długa wskazówka?')).toBeNull();
    expect(screen.queryAllByTestId('clock-lesson-hour-hand').length).toBeGreaterThan(0);
    expect(screen.queryAllByTestId('clock-lesson-minute-hand')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /czytaj/i })).toBeNull();
    expect(screen.getByTestId('clock-lesson-section-status-hours')).toHaveTextContent('W trakcie');
    expect(screen.getByTestId('clock-lesson-section-status-minutes')).toHaveTextContent(
      'Zablokowana'
    );
    expect(screen.getByTestId('clock-lesson-section-locked-hint-minutes')).toBeInTheDocument();
    expect(screen.getByTestId('clock-lesson-section-locked-hint-combined')).toBeInTheDocument();
  });

  it('does not open locked sections before finishing prior section', async () => {
    renderClockLesson();

    fireEvent.click(screen.getByTestId('clock-lesson-section-toggle-minutes'));

    await waitFor(() => {
      expect(screen.getByText('Co pokazuje krótka wskazówka?')).toBeInTheDocument();
    });
    expect(screen.queryByText('Co pokazuje długa wskazówka?')).toBeNull();
  });

  it('opens the minutes section after completing the hours section', async () => {
    renderClockLesson();

    fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
    fireEvent.click(screen.getByRole('button', { name: 'Następna sekcja' }));

    await waitFor(() => {
      expect(screen.getByText('Co pokazuje długa wskazówka?')).toBeInTheDocument();
    });
    expect(screen.queryByText('Co pokazuje krótka wskazówka?')).toBeNull();
    expect(screen.queryAllByTestId('clock-lesson-minute-hand').length).toBeGreaterThan(0);
    expect(screen.queryAllByTestId('clock-lesson-hour-hand')).toHaveLength(0);
    expect(screen.getByTestId('clock-lesson-section-toggle-minutes')).toHaveClass(
      'soft-card',
      'border-indigo-300'
    );
  });

  it('collapses the active section when clicking its header again', async () => {
    renderClockLesson();

    fireEvent.click(screen.getByTestId('clock-lesson-section-toggle-hours'));

    await waitFor(() => {
      expect(screen.getByTestId('clock-lesson-collapsed-hint')).toBeInTheDocument();
    });
    expect(screen.queryByText('Co pokazuje krótka wskazówka?')).toBeNull();
  });

  it('shows training CTA only on the last slide of the combined section', async () => {
    renderClockLesson();

    fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
    fireEvent.click(screen.getByRole('button', { name: 'Następna sekcja' }));

    await waitFor(() => {
      expect(screen.getByText('Co pokazuje długa wskazówka?')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
    fireEvent.click(screen.getByRole('button', { name: 'Następna sekcja' }));

    await waitFor(() => {
      expect(screen.getByText('Jak łączyć obie wskazówki?')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: 'Ćwiczenie z zegarem 🕐' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
    await waitFor(() => {
      expect(screen.getByText('Kwadrans po i kwadrans do')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
    await waitFor(() => {
      expect(screen.getByText('Gotowy/a na ćwiczenie')).toBeInTheDocument();
    });

    const trainingButton = screen.getByRole('button', { name: 'Ćwiczenie z zegarem 🕐' });
    expect(trainingButton).toBeInTheDocument();
    expect(addXpMock).not.toHaveBeenCalled();

    fireEvent.click(trainingButton);

    await waitFor(() => {
      expect(screen.getByTestId('mock-clock-training-game')).toBeInTheDocument();
    });
    const header = screen.getByTestId('clock-lesson-training-header');
    expect(within(header).getByRole('heading', { name: /ćwiczenie z zegarem/i })).toHaveClass(
      'text-xl',
      'text-indigo-700'
    );
    expect(within(header).getByText('🕐')).toHaveClass(
      'h-12',
      'w-12',
      'bg-indigo-100',
      'text-indigo-700'
    );
    expect(loadProgressMock).toHaveBeenCalled();
    expect(addXpMock).toHaveBeenCalledTimes(1);
  });

  it('marks previous section as completed when moving to next section', async () => {
    renderClockLesson();

    fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
    fireEvent.click(screen.getByRole('button', { name: 'Następna sekcja' }));

    await waitFor(() => {
      expect(screen.getByText('Co pokazuje długa wskazówka?')).toBeInTheDocument();
    });
    expect(screen.getByTestId('clock-lesson-section-status-hours')).toHaveTextContent('Ukończono');
    expect(screen.getByTestId('clock-lesson-section-status-minutes')).toHaveTextContent(
      'W trakcie'
    );
  });

  it('unlocks the combined section only after completing the minutes section', async () => {
    renderClockLesson();

    expect(screen.getByTestId('clock-lesson-section-status-combined')).toHaveTextContent(
      'Zablokowana'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
    fireEvent.click(screen.getByRole('button', { name: 'Następna sekcja' }));

    await waitFor(() => {
      expect(screen.getByText('Co pokazuje długa wskazówka?')).toBeInTheDocument();
    });

    expect(screen.getByTestId('clock-lesson-section-status-combined')).toHaveTextContent(
      'Zablokowana'
    );
    expect(screen.queryByTestId('clock-lesson-section-locked-hint-minutes')).toBeNull();
    expect(screen.getByTestId('clock-lesson-section-locked-hint-combined')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
    fireEvent.click(screen.getByRole('button', { name: 'Następna sekcja' }));

    await waitFor(() => {
      expect(screen.getByText('Jak łączyć obie wskazówki?')).toBeInTheDocument();
    });

    expect(screen.getByTestId('clock-lesson-section-status-minutes')).toHaveTextContent(
      'Ukończono'
    );
    expect(screen.getByTestId('clock-lesson-section-status-combined')).toHaveTextContent(
      'W trakcie'
    );
  });
});
