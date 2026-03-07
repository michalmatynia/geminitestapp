/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import SubtractingGame from '@/features/kangur/ui/components/SubtractingGame';

describe('SubtractingGame', () => {
  it('uses Kangur option-card styling for subtraction choices', () => {
    render(<SubtractingGame onFinish={() => undefined} />);

    expect(screen.getByTestId('subtracting-game-round-shell')).toHaveClass(
      'glass-panel',
      'border-white/88',
      'bg-white/94'
    );
    expect(screen.getByTestId('subtracting-game-progress-bar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByTestId('subtracting-game-equation')).toHaveClass('text-3xl', 'text-red-500');

    const firstChoice = screen.getByTestId('subtracting-game-choice-0');

    expect(firstChoice).toHaveClass('soft-card', 'rounded-[24px]');

    fireEvent.click(firstChoice);

    expect(firstChoice).toHaveClass('border-amber-300');
    fireEvent.click(screen.getByRole('button', { name: 'Sprawdź ✓' }));

    const feedback = screen.getByTestId('subtracting-game-feedback');
    expect(feedback).toHaveClass(
      feedback.textContent?.includes('Brawo') ? 'border-emerald-200' : 'border-rose-200'
    );
  });
});
