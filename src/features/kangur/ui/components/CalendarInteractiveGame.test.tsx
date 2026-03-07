/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import CalendarInteractiveGame from '@/features/kangur/ui/components/CalendarInteractiveGame';

describe('CalendarInteractiveGame', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders month navigation controls as pill CTA buttons for flip tasks', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.7).mockReturnValueOnce(0.25);

    render(<CalendarInteractiveGame onFinish={() => undefined} />);

    const previousMonthButton = screen.getByRole('button', { name: 'Poprzedni miesiac' });
    const nextMonthButton = screen.getByRole('button', { name: 'Nastepny miesiac' });

    expect(previousMonthButton).toHaveClass('kangur-cta-pill', 'surface-cta');
    expect(nextMonthButton).toHaveClass('kangur-cta-pill', 'surface-cta');
    expect(screen.getByTestId('calendar-interactive-progress-bar')).toHaveAttribute(
      'aria-valuenow',
      '0'
    );
    expect(screen.getByTestId('calendar-interactive-prompt')).toHaveClass(
      'soft-card',
      'border-emerald-300'
    );
    expect(screen.getByTestId('calendar-interactive-calendar-shell')).toHaveClass(
      'soft-card',
      'border-slate-200/80'
    );
    expect(screen.getByTestId('calendar-day-1')).toHaveClass('soft-card', 'rounded-[16px]');
  });

  it('uses shared option-card buttons for weekday tasks and marks the correct answer state', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValueOnce(0.0);

    render(<CalendarInteractiveGame onFinish={() => undefined} />);

    const mondayButton = screen.getByTestId('calendar-weekday-0');

    expect(mondayButton).toHaveClass('soft-card');

    fireEvent.click(mondayButton);

    expect(mondayButton).toHaveClass('border-emerald-300');
    expect(screen.getByTestId('calendar-interactive-feedback')).toHaveClass(
      'border-emerald-200',
      'bg-emerald-100'
    );
  });

  it('uses shared option-card buttons for season drop targets', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.45).mockReturnValueOnce(0.0);

    render(<CalendarInteractiveGame onFinish={() => undefined} />);

    const winterTarget = screen.getByTestId('calendar-season-3');

    expect(winterTarget).toHaveClass('soft-card');

    fireEvent.dragOver(winterTarget);
    expect(winterTarget).toHaveClass('border-sky-300');
  });

  it('uses the shared display emoji on the summary screen', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);

    render(<CalendarInteractiveGame onFinish={() => undefined} />);

    for (let round = 0; round < 6; round += 1) {
      fireEvent.click(screen.getByTestId('calendar-weekday-0'));

      act(() => {
        vi.advanceTimersByTime(1300);
      });
    }

    expect(screen.getByTestId('calendar-interactive-summary-emoji')).toHaveClass(
      'inline-flex',
      'text-6xl'
    );
    expect(screen.getByTestId('calendar-interactive-summary-shell')).toHaveClass(
      'glass-panel',
      'border-white/88',
      'bg-white/94'
    );
    expect(screen.getByTestId('calendar-interactive-summary-progress-bar')).toHaveAttribute(
      'aria-valuenow',
      '100'
    );
  });
});
