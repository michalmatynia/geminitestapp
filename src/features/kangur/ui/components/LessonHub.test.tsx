/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@/__tests__/test-utils';
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
        gradientClass='kangur-gradient-accent-emerald'
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
    expect(gameCard).toHaveClass(
      'soft-card',
      '[border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_46%,var(--kangur-accent-indigo-end,#6366f1))]',
      '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_86%,var(--kangur-accent-indigo-start,#a855f7))]'
    );
    expect(within(lessonCard).getByTestId('lesson-hub-icon-days')).toHaveClass(
      '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_76%,var(--kangur-accent-slate-start,#94a3b8))]',
      '[color:color-mix(in_srgb,var(--kangur-page-text)_72%,var(--kangur-accent-slate-end,#475569))]'
    );
    expect(within(gameCard).getByTestId('lesson-hub-icon-game')).toHaveClass(
      '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_76%,var(--kangur-accent-indigo-start,#a855f7))]',
      '[color:color-mix(in_srgb,var(--kangur-page-text)_72%,var(--kangur-accent-indigo-end,#6366f1))]'
    );
    expect(screen.queryByText('Nauka kalendarza')).not.toBeInTheDocument();
    expect(screen.queryByText('Wybierz temat')).not.toBeInTheDocument();
    expect(within(lessonCard).getByText('Lekcja')).toHaveClass(
      '[border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_52%,var(--kangur-accent-slate-start,#94a3b8))]',
      '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,var(--kangur-accent-slate-start,#94a3b8))]'
    );
    expect(within(gameCard).getByText('Gra')).toHaveClass(
      '[border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_52%,var(--kangur-accent-indigo-start,#a855f7))]',
      '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,var(--kangur-accent-indigo-start,#a855f7))]'
    );
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
        gradientClass='kangur-gradient-accent-emerald'
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
        gradientClass='kangur-gradient-accent-emerald'
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
