import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

import {
  KANGUR_ACCENT_STYLES,
  KANGUR_OPTION_CARD_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
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
  const isAnswered = selectedLabel !== null;
  const isCorrect = selectedLabel === question.correctChoiceLabel;

  return (
    <div className='space-y-4'>
      {/* Header */}
      {questionIndex !== undefined && totalQuestions !== undefined ? (
        <div className='flex items-center justify-between'>
          <span className='text-xs font-semibold uppercase tracking-wide text-gray-400'>
            Question {questionIndex + 1} / {totalQuestions}
          </span>
          <span className='rounded-full border border-gray-200 px-2 py-0.5 text-xs font-bold text-gray-600'>
            {question.pointValue} {question.pointValue === 1 ? 'pt' : 'pts'}
          </span>
        </div>
      ) : null}

      {/* Prompt */}
      <p className='text-sm font-medium leading-relaxed text-gray-800'>{question.prompt}</p>

      {/* Illustration */}
      {question.illustration.type !== 'none' ? (
        <KangurQuestionIllustrationRenderer
          illustration={question.illustration}
          className='my-2'
        />
      ) : null}

      {/* Choices */}
      <div className='space-y-2'>
        {question.choices.map((choice, index) => {
          const isSelected = selectedLabel === choice.label;
          const isChoiceCorrect = choice.label === question.correctChoiceLabel;

          let cardClassName = cn(
            'border-slate-200/80 text-slate-700',
            KANGUR_ACCENT_STYLES.slate.hoverCard
          );
          let badgeClassName = KANGUR_ACCENT_STYLES.slate.badge;

          if (isSelected && !showAnswer) {
            cardClassName = cn(
              KANGUR_ACCENT_STYLES.amber.activeCard,
              KANGUR_ACCENT_STYLES.amber.activeText
            );
            badgeClassName = KANGUR_ACCENT_STYLES.amber.badge;
          } else if (showAnswer && isChoiceCorrect) {
            cardClassName = cn(
              KANGUR_ACCENT_STYLES.emerald.activeCard,
              KANGUR_ACCENT_STYLES.emerald.activeText
            );
            badgeClassName = KANGUR_ACCENT_STYLES.emerald.badge;
          } else if (showAnswer && isSelected && !isChoiceCorrect) {
            cardClassName = cn(
              KANGUR_ACCENT_STYLES.rose.activeCard,
              KANGUR_ACCENT_STYLES.rose.activeText
            );
            badgeClassName = KANGUR_ACCENT_STYLES.rose.badge;
          }

          return (
            <button
              key={choice.label}
              type='button'
              onClick={(): void => {
                if (!showAnswer) onSelect(choice.label);
              }}
              disabled={showAnswer}
              data-testid={`kangur-test-question-choice-${index}`}
              className={cn(
                KANGUR_OPTION_CARD_CLASSNAME,
                'flex items-center gap-3 rounded-[24px] px-4 py-3 text-left text-sm font-semibold transition-all',
                cardClassName,
                showAnswer ? 'cursor-default' : 'cursor-pointer'
              )}
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
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {showAnswer && question.explanation ? (
        <div className='rounded-xl border border-indigo-100 bg-indigo-50 p-3'>
          <div className='mb-1 text-xs font-bold uppercase tracking-wide text-indigo-600'>
            Explanation
          </div>
          <p className='text-sm text-indigo-900'>{question.explanation}</p>
        </div>
      ) : null}

      {/* Result indicator */}
      {showAnswer && isAnswered ? (
        <div
          className={cn(
            'flex items-center gap-2 rounded-xl p-3 text-sm font-semibold',
            isCorrect
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-rose-50 text-rose-700'
          )}
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
        </div>
      ) : null}
    </div>
  );
}
