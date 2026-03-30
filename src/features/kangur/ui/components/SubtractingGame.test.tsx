/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import SubtractingGame from '@/features/kangur/ui/components/SubtractingGame';

describe('SubtractingGame', () => {
  it('uses Kangur option-card styling for subtraction choices', () => {
    render(<SubtractingGame onFinish={() => undefined} />);

    expect(screen.getByTestId('subtracting-game-shell')).toHaveClass('w-full', 'max-w-4xl');
    expect(screen.getByTestId('subtracting-game-round-shell')).toHaveClass(
      'glass-panel',
      'kangur-panel-soft',
      'kangur-panel-padding-lg',
      'kangur-glass-surface-solid',
      'kangur-panel-shell'
    );
    expect(screen.getByTestId('subtracting-game-progress-bar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByTestId('subtracting-game-equation')).toHaveClass('text-3xl', 'text-red-500');
    expect(screen.getByRole('button', { name: 'Sprawdź ✓' })).toHaveClass(
      '[background:var(--kangur-soft-card-background)]',
      '[border-color:var(--kangur-soft-card-border)]',
      '[color:var(--kangur-page-text)]'
    );

    const firstChoice = screen.getByTestId('subtracting-game-choice-0');

    expect(firstChoice).toHaveClass('soft-card', 'border', 'kangur-card-surface', 'kangur-card-padding-md');

    fireEvent.click(firstChoice);

    expect(firstChoice).toHaveClass('soft-card', 'kangur-card-surface', 'kangur-card-padding-md');
    fireEvent.click(screen.getByRole('button', { name: 'Sprawdź ✓' }));

    const checkButton = screen.getByRole('button', { name: 'Sprawdź ✓' });
    expect(checkButton.className).toMatch(/bg-(emerald|rose)-500/);
    expect(screen.queryByText(/Poprawna odpowiedź/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Niepoprawnie/i)).not.toBeInTheDocument();
  });
});
