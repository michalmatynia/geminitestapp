/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

const lockMock = vi.fn();
const unlockMock = vi.fn();

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
    draggableId,
    children,
  }: {
    draggableId: string;
    children: (
      provided: {
        innerRef: (element: HTMLElement | null) => void;
        draggableProps: Record<string, never>;
        dragHandleProps: Record<string, string>;
      },
      snapshot: { isDragging: boolean }
    ) => React.ReactNode;
  }) =>
    children(
      {
        innerRef: () => undefined,
        draggableProps: {},
        dragHandleProps: {
          'data-rfd-drag-handle-draggable-id': draggableId,
        },
      },
      { isDragging: false }
    ),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurMobileInteractionScrollLock', () => ({
  useKangurMobileInteractionScrollLock: () => ({
    lock: lockMock,
    unlock: unlockMock,
  }),
}));

import enMessages from '@/i18n/messages/en.json';
import DivisionGroupsGame from '@/features/kangur/ui/components/DivisionGroupsGame';

const renderGame = () =>
  render(
    <NextIntlClientProvider locale='en' messages={enMessages}>
      <DivisionGroupsGame onFinish={vi.fn()} />
    </NextIntlClientProvider>
  );

afterEach(() => {
  lockMock.mockClear();
  unlockMock.mockClear();
});

describe('DivisionGroupsGame touch interactions', () => {
  it('supports coarse-pointer tap selection and moving into a destination zone', () => {
    renderGame();

    expect(screen.getByTestId('division-groups-selection-hint')).toHaveTextContent(
      'Tap an item, then tap a group, the pool, or the remainder area. You can still drag too.'
    );

    const poolZone = screen.getByTestId('division-groups-pool-zone');
    const token = within(poolZone).getAllByRole('button', { name: 'Move item' })[0];
    expect(token).toHaveClass('touch-manipulation');
    expect(token).toHaveStyle({ touchAction: 'none' });

    const emoji = token?.textContent?.trim() ?? '';
    expect(emoji).not.toBe('');

    fireEvent.click(token);

    expect(token).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('division-groups-selection-hint')).toHaveTextContent(
      `Selected item: ${emoji}.`
    );

    const firstGroupZone = screen.getByTestId('division-groups-group-zone-0');
    fireEvent.click(firstGroupZone);

    expect(screen.getByTestId('division-groups-selection-hint')).toHaveTextContent(
      'Tap an item, then tap a group, the pool, or the remainder area. You can still drag too.'
    );
    expect(within(firstGroupZone).getByText(emoji)).toBeInTheDocument();
  });

  it('locks mobile scroll when touching a real draggable item handle', () => {
    renderGame();

    const poolZone = screen.getByTestId('division-groups-pool-zone');
    const token = within(poolZone).getAllByRole('button', { name: 'Move item' })[0];
    expect(token).toHaveAttribute('data-rfd-drag-handle-draggable-id');

    fireEvent.touchStart(token);
    expect(lockMock).toHaveBeenCalledTimes(1);

    fireEvent.touchEnd(document);
    expect(unlockMock).toHaveBeenCalledTimes(1);
  });
});
