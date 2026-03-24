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

import { GroupSum } from '@/features/kangur/ui/components/adding-ball-game/AddingBallGame.GroupSum';

describe('GroupSum touch interactions', () => {
  it('supports selecting a ball and tapping a group', () => {
    render(<GroupSum round={{ mode: 'group_sum', a: 2, b: 3, target: 5 }} onResult={vi.fn()} />);

    expect(screen.getByTestId('adding-ball-group-solution-hint')).toHaveTextContent(
      'Kolejność nie ma znaczenia, więc 2 i 3 albo 3 i 2 są poprawne.'
    );
    expect(screen.getByTestId('adding-ball-group-unit-hint')).toHaveTextContent(
      'Każda piłka to 1.'
    );
    expect(screen.getByTestId('adding-ball-group-touch-hint')).toHaveTextContent(
      'Dotknij piłkę, a potem grupę 1, grupę 2 albo pulę.'
    );

    const pool = screen.getByTestId('adding-ball-pool');
    const firstBall = within(pool).getAllByRole('button', { name: /Piłka:/i })[0];
    fireEvent.click(firstBall);

    expect(screen.getByTestId('adding-ball-group-touch-hint')).toHaveTextContent(
      'Wybrana piłka: 1. Dotknij grupę 1, grupę 2 albo pulę.'
    );

    const group1 = screen.getByTestId('adding-ball-group1');
    fireEvent.click(group1);

    expect(within(group1).getByRole('button', { name: 'Piłka: 1' })).toBeInTheDocument();
  });

  it('accepts swapped group sizes as a correct split', () => {
    vi.useFakeTimers();
    const onResult = vi.fn();

    render(<GroupSum round={{ mode: 'group_sum', a: 2, b: 3, target: 5 }} onResult={onResult} />);

    const moveFirstPoolBallTo = (target: 'group1' | 'group2') => {
      const pool = screen.getByTestId('adding-ball-pool');
      const ball = within(pool).getAllByRole('button', { name: 'Piłka: 1' })[0];
      fireEvent.click(ball);
      fireEvent.click(screen.getByTestId(`adding-ball-${target}`));
    };

    moveFirstPoolBallTo('group1');
    moveFirstPoolBallTo('group1');
    moveFirstPoolBallTo('group1');
    moveFirstPoolBallTo('group2');
    moveFirstPoolBallTo('group2');

    fireEvent.click(screen.getByRole('button', { name: /sprawdź/i }));

    expect(
      screen.getByText('🎉 Brawo! Pasują grupy 2 i 3 albo 3 i 2.')
    ).toBeInTheDocument();
    vi.advanceTimersByTime(1400);
    expect(onResult).toHaveBeenCalledWith(true);
    vi.useRealTimers();
  });

  it('shows the submitted split when the grouping is wrong', () => {
    vi.useFakeTimers();
    const onResult = vi.fn();

    render(<GroupSum round={{ mode: 'group_sum', a: 2, b: 3, target: 5 }} onResult={onResult} />);

    const moveFirstPoolBallTo = (target: 'group1' | 'group2') => {
      const pool = screen.getByTestId('adding-ball-pool');
      const ball = within(pool).getAllByRole('button', { name: 'Piłka: 1' })[0];
      fireEvent.click(ball);
      fireEvent.click(screen.getByTestId(`adding-ball-${target}`));
    };

    moveFirstPoolBallTo('group1');
    moveFirstPoolBallTo('group1');
    moveFirstPoolBallTo('group1');
    moveFirstPoolBallTo('group1');
    moveFirstPoolBallTo('group2');

    fireEvent.click(screen.getByRole('button', { name: /sprawdź/i }));

    expect(
      screen.getByText('❌ Spróbuj jeszcze raz! Masz grupy 4 i 1, a szukamy 2 i 3 albo 3 i 2.')
    ).toBeInTheDocument();
    vi.advanceTimersByTime(1400);
    expect(onResult).toHaveBeenCalledWith(false);
    vi.useRealTimers();
  });
});
