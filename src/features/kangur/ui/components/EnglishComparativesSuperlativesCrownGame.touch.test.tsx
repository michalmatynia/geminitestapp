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

vi.mock('@/features/kangur/ui/components/EnglishComparativesSuperlativesCrownGame.data', () => ({
  ENGLISH_COMPARE_AND_CROWN_ROUNDS: [
    {
      id: 'tower-track',
      accent: 'sky',
      tokens: ['taller', 'the_tallest', 'faster', 'the_fastest', 'bigger'],
      actions: [
        { id: 'tower-track-tall', actionId: 'tall_compare', answer: 'taller' },
        { id: 'tower-track-fast', actionId: 'fast_compare', answer: 'faster' },
        { id: 'tower-track-crown', actionId: 'tall_crown', answer: 'the_tallest' },
      ],
    },
  ],
}));

import enMessages from '@/i18n/messages/en.json';
import EnglishComparativesSuperlativesCrownGame from '@/features/kangur/ui/components/EnglishComparativesSuperlativesCrownGame';

afterEach(() => {
  draggableSnapshot = { isDragging: false };
});

describe('EnglishComparativesSuperlativesCrownGame touch interactions', () => {
  it('supports tap-to-lane placement and keeps the mobile drag-handle styling', () => {
    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <EnglishComparativesSuperlativesCrownGame onFinish={vi.fn()} />
      </NextIntlClientProvider>
    );

    expect(screen.getByText('Tap or drag cards')).toBeInTheDocument();
    expect(screen.getByTestId('english-comparatives-selection-hint')).toHaveTextContent(
      'Tap a form card, then tap a scene lane or the bank.'
    );

    const pool = screen.getByTestId('english-comparatives-pool-zone');
    const token = within(pool).getByRole('button', { name: 'taller' });

    expect(token).toHaveClass('touch-manipulation');
    expect(token).toHaveClass('min-h-[3.75rem]');
    expect(token).toHaveStyle({ touchAction: 'none' });

    fireEvent.click(token);

    expect(token).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('english-comparatives-selection-hint')).toHaveTextContent(
      'Selected form: taller. Tap a scene lane or the bank.'
    );

    const slot = screen.getByTestId('english-comparatives-slot-tower-track-tall');
    fireEvent.click(slot);

    expect(within(slot).getByRole('button', { name: 'taller' })).toBeInTheDocument();
    expect(screen.getByTestId('english-comparatives-sentence-tower-track-tall')).toHaveTextContent(
      'The blue tower is taller than the pink tower.'
    );
    expect(screen.getByTestId('english-comparatives-selection-hint')).toHaveTextContent(
      'Tap a form card, then tap a scene lane or the bank.'
    );
  });

  it('keeps the coarse-pointer drag styling when the active card is portaled', () => {
    draggableSnapshot = { isDragging: true };

    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <EnglishComparativesSuperlativesCrownGame onFinish={vi.fn()} />
      </NextIntlClientProvider>
    );

    const draggedToken = within(document.body).getByRole('button', { name: 'taller' });

    expect(draggedToken).toHaveClass('touch-manipulation');
    expect(draggedToken).toHaveClass('min-h-[3.75rem]');
    expect(draggedToken).toHaveStyle({ touchAction: 'none' });
  });
});
