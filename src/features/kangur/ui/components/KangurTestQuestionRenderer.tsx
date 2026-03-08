import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

import {
  KangurInfoCard,
  KangurOptionCardButton,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { useOptionalKangurTestSuiteRuntime } from '@/features/kangur/ui/context/KangurTestSuiteRuntimeContext';
import { KANGUR_ACCENT_STYLES, type KangurAccent } from '@/features/kangur/ui/design/tokens';
import { cn } from '@/shared/utils';
import type { KangurTestQuestion } from '@/shared/contracts/kangur-tests';
import type { KangurLesson } from '@/shared/contracts/kangur';
import { KangurLessonNarrator } from './KangurLessonNarrator';
import { KangurQuestionIllustrationRenderer } from './KangurQuestionIllustrationRenderer';

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
  const resolvedTotalQuestions = totalQuestions ?? runtime?.totalQuestions;
  const isAnswered = selectedLabel !== null;
  const isCorrect = selectedLabel === question.correctChoiceLabel;
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
      question.prompt,
      ...question.choices.map((choice) => `${choice.label}. ${choice.text}.`),
      showAnswer ? `Correct answer: ${question.correctChoiceLabel}.` : null,
      showAnswer && question.explanation ? `Explanation. ${question.explanation}` : null,
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
      <p className='text-sm font-medium leading-relaxed text-slate-800'>{question.prompt}</p>

      {/* Illustration */}
      {question.illustration.type !== 'none' ? (
        <KangurQuestionIllustrationRenderer illustration={question.illustration} className='my-2' />
      ) : null}

      {/* Choices */}
      <div className='space-y-2'>
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
              onClick={(): void => {
                if (!showAnswer) onSelect(choice.label);
              }}
              data-testid={`kangur-test-question-choice-${index}`}
              className={cn(
                'flex items-center gap-3 rounded-[24px] px-4 py-3 text-left text-sm font-semibold transition-all',
                cardClassName,
                showAnswer ? 'cursor-default' : 'cursor-pointer'
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
              <span className='flex-1 text-slate-700'>{choice.text}</span>
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
      {showAnswer && question.explanation ? (
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
