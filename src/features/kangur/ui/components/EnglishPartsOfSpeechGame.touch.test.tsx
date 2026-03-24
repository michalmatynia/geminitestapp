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
      draggableSnapshot
    ),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
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
});
