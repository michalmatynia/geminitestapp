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
import { KangurQuestionIllustrationRenderer } from './KangurQuestionIllustrationRenderer';

type Props = {
  question: KangurTestQuestion;
  selectedLabel: string | null;
  onSelect: (label: string) => void;
  showAnswer: boolean;
  questionIndex?: number;
  totalQuestions?: number;
};

export function KangurTestQuestionRenderer({
  question,
  selectedLabel,
  onSelect,
  showAnswer,
  questionIndex,
  totalQuestions,
}: Props): React.JSX.Element {
  const runtime = useOptionalKangurTestSuiteRuntime();
  const resolvedTotalQuestions = totalQuestions ?? runtime?.totalQuestions;
  const isAnswered = selectedLabel !== null;
  const isCorrect = selectedLabel === question.correctChoiceLabel;

  return (
    <div className='space-y-4'>
      {/* Header */}
      {questionIndex !== undefined && resolvedTotalQuestions !== undefined ? (
        <div className='flex items-center justify-between'>
          <span className='text-xs font-semibold uppercase tracking-wide text-gray-400'>
            Question {questionIndex + 1} / {resolvedTotalQuestions}
          </span>
          <KangurStatusChip accent='slate' size='sm'>
            {question.pointValue} {question.pointValue === 1 ? 'pt' : 'pts'}
          </KangurStatusChip>
        </div>
      ) : null}

      {/* Prompt */}
      <p className='text-sm font-medium leading-relaxed text-gray-800'>{question.prompt}</p>

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
