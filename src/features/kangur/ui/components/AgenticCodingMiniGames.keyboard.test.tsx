/**
 * @vitest-environment jsdom
 */

import userEvent from '@testing-library/user-event';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => false,
}));

import { AgenticSortGame } from '@/features/kangur/ui/components/AgenticCodingMiniGames.sort';

describe('AgenticSortGame keyboard interactions', () => {
  it('supports selecting a card and moving it to a category with the keyboard', async () => {
    const user = userEvent.setup();

    render(
      <AgenticSortGame
        accent='teal'
        config={{
          mode: 'sort',
          title: 'Sortowanie',
          prompt: 'Przypisz karty.',
          bins: [{ id: 'rules', label: 'Reguły' }],
          items: [{ id: 'rule-1', label: 'Zapisz wynik', binId: 'rules' }],
          success: 'Brawo!',
          accent: 'teal',
          svgLabel: 'Sortowanie',
        }}
      />
    );

    expect(screen.getByTestId('agentic-sort-keyboard-hint')).toHaveTextContent(
      'Przeciągnij kartę albo wybierz ją klawiaturą i przenieś do kategorii Enterem albo Spacją.'
    );

    const token = screen.getByRole('button', { name: 'Zapisz wynik' });
    token.focus();
    await user.keyboard('{Enter}');

    expect(token).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('agentic-sort-keyboard-hint')).toHaveTextContent(
      'Wybrana karta: Zapisz wynik. Przejdź do kategorii i naciśnij Enter albo Spację.'
    );

    const bin = screen.getByRole('button', {
      name: 'Przenieś wybraną kartę do kategorii Reguły',
    });
    bin.focus();
    await user.keyboard('{Enter}');

    expect(within(screen.getByTestId('agentic-sort-bin-rules')).getByRole('button', {
      name: 'Zapisz wynik',
    })).toBeInTheDocument();
    expect(screen.getByTestId('agentic-sort-keyboard-hint')).toHaveTextContent(
      'Przeciągnij kartę albo wybierz ją klawiaturą i przenieś do kategorii Enterem albo Spacją.'
    );
  });
});
