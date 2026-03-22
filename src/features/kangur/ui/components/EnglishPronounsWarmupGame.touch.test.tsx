/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import EnglishPronounsWarmupGame from '@/features/kangur/ui/components/EnglishPronounsWarmupGame';

describe('EnglishPronounsWarmupGame touch mode', () => {
  it('shows a touch mode label, hint, and larger answer buttons', () => {
    render(<EnglishPronounsWarmupGame onFinish={vi.fn()} />);

    expect(screen.getByText('Dotknij')).toBeInTheDocument();
    expect(screen.getByTestId('english-pronouns-warmup-touch-hint')).toHaveTextContent(
      'Dotknij formę, a potem dotknij Sprawdź.'
    );

    const option = screen.getByRole('button', { name: 'our' });
    expect(option).toHaveClass('touch-manipulation', 'select-none', 'min-h-[4.25rem]');
  });
});
