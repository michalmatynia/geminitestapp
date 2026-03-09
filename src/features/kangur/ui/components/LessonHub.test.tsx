/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      initial: _initial,
      animate: _animate,
      transition: _transition,
      whileHover: _whileHover,
      whileTap: _whileTap,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      children?: React.ReactNode;
      initial?: unknown;
      animate?: unknown;
      transition?: unknown;
      whileHover?: unknown;
      whileTap?: unknown;
    }) => <div {...props}>{children}</div>,
  },
}));

import LessonHub from '@/features/kangur/ui/components/LessonHub';

describe('LessonHub', () => {
  it('uses shared option cards and chips for lesson and game entries', () => {
    const onSelect = vi.fn();

    render(
      <LessonHub
        gradientClass='from-emerald-400 to-teal-500'
        lessonEmoji='📅'
        lessonTitle='Nauka kalendarza'
        onBack={vi.fn()}
        onSelect={onSelect}
        sections={[
          {
            id: 'days',
            emoji: '🗓️',
            title: 'Dni tygodnia',
            description: 'Od poniedzialku do niedzieli',
          },
          {
            id: 'game',
            emoji: '🎮',
            title: 'Ćwiczenia z Kalendarzem',
            description: 'Cwicz w interaktywnej grze',
            isGame: true,
          },
        ]}
      />
    );

    const lessonCard = screen.getByTestId('lesson-hub-section-days');
    const gameCard = screen.getByTestId('lesson-hub-section-game');

    expect(lessonCard).toHaveClass('soft-card');
    expect(gameCard).toHaveClass('soft-card', 'border-indigo-300');
    expect(within(lessonCard).getByTestId('lesson-hub-icon-days')).toHaveClass(
      'bg-slate-100',
      'text-slate-700'
    );
    expect(within(gameCard).getByTestId('lesson-hub-icon-game')).toHaveClass(
      'bg-indigo-100',
      'text-indigo-700'
    );
    expect(screen.queryByText('Nauka kalendarza')).not.toBeInTheDocument();
    expect(screen.queryByText('Wybierz temat')).not.toBeInTheDocument();
    expect(within(lessonCard).getByText('Lekcja')).toHaveClass('border-slate-200', 'bg-slate-100');
    expect(within(gameCard).getByText('Gra')).toHaveClass('border-indigo-200', 'bg-indigo-100');
    expect(within(gameCard).getByTestId('lesson-hub-progress-game')).toBeInTheDocument();
    expect(within(gameCard).getByTestId('lesson-hub-progress-dot-game-0')).toHaveClass(
      'kangur-step-pill-pending'
    );

    fireEvent.click(gameCard);

    expect(onSelect).toHaveBeenCalledWith('game');
  });

  it('renders a compact read-only progress strip under lesson pills', () => {
    render(
      <LessonHub
        gradientClass='from-emerald-400 to-teal-500'
        lessonEmoji='📅'
        lessonTitle='Nauka kalendarza'
        onBack={vi.fn()}
        onSelect={vi.fn()}
        progressDotClassName='bg-emerald-200'
        sections={[
          {
            id: 'days',
            emoji: '🗓️',
            title: 'Dni tygodnia',
            description: 'Od poniedzialku do niedzieli',
            progress: {
              viewedCount: 2,
              totalCount: 3,
            },
          },
        ]}
      />
    );

    const progress = screen.getByTestId('lesson-hub-progress-days');

    expect(progress).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-progress-dot-days-0')).toHaveClass('bg-emerald-200');
    expect(screen.getByTestId('lesson-hub-progress-dot-days-1')).toHaveClass('bg-emerald-200');
    expect(screen.getByTestId('lesson-hub-progress-dot-days-2')).toHaveClass(
      'kangur-step-pill-pending'
    );
  });

  it('uses explicit game progress instead of the generic one-pill fallback', () => {
    render(
      <LessonHub
        gradientClass='from-emerald-400 to-teal-500'
        lessonEmoji='📅'
        lessonTitle='Nauka kalendarza'
        onBack={vi.fn()}
        onSelect={vi.fn()}
        progressDotClassName='bg-indigo-200'
        sections={[
          {
            id: 'game_clock',
            emoji: '🕐',
            title: 'Ćwiczenie: Godziny',
            description: 'Trzy panele przed wyzwaniem',
            isGame: true,
            progress: {
              viewedCount: 1,
              totalCount: 3,
            },
          },
        ]}
      />
    );

    expect(screen.getByTestId('lesson-hub-progress-game_clock')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-progress-dot-game_clock-0')).toHaveClass(
      'bg-indigo-200'
    );
    expect(screen.getByTestId('lesson-hub-progress-dot-game_clock-1')).toHaveClass(
      'kangur-step-pill-pending'
    );
    expect(screen.getByTestId('lesson-hub-progress-dot-game_clock-2')).toHaveClass(
      'kangur-step-pill-pending'
    );
  });
});
