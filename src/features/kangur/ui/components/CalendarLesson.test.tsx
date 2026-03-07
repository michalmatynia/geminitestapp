/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CalendarLesson from '@/features/kangur/ui/components/CalendarLesson';

describe('CalendarLesson', () => {
  it('renders section slide indicators as Kangur micro pills', () => {
    render(<CalendarLesson onBack={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /miesiace i pory roku/i }));

    const firstIndicator = screen.getByTestId('calendar-lesson-slide-miesiace-0');
    const secondIndicator = screen.getByTestId('calendar-lesson-slide-miesiace-1');

    expect(firstIndicator).toHaveClass('kangur-cta-pill', 'bg-emerald-500');
    expect(firstIndicator).toHaveAttribute('aria-current', 'step');
    expect(secondIndicator).toHaveClass('kangur-cta-pill', 'soft-cta');

    fireEvent.click(secondIndicator);

    expect(firstIndicator).toHaveClass('bg-emerald-200');
    expect(secondIndicator).toHaveClass('bg-emerald-500');
    expect(secondIndicator).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('Ile dni ma miesiac?')).toBeInTheDocument();
  });
});
