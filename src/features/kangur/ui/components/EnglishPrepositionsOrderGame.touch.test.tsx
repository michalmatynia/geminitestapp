/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
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
import EnglishPrepositionsOrderGame from '@/features/kangur/ui/components/EnglishPrepositionsOrderGame';

describe('EnglishPrepositionsOrderGame touch interactions', () => {
  it('supports tap-based word reordering on coarse pointers', () => {
    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <EnglishPrepositionsOrderGame onFinish={vi.fn()} />
      </NextIntlClientProvider>
    );

    expect(screen.getByText('Tap or drag')).toBeInTheDocument();
    expect(screen.getByTestId('english-prepositions-order-selection-hint')).toHaveTextContent(
      'Tap a phrase, then tap another phrase to move it there.'
    );

    const previewBefore = screen.getByTestId('english-prepositions-order-preview').textContent;
    const token = screen.getByRole('button', { name: 'Word: We' });
    expect(token).toHaveClass('touch-manipulation');
    expect(token).toHaveClass('min-h-[4rem]');

    fireEvent.click(token);

    expect(screen.getByTestId('english-prepositions-order-selection-hint')).toHaveTextContent(
      'Selected phrase: We. Tap another phrase to move it there.'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Word: 8:00.' }));

    expect(screen.getByTestId('english-prepositions-order-preview').textContent).not.toBe(
      previewBefore
    );
  });
});
