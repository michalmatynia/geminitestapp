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
import { EnglishAgreementBalanceAnimation } from '@/features/kangur/ui/components/LessonAnimations';
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
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
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

type AgreementRound = {
  id: string;
  accent: KangurAccent;
  prompt: string;
  subject: string;
  sentenceStart: string;
  sentenceEnd: string;
  answer: string;
  options: string[];
  hint: string;
};

const ROUNDS: AgreementRound[] = [
  {
    id: 'streamer-goes',
    accent: 'teal',
    prompt: 'Kliknij czasownik, który pasuje do liczby pojedynczej.',
    subject: 'The streamer',
    sentenceStart: 'The streamer',
    sentenceEnd: 'live every Friday.',
    answer: 'goes',
    options: ['go', 'goes'],
    hint: 'Singular subject + -s.',
  },
  {
    id: 'friends-try',
    accent: 'sky',
    prompt: 'Kliknij czasownik dla liczby mnogiej.',
    subject: 'My friends',
    sentenceStart: 'My friends',
    sentenceEnd: 'new maps after school.',
    answer: 'try',
    options: ['try', 'tries'],
    hint: 'Plural subject = base verb.',
  },
  {
    id: 'everyone-arrives',
    accent: 'rose',
    prompt: 'Wszyscy? Gramatycznie to dalej liczba pojedyncza.',
    subject: 'Everyone in the band',
    sentenceStart: 'Everyone in the band',
    sentenceEnd: 'early.',
    answer: 'arrives',
    options: ['arrive', 'arrives'],
    hint: 'Everyone = singular.',
  },
  {
    id: 'there-are',
    accent: 'amber',
    prompt: 'There is/are zależy od rzeczownika po nim.',
    subject: 'There',
    sentenceStart: 'There',
    sentenceEnd: 'two finals this week.',
    answer: 'are',
    options: ['is', 'are'],
    hint: 'Two finals = plural.',
  },
  {
    id: 'either-players',
    accent: 'violet',
    prompt: 'Either/or: czasownik zgadza się z najbliższym podmiotem.',
    subject: 'Either the captain or the players',
    sentenceStart: 'Either the captain or the players',
    sentenceEnd: 'the playlist.',
    answer: 'choose',
    options: ['choose', 'chooses'],
    hint: 'Closest subject = players (plural).',
  },
  {
    id: 'pair-is',
    accent: 'indigo',
    prompt: 'Fraza "pair of" liczy się jako liczba pojedyncza.',
    subject: 'The pair of sneakers',
    sentenceStart: 'The pair of sneakers',
    sentenceEnd: 'expensive.',
    answer: 'is',
    options: ['is', 'are'],
    hint: 'Pair = one set.',
  },
];

const TOTAL_ROUNDS = ROUNDS.length;

type FeedbackState = {
  kind: 'success' | 'error';
  text: string;
};

type EnglishSubjectVerbAgreementGameProps = {
  finishLabel?: string;
  onFinish: () => void;
};

export default function EnglishSubjectVerbAgreementGame({
  finishLabel = 'Wróć do tematów',
  onFinish,
}: EnglishSubjectVerbAgreementGameProps): React.JSX.Element {
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
      ? 'Tak! Wszystko się zgadza.'
      : `Poprawna odpowiedź: ${round.answer}.`;

    setScore(nextScore);
    setFeedback({ kind: isCorrect ? 'success' : 'error', text: feedbackText });

    scheduleKangurRoundFeedback(() => {
      if (roundIndex + 1 >= TOTAL_ROUNDS) {
        const progress = loadProgress();
        const reward = createLessonPracticeReward(progress, {
          activityKey: 'english_subject_verb_agreement_quiz',
          lessonKey: 'english_subject_verb_agreement',
          correctAnswers: nextScore,
          totalQuestions: TOTAL_ROUNDS,
          strongThresholdPercent: 75,
        });
        addXp(reward.xp, reward.progressUpdates);
        void persistKangurSessionScore({
          operation: 'english_subject_verb_agreement',
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
      <KangurPracticeGameSummary dataTestId='english-agreement-summary-shell'>
        <KangurPracticeGameSummaryEmoji
          dataTestId='english-agreement-summary-emoji'
          emoji={percent === 100 ? '🏆' : percent >= 70 ? '🔥' : '💪'}
        />
        <KangurPracticeGameSummaryTitle
          accent='teal'
          title={
            <KangurHeadline data-testid='english-agreement-summary-title'>
              Wynik: {score}/{TOTAL_ROUNDS}
            </KangurHeadline>
          }
        />
        <KangurPracticeGameSummaryXP accent='teal' xpEarned={xpEarned} />
        <KangurPracticeGameSummaryBreakdown
          breakdown={xpBreakdown}
          dataTestId='english-agreement-summary-breakdown'
          itemDataTestIdPrefix='english-agreement-summary-breakdown'
        />
        <KangurPracticeGameSummaryProgress accent='teal' percent={percent} />
        <KangurPracticeGameSummaryMessage>
          {percent === 100
            ? 'Perfekcyjna zgodność.'
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
    <KangurPracticeGameStage className='self-center max-w-sm'>
      <KangurPracticeGameProgress
        accent={round.accent}
        currentRound={roundIndex}
        dataTestId='english-agreement-progress-bar'
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
            Click
          </KangurStatusChip>
        </div>

        <div className='rounded-[24px] border border-white/70 bg-white/70 p-3'>
          <EnglishAgreementBalanceAnimation />
        </div>

        <KangurInfoCard accent={round.accent} tone='accent' padding='sm' className='text-sm'>
          <p className='font-semibold'>{round.prompt}</p>
          <p className='mt-1 text-xs [color:var(--kangur-page-muted-text)]'>{round.hint}</p>
        </KangurInfoCard>

        <div className='space-y-3'>
          <div className='rounded-[20px] border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-700'>
            <div className={`${KANGUR_WRAP_CENTER_ROW_CLASSNAME} text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400`}>
              <span>Subject</span>
              <KangurStatusChip accent={round.accent} size='sm'>
                {round.subject}
              </KangurStatusChip>
            </div>
            <p className='mt-3 text-base font-semibold text-slate-800'>
              {round.sentenceStart}{' '}
              <span
                className={cn(
                  'inline-flex min-w-[72px] items-center justify-center rounded-full border-2 border-dashed px-3 py-1 transition',
                  selection
                    ? cn(
                        'border-emerald-300 bg-emerald-50 text-emerald-700',
                        KANGUR_ACCENT_STYLES[round.accent].activeText
                      )
                    : 'border-slate-300 text-slate-400'
                )}
              >
                {selection ?? '____'}
              </span>{' '}
              {round.sentenceEnd}
            </p>
          </div>

          <div className='grid grid-cols-1 gap-2 min-[420px]:grid-cols-2'>
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
          data-testid='english-agreement-check'
        >
          Sprawdź ✓
        </KangurButton>
      </KangurGlassPanel>
    </KangurPracticeGameStage>
  );
}
