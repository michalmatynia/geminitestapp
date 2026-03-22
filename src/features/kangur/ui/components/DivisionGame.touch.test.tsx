/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import DivisionGame from '@/features/kangur/ui/components/DivisionGame';

describe('DivisionGame touch mode', () => {
  it('shows a touch hint and larger answer cards on coarse pointers', () => {
    render(<DivisionGame onFinish={() => undefined} />);

    expect(screen.getByTestId('division-game-touch-hint')).toHaveTextContent(
      'Dotknij odpowiedź, a potem dotknij Sprawdź.'
    );

    const firstChoice = screen.getByTestId('division-game-choice-0');
    expect(firstChoice).toHaveClass('touch-manipulation', 'select-none', 'min-h-[4.25rem]');
  });
});
