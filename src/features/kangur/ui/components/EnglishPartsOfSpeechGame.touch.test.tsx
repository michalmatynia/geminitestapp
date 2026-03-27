/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

let draggableSnapshot = { isDragging: false };
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
      draggableSnapshot
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
import EnglishPartsOfSpeechGame from '@/features/kangur/ui/components/EnglishPartsOfSpeechGame';

const renderGame = () =>
  render(
    <NextIntlClientProvider locale='en' messages={enMessages}>
      <EnglishPartsOfSpeechGame onFinish={vi.fn()} />
    </NextIntlClientProvider>
  );

afterEach(() => {
  draggableSnapshot = { isDragging: false };
  lockMock.mockClear();
  unlockMock.mockClear();
});

describe('EnglishPartsOfSpeechGame touch interactions', () => {
  it('shows coarse-pointer guidance and supports tap-to-assign fallback', () => {
    renderGame();

    expect(screen.getByText('Tap or drag')).toBeInTheDocument();
    expect(screen.getByTestId('english-parts-of-speech-selection-hint')).toHaveTextContent(
      'Tap a word, then tap a category or the pool.'
    );

    const token = screen.getByRole('button', { name: 'equation' });
    expect(token).toHaveClass('touch-manipulation');
    expect(token).toHaveStyle({ touchAction: 'none' });

    fireEvent.click(token);

    expect(screen.getByTestId('english-parts-of-speech-selection-hint')).toHaveTextContent(
      'Selected word: equation. Tap a category or the pool.'
    );

    const nounBin = screen.getByRole('button', { name: 'Noun bin' });
    fireEvent.click(nounBin);

    expect(within(nounBin).getByText('equation')).toBeInTheDocument();
    expect(screen.getByTestId('english-parts-of-speech-selection-hint')).toHaveTextContent(
      'Tap a word, then tap a category or the pool.'
    );
  });

  it('renders the active dragged word through the shared body portal path', () => {
    draggableSnapshot = { isDragging: true };

    renderGame();

    const pool = screen.getByRole('button', { name: 'Pool of words to sort' });

    expect(within(pool).queryByRole('button', { name: 'equation' })).not.toBeInTheDocument();
    expect(within(document.body).getByRole('button', { name: 'equation' })).toBeInTheDocument();
  });

  it('locks mobile scroll when touching a real draggable word handle', () => {
    renderGame();

    const token = screen.getByRole('button', { name: 'equation' });
    expect(token).toHaveAttribute('data-rfd-drag-handle-draggable-id');

    fireEvent.touchStart(token);
    expect(lockMock).toHaveBeenCalledTimes(1);

    fireEvent.touchEnd(document);
    expect(unlockMock).toHaveBeenCalledTimes(1);
  });
});
