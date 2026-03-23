/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

const addXpMock = vi.fn();
const createLessonPracticeRewardMock = vi.fn(() => ({
  xp: 15,
  breakdown: [{ label: 'Adjective studio', xp: 15 }],
  progressUpdates: {},
}));
const loadProgressMock = vi.fn(() => ({}));
const persistKangurSessionScoreMock = vi.fn();

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
  useKangurCoarsePointer: () => false,
}));

vi.mock('@/features/kangur/ui/services/progress', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/ui/services/progress')>();
  return {
    ...actual,
    addXp: (...args: unknown[]) => addXpMock(...args),
    createLessonPracticeReward: (...args: unknown[]) => createLessonPracticeRewardMock(...args),
    loadProgress: () => loadProgressMock(),
  };
});

vi.mock('@/features/kangur/ui/services/session-score', () => ({
  persistKangurSessionScore: (...args: unknown[]) => persistKangurSessionScoreMock(...args),
}));

vi.mock('@/features/kangur/ui/components/EnglishAdjectivesSceneGame.data', () => ({
  ENGLISH_ADJECTIVES_SCENE_ROUNDS: [
    {
      id: 'bedroom',
      accent: 'amber',
      scene: 'bedroom',
      tokens: ['big_yellow', 'soft', 'long_blue', 'red'],
      objects: [
        { id: 'bedroom-cupboard', objectId: 'cupboard', answer: 'big_yellow' },
        { id: 'bedroom-curtains', objectId: 'curtains', answer: 'long_blue' },
        { id: 'bedroom-rug', objectId: 'rug', answer: 'soft' },
      ],
    },
    {
      id: 'portrait',
      accent: 'violet',
      scene: 'portrait',
      tokens: ['brown', 'long_black', 'beautiful', 'new'],
      objects: [
        { id: 'portrait-eyes', objectId: 'eyes', answer: 'brown' },
        { id: 'portrait-hair', objectId: 'hair', answer: 'long_black' },
        { id: 'portrait-picture', objectId: 'picture', answer: 'beautiful' },
      ],
    },
  ],
}));

import enMessages from '@/i18n/messages/en.json';
import EnglishAdjectivesSceneGame from '@/features/kangur/ui/components/EnglishAdjectivesSceneGame';

const renderGame = () =>
  render(
    <NextIntlClientProvider locale='en' messages={enMessages}>
      <EnglishAdjectivesSceneGame onFinish={vi.fn()} />
    </NextIntlClientProvider>
  );

const placeAdjective = (adjective: string, slotId: string): void => {
  fireEvent.click(screen.getByRole('button', { name: adjective }));
  fireEvent.click(screen.getByTestId(`english-adjectives-scene-slot-${slotId}`));
};

describe('EnglishAdjectivesSceneGame', () => {
  it('plays through the rounds and shows the summary after a correct scene build', () => {
    renderGame();

    expect(screen.getByText('Bedroom makeover')).toBeInTheDocument();
    expect(screen.getByText('Adjective bank')).toBeInTheDocument();
    expect(screen.getByText('Adjective studio')).toBeInTheDocument();

    placeAdjective('big yellow', 'bedroom-cupboard');
    placeAdjective('long blue', 'bedroom-curtains');
    placeAdjective('soft', 'bedroom-rug');

    fireEvent.click(screen.getByRole('button', { name: 'Check' }));

    expect(screen.getByText('Perfect! The scene matches the description.')).toBeInTheDocument();
    expect(screen.getByText('3/3 correct')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByText('Portrait details')).toBeInTheDocument();

    placeAdjective('brown', 'portrait-eyes');
    placeAdjective('long black', 'portrait-hair');
    placeAdjective('beautiful', 'portrait-picture');

    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    fireEvent.click(screen.getByRole('button', { name: 'See result' }));

    expect(screen.getByTestId('english-adjectives-scene-summary-title')).toHaveTextContent(
      'Score: 6/6'
    );
    expect(
      screen.getByText('Perfect! The whole scene matches the adjectives.')
    ).toBeInTheDocument();
    expect(addXpMock).toHaveBeenCalledWith(15, {});
    expect(persistKangurSessionScoreMock).toHaveBeenCalledWith(
      expect.objectContaining({
        correctAnswers: 6,
        operation: 'english_adjectives',
        score: 6,
        totalQuestions: 6,
      })
    );
  });

  it('shows retry feedback when the scene is built with wrong adjective cards', () => {
    renderGame();

    placeAdjective('red', 'bedroom-cupboard');
    placeAdjective('big yellow', 'bedroom-curtains');
    placeAdjective('soft', 'bedroom-rug');

    fireEvent.click(screen.getByRole('button', { name: 'Check' }));

    expect(
      screen.getByText('Try again and check which adjective changes each object.')
    ).toBeInTheDocument();
    expect(screen.getByText('1/3 correct')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('english-adjectives-scene-slot-bedroom-cupboard')).getByRole(
        'button',
        { name: 'red' }
      )
    ).toBeInTheDocument();
  });
});
