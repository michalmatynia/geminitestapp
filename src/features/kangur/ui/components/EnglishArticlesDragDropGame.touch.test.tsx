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

vi.mock('@/features/kangur/ui/components/EnglishArticlesDragDropGame.data', () => ({
  ENGLISH_ARTICLES_DRAG_DROP_ROUNDS: [
    {
      id: 'school-bag',
      accent: 'amber',
      sentences: [
        {
          id: 'school-bag-book',
          before: 'I need',
          after: 'notebook for English class.',
          answer: 'a',
        },
        {
          id: 'school-bag-eraser',
          before: 'She has',
          after: 'eraser in her pencil case.',
          answer: 'an',
        },
        {
          id: 'school-bag-window',
          before: 'Please close',
          after: 'window next to the board.',
          answer: 'the',
        },
      ],
    },
  ],
}));

import enMessages from '@/i18n/messages/en.json';
import EnglishArticlesDragDropGame from '@/features/kangur/ui/components/EnglishArticlesDragDropGame';

afterEach(() => {
  draggableSnapshot = { isDragging: false };
});

describe('EnglishArticlesDragDropGame touch interactions', () => {
  it('supports tap-to-slot article placement and keeps the mobile drag-handle styling', () => {
    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <EnglishArticlesDragDropGame onFinish={vi.fn()} />
      </NextIntlClientProvider>
    );

    expect(screen.getByText('Tap or drag')).toBeInTheDocument();
    expect(screen.getByTestId('english-articles-drag-selection-hint')).toHaveTextContent(
      'Tap an article, then tap a sentence or the bank.'
    );

    const pool = screen.getByTestId('english-articles-drag-pool-zone');
    const token = within(pool).getByRole('button', { name: 'a' });

    expect(token).toHaveClass('touch-manipulation');
    expect(token).toHaveClass('min-h-[3.75rem]');
    expect(token).toHaveStyle({ touchAction: 'none' });

    fireEvent.click(token);

    expect(token).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('english-articles-drag-selection-hint')).toHaveTextContent(
      'Selected article: a. Tap a sentence or the bank.'
    );

    const slot = screen.getByTestId('english-articles-drag-slot-school-bag-book');
    fireEvent.click(slot);

    expect(within(slot).getByText('a')).toBeInTheDocument();
    expect(screen.getByTestId('english-articles-drag-selection-hint')).toHaveTextContent(
      'Tap an article, then tap a sentence or the bank.'
    );
  });

  it('keeps the coarse-pointer drag styling when the active token is portaled', () => {
    draggableSnapshot = { isDragging: true };

    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <EnglishArticlesDragDropGame onFinish={vi.fn()} />
      </NextIntlClientProvider>
    );

    const draggedToken = within(document.body).getByRole('button', { name: 'a' });

    expect(draggedToken).toHaveClass('touch-manipulation');
    expect(draggedToken).toHaveClass('min-h-[3.75rem]');
    expect(draggedToken).toHaveStyle({ touchAction: 'none' });
  });
});
