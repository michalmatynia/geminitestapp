import { CheckCircle, XCircle } from 'lucide-react';
import React from 'react';

import {
  getQuestionExplanationNarrationText,
  getQuestionStemNarrationText,
  questionDocumentNeedsRichRenderer,
  hasIllustration,
  hasRichChoiceContent,
} from '@/features/kangur/test-questions';
import { useOptionalKangurTestSuiteRuntime } from '@/features/kangur/ui/context/KangurTestSuiteRuntimeContext';
import {
  KangurInfoCard,
  KangurOptionCardButton,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_ACCENT_STYLES, type KangurAccent } from '@/features/kangur/ui/design/tokens';
import type { KangurLesson } from '@/shared/contracts/kangur';
import type { KangurTestQuestion } from '@/shared/contracts/kangur-tests';
import { cn, sanitizeSvg } from '@/shared/utils';

import { KangurLessonDocumentRenderer } from './KangurLessonDocumentRenderer';
import { KangurLessonNarrator } from './KangurLessonNarrator';
import { renderKangurQuestionIllustration } from './KangurQuestionIllustrationRenderer';

type Props = {
  question: KangurTestQuestion;
  selectedLabel: string | null;
  onSelect: (label: string) => void;
  showAnswer: boolean;
  questionIndex?: number;
  totalQuestions?: number;
  showReadControl?: boolean;
};

export function KangurTestQuestionRenderer({
  question,
  selectedLabel,
  onSelect,
  showAnswer,
  questionIndex,
  totalQuestions,
  showReadControl = true,
}: Props): React.JSX.Element {
  const runtime = useOptionalKangurTestSuiteRuntime();
  const presentation = question.presentation ?? { layout: 'classic', choiceStyle: 'list' };
  const stemDocument = question.stemDocument;
  const explanationDocument = question.explanationDocument;
  const richExplanationDocument = explanationDocument;
  const resolvedTotalQuestions = totalQuestions ?? runtime?.totalQuestions;
  const isAnswered = selectedLabel !== null;
  const isCorrect = selectedLabel === question.correctChoiceLabel;
  const choiceInteractionState = showAnswer ? 'locked' : 'interactive';
  const narrationSourceRef = React.useRef<HTMLDivElement | null>(null);
  const narratorLesson = React.useMemo<
    Pick<KangurLesson, 'id' | 'title' | 'description' | 'contentMode'>
  >(
    () => ({
      id: `kangur-test-question:${question.id}`,
      title: questionIndex !== undefined ? `Question ${questionIndex + 1}` : 'Question',
      description: question.prompt,
      contentMode: 'component',
    }),
    [question.id, question.prompt, questionIndex]
  );
  const narrationText = React.useMemo(() => {
    const parts = [
      questionIndex !== undefined && resolvedTotalQuestions !== undefined
        ? `Question ${questionIndex + 1} of ${resolvedTotalQuestions}.`
        : null,
      getQuestionStemNarrationText(question),
      ...question.choices.map((choice) =>
        [choice.label, choice.text, choice.description].filter(Boolean).join('. ') + '.'
      ),
      showAnswer ? `Correct answer: ${question.correctChoiceLabel}.` : null,
      showAnswer && question.explanation
        ? `Explanation. ${getQuestionExplanationNarrationText(question)}`
        : null,
    ];

    return parts.filter(Boolean).join(' ');
  }, [
    question.choices,
    question.correctChoiceLabel,
    question.explanation,
    question.prompt,
    questionIndex,
    resolvedTotalQuestions,
    showAnswer,
  ]);
  const renderRichStem = questionDocumentNeedsRichRenderer(stemDocument, question.prompt);
  const renderRichExplanation = questionDocumentNeedsRichRenderer(
    explanationDocument,
    question.explanation ?? ''
  );
  const choiceGrid = presentation.choiceStyle === 'grid' || hasRichChoiceContent(question);
  const handleChoiceSelect = (label: string): void => {
    if (choiceInteractionState === 'interactive') {
      onSelect(label);
    }
  };

  const stemContent = renderRichStem && stemDocument ? (
    <KangurLessonDocumentRenderer document={stemDocument} renderMode='lesson' />
  ) : (
    <p className='text-sm font-medium leading-relaxed text-slate-800'>{question.prompt}</p>
  );

  const illustrationContent = hasIllustration(question) ? (
    renderKangurQuestionIllustration(question.illustration, 'my-2')
  ) : null;

  const promptContent =
    illustrationContent &&
    (presentation.layout === 'split-illustration-left' ||
      presentation.layout === 'split-illustration-right') ? (
        <div
          className={cn(
            'grid gap-4 rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-4 lg:grid-cols-2',
            presentation.layout === 'split-illustration-left' && 'lg:[&>*:first-child]:order-2'
          )}
        >
          <div className='min-w-0'>{stemContent}</div>
          <div className='min-w-0'>{illustrationContent}</div>
        </div>
      ) : (
        <>
          {stemContent}
          {illustrationContent}
        </>
      );

  return (
    <div className='space-y-4'>
      <div aria-hidden='true' className='sr-only' ref={narrationSourceRef}>
        {narrationText}
      </div>
      {/* Header */}
      {questionIndex !== undefined && resolvedTotalQuestions !== undefined ? (
        <div className='flex items-start justify-between gap-3'>
          <span className='pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400'>
            Question {questionIndex + 1} / {resolvedTotalQuestions}
          </span>
          <div className='flex items-center gap-2'>
            {showReadControl ? (
              <KangurLessonNarrator
                lesson={narratorLesson}
                lessonDocument={null}
                lessonContentRef={narrationSourceRef}
                readLabel='Read question'
              />
            ) : null}
            <KangurStatusChip accent='slate' size='sm'>
              {question.pointValue} {question.pointValue === 1 ? 'pt' : 'pts'}
            </KangurStatusChip>
          </div>
        </div>
      ) : null}

      {/* Prompt */}
      {promptContent}

      {/* Choices */}
      <div className={cn(choiceGrid ? 'grid gap-3 sm:grid-cols-2' : 'space-y-2')}>
        {question.choices.map((choice, index) => {
          const isSelected = selectedLabel === choice.label;
          const isChoiceCorrect = choice.label === question.correctChoiceLabel;

          let accent: KangurAccent = 'slate';
          let emphasis: 'neutral' | 'accent' = 'neutral';
          let cardClassName = 'text-slate-700';
          let badgeClassName = KANGUR_ACCENT_STYLES.slate.badge;

          if (isSelected && !showAnswer) {
            accent = 'amber';
            emphasis = 'accent';
            cardClassName = KANGUR_ACCENT_STYLES.amber.activeText;
            badgeClassName = KANGUR_ACCENT_STYLES.amber.badge;
          } else if (showAnswer && isChoiceCorrect) {
            accent = 'emerald';
            emphasis = 'accent';
            cardClassName = KANGUR_ACCENT_STYLES.emerald.activeText;
            badgeClassName = KANGUR_ACCENT_STYLES.emerald.badge;
          } else if (showAnswer && isSelected && !isChoiceCorrect) {
            accent = 'rose';
            emphasis = 'accent';
            cardClassName = KANGUR_ACCENT_STYLES.rose.activeText;
            badgeClassName = KANGUR_ACCENT_STYLES.rose.badge;
          }

          return (
            <KangurOptionCardButton
              accent={accent}
              key={choice.label}
              type='button'
              onClick={(): void => handleChoiceSelect(choice.label)}
              data-testid={`kangur-test-question-choice-${index}`}
              className={cn(
                'flex items-start gap-3 rounded-[24px] px-4 py-3 text-left text-sm font-semibold transition-all',
                cardClassName,
                choiceGrid && 'h-full min-h-[112px]',
                choiceInteractionState === 'locked' ? 'cursor-default' : 'cursor-pointer'
              )}
              emphasis={emphasis}
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold',
                  badgeClassName
                )}
              >
                {choice.label}
              </span>
              <span className='flex flex-1 flex-col gap-2 text-slate-700'>
                {choice.svgContent?.trim() ? (
                  <span className='flex items-center justify-center rounded-[18px] border border-slate-200 bg-white p-2'>
                    <span
                      className='block max-h-24 max-w-full'
                      dangerouslySetInnerHTML={{ __html: sanitizeSvg(choice.svgContent) }}
                    />
                  </span>
                ) : null}
                <span>{choice.text}</span>
                {choice.description?.trim() ? (
                  <span className='text-xs font-medium leading-5 text-slate-500'>
                    {choice.description.trim()}
                  </span>
                ) : null}
              </span>
              {showAnswer && isChoiceCorrect ? (
                <CheckCircle className='size-4 shrink-0 text-emerald-500' />
              ) : null}
              {showAnswer && isSelected && !isChoiceCorrect ? (
                <XCircle className='size-4 shrink-0 text-rose-500' />
              ) : null}
            </KangurOptionCardButton>
          );
        })}
      </div>

      {/* Explanation */}
      {showAnswer && renderRichExplanation && richExplanationDocument ? (
        <div className='space-y-2'>
          <div className='text-xs font-bold uppercase tracking-wide text-indigo-600'>
            Explanation
          </div>
          <KangurLessonDocumentRenderer document={richExplanationDocument} renderMode='lesson' />
        </div>
      ) : null}
      {showAnswer && !renderRichExplanation && question.explanation ? (
        <KangurInfoCard accent='indigo' className='rounded-[22px]' padding='md' tone='accent'>
          <div className='mb-1 text-xs font-bold uppercase tracking-wide text-indigo-600'>
            Explanation
          </div>
          <p className='text-sm text-indigo-900'>{question.explanation}</p>
        </KangurInfoCard>
      ) : null}

      {/* Result indicator */}
      {showAnswer && isAnswered ? (
        <KangurInfoCard
          accent={isCorrect ? 'emerald' : 'rose'}
          className={cn(
            'flex items-center gap-2 rounded-[22px] text-sm font-semibold',
            isCorrect ? 'text-emerald-700' : 'text-rose-700'
          )}
          padding='md'
          tone='accent'
        >
          {isCorrect ? (
            <>
              <CheckCircle className='size-4' />
              Correct! +{question.pointValue} pts
            </>
          ) : (
            <>
              <XCircle className='size-4' />
              Incorrect. Correct answer: {question.correctChoiceLabel}
            </>
          )}
        </KangurInfoCard>
      ) : null}
    </div>
  );
}
