/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import EnglishPrepositionsGame from '@/features/kangur/ui/components/EnglishPrepositionsGame';

describe('EnglishPrepositionsGame touch mode', () => {
  it('shows a touch mode label, hint, and larger answer buttons', () => {
    render(<EnglishPrepositionsGame onFinish={vi.fn()} />);

    expect(screen.getByText('Dotknij')).toBeInTheDocument();
    expect(screen.getByTestId('english-prepositions-touch-hint')).toHaveTextContent(
      'Dotknij przyimek, a potem dotknij Sprawdź.'
    );

    const option = screen.getByRole('button', { name: 'at' });
    expect(option).toHaveClass('touch-manipulation', 'select-none', 'min-h-[4.25rem]');
  });
});
