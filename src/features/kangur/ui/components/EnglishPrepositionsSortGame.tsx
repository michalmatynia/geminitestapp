'use client';

import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
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
  addXp,
  createLessonPracticeReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import type { KangurRewardBreakdownEntry } from '@/features/kangur/ui/types';
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
  title: string;
  prompt: string;
  hint: string;
  accent: KangurAccent;
  tokens: PrepositionToken[];
  visual: 'time' | 'place' | 'relation';
  bins: PrepositionBinId[];
};

type RoundState = {
  pool: PrepositionToken[];
  bins: Partial<Record<PrepositionBinId, PrepositionToken[]>>;
};

type FeedbackState = {
  kind: 'success' | 'error';
  text: string;
};

type EnglishPrepositionsSortGameProps = {
  finishLabel?: string;
  onFinish: () => void;
};

const BINS: Record<
  PrepositionBinId,
  { label: string; description: string; accent: KangurAccent; emoji: string }
> = {
  at: {
    label: 'AT',
    description: 'punkt w czasie / miejscu',
    accent: 'rose',
    emoji: '📍',
  },
  on: {
    label: 'ON',
    description: 'dzień / powierzchnia',
    accent: 'amber',
    emoji: '🧩',
  },
  in: {
    label: 'IN',
    description: 'miesiąc / wnętrze',
    accent: 'violet',
    emoji: '📦',
  },
  between: {
    label: 'BETWEEN',
    description: 'pomiędzy',
    accent: 'indigo',
    emoji: '↔️',
  },
  above: {
    label: 'ABOVE',
    description: 'nad',
    accent: 'sky',
    emoji: '⬆️',
  },
  below: {
    label: 'BELOW',
    description: 'pod',
    accent: 'teal',
    emoji: '⬇️',
  },
};

const ROUNDS: Round[] = [
  {
    id: 'time-sort',
    title: 'Time sorting',
    prompt: 'Przeciągnij zwroty do właściwego przyimka czasu.',
    hint: 'Godziny = at, dni = on, miesiące = in.',
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
    title: 'Place sorting',
    prompt: 'Przeciągnij zwroty do właściwego przyimka miejsca.',
    hint: 'Punkt = at, powierzchnia = on, wnętrze = in.',
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
    title: 'Relations sorting',
    prompt: 'Przeciągnij zwroty do właściwej relacji przestrzennej.',
    hint: 'between = pomiędzy, above = nad, below = pod.',
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
  finishLabel = 'Wróć do tematów',
  onFinish,
}: EnglishPrepositionsSortGameProps): React.JSX.Element {
  const [roundIndex, setRoundIndex] = useState(0);
  const [roundState, setRoundState] = useState<RoundState>(() => buildRoundState(ROUNDS[0]!));
  const [checked, setChecked] = useState(false);
  const [roundCorrect, setRoundCorrect] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const sessionStartedAtRef = useRef(Date.now());

  const round = ROUNDS[roundIndex] ?? ROUNDS[0]!;
  const expectedCounts = useMemo(() => buildExpectedCounts(round), [round]);

  useEffect(() => {
    setRoundState(buildRoundState(round));
    setChecked(false);
    setRoundCorrect(0);
    setFeedback(null);
  }, [round]);

  const isRoundComplete = roundState.pool.length === 0;

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
  };

  const handleReset = (): void => {
    setRoundState(buildRoundState(round));
    setChecked(false);
    setRoundCorrect(0);
    setFeedback(null);
  };

  const handleCheck = (): void => {
    if (!isRoundComplete || checked) return;
    const correct = countRoundCorrect(round, roundState);
    setRoundCorrect(correct);
    const isPerfect = correct === round.tokens.length;
    setFeedback({
      kind: isPerfect ? 'success' : 'error',
      text: isPerfect ? 'Perfekcyjnie! Wszystko na miejscu.' : 'Sprawdź oznaczone przyimki.',
    });
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
              Wynik: {totalCorrect}/{TOTAL_TOKENS}
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
    <KangurPracticeGameStage className='mx-auto max-w-3xl'>
      <KangurPracticeGameProgress
        accent={round.accent}
        currentRound={roundIndex}
        dataTestId='english-prepositions-sort-progress-bar'
        totalRounds={TOTAL_ROUNDS}
      />
      <DragDropContext onDragEnd={handleDragEnd}>
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
                  Round {roundIndex + 1}/{TOTAL_ROUNDS}
                </KangurStatusChip>
                <KangurStatusChip accent='slate' className='text-[10px] uppercase tracking-[0.16em]'>
                  Drag & Drop
                </KangurStatusChip>
              </div>
              <div className={`${KANGUR_GRID_SPACED_CLASSNAME} sm:grid-cols-[1.1fr_0.9fr] sm:items-center`}>
                <div>
                  <p className='text-lg font-bold text-slate-800'>{round.title}</p>
                  <p className='text-sm text-slate-600'>{round.prompt}</p>
                  <p className='mt-1 text-xs font-semibold text-slate-500'>{round.hint}</p>
                </div>
                <div className='rounded-[18px] border border-white/70 bg-white/80 p-2'>
                  {resolveRoundVisual(round)}
                </div>
              </div>
            </div>
          </div>

          <KangurInfoCard accent='slate' className='w-full' padding='md' tone='neutral'>
            <p className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 text-center'>
              Pool of phrases
            </p>
            <Droppable droppableId='pool' direction='horizontal'>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    'mt-3 flex min-h-[72px] flex-wrap items-center justify-center gap-2 rounded-[20px] border-2 border-dashed px-3 py-3 transition',
                    snapshot.isDraggingOver ? 'border-amber-300 bg-amber-50/70' : 'border-slate-200'
                  )}
                  aria-label='Pula zwrotów do sortowania'
                >
                  {roundState.pool.map((token, index) => (
                    <DraggableToken key={token.id} token={token} index={index} isDragDisabled={checked} />
                  ))}
                  {provided.placeholder}
                  {roundState.pool.length === 0 ? (
                    <p className='text-xs font-semibold text-slate-400'>Pula pusta</p>
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
                      className={cn(
                        'min-h-[150px] rounded-[20px] border p-3 transition',
                        surfaceClass,
                        snapshot.isDraggingOver && !checked
                          ? KANGUR_ACCENT_STYLES[bin.accent].activeCard
                          : undefined
                      )}
                      aria-label={`${bin.label} bin`}
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
                      <p className='mt-1 text-xs text-slate-500'>{bin.description}</p>
                      <div className={`mt-3 ${KANGUR_WRAP_ROW_CLASSNAME}`}>
                        {items.map((item, index) => (
                          <DraggableToken
                            key={item.id}
                            token={item}
                            index={index}
                            isDragDisabled={checked}
                            accent={bin.accent}
                            showStatus={checked}
                            isCorrect={item.answer === binId}
                          />
                        ))}
                        {provided.placeholder}
                        {checked && items.length === 0 ? (
                          <p className='text-xs font-semibold text-rose-600'>Brakuje zwrotów</p>
                        ) : null}
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>

          {feedback ? (
            <KangurInfoCard accent={feedbackAccent} tone='accent' padding='sm' className='text-sm'>
              {feedback.text}
            </KangurInfoCard>
          ) : null}

          <div className='flex w-full flex-wrap items-center justify-between gap-3'>
            <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
              <KangurButton size='sm' type='button' variant='surface' onClick={handleReset} disabled={checked}>
                Wyczyść rundę
              </KangurButton>
              {checked ? (
                <KangurStatusChip accent={feedbackAccent}>
                  {roundCorrect}/{round.tokens.length} trafień
                </KangurStatusChip>
              ) : null}
            </div>
            {!checked ? (
              <KangurButton size='sm' type='button' variant='primary' onClick={handleCheck} disabled={!isRoundComplete}>
                Sprawdź
              </KangurButton>
            ) : (
              <KangurButton size='sm' type='button' variant='primary' onClick={handleNext}>
                {roundIndex + 1 >= TOTAL_ROUNDS ? 'Zobacz wynik' : 'Dalej'}
              </KangurButton>
            )}
          </div>
        </KangurGlassPanel>
      </DragDropContext>
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
}: {
  token: PrepositionToken;
  index: number;
  isDragDisabled: boolean;
  accent?: KangurAccent;
  showStatus?: boolean;
  isCorrect?: boolean;
}): React.JSX.Element {
  const statusClass = showStatus ? (isCorrect ? 'border-emerald-300' : 'border-rose-300') : '';
  return (
    <Draggable draggableId={token.id} index={index} isDragDisabled={isDragDisabled}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            'rounded-[16px] border px-3 py-2 text-sm font-semibold shadow-sm transition',
            KANGUR_ACCENT_STYLES[accent].badge,
            snapshot.isDragging && 'scale-[1.02] shadow-lg',
            statusClass
          )}
        >
          {token.label}
        </div>
      )}
    </Draggable>
  );
}
