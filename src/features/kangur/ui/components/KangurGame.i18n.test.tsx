/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

const {
  useKangurGameContextMock,
  getKangurQuestionsMock,
  isExamModeMock,
  useKangurSubjectFocusMock,
} = vi.hoisted(() => ({
  useKangurGameContextMock: vi.fn(),
  getKangurQuestionsMock: vi.fn(),
  isExamModeMock: vi.fn(),
  useKangurSubjectFocusMock: vi.fn(),
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

import deMessages from '@/i18n/messages/de.json';
import KangurGame from '@/features/kangur/ui/components/KangurGame';

describe('KangurGame i18n', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useKangurGameContextMock.mockReturnValue({ mode: 'addition', onBack: vi.fn() });
    isExamModeMock.mockReturnValue(false);
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject: vi.fn(),
      subjectKey: 'learner-1',
    });
    getKangurQuestionsMock.mockReturnValue([
      {
        id: '2024_5pt_17',
        question: 'Wie viel ist 2 + 2?',
        choices: ['3', '4', '5', '6'],
        answer: '4',
        explanation: '2 + 2 ist 4.',
      },
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('localizes the practice question shell into German and derives the 5-point chip', () => {
    render(
      <NextIntlClientProvider locale='de' messages={deMessages}>
        <KangurGame />
      </NextIntlClientProvider>
    );

    expect(screen.getByText('Frage 1')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-game-point-chip')).toHaveTextContent('⭐ 5 Pkt. (schwer)');

    fireEvent.click(screen.getByTestId('kangur-game-choice-0'));
    fireEvent.click(screen.getByRole('button', { name: 'Antwort bestätigen ✓' }));

    expect(screen.getByText('Falsche Antwort')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-game-explanation')).toHaveTextContent('2 + 2 ist 4.');
  });
});
