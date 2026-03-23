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
import GeometryBasicsWorkshopGame from '@/features/kangur/ui/components/GeometryBasicsWorkshopGame';

describe('GeometryBasicsWorkshopGame touch interactions', () => {
  it('shows touch guidance and supports tap-to-board assignment', () => {
    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <GeometryBasicsWorkshopGame onFinish={vi.fn()} />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('geometry-basics-touch-hint')).toHaveTextContent(
      'Tap a label, then tap the marked spot on the board.'
    );

    const pool = screen.getByTestId('geometry-basics-pool');
    const pointLabel = within(pool).getByRole('button', { name: 'Label: Point' });
    expect(pointLabel).toHaveClass('touch-manipulation');
    expect(pointLabel).toHaveStyle({ touchAction: 'none' });
    expect(pointLabel).toHaveClass('min-h-[4rem]');

    fireEvent.click(pointLabel);

    expect(screen.getByTestId('geometry-basics-touch-hint')).toHaveTextContent(
      'Selected label: Point. Tap the marked spot on the board.'
    );

    const target = screen.getByTestId('geometry-basics-target');
    fireEvent.click(target);

    expect(within(target).getByText('Point')).toBeInTheDocument();
  });
});
