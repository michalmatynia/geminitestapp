/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurGameContextMock, getKangurQuestionsMock, isExamModeMock } = vi.hoisted(() => ({
  useKangurGameContextMock: vi.fn(),
  getKangurQuestionsMock: vi.fn(),
  isExamModeMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurGameContext', () => ({
  useKangurGameContext: useKangurGameContextMock,
}));

vi.mock('@/features/kangur/ui/services/kangur-questions', () => ({
  getKangurQuestions: getKangurQuestionsMock,
  isExamMode: isExamModeMock,
}));

import KangurGame from '@/features/kangur/ui/components/KangurGame';

describe('KangurGame', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useKangurGameContextMock.mockReturnValue({ mode: 'addition', onBack: vi.fn() });
    isExamModeMock.mockReturnValue(false);
    getKangurQuestionsMock.mockReturnValue([
      {
        id: 'practice-1',
        question: 'Ile to jest 2 + 2?',
        choices: ['3', '4', '5', '6'],
        answer: '4',
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

    expect(wrongChoice).toHaveClass('soft-card');
    expect(correctChoice).toHaveClass('soft-card');

    fireEvent.click(wrongChoice);

    expect(wrongChoice).toHaveClass('border-amber-300');

    fireEvent.click(screen.getByRole('button', { name: /zatwierdź odpowiedź/i }));

    expect(wrongChoice).toHaveClass('border-rose-300');
    expect(correctChoice).toHaveClass('border-emerald-300');
  });
});
