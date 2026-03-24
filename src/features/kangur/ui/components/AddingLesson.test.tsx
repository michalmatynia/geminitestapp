/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => ({
    isAuthenticated: true,
    user: { actorType: 'learner', ownerUserId: 'parent-1' },
  }),
}));

vi.mock('@/features/kangur/ui/components/AddingBallGame', () => ({
  default: ({ onFinish }: { onFinish: () => void }): React.JSX.Element => (
    <button type='button' onClick={onFinish}>
      Mock Adding Ball Game
    </button>
  ),
}));

vi.mock('@/features/kangur/ui/components/AddingSynthesisGame', () => ({
  default: ({ onFinish }: { onFinish: () => void }): React.JSX.Element => (
    <button type='button' onClick={onFinish}>
      Mock Adding Synthesis Game
    </button>
  ),
}));

import AddingLesson from '@/features/kangur/ui/components/AddingLesson';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';

describe('AddingLesson', () => {
  it('exposes the new synthesis subsection and opens its game surface', () => {
    render(
      <KangurLessonNavigationProvider onBack={vi.fn()}>
        <AddingLesson />
      </KangurLessonNavigationProvider>
    );

    expect(screen.getByRole('button', { name: /synteza dodawania/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /synteza dodawania/i }));

    expect(screen.getByRole('button', { name: 'Mock Adding Synthesis Game' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mock Adding Synthesis Game' }));

    expect(screen.getByRole('button', { name: /synteza dodawania/i })).toBeInTheDocument();
  });

  it('shows subsection progress dots on the lesson hub after viewing slides', () => {
    render(
      <KangurLessonNavigationProvider onBack={vi.fn()}>
        <AddingLesson />
      </KangurLessonNavigationProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /podstawy dodawania/i }));
    fireEvent.click(screen.getByRole('button', { name: /wróć do tematów/i }));

    expect(screen.getByTestId('lesson-hub-progress-podstawy')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-progress-dot-podstawy-0')).toHaveClass(
      'bg-amber-200'
    );
    expect(screen.getByTestId('lesson-hub-progress-dot-podstawy-1')).toHaveClass(
      'kangur-step-pill-pending'
    );

    fireEvent.click(screen.getByRole('button', { name: /podstawy dodawania/i }));
    fireEvent.click(screen.getByTestId('lesson-slide-indicator-1'));
    fireEvent.click(screen.getByRole('button', { name: /wróć do tematów/i }));

    expect(screen.getByTestId('lesson-hub-progress-dot-podstawy-1')).toHaveClass(
      'bg-amber-200'
    );
  });

  it('keeps the shared stage title visible inside the adding game shell', () => {
    render(
      <KangurLessonNavigationProvider onBack={vi.fn()}>
        <AddingLesson />
      </KangurLessonNavigationProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /gra z piłkami/i }));

    expect(screen.getByTestId('adding-lesson-game-shell')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mock Adding Ball Game' })).toBeInTheDocument();
    expect(
      within(screen.getByTestId('adding-lesson-game-shell')).getByText('Gra z piłkami!')
    ).toBeInTheDocument();
  });

  it('gives the synthesis activity a wide shell and keeps its stage title visible', () => {
    render(
      <KangurLessonNavigationProvider onBack={vi.fn()}>
        <AddingLesson />
      </KangurLessonNavigationProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /synteza dodawania/i }));

    expect(screen.getByRole('button', { name: 'Mock Adding Synthesis Game' })).toBeInTheDocument();
    expect(screen.getByTestId('adding-lesson-synthesis-shell')).toHaveClass('!p-4');
    expect(screen.getByTestId('adding-lesson-synthesis-shell').parentElement).toHaveClass(
      'max-w-[1120px]'
    );
    expect(
      within(screen.getByTestId('adding-lesson-synthesis-shell')).getByText(
        'Synteza dodawania'
      )
    ).toBeInTheDocument();
  });
});
