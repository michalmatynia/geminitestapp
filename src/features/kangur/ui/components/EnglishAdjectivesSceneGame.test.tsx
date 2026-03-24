/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

const addXpMock = vi.fn();
const createLessonPracticeRewardMock = vi.fn(() => ({
  xp: 15,
  breakdown: [{ label: 'Adjective studio', xp: 15 }],
  progressUpdates: {},
}));
const loadProgressMock = vi.fn(() => ({}));
const persistKangurSessionScoreMock = vi.fn();
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
  useKangurCoarsePointer: () => false,
}));

vi.mock('@/features/kangur/ui/services/progress', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/ui/services/progress')>();
  return {
    ...actual,
    addXp: (...args: unknown[]) => addXpMock(...args),
    createLessonPracticeReward: (...args: unknown[]) => createLessonPracticeRewardMock(...args),
    loadProgress: (...args: unknown[]) => loadProgressMock(...args),
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
      id: 'toy_shelf',
      accent: 'sky',
      scene: 'toy_shelf',
      tokens: ['red', 'small_blue', 'new', 'soft'],
      objects: [
        { id: 'toy-shelf-train', objectId: 'train', answer: 'red' },
        { id: 'toy-shelf-teddy', objectId: 'teddy', answer: 'small_blue' },
        { id: 'toy-shelf-games', objectId: 'games', answer: 'new' },
      ],
    },
    {
      id: 'study_corner',
      accent: 'emerald',
      scene: 'study_corner',
      tokens: ['small_red', 'new', 'bright_green', 'beautiful'],
      objects: [
        { id: 'study-corner-desk', objectId: 'desk', answer: 'new' },
        { id: 'study-corner-lamp', objectId: 'lamp', answer: 'small_red' },
        { id: 'study-corner-book', objectId: 'book', answer: 'bright_green' },
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
    {
      id: 'playground',
      accent: 'rose',
      scene: 'playground',
      tokens: ['big_yellow', 'long_blue', 'old', 'red'],
      objects: [
        { id: 'playground-slide', objectId: 'slide', answer: 'big_yellow' },
        { id: 'playground-kite', objectId: 'kite', answer: 'long_blue' },
        { id: 'playground-bench', objectId: 'bench', answer: 'old' },
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

afterEach(() => {
  draggableSnapshot = { isDragging: false };
});

describe('EnglishAdjectivesSceneGame', () => {
  it('plays through the rounds and shows the summary after a correct scene build', () => {
    renderGame();

    expect(screen.getByText('Bedroom makeover')).toBeInTheDocument();
    expect(screen.getByText('Adjective bank')).toBeInTheDocument();
    expect(screen.getByText('Adjective studio')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-bedroom-clip')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-bedroom-cupboard-gradient')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-bedroom-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-bedroom-frame')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-bedroom-window')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-bedroom-cupboard-art')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-bedroom-rug-art')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-target-bedroom-cupboard')).toHaveTextContent(
      'big yellow cupboard'
    );
    expect(screen.getByTestId('english-adjectives-scene-target-bedroom-cupboard')).toHaveTextContent(
      'change the size and colour'
    );
    expect(screen.getByTestId('english-adjectives-scene-target-bedroom-cupboard')).toHaveTextContent(
      'Target sentence'
    );
    expect(screen.getByTestId('english-adjectives-scene-target-bedroom-cupboard')).toHaveTextContent(
      'There is a big yellow cupboard in the room.'
    );
    expect(screen.getByTestId('english-adjectives-scene-phrase-bedroom-cupboard')).toHaveTextContent(
      'How can you describe the cupboard?'
    );
    expect(screen.getByTestId('english-adjectives-scene-phrase-bedroom-cupboard')).toHaveTextContent(
      '___ cupboard'
    );
    expect(screen.getByTestId('english-adjectives-scene-phrase-bedroom-cupboard')).toHaveTextContent(
      'There is a ___ cupboard in the room.'
    );
    expect(screen.getByTestId('english-adjectives-scene-phrase-bedroom-cupboard')).toHaveTextContent(
      'change the size and colour'
    );
    expect(screen.getByTestId('english-adjectives-scene-phrase-bedroom-cupboard')).toHaveTextContent(
      'Build: adjective + noun'
    );
    expect(screen.getByRole('button', { name: 'big yellow' })).toHaveTextContent(
      'change the size and colour'
    );

    placeAdjective('big yellow', 'bedroom-cupboard');
    placeAdjective('long blue', 'bedroom-curtains');
    placeAdjective('soft', 'bedroom-rug');

    expect(screen.getByTestId('english-adjectives-scene-phrase-bedroom-cupboard')).toHaveTextContent(
      'big yellow cupboard'
    );
    expect(screen.getByTestId('english-adjectives-scene-phrase-bedroom-cupboard')).toHaveTextContent(
      'There is a big yellow cupboard in the room.'
    );
    expect(screen.getByTestId('english-adjectives-scene-bedroom-curtains-long')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-bedroom-rug-soft')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Check' }));

    expect(screen.getByText('Perfect! The scene matches the description.')).toBeInTheDocument();
    expect(screen.getByText('3/3 correct')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-match-bedroom-cupboard')).toHaveTextContent(
      'Matched'
    );
    expect(screen.getByTestId('english-adjectives-scene-match-bedroom-cupboard')).toHaveTextContent(
      'big yellow cupboard'
    );
    expect(screen.getByTestId('english-adjectives-scene-match-bedroom-cupboard')).toHaveTextContent(
      'There is a big yellow cupboard in the room.'
    );
    expect(screen.getByTestId('english-adjectives-scene-match-bedroom-cupboard')).toHaveTextContent(
      'Type: change the size and colour'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByText('Toy shelf')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-toy-clip')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-toy-train-gradient')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-toy-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-toy-frame')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-toy-train-art')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-toy-teddy-art')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-toy-games-art')).toBeInTheDocument();

    placeAdjective('red', 'toy-shelf-train');
    placeAdjective('small blue', 'toy-shelf-teddy');
    placeAdjective('new', 'toy-shelf-games');
    expect(screen.getByTestId('english-adjectives-scene-toy-train-red')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-toy-teddy-small-blue')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-toy-games-new')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByText('Study corner')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-study-clip')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-study-desk-gradient')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-study-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-study-frame')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-study-board')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-study-desk-art')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-study-lamp-art')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-study-book-art')).toBeInTheDocument();

    placeAdjective('new', 'study-corner-desk');
    placeAdjective('small red', 'study-corner-lamp');
    placeAdjective('bright green', 'study-corner-book');
    expect(screen.getByTestId('english-adjectives-scene-study-desk-new')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-study-lamp-small')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-study-book-bright')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByText('Portrait details')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-portrait-clip')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-portrait-frame-gradient')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-portrait-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-portrait-frame')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-portrait-figure')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-portrait-picture-art')).toBeInTheDocument();

    placeAdjective('brown', 'portrait-eyes');
    placeAdjective('long black', 'portrait-hair');
    placeAdjective('beautiful', 'portrait-picture');
    expect(screen.getByTestId('english-adjectives-scene-portrait-eyes-brown')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-portrait-hair-long')).toBeInTheDocument();
    expect(
      screen.getByTestId('english-adjectives-scene-portrait-picture-beautiful')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByText('Playground scene')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-playground-clip')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-playground-slide-gradient')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-playground-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-playground-frame')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-playground-clouds')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-playground-slide-art')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-playground-kite-art')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-playground-bench-art')).toBeInTheDocument();

    placeAdjective('big yellow', 'playground-slide');
    placeAdjective('long blue', 'playground-kite');
    placeAdjective('old', 'playground-bench');
    expect(screen.getByTestId('english-adjectives-scene-playground-slide-big')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-playground-kite-long')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-playground-bench-old')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    fireEvent.click(screen.getByRole('button', { name: 'See result' }));

    expect(screen.getByTestId('english-adjectives-scene-summary-title')).toHaveTextContent(
      'Score: 15/15'
    );
    expect(
      screen.getByText('Perfect! The whole scene matches the adjectives.')
    ).toBeInTheDocument();
    expect(screen.getByTestId('english-adjectives-scene-summary-badges')).toHaveTextContent(
      'Rounds 5/5'
    );
    expect(screen.getByTestId('english-adjectives-scene-summary-badges')).toHaveTextContent(
      'Targets 15/15'
    );
    expect(screen.getByTestId('english-adjectives-scene-summary-badges')).toHaveTextContent(
      'Studio 5/5'
    );
    expect(screen.getByTestId('english-adjectives-scene-summary-guide')).toHaveTextContent(
      'Adjective guide'
    );
    expect(screen.getByTestId('english-adjectives-scene-summary-guide-color')).toHaveTextContent(
      'red train, brown eyes'
    );
    expect(
      screen.getByTestId('english-adjectives-scene-summary-order-clear')
    ).toHaveTextContent('a small blue teddy');
    expect(
      screen.getByTestId('english-adjectives-scene-summary-starter-portrait')
    ).toHaveTextContent('She has long black hair and brown eyes.');
    expect(
      screen.getByTestId('english-adjectives-scene-summary-starter-study')
    ).toHaveTextContent('There is a new desk by the wall.');
    expect(
      screen.getByTestId('english-adjectives-scene-summary-starter-playground')
    ).toHaveTextContent('It is an old bench near the slide.');
    expect(screen.getByTestId('english-adjectives-scene-summary-questions')).toHaveTextContent(
      'What can you see?'
    );
    expect(screen.getByTestId('english-adjectives-scene-summary-questions')).toHaveTextContent(
      'Pick one question and answer it with an adjective phrase.'
    );
    expect(
      screen.getByTestId('english-adjectives-scene-summary-question-room')
    ).toHaveTextContent('What can you see in the room?');
    expect(
      screen.getByTestId('english-adjectives-scene-summary-question-room')
    ).toHaveTextContent('Try: There is a...');
    expect(
      screen.getByTestId('english-adjectives-scene-summary-question-toy')
    ).toHaveTextContent('What toy can you see on the shelf?');
    expect(
      screen.getByTestId('english-adjectives-scene-summary-question-toy')
    ).toHaveTextContent('Try: It is a...');
    expect(
      screen.getByTestId('english-adjectives-scene-summary-question-person')
    ).toHaveTextContent('What can you say about the person?');
    expect(
      screen.getByTestId('english-adjectives-scene-summary-question-person')
    ).toHaveTextContent('Try: She has...');
    expect(
      screen.getByTestId('english-adjectives-scene-summary-question-study')
    ).toHaveTextContent('What can you see in the study corner?');
    expect(
      screen.getByTestId('english-adjectives-scene-summary-question-study')
    ).toHaveTextContent('Try: There is a...');
    expect(
      screen.getByTestId('english-adjectives-scene-summary-question-playground')
    ).toHaveTextContent('What can you see in the playground?');
    expect(
      screen.getByTestId('english-adjectives-scene-summary-question-playground')
    ).toHaveTextContent('Try: It is a...');
    expect(loadProgressMock).toHaveBeenCalledWith({ ownerKey: null });
    expect(addXpMock).toHaveBeenCalledWith(15, {}, { ownerKey: null });
    expect(persistKangurSessionScoreMock).toHaveBeenCalledWith(
      expect.objectContaining({
        correctAnswers: 15,
        operation: 'english_adjectives',
        score: 15,
        totalQuestions: 15,
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
    expect(screen.getByTestId('english-adjectives-scene-phrase-bedroom-cupboard')).toHaveTextContent(
      'red cupboard'
    );
    expect(screen.getByTestId('english-adjectives-scene-phrase-bedroom-cupboard')).toHaveTextContent(
      'There is a red cupboard in the room.'
    );
    expect(
      screen.getByTestId('english-adjectives-scene-correction-bedroom-cupboard')
    ).toHaveTextContent('Your phrase');
    expect(
      screen.getByTestId('english-adjectives-scene-correction-bedroom-cupboard')
    ).toHaveTextContent('red cupboard');
    expect(
      screen.getByTestId('english-adjectives-scene-correction-bedroom-cupboard')
    ).toHaveTextContent('Your sentence');
    expect(
      screen.getByTestId('english-adjectives-scene-correction-bedroom-cupboard')
    ).toHaveTextContent('There is a red cupboard in the room.');
    expect(
      screen.getByTestId('english-adjectives-scene-correction-bedroom-cupboard')
    ).toHaveTextContent('Target phrase');
    expect(
      screen.getByTestId('english-adjectives-scene-correction-bedroom-cupboard')
    ).toHaveTextContent('big yellow cupboard');
    expect(
      screen.getByTestId('english-adjectives-scene-correction-bedroom-cupboard')
    ).toHaveTextContent('Target sentence');
    expect(
      screen.getByTestId('english-adjectives-scene-correction-bedroom-cupboard')
    ).toHaveTextContent('There is a big yellow cupboard in the room.');
    expect(
      screen.getByTestId('english-adjectives-scene-correction-bedroom-cupboard')
    ).toHaveTextContent('Category change: change the colour → change the size and colour');
    expect(
      screen.getByTestId('english-adjectives-scene-correction-bedroom-cupboard')
    ).toHaveTextContent('Clue: change the size and colour');
  });

  it('renders the active dragged adjective in a body portal during dragging', () => {
    draggableSnapshot = { isDragging: true };

    renderGame();

    const pool = screen.getByTestId('english-adjectives-scene-pool-zone');

    expect(within(pool).queryByRole('button', { name: 'big yellow' })).not.toBeInTheDocument();
    expect(within(document.body).getByRole('button', { name: 'big yellow' })).toBeInTheDocument();
  });
});
