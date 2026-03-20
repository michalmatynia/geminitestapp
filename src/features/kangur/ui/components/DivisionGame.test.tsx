/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import DivisionGame from '@/features/kangur/ui/components/DivisionGame';

describe('DivisionGame', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the shared pill CTA style for the confirm action', () => {
    render(<DivisionGame onFinish={() => undefined} />);

    expect(screen.getByTestId('division-game-round-shell')).toHaveClass(
      'glass-panel',
      'kangur-panel-soft',
      'kangur-glass-surface-solid'
    );
    expect(screen.getByTestId('division-game-progress-bar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByTestId('division-game-equation')).toHaveClass('text-3xl', 'text-blue-600');
    expect(screen.getByRole('button', { name: 'Sprawdź ✓' })).toHaveClass(
      'kangur-cta-pill',
      'primary-cta',
      '[background:var(--kangur-soft-card-background)]',
      '[border-color:var(--kangur-soft-card-border)]',
      '[color:var(--kangur-page-text)]'
    );
  });

  it('uses Kangur option-card styling for division choices', () => {
    const realRandom = Math.random;
    vi.spyOn(Math, 'random')
      .mockImplementationOnce(() => 0)
      .mockImplementationOnce(() => 0)
      .mockImplementation(realRandom);

    render(<DivisionGame onFinish={() => undefined} />);

    expect(screen.getByTestId('division-share-group-0')).toHaveClass(
      'soft-card',
      'border',
      'rounded-[22px]'
    );
    const firstChoice = screen.getByTestId('division-game-choice-0');

    expect(firstChoice).toHaveClass('soft-card', 'border', 'kangur-card-surface', 'kangur-card-padding-md');

    fireEvent.click(firstChoice);

    expect(firstChoice).toHaveClass('soft-card', 'kangur-card-surface', 'kangur-card-padding-md');
    fireEvent.click(screen.getByRole('button', { name: 'Sprawdź ✓' }));

    const checkButton = screen.getByRole('button', { name: 'Sprawdź ✓' });
    expect(checkButton.className).toMatch(/bg-(emerald|rose)-500/);
  });
});
