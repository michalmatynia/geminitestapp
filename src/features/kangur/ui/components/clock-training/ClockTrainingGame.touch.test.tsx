/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import ClockTrainingGame from '@/features/kangur/ui/components/clock-training/ClockTrainingGame';

describe('ClockTrainingGame touch mode', () => {
  it('shows a touch hint and larger control buttons on coarse pointers', () => {
    render(<ClockTrainingGame onFinish={vi.fn()} />);

    expect(screen.getByTestId('clock-training-touch-hint')).toHaveTextContent(
      'Przesuwaj wskazówki palcem, aby ustawić czas.'
    );
    expect(screen.getByTestId('clock-mode-practice')).toHaveClass(
      'touch-manipulation',
      'select-none',
      'min-h-12'
    );
    expect(screen.getByTestId('clock-snap-mode-5')).toHaveClass(
      'touch-manipulation',
      'select-none',
      'min-h-12'
    );
  });
});
