/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

const addXpMock = vi.fn();
const createLessonPracticeRewardMock = vi.fn(() => ({
  xp: 12,
  breakdown: [{ label: 'Articles drag game', xp: 12 }],
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
    loadProgress: () => loadProgressMock(),
  };
});

vi.mock('@/features/kangur/ui/services/session-score', () => ({
  persistKangurSessionScore: (...args: unknown[]) => persistKangurSessionScoreMock(...args),
}));

vi.mock('@/features/kangur/ui/components/EnglishArticlesDragDropGame.data', () => ({
  ENGLISH_ARTICLES_DRAG_DROP_ROUNDS: [
    {
      id: 'school-bag',
      accent: 'amber',
      sentences: [
        {
          id: 'school-bag-book',
          before: 'I need',
          after: 'notebook for English class.',
          answer: 'a',
        },
        {
          id: 'school-bag-eraser',
          before: 'She has',
          after: 'eraser in her pencil case.',
          answer: 'an',
        },
        {
          id: 'school-bag-window',
          before: 'Please close',
          after: 'window next to the board.',
          answer: 'the',
        },
      ],
    },
    {
      id: 'zoo-day',
      accent: 'rose',
      sentences: [
        {
          id: 'zoo-day-postcard',
          before: 'He bought',
          after: 'postcard from the gift shop.',
          answer: 'a',
        },
        {
          id: 'zoo-day-elephant',
          before: 'We saw',
          after: 'elephant at the zoo.',
          answer: 'an',
        },
        {
          id: 'zoo-day-gate',
          before: 'The guide opened',
          after: 'gate to the farm.',
          answer: 'the',
        },
      ],
    },
  ],
}));

import enMessages from '@/i18n/messages/en.json';
import EnglishArticlesDragDropGame from '@/features/kangur/ui/components/EnglishArticlesDragDropGame';

const renderGame = () =>
  render(
    <NextIntlClientProvider locale='en' messages={enMessages}>
      <EnglishArticlesDragDropGame onFinish={vi.fn()} />
    </NextIntlClientProvider>
  );

const placeArticle = (article: 'a' | 'an' | 'the', slotId: string): void => {
  fireEvent.click(screen.getByRole('button', { name: article }));
  fireEvent.click(screen.getByTestId(`english-articles-drag-slot-${slotId}`));
};

afterEach(() => {
  draggableSnapshot = { isDragging: false };
});

describe('EnglishArticlesDragDropGame', () => {
  it('plays through the rounds, scores the placements, and shows the summary', () => {
    renderGame();

    expect(screen.getByText('School bag')).toBeInTheDocument();
    expect(screen.getByText('Article bank')).toBeInTheDocument();
    expect(screen.getByText('Drag and drop')).toBeInTheDocument();

    placeArticle('a', 'school-bag-book');
    placeArticle('an', 'school-bag-eraser');
    placeArticle('the', 'school-bag-window');

    fireEvent.click(screen.getByRole('button', { name: 'Check' }));

    expect(screen.getByText('Perfect! Each article fits the sentence.')).toBeInTheDocument();
    expect(screen.getByText('3/3 correct')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByText('Zoo day')).toBeInTheDocument();

    placeArticle('a', 'zoo-day-postcard');
    placeArticle('an', 'zoo-day-elephant');
    placeArticle('the', 'zoo-day-gate');

    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    fireEvent.click(screen.getByRole('button', { name: 'See result' }));

    expect(screen.getByTestId('english-articles-drag-summary-title')).toHaveTextContent(
      'Score: 6/6'
    );
    expect(screen.getByText('Perfect! Articles are in the right places.')).toBeInTheDocument();
    expect(addXpMock).toHaveBeenCalledWith(12, {});
    expect(persistKangurSessionScoreMock).toHaveBeenCalledWith(
      expect.objectContaining({
        correctAnswers: 6,
        operation: 'english_articles',
        score: 6,
        totalQuestions: 6,
      })
    );
  });

  it('shows incorrect feedback when an article is placed in the wrong sentence', () => {
    renderGame();

    placeArticle('the', 'school-bag-book');
    placeArticle('a', 'school-bag-eraser');
    placeArticle('an', 'school-bag-window');

    fireEvent.click(screen.getByRole('button', { name: 'Check' }));

    expect(
      screen.getByText('Check the specific noun and the first sound again.')
    ).toBeInTheDocument();
    expect(screen.getByText('0/3 correct')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('english-articles-drag-slot-school-bag-book')).getByRole(
        'button',
        { name: 'the' }
      )
    ).toBeInTheDocument();
  });

  it('renders the active draggable article in a body portal during dragging', () => {
    draggableSnapshot = { isDragging: true };

    renderGame();

    const pool = screen.getByTestId('english-articles-drag-pool-zone');

    expect(within(pool).queryByRole('button', { name: 'a' })).not.toBeInTheDocument();
    expect(within(document.body).getByRole('button', { name: 'a' })).toBeInTheDocument();
  });
});
