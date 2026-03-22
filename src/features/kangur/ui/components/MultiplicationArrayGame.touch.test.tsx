/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import MultiplicationArrayGame from '@/features/kangur/ui/components/MultiplicationArrayGame';

describe('MultiplicationArrayGame touch mode', () => {
  it('shows a touch hint and larger row targets on coarse pointers', () => {
    render(<MultiplicationArrayGame onFinish={() => undefined} />);

    expect(screen.getByTestId('multiplication-array-touch-hint')).toHaveTextContent(
      'Dotknij kolejną grupę, aby ją zebrać. Wszystkich grup:'
    );

    const firstGroup = screen.getByTestId('multiplication-array-group-0');
    expect(firstGroup).toHaveClass('touch-manipulation', 'select-none', 'min-h-[4.5rem]');
  });
});
