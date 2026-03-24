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

import { CompleteEquation } from '@/features/kangur/ui/components/adding-ball-game/AddingBallGame.CompleteEquation';

describe('CompleteEquation touch interactions', () => {
  it('supports selecting a ball and tapping a slot', () => {
    render(
      <CompleteEquation
        round={{ mode: 'complete_equation', a: 2, b: 3, target: 5 }}
        onResult={vi.fn()}
      />
    );

    expect(screen.getByTestId('adding-ball-complete-touch-hint')).toHaveTextContent(
      'Dotknij piłkę, a potem Grupa A, Grupa B albo pulę.'
    );
    expect(screen.getByTestId('adding-ball-complete-solution-hint')).toHaveTextContent(
      'Pasuje 2 + 3 albo 3 + 2. Kolejność grup nie ma znaczenia.'
    );
    expect(screen.getByTestId('adding-ball-complete-unit-hint')).toHaveTextContent(
      'Każda piłka to 1.'
    );

    const pool = screen.getByTestId('adding-ball-pool');
    const firstBall = within(pool).getAllByRole('button', { name: /Piłka:/i })[0];

    expect(firstBall).toHaveClass('touch-manipulation');
    expect(firstBall).toHaveStyle({ touchAction: 'none' });
    fireEvent.click(firstBall);

    expect(screen.getByTestId('adding-ball-complete-touch-hint')).toHaveTextContent(
      'Wybrana piłka: 1. Dotknij Grupa A, Grupa B albo pulę.'
    );

    const slotA = screen.getByTestId('adding-ball-slotA');
    fireEvent.click(slotA);

    expect(within(slotA).getByRole('button', { name: 'Piłka: 1' })).toBeInTheDocument();
  });

  it('accepts swapped group sizes as a correct equation solution', () => {
    vi.useFakeTimers();
    const onResult = vi.fn();

    render(
      <CompleteEquation
        round={{ mode: 'complete_equation', a: 2, b: 3, target: 5 }}
        onResult={onResult}
      />
    );

    const moveFirstPoolBallTo = (target: 'slotA' | 'slotB') => {
      const pool = screen.getByTestId('adding-ball-pool');
      const ball = within(pool).getAllByRole('button', { name: 'Piłka: 1' })[0];
      fireEvent.click(ball);
      fireEvent.click(screen.getByTestId(`adding-ball-${target}`));
    };

    moveFirstPoolBallTo('slotA');
    moveFirstPoolBallTo('slotA');
    moveFirstPoolBallTo('slotA');
    moveFirstPoolBallTo('slotB');
    moveFirstPoolBallTo('slotB');

    fireEvent.click(screen.getByRole('button', { name: /sprawdź/i }));

    expect(screen.getByText('🎉 Brawo! Pasuje 2 + 3 albo 3 + 2.')).toBeInTheDocument();
    vi.advanceTimersByTime(1400);
    expect(onResult).toHaveBeenCalledWith(true);
    vi.useRealTimers();
  });

  it('shows the submitted split when the equation solution is wrong', () => {
    vi.useFakeTimers();
    const onResult = vi.fn();

    render(
      <CompleteEquation
        round={{ mode: 'complete_equation', a: 2, b: 3, target: 5 }}
        onResult={onResult}
      />
    );

    const moveFirstPoolBallTo = (target: 'slotA' | 'slotB') => {
      const pool = screen.getByTestId('adding-ball-pool');
      const ball = within(pool).getAllByRole('button', { name: 'Piłka: 1' })[0];
      fireEvent.click(ball);
      fireEvent.click(screen.getByTestId(`adding-ball-${target}`));
    };

    moveFirstPoolBallTo('slotA');
    moveFirstPoolBallTo('slotA');
    moveFirstPoolBallTo('slotA');
    moveFirstPoolBallTo('slotA');
    moveFirstPoolBallTo('slotB');

    fireEvent.click(screen.getByRole('button', { name: /sprawdź/i }));

    expect(
      screen.getByText('❌ Spróbuj jeszcze raz! Masz 4 + 1, a pasuje 2 + 3 albo 3 + 2.')
    ).toBeInTheDocument();
    vi.advanceTimersByTime(1400);
    expect(onResult).toHaveBeenCalledWith(false);
    vi.useRealTimers();
  });
});
