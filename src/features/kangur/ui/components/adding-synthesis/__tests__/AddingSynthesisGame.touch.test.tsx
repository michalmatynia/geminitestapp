/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import AddingSynthesisGame from '@/features/kangur/ui/components/AddingSynthesisGame';

describe('AddingSynthesisGame touch mode', () => {
  it('shows a touch hint and larger lane buttons on coarse pointers', () => {
    render(<AddingSynthesisGame onFinish={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /start syntezę/i }));

    expect(screen.getByText('Dotknij tor, gdy nuta dojdzie do linii trafienia.')).toBeInTheDocument();
    expect(screen.getByTestId('adding-synthesis-lane-0')).toHaveClass(
      'touch-manipulation',
      'select-none',
      'min-h-[96px]'
    );
  });
});
