/**
 * @vitest-environment jsdom
 */

import userEvent from '@testing-library/user-event';
import { render, screen, within } from '@testing-library/react';
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
  useKangurCoarsePointer: () => false,
}));

import enMessages from '@/i18n/messages/en.json';
import DivisionGroupsGame from '@/features/kangur/ui/components/DivisionGroupsGame';

describe('DivisionGroupsGame keyboard interactions', () => {
  it('supports selecting an item and moving it into a group with the keyboard', async () => {
    const user = userEvent.setup();

    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <DivisionGroupsGame onFinish={vi.fn()} />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('division-groups-selection-hint')).toHaveTextContent(
      'Choose an item, then move to a group, the pool, or the remainder area and press Enter or Space.'
    );

    const poolZone = screen.getByTestId('division-groups-pool-zone');
    const token = within(poolZone).getAllByRole('button', { name: 'Move item' })[0];
    const emoji = token?.textContent?.trim() ?? '';

    token.focus();
    await user.keyboard('{Enter}');

    expect(token).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('division-groups-selection-hint')).toHaveTextContent(
      `Selected item: ${emoji}. Move to a group, the pool, or the remainder area and press Enter or Space.`
    );

    const firstGroupZone = screen.getByRole('button', {
      name: 'Move the selected item to group 1',
    });
    firstGroupZone.focus();
    await user.keyboard('{Enter}');

    expect(within(screen.getByTestId('division-groups-group-zone-0')).getByText(emoji)).toBeInTheDocument();
    expect(screen.getByTestId('division-groups-selection-hint')).toHaveTextContent(
      'Choose an item, then move to a group, the pool, or the remainder area and press Enter or Space.'
    );
  });
});
