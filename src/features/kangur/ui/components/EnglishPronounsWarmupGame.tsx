'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';

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
  translateKangurMiniGameWithFallback,
} from '@/features/kangur/ui/constants/mini-game-i18n';
import {
  KangurButton,
  KangurGlassPanel,
  KangurHeadline,
  KangurInfoCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_STACK_SPACED_CLASSNAME,
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
  KangurMiniGameFeedback,
  KangurMiniGameFinishProps,
  KangurRewardBreakdownEntry,
} from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

import { EnglishPronounsPulseAnimation } from './EnglishPronounsAnimations';

type ClickRound = {
  id: string;
  accent: KangurAccent;
  prompt: string;
  question: string;
  answer: string;
  options: string[];
  hint: string;
};

const PRONOUN_ACCENTS: Record<string, KangurAccent> = {
  my: 'indigo',
  mine: 'indigo',
  our: 'emerald',
  ours: 'emerald',
  your: 'sky',
  yours: 'sky',
  their: 'teal',
};

const ROUNDS: ClickRound[] = [
  {
    id: 'warmup-graph',
    accent: 'sky',
    prompt: 'Wybierz poprawny zaimek dzierżawczy.',
    question: '___ graph shows the quadratic function.',
    answer: 'our',
    options: ['our', 'their', 'your', 'my'],
    hint: 'Mówimy o naszym wykresie — our + rzeczownik.',
  },
  {
    id: 'warmup-calculator',
    accent: 'teal',
    prompt: 'Wybierz poprawny zaimek dzierżawczy.',
    question: 'The red calculator is ___.',
    answer: 'mine',
    options: ['mine', 'my', 'ours', 'yours'],
    hint: 'Po "is" używamy zaimka dzierżawczego: mine.',
  },
  {
    id: 'warmup-solution',
    accent: 'indigo',
    prompt: 'Wybierz poprawny zaimek dzierżawczy.',
    question: 'You solved it, but ___ solution is different.',
    answer: 'your',
    options: ['your', 'yours', 'our', 'my'],
    hint: 'Przed rzeczownikiem używamy your.',
  },
];

const TOTAL_ROUNDS = ROUNDS.length;

export default function EnglishPronounsWarmupGame({
  finishLabel,
  onFinish,
}: KangurMiniGameFinishProps): React.JSX.Element {
  const translations = useTranslations('KangurMiniGames');
  const resolvedFinishLabel = finishLabel ?? getKangurMiniGameFinishLabel(translations, 'topics');
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState<KangurMiniGameFeedback | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const [selection, setSelection] = useState<string | null>(null);
  const sessionStartedAtRef = useRef(Date.now());

  const round = ROUNDS[roundIndex] ?? ROUNDS[0]!;

  useEffect(() => {
    setFeedback(null);
    setIsChecking(false);
    setSelection(null);
  }, [roundIndex]);

  const isReady = useMemo(() => Boolean(selection), [selection]);

  const handleCheck = (): void => {
    if (isChecking || !selection) return;
    setIsChecking(true);

    const isCorrect = selection === round.answer;
    const nextScore = isCorrect ? score + 1 : score;
    const feedbackText = isCorrect
      ? translations('englishPronounsWarmup.feedback.correct')
      : translateKangurMiniGameWithFallback(
          translations,
          'englishPronounsWarmup.feedback.incorrect',
          'Correct answer: {answer}.',
          { answer: round.answer }
        );

    setScore(nextScore);
    setFeedback({ kind: isCorrect ? 'success' : 'error', text: feedbackText });

    scheduleKangurRoundFeedback(() => {
      if (roundIndex + 1 >= TOTAL_ROUNDS) {
        const progress = loadProgress();
        const reward = createLessonPracticeReward(progress, {
          activityKey: 'english_pronouns_warmup',
          lessonKey: 'english_parts_of_speech',
          correctAnswers: nextScore,
          totalQuestions: TOTAL_ROUNDS,
          strongThresholdPercent: 75,
        });
        addXp(reward.xp, reward.progressUpdates);
        void persistKangurSessionScore({
          operation: 'english_parts_of_speech',
          score: nextScore,
          totalQuestions: TOTAL_ROUNDS,
          correctAnswers: nextScore,
          timeTakenSeconds: Math.round((Date.now() - sessionStartedAtRef.current) / 1000),
          xpEarned: reward.xp,
        });
        setXpEarned(reward.xp);
        setXpBreakdown(reward.breakdown ?? []);
        setDone(true);
      } else {
        setRoundIndex((current) => current + 1);
      }
      setIsChecking(false);
    });
  };

  const handleRestart = (): void => {
    setRoundIndex(0);
    setScore(0);
    setDone(false);
    setFeedback(null);
    setIsChecking(false);
    setSelection(null);
    setXpEarned(0);
    setXpBreakdown([]);
    sessionStartedAtRef.current = Date.now();
  };

  if (done) {
    const percent = Math.round((score / TOTAL_ROUNDS) * 100);
    return (
      <KangurPracticeGameSummary dataTestId='english-pronouns-warmup-summary-shell'>
        <KangurPracticeGameSummaryEmoji
          dataTestId='english-pronouns-warmup-summary-emoji'
          emoji={percent === 100 ? '🏆' : percent >= 70 ? '🌟' : '💪'}
        />
        <KangurPracticeGameSummaryTitle
          accent='sky'
          title={
            <KangurHeadline data-testid='english-pronouns-warmup-summary-title'>
              {getKangurMiniGameScoreLabel(translations, score, TOTAL_ROUNDS)}
            </KangurHeadline>
          }
        />
        <KangurPracticeGameSummaryXP accent='sky' xpEarned={xpEarned} />
        <KangurPracticeGameSummaryBreakdown
          breakdown={xpBreakdown}
          dataTestId='english-pronouns-warmup-summary-breakdown'
          itemDataTestIdPrefix='english-pronouns-warmup-summary-breakdown'
        />
        <KangurPracticeGameSummaryProgress accent='sky' percent={percent} />
        <KangurPracticeGameSummaryMessage>
          {percent === 100
            ? translations('englishPronounsWarmup.summary.perfect')
            : percent >= 70
              ? translations('englishPronounsWarmup.summary.good')
              : translations('englishPronounsWarmup.summary.retry')}
        </KangurPracticeGameSummaryMessage>
        <KangurPracticeGameSummaryActions
          finishLabel={resolvedFinishLabel}
          onFinish={onFinish}
          restartLabel={translations('shared.restart')}
          onRestart={handleRestart}
        />
      </KangurPracticeGameSummary>
    );
  }

  const feedbackAccent: KangurAccent = feedback?.kind === 'success' ? 'emerald' : 'rose';

  return (
    <KangurPracticeGameStage className='max-w-md'>
      <KangurPracticeGameProgress
        accent={round.accent}
        currentRound={roundIndex}
        dataTestId='english-pronouns-warmup-progress-bar'
        totalRounds={TOTAL_ROUNDS}
      />
      <KangurGlassPanel
        className={cn('w-full', KANGUR_PANEL_GAP_CLASSNAME)}
        padding='lg'
        surface='playField'
      >
        <div className='flex items-center justify-between gap-2'>
          <KangurStatusChip accent={round.accent} className='text-[10px] uppercase tracking-[0.16em]'>
            {translateKangurMiniGameWithFallback(
              translations,
              'englishPronounsWarmup.inRound.roundLabel',
              'Round {current}/{total}',
              {
                current: roundIndex + 1,
                total: TOTAL_ROUNDS,
              }
            )}
          </KangurStatusChip>
          <KangurStatusChip accent='slate' className='text-[10px] uppercase tracking-[0.16em]'>
            {translateKangurMiniGameWithFallback(
              translations,
              'englishPronounsWarmup.inRound.modeLabel',
              'Warm-up'
            )}
          </KangurStatusChip>
        </div>

        <div className='rounded-[24px] border border-white/70 bg-white/70 p-3'>
          <EnglishPronounsPulseAnimation />
        </div>

        <KangurInfoCard accent={round.accent} tone='accent' padding='sm' className='text-sm'>
          <p className='font-semibold'>
            {translateKangurMiniGameWithFallback(
              translations,
              `englishPronounsWarmup.inRound.rounds.${round.id}.prompt`,
              round.prompt
            )}
          </p>
          <p className='mt-1 text-xs [color:var(--kangur-page-muted-text)]'>
            {translateKangurMiniGameWithFallback(
              translations,
              `englishPronounsWarmup.inRound.rounds.${round.id}.hint`,
              round.hint
            )}
          </p>
        </KangurInfoCard>

        <div className={KANGUR_STACK_SPACED_CLASSNAME}>
          <div id='pronouns-warmup-question' className='rounded-[20px] border border-slate-200/80 bg-white px-4 py-3 text-sm font-semibold text-slate-700'>
            {round.question}
          </div>
          <div className='grid grid-cols-1 gap-2 min-[420px]:grid-cols-2' role='group' aria-labelledby='pronouns-warmup-question'>
            {round.options.map((option) => {
              const isSelected = selection === option;
              const accent = PRONOUN_ACCENTS[option] ?? round.accent;
              return (
                <button
                  key={option}
                  type='button'
                  className={cn(
                    'rounded-[20px] border px-3 py-2 text-base font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white',
                    KANGUR_ACCENT_STYLES[accent].badge,
                    KANGUR_ACCENT_STYLES[accent].hoverCard,
                    isSelected && 'ring-2 ring-emerald-400/70 ring-offset-1 ring-offset-transparent'
                  )}
                  aria-pressed={isSelected}
                  onClick={() => {
                    if (!isChecking) setSelection(option);
                  }}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        {feedback ? (
          <KangurInfoCard accent={feedbackAccent} tone='accent' padding='sm' className='text-sm'>
            {feedback.text}
          </KangurInfoCard>
        ) : null}

        <KangurButton
          type='button'
          size='lg'
          variant='primary'
          className='w-full'
          disabled={!isReady || isChecking}
          onClick={handleCheck}
          data-testid='english-pronouns-warmup-check'
        >
          {translateKangurMiniGameWithFallback(
            translations,
            'englishPronounsWarmup.inRound.check',
            'Check ✓'
          )}
        </KangurButton>
      </KangurGlassPanel>
    </KangurPracticeGameStage>
  );
}
