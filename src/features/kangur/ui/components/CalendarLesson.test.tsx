/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CalendarLesson from '@/features/kangur/ui/components/CalendarLesson';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';

describe('CalendarLesson', () => {
  it('renders section slide indicators as Kangur micro pills', () => {
    render(
      <KangurLessonNavigationProvider onBack={vi.fn()}>
        <CalendarLesson />
      </KangurLessonNavigationProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /miesiace i pory roku/i }));

    expect(screen.getByTestId('calendar-lesson-section-shell-miesiace')).toHaveClass(
      'glass-panel',
      'border-white/88',
      'bg-white/94'
    );
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

  it('uses shared Kangur headers for the intro slide and game stage', () => {
    render(
      <KangurLessonNavigationProvider onBack={vi.fn()}>
        <CalendarLesson />
      </KangurLessonNavigationProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /czym jest kalendarz/i }));

    expect(screen.getByTestId('calendar-lesson-section-shell-intro')).toHaveClass(
      'glass-panel',
      'border-white/88',
      'bg-white/94'
    );
    expect(screen.getByTestId('calendar-lesson-intro-emoji')).toHaveClass('inline-flex', 'text-6xl');
    expect(screen.getByTestId('calendar-lesson-slide-title-intro')).toHaveClass(
      'text-xl',
      'text-slate-800'
    );

    fireEvent.click(screen.getByRole('button', { name: /menu/i }));
    fireEvent.click(screen.getByRole('button', { name: /gra z kalendarzem/i }));

    const header = screen.getByTestId('calendar-lesson-game-header');
    expect(screen.getByTestId('calendar-lesson-game-shell')).toHaveClass(
      'glass-panel',
      'border-white/88',
      'bg-white/94'
    );

    expect(within(header).getByRole('heading', { name: /gra z kalendarzem/i })).toHaveClass(
      'text-xl',
      'text-green-700'
    );
    expect(within(header).getByText('📅')).toHaveClass(
      'h-12',
      'w-12',
      'bg-emerald-100',
      'text-emerald-700'
    );
  });
});
