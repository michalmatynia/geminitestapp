/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import {
  AgenticDrawGame,
} from '@/features/kangur/ui/components/AgenticCodingMiniGames.draw';
import {
  AgenticSequenceGame,
} from '@/features/kangur/ui/components/AgenticCodingMiniGames.sequence';
import {
  AgenticSortGame,
} from '@/features/kangur/ui/components/AgenticCodingMiniGames.sort';
import {
  AgenticTrimGame,
} from '@/features/kangur/ui/components/AgenticCodingMiniGames.trim';

describe('Agentic coding mini-games touch mode', () => {
  it('shows larger step buttons and a touch hint in the sequence game', () => {
    render(
      <AgenticSequenceGame
        accent='indigo'
        config={{
          mode: 'sequence',
          title: 'Sekwencja',
          prompt: 'Ułóż kroki.',
          steps: ['Start', 'Sprawdź', 'Zakończ'],
          success: 'Gotowe.',
          accent: 'indigo',
          svgLabel: 'Sekwencja',
        }}
      />
    );

    expect(screen.getByTestId('agentic-sequence-touch-hint')).toHaveTextContent(
      'Dotykaj kroków po kolei. Każdy poprawny wybór odblokowuje następny.'
    );
    expect(screen.getByRole('button', { name: 'Start' })).toHaveClass(
      'touch-manipulation',
      'select-none',
      'min-h-[3.75rem]'
    );
  });

  it('supports tap-to-assign flow in the sort game on coarse pointers', () => {
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

    expect(screen.getByTestId('agentic-sort-touch-hint')).toHaveTextContent(
      'Dotknij kartę, a potem dotknij kategorię.'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Zapisz wynik' }));
    fireEvent.click(screen.getByTestId('agentic-sort-bin-rules'));

    expect(
      within(screen.getByTestId('agentic-sort-bin-rules')).getByRole('button', {
        name: 'Zapisz wynik',
      })
    ).toBeInTheDocument();
  });

  it('shows touch trimming guidance and larger removable tokens', () => {
    render(
      <AgenticTrimGame
        accent='rose'
        config={{
          mode: 'trim',
          title: 'Przytnij prompt',
          prompt: 'Usuń zbędne słowa.',
          success: 'Gotowe.',
          accent: 'rose',
          svgLabel: 'Przycinanie',
          tokens: [
            { id: 'keep', text: 'Zachowaj', keep: true },
            { id: 'drop', text: 'nadmiarowy', keep: false },
          ],
        }}
      />
    );

    expect(screen.getByTestId('agentic-trim-touch-hint')).toHaveTextContent(
      'Dotykaj zbędnych słów, aby je wykreślić. Ponowne dotknięcie przywraca wyraz.'
    );
    expect(screen.getByRole('button', { name: /nadmiarowy/i })).toHaveClass(
      'touch-manipulation',
      'select-none',
      'min-h-[3rem]'
    );
  });

  it('shows touch drawing guidance and a larger reset control', () => {
    render(
      <AgenticDrawGame
        accent='sky'
        config={{
          mode: 'draw',
          title: 'Rysowanie',
          prompt: 'Połącz punkty.',
          success: 'Świetnie!',
          accent: 'sky',
          svgLabel: 'Rysowanie',
          guide: 'line',
          checkpoints: [
            { id: 'a', label: 'A', x: 80, y: 70 },
            { id: 'b', label: 'B', x: 280, y: 70 },
          ],
        }}
      />
    );

    expect(screen.getByTestId('agentic-draw-touch-hint')).toHaveTextContent(
      'Prowadź palcem po planszy i zalicz wszystkie punkty kontrolne.'
    );
    expect(screen.getByRole('button', { name: 'Reset' })).toHaveClass(
      'touch-manipulation',
      'select-none',
      'min-h-11'
    );
  });
});
