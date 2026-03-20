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
import type { KangurRewardBreakdownEntry } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

type ClickRound = {
  id: string;
  accent: KangurAccent;
  question: string;
  answer: string;
  options: string[];
};

const PRONOUN_ACCENTS: Record<string, KangurAccent> = {
  i: 'indigo',
  me: 'indigo',
  my: 'indigo',
  we: 'emerald',
  us: 'emerald',
  our: 'emerald',
  he: 'sky',
  him: 'sky',
  his: 'sky',
  she: 'rose',
  her: 'rose',
  hers: 'rose',
  they: 'teal',
  them: 'teal',
  their: 'teal',
  themselves: 'teal',
  himself: 'violet',
  herself: 'amber',
};

const ROUNDS: ClickRound[] = [
  {
    id: 'subject-pronoun',
    accent: 'emerald',
    question: 'Taylor posted: ___ just aced the test.',
    answer: 'they',
    options: ['he', 'she', 'they', 'we'],
  },
  {
    id: 'object-pronoun',
    accent: 'indigo',
    question: 'I met Mia and Jordan after school. I texted ___ later.',
    answer: 'them',
    options: ['they', 'them', 'their', 'we'],
  },
  {
    id: 'possessive-pronoun',
    accent: 'violet',
    question: 'That hoodie is ___, not mine.',
    answer: 'hers',
    options: ['her', 'hers', 'their', 'she'],
  },
  {
    id: 'reflexive-pronoun',
    accent: 'amber',
    question: 'The twins finished the project by ____.',
    answer: 'themselves',
    options: ['their', 'them', 'themselves', 'herself'],
  },
];

const TOTAL_ROUNDS = ROUNDS.length;

type FeedbackState = {
  kind: 'success' | 'error';
  text: string;
};

type EnglishPronounsGameProps = {
  finishLabel?: string;
  onFinish: () => void;
};

export default function EnglishPronounsGame({
  finishLabel,
  onFinish,
}: EnglishPronounsGameProps): React.JSX.Element {
  const translations = useTranslations('KangurMiniGames');
  const resolvedFinishLabel = finishLabel ?? getKangurMiniGameFinishLabel(translations, 'topics');
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
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
      ? translations('englishPronouns.feedback.correct')
      : translateKangurMiniGameWithFallback(
          translations,
          'englishPronouns.feedback.incorrect',
          'Correct answer: {answer}.',
          { answer: round.answer }
        );

    setScore(nextScore);
    setFeedback({ kind: isCorrect ? 'success' : 'error', text: feedbackText });

    scheduleKangurRoundFeedback(() => {
      if (roundIndex + 1 >= TOTAL_ROUNDS) {
        const progress = loadProgress();
        const reward = createLessonPracticeReward(progress, {
          activityKey: 'english_pronoun_remix',
          lessonKey: 'english_basics',
          correctAnswers: nextScore,
          totalQuestions: TOTAL_ROUNDS,
          strongThresholdPercent: 75,
        });
        addXp(reward.xp, reward.progressUpdates);
        void persistKangurSessionScore({
          operation: 'english_basics',
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
      <KangurPracticeGameSummary dataTestId='english-pronouns-summary-shell'>
        <KangurPracticeGameSummaryEmoji
          dataTestId='english-pronouns-summary-emoji'
          emoji={percent === 100 ? '🏆' : percent >= 60 ? '🌟' : '💪'}
        />
        <KangurPracticeGameSummaryTitle
          accent='emerald'
          title={
            <KangurHeadline data-testid='english-pronouns-summary-title'>
              {getKangurMiniGameScoreLabel(translations, score, TOTAL_ROUNDS)}
            </KangurHeadline>
          }
        />
        <KangurPracticeGameSummaryXP accent='emerald' xpEarned={xpEarned} />
        <KangurPracticeGameSummaryBreakdown
          breakdown={xpBreakdown}
          dataTestId='english-pronouns-summary-breakdown'
          itemDataTestIdPrefix='english-pronouns-summary-breakdown'
        />
        <KangurPracticeGameSummaryProgress accent='emerald' percent={percent} />
        <KangurPracticeGameSummaryMessage>
          {percent === 100
            ? translations('englishPronouns.summary.perfect')
            : percent >= 60
              ? translations('englishPronouns.summary.good')
              : translations('englishPronouns.summary.retry')}
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
    <KangurPracticeGameStage className='max-w-sm'>
      <KangurPracticeGameProgress
        accent={round.accent}
        currentRound={roundIndex}
        dataTestId='english-pronouns-progress-bar'
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
              'englishPronouns.inRound.roundLabel',
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
              'englishPronouns.inRound.modeLabel',
              'Click'
            )}
          </KangurStatusChip>
        </div>

        <div className={KANGUR_STACK_SPACED_CLASSNAME}>
          <div className='rounded-[20px] border border-slate-200/80 bg-white px-4 py-3 text-sm font-semibold text-slate-700'>
            {round.question}
          </div>
          <div className='grid grid-cols-1 gap-2 min-[420px]:grid-cols-2'>
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
          data-testid='english-pronouns-check'
        >
          {translateKangurMiniGameWithFallback(
            translations,
            'englishPronouns.inRound.check',
            'Check ✓'
          )}
        </KangurButton>
      </KangurGlassPanel>
    </KangurPracticeGameStage>
  );
}
