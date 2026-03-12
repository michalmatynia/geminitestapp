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
      '[border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_46%,rgb(237_233_254))]',
      '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_86%,rgb(237_233_254))]'
    );
    expect(screen.getByTestId('multiplication-array-counter-target')).toHaveClass(
      'soft-card',
      'border',
      '[color:var(--kangur-soft-card-text)]'
    );
    const firstGroup = screen.getByTestId('multiplication-array-group-0');

    expect(firstGroup).toHaveClass(
      'soft-card',
      'border',
      'kangur-card-surface',
      'kangur-card-padding-md',
      'cursor-pointer'
    );
    expect(firstGroup).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(firstGroup);

    expect(firstGroup).toHaveClass(
      '[border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_46%,rgb(237_233_254))]',
      '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_86%,rgb(237_233_254))]',
      '[color:color-mix(in_srgb,var(--kangur-page-text)_72%,rgb(124_58_237))]'
    );
    expect(firstGroup).toHaveAttribute('aria-pressed', 'true');
  });
});
