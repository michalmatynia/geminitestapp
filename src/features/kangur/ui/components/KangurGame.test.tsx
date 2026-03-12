/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurGameContextMock, getKangurQuestionsMock, isExamModeMock } = vi.hoisted(() => ({
  useKangurGameContextMock: vi.fn(),
  getKangurQuestionsMock: vi.fn(),
  isExamModeMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurGameContext', () => ({
  useKangurGameContext: useKangurGameContextMock,
}));

vi.mock('@/features/kangur/ui/context/KangurGameRuntimeContext', () => ({
  useOptionalKangurGameRuntime: vi.fn(() => null),
}));

vi.mock('@/features/kangur/ui/services/kangur-questions', () => ({
  getKangurQuestions: getKangurQuestionsMock,
  isExamMode: isExamModeMock,
}));

import KangurGame from '@/features/kangur/ui/components/KangurGame';
import { useOptionalKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

describe('KangurGame', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useKangurGameContextMock.mockReturnValue({ mode: 'addition', onBack: vi.fn() });
    isExamModeMock.mockReturnValue(false);
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
      'border-white/88',
      'bg-white/94'
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

    expect(screen.getByTestId('kangur-game-summary-shell')).toHaveClass(
      'glass-panel',
      'border-white/88',
      'bg-white/94'
    );
    expect(screen.getByText('0% poprawnych odpowiedzi')).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );
    expect(screen.getByText('+10 XP ✨')).toHaveClass('rounded-full', 'border');
    expect(screen.getByTestId('kangur-game-summary-breakdown')).toHaveTextContent(
      'Ukonczenie rundy +10'
    );
    expect(screen.getByTestId('kangur-game-summary-breakdown-base')).toHaveTextContent(
      'Ukonczenie rundy +10'
    );
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
  });

  it('adds a guided-focus reward chip when the Kangur session follows the recommended path', () => {
    vi.mocked(useOptionalKangurGameRuntime).mockReturnValue({
      activeSessionRecommendation: {
        description: 'Ten zestaw najlepiej pcha biezace odznaki.',
        label: 'Gotowosc konkursowa',
        source: 'kangur_setup',
        title: 'Polecamy pelny test konkursowy',
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
});
