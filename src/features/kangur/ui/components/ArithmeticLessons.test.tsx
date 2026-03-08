/**
 * @vitest-environment jsdom
 */

import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      animate: _animate,
      children,
      exit: _exit,
      initial: _initial,
      transition: _transition,
      whileHover: _whileHover,
      whileTap: _whileTap,
      ...props
    }: HTMLAttributes<HTMLDivElement> & {
      animate?: unknown;
      exit?: unknown;
      initial?: unknown;
      transition?: unknown;
      whileHover?: unknown;
      whileTap?: unknown;
    }) => <div {...props}>{children}</div>,
    button: ({
      animate: _animate,
      children,
      exit: _exit,
      initial: _initial,
      transition: _transition,
      whileHover: _whileHover,
      whileTap: _whileTap,
      ...props
    }: ButtonHTMLAttributes<HTMLButtonElement> & {
      animate?: unknown;
      exit?: unknown;
      initial?: unknown;
      transition?: unknown;
      whileHover?: unknown;
      whileTap?: unknown;
    }) => <button {...props}>{children}</button>,
  },
}));

vi.mock('@/features/kangur/ui/components/AddingBallGame', () => ({
  default: () => <div>Mock Adding Ball Game</div>,
}));

vi.mock('@/features/kangur/ui/components/AddingSynthesisGame', () => ({
  default: () => <div>Mock Adding Synthesis Game</div>,
}));

vi.mock('@/features/kangur/ui/components/SubtractingGame', () => ({
  default: () => <div>Mock Subtracting Game</div>,
}));

vi.mock('@/features/kangur/ui/components/DivisionGame', () => ({
  default: () => <div>Mock Division Game</div>,
}));

vi.mock('@/features/kangur/ui/components/MultiplicationArrayGame', () => ({
  default: () => <div>Mock Multiplication Array Game</div>,
}));

vi.mock('@/features/kangur/ui/components/MultiplicationGame', () => ({
  default: () => <div>Mock Multiplication Game</div>,
}));

import AddingLesson from '@/features/kangur/ui/components/AddingLesson';
import DivisionLesson from '@/features/kangur/ui/components/DivisionLesson';
import MultiplicationLesson from '@/features/kangur/ui/components/MultiplicationLesson';
import SubtractingLesson from '@/features/kangur/ui/components/SubtractingLesson';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';

const renderLesson = (ui: ReactNode) =>
  render(<KangurLessonNavigationProvider onBack={vi.fn()}>{ui}</KangurLessonNavigationProvider>);

const getParagraphByTextContent = (snippet: string): HTMLElement =>
  screen.getByText((_, element) => element?.tagName === 'P' && element.textContent?.includes(snippet) === true);

describe('Arithmetic lessons shared surfaces', () => {
  it('uses shared equation and game header surfaces in the adding lesson', () => {
    const { unmount } = renderLesson(<AddingLesson />);

    fireEvent.click(screen.getByRole('button', { name: /podstawy dodawania/i }));
    fireEvent.click(screen.getByTestId('lesson-slide-indicator-1'));

    expect(screen.getByTestId('adding-lesson-single-digit-equation')).toHaveClass(
      'text-3xl',
      'text-orange-500'
    );
    expect(getParagraphByTextContent('Zacznij od 4')).toHaveClass('text-slate-500');

    unmount();

    renderLesson(<AddingLesson />);
    fireEvent.click(screen.getByRole('button', { name: /gra z piłkami/i }));

    expect(screen.getByRole('heading', { name: /gra z piłkami!/i })).toHaveClass(
      'text-2xl',
      'text-amber-700'
    );
    expect(screen.getByText('🎮')).toHaveClass('h-16', 'w-16', 'bg-amber-100', 'text-amber-700');
  });

  it('uses shared equation and game header surfaces in the subtracting lesson', () => {
    const { unmount } = renderLesson(<SubtractingLesson />);

    fireEvent.click(screen.getByRole('button', { name: /podstawy odejmowania/i }));
    fireEvent.click(screen.getByTestId('lesson-slide-indicator-1'));

    expect(screen.getByTestId('subtracting-lesson-single-digit-equation')).toHaveClass(
      'text-3xl',
      'text-red-500'
    );
    expect(getParagraphByTextContent('Zacznij od 9')).toHaveClass('text-slate-500');

    unmount();

    renderLesson(<SubtractingLesson />);
    fireEvent.click(screen.getByRole('button', { name: /gra z odejmowaniem/i }));

    expect(screen.getByRole('heading', { name: /gra z odejmowaniem!/i })).toHaveClass(
      'text-2xl',
      'text-rose-700'
    );
    expect(screen.getByText('🎮')).toHaveClass('h-16', 'w-16', 'bg-rose-100', 'text-rose-700');
  });

  it('uses shared equation and game header surfaces in the division lesson', () => {
    const { unmount } = renderLesson(<DivisionLesson />);

    fireEvent.click(screen.getByRole('button', { name: /reszta z dzielenia/i }));

    expect(screen.getByTestId('division-lesson-remainder-equation')).toHaveClass(
      'text-3xl',
      'text-teal-600'
    );
    expect(screen.getByText(/7 czekolad/i)).toHaveClass('text-slate-500');

    unmount();

    renderLesson(<DivisionLesson />);
    fireEvent.click(screen.getByRole('button', { name: /gra z dzieleniem/i }));

    expect(screen.getByRole('heading', { name: /gra z dzieleniem!/i })).toHaveClass(
      'text-2xl',
      'text-sky-700'
    );
    expect(screen.getByText('🎮')).toHaveClass('h-16', 'w-16', 'bg-sky-100', 'text-sky-700');
  });

  it('uses shared equation, chip, and game header surfaces in the multiplication lesson', () => {
    const { unmount } = renderLesson(<MultiplicationLesson />);

    fireEvent.click(screen.getByRole('button', { name: /co to mnozenie/i }));

    expect(screen.getByTestId('multiplication-lesson-intro-equation')).toHaveClass(
      'text-2xl',
      'text-purple-600'
    );
    expect(screen.getByText(/3 grupy po 3 cukierki/i)).toHaveClass('text-slate-500');

    fireEvent.click(screen.getByRole('button', { name: /wróć do tematów/i }));
    fireEvent.click(screen.getByRole('button', { name: /tabliczka × 2 i × 3/i }));

    expect(screen.getByText('× 2')).toHaveClass('border-violet-200', 'bg-violet-100');

    unmount();

    renderLesson(<MultiplicationLesson />);
    fireEvent.click(screen.getByRole('button', { name: /gra z grupami/i }));

    expect(screen.getByRole('heading', { name: /gra z grupami!/i })).toHaveClass(
      'text-2xl',
      'text-violet-700'
    );
    expect(screen.getByText('✨')).toHaveClass(
      'h-16',
      'w-16',
      'bg-violet-100',
      'text-violet-700'
    );
  });
});
