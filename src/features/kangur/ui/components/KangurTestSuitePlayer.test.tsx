/**
 * @vitest-environment jsdom
 */

import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { repairKangurPolishCopy } from '@/shared/lib/i18n/kangur-polish-diacritics';

const {
  tutorOpenChatMock,
  tutorSendMessageMock,
  tutorSetHighlightedTextMock,
  useKangurAiTutorSessionSyncMock,
  useOptionalKangurAiTutorMock,
} = vi.hoisted(() => ({
  tutorOpenChatMock: vi.fn(),
  tutorSendMessageMock: vi.fn(),
  tutorSetHighlightedTextMock: vi.fn(),
  useKangurAiTutorSessionSyncMock: vi.fn(),
  useOptionalKangurAiTutorMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/components/KangurLessonNarrator', () => ({
  KangurLessonNarrator: ({ readLabel }: { readLabel: string }) => <button>{readLabel}</button>,
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContext', () => ({
  useKangurAiTutorSessionSync: useKangurAiTutorSessionSyncMock,
  useOptionalKangurAiTutor: useOptionalKangurAiTutorMock,
}));

import { render, screen } from '@/__tests__/test-utils';
import { KangurTestSuitePlayer } from '@/features/kangur/ui/components/KangurTestSuitePlayer';
import type { KangurTestQuestion, KangurTestSuite } from '@/shared/contracts/kangur-tests';

const suite: KangurTestSuite = {
  id: 'suite-2024',
  title: 'Kangur 2024',
  description: 'Zestaw probny',
  year: 2024,
  gradeLevel: 'III-IV',
  category: 'matematyczny',
  enabled: true,
  publicationStatus: 'draft',
  sortOrder: 1000,
};

const questions: KangurTestQuestion[] = [
  {
    id: 'question-1',
    suiteId: 'suite-2024',
    sortOrder: 1000,
    prompt: 'Ile to jest 2 + 2?',
    choices: [
      { label: 'A', text: '4', svgContent: '' },
      { label: 'B', text: '5', svgContent: '' },
    ],
    correctChoiceLabel: 'A',
    pointValue: 3,
    explanation: '2 + 2 = 4.',
    illustration: { type: 'none' },
    presentation: { layout: 'classic', choiceStyle: 'list' },
    editorial: {
      source: 'manual',
      reviewStatus: 'ready',
      workflowStatus: 'published',
      auditFlags: [],
    },
  },
];

describe('KangurTestSuitePlayer', () => {
  beforeEach(() => {
    useKangurAiTutorSessionSyncMock.mockClear();
    useOptionalKangurAiTutorMock.mockReset();
    tutorOpenChatMock.mockReset();
    tutorSendMessageMock.mockReset();
    tutorSetHighlightedTextMock.mockReset();
    tutorSendMessageMock.mockResolvedValue(undefined);
    useOptionalKangurAiTutorMock.mockReturnValue({
      enabled: true,
      isLoading: false,
      openChat: tutorOpenChatMock,
      sendMessage: tutorSendMessageMock,
      setHighlightedText: tutorSetHighlightedTextMock,
    });
  });

  it('uses the shared pill CTA styles for suite navigation and restart actions', async () => {
    const onFinish = vi.fn();
    render(<KangurTestSuitePlayer suite={suite} questions={questions} onFinish={onFinish} />);

    expect(screen.getByText('Pytanie testowe')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Wybierz jedną odpowiedź, a potem sprawdź omówienie i poprawny tok myślenia.'
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId('kangur-test-question-copy')).toHaveTextContent(
      /Pytanie testowe\s*Wybierz jedną odpowiedź, a potem sprawdź omówienie i poprawny tok myślenia\./
    );
    expect(screen.getByText('Question 1 / 1')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /read question/i })).toBeInTheDocument();
    expect(screen.getByTestId('kangur-test-suite-progress-bar')).toHaveAttribute(
      'aria-valuenow',
      '100'
    );
    expect(screen.getByRole('button', { name: /previous/i })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: /A.*4/i }));

    const checkAnswerButton = screen.getByRole('button', { name: /check answer/i });
    expect(checkAnswerButton).toHaveClass('kangur-cta-pill', 'primary-cta');

    await userEvent.click(checkAnswerButton);

    const finishButton = screen.getByRole('button', { name: /finish/i });
    expect(finishButton).toHaveClass('kangur-cta-pill', 'primary-cta');

    await userEvent.click(finishButton);

    const restartButton = screen.getByRole('button', { name: /try again/i });
    expect(screen.getByText('Podsumowanie testu')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Sprawdź wynik końcowy i wróć do pytań, aby przeanalizować odpowiedzi.'
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId('kangur-test-suite-summary')).toHaveClass(
      'soft-card'
    );
    expect(restartButton).toHaveClass('kangur-cta-pill', 'surface-cta');
    expect(onFinish).toHaveBeenCalledWith(3, 3, { 'question-1': 'A' });
  });

  it('syncs finished summary result text into the tutor session context', async () => {
    render(<KangurTestSuitePlayer suite={suite} questions={questions} />);

    await userEvent.click(screen.getByRole('button', { name: /A.*4/i }));
    await userEvent.click(screen.getByRole('button', { name: /check answer/i }));
    await userEvent.click(screen.getByRole('button', { name: /finish/i }));

    expect(useKangurAiTutorSessionSyncMock).toHaveBeenLastCalledWith({
      learnerId: null,
      sessionContext: expect.objectContaining({
        surface: 'test',
        contentId: 'suite-2024',
        title: 'Kangur 2024',
        description: 'Wynik końcowy: 3/3 pkt (100%).',
        questionProgressLabel: 'Ukończono 1/1',
        answerRevealed: true,
      }),
    });
  });

  it('syncs selected-choice details into the tutor session context before answer reveal', async () => {
    render(<KangurTestSuitePlayer suite={suite} questions={questions} />);

    await userEvent.click(screen.getByRole('button', { name: /A.*4/i }));

    expect(useKangurAiTutorSessionSyncMock).toHaveBeenLastCalledWith({
      learnerId: null,
      sessionContext: expect.objectContaining({
        surface: 'test',
        contentId: 'suite-2024',
        questionId: 'question-1',
        selectedChoiceLabel: 'A',
        selectedChoiceText: '4',
        currentQuestion: 'Ile to jest 2 + 2?',
        description: undefined,
        questionProgressLabel: 'Pytanie 1/1',
        answerRevealed: false,
      }),
    });
  });

  it('opens the tutor with a selected-choice explain request before answer reveal', async () => {
    render(<KangurTestSuitePlayer suite={suite} questions={questions} />);

    expect(
      screen.queryByTestId('kangur-test-suite-selected-choice-tutor-cta')
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /A.*4/i }));

    const askAboutChoiceButton = screen.getByTestId('kangur-test-suite-selected-choice-tutor-cta');
    expect(askAboutChoiceButton).toHaveClass('kangur-cta-pill', 'surface-cta');

    await userEvent.click(askAboutChoiceButton);

    expect(tutorSetHighlightedTextMock).toHaveBeenCalledWith('Odpowiedz A: 4');
    expect(tutorOpenChatMock).toHaveBeenCalledTimes(1);
    expect(tutorSendMessageMock).toHaveBeenCalledWith(
      'Wyjaśnij zaznaczony fragment krok po kroku.',
      expect.objectContaining({
        promptMode: 'selected_text',
        selectedText: 'Odpowiedz A: 4',
        contentId: 'suite-2024',
        focusKind: 'selection',
        focusId: 'kangur-test-selection:suite-2024:question-1:A',
        focusLabel: 'Odpowiedz A: 4',
        knowledgeReference: {
          sourceCollection: 'kangur_page_content',
          sourceRecordId: 'tests-selection',
          sourcePath: 'entry:tests-selection',
        },
        interactionIntent: 'explain',
        surface: 'test',
      })
    );
  });

  it('syncs revealed review details into the tutor session context after checking the answer', async () => {
    render(<KangurTestSuitePlayer suite={suite} questions={questions} />);

    await userEvent.click(screen.getByRole('button', { name: /A.*4/i }));
    await userEvent.click(screen.getByRole('button', { name: /check answer/i }));

    expect(useKangurAiTutorSessionSyncMock).toHaveBeenLastCalledWith({
      learnerId: null,
      sessionContext: expect.objectContaining({
        surface: 'test',
        contentId: 'suite-2024',
        title: 'Kangur 2024',
        questionId: 'question-1',
        selectedChoiceLabel: 'A',
        selectedChoiceText: '4',
        currentQuestion: 'Ile to jest 2 + 2?',
        description: 'Wybrana odpowiedź: A - 4. Poprawna odpowiedź: A - 4.',
        questionProgressLabel: 'Pytanie 1/1',
        answerRevealed: true,
      }),
    });
  });

  it('hides the selected-choice tutor CTA after the answer is revealed', async () => {
    render(<KangurTestSuitePlayer suite={suite} questions={questions} />);

    await userEvent.click(screen.getByRole('button', { name: /A.*4/i }));
    expect(screen.getByTestId('kangur-test-suite-selected-choice-tutor-cta')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /check answer/i }));

    expect(
      screen.queryByTestId('kangur-test-suite-selected-choice-tutor-cta')
    ).not.toBeInTheDocument();
  });

  it('uses the shared empty-state surface when a suite has no questions', () => {
    render(<KangurTestSuitePlayer suite={suite} questions={[]} />);

    expect(screen.getByTestId('kangur-test-suite-empty')).toHaveClass(
      'soft-card',
      'border-dashed',
      'border'
    );
    expect(screen.getByTestId('kangur-test-suite-empty')).toHaveTextContent(
      repairKangurPolishCopy('Brak opublikowanych pytan')
    );
    expect(screen.getByTestId('kangur-test-suite-empty')).toHaveTextContent(
      repairKangurPolishCopy(
        'Ten zestaw nie ma jeszcze aktywnych pytan testowych. Wroc pozniej albo wybierz inny zestaw.'
      )
    );
  });

  it('filters out draft questions and plays only published ones', async () => {
    const onFinish = vi.fn();
    render(
      <KangurTestSuitePlayer
        suite={suite}
        questions={[
          {
            ...questions[0]!,
            id: 'draft-question',
            prompt: 'Draft question should stay hidden',
            editorial: {
              source: 'manual',
              reviewStatus: 'ready',
              workflowStatus: 'draft',
              auditFlags: [],
            },
          },
          questions[0]!,
        ]}
        onFinish={onFinish}
      />
    );

    expect(screen.queryByText('Draft question should stay hidden')).not.toBeInTheDocument();
    expect(screen.getByText('Question 1 / 1')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /A.*4/i }));
    await userEvent.click(screen.getByRole('button', { name: /check answer/i }));
    await userEvent.click(screen.getByRole('button', { name: /finish/i }));

    expect(onFinish).toHaveBeenCalledWith(3, 3, { 'question-1': 'A' });
  });

  it('preserves revealed review state when returning to a previous question', async () => {
    render(
      <KangurTestSuitePlayer
        suite={suite}
        questions={[
          questions[0]!,
          {
            ...questions[0]!,
            id: 'question-2',
            prompt: 'Ile to jest 3 + 3?',
          },
        ]}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /A.*4/i }));
    await userEvent.click(screen.getByRole('button', { name: /check answer/i }));
    await userEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(await screen.findByText('Ile to jest 3 + 3?')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /previous/i }));

    expect(
      await screen.findByText(repairKangurPolishCopy('Omowienie odpowiedzi'))
    ).toBeInTheDocument();
    expect(await screen.findByText(/Correct! \+3 pts/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });
});
