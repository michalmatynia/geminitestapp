/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

let draggableSnapshot = { isDragging: false };

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
        draggableProps: { style?: React.CSSProperties };
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
      draggableSnapshot
    ),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

vi.mock('@/features/kangur/ui/components/EnglishAdverbsActionStudioGame.data', () => ({
  ENGLISH_ADVERBS_ACTION_STUDIO_ROUNDS: [
    {
      id: 'race-day',
      accent: 'sky',
      tokens: ['fast', 'carefully', 'beautifully', 'happily', 'badly'],
      actions: [
        { id: 'race-day-run', actionId: 'run_race', answer: 'fast' },
        { id: 'race-day-paint', actionId: 'paint_picture', answer: 'beautifully' },
        { id: 'race-day-carry', actionId: 'carry_books', answer: 'carefully' },
      ],
    },
  ],
}));

import enMessages from '@/i18n/messages/en.json';
import EnglishAdverbsActionStudioGame from '@/features/kangur/ui/components/EnglishAdverbsActionStudioGame';

afterEach(() => {
  draggableSnapshot = { isDragging: false };
});

describe('EnglishAdverbsActionStudioGame touch interactions', () => {
  it('supports tap-to-lane placement and keeps the mobile drag-handle styling', () => {
    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <EnglishAdverbsActionStudioGame onFinish={vi.fn()} />
      </NextIntlClientProvider>
    );

    expect(screen.getByText('Tap or drag cards')).toBeInTheDocument();
    expect(screen.getByTestId('english-adverbs-selection-hint')).toHaveTextContent(
      'Tap an adverb card, then tap an action lane or the bank.'
    );

    const pool = screen.getByTestId('english-adverbs-pool-zone');
    const token = within(pool).getByRole('button', { name: 'fast' });

    expect(token).toHaveClass('touch-manipulation');
    expect(token).toHaveClass('min-h-[3.75rem]');
    expect(token).toHaveStyle({ touchAction: 'none' });

    fireEvent.click(token);

    expect(token).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('english-adverbs-selection-hint')).toHaveTextContent(
      'Selected adverb: fast. Tap an action lane or the bank.'
    );

    const slot = screen.getByTestId('english-adverbs-slot-race-day-run');
    fireEvent.click(slot);

    expect(within(slot).getByRole('button', { name: 'fast' })).toBeInTheDocument();
    expect(screen.getByTestId('english-adverbs-sentence-race-day-run')).toHaveTextContent(
      'He runs fast.'
    );
    expect(screen.getByTestId('english-adverbs-selection-hint')).toHaveTextContent(
      'Tap an adverb card, then tap an action lane or the bank.'
    );
  });

  it('keeps the coarse-pointer drag styling when the active card is portaled', () => {
    draggableSnapshot = { isDragging: true };

    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <EnglishAdverbsActionStudioGame onFinish={vi.fn()} />
      </NextIntlClientProvider>
    );

    const draggedToken = within(document.body).getByRole('button', { name: 'fast' });

    expect(draggedToken).toHaveClass('touch-manipulation');
    expect(draggedToken).toHaveClass('min-h-[3.75rem]');
    expect(draggedToken).toHaveStyle({ touchAction: 'none' });
  });
});
