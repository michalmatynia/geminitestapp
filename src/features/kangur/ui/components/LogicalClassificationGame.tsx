'use client';

import { Draggable, Droppable } from '@hello-pangea/dnd';
import { useTranslations } from 'next-intl';
import { createPortal } from 'react-dom';
import { useMemo, useRef, useState } from 'react';
import { KangurDragDropContext } from '@/features/kangur/ui/components/KangurDragDropContext';

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
} from '@/features/kangur/ui/constants/mini-game-i18n';
import {
  KangurButton,
  KangurInfoCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_CENTER_ROW_CLASSNAME,
  KANGUR_STACK_ROW_CLASSNAME,
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
import type {
  KangurMiniGameFinishProps,
  KangurRewardBreakdownEntry,
} from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

import {
  LOGICAL_CLASSIFICATION_ROUNDS,
  type ClassificationItem,
  type ClassificationRound,
  type ClassificationSortRound,
} from './logical-classification-game-data';

import type { DropResult } from '@hello-pangea/dnd';

type LogicalClassificationGameProps = KangurMiniGameFinishProps;

type RoundState = {
  pool: ClassificationItem[];
  bins: Record<string, ClassificationItem[]>;
};

const dragPortal = typeof document === 'undefined' ? null : document.body;

const TOTAL_ROUNDS = Math.max(LOGICAL_CLASSIFICATION_ROUNDS.length, 1);
const TOTAL_TARGETS = LOGICAL_CLASSIFICATION_ROUNDS.reduce(
  (sum, round) => sum + (round.type === 'sort' ? round.items.length : 1),
  0
);
const FALLBACK_ROUND: ClassificationRound = {
  type: 'sort',
  id: 'fallback',
  title: 'Klasyfikacja',
  prompt: 'Brak danych do gry.',
  hint: 'Przeciągnij elementy do grup.',
  bins: [],
  items: [],
};
const FIRST_ROUND = LOGICAL_CLASSIFICATION_ROUNDS[0] ?? FALLBACK_ROUND;

const shuffle = <T,>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);

const isSortRound = (round: ClassificationRound): round is ClassificationSortRound =>
  round.type === 'sort';

const buildRoundState = (round: ClassificationRound): RoundState => {
  if (!isSortRound(round)) {
    return { pool: [], bins: {} };
  }
  const pool = shuffle(round.items);
  const bins = round.bins.reduce<Record<string, ClassificationItem[]>>((acc, bin) => {
    acc[bin.id] = [];
    return acc;
  }, {});
  return { pool, bins };
};

const binIdForDroppable = (binId: string): string => `bin-${binId}`;
const isBinDroppable = (value: string): boolean => value.startsWith('bin-');
const getBinIdFromDroppable = (value: string): string => value.replace('bin-', '');

const removeTokenById = (
  items: ClassificationItem[],
  tokenId: string
): { updated: ClassificationItem[]; token?: ClassificationItem } => {
  const index = items.findIndex((item) => item.id === tokenId);
  if (index < 0) {
    return { updated: items };
  }
  const updated = [...items];
  const [token] = updated.splice(index, 1);
  return { updated, token };
};

const moveWithinList = <T,>(items: T[], from: number, to: number): T[] => {
  const updated = [...items];
  const [moved] = updated.splice(from, 1);
  if (moved === undefined) return items;
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

const buildTokenClassName = ({
  accent,
  isSelected,
  isDragging,
  isDisabled,
  size,
}: {
  accent: KangurAccent;
  isSelected: boolean;
  isDragging: boolean;
  isDisabled: boolean;
  size?: ClassificationItem['size'];
}): string => {
  const sizeClass =
    size === 'lg' ? 'text-2xl px-4 py-2' : size === 'sm' ? 'text-lg px-3 py-1.5' : 'text-xl px-3.5 py-2';
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-[18px] border font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white',
    sizeClass,
    KANGUR_ACCENT_STYLES[accent].badge,
    !isDisabled && KANGUR_ACCENT_STYLES[accent].hoverCard,
    isSelected && 'ring-2 ring-teal-400/70 ring-offset-1 ring-offset-transparent',
    isDragging && 'scale-[1.02] shadow-[0_18px_40px_-24px_rgba(13,148,136,0.35)]',
    isDisabled ? 'cursor-default opacity-80' : 'cursor-pointer'
  );
};

const resolveBinStatus = ({
  checked,
  isDraggingOver,
  isCorrect,
}: {
  checked: boolean;
  isDraggingOver: boolean;
  isCorrect: boolean;
}): { accent: KangurAccent; className: string } => {
  const focusRingClassName =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white';
  if (checked) {
    return {
      accent: isCorrect ? 'emerald' : 'rose',
      className: cn(
        'rounded-[22px] border px-3 py-3 transition min-h-[90px]',
        focusRingClassName,
        isCorrect
          ? KANGUR_ACCENT_STYLES.emerald.activeCard
          : KANGUR_ACCENT_STYLES.rose.activeCard
      ),
    };
  }

  if (isDraggingOver) {
    return {
      accent: 'teal',
      className: cn(
        'rounded-[22px] border border-teal-300 bg-teal-100/70 px-3 py-3 transition min-h-[90px] scale-[1.01]',
        focusRingClassName
      ),
    };
  }

  return {
    accent: 'teal',
    className: cn(
      'rounded-[22px] border border-dashed border-teal-300/70 px-3 py-3 transition min-h-[90px]',
      focusRingClassName,
      KANGUR_ACCENT_STYLES.teal.hoverCard
    ),
  };
};

function DraggableToken({
  item,
  index,
  isDragDisabled,
  isSelected,
  onClick,
  className,
  showStatus,
  isCorrect,
}: {
  item: ClassificationItem;
  index: number;
  isDragDisabled: boolean;
  isSelected: boolean;
  onClick: () => void;
  className?: string;
  showStatus?: boolean;
  isCorrect?: boolean;
}): React.ReactElement | React.ReactPortal {
  return (
    <Draggable
      draggableId={item.id}
      index={index}
      isDragDisabled={isDragDisabled}
      disableInteractiveElementBlocking
    >
      {(draggableProvided, snapshot) => {
        const content = (
          <button
            type='button'
            ref={draggableProvided.innerRef}
            {...draggableProvided.draggableProps}
            {...draggableProvided.dragHandleProps}
            className={cn(
              buildTokenClassName({
                accent: item.accent,
                isSelected,
                isDragging: snapshot.isDragging,
                isDisabled: isDragDisabled,
                size: item.size,
              }),
              showStatus &&
                (isCorrect
                  ? 'ring-2 ring-emerald-400/80 ring-offset-1 ring-offset-transparent'
                  : 'ring-2 ring-rose-400/80 ring-offset-1 ring-offset-transparent'),
              className
            )}
            aria-pressed={isSelected}
            aria-label={item.label}
            title={item.label}
            onClick={(event) => {
              event.stopPropagation();
              if (snapshot.isDragging) return;
              if (!isDragDisabled) onClick();
            }}
          >
            <span className={item.emoji.match(/^\d+$/) ? 'text-lg font-bold' : undefined}>
              {item.emoji}
            </span>
          </button>
        );

        if (snapshot.isDragging && dragPortal) {
          return createPortal(content, dragPortal);
        }
        return content;
      }}
    </Draggable>
  );
}

export default function LogicalClassificationGame({
  finishLabel = 'Wróć do tematów',
  onFinish,
}: LogicalClassificationGameProps): React.JSX.Element {
  const translations = useTranslations('KangurMiniGames');
  const summaryFinishLabel =
    finishLabel === 'Wróć do tematów'
      ? getKangurMiniGameFinishLabel(translations, 'topics')
      : finishLabel;
  const handleFinish = onFinish;
  const [roundIndex, setRoundIndex] = useState(0);
  const [roundState, setRoundState] = useState<RoundState>(() => buildRoundState(FIRST_ROUND));
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [selectedIntruderId, setSelectedIntruderId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [roundCorrect, setRoundCorrect] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const sessionStartedAtRef = useRef(Date.now());

  const round = LOGICAL_CLASSIFICATION_ROUNDS[roundIndex] ?? FIRST_ROUND;

  const expectedByBin = useMemo(() => {
    if (!isSortRound(round)) return {};
    return round.bins.reduce<Record<string, Set<string>>>((acc, bin) => {
      acc[bin.id] = new Set(
        round.items
          .filter((item) => bin.acceptGroups.includes(item.group))
          .map((item) => item.id)
      );
      return acc;
    }, {});
  }, [round]);

  const isRoundComplete = isSortRound(round) ? roundState.pool.length === 0 : selectedIntruderId !== null;

  const resetRound = (): void => {
    setRoundState(buildRoundState(round));
    setSelectedTokenId(null);
    setSelectedIntruderId(null);
    setChecked(false);
    setRoundCorrect(0);
  };

  const finalizeRound = (correctCount: number): void => {
    setRoundCorrect(correctCount);
    setScore((prev) => prev + correctCount);
    setChecked(true);
    setSelectedTokenId(null);
  };

  const goToNextRound = (): void => {
    if (roundIndex + 1 >= TOTAL_ROUNDS) {
      if (TOTAL_TARGETS > 0) {
        const progress = loadProgress();
        const reward = createLessonPracticeReward(
          progress,
          'logical_classification',
          score,
          TOTAL_TARGETS
        );
        addXp(reward.xp, reward.progressUpdates);
        void persistKangurSessionScore({
          operation: 'logical',
          score,
          totalQuestions: TOTAL_TARGETS,
          correctAnswers: score,
          timeTakenSeconds: Math.round((Date.now() - sessionStartedAtRef.current) / 1000),
          xpEarned: reward.xp,
        });
        setXpEarned(reward.xp);
        setXpBreakdown(reward.breakdown ?? []);
      }
      setDone(true);
      return;
    }

    const nextIndex = roundIndex + 1;
    const nextRound = LOGICAL_CLASSIFICATION_ROUNDS[nextIndex] ?? FIRST_ROUND;
    setRoundIndex(nextIndex);
    setRoundState(buildRoundState(nextRound));
    setSelectedTokenId(null);
    setSelectedIntruderId(null);
    setChecked(false);
    setRoundCorrect(0);
  };

  const handleAssignToken = (binId: string): void => {
    if (checked || !selectedTokenId || !isSortRound(round)) return;
    setRoundState((prev) => {
      let token: ClassificationItem | undefined;
      const { updated: nextPool, token: poolToken } = removeTokenById(prev.pool, selectedTokenId);
      token = poolToken;
      const nextBins = { ...prev.bins };
      if (!token) {
        for (const [id, items] of Object.entries(prev.bins)) {
          const { updated, token: binToken } = removeTokenById(items, selectedTokenId);
          if (binToken) {
            token = binToken;
            nextBins[id] = updated;
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
    if (checked || !selectedTokenId || !isSortRound(round)) return;
    setRoundState((prev) => {
      let token: ClassificationItem | undefined;
      const { updated: nextPool, token: poolToken } = removeTokenById(prev.pool, selectedTokenId);
      token = poolToken;
      const nextBins = { ...prev.bins };
      if (!token) {
        for (const [id, items] of Object.entries(prev.bins)) {
          const { updated, token: binToken } = removeTokenById(items, selectedTokenId);
          if (binToken) {
            token = binToken;
            nextBins[id] = updated;
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

  const handleCheck = (): void => {
    if (checked || !isSortRound(round)) return;
    const correctCount = round.bins.reduce((acc, bin) => {
      const assigned = roundState.bins[bin.id] ?? [];
      const correct = assigned.filter((item) => bin.acceptGroups.includes(item.group)).length;
      return acc + correct;
    }, 0);
    finalizeRound(correctCount);
  };

  const handleIntruderSelect = (itemId: string): void => {
    if (checked || round.type !== 'intruder') return;
    setSelectedIntruderId(itemId);
    const isCorrect = itemId === round.intruderId;
    finalizeRound(isCorrect ? 1 : 0);
  };

  const onDragEnd = (result: DropResult): void => {
    if (checked || !isSortRound(round)) return;
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    if (source.droppableId !== 'pool' && !isBinDroppable(source.droppableId)) return;
    if (destination.droppableId !== 'pool' && !isBinDroppable(destination.droppableId)) return;

    setRoundState((prev) => {
      const sourceId = source.droppableId;
      const destinationId = destination.droppableId;
      const sourceList =
        sourceId === 'pool' ? prev.pool : prev.bins[getBinIdFromDroppable(sourceId)] ?? [];
      const destinationList =
        destinationId === 'pool' ? prev.pool : prev.bins[getBinIdFromDroppable(destinationId)] ?? [];

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

      if (sourceId === 'pool') {
        return {
          pool: nextSource,
          bins: {
            ...prev.bins,
            [getBinIdFromDroppable(destinationId)]: nextDestination,
          },
        };
      }

      if (destinationId === 'pool') {
        return {
          pool: nextDestination,
          bins: {
            ...prev.bins,
            [getBinIdFromDroppable(sourceId)]: nextSource,
          },
        };
      }

      return {
        pool: prev.pool,
        bins: {
          ...prev.bins,
          [getBinIdFromDroppable(sourceId)]: nextSource,
          [getBinIdFromDroppable(destinationId)]: nextDestination,
        },
      };
    });
    setSelectedTokenId(null);
  };

  if (done) {
    const percent = TOTAL_TARGETS ? Math.round((score / TOTAL_TARGETS) * 100) : 0;
    return (
      <KangurPracticeGameSummary dataTestId='logical-classification-summary-shell'>
        <KangurPracticeGameSummaryEmoji
          ariaHidden
          dataTestId='logical-classification-summary-emoji'
          emoji={percent === 100 ? '🏆' : percent >= 70 ? '🌟' : '💪'}
        />
        <KangurPracticeGameSummaryTitle
          dataTestId='logical-classification-summary-title'
          title={getKangurMiniGameScoreLabel(translations, score, TOTAL_TARGETS)}
        />
        <KangurPracticeGameSummaryXP accent='teal' xpEarned={xpEarned} />
        <KangurPracticeGameSummaryBreakdown
          breakdown={xpBreakdown}
          dataTestId='logical-classification-summary-breakdown'
          itemDataTestIdPrefix='logical-classification-summary-breakdown'
        />
        <KangurPracticeGameSummaryProgress
          accent='teal'
          dataTestId='logical-classification-summary-progress-bar'
          percent={percent}
        />
        <KangurPracticeGameSummaryMessage>
          {percent === 100
            ? translations('logicalClassification.summary.perfect')
            : percent >= 70
              ? translations('logicalClassification.summary.good')
              : translations('logicalClassification.summary.retry')}
        </KangurPracticeGameSummaryMessage>
        <KangurPracticeGameSummaryActions
          className={KANGUR_STACK_ROW_CLASSNAME}
          finishButtonClassName='w-full sm:flex-1'
          finishLabel={summaryFinishLabel}
          onFinish={handleFinish}
          restartLabel={translations('shared.restart')}
          onRestart={() => {
            setRoundIndex(0);
            setRoundState(buildRoundState(FIRST_ROUND));
            setSelectedTokenId(null);
            setSelectedIntruderId(null);
            setChecked(false);
            setRoundCorrect(0);
            setScore(0);
            setDone(false);
            setXpEarned(0);
            setXpBreakdown([]);
            sessionStartedAtRef.current = Date.now();
          }}
          restartButtonClassName='w-full sm:flex-1'
        />
      </KangurPracticeGameSummary>
    );
  }

  const stageContent = (
    <KangurPracticeGameStage className='mx-auto max-w-2xl'>
        <KangurPracticeGameProgress
          accent='teal'
          currentRound={roundIndex}
          dataTestId='logical-classification-progress-bar'
          totalRounds={TOTAL_ROUNDS}
        />

        <KangurInfoCard accent='teal' className='w-full text-center' padding='md' tone='accent'>
          <KangurStatusChip accent='teal' className='mx-auto'>
            {round.type === 'sort' ? 'Sortowanie' : 'Znajdź intruza'}
          </KangurStatusChip>
          <p className='mt-3 text-lg font-bold [color:var(--kangur-page-text)]'>{round.title}</p>
          <p className='text-sm [color:var(--kangur-page-muted-text)]'>{round.prompt}</p>
          <p className='text-xs text-teal-700 mt-1'>{round.hint}</p>
        </KangurInfoCard>

        {round.type === 'sort' ? (
          <>
            <KangurInfoCard
              accent='teal'
              className='w-full'
              padding='md'
              tone='neutral'
            >
              <p className='text-xs font-semibold text-teal-700 mb-2 text-center'>
                Elementy do posortowania
              </p>
              <Droppable droppableId='pool' direction='horizontal'>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'flex flex-wrap items-center justify-center gap-2 rounded-[18px] border border-dashed border-teal-300/70 p-3 min-h-[64px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white',
                      snapshot.isDraggingOver && 'bg-teal-50'
                    )}
                    onClick={handleReturnToPool}
                    role='button'
                    tabIndex={checked ? -1 : 0}
                    aria-disabled={checked}
                    aria-label='Pula elementów do sortowania'
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleReturnToPool();
                      }
                    }}
                  >
                    {roundState.pool.map((item, index) => (
                      <DraggableToken
                        key={item.id}
                        item={item}
                        index={index}
                        isDragDisabled={checked}
                        isSelected={selectedTokenId === item.id}
                        onClick={() =>
                          setSelectedTokenId((current) => (current === item.id ? null : item.id))
                        }
                      />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </KangurInfoCard>

            <div className='grid w-full grid-cols-1 kangur-panel-gap sm:grid-cols-2'>
              {round.bins.map((bin) => {
                const items = roundState.bins[bin.id] ?? [];
                const expectedIds = expectedByBin[bin.id] ?? new Set<string>();
                const isCorrect =
                  items.length === expectedIds.size &&
                  items.every((item) => expectedIds.has(item.id));
                return (
                  <Droppable key={bin.id} droppableId={binIdForDroppable(bin.id)}>
                    {(provided, snapshot) => {
                      const surface = resolveBinStatus({
                        checked,
                        isDraggingOver: snapshot.isDraggingOver,
                        isCorrect,
                      });
                      return (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={surface.className}
                          onClick={() => handleAssignToken(bin.id)}
                          role='button'
                          tabIndex={checked ? -1 : 0}
                          aria-disabled={checked}
                          aria-label={`${bin.label}: kliknij, aby dodać element`}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              handleAssignToken(bin.id);
                            }
                          }}
                        >
                          <div className={`mb-2 ${KANGUR_WRAP_CENTER_ROW_CLASSNAME} sm:justify-between`}>
                            <div className={`${KANGUR_CENTER_ROW_CLASSNAME} text-sm font-bold text-slate-700`}>
                              <span className='text-lg'>{bin.emoji}</span>
                              {bin.label}
                            </div>
                            {checked ? (
                              <KangurStatusChip accent={surface.accent} size='sm'>
                                {items.length}/{expectedIds.size}
                              </KangurStatusChip>
                            ) : null}
                          </div>
                          <div className={KANGUR_WRAP_ROW_CLASSNAME}>
                            {items.map((item, index) => (
                              <DraggableToken
                                key={item.id}
                                item={item}
                                index={index}
                                isDragDisabled={checked}
                                isSelected={selectedTokenId === item.id}
                                onClick={() =>
                                  setSelectedTokenId((current) =>
                                    current === item.id ? null : item.id
                                  )
                                }
                                showStatus={checked}
                                isCorrect={bin.acceptGroups.includes(item.group)}
                              />
                            ))}
                            {provided.placeholder}
                          </div>
                          {checked && items.length === 0 ? (
                            <p
                              className='mt-2 text-xs text-rose-600'
                              role='status'
                              aria-live='polite'
                            >
                              Brakuje elementów
                            </p>
                          ) : null}
                        </div>
                      );
                    }}
                  </Droppable>
                );
              })}
            </div>
          </>
        ) : (
          <KangurInfoCard accent='teal' className='w-full' padding='md' tone='neutral'>
            <div className='grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:grid-cols-3'>
              {round.items.map((item) => {
                const isSelected = selectedIntruderId === item.id;
                const isCorrect = checked && item.id === round.intruderId;
                const isWrong = checked && isSelected && !isCorrect;
                return (
                  <button
                    key={item.id}
                    type='button'
                    onClick={() => handleIntruderSelect(item.id)}
                    disabled={checked}
                    className={cn(
                      'flex flex-col items-center justify-center gap-2 rounded-[18px] border px-3 py-3 text-lg font-semibold transition',
                      KANGUR_ACCENT_STYLES[item.accent].badge,
                      !checked && KANGUR_ACCENT_STYLES[item.accent].hoverCard,
                      isSelected && 'ring-2 ring-teal-400/70 ring-offset-1 ring-offset-transparent',
                      isCorrect && 'ring-2 ring-emerald-400/80',
                      isWrong && 'ring-2 ring-rose-400/80'
                    )}
                    aria-pressed={isSelected}
                    aria-label={`Wybierz intruza: ${item.label}`}
                  >
                    <span>{item.emoji}</span>
                    <span className='text-xs text-slate-600'>{item.label}</span>
                  </button>
                );
              })}
            </div>
            {checked ? (
              <p
                className={cn(
                  'mt-3 text-sm font-semibold text-center',
                  roundCorrect ? 'text-emerald-600' : 'text-rose-600'
                )}
                role='status'
                aria-live='polite'
                aria-atomic='true'
              >
                {roundCorrect
                  ? `${translations('logicalClassification.feedback.correct')} ${round.explain}`
                  : `${translations('logicalClassification.feedback.wrong')} ${round.explain}`}
              </p>
            ) : null}
          </KangurInfoCard>
        )}

        <div className='flex w-full flex-wrap items-center justify-between kangur-panel-gap'>
          <div className={KANGUR_WRAP_ROW_CLASSNAME}>
            {round.type === 'sort' ? (
              <KangurButton size='sm' type='button' variant='surface' onClick={resetRound} disabled={checked}>
                Wyczyść rundę
              </KangurButton>
            ) : null}
            {checked ? (
              <KangurStatusChip accent={roundCorrect === (round.type === 'sort' ? round.items.length : 1) ? 'emerald' : 'rose'}>
                {roundCorrect}/{round.type === 'sort' ? round.items.length : 1} trafień
              </KangurStatusChip>
            ) : null}
          </div>
          {!checked ? (
            round.type === 'sort' ? (
              <KangurButton size='sm' type='button' variant='primary' onClick={handleCheck} disabled={!isRoundComplete}>
                Sprawdź
              </KangurButton>
            ) : (
              <KangurStatusChip accent='teal'>Wybierz intruza</KangurStatusChip>
            )
          ) : (
            <KangurButton size='sm' type='button' variant='primary' onClick={goToNextRound}>
              {roundIndex + 1 >= TOTAL_ROUNDS ? 'Zobacz wynik' : 'Dalej'}
            </KangurButton>
          )}
        </div>
      </KangurPracticeGameStage>
  );

  if (round.type !== 'sort') {
    return stageContent;
  }

  return (
    <KangurDragDropContext
      onDragEnd={onDragEnd}
      onDragStart={() => {
        setSelectedTokenId(null);
      }}
    >
      {stageContent}
    </KangurDragDropContext>
  );
}
