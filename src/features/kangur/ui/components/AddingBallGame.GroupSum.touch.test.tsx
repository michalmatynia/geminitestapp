/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen, within } from '@testing-library/react';
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

const mockRect = (x: number, y: number, w: number, h: number): DOMRect => ({
  left: x,
  right: x + w,
  top: y,
  bottom: y + h,
  width: w,
  height: h,
  x,
  y,
  toJSON: () => ({}),
});

const dragBallToZone = (
  ballButton: HTMLElement,
  targetZone: HTMLElement,
  targetRect: DOMRect,
): void => {
  ballButton.getBoundingClientRect = () => mockRect(10, 10, 64, 64);
  targetZone.getBoundingClientRect = () => targetRect;

  const cx = targetRect.left + targetRect.width / 2;
  const cy = targetRect.top + targetRect.height / 2;

  act(() => {
    fireEvent.pointerDown(ballButton, { clientX: 42, clientY: 42, button: 0 });
  });
  act(() => {
    fireEvent(window, new PointerEvent('pointermove', { clientX: cx, clientY: cy }));
  });
  act(() => {
    fireEvent(window, new PointerEvent('pointerup', { clientX: cx, clientY: cy }));
  });
};

describe('GroupSum touch interactions', () => {
  it('renders the mobile drag layout with updated hint text', () => {
    render(<GroupSum round={{ mode: 'group_sum', a: 2, b: 3, target: 5 }} onResult={vi.fn()} />);

    expect(screen.getByTestId('adding-ball-group-solution-hint')).toHaveTextContent(
      'Kolejność nie ma znaczenia, więc 2 i 3 albo 3 i 2 są poprawne.'
    );
    expect(screen.getByTestId('adding-ball-group-unit-hint')).toHaveTextContent(
      'Każda piłka to 1.'
    );
    expect(screen.getByTestId('adding-ball-group-touch-hint')).toHaveTextContent(
      'Przeciągnij piłkę do grupy 1, grupy 2 albo z powrotem do puli.'
    );
  });

  it('supports dragging a ball from the pool to a group', () => {
    render(<GroupSum round={{ mode: 'group_sum', a: 2, b: 3, target: 5 }} onResult={vi.fn()} />);

    const pool = screen.getByTestId('adding-ball-pool');
    const group1 = screen.getByTestId('adding-ball-group1');
    const group1Rect = mockRect(200, 100, 160, 88);
    const firstBall = within(pool).getAllByRole('button', { name: /Piłka:/i })[0];

    dragBallToZone(firstBall, group1, group1Rect);

    expect(within(group1).getByRole('button', { name: 'Piłka: 1' })).toBeInTheDocument();
  });

  it('accepts swapped group sizes as a correct split', () => {
    vi.useFakeTimers();
    const onResult = vi.fn();

    render(<GroupSum round={{ mode: 'group_sum', a: 2, b: 3, target: 5 }} onResult={onResult} />);

    const group1Rect = mockRect(200, 100, 160, 88);
    const group2Rect = mockRect(400, 100, 160, 88);

    const dragPoolBallTo = (testId: string, rect: DOMRect): void => {
      const pool = screen.getByTestId('adding-ball-pool');
      const ball = within(pool).getAllByRole('button', { name: 'Piłka: 1' })[0];
      const zone = screen.getByTestId(testId);
      dragBallToZone(ball, zone, rect);
    };

    dragPoolBallTo('adding-ball-group1', group1Rect);
    dragPoolBallTo('adding-ball-group1', group1Rect);
    dragPoolBallTo('adding-ball-group1', group1Rect);
    dragPoolBallTo('adding-ball-group2', group2Rect);
    dragPoolBallTo('adding-ball-group2', group2Rect);

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

    const group1Rect = mockRect(200, 100, 160, 88);
    const group2Rect = mockRect(400, 100, 160, 88);

    const dragPoolBallTo = (testId: string, rect: DOMRect): void => {
      const pool = screen.getByTestId('adding-ball-pool');
      const ball = within(pool).getAllByRole('button', { name: 'Piłka: 1' })[0];
      const zone = screen.getByTestId(testId);
      dragBallToZone(ball, zone, rect);
    };

    dragPoolBallTo('adding-ball-group1', group1Rect);
    dragPoolBallTo('adding-ball-group1', group1Rect);
    dragPoolBallTo('adding-ball-group1', group1Rect);
    dragPoolBallTo('adding-ball-group1', group1Rect);
    dragPoolBallTo('adding-ball-group2', group2Rect);

    fireEvent.click(screen.getByRole('button', { name: /sprawdź/i }));

    expect(
      screen.getByText('❌ Spróbuj jeszcze raz! Masz grupy 4 i 1, a szukamy 2 i 3 albo 3 i 2.')
    ).toBeInTheDocument();
    vi.advanceTimersByTime(1400);
    expect(onResult).toHaveBeenCalledWith(false);
    vi.useRealTimers();
  });
});
