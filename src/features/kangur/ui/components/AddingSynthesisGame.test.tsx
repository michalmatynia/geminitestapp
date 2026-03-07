/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const addXpMock = vi.fn();
const createLessonPracticeRewardMock = vi.fn(() => ({
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
        focus: 'Liczymy od wiekszej liczby.',
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

import AddingSynthesisGame from '@/features/kangur/ui/components/AddingSynthesisGame';

describe('AddingSynthesisGame', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs through a short session, awards practice progress, and returns to the lesson', async () => {
    const onFinish = vi.fn();

    render(<AddingSynthesisGame onFinish={onFinish} />);

    expect(screen.getByTestId('adding-synthesis-intro-shell')).toHaveClass(
      'glass-panel',
      'border-amber-200/70'
    );
    expect(screen.getByText('Nowa gra')).toHaveClass('border-amber-200', 'bg-amber-100');
    expect(screen.getByText('Synthesia-style')).toHaveClass('border-violet-200', 'bg-violet-100');
    expect(screen.getByTestId('adding-synthesis-intro-badge')).toHaveClass(
      'bg-violet-100',
      'text-violet-700'
    );
    expect(screen.getByText('Rytm gry')).toHaveClass('border-violet-200', 'bg-violet-100');
    expect(screen.getByRole('button', { name: /wroc do dodawania/i })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );

    fireEvent.click(screen.getByRole('button', { name: /start synteze/i }));

    expect(screen.getByTestId('adding-synthesis-board-shell')).toHaveClass(
      'glass-panel',
      'border-indigo-200/70'
    );
    expect(screen.getByTestId('adding-synthesis-stage-shell')).toHaveClass(
      'glass-panel',
      'border-white/80'
    );
    expect(screen.getByTestId('adding-synthesis-hud')).toHaveClass(
      'glass-panel',
      'border-white/75',
      'bg-white/88'
    );
    expect(screen.getByText('2 + 3')).toBeInTheDocument();
    expect(screen.getByText('Nuta 1/1')).toHaveClass('border-slate-200', 'bg-slate-100');
    expect(screen.getByTestId('adding-synthesis-note-shell')).toHaveClass(
      'glass-panel',
      'border-white/88',
      'bg-white/94'
    );
    expect(screen.getByTestId('adding-synthesis-note-stage')).toHaveClass(
      'border-violet-200',
      'bg-violet-100'
    );
    expect(screen.getByTestId('adding-synthesis-note-hit-line')).toHaveClass(
      'border-slate-200',
      'bg-slate-100'
    );
    expect(screen.getByTestId('adding-synthesis-lane-0')).toHaveClass(
      'soft-card',
      'border-amber-300'
    );
    expect(screen.getByTestId('adding-synthesis-session-progress-bar')).toHaveAttribute(
      'aria-valuenow',
      '0'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tor 2: 5' }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_200);
    });

    expect(screen.getByTestId('adding-synthesis-summary')).toBeInTheDocument();
    expect(screen.getByTestId('adding-synthesis-summary')).toHaveClass(
      'glass-panel',
      'border-emerald-200/70'
    );
    expect(screen.getByText('Wynik 1/1')).toBeInTheDocument();
    expect(screen.getByText('Sesja zakonczona')).toHaveClass('border-emerald-200', 'bg-emerald-100');
    expect(screen.getByText('+25 XP')).toHaveClass('border-amber-200', 'bg-amber-100');
    expect(screen.getByText('Skutecznosc').parentElement).toHaveClass('soft-card', 'border-emerald-300');
    expect(screen.getByText('Idealne trafienia').parentElement).toHaveClass('soft-card', 'border-violet-300');
    expect(screen.getByRole('button', { name: /wroc do dodawania/i })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
    expect(createLessonPracticeRewardMock).toHaveBeenCalledWith(
      expect.anything(),
      'adding',
      1,
      1,
      65
    );
    expect(addXpMock).toHaveBeenCalledWith(
      25,
      expect.objectContaining({
        lessonMastery: expect.objectContaining({
          adding: expect.objectContaining({
            masteryPercent: 100,
          }),
        }),
      })
    );
    expect(onFinish).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /wroc do dodawania/i }));

    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
