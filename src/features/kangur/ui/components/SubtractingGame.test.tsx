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
    expect(screen.getByRole('button', { name: 'Sprawdź ✓' })).toHaveClass(
      '[background:var(--kangur-soft-card-background)]',
      '[border-color:var(--kangur-soft-card-border)]',
      '[color:var(--kangur-page-text)]'
    );

    const firstChoice = screen.getByTestId('subtracting-game-choice-0');

    expect(firstChoice).toHaveClass('soft-card', 'border', 'rounded-[24px]');

    fireEvent.click(firstChoice);

    expect(firstChoice).toHaveClass('soft-card', 'rounded-[24px]');
    fireEvent.click(screen.getByRole('button', { name: 'Sprawdź ✓' }));

    const checkButton = screen.getByRole('button', { name: 'Sprawdź ✓' });
    expect(checkButton.className).toMatch(/bg-(emerald|rose)-500/);
  });
});
