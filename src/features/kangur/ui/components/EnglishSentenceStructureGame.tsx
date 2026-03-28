'use client';

import { useKangurProgressOwnerKey } from '@/features/kangur/ui/hooks/useKangurProgressOwnerKey';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KangurDragDropContext,
  getKangurMobileDragHandleStyle,
  renderKangurDragPreview,
} from '@/features/kangur/ui/components/KangurDragDropContext';

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
  KangurButton,
  KangurGlassPanel,
  KangurHeadline,
  KangurInfoCard,
  KangurStatusChip,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import { getKangurCheckButtonClassName } from '@/features/kangur/ui/components/KangurCheckButton';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_CENTER_ROW_SPACED_CLASSNAME,
  KANGUR_GRID_SPACED_CLASSNAME,
  KANGUR_GRID_TIGHT_CLASSNAME,
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_WRAP_ROW_CLASSNAME,
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
import { safeSetInterval, safeClearInterval, type SafeTimerId } from '@/shared/lib/timers';

import type { DropResult } from '@hello-pangea/dnd';

type BaseRound = {
  id: string;
  accent: KangurAccent;
};

type ChoiceRound = BaseRound & {
  kind: 'choice';
  options: string[];
  answer: string;
};

type TimedRound = BaseRound & {
  kind: 'timed';
  options: string[];
  answer: string;
  timeLimitSec: number;
};

type OrderRound = BaseRound & {
  kind: 'order';
  tokens: string[];
  answer: string[];
};

type FillRound = BaseRound & {
  kind: 'fill';
  answers: string[];
  placeholder?: string;
};

type Round = ChoiceRound | TimedRound | OrderRound | FillRound;

const ROUNDS: Round[] = [
  {
    id: 'svo-order',
    kind: 'choice',
    accent: 'violet',
    answer: 'The drummer plays the rhythm.',
    options: [
      'Plays the drummer the rhythm.',
      'The drummer plays the rhythm.',
      'The rhythm plays the drummer.',
      'Plays the rhythm the drummer.',
    ],
  },
  {
    id: 'order-words',
    kind: 'order',
    accent: 'sky',
    tokens: ['My', 'friend', 'always', 'finishes', 'homework', 'on', 'time'],
    answer: ['My', 'friend', 'always', 'finishes', 'homework', 'on', 'time'],
  },
  {
    id: 'do-question',
    kind: 'fill',
    accent: 'indigo',
    answers: ['do'],
    placeholder: 'do / does',
  },
  {
    id: 'connector-so',
    kind: 'timed',
    accent: 'amber',
    answer: 'so',
    options: ['so', 'because', 'but', 'when'],
    timeLimitSec: 8,
  },
  {
    id: 'frequency-adverb',
    kind: 'choice',
    accent: 'teal',
    answer: 'often',
    options: ['often', 'after', 'quickly', 'yesterday'],
  },
  {
    id: 'does-negative',
    kind: 'fill',
    accent: 'rose',
    answers: ['doesn\'t', 'does not'],
    placeholder: 'doesn\'t',
  },
];

const TOTAL_ROUNDS = ROUNDS.length;

const getSentenceStructurePrompt = (
  translate: KangurMiniGameTranslate,
  roundId: Round['id']
): string => translate(`englishSentenceStructure.inRound.rounds.${roundId}.prompt`);

const getSentenceStructureHint = (
  translate: KangurMiniGameTranslate,
  roundId: Round['id']
): string => translate(`englishSentenceStructure.inRound.rounds.${roundId}.hint`);

const getSentenceStructureQuestion = (
  translate: KangurMiniGameTranslate,
  roundId: Round['id']
): string => translate(`englishSentenceStructure.inRound.rounds.${roundId}.question`);

const shuffle = <T,>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);

const reorderWithinList = <T,>(list: T[], startIndex: number, endIndex: number): T[] => {
  const updated = [...list];
  const [removed] = updated.splice(startIndex, 1);
  if (removed === undefined) {
    return updated;
  }
  updated.splice(endIndex, 0, removed);
  return updated;
};

const normalizeText = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[.!?]/g, '')
    .replace(/\s+/g, ' ');

type RoundState = {
  selection: string | null;
  orderTokens: string[];
  fillValue: string;
};

const evaluateRound = (
  round: Round,
  { selection, orderTokens, fillValue }: RoundState
): { isCorrect: boolean; correctAnswerLabel: string } => {
  switch (round.kind) {
    case 'choice':
    case 'timed': {
      const isCorrect =
        Boolean(selection) &&
        normalizeText(selection ?? '') === normalizeText(round.answer);
      return { isCorrect, correctAnswerLabel: round.answer };
    }
    case 'order': {
      const normalizedAnswer = round.answer.map(normalizeText);
      const normalizedOrder = orderTokens.map(normalizeText);
      const isCorrect =
        normalizedAnswer.length === normalizedOrder.length &&
        normalizedAnswer.every((value, index) => value === normalizedOrder[index]);
      return { isCorrect, correctAnswerLabel: round.answer.join(' ') };
    }
    case 'fill': {
      const normalizedGuess = normalizeText(fillValue);
      const normalizedAnswers = round.answers.map(normalizeText);
      const isCorrect = normalizedAnswers.includes(normalizedGuess);
      return { isCorrect, correctAnswerLabel: round.answers[0] ?? '' };
    }
    default:
      return { isCorrect: false, correctAnswerLabel: '' };
  }
};

export default function EnglishSentenceStructureGame({
  finishLabel,
  onFinish,
}: KangurMiniGameFinishProps): React.JSX.Element {
  const ownerKey = useKangurProgressOwnerKey();
  const translations = useTranslations('KangurMiniGames');
  const isCoarsePointer = useKangurCoarsePointer();
  const resolvedFinishLabel = finishLabel ?? getKangurMiniGameFinishLabel(translations, 'play');
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState<KangurMiniGameFeedbackState>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const [selection, setSelection] = useState<string | null>(null);
  const [orderTokens, setOrderTokens] = useState<string[]>([]);
  const [selectedOrderIndex, setSelectedOrderIndex] = useState<number | null>(null);
  const [fillValue, setFillValue] = useState('');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const sessionStartedAtRef = useRef(Date.now());
  const handleCheckRef = useRef<(options?: { auto?: boolean }) => void>(() => undefined);
  const autoSubmitRef = useRef(false);
  const timerRef = useRef<SafeTimerId | null>(null);

  const round = ROUNDS[roundIndex] ?? ROUNDS[0]!;
  const selectedOrderToken =
    round.kind === 'order' && selectedOrderIndex !== null ? orderTokens[selectedOrderIndex] ?? null : null;
  const orderTouchHint =
    round.kind === 'order'
      ? selectedOrderToken
        ? translations('englishSentenceStructure.inRound.touch.selected', {
            token: selectedOrderToken,
          })
        : translations('englishSentenceStructure.inRound.touch.idle')
      : null;

  useEffect(() => {
    setFeedback(null);
    setIsChecking(false);
    setSelection(null);
    setFillValue('');
    setOrderTokens(round.kind === 'order' ? shuffle(round.tokens) : []);
    setSelectedOrderIndex(null);
    setTimeLeft(round.kind === 'timed' ? round.timeLimitSec : null);
    autoSubmitRef.current = false;
    if (timerRef.current) {
      safeClearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [roundIndex, round]);

  const isReady = useMemo(() => {
    switch (round.kind) {
      case 'choice':
      case 'timed':
        return Boolean(selection);
      case 'order':
        return orderTokens.length > 0;
      case 'fill':
        return fillValue.trim().length > 0;
      default:
        return false;
    }
  }, [fillValue, orderTokens.length, round.kind, selection]);

  const handleOrderDragEnd = (result: DropResult): void => {
    if (!result.destination || round.kind !== 'order') {
      return;
    }
    const destination = result.destination;
    setOrderTokens((prev) =>
      reorderWithinList(prev, result.source.index, destination.index)
    );
    setSelectedOrderIndex(null);
  };

  const moveOrderTokenByOffset = (index: number, offset: number): void => {
    if (round.kind !== 'order' || isChecking) return;
    let nextIndex = -1;
    setOrderTokens((prev) => {
      const targetIndex = Math.min(Math.max(index + offset, 0), prev.length - 1);
      if (targetIndex === index) return prev;
      nextIndex = targetIndex;
      return reorderWithinList(prev, index, targetIndex);
    });
    if (nextIndex >= 0) {
      setSelectedOrderIndex(nextIndex);
    }
  };

  const moveSelectedOrderTokenToIndex = (targetIndex: number): void => {
    if (round.kind !== 'order' || isChecking || selectedOrderIndex === null) return;
    let nextIndex = selectedOrderIndex;
    setOrderTokens((prev) => {
      const safeIndex = Math.min(Math.max(targetIndex, 0), prev.length - 1);
      if (safeIndex === selectedOrderIndex) return prev;
      nextIndex = safeIndex;
      return reorderWithinList(prev, selectedOrderIndex, safeIndex);
    });
    setSelectedOrderIndex(nextIndex);
  };

  const handleCheck = (options?: { auto?: boolean }): void => {
    if (isChecking) return;
    const isAuto = options?.auto ?? false;
    if (!isAuto && !isReady) return;

    setIsChecking(true);
    autoSubmitRef.current = true;
    if (timerRef.current) {
      safeClearInterval(timerRef.current);
      timerRef.current = null;
    }

    const { isCorrect, correctAnswerLabel } = evaluateRound(round, {
      selection,
      orderTokens,
      fillValue,
    });
    const nextScore = isCorrect ? score + 1 : score;
    const feedbackText = isCorrect
      ? translations('englishSentenceStructure.inRound.feedback.correct')
      : translations('englishSentenceStructure.inRound.feedback.incorrect', {
          answer: correctAnswerLabel,
        });

    setScore(nextScore);
    setFeedback({ kind: isCorrect ? 'success' : 'error', text: feedbackText });

    scheduleKangurRoundFeedback(() => {
      if (roundIndex + 1 >= TOTAL_ROUNDS) {
        const progress = loadProgress({ ownerKey });
        const reward = createLessonPracticeReward(progress, {
          activityKey: 'english_sentence_structure_quiz',
          lessonKey: 'english_sentence_structure',
          correctAnswers: nextScore,
          totalQuestions: TOTAL_ROUNDS,
          strongThresholdPercent: 75,
        });
        addXp(reward.xp, reward.progressUpdates, { ownerKey });
        void persistKangurSessionScore({
          operation: 'english_sentence_structure',
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

  useEffect(() => {
    handleCheckRef.current = handleCheck;
  }, [handleCheck]);

  useEffect(() => {
    if (round.kind !== 'timed') {
      return;
    }

    timerRef.current = safeSetInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return prev;
        const next = prev - 1;
        if (next <= 0) {
          if (!autoSubmitRef.current) {
            autoSubmitRef.current = true;
            handleCheckRef.current({ auto: true });
          }
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        safeClearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [round.kind, roundIndex]);

  const handleRestart = (): void => {
    setRoundIndex(0);
    setScore(0);
    setDone(false);
    setFeedback(null);
    setIsChecking(false);
    setSelection(null);
    setOrderTokens([]);
    setSelectedOrderIndex(null);
    setFillValue('');
    setTimeLeft(null);
    setXpEarned(0);
    setXpBreakdown([]);
    sessionStartedAtRef.current = Date.now();
  };

  if (done) {
    const percent = Math.round((score / TOTAL_ROUNDS) * 100);
    return (
      <KangurPracticeGameSummary dataTestId='english-structure-summary-shell'>
        <KangurPracticeGameSummaryEmoji
          dataTestId='english-structure-summary-emoji'
          emoji={percent === 100 ? '🏆' : percent >= 60 ? '✨' : '💪'}
        />
        <KangurPracticeGameSummaryTitle
          accent='violet'
          title={
            <KangurHeadline data-testid='english-structure-summary-title'>
              {getKangurMiniGameScoreLabel(translations, score, TOTAL_ROUNDS)}
            </KangurHeadline>
          }
        />
        <KangurPracticeGameSummaryXP accent='violet' xpEarned={xpEarned} />
        <KangurPracticeGameSummaryBreakdown
          breakdown={xpBreakdown}
          dataTestId='english-structure-summary-breakdown'
          itemDataTestIdPrefix='english-structure-summary-breakdown'
        />
        <KangurPracticeGameSummaryProgress accent='violet' percent={percent} />
        <KangurPracticeGameSummaryMessage>
          {percent >= 80
            ? translations('englishSentenceStructure.summary.excellent')
            : percent >= 60
              ? translations('englishSentenceStructure.summary.good')
              : translations('englishSentenceStructure.summary.retry')}
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

  return (
    <KangurPracticeGameShell className='max-w-sm' data-testid='english-structure-game-shell'>
      <KangurPracticeGameProgress
        accent={round.accent}
        currentRound={roundIndex}
        dataTestId='english-structure-progress-bar'
        totalRounds={TOTAL_ROUNDS}
      />
      <KangurGlassPanel
        className={cn('w-full', KANGUR_PANEL_GAP_CLASSNAME)}
        padding='lg'
        surface='solid'
      >
        <div className='flex flex-wrap items-center gap-3'>
          <KangurStatusChip accent={round.accent} size='sm'>
            {getSentenceStructurePrompt(translations, round.id)}
          </KangurStatusChip>
          <p className='text-sm text-slate-500'>
            {translations('englishSentenceStructure.inRound.roundLabel', {
              current: roundIndex + 1,
              total: TOTAL_ROUNDS,
            })}
          </p>
          {round.kind === 'timed' ? (
            <KangurStatusChip
              accent={timeLeft !== null && timeLeft <= 3 ? 'rose' : 'amber'}
              size='sm'
            >
              {translations('englishSentenceStructure.inRound.timeLabel', {
                seconds: timeLeft ?? round.timeLimitSec,
              })}
            </KangurStatusChip>
          ) : null}
        </div>
        <KangurHeadline className='text-xl sm:text-2xl'>
          {getSentenceStructureQuestion(translations, round.id)}
        </KangurHeadline>

        {round.kind === 'choice' || round.kind === 'timed' ? (
          <div className={`${KANGUR_GRID_SPACED_CLASSNAME} sm:grid-cols-2`}>
            {round.options.map((option) => (
              <button
                key={option}
                type='button'
                onClick={() => setSelection(option)}
                className={cn(
                  'rounded-2xl border text-left text-sm font-semibold transition touch-manipulation select-none',
                  isCoarsePointer
                    ? 'min-h-[4rem] px-4 py-3.5 active:scale-[0.99] active:shadow-sm'
                    : 'px-4 py-3',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white',
                  selection === option
                    ? KANGUR_ACCENT_STYLES[round.accent].activeCard
                    : 'border-slate-200 bg-white/70 hover:-translate-y-[1px]'
                )}
                aria-pressed={selection === option}
              >
                {option}
              </button>
            ))}
          </div>
        ) : null}

        {round.kind === 'fill' ? (
          <div className={KANGUR_GRID_SPACED_CLASSNAME}>
            <KangurTextField
              accent={round.accent}
              placeholder={
                round.placeholder ??
                translations('englishSentenceStructure.inRound.fillPlaceholder')
              }
              value={fillValue}
              onChange={(event) => setFillValue(event.target.value)}
              aria-label={translations('englishSentenceStructure.inRound.fillAria')}
            />
            <p className='text-xs text-slate-500'>
              {translations('englishSentenceStructure.inRound.fillHelp')}
            </p>
          </div>
        ) : null}

        {round.kind === 'order' ? (
          <div className='space-y-3'>
            {isCoarsePointer ? (
              <div
                aria-live='polite'
                className='rounded-2xl border border-sky-200/80 bg-sky-50/80 px-4 py-3 text-sm font-semibold text-sky-950 shadow-sm'
                data-testid='english-structure-touch-hint'
              >
                {orderTouchHint}
              </div>
            ) : null}
            <div
              className='rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-sm font-semibold text-slate-800'
              data-testid='english-structure-order-preview'
            >
              {orderTokens.join(' ')}
            </div>
            <KangurDragDropContext onDragEnd={handleOrderDragEnd}>
              <Droppable droppableId={`order-${round.id}`} direction='vertical'>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    data-testid='english-structure-order-list'
                    className={KANGUR_GRID_TIGHT_CLASSNAME}
                  >
                    {orderTokens.map((token, index) => (
                      <Draggable
                        key={`${round.id}-${token}-${index}`}
                        draggableId={`${round.id}-${token}-${index}`}
                        index={index}
                        isDragDisabled={isChecking}
                        disableInteractiveElementBlocking
                      >
                        {(draggableProvided, snapshot) => {
                          const isSelected = selectedOrderIndex === index;
                          const content = (
                            <button
                              ref={draggableProvided.innerRef}
                              {...draggableProvided.draggableProps}
                              {...draggableProvided.dragHandleProps}
                              style={getKangurMobileDragHandleStyle(
                                draggableProvided.draggableProps.style,
                                isCoarsePointer
                              )}
                              type='button'
                              className={cn(
                                KANGUR_CENTER_ROW_SPACED_CLASSNAME,
                                'rounded-2xl border text-sm font-semibold transition touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white',
                                isCoarsePointer
                                  ? 'min-h-[4rem] px-4 py-3.5 active:scale-[0.99] active:shadow-sm'
                                  : 'px-4 py-3',
                                snapshot.isDragging
                                  ? 'border-violet-300 bg-violet-50 shadow-lg'
                                  : 'border-slate-200 bg-white/70 hover:-translate-y-[1px]',
                                isSelected
                                  ? 'ring-2 ring-amber-400/80 ring-offset-1 ring-offset-white'
                                  : ''
                              )}
                              aria-label={translations(
                                'englishSentenceStructure.inRound.orderTokenAria',
                                { token }
                              )}
                              aria-disabled={isChecking}
                              aria-pressed={isSelected}
                              title={token}
                              onClick={() => {
                                if (isChecking) return;
                                if (
                                  isCoarsePointer &&
                                  selectedOrderIndex !== null &&
                                  selectedOrderIndex !== index
                                ) {
                                  moveSelectedOrderTokenToIndex(index);
                                  return;
                                }
                                setSelectedOrderIndex((current) =>
                                  current === index ? null : index
                                );
                              }}
                              onKeyDown={(event) => {
                                if (isChecking) return;
                                if (event.key === 'ArrowUp' && isSelected) {
                                  event.preventDefault();
                                  moveOrderTokenByOffset(index, -1);
                                }
                                if (event.key === 'ArrowDown' && isSelected) {
                                  event.preventDefault();
                                  moveOrderTokenByOffset(index, 1);
                                }
                              }}
                            >
                              <span className='text-xs uppercase tracking-wide text-slate-400'>
                                #{index + 1}
                              </span>
                              <span>{token}</span>
                            </button>
                          );

                          return renderKangurDragPreview(content, snapshot.isDragging);
                        }}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </KangurDragDropContext>
          </div>
        ) : null}

        {feedback ? (
          <KangurInfoCard
            accent={feedback.kind === 'success' ? 'emerald' : 'rose'}
            padding='md'
            tone='accent'
          >
            {feedback.text}
          </KangurInfoCard>
        ) : (
          <KangurInfoCard accent='slate' padding='md' tone='muted'>
            {getSentenceStructureHint(translations, round.id)}
          </KangurInfoCard>
        )}
        <div className={KANGUR_WRAP_ROW_CLASSNAME}>
          <KangurButton
            onClick={() => handleCheck()}
            disabled={!isReady || isChecking}
            aria-busy={isChecking}
            className={getKangurCheckButtonClassName(
              undefined,
              feedback?.kind === 'success' ? 'success' : feedback?.kind === 'error' ? 'error' : null
            )}
          >
            {isChecking
              ? translations('englishSentenceStructure.inRound.checking')
              : translations('englishSentenceStructure.inRound.check')}
          </KangurButton>
          <KangurButton onClick={handleRestart} variant='ghost'>
            {translations('shared.restart')}
          </KangurButton>
        </div>
      </KangurGlassPanel>
    </KangurPracticeGameShell>
  );
}
