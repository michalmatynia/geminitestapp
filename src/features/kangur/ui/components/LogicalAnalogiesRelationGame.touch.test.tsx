/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

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

import enMessages from '@/i18n/messages/en.json';
import LogicalAnalogiesRelationGame from '@/features/kangur/ui/components/LogicalAnalogiesRelationGame';

describe('LogicalAnalogiesRelationGame touch interactions', () => {
  it('shows touch guidance and supports tap-to-pair assignment', () => {
    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <LogicalAnalogiesRelationGame onFinish={vi.fn()} />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('logical-analogies-touch-hint')).toHaveTextContent(
      'Tap a relation, then tap a pair to assign it.'
    );

    const relationIcon = screen.getByRole('button', { name: 'opposite' });
    expect(relationIcon).toHaveClass('h-11');
    expect(relationIcon).toHaveClass('w-11');
    expect(relationIcon).toHaveClass('touch-manipulation');

    const pool = screen.getByTestId('logical-analogies-pool');
    const token = within(pool).getByRole('listitem', { name: 'Relation: opposite' });
    expect(token).toHaveClass('touch-manipulation');
    expect(token).toHaveClass('min-h-[4rem]');

    fireEvent.click(token);

    expect(screen.getByTestId('logical-analogies-touch-hint')).toHaveTextContent(
      'Selected relation: opposite. Tap a pair to assign it.'
    );

    const target = screen.getByTestId('logical-analogies-target-r1-1');
    fireEvent.click(target);

    expect(within(target).getByText('opposite')).toBeInTheDocument();
  });
});
