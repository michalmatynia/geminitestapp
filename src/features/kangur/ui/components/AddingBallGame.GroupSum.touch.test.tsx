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
});
