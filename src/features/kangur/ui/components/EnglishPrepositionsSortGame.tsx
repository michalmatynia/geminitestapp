'use client';

import { Draggable, Droppable } from '@hello-pangea/dnd';
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
  KangurButton,
  KangurGlassPanel,
  KangurHeadline,
  KangurInfoCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_CENTER_ROW_CLASSNAME,
  KANGUR_GRID_SPACED_CLASSNAME,
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
  KANGUR_WRAP_ROW_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import {
  KangurDragDropContext,
  getKangurMobileDragHandleStyle,
} from '@/features/kangur/ui/components/KangurDragDropContext';
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

import {
  EnglishPrepositionsPlaceAnimation,
  EnglishPrepositionsRelationsDiagram,
  EnglishPrepositionsTimeAnimation,
} from './LessonAnimations';

import type { DropResult } from '@hello-pangea/dnd';

type PrepositionBinId = 'at' | 'on' | 'in' | 'between' | 'above' | 'below';

type PrepositionToken = {
  id: string;
  label: string;
  answer: PrepositionBinId;
};

type Round = {
  id: string;
  accent: KangurAccent;
  tokens: PrepositionToken[];
  visual: 'time' | 'place' | 'relation';
  bins: PrepositionBinId[];
};

type RoundState = {
  pool: PrepositionToken[];
  bins: Partial<Record<PrepositionBinId, PrepositionToken[]>>;
};

const BINS: Record<
  PrepositionBinId,
  { label: string; accent: KangurAccent; emoji: string }
> = {
  at: {
    label: 'AT',
    accent: 'rose',
    emoji: '📍',
  },
  on: {
    label: 'ON',
    accent: 'amber',
    emoji: '🧩',
  },
  in: {
    label: 'IN',
    accent: 'violet',
    emoji: '📦',
  },
  between: {
    label: 'BETWEEN',
    accent: 'indigo',
    emoji: '↔️',
  },
  above: {
    label: 'ABOVE',
    accent: 'sky',
    emoji: '⬆️',
  },
  below: {
    label: 'BELOW',
    accent: 'teal',
    emoji: '⬇️',
  },
};

const ROUNDS: Round[] = [
  {
    id: 'time-sort',
    accent: 'rose',
    visual: 'time',
    bins: ['at', 'on', 'in'],
    tokens: [
      { id: 'time-730', label: '7:30', answer: 'at' },
      { id: 'time-noon', label: 'noon', answer: 'at' },
      { id: 'time-monday', label: 'Monday', answer: 'on' },
      { id: 'time-14may', label: '14 May', answer: 'on' },
      { id: 'time-july', label: 'July', answer: 'in' },
      { id: 'time-2026', label: '2026', answer: 'in' },
    ],
  },
  {
    id: 'place-sort',
    accent: 'amber',
    visual: 'place',
    bins: ['at', 'on', 'in'],
    tokens: [
      { id: 'place-bus-stop', label: 'the bus stop', answer: 'at' },
      { id: 'place-intersection', label: 'the intersection', answer: 'at' },
      { id: 'place-board', label: 'the board', answer: 'on' },
      { id: 'place-screen', label: 'the screen', answer: 'on' },
      { id: 'place-classroom', label: 'the classroom', answer: 'in' },
      { id: 'place-backpack', label: 'the backpack', answer: 'in' },
    ],
  },
  {
    id: 'relations-sort',
    accent: 'violet',
    visual: 'relation',
    bins: ['between', 'above', 'below'],
    tokens: [
      { id: 'rel-between', label: 'between A and B', answer: 'between' },
      { id: 'rel-between-2', label: 'between two points', answer: 'between' },
      { id: 'rel-above-axis', label: 'above the axis', answer: 'above' },
      { id: 'rel-above-line', label: 'above the line', answer: 'above' },
      { id: 'rel-below-graph', label: 'below the graph', answer: 'below' },
      { id: 'rel-below-table', label: 'below the table', answer: 'below' },
    ],
  },
];

const TOTAL_ROUNDS = ROUNDS.length;
const TOTAL_TOKENS = ROUNDS.reduce((sum, round) => sum + round.tokens.length, 0);

const getPrepositionsSortPrompt = (
  translate: KangurMiniGameTranslate,
  roundId: Round['id']
): string => translate(`englishPrepositions.inRound.sort.rounds.${roundId}.prompt`);

const getPrepositionsSortHint = (
  translate: KangurMiniGameTranslate,
  roundId: Round['id']
): string => translate(`englishPrepositions.inRound.sort.rounds.${roundId}.hint`);

const getPrepositionsSortTitle = (
  translate: KangurMiniGameTranslate,
  roundId: Round['id']
): string => translate(`englishPrepositions.inRound.sort.rounds.${roundId}.title`);

const getPrepositionsBinDescription = (
  translate: KangurMiniGameTranslate,
  binId: PrepositionBinId
): string => translate(`englishPrepositions.inRound.sort.bins.${binId}.description`);

const shuffle = <T,>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);

const buildRoundState = (round: Round): RoundState => ({
  pool: shuffle(round.tokens),
  bins: round.bins.reduce<RoundState['bins']>((acc, binId) => {
    acc[binId] = [];
    return acc;
  }, {}),
});

const binIdForDroppable = (binId: PrepositionBinId): string => `bin-${binId}`;
const isBinDroppable = (value: string): boolean => value.startsWith('bin-');
const getBinIdFromDroppable = (value: string): PrepositionBinId =>
  value.replace('bin-', '') as PrepositionBinId;

const moveWithinList = <T,>(items: T[], from: number, to: number): T[] => {
  const updated = [...items];
  const [moved] = updated.splice(from, 1);
  if (moved === undefined) return updated;
  updated.splice(to, 0, moved);
  return updated;
};

const moveBetweenLists = <T,>(
  source: T[],
  destination: T[],
  sourceIndex: number,
  destinationIndex: number
): { source: T[]; destination: T[] } => {
  const nextSource = [...source];
  const nextDestination = [...destination];
  const [moved] = nextSource.splice(sourceIndex, 1);
  if (!moved) {
    return { source, destination };
  }
  nextDestination.splice(destinationIndex, 0, moved);
  return { source: nextSource, destination: nextDestination };
};

const removeTokenById = <T extends { id: string }>(
  items: T[],
  tokenId: string
): { updated: T[]; token?: T } => {
  const index = items.findIndex((item) => item.id === tokenId);
  if (index === -1) {
    return { updated: items };
  }
  const updated = [...items];
  const [token] = updated.splice(index, 1);
  return { updated, token };
};

const resolveRoundVisual = (round: Round): React.JSX.Element => {
  if (round.visual === 'place') return <EnglishPrepositionsPlaceAnimation />;
  if (round.visual === 'relation') return <EnglishPrepositionsRelationsDiagram />;
  return <EnglishPrepositionsTimeAnimation />;
};

const countRoundCorrect = (round: Round, state: RoundState): number => {
  return round.bins.reduce((sum, binId) => {
    const items = state.bins[binId] ?? [];
    return sum + items.filter((item) => item.answer === binId).length;
  }, 0);
};

const buildExpectedCounts = (round: Round): Partial<Record<PrepositionBinId, number>> =>
  round.tokens.reduce((acc, token) => {
    acc[token.answer] = (acc[token.answer] ?? 0) + 1;
    return acc;
  }, {} as Partial<Record<PrepositionBinId, number>>);

export default function EnglishPrepositionsSortGame({
  finishLabel,
  onFinish,
}: KangurMiniGameFinishProps): React.JSX.Element {
  const translations = useTranslations('KangurMiniGames');
  const isCoarsePointer = useKangurCoarsePointer();
  const resolvedFinishLabel = finishLabel ?? getKangurMiniGameFinishLabel(translations, 'topics');
  const [roundIndex, setRoundIndex] = useState(0);
  const [roundState, setRoundState] = useState<RoundState>(() => buildRoundState(ROUNDS[0]!));
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
  const expectedCounts = useMemo(() => buildExpectedCounts(round), [round]);
  const selectedToken = useMemo(() => {
    if (!selectedTokenId) return null;
    return (
      roundState.pool.find((token) => token.id === selectedTokenId) ??
      Object.values(roundState.bins)
        .flatMap((items) => items ?? [])
        .find((token) => token.id === selectedTokenId) ??
      null
    );
  }, [roundState.bins, roundState.pool, selectedTokenId]);

  useEffect(() => {
    setRoundState(buildRoundState(round));
    setChecked(false);
    setRoundCorrect(0);
    setFeedback(null);
    setSelectedTokenId(null);
  }, [round]);

  const isRoundComplete = roundState.pool.length === 0;

  const handleAssignToken = (binId: PrepositionBinId): void => {
    if (checked || !selectedTokenId) return;
    setRoundState((prev) => {
      let token: PrepositionToken | undefined;
      const { updated: nextPool, token: poolToken } = removeTokenById(prev.pool, selectedTokenId);
      token = poolToken;
      const nextBins = { ...prev.bins };
      if (!token) {
        for (const [id, items] of Object.entries(prev.bins)) {
          const { updated, token: binToken } = removeTokenById(items ?? [], selectedTokenId);
          if (binToken) {
            token = binToken;
            nextBins[id as PrepositionBinId] = updated;
            break;
          }
        }
      }
      if (!token) return prev;
      return {
        pool: nextPool,
        bins: {
          ...nextBins,
          [binId]: [...(nextBins[binId] ?? []), token],
        },
      };
    });
    setSelectedTokenId(null);
  };

  const handleReturnToPool = (): void => {
    if (checked || !selectedTokenId) return;
    setRoundState((prev) => {
      let token: PrepositionToken | undefined;
      const { updated: nextPool, token: poolToken } = removeTokenById(prev.pool, selectedTokenId);
      token = poolToken;
      const nextBins = { ...prev.bins };
      if (!token) {
        for (const [id, items] of Object.entries(prev.bins)) {
          const { updated, token: binToken } = removeTokenById(items ?? [], selectedTokenId);
          if (binToken) {
            token = binToken;
            nextBins[id as PrepositionBinId] = updated;
            break;
          }
        }
      }
      if (!token) return prev;
      return {
        pool: [...nextPool, token],
        bins: nextBins,
      };
    });
    setSelectedTokenId(null);
  };

  const handleDragEnd = (result: DropResult): void => {
    const { source, destination } = result;
    if (!destination || checked) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (source.droppableId !== 'pool' && !isBinDroppable(source.droppableId)) return;
    if (destination.droppableId !== 'pool' && !isBinDroppable(destination.droppableId)) return;

    setRoundState((prev) => {
      const sourceId = source.droppableId;
      const destinationId = destination.droppableId;
      const sourceList =
        sourceId === 'pool' ? prev.pool : prev.bins[getBinIdFromDroppable(sourceId)] ?? [];
      const destinationList =
        destinationId === 'pool'
          ? prev.pool
          : prev.bins[getBinIdFromDroppable(destinationId)] ?? [];

      if (sourceId === destinationId) {
        const reordered = moveWithinList(sourceList, source.index, destination.index);
        if (sourceId === 'pool') {
          return { ...prev, pool: reordered };
        }
        return {
          ...prev,
          bins: {
            ...prev.bins,
            [getBinIdFromDroppable(sourceId)]: reordered,
          },
        };
      }

      const { source: nextSource, destination: nextDestination } = moveBetweenLists(
        sourceList,
        destinationList,
        source.index,
        destination.index
      );

      return {
        ...prev,
        pool: sourceId === 'pool' ? nextSource : destinationId === 'pool' ? nextDestination : prev.pool,
        bins: {
          ...prev.bins,
          ...(sourceId !== 'pool' ? { [getBinIdFromDroppable(sourceId)]: nextSource } : null),
          ...(destinationId !== 'pool'
            ? { [getBinIdFromDroppable(destinationId)]: nextDestination }
            : null),
        },
      };
    });
    setSelectedTokenId(null);
  };

  const handleReset = (): void => {
    setRoundState(buildRoundState(round));
    setChecked(false);
    setRoundCorrect(0);
    setFeedback(null);
    setSelectedTokenId(null);
  };

  const handleCheck = (): void => {
    if (!isRoundComplete || checked) return;
    const correct = countRoundCorrect(round, roundState);
    setRoundCorrect(correct);
    const isPerfect = correct === round.tokens.length;
    setFeedback({
      kind: isPerfect ? 'success' : 'error',
      text: isPerfect
        ? translations('englishPrepositions.inRound.sort.feedback.perfect')
        : translations('englishPrepositions.inRound.sort.feedback.retry'),
    });
    setSelectedTokenId(null);
    setChecked(true);
  };

  const handleNext = (): void => {
    if (!checked) return;
    const nextTotal = totalCorrect + roundCorrect;
    setTotalCorrect(nextTotal);
    if (roundIndex + 1 >= TOTAL_ROUNDS) {
      const progress = loadProgress();
      const reward = createLessonPracticeReward(progress, {
        activityKey: 'english_prepositions_sort',
        lessonKey: 'english_prepositions_time_place',
        correctAnswers: nextTotal,
        totalQuestions: TOTAL_TOKENS,
        strongThresholdPercent: 75,
      });
      addXp(reward.xp, reward.progressUpdates);
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
    setRoundState(buildRoundState(ROUNDS[0]!));
    setChecked(false);
    setRoundCorrect(0);
    setTotalCorrect(0);
    setFeedback(null);
    setDone(false);
    setXpEarned(0);
    setXpBreakdown([]);
    sessionStartedAtRef.current = Date.now();
  };

  if (done) {
    const percent = Math.round((totalCorrect / TOTAL_TOKENS) * 100);
    return (
      <KangurPracticeGameSummary dataTestId='english-prepositions-sort-summary-shell'>
        <KangurPracticeGameSummaryEmoji
          dataTestId='english-prepositions-sort-summary-emoji'
          emoji={percent === 100 ? '🏆' : percent >= 70 ? '🌟' : '💪'}
        />
        <KangurPracticeGameSummaryTitle
          accent='rose'
          title={
            <KangurHeadline data-testid='english-prepositions-sort-summary-title'>
              {getKangurMiniGameScoreLabel(translations, totalCorrect, TOTAL_TOKENS)}
            </KangurHeadline>
          }
        />
        <KangurPracticeGameSummaryXP accent='rose' xpEarned={xpEarned} />
        <KangurPracticeGameSummaryBreakdown
          breakdown={xpBreakdown}
          dataTestId='english-prepositions-sort-summary-breakdown'
          itemDataTestIdPrefix='english-prepositions-sort-summary-breakdown'
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
        dataTestId='english-prepositions-sort-progress-bar'
        totalRounds={TOTAL_ROUNDS}
      />
      <KangurDragDropContext onDragEnd={handleDragEnd}>
        <KangurGlassPanel
          className={cn('w-full', KANGUR_PANEL_GAP_CLASSNAME)}
          padding='lg'
          surface='playField'
        >
          <div className='relative overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(140deg,#fff1f2_0%,#fef9c3_55%,#ede9fe_100%)] p-4'>
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
                      ? 'englishPrepositions.inRound.sort.modeLabelTouch'
                      : 'englishPrepositions.inRound.sort.modeLabel'
                  )}
                </KangurStatusChip>
              </div>
              <div className={`${KANGUR_GRID_SPACED_CLASSNAME} sm:grid-cols-[1.1fr_0.9fr] sm:items-center`}>
                <div>
                  <p className='text-lg font-bold text-slate-800'>
                    {getPrepositionsSortTitle(translations, round.id)}
                  </p>
                  <p className='text-sm text-slate-600'>
                    {getPrepositionsSortPrompt(translations, round.id)}
                  </p>
                  <p className='mt-1 text-xs font-semibold text-slate-500'>
                    {getPrepositionsSortHint(translations, round.id)}
                  </p>
                </div>
                <div className='rounded-[18px] border border-white/70 bg-white/80 p-2'>
                  {resolveRoundVisual(round)}
                </div>
              </div>
            </div>
          </div>

          <KangurInfoCard accent='slate' className='w-full' padding='md' tone='neutral'>
            <p className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 text-center'>
              {translations('englishPrepositions.inRound.sort.poolLabel')}
            </p>
            <Droppable droppableId='pool' direction='horizontal'>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  data-testid='english-prepositions-sort-pool-zone'
                  className={cn(
                    'mt-3 flex flex-wrap items-center justify-center gap-2 rounded-[20px] border-2 border-dashed px-3 py-3 transition touch-manipulation',
                    isCoarsePointer ? 'min-h-[92px]' : 'min-h-[72px]',
                    snapshot.isDraggingOver
                      ? 'border-amber-300 bg-amber-50/70'
                      : selectedToken && !checked && isCoarsePointer
                        ? 'border-amber-200 bg-amber-50/40'
                        : 'border-slate-200'
                  )}
                  onClick={handleReturnToPool}
                  role='button'
                  tabIndex={checked ? -1 : 0}
                  aria-disabled={checked}
                  aria-label={translations('englishPrepositions.inRound.sort.poolAria')}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleReturnToPool();
                    }
                  }}
                >
                  {roundState.pool.map((token, index) => (
                    <DraggableToken
                      key={token.id}
                      token={token}
                      index={index}
                      isDragDisabled={checked}
                      isSelected={selectedTokenId === token.id}
                      isCoarsePointer={isCoarsePointer}
                      onClick={() =>
                        setSelectedTokenId((current) => (current === token.id ? null : token.id))
                      }
                    />
                  ))}
                  {provided.placeholder}
                  {roundState.pool.length === 0 ? (
                    <p className='text-xs font-semibold text-slate-400'>
                      {translations('englishPrepositions.inRound.sort.poolEmpty')}
                    </p>
                  ) : null}
                </div>
              )}
            </Droppable>
          </KangurInfoCard>

          <div className='grid w-full grid-cols-1 gap-3 sm:grid-cols-3'>
            {round.bins.map((binId) => {
              const bin = BINS[binId];
              const items = roundState.bins[binId] ?? [];
              const expected = expectedCounts[binId] ?? 0;
              const isCorrect =
                items.length === expected && items.every((item) => item.answer === binId);
              const surfaceClass = checked
                ? isCorrect
                  ? 'border-emerald-300 bg-emerald-50/70'
                  : 'border-rose-300 bg-rose-50/70'
                : 'border-slate-200 bg-white/70';
              return (
                <Droppable key={binId} droppableId={binIdForDroppable(binId)}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      data-testid={`english-prepositions-sort-bin-${binId}`}
                      className={cn(
                        'rounded-[20px] border p-3 transition touch-manipulation',
                        isCoarsePointer ? 'min-h-[172px]' : 'min-h-[150px]',
                        surfaceClass,
                        selectedToken && !checked && isCoarsePointer
                          ? 'border-amber-200 bg-amber-50/35'
                          : undefined,
                        snapshot.isDraggingOver && !checked
                          ? KANGUR_ACCENT_STYLES[bin.accent].activeCard
                          : undefined
                      )}
                      onClick={() => handleAssignToken(binId)}
                        role='button'
                        tabIndex={checked ? -1 : 0}
                        aria-disabled={checked}
                        aria-label={translations('englishPrepositions.inRound.sort.binAria', {
                          label: bin.label,
                        })}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleAssignToken(binId);
                        }
                      }}
                    >
                      <div className='flex items-center justify-between gap-2'>
                        <div className={`${KANGUR_CENTER_ROW_CLASSNAME} text-sm font-bold text-slate-700`}>
                          <span className='text-lg' aria-hidden='true'>
                            {bin.emoji}
                          </span>
                          {bin.label}
                        </div>
                        {checked ? (
                          <KangurStatusChip accent={isCorrect ? 'emerald' : 'rose'} size='sm'>
                            {items.length}/{expected}
                          </KangurStatusChip>
                        ) : null}
                      </div>
                      <p className='mt-1 text-xs text-slate-500'>
                        {getPrepositionsBinDescription(translations, binId)}
                      </p>
                      <div className={`mt-3 ${KANGUR_WRAP_ROW_CLASSNAME}`}>
                        {items.map((item, index) => (
                          <DraggableToken
                            key={item.id}
                            token={item}
                            index={index}
                            isDragDisabled={checked}
                            isSelected={selectedTokenId === item.id}
                            isCoarsePointer={isCoarsePointer}
                            onClick={() =>
                              setSelectedTokenId((current) => (current === item.id ? null : item.id))
                            }
                            accent={bin.accent}
                            showStatus={checked}
                            isCorrect={item.answer === binId}
                          />
                        ))}
                        {provided.placeholder}
                        {checked && items.length === 0 ? (
                          <p className='text-xs font-semibold text-rose-600'>
                            {translations('englishPrepositions.inRound.sort.missingPhrases')}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>

          {isCoarsePointer || selectedToken ? (
            <KangurInfoCard accent='slate' className='w-full' padding='sm' tone='neutral'>
              <p
                className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'
                role='status'
                aria-live='polite'
                aria-atomic='true'
                data-testid='english-prepositions-sort-selection-hint'
              >
                {selectedToken
                  ? translations('englishPrepositions.inRound.sort.touchSelected', {
                      label: selectedToken.label,
                    })
                  : translations('englishPrepositions.inRound.sort.touchIdle')}
              </p>
            </KangurInfoCard>
          ) : null}

          {feedback ? (
            <KangurInfoCard accent={feedbackAccent} tone='accent' padding='sm' className='text-sm'>
              {feedback.text}
            </KangurInfoCard>
          ) : null}

          <div className='flex w-full flex-wrap items-center justify-between gap-3'>
            <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
              <KangurButton size='sm' type='button' variant='surface' onClick={handleReset} disabled={checked}>
                {translations('englishPrepositions.inRound.sort.clearRound')}
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
              <KangurButton size='sm' type='button' variant='primary' onClick={handleCheck} disabled={!isRoundComplete}>
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
  isDragDisabled,
  accent = 'slate',
  showStatus = false,
  isCorrect = true,
  isSelected = false,
  isCoarsePointer = false,
  onClick,
}: {
  token: PrepositionToken;
  index: number;
  isDragDisabled: boolean;
  accent?: KangurAccent;
  showStatus?: boolean;
  isCorrect?: boolean;
  isSelected?: boolean;
  isCoarsePointer?: boolean;
  onClick?: () => void;
}): React.JSX.Element {
  const statusClass = showStatus ? (isCorrect ? 'border-emerald-300' : 'border-rose-300') : '';
  const selectedClass = isSelected
    ? 'ring-2 ring-amber-400/80 ring-offset-1 ring-offset-white'
    : '';
  return (
    <Draggable
      draggableId={token.id}
      index={index}
      isDragDisabled={isDragDisabled}
      disableInteractiveElementBlocking
    >
      {(provided, snapshot) => (
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
            isCoarsePointer ? 'min-h-[3.75rem] px-4 py-3 touch-manipulation' : undefined,
            KANGUR_ACCENT_STYLES[accent].badge,
            snapshot.isDragging && 'scale-[1.02] shadow-lg',
            statusClass,
            selectedClass
          )}
          aria-label={token.label}
          aria-disabled={isDragDisabled}
          aria-pressed={isSelected}
          title={token.label}
          onClick={(event) => {
            event.stopPropagation();
            if (snapshot.isDragging || isDragDisabled) return;
            onClick?.();
          }}
        >
          {token.label}
        </button>
      )}
    </Draggable>
  );
}
