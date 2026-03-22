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
import EnglishPrepositionsSortGame from '@/features/kangur/ui/components/EnglishPrepositionsSortGame';

describe('EnglishPrepositionsSortGame touch interactions', () => {
  it('shows touch guidance and supports tap-to-bin sorting', () => {
    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <EnglishPrepositionsSortGame onFinish={vi.fn()} />
      </NextIntlClientProvider>
    );

    expect(screen.getByText('Tap or drag')).toBeInTheDocument();
    expect(screen.getByTestId('english-prepositions-sort-selection-hint')).toHaveTextContent(
      'Tap a phrase, then tap a preposition basket or the pool.'
    );

    const pool = screen.getByTestId('english-prepositions-sort-pool-zone');
    const token = within(pool).getByRole('button', { name: '7:30' });
    expect(token).toHaveClass('touch-manipulation');
    expect(token).toHaveClass('min-h-[3.75rem]');

    fireEvent.click(token);

    expect(token).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('english-prepositions-sort-selection-hint')).toHaveTextContent(
      'Selected phrase: 7:30. Tap a preposition basket or the pool.'
    );

    const atBin = screen.getByTestId('english-prepositions-sort-bin-at');
    fireEvent.click(atBin);

    expect(within(atBin).getByText('7:30')).toBeInTheDocument();
    expect(screen.getByTestId('english-prepositions-sort-selection-hint')).toHaveTextContent(
      'Tap a phrase, then tap a preposition basket or the pool.'
    );
  });
});
