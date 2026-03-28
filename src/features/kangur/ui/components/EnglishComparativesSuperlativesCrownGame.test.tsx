/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

const addXpMock = vi.fn();
const createLessonPracticeRewardMock = vi.fn(() => ({
  xp: 18,
  breakdown: [{ label: 'Compare & Crown', xp: 18 }],
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
    {
      id: 'fun-club',
      accent: 'rose',
      tokens: ['funnier', 'the_funniest', 'better', 'the_best', 'more_beautiful'],
      actions: [
        { id: 'fun-club-funny', actionId: 'funny_compare', answer: 'funnier' },
        { id: 'fun-club-best', actionId: 'good_crown', answer: 'the_best' },
        { id: 'fun-club-crown', actionId: 'funny_crown', answer: 'the_funniest' },
      ],
    },
  ],
}));

import enMessages from '@/i18n/messages/en.json';
import EnglishComparativesSuperlativesCrownGame from '@/features/kangur/ui/components/EnglishComparativesSuperlativesCrownGame';

const renderGame = () =>
  render(
    <NextIntlClientProvider locale='en' messages={enMessages}>
      <EnglishComparativesSuperlativesCrownGame onFinish={vi.fn()} />
    </NextIntlClientProvider>
  );

const placeForm = (
  form: string,
  slotId: string
): void => {
  fireEvent.click(screen.getByRole('button', { name: form }));
  fireEvent.click(screen.getByTestId(`english-comparatives-slot-${slotId}`));
};

afterEach(() => {
  draggableSnapshot = { isDragging: false };
});

describe('EnglishComparativesSuperlativesCrownGame', () => {
  it('plays through the rounds and shows the summary after a correct Compare & Crown build', () => {
    renderGame();

    expect(screen.getByText('Tower track')).toBeInTheDocument();
    expect(screen.getByTestId('english-comparatives-pool-zone')).toBeInTheDocument();
    expect(screen.getByTestId('english-comparatives-selection-hint')).toHaveTextContent(
      'Tap a form card, then tap a scene lane or the bank.'
    );
    expect(
      screen.getByTestId('english-comparatives-target-strip-tower-track-tall-clip')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('english-comparatives-target-strip-tower-track-tall-atmosphere')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('english-comparatives-target-strip-tower-track-tall-frame')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('english-comparatives-target-tower-track-tall')
    ).toHaveTextContent('The blue tower is taller than the pink tower.');

    placeForm('taller', 'tower-track-tall');
    placeForm('faster', 'tower-track-fast');
    placeForm('the tallest', 'tower-track-crown');

    expect(
      screen.getByTestId('english-comparatives-sentence-tower-track-tall')
    ).toHaveTextContent('The blue tower is taller than the pink tower.');
    expect(
      screen.getByTestId('english-comparatives-strip-tower-track-tall-compare-arrow')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('english-comparatives-strip-tower-track-crown-winner-crown')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Check' }));

    expect(
      screen.getByText('Perfect! Every scene has the right comparative or superlative.')
    ).toBeInTheDocument();
    expect(screen.getByTestId('english-comparatives-match-tower-track-tall')).toHaveTextContent(
      'Matched'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByText('Fun club')).toBeInTheDocument();

    placeForm('funnier', 'fun-club-funny');
    placeForm('the best', 'fun-club-best');
    placeForm('the funniest', 'fun-club-crown');

    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    fireEvent.click(screen.getByRole('button', { name: 'See result' }));

    expect(screen.getByTestId('english-comparatives-summary-title')).toHaveTextContent(
      'Score: 6/6'
    );
    expect(screen.getByTestId('english-comparatives-summary-badges')).toHaveTextContent(
      'Rounds 2/2'
    );
    expect(screen.getByTestId('english-comparatives-summary-badges')).toHaveTextContent(
      'Targets 6/6'
    );
    expect(screen.getByTestId('english-comparatives-summary-guide')).toHaveTextContent(
      'good → better → the best'
    );
  });

  it('shows a correction card with the target form and degree cue after a wrong match', () => {
    renderGame();

    placeForm('bigger', 'tower-track-tall');
    placeForm('faster', 'tower-track-fast');
    placeForm('the tallest', 'tower-track-crown');

    fireEvent.click(screen.getByRole('button', { name: 'Check' }));

    const correction = screen.getByTestId('english-comparatives-correction-tower-track-tall');
    expect(correction).toHaveTextContent('Your form');
    expect(correction).toHaveTextContent('bigger');
    expect(correction).toHaveTextContent('Target form');
    expect(correction).toHaveTextContent('taller');
    expect(correction).toHaveTextContent('Your sentence');
    expect(correction).toHaveTextContent('The blue tower is bigger than the pink tower.');
    expect(correction).toHaveTextContent('Target sentence');
    expect(correction).toHaveTextContent('The blue tower is taller than the pink tower.');
    expect(correction).toHaveTextContent('Degree cue');
    expect(correction).toHaveTextContent('compare two things');
  });
});
