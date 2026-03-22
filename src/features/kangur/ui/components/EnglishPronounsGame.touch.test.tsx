/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import EnglishPronounsGame from '@/features/kangur/ui/components/EnglishPronounsGame';

describe('EnglishPronounsGame touch mode', () => {
  it('shows a touch mode label, hint, and larger answer buttons', () => {
    render(<EnglishPronounsGame onFinish={() => undefined} />);

    expect(screen.getByText('Dotyk')).toBeInTheDocument();
    expect(screen.getByTestId('english-pronouns-touch-hint')).toHaveTextContent(
      'Dotknij zaimka, a potem dotknij Sprawdź.'
    );

    const option = screen.getByRole('button', { name: 'they' });
    expect(option).toHaveClass('touch-manipulation', 'select-none', 'min-h-[4.25rem]');
  });
});
