/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';

describe('AgenticLessonQuickCheck touch mode', () => {
  it('shows a touch hint and larger answer buttons on coarse pointers', () => {
    render(
      <AgenticLessonQuickCheck
        question='Która odpowiedź jest poprawna?'
        choices={[
          { id: 'a', label: 'Opcja A' },
          { id: 'b', label: 'Opcja B', correct: true },
        ]}
      />
    );

    expect(screen.getByTestId('agentic-lesson-quick-check-touch-hint')).toHaveTextContent(
      'Dotknij odpowiedź, aby ją wybrać.'
    );
    expect(screen.getByRole('button', { name: 'Opcja A' })).toHaveClass(
      'touch-manipulation',
      'select-none',
      'min-h-[3.5rem]'
    );
  });
});
