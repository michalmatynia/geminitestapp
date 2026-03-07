/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import DivisionGame from '@/features/kangur/ui/components/DivisionGame';

describe('DivisionGame', () => {
  it('uses the shared pill CTA style for the confirm action', () => {
    render(<DivisionGame onFinish={() => undefined} />);

    expect(screen.getByTestId('division-game-round-shell')).toHaveClass('glass-panel');
    expect(screen.getByTestId('division-game-progress-bar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByRole('button', { name: 'Sprawdź ✓' })).toHaveClass(
      'kangur-cta-pill',
      'play-cta'
    );
  });

  it('uses Kangur option-card styling for division choices', () => {
    render(<DivisionGame onFinish={() => undefined} />);

    const firstChoice = screen.getByTestId('division-game-choice-0');

    expect(firstChoice).toHaveClass('soft-card', 'rounded-[24px]');

    fireEvent.click(firstChoice);

    expect(firstChoice).toHaveClass('border-amber-300');
  });
});
