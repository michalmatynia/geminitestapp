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

vi.mock('@/features/kangur/ui/components/EnglishAdverbsFrequencyRoutineGame.data', () => ({
  ENGLISH_ADVERBS_FREQUENCY_ROUTINE_ROUNDS: [
    {
      id: 'cinema-sunday',
      accent: 'amber',
      actions: [
        { id: 'cinema-sunday-cinema', actionId: 'go_to_cinema', answer: 'always' },
        { id: 'cinema-sunday-friends', actionId: 'go_with_friends', answer: 'usually' },
        { id: 'cinema-sunday-popcorn', actionId: 'eat_popcorn', answer: 'never' },
      ],
    },
  ],
}));

import enMessages from '@/i18n/messages/en.json';
import EnglishAdverbsFrequencyRoutineGame from '@/features/kangur/ui/components/EnglishAdverbsFrequencyRoutineGame';

afterEach(() => {
  draggableSnapshot = { isDragging: false };
});

const getTokenActiveDotCount = (button: HTMLElement): number =>
  button.querySelectorAll('[data-active="true"]').length;

describe('EnglishAdverbsFrequencyRoutineGame touch interactions', () => {
  it('supports tap-to-lane placement and keeps the mobile drag-handle styling', () => {
    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <EnglishAdverbsFrequencyRoutineGame onFinish={vi.fn()} />
      </NextIntlClientProvider>
    );

    expect(screen.getByText('Tap or drag cards')).toBeInTheDocument();
    expect(screen.getByTestId('english-adverbs-frequency-selection-hint')).toHaveTextContent(
      'Tap a frequency card, then tap a routine lane or the bank.'
    );

    const pool = screen.getByTestId('english-adverbs-frequency-pool-zone');
    const token = within(pool).getByRole('button', { name: 'always' });

    expect(token).toHaveClass('touch-manipulation');
    expect(token).toHaveClass('min-h-[3.75rem]');
    expect(token).toHaveStyle({ touchAction: 'none' });
    expect(within(token).getByText('Days lit: 7/7')).toBeInTheDocument();
    expect(getTokenActiveDotCount(token)).toBe(7);

    fireEvent.click(token);

    expect(token).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('english-adverbs-frequency-selection-hint')).toHaveTextContent(
      'Selected frequency: always. Tap a routine lane or the bank.'
    );

    const slot = screen.getByTestId('english-adverbs-frequency-slot-cinema-sunday-cinema');
    fireEvent.click(slot);

    expect(within(slot).getByRole('button', { name: 'always' })).toBeInTheDocument();
    expect(
      screen.getByTestId('english-adverbs-frequency-sentence-cinema-sunday-cinema')
    ).toHaveTextContent('I always go to the cinema.');
    expect(screen.getByTestId('english-adverbs-frequency-selection-hint')).toHaveTextContent(
      'Tap a frequency card, then tap a routine lane or the bank.'
    );
  });

  it('keeps the coarse-pointer drag styling when the active card is portaled', () => {
    draggableSnapshot = { isDragging: true };

    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <EnglishAdverbsFrequencyRoutineGame onFinish={vi.fn()} />
      </NextIntlClientProvider>
    );

    const draggedToken = within(document.body).getByRole('button', { name: 'always' });

    expect(draggedToken).toHaveClass('touch-manipulation');
    expect(draggedToken).toHaveClass('min-h-[3.75rem]');
    expect(draggedToken).toHaveStyle({ touchAction: 'none' });
    expect(within(draggedToken).getByText('Days lit: 7/7')).toBeInTheDocument();
  });
});
