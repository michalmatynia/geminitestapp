'use client';

import { type useTranslations } from 'next-intl';
import React from 'react';

import KangurAnswerChoiceCard from '@/features/kangur/ui/components/KangurAnswerChoiceCard';
import {
  KangurPracticeGameProgress,
  KangurPracticeGameShell,
  KangurPracticeGameSummary,
  KangurPracticeGameSummaryActions,
  KangurPracticeGameSummaryBreakdown,
  KangurPracticeGameSummaryEmoji,
  KangurPracticeGameSummaryMessage,
  KangurPracticeGameSummaryProgress,
  KangurPracticeGameSummaryTitle,
  KangurPracticeGameSummaryXP,
} from '@/features/kangur/ui/components/KangurPracticeGameChrome';
import {
  getKangurMiniGameScoreLabel,
  translateKangurMiniGameWithFallback,
} from '@/features/kangur/ui/constants/mini-game-i18n';
import {
  KangurButton,
  KangurEquationDisplay,
  KangurGlassPanel,
  KangurHeadline,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_PANEL_GAP_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import type {
  KangurMiniGameFinishVariantProps,
} from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';
import { MultiplicationGameProvider, useMultiplicationGameContext } from './MultiplicationGame.context';

type MultiplicationGameProps = KangurMiniGameFinishVariantProps;

function MultiplyGrid({ a, b }: { a: number; b: number }): React.JSX.Element | null {
  if (a > 8 || b > 8) {
    return null;
  }

  const colors = ['bg-purple-400', 'bg-indigo-400', 'bg-pink-400', 'bg-violet-400'];
  return (
    <div className='flex flex-col gap-0.5'>
      {Array.from({ length: Math.min(b, 8) }).map((_, row) => (
        <div key={row} className='flex gap-0.5'>
          {Array.from({ length: Math.min(a, 8) }).map((_, col) => (
            <div
              key={col}
              className={`w-5 h-5 rounded-full ${colors[row % colors.length]} opacity-80`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

type MultiplicationChoicePresentation = {
  accent: KangurAccent;
  className: string;
  emphasis: 'neutral' | 'accent';
  state: 'default' | 'muted';
};

const resolveMultiplicationChoicePresentation = ({
  choice,
  confirmed,
  correct,
  selected,
}: {
  choice: number;
  confirmed: boolean;
  correct: number;
  selected: number | null;
}): MultiplicationChoicePresentation => {
  if (confirmed) {
    if (choice === correct) {
      return {
        accent: 'emerald',
        className: KANGUR_ACCENT_STYLES.emerald.activeText,
        emphasis: 'accent',
        state: 'default',
      };
    }

    if (choice === selected) {
      return {
        accent: 'rose',
        className: KANGUR_ACCENT_STYLES.rose.activeText,
        emphasis: 'accent',
        state: 'default',
      };
    }

    return {
      accent: 'slate',
      className: '',
      emphasis: 'neutral',
      state: 'muted',
    };
  }

  if (choice === selected) {
    return {
      accent: 'amber',
      className: KANGUR_ACCENT_STYLES.amber.activeText,
      emphasis: 'accent',
      state: 'default',
    };
  }

  return {
    accent: 'violet',
    className: '[color:var(--kangur-page-text)]',
    emphasis: 'neutral',
    state: 'default',
  };
};

const resolveMultiplicationSummaryMessage = ({
  percent,
  translations,
}: {
  percent: number;
  translations: ReturnType<typeof useTranslations>;
}): string => {
  if (percent === 100) {
    return translations('multiplication.summary.perfect');
  }

  if (percent >= 60) {
    return translations('multiplication.summary.good');
  }

  return translations('multiplication.summary.retry');
};

const resolveMultiplicationCheckButtonClassName = ({
  confirmed,
  correct,
  selected,
}: {
  confirmed: boolean;
  correct: number;
  selected: number | null;
}): string =>
  cn(
    'w-full',
    confirmed
      ? selected === correct
        ? 'bg-emerald-500 border-emerald-500 text-white'
        : 'bg-rose-500 border-rose-500 text-white'
      : '[background:var(--kangur-soft-card-background)] [border-color:var(--kangur-soft-card-border)] [color:var(--kangur-page-text)]'
  );

function MultiplicationGameSummaryView(): React.JSX.Element {
  const { state, actions } = useMultiplicationGameContext();
  const {
    score,
    xpEarned,
    xpBreakdown,
    translations,
    finishLabel,
    TOTAL,
  } = state;
  const { onFinish, resetSession: onRestart } = actions;
  const percent = Math.round((score / TOTAL) * 100);

  return (
    <KangurPracticeGameSummary
      dataTestId='multiplication-game-summary-shell'
      wrapperClassName='w-full max-w-3xl'
    >
      <KangurPracticeGameSummaryEmoji
        dataTestId='multiplication-game-summary-emoji'
        emoji={percent === 100 ? '🏆' : percent >= 60 ? '🌟' : '💪'}
      />
      <KangurPracticeGameSummaryTitle
        accent='indigo'
        title={
          <KangurHeadline data-testid='multiplication-game-summary-title'>
            {getKangurMiniGameScoreLabel(translations, score, TOTAL)}
          </KangurHeadline>
        }
      />
      <KangurPracticeGameSummaryXP accent='indigo' xpEarned={xpEarned} />
      <KangurPracticeGameSummaryBreakdown
        breakdown={xpBreakdown}
        dataTestId='multiplication-game-summary-breakdown'
        itemDataTestIdPrefix='multiplication-game-summary-breakdown'
      />
      <KangurPracticeGameSummaryProgress accent='indigo' percent={percent} />
      <KangurPracticeGameSummaryMessage>
        {resolveMultiplicationSummaryMessage({ percent, translations })}
      </KangurPracticeGameSummaryMessage>
      <KangurPracticeGameSummaryActions
        finishLabel={finishLabel}
        onFinish={onFinish}
        restartLabel={translations('shared.restart')}
        onRestart={onRestart}
      />
    </KangurPracticeGameSummary>
  );
}

function MultiplicationGameQuestionPanel(): React.JSX.Element {
  const { state } = useMultiplicationGameContext();
  const { question } = state;

  if (question.type === 'result') {
    return (
      <>
        <p className='text-xs font-bold text-purple-400 uppercase tracking-wide'>
          Ile wynosi iloczyn?
        </p>
        <KangurEquationDisplay accent='violet' data-testid='multiplication-game-equation'>
          {question.a} × {question.b} ={' '}
          <span className='[color:var(--kangur-page-muted-text)]'>?</span>
        </KangurEquationDisplay>
        <MultiplyGrid a={question.a} b={question.b} />
      </>
    );
  }

  return (
    <>
      <p className='text-xs font-bold text-purple-400 uppercase tracking-wide'>
        Znajdź brakujący czynnik
      </p>
      <KangurEquationDisplay accent='violet' data-testid='multiplication-game-equation'>
        {question.missingA ? (
          <>
            <span className='[color:var(--kangur-page-muted-text)]'>?</span> × {question.shown}
          </>
        ) : (
          <>
            {question.shown} × <span className='[color:var(--kangur-page-muted-text)]'>?</span>
          </>
        )}
        {' = '}
        {question.product}
      </KangurEquationDisplay>
    </>
  );
}

function MultiplicationGameChoicesGrid(): React.JSX.Element {
  const { state, actions } = useMultiplicationGameContext();
  const { confirmed, isCoarsePointer, question, selected } = state;
  const { handleSelect: onSelect } = actions;

  return (
    <div className='grid w-full grid-cols-1 gap-2 sm:grid-cols-2'>
      {question.choices.map((choice, index) => {
        const presentation = resolveMultiplicationChoicePresentation({
          choice,
          confirmed,
          correct: question.correct,
          selected,
        });

        return (
          <KangurAnswerChoiceCard
            accent={presentation.accent}
            buttonClassName={cn(
              'flex items-center justify-center px-4 py-3 text-center text-lg font-extrabold touch-manipulation select-none sm:text-xl',
              isCoarsePointer && 'min-h-[4.25rem] active:scale-[0.98]',
              presentation.className,
              confirmed ? 'cursor-default' : 'cursor-pointer'
            )}
            data-testid={`multiplication-game-choice-${index}`}
            emphasis={presentation.emphasis}
            hoverScale={1.04}
            interactive={!confirmed}
            key={index}
            onClick={() => onSelect(choice)}
            state={presentation.state}
            tapScale={0.96}
            type='button'
          >
            {choice}
          </KangurAnswerChoiceCard>
        );
      })}
    </div>
  );
}

function MultiplicationGameRoundView(): React.JSX.Element {
  const { state, actions } = useMultiplicationGameContext();
  const {
    confirmed,
    isCoarsePointer,
    question,
    roundIndex,
    selected,
    translations,
    TOTAL,
  } = state;
  const { handleConfirm: onConfirm } = actions;

  return (
    <KangurPracticeGameShell
      className='w-full max-w-4xl'
      data-testid='multiplication-game-shell'
    >
      <KangurPracticeGameProgress
        accent='indigo'
        currentRound={roundIndex}
        dataTestId='multiplication-game-progress-bar'
        totalRounds={TOTAL}
      />
      <div className='w-full'>
        <KangurGlassPanel
          className={cn('flex w-full flex-col', KANGUR_PANEL_GAP_CLASSNAME)}
          data-testid='multiplication-game-round-shell'
          padding='xl'
          surface='solid'
          variant='soft'
        >
          <div className='grid w-full gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.95fr)] lg:items-start'>
            <div className='flex min-w-0 flex-col items-center gap-4 text-center lg:items-start lg:text-left'>
              <MultiplicationGameQuestionPanel />

              {isCoarsePointer ? (
                <p
                  data-testid='multiplication-game-touch-hint'
                  className='text-center text-xs font-semibold uppercase tracking-[0.16em] [color:var(--kangur-page-muted-text)] lg:text-left'
                >
                  {translateKangurMiniGameWithFallback(
                    translations,
                    'multiplication.inRound.touchHint',
                    'Tap an answer, then tap Check.'
                  )}
                </p>
              ) : null}
            </div>

            <div className='flex min-w-0 flex-col gap-4'>
              <MultiplicationGameChoicesGrid />

              <KangurButton
                className={resolveMultiplicationCheckButtonClassName({
                  confirmed,
                  correct: question.correct,
                  selected,
                })}
                disabled={selected === null || confirmed}
                onClick={onConfirm}
                size='lg'
                variant='primary'
                data-testid='multiplication-game-check'
              >
                Sprawdź ✓
              </KangurButton>
            </div>
          </div>

        </KangurGlassPanel>
      </div>
    </KangurPracticeGameShell>
  );
}

function MultiplicationGameContent(): React.JSX.Element {
  const { state } = useMultiplicationGameContext();
  const { done } = state;

  if (done) {
    return <MultiplicationGameSummaryView />;
  }

  return <MultiplicationGameRoundView />;
}

export default function MultiplicationGame(props: MultiplicationGameProps): React.JSX.Element {
  return (
    <MultiplicationGameProvider {...props}>
      <MultiplicationGameContent />
    </MultiplicationGameProvider>
  );
}
