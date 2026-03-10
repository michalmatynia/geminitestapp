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

    expect(screen.getByTestId('multiplication-game-round-shell')).toHaveClass(
      'glass-panel',
      'border-white/88',
      'bg-white/94'
    );
    expect(screen.getByTestId('multiplication-game-progress-bar')).toHaveAttribute(
      'aria-valuenow',
      '0'
    );
    expect(screen.getByTestId('multiplication-game-equation')).toHaveClass(
      'text-3xl',
      'text-purple-600'
    );
    const firstChoice = screen.getByTestId('multiplication-game-choice-0');

    expect(firstChoice).toHaveClass('soft-card', 'rounded-[24px]');

    fireEvent.click(firstChoice);

    expect(firstChoice).toHaveClass('border-amber-300');
    fireEvent.click(screen.getByRole('button', { name: 'Sprawdź ✓' }));

    const checkButton = screen.getByRole('button', { name: 'Sprawdź ✓' });
    expect(checkButton.className).toMatch(/bg-(emerald|rose)-500/);
  });
});
