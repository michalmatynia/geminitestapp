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
      }
    ) => React.ReactNode;
  }) =>
    children({
      innerRef: () => undefined,
      draggableProps: {},
      dragHandleProps: {},
    }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import LogicalThinkingLabGame, {
  type LogicalThinkingLabGameCopy,
} from '@/features/kangur/ui/components/LogicalThinkingLabGame';

const copy: LogicalThinkingLabGameCopy = {
  completion: {
    title: 'Done',
    description: 'Completed',
    restart: 'Restart',
  },
  header: {
    stageTemplate: 'Stage {current}/{total}',
    instruction: 'Finish the tasks.',
  },
  pattern: {
    prompt: 'Complete the pattern.',
    slotLabels: {
      first: 'Slot 1',
      second: 'Slot 2',
    },
    filledSlotAriaTemplate: '{slot}: {token}',
    emptySlotAriaTemplate: '{slot}: empty',
    selectTokenAriaTemplate: 'Select symbol {token}',
    selectedTemplate: 'Selected tile: {token}',
    idle: 'Select a tile for keyboard movement.',
    touchIdle: 'Tap a tile, then tap slot 1, slot 2, or the pool.',
    touchSelectedTemplate: 'Selected tile: {token}. Tap slot 1, slot 2, or the pool.',
    moveToFirst: 'To slot 1',
    moveToSecond: 'To slot 2',
    moveToPool: 'To pool',
  },
  classify: {
    prompt: 'Sort the pictures.',
    yesZoneLabel: 'Has wings',
    noZoneLabel: 'No wings',
    yesZoneAriaLabel: 'Zone: has wings',
    noZoneAriaLabel: 'Zone: no wings',
    selectItemAriaTemplate: 'Select item {item}',
    selectedTemplate: 'Selected item: {item}',
    idle: 'Select an item for keyboard movement.',
    touchIdle: 'Tap a picture, then tap the has wings zone, no wings zone, or the pool.',
    touchSelectedTemplate:
      'Selected item: {item}. Tap the has wings zone, no wings zone, or the pool.',
    moveToYes: 'To has wings',
    moveToNo: 'To no wings',
    moveToPool: 'To pool',
  },
  analogy: {
    prompt: 'Complete the analogy.',
    optionAriaTemplate: 'Option: {option}',
  },
  feedback: {
    info: 'Fill the task first.',
    success: 'Great job!',
    error: 'Try again.',
  },
  actions: {
    check: 'Check',
    retry: 'Retry',
    next: 'Next',
    finish: 'Finish',
  },
};

describe('LogicalThinkingLabGame touch interactions', () => {
  it('supports tap flow in the pattern and classify stages', () => {
    render(
      <LogicalThinkingLabGame
        analogyRounds={[
          {
            id: 'bird',
            prompt: 'Bird : flies = Fish : ?',
            options: [
              { id: 'swims', label: 'swims' },
              { id: 'runs', label: 'runs' },
            ],
            correctId: 'swims',
            explanation: 'Fish swim.',
          },
        ]}
        copy={copy}
      />
    );

    expect(screen.getByTestId('logical-thinking-pattern-touch-hint')).toHaveTextContent(
      'Tap a tile, then tap slot 1, slot 2, or the pool.'
    );

    const triangle = screen.getByRole('button', { name: 'Select symbol 🔺' });
    expect(triangle).toHaveClass('touch-manipulation');
    expect(triangle).toHaveClass('min-h-[3.75rem]');

    fireEvent.click(triangle);

    expect(screen.getByTestId('logical-thinking-pattern-touch-hint')).toHaveTextContent(
      'Selected tile: 🔺. Tap slot 1, slot 2, or the pool.'
    );

    const slot1 = screen.getByTestId('logical-thinking-pattern-slot-1');
    fireEvent.click(slot1);
    expect(within(slot1).getByText('🔺')).toBeInTheDocument();

    const circle = screen.getByRole('button', { name: 'Select symbol 🔵' });
    fireEvent.click(circle);
    fireEvent.click(screen.getByTestId('logical-thinking-pattern-slot-2'));

    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByTestId('logical-thinking-classify-touch-hint')).toHaveTextContent(
      'Tap a picture, then tap the has wings zone, no wings zone, or the pool.'
    );

    const butterfly = screen.getByRole('button', { name: 'Select item 🦋' });
    fireEvent.click(butterfly);

    expect(screen.getByTestId('logical-thinking-classify-touch-hint')).toHaveTextContent(
      'Selected item: 🦋. Tap the has wings zone, no wings zone, or the pool.'
    );

    const yesZone = screen.getByTestId('logical-thinking-classify-zone-yes');
    fireEvent.click(yesZone);
    expect(within(yesZone).getByText('🦋')).toBeInTheDocument();
  });
});
