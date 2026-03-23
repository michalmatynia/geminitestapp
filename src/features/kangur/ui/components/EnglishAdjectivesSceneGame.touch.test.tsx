/**
 * @vitest-environment jsdom
 */

import React from 'react';
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
      { isDragging: false }
    ),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

vi.mock('@/features/kangur/ui/components/EnglishAdjectivesSceneGame.data', () => ({
  ENGLISH_ADJECTIVES_SCENE_ROUNDS: [
    {
      id: 'bedroom',
      accent: 'amber',
      scene: 'bedroom',
      tokens: ['big_yellow', 'soft', 'long_blue'],
      objects: [
        { id: 'bedroom-cupboard', objectId: 'cupboard', answer: 'big_yellow' },
        { id: 'bedroom-curtains', objectId: 'curtains', answer: 'long_blue' },
        { id: 'bedroom-rug', objectId: 'rug', answer: 'soft' },
      ],
    },
  ],
}));

import enMessages from '@/i18n/messages/en.json';
import EnglishAdjectivesSceneGame from '@/features/kangur/ui/components/EnglishAdjectivesSceneGame';

describe('EnglishAdjectivesSceneGame touch interactions', () => {
  it('supports tap-to-slot placement and keeps mobile drag-handle styling', () => {
    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <EnglishAdjectivesSceneGame onFinish={vi.fn()} />
      </NextIntlClientProvider>
    );

    expect(screen.getByText('Tap or drag cards')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-selection-hint')).toHaveTextContent(
      'Tap an adjective, then tap an object or the bank.'
    );

    const pool = screen.getByTestId('english-adjectives-scene-pool-zone');
    const token = within(pool).getByRole('button', { name: 'big yellow' });

    expect(token).toHaveClass('touch-manipulation');
    expect(token).toHaveClass('min-h-[3.75rem]');
    expect(token).toHaveStyle({ touchAction: 'none' });

    fireEvent.click(token);

    expect(token).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('english-adjectives-scene-selection-hint')).toHaveTextContent(
      'Selected adjective: big yellow. Tap an object or the bank.'
    );

    const slot = screen.getByTestId('english-adjectives-scene-slot-bedroom-cupboard');
    fireEvent.click(slot);

    expect(within(slot).getByText('big yellow')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-selection-hint')).toHaveTextContent(
      'Tap an adjective, then tap an object or the bank.'
    );
  });
});
