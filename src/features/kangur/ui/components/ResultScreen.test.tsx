/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ResultScreen from '@/features/kangur/ui/components/ResultScreen';

describe('ResultScreen', () => {
  it('uses the shared Kangur progress bar for the score summary', () => {
    render(
      <ResultScreen
        onHome={vi.fn()}
        onRestart={vi.fn()}
        operation='addition'
        playerName='Maja'
        score={3}
        timeTaken={42}
        total={4}
      />
    );

    expect(screen.getByTestId('result-screen-progress-bar')).toHaveAttribute('aria-valuenow', '75');
    expect(screen.getByTestId('result-screen-progress-bar')).toHaveClass(
      'rounded-full',
      'bg-slate-100/95'
    );
  });
});
