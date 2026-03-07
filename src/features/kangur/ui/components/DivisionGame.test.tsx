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
      'border-white/88',
      'bg-white/94'
    );
    expect(screen.getByTestId('division-game-progress-bar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByTestId('division-game-equation')).toHaveClass('text-3xl', 'text-blue-600');
    expect(screen.getByRole('button', { name: 'Sprawdź ✓' })).toHaveClass(
      'kangur-cta-pill',
      'play-cta'
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
      'border-sky-300'
    );
    const firstChoice = screen.getByTestId('division-game-choice-0');

    expect(firstChoice).toHaveClass('soft-card', 'rounded-[24px]');

    fireEvent.click(firstChoice);

    expect(firstChoice).toHaveClass('border-amber-300');
    fireEvent.click(screen.getByRole('button', { name: 'Sprawdź ✓' }));

    const feedback = screen.getByTestId('division-game-feedback');
    expect(feedback).toHaveClass(
      feedback.textContent?.includes('Brawo') ? 'border-emerald-200' : 'border-rose-200'
    );
  });
});
