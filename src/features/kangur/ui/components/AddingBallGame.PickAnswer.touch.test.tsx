/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Droppable: ({
    children,
  }: {
    children: (
      provided: {
        innerRef: (element: HTMLElement | null) => void;
        droppableProps: Record<string, never>;
        placeholder: null;
      },
      snapshot: { isDraggingOver: boolean }
    ) => React.ReactNode;
  }) =>
    children(
      {
        innerRef: () => undefined,
        droppableProps: {},
        placeholder: null,
      },
      { isDraggingOver: false }
    ),
  Draggable: ({
    children,
  }: {
    children: (
      provided: {
        innerRef: (element: HTMLElement | null) => void;
        draggableProps: Record<string, never>;
        dragHandleProps: Record<string, never>;
      },
      snapshot: { isDragging: boolean }
    ) => React.ReactNode;
  }) =>
    children(
      {
        innerRef: () => undefined,
        draggableProps: {},
        dragHandleProps: {},
      },
      { isDragging: false }
    ),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import { PickAnswer } from '@/features/kangur/ui/components/adding-ball-game/AddingBallGame.PickAnswer';

describe('PickAnswer touch interactions', () => {
  it('supports selecting a ball and tapping the answer slot', () => {
    render(
      <PickAnswer
        round={{ mode: 'pick_answer', a: 2, b: 3, correct: 5, choices: [5, 4, 6, 7] }}
        onResult={vi.fn()}
      />
    );

    expect(screen.getByTestId('adding-ball-answer-touch-hint')).toHaveTextContent(
      'Dotknij piłkę, a potem pole odpowiedzi.'
    );

    const correctBall = screen.getByRole('button', { name: 'Piłka: 5' });
    fireEvent.click(correctBall);

    expect(screen.getByTestId('adding-ball-answer-touch-hint')).toHaveTextContent(
      'Wybrana piłka: 5. Dotknij pole odpowiedzi, aby ją ustawić.'
    );

    const answerSlot = screen.getByTestId('adding-ball-answer-slot');
    fireEvent.click(answerSlot);

    const selectedPreview = within(answerSlot).getByText('5');
    expect(selectedPreview).toBeInTheDocument();
    expect(selectedPreview.closest('div.rounded-full')).toHaveClass('bg-red-400');
    expect(selectedPreview.closest('div.rounded-full')).not.toHaveAttribute('style');
  });
});
