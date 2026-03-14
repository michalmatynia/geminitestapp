/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@/__tests__/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { repairKangurPolishCopy } from '@/shared/lib/i18n/kangur-polish-diacritics';

const { useKangurTutorAnchorMock } = vi.hoisted(() => ({
  useKangurTutorAnchorMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/components/KangurLessonNarrator', () => ({
  KangurLessonNarrator: ({ readLabel }: { readLabel: string }) => <button>{readLabel}</button>,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurTutorAnchor', () => ({
  useKangurTutorAnchor: useKangurTutorAnchorMock,
}));

import { KangurTestQuestionRenderer } from '@/features/kangur/ui/components/KangurTestQuestionRenderer';
import type { KangurTestQuestion } from '@/shared/contracts/kangur-tests';

const question: KangurTestQuestion = {
  id: 'question-1',
  suiteId: 'suite-1',
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
  editorial: { source: 'manual', reviewStatus: 'ready', workflowStatus: 'draft', auditFlags: [] },
};

describe('KangurTestQuestionRenderer', () => {
  beforeEach(() => {
    useKangurTutorAnchorMock.mockClear();
  });

  it('uses Kangur option-card styling for answer choices and shared feedback surfaces', async () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <KangurTestQuestionRenderer
        contentId='suite-1'
        question={question}
        selectedLabel={null}
        onSelect={onSelect}
        questionIndex={0}
        showAnswer={false}
        totalQuestions={1}
      />
    );

    expect(await screen.findByRole('button', { name: /read question/i })).toBeInTheDocument();
    expect(screen.getByText('Pytanie testowe')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-test-question-copy')).toHaveTextContent(
      /Wybierz jedną odpowiedź, a potem sprawdź omówienie i poprawny tok myślenia\./i
    );
    const correctChoiceButton = screen.getByRole('button', { name: /A.*4/i });
    const wrongChoiceButton = screen.getByRole('button', { name: /B.*5/i });

    expect(correctChoiceButton).toHaveClass(
      'soft-card',
      'kangur-card-surface',
      'kangur-card-padding-md',
      'cursor-pointer'
    );
    expect(wrongChoiceButton).toHaveClass(
      'soft-card',
      'kangur-card-surface',
      'kangur-card-padding-md',
      'cursor-pointer'
    );

    fireEvent.click(correctChoiceButton);
    expect(onSelect).toHaveBeenCalledWith('A');

    rerender(
      <KangurTestQuestionRenderer
        contentId='suite-1'
        question={question}
        selectedLabel='A'
        onSelect={onSelect}
        questionIndex={0}
        showAnswer={false}
        totalQuestions={1}
      />
    );

    expect(screen.getByRole('button', { name: /A.*4/i })).toHaveClass(
      'soft-card',
      'kangur-card-surface',
      'kangur-card-padding-md'
    );

    rerender(
      <KangurTestQuestionRenderer
        contentId='suite-1'
        question={question}
        selectedLabel='A'
        onSelect={onSelect}
        questionIndex={0}
        showAnswer={true}
        totalQuestions={1}
      />
    );

    expect(screen.getByTestId('kangur-test-question-copy')).toHaveTextContent(
      /Omówienie odpowiedzi/i
    );
    expect(screen.getByTestId('kangur-test-question-copy')).toHaveTextContent(
      /Porównaj swój wybór z poprawną odpowiedzią i przeczytaj krótkie wyjaśnienie\./i
    );
    expect(screen.getByText('3 pts')).toHaveClass('inline-flex', 'rounded-full', 'border');
    expect(screen.getByText('Question 1 / 1')).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );
    expect(screen.getByText('Ile to jest 2 + 2?')).toHaveClass('[color:var(--kangur-page-text)]');
    expect(screen.getByText('Explanation').parentElement).toHaveClass('soft-card', 'rounded-[22px]');
    expect(screen.getByText(/Correct! \+3 pts/i).closest('div')).toHaveClass(
      'soft-card',
      'rounded-[22px]',
      'text-sm',
      'font-semibold'
    );
    expect(screen.getByRole('button', { name: /A.*4/i })).toHaveClass(
      'soft-card',
      'kangur-card-surface',
      'kangur-card-padding-md'
    );
    expect(useKangurTutorAnchorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'kangur-test-selection:suite-1:question-1:A',
        kind: 'selection',
        enabled: true,
        surface: 'test',
        priority: 86,
        metadata: expect.objectContaining({
          contentId: 'suite-1',
          label: 'Odpowiedz A: 4',
        }),
      })
    );
  });

  it('renders rich choice notes and SVG content when configured', () => {
    render(
      <KangurTestQuestionRenderer
        question={{
          ...question,
          presentation: { layout: 'split-illustration-right', choiceStyle: 'grid' },
          choices: [
            {
              label: 'A',
              text: '4',
              description: 'Kwadrat z czterema kropkami',
              svgContent:
                '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><circle cx="15" cy="15" r="5"/><circle cx="45" cy="15" r="5"/><circle cx="15" cy="45" r="5"/><circle cx="45" cy="45" r="5"/></svg>',
            },
            { label: 'B', text: '5', svgContent: '' },
          ],
          illustration: {
            type: 'single',
            svgContent:
              '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="8" width="44" height="44" fill="none" stroke="black"/></svg>',
          },
        }}
        selectedLabel={null}
        onSelect={vi.fn()}
        showAnswer={false}
      />
    );

    expect(screen.getByText('Kwadrat z czterema kropkami')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-illustration-single-frame')).toBeInTheDocument();
  });

  it('can hide the learner-facing section intro for embedded previews', () => {
    render(
      <KangurTestQuestionRenderer
        question={question}
        selectedLabel={null}
        onSelect={vi.fn()}
        showAnswer={true}
        showSectionIntro={false}
      />
    );

    expect(
      screen.queryByText(repairKangurPolishCopy('Omówienie odpowiedzi'))
    ).not.toBeInTheDocument();
  });
});
