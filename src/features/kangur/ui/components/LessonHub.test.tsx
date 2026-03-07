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
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';

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
            title: 'Gra z kalendarzem',
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
    expect(within(lessonCard).getByText('Lekcja')).toHaveClass('border-slate-200', 'bg-slate-100');
    expect(within(gameCard).getByText('Gra')).toHaveClass('border-indigo-200', 'bg-indigo-100');

    fireEvent.click(gameCard);

    expect(onSelect).toHaveBeenCalledWith('game');
  });

  it('reads the back action from lesson navigation context', () => {
    const onBack = vi.fn();

    render(
      <KangurLessonNavigationProvider onBack={onBack}>
        <LessonHub
          gradientClass='from-emerald-400 to-teal-500'
          lessonEmoji='📅'
          lessonTitle='Nauka kalendarza'
          onSelect={vi.fn()}
          sections={[
            {
              id: 'days',
              emoji: '🗓️',
              title: 'Dni tygodnia',
              description: 'Od poniedzialku do niedzieli',
            },
          ]}
        />
      </KangurLessonNavigationProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Wróc do listy' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
