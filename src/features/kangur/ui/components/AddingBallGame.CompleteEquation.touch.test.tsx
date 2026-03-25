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

import { CompleteEquation } from '@/features/kangur/ui/components/adding-ball-game/AddingBallGame.CompleteEquation';

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

/**
 * Simulates a pointer drag from a ball in the pool to a target drop zone.
 * We mock getBoundingClientRect on target elements so the hit-testing
 * inside PointerDragProvider finds the right zone.
 */
const dragBallToZone = (
  ballButton: HTMLElement,
  targetZone: HTMLElement,
  targetRect: DOMRect,
): void => {
  // The ball element rect is needed for offset calculation
  ballButton.getBoundingClientRect = () => mockRect(10, 10, 64, 64);
  targetZone.getBoundingClientRect = () => targetRect;

  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;

  act(() => {
    fireEvent.pointerDown(ballButton, { clientX: 42, clientY: 42, button: 0 });
  });
  act(() => {
    fireEvent(window, new PointerEvent('pointermove', { clientX: targetCenterX, clientY: targetCenterY }));
  });
  act(() => {
    fireEvent(window, new PointerEvent('pointerup', { clientX: targetCenterX, clientY: targetCenterY }));
  });
};

describe('CompleteEquation touch interactions', () => {
  it('renders the mobile drag layout with updated hint text', () => {
    render(
      <CompleteEquation
        round={{ mode: 'complete_equation', a: 2, b: 3, target: 5 }}
        onResult={vi.fn()}
      />
    );

    expect(screen.getByTestId('adding-ball-complete-touch-hint')).toHaveTextContent(
      'Przeciągnij piłkę do Grupy A, Grupy B albo z powrotem do puli.'
    );
    expect(screen.getByTestId('adding-ball-complete-solution-hint')).toHaveTextContent(
      'Pasuje 2 + 3 albo 3 + 2. Kolejność grup nie ma znaczenia.'
    );
    expect(screen.getByTestId('adding-ball-complete-unit-hint')).toHaveTextContent(
      'Każda piłka to 1.'
    );
  });

  it('supports dragging a ball from the pool to a slot', () => {
    render(
      <CompleteEquation
        round={{ mode: 'complete_equation', a: 2, b: 3, target: 5 }}
        onResult={vi.fn()}
      />
    );

    const pool = screen.getByTestId('adding-ball-pool');
    const slotA = screen.getByTestId('adding-ball-slotA');
    const slotARect = mockRect(200, 100, 160, 88);
    const firstBall = within(pool).getAllByRole('button', { name: /Piłka:/i })[0];

    dragBallToZone(firstBall, slotA, slotARect);

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

    const slotARect = mockRect(200, 100, 160, 88);
    const slotBRect = mockRect(400, 100, 160, 88);

    const dragPoolBallTo = (testId: string, rect: DOMRect): void => {
      const pool = screen.getByTestId('adding-ball-pool');
      const ball = within(pool).getAllByRole('button', { name: 'Piłka: 1' })[0];
      const zone = screen.getByTestId(testId);
      dragBallToZone(ball, zone, rect);
    };

    dragPoolBallTo('adding-ball-slotA', slotARect);
    dragPoolBallTo('adding-ball-slotA', slotARect);
    dragPoolBallTo('adding-ball-slotA', slotARect);
    dragPoolBallTo('adding-ball-slotB', slotBRect);
    dragPoolBallTo('adding-ball-slotB', slotBRect);

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

    const slotARect = mockRect(200, 100, 160, 88);
    const slotBRect = mockRect(400, 100, 160, 88);

    const dragPoolBallTo = (testId: string, rect: DOMRect): void => {
      const pool = screen.getByTestId('adding-ball-pool');
      const ball = within(pool).getAllByRole('button', { name: 'Piłka: 1' })[0];
      const zone = screen.getByTestId(testId);
      dragBallToZone(ball, zone, rect);
    };

    dragPoolBallTo('adding-ball-slotA', slotARect);
    dragPoolBallTo('adding-ball-slotA', slotARect);
    dragPoolBallTo('adding-ball-slotA', slotARect);
    dragPoolBallTo('adding-ball-slotA', slotARect);
    dragPoolBallTo('adding-ball-slotB', slotBRect);

    fireEvent.click(screen.getByRole('button', { name: /sprawdź/i }));

    expect(
      screen.getByText('❌ Spróbuj jeszcze raz! Masz 4 + 1, a pasuje 2 + 3 albo 3 + 2.')
    ).toBeInTheDocument();
    vi.advanceTimersByTime(1400);
    expect(onResult).toHaveBeenCalledWith(false);
    vi.useRealTimers();
  });
});
