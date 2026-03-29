/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import MultiplicationGame from '@/features/kangur/ui/components/MultiplicationGame';

describe('MultiplicationGame', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('uses Kangur option-card styling for multiplication choices', () => {
    render(<MultiplicationGame onFinish={() => undefined} />);

    expect(screen.getByTestId('multiplication-game-shell')).toHaveClass('w-full', 'max-w-4xl');
    expect(screen.getByTestId('multiplication-game-round-shell')).toHaveClass(
      'glass-panel',
      'kangur-panel-soft',
      'kangur-glass-surface-solid'
    );
    expect(screen.getByTestId('multiplication-game-progress-bar')).toHaveAttribute(
      'aria-valuenow',
      '0'
    );
    expect(screen.getByTestId('multiplication-game-equation')).toHaveClass(
      'text-3xl',
      'text-purple-600'
    );
    expect(screen.getByRole('button', { name: 'Sprawdź ✓' })).toHaveClass(
      '[background:var(--kangur-soft-card-background)]',
      '[border-color:var(--kangur-soft-card-border)]',
      '[color:var(--kangur-page-text)]'
    );
    const firstChoice = screen.getByTestId('multiplication-game-choice-0');

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
