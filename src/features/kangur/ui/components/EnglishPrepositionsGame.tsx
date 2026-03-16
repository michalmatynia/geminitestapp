'use client';

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
  KangurButton,
  KangurGlassPanel,
  KangurHeadline,
  KangurInfoCard,
  KangurStatusChip,
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
import type { KangurRewardBreakdownEntry } from '@/features/kangur/ui/types';
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
    prompt: 'Wybierz przyimek czasu.',
    question: 'We meet ___ 7:30.',
    answer: 'at',
    options: ['at', 'on', 'in'],
    hint: 'Dokładna godzina → at.',
    visual: 'timeline',
  },
  {
    id: 'time-on',
    accent: 'rose',
    prompt: 'Wybierz przyimek czasu.',
    question: 'Our test is ___ Tuesday.',
    answer: 'on',
    options: ['on', 'in', 'at'],
    hint: 'Dzień tygodnia → on.',
    visual: 'time',
  },
  {
    id: 'time-in',
    accent: 'rose',
    prompt: 'Wybierz przyimek czasu.',
    question: 'She practices ___ July.',
    answer: 'in',
    options: ['in', 'on', 'at'],
    hint: 'Miesiąc → in.',
    visual: 'time',
  },
  {
    id: 'time-before',
    accent: 'rose',
    prompt: 'Wybierz przyimek czasu.',
    question: 'Finish the homework ___ class.',
    answer: 'before',
    options: ['before', 'after', 'during'],
    hint: 'Przed lekcją → before.',
    visual: 'time',
  },
  {
    id: 'place-on',
    accent: 'amber',
    prompt: 'Wybierz przyimek miejsca.',
    question: 'The notes are ___ the board.',
    answer: 'on',
    options: ['on', 'in', 'at'],
    hint: 'Powierzchnia → on.',
    visual: 'place',
  },
  {
    id: 'place-at',
    accent: 'amber',
    prompt: 'Wybierz przyimek miejsca.',
    question: 'We wait ___ the bus stop.',
    answer: 'at',
    options: ['at', 'on', 'in'],
    hint: 'Punkt / miejsce spotkania → at.',
    visual: 'place',
  },
  {
    id: 'relation-between',
    accent: 'violet',
    prompt: 'Wybierz przyimek relacji.',
    question: 'Point P is ___ A and B.',
    answer: 'between',
    options: ['between', 'behind', 'above'],
    hint: 'P leży pomiędzy punktami A i B.',
    visual: 'relation',
  },
  {
    id: 'relation-above',
    accent: 'violet',
    prompt: 'Wybierz przyimek relacji.',
    question: 'The lamp is ___ the table.',
    answer: 'above',
    options: ['above', 'below', 'between'],
    hint: 'Lampa znajduje się nad stołem.',
    visual: 'relation',
  },
  {
    id: 'relation-below',
    accent: 'violet',
    prompt: 'Wybierz przyimek relacji.',
    question: 'The box is ___ the desk.',
    answer: 'below',
    options: ['below', 'above', 'between'],
    hint: 'Pudełko jest pod biurkiem.',
    visual: 'relation',
  },
];

const TOTAL_ROUNDS = ROUNDS.length;

type FeedbackState = {
  kind: 'success' | 'error';
  text: string;
};

type EnglishPrepositionsGameProps = {
  finishLabel?: string;
  onFinish: () => void;
};

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
  finishLabel = 'Wróć do tematów',
  onFinish,
}: EnglishPrepositionsGameProps): React.JSX.Element {
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
      ? 'Świetnie! Trafione.'
      : `Prawidłowa odpowiedź: ${round.answer}.`;

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
              Wynik: {score}/{TOTAL_ROUNDS}
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
            ? 'Perfekcyjnie! Prepositions opanowane.'
            : percent >= 70
              ? 'Dobra robota!'
              : 'Jeszcze jedna runda i będzie super.'}
        </KangurPracticeGameSummaryMessage>
        <KangurPracticeGameSummaryActions
          finishLabel={finishLabel}
          onFinish={onFinish}
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
            Round {roundIndex + 1}/{TOTAL_ROUNDS}
          </KangurStatusChip>
          <KangurStatusChip accent='slate' className='text-[10px] uppercase tracking-[0.16em]'>
            Prepositions
          </KangurStatusChip>
        </div>

        <div className='rounded-[24px] border border-white/70 bg-white/70 p-3'>
          {renderRoundVisual(round.visual)}
        </div>

        <KangurInfoCard accent={round.accent} tone='accent' padding='sm' className='text-sm'>
          <p className='font-semibold'>{round.prompt}</p>
          <p className='mt-1 text-xs [color:var(--kangur-page-muted-text)]'>{round.hint}</p>
        </KangurInfoCard>

        <div className='flex flex-col gap-3'>
          <div className='rounded-[20px] border border-slate-200/80 bg-white px-4 py-3 text-sm font-semibold text-slate-700'>
            {round.question}
          </div>
          <div className='grid grid-cols-1 gap-2 min-[360px]:grid-cols-2'>
            {round.options.map((option) => {
              const isSelected = selection === option;
              return (
                <button
                  key={option}
                  type='button'
                  className={cn(
                    'rounded-[20px] border px-3 py-2 text-base font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white',
                    KANGUR_ACCENT_STYLES[round.accent].badge,
                    KANGUR_ACCENT_STYLES[round.accent].hoverCard,
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
          data-testid='english-prepositions-check'
        >
          Sprawdź ✓
        </KangurButton>
      </KangurGlassPanel>
    </KangurPracticeGameStage>
  );
}
