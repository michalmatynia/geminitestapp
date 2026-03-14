/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDefaultKangurProgressState } from '@/shared/contracts/kangur';

const MONTHS = [
  'Styczeń',
  'Luty',
  'Marzec',
  'Kwiecień',
  'Maj',
  'Czerwiec',
  'Lipiec',
  'Sierpień',
  'Wrzesień',
  'Październik',
  'Listopad',
  'Grudzień',
] as const;
const DAYS = [
  'Poniedziałek',
  'Wtorek',
  'Środa',
  'Czwartek',
  'Piątek',
  'Sobota',
  'Niedziela',
] as const;
const MONTHS_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;
const { persistKangurSessionScoreMock } = vi.hoisted(() => ({
  persistKangurSessionScoreMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/services/progress', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/ui/services/progress')>();

  return {
    ...actual,
    addXp: vi.fn(),
    createTrainingReward: vi.fn(() => ({
      breakdown: [
        { kind: 'base', label: 'Ukończenie rundy', xp: 14 },
        { kind: 'accuracy', label: 'Skuteczność', xp: 18 },
      ],
      xp: 32,
      scorePercent: 100,
      progressUpdates: {},
    })),
    loadProgress: () => createDefaultKangurProgressState(),
  };
});

vi.mock('@/features/kangur/ui/services/session-score', () => ({
  persistKangurSessionScore: (...args: unknown[]) => persistKangurSessionScoreMock(...args),
}));

import CalendarTrainingGame from '@/features/kangur/ui/components/CalendarTrainingGame';

const deriveCorrectAnswer = (questionText: string): string => {
  const monthOrdinalMatch = questionText.match(/^Który miesiąc jest (\d+)\. w roku\?$/);
  if (monthOrdinalMatch) {
    const monthIndex = Number.parseInt(monthOrdinalMatch[1] ?? '1', 10) - 1;
    return MONTHS[monthIndex] ?? MONTHS[0];
  }

  const monthNumberMatch = questionText.match(/^Który numer kolejny ma miesiąc (.+)\?$/);
  if (monthNumberMatch) {
    const monthIndex = MONTHS.findIndex((month) => month === monthNumberMatch[1]);
    return String(monthIndex + 1);
  }

  const monthDaysMatch = questionText.match(/^Ile dni ma miesiąc (.+)\?$/);
  if (monthDaysMatch) {
    const monthIndex = MONTHS.findIndex((month) => month === monthDaysMatch[1]);
    return String(MONTHS_DAYS[monthIndex] ?? MONTHS_DAYS[0]);
  }

  const nextDayMatch = questionText.match(/^Jaki dzień tygodnia następuje po (.+)\?$/);
  if (nextDayMatch) {
    const dayIndex = DAYS.findIndex((day) => day === nextDayMatch[1]);
    return DAYS[dayIndex + 1] ?? DAYS[0];
  }

  if (questionText === 'Ile dni ma tydzień?') {
    return '7';
  }

  if (questionText === 'Ile miesięcy ma rok?') {
    return '12';
  }

  throw new Error(`Unsupported question text: ${questionText}`);
};

describe('CalendarTrainingGame', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('uses Kangur micro-pill progress and option-card answer states', () => {
    render(<CalendarTrainingGame onFinish={() => undefined} />);

    const activeProgress = screen.getByTestId('calendar-training-progress-0');
    const pendingProgress = screen.getByTestId('calendar-training-progress-1');
    const firstChoice = screen.getByTestId('calendar-training-choice-0');
    const secondChoice = screen.getByTestId('calendar-training-choice-1');
    const questionText =
      screen.getByText((content, element) =>
        element?.tagName.toLowerCase() === 'p' && element.className.includes('text-green-800')
          ? content.length > 0
          : false
      ).textContent ?? '';

    expect(activeProgress).toHaveClass('rounded-full', 'bg-emerald-500');
    expect(pendingProgress).toHaveClass('rounded-full', 'soft-cta');
    expect(screen.getByTestId('calendar-training-question-shell')).toHaveClass(
      'glass-panel',
      'border-white/88',
      'bg-white/94'
    );
    expect(screen.getByRole('group', { name: questionText })).toBeInTheDocument();
    expect(firstChoice).toHaveClass('soft-card');
    expect(secondChoice).toHaveClass('soft-card');

    const correctAnswer = deriveCorrectAnswer(questionText);

    fireEvent.click(screen.getByRole('button', { name: `Odpowiedz ${correctAnswer}` }));

    expect(screen.getByRole('button', { name: `Odpowiedz ${correctAnswer}` })).toHaveClass(
      'soft-card',
      'cursor-default'
    );
    expect(screen.getByRole('button', { name: `Odpowiedz ${correctAnswer}` })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });

  it('uses the shared display emoji on the summary screen', () => {
    vi.useFakeTimers();

    render(<CalendarTrainingGame onFinish={() => undefined} />);

    for (let questionIndex = 0; questionIndex < 6; questionIndex += 1) {
      const questionText =
        screen.getByText((content, element) =>
          element?.tagName.toLowerCase() === 'p' && element.className.includes('text-green-800')
            ? content.length > 0
            : false
        ).textContent ?? '';
      const correctAnswer = deriveCorrectAnswer(questionText);

      fireEvent.click(screen.getByRole('button', { name: `Odpowiedz ${correctAnswer}` }));

      act(() => {
        vi.advanceTimersByTime(1200);
      });
    }

    expect(screen.getByTestId('calendar-training-summary-emoji')).toHaveClass(
      'inline-flex',
      'text-6xl'
    );
    expect(screen.getByTestId('calendar-training-summary-shell')).toHaveClass(
      'glass-panel',
      'border-white/88',
      'bg-white/94'
    );
    expect(screen.getByTestId('calendar-training-summary-title')).toHaveClass(
      'text-2xl',
      '[color:var(--kangur-accent-emerald-start,#10b981)]'
    );
    expect(
      screen.getByText('Idealnie! Świetnie znasz kalendarz!')
    ).toHaveClass('[color:var(--kangur-page-muted-text)]');
    expect(screen.getByText('Wynik: 6/6')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-training-summary-breakdown')).toHaveTextContent(
      'Ukończenie rundy +14'
    );
    expect(screen.getByTestId('calendar-training-summary-breakdown-accuracy')).toHaveTextContent(
      'Skuteczność +18'
    );
    expect(screen.getByRole('button', { name: /jeszcze raz/i })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
    expect(persistKangurSessionScoreMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'calendar',
        score: 6,
        totalQuestions: 6,
        correctAnswers: 6,
      })
    );
  });
});
