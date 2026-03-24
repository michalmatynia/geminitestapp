/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useKangurGameContextMock,
  getKangurQuestionsMock,
  isExamModeMock,
  useKangurSubjectFocusMock,
  addXpMock,
  createGameSessionRewardMock,
  loadProgressMock,
} = vi.hoisted(() => ({
  useKangurGameContextMock: vi.fn(),
  getKangurQuestionsMock: vi.fn(),
  isExamModeMock: vi.fn(),
  useKangurSubjectFocusMock: vi.fn(),
  addXpMock: vi.fn(),
  createGameSessionRewardMock: vi.fn((_: unknown, options?: { followsRecommendation?: boolean }) => {
    const baseBreakdown = [{ kind: 'base', label: 'Ukończenie rundy', xp: 10 }];
    const guidedBreakdown = options?.followsRecommendation
      ? [{ kind: 'guided_focus', label: 'Polecony kierunek', xp: 3 }]
      : [];

    return {
      xp: 10 + guidedBreakdown.reduce((sum, entry) => sum + entry.xp, 0),
      breakdown: [...baseBreakdown, ...guidedBreakdown],
      progressUpdates: {},
    };
  }),
  loadProgressMock: vi.fn(() => ({
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
  })),
}));

vi.mock('@/features/kangur/ui/context/KangurGameContext', () => ({
  useKangurGameContext: useKangurGameContextMock,
}));

vi.mock('@/features/kangur/ui/context/KangurGameRuntimeContext', () => ({
  useOptionalKangurGameRuntime: vi.fn(() => null),
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: useKangurSubjectFocusMock,
}));

vi.mock('@/features/kangur/ui/services/kangur-questions', () => ({
  getKangurQuestions: getKangurQuestionsMock,
  isExamMode: isExamModeMock,
}));

vi.mock('@/features/kangur/ui/services/progress', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/ui/services/progress')>();

  return {
    ...actual,
    addXp: (...args: unknown[]) => addXpMock(...args),
    createGameSessionReward: (...args: unknown[]) => createGameSessionRewardMock(...args),
    loadProgress: (...args: unknown[]) => loadProgressMock(...args),
  };
});

import KangurGame from '@/features/kangur/ui/components/KangurGame';
import { useOptionalKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

describe('KangurGame', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.mocked(useOptionalKangurGameRuntime).mockReturnValue(null);
    useKangurGameContextMock.mockReturnValue({ mode: 'addition', onBack: vi.fn() });
    isExamModeMock.mockReturnValue(false);
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject: vi.fn(),
      subjectKey: 'learner-1',
    });
    getKangurQuestionsMock.mockReturnValue([
      {
        id: '2024_1',
        question: 'Ile to jest 2 + 2?',
        choices: ['3', '4', '5', '6'],
        answer: '4',
        explanation: '2 + 2 daje 4.',
      },
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses Kangur option-card styling for practice answers across selection states', () => {
    render(<KangurGame />);

    const wrongChoice = screen.getByTestId('kangur-game-choice-0');
    const correctChoice = screen.getByTestId('kangur-game-choice-1');

    expect(screen.getByTestId('kangur-game-point-chip')).toHaveClass(
      'rounded-full',
      'border'
    );
    expect(screen.getByTestId('kangur-game-progress-bar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByTestId('kangur-game-question-shell')).toHaveClass(
      'glass-panel',
      'kangur-panel-soft',
      'kangur-panel-padding-lg'
    );
    expect(screen.getByText('Ile to jest 2 + 2?')).toHaveClass('[color:var(--kangur-page-text)]');
    expect(screen.getByTestId('kangur-game-illustration-shell')).toHaveClass(
      'soft-card',
      'border'
    );
    expect(wrongChoice).toHaveClass('soft-card');
    expect(correctChoice).toHaveClass('soft-card');

    fireEvent.click(wrongChoice);

    expect(wrongChoice).toHaveClass('soft-card');

    fireEvent.click(screen.getByRole('button', { name: /zatwierdź odpowiedź/i }));

    expect(wrongChoice).toHaveClass('cursor-default');
    expect(correctChoice).toHaveClass('cursor-default');
    expect(screen.getByTestId('kangur-game-explanation')).toHaveClass('soft-card');

    act(() => {
      vi.advanceTimersByTime(1400);
    });

    expect(screen.getByTestId('kangur-game-summary-shell')).toHaveClass('glass-panel', 'kangur-panel-soft', 'kangur-panel-padding-xl');
    expect(screen.getByText('0% poprawnych odpowiedzi')).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );
    expect(screen.getByText('+10 XP ✨')).toHaveClass('rounded-full', 'border');
    expect(screen.getByTestId('kangur-game-summary-breakdown')).toHaveTextContent(
      'Ukończenie rundy +10'
    );
    expect(screen.getByTestId('kangur-game-summary-breakdown-base')).toHaveTextContent(
      'Ukończenie rundy +10'
    );
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
    expect(loadProgressMock).toHaveBeenCalledWith({ ownerKey: 'learner-1' });
    expect(addXpMock).toHaveBeenCalledWith(10, {}, { ownerKey: 'learner-1' });
  });

  it('adds a guided-focus reward chip when the Kangur session follows the recommended path', () => {
    vi.mocked(useOptionalKangurGameRuntime).mockReturnValue({
      activeSessionRecommendation: {
        description: 'Ten zestaw najlepiej pcha bieżące odznaki.',
        label: 'Gotowość konkursowa',
        source: 'kangur_setup',
        title: 'Polecamy pełny test konkursowy',
      },
    } as ReturnType<typeof useOptionalKangurGameRuntime>);

    render(<KangurGame />);

    fireEvent.click(screen.getByTestId('kangur-game-choice-1'));
    fireEvent.click(screen.getByRole('button', { name: /zatwierdź odpowiedź/i }));

    act(() => {
      vi.advanceTimersByTime(1400);
    });

    expect(screen.getByTestId('kangur-game-summary-breakdown')).toHaveTextContent(
      'Polecony kierunek +3'
    );
  });

  it('uses the latest learner key when the session reward is awarded', () => {
    const view = render(<KangurGame />);

    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject: vi.fn(),
      subjectKey: 'learner-2',
    });
    view.rerender(<KangurGame />);

    fireEvent.click(screen.getByTestId('kangur-game-choice-1'));
    fireEvent.click(screen.getByRole('button', { name: /zatwierdź odpowiedź/i }));

    act(() => {
      vi.advanceTimersByTime(1400);
    });

    expect(loadProgressMock).toHaveBeenCalledWith({ ownerKey: 'learner-2' });
    expect(addXpMock).toHaveBeenCalledWith(10, {}, { ownerKey: 'learner-2' });
  });
});
