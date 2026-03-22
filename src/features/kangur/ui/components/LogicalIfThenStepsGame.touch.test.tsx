/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import LogicalIfThenStepsGame from '@/features/kangur/ui/components/LogicalIfThenStepsGame';

describe('LogicalIfThenStepsGame touch mode', () => {
  it('shows a touch hint and larger slot/card targets on coarse pointers', () => {
    render(
      <LogicalIfThenStepsGame
        rounds={[
          {
            id: 'birds',
            fact: 'Kanarek jest ptakiem.',
            rule: 'Jeśli coś jest ptakiem, to ma skrzydła.',
            conclusion: 'Kanarek ma skrzydła.',
            distractors: ['Kanarek pływa.'],
            explanation: 'Fakt spełnia warunek, więc wniosek jest prawdziwy.',
          },
        ]}
        copy={{
          completion: {
            title: 'Brawo!',
            description: 'Gotowe.',
            restart: 'Jeszcze raz',
          },
          header: {
            stepTemplate: 'Krok {current} / {total}',
            instruction: 'Kliknij karty i ułóż kroki.',
            touchInstruction: 'Dotknij kartę, a potem dotknij pole, do którego chcesz ją wstawić.',
          },
          slots: {
            fact: { label: 'Fakt', hint: 'Co już wiemy?' },
            rule: { label: 'Jeśli… to…', hint: 'Jaka zasada?' },
            conclusion: { label: 'Wniosek', hint: 'Co wynika?' },
          },
          deckTitle: 'Karty',
          cardAriaTemplate: 'Karta: {text}',
          feedback: {
            fillAll: 'Uzupełnij wszystkie kroki.',
            successTemplate: 'Świetnie! {explanation}',
            error: 'Spróbuj jeszcze raz.',
          },
          actions: {
            check: 'Sprawdź',
            retry: 'Spróbuj ponownie',
            next: 'Dalej',
          },
        }}
      />
    );

    expect(screen.getByTestId('logical-if-then-touch-hint')).toHaveTextContent(
      'Dotknij kartę, a potem dotknij pole, do którego chcesz ją wstawić.'
    );
    expect(screen.getByRole('button', { name: /Fakt:/i })).toHaveClass(
      'touch-manipulation',
      'select-none',
      'min-h-[120px]'
    );
    expect(screen.getByRole('button', { name: 'Karta: Kanarek jest ptakiem.' })).toHaveClass(
      'touch-manipulation',
      'select-none',
      'min-h-[3.5rem]'
    );
  });
});
