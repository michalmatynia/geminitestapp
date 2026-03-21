'use client';

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
  KangurHeadline,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_PANEL_GAP_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
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

type MultiplicationResultQuestion = {
  type: 'result';
  a: number;
  b: number;
  correct: number;
  choices: number[];
};

type MultiplicationBlankQuestion = {
  type: 'blank';
  a: number;
  b: number;
  correct: number;
  product: number;
  shown: number;
  missingA: boolean;
  choices: number[];
};

type MultiplicationQuestion = MultiplicationResultQuestion | MultiplicationBlankQuestion;

type MultiplicationGameProps = KangurMiniGameFinishVariantProps;

const TOTAL = 8;

function generateQuestion(round: number): MultiplicationQuestion {
  const useBlank = round % 2 === 1;
  const a = Math.floor(Math.random() * 9) + 2;
  const b = Math.floor(Math.random() * 9) + 2;
  const correct = a * b;

  if (useBlank) {
    const missingA = Math.random() < 0.5;
    const shown = missingA ? b : a;
    const missing = missingA ? a : b;
    const wrongs = new Set<number>();
    while (wrongs.size < 3) {
      const wrong = missing + (Math.floor(Math.random() * 4) + 1) * (Math.random() < 0.5 ? 1 : -1);
      if (wrong > 0 && wrong !== missing && wrong <= 12) {
        wrongs.add(wrong);
      }
    }
    if (wrongs.size < 3) {
      wrongs.add(missing + 1);
      wrongs.add(missing + 2);
    }
    const choices = [...wrongs, missing].sort(() => Math.random() - 0.5);
    return { type: 'blank', a, b, correct: missing, product: correct, shown, missingA, choices };
  }

  const wrongs = new Set<number>();
  while (wrongs.size < 3) {
    const wrong = correct + (Math.floor(Math.random() * 6) + 1) * (Math.random() < 0.5 ? 1 : -1);
    if (wrong > 0 && wrong !== correct) {
      wrongs.add(wrong);
    }
  }
  const choices = [...wrongs, correct].sort(() => Math.random() - 0.5);
  return { type: 'result', a, b, correct, choices };
}

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

export default function MultiplicationGame({
  finishLabelVariant = 'lesson',
  onFinish,
}: MultiplicationGameProps): React.JSX.Element {
  const translations = useTranslations('KangurMiniGames');
  const finishLabel = getKangurMiniGameFinishLabel(
    translations,
    finishLabelVariant === 'play' ? 'play' : 'lesson'
  );
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const handleFinishGame = (): void => {
    onFinish();
  };
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const [question, setQuestion] = useState<MultiplicationQuestion>(() => generateQuestion(0));
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const sessionStartedAtRef = useRef(Date.now());

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
        const progress = loadProgress();
        const reward = createLessonPracticeReward(progress, 'multiplication', newScore, TOTAL);
        addXp(reward.xp, reward.progressUpdates);
        void persistKangurSessionScore({
          operation: 'multiplication',
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
      <KangurPracticeGameSummary dataTestId='multiplication-game-summary-shell'>
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
          {percent === 100
            ? translations('multiplication.summary.perfect')
            : percent >= 60
              ? translations('multiplication.summary.good')
              : translations('multiplication.summary.retry')}
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
        accent='indigo'
        currentRound={roundIndex}
        dataTestId='multiplication-game-progress-bar'
        totalRounds={TOTAL}
      />
      <div className='w-full'>
        <KangurGlassPanel
          className={cn('flex flex-col items-center', KANGUR_PANEL_GAP_CLASSNAME)}
          data-testid='multiplication-game-round-shell'
          padding='xl'
          surface='solid'
          variant='soft'
        >
          {question.type === 'result' ? (
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
          ) : (
            <>
              <p className='text-xs font-bold text-purple-400 uppercase tracking-wide'>
                Znajdź brakujący czynnik
              </p>
              <KangurEquationDisplay accent='violet' data-testid='multiplication-game-equation'>
                {question.missingA ? (
                  <>
                    <span className='[color:var(--kangur-page-muted-text)]'>?</span> ×{' '}
                    {question.shown}
                  </>
                ) : (
                  <>
                    {question.shown} ×{' '}
                    <span className='[color:var(--kangur-page-muted-text)]'>?</span>
                  </>
                )}
                {' = '}
                {question.product}
              </KangurEquationDisplay>
            </>
          )}

          <div className='grid w-full grid-cols-1 gap-2 sm:grid-cols-2'>
            {question.choices.map((choice, index) => {
              let accent: KangurAccent = 'violet';
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
                    'flex items-center justify-center px-4 py-3 text-center text-lg font-extrabold sm:text-xl',
                    className,
                    confirmed ? 'cursor-default' : 'cursor-pointer'
                  )}
                  data-testid={`multiplication-game-choice-${index}`}
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
            variant='primary'
          >
            Sprawdź ✓
          </KangurButton>
        </KangurGlassPanel>
      </div>
    </KangurPracticeGameStage>
  );
}
