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
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
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
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import type {
  KangurMiniGameFeedbackState,
  KangurMiniGameFinishProps,
  KangurRewardBreakdownEntry,
} from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

import type { DropResult } from '@hello-pangea/dnd';

type OrderToken = {
  id: string;
  label: string;
};

type OrderRound = {
  id: string;
  accent: KangurAccent;
  tokens: OrderToken[];
  answer: string[];
  target: string;
};

const ROUNDS: OrderRound[] = [
  {
    id: 'time-start',
    accent: 'rose',
    tokens: [
      { id: 'time-start-we', label: 'We' },
      { id: 'time-start-start', label: 'start' },
      { id: 'time-start-at', label: 'at' },
      { id: 'time-start-800', label: '8:00.' },
    ],
    answer: ['time-start-we', 'time-start-start', 'time-start-at', 'time-start-800'],
    target: 'We start at 8:00.',
  },
  {
    id: 'time-quiz',
    accent: 'rose',
    tokens: [
      { id: 'time-quiz-the', label: 'The' },
      { id: 'time-quiz-quiz', label: 'quiz' },
      { id: 'time-quiz-is', label: 'is' },
      { id: 'time-quiz-on', label: 'on' },
      { id: 'time-quiz-friday', label: 'Friday.' },
    ],
    answer: [
      'time-quiz-the',
      'time-quiz-quiz',
      'time-quiz-is',
      'time-quiz-on',
      'time-quiz-friday',
    ],
    target: 'The quiz is on Friday.',
  },
  {
    id: 'time-month',
    accent: 'rose',
    tokens: [
      { id: 'time-month-she', label: 'She' },
      { id: 'time-month-studies', label: 'studies' },
      { id: 'time-month-in', label: 'in' },
      { id: 'time-month-september', label: 'September.' },
    ],
    answer: ['time-month-she', 'time-month-studies', 'time-month-in', 'time-month-september'],
    target: 'She studies in September.',
  },
  {
    id: 'place-notes',
    accent: 'amber',
    tokens: [
      { id: 'place-notes-the', label: 'The' },
      { id: 'place-notes-notes', label: 'notes' },
      { id: 'place-notes-are', label: 'are' },
      { id: 'place-notes-on', label: 'on' },
      { id: 'place-notes-desk', label: 'the' },
      { id: 'place-notes-desk-2', label: 'desk.' },
    ],
    answer: [
      'place-notes-the',
      'place-notes-notes',
      'place-notes-are',
      'place-notes-on',
      'place-notes-desk',
      'place-notes-desk-2',
    ],
    target: 'The notes are on the desk.',
  },
  {
    id: 'place-bus',
    accent: 'amber',
    tokens: [
      { id: 'place-bus-we', label: 'We' },
      { id: 'place-bus-wait', label: 'wait' },
      { id: 'place-bus-at', label: 'at' },
      { id: 'place-bus-the', label: 'the' },
      { id: 'place-bus-stop', label: 'bus' },
      { id: 'place-bus-stop-2', label: 'stop.' },
    ],
    answer: [
      'place-bus-we',
      'place-bus-wait',
      'place-bus-at',
      'place-bus-the',
      'place-bus-stop',
      'place-bus-stop-2',
    ],
    target: 'We wait at the bus stop.',
  },
  {
    id: 'relation-between',
    accent: 'violet',
    tokens: [
      { id: 'relation-p-point', label: 'Point' },
      { id: 'relation-p-p', label: 'P' },
      { id: 'relation-p-is', label: 'is' },
      { id: 'relation-p-between', label: 'between' },
      { id: 'relation-p-a', label: 'A' },
      { id: 'relation-p-and', label: 'and' },
      { id: 'relation-p-b', label: 'B.' },
    ],
    answer: [
      'relation-p-point',
      'relation-p-p',
      'relation-p-is',
      'relation-p-between',
      'relation-p-a',
      'relation-p-and',
      'relation-p-b',
    ],
    target: 'Point P is between A and B.',
  },
];

const TOTAL_ROUNDS = ROUNDS.length;
const TOTAL_TOKENS = ROUNDS.reduce((sum, round) => sum + round.tokens.length, 0);

const getPrepositionsOrderPrompt = (
  translate: KangurMiniGameTranslate,
  roundId: OrderRound['id']
): string => translate(`englishPrepositions.inRound.order.rounds.${roundId}.prompt`);

const getPrepositionsOrderHint = (
  translate: KangurMiniGameTranslate,
  roundId: OrderRound['id']
): string => translate(`englishPrepositions.inRound.order.rounds.${roundId}.hint`);

const getPrepositionsOrderTitle = (
  translate: KangurMiniGameTranslate,
  roundId: OrderRound['id']
): string => translate(`englishPrepositions.inRound.order.rounds.${roundId}.title`);

const shuffle = <T,>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);

const buildRoundState = (round: OrderRound): OrderToken[] => shuffle(round.tokens);

const reorderWithinList = <T,>(list: T[], startIndex: number, endIndex: number): T[] => {
  const updated = [...list];
  const [removed] = updated.splice(startIndex, 1);
  if (removed === undefined) {
    return updated;
  }
  updated.splice(endIndex, 0, removed);
  return updated;
};

const countCorrectPositions = (round: OrderRound, tokens: OrderToken[]): number =>
  round.answer.reduce((count, tokenId, index) =>
    count + (tokens[index]?.id === tokenId ? 1 : 0),
  0);

export default function EnglishPrepositionsOrderGame({
  finishLabel,
  onFinish,
}: KangurMiniGameFinishProps): React.JSX.Element {
  const ownerKey = useKangurProgressOwnerKey();
  const translations = useTranslations('KangurMiniGames');
  const isCoarsePointer = useKangurCoarsePointer();
  const resolvedFinishLabel = finishLabel ?? getKangurMiniGameFinishLabel(translations, 'topics');
  const [roundIndex, setRoundIndex] = useState(0);
  const [orderTokens, setOrderTokens] = useState<OrderToken[]>(() => buildRoundState(ROUNDS[0]!));
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [roundCorrect, setRoundCorrect] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [feedback, setFeedback] = useState<KangurMiniGameFeedbackState>(null);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const sessionStartedAtRef = useRef(Date.now());

  const round = ROUNDS[roundIndex] ?? ROUNDS[0]!;
  const answerLabel = useMemo(() => round.target, [round.target]);

  useEffect(() => {
    setOrderTokens(buildRoundState(round));
    setChecked(false);
    setRoundCorrect(0);
    setFeedback(null);
    setSelectedTokenId(null);
  }, [round]);

  const moveTokenByOffset = (tokenId: string, offset: number): void => {
    let nextIndex = -1;
    setOrderTokens((prev) => {
      const currentIndex = prev.findIndex((token) => token.id === tokenId);
      if (currentIndex < 0) return prev;
      const targetIndex = Math.min(Math.max(currentIndex + offset, 0), prev.length - 1);
      if (targetIndex === currentIndex) return prev;
      nextIndex = targetIndex;
      return reorderWithinList(prev, currentIndex, targetIndex);
    });
    if (nextIndex >= 0) {
      setSelectedTokenId(tokenId);
    }
  };

  const moveTokenToIndex = (tokenId: string, targetIndex: number): void => {
    let moved = false;
    setOrderTokens((prev) => {
      const currentIndex = prev.findIndex((token) => token.id === tokenId);
      if (currentIndex < 0 || currentIndex === targetIndex) return prev;
      moved = true;
      return reorderWithinList(prev, currentIndex, targetIndex);
    });
    if (moved) {
      setSelectedTokenId(tokenId);
    }
  };

  const handleDragEnd = (result: DropResult): void => {
    const { destination, source } = result;
    if (!destination || checked) return;
    if (destination.droppableId !== source.droppableId) return;
    if (destination.index === source.index) return;

    setOrderTokens((prev) => reorderWithinList(prev, source.index, destination.index));
    setSelectedTokenId(null);
  };

  const handleReset = (): void => {
    setOrderTokens(buildRoundState(round));
    setChecked(false);
    setRoundCorrect(0);
    setFeedback(null);
    setSelectedTokenId(null);
  };

  const handleCheck = (): void => {
    if (checked) return;
    const correctCount = countCorrectPositions(round, orderTokens);
    const isPerfect = correctCount === round.tokens.length;

    setRoundCorrect(correctCount);
    setFeedback({
      kind: isPerfect ? 'success' : 'error',
      text: isPerfect
        ? translations('englishPrepositions.inRound.order.feedback.perfect')
        : translations('englishPrepositions.inRound.order.feedback.answer', {
            answer: answerLabel,
          }),
    });
    setSelectedTokenId(null);
    setChecked(true);
  };

  const handleNext = (): void => {
    if (!checked) return;
    const nextTotal = totalCorrect + roundCorrect;
    setTotalCorrect(nextTotal);

    if (roundIndex + 1 >= TOTAL_ROUNDS) {
      const progress = loadProgress({ ownerKey });
      const reward = createLessonPracticeReward(progress, {
        activityKey: 'english_prepositions_order',
        lessonKey: 'english_prepositions_time_place',
        correctAnswers: nextTotal,
        totalQuestions: TOTAL_TOKENS,
        strongThresholdPercent: 75,
      });
      addXp(reward.xp, reward.progressUpdates, { ownerKey });
      void persistKangurSessionScore({
        operation: 'english_prepositions_time_place',
        score: nextTotal,
        totalQuestions: TOTAL_TOKENS,
        correctAnswers: nextTotal,
        timeTakenSeconds: Math.round((Date.now() - sessionStartedAtRef.current) / 1000),
        xpEarned: reward.xp,
      });
      setXpEarned(reward.xp);
      setXpBreakdown(reward.breakdown ?? []);
      setDone(true);
      return;
    }

    setRoundIndex((current) => current + 1);
  };

  const handleRestart = (): void => {
    setRoundIndex(0);
    setOrderTokens(buildRoundState(ROUNDS[0]!));
    setChecked(false);
    setRoundCorrect(0);
    setTotalCorrect(0);
    setFeedback(null);
    setDone(false);
    setXpEarned(0);
    setXpBreakdown([]);
    setSelectedTokenId(null);
    sessionStartedAtRef.current = Date.now();
  };

  if (done) {
    const percent = Math.round((totalCorrect / TOTAL_TOKENS) * 100);
    return (
      <KangurPracticeGameSummary dataTestId='english-prepositions-order-summary-shell'>
        <KangurPracticeGameSummaryEmoji
          dataTestId='english-prepositions-order-summary-emoji'
          emoji={percent === 100 ? '🏆' : percent >= 70 ? '🌟' : '💪'}
        />
        <KangurPracticeGameSummaryTitle
          accent='rose'
          title={
            <KangurHeadline data-testid='english-prepositions-order-summary-title'>
              {getKangurMiniGameScoreLabel(translations, totalCorrect, TOTAL_TOKENS)}
            </KangurHeadline>
          }
        />
        <KangurPracticeGameSummaryXP accent='rose' xpEarned={xpEarned} />
        <KangurPracticeGameSummaryBreakdown
          breakdown={xpBreakdown}
          dataTestId='english-prepositions-order-summary-breakdown'
          itemDataTestIdPrefix='english-prepositions-order-summary-breakdown'
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
          onRestart={handleRestart}
          restartLabel={translations('shared.restart')}
        />
      </KangurPracticeGameSummary>
    );
  }

  const feedbackAccent: KangurAccent = feedback?.kind === 'success' ? 'emerald' : 'rose';

  return (
    <KangurPracticeGameStage className='mx-auto max-w-3xl'>
      <KangurPracticeGameProgress
        accent={round.accent}
        currentRound={roundIndex}
        dataTestId='english-prepositions-order-progress-bar'
        totalRounds={TOTAL_ROUNDS}
      />
      <KangurDragDropContext onDragEnd={handleDragEnd}>
        <KangurGlassPanel
          className={cn('w-full', KANGUR_PANEL_GAP_CLASSNAME)}
          padding='lg'
          surface='playField'
        >
          <div className='relative overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(140deg,#fff1f2_0%,#fef9c3_60%,#ede9fe_100%)] p-4'>
            <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(244,63,94,0.16),transparent_45%),radial-gradient(circle_at_80%_15%,rgba(245,158,11,0.14),transparent_40%),radial-gradient(circle_at_50%_100%,rgba(139,92,246,0.12),transparent_45%)]' />
            <div className={cn('relative z-10 flex flex-col', KANGUR_PANEL_GAP_CLASSNAME)}>
              <div className='flex items-center justify-between gap-2'>
                <KangurStatusChip accent={round.accent} className='text-[10px] uppercase tracking-[0.16em]'>
                  {translations('englishPrepositions.inRound.roundLabel', {
                    current: roundIndex + 1,
                    total: TOTAL_ROUNDS,
                  })}
                </KangurStatusChip>
                <KangurStatusChip accent='slate' className='text-[10px] uppercase tracking-[0.16em]'>
                  {translations(
                    isCoarsePointer
                      ? 'englishPrepositions.inRound.order.modeLabelTouch'
                      : 'englishPrepositions.inRound.order.modeLabel'
                  )}
                </KangurStatusChip>
              </div>
              <div>
                <p className='text-lg font-bold text-slate-800'>
                  {getPrepositionsOrderTitle(translations, round.id)}
                </p>
                <p className='text-sm text-slate-600'>
                  {getPrepositionsOrderPrompt(translations, round.id)}
                </p>
                <p className='mt-1 text-sm font-semibold text-slate-800'>
                  {translations('englishPrepositions.inRound.order.buildLabel', {
                    sentence: round.target,
                  })}
                </p>
                <p className='mt-1 text-xs font-semibold text-slate-500'>
                  {getPrepositionsOrderHint(translations, round.id)}
                </p>
              </div>
            </div>
          </div>

          <KangurInfoCard accent='slate' className='w-full' padding='md' tone='neutral'>
            <p className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 text-center'>
              {translations('englishPrepositions.inRound.order.dragInstruction')}
            </p>
            {isCoarsePointer || selectedTokenId ? (
              <p
                className='mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 text-center'
                role='status'
                aria-live='polite'
                aria-atomic='true'
                data-testid='english-prepositions-order-selection-hint'
              >
                {selectedTokenId
                  ? translations('englishPrepositions.inRound.order.touchSelected', {
                      token:
                        orderTokens.find((token) => token.id === selectedTokenId)?.label ??
                        selectedTokenId,
                    })
                  : translations('englishPrepositions.inRound.order.touchIdle')}
              </p>
            ) : null}
            <Droppable droppableId='sentence' direction='horizontal'>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  data-testid='english-prepositions-order-preview'
                  className={cn(
                    'mt-3 flex flex-wrap items-center justify-center gap-2 rounded-[20px] border-2 border-dashed px-3 py-3 transition touch-manipulation',
                    isCoarsePointer ? 'min-h-[96px]' : 'min-h-[80px]',
                    snapshot.isDraggingOver
                      ? 'border-amber-300 bg-amber-50/70'
                      : selectedTokenId && !checked && isCoarsePointer
                        ? 'border-amber-200 bg-amber-50/40'
                        : 'border-slate-200'
                  )}
                  aria-label={translations('englishPrepositions.inRound.order.sentenceAria')}
                >
                  {orderTokens.map((token, index) => (
                    <DraggableToken
                      key={token.id}
                      token={token}
                      index={index}
                      accent={round.accent}
                      showStatus={checked}
                      isCorrect={round.answer[index] === token.id}
                      isDragDisabled={checked}
                      isSelected={selectedTokenId === token.id}
                      isCoarsePointer={isCoarsePointer}
                      onSelect={() => {
                        if (isCoarsePointer && selectedTokenId && selectedTokenId !== token.id) {
                          moveTokenToIndex(selectedTokenId, index);
                          return;
                        }
                        setSelectedTokenId((current) => (current === token.id ? null : token.id));
                      }}
                      onMove={(offset) => moveTokenByOffset(token.id, offset)}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </KangurInfoCard>

          {feedback ? (
            <KangurInfoCard accent={feedbackAccent} tone='accent' padding='sm' className='text-sm'>
              {feedback.text}
            </KangurInfoCard>
          ) : null}

          <div className='flex w-full flex-wrap items-center justify-between gap-3'>
            <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
              <KangurButton size='sm' type='button' variant='surface' onClick={handleReset} disabled={checked}>
                {translations('englishPrepositions.inRound.order.shuffle')}
              </KangurButton>
              {checked ? (
                <KangurStatusChip accent={feedbackAccent}>
                  {translations('englishPrepositions.inRound.hitsLabel', {
                    hits: roundCorrect,
                    total: round.tokens.length,
                  })}
                </KangurStatusChip>
              ) : null}
            </div>
            {!checked ? (
              <KangurButton size='sm' type='button' variant='primary' onClick={handleCheck}>
                {translations('englishPrepositions.inRound.check')}
              </KangurButton>
            ) : (
              <KangurButton size='sm' type='button' variant='primary' onClick={handleNext}>
                {roundIndex + 1 >= TOTAL_ROUNDS
                  ? translations('englishPrepositions.inRound.seeResult')
                  : translations('englishPrepositions.inRound.next')}
              </KangurButton>
            )}
          </div>
        </KangurGlassPanel>
      </KangurDragDropContext>
    </KangurPracticeGameStage>
  );
}

function DraggableToken({
  token,
  index,
  accent,
  showStatus,
  isCorrect,
  isDragDisabled,
  isSelected,
  isCoarsePointer,
  onSelect,
  onMove,
}: {
  token: OrderToken;
  index: number;
  accent: KangurAccent;
  showStatus: boolean;
  isCorrect: boolean;
  isDragDisabled: boolean;
  isSelected: boolean;
  isCoarsePointer: boolean;
  onSelect: () => void;
  onMove: (offset: number) => void;
}): React.JSX.Element {
  const translations = useTranslations('KangurMiniGames');
  const statusClass = showStatus ? (isCorrect ? 'border-emerald-300' : 'border-rose-300') : '';
  return (
    <Draggable
      draggableId={token.id}
      index={index}
      isDragDisabled={isDragDisabled}
      disableInteractiveElementBlocking
    >
      {(provided, snapshot) => {
        const selectedClass = isSelected
          ? 'ring-2 ring-amber-400/80 ring-offset-1 ring-offset-white'
          : '';
        const content = (
          <button
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={getKangurMobileDragHandleStyle(
              provided.draggableProps.style,
              isCoarsePointer
            )}
            type='button'
            className={cn(
              'rounded-[16px] border px-3 py-2 text-sm font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white',
              isCoarsePointer ? 'min-h-[4rem] px-4 py-3 touch-manipulation' : undefined,
              KANGUR_ACCENT_STYLES[accent].badge,
              snapshot.isDragging && 'scale-[1.02] shadow-lg',
              statusClass,
              selectedClass
            )}
            aria-label={translations('englishPrepositions.inRound.wordAria', {
              token: token.label,
            })}
            aria-disabled={isDragDisabled}
            aria-pressed={isSelected}
            title={token.label}
            onClick={() => {
              if (snapshot.isDragging || isDragDisabled) return;
              onSelect();
            }}
            onKeyDown={(event) => {
              if (isDragDisabled) return;
              if (event.key === 'ArrowLeft' && isSelected) {
                event.preventDefault();
                onMove(-1);
              }
              if (event.key === 'ArrowRight' && isSelected) {
                event.preventDefault();
                onMove(1);
              }
            }}
          >
            {token.label}
          </button>
        );

        return renderKangurDragPreview(content, snapshot.isDragging);
      }}
    </Draggable>
  );
}
