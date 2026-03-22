/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import MultiplicationGame from '@/features/kangur/ui/components/MultiplicationGame';

describe('MultiplicationGame touch mode', () => {
  it('shows a touch hint and larger answer cards on coarse pointers', () => {
    render(<MultiplicationGame onFinish={() => undefined} />);

    expect(screen.getByTestId('multiplication-game-touch-hint')).toHaveTextContent(
      'Dotknij odpowiedź, a potem dotknij Sprawdź.'
    );

    const firstChoice = screen.getByTestId('multiplication-game-choice-0');
    expect(firstChoice).toHaveClass('touch-manipulation', 'select-none', 'min-h-[4.25rem]');
    expect(screen.getByTestId('multiplication-game-check')).toBeInTheDocument();
  });
});
