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
  KangurGlassPanel,
  KangurHeadline,
  KangurInfoCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { KangurCheckButton } from '@/features/kangur/ui/components/KangurCheckButton';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_STACK_SPACED_CLASSNAME,
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
  KangurIntlTranslate,
  KangurMiniGameFeedbackState,
  KangurMiniGameFinishProps,
  KangurRewardBreakdownEntry,
} from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

import {
  EnglishPrepositionsPlaceAnimation,
  EnglishPrepositionsRelationsDiagram,
  EnglishPrepositionsTimeAnimation,
  EnglishPrepositionsTimelineAnimation,
} from './LessonAnimations';

type ClickRound = {
  id: string;
  accent: KangurAccent;
  prompt: string;
  question: string;
  answer: string;
  options: string[];
  hint: string;
  visual: 'time' | 'timeline' | 'place' | 'relation';
};

const ROUNDS: ClickRound[] = [
  {
    id: 'time-at',
    accent: 'rose',
    prompt: 'Choose the time preposition.',
    question: 'We meet ___ 7:30.',
    answer: 'at',
    options: ['at', 'on', 'in'],
    hint: 'Exact time -> at.',
    visual: 'timeline',
  },
  {
    id: 'time-on',
    accent: 'rose',
    prompt: 'Choose the time preposition.',
    question: 'Our test is ___ Tuesday.',
    answer: 'on',
    options: ['on', 'in', 'at'],
    hint: 'Day of the week -> on.',
    visual: 'time',
  },
  {
    id: 'time-in',
    accent: 'rose',
    prompt: 'Choose the time preposition.',
    question: 'She practices ___ July.',
    answer: 'in',
    options: ['in', 'on', 'at'],
    hint: 'Month -> in.',
    visual: 'time',
  },
  {
    id: 'time-before',
    accent: 'rose',
    prompt: 'Choose the time preposition.',
    question: 'Finish the homework ___ class.',
    answer: 'before',
    options: ['before', 'after', 'during'],
    hint: 'Before class -> before.',
    visual: 'time',
  },
  {
    id: 'place-on',
    accent: 'amber',
    prompt: 'Choose the place preposition.',
    question: 'The notes are ___ the board.',
    answer: 'on',
    options: ['on', 'in', 'at'],
    hint: 'Surface -> on.',
    visual: 'place',
  },
  {
    id: 'place-at',
    accent: 'amber',
    prompt: 'Choose the place preposition.',
    question: 'We wait ___ the bus stop.',
    answer: 'at',
    options: ['at', 'on', 'in'],
    hint: 'Point or meeting place -> at.',
    visual: 'place',
  },
  {
    id: 'relation-between',
    accent: 'violet',
    prompt: 'Choose the relation preposition.',
    question: 'Point P is ___ A and B.',
    answer: 'between',
    options: ['between', 'behind', 'above'],
    hint: 'P lies in the space separating A and B.',
    visual: 'relation',
  },
  {
    id: 'relation-above',
    accent: 'violet',
    prompt: 'Choose the relation preposition.',
    question: 'The lamp is ___ the table.',
    answer: 'above',
    options: ['above', 'below', 'between'],
    hint: 'The lamp is higher than the table.',
    visual: 'relation',
  },
  {
    id: 'relation-below',
    accent: 'violet',
    prompt: 'Choose the relation preposition.',
    question: 'The box is ___ the desk.',
    answer: 'below',
    options: ['below', 'above', 'between'],
    hint: 'The box is lower than the desk.',
    visual: 'relation',
  },
];

const TOTAL_ROUNDS = ROUNDS.length;

const getPrepositionsRoundMessage = (
  translate: KangurIntlTranslate,
  roundId: string,
  field: 'prompt' | 'hint',
  fallback: string
): string =>
  translateKangurMiniGameWithFallback(
    translate,
    `englishPrepositions.inRound.click.rounds.${roundId}.${field}`,
    fallback
  );

const renderRoundVisual = (visual: ClickRound['visual']): React.JSX.Element => {
  if (visual === 'timeline') {
    return <EnglishPrepositionsTimelineAnimation />;
  }
  if (visual === 'place') {
    return <EnglishPrepositionsPlaceAnimation />;
  }
  if (visual === 'relation') {
    return <EnglishPrepositionsRelationsDiagram />;
  }
  return <EnglishPrepositionsTimeAnimation />;
};

export default function EnglishPrepositionsGame({
  finishLabel,
  onFinish,
}: KangurMiniGameFinishProps): React.JSX.Element {
  const translations = useTranslations('KangurMiniGames');
  const isCoarsePointer = useKangurCoarsePointer();
  const resolvedFinishLabel = finishLabel ?? getKangurMiniGameFinishLabel(translations, 'topics');
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState<KangurMiniGameFeedbackState>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const [selection, setSelection] = useState<string | null>(null);
  const sessionStartedAtRef = useRef(Date.now());

  const round = ROUNDS[roundIndex] ?? ROUNDS[0]!;
  const roundPrompt = getPrepositionsRoundMessage(translations, round.id, 'prompt', round.prompt);
  const roundHint = getPrepositionsRoundMessage(translations, round.id, 'hint', round.hint);
  const roundLabel = translateKangurMiniGameWithFallback(
    translations,
    'englishPrepositions.inRound.roundLabel',
    `Round ${roundIndex + 1}/${TOTAL_ROUNDS}`,
    { current: roundIndex + 1, total: TOTAL_ROUNDS }
  );
  const modeLabel = translateKangurMiniGameWithFallback(
    translations,
    isCoarsePointer
      ? 'englishPrepositions.inRound.click.modeLabelTouch'
      : 'englishPrepositions.inRound.click.topicLabel',
    isCoarsePointer ? 'Tap' : 'Prepositions'
  );

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
      ? translations('englishPrepositions.feedback.correct')
      : translateKangurMiniGameWithFallback(
          translations,
          'englishPrepositions.feedback.incorrect',
          `Correct answer: ${round.answer}.`,
          { answer: round.answer }
        );

    setScore(nextScore);
    setFeedback({ kind: isCorrect ? 'success' : 'error', text: feedbackText });

    scheduleKangurRoundFeedback(() => {
      if (roundIndex + 1 >= TOTAL_ROUNDS) {
        const progress = loadProgress();
        const reward = createLessonPracticeReward(progress, {
          activityKey: 'english_prepositions_quiz',
          lessonKey: 'english_prepositions_time_place',
          correctAnswers: nextScore,
          totalQuestions: TOTAL_ROUNDS,
          strongThresholdPercent: 75,
        });
        addXp(reward.xp, reward.progressUpdates);
        void persistKangurSessionScore({
          operation: 'english_prepositions_time_place',
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
      <KangurPracticeGameSummary dataTestId='english-prepositions-summary-shell'>
        <KangurPracticeGameSummaryEmoji
          dataTestId='english-prepositions-summary-emoji'
          emoji={percent === 100 ? '🏆' : percent >= 70 ? '🌟' : '💪'}
        />
        <KangurPracticeGameSummaryTitle
          accent='rose'
          title={
            <KangurHeadline data-testid='english-prepositions-summary-title'>
              {getKangurMiniGameScoreLabel(translations, score, TOTAL_ROUNDS)}
            </KangurHeadline>
          }
        />
        <KangurPracticeGameSummaryXP accent='rose' xpEarned={xpEarned} />
        <KangurPracticeGameSummaryBreakdown
          breakdown={xpBreakdown}
          dataTestId='english-prepositions-summary-breakdown'
          itemDataTestIdPrefix='english-prepositions-summary-breakdown'
        />
        <KangurPracticeGameSummaryProgress accent='rose' percent={percent} />
        <KangurPracticeGameSummaryMessage>
          {percent === 100
            ? translations('englishPrepositions.summary.perfect')
            : percent >= 70
              ? translations('englishPrepositions.summary.good')
              : translations('englishPrepositions.summary.retry')}
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
        dataTestId='english-prepositions-progress-bar'
        totalRounds={TOTAL_ROUNDS}
      />
      <KangurGlassPanel
        className={cn('w-full', KANGUR_PANEL_GAP_CLASSNAME)}
        padding='lg'
        surface='playField'
      >
        <div className='flex items-center justify-between gap-2'>
          <KangurStatusChip accent={round.accent} className='text-[10px] uppercase tracking-[0.16em]'>
            {roundLabel}
          </KangurStatusChip>
          <KangurStatusChip accent='slate' className='text-[10px] uppercase tracking-[0.16em]'>
            {modeLabel}
          </KangurStatusChip>
        </div>

        <div className='rounded-[24px] border border-white/70 bg-white/70 p-3'>
          {renderRoundVisual(round.visual)}
        </div>

        <KangurInfoCard accent={round.accent} tone='accent' padding='sm' className='text-sm'>
          <p className='font-semibold'>{roundPrompt}</p>
          <p className='mt-1 text-xs [color:var(--kangur-page-muted-text)]'>{roundHint}</p>
        </KangurInfoCard>

        <div className={KANGUR_STACK_SPACED_CLASSNAME}>
          <div className='rounded-[20px] border border-slate-200/80 bg-white px-4 py-3 text-sm font-semibold text-slate-700'>
            {round.question}
          </div>
          <div className='grid grid-cols-1 gap-2 min-[420px]:grid-cols-2'>
            {round.options.map((option) => {
              const isSelected = selection === option;
              return (
                <button
                  key={option}
                  type='button'
                  className={cn(
                    'rounded-[20px] border px-3 py-2 text-base font-semibold transition touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white',
                    isCoarsePointer && 'min-h-[4.25rem] active:scale-[0.98]',
                    KANGUR_ACCENT_STYLES[round.accent].badge,
                    KANGUR_ACCENT_STYLES[round.accent].hoverCard,
                    isSelected &&
                      cn(
                        KANGUR_ACCENT_STYLES[round.accent].activeCard,
                        KANGUR_ACCENT_STYLES[round.accent].activeText,
                        'ring-2 ring-emerald-400/70 ring-offset-1 ring-offset-transparent'
                      )
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

        <KangurCheckButton
          type='button'
          size='lg'
          variant='primary'
          className='w-full'
          feedbackTone={
            feedback?.kind === 'success' ? 'success' : feedback?.kind === 'error' ? 'error' : null
          }
          disabled={!isReady || isChecking}
          onClick={handleCheck}
          data-testid='english-prepositions-check'
        >
          {translations('englishPrepositions.inRound.check')}
        </KangurCheckButton>
      </KangurGlassPanel>
    </KangurPracticeGameStage>
  );
}
