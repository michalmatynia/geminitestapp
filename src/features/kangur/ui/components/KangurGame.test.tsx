/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

const {
  useKangurGameContextMock,
  getKangurQuestionsMock,
  isExamModeMock,
  useOptionalKangurGameRuntimeMock,
  useKangurSubjectFocusMock,
  addXpMock,
  createGameSessionRewardMock,
  loadProgressMock,
} = vi.hoisted(() => ({
  useKangurGameContextMock: vi.fn(),
  getKangurQuestionsMock: vi.fn(),
  isExamModeMock: vi.fn(),
  useOptionalKangurGameRuntimeMock: vi.fn(() => null),
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
  useOptionalKangurGameRuntime: useOptionalKangurGameRuntimeMock,
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

import plMessages from '@/i18n/messages/pl.json';

let KangurGame: (props: Record<string, never>) => React.JSX.Element;
let KangurLessonPrintProvider: ({
  children,
  onPrintPanel,
}: {
  children: React.ReactNode;
  onPrintPanel?: (panelId?: string) => void;
}) => React.JSX.Element;

const renderGame = (
  ui: React.ReactNode,
  options: { onPrintPanel?: (panelId?: string) => void } = {}
) =>
  render(ui, {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <NextIntlClientProvider locale='pl' messages={plMessages}>
        {options.onPrintPanel ? (
          <KangurLessonPrintProvider onPrintPanel={options.onPrintPanel}>
            {children}
          </KangurLessonPrintProvider>
        ) : (
          children
        )}
      </NextIntlClientProvider>
    ),
  });

describe('KangurGame', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.resetModules();
    ({ default: KangurGame } = await import('@/features/kangur/ui/components/KangurGame'));
    ({ KangurLessonPrintProvider } = await import(
      '@/features/kangur/ui/context/KangurLessonPrintContext'
    ));
    useOptionalKangurGameRuntimeMock.mockReturnValue(null);
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
    renderGame(<KangurGame />);

    const wrongChoice = screen.getByTestId('kangur-game-choice-0');
    const correctChoice = screen.getByTestId('kangur-game-choice-1');

    expect(screen.getByTestId('kangur-game-question-print-panel')).toHaveAttribute(
      'data-kangur-print-panel',
      'true'
    );
    expect(screen.getByTestId('kangur-game-question-print-panel')).toHaveAttribute(
      'data-kangur-print-panel-id',
      'kangur-game-question-2024_1'
    );
    expect(screen.getByTestId('kangur-game-question-print-panel')).toHaveAttribute(
      'data-kangur-print-panel-title',
      'Pytanie 1'
    );
    expect(screen.getByTestId('kangur-game-print-summary')).toHaveTextContent('Pytanie 1');
    expect(screen.getByTestId('kangur-game-print-summary')).toHaveTextContent(
      'Ile to jest 2 + 2?'
    );
    expect(screen.getByTestId('kangur-game-print-summary')).toHaveTextContent(
      'Otwórz tę lekcję na ekranie, aby odpowiedzieć na pytanie interaktywnie.'
    );
    expect(screen.getByTestId('kangur-game-print-choice-1')).toHaveTextContent('B. 4');
    expect(screen.getByTestId('kangur-game-live-question-ui')).toHaveAttribute(
      'data-kangur-print-exclude',
      'true'
    );

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
    expect(
      within(screen.getByTestId('kangur-game-question-shell')).getByText('Ile to jest 2 + 2?')
    ).toHaveClass('[color:var(--kangur-page-text)]');
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
    expect(
      within(screen.getByTestId('kangur-game-summary-shell')).getByText('0% poprawnych odpowiedzi')
    ).toHaveClass(
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
    useOptionalKangurGameRuntimeMock.mockReturnValue({
      activeSessionRecommendation: {
        description: 'Ten zestaw najlepiej pcha bieżące odznaki.',
        label: 'Gotowość konkursowa',
        source: 'kangur_setup',
        title: 'Polecamy pełny test konkursowy',
      },
    });

    renderGame(<KangurGame />);

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
    const view = renderGame(<KangurGame />);

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

  it('renders a local print button for the live question panel and the finished result panel', () => {
    const onPrintPanel = vi.fn();

    renderGame(<KangurGame />, { onPrintPanel });

    const livePrintButton = screen.getByTestId('kangur-game-print-button');
    expect(livePrintButton).toHaveAttribute('aria-label', 'Drukuj panel');
    expect(screen.getByTestId('kangur-game-question-print-panel')).toHaveAttribute(
      'data-kangur-print-panel-id',
      'kangur-game-question-2024_1'
    );

    fireEvent.click(livePrintButton);
    expect(onPrintPanel).toHaveBeenCalledTimes(1);
    expect(onPrintPanel).toHaveBeenCalledWith('kangur-game-question-2024_1');

    fireEvent.click(screen.getByTestId('kangur-game-choice-1'));
    fireEvent.click(screen.getByRole('button', { name: /zatwierdź odpowiedź/i }));

    act(() => {
      vi.advanceTimersByTime(1400);
    });

    expect(screen.getByTestId('kangur-game-result-print-summary')).toHaveTextContent('Wynik: 1/1');
    expect(screen.getByTestId('kangur-game-result-print-panel')).toHaveAttribute(
      'data-kangur-print-panel-id',
      'kangur-game-result'
    );
    expect(screen.getByTestId('kangur-game-result-print-panel')).toHaveAttribute(
      'data-kangur-print-panel-title',
      'Wynik: 1/1'
    );

    const resultPrintButton = screen.getByTestId('kangur-game-print-button');
    fireEvent.click(resultPrintButton);

    expect(onPrintPanel).toHaveBeenCalledTimes(2);
    expect(onPrintPanel).toHaveBeenLastCalledWith('kangur-game-result');
  });
});
