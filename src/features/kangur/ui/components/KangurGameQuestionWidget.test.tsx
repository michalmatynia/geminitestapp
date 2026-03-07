/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { useKangurGameRuntimeMock } = vi.hoisted(() => ({
  useKangurGameRuntimeMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurGameRuntimeContext', () => ({
  useKangurGameRuntime: useKangurGameRuntimeMock,
}));

vi.mock('@/features/kangur/ui/components/game', () => ({
  QuestionCard: ({
    questionNumber,
    total,
  }: {
    questionNumber: number;
    total: number;
  }): React.JSX.Element => (
    <div data-testid='mock-question-card'>
      Mock question card {questionNumber}/{total}
    </div>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurPracticeAssignmentBanner', () => ({
  __esModule: true,
  default: (): React.JSX.Element => <div data-testid='mock-assignment-banner'>Assignment banner</div>,
}));

import { KangurGameQuestionWidget } from '@/features/kangur/ui/components/KangurGameQuestionWidget';

describe('KangurGameQuestionWidget', () => {
  it('uses the lighter status-strip copy palette while rendering the active question', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      activePracticeAssignment: null,
      basePath: '/kangur',
      currentQuestion: { question: '2 + 2 = ?', answer: 4, choices: [4, 5, 6, 7] },
      currentQuestionIndex: 1,
      difficulty: 'easy',
      handleAnswer: vi.fn(),
      questionTimeLimit: 20,
      score: 7,
      screen: 'playing',
      totalQuestions: 10,
    });

    render(<KangurGameQuestionWidget />);

    expect(screen.getByText(/⭐ Wynik:/i)).toHaveClass('text-slate-500');
    expect(screen.getByText(/🟢 Latwy/i)).toHaveClass('text-slate-500');
    expect(screen.getByTestId('mock-question-card')).toBeInTheDocument();
  });
});
