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
import LogicalPatternsWorkshopGame from '@/features/kangur/ui/components/LogicalPatternsWorkshopGame';

describe('LogicalPatternsWorkshopGame touch interactions', () => {
  it('shows touch guidance and supports tap-to-slot assignment', () => {
    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <LogicalPatternsWorkshopGame onFinish={vi.fn()} />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('logical-patterns-touch-hint')).toHaveTextContent(
      'Dotknij kafelka, a potem pustego pola.'
    );

    const pool = screen.getByTestId('logical-patterns-pool');
    const diamondTile = within(pool).getByRole('button', { name: 'Kafelek: symbol 🔷' });
    expect(diamondTile).toHaveClass('touch-manipulation');
    expect(diamondTile).toHaveStyle({ touchAction: 'none' });
    expect(diamondTile).toHaveClass('min-h-[4rem]');

    fireEvent.click(diamondTile);

    expect(screen.getByTestId('logical-patterns-touch-hint')).toHaveTextContent(
      'Wybrany kafelek: 🔷. Dotknij pustego pola.'
    );

    const firstSlot = screen.getByTestId('logical-patterns-slot-kolory-1');
    fireEvent.click(firstSlot);

    expect(within(firstSlot).getByText('🔷')).toBeInTheDocument();
  });

  it('supports alphabet-order datasets through the same shared workshop renderer', () => {
    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <LogicalPatternsWorkshopGame patternSetId='alphabet_letter_order' onFinish={vi.fn()} />
      </NextIntlClientProvider>
    );

    expect(screen.getByText('Alfabet A-E')).toBeInTheDocument();

    const pool = screen.getByTestId('logical-patterns-pool');
    const letterTile = within(pool).getByRole('button', { name: 'Kafelek: litera F' });

    fireEvent.click(letterTile);

    expect(screen.getByTestId('logical-patterns-touch-hint')).toHaveTextContent(
      'Wybrany kafelek: F. Dotknij pustego pola.'
    );

    const firstSlot = screen.getByTestId('logical-patterns-slot-alphabet-1');
    fireEvent.click(firstSlot);

    expect(within(firstSlot).getByText('F')).toBeInTheDocument();
  });
});
