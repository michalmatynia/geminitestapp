'use client';

import { useKangurProgressOwnerKey } from '@/features/kangur/ui/hooks/useKangurProgressOwnerKey';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';

import KangurAnswerChoiceCard from '@/features/kangur/ui/components/KangurAnswerChoiceCard';
import {
  KangurPracticeGameProgress,
  KangurPracticeGameStage,
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
  getKangurMiniGameFinishLabel,
  getKangurMiniGameScoreLabel,
} from '@/features/kangur/ui/constants/mini-game-i18n';
import {
  KangurButton,
  KangurEquationDisplay,
  KangurGlassPanel,
  KangurInfoCard,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_PANEL_GAP_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import {
  addXp,
  createLessonPracticeReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { scheduleKangurRoundFeedback } from '@/features/kangur/ui/services/round-transition';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import type {
  KangurMiniGameFinishVariantProps,
  KangurRewardBreakdownEntry,
} from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

type DivisionQuotientQuestion = {
  type: 'quotient';
  a: number;
  b: number;
  correct: number;
  choices: number[];
  label: string;
};

type DivisionRemainderQuestion = {
  type: 'remainder';
  a: number;
  b: number;
  quotient: number;
  correct: number;
  remainder: number;
  choices: number[];
  label: string;
};

type DivisionQuestion = DivisionQuotientQuestion | DivisionRemainderQuestion;

type DivisionGameProps = KangurMiniGameFinishVariantProps;

const TOTAL = 7;

function generateQuestion(round: number): DivisionQuestion {
  const withRemainder = round >= 3;
  const divisor = Math.floor(Math.random() * 8) + 2;
  const quotient = Math.floor(Math.random() * 9) + 1;
  const remainder = withRemainder ? Math.floor(Math.random() * (divisor - 1)) : 0;
  const dividend = divisor * quotient + remainder;

  if (withRemainder) {
    const correct = remainder;
    const wrongs = new Set<number>();
    while (wrongs.size < 3) {
      const wrong = Math.floor(Math.random() * divisor);
      if (wrong !== correct) {
        wrongs.add(wrong);
      }
    }
    const choices = [...wrongs, correct].sort(() => Math.random() - 0.5);
    return {
      type: 'remainder',
      a: dividend,
      b: divisor,
      quotient,
      correct,
      remainder,
      choices,
      label: `${dividend} ÷ ${divisor} = ${quotient} reszta ?`,
    };
  }

  const correct = quotient;
  const wrongs = new Set<number>();
  while (wrongs.size < 3) {
    const wrong = correct + (Math.floor(Math.random() * 4) + 1) * (Math.random() < 0.5 ? 1 : -1);
    if (wrong > 0 && wrong !== correct) {
      wrongs.add(wrong);
    }
  }
  const choices = [...wrongs, correct].sort(() => Math.random() - 0.5);
  return {
    type: 'quotient',
    a: dividend,
    b: divisor,
    correct,
    choices,
    label: `${dividend} ÷ ${divisor} = ?`,
  };
}

function ShareVisual({
  a,
  b,
  quotient,
}: {
  a: number;
  b: number;
  quotient: number;
}): React.JSX.Element | null {
  if (a > 20 || b > 6) {
    return null;
  }

  const emojis = ['🍪', '🍎', '🍬', '🌟', '⚽'];
  const emoji = emojis[b % emojis.length] ?? '🍪';
  const groups = Array.from({ length: b }, (_, groupIndex) =>
    Array.from({ length: quotient }, (_, itemIndex) => ({ groupIndex, itemIndex }))
  );

  return (
    <div
      className='flex max-w-full flex-wrap justify-center gap-2 sm:max-w-xs'
      data-testid='division-share-visual'
    >
      {groups.map((group, groupIndex) => (
        <KangurInfoCard
          accent='sky'
          className='flex min-w-[56px] flex-col items-center gap-0.5 rounded-[22px] sm:min-w-[72px]'
          data-testid={`division-share-group-${groupIndex}`}
          key={groupIndex}
          padding='sm'
          tone='accent'
        >
          <p className='text-xs font-bold text-sky-500'>{groupIndex + 1}</p>
          <div className='flex max-w-[52px] flex-wrap justify-center gap-0.5 sm:max-w-[60px]'>
            {group.map((_, itemIndex) => (
              <span key={itemIndex} className='text-lg'>
                {emoji}
              </span>
            ))}
          </div>
        </KangurInfoCard>
      ))}
    </div>
  );
}

export default function DivisionGame({
  finishLabelVariant = 'lesson',
  onFinish,
}: DivisionGameProps): React.JSX.Element {
  const ownerKey = useKangurProgressOwnerKey();
  const translations = useTranslations('KangurMiniGames');
  const isCoarsePointer = useKangurCoarsePointer();
  const finishLabel = getKangurMiniGameFinishLabel(
    translations,
    finishLabelVariant === 'play' ? 'play' : 'lesson'
  );
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const [question, setQuestion] = useState<DivisionQuestion>(() => generateQuestion(0));
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const sessionStartedAtRef = useRef(Date.now());

  const handleFinishGame = (): void => {
    onFinish();
  };

  const handleSelect = (choice: number): void => {
    if (confirmed) {
      return;
    }
    setSelected(choice);
  };

  const handleConfirm = (): void => {
    if (selected === null || confirmed) {
      return;
    }
    setConfirmed(true);
    const isCorrect = selected === question.correct;
    const newScore = isCorrect ? score + 1 : score;

    scheduleKangurRoundFeedback(() => {
      if (roundIndex + 1 >= TOTAL) {
        const progress = loadProgress({ ownerKey });
        const reward = createLessonPracticeReward(progress, 'division', newScore, TOTAL);
        addXp(reward.xp, reward.progressUpdates, { ownerKey });
        void persistKangurSessionScore({
          operation: 'division',
          score: newScore,
          totalQuestions: TOTAL,
          correctAnswers: newScore,
          timeTakenSeconds: Math.round((Date.now() - sessionStartedAtRef.current) / 1000),
          xpEarned: reward.xp,
        });
        setXpEarned(reward.xp);
        setXpBreakdown(reward.breakdown ?? []);
        setScore(newScore);
        setDone(true);
      } else {
        setScore(newScore);
        setRoundIndex((current) => current + 1);
        setQuestion(generateQuestion(roundIndex + 1));
        setSelected(null);
        setConfirmed(false);
      }
    });
  };

  if (done) {
    const percent = Math.round((score / TOTAL) * 100);
    return (
      <KangurPracticeGameSummary dataTestId='division-game-summary-shell'>
        <KangurPracticeGameSummaryEmoji
          dataTestId='division-game-summary-emoji'
          emoji={percent === 100 ? '🏆' : percent >= 60 ? '🌟' : '💪'}
        />
        <KangurPracticeGameSummaryTitle
          dataTestId='division-game-summary-title'
          title={getKangurMiniGameScoreLabel(translations, score, TOTAL)}
        />
        <KangurPracticeGameSummaryXP accent='indigo' xpEarned={xpEarned} />
        <KangurPracticeGameSummaryBreakdown
          breakdown={xpBreakdown}
          dataTestId='division-game-summary-breakdown'
          itemDataTestIdPrefix='division-game-summary-breakdown'
        />
        <KangurPracticeGameSummaryProgress accent='teal' percent={percent} />
        <KangurPracticeGameSummaryMessage>
          {percent === 100
            ? translations('division.summary.perfect')
            : percent >= 60
              ? translations('division.summary.good')
              : translations('division.summary.retry')}
        </KangurPracticeGameSummaryMessage>
        <KangurPracticeGameSummaryActions
          finishLabel={finishLabel}
          onFinish={handleFinishGame}
          restartLabel={translations('shared.restart')}
          onRestart={() => {
            setRoundIndex(0);
            setScore(0);
            setDone(false);
            setXpEarned(0);
            setXpBreakdown([]);
            setQuestion(generateQuestion(0));
            setSelected(null);
            setConfirmed(false);
            sessionStartedAtRef.current = Date.now();
          }}
        />
      </KangurPracticeGameSummary>
    );
  }

  return (
    <KangurPracticeGameStage>
      <KangurPracticeGameProgress
        accent='teal'
        currentRound={roundIndex}
        dataTestId='division-game-progress-bar'
        totalRounds={TOTAL}
      />

      <div className='w-full'>
        <KangurGlassPanel
          className={cn('flex flex-col items-center', KANGUR_PANEL_GAP_CLASSNAME)}
          data-testid='division-game-round-shell'
          padding='xl'
          surface='solid'
          variant='soft'
        >
          <p className='text-xs font-bold text-blue-400 uppercase tracking-wide'>
            {question.type === 'remainder' ? 'Jaka jest reszta?' : 'Ile wynosi iloraz?'}
          </p>
          <KangurEquationDisplay accent='sky' data-testid='division-game-equation'>
            {question.label}
          </KangurEquationDisplay>

          {question.type === 'quotient' && (
            <ShareVisual a={question.a} b={question.b} quotient={question.correct} />
          )}

          {question.type === 'remainder' && (
            <KangurInfoCard
              accent='teal'
              className='w-full rounded-[24px] text-center text-sm'
              padding='sm'
              tone='accent'
            >
              <p>
                {question.a} = {question.b} × {question.quotient} +{' '}
                <span className='font-extrabold text-lg'>?</span>
              </p>
              <p className='mt-1 text-xs [color:var(--kangur-page-muted-text)]'>
                Ile zostaje po podzieleniu?
              </p>
            </KangurInfoCard>
          )}

          {isCoarsePointer ? (
            <p
              data-testid='division-game-touch-hint'
              className='text-center text-xs font-semibold uppercase tracking-[0.16em] [color:var(--kangur-page-muted-text)]'
            >
              {translations('division.inRound.touchHint')}
            </p>
          ) : null}

          <div className='grid w-full grid-cols-1 gap-2 sm:grid-cols-2'>
            {question.choices.map((choice, index) => {
              let accent: KangurAccent = 'sky';
              let emphasis: 'neutral' | 'accent' = 'neutral';
              let state: 'default' | 'muted' = 'default';
              let className = '[color:var(--kangur-page-text)]';
              if (confirmed) {
                if (choice === question.correct) {
                  accent = 'emerald';
                  emphasis = 'accent';
                  className = KANGUR_ACCENT_STYLES.emerald.activeText;
                } else if (choice === selected) {
                  accent = 'rose';
                  emphasis = 'accent';
                  className = KANGUR_ACCENT_STYLES.rose.activeText;
                } else {
                  accent = 'slate';
                  state = 'muted';
                  className = '';
                }
              } else if (choice === selected) {
                accent = 'amber';
                emphasis = 'accent';
                className = KANGUR_ACCENT_STYLES.amber.activeText;
              }

              return (
                <KangurAnswerChoiceCard
                  accent={accent}
                  buttonClassName={cn(
                    'flex items-center justify-center px-4 py-3 text-center text-lg font-extrabold touch-manipulation select-none sm:text-xl',
                    isCoarsePointer && 'min-h-[4.25rem] active:scale-[0.98]',
                    className,
                    confirmed ? 'cursor-default' : 'cursor-pointer'
                  )}
                  data-testid={`division-game-choice-${index}`}
                  emphasis={emphasis}
                  hoverScale={1.04}
                  interactive={!confirmed}
                  key={index}
                  onClick={() => handleSelect(choice)}
                  state={state}
                  tapScale={0.96}
                  type='button'
                >
                  {choice}
                </KangurAnswerChoiceCard>
              );
            })}
          </div>

          <div role='status' aria-live='polite' aria-atomic='true' className='sr-only'>
            {confirmed
              ? selected === question.correct
                ? 'Dobrze! Poprawna odpowiedź.'
                : `Niepoprawnie. Poprawna odpowiedź: ${question.correct}.`
              : ''}
          </div>

          <KangurButton
            className={cn(
              'w-full',
              confirmed
                ? selected === question.correct
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'bg-rose-500 border-rose-500 text-white'
                : '[background:var(--kangur-soft-card-background)] [border-color:var(--kangur-soft-card-border)] [color:var(--kangur-page-text)]'
            )}
            disabled={selected === null || confirmed}
            onClick={handleConfirm}
            size='lg'
            type='button'
            variant='primary'
          >
            Sprawdź ✓
          </KangurButton>
        </KangurGlassPanel>
      </div>
    </KangurPracticeGameStage>
  );
}
