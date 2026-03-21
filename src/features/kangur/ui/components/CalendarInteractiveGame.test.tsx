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

    const previousMonthButton = screen.getByRole('button', {
      name: 'Poprzedni miesiąc',
    });
    const nextMonthButton = screen.getByRole('button', {
      name: 'Następny miesiąc',
    });

    expect(previousMonthButton).toHaveClass('kangur-cta-pill', 'surface-cta');
    expect(nextMonthButton).toHaveClass('kangur-cta-pill', 'surface-cta');
    expect(screen.getByTestId('calendar-interactive-progress-bar')).toHaveAttribute(
      'aria-valuenow',
      '0'
    );
    expect(screen.getByTestId('calendar-interactive-prompt')).toHaveClass(
      'soft-card'
    );
    expect(screen.getByTestId('calendar-interactive-calendar-shell')).toHaveClass(
      'soft-card',
      'border'
    );
    expect(screen.getByTestId('calendar-day-1')).toHaveClass('soft-card', 'rounded-[16px]');
  });

  it('uses shared option-card buttons for weekday tasks and marks the correct answer inline', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValueOnce(0.0);

    render(<CalendarInteractiveGame onFinish={() => undefined} />);

    const mondayButton = screen.getByTestId('calendar-weekday-0');

    expect(mondayButton).toHaveClass('soft-card');

    fireEvent.click(mondayButton);

    expect(mondayButton).toHaveClass('cursor-default');
    expect(screen.queryByTestId('calendar-interactive-feedback')).toBeNull();
  });

  it('marks a wrong weekday answer inline without a floating result badge', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValueOnce(0.0);

    render(<CalendarInteractiveGame onFinish={() => undefined} />);

    const tuesdayButton = screen.getByTestId('calendar-weekday-1');

    fireEvent.click(tuesdayButton);

    expect(tuesdayButton).toHaveClass('cursor-default');
    expect(screen.getByTestId('calendar-weekday-0')).toHaveClass('cursor-default');
    expect(screen.queryByTestId('calendar-interactive-feedback')).toBeNull();
  });

  it('uses shared option-card buttons for season drop targets', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.45).mockReturnValueOnce(0.0);

    render(<CalendarInteractiveGame onFinish={() => undefined} />);

    const winterTarget = screen.getByTestId('calendar-season-3');

    expect(winterTarget).toHaveClass('soft-card');
  });

  it('shows day-section guidance and only day-oriented task UI', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    render(<CalendarInteractiveGame onFinish={() => undefined} section='dni' />);

    expect(screen.queryByTestId('calendar-interactive-section-badge')).toBeNull();
    expect(screen.getByTestId('calendar-interactive-guidance-title')).toHaveTextContent(
      'Trening dni tygodnia'
    );
    expect(screen.getByText('Znajdź właściwy dzień tygodnia')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-weekday-0')).toBeInTheDocument();
    expect(screen.queryByTestId('calendar-season-0')).toBeNull();
  });

  it('shows date-section guidance and date-focused calendar lookup', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    render(<CalendarInteractiveGame onFinish={() => undefined} section='data' />);

    expect(screen.queryByTestId('calendar-interactive-section-badge')).toBeNull();
    expect(screen.getByTestId('calendar-interactive-guidance-title')).toHaveTextContent(
      'Trening dat'
    );
    expect(screen.getByText('Odszukaj właściwą datę w kalendarzu')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-interactive-calendar-shell')).toBeInTheDocument();
    expect(screen.queryByTestId('calendar-weekday-0')).toBeNull();
    expect(screen.queryByTestId('calendar-season-0')).toBeNull();
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
    expect(screen.getByTestId('calendar-interactive-summary-shell')).toHaveClass('glass-panel', 'kangur-panel-soft');
    expect(screen.getByTestId('calendar-interactive-summary-progress-bar')).toHaveAttribute(
      'aria-valuenow',
      '100'
    );
    expect(screen.getByTestId('calendar-interactive-summary-progress-bar')).toHaveAttribute(
      'aria-valuetext',
      '100% poprawnych odpowiedzi'
    );
    expect(screen.getByText('Wynik: 6/6')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jeszcze raz' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wróć' })).toBeInTheDocument();
  });
});
