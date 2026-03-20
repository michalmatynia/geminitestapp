/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

const addXpMock = vi.fn();
const createLessonPracticeRewardMock = vi.fn(() => ({
  breakdown: [
    { kind: 'base', label: 'Ukończenie rundy', xp: 12 },
    { kind: 'perfect', label: 'Pełny wynik', xp: 13 },
  ],
  xp: 25,
  scorePercent: 100,
  progressUpdates: {
    lessonsCompleted: 1,
    lessonMastery: {
      adding: {
        attempts: 1,
        completions: 1,
        masteryPercent: 100,
        bestScorePercent: 100,
        lastScorePercent: 100,
        lastCompletedAt: '2026-03-07T00:00:00.000Z',
      },
    },
  },
}));
const persistKangurSessionScoreMock = vi.fn();

vi.mock('@/features/kangur/ui/services/adding-synthesis', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/kangur/ui/services/adding-synthesis')>();

  return {
    ...actual,
    createAddingSynthesisSequence: () => [
      {
        id: 'note-1',
        stageId: 'warmup' as const,
        left: 2,
        right: 3,
        answer: 5,
        choices: [4, 5, 6, 7] as [number, number, number, number],
        hint: 'Zacznij od 3 i dolicz 2.',
        focus: 'Liczymy od większej liczby.',
      },
    ],
  };
});

vi.mock('@/features/kangur/ui/services/progress', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/ui/services/progress')>();

  return {
    ...actual,
    loadProgress: () => ({
      totalXp: 0,
      gamesPlayed: 0,
      perfectGames: 0,
      lessonsCompleted: 0,
      clockPerfect: 0,
      calendarPerfect: 0,
      geometryPerfect: 0,
      badges: [],
      operationsPlayed: [],
      lessonMastery: {},
    }),
    createLessonPracticeReward: (...args: Parameters<typeof actual.createLessonPracticeReward>) =>
      createLessonPracticeRewardMock(...args),
    addXp: (...args: unknown[]) => addXpMock(...args),
  };
});

vi.mock('@/features/kangur/ui/services/session-score', () => ({
  persistKangurSessionScore: (...args: unknown[]) => persistKangurSessionScoreMock(...args),
}));

import enMessages from '@/i18n/messages/en.json';

import AddingSynthesisGame from './AddingSynthesisGame';

const renderGame = (ui: ReactNode) =>
  render(
    <NextIntlClientProvider locale='en' messages={enMessages}>
      {ui}
    </NextIntlClientProvider>
  );

describe('AddingSynthesisGame i18n', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders English intro, gameplay, and summary copy', async () => {
    renderGame(<AddingSynthesisGame onFinish={vi.fn()} />);

    expect(screen.getByText('Addition synthesis')).toBeInTheDocument();
    expect(screen.getByText('Game rhythm')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Calculate in your head, watch the expression fall toward the line, and hit the lane with the correct answer. You start with simple sums, then cross 10, and finish with two-digit addition.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start synthesis' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Start synthesis' }));

    expect(screen.getByText('Note 1/1')).toBeInTheDocument();
    expect(screen.getByText('Hit the correct lane')).toBeInTheDocument();
    expect(screen.getByText('Session progress')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Lane 2: 5' }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_200);
    });

    expect(screen.getByText('Session complete')).toBeInTheDocument();
    expect(screen.getByText('Score 1/1')).toBeInTheDocument();
    expect(screen.getByText('Accuracy')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play again' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to Addition' })).toBeInTheDocument();
  });
});
