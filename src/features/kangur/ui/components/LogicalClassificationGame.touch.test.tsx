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
import LogicalClassificationGame from '@/features/kangur/ui/components/LogicalClassificationGame';

const placeAllTokensInBin = (label: string, binTestId: string): void => {
  for (;;) {
    const pool = screen.getByTestId('logical-classification-pool-zone');
    const matchingTokens = within(pool).queryAllByRole('button', { name: label });
    const token = matchingTokens[0];
    if (!token) {
      return;
    }
    fireEvent.click(token);
    fireEvent.click(screen.getByTestId(binTestId));
  }
};

describe('LogicalClassificationGame touch interactions', () => {
  it('shows touch guidance and supports tap-to-bin sorting', () => {
    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <LogicalClassificationGame onFinish={vi.fn()} />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('logical-classification-touch-hint')).toHaveTextContent(
      'Tap an item, then tap a matching group or the pool.'
    );

    const pool = screen.getByTestId('logical-classification-pool-zone');
    const token = within(pool).getAllByRole('button', { name: 'Czerwony' })[0];
    expect(token).toHaveClass('touch-manipulation');
    expect(token).toHaveStyle({ touchAction: 'none' });
    expect(token).toHaveClass('min-h-[3.75rem]');

    fireEvent.click(token);

    expect(token).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('logical-classification-touch-hint')).toHaveTextContent(
      'Selected item: Czerwony. Tap a matching group or the pool.'
    );

    const redBin = screen.getByTestId('logical-classification-bin-red');
    fireEvent.click(redBin);

    expect(screen.getByTestId('logical-classification-touch-hint')).toHaveTextContent(
      'Tap an item, then tap a matching group or the pool.'
    );
    expect(within(redBin).getAllByRole('button', { name: 'Czerwony' }).length).toBeGreaterThan(0);
  });

  it('keeps Sprawdź visible in green after a correct round', () => {
    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <LogicalClassificationGame onFinish={vi.fn()} />
      </NextIntlClientProvider>
    );

    placeAllTokensInBin('Czerwony', 'logical-classification-bin-red');
    placeAllTokensInBin('Niebieski', 'logical-classification-bin-blue');

    const checkButton = screen.getByRole('button', { name: 'Sprawdź' });
    fireEvent.click(checkButton);

    expect(checkButton).toHaveClass('bg-emerald-500');
    expect(screen.getByRole('button', { name: 'Dalej' })).toBeInTheDocument();
  });
});
