/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import MultiplicationGame from '@/features/kangur/ui/components/MultiplicationGame';

describe('MultiplicationGame', () => {
  it('uses Kangur option-card styling for multiplication choices', () => {
    render(<MultiplicationGame onFinish={() => undefined} />);

    expect(screen.getByTestId('multiplication-game-round-shell')).toHaveClass('glass-panel');
    expect(screen.getByTestId('multiplication-game-progress-bar')).toHaveAttribute(
      'aria-valuenow',
      '0'
    );
    const firstChoice = screen.getByTestId('multiplication-game-choice-0');

    expect(firstChoice).toHaveClass('soft-card', 'rounded-[24px]');

    fireEvent.click(firstChoice);

    expect(firstChoice).toHaveClass('border-amber-300');
  });
});
