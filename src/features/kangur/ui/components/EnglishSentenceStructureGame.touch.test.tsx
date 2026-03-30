/**
 * @vitest-environment jsdom
 */

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
      }
    ) => React.ReactNode;
  }) =>
    children({
      innerRef: () => undefined,
      droppableProps: {},
      placeholder: null,
    }),
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
      draggableSnapshot
    ),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

vi.mock('@/features/kangur/ui/services/round-transition', () => ({
  scheduleKangurRoundFeedback: (callback: () => void) => callback(),
}));

import enMessages from '@/i18n/messages/en.json';
import EnglishSentenceStructureGame from '@/features/kangur/ui/components/EnglishSentenceStructureGame';

afterEach(() => {
  draggableSnapshot = { isDragging: false };
});

describe('EnglishSentenceStructureGame touch interactions', () => {
  it('supports tap-based word reordering on coarse pointers', () => {
    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <EnglishSentenceStructureGame onFinish={vi.fn()} />
      </NextIntlClientProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'The drummer plays the rhythm.' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));

    expect(screen.getByTestId('english-structure-touch-hint')).toHaveTextContent(
      'Tap a word, then tap another word to move it there.'
    );

    const previewBefore = screen.getByTestId('english-structure-order-preview').textContent;
    const myToken = screen.getByRole('button', { name: 'Word: My' });
    expect(myToken).toHaveClass('touch-manipulation');
    expect(myToken).toHaveStyle({ touchAction: 'none' });
    expect(myToken).toHaveClass('min-h-[4rem]');

    fireEvent.click(myToken);

    expect(screen.getByTestId('english-structure-touch-hint')).toHaveTextContent(
      'Selected word: My. Tap another word to move it there.'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Word: time' }));

    expect(screen.getByTestId('english-structure-order-preview').textContent).not.toBe(previewBefore);
  });

  it('renders the active dragged word through the shared body portal preview', () => {
    draggableSnapshot = { isDragging: true };

    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <EnglishSentenceStructureGame onFinish={vi.fn()} />
      </NextIntlClientProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'The drummer plays the rhythm.' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));

    const orderList = screen.getByTestId('english-structure-order-list');

    expect(within(orderList).queryByRole('button', { name: 'Word: My' })).not.toBeInTheDocument();
    expect(within(document.body).getByRole('button', { name: 'Word: My' })).toBeInTheDocument();
  });
});
