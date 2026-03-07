/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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
});
