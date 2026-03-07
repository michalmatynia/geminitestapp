/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('@/features/kangur/ui/services/progress', () => ({
  addXp: vi.fn(),
  buildLessonMasteryUpdate: vi.fn(() => ({})),
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
    vi.restoreAllMocks();
  });

  it('uses Kangur micro-pill progress and option-card answer states', () => {
    render(<CalendarTrainingGame onFinish={() => undefined} />);

    const activeProgress = screen.getByTestId('calendar-training-progress-0');
    const pendingProgress = screen.getByTestId('calendar-training-progress-1');
    const firstChoice = screen.getByTestId('calendar-training-choice-0');
    const secondChoice = screen.getByTestId('calendar-training-choice-1');

    expect(activeProgress).toHaveClass('rounded-full', 'bg-emerald-500');
    expect(pendingProgress).toHaveClass('rounded-full', 'soft-cta');
    expect(firstChoice).toHaveClass('soft-card');
    expect(secondChoice).toHaveClass('soft-card');

    const questionText =
      screen.getByText((content, element) =>
        element?.tagName.toLowerCase() === 'p' && element.className.includes('text-green-800')
          ? content.length > 0
          : false
      ).textContent ?? '';
    const correctAnswer = deriveCorrectAnswer(questionText);

    fireEvent.click(screen.getByRole('button', { name: correctAnswer }));

    expect(screen.getByRole('button', { name: correctAnswer })).toHaveClass('border-emerald-300');
  });
});
