/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import MultiplicationArrayGame from '@/features/kangur/ui/components/MultiplicationArrayGame';

describe('MultiplicationArrayGame', () => {
  it('uses Kangur option-card styling for group collection buttons', () => {
    render(<MultiplicationArrayGame onFinish={() => undefined} />);

    expect(screen.getByTestId('multiplication-array-progress-bar')).toHaveAttribute(
      'aria-valuenow',
      '0'
    );
    expect(screen.getByTestId('multiplication-array-round-shell')).toHaveClass(
      'glass-panel',
      'border-white/88',
      'bg-white/94'
    );
    expect(screen.getByTestId('multiplication-array-counter-collected')).toHaveClass(
      'soft-card',
      'border-violet-300'
    );
    expect(screen.getByTestId('multiplication-array-counter-target')).toHaveClass(
      'soft-card',
      'border'
    );
    const firstGroup = screen.getByTestId('multiplication-array-group-0');

    expect(firstGroup).toHaveClass('soft-card', 'rounded-[24px]');
    expect(firstGroup).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(firstGroup);

    expect(firstGroup).toHaveClass('border-violet-300');
    expect(firstGroup).toHaveAttribute('aria-pressed', 'true');
  });
});
