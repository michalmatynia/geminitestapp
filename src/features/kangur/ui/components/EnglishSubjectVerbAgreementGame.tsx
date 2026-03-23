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
import { EnglishAgreementBalanceAnimation } from '@/features/kangur/ui/components/LessonAnimations';
import {
  KangurButton,
  KangurGlassPanel,
  KangurHeadline,
  KangurInfoCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { KangurCheckButton } from '@/features/kangur/ui/components/KangurCheckButton';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import {
  addXp,
  createLessonPracticeReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import {
  getKangurMiniGameFinishLabel,
  getKangurMiniGameScoreLabel,
  type KangurMiniGameTranslate,
} from '@/features/kangur/ui/constants/mini-game-i18n';
import { scheduleKangurRoundFeedback } from '@/features/kangur/ui/services/round-transition';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import type {
  KangurMiniGameFeedbackState,
  KangurMiniGameFinishProps,
  KangurRewardBreakdownEntry,
} from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

type AgreementRound = {
  id: string;
  accent: KangurAccent;
  subject: string;
  sentenceStart: string;
  sentenceEnd: string;
  answer: string;
  options: string[];
};

const ROUNDS: AgreementRound[] = [
  {
    id: 'streamer-goes',
    accent: 'teal',
    subject: 'The streamer',
    sentenceStart: 'The streamer',
    sentenceEnd: 'live every Friday.',
    answer: 'goes',
    options: ['go', 'goes'],
  },
  {
    id: 'friends-try',
    accent: 'sky',
    subject: 'My friends',
    sentenceStart: 'My friends',
    sentenceEnd: 'new maps after school.',
    answer: 'try',
    options: ['try', 'tries'],
  },
  {
    id: 'everyone-arrives',
    accent: 'rose',
    subject: 'Everyone in the band',
    sentenceStart: 'Everyone in the band',
    sentenceEnd: 'early.',
    answer: 'arrives',
    options: ['arrive', 'arrives'],
  },
  {
    id: 'there-are',
    accent: 'amber',
    subject: 'There',
    sentenceStart: 'There',
    sentenceEnd: 'two finals this week.',
    answer: 'are',
    options: ['is', 'are'],
  },
  {
    id: 'either-players',
    accent: 'violet',
    subject: 'Either the captain or the players',
    sentenceStart: 'Either the captain or the players',
    sentenceEnd: 'the playlist.',
    answer: 'choose',
    options: ['choose', 'chooses'],
  },
  {
    id: 'pair-is',
    accent: 'indigo',
    subject: 'The pair of sneakers',
    sentenceStart: 'The pair of sneakers',
    sentenceEnd: 'expensive.',
    answer: 'is',
    options: ['is', 'are'],
  },
];

const TOTAL_ROUNDS = ROUNDS.length;

const getAgreementRoundPrompt = (
  translate: KangurMiniGameTranslate,
  roundId: AgreementRound['id']
): string => translate(`englishSubjectVerbAgreement.inRound.rounds.${roundId}.prompt`);

const getAgreementRoundHint = (
  translate: KangurMiniGameTranslate,
  roundId: AgreementRound['id']
): string => translate(`englishSubjectVerbAgreement.inRound.rounds.${roundId}.hint`);

export default function EnglishSubjectVerbAgreementGame({
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
      ? translations('englishSubjectVerbAgreement.inRound.feedback.correct')
      : translations('englishSubjectVerbAgreement.inRound.feedback.incorrect', {
          answer: round.answer,
        });

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
              {getKangurMiniGameScoreLabel(translations, score, TOTAL_ROUNDS)}
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
            ? translations('englishSubjectVerbAgreement.summary.perfect')
            : percent >= 70
              ? translations('englishSubjectVerbAgreement.summary.good')
              : translations('englishSubjectVerbAgreement.summary.retry')}
        </KangurPracticeGameSummaryMessage>
        <KangurPracticeGameSummaryActions
          finishLabel={resolvedFinishLabel}
          onFinish={onFinish}
          onRestart={handleRestart}
          restartLabel={translations('shared.restart')}
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
            {translations('englishSubjectVerbAgreement.inRound.roundLabel', {
              current: roundIndex + 1,
              total: TOTAL_ROUNDS,
            })}
          </KangurStatusChip>
          <KangurStatusChip accent='slate' className='text-[10px] uppercase tracking-[0.16em]'>
            {translations(
              isCoarsePointer
                ? 'englishSubjectVerbAgreement.inRound.modeLabelTouch'
                : 'englishSubjectVerbAgreement.inRound.modeLabel'
            )}
          </KangurStatusChip>
        </div>

        <div className='rounded-[24px] border border-white/70 bg-white/70 p-3'>
          <EnglishAgreementBalanceAnimation />
        </div>

        <KangurInfoCard accent={round.accent} tone='accent' padding='sm' className='text-sm'>
          <p className='font-semibold'>{getAgreementRoundPrompt(translations, round.id)}</p>
          <p className='mt-1 text-xs [color:var(--kangur-page-muted-text)]'>
            {getAgreementRoundHint(translations, round.id)}
          </p>
        </KangurInfoCard>

        <div className='space-y-3'>
          {isCoarsePointer ? (
            <p
              data-testid='english-agreement-touch-hint'
              className='text-center text-xs font-semibold uppercase tracking-[0.16em] [color:var(--kangur-page-muted-text)]'
            >
              {translations('englishSubjectVerbAgreement.inRound.touchHint')}
            </p>
          ) : null}
          <div id='sva-question' className='rounded-[20px] border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-700'>
            <div className={`${KANGUR_WRAP_CENTER_ROW_CLASSNAME} text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400`}>
              <span>{translations('englishSubjectVerbAgreement.inRound.subjectLabel')}</span>
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
                {selection ?? translations('englishSubjectVerbAgreement.inRound.blank')}
              </span>{' '}
              {round.sentenceEnd}
            </p>
          </div>

          <div className='grid grid-cols-1 gap-2 min-[420px]:grid-cols-2' role='group' aria-labelledby='sva-question'>
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
          data-testid='english-agreement-check'
        >
          {translations('englishSubjectVerbAgreement.inRound.check')}
        </KangurCheckButton>
      </KangurGlassPanel>
    </KangurPracticeGameStage>
  );
}
