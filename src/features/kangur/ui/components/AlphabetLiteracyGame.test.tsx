/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import AlphabetLiteracyGame from '@/features/kangur/ui/components/AlphabetLiteracyGame';

describe('AlphabetLiteracyGame', () => {
  it('renders the letter-matching dataset through the shared literacy runtime', () => {
    render(<AlphabetLiteracyGame literacyMatchSetId='alphabet_letter_matching' />);

    expect(screen.getByText('Dopasowanie liter')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();

    const option = screen.getByRole('button', { name: 'a' });
    expect(option).toHaveClass('touch-manipulation', 'select-none', 'min-h-[4rem]');

    fireEvent.click(option);

    expect(screen.getByText('Tak, A pasuje do a.')).toBeInTheDocument();
  });

  it('renders the first-words dataset through the same shared literacy runtime', () => {
    render(<AlphabetLiteracyGame literacyMatchSetId='alphabet_first_words' />);

    expect(screen.getByText('Pierwsze słowa')).toBeInTheDocument();
    expect(screen.getByText('🍎')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'jabłko' }));

    expect(screen.getByText('Brawo! To jabłko.')).toBeInTheDocument();
  });
});
