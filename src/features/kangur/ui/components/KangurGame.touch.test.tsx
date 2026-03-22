/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import KangurGame from '@/features/kangur/ui/components/KangurGame';

describe('KangurGame touch mode', () => {
  beforeEach(() => {
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

  it('shows a touch hint and larger answer controls on coarse pointers', () => {
    render(<KangurGame />);

    expect(screen.getByTestId('kangur-game-touch-hint')).toHaveTextContent(
      'Dotknij odpowiedź, a potem dotknij przycisk zatwierdzania.'
    );
    expect(screen.getByTestId('kangur-game-choice-0')).toHaveClass(
      'touch-manipulation',
      'select-none',
      'min-h-[4.25rem]'
    );
    expect(screen.getByRole('button', { name: /zatwierdź odpowiedź/i })).toHaveClass(
      'touch-manipulation',
      'select-none',
      'min-h-12'
    );
  });
});
